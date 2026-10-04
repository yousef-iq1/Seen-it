import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { decodeRange, type EncodedCatalog } from "@/lib/data/catalog-codec";
import { TASTE_SEEDS, resolveSeeds } from "@/lib/data/taste-seeds";
import { featurize } from "@/lib/engine/features";
import type { CandidateItem } from "@/lib/engine/recommend";
import type { Title } from "@/lib/types";
import { normalise } from "@/lib/search-core";
type SeenItCatalogRuntimeCache = {
    data: EncodedCatalog;
    byId: Map<string, number>;
    searchHay: string[];
    fameOrder: number[];
};

declare global {
    var __seenItCatalogRuntime: SeenItCatalogRuntimeCache | undefined;
}

let encodedPromise: Promise<EncodedCatalog> | null = null;
let byId: Map<string, number> | null = null;
let searchHay: string[] | null = null;
let fameOrder: number[] | null = null;
function idAt(data: EncodedCatalog, i: number): string {
    const row = data.t[i];
    return `${row[1] === 1 ? "tv" : "movie"}-${row[0]}`;
}
async function getEncoded(): Promise<EncodedCatalog> {
    const shared = globalThis.__seenItCatalogRuntime;
    if (shared) {
        byId = shared.byId;
        searchHay = shared.searchHay;
        fameOrder = shared.fameOrder;
        return shared.data;
    }

    encodedPromise ??= (async () => {
        const dataBase = (process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "").replace(/\/$/, "");
        const remoteUrl = process.env.SEEN_IT_CATALOG_URL ?? (dataBase ? `${dataBase}/catalog.json` : "");
        let raw: string;
        if (remoteUrl) {
            const response = await fetch(remoteUrl, { cache: "force-cache" });
            if (!response.ok)
                throw new Error(`catalog ${response.status}`);
            raw = await response.text();
        } else {
            raw = await readFile(join(process.cwd(), "public", "catalog.json"), "utf8");
        }
        const data = JSON.parse(raw) as EncodedCatalog;
        byId = new Map();
        for (let i = 0; i < data.t.length; i++) {
            byId.set(idAt(data, i), i);
        }

        let loadedPrebuiltIndex = false;
        if (!remoteUrl) {
            try {
                const indexRaw = await readFile(join(process.cwd(), "public", "catalog-search-index.json"), "utf8");
                const index = JSON.parse(indexRaw) as { v?: number; h?: unknown; f?: unknown };
                if (index.v === 1 &&
                    Array.isArray(index.h) &&
                    index.h.length === data.t.length &&
                    Array.isArray(index.f) &&
                    index.f.length === data.t.length) {
                    searchHay = index.h as string[];
                    fameOrder = index.f as number[];
                    loadedPrebuiltIndex = true;
                }
            }
            catch {
                // Fall back to building the index at runtime.
            }
        }

        if (!loadedPrebuiltIndex) {
            searchHay = new Array(data.t.length);
            fameOrder = Array.from({ length: data.t.length }, (_, i) => i);
            for (let i = 0; i < data.t.length; i++) {
                const row = data.t[i];
                const en = row[2];
                const ar = row[3] || en;
                const original = row[17] || "";
                searchHay[i] = `${normalise(en)} ${normalise(ar)} ${normalise(original)}`;
            }
            fameOrder.sort((a, b) => data.t[b][12] - data.t[a][12]);
        }
        globalThis.__seenItCatalogRuntime = {
            data,
            byId: byId!,
            searchHay: searchHay!,
            fameOrder: fameOrder!,
        };
        return data;
    })();
    return encodedPromise;
}

export async function warmServerCatalog(): Promise<void> {
    await getEncoded();
}
function decodeOne(data: EncodedCatalog, i: number): Title | undefined {
    return decodeRange(data, i, i + 1)[0];
}
export async function getServerCatalog(): Promise<CandidateItem[]> {
    throw new Error("full_server_catalog_disabled");
}
export async function serverTitlesFor(ids: string[]): Promise<Title[]> {
    const data = await getEncoded();
    const index = byId!;
    const out: Title[] = [];
    for (const id of ids) {
        const i = index.get(id);
        if (i === undefined)
            continue;
        const title = decodeOne(data, i);
        if (title)
            out.push(title);
    }
    return out;
}
export function serverVectorOf(title: Title): Float32Array {
    return featurize(title);
}
export async function searchServerTitles(query: string, skipIds: Set<string>, limit = 24): Promise<Title[]> {
    const data = await getEncoded();
    const hay = searchHay!;
    const q = normalise(query);
    const max = Math.max(1, limit);
    if (q.length < 2) {
        const out: Title[] = [];
        for (const i of fameOrder!) {
            const id = idAt(data, i);
            if (skipIds.has(id))
                continue;
            const title = decodeOne(data, i);
            if (title)
                out.push(title);
            if (out.length >= max)
                break;
        }
        return out;
    }
    const starts: number[] = [];
    const contains: number[] = [];
    for (let i = 0; i < data.t.length; i++) {
        const at = hay[i].indexOf(q);
        if (at < 0)
            continue;
        if (skipIds.has(idAt(data, i)))
            continue;
        if (at === 0 || hay[i].charCodeAt(at - 1) === 32)
            starts.push(i);
        else
            contains.push(i);
    }
    const byFame = (a: number, b: number) => data.t[b][12] - data.t[a][12];
    starts.sort(byFame);
    contains.sort(byFame);
    const picked = [...starts, ...contains].slice(0, max);
    return picked
        .map((i) => decodeOne(data, i))
        .filter((title): title is Title => Boolean(title));
}
export async function serverOnboardingTitles(limit = 48): Promise<Title[]> {
    const data = await getEncoded();
    const wanted = new Set(TASTE_SEEDS.flatMap((lane) => lane.titles.map((entry) => normalise(entry.name))));
    const candidates: Title[] = [];
    for (let i = 0; i < data.t.length; i++) {
        if (!wanted.has(normalise(data.t[i][2])))
            continue;
        const title = decodeOne(data, i);
        if (title)
            candidates.push(title);
    }
    return resolveSeeds(candidates, limit);
}
