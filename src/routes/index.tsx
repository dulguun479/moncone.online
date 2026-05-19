import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard } from "@/components/movie-card";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Search, Info } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";

type Movie = {
  id: string;
  title: string | null; title_en: string | null;
  description: string | null; description_en: string | null;
  genre: string; year: number;
  poster_url: string | null; backdrop_url: string | null;
  is_premium: boolean; is_featured: boolean;
};

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { t, lang } = useI18n();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>("all");

  useEffect(() => {
    supabase.from("movies").select("*").order("created_at", { ascending: false }).then(({ data }) => {
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
      const matchQuery = !q ||
        (m.title || "").toLowerCase().includes(q) ||
        (m.title_en || "").toLowerCase().includes(q);
      return matchGenre && matchQuery;
    });
  }, [movies, genre, query]);

  return (
    <div className="pb-16">
      {hero && (
        <section className="relative h-[70vh] min-h-[420px] w-full overflow-hidden">
          {hero.backdrop_url || hero.poster_url ? (
            <img src={hero.backdrop_url || hero.poster_url!} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div className="hero-mask absolute inset-0" />
          <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end gap-4 px-4 pb-16 sm:px-6">
            <span className="text-xs uppercase tracking-widest text-primary">{t("common.featured")}</span>
            <h1 className="max-w-2xl text-4xl font-bold sm:text-6xl">{pickLocalized(hero, lang).title}</h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">{pickLocalized(hero, lang).description}</p>
            <div className="flex gap-3 pt-2">
              <Button asChild size="lg" className="gap-2">
                <Link to="/movie/$id" params={{ id: hero.id }}><Play className="h-5 w-5 fill-current" /> {t("common.play")}</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="gap-2">
                <Link to="/movie/$id" params={{ id: hero.id }}><Info className="h-5 w-5" /> {t("common.related")}</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="sticky top-16 z-20 -mx-4 flex flex-col gap-3 border-b border-border/40 bg-background/80 px-4 py-4 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:px-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("common.search")}
              className="pl-9"
            />
          </div>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allGenres")}</SelectItem>
              {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="pt-6"><AdSlot placement="home" /></div>


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
            {filtered.map((m) => <MovieCard key={m.id} movie={m} />)}
          </div>
          {filtered.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">Кино олдсонгүй</p>
          )}
        </div>
      </section>
    </div>
  );
}
