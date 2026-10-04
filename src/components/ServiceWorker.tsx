"use client";
import { useEffect } from "react";
import { BUILD } from "@/lib/brand";
export default function ServiceWorker() {
    useEffect(() => {
        if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
            return;
        if (process.env.NEXT_PUBLIC_BASE_PATH)
            return;
        if (process.env.NODE_ENV !== "production")
            return;
        const register = () => {
            navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(BUILD)}`).catch(() => {
            });
        };
        if (document.readyState === "complete")
            register();
        else
            window.addEventListener("load", register, { once: true });
    }, []);
    return null;
}
