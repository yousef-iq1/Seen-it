"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent } from "framer-motion";
import SwipeCard, { SWIPE_UP_THRESHOLD, SWIPE_X_THRESHOLD } from "./SwipeCard";
import SwipeBurst, { type BurstHandle } from "./SwipeBurst";
import ScreenFeedback from "./ScreenFeedback";
import TastePicker from "./TastePicker";
import WelcomeDemo, { demoAlreadyShown } from "./WelcomeDemo";
import { useDeck } from "@/lib/useDeck";
import { useSeenIt } from "@/lib/store";
import { NeuButton } from "./ui";
import { ArrowUpIcon, EyeIcon, HeartIcon, ThumbsDownIcon, UndoIcon, } from "./ui/Icons";
import { FADE_UP, SECTION, SPRING_SNAPPY, staggerContainer } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import type { SwipeAction } from "@/lib/types";
export default function SwipeDeck() {
    const t = useT();
    const answered = useSeenIt((s) => (s.onboardingSeen ? 0 : s.profile.totalSwipes));
    const onboardingSeen = useSeenIt((s) => s.onboardingSeen) || answered > 0;
    const setOnboardingSeen = useSeenIt((s) => s.setOnboardingSeen);
    const settings = useSeenIt((s) => s.settings);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const [exitOf, setExitOf] = useState<{
        id: string;
        action: SwipeAction;
    } | null>(null);
    const [picking, setPicking] = useState(() => !useSeenIt.getState().onboardingSeen &&
        useSeenIt.getState().profile.totalSwipes === 0 &&
        demoAlreadyShown());
    const [showDemo, setShowDemo] = useState<boolean | null>(null);
    const deckEnabled = onboardingSeen && !picking && showDemo === false;
    const { queue, hydrated, filled, swipeTop, undo, canUndo, refill } = useDeck(deckEnabled);
    const burstRef = useRef<BurstHandle>(null);
    const wasPast = useRef(false);
    const [live, setLive] = useState(false);
    const checkThreshold = useCallback(() => {
        const past = Math.abs(x.get()) > SWIPE_X_THRESHOLD || -y.get() > SWIPE_UP_THRESHOLD;
        if (past !== wasPast.current) {
            wasPast.current = past;
            if (past)
                haptic("tick", settings.haptics);
        }
    }, [x, y, settings.haptics]);
    useMotionValueEvent(x, "change", checkThreshold);
    useMotionValueEvent(y, "change", checkThreshold);
    const settleRef = useRef<ReturnType<typeof animate> | null>(null);
    const liveRef = useRef(false);
    const dragActive = useCallback((on: boolean) => {
        if (on) {
            settleRef.current?.stop();
            settleRef.current = null;
        }
        liveRef.current = on;
        setLive(on);
    }, []);
    const handleSwipe = useCallback((action: SwipeAction) => {
        const top = swipeTop(action);
        if (!top)
            return;
        wasPast.current = false;
        haptic("commit", settings.haptics);
        setExitOf({ id: top.id, action });
        burstRef.current?.fire(action);
        if (liveRef.current) {
            const ease: [
                number,
                number,
                number,
                number
            ] = [0.7, 0, 0.85, 1];
            settleRef.current?.stop();
            void animate(y, 0, { duration: 0.46, ease });
            settleRef.current = animate(x, 0, { duration: 0.46, ease });
            void settleRef.current.then(() => {
                settleRef.current = null;
                liveRef.current = false;
                setLive(false);
            });
        }
    }, [swipeTop, settings.haptics, x, y]);
    const buttonPending = useRef(false);
    const trigger = useCallback((action: SwipeAction) => {
        if (buttonPending.current)
            return;
        const top = queue[0];
        if (!top)
            return;
        buttonPending.current = true;
        setExitOf({ id: top.id, action });
        requestAnimationFrame(() => {
            handleSwipe(action);
            requestAnimationFrame(() => {
                buttonPending.current = false;
            });
        });
    }, [handleSwipe, queue]);
    const takeBack = useCallback(() => {
        haptic("undo", settings.haptics);
        undo();
    }, [undo, settings.haptics]);
    const deckVisible = onboardingSeen && !picking;
    useEffect(() => {
        if (!deckVisible)
            return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [deckVisible]);
    const warmed = useRef(new Set<string>());
    useEffect(() => {
        if (typeof Image === "undefined")
            return;
        for (const t of queue.slice(0, 5)) {
            if (!t.posterPath || warmed.current.has(t.posterPath))
                continue;
            warmed.current.add(t.posterPath);
            const img = new Image();
            img.decoding = "async";
            img.src = `https://image.tmdb.org/t/p/w500${t.posterPath}`;
        }
    }, [queue]);
    useEffect(() => {
        const state = useSeenIt.getState();
        const shouldDemo = state.profile.totalSwipes === 0 && !demoAlreadyShown();
        setShowDemo(shouldDemo);
        if (!shouldDemo && !state.onboardingSeen && state.profile.totalSwipes === 0) {
            setPicking(true);
        }
    }, []);
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;
            if (e.key === "ArrowRight")
                trigger("liked");
            else if (e.key === "ArrowLeft")
                trigger("disliked");
            else if (e.key === "ArrowDown")
                trigger("seen");
            else if (e.key === "ArrowUp") {
                e.preventDefault();
                trigger(settings.swipeUp);
            }
            else if (e.key === "z" || e.key === "Backspace")
                takeBack();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [trigger, takeBack, settings.swipeUp]);
    if (showDemo) {
        return (<WelcomeDemo onDone={() => {
                setShowDemo(false);
                if (!onboardingSeen)
                    setPicking(true);
            }}/>);
    }
    if (picking) {
        return (<TastePicker onDone={() => {
                setOnboardingSeen();
                setPicking(false);
            }}/>);
    }
    if ((!hydrated && queue.length === 0) || showDemo === null) {
        return (<div className="mx-auto flex w-full max-w-md flex-col items-center overflow-hidden px-4 pt-4" style={{ height: "calc(100dvh - 74px - env(safe-area-inset-bottom))" }}>
        <div className="mb-2 h-9 w-28 shrink-0 self-start rounded-lg bg-surface-2"/>
        <div className="relative min-h-0 w-full flex-1">
          <div className="relative mx-auto h-full w-fit">
            <motion.div className="soft-card h-full max-w-[80vw] overflow-hidden" style={{ aspectRatio: "10 / 14.6" }} animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
              <div className="h-full w-full bg-gradient-to-br from-surface-2 to-line"/>
            </motion.div>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-center gap-4 py-3">
          {[64, 46, 64].map((size, i) => (<motion.div key={i} className="rounded-full bg-surface-2" style={{ width: size, height: size }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.12,
                }}/>))}
        </div>
      </div>);
    }
    if (!onboardingSeen) {
        return (<TastePicker onDone={() => {
                setOnboardingSeen();
                setPicking(false);
            }}/>);
    }
    return (<div className="swipe-stage relative mx-auto flex w-full max-w-md flex-col items-center overflow-hidden px-4 pt-4" style={{ height: "calc(100dvh - 74px - env(safe-area-inset-bottom))" }}>
      {live && settings.screenFeedback && (<ScreenFeedback x={x} y={y} upAction={settings.swipeUp}/>)}
      <SwipeBurst ref={burstRef}/>

      
      <motion.div variants={FADE_UP} initial="hidden" animate="show" className="relative z-10 mb-2 flex w-full shrink-0 items-center">
        <h1 className="text-[26px] font-bold tracking-[-0.03em]">Seen It</h1>
      </motion.div>

      
      <div className="relative z-10 min-h-0 w-full flex-1">
        <div className="relative mx-auto h-full w-fit">
          <div className="relative h-full max-w-[80vw]" style={{ aspectRatio: "10 / 14.6" }}>
            <AnimatePresence>
              
              {hydrated && filled && queue.length === 0 && (<motion.div key="empty" variants={SECTION} initial="hidden" animate="show" exit="exit" className="soft-card absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  
                  <div className="flex items-end gap-2">
                    {[0, 1, 2].map((i) => (<motion.span key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_SNAPPY, delay: i * 0.07 }} className="block rounded-xl border border-dashed border-line" style={{ width: 34, height: i === 1 ? 62 : 50 }}/>))}
                  </div>
                  <motion.div whileTap={{ scale: 0.95 }} className="mt-7">
                    <NeuButton onClick={() => {
                refill();
            }} className="text-sm">
                      {t("swipe.reset")}
                    </NeuButton>
                  </motion.div>
                </motion.div>)}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {queue.slice(0, 3).map((title, i) => (<SwipeCard key={title.id} title={title} index={i} onSwipe={handleSwipe} forcedExit={exitOf?.id === title.id ? exitOf.action : null} upAction={settings.swipeUp} onDragActive={i === 0 ? dragActive : undefined} x={x} y={y}/>))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      
      <motion.div variants={staggerContainer(0.05, 0.12)} initial="hidden" animate="show" className="relative z-10 flex shrink-0 items-center justify-center gap-4 py-3" dir="ltr">
        <DeckAction label={t("swipe.disliked")} tint="var(--color-danger)" size={64} onPress={() => trigger("disliked")}>
          <ThumbsDownIcon size={27} strokeWidth={1.9}/>
        </DeckAction>

        <DeckAction label={t("swipe.undo")} tint="var(--color-ink-dim)" size={46} disabled={!canUndo} onPress={takeBack}>
          <UndoIcon size={18} strokeWidth={2}/>
        </DeckAction>

        
        {settings.showSeenButton && (<DeckAction label={settings.swipeUp === "seen" ? t("swipe.notSeen") : t("swipe.seen")} tint={settings.swipeUp === "seen" ? "var(--color-skip)" : "var(--color-ink-strong)"} size={46} onPress={() => trigger(settings.swipeUp === "seen" ? "not_seen" : "seen")}>
            {settings.swipeUp === "seen" ? (<ArrowUpIcon size={19} strokeWidth={2}/>) : (<EyeIcon size={19} strokeWidth={1.9}/>)}
          </DeckAction>)}

        
        <DeckAction label={settings.swipeUp === "seen" ? t("swipe.seen") : t("swipe.notSeen")} tint={settings.swipeUp === "seen" ? "var(--color-ink-strong)" : "var(--color-skip)"} size={46} onPress={() => trigger(settings.swipeUp)}>
          {settings.swipeUp === "seen" ? (<EyeIcon size={19} strokeWidth={1.9}/>) : (<ArrowUpIcon size={19} strokeWidth={2}/>)}
        </DeckAction>

        <DeckAction label={t("swipe.liked")} tint="var(--color-accent)" size={64} onPress={() => trigger("liked")}>
          <HeartIcon size={27} filled/>
        </DeckAction>
      </motion.div>
    </div>);
}
function DeckAction({ label, tint, size, disabled, onPress, children, }: {
    label: string;
    tint: string;
    size: number;
    disabled?: boolean;
    onPress: () => void;
    children: React.ReactNode;
}) {
    const [pressed, setPressed] = useState(false);
    const release = () => setPressed(false);
    return (<motion.button type="button" variants={FADE_UP} aria-label={label} title={label} disabled={disabled} onClick={onPress} onPointerDown={disabled ? undefined : () => setPressed(true)} onPointerUp={release} onPointerCancel={release} onPointerLeave={release} onBlur={release} data-pressed={pressed && !disabled ? "" : undefined} whileTap={disabled ? undefined : { scale: 0.88 }} transition={SPRING_SNAPPY} style={{ width: size, height: size, ["--tint" as string]: tint }} className="deck-action">
      {children}
    </motion.button>);
}
