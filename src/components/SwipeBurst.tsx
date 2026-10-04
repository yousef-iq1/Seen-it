"use client";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpIcon, EyeIcon, HeartIcon, ThumbsDownIcon } from "./ui/Icons";
import { EASE_OUT } from "@/lib/motion";
import type { SwipeAction } from "@/lib/types";
const ORIGIN: Record<SwipeAction, {
    x: string;
    y: string;
}> = {
    liked: { x: "82%", y: "48%" },
    disliked: { x: "18%", y: "48%" },
    not_seen: { x: "50%", y: "22%" },
    seen: { x: "50%", y: "50%" },
};
const TINT: Record<SwipeAction, string> = {
    liked: "var(--color-accent)",
    disliked: "var(--color-danger)",
    not_seen: "var(--color-skip)",
    seen: "var(--color-ink-strong)",
};
const GLYPH = {
    liked: HeartIcon,
    disliked: ThumbsDownIcon,
    not_seen: ArrowUpIcon,
    seen: EyeIcon,
} as const;
const DUR = 0.3;
export interface BurstHandle {
    fire: (action: SwipeAction) => void;
}
const SwipeBurst = forwardRef<BurstHandle>(function SwipeBurst(_props, ref) {
    const [burst, setBurst] = useState<{
        id: number;
        action: SwipeAction;
    } | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useImperativeHandle(ref, () => ({
        fire(action: SwipeAction) {
            const id = Date.now();
            setBurst({ id, action });
            if (timer.current)
                clearTimeout(timer.current);
            timer.current = setTimeout(() => setBurst((b) => (b && b.id === id ? null : b)), (DUR + 0.16) * 1000);
        },
    }));
    if (!burst)
        return null;
    const Icon = GLYPH[burst.action];
    const tint = TINT[burst.action];
    const origin = ORIGIN[burst.action];
    return (<div key={burst.id} className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      
      <motion.div className="absolute inset-0 grid place-items-center will-change-[opacity,transform]" style={{
            color: tint,
            background: `radial-gradient(95% 80% at ${origin.x} ${origin.y}, ` +
                `color-mix(in srgb, ${tint} 42%, transparent) 0%, transparent 68%)`,
        }} initial={{ opacity: 1, scale: 0.94 }} animate={{ opacity: 0, scale: 1.04 }} transition={{ duration: DUR, ease: EASE_OUT }}>
        
        <motion.span className="relative grid h-[190px] w-[190px] place-items-center will-change-transform" initial={{ scale: 0.84 }} animate={{ scale: 1.08 }} transition={{ duration: DUR, ease: EASE_OUT }}>
          <span className="absolute inset-0 rounded-full" style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${tint} 60%, transparent) 0%, transparent 66%)`,
        }}/>
          <span className="relative">
            <Icon size={104} filled strokeWidth={1.6}/>
          </span>
        </motion.span>
      </motion.div>

      
      <motion.span className="absolute rounded-full will-change-[opacity,transform]" style={{
            left: origin.x,
            top: origin.y,
            width: 44,
            height: 44,
            marginLeft: -22,
            marginTop: -22,
            border: `2.5px solid ${tint}`,
        }} initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 13, opacity: 0 }} transition={{ duration: DUR + 0.08, ease: EASE_OUT }}/>
    </div>);
});
export default SwipeBurst;
