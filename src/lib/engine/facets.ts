import type { SwipeAction, Title } from "../types";
export const FACET_KINDS = [
    "story",
    "genre",
    "cast",
    "director",
    "era",
    "language",
    "fame",
    "region",
] as const;
export type FacetKind = (typeof FACET_KINDS)[number];
export type FacetTable = Record<string, [
    number,
    number
]>;
export type FacetTables = Record<FacetKind, FacetTable>;
export type FacetWeights = Record<FacetKind, number>;
export const LIKE_SIGNAL = 1;
export const DISLIKE_SIGNAL = typeof process !== "undefined" && process.env?.DISLIKE
    ? -Number(process.env.DISLIKE)
    : -1;
export const SKIP_SIGNAL = -0.35;
const TOKEN_K = 1.5;
const MAX_KEYWORDS = 14;
const MAX_CAST = 4;
export const STREAK_TRIGGER = 3;
export const COOLDOWN_SWIPES = 40;
const DEFAULT_WEIGHTS: FacetWeights = {
    story: 1.15,
    genre: 1.0,
    cast: 0.7,
    director: 0.6,
    era: 0.55,
    language: 0.45,
    fame: 0,
    region: 0,
};
const WEIGHT_LR = 0.09;
const WEIGHT_MIN = 0.15;
const WEIGHT_MAX = 2.6;
const WEIGHT_WARMUP = 3;
const MAX_TOKENS: Record<FacetKind, number> = {
    story: 1400,
    genre: 64,
    cast: 900,
    director: 500,
    era: 24,
    language: 48,
    fame: 8,
    region: 128,
};
export function emptyFacets(): FacetTables {
    return {
        story: {},
        genre: {},
        cast: {},
        director: {},
        era: {},
        language: {},
        fame: {},
        region: {},
    };
}
export function emptyFacetWeights(): FacetWeights {
    return { ...DEFAULT_WEIGHTS };
}
export type TitleTokens = Record<FacetKind, string[]>;
const norm = (s: string) => s.trim().toLowerCase();
const tokenCache = new Map<string, TitleTokens>();
export function fameBand(voteCount: number): string {
    const v = Math.max(0, voteCount);
    if (v < 100)
        return "f0";
    if (v < 300)
        return "f1";
    if (v < 800)
        return "f2";
    if (v < 2000)
        return "f3";
    if (v < 5000)
        return "f4";
    if (v < 12000)
        return "f5";
    if (v < 30000)
        return "f6";
    return "f7";
}
let regions: Map<string, string> | null = null;
export function installRegions(byTitleId: Map<string, number>): void {
    regions = new Map();
    for (const [id, r] of byTitleId)
        regions.set(id, `r${r}`);
    tokenCache.clear();
}
function regionOf(id: string): string[] {
    const r = regions?.get(id);
    return r ? [r] : [];
}
export function titleTokens(title: Title): TitleTokens {
    const hit = tokenCache.get(title.id);
    if (hit)
        return hit;
    const decade = `${Math.floor(title.year / 10) * 10}s`;
    const tokens: TitleTokens = {
        story: title.keywords.slice(0, MAX_KEYWORDS).map(norm),
        genre: title.genres.map(norm),
        cast: title.people.cast.slice(0, MAX_CAST).map(norm),
        director: title.people.director ? [norm(title.people.director)] : [],
        era: [decade],
        language: [norm(title.originalLanguage)],
        fame: [fameBand(title.voteCount)],
        region: regionOf(title.id),
    };
    tokenCache.set(title.id, tokens);
    return tokens;
}
const rarity: Record<FacetKind, Record<string, number>> = {
    story: {},
    genre: {},
    cast: {},
    director: {},
    era: {},
    language: {},
    fame: {},
    region: {},
};
let rarityReady = false;
const RARITY_MIN = 0.08;
export function buildRarityIndex(titles: Title[]): void {
    const n = titles.length;
    if (n === 0)
        return;
    const df: Record<FacetKind, Map<string, number>> = {
        story: new Map(),
        genre: new Map(),
        cast: new Map(),
        director: new Map(),
        era: new Map(),
        language: new Map(),
        fame: new Map(),
        region: new Map(),
    };
    for (const title of titles) {
        const tokens = titleTokens(title);
        for (const kind of FACET_KINDS) {
            for (const token of new Set(tokens[kind])) {
                df[kind].set(token, (df[kind].get(token) ?? 0) + 1);
            }
        }
    }
    for (const kind of FACET_KINDS) {
        const table: Record<string, number> = {};
        for (const [token, count] of df[kind]) {
            table[token] = Math.max(RARITY_MIN, 1 - count / n);
        }
        rarity[kind] = table;
    }
    rarityReady = true;
}
type Pending = {
    titles: Title[];
    i: number;
    n: number;
    df: Record<FacetKind, Map<string, number>>;
};
let pending: Pending | null = null;
const SLICE = 400;
function emptyDf(): Record<FacetKind, Map<string, number>> {
    return {
        story: new Map(),
        genre: new Map(),
        cast: new Map(),
        director: new Map(),
        era: new Map(),
        language: new Map(),
        fame: new Map(),
        region: new Map(),
    };
}
function step(p: Pending, upTo: number): void {
    const end = Math.min(p.n, upTo);
    for (; p.i < end; p.i++) {
        const tokens = titleTokens(p.titles[p.i]);
        for (const kind of FACET_KINDS) {
            for (const token of new Set(tokens[kind])) {
                p.df[kind].set(token, (p.df[kind].get(token) ?? 0) + 1);
            }
        }
    }
}
function finalise(p: Pending): void {
    for (const kind of FACET_KINDS) {
        const table: Record<string, number> = {};
        for (const [token, count] of p.df[kind]) {
            table[token] = Math.max(RARITY_MIN, 1 - count / p.n);
        }
        rarity[kind] = table;
    }
    rarityReady = true;
    pending = null;
}
export function buildRarityIndexIdle(titles: Title[]): void {
    const n = titles.length;
    if (n === 0)
        return;
    const p: Pending = { titles, i: 0, n, df: emptyDf() };
    pending = p;
    const idle: (cb: () => void) => void = typeof requestIdleCallback === "function"
        ? (cb) => requestIdleCallback(() => cb(), { timeout: 2000 })
        : (cb) => setTimeout(cb, 24);
    const pump = () => {
        if (pending !== p)
            return;
        step(p, p.i + SLICE);
        if (p.i >= p.n)
            finalise(p);
        else
            idle(pump);
    };
    idle(pump);
}
export function ensureRarityIndex(): void {
    if (!pending)
        return;
    const p = pending;
    step(p, p.n);
    finalise(p);
}
function rarityOf(kind: FacetKind, token: string): number {
    if (!rarityReady)
        return 1;
    return rarity[kind][token] ?? 1;
}
const NEG_RARITY = typeof process !== "undefined" && process.env?.NEG_RARITY
    ? Number(process.env.NEG_RARITY)
    : 1;
