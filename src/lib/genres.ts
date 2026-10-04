export const GENRE_META: Record<string, {
    ar: string;
    en: string;
    emoji: string;
}> = {
    action: { ar: "أكشن", en: "Action", emoji: "💥" },
    adventure: { ar: "مغامرة", en: "Adventure", emoji: "🗺️" },
    animation: { ar: "أنيميشن", en: "Animation", emoji: "🎨" },
    comedy: { ar: "كوميديا", en: "Comedy", emoji: "😄" },
    crime: { ar: "جريمة", en: "Crime", emoji: "🕵️" },
    documentary: { ar: "وثائقي", en: "Documentary", emoji: "🎥" },
    drama: { ar: "دراما", en: "Drama", emoji: "🎭" },
    family: { ar: "عائلي", en: "Family", emoji: "👨‍👩‍👧" },
    fantasy: { ar: "فانتازيا", en: "Fantasy", emoji: "🐉" },
    history: { ar: "تاريخي", en: "History", emoji: "🏛️" },
    horror: { ar: "رعب", en: "Horror", emoji: "👻" },
    music: { ar: "موسيقى", en: "Music", emoji: "🎵" },
    mystery: { ar: "غموض", en: "Mystery", emoji: "🔍" },
    romance: { ar: "رومانسية", en: "Romance", emoji: "❤️" },
    scifi: { ar: "خيال علمي", en: "Sci-Fi", emoji: "🚀" },
    thriller: { ar: "إثارة", en: "Thriller", emoji: "⚡" },
    war: { ar: "حرب", en: "War", emoji: "⚔️" },
    western: { ar: "وسترن", en: "Western", emoji: "🤠" },
    reality: { ar: "واقعي", en: "Reality", emoji: "📺" },
    kids: { ar: "أطفال", en: "Kids", emoji: "🧸" },
    soap: { ar: "دراما طويلة", en: "Soap", emoji: "🌹" },
    talk: { ar: "حواري", en: "Talk", emoji: "🎙️" },
    news: { ar: "أخبار", en: "News", emoji: "📰" },
    politics: { ar: "سياسة", en: "Politics", emoji: "🗳️" },
};
export function genreLabel(slug: string, locale: string): string {
    const meta = GENRE_META[slug];
    if (!meta)
        return slug;
    return locale === "ar" ? meta.ar : meta.en;
}
export function genreEmoji(slug: string): string {
    return GENRE_META[slug]?.emoji ?? "🎬";
}
