import { getLocalCatalog } from "./catalog";
import type { Title } from "./types";
export { matches, normalise, searchText } from "./search-core";
import { normalise, searchText } from "./search-core";
let hay: string[] = [];
let built = 0;
let builtFor = 0;
let scheduled = false;
const SLICE = 2500;
function buildSome(deadline?: IdleDeadline) {
    const items = getLocalCatalog();
    if (items.length !== builtFor) {
        builtFor = items.length;
        hay = new Array<string>(items.length);
        built = 0;
    }
    while (built < items.length) {
        const end = Math.min(built + SLICE, items.length);
        for (let i = built; i < end; i++)
            hay[i] = searchText(items[i].title);
        built = end;
        if (deadline && deadline.timeRemaining() <= 1)
            break;
    }
    scheduled = false;
    if (built < items.length)
        schedule();
}
function schedule() {
    if (scheduled || typeof window === "undefined")
        return;
    scheduled = true;
    const ric = window.requestIdleCallback;
    if (typeof ric === "function")
        ric(buildSome, { timeout: 2000 });
    else
        window.setTimeout(() => buildSome(), 40);
}
export function warmSearchIndex() {
    if (typeof window === "undefined")
        return;
    const items = getLocalCatalog();
    if (items.length === 0)
        return;
    if (items.length === builtFor && built >= items.length)
        return;
    schedule();
}
export interface SearchOptions {
    limit?: number;
    skip?: (id: string) => boolean;
}
export function searchCatalog(query: string, opts: SearchOptions = {}): Title[] {
    const q = normalise(query);
    if (q.length < 2)
        return [];
    const items = getLocalCatalog();
    if (items.length === 0)
        return [];
    if (items.length !== builtFor || built < items.length)
        buildSome();
    const limit = opts.limit ?? 40;
    const skip = opts.skip;
    const starts: Title[] = [];
    const contains: Title[] = [];
    for (let i = 0; i < items.length; i++) {
        const at = hay[i].indexOf(q);
        if (at < 0)
            continue;
        const title = items[i].title;
        if (skip?.(title.id))
            continue;
        if (at === 0 || hay[i].charCodeAt(at - 1) === 32)
            starts.push(title);
        else
            contains.push(title);
    }
    const byFame = (a: Title, b: Title) => b.voteCount - a.voteCount;
    starts.sort(byFame);
    if (starts.length >= limit)
        return starts.slice(0, limit);
    contains.sort(byFame);
    return [...starts, ...contains].slice(0, limit);
}
