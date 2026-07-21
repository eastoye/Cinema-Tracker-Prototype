import { useState, useEffect, useCallback, useRef } from "react";
import {
  getTraktAuthUrl,
  exchangeCodeForToken,
  getRatedMovies,
  fetchPoster,
  saveToken,
  loadToken,
  clearToken,
  type TraktToken,
  type RatedMovie,
} from "../api/trakt";

const OAUTH_CODE_KEY = "cinema_tracker_oauth_code";
const PROCESSED_CODES_KEY = "cinema_tracker_processed_codes";

export type TraktStatus =
  | "idle"
  | "exchanging"
  | "fetching"
  | "ready"
  | "error";

export interface UseTraktReturn {
  status: TraktStatus;
  error: string | null;
  movies: RatedMovie[];
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useTrakt(): UseTraktReturn {
  const [status, setStatus] = useState<TraktStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [movies, setMovies] = useState<RatedMovie[]>([]);
  const [token, setToken] = useState<TraktToken | null>(loadToken);
  const popupRef = useRef<Window | null>(null);

  const fetchMovies = useCallback(async (t: TraktToken) => {
    setStatus("fetching");
    setError(null);
    try {
      const rated = await getRatedMovies(t);
      setMovies(rated);
      setStatus("ready");

      // Enrich with posters in the background
      const withPosters = await Promise.all(
        rated.map(async (m) => {
          if (!m.tmdbId) return m;
          const poster = await fetchPoster(m.tmdbId);
          return { ...m, poster };
        })
      );
      setMovies(withPosters);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch ratings");
      setStatus("error");
    }
  }, []);

  const handleCode = useCallback(
    (code: string) => {
      // Deduplicate: ignore codes that have already been exchanged this session
      const processed = new Set<string>(
        JSON.parse(sessionStorage.getItem(PROCESSED_CODES_KEY) ?? "[]")
      );
      if (processed.has(code)) return;
      processed.add(code);
      sessionStorage.setItem(PROCESSED_CODES_KEY, JSON.stringify([...processed]));

      setStatus("exchanging");
      setError(null);
      exchangeCodeForToken(code)
        .then((t) => {
          saveToken(t);
          setToken(t);
          return fetchMovies(t);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "OAuth exchange failed");
          setStatus("error");
        });
    },
    [fetchMovies]
  );

  // Case 1: this page IS the OAuth callback (opened directly, not in a popup).
  // Read code into a local variable, immediately strip it from the URL,
  // then either signal the opener or exchange directly.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    // Remove code and state from URL immediately before any async work
    window.history.replaceState({}, "", window.location.pathname);

    if (window.opener) {
      // Running inside the popup — signal the opener and close
      localStorage.setItem(OAUTH_CODE_KEY, code);
      window.close();
    } else {
      // Redirect landed in the main window (e.g. mobile where popups are blocked)
      handleCode(code);
    }
  }, [handleCode]);

  // Case 2: listen for the popup writing the code to localStorage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== OAUTH_CODE_KEY || !e.newValue) return;
      localStorage.removeItem(OAUTH_CODE_KEY);
      popupRef.current?.close();
      popupRef.current = null;
      handleCode(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [handleCode]);

  // If a token was already stored, fetch movies automatically
  useEffect(() => {
    if (token && status === "idle") {
      fetchMovies(token);
    }
  }, [token, status, fetchMovies]);

  const connect = useCallback(() => {
    const url = getTraktAuthUrl();
    const width = 520;
    const height = 640;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open(
      url,
      "trakt_oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
    if (!popup) {
      // Popup was blocked — fall back to full redirect
      window.location.href = url;
      return;
    }
    popupRef.current = popup;
  }, []);

  const disconnect = useCallback(() => {
    clearToken();
    setToken(null);
    setMovies([]);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    status,
    error,
    movies,
    isConnected: token !== null,
    connect,
    disconnect,
  };
}