function tokenWeight(table: FacetTable, kind: FacetKind, token: string): number {
    const entry = table[token];
    if (!entry)
        return 0;
    const rarity = rarityOf(kind, token);
    if (NEG_RARITY === 1)
        return (entry[0] / (entry[1] + TOKEN_K)) * rarity;
    const [net, mass] = entry;
    const positive = (mass + net) / 2;
    const negative = (mass - net) / 2;
    const adjusted = positive * rarity - negative * Math.pow(rarity, NEG_RARITY);
    return adjusted / (mass + TOKEN_K);
}
export interface FacetScore {
    total: number;
    perKind: Record<FacetKind, number>;
}
export function facetScore(tables: FacetTables, weights: FacetWeights, tokens: TitleTokens, cooldown?: Record<string, number>, swipeClock = 0): FacetScore {
    const perKind = {} as Record<FacetKind, number>;
    let weighted = 0;
    let weightSum = 0;
    for (const kind of FACET_KINDS) {
        const list = tokens[kind];
        if (list.length === 0) {
            perKind[kind] = 0;
            continue;
        }
        const table = tables[kind];
        let sum = 0;
        for (const token of list) {
            if (cooldown && (cooldown[token] ?? 0) > swipeClock) {
                sum -= 1;
                continue;
            }
            sum += tokenWeight(table, kind, token);
        }
        const raw = Math.tanh(sum / Math.sqrt(list.length));
        perKind[kind] = raw;
        weighted += weights[kind] * raw;
        weightSum += weights[kind];
    }
    return { total: weightSum > 0 ? weighted / weightSum : 0, perKind };
}
const SKIP_SCALE: Record<FacetKind, number> = {
    story: 1,
    genre: typeof process !== "undefined" && process.env?.SKIP_GENRE
        ? Number(process.env.SKIP_GENRE)
        : 0,
    cast: 1,
    director: 1,
    era: 1,
    language: 1,
    fame: 1,
    region: 1,
};
const DISLIKE_FACETS = new Set<FacetKind>(FACET_KINDS);
export function facetSignals(action: SwipeAction): Record<FacetKind, number> {
    const out = {} as Record<FacetKind, number>;
    if (action === "seen") {
        for (const kind of FACET_KINDS)
            out[kind] = 0;
        return out;
    }
    const base = action === "liked" ? LIKE_SIGNAL : action === "disliked" ? DISLIKE_SIGNAL : SKIP_SIGNAL;
    for (const kind of FACET_KINDS) {
        out[kind] = action === "not_seen" ? base * SKIP_SCALE[kind] : base;
    }
    if (action === "disliked") {
        const allow = typeof process !== "undefined" && process.env?.DIS_FACETS
            ? new Set(process.env.DIS_FACETS.split(","))
            : DISLIKE_FACETS;
        for (const kind of FACET_KINDS)
            if (!allow.has(kind))
                out[kind] = 0;
    }
    out.fame = 0;
    return out;
}
export function seenSignals(action: SwipeAction): Record<FacetKind, number> {
    const base = action === "not_seen" ? -1 : 1;
    const out = {} as Record<FacetKind, number>;
    for (const kind of FACET_KINDS)
        out[kind] = base;
    return out;
}
const seenBase = new WeakMap<FacetTable, number>();
function baseRate(table: FacetTable): number {
    const hit = seenBase.get(table);
    if (hit !== undefined)
        return hit;
    let net = 0;
    let mass = 0;
    for (const key in table) {
        net += table[key][0];
        mass += table[key][1];
    }
    const base = mass > 0 ? net / (mass + TOKEN_K) : 0;
    seenBase.set(table, base);
    return base;
}
export function seenScore(tables: FacetTables, tokens: TitleTokens): number {
    let weighted = 0;
    let weightSum = 0;
    for (const kind of FACET_KINDS) {
        const list = tokens[kind];
        if (list.length === 0)
            continue;
        const table = tables[kind];
        const base = baseRate(table);
        let sum = 0;
        for (const token of list) {
            const entry = table[token];
            sum += entry
                ? (entry[0] / (entry[1] + TOKEN_K)) * rarityOf(kind, token)
                : base;
        }
        weighted += SEEN_WEIGHTS[kind] * Math.tanh(sum / Math.sqrt(list.length));
        weightSum += SEEN_WEIGHTS[kind];
    }
    return weightSum > 0 ? weighted / weightSum : 0;
}
const seenEnv = (k: string, d: number) => typeof process !== "undefined" && process.env?.[`SW_${k.toUpperCase()}`]
    ? Number(process.env[`SW_${k.toUpperCase()}`])
    : d;
