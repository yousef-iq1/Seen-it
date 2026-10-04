import { getSupabase } from "./client";
import { useSeenIt } from "@/lib/store";
import { getLocalTitle } from "@/lib/catalog";
import { emptyProfile, type TasteProfile } from "@/lib/engine/taste";
import type { Swipe, SwipeAction, Title, UserList } from "@/lib/types";
function toRow(userId: string, p: TasteProfile) {
    return {
        user_id: userId,
        taste: `[${p.taste.join(",")}]`,
        facets: p.facets,
        seen_facets: p.seenFacets,
        facet_weights: p.facetWeights,
        streaks: p.streaks,
        liked_sum: p.likedSum,
        liked_count: p.likedCount,
        disliked_sum: p.dislikedSum,
        disliked_count: p.dislikedCount,
        rated_swipes: p.ratedSwipes,
        total_swipes: p.totalSwipes,
        seen_count: p.seenCount,
        unseen_count: p.unseenCount,
        recent: p.recent,
        updated_at: new Date().toISOString(),
    };
}
type TasteRow = ReturnType<typeof toRow> & {
    taste: string;
};
function fromRow(row: Record<string, unknown>): TasteProfile | null {
    const facets = row.facets as TasteProfile["facets"] | null;
    if (!facets || Object.keys(facets).length === 0)
        return null;
    const base = emptyProfile();
    const nums = (v: unknown, fallback: number[]) => Array.isArray(v) && v.length === fallback.length ? (v as number[]) : fallback;
    return {
        ...base,
        facets,
        seenFacets: (row.seen_facets as TasteProfile["seenFacets"]) ?? base.seenFacets,
        facetWeights: (row.facet_weights as TasteProfile["facetWeights"]) ?? base.facetWeights,
        streaks: (row.streaks as TasteProfile["streaks"]) ?? base.streaks,
        taste: parseVector(row.taste, base.taste),
        likedSum: nums(row.liked_sum, base.likedSum),
        dislikedSum: nums(row.disliked_sum, base.dislikedSum),
        likedCount: Number(row.liked_count ?? 0),
        dislikedCount: Number(row.disliked_count ?? 0),
        ratedSwipes: Number(row.rated_swipes ?? 0),
        totalSwipes: Number(row.total_swipes ?? 0),
        seenCount: Number(row.seen_count ?? 0),
        unseenCount: Number(row.unseen_count ?? 0),
        recent: Array.isArray(row.recent) ? (row.recent as string[][]) : base.recent,
    };
}
function parseVector(value: unknown, fallback: number[]): number[] {
    if (Array.isArray(value))
        return value as number[];
    if (typeof value !== "string")
        return fallback;
    const parsed = value.replace(/^\[|\]$/g, "").split(",").map(Number);
    return parsed.length === fallback.length && parsed.every(Number.isFinite) ? parsed : fallback;
}
function swipeRow(userId: string, s: Swipe) {
    return {
        user_id: userId,
        title_id: s.titleId,
        action: s.action,
        created_at: new Date(s.at).toISOString(),
    };
}
export async function syncSwipeIds(userId: string, ids: string[]): Promise<void> {
    const supabase = getSupabase();
    if (!supabase || ids.length === 0)
        return;
    const state = useSeenIt.getState();
    const unique = [...new Set(ids)];
    const rows = unique.map((id) => state.swipes[id]).filter((s): s is Swipe => Boolean(s)).map((s) => swipeRow(userId, s));
    const removed = unique.filter((id) => !state.swipes[id]);
    for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("swipes").upsert(rows.slice(i, i + 500));
        if (error)
            throw new Error(error.message);
    }
    for (let i = 0; i < removed.length; i += 500) {
        const { error } = await supabase
            .from("swipes")
            .delete()
            .eq("user_id", userId)
            .in("title_id", removed.slice(i, i + 500));
        if (error)
            throw new Error(error.message);
    }
    useSeenIt.setState((state) => ({
        deletedSwipeIds: state.deletedSwipeIds.filter((id) => !unique.includes(id)),
    }));
}
export async function pushProfile(userId: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase)
        return;
    const { profile } = useSeenIt.getState();
    if (profile.totalSwipes === 0) {
        const { error } = await supabase.from("user_taste").delete().eq("user_id", userId);
        if (error)
            throw new Error(error.message);
        return;
    }
    const { error } = await supabase.from("user_taste").upsert(toRow(userId, profile));
    if (error)
        throw new Error(error.message);
}
export async function syncListIds(userId: string, clientIds: string[]): Promise<void> {
    const supabase = getSupabase();
    if (!supabase || clientIds.length === 0)
        return;
    const state = useSeenIt.getState();
    const uniqueIds = [...new Set(clientIds)];
    for (const clientId of uniqueIds) {
        const local = state.lists.find((l) => l.id === clientId);
        if (!local) {
            const { error } = await supabase
                .from("lists")
                .delete()
                .eq("user_id", userId)
                .eq("client_id", clientId);
            if (error)
                throw new Error(error.message);
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId)) {
                const { error: legacyDeleteError } = await supabase
                    .from("lists")
                    .delete()
                    .eq("user_id", userId)
                    .eq("id", clientId)
                    .is("client_id", null);
                if (legacyDeleteError)
                    throw new Error(legacyDeleteError.message);
            }
            continue;
        }
        let { data: existing, error: lookupError } = await supabase
            .from("lists")
            .select("id, share_slug")
            .eq("user_id", userId)
            .eq("client_id", clientId)
            .maybeSingle();
        if (lookupError)
            throw new Error(lookupError.message);
        if (!existing) {
            const { data: legacy, error: legacyError } = await supabase
                .from("lists")
                .select("id, share_slug")
                .eq("user_id", userId)
                .eq("name", local.name)
                .is("client_id", null)
                .limit(2);
            if (legacyError)
                throw new Error(legacyError.message);
            if ((legacy ?? []).length === 1) {
                const adopted = legacy![0];
                const { error } = await supabase
                    .from("lists")
                    .update({ client_id: clientId })
                    .eq("id", adopted.id)
                    .eq("user_id", userId);
                if (error)
                    throw new Error(error.message);
                existing = adopted;
            }
        }
        let listId = existing?.id as string | undefined;
        if (listId) {
            const { error } = await supabase
                .from("lists")
                .update({
                name: local.name,
                is_public: local.isPublic,
                hide_owner: local.hideOwner ?? false,
                source_list_id: local.sourceListId ?? null,
                updated_at: new Date(local.updatedAt ?? local.createdAt).toISOString(),
            })
                .eq("id", listId)
                .eq("user_id", userId);
            if (error)
                throw new Error(error.message);
        }
        else {
            const { data: created, error } = await supabase
                .from("lists")
                .insert({
                user_id: userId,
                client_id: clientId,
                name: local.name,
                is_public: local.isPublic,
                hide_owner: local.hideOwner ?? false,
                source_list_id: local.sourceListId ?? null,
                updated_at: new Date(local.updatedAt ?? local.createdAt).toISOString(),
            })
                .select("id")
                .single();
            if (error || !created)
                throw new Error(error?.message ?? "Could not create list");
            listId = created.id as string;
        }
        const { error: deleteError } = await supabase.from("list_items").delete().eq("list_id", listId);
        if (deleteError)
            throw new Error(deleteError.message);
        const items = local.titleIds.map((title_id) => ({ list_id: listId!, title_id }));
        for (let i = 0; i < items.length; i += 500) {
            const { error } = await supabase.from("list_items").insert(items.slice(i, i + 500));
            if (error)
                throw new Error(error.message);
        }
    }
    useSeenIt.setState((state) => ({
        deletedListIds: state.deletedListIds.filter((id) => !uniqueIds.includes(id)),
    }));
}
export async function syncLocalToCloud(userId: string): Promise<void> {
    const state = useSeenIt.getState();
    await syncSwipeIds(userId, [...Object.keys(state.swipes), ...state.deletedSwipeIds]);
    await pushProfile(userId);
    await syncListIds(userId, [...state.lists.map((l) => l.id), ...state.deletedListIds]);
}
export async function loadCloudProfile(userId: string): Promise<TasteProfile | null> {
    const supabase = getSupabase();
    if (!supabase)
        return null;
    const { data, error } = await supabase
        .from("user_taste")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    return data ? fromRow(data as unknown as Record<string, unknown>) : null;
}
export type CloudPublicProfile = {
    name: string;
    bio: string;
    avatarUrl: string;
};
export async function loadCloudPublicProfile(userId: string): Promise<CloudPublicProfile | null> {
    const supabase = getSupabase();
    if (!supabase)
        return null;
    const { data, error } = await supabase
        .from("profiles")
        .select("display_name, bio, avatar_url")
        .eq("id", userId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        return null;
    return {
        name: String(data.display_name ?? ""),
        bio: String(data.bio ?? ""),
        avatarUrl: String(data.avatar_url ?? ""),
    };
}
export async function pushPublicProfile(userId: string, p: CloudPublicProfile): Promise<void> {
    const supabase = getSupabase();
    if (!supabase)
        return;
    const { error } = await supabase
        .from("profiles")
        .update({
        display_name: p.name,
        bio: p.bio,
        avatar_url: p.avatarUrl,
        updated_at: new Date().toISOString(),
    })
        .eq("id", userId);
    if (error)
        throw new Error(error.message);
}
export interface CloudLibrary {
    swipes: Record<string, Swipe>;
    swipeOrder: string[];
    lists: UserList[];
}
export async function loadCloudLibrary(userId: string): Promise<CloudLibrary | null> {
    const supabase = getSupabase();
    if (!supabase)
        return null;
    const rows: CloudSwipeRow[] = [];
    const PAGE = 1000;
    for (let from = 0;; from += PAGE) {
        const { data, error } = await supabase
            .from("swipes")
            .select("title_id, action, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: true })
            .range(from, from + PAGE - 1);
        if (error)
            throw new Error(error.message);
        const page = (data ?? []) as CloudSwipeRow[];
        rows.push(...page);
        if (page.length < PAGE)
            break;
    }
    const { data: listRows, error: listError } = await supabase
        .from("lists")
        .select("id, client_id, name, is_public, hide_owner, share_slug, source_list_id, created_at, updated_at, list_items(title_id)")
        .eq("user_id", userId);
    if (listError)
        throw new Error(listError.message);
    return reconstructLibrary(rows, (listRows ?? []) as unknown as CloudListRow[], getLocalTitle);
}
export interface CloudSwipeRow {
    title_id: string;
    action: string;
    created_at: string;
}
export interface CloudListRow {
    id: string;
    client_id?: string | null;
    name: string;
    is_public: boolean;
    hide_owner?: boolean | null;
    share_slug?: string | null;
    source_list_id?: string | null;
    created_at: string | null;
    updated_at?: string | null;
    list_items: {
        title_id: string;
    }[] | null;
}
export function reconstructLibrary(swipeRows: CloudSwipeRow[], listRows: CloudListRow[], lookupTitle: (id: string) => Title | undefined): CloudLibrary | null {
    const swipes: Record<string, Swipe> = {};
    const swipeOrder: string[] = [];
    const ordered = [...swipeRows].sort((a, b) => (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0));
    for (const row of ordered) {
        if (!isSwipeAction(row.action))
            continue;
        const title = lookupTitle(row.title_id);
        if (!(row.title_id in swipes))
            swipeOrder.push(row.title_id);
        swipes[row.title_id] = {
            titleId: row.title_id,
            action: row.action,
            at: Date.parse(row.created_at) || Date.now(),
            ...(title ? { title: snapshotForSync(title) } : null),
        };
    }
    const lists: UserList[] = listRows.map((r) => ({
        id: r.client_id || r.id,
        name: r.name,
        isPublic: Boolean(r.is_public),
        hideOwner: Boolean(r.hide_owner),
        slug: r.share_slug ?? undefined,
        sourceListId: r.source_list_id ?? undefined,
        titleIds: (r.list_items ?? []).map((i) => i.title_id),
        createdAt: r.created_at ? Date.parse(r.created_at) || Date.now() : Date.now(),
        updatedAt: r.updated_at
            ? Date.parse(r.updated_at) || Date.parse(r.created_at ?? "") || Date.now()
            : r.created_at
                ? Date.parse(r.created_at) || Date.now()
                : Date.now(),
    }));
    if (swipeOrder.length === 0 && lists.length === 0)
        return null;
    return { swipes, swipeOrder, lists };
}
export function mergeLibraries(local: CloudLibrary, cloud: CloudLibrary | null): CloudLibrary {
    if (!cloud)
        return local;
    const swipes: Record<string, Swipe> = { ...cloud.swipes };
    for (const [id, localSwipe] of Object.entries(local.swipes)) {
        const remote = swipes[id];
        if (!remote || localSwipe.at >= remote.at)
            swipes[id] = localSwipe;
    }
    const swipeOrder = Object.values(swipes)
        .sort((a, b) => a.at - b.at)
        .map((s) => s.titleId);
    const listMap = new Map<string, UserList>();
    for (const list of cloud.lists)
        listMap.set(list.id, list);
    for (const localList of local.lists) {
        const remote = listMap.get(localList.id);
        if (!remote) {
            listMap.set(localList.id, localList);
            continue;
        }
        const localAt = localList.updatedAt ?? localList.createdAt;
        const remoteAt = remote.updatedAt ?? remote.createdAt;
        const newer = localAt >= remoteAt ? localList : remote;
        const older = newer === localList ? remote : localList;
        listMap.set(localList.id, {
            ...older,
            ...newer,
            slug: newer.slug ?? older.slug,
        });
    }
    return { swipes, swipeOrder, lists: [...listMap.values()] };
}
function isSwipeAction(value: string): value is SwipeAction {
    return value === "liked" || value === "disliked" || value === "not_seen" || value === "seen";
}
function snapshotForSync(title: Title): Title {
    return { ...title, overview: { en: "", ar: "" }, related: undefined };
}
export type { TasteRow };
