"use client";
import { motion } from "framer-motion";
import { useAccount } from "@/lib/supabase/useAccount";
import { FADE_UP } from "@/lib/motion";
import { GoogleIcon, LoginIcon } from "./ui/Icons";
import { useT } from "@/lib/i18n";
export default function AccountPanel() {
    const t = useT();
    const { session, ready, enabled, busy, error, sync, signInWithGoogle, signOut } = useAccount();
    if (!enabled) {
        return (<motion.p variants={FADE_UP} className="text-sm text-ink-faint">
        {t("account.notConfigured")}
      </motion.p>);
    }
    if (!ready) {
        return <div className="h-[52px]" aria-hidden/>;
    }
    if (session) {
        const name = (session.user.user_metadata?.full_name as string | undefined) ??
            session.user.email ??
            t("account.signedIn");
        const failing = sync !== "idle" && sync !== "ok" && sync !== "working";
        return (<motion.div variants={FADE_UP} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-xs text-ink-faint">{session.user.email}</p>
          </div>
          <button type="button" onClick={signOut} disabled={busy} className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-dim transition-colors hover:text-ink disabled:opacity-40">
            {t("account.signOut")}
          </button>
        </div>
        {failing && (<div className="rounded-2xl border border-danger/30 bg-danger/[0.06] px-4 py-3">
            <p className="text-[13px] font-semibold text-danger">
              {t("account.syncProblem")}
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-dim">
              {t("account.syncProblemBody", { error: String(sync) })}
            </p>
          </div>)}
      </motion.div>);
    }
    return (<motion.div variants={FADE_UP} className="flex flex-col gap-3">
      <button type="button" onClick={signInWithGoogle} disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-5 py-3.5 font-semibold text-ink shadow-[0_2px_10px_rgb(var(--rgb-shadow)/0.06)] transition-all hover:shadow-[0_6px_18px_rgb(var(--rgb-shadow)/0.1)] active:scale-[0.98] disabled:opacity-50">
        <GoogleIcon size={19}/>
        {t("account.continueGoogle")}
      </button>
      {error && (<p className="text-sm text-danger">{error}</p>)}
      <p className="flex items-center gap-2 text-xs text-ink-faint">
        <LoginIcon size={14}/>
        {t("account.guest")}
      </p>
    </motion.div>);
}
