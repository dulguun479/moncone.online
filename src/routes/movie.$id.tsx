import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { MovieCard } from "@/components/movie-card";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Play } from "lucide-react";

type Movie = {
  id: string; title: string | null; title_en: string | null;
  description: string | null; description_en: string | null;
  genre: string; year: number; duration_min: number | null;
  cast_list: string | null; director: string | null;
  poster_url: string | null; backdrop_url: string | null;
  video_url: string | null; is_premium: boolean; is_featured: boolean;
};

export const Route = createFileRoute("/movie/$id")({ component: MovieDetail });

function MovieDetail() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const { user, tier } = useAuth();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [related, setRelated] = useState<Movie[]>([]);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    supabase.from("movies").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setMovie(data as Movie | null);
      if (data) {
        supabase
          .from("movies").select("*").eq("genre", (data as Movie).genre).neq("id", id).limit(12)
          .then(({ data: rel }) => setRelated((rel as Movie[]) ?? []));
      }
    });
  }, [id]);

  if (!movie) return <div className="p-16 text-center text-muted-foreground">…</div>;

  const { title, description } = pickLocalized(movie, lang);
  const locked = movie.is_premium && tier !== "premium";
  const canPlay = user && !locked && movie.video_url;

  return (
    <div className="pb-16">
      <div className="relative">
        {playing && canPlay ? (
          <div className="aspect-video w-full bg-black">
            <video src={movie.video_url!} controls autoPlay className="h-full w-full" />
          </div>
        ) : (
          <div className="relative h-[60vh] min-h-[360px] w-full overflow-hidden">
            {movie.backdrop_url || movie.poster_url ? (
              <img src={movie.backdrop_url || movie.poster_url!} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <div className="hero-mask absolute inset-0" />
          </div>
        )}
      </div>

      <section className="mx-auto -mt-24 max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 rounded-lg border border-border/40 bg-card/80 p-6 backdrop-blur sm:flex-row">
          {movie.poster_url && (
            <img src={movie.poster_url} alt={title} className="hidden h-64 w-44 rounded-md object-cover sm:block" style={{ boxShadow: "var(--shadow-poster)" }} />
          )}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{movie.year}</span>
              <span className="rounded-sm bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{movie.genre}</span>
              {movie.duration_min && (
                <span className="rounded-sm bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{movie.duration_min} {t("common.min")}</span>
              )}
              {movie.is_premium ? (
                <span className="inline-flex items-center gap-1 rounded-sm bg-premium px-2 py-0.5 text-xs font-semibold text-premium-foreground"><Crown className="h-3 w-3" /> {t("common.premium")}</span>
              ) : (
                <span className="rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t("common.free")}</span>
              )}
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {movie.director && <p><span className="text-muted-foreground">{t("common.director")}: </span>{movie.director}</p>}
              {movie.cast_list && <p><span className="text-muted-foreground">{t("common.cast")}: </span>{movie.cast_list}</p>}
            </div>
            <div className="pt-2">
              {!user ? (
                <Button onClick={() => navigate({ to: "/login" })}>{t("nav.login")}</Button>
              ) : locked ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> {t("premium.locked")}</span>
                  <Button asChild><Link to="/profile">{t("common.subscribe")}</Link></Button>
                </div>
              ) : (
                <Button size="lg" className="gap-2" onClick={() => setPlaying(true)} disabled={!movie.video_url}>
                  <Play className="h-5 w-5 fill-current" /> {t("common.play")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6">
          <h2 className="mb-4 text-xl font-bold">{t("common.related")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {related.map((m) => <MovieCard key={m.id} movie={m} />)}
          </div>
        </section>
      )}
    </div>
  );
}
