import { NextResponse } from "next/server";
import { searchServerTitles } from "@/lib/server-catalog";
export const runtime = "nodejs";
export async function POST(req: Request) {
    const length = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(length) && length > 1000000) {
        return NextResponse.json({ error: "request_too_large" }, { status: 413 });
    }
    let body: {
        query?: unknown;
        skipIds?: unknown;
        limit?: unknown;
    };
    try {
        body = (await req.json()) as typeof body;
    }
    catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    const query = typeof body.query === "string" ? body.query.slice(0, 200) : "";
    const skipIds = new Set(Array.isArray(body.skipIds)
        ? body.skipIds.filter((x): x is string => typeof x === "string").slice(0, 12000)
        : []);
    const limit = Math.max(1, Math.min(50, Number(body.limit) || 24));
    return NextResponse.json({
        titles: await searchServerTitles(query, skipIds, limit),
    });
}
