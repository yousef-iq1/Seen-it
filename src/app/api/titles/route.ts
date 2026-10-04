import { NextResponse } from "next/server";
import { serverTitlesFor } from "@/lib/server-catalog";
export const runtime = "nodejs";
export async function POST(req: Request) {
    const length = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(length) && length > 1000000) {
        return NextResponse.json({ error: "request_too_large" }, { status: 413 });
    }
    let body: {
        ids?: unknown;
    };
    try {
        body = (await req.json()) as {
            ids?: unknown;
        };
    }
    catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    const ids = Array.isArray(body.ids)
        ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 2000)
        : [];
    return NextResponse.json({ titles: await serverTitlesFor(ids) });
}
