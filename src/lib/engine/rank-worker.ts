import { getLocalItem, installEncodedCatalog, loadCatalog, setLeanMode, vectorOf, } from "@/lib/catalog";
import type { EncodedCatalog } from "@/lib/data/catalog-codec";
import { recommend } from "./recommend";
import type { TasteProfile } from "./taste";
import type { Title } from "@/lib/types";
export interface RankRequest {
    id: number;
    mode: "swipe" | "discover";
    profile: TasteProfile;
    excludeIds: string[];
    count: number;
    seed: number;
    likedIds: string[];
    dislikedIds: string[];
    seenIds?: string[];
    homeLanguages?: string[];
    reach?: "narrow" | "medium" | "wide";
    withReasons?: boolean;
}
export interface RankReply {
    id: number;
    ids: string[];
    match?: number[];
    reasons?: string[][];
    becauseOf?: (string | null)[];
    error?: string;
}
setLeanMode();
let ready: Promise<unknown> | null = null;
function titlesFor(ids: string[]): Title[] {
    const out: Title[] = [];
    for (const id of ids) {
        const item = getLocalItem(id);
        if (item)
            out.push(item.title);
    }
    return out;
}
export interface CatalogMessage {
    kind: "catalog";
    data: EncodedCatalog;
}
self.onmessage = async (event: MessageEvent<RankRequest | CatalogMessage>) => {
    if ((event.data as CatalogMessage).kind === "catalog") {
        installEncodedCatalog((event.data as CatalogMessage).data);
        return;
    }
    const req = event.data as RankRequest;
    try {
        ready ??= loadCatalog();
        const pool = await ready;
        const recs = recommend(pool as Parameters<typeof recommend>[0], req.profile, {
            excludeIds: new Set(req.excludeIds),
            count: req.count,
            seed: req.seed,
            vectorFor: vectorOf,
            likedTitles: titlesFor(req.likedIds),
            dislikedTitles: titlesFor(req.dislikedIds),
            seenTitles: titlesFor(req.seenIds ?? []),
            homeLanguages: req.homeLanguages,
            mode: req.mode,
            reach: req.reach,
        });
        const reply: RankReply = { id: req.id, ids: recs.map((r) => r.title.id) };
        if (req.withReasons) {
            reply.match = recs.map((r) => r.match);
            reply.reasons = recs.map((r) => r.reasons.map((x) => x.label));
            reply.becauseOf = recs.map((r) => r.becauseOf ?? null);
        }
        (self as unknown as Worker).postMessage(reply);
    }
    catch (err) {
        (self as unknown as Worker).postMessage({
            id: req.id,
            ids: [],
            error: String(err),
        } satisfies RankReply);
    }
};
