// Trakt API integration
// Setup: register your app at https://trakt.tv/oauth/applications
// Required env vars:
//   VITE_TRAKT_CLIENT_ID  — your Trakt app's Client ID
//   VITE_TRAKT_REDIRECT_URI — must match exactly what you set in the Trakt app settings
//                             e.g. http://localhost:5173/callback for local dev

const TRAKT_CLIENT_ID = import.meta.env.VITE_TRAKT_CLIENT_ID as string;
const TRAKT_REDIRECT_URI = import.meta.env.VITE_TRAKT_REDIRECT_URI as string;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const TRAKT_API_BASE = "https://api.trakt.tv";
const TOKEN_STORAGE_KEY = "cinema_tracker_trakt_token";

export interface TraktToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
}

export interface RatedMovie {
  title: string;
  year: number;
  traktId: number;
  slug: string;
  rating: number;
  tmdbId: number | null;
  imdbId: string | null;
  poster: string | null;
}

/** Build the Trakt OAuth authorization URL. Redirects the browser to Trakt's login page. */
export function getTraktAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: TRAKT_CLIENT_ID,
    redirect_uri: TRAKT_REDIRECT_URI,
  });
  return `https://trakt.tv/oauth/authorize?${params.toString()}`;
}

/** Exchange an authorization code for an access token via the Supabase edge function.
 *  The client secret never touches the browser — it lives only in the edge function. */
export async function exchangeCodeForToken(code: string): Promise<TraktToken> {
  const endpoint = `${SUPABASE_URL}/functions/v1/trakt-token-exchange`;

  let rawBody = "";
  let status = 0;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ code, redirect_uri: TRAKT_REDIRECT_URI, clientId: TRAKT_CLIENT_ID }),
    });

    status = response.status;
    rawBody = await response.text();

    const parsed = (() => { try { return JSON.parse(rawBody); } catch { return {}; } })();

    if (!response.ok) {
      throw new Error(
        `Token exchange failed [${status}] clientIdMatches=${parsed.clientIdMatches ?? "unknown"} — ${parsed.error ?? rawBody}`
      );
    }

    console.log("[trakt-diag] clientIdMatches:", parsed.clientIdMatches);
    return parsed as TraktToken;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Token exchange")) throw e;
    throw new Error(
      `Token exchange error [${status}] — ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/** Persist token to localStorage. */
export function saveToken(token: TraktToken): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
}

/** Load token from localStorage. */
export function loadToken(): TraktToken | null {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TraktToken;
  } catch {
    return null;
  }
}

/** Remove token from localStorage. */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Fetch all movies the user has rated, filtered to rating > 6. */
export async function getRatedMovies(token: TraktToken): Promise<RatedMovie[]> {
  const response = await fetch(`${TRAKT_API_BASE}/users/me/ratings/movies`, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Trakt ratings fetch failed: ${response.status}`);
  }

  const data = await response.json();

  const filtered: RatedMovie[] = (data as TraktRatingItem[])
    .filter((item) => item.rating > 6)
    .map((item) => ({
      title: item.movie.title,
      year: item.movie.year,
      traktId: item.movie.ids.trakt,
      slug: item.movie.ids.slug,
      rating: item.rating,
      tmdbId: item.movie.ids.tmdb ?? null,
      imdbId: item.movie.ids.imdb ?? null,
      poster: null, // posters are fetched separately via TMDB if configured
    }));

  return filtered;
}

/** Fetch a TMDB poster URL for a movie given its TMDB id.
 *  Requires VITE_TMDB_API_KEY in .env — optional, posters are shown when available. */
export async function fetchPoster(tmdbId: number): Promise<string | null> {
  const tmdbKey = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
  if (!tmdbKey || !tmdbId) return null;

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbKey}&append_to_response=images`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.poster_path) {
      return `https://image.tmdb.org/t/p/w342${data.poster_path}`;
    }
    return null;
  } catch {
    return null;
  }
}

// Internal shape returned by the Trakt ratings endpoint
interface TraktRatingItem {
  rating: number;
  rated_at: string;
  type: string;
  movie: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
  };
}
