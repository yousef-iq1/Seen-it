export type TitleType = "movie" | "tv";
export interface Title {
    id: string;
    type: TitleType;
    tmdbId?: number;
    title: {
        en: string;
        ar: string;
        original?: string;
    };
    overview: {
        en: string;
        ar: string;
    };
    year: number;
    genres: string[];
    keywords: string[];
    people: {
        director?: string;
        cast: string[];
    };
    originalLanguage: string;
    rating: number;
    voteCount: number;
    reach?: number;
    popularity: number;
    posterPath?: string | null;
    backdropPath?: string | null;
    onboarding?: boolean;
    related?: string[];
}
export type SwipeAction = "liked" | "disliked" | "not_seen" | "seen";
export interface Swipe {
    titleId: string;
    action: SwipeAction;
    at: number;
    title?: Title;
}
export interface UserList {
    id: string;
    name: string;
    isPublic: boolean;
    titleIds: string[];
    createdAt: number;
    updatedAt?: number;
    hideOwner?: boolean;
    slug?: string;
    sourceListId?: string;
}
export interface Recommendation {
    title: Title;
    score: number;
    match: number;
    reasons: {
        kind: string;
        label: string;
    }[];
    becauseOf?: string;
}
