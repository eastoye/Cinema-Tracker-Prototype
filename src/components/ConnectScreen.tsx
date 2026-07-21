import { Film } from "lucide-react";

interface ConnectScreenProps {
  onConnect: () => void;
  error: string | null;
  isExchanging: boolean;
}

export function ConnectScreen({ onConnect, error, isExchanging }: ConnectScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
        <Film className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
      </div>

      <h1 className="text-2xl font-bold text-zinc-100 mb-2">Cinema Tracker</h1>
      <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-8">
        Connect your Trakt account to see which films you love are playing at
        cinemas near you right now.
      </p>

      {error && (
        <div className="w-full max-w-xs bg-red-950/50 border border-red-800/50 rounded-lg px-4 py-3 mb-6 text-left">
          <p className="text-red-400 text-sm font-semibold mb-1">OAuth Error (diagnostic)</p>
          <pre className="text-red-300 text-xs whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto">{error}</pre>
        </div>
      )}

      <button
        onClick={onConnect}
        disabled={isExchanging}
        className="flex items-center gap-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm px-6 py-3 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
      >
        {isExchanging ? (
          <>
            <span className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            <TraktIcon />
            Connect with Trakt
          </>
        )}
      </button>

      <p className="text-zinc-600 text-xs mt-6 max-w-xs">
        You'll be redirected to Trakt to log in. We never see your password.
      </p>
    </div>
  );
}

function TraktIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.5 7.5l-1.5 1.5-2-2-5 5 2 2-1.5 1.5L7 13l-1.5 1.5L4 13l3-3-1.5-1.5L7 7l1.5 1.5 5-5L15 5l1.5-1.5L18 5l-1.5 1.5 1 1z" />
    </svg>
  );
}
