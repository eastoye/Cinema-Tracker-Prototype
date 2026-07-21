interface LoadingStateProps {
  message: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-6">
      <div className="relative w-12 h-12">
        <span className="absolute inset-0 rounded-full border-2 border-zinc-700" />
        <span className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-zinc-400 text-sm">{message}</p>
    </div>
  );
}
