import { getRequestConfig } from "next-intl/server";
import { getServerLocale } from "@/lib/i18n-server";
export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export default getRequestConfig(async () => {
    const locale = await getServerLocale();
    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
    };
});
