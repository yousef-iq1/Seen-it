"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PosterArt from "@/components/PosterArt";
import { PlusIcon, SearchIcon, ShuffleIcon, SparklesIcon, XIcon } from "@/components/ui/Icons";
import { getLocalCatalog, loadCatalog } from "@/lib/catalog";
import { searchCatalog } from "@/lib/search";
import { rank } from "@/lib/engine/rank-client";
import { applySwipe, emptyProfile } from "@/lib/engine/taste";
import { vectorOf } from "@/lib/catalog";
import { genreLabel } from "@/lib/genres";
import { EASE_OUT, FADE_UP, SPRING_SNAPPY, staggerContainer } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { useSeenIt } from "@/lib/store";
import { useLocale, useT } from "@/lib/i18n";
import type { Title } from "@/lib/types";
import { useDialogKeyboard } from "@/lib/useDialogKeyboard";
const MAX_SLOTS = 10;
export default function TogetherPage() {
    const locale = useLocale();
    const t = useT();
    const answerDialogRef = useRef<HTMLDivElement>(null);
    const [slots, setSlots] = useState<(Title | null)[]>([null, null]);
    const [editing, setEditing] = useState<number | null>(null);
    const [round, setRound] = useState(0);
    const [showing, setShowing] = useState(false);
    const haptics = useSeenIt((s) => s.settings.haptics);
    useDialogKeyboard(showing, answerDialogRef, () => setShowing(false));
    const chosen = useMemo(() => slots.filter((s): s is Title => Boolean(s)), [slots]);
    const [answers, setAnswers] = useState<Title[]>([]);
    useEffect(() => {
        if (chosen.length < 2) {
            setAnswers([]);
            return;
        }
        let stale = false;
        let profile = emptyProfile();
        for (const t of chosen)
            profile = applySwipe(profile, t, vectorOf(t), "liked");
        void rank({
            mode: "discover",
            profile,
            excludeIds: chosen.map((t) => t.id),
            count: 8,
            seed: 11,
            likedIds: chosen.map((t) => t.id),
            dislikedIds: [],
        }).then((r) => {
            if (!stale)
                setAnswers(r.titles);
        });
        return () => {
            stale = true;
        };
    }, [chosen]);
    const answer = answers.length > 0 ? answers[round % answers.length] : null;
    const setSlot = (i: number, title: Title | null) => {
        setSlots((s) => s.map((v, k) => (k === i ? title : v)));
        setShowing(false);
    };
    const addSlot = () => {
        if (slots.length >= MAX_SLOTS)
            return;
        setSlots((s) => [...s, null]);
        setEditing(slots.length);
    };
    const removeSlot = (i: number) => {
        setSlots((s) => (s.length <= 2 ? s.map((v, k) => (k === i ? null : v)) : s.filter((_, k) => k !== i)));
        setShowing(false);
    };
    const left = slots.map((s, i) => ({ s, i })).filter(({ i }) => i % 2 === 0);
    const right = slots.map((s, i) => ({ s, i })).filter(({ i }) => i % 2 === 1);
    return (<motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show" className="mx-auto max-w-md px-5 pb-28 pt-6">
      <motion.h1 variants={FADE_UP} className="text-[26px] font-bold tracking-[-0.03em]">
        {t("together.title")}
      </motion.h1>

      
      <AnimatePresence initial={false}>
        {chosen.length === 0 && (<motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24, ease: EASE_OUT }} className="overflow-hidden text-sm leading-relaxed text-ink-dim">
            <span className="mt-1.5 block">
              {t("together.intro")}
            </span>
          </motion.p>)}
      </AnimatePresence>

      <motion.div variants={FADE_UP} className="relative mt-6">
        <div className="grid grid-cols-2 gap-x-[84px] gap-y-3">
          <div className="space-y-3">
            {left.map(({ s, i }) => (<Slot key={i} title={s} onOpen={() => setEditing(i)} onClear={() => removeSlot(i)}/>))}
          </div>
          <div className="space-y-3">
            {right.map(({ s, i }) => (<Slot key={i} title={s} onOpen={() => setEditing(i)} onClear={() => removeSlot(i)}/>))}
          </div>
        </div>

        
        <div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center">
          <motion.button type="button" disabled={chosen.length < 2} onClick={() => {
            haptic("commit", haptics);
            setRound((r) => r + 1);
            setShowing(true);
        }} whileTap={chosen.length >= 2 ? { scale: 0.9 } : undefined} animate={{
            scale: chosen.length >= 2 ? 1 : 0.86,
            opacity: chosen.length >= 2 ? 1 : 0.45,
        }} transition={SPRING_SNAPPY} className="pointer-events-auto grid h-[68px] w-[68px] place-items-center rounded-full border border-line bg-surface text-accent shadow-[0_10px_30px_rgb(var(--rgb-shadow)/0.16)] disabled:text-ink-faint" aria-label={t("together.find")}>
            <SparklesIcon size={26} strokeWidth={1.9}/>
          </motion.button>
        </div>
      </motion.div>

      {slots.length < MAX_SLOTS && (<motion.button variants={FADE_UP} type="button" onClick={addSlot} whileTap={{ scale: 0.97 }} transition={SPRING_SNAPPY} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-faint/40 bg-surface py-3.5 text-sm font-semibold text-ink-dim transition-colors hover:text-ink" aria-label={t("together.addPerson")}>
          <PlusIcon size={18} strokeWidth={2.4}/>
        </motion.button>)}

      
      <AnimatePresence>
        {showing && answer && (<motion.div className="fixed inset-0 z-50 flex items-center justify-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE_OUT }}>
            <motion.div className="absolute inset-0 bg-[rgb(var(--rgb-scrim)/0.62)] backdrop-blur-md" onClick={() => setShowing(false)}/>
            <motion.div ref={answerDialogRef} role="dialog" aria-modal="true" aria-label={t("together.dialogTitle")} tabIndex={-1} key={answer.id} initial={{ opacity: 0, y: 28, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="soft-card relative z-10 w-full max-w-[320px] overflow-hidden">
              <div className="relative">
                <PosterArt title={answer} sizes="360px" className="aspect-[2/3] w-full"/>
                <div className="card-sheen absolute inset-0"/>
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h2 className="text-xl font-bold leading-tight text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.5)]">
                    {answer.title[locale]}
                  </h2>
                  <p className="mt-1 text-[11px] font-medium text-white/70">
                    {answer.year}
                    {answer.genres.slice(0, 2).map((g) => (<span key={g}> · {genreLabel(g, locale)}</span>))}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3">
                <motion.button type="button" whileTap={{ scale: 0.94 }} transition={SPRING_SNAPPY} onClick={() => {
                haptic("tick", haptics);
                setRound((r) => r + 1);
            }} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line py-3 text-sm font-semibold text-ink-dim">
                  <ShuffleIcon size={17}/>
                  {t("together.another")}
                </motion.button>
                <motion.button type="button" whileTap={{ scale: 0.94 }} transition={SPRING_SNAPPY} onClick={() => setShowing(false)} className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-accent text-[color:var(--color-on-accent)]" aria-label={t("together.close")}>
                  <XIcon size={18} strokeWidth={2.6}/>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>)}
      </AnimatePresence>

      
      <AnimatePresence>
        {editing !== null && (<PickSheet taken={new Set(chosen.map((t) => t.id))} onPick={(t) => {
                setSlot(editing, t);
                setEditing(null);
            }} onClose={() => setEditing(null)}/>)}
      </AnimatePresence>
    </motion.div>);
}
function Slot({ title, onOpen, onClear, }: {
    title: Title | null;
    onOpen: () => void;
    onClear: () => void;
}) {
    const t = useT();
    const locale = useLocale();
    const label = title ? (locale === "ar" ? title.title.ar || title.title.en : title.title.en) : t("together.nameFilm");
    return (<div className="relative">
      <motion.button type="button" onClick={onOpen} whileTap={{ scale: 0.95 }} transition={SPRING_SNAPPY} className={`block aspect-[2/3] w-full overflow-hidden rounded-2xl ${title
            ? "shadow-[0_6px_20px_rgb(var(--rgb-shadow)/0.14)]"
            :
                "grid place-items-center gap-1.5 border-2 border-dashed border-ink-faint/40 bg-surface text-ink-dim"}`} aria-label={label}>
        {title ? (<PosterArt title={title} sizes="160px" className="h-full w-full"/>) : (<>
            <SearchIcon size={22}/>
            <span className="text-[11px] font-semibold">{t("together.nameOne")}</span>
          </>)}
      </motion.button>

      <AnimatePresence>
        {title && (<motion.button type="button" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={SPRING_SNAPPY} onClick={onClear} className="absolute -end-1.5 -top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-[rgb(var(--rgb-scrim)/0.62)] text-white shadow-md backdrop-blur-sm" aria-label={t("together.remove")}>
            <XIcon size={11} strokeWidth={3}/>
          </motion.button>)}
      </AnimatePresence>
    </div>);
}
function PickSheet({ taken, onPick, onClose, }: {
    taken: Set<string>;
    onPick: (t: Title) => void;
    onClose: () => void;
}) {
    const t = useT();
    const locale = useLocale();
    const sheetRef = useRef<HTMLDivElement>(null);
    const [q, setQ] = useState("");
    useDialogKeyboard(true, sheetRef, onClose);
    const [results, setResults] = useState<Title[]>([]);
    useEffect(() => {
        let alive = true;
        const query = q.trim();
        const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        void fetch(`${base}/api/search`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                query,
                skipIds: [...taken],
                limit: 30,
            }),
        })
            .then(async (res) => {
            if (!res.ok)
                throw new Error(`search ${res.status}`);
            const body = (await res.json()) as {
                titles?: Title[];
            };
            if (!Array.isArray(body.titles))
                throw new Error("invalid search response");
            if (alive)
                setResults(body.titles);
        })
            .catch(async () => {
            await loadCatalog();
            if (!alive)
                return;
            if (query.length < 2) {
                setResults(getLocalCatalog()
                    .map((c) => c.title)
                    .filter((title) => !taken.has(title.id))
                    .sort((a, b) => b.voteCount - a.voteCount)
                    .slice(0, 30));
            }
            else {
                setResults(searchCatalog(query, { limit: 30, skip: (id) => taken.has(id) }));
            }
        });
        return () => {
            alive = false;
        };
    }, [q, taken]);
    return (<motion.div className="fixed inset-0 z-50 flex flex-col justify-end">
      
      <motion.div className="absolute inset-0 bg-[rgb(var(--rgb-scrim)/0.5)] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE_OUT } }} transition={{ duration: 0.38, ease: EASE_OUT }} onClick={onClose}/>
      <motion.div ref={sheetRef} role="dialog" aria-modal="true" aria-label={t("together.pickerTitle")} tabIndex={-1} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%", transition: { duration: 0.34, ease: [0.4, 0, 0.7, 1] } }} transition={{ type: "spring", stiffness: 210, damping: 30, mass: 1 }} className="relative z-10 flex h-[78dvh] flex-col rounded-t-[28px] border-t border-line bg-bg px-5 pb-[env(safe-area-inset-bottom)] pt-3">
        <span className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden/>

        <label className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3">
          <SearchIcon size={18} className="shrink-0 text-ink-faint"/>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("together.searchPlaceholder")} className="w-full bg-transparent text-base outline-none placeholder:text-ink-faint"/>
        </label>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-4">
          <div className="grid grid-cols-3 gap-2.5">
            {results.map((t) => (<motion.button key={t.id} type="button" whileTap={{ scale: 0.93 }} transition={SPRING_SNAPPY} onClick={() => onPick(t)} className="block w-full min-w-0 overflow-hidden rounded-xl bg-surface-2" aria-label={locale === "ar" ? t.title.ar || t.title.en : t.title.en}>
                <PosterArt title={t} sizes="130px" className="aspect-[2/3] w-full"/>
              </motion.button>))}
          </div>
        </div>
      </motion.div>
    </motion.div>);
}
