"use client";
import { useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import arMessages from "@/messages/ar.json";
import { useSeenIt } from "@/lib/store";
import { getLocale, isRtl, resolveLocale, setLocale, useLocale } from "@/lib/i18n";
export default function LocaleProvider({ children }: {
    children: React.ReactNode;
}) {
    const pref = useSeenIt((s) => s.settings.locale);
    const locale = useLocale();
    useEffect(() => {
        const next = resolveLocale(pref);
        if (next !== getLocale())
            setLocale(next);
        document.documentElement.lang = next;
        document.documentElement.dir = isRtl(next) ? "rtl" : "ltr";
        if (pref === "ar" || pref === "en") {
            document.cookie = `seen-it-locale=${pref}; Path=/; Max-Age=31536000; SameSite=Lax`;
        }
        else {
            document.cookie = "seen-it-locale=; Path=/; Max-Age=0; SameSite=Lax";
        }
    }, [pref]);
    return (<NextIntlClientProvider locale={locale} messages={locale === "ar" ? arMessages : enMessages}>
      {children}
    </NextIntlClientProvider>);
}
