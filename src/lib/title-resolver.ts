"use client";
import { getLocalTitle, loadCatalog } from "@/lib/catalog";
import type { Title } from "@/lib/types";
const slim = (title: Title): Title => ({
    ...title,
    overview: { en: "", ar: "" },
    related: undefined,
});
export async function resolveTitleSnapshots(ids: string[]): Promise<Map<string, Title>> {
    const unique = [...new Set(ids.filter(Boolean))];
    const out = new Map<string, Title>();
    for (const id of unique) {
        const local = getLocalTitle(id);
        if (local)
            out.set(id, slim(local));
    }
    const missing = unique.filter((id) => !out.has(id));
    if (missing.length === 0)
        return out;
    try {
        const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        for (let i = 0; i < missing.length; i += 1000) {
            const res = await fetch(`${base}/api/titles`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ids: missing.slice(i, i + 1000) }),
            });
            if (!res.ok)
                throw new Error(`titles ${res.status}`);
            const body = (await res.json()) as {
                titles?: Title[];
            };
            if (!Array.isArray(body.titles))
                throw new Error("invalid titles response");
            for (const title of body.titles)
                out.set(title.id, slim(title));
        }
        return out;
    }
    catch {
        await loadCatalog();
        for (const id of missing) {
            const title = getLocalTitle(id);
            if (title)
                out.set(id, slim(title));
        }
        return out;
    }
}
