"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BooksIcon, CardsIcon, SparklesIcon, UserIcon, UsersIcon } from "./ui/Icons";
import { PERSISTENCE_ERROR_EVENT } from "@/lib/store";
import { useT } from "@/lib/i18n";
const TABS = [
    { href: "/", key: "nav.swipe", Icon: CardsIcon },
    { href: "/discover", key: "nav.discover", Icon: SparklesIcon },
    { href: "/together", key: "nav.together", Icon: UsersIcon },
    { href: "/library", key: "nav.library", Icon: BooksIcon },
    { href: "/profile", key: "nav.you", Icon: UserIcon },
] as const;
export default function AppShell({ children }: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const t = useT();
    const [storageWarning, setStorageWarning] = useState(false);
    useEffect(() => {
        const onError = () => setStorageWarning(true);
        window.addEventListener(PERSISTENCE_ERROR_EVENT, onError);
        return () => window.removeEventListener(PERSISTENCE_ERROR_EVENT, onError);
    }, []);
    const isSharePage = pathname.startsWith("/l/") || pathname.startsWith("/u/");
    return (<div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
      <main className="flex-1">{children}</main>

      {storageWarning && (<div role="alert" className="fixed inset-x-3 top-[calc(12px+env(safe-area-inset-top))] z-[70] mx-auto max-w-md rounded-2xl border border-danger/30 bg-surface px-4 py-3 shadow-lg">
          <div className="flex items-start gap-3">
            <p className="flex-1 text-xs font-semibold leading-relaxed text-danger">
              {t("storage.warning")}
            </p>
            <button type="button" aria-label={t("common.close")} onClick={() => setStorageWarning(false)} className="shrink-0 text-sm font-bold text-ink-faint">
              ×
            </button>
          </div>
        </div>)}

      
      {!isSharePage && (<nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface">
          <div className="mx-auto flex max-w-5xl items-stretch justify-around">
            {TABS.map(({ href, key, Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (<Link key={href} href={href} style={{
                        WebkitTouchCallout: "none",
                        WebkitUserSelect: "none",
                        userSelect: "none",
                        touchAction: "manipulation",
                    }} className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold ${active ? "text-accent" : "text-ink-faint hover:text-ink-dim"}`}>
                  {active && (<motion.span layoutId="tab-indicator" className="absolute top-0 h-0.5 w-9 rounded-full bg-accent" transition={{ type: "spring", stiffness: 400, damping: 32 }}/>)}
                  <motion.span animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }} whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 420, damping: 24 }}>
                    <Icon size={20} strokeWidth={active ? 2.4 : 2}/>
                  </motion.span>
                  {t(key)}
                </Link>);
            })}
          </div>
          <div className="h-[env(safe-area-inset-bottom)]"/>
        </nav>)}
    </div>);
}
