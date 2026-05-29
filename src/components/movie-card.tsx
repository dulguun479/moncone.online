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
      className={`group relative block overflow-hidden rounded-xl bg-card border border-border/40 transition-all duration-500 hover:z-10 hover:scale-[1.05] hover:border-primary/50 ${
        movie.is_premium
          ? "hover:shadow-[var(--shadow-neon-gold)] hover:border-premium/50"
          : "hover:shadow-[var(--shadow-neon-red)]"
      }`}
      style={{ boxShadow: "var(--shadow-poster)" }}
    >
      <div className="aspect-[2/3] w-full overflow-hidden relative">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) group-hover:scale-110 group-hover:brightness-[0.85]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <Play className="h-10 w-10 text-primary animate-pulse" />
          </div>
        )}
        
        {/* Dynamic premium glowing backdrop hover flash */}
        <div className="absolute inset-0 opacity-0 bg-radial-gradient(circle, transparent 50%, oklch(0 0 0 / 0.4) 100%) transition-opacity duration-500 group-hover:opacity-100" />
      </div>
      
      {movie.is_premium && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-premium/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-premium-foreground shadow-lg shadow-premium/20 backdrop-blur-sm border border-premium/30 animate-pulse">
          <Crown className="h-2.5 w-2.5" />
          <span>VIP</span>
        </span>
      )}
      
      <div className="poster-mask absolute inset-x-0 bottom-0 p-4 transition-all duration-300 group-hover:pb-5">
        <h3 className="line-clamp-1 text-sm font-bold text-foreground group-hover:text-primary transition-colors duration-300">{title}</h3>
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase mt-0.5">
          {movie.year} · <span className="text-foreground/80">{movie.genre}</span>
        </p>
      </div>
    </Link>
  );
}
