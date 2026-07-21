import { Film, LogOut } from "lucide-react";

interface HeaderProps {
  isConnected: boolean;
  onDisconnect: () => void;
}

export function Header({ isConnected, onDisconnect }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-amber-500" strokeWidth={1.8} />
          <span className="font-semibold text-sm tracking-wide text-zinc-100">
            Cinema Tracker
          </span>
        </div>

        {isConnected && (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1.5 px-2.5 rounded-md hover:bg-zinc-800"
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect
          </button>
        )}
      </div>
    </header>
  );
}
