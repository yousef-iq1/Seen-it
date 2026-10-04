"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import TitleTile from "@/components/TitleTile";
import ListsView from "@/components/ListsView";
import PosterArt from "@/components/PosterArt";
import { EyeIcon, FilmIcon, HeartIcon, SearchIcon, StarIcon, ThumbsDownIcon, TrashIcon, CheckIcon, } from "@/components/ui/Icons";
import { matches, searchCatalog } from "@/lib/search";
import { getLocalTitle, loadCatalog } from "@/lib/catalog";
import { resolveTitleSnapshots } from "@/lib/title-resolver";
import { EASE_OUT, FADE_UP, QUICK, SECTION, SPRING_SNAPPY, staggerContainer } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { useSeenIt } from "@/lib/store";
import { useLocale, useT } from "@/lib/i18n";
import { genreLabel } from "@/lib/genres";
import type { Swipe, SwipeAction, Title } from "@/lib/types";
type Filter = "all" | "liked" | "disliked";
const FILTERS: Filter[] = ["all", "liked", "disliked"];
type Tab = "watched" | "lists";
export default function LibraryPage() {
    const locale = useLocale();
    const t = useT();
    const swipes = useSeenIt((s) => s.swipes);
    const removeSwipe = useSeenIt((s) => s.removeSwipe);
    const doSwipe = useSeenIt((s) => s.swipe);
    const haptics = useSeenIt((s) => s.settings.haptics);
    const [tab, setTab] = useState<Tab>("watched");
    const [filter, setFilter] = useState<Filter>("all");
    const [settled, setSettled] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [picking, setPicking] = useState(false);
    const [chosen, setChosen] = useState<Set<string>>(new Set());
    const [resolvedTitles, setResolvedTitles] = useState<Map<string, Title>>(new Map());
    useEffect(() => {
        let alive = true;
        const missing = Object.values(swipes)
            .filter((sw) => !sw.title && !getLocalTitle(sw.titleId))
            .map((sw) => sw.titleId);
        if (missing.length === 0)
            return () => { alive = false; };
        void resolveTitleSnapshots(missing).then((map) => {
            if (!alive)
                return;
            setResolvedTitles((prev) => {
                const next = new Map(prev);
                for (const [id, title] of map)
                    next.set(id, title);
                return next;
            });
        });
        return () => {
            alive = false;
        };
    }, [swipes]);
    const watched = useMemo(() => Object.values(swipes)
        .filter((sw) => sw.action !== "not_seen")
        .sort((a, b) => b.at - a.at), [swipes]);
    const filtered = useMemo(() => {
        let rows = watched;
        if (filter !== "all")
            rows = rows.filter((sw) => sw.action === filter);
        if (settled.trim()) {
            rows = rows.filter((sw) => {
                const title = getLocalTitle(sw.titleId) ?? sw.title ?? resolvedTitles.get(sw.titleId);
                return Boolean(title && matches(title, settled));
            });
        }
        return rows;
    }, [watched, filter, settled, resolvedTitles]);
    const [elsewhere, setElsewhere] = useState<Title[]>([]);
    useEffect(() => {
        const query = settled.trim();
        if (query.length < 2) {
            setElsewhere([]);
            return;
        }
        let alive = true;
        const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        void fetch(`${base}/api/search`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                query,
                skipIds: Object.keys(swipes),
                limit: 24,
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
                setElsewhere(body.titles);
        })
            .catch(async () => {
            await loadCatalog();
            if (!alive)
                return;
            setElsewhere(searchCatalog(query, { limit: 24, skip: (id) => Boolean(swipes[id]) }));
        });
        return () => {
            alive = false;
        };
    }, [settled, swipes]);
    const searching = settled.trim().length >= 2;
    const PAGE = 24;
    const [shown, setShown] = useState(PAGE);
    useEffect(() => setShown(PAGE), [filter, settled, tab]);
    const sentinel = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const node = sentinel.current;
        if (!node || typeof IntersectionObserver === "undefined")
            return;
        const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting))
                setShown((n) => n + PAGE);
        }, { rootMargin: "600px" });
        io.observe(node);
        return () => io.disconnect();
    }, [filtered.length, tab]);
    return (<motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show" className="px-5 pb-28 pt-6">
      
      <motion.div variants={FADE_UP} className="flex items-center gap-3">
        <h1 className="min-w-0 flex-1 truncate text-[26px] font-bold tracking-[-0.03em]">
          {t("library.title")}
        </h1>
        
        <Link href="/add" aria-label={t("library.addFilms")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-lg font-semibold text-ink-dim transition-colors hover:text-ink-strong">
          +
        </Link>
        <div className="flex shrink-0 rounded-full border border-line bg-surface-2 p-1" dir="ltr">
        {([
            ["watched", t("library.watchedTab")],
            ["lists", t("library.listsTab")],
        ] as const).map(([m, label]) => (<button key={m} type="button" onClick={() => setTab(m)} className={`relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${tab === m ? "text-[color:var(--color-on-accent)]" : "text-ink-dim"}`}>
            {tab === m && (<motion.span layoutId="library-tab" transition={SPRING_SNAPPY} className="absolute inset-0 rounded-full bg-accent"/>)}
            <span className="relative">{label}</span>
          </button>))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "lists" ? (<motion.div key="lists" variants={SECTION} initial="hidden" animate="show" exit="exit" className="mt-5">
            <ListsView />
          </motion.div>) : (<motion.div key="watched" variants={SECTION} initial="hidden" animate="show" exit="exit">
            
            <motion.div variants={FADE_UP} className="mt-3">
              <SearchField onSettled={setSettled}/>
            </motion.div>

            
            {filtered.length > 0 && (<motion.div variants={FADE_UP} className="mt-3 flex items-center gap-3">
                <LayoutGroup id="library-filters">
                  <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-line bg-surface p-1">
                    {FILTERS.map((f) => {
                    const active = filter === f;
                    return (<motion.button key={f} onClick={() => setFilter(f)} whileTap={{ scale: 0.9 }} transition={SPRING_SNAPPY} aria-label={t(`library.${f}`)} title={t(`library.${f}`)} aria-pressed={active} className={`relative grid h-9 w-9 place-items-center rounded-xl transition-colors ${active ? "text-[color:var(--color-on-accent)]" : "text-ink-faint"}`}>
                          {active && (<motion.span layoutId="filter-pill" className="absolute inset-0 rounded-xl bg-accent" transition={{ type: "spring", stiffness: 420, damping: 34 }}/>)}
                          <span className="relative">
                            {f === "all" ? (<FilmIcon size={17} strokeWidth={2}/>) : f === "liked" ? (<HeartIcon size={16} filled/>) : (<ThumbsDownIcon size={16} filled/>)}
                          </span>
                        </motion.button>);
                })}
                  </div>
                </LayoutGroup>
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold uppercase tracking-wider text-ink-faint">
                  {filtered.length} {filtered.length === 1 ? "title" : "titles"}
                </span>
                <button type="button" onClick={() => {
                    setPicking((v) => !v);
                    setChosen(new Set());
                    setSelectedId(null);
                }} className="rounded-full px-2 py-1 text-[13px] font-semibold text-accent">
                  {picking ? t("common.cancel") : "Select"}
                </button>
              </motion.div>)}

            <AnimatePresence mode="wait" initial={false}>
              {filtered.length === 0 && !searching ? (<motion.div key={`empty-${filter}`} variants={SECTION} initial="hidden" animate="show" exit="exit" className="mt-14 flex flex-col items-center text-center">
                  <FilmIcon size={50} strokeWidth={1.3} className="text-ink-faint"/>
                  <Link href="/" className="mt-5">
                    <motion.span whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} transition={SPRING_SNAPPY} className="glow-btn inline-block">
                      <span>{t("library.startSwiping")}</span>
                    </motion.span>
                  </Link>
                </motion.div>) : filtered.length === 0 ? (<motion.div key="none" className="h-0"/>) : (<motion.div key="grid" variants={staggerContainer(0.045)} initial="hidden" animate="show" exit="exit" className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                  
                  <AnimatePresence>
                    {filtered.slice(0, shown).map((sw) => (<LibraryTile key={sw.titleId} swipe={sw} resolvedTitle={getLocalTitle(sw.titleId) ?? sw.title ?? resolvedTitles.get(sw.titleId)} picking={picking} ticked={chosen.has(sw.titleId)} selected={selectedId === sw.titleId} onSelect={() => {
                        if (picking) {
                            setChosen((prev) => {
                                const next = new Set(prev);
                                if (next.has(sw.titleId))
                                    next.delete(sw.titleId);
                                else
                                    next.add(sw.titleId);
                                return next;
                            });
                            return;
                        }
                        setSelectedId(selectedId === sw.titleId ? null : sw.titleId);
                    }} onRemove={() => {
                        setSelectedId(null);
                        removeSwipe(sw.titleId);
                    }}/>))}
                  </AnimatePresence>
                </motion.div>)}
            </AnimatePresence>

            
            <AnimatePresence>
              {picking && chosen.size > 0 && (<motion.div key="bulk" initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }} transition={SPRING_SNAPPY} className="fixed inset-x-0 bottom-[calc(74px+env(safe-area-inset-bottom))] z-40 px-5">
                  <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => {
                    haptic("commit", haptics);
                    for (const id of chosen)
                        removeSwipe(id);
                    setChosen(new Set());
                    setPicking(false);
                }} className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-danger py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_rgb(var(--rgb-shadow)/0.28)]">
                    <TrashIcon size={17}/>
                    {t("common.delete")} {chosen.size}
                  </motion.button>
                </motion.div>)}
            </AnimatePresence>

            
            {filtered.length > shown && <div ref={sentinel} className="h-4"/>}

            
            <AnimatePresence initial={false}>
              {searching && elsewhere.length > 0 && (<motion.div key="elsewhere" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.24, ease: EASE_OUT }} className="mt-9">
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-line"/>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      {t("library.notInLibrary")}
                    </span>
                    <span className="h-px flex-1 bg-line"/>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    {elsewhere.map((title) => (<LogRow key={title.id} title={title} onLog={(action) => {
                        haptic("tick", haptics);
                        doSwipe(title, action);
                    }}/>))}
                  </div>
                </motion.div>)}
            </AnimatePresence>

            {searching && filtered.length === 0 && elsewhere.length === 0 && (<p className="mt-14 text-center text-sm text-ink-faint">
                {t("library.nothingFound")}
              </p>)}
          </motion.div>)}
      </AnimatePresence>
    </motion.div>);
}
function SearchField({ onSettled }: {
    onSettled: (v: string) => void;
}) {
    const locale = useLocale();
    const t = useT();
    const [value, setValue] = useState("");
    useEffect(() => {
        const id = setTimeout(() => onSettled(value), 140);
        return () => clearTimeout(id);
    }, [value, onSettled]);
    return (<motion.label variants={FADE_UP} className="mt-4 flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 transition-colors focus-within:border-accent">
      <SearchIcon size={18} className="shrink-0 text-ink-faint"/>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={t("library.search")} className="w-full bg-transparent text-base outline-none placeholder:text-ink-faint"/>
      {value && (<button type="button" onClick={() => setValue("")} className="shrink-0 text-ink-faint transition-transform active:scale-90" aria-label={t("common.close")}>
          <span className="grid h-5 w-5 place-items-center rounded-full bg-surface-2 text-xs">
            ×
          </span>
        </button>)}
    </motion.label>);
}
function LogRow({ title, onLog, }: {
    title: Title;
    onLog: (action: SwipeAction) => void;
}) {
    const locale = useLocale();
    const t = useT();
    return (<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={SPRING_SNAPPY} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2">
      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg">
        <PosterArt title={title} sizes="60px" className="h-full w-full"/>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{title.title[locale]}</div>
        <div className="text-[11px] text-ink-faint">
          {title.year} · {title.type === "movie" ? t("card.movie") : t("card.tv")}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5" dir="ltr">
        <LogButton label={t("swipe.disliked")} tint="var(--color-danger)" onPress={() => onLog("disliked")}>
          <ThumbsDownIcon size={17}/>
        </LogButton>
        <LogButton label={t("swipe.seen")} tint="var(--color-ink-strong)" onPress={() => onLog("seen")}>
          <EyeIcon size={17}/>
        </LogButton>
        <LogButton label={t("swipe.liked")} tint="var(--color-accent)" onPress={() => onLog("liked")}>
          <HeartIcon size={17} filled/>
        </LogButton>
      </div>
    </motion.div>);
}
function LogButton({ label, tint, onPress, children, }: {
    label: string;
    tint: string;
    onPress: () => void;
    children: React.ReactNode;
}) {
    const locale = useLocale();
    const t = useT();
    return (<motion.button type="button" aria-label={label} title={label} onClick={onPress} whileTap={{ scale: 0.88 }} transition={SPRING_SNAPPY} style={{ width: 40, height: 40, ["--tint" as string]: tint }} className="deck-action">
      {children}
    </motion.button>);
}
function LibraryTile({ swipe, resolvedTitle, picking, ticked, selected, onSelect, onRemove, }: {
    swipe: Swipe;
    resolvedTitle?: Title;
    picking: boolean;
    ticked: boolean;
    selected: boolean;
    onSelect: () => void;
    onRemove: () => void;
}) {
    const locale = useLocale();
    const t = useT();
    const title = resolvedTitle ?? getLocalTitle(swipe.titleId) ?? swipe.title;
    if (!title)
        return null;
    const flipped = selected && !picking;
    return (<motion.div layout="position" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={SPRING_SNAPPY} className="relative" style={{ perspective: 1100 }}>
      <motion.button type="button" onClick={onSelect} whileTap={{ scale: 0.96 }} aria-label={title.title[locale]} aria-pressed={picking ? ticked : flipped} className="relative block aspect-[2/3] w-full" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}>
        
        <span className="absolute inset-0 overflow-hidden rounded-[20px] bg-surface-2" style={{ backfaceVisibility: "hidden" }}>
          <PosterArt title={title} sizes="200px" className="h-full w-full"/>
          
          <span className={`absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm ${swipe.action === "liked"
            ? "bg-accent"
            : swipe.action === "disliked"
                ? "bg-danger"
                : "bg-ink-strong"}`}>
            {swipe.action === "liked" ? (<HeartIcon size={13} filled/>) : swipe.action === "disliked" ? (<ThumbsDownIcon size={12} filled/>) : (<EyeIcon size={12} strokeWidth={2.2}/>)}
          </span>

          
          
          {picking && (<>
              <span className={`absolute inset-0 bg-accent transition-opacity ${ticked ? "opacity-25" : "opacity-0"}`}/>
              <span className="absolute inset-0 flex items-start justify-start p-2">
                <span className={`grid h-[26px] w-[26px] place-items-center rounded-full border shadow-sm transition-colors ${ticked
                ? "border-accent bg-accent text-[color:var(--color-on-accent)]"
                : "border-black/10 bg-white text-transparent"}`}>
                  <CheckIcon size={14} strokeWidth={3}/>
                </span>
              </span>
            </>)}
        </span>

        
        <span className="absolute inset-0 overflow-hidden rounded-[20px] bg-ink-strong" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <span className="absolute inset-0 scale-125" style={{
            backgroundImage: title.posterPath
                ? `url(https://image.tmdb.org/t/p/w500${title.posterPath})`
                : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(14px)",
        }} aria-hidden/>
          <span className="absolute inset-0" style={{ background: "rgb(var(--rgb-scrim) / 0.76)" }} aria-hidden/>

          <span className="relative flex h-full flex-col p-2.5 text-start text-white">
            <span className="block text-[12.5px] font-bold leading-tight">
              {title.title[locale]}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[9.5px] font-semibold text-white/60">
              {title.year} · {title.type === "movie" ? t("card.movie") : t("card.tv")}
              <StarIcon size={9} filled className="text-accent-soft"/>
              {title.rating.toFixed(1)}
            </span>
            <span className="mt-1.5 flex flex-wrap gap-1">
              {title.genres.slice(0, 2).map((g) => (<span key={g} className="rounded-full bg-white/20 px-1.5 py-0.5 text-[8.5px] font-semibold capitalize">
                  {genreLabel(g, locale)}
                </span>))}
            </span>
            {title.overview[locale] && (<span className="mt-1.5 block min-h-0 flex-1 overflow-hidden text-[9.5px] leading-relaxed text-white/80">
                {title.overview[locale]}
              </span>)}
            <motion.span role="button" tabIndex={0} aria-label={t("common.delete")} whileTap={{ scale: 0.92 }} onClick={(e) => {
            e.stopPropagation();
            onRemove();
        }} className="mt-1.5 flex shrink-0 items-center justify-center gap-1 rounded-full bg-danger py-1.5 text-[10px] font-bold text-white">
              <TrashIcon size={12}/>
              {t("common.delete")}
            </motion.span>
          </span>
        </span>
      </motion.button>
    </motion.div>);
}
