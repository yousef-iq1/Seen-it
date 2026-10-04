"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { getLocalCatalog, loadCatalog } from "@/lib/catalog";
import { matchAll, readExport } from "@/lib/import/watchlist";
import { useSeenIt } from "@/lib/store";
import type { SwipeAction, Title } from "@/lib/types";
import { useT } from "@/lib/i18n";
export default function ImportLibrary({ compact = false, onDone, }: {
    compact?: boolean;
    onDone?: (added: number) => void;
}) {
    const t = useT();
    const input = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const run = async (file: File) => {
        setBusy(true);
        setStatus(t("importLibrary.reading"));
        try {
            const text = await file.text();
            const rows = readExport(text);
            if (rows.length === 0) {
                setStatus(t("importLibrary.empty"));
                return;
            }
            setStatus(t("importLibrary.matching"));
            let matched: {
                title: Title;
                action: SwipeAction;
            }[] = [];
            let unmatchedCount = 0;
            try {
                const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
                const res = await fetch(`${base}/api/import-match`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ rows }),
                });
                if (!res.ok)
                    throw new Error(`import ${res.status}`);
                const body = (await res.json()) as {
                    matched?: {
                        title: Title;
                        action: SwipeAction;
                    }[];
                    unmatchedCount?: number;
                };
                if (!Array.isArray(body.matched))
                    throw new Error("invalid import response");
                matched = body.matched;
                unmatchedCount = Number(body.unmatchedCount ?? 0);
            }
            catch {
                await loadCatalog();
                const catalog = getLocalCatalog().map((c: {
                    title: Title;
                }) => c.title);
                const local = matchAll(rows, catalog);
                matched = local.matched.map(({ title, action }) => ({ title, action }));
                unmatchedCount = local.unmatched.length;
            }
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
                    setStatus(t("importLibrary.progress", { current: i, total: matched.length }));
                    await new Promise((r) => setTimeout(r, 0));
                }
            }
            setStatus(unmatchedCount > 0
                ? t("importLibrary.resultUnmatched", { added, unmatched: unmatchedCount })
                : t("importLibrary.result", { added }));
            onDone?.(added);
        }
        catch {
            setStatus(t("importLibrary.failed"));
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className={compact ? "" : "mt-6"}>
      <input ref={input} type="file" accept="text/csv,.csv,application/json,.json" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f)
                void run(f);
            e.target.value = "";
        }}/>
      <motion.button type="button" whileTap={{ scale: 0.97 }} disabled={busy} onClick={() => input.current?.click()} className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-start transition-colors hover:border-ink-faint disabled:opacity-60">
        <span className="block text-sm font-bold text-ink-strong">
          {busy ? t("importLibrary.working") : t("importLibrary.prompt")}
        </span>
        <span className="mt-0.5 block text-xs text-ink-faint">
          {t("importLibrary.hint")}
        </span>
      </motion.button>
      {status && (<p className="mt-2 px-1 text-xs font-semibold text-ink-dim" role="status">
          {status}
        </p>)}
    </div>);
}
