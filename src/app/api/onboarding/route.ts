import { NextResponse } from "next/server";
import { serverOnboardingTitles } from "@/lib/server-catalog";
export const runtime = "nodejs";
export async function GET() {
    return NextResponse.json({ titles: await serverOnboardingTitles(48) });
}
