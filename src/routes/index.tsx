import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard } from "@/components/movie-card";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Search, Info } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";

type Movie = {
  id: string;
  title: string | null;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  genre: string;
  year: number;
  poster_url: string | null;
  backdrop_url: string | null;
  is_premium: boolean;
  is_featured: boolean;
};

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { t, lang } = useI18n();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setMovies((data as Movie[]) ?? []);
      });
  }, []);

  const genres = useMemo(() => Array.from(new Set(movies.map((m) => m.genre))).sort(), [movies]);
  const featured = movies.filter((m) => m.is_featured);
  const hero = featured[0];

  const filtered = useMemo(() => {
    return movies.filter((m) => {
      const matchGenre = genre === "all" || m.genre === genre;
      const q = query.trim().toLowerCase();
      const matchQuery =
        !q ||
        (m.title || "").toLowerCase().includes(q) ||
        (m.title_en || "").toLowerCase().includes(q);
      return matchGenre && matchQuery;
    });
  }, [movies, genre, query]);

  return (
    <div className="pb-16">
      {hero && (
        <section className="relative h-[80vh] min-h-[500px] w-full overflow-hidden flex items-end">
          {/* Zooming background cover */}
          {hero.backdrop_url || hero.poster_url ? (
            <img
              src={hero.backdrop_url || hero.poster_url!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transform scale-102 transition-transform duration-[10s] ease-out animate-pulse"
              style={{ animationDuration: '8s' }}
            />
          ) : null}
          
          <div className="hero-mask absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 md:pb-28">
            <div className="max-w-3xl space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary shadow-sm shadow-primary/10">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                <span>{t("common.featured")}</span>
              </span>
              
              <h1 className="font-display text-5xl font-bold uppercase tracking-wide sm:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-zinc-300 drop-shadow-lg leading-[0.9] pb-2">
                {pickLocalized(hero, lang).title}
              </h1>
              
              <p className="max-w-2xl text-sm sm:text-lg text-zinc-300 leading-relaxed font-normal drop-shadow-sm">
                {pickLocalized(hero, lang).description}
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <Button 
                  asChild 
                  size="lg" 
                  className="gap-2.5 bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg shadow-primary/20 hover:shadow-primary/45 hover:scale-[1.03] transition-all duration-300 rounded-xl"
                >
                  <Link to="/movie/$id" params={{ id: hero.id }}>
                    <Play className="h-5 w-5 fill-current" /> 
                    <span>{t("common.play")}</span>
                  </Link>
                </Button>
                
                <Button 
                  asChild 
                  size="lg" 
                  variant="secondary" 
                  className="gap-2.5 bg-secondary/50 hover:bg-secondary/80 border border-white/5 hover:scale-[1.03] transition-all duration-300 rounded-xl glass-card text-white font-semibold"
                >
                  <Link to="/movie/$id" params={{ id: hero.id }}>
                    <Info className="h-5 w-5" /> 
                    <span>{t("common.related")}</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="sticky top-20 z-20 my-6 flex flex-col gap-3 rounded-2xl border border-white/5 bg-card/65 px-4 py-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:flex-row sm:items-center glass-card">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("common.search")}
              className="pl-10 bg-black/20 border-white/5 focus-visible:ring-primary/45 rounded-xl placeholder:text-muted-foreground/60"
            />
          </div>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="sm:w-56 bg-black/20 border-white/5 focus:ring-primary/45 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background/95 backdrop-blur-md border-white/10 rounded-xl">
              <SelectItem value="all">{t("common.allGenres")}</SelectItem>
              {genres.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="pt-6">
          <AdSlot placement="home" />
        </div>

        {featured.length > 1 && query === "" && genre === "all" && (
          <div className="pt-8">
            <h2 className="mb-4 text-2xl font-bold">{t("common.trending")}</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hidden">
              {featured.map((m) => (
                <div key={m.id} className="w-[180px] flex-shrink-0 sm:w-[200px]">
                  <MovieCard movie={m} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-8">
          <h2 className="mb-4 text-2xl font-bold">{t("nav.movies")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">Кино олдсонгүй</p>
          )}
        </div>
      </section>
    </div>
  );
}
