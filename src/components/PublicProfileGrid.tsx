"use client";
import PosterArt from "./PosterArt";
import { useLocale } from "@/lib/i18n";
import type { Title } from "@/lib/types";
export default function PublicProfileGrid({ titles }: {
    titles: Title[];
}) {
    const locale = useLocale();
    return (<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {titles.map((title, i) => (<div key={title.id} className="soft-card-sm rise-in overflow-hidden" style={{ animationDelay: `${Math.min(i * 0.04, 0.6)}s` }}>
          <PosterArt title={title} sizes="220px" className="aspect-[10/14] w-full"/>
          <div className="p-2.5" dir="auto">
            <div className="truncate text-sm font-semibold">
              {locale === "ar" ? title.title.ar || title.title.en : title.title.en}
            </div>
            <div className="mt-0.5 text-xs text-ink-faint">
              {title.year} · ⭐ {Number(title.rating).toFixed(1)}
            </div>
          </div>
        </div>))}
    </div>);
}
