import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PopcornIcon } from "@/components/ui/Icons";
export default async function NotFound() {
    const t = await getTranslations("notFound");
    return (<div className="rise-in flex flex-col items-center px-5 pt-24 text-center">
      <PopcornIcon size={44} strokeWidth={1.6} className="text-ink-faint"/>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-ink-dim">{t("body")}</p>
      <Link href="/" className="glow-btn mt-6 inline-block">
        <span>{t("back")}</span>
      </Link>
    </div>);
}
