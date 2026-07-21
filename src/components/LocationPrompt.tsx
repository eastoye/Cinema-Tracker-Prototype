import { MapPin, AlertCircle } from "lucide-react";
import type { LocationStatus } from "../hooks/useLocation";

interface LocationPromptProps {
  status: LocationStatus;
  error: string | null;
  movieCount: number;
  onRequest: () => void;
}

export function LocationPrompt({ status, error, movieCount, onRequest }: LocationPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-5">
        <MapPin className="w-7 h-7 text-sky-400" strokeWidth={1.5} />
      </div>

      <h2 className="text-lg font-semibold text-zinc-100 mb-2">
        Found {movieCount} film{movieCount !== 1 ? "s" : ""} you'll love
      </h2>
      <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-6">
        Allow location access so we can check what's playing at cinemas near you.
      </p>

      {error && (
        <div className="w-full max-w-xs bg-red-950/50 border border-red-800/50 rounded-lg px-4 py-3 mb-5 flex items-start gap-2 text-red-400 text-sm text-left">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={onRequest}
        disabled={status === "requesting"}
        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
      >
        {status === "requesting" ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Requesting…
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4" />
            Use my location
          </>
        )}
      </button>
    </div>
  );
}
