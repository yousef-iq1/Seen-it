"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "@/lib/supabase/useAccount";
import { FADE_UP } from "@/lib/motion";
import { LoginIcon } from "./ui/Icons";
import { useT } from "@/lib/i18n";

export default function AccountPanel() {
    const t = useT();
    const { session, ready, enabled, busy, error, notice, sync, signInWithEmail, signUpWithEmail, signOut } = useAccount();
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

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
        {notice === "account_created" && (
          <p className="text-xs text-ink-faint">{t("account.created")}</p>
        )}
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

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!email.trim() || password.length < 8 || busy)
            return;
        if (mode === "signup")
            await signUpWithEmail(email, password);
        else
            await signInWithEmail(email, password);
    };

    return (<motion.div variants={FADE_UP} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 rounded-xl border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${mode === "signin" ? "bg-ink text-paper" : "text-ink-dim"}`}
        >
          {t("account.signIn")}
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${mode === "signup" ? "bg-ink text-paper" : "text-ink-dim"}`}
        >
          {t("account.create")}
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2.5">
        <label className="sr-only" htmlFor="account-email">{t("account.email")}</label>
        <input
          id="account-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("account.email")}
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink-dim"
        />
        <label className="sr-only" htmlFor="account-password">{t("account.password")}</label>
        <input
          id="account-password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t("account.password")}
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink-dim"
        />
        {mode === "signup" && (
          <p className="px-1 text-[11.5px] leading-relaxed text-ink-faint">{t("account.createHint")}</p>
        )}
        <button
          type="submit"
          disabled={busy || !email.trim() || password.length < 8}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-ink px-5 py-3.5 font-semibold text-paper transition-all active:scale-[0.98] disabled:opacity-40"
        >
          <LoginIcon size={17}/>
          {busy ? t("account.working") : mode === "signup" ? t("account.create") : t("account.signIn")}
        </button>
      </form>

      {error && (<p className="text-sm text-danger">{error}</p>)}
      <p className="flex items-center gap-2 text-xs text-ink-faint">
        {t("account.guest")}
      </p>
    </motion.div>);
}
