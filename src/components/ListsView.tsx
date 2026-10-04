"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ListBuilder from "./ListBuilder";
import PosterArt from "./PosterArt";
import { getLocalTitle } from "@/lib/catalog";
import { resolveTitleSnapshots } from "@/lib/title-resolver";
import type { Title } from "@/lib/types";
import { useSeenIt } from "@/lib/store";
import { useAccount } from "@/lib/supabase/useAccount";
import { publishList } from "@/lib/supabase/lists";
import { FADE_UP, SPRING_SNAPPY, staggerContainer } from "@/lib/motion";
import { useT } from "@/lib/i18n";
import { CheckIcon, ChevronLeftIcon, PlusIcon, ShareIcon, StackIcon, TrashIcon, } from "./ui/Icons";
export default function ListsView() {
    const t = useT();
    const lists = useSeenIt((s) => s.lists);
    const createList = useSeenIt((s) => s.createList);
    const deleteList = useSeenIt((s) => s.deleteList);
    const setListHideOwner = useSeenIt((s) => s.setListHideOwner);
    const { session } = useAccount();
    const [open, setOpen] = useState<string | null>(null);
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState("");
    const [sharing, setSharing] = useState<string | null>(null);
    const [shared, setShared] = useState<Record<string, string>>({});
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [resolvedTitles, setResolvedTitles] = useState<Map<string, Title>>(new Map());
    useEffect(() => {
        let alive = true;
        const ids = [...new Set(lists.flatMap((list) => list.titleIds))].filter((id) => !getLocalTitle(id));
        if (ids.length === 0)
            return () => { alive = false; };
        void resolveTitleSnapshots(ids).then((map) => {
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
    }, [lists]);
    const create = () => {
        const trimmed = name.trim();
        if (!trimmed)
            return;
        const id = createList(trimmed);
        setName("");
        setNaming(false);
        setOpen(id);
    };
    const share = async (listId: string) => {
        const list = lists.find((l) => l.id === listId);
        if (!list)
            return;
        setSharing(listId);
        try {
            const slug = await publishList(list);
            if (slug) {
                const url = `${window.location.origin}/l/${slug}`;
                setShared((s) => ({ ...s, [listId]: url }));
                if (navigator.share) {
                    await navigator.share({ title: list.name, url }).catch(() => { });
                }
                else {
                    await navigator.clipboard?.writeText(url).catch(() => { });
                }
            }
        }
        finally {
            setSharing(null);
        }
    };
    const editing = open ? lists.find((l) => l.id === open) : null;
    if (editing) {
        return (<motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show">
        <motion.div variants={FADE_UP} className="sticky top-0 z-20 -mx-5 flex items-center gap-3 border-b border-line bg-bg/90 px-5 py-3 backdrop-blur-xl">
          <motion.button type="button" onClick={() => setOpen(null)} whileTap={{ scale: 0.92 }} transition={SPRING_SNAPPY} className="-ms-2 flex shrink-0 items-center gap-0.5 rounded-full py-1.5 pe-2.5 ps-1.5 text-sm font-semibold text-accent">
            <ChevronLeftIcon size={19} strokeWidth={2.4}/>
            {t("lists.back")}
          </motion.button>

          <span className="min-w-0 flex-1 truncate text-center text-sm font-bold">
            {editing.name}
          </span>

          <motion.button type="button" onClick={() => setOpen(null)} whileTap={{ scale: 0.94 }} transition={SPRING_SNAPPY} className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-bold text-[color:var(--color-on-accent)]">
            {t("lists.done")}
          </motion.button>
        </motion.div>

        <div className="mt-5">
          <ListBuilder listId={editing.id}/>
        </div>
      </motion.div>);
    }
    return (<motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show">
      <motion.div variants={FADE_UP} className="mt-1">
        <AnimatePresence mode="wait" initial={false}>
          {naming ? (<motion.div key="naming" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={SPRING_SNAPPY} className="flex gap-2">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => {
                if (e.key === "Enter")
                    create();
                if (e.key === "Escape")
                    setNaming(false);
            }} placeholder={t("lists.namePlaceholder")} className="flex-1 rounded-2xl border border-line bg-surface px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent"/>
              <motion.button type="button" onClick={create} whileTap={{ scale: 0.93 }} transition={SPRING_SNAPPY} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-[color:var(--color-on-accent)]" aria-label={t("lists.createAria")}>
                <CheckIcon size={18} strokeWidth={2.6}/>
              </motion.button>
            </motion.div>) : (<motion.button key="add" type="button" onClick={() => setNaming(true)} whileTap={{ scale: 0.97 }} transition={SPRING_SNAPPY} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-4 text-ink-faint transition-colors hover:text-ink-dim" aria-label={t("lists.newAria")}>
              <PlusIcon size={18} strokeWidth={2.4}/>
              
              <span className="text-sm font-semibold">{t("lists.create")}</span>
            </motion.button>)}
        </AnimatePresence>
      </motion.div>

      
      {lists.length === 0 && !naming && (<motion.div variants={FADE_UP} className="mt-14 flex flex-col items-center px-6 text-center">
          <StackIcon size={46} strokeWidth={1.3} className="text-ink-faint"/>
          <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-ink-faint">
            {t("lists.emptyTitle")}
          </p>
        </motion.div>)}

      <div className="mt-4 space-y-3">
        <AnimatePresence initial={false}>
          {lists.map((list) => {
            const covers = list.titleIds
                .map((id) => getLocalTitle(id) ?? resolvedTitles.get(id))
                .filter(Boolean)
                .slice(0, 5);
            const armed = confirmDelete === list.id;
            return (<motion.div key={list.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={SPRING_SNAPPY} className="overflow-hidden rounded-3xl border border-line bg-surface p-4">
                <motion.button type="button" onClick={() => setOpen(list.id)} whileTap={{ scale: 0.985 }} transition={SPRING_SNAPPY} className="flex w-full items-center gap-3 text-left">
                  <span className="flex -space-x-3">
                    {covers.length > 0 ? (covers.map((t) => (<span key={t!.id} className="block h-14 w-10 overflow-hidden rounded-lg border border-line">
                          <PosterArt title={t!} sizes="60px" className="h-full w-full"/>
                        </span>))) : (<>
                        {[0, 1, 2].map((i) => (<span key={i} className="block h-14 w-10 rounded-lg border border-dashed border-line"/>))}
                      </>)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{list.name}</span>
                    <span className="block text-xs tabular-nums text-ink-faint">
                      {list.titleIds.length}
                    </span>
                  </span>
                </motion.button>

                <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                  <motion.button type="button" whileTap={{ scale: 0.94 }} transition={SPRING_SNAPPY} disabled={list.titleIds.length === 0 || sharing === list.id} onClick={() => void share(list.id)} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-dim disabled:opacity-40">
                    <ShareIcon size={14}/>
                    {shared[list.id] ? t("lists.copied") : session ? t("lists.share") : t("lists.signInShare")}
                  </motion.button>

                  <motion.button type="button" whileTap={{ scale: 0.94 }} transition={SPRING_SNAPPY} onClick={() => setListHideOwner(list.id, !list.hideOwner)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${list.hideOwner
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-ink-faint"}`}>
                    {t("lists.anonymous")}
                  </motion.button>

                  
                  <motion.button type="button" whileTap={{ scale: 0.9 }} transition={SPRING_SNAPPY} onClick={() => {
                    if (armed)
                        deleteList(list.id);
                    else
                        setConfirmDelete(list.id);
                }} onBlur={() => setConfirmDelete(null)} animate={{
                    backgroundColor: armed ? "var(--color-danger)" : "rgba(0,0,0,0)",
                    color: armed ? "#fff" : "var(--color-ink-faint)",
                }} className="ms-auto grid h-8 w-8 place-items-center rounded-full" aria-label={armed ? t("lists.deleteConfirm") : t("lists.delete")}>
                    <TrashIcon size={15}/>
                  </motion.button>
                </div>
              </motion.div>);
        })}
        </AnimatePresence>
      </div>
    </motion.div>);
}
