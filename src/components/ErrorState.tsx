import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-950/50 border border-red-800/50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-zinc-200 font-semibold mb-2">Something went wrong</h3>
      <p className="text-zinc-500 text-sm max-w-xs leading-relaxed mb-5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 text-sm text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      )}
    </div>
  );
}
