"use client";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { SWIPE_UP_THRESHOLD, SWIPE_X_THRESHOLD } from "./SwipeCard";
import type { SwipeAction } from "@/lib/types";
const UP_TINT = "var(--color-skip)";
const LIKE_TINT = "var(--color-accent)";
const NOPE_TINT = "var(--color-danger)";
export default function ScreenFeedback({ x, y, upAction, }: {
    x: MotionValue<number>;
    y: MotionValue<number>;
    upAction?: SwipeAction;
}) {
    void upAction;
    const right = useTransform(x, [10, SWIPE_X_THRESHOLD], [0, 1], { clamp: false });
    const left = useTransform(x, [-10, -SWIPE_X_THRESHOLD], [0, 1], { clamp: false });
    const up = useTransform(() => {
        const dy = Math.max(0, (-y.get() - 16) / (SWIPE_UP_THRESHOLD - 16));
        const sideways = Math.min(1, Math.abs(x.get()) / SWIPE_X_THRESHOLD);
        return dy * (1 - sideways);
    });
    return (<div data-wash className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <Wash progress={right} tint={LIKE_TINT} at="102% 46%"/>
      <Wash progress={left} tint={NOPE_TINT} at="-2% 46%"/>
      <Wash progress={up} tint={UP_TINT} at="50% -2%"/>
    </div>);
}
function Wash({ progress, tint, at, }: {
    progress: MotionValue<number>;
    tint: string;
    at: string;
}) {
    const opacity = useTransform(progress, [0, 1, 1.6], [0, 0.84, 0.92], { clamp: true });
    const scale = useTransform(progress, [0, 1.6], [1.2, 1], { clamp: true });
    return (<motion.div className="absolute inset-0 will-change-[opacity,transform]" style={{
            opacity,
            scale,
            background: [
                "radial-gradient(115% 88% at 50% 50%, transparent 32%, rgb(var(--rgb-scrim) / 0.42) 100%)",
                `radial-gradient(96% 82% at ${at}, ${tint} 0%, ` +
                    `color-mix(in srgb, ${tint} 70%, transparent) 26%, ` +
                    `color-mix(in srgb, ${tint} 38%, transparent) 54%, ` +
                    `color-mix(in srgb, ${tint} 12%, transparent) 74%, transparent 88%)`,
                `linear-gradient(color-mix(in srgb, ${tint} 18%, transparent), ` +
                    `color-mix(in srgb, ${tint} 18%, transparent))`,
            ].join(", "),
        }}/>);
}
