import type { Title } from "../types";
export interface SeedEntry {
    name: string;
    year?: number;
}
export interface SeedAudience {
    audience: string;
    titles: SeedEntry[];
}
export const TASTE_SEEDS: SeedAudience[] = [
    {
        audience: "comedy",
        titles: [
            { name: "The Hangover" },
            { name: "Groundhog Day" },
            { name: "Monty Python and the Holy Grail" },
            { name: "Airplane!" },
            { name: "Superbad" },
            { name: "Dumb and Dumber" },
            { name: "Ferris Bueller's Day Off" },
            { name: "Mrs. Doubtfire" },
            { name: "Coming to America", year: 1988 },
            { name: "Bridesmaids" },
            { name: "The Grand Budapest Hotel" },
            { name: "Ace Ventura: Pet Detective" },
            { name: "Anchorman: The Legend of Ron Burgundy" },
            { name: "21 Jump Street" },
            { name: "Home Alone" },
        ],
    },
    {
        audience: "horror",
        titles: [
            { name: "The Shining" },
            { name: "The Exorcist", year: 1973 },
            { name: "Halloween", year: 1978 },
            { name: "Alien" },
            { name: "Psycho", year: 1960 },
            { name: "The Thing", year: 1982 },
            { name: "A Nightmare on Elm Street", year: 1984 },
            { name: "Scream", year: 1996 },
            { name: "The Conjuring" },
            { name: "Get Out" },
            { name: "Hereditary" },
            { name: "The Texas Chain Saw Massacre" },
            { name: "It", year: 2017 },
            { name: "Train to Busan" },
        ],
    },
    {
        audience: "action",
        titles: [
            { name: "Die Hard" },
            { name: "Mad Max: Fury Road" },
            { name: "Terminator 2: Judgment Day" },
            { name: "Enter the Dragon" },
            { name: "John Wick" },
            { name: "Rambo: First Blood" },
            { name: "Lethal Weapon" },
            { name: "Rush Hour" },
            { name: "Top Gun" },
            { name: "Speed" },
            { name: "The Raid" },
            { name: "Kill Bill: Vol. 1" },
            { name: "Mission: Impossible - Fallout" },
            { name: "Gladiator", year: 2000 },
        ],
    },
    {
        audience: "scifi",
        titles: [
            { name: "Blade Runner" },
            { name: "2001: A Space Odyssey" },
            { name: "Back to the Future" },
            { name: "The Matrix" },
            { name: "Alien" },
            { name: "E.T. the Extra-Terrestrial" },
            { name: "Star Wars" },
            { name: "Jurassic Park" },
            { name: "Arrival" },
            { name: "Aliens" },
            { name: "Interstellar" },
            { name: "The Terminator" },
        ],
    },
    {
        audience: "romance",
        titles: [
            { name: "Casablanca" },
            { name: "Titanic" },
            { name: "When Harry Met Sally..." },
            { name: "Before Sunrise" },
            { name: "Eternal Sunshine of the Spotless Mind" },
            { name: "Pride & Prejudice", year: 2005 },
            { name: "Notting Hill" },
            { name: "The Notebook" },
            { name: "La La Land" },
            { name: "Roman Holiday" },
            { name: "Dirty Dancing" },
        ],
    },
    {
        audience: "crime",
        titles: [
            { name: "The Godfather" },
            { name: "Pulp Fiction" },
            { name: "Goodfellas" },
            { name: "The Silence of the Lambs" },
            { name: "Se7en" },
            { name: "Heat", year: 1995 },
            { name: "The Departed" },
            { name: "No Country for Old Men" },
            { name: "The Usual Suspects" },
            { name: "Oldboy", year: 2003 },
            { name: "Zodiac" },
            { name: "Scarface", year: 1983 },
        ],
    },
    {
        audience: "drama",
        titles: [
            { name: "The Shawshank Redemption" },
            { name: "12 Angry Men" },
            { name: "One Flew Over the Cuckoo's Nest" },
            { name: "Schindler's List" },
            { name: "Forrest Gump" },
            { name: "Good Will Hunting" },
            { name: "Parasite" },
            { name: "Cinema Paradiso" },
            { name: "Dead Poets Society" },
            { name: "The Pursuit of Happyness" },
            { name: "Rain Man" },
        ],
    },
    {
        audience: "animation",
        titles: [
            { name: "The Lion King", year: 1994 },
            { name: "Spirited Away" },
            { name: "Toy Story" },
            { name: "My Neighbor Totoro" },
            { name: "Shrek" },
            { name: "WALL·E" },
            { name: "Spider-Man: Into the Spider-Verse" },
            { name: "Finding Nemo" },
            { name: "Coco" },
            { name: "Up" },
            { name: "The Incredibles" },
            { name: "Grave of the Fireflies" },
            { name: "How to Train Your Dragon" },
        ],
    },
    {
        audience: "fantasy",
        titles: [
            { name: "The Lord of the Rings: The Fellowship of the Ring" },
            { name: "Harry Potter and the Philosopher's Stone" },
            { name: "Raiders of the Lost Ark" },
            { name: "Pirates of the Caribbean: The Curse of the Black Pearl" },
            { name: "The Princess Bride" },
            { name: "Avatar", year: 2009 },
            { name: "The Wizard of Oz" },
            { name: "Pan's Labyrinth" },
        ],
    },
    {
        audience: "western",
        titles: [
            { name: "The Good, the Bad and the Ugly" },
            { name: "Once Upon a Time in the West" },
            { name: "Django Unchained" },
            { name: "Unforgiven" },
            { name: "High Noon" },
            { name: "True Grit", year: 2010 },
            { name: "Butch Cassidy and the Sundance Kid" },
        ],
    },
    {
        audience: "war",
        titles: [
            { name: "Saving Private Ryan" },
            { name: "Apocalypse Now" },
            { name: "Full Metal Jacket" },
            { name: "Braveheart" },
            { name: "The Pianist" },
            { name: "1917" },
            { name: "Platoon" },
        ],
    },
    {
        audience: "music",
        titles: [
            { name: "Whiplash", year: 2014 },
            { name: "The Sound of Music" },
            { name: "Grease" },
            { name: "Singin' in the Rain" },
            { name: "Bohemian Rhapsody" },
            { name: "The Greatest Showman" },
        ],
    },
    {
        audience: "world",
        titles: [
            { name: "Seven Samurai" },
            { name: "Amélie" },
            { name: "City of God" },
            { name: "Life Is Beautiful" },
            { name: "The Intouchables" },
            { name: "Crouching Tiger, Hidden Dragon" },
            { name: "3 Idiots" },
            { name: "Central Station" },
        ],
    },
    {
        audience: "tv",
        titles: [
            { name: "Breaking Bad" },
            { name: "Friends" },
            { name: "The Office" },
            { name: "Game of Thrones" },
            { name: "Brooklyn Nine-Nine" },
            { name: "The Sopranos" },
            { name: "Stranger Things" },
            { name: "Sherlock" },
            { name: "Chernobyl" },
            { name: "Death Note" },
        ],
    },
];
function norm(s: string): string {
    return s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}
