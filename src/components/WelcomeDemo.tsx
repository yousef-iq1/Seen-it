"use client";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import ScreenFeedback from "./ScreenFeedback";
import { ArrowUpIcon, HeartIcon, ThumbsDownIcon, UndoIcon } from "./ui/Icons";
import { EASE_OUT, SPRING_SETTLE } from "@/lib/motion";
import { useT } from "@/lib/i18n";
let shownThisLoad = false;
export function demoAlreadyShown(): boolean {
    return shownThisLoad;
}
type DemoAction = "liked" | "disliked" | "not_seen";
const WELCOME_CARDS = [
    {
        id: "w-right",
        lineKey: "welcome.right",
        noteKey: "welcome.rightNote",
        from: "var(--color-accent)",
        action: "liked" as const,
    },
    {
        id: "w-left",
        lineKey: "welcome.left",
        noteKey: "welcome.leftNote",
        from: "var(--color-danger)",
        action: "disliked" as const,
    },
    {
        id: "w-up",
        lineKey: "welcome.up",
        noteKey: "welcome.upNote",
        from: "var(--color-skip)",
        action: "not_seen" as const,
    },
] as const;
const MOVES = [
    { dragX: 104, dragY: -8, exitX: 620, exitY: -70 },
    { dragX: -104, dragY: -8, exitX: -620, exitY: -70 },
    { dragX: 0, dragY: -112, exitX: 0, exitY: -820 },
] as const;
export default function WelcomeDemo({ onDone }: {
    onDone: () => void;
}) {
    const t = useT();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-260, 0, 260], [-16, 0, 16]);
    const [stage, setStage] = useState<"name" | "demo">("name");
    const [face, setFace] = useState(0);
    const [activeAction, setActiveAction] = useState<DemoAction | null>(null);
    const [frontVisible, setFrontVisible] = useState(true);
    const done = useRef(false);
    const finish = useRef(onDone);
    finish.current = onDone;
    useEffect(() => {
        shownThisLoad = true;
        let cancelled = false;
        const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
        (async () => {
            await wait(1050);
            if (cancelled)
                return;
            setStage("demo");
            await wait(430);
            for (let i = 0; i < WELCOME_CARDS.length; i++) {
                if (cancelled)
                    return;
                const card = WELCOME_CARDS[i];
                const move = MOVES[i];
                setFace(i);
                x.set(0);
                y.set(0);
                setFrontVisible(true);
                setActiveAction(null);
                await wait(i === 0 ? 360 : 220);
                setActiveAction(card.action);
                await Promise.all([
                    animate(x, move.dragX, SPRING_SETTLE).finished,
                    animate(y, move.dragY, SPRING_SETTLE).finished,
                ]);
                if (cancelled)
                    return;
                await wait(120);
                await Promise.all([
                    animate(x, move.exitX, { duration: 0.31, ease: EASE_OUT }).finished,
                    animate(y, move.exitY, { duration: 0.31, ease: EASE_OUT }).finished,
                ]);
                if (cancelled)
                    return;
                setFrontVisible(false);
                setActiveAction(null);
                await wait(90);
            }
            if (!cancelled && !done.current) {
                done.current = true;
                finish.current();
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [x, y]);
    const skip = () => {
        if (done.current)
            return;
        done.current = true;
        finish.current();
    };
    return (<div className="swipe-stage relative mx-auto flex w-full max-w-md flex-col items-center overflow-hidden px-4 pt-4" style={{ height: "calc(100dvh - 74px - env(safe-area-inset-bottom))" }} onPointerDown={skip}>
      {stage === "demo" && <ScreenFeedback x={x} y={y}/>}

      <motion.div className="pointer-events-none absolute inset-0 z-20 grid place-items-center" animate={{ opacity: stage === "name" ? 1 : 0, y: stage === "name" ? 0 : -22 }} transition={{ duration: 0.42, ease: EASE_OUT }}>
        <motion.div className="relative overflow-hidden px-2" initial={{ opacity: 0, y: 18, scale: 1.055 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.82, ease: [0.16, 0.9, 0.24, 1] }}>
          <motion.h1 className="bg-clip-text text-[54px] font-bold tracking-[-0.045em] text-transparent" style={{
            backgroundImage: "linear-gradient(100deg, var(--color-ink) 38%, rgb(var(--rgb-accent) / 0.88) 50%, var(--color-ink) 62%)",
            backgroundSize: "320% 100%",
        }} initial={{ backgroundPositionX: "100%" }} animate={{ backgroundPositionX: "0%" }} transition={{ duration: 0.95, delay: 0.22, ease: [0.4, 0, 0.2, 1] }}>
            Seen It
          </motion.h1>
        </motion.div>
      </motion.div>

      <motion.h1 className="relative z-10 mb-2 shrink-0 self-start text-[26px] font-bold tracking-[-0.03em]" initial={{ opacity: 0 }} animate={{ opacity: stage === "demo" ? 1 : 0 }} transition={{ duration: 0.32, ease: EASE_OUT }}>
        Seen It
      </motion.h1>

      <div className="relative z-10 min-h-0 w-full flex-1">
        <div className="relative mx-auto h-full w-fit">
          <div className="relative h-full max-w-[80vw]" style={{ aspectRatio: "10 / 14.6" }}>
            {[WELCOME_CARDS[(face + 1) % 3], WELCOME_CARDS[(face + 2) % 3]].map((card, i) => (<motion.div key={card.id} className="soft-card absolute inset-0 overflow-hidden" animate={{
                opacity: stage === "demo" ? 1 : 0,
                y: (i + 1) * 12,
                scale: 1 - (i + 1) * 0.05,
            }} transition={{ duration: 0.28, ease: EASE_OUT }} style={{ zIndex: 10 - i }}>
                <WelcomeFace card={card}/>
                <div className="pointer-events-none absolute inset-0 bg-black/[0.06]" aria-hidden/>
              </motion.div>))}

            <motion.div className="absolute inset-0 z-20" style={{ x, y, rotate }} initial={{ opacity: 0, scale: 0.97 }} animate={{
            opacity: stage === "demo" && frontVisible ? 1 : 0,
            scale: stage === "demo" ? 1 : 0.97,
        }} transition={{ duration: 0.2, ease: EASE_OUT }}>
              <div className="soft-card relative h-full w-full overflow-hidden border border-line">
                <WelcomeFace card={WELCOME_CARDS[face]}/>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 items-center justify-center gap-4 py-3" aria-hidden dir="ltr">
        <DemoButton size={64} tint="var(--color-danger)" active={activeAction === "disliked"}>
          <ThumbsDownIcon size={27} strokeWidth={1.9}/>
        </DemoButton>
        <DemoButton size={46} tint="var(--color-ink-dim)" disabled>
          <UndoIcon size={18} strokeWidth={2}/>
        </DemoButton>
        <DemoButton size={46} tint="var(--color-skip)" active={activeAction === "not_seen"}>
          <ArrowUpIcon size={19} strokeWidth={2}/>
        </DemoButton>
        <DemoButton size={64} tint="var(--color-accent)" active={activeAction === "liked"}>
          <HeartIcon size={27} filled/>
        </DemoButton>
      </div>
    </div>);
}
function DemoButton({ size, tint, active = false, disabled = false, children, }: {
    size: number;
    tint: string;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (<motion.div className="deck-action pointer-events-none" data-pressed={active && !disabled ? "" : undefined} animate={{
            opacity: disabled ? 0.35 : 1,
            scale: active ? 1.055 : 1,
        }} transition={{ type: "spring", stiffness: 420, damping: 31, mass: 0.65 }} style={{ width: size, height: size, ["--tint" as string]: tint }}>
      {children}
    </motion.div>);
}
function WelcomeFace({ card }: {
    card: (typeof WELCOME_CARDS)[number];
}) {
    const t = useT();
    return (<div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-7 text-center" style={{
            background: "linear-gradient(155deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
        }}>
      <div className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full opacity-[0.13]" style={{
            background: `radial-gradient(circle, ${card.from} 0%, transparent 68%)`,
        }} aria-hidden/>
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-full border" style={{
            color: card.from,
            borderColor: `color-mix(in srgb, ${card.from} 28%, var(--color-line))`,
            background: `color-mix(in srgb, ${card.from} 8%, var(--color-surface))`,
        }}>
        {card.action === "liked" ? (<HeartIcon size={21} filled/>) : card.action === "disliked" ? (<ThumbsDownIcon size={21}/>) : (<ArrowUpIcon size={21}/>)}
      </div>
      <span className="text-[27px] font-bold leading-tight tracking-[-0.03em] text-ink">
        {t(card.lineKey)}
      </span>
      <span className="mt-2 max-w-[15rem] text-[13.5px] font-medium leading-relaxed text-ink-dim">
        {t(card.noteKey)}
      </span>
      <span className="absolute inset-x-10 bottom-7 h-px" style={{
            background: `linear-gradient(90deg, transparent, ${card.from}, transparent)`,
            opacity: 0.35,
        }} aria-hidden/>
    </div>);
}
