import { cosine, qualityPrior, reachPrior, recognizability, DIM } from "./features";
import { explainMatch, facetScore, matchPercent, titleTokens, type FacetTables, } from "./facets";
import { isCalibrating, seenTrust, tasteConfidence, watchLikelihood, type TasteProfile, } from "./taste";
import type { Recommendation, Title } from "../types";
export interface CandidateItem {
    title: Title;
    vector?: Float32Array;
    _k?: string;
    _q?: number;
    _prior?: number;
    _jit?: number;
}
const num2 = (k: string, d: number) => typeof process !== "undefined" && process.env?.[k] ? Number(process.env[k]) : d;
const W_FACETS = num2("W_FACETS", 1.6);
const W_SOUL = 1.4;
const W_QUALITY = 0.25;
const W_RECOGNITION_COLD = num2("W_REC_COLD", 0.9);
const W_RECOGNITION_WARM = num2("W_REC_WARM", 0.55);
const W_RECOGNITION_DISCOVER = 0.12;
const MMR_LAMBDA = 0.35;
const GENRE_REPEAT_PENALTY = 0.16;
const DECK_DIVERSITY_SCALE = typeof process !== "undefined" && process.env?.DECK_DIVERSITY
    ? Number(process.env.DECK_DIVERSITY)
    : 0;
const COLD_DIVERSITY = 0.25;
const COLD_UNTIL = typeof process !== "undefined" && process.env?.COLD_UNTIL
    ? Number(process.env.COLD_UNTIL)
    : 5;
function deckDiversity(profile: TasteProfile): number {
    return profile.ratedSwipes < COLD_UNTIL ? COLD_DIVERSITY : DECK_DIVERSITY_SCALE;
}
const DISCOVER_DIVERSITY_SCALE = typeof process !== "undefined" && process.env?.DIVERSITY
    ? Number(process.env.DIVERSITY)
    : 0.25;
const TARGET_SEEN = typeof process !== "undefined" && process.env?.TARGET_SEEN
    ? Number(process.env.TARGET_SEEN)
    : 0.85;
const RANK_MIDPOINT = 0.4;
const RANK_SPREAD = 2.2;
const FINALIST_POOL = 60;
const DISCOVER_POOL = Infinity;
export type RankMode = "swipe" | "discover";
export function recognitionRate(profile: TasteProfile): number {
    const answered = profile.seenCount + profile.unseenCount;
    if (answered === 0)
        return 0;
    return profile.seenCount / answered;
}
function recognitionEvidence(profile: TasteProfile): number {
    return Math.min(1, (profile.seenCount + profile.unseenCount) / 20);
}
const TIER_BASE = typeof process !== "undefined" && process.env?.TIER_BASE
    ? Number(process.env.TIER_BASE)
    : 900;
