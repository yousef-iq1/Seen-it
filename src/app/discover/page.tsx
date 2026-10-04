"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import PosterArt from "@/components/PosterArt";
import { EyeIcon, HeartIcon, SparklesIcon, ThumbsDownIcon, } from "@/components/ui/Icons";
import { getLocalTitle } from "@/lib/catalog";
import { rank } from "@/lib/engine/rank-client";
import { genreLabel } from "@/lib/genres";
import { EASE_OUT, FADE_UP, SECTION, SPRING_SNAPPY, staggerContainer } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { useSeenIt } from "@/lib/store";
import { useLocale, useT } from "@/lib/i18n";
import type { Recommendation, SwipeAction } from "@/lib/types";
import { useDialogKeyboard } from "@/lib/useDialogKeyboard";
export default function DiscoverPage() {
    const locale = useLocale();
    const t = useT();
    const swipes = useSeenIt((s) => s.swipes);
    const profile = useSeenIt((s) => s.profile);
    const seed = useSeenIt((s) => s.seed);
    const doSwipe = useSeenIt((s) => s.swipe);
    const haptics = useSeenIt((s) => s.settings.haptics);
    const [open, setOpen] = useState<Recommendation | null>(null);
    const detailDialogRef = useRef<HTMLDivElement>(null);
    useDialogKeyboard(Boolean(open), detailDialogRef, () => setOpen(null));
    const [recs, setRecs] = useState<Recommendation[]>([]);
    useEffect(() => {
        let stale = false;
        const exclude = Object.values(swipes)
            .filter((s) => s.action !== "not_seen")
            .map((s) => s.titleId);
        const likedIds = Object.values(swipes)
            .filter((s) => s.action === "liked")
            .map((s) => s.titleId);
        const dislikedIds = Object.values(swipes)
            .filter((s) => s.action === "disliked")
            .map((s) => s.titleId);
        const seenIds = Object.values(swipes)
            .filter((s) => s.action === "seen")
            .map((s) => s.titleId);
        void rank({
            mode: "discover",
            profile,
            excludeIds: exclude,
            count: 25,
            seed,
            likedIds,
            dislikedIds,
            seenIds,
            withReasons: true,
        }).then((r) => {
            if (stale)
                return;
            setRecs(r.titles.map((title, i) => ({
                title,
                score: 0,
                match: r.match[i],
                reasons: r.reasons[i].map((label) => ({ kind: "", label })),
                becauseOf: r.becauseOf[i] ?? undefined,
            })));
        });
        return () => {
            stale = true;
        };
    }, [swipes, profile, seed]);
    const ratedCount = profile.ratedSwipes;
    const answered: SwipeAction | null = open
        ? (swipes[open.title.id]?.action ?? null)
        : null;
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [hero, ...rest] = recs.filter((r) => !dismissed.has(r.title.id));
    const log = (rec: Recommendation, action: SwipeAction) => {
        haptic("commit", haptics);
        doSwipe(rec.title, action);
        setDismissed((prev) => new Set(prev).add(rec.title.id));
    };
    return (<motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show" className="px-5 pb-28 pt-6">
      <motion.h1 variants={FADE_UP} className="text-[26px] font-bold tracking-[-0.03em]">
        {t("discover.title")}
      </motion.h1>

      <AnimatePresence mode="wait" initial={false}>
        {ratedCount === 0 ? (<motion.div key="empty" variants={SECTION} initial="hidden" animate="show" exit="exit" className="mt-16 flex flex-col items-center text-center">
            <SparklesIcon size={50} strokeWidth={1.3} className="text-ink-faint"/>
            <Link href="/" className="mt-5">
              <motion.span whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} transition={SPRING_SNAPPY} className="glow-btn inline-block">
                <span>{t("library.startSwiping")}</span>
              </motion.span>
            </Link>
          </motion.div>) : (<motion.div key="recs" variants={SECTION} initial="hidden" animate="show" exit="exit">
            
            {hero && (<motion.button variants={FADE_UP} type="button" onClick={() => {
                    setOpen(hero);
                }} whileTap={{ scale: 0.985 }} transition={SPRING_SNAPPY} className="soft-card mt-5 block w-full overflow-hidden text-left">
                <div className="relative">
                  
                  <PosterArt title={hero.title} sizes="480px" className="aspect-[4/5] w-full"/>
                  <div className="card-sheen absolute inset-0"/>

                  <span className="absolute end-3 top-3 rounded-full bg-[rgb(var(--rgb-scrim)/0.5)] px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md">
                    {hero.match}%
                  </span>

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h2 className="text-[22px] font-bold leading-tight text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.5)]">
                      {hero.title.title[locale]}
                    </h2>
                    <p className="mt-1 text-[11.5px] font-medium text-white/70">
                      {hero.title.year}
                      {hero.title.genres.slice(0, 2).map((g) => (<span key={g}> · {genreLabel(g, locale)}</span>))}
                    </p>
                  </div>
                </div>
              </motion.button>)}

            
            <motion.div variants={staggerContainer(0.035)} initial="hidden" animate="show" className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
              <AnimatePresence>
                {rest.map((rec) => (<motion.button key={rec.title.id} layout="position" variants={FADE_UP} exit={{
                    opacity: 0,
                    scale: 0.86,
                    transition: { duration: 0.32, ease: EASE_OUT },
                }} whileTap={{ scale: 0.94 }} transition={SPRING_SNAPPY} type="button" onClick={() => {
                    setOpen(rec);
                }} aria-label={rec.title.title.en} className="relative block w-full min-w-0 overflow-hidden rounded-2xl bg-surface-2 shadow-[0_3px_12px_rgb(var(--rgb-shadow)/0.08)]">
                    <PosterArt title={rec.title} sizes="160px" className="aspect-[2/3] w-full"/>
                    <span className="absolute end-1.5 top-1.5 rounded-full bg-[rgb(var(--rgb-scrim)/0.55)] px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums text-white backdrop-blur-sm">
                      {rec.match}
                    </span>
                  </motion.button>))}
              </AnimatePresence>
            </motion.div>
          </motion.div>)}
      </AnimatePresence>

      
      <AnimatePresence>
        {open && (<motion.div className="fixed inset-0 z-50 grid place-items-center px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))]" initial="hidden" animate="show" exit="hidden">
            <motion.button type="button" aria-label={t("common.close")} className="absolute inset-0 bg-[rgb(var(--rgb-scrim)/0.42)]" variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1 },
            }} transition={{ duration: 0.16, ease: EASE_OUT }} onClick={() => setOpen(null)}/>

            <motion.div ref={detailDialogRef} role="dialog" aria-modal="true" aria-labelledby="discover-detail-title" tabIndex={-1} variants={{
                hidden: { opacity: 0, y: 10, scale: 0.975 },
                show: { opacity: 1, y: 0, scale: 1 },
            }} transition={{ duration: 0.18, ease: EASE_OUT }} className="relative z-10 max-h-[78dvh] w-full max-w-md overflow-y-auto rounded-[28px] border border-line bg-surface p-5 shadow-[0_24px_70px_rgb(var(--rgb-shadow)/0.3)]">
              <div className="flex gap-4">
                <div className="h-[132px] w-[88px] shrink-0 overflow-hidden rounded-2xl">
                  <PosterArt title={open.title} sizes="180px" className="h-full w-full"/>
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 id="discover-detail-title" className="text-xl font-bold leading-tight tracking-tight">
                      {open.title.title[locale]}
                    </h2>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[10.5px] font-bold text-accent">
                      {open.match}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-ink-faint">
                    {open.title.year} ·{" "}
                    {open.title.type === "movie" ? t("card.movie") : t("card.tv")}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {open.title.genres.slice(0, 3).map((g) => (<span key={g} className="rounded-full bg-surface-2 px-2.5 py-1 text-[10.5px] font-semibold capitalize text-ink-dim">
                        {genreLabel(g, locale)}
                      </span>))}
                  </div>
                </div>
              </div>

              {open.title.overview[locale] && (<p className="mt-4 text-[13.5px] leading-relaxed text-ink-dim">
                  {open.title.overview[locale]}
                </p>)}

              <WhyLine rec={open}/>

              <div className="mt-5 flex items-center gap-2.5" dir="ltr">
                <SheetAction label={t("swipe.disliked")} tint="var(--color-danger)" chosen={answered === "disliked"} onPress={() => log(open, "disliked")}>
                  <ThumbsDownIcon size={20} filled={answered === "disliked"}/>
                </SheetAction>
                <SheetAction label={t("swipe.seen")} tint="var(--color-ink-strong)" chosen={answered === "seen"} onPress={() => log(open, "seen")}>
                  <EyeIcon size={20}/>
                </SheetAction>
                <SheetAction label={t("swipe.liked")} tint="var(--color-accent)" chosen={answered === "liked"} onPress={() => log(open, "liked")}>
                  <HeartIcon size={20} filled/>
                </SheetAction>
              </div>
            </motion.div>
          </motion.div>)}
      </AnimatePresence>
    </motion.div>);
}
function WhyLine({ rec }: {
    rec: Recommendation;
}) {
    const locale = useLocale();
    const t = useT();
    const savedBecause = useSeenIt((state) => rec.becauseOf ? state.swipes[rec.becauseOf] : undefined);
    const because = rec.becauseOf
        ? getLocalTitle(rec.becauseOf) ?? savedBecause?.title ?? null
        : null;
    const why = rec.reasons.map((r) => r.label).join(" · ");
    if (!why && !because)
        return null;
    return (<div className="mt-5 rounded-2xl bg-surface-2 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-accent">
        <SparklesIcon size={13} strokeWidth={2.2}/>
        {rec.match}%
      </div>
      {why && <p className="mt-1.5 text-[13px] capitalize text-ink-dim">{why}</p>}
      {because && (<p className="mt-0.5 text-[12.5px] text-ink-faint">
          {t("discover.becauseYouLiked")} {because.title[locale]}
        </p>)}
    </div>);
}
function SheetAction({ label, tint, chosen, onPress, children, }: {
    label: string;
    tint: string;
    chosen?: boolean;
    onPress: () => void;
    children: React.ReactNode;
}) {
    return (<motion.button type="button" aria-label={label} aria-pressed={chosen} title={label} onClick={onPress} whileTap={{ scale: 0.94 }} animate={{
            backgroundColor: chosen ? tint : "rgb(var(--rgb-surface-2) / 1)",
            color: chosen ? "var(--color-on-accent)" : "var(--color-ink-dim)",
            borderColor: chosen ? tint : "var(--color-line)",
        }} transition={{ duration: 0.14, ease: EASE_OUT }} style={{ height: 52 }} className="flex flex-1 items-center justify-center rounded-full border">
      {children}
    </motion.button>);
}
