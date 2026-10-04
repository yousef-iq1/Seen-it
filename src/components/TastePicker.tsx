"use client";
import { memo, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PosterArt from "./PosterArt";
import { getLocalCatalog } from "@/lib/catalog";
import { resolveSeeds } from "@/lib/data/taste-seeds";
import { FADE_UP, SPRING_SNAPPY, staggerContainer } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import ImportLibrary from "./ImportLibrary";
import { useSeenIt } from "@/lib/store";
import type { Title } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n";
const CHOICES = 48;
const MIN_PICKS = 3;
export default function TastePicker({ onDone }: {
    onDone: () => void;
}) {
    const t = useT();
    const locale = useLocale();
    const swipe = useSeenIt((s) => s.swipe);
    const learnPasses = useSeenIt((s) => s.learnPasses);
    const haptics = useSeenIt((s) => s.settings.haptics);
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [choices, setChoices] = useState<Title[]>([]);
    useEffect(() => {
        let alive = true;
        const fallback = () => {
            const pool = getLocalCatalog().map((c) => c.title);
            const out = resolveSeeds(pool, CHOICES);
            if (out.length < CHOICES) {
                const used = new Set(out.map((title) => title.id));
                for (const title of [...pool].sort((a, b) => b.voteCount - a.voteCount)) {
                    if (out.length >= CHOICES)
                        break;
                    if (!used.has(title.id)) {
                        used.add(title.id);
                        out.push(title);
                    }
                }
            }
            if (alive)
                setChoices(out);
        };
        const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        void fetch(`${base}/api/onboarding`)
            .then(async (res) => {
            if (!res.ok)
                throw new Error(`onboarding ${res.status}`);
            const body = (await res.json()) as {
                titles?: Title[];
            };
            if (!Array.isArray(body.titles) || body.titles.length === 0) {
                throw new Error("empty onboarding");
            }
            if (alive)
                setChoices(body.titles.slice(0, CHOICES));
        })
            .catch(fallback);
        return () => {
            alive = false;
        };
    }, []);
    const toggle = useCallback((id: string) => {
        haptic("tick", haptics);
        setPicked((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }, [haptics]);
    const confirm = () => {
        for (const t of choices)
            if (picked.has(t.id))
                swipe(t, "liked");
        learnPasses(choices.filter((t) => !picked.has(t.id)));
        onDone();
    };
    const enough = picked.size >= MIN_PICKS;
    return (<motion.div variants={staggerContainer(0.05, 0.05)} initial="hidden" animate="show" exit="exit" className="mx-auto flex max-w-md flex-col px-5 pb-40 pt-8">
      <motion.div variants={FADE_UP} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.03em]">
            {t("taste.titleTop")}
            <br />
            {t("taste.titleBottom")}
          </h1>
          
          <div className="mt-3.5 flex items-center gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (<motion.span key={i} className="block h-1.5 rounded-full" animate={{
                width: picked.size > i ? 26 : 14,
                backgroundColor: picked.size > i ? "var(--color-accent)" : "var(--color-line)",
            }} transition={SPRING_SNAPPY}/>))}
            <AnimatePresence>
              {picked.size > MIN_PICKS && (<motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="ms-1 text-xs font-bold tabular-nums text-accent">
                  {picked.size}
                </motion.span>)}
            </AnimatePresence>
          </div>
        </div>

        <button type="button" onClick={onDone} className="-me-2 shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-ink-faint transition-colors hover:text-ink-dim active:scale-95">
          {t("taste.skip")}
        </button>
      </motion.div>

      <motion.div variants={staggerContainer(0.015)} className="mt-7 grid grid-cols-3 gap-2.5">
        {choices.map((t) => (<PickTile key={t.id} title={t} selected={picked.has(t.id)} onToggle={toggle} label={locale === "ar" ? t.title.ar || t.title.en : t.title.en}/>))}
      </motion.div>

      
      <ImportLibrary onDone={(added) => {
            if (added > 0)
                setTimeout(onDone, 1400);
        }}/>

      
      <AnimatePresence>
        {enough && (<motion.div initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 32 }} className="fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex justify-center px-5">
            <motion.button type="button" onClick={confirm} whileTap={{ scale: 0.95 }} transition={SPRING_SNAPPY} className="rounded-full bg-accent px-8 py-4 text-base font-bold text-[color:var(--color-on-accent)] shadow-[0_10px_34px_rgb(var(--rgb-accent)/0.45)]">
              {t("taste.start", { count: picked.size })}
            </motion.button>
          </motion.div>)}
      </AnimatePresence>
    </motion.div>);
}
const PickTile = memo(function PickTile({ title, selected, onToggle, label, }: {
    title: Title;
    selected: boolean;
    onToggle: (id: string) => void;
    label: string;
}) {
    return (<motion.button type="button" variants={FADE_UP} onClick={() => onToggle(title.id)} aria-pressed={selected} aria-label={label} whileTap={{ scale: 0.93 }} className="relative block w-full min-w-0 overflow-hidden rounded-2xl bg-surface-2" animate={{ scale: selected ? 0.985 : 1 }} transition={SPRING_SNAPPY} style={{
            boxShadow: selected
                ? "0 0 0 2px var(--color-accent), 0 8px 22px rgb(var(--rgb-accent) / 0.22)"
                : "0 2px 10px rgb(var(--rgb-shadow) / 0.07)",
        }}>
      <PosterArt title={title} sizes="140px" className="aspect-[2/3] w-full"/>
    </motion.button>);
});
