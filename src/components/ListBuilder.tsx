"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PosterArt from "./PosterArt";
import { getLocalTitle, loadCatalog } from "@/lib/catalog";
import { resolveTitleSnapshots } from "@/lib/title-resolver";
import { matches, searchCatalog } from "@/lib/search";
import { useSeenIt } from "@/lib/store";
import { FADE_UP, SPRING_SNAPPY, staggerContainer } from "@/lib/motion";
import { CheckIcon, SearchIcon, XIcon } from "./ui/Icons";
import type { Title } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n";
import { genreLabel } from "@/lib/genres";
type Mode = "pick" | "type" | "genre";
export default function ListBuilder({ listId, onDone, }: {
    listId: string;
    onDone?: () => void;
}) {
    const tr = useT();
    const locale = useLocale();
    const lists = useSeenIt((s) => s.lists);
    const swipes = useSeenIt((s) => s.swipes);
    const addToList = useSeenIt((s) => s.addToList);
    const removeFromList = useSeenIt((s) => s.removeFromList);
    const list = lists.find((l) => l.id === listId);
    const inList = useMemo(() => new Set(list?.titleIds ?? []), [list?.titleIds]);
    const [resolvedTitles, setResolvedTitles] = useState<Map<string, Title>>(new Map());
    useEffect(() => {
        let alive = true;
        const wanted = new Set<string>(list?.titleIds ?? []);
        for (const sw of Object.values(swipes)) {
            if (!sw.title && !getLocalTitle(sw.titleId))
                wanted.add(sw.titleId);
        }
        void resolveTitleSnapshots([...wanted]).then((map) => {
            if (alive)
                setResolvedTitles(map);
        });
        return () => {
            alive = false;
        };
    }, [list?.titleIds, swipes]);
    const [mode, setMode] = useState<Mode>("pick");
    const [query, setQuery] = useState("");
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const library = useMemo(() => {
        const out: Title[] = [];
        for (const sw of Object.values(swipes)) {
            if (sw.action === "not_seen")
                continue;
            const t = getLocalTitle(sw.titleId) ?? sw.title ?? resolvedTitles.get(sw.titleId);
            if (t)
                out.push(t);
        }
        return out.reverse();
    }, [swipes, resolvedTitles]);
    const genres = useMemo(() => {
        const counts = new Map<string, number>();
        for (const t of library) {
            for (const g of t.genres) {
                const key = g.toLowerCase();
                counts.set(key, (counts.get(key) ?? 0) + 1);
            }
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [library]);
    const [chosenGenres, setChosenGenres] = useState<Set<string>>(new Set());
    const genreMatches = useMemo(() => {
        if (chosenGenres.size === 0)
            return [];
        return library.filter((t) => t.genres.some((g) => chosenGenres.has(g.toLowerCase())));
    }, [library, chosenGenres]);
    const [typed, setTyped] = useState<Title[]>([]);
    useEffect(() => {
        const q = query.trim();
        if (mode !== "type" || q.length < 2) {
            setTyped([]);
            return;
        }
        let alive = true;
        const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        void fetch(`${base}/api/search`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ query: q, limit: 24 }),
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
                setTyped(body.titles);
        })
            .catch(async () => {
            await loadCatalog();
            if (alive)
                setTyped(searchCatalog(q, { limit: 24 }));
        });
        return () => {
            alive = false;
        };
    }, [query, mode]);
    const pickable = useMemo(() => {
        if (!query.trim())
            return library;
        return library.filter((t) => matches(t, query));
    }, [library, query]);
    const toggle = (id: string) => setPicked((p) => {
        const next = new Set(p);
        if (next.has(id))
            next.delete(id);
        else
            next.add(id);
        return next;
    });
    const commit = (ids: string[]) => {
        if (ids.length === 0)
            return;
        addToList(listId, ids);
        setPicked(new Set());
        setChosenGenres(new Set());
        setQuery("");
        onDone?.();
    };
    if (!list)
        return null;
    const shown = mode === "pick" ? pickable : mode === "type" ? typed : genreMatches;
    const pendingCount = mode === "genre"
        ? genreMatches.filter((t) => !inList.has(t.id)).length
        : picked.size;
    const contents = list.titleIds
        .map((id) => getLocalTitle(id) ?? resolvedTitles.get(id))
        .filter((t): t is Title => Boolean(t));
    return (<motion.div variants={staggerContainer(0.04)} initial="hidden" animate="show">
      
      {contents.length > 0 && (<motion.div variants={FADE_UP} className="mb-8">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            <AnimatePresence initial={false}>
              {contents.map((t) => (<motion.button key={t.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.86 }} whileTap={{ scale: 0.93 }} transition={SPRING_SNAPPY} type="button" onClick={() => removeFromList(listId, [t.id])} aria-label={tr("listBuilder.remove", { title: locale === "ar" ? t.title.ar || t.title.en : t.title.en })} className="relative block w-full min-w-0 overflow-hidden rounded-xl">
                  <PosterArt title={t} sizes="110px" className="aspect-[2/3] w-full"/>
                  <span className="absolute end-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-[rgb(var(--rgb-scrim)/0.62)] text-white backdrop-blur-sm">
                    <XIcon size={11} strokeWidth={3}/>
                  </span>
                </motion.button>))}
            </AnimatePresence>
          </div>
          <div className="mt-6 h-px bg-line"/>
        </motion.div>)}

      
      <motion.div variants={FADE_UP} className="flex rounded-full border border-line bg-surface-2 p-1" dir="ltr">
        {([
            ["pick", tr("listBuilder.library")],
            ["type", tr("listBuilder.byName")],
            ["genre", tr("listBuilder.byGenre")],
        ] as const).map(([m, label]) => (<button key={m} type="button" onClick={() => {
                setMode(m);
                setQuery("");
                setPicked(new Set());
            }} className={`relative flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${mode === m ? "text-[color:var(--color-on-accent)]" : "text-ink-dim"}`}>
            {mode === m && (<motion.span layoutId="list-builder-mode" transition={SPRING_SNAPPY} className="absolute inset-0 rounded-full bg-accent"/>)}
            <span className="relative">{label}</span>
          </button>))}
      </motion.div>

      {mode !== "genre" && (<motion.label variants={FADE_UP} className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
          <SearchIcon size={17} className="shrink-0 text-ink-faint"/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={mode === "pick" ? tr("listBuilder.filter") : tr("listBuilder.typeName")} className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"/>
        </motion.label>)}

      {mode === "genre" && (<motion.div variants={FADE_UP} className="mt-3 flex flex-wrap gap-2">
          {genres.map(([g, n]) => {
                const on = chosenGenres.has(g);
                return (<motion.button key={g} type="button" whileTap={{ scale: 0.94 }} transition={SPRING_SNAPPY} onClick={() => setChosenGenres((s) => {
                        const next = new Set(s);
                        if (next.has(g))
                            next.delete(g);
                        else
                            next.add(g);
                        return next;
                    })} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${on
                        ? "border-accent bg-accent text-[color:var(--color-on-accent)]"
                        : "border-line bg-surface text-ink-dim"}`}>
                {genreLabel(g, locale)} <span className="tabular-nums opacity-70">{n}</span>
              </motion.button>);
            })}
          {genres.length === 0 && (<div className="flex w-full justify-center gap-1.5 py-10">
              {[0, 1, 2].map((i) => (<span key={i} className="h-14 w-10 rounded-lg border border-dashed border-line"/>))}
            </div>)}
        </motion.div>)}

      
      <motion.div variants={FADE_UP} className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
        <AnimatePresence initial={false}>
          {shown.slice(0, 60).map((t) => {
            const already = inList.has(t.id);
            const on = mode === "genre" ? true : picked.has(t.id);
            return (<motion.button key={t.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: already ? 0.4 : 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={SPRING_SNAPPY} whileTap={{ scale: 0.93 }} type="button" disabled={mode === "genre" || already} onClick={() => toggle(t.id)} aria-label={locale === "ar" ? t.title.ar || t.title.en : t.title.en} className="relative block w-full min-w-0 overflow-hidden rounded-xl" style={{
                    boxShadow: on && !already && mode !== "genre"
                        ? "0 0 0 3px var(--color-accent)"
                        : undefined,
                }}>
                <PosterArt title={t} sizes="110px" className="aspect-[2/3] w-full"/>
                {(already || (on && mode !== "genre")) && (<span className="absolute end-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-[color:var(--color-on-accent)]">
                    <CheckIcon size={12} strokeWidth={3}/>
                  </span>)}
              </motion.button>);
        })}
        </AnimatePresence>
      </motion.div>

      
      <AnimatePresence>
        {pendingCount > 0 && (<motion.div initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 32 }} className="fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex justify-center px-5">
            <motion.button type="button" whileTap={{ scale: 0.95 }} transition={SPRING_SNAPPY} onClick={() => commit(mode === "genre" ? genreMatches.map((t) => t.id) : [...picked])} className="rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-[color:var(--color-on-accent)] shadow-[0_10px_34px_rgb(var(--rgb-accent)/0.45)]">
              {tr("listBuilder.add", { count: pendingCount })}
            </motion.button>
          </motion.div>)}
      </AnimatePresence>
    </motion.div>);
}
