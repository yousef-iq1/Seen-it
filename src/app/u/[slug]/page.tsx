import { getTranslations } from "next-intl/server";
import { getServerSupabase } from "@/lib/supabase/server";
import PublicProfileGrid from "@/components/PublicProfileGrid";
import { serverTitlesFor } from "@/lib/server-catalog";
export const dynamic = "force-dynamic";
type PublicProfileRpcRow = {
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    liked_title_ids: string[] | null;
};
export default async function PublicProfilePage({ params }: PageProps<"/u/[slug]">) {
    const { slug } = await params;
    const t = await getTranslations();
    const supabase = getServerSupabase();
    if (!supabase)
        return <ShareNotFound message={t("share.notFound")}/>;
    const { data, error } = await supabase.rpc("get_public_profile", { p_slug: slug });
    const profile = (Array.isArray(data) ? data[0] : data) as PublicProfileRpcRow | null;
    if (error || !profile)
        return <ShareNotFound message={t("share.notFound")}/>;
    const titleIds = (profile.liked_title_ids ?? []).slice(0, 120);
    const titles = await serverTitlesFor(titleIds);
    return (<div className="px-5 pb-16 pt-8">
      <h1 className="text-3xl font-bold">
        {t("share.libraryOf", { name: profile.display_name ?? "—" })}
      </h1>
      <PublicProfileGrid titles={titles}/>
      <p className="mt-10 text-center text-xs text-ink-faint">{t("share.poweredBy")}</p>
    </div>);
}
function ShareNotFound({ message }: {
    message: string;
}) {
    return (<div className="flex flex-col items-center px-5 pt-24 text-center">
      <div className="text-4xl text-ink-faint">●</div>
      <p className="mt-4 text-ink-dim">{message}</p>
    </div>);
}
