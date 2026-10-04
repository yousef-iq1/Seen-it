"use client";
import { useEffect, useState } from "react";
import { BRAND, BUILD } from "@/lib/brand";
import { useT } from "@/lib/i18n";
function errorId(error: Error): string {
    const source = `${error.name}:${error.message}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < source.length; i++) {
        h ^= source.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    const alphabet = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
    let out = "";
    for (let i = 0; i < 4; i++) {
        out = alphabet[h % alphabet.length] + out;
        h = Math.floor(h / alphabet.length);
    }
    return `DQ-${out}`;
}
export default function ErrorPanel({ error, reset, standalone = false, }: {
    error: Error & {
        digest?: string;
    };
    reset?: () => void;
    standalone?: boolean;
}) {
    const id = errorId(error);
    const t = useT();
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        console.error(`[${id}] build=${BUILD}`, error);
    }, [id, error]);
    const report = [
        `${id}`,
        `build: ${BUILD}`,
        `error: ${error.name}: ${error.message}`,
        error.digest ? `digest: ${error.digest}` : "",
        `page: ${typeof location !== "undefined" ? location.pathname : "?"}`,
    ]
        .filter(Boolean)
        .join("\n");
    return (<div role="alert" style={{
            position: "fixed",
            insetInlineStart: 0,
            insetInlineEnd: 0,
            bottom: 0,
            zIndex: 60,
            display: "flex",
            justifyContent: "center",
            padding: "16px",
            background: standalone ? "var(--color-bg, #0f1216)" : "transparent",
            ...(standalone ? { top: 0, alignItems: "center" } : null),
        }}>
      <div style={{
            width: "100%",
            maxWidth: "26rem",
            borderRadius: "var(--radius-card, 24px)",
            border: "1px solid var(--color-line, #e3e8ef)",
            background: "var(--color-surface, #fff)",
            color: "var(--color-ink, #1d1d1f)",
            boxShadow: "0 18px 50px rgb(var(--rgb-shadow, 29 41 61) / 0.28)",
            padding: "20px",
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
        }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>
          {t("error.title")}
        </p>
        <p style={{
            margin: "6px 0 0",
            fontSize: "0.875rem",
            color: "var(--color-ink-dim, #6e7381)",
            lineHeight: 1.5,
        }}>
          {t("error.body")}
        </p>

        <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
          {reset && (<button onClick={reset} style={primary}>
              {t("error.retry")}
            </button>)}
          <a href="/" style={secondary}>
            {t("error.home")}
          </a>
          <a href="/settings" style={secondary}>
            {t("error.backup")}
          </a>
        </div>

        <button onClick={() => {
            navigator.clipboard?.writeText(report).then(() => setCopied(true), () => setCopied(false));
        }} style={{
            ...quiet,
            marginTop: "14px",
        }} title={report}>
          {copied ? t("error.copied") : `${id} · ${BUILD.slice(0, 7)} — ${t("error.copyDetails")}`}
        </button>

        {standalone && (<p style={{
                margin: "14px 0 0",
                fontSize: "0.75rem",
                color: "var(--color-ink-faint, #9aa1ad)",
            }}>
            {BRAND}
          </p>)}
      </div>
    </div>);
}
const base: React.CSSProperties = {
    borderRadius: "999px",
    padding: "9px 16px",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    border: "1px solid transparent",
    textDecoration: "none",
    display: "inline-block",
};
const primary: React.CSSProperties = {
    ...base,
    background: "var(--color-accent, #0ea5e9)",
    color: "var(--color-on-accent, #fff)",
};
const secondary: React.CSSProperties = {
    ...base,
    background: "transparent",
    borderColor: "var(--color-line, #e3e8ef)",
    color: "var(--color-ink, #1d1d1f)",
};
const quiet: React.CSSProperties = {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: "0.75rem",
    color: "var(--color-ink-faint, #9aa1ad)",
    cursor: "pointer",
    fontFamily: "ui-monospace, monospace",
};
