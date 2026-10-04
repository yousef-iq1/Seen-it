"use client";
import { getLocalCatalog } from "@/lib/catalog";
import type { Title } from "@/lib/types";
export const SENTINEL_EVERY = 40;
const STRATA = 5;
export interface SentinelDraw {
    title: Title;
    probability: number;
    stratum: number;
}
function stratumOf(index: number, total: number): number {
    return Math.min(STRATA - 1, Math.floor((index / Math.max(total, 1)) * STRATA));
}
let cache: {
    titles: Title[];
    strata: Title[][];
} | null = null;
function strata(): Title[][] {
    const titles = getLocalCatalog().map((c) => c.title);
    if (cache && cache.titles.length === titles.length)
        return cache.strata;
    const ordered = [...titles].sort((a, b) => b.voteCount - a.voteCount);
    const out: Title[][] = Array.from({ length: STRATA }, () => []);
    ordered.forEach((t, i) => out[stratumOf(i, ordered.length)].push(t));
    cache = { titles, strata: out };
    return out;
}
export function drawSentinel(exclude: Set<string>, rng: () => number): SentinelDraw | null {
    const groups = strata();
    const total = groups.reduce((n, g) => n + g.length, 0);
    if (total === 0)
        return null;
    const order = [...Array(STRATA).keys()].sort(() => rng() - 0.5);
    for (const s of order) {
        const group = groups[s];
        if (group.length === 0)
            continue;
        for (let attempt = 0; attempt < 24; attempt++) {
            const pick = group[Math.floor(rng() * group.length)];
            if (!pick || exclude.has(pick.id))
                continue;
            return {
                title: pick,
                probability: (1 / STRATA) * (1 / group.length),
                stratum: s,
            };
        }
    }
    return null;
}
export interface SentinelRecord {
    titleId: string;
    probability: number;
    stratum: number;
    at: number;
    catalogSize: number;
}
const KEY = "seen-it-sentinels";
export function recordSentinel(titleId: string, draw: SentinelDraw): void {
    if (typeof localStorage === "undefined")
        return;
    try {
        const raw = localStorage.getItem(KEY);
        const list = (raw ? (JSON.parse(raw) as SentinelRecord[]) : []).slice(-500);
        list.push({
            titleId,
            probability: draw.probability,
            stratum: draw.stratum,
            at: Date.now(),
            catalogSize: getLocalCatalog().length,
        });
        localStorage.setItem(KEY, JSON.stringify(list));
    }
    catch {
    }
}
export function readSentinels(): SentinelRecord[] {
    if (typeof localStorage === "undefined")
        return [];
    try {
        return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SentinelRecord[];
    }
    catch {
        return [];
    }
}
