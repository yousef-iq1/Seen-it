import { getSupabase } from "./client";
import type { UserList } from "@/lib/types";
export async function publishList(list: UserList): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase)
        return null;
    const { data: user, error: userError } = await supabase.auth.getUser();
    const userId = user.user?.id;
    if (userError || !userId)
        return null;
    let { data: existing, error: lookupError } = await supabase
        .from("lists")
        .select("id, share_slug")
        .eq("user_id", userId)
        .eq("client_id", list.id)
        .maybeSingle();
    if (lookupError)
        return null;
    if (!existing) {
        const { data: legacy, error } = await supabase
            .from("lists")
            .select("id, share_slug")
            .eq("user_id", userId)
            .eq("name", list.name)
            .is("client_id", null)
            .limit(2);
        if (error)
            return null;
        if ((legacy ?? []).length === 1) {
            const adopted = legacy![0];
            const { error: adoptError } = await supabase
                .from("lists")
                .update({ client_id: list.id })
                .eq("id", adopted.id)
                .eq("user_id", userId);
            if (adoptError)
                return null;
            existing = adopted;
        }
    }
    let listId = existing?.id as string | undefined;
    let slug = existing?.share_slug as string | undefined;
    if (!listId) {
        const { data: created, error } = await supabase
            .from("lists")
            .insert({
            user_id: userId,
            client_id: list.id,
            name: list.name,
            is_public: true,
            hide_owner: list.hideOwner ?? false,
            source_list_id: list.sourceListId ?? null,
            updated_at: new Date(list.updatedAt ?? list.createdAt).toISOString(),
        })
            .select("id, share_slug")
            .single();
        if (error || !created)
            return null;
        listId = created.id as string;
        slug = created.share_slug as string;
    }
    else {
        const { data: updated, error } = await supabase
            .from("lists")
            .update({
            name: list.name,
            is_public: true,
            hide_owner: list.hideOwner ?? false,
            source_list_id: list.sourceListId ?? null,
            updated_at: new Date(list.updatedAt ?? list.createdAt).toISOString(),
        })
            .eq("id", listId)
            .eq("user_id", userId)
            .select("share_slug")
            .single();
        if (error)
            return null;
        slug = (updated?.share_slug as string | undefined) ?? slug;
    }
    const { error: deleteError } = await supabase
        .from("list_items")
        .delete()
        .eq("list_id", listId);
    if (deleteError)
        return null;
    const rows = list.titleIds.map((title_id) => ({ list_id: listId!, title_id }));
    for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase
            .from("list_items")
            .insert(rows.slice(i, i + 500));
        if (error)
            return null;
    }
    return slug ?? null;
}
export type SharedList = {
    name: string;
    owner: string | null;
    avatar: string | null;
    titleIds: string[];
};