const ERAS: ((y: number) => boolean)[] = [
    (y) => y < 1980,
    (y) => y >= 1980 && y < 2000,
    (y) => y >= 2000 && y < 2012,
    (y) => y >= 2012,
];
function spreadEras(lane: Title[], offset: number): Title[] {
    const buckets = ERAS.map((test) => lane.filter((t) => test(t.year)));
    const out: Title[] = [];
    for (let round = 0; out.length < lane.length; round++) {
        for (let i = 0; i < buckets.length; i++) {
            const pick = buckets[(i + offset) % buckets.length][round];
            if (pick)
                out.push(pick);
        }
    }
    return out;
}
export function resolveSeeds(pool: Title[], limit: number): Title[] {
    const byName = new Map<string, Title[]>();
    for (const t of pool) {
        const key = norm(t.title.en);
        const bucket = byName.get(key);
        if (bucket)
            bucket.push(t);
        else
            byName.set(key, [t]);
    }
    const find = ({ name, year }: SeedEntry): Title | undefined => {
        const matches = byName.get(norm(name));
        if (!matches?.length)
            return undefined;
        if (matches.length === 1)
            return matches[0];
        const scored = [...matches].sort((a, b) => {
            if (year) {
                const d = Math.abs(a.year - year) - Math.abs(b.year - year);
                if (d !== 0)
                    return d;
            }
            return b.voteCount - a.voteCount;
        });
        return scored[0];
    };
    const lanes = TASTE_SEEDS.map((a, i) => spreadEras(a.titles.map(find).filter((t): t is Title => Boolean(t)), i));
    const out: Title[] = [];
    const used = new Set<string>();
    const depth = Math.max(...lanes.map((l) => l.length));
    for (let round = 0; round < depth && out.length < limit; round++) {
        for (const lane of lanes) {
            if (out.length >= limit)
                break;
            const pick = lane[round];
            if (pick && !used.has(pick.id)) {
                used.add(pick.id);
                out.push(pick);
            }
        }
    }
    return out;
}
