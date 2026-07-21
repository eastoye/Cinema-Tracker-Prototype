import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MG_BASE = "https://api-gate2.movieglu.com";
const TERRITORY = "UK";
const API_VERSION = "v201";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Strip articles, lower-case, remove non-alphanumeric for fuzzy title matching. */
function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Build the standard MovieGlu request headers. */
function mgHeaders(
  client: string,
  apiKey: string,
  auth: string,
  lat: number,
  lng: number,
  datetime: string,
): Record<string, string> {
  // geo must be lat;lng with up to 6 decimal places
  const geo = `${lat.toFixed(6)};${lng.toFixed(6)}`;
  return {
    client,
    "x-api-key": apiKey,
    Authorization: auth,
    territory: TERRITORY,
    "api-version": API_VERSION,
    geolocation: geo,
    "device-datetime": datetime,
    "Content-Type": "application/json",
  };
}

interface TraktFilm {
  title: string;
  year: number;
  rating: number;
  imdbId?: string | null;
  poster?: string | null;
}

interface ShowtimeEntry {
  time: string;
  format: string;
}

interface ShowingResult {
  movieTitle: string;
  movieYear: number;
  traktRating: number;
  poster: string | null;
  cinemaName: string;
  distanceMiles: number;
  showtimes: ShowtimeEntry[];
  bookingLink?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Verify credentials are configured before doing any other work
  const client = Deno.env.get("MOVIEGLU_CLIENT");
  const apiKey = Deno.env.get("MOVIEGLU_API_KEY");
  const auth = Deno.env.get("MOVIEGLU_AUTH");

  if (!client || !apiKey || !auth) {
    return jsonResp({ error: "Cinema listings provider not configured" }, 503);
  }

  // Parse request body
  let lat: number, lng: number, radiusMiles: number, films: TraktFilm[], date: string;
  try {
    const body = await req.json();
    lat = Number(body.lat);
    lng = Number(body.lng);
    radiusMiles = Number(body.radiusMiles ?? 10);
    films = Array.isArray(body.films) ? body.films : [];
    date = String(body.date); // YYYY-MM-DD
  } catch {
    return jsonResp({ error: "Invalid request body" }, 400);
  }

  if (!lat || !lng || !date || films.length === 0) {
    return jsonResp({ error: "Missing required fields" }, 400);
  }

  // device-datetime: ISO 8601 without timezone offset, milliseconds optional
  const datetime = new Date().toISOString().replace("Z", "");
  const hdrs = mgHeaders(client, apiKey, auth, lat, lng, datetime);

  // ── Step 1: Films now showing ────────────────────────────────────────────────
  let nowShowingRes: Response;
  try {
    nowShowingRes = await fetch(`${MG_BASE}/filmsNowShowing/?n=25`, { headers: hdrs });
  } catch {
    return jsonResp({ error: "Cinema listings unavailable" }, 502);
  }

  if (!nowShowingRes.ok) {
    return jsonResp({ error: "Cinema listings unavailable" }, 502);
  }

  const nowShowingData = await nowShowingRes.json();
  const nowShowingFilms: Array<{
    film_id: number;
    film_name: string;
    imdb_title_id?: string;
  }> = nowShowingData.films ?? [];

  if (nowShowingFilms.length === 0) {
    return jsonResp({ showings: [] });
  }

  // Build lookup tables for matching
  const byNormTitle = new Map<string, { film_id: number; film_name: string; imdb_title_id?: string }>();
  const byImdb = new Map<string, { film_id: number; film_name: string }>();

  for (const f of nowShowingFilms) {
    byNormTitle.set(normalizeTitle(f.film_name), f);
    if (f.imdb_title_id) byImdb.set(f.imdb_title_id, f);
  }

  // ── Step 2: Match Trakt films against the now-showing list ───────────────────
  type Candidate = { traktFilm: TraktFilm; filmId: number; confirmed: boolean };
  const candidates: Candidate[] = [];

  for (const tf of films) {
    // Primary: IMDb ID (stable, exact)
    if (tf.imdbId) {
      const match = byImdb.get(tf.imdbId);
      if (match) {
        candidates.push({ traktFilm: tf, filmId: match.film_id, confirmed: true });
        continue;
      }
    }
    // Fallback: normalized title
    const match = byNormTitle.get(normalizeTitle(tf.title));
    if (match) {
      candidates.push({ traktFilm: tf, filmId: match.film_id, confirmed: false });
    }
  }

  if (candidates.length === 0) {
    return jsonResp({ showings: [] });
  }

  // ── Step 3: Get showtimes for each candidate in parallel ────────────────────
  const showings: ShowingResult[] = [];

  await Promise.all(
    candidates.map(async ({ traktFilm, filmId, confirmed }) => {
      let stRes: Response;
      try {
        stRes = await fetch(
          `${MG_BASE}/filmShowTimes/?film_id=${filmId}&date=${date}&n=10`,
          { headers: hdrs },
        );
      } catch {
        return;
      }
      if (!stRes.ok) return;

      let stData: {
        film?: { film_name?: string; imdb_title_id?: string };
        cinemas?: Array<{
          cinema_id: number;
          cinema_name: string;
          distance: number;
          showings: Record<string, { times?: Array<{ start_time: string }> }>;
        }>;
      };
      try {
        stData = await stRes.json();
      } catch {
        return;
      }

      // For speculative title matches: verify IMDb ID from the filmShowTimes response.
      // If both sides have an IMDb ID and they disagree, discard — wrong film.
      if (!confirmed && traktFilm.imdbId && stData.film?.imdb_title_id) {
        if (stData.film.imdb_title_id !== traktFilm.imdbId) return;
      }

      const cinemas = stData.cinemas ?? [];

      for (const cinema of cinemas) {
        const distMi = cinema.distance;
        if (distMi > radiusMiles) continue;

        // Collect all showtimes across all format buckets
        const showtimes: ShowtimeEntry[] = [];
        for (const [format, bucket] of Object.entries(cinema.showings ?? {})) {
          for (const t of bucket.times ?? []) {
            showtimes.push({ time: t.start_time, format });
          }
        }
        if (showtimes.length === 0) continue;

        showtimes.sort((a, b) => a.time.localeCompare(b.time));

        showings.push({
          movieTitle: stData.film?.film_name ?? traktFilm.title,
          movieYear: traktFilm.year,
          traktRating: traktFilm.rating,
          poster: traktFilm.poster ?? null,
          cinemaName: cinema.cinema_name,
          distanceMiles: Math.round(distMi * 10) / 10,
          showtimes,
        });
      }
    }),
  );

  // Sort by distance then title
  showings.sort((a, b) =>
    a.distanceMiles !== b.distanceMiles
      ? a.distanceMiles - b.distanceMiles
      : a.movieTitle.localeCompare(b.movieTitle),
  );

  return jsonResp({ showings });
});
