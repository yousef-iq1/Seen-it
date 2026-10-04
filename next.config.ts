import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH ?? "";
function buildId(): string {
    const fromHost = process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA;
    if (fromHost)
        return fromHost.slice(0, 7);
    try {
        const { execSync } = require("node:child_process");
        return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
            .toString()
            .trim();
    }
    catch {
        return "dev";
    }
}
const NEXT_PUBLIC_BUILD = buildId();
const nextConfig: NextConfig = isStaticExport
    ? {
        output: "export",
        basePath,
        images: { unoptimized: true },
        env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_BUILD },
    }
    : {
        images: {
            remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org" }],
        },
        env: { NEXT_PUBLIC_BASE_PATH: "", NEXT_PUBLIC_BUILD },
        async headers() {
            return [
                {
                    source: "/:path*",
                    headers: [
                        { key: "X-Content-Type-Options", value: "nosniff" },
                        { key: "X-Frame-Options", value: "DENY" },
                        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                        {
                            key: "Permissions-Policy",
                            value: "camera=(), microphone=(), geolocation=()",
                        },
                        {
                            key: "Content-Security-Policy",
                            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
                        },
                    ],
                },
            ];
        },
    };
export default withNextIntl(nextConfig);
