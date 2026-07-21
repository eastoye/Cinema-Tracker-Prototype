import { useEffect } from "react";
import { useTrakt } from "./hooks/useTrakt";
import { useLocation } from "./hooks/useLocation";
import { useCinema, RADIUS_OPTIONS, type RadiusMiles } from "./hooks/useCinema";
import { Header } from "./components/Header";
import { ConnectScreen } from "./components/ConnectScreen";
import { LocationPrompt } from "./components/LocationPrompt";
import { LoadingState } from "./components/LoadingState";
import { EmptyState } from "./components/EmptyState";
import { ErrorState } from "./components/ErrorState";
import { MovieCard } from "./components/MovieCard";
import { RefreshCw } from "lucide-react";

export default function App() {
  const trakt = useTrakt();
  const location = useLocation();
  const cinema = useCinema();

  // Auto-search once Trakt + location are both ready
  useEffect(() => {
    if (
      trakt.status === "ready" &&
      trakt.movies.length > 0 &&
      location.status === "granted" &&
      cinema.status === "idle"
    ) {
      cinema.search(trakt.movies, location.location!);
    }
  }, [trakt.status, trakt.movies, location.status, location.location, cinema]);

  const handleRadiusChange = (r: RadiusMiles) => {
    cinema.setRadius(r);
    if (location.location && trakt.movies.length > 0) {
      cinema.search(trakt.movies, location.location, r);
    }
  };

  const handleRefresh = () => {
    if (location.location && trakt.movies.length > 0) {
      cinema.search(trakt.movies, location.location, cinema.radiusMiles);
    }
  };

  const renderBody = () => {
    // Step 1: Not connected to Trakt
    if (!trakt.isConnected) {
      return (
        <ConnectScreen
          onConnect={trakt.connect}
          error={trakt.error}
          isExchanging={trakt.status === "exchanging"}
        />
      );
    }

    // Step 2: Fetching Trakt ratings
    if (trakt.status === "exchanging" || trakt.status === "fetching") {
      return <LoadingState message="Fetching your Trakt ratings…" />;
    }

    // Step 3: Trakt error
    if (trakt.status === "error") {
      return (
        <ErrorState
          message={trakt.error ?? "Failed to load Trakt data"}
          onRetry={trakt.disconnect}
        />
      );
    }

    // Step 4: Ask for location
    if (
      location.status === "idle" ||
      location.status === "requesting" ||
      location.status === "denied" ||
      location.status === "unavailable"
    ) {
      return (
        <LocationPrompt
          status={location.status}
          error={location.error}
          movieCount={trakt.movies.length}
          onRequest={location.requestLocation}
        />
      );
    }

    // Step 5: Searching cinemas
    if (cinema.status === "idle" || cinema.status === "searching") {
      return <LoadingState message="Checking current cinema listings…" />;
    }

    // Step 6: Cinema error
    if (cinema.status === "error") {
      return (
        <ErrorState
          message={cinema.error ?? "Cinema search failed."}
          onRetry={handleRefresh}
        />
      );
    }

    // Step 7: Results (including empty)
    const isSearching = cinema.status === "searching";

    return (
      <div className="px-4 pb-8">
        {/* Radius selector + result count */}
        <div className="pt-5 pb-4 flex items-center justify-between gap-3">
          <p className="text-zinc-400 text-sm">
            {cinema.showings.length > 0 ? (
              <>
                <span className="text-zinc-100 font-semibold">
                  {cinema.showings.length}
                </span>{" "}
                showing{cinema.showings.length !== 1 ? "s" : ""} from your top-rated films
              </>
            ) : (
              <span className="text-zinc-500">No matches nearby</span>
            )}
          </p>

          {/* Radius pills */}
          <div className="flex gap-1 flex-shrink-0">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => handleRadiusChange(r)}
                disabled={isSearching}
                className={[
                  "text-xs px-2 py-1 rounded-md transition-colors",
                  cinema.radiusMiles === r
                    ? "bg-amber-500/20 text-amber-400 font-semibold"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800",
                  isSearching ? "opacity-40 cursor-not-allowed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>

        {cinema.showings.length === 0 ? (
          <EmptyState radiusMiles={cinema.radiusMiles} />
        ) : (
          <>
            <div className="space-y-3">
              {cinema.showings.map((showing, i) => (
                <MovieCard
                  key={`${showing.movieTitle}-${showing.cinemaName}-${i}`}
                  showing={showing}
                />
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={isSearching}
              className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh listings
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header isConnected={trakt.isConnected} onDisconnect={trakt.disconnect} />
      <main className="max-w-lg mx-auto">{renderBody()}</main>
    </div>
  );
}
