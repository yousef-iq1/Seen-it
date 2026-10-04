import type { Title, TitleType } from "../types";
export interface EncodedCatalog {
    v: 1 | 2;
    g: string[];
    l: string[];
    t: EncodedTitle[];
}
type EncodedTitle = [
    number,
    0 | 1,
    string,
    string,
    string,
    number,
    number[],
    string[],
    string,
    string[],
    number,
    number,
    number,
    number,
    string,
    0 | 1,
    number[]?,
    string?
];
export function encodeCatalog(titles: Title[]): EncodedCatalog {
    const genres: string[] = [];
    const langs: string[] = [];
    const intern = (pool: string[], value: string) => {
        let i = pool.indexOf(value);
        if (i === -1)
            i = pool.push(value) - 1;
        return i;
    };
    const indexOfId = new Map(titles.map((title, i) => [title.id, i]));
    const t = titles.map<EncodedTitle>((title) => [
        title.tmdbId ?? 0,
        title.type === "tv" ? 1 : 0,
        title.title.en,
        title.title.ar === title.title.en ? "" : title.title.ar,
        title.overview.en,
        title.year,
        title.genres.map((g) => intern(genres, g)),
        title.keywords,
        title.people.director ?? "",
        title.people.cast,
        intern(langs, title.originalLanguage),
        title.rating,
        title.voteCount,
        title.popularity,
        title.posterPath ?? "",
        title.onboarding ? 1 : 0,
        (title.related ?? [])
            .map((id) => indexOfId.get(id))
            .filter((i): i is number => i !== undefined),
        title.title.original && title.title.original !== title.title.en
            ? title.title.original
            : "",
    ]);
    return { v: 2, g: genres, l: langs, t };
}
export function decodeCatalog(data: EncodedCatalog): Title[] {
    return decodeRange(data, 0, data.t.length);
}
export function decodeRange(data: EncodedCatalog, from: number, to: number): Title[] {
    const idAt = (i: number): string | undefined => {
        const row = data.t[i];
        return row ? `${row[1] === 1 ? "tv" : "movie"}-${row[0]}` : undefined;
    };
    return data.t.slice(from, to).map((row) => {
        const type: TitleType = row[1] === 1 ? "tv" : "movie";
        const en = row[2];
        return {
            id: `${type}-${row[0]}`,
            type,
            tmdbId: row[0],
            title: { en, ar: row[3] || en, original: row[17] || "" },
            overview: { en: row[4], ar: row[4] },
            year: row[5],
            genres: row[6].map((i) => data.g[i]),
            keywords: row[7],
            people: { director: row[8] || undefined, cast: row[9] },
            originalLanguage: data.l[row[10]],
            rating: row[11],
            voteCount: row[12],
            popularity: row[13],
            posterPath: row[14] || null,
            onboarding: row[15] === 1,
            related: (row[16] ?? [])
                .map(idAt)
                .filter((id): id is string => id !== undefined),
        };
    });
}
