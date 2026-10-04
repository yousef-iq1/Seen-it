"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import PosterArt from "./PosterArt";
import { rankWatchedGrid } from "@/lib/engine/rank-client";
import { useSeenIt } from "@/lib/store";
import type { Title } from "@/lib/types";
import { useT, useLocale } from "@/lib/i18n";
const PER_SCREEN = 40;
export default function QuickAdd() {
    const t = useT();
    const locale = useLocale();
    const [ready, setReady] = useState(false);
    const [screen, setScreen] = useState(0);
    const [picked, setPicked] = useState<Record<string, true>>({});
    const [added, setAdded] = useState(0);
    const swipes = useSeenIt((s) => s.swipes);
    const learnPasses = useSeenIt((s) => s.learnPasses);
    const [titles, setTitles] = useState<Title[]>([]);
    useEffect(() => {
        let alive = true;
        setReady(false);
        const state = useSeenIt.getState();
        const exclude = new Set([...Object.keys(state.swipes), ...state.passed]);
        const watchedIds = Object.values(state.swipes)
            .filter((sw) => sw.action !== "not_seen")
            .map((sw) => sw.titleId);
        void rankWatchedGrid({
            profile: state.profile,
            excludeIds: exclude,
            count: PER_SCREEN,
            seed: 1 + screen * 7919,
            watchedIds,
            reach: state.settings.reach,
        }).then((next) => {
            if (!alive)
                return;
            setTitles(next);
            setReady(true);
        });
        return () => {
            alive = false;
        };
    }, [screen]);
    const toggle = useCallback((id: string) => {
        setPicked((p) => {
            const next = { ...p };
            if (next[id])
                delete next[id];
            else
                next[id] = true;
            return next;
        });
    }, []);
    const commit = () => {
        const swipe = useSeenIt.getState().swipe;
        let n = 0;
        const untouched: Title[] = [];
        for (const t of titles) {
            if (picked[t.id]) {
                swipe(t, "seen");
                n++;
            }
            else {
                untouched.push(t);
            }
        }
        learnPasses(untouched);
        setAdded((a) => a + n);
        setPicked({});
        setScreen((s) => s + 1);
        if (typeof window !== "undefined")
            window.scrollTo({ top: 0 });
    };
    const chosen = Object.keys(picked).length;
    const library = useMemo(() => Object.values(swipes).filter((s) => s.action !== "not_seen").length, [swipes]);
    if (!ready) {
        return (<div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-dim">
        {t("quickAdd.loading")}
      </div>);
    }
    return (<div className="px-4 pb-32 pt-5">
      <h1 className="text-2xl font-bold tracking-tight text-ink-strong">{t("quickAdd.title")}</h1>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-dim">
        {t("quickAdd.intro")}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {titles.map((t) => {
            const on = t.id in picked;
            return (<button key={t.id} type="button" onClick={() => toggle(t.id)} aria-pressed={on} className="flex w-full min-w-0 flex-col gap-1 text-left">
              <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl border transition-all ${on ? "border-accent ring-2 ring-accent/60" : "border-line opacity-60"}`}>
                <PosterArt title={t} sizes="140px" className="aspect-[2/3] w-full"/>
                {on && (<span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-[color:var(--color-on-accent)]">
                    ✓
                  </span>)}
              </div>
              <div className="w-full truncate text-center text-[10px] leading-tight text-ink-dim">
                {(locale === "ar" ? t.title.ar || t.title.en : t.title.en)} · {t.year}
              </div>
            </button>);
        })}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="text-xs tabular-nums text-ink-dim">
            {t("quickAdd.library", { count: library })}
            {added > 0 && <> · {t("quickAdd.added", { count: added })}</>}
          </p>
          <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={commit} className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-[color:var(--color-on-accent)]">
            {chosen > 0 ? t("quickAdd.addNext", { count: chosen }) : t("quickAdd.none")}
          </motion.button>
        </div>
      </div>
    </div>);
}
