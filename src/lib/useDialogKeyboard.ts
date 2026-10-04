"use client";
import { useEffect, useRef } from "react";
export function useDialogKeyboard(active: boolean, ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        if (!active)
            return;
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const root = ref.current;
        if (!root)
            return;
        const focusables = () => Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute("hidden"));
        queueMicrotask(() => (focusables()[0] ?? root).focus());
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeRef.current();
                return;
            }
            if (event.key !== "Tab")
                return;
            const items = focusables();
            if (items.length === 0) {
                event.preventDefault();
                root.focus();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            previous?.focus();
        };
    }, [active, ref]);
}
