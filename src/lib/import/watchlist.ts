import type { SwipeAction, Title } from "@/lib/types";
export type ImportRow = {
    name: string;
    year?: number;
    rating?: number;
    tmdbId?: number;
    imdbId?: string;
};
export type MatchResult = {
    rows: ImportRow[];
    matched: {
        title: Title;
        action: SwipeAction;
        row: ImportRow;
    }[];
    unmatched: ImportRow[];
};
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;
    const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (quoted) {
            if (ch === '"') {
                if (src[i + 1] === '"') {
                    field += '"';
                    i++;
                }
                else
                    quoted = false;
            }
            else
                field += ch;
            continue;
        }
        if (ch === '"')
            quoted = true;
        else if (ch === ",") {
            row.push(field);
            field = "";
        }
        else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && src[i + 1] === "\n")
                i++;
            row.push(field);
            field = "";
            if (row.some((c) => c.trim() !== ""))
                rows.push(row);
            row = [];
        }
        else
            field += ch;
    }
    row.push(field);
    if (row.some((c) => c.trim() !== ""))
        rows.push(row);
    return rows;
}
function columnIndex(header: string[], names: string[]): number {
    const norm = header.map((h) => h.trim().toLowerCase().replace(/[\s_]+/g, ""));
    for (const name of names) {
        const i = norm.indexOf(name);
        if (i !== -1)
            return i;
    }
    return -1;
}
export function readExport(text: string): ImportRow[] {
    const table = parseCsv(text);
    if (table.length < 2)
        return [];
    const header = table[0];
    const iName = columnIndex(header, ["name", "title", "originaltitle", "film"]);
    const iYear = columnIndex(header, ["year", "releaseyear", "yearreleased"]);
    const iRating = columnIndex(header, ["rating", "yourrating", "rating10", "score"]);
    const iTmdb = columnIndex(header, ["tmdbid", "tmdb", "themoviedbid"]);
    const iImdb = columnIndex(header, ["imdbid", "const", "imdb"]);
    if (iName === -1 && iTmdb === -1 && iImdb === -1)
        return [];
    const raw: (number | undefined)[] = [];
    const out: ImportRow[] = [];
    for (let r = 1; r < table.length; r++) {
        const cells = table[r];
        const name = iName === -1 ? "" : (cells[iName] ?? "").trim();
        const yearRaw = iYear === -1 ? "" : (cells[iYear] ?? "").trim();
        const ratingRaw = iRating === -1 ? "" : (cells[iRating] ?? "").trim();
        const tmdbRaw = iTmdb === -1 ? "" : (cells[iTmdb] ?? "").trim();
        const imdbRaw = iImdb === -1 ? "" : (cells[iImdb] ?? "").trim();
        const year = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : undefined;
        const rating = ratingRaw !== "" && !Number.isNaN(Number(ratingRaw)) ? Number(ratingRaw) : undefined;
        if (!name && !tmdbRaw && !imdbRaw)
            continue;
        raw.push(rating);
        out.push({
            name,
            year,
            rating,
            tmdbId: /^\d+$/.test(tmdbRaw) ? Number(tmdbRaw) : undefined,
            imdbId: /^tt\d+$/.test(imdbRaw) ? imdbRaw : undefined,
        });
    }
    const max = raw.reduce<number>((m, v) => (v !== undefined && v > m ? v : m), 0);
    const scale = max > 0 && max <= 5 ? 2 : 1;
    if (scale !== 1)
        for (const row of out)
            if (row.rating !== undefined)
                row.rating *= scale;
    return out;
}
function normalise(s: string): string {
    const flat = s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
    return (flat
        .replace(/,\s*(the|a|an)$/, "")
        .replace(/^(the|a|an)\s+/, "")
        .replace(/[^a-z0-9]+/g, ""));
}
export function buildIndex(catalog: Title[]) {
    const byTmdb = new Map<string, Title>();
    const byNameYear = new Map<string, Title>();
    const byName = new Map<string, Title[]>();
    for (const t of catalog) {
        if (t.tmdbId !== undefined)
            byTmdb.set(`${t.type}-${t.tmdbId}`, t);
        for (const raw of [t.title.en, t.title.original, t.title.ar]) {
            if (!raw)
                continue;
            const key = normalise(raw);
            if (!key)
                continue;
            const exact = `${key}|${t.year}`;
            const prev = byNameYear.get(exact);
            if (!prev || prev.voteCount < t.voteCount)
                byNameYear.set(exact, t);
            const list = byName.get(key);
            if (list)
                list.push(t);
            else
                byName.set(key, [t]);
        }
    }
    for (const list of byName.values())
        list.sort((a, b) => b.voteCount - a.voteCount);
    return { byTmdb, byNameYear, byName };
}
export function matchRow(row: ImportRow, index: ReturnType<typeof buildIndex>): Title | null {
    if (row.tmdbId !== undefined) {
        const hit = index.byTmdb.get(`movie-${row.tmdbId}`) ?? index.byTmdb.get(`tv-${row.tmdbId}`);
        if (hit)
            return hit;
    }
    const key = normalise(row.name);
    if (!key)
        return null;
    if (row.year !== undefined) {
        for (const y of [row.year, row.year - 1, row.year + 1]) {
            const hit = index.byNameYear.get(`${key}|${y}`);
            if (hit)
                return hit;
        }
    }
    const list = index.byName.get(key);
    if (!list?.length)
        return null;
    if (row.year === undefined && list.length > 1)
        return null;
    return list[0];
}
export function actionFor(rating: number | undefined): SwipeAction {
    if (rating === undefined)
        return "seen";
    if (rating >= 8)
        return "liked";
    if (rating >= 6)
        return "seen";
    return "disliked";
}
export function matchAll(rows: ImportRow[], catalog: Title[]): MatchResult {
    const index = buildIndex(catalog);
    const matched: MatchResult["matched"] = [];
    const unmatched: ImportRow[] = [];
    const taken = new Set<string>();
    for (const row of rows) {
        const title = matchRow(row, index);
        if (!title || taken.has(title.id)) {
            if (!title)
                unmatched.push(row);
            continue;
        }
        taken.add(title.id);
        matched.push({ title, action: actionFor(row.rating), row });
    }
    return { rows, matched, unmatched };
}
