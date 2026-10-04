"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import AccountPanel from "./AccountPanel";
import { ChevronRightIcon, HeartIcon, ShieldIcon, SlidersIcon, StackIcon } from "./ui/Icons";
import { useAccount } from "@/lib/supabase/useAccount";
import { pushPublicProfile } from "@/lib/supabase/sync";
import { useSeenIt } from "@/lib/store";
import { EASE_OUT, FADE_UP, SPRING_SNAPPY, staggerContainer } from "@/lib/motion";
import { useT } from "@/lib/i18n";
export default function ProfilePanel() {
    const t = useT();
    const { session } = useAccount();
    const profile = useSeenIt((s) => s.publicProfile);
    const setProfile = useSeenIt((s) => s.setPublicProfile);
    const swipes = useSeenIt((s) => s.swipes);
    const lists = useSeenIt((s) => s.lists);
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    useEffect(() => {
        setName(profile.name || (session?.user.user_metadata?.full_name as string) || "");
        setBio(profile.bio || "");
    }, [profile.name, profile.bio, session]);
    const avatar = profile.avatarUrl || (session?.user.user_metadata?.avatar_url as string | undefined);
    const stats = useMemo(() => {
        let watched = 0;
        let loved = 0;
        for (const sw of Object.values(swipes)) {
            if (sw.action === "not_seen")
                continue;
            watched += 1;
            if (sw.action === "liked")
                loved += 1;
        }
        return { watched, loved, lists: lists.length };
    }, [swipes, lists]);
    const shownName = profile.name ||
        (session?.user.user_metadata?.full_name as string | undefined) ||
        t("profile.fallbackName");
    const dirty = name !== profile.name || bio !== profile.bio;
    return (<motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show" className="mx-auto max-w-md px-5 pb-28 pt-6">
      
      <motion.div variants={FADE_UP} className="soft-card overflow-hidden">
        <div className="h-[86px] w-full" style={{
            background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-soft) 100%)",
        }}/>
        <div className="px-5 pb-5">
          <div className="-mt-11 grid h-[88px] w-[88px] place-items-center overflow-hidden rounded-full border-4 border-[color:var(--color-surface)] bg-surface-2 text-3xl font-bold text-ink-faint">
            {avatar ? (<img src={avatar} alt="" className="h-full w-full object-cover"/>) : (shownName.trim().charAt(0).toUpperCase())}
          </div>

          <h1 className="mt-3 truncate text-[22px] font-bold tracking-tight">{shownName}</h1>
          {profile.bio && (<p className="mt-1 text-[13px] leading-relaxed text-ink-dim">{profile.bio}</p>)}

          {session && (<button type="button" onClick={() => setEditing((v) => !v)} className="mt-3 rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink-dim transition-colors hover:text-ink active:scale-95">
              {editing ? t("profile.close") : t("profile.edit")}
            </button>)}
        </div>
      </motion.div>

      
      <motion.div variants={FADE_UP} className="mt-3 grid grid-cols-3 gap-3">
        <Stat value={stats.watched} label={t("profile.watched")}/>
        <Stat value={stats.loved} label={t("profile.loved")} icon={<HeartIcon size={12} filled/>}/>
        <Stat value={stats.lists} label={t("profile.lists")} icon={<StackIcon size={12}/>}/>
      </motion.div>

      
      <AnimatePresence initial={false}>
        {session && editing && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.26, ease: EASE_OUT }} className="overflow-hidden">
            <div className="mt-3 flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  {t("profile.displayName")}
                </span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="rounded-2xl border border-line bg-bg px-4 py-3 outline-none transition-colors focus:border-accent"/>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  {t("profile.bio")}
                </span>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={160} className="resize-none rounded-2xl border border-line bg-bg px-4 py-3 outline-none transition-colors focus:border-accent"/>
              </label>

              <motion.button type="button" disabled={!dirty || saving} onClick={() => {
                if (!session || saving)
                    return;
                const next = {
                    name: name.trim(),
                    bio: bio.trim(),
                    avatarUrl: avatar ?? "",
                };
                setSaving(true);
                setSaveError(null);
                void pushPublicProfile(session.user.id, next)
                    .then(() => {
                    setProfile(next);
                    setEditing(false);
                })
                    .catch((e: unknown) => {
                    setSaveError(e instanceof Error ? e.message : t("profile.saveError"));
                })
                    .finally(() => setSaving(false));
            }} animate={{ opacity: dirty && !saving ? 1 : 0.4 }} whileTap={dirty ? { scale: 0.97 } : undefined} transition={SPRING_SNAPPY} className="rounded-2xl bg-accent px-5 py-3 font-semibold text-[color:var(--color-on-accent)]">
                {saving ? t("profile.saving") : t("profile.save")}
              </motion.button>
              {saveError && (<p role="alert" className="text-xs leading-snug text-danger">
                  {saveError}
                </p>)}
            </div>
          </motion.div>)}
      </AnimatePresence>

      
      <motion.div variants={FADE_UP} className="mt-3 rounded-3xl border border-line bg-surface p-4">
        <AccountPanel />
      </motion.div>

      
      <motion.div variants={FADE_UP} className="mt-3 overflow-hidden rounded-3xl border border-line bg-surface">
        <Row href="/settings" icon={<SlidersIcon size={18}/>} label={t("profile.settings")}/>
        <Row href="/legal" icon={<ShieldIcon size={18}/>} label={t("profile.privacy")} last/>
      </motion.div>
    </motion.div>);
}
function Stat({ value, label, icon, }: {
    value: number;
    label: string;
    icon?: React.ReactNode;
}) {
    return (<div className="rounded-2xl border border-line bg-surface px-3 py-3.5 text-center">
      <div className="text-[22px] font-bold tabular-nums leading-none tracking-tight">
        {value}
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">
        {icon}
        {label}
      </div>
    </div>);
}
function Row({ href, icon, label, last, }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    last?: boolean;
}) {
    return (<Link href={href} className={`flex items-center gap-3 px-4 py-4 transition-colors active:bg-surface-2 ${last ? "" : "border-b border-line"}`}>
      <span className="text-ink-faint">{icon}</span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <ChevronRightIcon size={17} className="text-ink-faint"/>
    </Link>);
}
