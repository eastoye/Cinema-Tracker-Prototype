import { Clapperboard } from "lucide-react";

interface EmptyStateProps {
  radiusMiles: number;
}

export function EmptyState({ radiusMiles }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
        <Clapperboard className="w-7 h-7 text-zinc-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-zinc-200 font-semibold mb-2">Nothing showing nearby</h3>
      <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
        None of your highly rated films are currently showing within{" "}
        <span className="text-zinc-400">{radiusMiles} miles</span>. Cinema
        listings update daily — check back later or try a wider radius.
      </p>
    </div>
  );
}
