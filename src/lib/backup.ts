"use client";
import { DEFAULT_SETTINGS, useSeenIt } from "@/lib/store";
import { getLocalTitle, loadCatalog } from "@/lib/catalog";
import type { Swipe, UserList } from "@/lib/types";
export const BACKUP_VERSION = 1;
export interface Backup {
    format: "seen-it-backup";
    version: number;
    exportedAt: string;
    counts: {
        swipes: number;
        lists: number;
    };
    swipes: Swipe[];
    swipeOrder: string[];
    lists: UserList[];
    settings: unknown;
    publicProfile: unknown;
}
export function buildBackup(): Backup {
    const s = useSeenIt.getState();
    return {
        format: "seen-it-backup",
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        counts: { swipes: s.swipeOrder.length, lists: s.lists.length },
        swipes: s.swipeOrder
            .map((id) => {
            const sw = s.swipes[id];
            if (!sw)
                return null;
            const title = sw.title ?? getLocalTitle(id);
            return title
                ? { ...sw, title: { ...title, overview: { en: "", ar: "" }, related: undefined } }
                : sw;
        })
            .filter((x): x is Swipe => Boolean(x)),
        swipeOrder: s.swipeOrder,
        lists: s.lists,
        settings: s.settings,
        publicProfile: s.publicProfile,
    };
}
const ACTION_LABEL: Record<string, string> = {
    liked: "liked",
    disliked: "disliked",
    seen: "watched",
    not_seen: "not seen",
};
const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
export function buildCsv(): string {
    const s = useSeenIt.getState();
    const rows = [["Title", "Year", "Verdict", "Date", "TitleID"].map(cell).join(",")];
    for (const id of s.swipeOrder) {
        const sw = s.swipes[id];
        if (!sw)
            continue;
        rows.push([
            cell((getLocalTitle(id) ?? sw.title)?.title.en ?? id),
            cell((getLocalTitle(id) ?? sw.title)?.year ?? ""),
            cell(ACTION_LABEL[sw.action] ?? sw.action),
            cell(new Date(sw.at).toISOString().slice(0, 10)),
            cell(id),
        ].join(","));
    }
    return rows.join("\n");
}
export function download(filename: string, contents: string, type: string): void {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const stamp = () => new Date().toISOString().slice(0, 10);
export function exportJson(): number {
    const backup = buildBackup();
    download(`seen-it-backup-${stamp()}.json`, JSON.stringify(backup), "application/json");
    return backup.counts.swipes;
}
export function exportCsv(): number {
    const csv = buildCsv();
    download(`seen-it-library-${stamp()}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
    return useSeenIt.getState().swipeOrder.length;
}
export interface RestoreResult {
    ok: boolean;
    swipes: number;
    lists: number;
    error?: string;
}
export async function restoreBackup(raw: string): Promise<RestoreResult> {
    let data: Partial<Backup>;
    try {
        data = JSON.parse(raw) as Partial<Backup>;
    }
    catch {
        return { ok: false, swipes: 0, lists: 0, error: "That file is not a backup." };
    }
    if (data.format !== "seen-it-backup" || !Array.isArray(data.swipes)) {
        return {
            ok: false,
            swipes: 0,
            lists: 0,
            error: "That is not a Seen It backup file.",
        };
    }
    await loadCatalog().catch(() => undefined);
    const validAction = (a: unknown): a is Swipe["action"] => a === "liked" || a === "disliked" || a === "seen" || a === "not_seen";
    const swipes: Record<string, Swipe> = {};
    for (const candidate of data.swipes) {
        if (!candidate ||
            typeof candidate.titleId !== "string" ||
            !validAction(candidate.action) ||
            !Number.isFinite(candidate.at))
            continue;
        swipes[candidate.titleId] = candidate;
    }
    const order = Array.isArray(data.swipeOrder) && data.swipeOrder.length
        ? data.swipeOrder.filter((id): id is string => typeof id === "string" && id in swipes)
        : Object.keys(swipes);
    const lists = Array.isArray(data.lists)
        ? data.lists.filter((l): l is UserList => Boolean(l) &&
            typeof l.id === "string" &&
            typeof l.name === "string" &&
            Array.isArray(l.titleIds) &&
            l.titleIds.every((id) => typeof id === "string"))
        : [];
    const settings = data.settings && typeof data.settings === "object"
        ? { ...DEFAULT_SETTINGS, ...(data.settings as Partial<typeof DEFAULT_SETTINGS>) }
        : DEFAULT_SETTINGS;
    const pp = data.publicProfile && typeof data.publicProfile === "object"
        ? (data.publicProfile as {
            name?: unknown;
            bio?: unknown;
            avatarUrl?: unknown;
        })
        : {};
    const publicProfile = {
        name: typeof pp.name === "string" ? pp.name : "",
        bio: typeof pp.bio === "string" ? pp.bio : "",
        avatarUrl: typeof pp.avatarUrl === "string" ? pp.avatarUrl : "",
    };
    useSeenIt.setState({
        swipes,
        swipeOrder: order,
        lists,
        settings,
        publicProfile,
        accountOwner: null,
    });
    useSeenIt.getState().rebuildProfile();
    return { ok: true, swipes: order.length, lists: lists.length };
}