const num = (key: string, fallback: number) => typeof process !== "undefined" && process.env?.[key] ? Number(process.env[key]) : fallback;
const TIER_PER_SEEN = num("TIER_PER_SEEN", 5);
const TIER_PER_UNSEEN = num("TIER_PER_UNSEEN", 30);
const TIER_MAX = num("TIER_MAX", 60000);
const TIER_FLOOR_PER = num("TIER_FLOOR_PER", 3);
const TIER_FLOOR_BASE = num("TIER_FLOOR_BASE", 300);
const LEARN_CARDS = num("LEARN_CARDS", 250);
const GROWTH_MIN = num("GROWTH_MIN", 3);
const GROWTH_MAX = num("GROWTH_MAX", 3);
const STREAK_TRIGGER = num("STREAK_TRIGGER", 8);
const STREAK_BOOST = num("STREAK_BOOST", 1.5);
export type ReachSetting = "narrow" | "medium" | "wide";
const REACH_GROWTH: Record<ReachSetting, number> = {
    narrow: 3,
    medium: 8,
    wide: Number.POSITIVE_INFINITY,
};
let defaultReachGrowth = REACH_GROWTH.narrow;
export function setReach(reach: ReachSetting): void {
    defaultReachGrowth = REACH_GROWTH[reach] ?? REACH_GROWTH.narrow;
}
export function fameTierSize(profile: TasteProfile, mode: RankMode = "swipe", reach?: ReachSetting): number {
    const reachGrowth = reach ? REACH_GROWTH[reach] : defaultReachGrowth;
    if (mode === "discover")
        return DISCOVER_POOL;
    const answered = profile.seenCount + profile.unseenCount;
    const confidence = Math.min(1, answered / Math.max(LEARN_CARDS, 1));
    if (!Number.isFinite(reachGrowth))
        return TIER_MAX;
    const ceiling = Math.max(GROWTH_MAX, reachGrowth);
    let growth = GROWTH_MIN + confidence * (ceiling - GROWTH_MIN);
    const streak = profile.unseenStreak ?? 0;
    if (streak >= STREAK_TRIGGER) {
        const over = (streak - STREAK_TRIGGER) / STREAK_TRIGGER;
        growth *= 1 + Math.min(1, over) * (STREAK_BOOST - 1);
    }
    const reachScale = Number.isFinite(reachGrowth)
        ? Math.max(1, reachGrowth / GROWTH_MIN)
        : 1;
    const earned = TIER_BASE * reachScale +
        TIER_PER_SEEN * profile.seenCount -
        TIER_PER_UNSEEN * profile.unseenCount;
    const margin = Math.max(TIER_FLOOR_BASE, answered * (growth - 1));
    return Math.min(TIER_MAX, Math.max(earned, Math.round(answered + margin)));
}
const fameOrder = new WeakMap<CandidateItem[], {
    movie: CandidateItem[];
    tv: CandidateItem[];
}>();
function fameLists(pool: CandidateItem[]) {
    let lists = fameOrder.get(pool);
    if (!lists) {
        const sorted = [...pool].sort((a, b) => b.title.voteCount - a.title.voteCount);
        lists = {
            movie: sorted.filter((c) => c.title.type !== "tv"),
            tv: sorted.filter((c) => c.title.type === "tv"),
        };
        fameOrder.set(pool, lists);
    }
    return lists;
}
const langOrder = new WeakMap<CandidateItem[], Map<string, CandidateItem[]>>();
function languageLists(pool: CandidateItem[]): Map<string, CandidateItem[]> {
    let lists = langOrder.get(pool);
    if (!lists) {
        lists = new Map();
        for (const c of pool) {
            const key = c.title.originalLanguage;
            const list = lists.get(key);
            if (list)
                list.push(c);
            else
                lists.set(key, [c]);
        }
        for (const list of lists.values()) {
            list.sort((a, b) => b.title.voteCount - a.title.voteCount);
        }
        langOrder.set(pool, lists);
    }
    return lists;
}
const LANG_DOOR_MASS = 2;
const HOME_LANG_STRENGTH = Number((typeof process !== "undefined" && process.env?.HOME_LANG) || 0.05);
function languageDoor(profile: TasteProfile | undefined, homeLanguages?: string[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const lang of homeLanguages ?? []) {
        if (lang !== "en")
            out.set(lang, HOME_LANG_STRENGTH);
    }
    if (!profile)
        return out;
    const table = profile.seenFacets.language;
    for (const lang of Object.keys(table)) {
        if (lang === "en")
            continue;
        const [net, mass] = table[lang];
        if (mass < LANG_DOOR_MASS || net <= 0)
            continue;
        out.set(lang, Math.max(out.get(lang) ?? 0, Math.min(1, net / mass)));
    }
    return out;
}
const TASTE_DEPTH = typeof process !== "undefined" && process.env?.TASTE_DEPTH
    ? Number(process.env.TASTE_DEPTH)
    : 6;
const TASTE_MARGIN = typeof process !== "undefined" && process.env?.TASTE_MARGIN
    ? Number(process.env.TASTE_MARGIN)
    : 0.15;
const CORNER_MASS = 3;
const DEEP_CAP = typeof process !== "undefined" && process.env?.DEEP_CAP
    ? Number(process.env.DEEP_CAP)
    : 1200;
function corner(facets: FacetTables): Set<string> {
    const table = facets.genre;
    let best = -Infinity;
    const means = new Map<string, number>();
    for (const g of Object.keys(table)) {
        const [net, mass] = table[g];
        if (mass < CORNER_MASS)
            continue;
        const mean = net / mass;
        means.set(g, mean);
        if (mean > best)
            best = mean;
    }
    const out = new Set<string>();
    if (best <= 0)
        return out;
    for (const [g, mean] of means) {
        if (mean >= best - TASTE_MARGIN)
            out.add(g);
    }
    return out;
}
const GATE_WIDTH = typeof process !== "undefined" && process.env?.GATE_WIDTH
    ? Number(process.env.GATE_WIDTH)
    : 3;
