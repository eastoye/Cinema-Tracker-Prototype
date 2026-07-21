import { useState, useCallback } from "react";
import { getNearbyShowings, type CinemaShowing } from "../api/cinema";
import type { RatedMovie } from "../api/trakt";
import type { UserLocation } from "./useLocation";

export type CinemaStatus = "idle" | "searching" | "ready" | "error";

export const RADIUS_OPTIONS = [5, 10, 15, 25] as const;
export type RadiusMiles = (typeof RADIUS_OPTIONS)[number];

export interface UseCinemaReturn {
  status: CinemaStatus;
  showings: CinemaShowing[];
  error: string | null;
  radiusMiles: RadiusMiles;
  search: (movies: RatedMovie[], location: UserLocation, radius?: RadiusMiles) => void;
  setRadius: (r: RadiusMiles) => void;
}

export function useCinema(): UseCinemaReturn {
  const [status, setStatus] = useState<CinemaStatus>("idle");
  const [showings, setShowings] = useState<CinemaShowing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(10);

  const search = useCallback(
    async (movies: RatedMovie[], location: UserLocation, radius?: RadiusMiles) => {
      // Prevent concurrent searches
      if (status === "searching") return;

      const r = radius ?? radiusMiles;

      if (movies.length === 0) {
        setShowings([]);
        setStatus("ready");
        return;
      }

      setStatus("searching");
      setError(null);

      try {
        const results = await getNearbyShowings(movies, location.lat, location.lng, r);
        setShowings(results);
        setStatus("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Cinema search failed.");
        setStatus("error");
      }
    },
    [status, radiusMiles],
  );

  const setRadius = useCallback((r: RadiusMiles) => {
    setRadiusMiles(r);
  }, []);

  return { status, showings, error, radiusMiles, search, setRadius };
}
