"use client";
import ErrorPanel from "@/components/ErrorPanel";
export default function GlobalError({ error, reset, }: {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
}) {
    return (<html lang="en" dir="ltr">
      <body style={{ margin: 0, minHeight: "100dvh" }}>
        <ErrorPanel error={error} reset={reset} standalone/>
      </body>
    </html>);
}
