import type { Title } from "../types";
export const DIM = 384;
const KW_OFF = 0;
const KW_DIM = 256;
const GENRE_OFF = 256;
const GENRE_DIM = 32;
const PEOPLE_OFF = 288;
const PEOPLE_DIM = 64;
const ERA_OFF = 352;
const ERA_DIM = 24;
const LANG_OFF = 376;
const LANG_DIM = 8;
const W_KW = 1.0;
const W_GENRE = 0.8;
const W_PEOPLE = 0.55;
const W_ERA = 0.3;
const W_LANG = 0.2;
function fnv1a(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
function hashInto(vec: Float32Array, token: string, offset: number, dim: number, weight: number) {
    const h = fnv1a(token);
    const idx = offset + (h % dim);
    const sign = (h & 0x80000000) !== 0 ? -1 : 1;
    vec[idx] += sign * weight;
}
function normalizeBlock(vec: Float32Array, offset: number, dim: number, targetWeight: number) {
    let norm = 0;
    for (let i = offset; i < offset + dim; i++)
        norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm === 0)
        return;
    const scale = targetWeight / norm;
    for (let i = offset; i < offset + dim; i++)
        vec[i] *= scale;
}
const norm = (s: string) => s.trim().toLowerCase();
export function featurize(title: Title, idf?: Record<string, number>): Float32Array {
    const v = new Float32Array(DIM);
    for (const kw of title.keywords) {
        const k = norm(kw);
        hashInto(v, `kw:${k}`, KW_OFF, KW_DIM, idf?.[k] ?? 1);
    }
    for (const g of title.genres) {
        hashInto(v, `g:${norm(g)}`, GENRE_OFF, GENRE_DIM, 1);
    }
    if (title.people.director) {
        hashInto(v, `dir:${norm(title.people.director)}`, PEOPLE_OFF, PEOPLE_DIM, 1.4);
    }
    for (const actor of title.people.cast.slice(0, 4)) {
        hashInto(v, `cast:${norm(actor)}`, PEOPLE_OFF, PEOPLE_DIM, 1);
    }
    const decade = Math.floor(title.year / 10) * 10;
    hashInto(v, `decade:${decade}`, ERA_OFF, ERA_DIM, 1);
    hashInto(v, `type:${title.type}`, ERA_OFF, ERA_DIM, 0.8);
    hashInto(v, `lang:${norm(title.originalLanguage)}`, LANG_OFF, LANG_DIM, 1);
    normalizeBlock(v, KW_OFF, KW_DIM, W_KW);
    normalizeBlock(v, GENRE_OFF, GENRE_DIM, W_GENRE);
    normalizeBlock(v, PEOPLE_OFF, PEOPLE_DIM, W_PEOPLE);
    normalizeBlock(v, ERA_OFF, ERA_DIM, W_ERA);
    normalizeBlock(v, LANG_OFF, LANG_DIM, W_LANG);
    let n = 0;
    for (let i = 0; i < DIM; i++)
        n += v[i] * v[i];
    n = Math.sqrt(n);
    if (n > 0)
        for (let i = 0; i < DIM; i++)
            v[i] /= n;
    return v;
}
export function cosine(a: Float32Array | number[], b: Float32Array | number[]): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < DIM; i++) {
        dot += (a[i] ?? 0) * (b[i] ?? 0);
        na += (a[i] ?? 0) * (a[i] ?? 0);
        nb += (b[i] ?? 0) * (b[i] ?? 0);
    }
    if (na === 0 || nb === 0)
        return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
export function qualityPrior(rating: number, voteCount: number, meanRating = 6.8, m = 500): number {
    const wr = (voteCount / (voteCount + m)) * rating + (m / (voteCount + m)) * meanRating;
    return Math.max(0, Math.min(1, (wr - 4) / 5.5));
}
export function reachPrior(title: {
    reach?: number;
    voteCount: number;
}): number {
    const fame = recognizability(title.voteCount);
    const r = title.reach;
    if (r === undefined || REACH_WEIGHT <= 0)
        return fame;
    const mapped = REACH_SCALE_A + REACH_SCALE_B * Math.pow(r, REACH_GAMMA);
    return fame * (1 - REACH_WEIGHT) + mapped * REACH_WEIGHT;
}
const REACH_WEIGHT = typeof process !== "undefined" && process.env?.REACH
    ? Number(process.env.REACH)
    : 0;
const REACH_GAMMA = 0.38;
const REACH_SCALE_A = 0.0;
const REACH_SCALE_B = 1.16;
const PEAK_VOTES = 2500;
const PEAK_WIDTH = 1.6;
export function recognizability(voteCount: number): number {
    const MAX_LOG = Math.log10(40000);
    const ramp = Math.max(0, Math.min(1, Math.log10(1 + voteCount) / MAX_LOG));
    if (process.env?.PEAK !== "1")
        return ramp;
    const d = Math.abs(Math.log(1 + voteCount) - Math.log(PEAK_VOTES)) / PEAK_WIDTH;
    const hill = Math.exp(-0.5 * d * d);
    return Math.max(0, Math.min(1, 0.35 * ramp + 0.65 * hill));
}
