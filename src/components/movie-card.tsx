import { Link } from "@tanstack/react-router";
import { Crown, Play } from "lucide-react";
import { pickLocalized, useI18n } from "@/lib/i18n";

type Movie = {
  id: string;
  title: string | null;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  genre: string;
  year: number;
  poster_url: string | null;
  is_premium: boolean;
};

export function MovieCard({ movie }: { movie: Movie }) {
  const { lang } = useI18n();
  const { title } = pickLocalized(movie, lang);
  return (
    <Link
      to="/movie/$id"
      params={{ id: movie.id }}
      className="group relative block overflow-hidden rounded-md bg-card transition-transform duration-300 hover:z-10 hover:scale-[1.04]"
      style={{ boxShadow: "var(--shadow-poster)" }}
    >
      <div className="aspect-[2/3] w-full overflow-hidden">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <Play className="h-10 w-10" />
          </div>
        )}
      </div>
      {movie.is_premium && (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-sm bg-premium/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-premium-foreground">
          <Crown className="h-3 w-3" />
        </span>
      )}
      <div className="poster-mask absolute inset-x-0 bottom-0 p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-[11px] text-muted-foreground">
          {movie.year} · {movie.genre}
        </p>
      </div>
    </Link>
  );
}
