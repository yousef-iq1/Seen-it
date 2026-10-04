import { DIM } from "./features";
import { applyFacets, emptyFacets, emptyFacetWeights, emptyStreaks, ensureRarityIndex, facetScore, pruneFacets, revertFacets, facetSignals, seenSignals, titleTokens, trackStreak, updateFacetWeights, seenScore, type FacetTables, type FacetWeights, type StreakState, type TitleTokens, } from "./facets";
import type { SwipeAction, Title } from "../types";
export interface TasteProfile {
    facets: FacetTables;
    facetWeights: FacetWeights;
    streaks: StreakState;
    taste: number[];
    likedSum: number[];
    likedCount: number;
    dislikedSum: number[];
    dislikedCount: number;
    ratedSwipes: number;
    totalSwipes: number;
    recent: string[][];
    seenCount: number;
    unseenStreak: number;
    unseenCount: number;
    seenFacets: FacetTables;
}
export const LIKE_WEIGHT = 1.0;
export const DISLIKE_WEIGHT = -0.7;
export const RECENCY_DECAY = 0.995;
export const RECENT_LIKES = 5;
export function emptyProfile(): TasteProfile {
    return {
        facets: emptyFacets(),
        facetWeights: emptyFacetWeights(),
        streaks: emptyStreaks(),
        taste: new Array(DIM).fill(0),
        likedSum: new Array(DIM).fill(0),
        likedCount: 0,
        dislikedSum: new Array(DIM).fill(0),
        dislikedCount: 0,
        recent: [],
        ratedSwipes: 0,
        totalSwipes: 0,
        seenCount: 0,
        unseenCount: 0,
        unseenStreak: 0,
        seenFacets: emptyFacets(),
    };
}
export function normalizeProfile(p: Partial<TasteProfile> | undefined): TasteProfile {
    const base = emptyProfile();
    if (!p)
        return base;
    const vec = (v: unknown, fallback: number[]) => Array.isArray(v) && v.length === DIM ? (v as number[]) : fallback;
    return {
        ...base,
        ...p,
        facets: p.facets && typeof p.facets === "object" ? { ...base.facets, ...p.facets } : base.facets,
        seenFacets: p.seenFacets && typeof p.seenFacets === "object"
            ? { ...base.seenFacets, ...p.seenFacets }
            : base.seenFacets,
        facetWeights: p.facetWeights && typeof p.facetWeights === "object"
            ? { ...base.facetWeights, ...p.facetWeights }
            : base.facetWeights,
        streaks: p.streaks && typeof p.streaks === "object"
            ? { runs: p.streaks.runs ?? {}, cooldown: p.streaks.cooldown ?? {} }
            : base.streaks,
        taste: vec(p.taste, base.taste),
        likedSum: vec(p.likedSum, base.likedSum),
        dislikedSum: vec(p.dislikedSum, base.dislikedSum),
        likedCount: p.likedCount ?? 0,
        dislikedCount: p.dislikedCount ?? 0,
        ratedSwipes: p.ratedSwipes ?? 0,
        totalSwipes: p.totalSwipes ?? p.ratedSwipes ?? 0,
        recent: Array.isArray(p.recent) ? p.recent : [],
        seenCount: p.seenCount ?? 0,
        unseenCount: p.unseenCount ?? 0,
        unseenStreak: p.unseenStreak ?? 0,
    };
}
export function applySwipe(profile: TasteProfile, title: Title, vector: Float32Array | number[], action: SwipeAction): TasteProfile {
    ensureRarityIndex();
    const tokens = titleTokens(title);
    const signals = facetSignals(action);
    const before = facetScore(profile.facets, profile.facetWeights, tokens);
    const streak = trackStreak(profile.streaks, tokens, action, profile.totalSwipes);
    const next: TasteProfile = {
        ...profile,
        facets: pruneFacets(applyFacets(profile.facets, tokens, signals, action === "disliked")),
        seenFacets: pruneFacets(applyFacets(profile.seenFacets, tokens, seenSignals(action))),
        facetWeights: updateFacetWeights(profile.facetWeights, before.perKind, action, profile.ratedSwipes),
        streaks: streak.state,
        totalSwipes: profile.totalSwipes + 1,
    };
    if (action === "not_seen") {
        next.unseenCount = profile.unseenCount + 1;
        next.unseenStreak = profile.unseenStreak + 1;
        return next;
    }
    next.unseenStreak = 0;
    if (action === "seen") {
        next.seenCount = profile.seenCount + 1;
        return next;
    }
    next.taste = [...profile.taste];
    next.likedSum = [...profile.likedSum];
    next.dislikedSum = [...profile.dislikedSum];
    const w = action === "liked" ? LIKE_WEIGHT : DISLIKE_WEIGHT;
    for (let i = 0; i < DIM; i++) {
        next.taste[i] = next.taste[i] * RECENCY_DECAY + w * (vector[i] ?? 0);
    }
    next.seenCount = profile.seenCount + 1;
    if (action === "liked") {
        for (let i = 0; i < DIM; i++)
            next.likedSum[i] += vector[i] ?? 0;
        next.likedCount = profile.likedCount + 1;
        next.recent = [
            [...tokens.story.slice(0, 6), ...tokens.genre],
            ...profile.recent,
        ].slice(0, RECENT_LIKES);
    }
    else {
        for (let i = 0; i < DIM; i++)
            next.dislikedSum[i] += vector[i] ?? 0;
        next.dislikedCount = profile.dislikedCount + 1;
    }
    next.ratedSwipes = profile.ratedSwipes + 1;
    return next;
}
export function revertSwipe(profile: TasteProfile, title: Title, vector: Float32Array | number[], action: SwipeAction): TasteProfile {
    const tokens = titleTokens(title);
    const signals = facetSignals(action);
    const next: TasteProfile = {
        ...profile,
        facets: revertFacets(profile.facets, tokens, signals, action === "disliked"),
        seenFacets: revertFacets(profile.seenFacets, tokens, seenSignals(action)),
        streaks: { runs: {}, cooldown: profile.streaks.cooldown },
        totalSwipes: Math.max(0, profile.totalSwipes - 1),
    };
    if (action === "not_seen") {
        next.unseenCount = Math.max(0, profile.unseenCount - 1);
        return next;
    }
    if (action === "seen") {
        next.seenCount = Math.max(0, profile.seenCount - 1);
        return next;
    }
    next.taste = [...profile.taste];
    next.likedSum = [...profile.likedSum];
    next.dislikedSum = [...profile.dislikedSum];
    const w = action === "liked" ? LIKE_WEIGHT : DISLIKE_WEIGHT;
    for (let i = 0; i < DIM; i++) {
        next.taste[i] = (next.taste[i] - w * (vector[i] ?? 0)) / RECENCY_DECAY;
    }
    next.seenCount = Math.max(0, profile.seenCount - 1);
    if (action === "liked") {
        for (let i = 0; i < DIM; i++)
            next.likedSum[i] -= vector[i] ?? 0;
        next.likedCount = Math.max(0, profile.likedCount - 1);
    }
    else {
        for (let i = 0; i < DIM; i++)
            next.dislikedSum[i] -= vector[i] ?? 0;
        next.dislikedCount = Math.max(0, profile.dislikedCount - 1);
    }
    next.ratedSwipes = Math.max(0, profile.ratedSwipes - 1);
    return next;
}
export const TASTE_CONFIDENCE_K = 4;
export function tasteConfidence(profile: TasteProfile): number {
    const evidence = profile.ratedSwipes + 0.45 * profile.unseenCount;
    return evidence / (evidence + TASTE_CONFIDENCE_K);
}
export const SEEN_CONFIDENCE_K = 8;
const SEEN_MAX_TRUST = 0.75;
function answerBalance(profile: TasteProfile): number {
    const answered = profile.seenCount + profile.unseenCount;
    if (answered === 0)
        return 0;
    const p = profile.seenCount / answered;
    return 4 * p * (1 - p);
}
export function seenTrust(profile: TasteProfile): number {
    const evidence = profile.totalSwipes;
    return (SEEN_MAX_TRUST *
        (evidence / (evidence + SEEN_CONFIDENCE_K)) *
        answerBalance(profile));
}
export function watchLikelihood(profile: TasteProfile, tokens: TitleTokens, fame: number): number {
    const w = seenTrust(profile);
    if (w <= 0)
        return fame;
    const personal = 0.5 + 0.5 * seenScore(profile.seenFacets, tokens);
    return (1 - w) * fame + w * personal;
}
export const COLD_START_TARGET = 8;
const COLD_START_MAX_CARDS = 30;
export function isCalibrating(profile: TasteProfile): boolean {
    return (profile.ratedSwipes < COLD_START_TARGET &&
        profile.totalSwipes < COLD_START_MAX_CARDS);
}
