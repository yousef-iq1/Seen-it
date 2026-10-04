import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST() {
    return NextResponse.json({ error: "server_import_match_disabled" }, { status: 503, headers: { "cache-control": "no-store" } });
}
