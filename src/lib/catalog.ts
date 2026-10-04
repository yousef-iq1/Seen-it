import { SAMPLE_TITLES } from "@/lib/data/sample-titles";
import { STARTER_PACK } from "@/lib/data/starter-pack";
import { decodeCatalog, decodeRange, type EncodedCatalog } from "@/lib/data/catalog-codec";
import { buildRarityIndex, buildRarityIndexIdle } from "@/lib/engine/facets";
import { featurize } from "@/lib/engine/features";
import type { CandidateItem } from "@/lib/engine/recommend";
import type { Title } from "@/lib/types";
let lean = false;
export function setLeanMode() {
    lean = true;
}
let encoded: EncodedCatalog | null = null;
let items: CandidateItem[] | null = null;
let byId = new Map<string, CandidateItem>();
let loadPromise: Promise<CandidateItem[]> | null = null;
function build(titles: Title[]): CandidateItem[] {
    const built: CandidateItem[] = titles.map((title) => ({ title }));
    items = built;
    byId = new Map(built.map((c) => [c.title.id, c]));
    if (lean || typeof window === "undefined")
        buildRarityIndex(titles);
    else
        buildRarityIndexIdle(titles);
    return built;
}
function fallback(): CandidateItem[] {
    if (!items)
        build(STARTER_PACK.length > 0 ? STARTER_PACK : SAMPLE_TITLES);
    return items!;
}
function whenIdle(fn: () => void): void {
    if (typeof requestIdleCallback === "function")
        requestIdleCallback(() => fn(), { timeout: 4000 });
    else
        setTimeout(fn, 1200);
}
async function decodeSpread(data: EncodedCatalog): Promise<Title[]> {
    const n = data.t.length;
    const out: Title[] = [];
    for (let i = 0; i < n; i += 2000) {
        out.push(...decodeRange(data, i, Math.min(n, i + 2000)));
        if (i + 2000 < n)
            await new Promise<void>((r) => whenIdle(r));
    }
    return out;
}
function assetUrl(path: string): string {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    return `${base}${path}`;
}
async function attachOverviews(titles: Title[]): Promise<void> {
    try {
        const res = await fetch(assetUrl("/overviews.json"), { cache: "force-cache" });
        if (!res.ok)
            return;
        const map = (await res.json()) as Record<string, [
            string,
            string
        ]>;
        for (const t of titles) {
            const o = map[t.id];
            if (o)
                t.overview = { en: o[0], ar: o[1] || o[0] };
        }
    }
    catch {
    }
}
export function installEncodedCatalog(data: EncodedCatalog): void {
    if (loadPromise)
        return;
    encoded = data;
    loadPromise = Promise.resolve(build(decodeCatalog(data)));
}
export function getEncodedCatalog(): EncodedCatalog | null {
    return encoded;
}
export function loadCatalog(): Promise<CandidateItem[]> {
    if (loadPromise)
        return loadPromise;
    loadPromise = (async () => {
        try {
            const res = await fetch(assetUrl("/catalog.json"), { cache: "force-cache" });
            if (!res.ok)
                throw new Error(`catalog ${res.status}`);
            const data = (await res.json()) as EncodedCatalog;
            if (!data?.t?.length)
                throw new Error("empty catalog");
            encoded = data;
            const titles = lean || typeof window === "undefined"
                ? decodeCatalog(data)
                : await decodeSpread(data);
            const ready = build(titles);
            if (!lean) {
                whenIdle(() => {
                    void attachOverviews(titles);
                    void import("./search").then((m) => m.warmSearchIndex());
                });
            }
            return ready;
        }
        catch {
            return fallback();
        }
    })();
    return loadPromise;
}
export function getLocalCatalog(): CandidateItem[] {
    return items ?? fallback();
}
export function getLocalItem(id: string): CandidateItem | undefined {
    getLocalCatalog();
    return byId.get(id);
}
export function getLocalTitle(id: string): Title | undefined {
    return getLocalItem(id)?.title;
}
const vectorCache = new Map<string, Float32Array>();
export function vectorOf(title: Title): Float32Array {
    let v = vectorCache.get(title.id);
    if (!v) {
        const item = getLocalItem(title.id);
        v = item?.vector ?? featurize(title);
        if (item)
            item.vector = v;
        vectorCache.set(title.id, v);
    }
    return v;
}