const langFameIndex = new WeakMap<CandidateItem[], Map<string, number>>();
function languageFame(pool: CandidateItem[]): Map<string, number> {
    const cached = langFameIndex.get(pool);
    if (cached)
        return cached;
    const out = new Map<string, number>();
    const groups = new Map<string, CandidateItem[]>();
    for (const c of pool) {
        const key = `${c.title.originalLanguage}|${c.title.type}`;
        const list = groups.get(key);
        if (list)
            list.push(c);
        else
            groups.set(key, [c]);
    }
    for (const list of groups.values()) {
        list.sort((a, b) => b.title.voteCount - a.title.voteCount);
        for (let i = 0; i < list.length; i++) {
            out.set(list[i].title.id, 1 - i / list.length);
        }
    }
    langFameIndex.set(pool, out);
    return out;
}
function famePrior(title: Title, home: Set<string> | null, index: Map<string, number> | null): number {
    const base = reachPrior(title);
    if (!home || !index || !home.has(title.originalLanguage))
        return base;
    return Math.max(base, index.get(title.id) ?? 0);
}
function homeFloor(profile: TasteProfile, title: Title, home: Set<string> | null, prior: number, blended: number): number {
    if (!home || !home.has(title.originalLanguage))
        return blended;
    const [, mass] = profile.seenFacets.language[title.originalLanguage] ?? [0, 0];
    return mass >= LANG_DOOR_MASS ? blended : Math.max(blended, prior);
}
export function fameGate(pool: CandidateItem[], limit: number, facets?: FacetTables, profile?: TasteProfile, homeLanguages?: string[], watched?: Title[]): CandidateItem[] {
    const { movie, tv } = fameLists(pool);
    const home = homeLanguages?.length ? new Set(homeLanguages) : null;
    const langIndex = home ? languageFame(pool) : null;
    const shareOf = (n: number) => !Number.isFinite(n) || n >= pool.length ? 1 : n / Math.max(pool.length, 1);
    const personal = profile && (seenTrust(profile) > 0 || home) ? profile : null;
    const door = languageDoor(profile, homeLanguages);
    const langs = door.size > 0 ? languageLists(pool) : null;
    const reorder = (list: CandidateItem[], keep: number) => {
        if (!personal || keep >= list.length)
            return list.slice(0, keep);
        const window = list.slice(0, Math.min(list.length, Math.round(keep * GATE_WIDTH)));
        if (langs) {
            const kind = list === fameLists(pool).tv ? "tv" : "movie";
            const seen = new Set(window.map((c) => c.title.id));
            for (const [lang, strength] of door) {
                const src = langs.get(lang);
                if (!src)
                    continue;
                let taken = 0;
                const room = Math.round(keep * strength);
                for (const c of src) {
                    if (taken >= room)
                        break;
                    if ((c.title.type === "tv") !== (kind === "tv"))
                        continue;
                    if (seen.has(c.title.id))
                        continue;
                    window.push(c);
                    taken++;
                }
            }
        }
        const scored = window.map((c) => ({
            c,
            w: (() => {
                const prior = famePrior(c.title, home, langIndex);
                const blended = homeFloor(personal, c.title, home, prior, watchLikelihood(personal, titleTokens(c.title), prior));
                return blended;
            })(),
        }));
        scored.sort((a, b) => b.w - a.w);
        return scored.slice(0, keep).map((s) => s.c);
    };
    const mine = facets ? corner(facets) : null;
    const take = (list: CandidateItem[]) => {
        const base = Math.round(list.length * shareOf(limit));
        if (!mine || mine.size === 0)
            return reorder(list, base);
        const deep = Math.round(list.length * shareOf(Math.max(limit, TIER_BASE) * TASTE_DEPTH));
        const room = DEEP_CAP;
        const extra: CandidateItem[] = [];
        for (let i = base; i < deep && i < list.length; i++) {
            if (extra.length >= room)
                break;
            const c = list[i];
            if (c.title.genres.some((g) => mine.has(g.toLowerCase())))
                extra.push(c);
        }
        return [...reorder(list, base), ...extra];
    };
    const seen = new Set<string>();
    const kept: CandidateItem[] = [];
    for (const c of [...take(movie), ...take(tv)]) {
        if (seen.has(c.title.id))
            continue;
        seen.add(c.title.id);
        kept.push(c);
    }
    kept.sort((a, b) => b.title.voteCount - a.title.voteCount);
    return kept;
}
const genreIndex = new WeakMap<CandidateItem[], string[]>();
function allGenres(pool: CandidateItem[]): string[] {
    let list = genreIndex.get(pool);
    if (!list) {
        const set = new Set<string>();
        for (const c of pool)
            for (const g of c.title.genres)
                set.add(g.toLowerCase());
        list = [...set];
        genreIndex.set(pool, list);
    }
    return list;
}
export function exploreRatioFor(profile: TasteProfile): number {
    if (process.env?.EXPLORE)
        return Number(process.env.EXPLORE);
    if (profile.ratedSwipes === 0)
        return 0;
    if (profile.ratedSwipes >= COLD_UNTIL)
        return 0;
    return 0.12 - 0.06 * Math.min(1, profile.totalSwipes / 60);
}
function jitterFor(id: string, seed: number): number {
    let h = (0x811c9dc5 ^ seed) >>> 0;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return ((h >>> 0) / 4294967296) - 0.5;
}
const JITTER = 0.09;
function makeRng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function unexploredGenres(facets: FacetTables, pool: CandidateItem[], rng: () => number): string[] {
    const table = facets.genre;
    return allGenres(pool)
        .map((g) => ({ g, mass: table[g]?.[1] ?? 0, jitter: rng() }))
        .sort((a, b) => a.mass - b.mass || a.jitter - b.jitter)
        .map((x) => x.g);
}
const CO_WATCH_HIT = 0.22;
const CO_WATCH_MAX = typeof process !== "undefined" && process.env?.COWATCH_MAX
    ? Number(process.env.COWATCH_MAX)
    : 0.85;
