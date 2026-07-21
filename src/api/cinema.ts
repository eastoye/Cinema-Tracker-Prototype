import type { RatedMovie } from "./trakt";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const CACHE_TTL_MS = 15 * 60 * 1000;

export interface ShowtimeEntry {
  time: string;
  format: string;
}

export interface CinemaShowing {
  movieTitle: string;
  movieYear: number;
  traktRating: number;
  poster: string | null;
  cinemaName: string;
  distanceMiles: number;
  showtimes: ShowtimeEntry[];
  bookingLink?: string;
}

interface CacheEntry {
  data: CinemaShowing[];
  ts: number;
}

function cacheKey(lat: number, lng: number, radiusMiles: number): string {
  return `cinema_cache:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusMiles}`;
}

function readCache(key: string): CinemaShowing[] | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: CinemaShowing[]): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() } satisfies CacheEntry));
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

export async function getNearbyShowings(
  movies: RatedMovie[],
  lat: number,
  lng: number,
  radiusMiles = 10,
): Promise<CinemaShowing[]> {
  const key = cacheKey(lat, lng, radiusMiles);
  const cached = readCache(key);
  if (cached) return cached;

  const today = new Date().toISOString().slice(0, 10);

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/get-cinema-showtimes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        lat,
        lng,
        radiusMiles,
        date: today,
        films: movies.map((m) => ({
          title: m.title,
          year: m.year,
          rating: m.rating,
          imdbId: m.imdbId ?? null,
          poster: m.poster ?? null,
        })),
      }),
    });
  } catch {
    throw new Error(
      "Live cinema listings could not be loaded. Check your connection and try again.",
    );
  }

  if (response.status === 503) {
    throw new Error("Live cinema listings are not available right now.");
  }

  if (!response.ok) {
    throw new Error("Could not load cinema listings. Please try again shortly.");
  }

  let body: { showings?: CinemaShowing[]; error?: string };
  try {
    body = await response.json();
  } catch {
    throw new Error("Could not load cinema listings. Please try again shortly.");
  }

  if (body.error) {
    throw new Error("Could not load cinema listings. Please try again shortly.");
  }

  const showings = body.showings ?? [];
  writeCache(key, showings);
  return showings;
}
