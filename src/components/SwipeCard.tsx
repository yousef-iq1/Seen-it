"use client";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue, type PanInfo, } from "framer-motion";
import PosterArt from "./PosterArt";
import { StarIcon } from "./ui/Icons";
import { genreLabel } from "@/lib/genres";
import { EASE_OUT, SPRING_SETTLE } from "@/lib/motion";
import { useLocale, useT } from "@/lib/i18n";
import type { SwipeAction, Title } from "@/lib/types";
export const SWIPE_X_THRESHOLD = 100;
export const SWIPE_UP_THRESHOLD = 120;
const TAP_SLOP = 14;
export interface SwipeCardProps {
    title: Title;
    index: number;
    onSwipe: (action: SwipeAction) => void;
    forcedExit: SwipeAction | null;
    upAction: SwipeAction;
    onDragActive?: (active: boolean) => void;
    x?: MotionValue<number>;
    y?: MotionValue<number>;
}
export default function SwipeCard({ title, index, onSwipe, forcedExit, upAction, onDragActive, x: sharedX, y: sharedY, }: SwipeCardProps) {
    const locale = useLocale();
    const t = useT();
    const [flipped, setFlipped] = useState(false);
    const [everFlipped, setEverFlipped] = useState(false);
    const [exiting, setExiting] = useState<SwipeAction | null>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-260, 0, 260], [-16, 0, 16]);
    const likeAt = useTransform(x, [24, SWIPE_X_THRESHOLD], [0, 1], { clamp: true });
    const nopeAt = useTransform(x, [-24, -SWIPE_X_THRESHOLD], [0, 1], { clamp: true });
    const upAt = useTransform(() => {
        const dy = Math.max(0, (-y.get() - 24) / (SWIPE_UP_THRESHOLD - 24));
        const sideways = Math.min(1, Math.abs(x.get()) / SWIPE_X_THRESHOLD);
        return Math.min(1, dy) * (1 - sideways);
    });
    const isTop = index === 0;
    const activeExit = isTop ? (exiting ?? forcedExit) : null;
    const promote = useTransform(() => {
        if (isTop || !sharedX || !sharedY)
            return 0;
        const travelled = Math.hypot(sharedX.get(), sharedY.get());
        return Math.min(1, travelled / SWIPE_X_THRESHOLD);
    });
    const stackY = useTransform(promote, [0, 1], [index * 12, (index - 1) * 12]);
    const stackScale = useTransform(promote, [0, 1], [1 - index * 0.05, 1 - (index - 1) * 0.05]);
    useMotionValueEvent(x, "change", (v) => {
        if (isTop && !activeExit)
            sharedX?.set(v);
    });
    useMotionValueEvent(y, "change", (v) => {
        if (isTop && !activeExit)
            sharedY?.set(v);
    });
    useEffect(() => {
        if (isTop) {
            setFlipped(false);
            x.set(0);
            y.set(0);
            sharedX?.set(0);
            sharedY?.set(0);
        }
    }, [isTop, title.id]);
    const press = useRef<{
        px: number;
        py: number;
        at: number;
    } | null>(null);
    const flightSeconds = useRef(0.3);
    function handlePointerDown(e: React.PointerEvent) {
        press.current = { px: e.clientX, py: e.clientY, at: Date.now() };
    }
    function handlePointerUp(e: React.PointerEvent) {
        const p = press.current;
        press.current = null;
        if (!p || !isTop || activeExit)
            return;
        const moved = Math.hypot(e.clientX - p.px, e.clientY - p.py);
        if (moved <= TAP_SLOP && Date.now() - p.at < 600) {
            setEverFlipped(true);
            setFlipped((v) => !v);
        }
    }
    function handleDragEnd(_: unknown, info: PanInfo) {
        const px = info.offset.x + info.velocity.x / 7;
        const py = info.offset.y + info.velocity.y / 7;
        const action: SwipeAction | null = py < -SWIPE_UP_THRESHOLD && Math.abs(py) > Math.abs(px)
            ? upAction
            : px > SWIPE_X_THRESHOLD
                ? "liked"
                : px < -SWIPE_X_THRESHOLD
                    ? "disliked"
                    : null;
        if (!action) {
            onDragActive?.(false);
            const settle = { type: "spring" as const, stiffness: 340, damping: 31, mass: 0.78 };
            void animate(x, 0, settle);
            void animate(y, 0, settle);
            return;
        }
        const speed = Math.max(1100, Math.hypot(info.velocity.x, info.velocity.y));
        const remaining = action === "liked" || action === "disliked"
            ? Math.max(180, 620 - Math.abs(x.get()))
            : Math.max(220, 820 - Math.abs(y.get()));
        flightSeconds.current = Math.max(0.16, Math.min(0.46, remaining / speed));
        setExiting(action);
        onSwipe(action);
    }
    const exitPose = activeExit === "liked"
        ? { x: 620, y: -70, rotate: 22, opacity: 0, scale: 0.94 }
        : activeExit === "disliked"
            ? { x: -620, y: -70, rotate: -22, opacity: 0, scale: 0.94 }
            : activeExit
                ? { x: 0, y: -820, rotate: 0, opacity: 0, scale: 0.92 }
                : { opacity: 0, scale: 0.97 };
    const restingPose = isTop
        ? { x: 0, y: 0, scale: 1, opacity: 1 }
        : { opacity: index > 2 ? 0 : 1 };
    return (<motion.div className="absolute inset-0 touch-none select-none will-change-transform" style={{
            ...(isTop ? { x, y, rotate } : { y: stackY, scale: stackScale }),
            zIndex: activeExit ? 40 : 30 - index,
            pointerEvents: isTop && !activeExit ? "auto" : "none",
            perspective: 1400,
        }} initial={{
            y: index * 12 + 26,
            scale: 1 - index * 0.05 - 0.06,
            opacity: 0,
        }} animate={restingPose} transition={{ duration: 0.34, ease: EASE_OUT, opacity: { duration: 0.35 } }} exit={activeExit
            ? {
                ...exitPose,
                transition: {
                    duration: exiting ? flightSeconds.current : 0.3,
                    ease: EASE_OUT,
                    opacity: {
                        duration: (exiting ? flightSeconds.current : 0.3) * 0.3,
                        delay: (exiting ? flightSeconds.current : 0.3) * 0.7,
                        ease: "linear",
                    },
                },
            }
            : { ...exitPose, transition: { duration: 0.2, ease: EASE_OUT } }} drag={isTop && !activeExit} dragElastic={0.55} dragMomentum={false} dragConstraints={{ bottom: 0 }} onDragStart={() => onDragActive?.(true)} onDragEnd={handleDragEnd} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} whileDrag={{ cursor: "grabbing" }}>
      
      <motion.div className="pointer-events-none absolute inset-0 z-10 rounded-[var(--radius-card)] bg-black" initial={{ opacity: index === 0 ? 0 : 0.07 }} animate={{ opacity: index === 0 ? 0 : 0.07 }} transition={{ duration: 0.35 }} aria-hidden/>

      {isTop && (<>
          <VerdictStamp progress={likeAt} tint="var(--color-accent)" label={t("swipe.liked")} side="left"/>
          <VerdictStamp progress={nopeAt} tint="var(--color-danger)" label={t("swipe.disliked")} side="right"/>
          <VerdictStamp progress={upAt} tint={upAction === "seen" ? "var(--color-ink-strong)" : "var(--color-skip)"} label={upAction === "seen" ? t("swipe.seen") : t("swipe.notSeen")} side="top"/>
        </>)}
      <motion.div className="relative h-full w-full" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}>
        
        <div className="soft-card absolute inset-0 overflow-hidden" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
          <PosterArt title={title}/>
          <div className="card-sheen absolute inset-0"/>

          <div className="absolute inset-x-0 bottom-0 p-4">
            
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-black/35 px-2 py-0.5 text-[10px] font-bold text-white/95">
                {title.type === "movie" ? t("card.movie") : t("card.tv")}
              </span>
              <span className="rounded-md bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white/95">
                {title.year}
              </span>
              <span className="flex items-center gap-1 rounded-md bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white/95">
                <StarIcon size={10} filled className="text-accent"/>
                {title.rating.toFixed(1)}
              </span>
            </div>
            <h2 className="text-xl font-bold leading-tight text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.55)]">
              <span dir="auto">{title.title[locale]}</span>
            </h2>
            <div className="mt-1 flex flex-wrap gap-x-2.5">
              {title.genres.slice(0, 3).map((g) => (<span key={g} className="text-[11px] font-medium text-white/60">
                  {genreLabel(g, locale)}
                </span>))}
            </div>
          </div>

          
          {isTop && (<motion.span className="absolute end-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40" animate={{ opacity: [0.45, 0.9, 0.45] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
                <path d="M5 8.5h14M5 13h10M5 17.5h6"/>
              </svg>
            </motion.span>)}
        </div>

        
        <div className="soft-card absolute inset-0 flex flex-col overflow-hidden bg-surface" style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
        }}>
          {everFlipped && (<>
          
          <div className="absolute inset-0 scale-125" style={{
                backgroundImage: title.posterPath
                    ? `url(https://image.tmdb.org/t/p/w500${title.posterPath})`
                    : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(22px)",
            }} aria-hidden/>
          <div className="absolute inset-0" style={{ background: "rgb(var(--rgb-scrim) / 0.74)" }} aria-hidden/>

          <div className="relative flex h-full flex-col p-5 text-white">
            <div className="flex shrink-0 gap-3.5">
              <div className="h-[92px] w-[62px] shrink-0 overflow-hidden rounded-xl shadow-[0_6px_18px_rgb(0_0_0/0.4)]">
                <PosterArt title={title} sizes="120px" className="h-full w-full"/>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[19px] font-bold leading-tight tracking-tight">
                  <span dir="auto">{title.title[locale]}</span>
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-white/60">
                  <span>{title.year}</span>
                  <span>·</span>
                  <span>{title.type === "movie" ? t("card.movie") : t("card.tv")}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <StarIcon size={11} filled className="text-accent-soft"/>
                    {title.rating.toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {title.genres.slice(0, 3).map((g) => (<span key={g} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold capitalize">
                      {genreLabel(g, locale)}
                    </span>))}
                </div>
              </div>
            </div>

            
            <div className="card-back-scroll mt-5 min-h-0 flex-1 overflow-y-auto">
              <p className="text-[14px] leading-relaxed text-white/85">
                <span dir="auto">{title.overview[locale] || "…"}</span>
              </p>
            </div>

            <div className="mt-4 shrink-0 space-y-1 border-t border-white/15 pt-3 text-[11.5px] text-white/60">
              {title.people.director && (<p>
                  <span className="font-semibold text-white/85">
                    {title.type === "movie" ? t("card.director") : t("card.creator")}
                  </span>{" "}
                  {title.people.director}
                </p>)}
              {title.people.cast.length > 0 && (<p>
                  <span className="font-semibold text-white/85">{t("card.cast")}</span>{" "}
                  {title.people.cast.slice(0, 3).join(", ")}
                </p>)}
            </div>
          </div>
          </>)}
        </div>
      </motion.div>
    </motion.div>);
}
function VerdictStamp({ progress, tint, label, side, }: {
    progress: MotionValue<number>;
    tint: string;
    label: string;
    side: "left" | "right" | "top";
}) {
    const opacity = useTransform(progress, [0.08, 0.42], [0, 1], { clamp: true });
    const scale = useTransform(progress, [0.08, 0.55, 1], [0.72, 1.04, 1], { clamp: true });
    const place = side === "left"
        ? "left-4 top-5 -rotate-[11deg] origin-top-left"
        : side === "right"
            ? "right-4 top-5 rotate-[11deg] origin-top-right"
            : "left-1/2 bottom-5 -translate-x-1/2 origin-bottom";
    return (<motion.div className={`pointer-events-none absolute z-20 ${place} will-change-[opacity,transform]`} style={{ opacity, scale }} aria-hidden>
      <span className="block rounded-xl border-[2.5px] px-3 py-1.5 text-[15px] font-extrabold uppercase tracking-[0.14em]" style={{
            color: tint,
            borderColor: tint,
            background: "rgb(var(--rgb-scrim) / 0.28)",
        }}>
        {label}
      </span>
    </motion.div>);
}
