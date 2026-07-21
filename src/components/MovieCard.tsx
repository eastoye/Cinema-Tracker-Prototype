import { MapPin, Star, ExternalLink } from "lucide-react";
import type { CinemaShowing } from "../api/cinema";

interface MovieCardProps {
  showing: CinemaShowing;
}

const FORMAT_LABELS: Record<string, string> = {
  Standard: "",
  "3D": "3D",
  IMAX: "IMAX",
  IMAX3D: "IMAX 3D",
  Other: "",
};

function formatBadge(format: string): string | null {
  const label = FORMAT_LABELS[format] ?? format;
  return label || null;
}

export function MovieCard({ showing }: MovieCardProps) {
  // Group showtimes by format for display
  const byFormat = new Map<string, string[]>();
  for (const st of showing.showtimes) {
    const existing = byFormat.get(st.format) ?? [];
    existing.push(st.time);
    byFormat.set(st.format, existing);
  }

  return (
    <article className="flex gap-3 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors">
      {/* Poster */}
      <div className="w-20 flex-shrink-0 bg-zinc-800 self-stretch">
        {showing.poster ? (
          <img
            src={showing.poster}
            alt={showing.movieTitle}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full min-h-[7.5rem] flex items-center justify-center text-zinc-600">
            <span className="text-2xl select-none">🎬</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 py-3 pr-3 min-w-0">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-zinc-100 text-sm leading-snug truncate">
              {showing.movieTitle}
            </h2>
            <p className="text-zinc-500 text-xs mt-0.5">{showing.movieYear}</p>
          </div>
          <div className="flex items-center gap-1 bg-amber-500/15 text-amber-400 rounded-md px-1.5 py-0.5 flex-shrink-0">
            <Star className="w-3 h-3 fill-amber-400" />
            <span className="text-xs font-semibold">{showing.traktRating}</span>
          </div>
        </div>

        {/* Cinema & distance */}
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs mt-2.5">
          <MapPin className="w-3 h-3 flex-shrink-0 text-zinc-500" />
          <span className="truncate">{showing.cinemaName}</span>
          <span className="text-zinc-600 flex-shrink-0">· {showing.distanceMiles} mi</span>
        </div>

        {/* Showtimes grouped by format */}
        <div className="mt-2 space-y-1.5">
          {[...byFormat.entries()].map(([format, times]) => (
            <div key={format} className="flex flex-wrap items-center gap-1">
              {formatBadge(format) && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-800 rounded px-1 py-0.5">
                  {formatBadge(format)}
                </span>
              )}
              {times.map((t) => (
                <span
                  key={t}
                  className="text-xs text-zinc-300 bg-zinc-800 rounded px-1.5 py-0.5"
                >
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Booking link */}
        {showing.bookingLink && (
          <a
            href={showing.bookingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            Book tickets
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </article>
  );
}