const CO_WATCH_DECK_SCALE = 0.6;
const CO_WATCH_DISCOVER_SCALE = 1.6;
const CO_WATCH_AVERSION = typeof process !== "undefined" && process.env?.AVERSION
    ? Number(process.env.AVERSION)
    : 0;
const DECK_ENV = typeof process !== "undefined" && process.env?.DECK_COWATCH
    ? Number(process.env.DECK_COWATCH)
    : null;
const COWATCH_ENV = typeof process !== "undefined" && process.env?.COWATCH
    ? Number(process.env.COWATCH)
    : null;
export interface CoWatch {
    score: number;
    from: string;
    fromStrength: number;
}
export function coWatchBonus(liked: Title[]): Map<string, CoWatch> {
    const bonus = new Map<string, CoWatch>();
    for (const title of liked) {
        const links = title.related;
        if (!links || links.length === 0)
            continue;
        for (let rank = 0; rank < links.length; rank++) {
            const positional = 1 - (0.6 * rank) / links.length;
            const add = CO_WATCH_HIT * positional;
            const id = links[rank];
            const prev = bonus.get(id);
            if (!prev) {
                bonus.set(id, { score: add, from: title.id, fromStrength: add });
            }
            else {
                prev.score = Math.min(CO_WATCH_MAX, prev.score + add);
                if (add > prev.fromStrength) {
                    prev.from = title.id;
                    prev.fromStrength = add;
                }
            }
        }
    }
    return bonus;
}
interface Graph {
    out: Map<string, {
        to: string;
        w: number;
    }[]>;
    deg: Map<string, number>;
}
const graphCache = new WeakMap<CandidateItem[], Graph>();
function buildGraph(pool: CandidateItem[]): Graph {
    const cached = graphCache.get(pool);
    if (cached)
        return cached;
    const out = new Map<string, {
        to: string;
        w: number;
    }[]>();
    const deg = new Map<string, number>();
    const link = (a: string, b: string, w: number) => {
        const list = out.get(a);
        if (list)
            list.push({ to: b, w });
        else
            out.set(a, [{ to: b, w }]);
        deg.set(b, (deg.get(b) ?? 0) + w);
    };
    for (const c of pool) {
        const links = c.title.related;
        if (!links?.length)
            continue;
        for (let rank = 0; rank < links.length; rank++) {
            const w = 1 - (0.6 * rank) / links.length;
            link(c.title.id, links[rank], w);
            link(links[rank], c.title.id, w);
        }
    }
    const graph = { out, deg };
    graphCache.set(pool, graph);
    return graph;
}
const WALK_HOPS = Number(process.env.HOPS ?? 2);
const WALK_DECAY = 0.55;
const WALK_GAMMA = 0.6;
const WALK_FRONTIER = 600;
const walkCache = new WeakMap<CandidateItem[], Map<string, Map<string, CoWatch>>>();
const WALK_CACHE_MAX = 6;
const CO_WATCH_CURVE = typeof process !== "undefined" && process.env?.CW_CURVE
    ? Number(process.env.CW_CURVE)
    : 1;
