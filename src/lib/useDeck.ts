"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLocalItem } from "@/lib/catalog";
import { rank, warmRanker } from "@/lib/engine/rank-client";
import { STARTER_PACK } from "@/lib/data/starter-pack";
import { COLD_START_TARGET, isCalibrating } from "@/lib/engine/taste";
import { useSeenIt } from "@/lib/store";
import type { SwipeAction, Title } from "@/lib/types";
const QUEUE_AHEAD = 6;
const BATCH = 26;
const RESERVE = 24;
const REFILL_AT = 16;
function answeredIds(): Set<string> {
    return new Set(Object.keys(useSeenIt.getState().swipes));
}
async function computeLocalBatch(): Promise<Title[]> {
    const state = useSeenIt.getState();
    const exclude = new Set<string>(Object.keys(state.swipes));
    const likedIds = Object.values(state.swipes)
        .filter((s) => s.action === "liked")
        .map((s) => s.titleId);
    const dislikedIds = Object.values(state.swipes)
        .filter((s) => s.action === "disliked")
        .map((s) => s.titleId);
    const seenIds = Object.values(state.swipes)
        .filter((s) => s.action === "seen")
        .map((s) => s.titleId);
    const { titles } = await rank({
        mode: "swipe",
        profile: state.profile,
        excludeIds: exclude,
        count: BATCH,
        seed: state.seed,
        likedIds,
        dislikedIds,
        seenIds,
        homeLanguages: homeLanguages(state.settings.locale),
        reach: state.settings.reach,
    });
    return titles;
}
function homeLanguages(preference: "auto" | "ar" | "en"): string[] {
    const out: string[] = [];
    if (preference === "ar" || preference === "en")
        out.push(preference);
    if (typeof navigator === "undefined")
        return out;
    const raw = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of raw ?? []) {
        const base = String(tag).toLowerCase().split("-")[0];
        if (base && !out.includes(base))
            out.push(base);
    }
    return out.slice(0, 3);
}
function whenIdle(fn: () => void): () => void {
    if (typeof window === "undefined") {
        fn();
        return () => { };
    }
    const ric = window.requestIdleCallback;
    if (typeof ric === "function") {
        const id = ric(() => fn(), { timeout: 120 });
        return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(fn, 32);
    return () => window.clearTimeout(id);
}
export function useDeck(enabled = true) {
    const swipes = useSeenIt((s) => s.swipes);
    const profile = useSeenIt((s) => s.profile);
    const doSwipe = useSeenIt((s) => s.swipe);
    const doUndo = useSeenIt((s) => s.undo);
    const [queue, setQueue] = useState<Title[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [filled, setFilled] = useState(false);
    const hydratedRef = useRef(false);
    const queueRef = useRef<Title[]>([]);
    queueRef.current = queue;
    const cancelPending = useRef<(() => void) | null>(null);
    const calibrating = isCalibrating(profile);
    const ratedSwipes = profile.ratedSwipes;
    const rebuild = useCallback(() => {
        const install = (fresh: Title[]) => {
            const done = answeredIds();
            const next = queueRef.current.filter((t) => !done.has(t.id)).slice(0, 1);
            const taken = new Set(next.map((t) => t.id));
            for (const t of fresh) {
                if (done.has(t.id) || taken.has(t.id))
                    continue;
                taken.add(t.id);
                next.push(t);
                if (next.length >= RESERVE)
                    break;
            }
            setQueue(next);
            queueRef.current = next;
            if (hydratedRef.current)
                setFilled(true);
        };
        {
            const done = answeredIds();
            const opening = STARTER_PACK.filter((t) => !done.has(t.id));
            if (opening.length > 0 && queueRef.current.length === 0) {
                setQueue(opening);
                queueRef.current = opening;
            }
        }
        void computeLocalBatch().then(install);
    }, []);
    const refill = useCallback(() => {
        if (!enabled || cancelPending.current)
            return;
        cancelPending.current = whenIdle(() => {
            cancelPending.current = null;
            rebuild();
        });
    }, [enabled, rebuild]);
    useEffect(() => {
        if (!enabled)
            return;
        warmRanker();
        hydratedRef.current = true;
        setHydrated(true);
        rebuild();
        return () => {
            cancelPending.current?.();
            cancelPending.current = null;
        };
    }, [enabled, rebuild]);
    const swipeTop = useCallback((action: SwipeAction): Title | null => {
        const top = queueRef.current[0];
        if (!top)
            return null;
        doSwipe(top, action);
        const rest = queueRef.current.slice(1);
        setQueue(rest);
        queueRef.current = rest;
        if (rest.length <= REFILL_AT)
            refill();
        return top;
    }, [doSwipe, refill]);
    const undo = useCallback(() => {
        const state = useSeenIt.getState();
        const lastId = state.swipeOrder[state.swipeOrder.length - 1];
        const snapshot = lastId ? state.swipes[lastId]?.title : undefined;
        const restoredId = doUndo();
        if (!restoredId)
            return;
        const title = snapshot ?? getLocalItem(restoredId)?.title;
        if (title)
            setQueue((q) => [title, ...q.filter((t) => t.id !== restoredId)]);
    }, [doUndo]);
    const canUndo = useSeenIt((s) => s.swipeOrder.length > 0);
    const calibrationProgress = useMemo(() => ({
        current: Math.min(ratedSwipes, COLD_START_TARGET),
        total: COLD_START_TARGET,
        done: !calibrating,
    }), [ratedSwipes, calibrating]);
    const undoWithRerank = useCallback(() => {
        undo();
        refill();
    }, [undo, refill]);
    return {
        queue,
        hydrated,
        filled,
        swipeTop,
        undo: undoWithRerank,
        canUndo,
        calibrating,
        calibrationProgress,
        swipeCount: Object.keys(swipes).length,
        refill: rebuild,
    };
}
