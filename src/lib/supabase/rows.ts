import type { Title } from "@/lib/types";
export interface TitleRow {
    id: string;
    tmdb_id: number;
    type: "movie" | "tv";
    title_en: string;
    title_ar: string;
    overview_en: string;
    overview_ar: string;
    year: number;
    genres: string[];
    keywords: string[];
    director: string | null;
    cast_names: string[];
    original_language: string;
    rating: number;
    vote_count: number;
    popularity: number;
    poster_path: string | null;
    backdrop_path: string | null;
    onboarding: boolean;
}
export function rowToTitle(row: TitleRow): Title {
    return {
        id: row.id,
        type: row.type,
        tmdbId: row.tmdb_id,
        title: { en: row.title_en, ar: row.title_ar || row.title_en },
        overview: { en: row.overview_en, ar: row.overview_ar || row.overview_en },
        year: row.year,
        genres: row.genres ?? [],
        keywords: row.keywords ?? [],
        people: { director: row.director ?? undefined, cast: row.cast_names ?? [] },
        originalLanguage: row.original_language,
        rating: Number(row.rating),
        voteCount: row.vote_count,
        popularity: Number(row.popularity),
        posterPath: row.poster_path,
        backdropPath: row.backdrop_path,
        onboarding: row.onboarding,
    };
}
