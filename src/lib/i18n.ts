"use client";
import { useEffect, useState } from "react";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
type Dict = {
    [key: string]: string | Dict;
};
export const LOCALES = ["ar", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];
export type LocalePreference = AppLocale | "auto";
const CATALOGS: Record<AppLocale, Dict> = { en: en as Dict, ar: ar as Dict };
export const RTL_LOCALES = new Set<AppLocale>(["ar"]);
export const isRtl = (l: AppLocale) => RTL_LOCALES.has(l);
export function deviceLocale(): AppLocale {
    if (typeof navigator === "undefined")
        return "en";
    const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of tags) {
        const base = (tag ?? "").toLowerCase().split("-")[0];
        if (base === "ar")
            return "ar";
        if (base === "en")
            return "en";
    }
    return "en";
}
export function resolveLocale(pref: LocalePreference | undefined): AppLocale {
    if (pref === "ar" || pref === "en")
        return pref;
    return deviceLocale();
}
function lookup(catalog: Dict, path: string): string | null {
    let node: string | Dict | undefined = catalog;
    for (const part of path.split(".")) {
        if (typeof node === "string" || node === undefined)
            return null;
        node = node[part];
    }
    return typeof node === "string" ? node : null;
}
export function translate(locale: AppLocale, key: string, values?: Record<string, string | number>): string {
    const raw = lookup(CATALOGS[locale], key) ?? lookup(CATALOGS.en, key) ?? key;
    if (!values)
        return raw;
    return raw.replace(/\{(\w+)\}/g, (match, name: string) => name in values ? String(values[name]) : match);
}
let current: AppLocale = "en";
const listeners = new Set<() => void>();
export function getLocale(): AppLocale {
    return current;
}
export function setLocale(next: AppLocale): void {
    if (next === current)
        return;
    current = next;
    if (typeof document !== "undefined") {
        document.documentElement.lang = next;
        document.documentElement.dir = isRtl(next) ? "rtl" : "ltr";
    }
    for (const fn of listeners)
        fn();
}
export function useLocale(): AppLocale {
    const [, force] = useState(0);
    useEffect(() => {
        const fn = () => force((n) => n + 1);
        listeners.add(fn);
        return () => {
            listeners.delete(fn);
        };
    }, []);
    return current;
}
export function useT(): (key: string, values?: Record<string, string | number>) => string {
    const locale = useLocale();
    return (key, values) => translate(locale, key, values);
}
export function t(key: string, values?: Record<string, string | number>): string {
    return translate(current, key, values);
}
export const CONTENT_DIR = "auto" as const;
export const locale = "en" as const;
