import Link from "next/link";
import { getTranslations } from "next-intl/server";
export async function generateMetadata() {
    const t = await getTranslations("legal");
    return { title: t("title") };
}
const TMDB_LOGO = "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";
export default async function LegalPage() {
    const t = await getTranslations("legal");
    return (<div className="mx-auto max-w-2xl px-5 pb-24 pt-10">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
        <span aria-hidden>&lsaquo;</span> Seen It
      </Link>

      <h1 className="mt-8 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-ink-faint">{t("updated")}</p>

      <Section title={t("storageTitle")}>
        <p>{t("storage1")}</p>
        <p>{t("storage2")}</p>
      </Section>

      <Section title={t("signinTitle")}>
        <p>{t("signin1")}</p>
      </Section>

      <Section title={t("publicTitle")}>
        <p>{t("public1")}</p>
        <p>{t("public2")}</p>
      </Section>

      <Section title={t("tmdbTitle")}>
        <div className="flex flex-wrap items-center gap-4">
          <a href="https://www.themoviedb.org/" rel="noreferrer noopener" target="_blank" aria-label="TMDB" className="inline-flex rounded-xl bg-white px-3 py-2">
            
            
            <img src={TMDB_LOGO} alt="TMDB" width={110} height={44} className="h-8 w-auto"/>
          </a>
          <p className="min-w-[220px] flex-1">{t("tmdb1")}</p>
        </div>
        <p className="font-medium text-ink">{t("tmdbNotice")}</p>
        <p>{t("tmdbTerms")}</p>
      </Section>

      <Section title={t("deleteTitle")}>
        <p>{t("delete1")}</p>
      </Section>

      <Section title={t("rulesTitle")}>
        <p>{t("rules1")}</p>
      </Section>

      <Section title={t("contactTitle")}>
        <p>{t("contact1")}</p>
      </Section>

      <p className="mt-12 text-xs leading-relaxed text-ink-faint">{t("disclaimer")}</p>
    </div>);
}
function Section({ title, children }: {
    title: string;
    children: React.ReactNode;
}) {
    return (<section className="mt-9">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-dim">
        {children}
      </div>
    </section>);
}