export const SEEN_WEIGHTS: FacetWeights = {
    story: seenEnv("story", 0.6),
    genre: seenEnv("genre", 1.4),
    cast: seenEnv("cast", 0.5),
    director: seenEnv("director", 0.4),
    era: seenEnv("era", 1.1),
    language: seenEnv("language", 0.8),
    fame: seenEnv("fame", 1.6),
    region: seenEnv("region", 0),
};
const round3 = (x: number) => Math.round(x * 1000) / 1000;
const CONTRAST = typeof process !== "undefined" && process.env?.CONTRAST
    ? Number(process.env.CONTRAST)
    : 1.5;
const CONTRAST_FLOOR = 0.15;
export function applyFacets(tables: FacetTables, tokens: TitleTokens, signals: Record<FacetKind, number>, contrast = false): FacetTables {
    const next = { ...tables };
    for (const kind of FACET_KINDS) {
        const list = tokens[kind];
        const signal = signals[kind];
        if (list.length === 0 || signal === 0)
            continue;
        const table = { ...next[kind] };
        for (const token of list) {
            const prev = table[token];
            let s = signal;
            if (contrast && signal < 0 && CONTRAST > 0 && prev) {
                const support = Math.max(0, prev[0] / (prev[1] + TOKEN_K));
                s = signal * Math.max(CONTRAST_FLOOR, 1 - CONTRAST * support);
            }
            const mass = Math.abs(s);
            table[token] = prev
                ? [round3(prev[0] + s), round3(prev[1] + mass)]
                : [round3(s), round3(mass)];
        }
        next[kind] = table;
    }
    return next;
}
export function revertFacets(tables: FacetTables, tokens: TitleTokens, signals: Record<FacetKind, number>, contrast = false): FacetTables {
    const next = { ...tables };
    for (const kind of FACET_KINDS) {
        const list = tokens[kind];
        const signal = signals[kind];
        if (list.length === 0 || signal === 0)
            continue;
        const table = { ...next[kind] };
        for (const token of list) {
            const prev = table[token];
            if (!prev)
                continue;
            let d = signal;
            if (contrast && signal < 0 && CONTRAST > 0) {
                for (let i = 0; i < 12; i++) {
                    const beforeNet = prev[0] - d;
                    const beforeMass = prev[1] + d;
                    const support = Math.max(0, beforeNet / (beforeMass + TOKEN_K));
                    const next = signal * Math.max(CONTRAST_FLOOR, 1 - CONTRAST * support);
                    if (Math.abs(next - d) < 1e-9) {
                        d = next;
                        break;
                    }
                    d = next;
                }
            }
            const s = round3(prev[0] - d);
            const n = round3(prev[1] - Math.abs(d));
            if (n <= 0.001)
                delete table[token];
            else
                table[token] = [s, n];
        }
        next[kind] = table;
    }
    return next;
}
export function pruneFacets(tables: FacetTables): FacetTables {
    const next = { ...tables };
    for (const kind of FACET_KINDS) {
        const table = next[kind];
        const keys = Object.keys(table);
        const limit = MAX_TOKENS[kind];
        if (keys.length <= limit)
            continue;
        keys.sort((a, b) => {
            const ea = table[a];
            const eb = table[b];
            return Math.abs(eb[0]) * eb[1] - Math.abs(ea[0]) * ea[1];
        });
        const kept: FacetTable = {};
        for (let i = 0; i < limit; i++)
            kept[keys[i]] = table[keys[i]];
        next[kind] = kept;
    }
    return next;
}
export function updateFacetWeights(weights: FacetWeights, perKind: Record<FacetKind, number>, action: SwipeAction, ratedSwipes: number): FacetWeights {
    if (action === "not_seen" || action === "seen" || ratedSwipes < WEIGHT_WARMUP) {
        return weights;
    }
    const target = action === "liked" ? 1 : -1;
    const next = {} as FacetWeights;
    let sum = 0;
    for (const kind of FACET_KINDS) {
        const agreement = (perKind[kind] ?? 0) * target;
        const w = weights[kind] * (1 + WEIGHT_LR * Math.tanh(agreement * 2));
        next[kind] = Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, w));
        sum += next[kind];
    }
    const target_mean = FACET_KINDS.length;
    const scale = sum > 0 ? target_mean / sum : 1;
    for (const kind of FACET_KINDS)
        next[kind] = round3(next[kind] * scale);
    return next;
}
export interface StreakState {
    runs: Record<string, number>;
    cooldown: Record<string, number>;
}
export function emptyStreaks(): StreakState {
    return { runs: {}, cooldown: {} };
}
const STREAK_KINDS: FacetKind[] = ["story", "cast"];
export function trackStreak(state: StreakState, tokens: TitleTokens, action: SwipeAction, swipeClock: number): {
    state: StreakState;
    benched: string[];
} {
    if (action !== "not_seen") {
        return { state: { runs: {}, cooldown: state.cooldown }, benched: [] };
    }
    const runs: Record<string, number> = {};
    const cooldown = { ...state.cooldown };
    const benched: string[] = [];
    for (const kind of STREAK_KINDS) {
        for (const token of tokens[kind]) {
            const run = (state.runs[token] ?? 0) + 1;
            runs[token] = run;
            if (run >= STREAK_TRIGGER) {
                cooldown[token] = swipeClock + COOLDOWN_SWIPES;
                benched.push(token);
            }
        }
    }
    for (const token of Object.keys(cooldown)) {
        if (cooldown[token] <= swipeClock)
            delete cooldown[token];
    }
    return { state: { runs, cooldown }, benched };
}
function labelFor(title: Title, kind: FacetKind, token: string): string {
    const pools: Record<FacetKind, string[]> = {
        story: title.keywords,
        genre: title.genres,
        cast: title.people.cast,
        director: title.people.director ? [title.people.director] : [],
        era: [`${Math.floor(title.year / 10) * 10}s`],
        language: [title.originalLanguage.toUpperCase()],
        fame: [`${title.voteCount.toLocaleString()} votes`],
        region: [],
    };
    return pools[kind].find((v) => norm(v) === token) ?? token;
}
export interface MatchReason {
    kind: FacetKind;
    label: string;
    strength: number;
}
export function explainMatch(tables: FacetTables, weights: FacetWeights, title: Title, limit = 3): MatchReason[] {
    const tokens = titleTokens(title);
    const reasons: MatchReason[] = [];
    for (const kind of FACET_KINDS) {
        const table = tables[kind];
        for (const token of tokens[kind]) {
            const strength = tokenWeight(table, kind, token) * weights[kind];
            if (strength > 0.08) {
                reasons.push({ kind, label: labelFor(title, kind, token), strength });
            }
        }
    }
    reasons.sort((a, b) => b.strength - a.strength);
    const seen = new Set<FacetKind>();
    const out: MatchReason[] = [];
    for (const r of reasons) {
        if (seen.has(r.kind))
            continue;
        seen.add(r.kind);
        out.push(r);
        if (out.length >= limit)
            break;
    }
    return out;
}
export function matchPercent(total: number, confidence: number): number {
    const centred = total * 3.2 - 0.35;
    const p = 1 / (1 + Math.exp(-centred));
    return Math.round((0.5 + (p - 0.5) * (0.35 + 0.65 * confidence)) * 100);
}
