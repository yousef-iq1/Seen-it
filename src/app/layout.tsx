import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Geist } from "next/font/google";
import { getTranslations } from "next-intl/server";
import "./globals.css";
import AppShell from "@/components/AppShell";
import LocaleProvider from "@/components/LocaleProvider";
import ServiceWorker from "@/components/ServiceWorker";
import { AccountProvider } from "@/lib/supabase/useAccount";
import { getServerLocale } from "@/lib/i18n-server";
const plexArabic = IBM_Plex_Sans_Arabic({
    variable: "--font-plex-arabic",
    subsets: ["arabic", "latin"],
    weight: ["400", "500", "600", "700"],
});
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const BASE_PATH = process.env.BASE_PATH ?? "";
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("app");
    return {
        title: { default: `${t("name")} — ${t("tagline")}`, template: `%s · ${t("name")}` },
        description: t("tagline"),
        manifest: `${BASE_PATH}/manifest.webmanifest`,
        icons: {
            icon: [
                { url: `${BASE_PATH}/icon.svg`, type: "image/svg+xml" },
                { url: `${BASE_PATH}/favicon-32.png`, sizes: "32x32", type: "image/png" },
                { url: `${BASE_PATH}/icon-192.png`, sizes: "192x192", type: "image/png" },
                { url: `${BASE_PATH}/icon-512.png`, sizes: "512x512", type: "image/png" },
            ],
            apple: `${BASE_PATH}/apple-touch-icon.png`,
        },
    };
}
export const viewport: Viewport = {
    themeColor: "#0b0b13",
    width: "device-width",
    initialScale: 1,
};
export default async function RootLayout({ children }: LayoutProps<"/">) {
    const locale = await getServerLocale();
    return (<html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${plexArabic.variable} ${geistSans.variable} h-full antialiased`}>
      <body className="min-h-dvh font-sans">
        <LocaleProvider>
          <AccountProvider>
            <AppShell>{children}</AppShell>
          </AccountProvider>
        </LocaleProvider>
        <ServiceWorker />
      </body>
    </html>);
}
