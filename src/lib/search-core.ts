import type { Title } from "./types";
const ASCII = /^[\x20-\x7E]*$/;
const MARKS = /[̀-ͯ]/g;
const ARABIC_MARKS = /[ـً-ْ]/g;
const NON_WORD = /[^\p{L}\p{N}]+/gu;
export function normalise(s: string): string {
    const lower = s.toLowerCase();
    if (ASCII.test(lower))
        return lower.replace(NON_WORD, " ").trim();
    return lower
        .normalize("NFKD")
        .replace(MARKS, "")
        .replace(ARABIC_MARKS, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(NON_WORD, " ")
        .trim();
}
export function searchText(title: Title): string {
    return `${normalise(title.title.en)} ${normalise(title.title.ar)} ${normalise(title.title.original ?? "")}`;
}
export function matches(title: Title, query: string): boolean {
    const q = normalise(query);
    return Boolean(q && searchText(title).includes(q));
}
