"use client";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { matchAll, readExport } from "@/lib/import/watchlist";
import { useSeenIt } from "@/lib/store";
import { useAccount } from "@/lib/supabase/useAccount";
import { getLocalCatalog, getLocalTitle, loadCatalog } from "@/lib/catalog";
import { FADE_UP, staggerContainer } from "@/lib/motion";
import type { SwipeAction, Title } from "@/lib/types";
export default function LabScreen() {
    const swipes = useSeenIt((s) => s.swipes);
    const swipeOrder = useSeenIt((s) => s.swipeOrder);
    const eraseAllUserData = useSeenIt((s) => s.eraseAllUserData);
    const { session, ready: accountReady } = useAccount();
    const [blocked, setBlocked] = useState(true);
    const [size, setSize] = useState(50);
    const [confirming, setConfirming] = useState(false);
    const [copied, setCopied] = useState(false);
    const actions = useMemo(() => swipeOrder
        .map((id) => swipes[id]?.action)
        .filter((a): a is SwipeAction => Boolean(a)), [swipeOrder, swipes]);
    const tally = (list: SwipeAction[]) => ({
        liked: list.filter((a) => a === "liked").length,
        seen: list.filter((a) => a === "seen").length,
        disliked: list.filter((a) => a === "disliked").length,
        skipped: list.filter((a) => a === "not_seen").length,
        total: list.length,
    });
    const overall = tally(actions);
    const blocks = useMemo(() => {
        const n = Math.max(1, Math.floor(size) || 1);
        const out: {
            from: number;
            to: number;
            done: boolean;
        }[] = [];
        for (let start = 0; start < actions.length; start += n) {
            out.push({
                from: start + 1,
                to: Math.min(start + n, actions.length),
                done: start + n <= actions.length,
            });
        }
        return out.map((b) => ({ ...b, ...tally(actions.slice(b.from - 1, b.to)) }));
    }, [actions, size]);
    const reset = () => {
        eraseAllUserData();
        setConfirming(false);
    };
    const report = blocked
        ? blocks
            .map((b) => `${b.from}-${b.to}${b.done ? "" : " (in progress)"}: liked ${b.liked}, seen ${b.seen}, skipped ${b.skipped}, disliked ${b.disliked}`)
            .join("\n")
        : `liked ${overall.liked}, seen ${overall.seen}, skipped ${overall.skipped}, disliked ${overall.disliked}, total ${overall.total}`;
    const copy = () => {
        void navigator.clipboard?.writeText(report);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };
    const exportSwipes = () => {
        const rows = swipeOrder
            .map((id) => swipes[id])
            .filter(Boolean)
            .map((sw) => ({ id: sw.titleId, a: sw.action, at: sw.at }));
        const blob = new Blob([JSON.stringify({ swipes: rows }, null, 0)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `seenit-swipes-${rows.length}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const fileInput = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState<string | null>(null);
    const importFile = async (file: File) => {
        setImporting("reading…");
        try {
            const text = await file.text();
            if (/\.csv$/i.test(file.name) || !text.trimStart().startsWith("{")) {
                const rows = readExport(text);
                if (rows.length === 0) {
                    setImporting("could not find a title column in that file");
                    return;
                }
                setImporting("loading the catalog…");
                await loadCatalog();
                const { matched, unmatched } = matchAll(rows, getLocalCatalog().map((c: {
                    title: Title;
                }) => c.title));
                const swipe = useSeenIt.getState().swipe;
                const already = useSeenIt.getState().swipes;
                let added = 0;
                for (let i = 0; i < matched.length; i++) {
                    const m = matched[i];
                    if (already[m.title.id])
                        continue;
                    swipe(m.title, m.action);
                    added++;
                    if (i % 200 === 0) {
                        setImporting(`${i} of ${matched.length}…`);
                        await new Promise((res) => setTimeout(res, 0));
                    }
                }
                setImporting(`added ${added} of ${rows.length} rows` +
                    (unmatched.length > 0 ? ` · ${unmatched.length} not in this catalog` : ""));
                return;
            }
            const parsed = JSON.parse(text);
            const raw = (Array.isArray(parsed) ? { swipes: parsed } : parsed) as {
                swipes?: {
                    id: string;
                    a: SwipeAction;
                }[];
                sample?: {
                    id: string;
                    seen: boolean;
                }[];
            };
            const rows: {
                id: string;
                a: SwipeAction;
            }[] = raw.swipes?.length
                ? raw.swipes
                : (raw.sample ?? []).map((r) => ({
                    id: r.id,
                    a: (r.seen ? "seen" : "not_seen") as SwipeAction,
                }));
            if (rows.length === 0) {
                setImporting("nothing in that file");
                return;
            }
            setImporting(`loading the catalog…`);
            await loadCatalog();
            const swipe = useSeenIt.getState().swipe;
            const already = useSeenIt.getState().swipes;
            let added = 0;
            let missing = 0;
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                if (already[r.id])
                    continue;
                const title = getLocalTitle(r.id);
                if (!title) {
                    missing++;
                    continue;
                }
                swipe(title, r.a);
                added++;
                if (i % 200 === 0) {
                    setImporting(`${i} of ${rows.length}…`);
                    await new Promise((res) => setTimeout(res, 0));
                }
            }
            setImporting(`restored ${added} of ${rows.length}` +
                (missing > 0 ? ` · ${missing} are not in this catalog` : ""));
        }
        catch {
            setImporting("could not read that file");
        }
    };
    if (!accountReady) {
        return (<div className="px-5 pt-10 text-sm text-ink-dim">
        Checking test mode…
      </div>);
    }
    if (session) {
        return (<div className="mx-auto max-w-md px-5 pt-10">
        <h1 className="text-2xl font-bold tracking-tight">Test bench</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-dim">
          Sign out before using the production test bench. Its reset tools are
          intentionally guest-only so a test cannot touch synced account data.
        </p>
      </div>);
    }
    return (<motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show" className="px-5 pb-24 pt-6">
      <motion.h1 variants={FADE_UP} className="text-2xl font-bold tracking-tight">
        Test bench
      </motion.h1>
      <motion.p variants={FADE_UP} className="mt-1 text-sm text-ink-dim">
        Temporary. Counts what you swipe so you only have to judge it.
      </motion.p>

      
      <motion.div variants={FADE_UP} className="mt-6 grid grid-cols-4 gap-2">
        {[
            ["Liked", overall.liked, "text-emerald-400"],
            ["Seen", overall.seen, "text-ink-dim"],
            ["Skipped", overall.skipped, "text-sky-400"],
            ["Disliked", overall.disliked, "text-rose-400"],
        ].map(([label, value, tone]) => (<div key={label as string} className="rounded-2xl border border-line bg-surface/60 px-3 py-4 text-center">
            <p className={`text-3xl font-bold tabular-nums ${tone as string}`}>
              {value as number}
            </p>
            <p className="mt-1 text-xs text-ink-dim">{label as string}</p>
          </div>))}
      </motion.div>
      <motion.p variants={FADE_UP} className="mt-2 text-center text-xs text-ink-faint">
        {overall.total} swipes in total
      </motion.p>

      
      <motion.div variants={FADE_UP} className="mt-6 rounded-2xl border border-line bg-surface/60 p-4">
        <div className="flex items-center gap-4 text-sm font-semibold">
          {([
            [false, "Running total"],
            [true, "In blocks"],
        ] as const).map(([value, label]) => (<button key={label} type="button" onClick={() => setBlocked(value)} className={blocked === value ? "text-accent" : "text-ink-faint hover:text-ink-dim"}>
              {label}
            </button>))}
        </div>

        {blocked && (<label className="mt-4 flex items-center gap-3 text-sm">
            <span className="text-ink-dim">Block size</span>
            <input type="number" min={1} max={500} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-24 rounded-xl border border-line bg-bg px-3 py-2 text-sm tabular-nums outline-none transition-colors focus:border-accent"/>
            <span className="text-xs text-ink-faint">
              a new block starts on its own
            </span>
          </label>)}
      </motion.div>

      
      {blocked && blocks.length > 0 && (<motion.div variants={FADE_UP} className="mt-4 overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-surface/80 text-xs text-ink-dim">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Swipes</th>
                <th className="px-2 py-2 text-right font-medium">Liked</th>
                <th className="px-2 py-2 text-right font-medium">Seen</th>
                <th className="px-2 py-2 text-right font-medium">Skipped</th>
                <th className="px-3 py-2 text-right font-medium">Disliked</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (<tr key={b.from} className={`border-t border-line ${b.done ? "" : "text-ink-dim"}`}>
                  <td className="px-3 py-2 text-left">
                    {b.from}–{b.to}
                    {!b.done && <span className="ml-1 text-xs">·</span>}
                  </td>
                  <td className="px-2 py-2 text-right text-emerald-400">{b.liked}</td>
                  <td className="px-2 py-2 text-right text-ink-dim">{b.seen}</td>
                  <td className="px-2 py-2 text-right text-sky-400">{b.skipped}</td>
                  <td className="px-3 py-2 text-right text-rose-400">{b.disliked}</td>
                </tr>))}
            </tbody>
          </table>
        </motion.div>)}

      
      <motion.div variants={FADE_UP} className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={copy} disabled={overall.total === 0} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-dim transition-colors hover:text-ink disabled:opacity-40">
          {copied ? "Copied" : "Copy the numbers"}
        </button>

        <button type="button" onClick={exportSwipes} disabled={overall.total === 0} className="rounded-full border border-accent/40 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-40">
          Export {overall.total} swipes
        </button>

        <input ref={fileInput} type="file" accept="application/json,.json,text/csv,.csv" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f)
                void importFile(f);
            e.target.value = "";
        }}/>
        <button type="button" onClick={() => fileInput.current?.click()} className="rounded-full border border-accent/40 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10">
          Import a file
        </button>

        {!confirming ? (<button type="button" onClick={() => setConfirming(true)} className="rounded-full border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/10">
            Reset everything
          </button>) : (<span className="flex items-center gap-2">
            <button type="button" onClick={reset} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white">
              Erase {overall.total} swipes
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-dim">
              Cancel
            </button>
          </span>)}
      </motion.div>

      {importing && (<motion.p variants={FADE_UP} className="mt-3 text-sm font-semibold tabular-nums text-accent">
          {importing}
        </motion.p>)}

      <motion.p variants={FADE_UP} className="mt-3 text-xs text-ink-faint">
        Import replays an exported file swipe by swipe, so the taste it rebuilds
        is identical to having done the work by hand. It skips anything already
        answered, so importing the same file twice changes nothing. Reset clears
        all local Seen It test data — swipes, lists, taste, settings and onboarding —
        and returns this guest browser to a fresh start.
      </motion.p>
    </motion.div>);
}
