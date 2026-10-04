"use client";
import { useRef, useState } from "react";
import { ClapperIcon, TvIcon } from "./ui/Icons";
import { useLocale } from "@/lib/i18n";
import type { Title } from "@/lib/types";
function hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++)
        h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}
const displayed = new Set<string>();
export default function PosterArt({ title, className = "", sizes = "400px", }: {
    title: Title;
    className?: string;
    sizes?: string;
}) {
    const locale = useLocale();
    const src = title.posterPath
        ? `https://image.tmdb.org/t/p/w500${title.posterPath}`
        : null;
    const cached = useRef(src !== null && displayed.has(src)).current;
    const [shown, setShown] = useState(cached);
    function reveal() {
        if (src)
            displayed.add(src);
        setShown(true);
    }
    const h = hashCode(title.id);
    const angle = 150 + (h % 60);
    const tones = [
        ["#3b82c4", "#1e4f7e"],
        ["#38a4d8", "#1d6493"],
        ["#4c8fd6", "#27538e"],
    ][h % 3];
    const TypeIcon = title.type === "movie" ? ClapperIcon : TvIcon;
    return (<div className={`relative h-full w-full overflow-hidden ${className}`}>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{
            background: `radial-gradient(120% 80% at ${20 + (h % 60)}% 0%, rgba(255,255,255,0.22), transparent 55%), linear-gradient(${angle}deg, ${tones[0]} 0%, ${tones[1]} 100%)`,
        }}>
        <TypeIcon size={50} strokeWidth={1.4} className="text-white/40"/>
        <div className="mt-5 px-6 text-center">
          <div className="text-2xl font-bold leading-snug text-white [text-shadow:0_2px_6px_rgb(0_0_0/0.4)]">
            <span dir="auto">{title.title[locale]}</span>
          </div>
          <div className="mt-2 text-sm font-medium tracking-[0.25em] text-white/70">
            {title.year}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent"/>
      </div>

      
      {src && (<img src={src} ref={(el) => {
                if (el?.complete && el.naturalWidth > 0)
                    reveal();
            }} alt={title.title[locale]} sizes={sizes} loading={cached ? "eager" : "lazy"} decoding={cached ? "sync" : "async"} onLoad={reveal} onError={() => setShown(false)} style={{
                opacity: shown ? 1 : 0,
                transform: shown ? "scale(1)" : "scale(1.03)",
                transition: cached
                    ? "none"
                    : "opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
            }} className="absolute inset-0 h-full w-full object-cover" draggable={false}/>)}
    </div>);
}