function coWatchTerm(score: number): number {
    return CO_WATCH_CURVE === 1 ? score : Math.pow(score, CO_WATCH_CURVE);
}
export function walkBonus(pool: CandidateItem[], liked: Title[]): Map<string, CoWatch> {
    let h = 0;
    for (const t of liked) {
        for (let i = 0; i < t.id.length; i++)
            h = (Math.imul(h, 31) + t.id.charCodeAt(i)) | 0;
    }
    const key = `${liked.length}|${h}`;
    let slots = walkCache.get(pool);
    if (!slots) {
        slots = new Map();
        walkCache.set(pool, slots);
    }
    const hit = slots.get(key);
    if (hit)
        return hit;
    const graph = buildGraph(pool);
    const visits = new Map<string, CoWatch>();
    const seeds = new Set(liked.map((t) => t.id));
    let frontier = liked.map((t) => ({ id: t.id, mass: 1 / liked.length, from: t.id }));
    for (let hop = 1; hop <= WALK_HOPS; hop++) {
        const next = new Map<string, {
            mass: number;
            from: string;
            fromMass: number;
        }>();
        for (const node of frontier) {
            const edges = graph.out.get(node.id);
            if (!edges?.length)
                continue;
            let total = 0;
            for (const e of edges)
                total += e.w;
            for (const e of edges) {
                if (seeds.has(e.to))
                    continue;
                const damp = Math.pow(graph.deg.get(e.to) ?? 1, WALK_GAMMA);
                const share = (node.mass * (e.w / total)) / damp;
                const prev = next.get(e.to);
                if (!prev) {
                    next.set(e.to, { mass: share, from: node.from, fromMass: share });
                }
                else {
                    prev.mass += share;
                    if (share > prev.fromMass) {
                        prev.from = node.from;
                        prev.fromMass = share;
                    }
                }
            }
        }
        const decay = Math.pow(WALK_DECAY, hop - 1);
        for (const [id, v] of next) {
            const add = v.mass * decay;
            const prev = visits.get(id);
            if (!prev) {
                visits.set(id, { score: add, from: v.from, fromStrength: add });
            }
            else {
                prev.score += add;
                if (add > prev.fromStrength) {
                    prev.from = v.from;
                    prev.fromStrength = add;
                }
            }
        }
        if (hop === WALK_HOPS)
            break;
        frontier = [...next.entries()]
            .sort((a, b) => b[1].mass - a[1].mass)
            .slice(0, WALK_FRONTIER)
            .map(([id, v]) => ({ id, mass: v.mass, from: v.from }));
    }
    let peak = 0;
    for (const v of visits.values())
        if (v.score > peak)
            peak = v.score;
    if (peak > 0) {
        for (const v of visits.values()) {
            v.score /= peak;
            v.fromStrength /= peak;
        }
    }
    if (slots.size >= WALK_CACHE_MAX)
        slots.delete(slots.keys().next().value as string);
    slots.set(key, visits);
    return visits;
}
export interface RecommendOptions {
    excludeIds: Set<string>;
    count: number;
    seed?: number;
    vectorFor?: (title: Title) => Float32Array;
    likedTitles?: Title[];
    dislikedTitles?: Title[];
    seenTitles?: Title[];
    homeLanguages?: string[];
    coOccurrenceBonus?: Map<string, number>;
    exploreRatio?: number;
    souls?: Map<string, number[]>;
    mode?: RankMode;
    reach?: ReachSetting;
}
export function recommend(pool: CandidateItem[], profile: TasteProfile, opts: RecommendOptions): Recommendation[] {
    const { excludeIds, count } = opts;
    const seed = opts.seed ?? 1;
    const rng = makeRng(seed + profile.totalSwipes * 2654435761);
    const mode = opts.mode ?? "swipe";
    const confidence = tasteConfidence(profile);
    const recognised = recognitionRate(profile);
    const relax = recognitionEvidence(profile) *
        Math.min(1, Math.max(0, (recognised - 0.6) / 0.35));
    const wRecognition = mode === "discover"
        ? W_RECOGNITION_DISCOVER
        : W_RECOGNITION_COLD + (W_RECOGNITION_WARM - W_RECOGNITION_COLD) * relax;
    const { facets, facetWeights, streaks, totalSwipes } = profile;
    const affinitySeeds = opts.seenTitles?.length && opts.likedTitles?.length
        ? [...opts.likedTitles, ...opts.seenTitles]
        : (opts.seenTitles?.length ? opts.seenTitles : opts.likedTitles);
    const coWatch = affinitySeeds?.length
        ? process.env?.WALK === "0"
            ? coWatchBonus(affinitySeeds)
            : walkBonus(pool, affinitySeeds)
        : null;
    const aversion = CO_WATCH_AVERSION > 0 && opts.dislikedTitles?.length
        ? walkBonus(pool, opts.dislikedTitles)
        : null;
    const frontier = DECK_FRONTIER > 0 && mode !== "discover"
        ? frontierVotes([...(opts.likedTitles ?? []), ...(opts.seenTitles ?? []), ...(opts.dislikedTitles ?? [])], excludeIds)
        : null;
    const homeSet = opts.homeLanguages?.length ? new Set(opts.homeLanguages) : null;
    const langIndex = homeSet ? languageFame(pool) : null;
    const watched = [
        ...(opts.likedTitles ?? []),
        ...(opts.seenTitles ?? []),
        ...(opts.dislikedTitles ?? []),
    ];
    const gated = fameGate(pool, fameTierSize(profile, mode, opts.reach), mode === "swipe" ? profile.facets : undefined, profile, opts.homeLanguages, watched);
    const coWatchScale = mode === "discover"
        ? COWATCH_ENV ?? CO_WATCH_DISCOVER_SCALE
        : DECK_ENV ?? CO_WATCH_DECK_SCALE;
    let soulCentre: number[] | null = null;
    if (opts.souls && opts.likedTitles?.length) {
        for (const t of opts.likedTitles) {
            const v = opts.souls.get(t.id);
            if (!v)
                continue;
            if (!soulCentre)
                soulCentre = new Array(v.length).fill(0);
            for (let i = 0; i < v.length; i++)
                soulCentre[i] += v[i];
        }
        if (soulCentre) {
            let n = 0;
            for (const x of soulCentre)
                n += x * x;
            n = Math.sqrt(n) || 1;
            for (let i = 0; i < soulCentre.length; i++)
                soulCentre[i] /= n;
        }
    }
    const soulSim = (id: string): number => {
        const v = soulCentre && opts.souls?.get(id);
        if (!v || !soulCentre)
            return 0;
        let d = 0;
        for (let i = 0; i < v.length; i++)
            d += soulCentre[i] * v[i];
        return d;
    };
    const cacheKey = `${seed}|${opts.homeLanguages?.join(",") ?? ""}`;
    const scored: {
        c: CandidateItem;
        score: number;
        facet: number;
    }[] = [];
    for (const c of gated) {
        if (excludeIds.has(c.title.id))
            continue;
        if (c._k !== cacheKey) {
            c._k = cacheKey;
            c._q = qualityPrior(c.title.rating, c.title.voteCount);
            c._prior = famePrior(c.title, homeSet, langIndex);
            c._jit = jitterFor(c.title.id, seed);
        }
        const tokens = titleTokens(c.title);
        const fs = facetScore(facets, facetWeights, tokens, streaks.cooldown, totalSwipes);
        const q = c._q as number;
        const prior = c._prior as number;
        const known = homeFloor(profile, c.title, homeSet, prior, watchLikelihood(profile, tokens, prior));
        const recognitionTerm = TARGET_SEEN > 0 ? 1 - Math.abs(known - TARGET_SEEN) * 2 : known;
        const score = W_QUALITY * q +
            wRecognition * recognitionTerm +
            confidence * W_FACETS * fs.total +
            JITTER * (c._jit as number) +
            coWatchScale * coWatchTerm(coWatch?.get(c.title.id)?.score ?? 0) -
            CO_WATCH_AVERSION * coWatchTerm(aversion?.get(c.title.id)?.score ?? 0) +
            confidence * W_SOUL * soulSim(c.title.id) +
            DECK_FRONTIER * (frontier?.get(c.title.id) ?? 0) +
            (opts.coOccurrenceBonus?.get(c.title.id) ?? 0);
        scored.push({ c, score, facet: fs.total });
    }
    if (scored.length === 0)
        return [];
    scored.sort((a, b) => b.score - a.score);
    const exploreRatio = opts.exploreRatio ?? (mode === "discover" ? 0 : exploreRatioFor(profile));
    const divScale = mode === "discover" ? DISCOVER_DIVERSITY_SCALE : deckDiversity(profile);
    const exploreSlots = Math.min(count - 1, Math.round(count * exploreRatio));
    const mainSlots = Math.max(1, count - exploreSlots);
    const vectorFor = opts.vectorFor;
    const head = scored.slice(0, Math.min(scored.length, Math.max(FINALIST_POOL, count * 4)));
    const vecOf = (item: CandidateItem): Float32Array | null => {
        if (item.vector)
            return item.vector;
        if (!vectorFor)
            return null;
        item.vector = vectorFor(item.title);
        return item.vector;
    };
    const picked: typeof head = [];
    const remaining = [...head];
    const genreCounts = new Map<string, number>();
    while (picked.length < mainSlots && remaining.length > 0) {
        let bestIdx = 0;
        let bestVal = -Infinity;
        for (let i = 0; i < remaining.length; i++) {
            const cand = remaining[i];
            let maxSim = 0;
            const cv = vecOf(cand.c);
            if (cv) {
                for (const p of picked) {
                    const pv = vecOf(p.c);
                    if (!pv)
                        continue;
                    const s = cosine(cv, pv);
                    if (s > maxSim)
                        maxSim = s;
                }
            }
            let repeats = 0;
            for (const g of cand.c.title.genres) {
                repeats = Math.max(repeats, genreCounts.get(g) ?? 0);
            }
            const val = cand.score -
                divScale * MMR_LAMBDA * maxSim -
                divScale * GENRE_REPEAT_PENALTY * repeats;
            if (val > bestVal) {
                bestVal = val;
                bestIdx = i;
            }
        }
        const chosen = remaining.splice(bestIdx, 1)[0];
        picked.push(chosen);
        for (const g of chosen.c.title.genres) {
            genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
        }
    }
    if (exploreSlots > 0) {
        const takenIds = new Set(picked.map((p) => p.c.title.id));
        const wanted = unexploredGenres(facets, pool, rng);
        const byScore = new Map(scored.map((s) => [s.c.title.id, s]));
        const explorers: typeof picked = [];
        for (const genre of wanted) {
            if (explorers.length >= exploreSlots)
                break;
            const candidates = gated
                .filter((c) => !excludeIds.has(c.title.id) &&
                !takenIds.has(c.title.id) &&
                c.title.genres.some((g) => g.toLowerCase() === genre))
                .slice(0, 12);
            if (candidates.length === 0)
                continue;
            const chosen = candidates[Math.floor(rng() * Math.min(4, candidates.length))];
            takenIds.add(chosen.title.id);
            explorers.push(byScore.get(chosen.title.id) ?? { c: chosen, score: 0, facet: 0 });
        }
        if (explorers.length > 0) {
            const step = Math.max(1, Math.ceil(picked.length / explorers.length));
            const merged: typeof picked = [];
            let ei = 0;
            for (let i = 0; i < picked.length; i++) {
                merged.push(picked[i]);
                if ((i + 1) % step === 0 && ei < explorers.length)
                    merged.push(explorers[ei++]);
            }
            while (ei < explorers.length)
                merged.push(explorers[ei++]);
            picked.length = 0;
            picked.push(...merged.slice(0, count));
        }
    }
    if (mode !== "discover" && DEBT_EVERY > 0) {
        const inBatch = new Set(picked.map((p) => p.c.title.id));
        const window = scored.slice(0, Math.min(scored.length, count * DEBT_WINDOW));
        for (const s of window) {
            if (inBatch.has(s.c.title.id)) {
                debt.delete(s.c.title.id);
            }
            else {
                debt.set(s.c.title.id, (debt.get(s.c.title.id) ?? 0) + 1);
            }
        }
        debtClock += picked.length;
        const owedSlots = Math.floor(debtClock / DEBT_EVERY);
        if (owedSlots > 0) {
            debtClock -= owedSlots * DEBT_EVERY;
            const byScore = new Map(scored.map((s) => [s.c.title.id, s]));
            const creditors = [...debt.entries()]
                .filter(([id, d]) => d >= DEBT_MIN && !inBatch.has(id) && !excludeIds.has(id))
                .sort((a, b) => b[1] - a[1])
                .slice(0, owedSlots);
            for (const [id] of creditors) {
                const entry = byScore.get(id);
                if (!entry)
                    continue;
                debt.delete(id);
                if (picked.length >= count)
                    picked.pop();
                picked.push(entry);
            }
        }
    }
    const out = picked.map(({ c, score, facet }) => {
        const hit = coWatch?.get(c.title.id);
        return {
            title: c.title,
            score,
            match: matchPercent((score - RANK_MIDPOINT) / RANK_SPREAD, confidence),
            reasons: explainMatch(facets, facetWeights, c.title).map((r) => ({
                kind: r.kind as string,
                label: r.label,
            })),
            becauseOf: hit?.from,
        };
    });
    if (mode === "discover")
        out.sort((a, b) => b.score - a.score);
    return out;
}
export function calibrationDeck(pool: CandidateItem[], excludeIds: Set<string>, count: number): Title[] {
    const anchors = pool.filter((c) => c.title.onboarding && !excludeIds.has(c.title.id));
    const base = anchors.length > 0 ? anchors : pool.filter((c) => !excludeIds.has(c.title.id));
    if (base.length === 0)
        return [];
    const sorted = [...base].sort((a, b) => b.title.voteCount - a.title.voteCount);
    const picked: CandidateItem[] = [sorted[0]];
    const rest = sorted.slice(1, 400);
    const sig = (c: CandidateItem) => {
        const t = titleTokens(c.title);
        return new Set([...t.genre, ...t.story.slice(0, 6)]);
    };
    const overlap = (a: Set<string>, b: Set<string>) => {
        let shared = 0;
        for (const x of a)
            if (b.has(x))
                shared++;
        return shared / Math.max(1, Math.min(a.size, b.size));
    };
    const pickedSigs = [sig(picked[0])];
    while (picked.length < count && rest.length > 0) {
        let bestIdx = 0;
        let bestVal = -Infinity;
        for (let i = 0; i < rest.length; i++) {
            const s = sig(rest[i]);
            let maxOverlap = 0;
            for (const p of pickedSigs)
                maxOverlap = Math.max(maxOverlap, overlap(s, p));
            const val = 1 - maxOverlap + recognizability(rest[i].title.voteCount) * 0.35;
            if (val > bestVal) {
                bestVal = val;
                bestIdx = i;
            }
        }
        const chosen = rest.splice(bestIdx, 1)[0];
        picked.push(chosen);
        pickedSigs.push(sig(chosen));
    }
    return picked.map((p) => p.title);
}
export { DIM, isCalibrating };
export function frontierVotes(watched: Title[], exclude: Set<string>): Map<string, number> {
    const votes = new Map<string, number>();
    for (const t of watched) {
        for (const id of t.related ?? []) {
            if (exclude.has(id))
                continue;
            votes.set(id, (votes.get(id) ?? 0) + 1);
        }
    }
    return votes;
}
const FRONTIER_LIFT = num("FRONTIER_LIFT", 1);
const DECK_FRONTIER = num("DECK_FRONTIER", 0);
const DEBT_WINDOW = num("DEBT_WINDOW", 4);
const DEBT_EVERY = num("DEBT_EVERY", 0);
const DEBT_MIN = num("DEBT_MIN", 3);
const debt = new Map<string, number>();
let debtClock = 0;
export function resetExposureDebt(): void {
    debt.clear();
    debtClock = 0;
}
export function exposureDebtStats(): {
    owed: number;
    max: number;
} {
    let max = 0;
    let owed = 0;
    for (const d of debt.values()) {
        if (d >= DEBT_MIN)
            owed++;
        if (d > max)
            max = d;
    }
    return { owed, max };
}
export function watchedGrid(pool: CandidateItem[], profile: TasteProfile, opts: {
    excludeIds: Set<string>;
    count: number;
    seed?: number;
    watched?: Title[];
    reach?: ReachSetting;
}): Title[] {
    const { excludeIds, count } = opts;
    const seed = opts.seed ?? 1;
    const gated = fameGate(pool, fameTierSize(profile, "swipe", opts.reach), profile.facets, profile);
    const votes = frontierVotes(opts.watched ?? [], excludeIds);
    const scored: {
        t: Title;
        w: number;
    }[] = [];
    for (const c of gated) {
        if (excludeIds.has(c.title.id))
            continue;
        const w = watchLikelihood(profile, titleTokens(c.title), reachPrior(c.title));
        const lift = votes.size > 0 ? FRONTIER_LIFT * (votes.get(c.title.id) ?? 0) : 0;
        scored.push({ t: c.title, w: w + lift + JITTER * jitterFor(c.title.id, seed) });
    }
    scored.sort((a, b) => b.w - a.w);
    const perEra = Math.max(3, Math.round(count / 4));
    const perLang = Math.max(4, Math.round(count / 3));
    const eras = new Map<number, number>();
    const langs = new Map<string, number>();
    const out: Title[] = [];
    const spare: Title[] = [];
    for (const { t } of scored) {
        if (out.length >= count)
            break;
        const era = Math.floor(t.year / 10);
        const lang = t.originalLanguage;
        if ((eras.get(era) ?? 0) >= perEra || (langs.get(lang) ?? 0) >= perLang) {
            if (spare.length < count)
                spare.push(t);
            continue;
        }
        eras.set(era, (eras.get(era) ?? 0) + 1);
        langs.set(lang, (langs.get(lang) ?? 0) + 1);
        out.push(t);
    }
    for (const t of spare) {
        if (out.length >= count)
            break;
        out.push(t);
    }
    return out;
}
