import SharedList from "@/components/SharedList";
import { getServerSupabase } from "@/lib/supabase/server";
import { serverTitlesFor } from "@/lib/server-catalog";
export const dynamic = "force-dynamic";
type PublicListRpcRow = {
    id: string;
    name: string;
    owner: string | null;
    title_ids: string[] | null;
};
export default async function SharedListPage({ params }: PageProps<"/l/[slug]">) {
    const { slug } = await params;
    const supabase = getServerSupabase();
    if (!supabase)
        return <NotFound />;
    const { data, error } = await supabase.rpc("get_public_list", { p_slug: slug });
    const list = (Array.isArray(data) ? data[0] : data) as PublicListRpcRow | null;
    if (error || !list)
        return <NotFound />;
    const titleIds = list.title_ids ?? [];
    const titles = await serverTitlesFor(titleIds);
    return (<SharedList listId={String(list.id)} name={String(list.name)} owner={list.owner} titleIds={titleIds} titles={titles}/>);
}
function NotFound() {
    return (<div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (<span key={i} className="block h-24 w-16 rounded-xl border border-dashed border-line"/>))}
      </div>
    </div>);
}
