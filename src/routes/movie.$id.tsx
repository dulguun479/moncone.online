import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { MovieCard } from "@/components/movie-card";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Play } from "lucide-react";
import { AdsterraBanner } from "@/components/adsterra-banner";

type Movie = {
  id: string;
  title: string | null;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  genre: string;
  year: number;
  duration_min: number | null;
  cast_list: string | null;
  director: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  video_url: string | null;
  is_premium: boolean;
  is_featured: boolean;
};

const getSubtitleUrl = (title: string | null) => {
  if (!title) return null;
  const t = title.toLowerCase();
  if (t.includes("sintel") || t.includes("үлгэрийн лууны")) {
    return "/subtitles/sintel_mn.vtt";
  }
  if (t.includes("tears") || t.includes("ган нулимс")) {
    return "/subtitles/tears_mn.vtt";
  }
  if (t.includes("bunny") || t.includes("том чихт банни")) {
    return "/subtitles/bunny_mn.vtt";
  }
  if (t.includes("цогт тайж") || t.includes("tsogt taij")) {
    return "/subtitles/tsogt_taij_mn.vtt";
  }
  if (t.includes("тунгалаг тамир") || t.includes("tungalag tamir") || t.includes("clear tamir")) {
    return "/subtitles/tungalag_tamir_mn.vtt";
  }
  if (t.includes("ардын элч") || t.includes("ardyn elch") || t.includes("people's envoy")) {
    return "/subtitles/ardyn_elch_mn.vtt";
  }
  return null;
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
  const [hlsLoaded, setHlsLoaded] = useState(false);
  const [showAdGate, setShowAdGate] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [adPassed, setAdPassed] = useState(false);
  const [adLink, setAdLink] = useState("https://mglguide.com/the-most-beautiful-lakes-in-mongolia/");

  // Dynamically load active monetization direct ad link from Supabase
  useEffect(() => {
    supabase
      .from("ads")
      .select("link_url")
      .eq("is_active", true)
      .contains("placements", ["movie"])
      .limit(1)
      .then(({ data }) => {
        if (data && data[0]?.link_url) {
          setAdLink(data[0].link_url);
        }
      });
  }, []);

  useEffect(() => {
    if (!showAdGate) return;
    try {
      const adWindow = window.open(adLink, "_blank");
      if (adWindow) {
        adWindow.blur();
        window.focus();
      }
    } catch (e) {
      console.warn("Pop-under blocked by browser:", e);
    }
    setAdCountdown(5);
    const interval = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showAdGate, adLink]);

  useEffect(() => {
    setPlaying(false);
    supabase
      .from("movies")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setMovie(data as Movie | null);
        if (data) {
          supabase
            .from("movies")
            .select("*")
            .eq("genre", (data as Movie).genre)
            .neq("id", id)
            .limit(12)
            .then(({ data: rel }) => setRelated((rel as Movie[]) ?? []));
        }
      });
  }, [id]);

  const locked = movie ? movie.is_premium && tier !== "premium" : false;
  const canPlay = !!(movie && user && !locked && movie.video_url);

  // Dynamic HLS.js CDN loader
  useEffect(() => {
    if (playing && canPlay && movie?.video_url?.endsWith(".m3u8")) {
      if ((window as any).Hls) {
        setHlsLoaded(true);
      } else {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js";
        script.onload = () => setHlsLoaded(true);
        script.onerror = () => console.error("Failed to load hls.js CDN");
        document.head.appendChild(script);
      }
    }
  }, [playing, canPlay, movie?.video_url]);

  // Video source assignment and HLS player binding
  useEffect(() => {
    const video = document.getElementById("movie-player") as HTMLVideoElement;
    if (!video || !movie?.video_url || !playing || !canPlay) return;

    if (movie.video_url.endsWith(".m3u8")) {
      const Hls = (window as any).Hls;
      if (Hls && Hls.isSupported()) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          const token = session?.access_token;
          const hls = new Hls({
            maxMaxBufferLength: 30, // Conserve bandwidth
            xhrSetup: (xhr: any, url: string) => {
              if (url.includes("/api/public/transcode-key") && token) {
                xhr.setRequestHeader("Authorization", `Bearer ${token}`);
              }
            }
          });
          hls.loadSource(movie.video_url!);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
          });
          (video as any)._hls = hls;
        });

        return () => {
          const v = document.getElementById("movie-player") as any;
          if (v && v._hls) {
            v._hls.destroy();
            delete v._hls;
          }
        };
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native Safari HLS support
        supabase.auth.getSession().then(({ data: { session } }) => {
          const token = session?.access_token;
          if (token) {
            const urlObj = new URL(movie.video_url!, window.location.origin);
            urlObj.searchParams.set("token", token);
            video.src = urlObj.toString();
          } else {
            video.src = movie.video_url!;
          }
          video.play().catch(() => {});
        });
      }
    } else {
      // Direct MP4 URL
      video.src = movie.video_url;
      video.play().catch(() => {});
    }
  }, [playing, canPlay, hlsLoaded, movie?.video_url]);

  // Real-time Playback Engagement Analytics (GA4 + Supabase logs)
  const logPlaybackEvent = (action: string) => {
    const video = document.getElementById("movie-player") as HTMLVideoElement;
    if (!video || !movie) return;

    const currentTime = Math.round(video.currentTime);
    const duration = Math.round(video.duration || 0);

    // 1. Google Analytics 4 Custom Events
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "video_playback", {
        movie_id: movie.id,
        movie_title: movie.title || movie.title_en || "unknown",
        event_action: action,
        current_time: currentTime,
        duration: duration,
      });
    }

    // 2. Supabase Custom Log Table (fail gracefully if table isn't created yet)
    supabase
      .from("video_playback_logs")
      .insert({
        movie_id: movie.id,
        user_id: user?.id,
        event_type: action,
        current_time: currentTime,
        duration: duration,
        device_metadata: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
      })
      .then(({ error }) => {
        if (error) {
          console.warn("Supabase playback log warning (table may not exist yet):", error.message);
        }
      });
  };

  if (!movie) return <div className="p-16 text-center text-muted-foreground">…</div>;

  const { title, description } = pickLocalized(movie, lang);

  return (
    <div className="pb-16">
      <div className="relative">
        {showAdGate ? (
          <div className="aspect-video w-full bg-black flex flex-col items-center justify-center p-8 text-center relative overflow-hidden border border-white/5 shadow-2xl">
            {/* Background glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-950/20 via-zinc-950 to-amber-950/20 opacity-90" />
            
            <div className="relative z-10 max-w-md w-full px-4 flex flex-col items-center">
              {/* Circular progress loader */}
              <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                <svg className="absolute w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="var(--color-primary, #e11d48)"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - adCountdown / 5)}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="font-display text-3xl font-extrabold text-white animate-pulse">
                  {adCountdown}
                </span>
              </div>

              <h3 className="font-display text-2xl font-bold text-white uppercase tracking-wider mb-2">
                Видео ачаалж байна
              </h3>
              <p className="text-sm text-zinc-400 mb-6 font-sans">
                Ивээн тэтгэгчийн зар сурталчилгаа дуусахад кино автоматаар тоглогдож эхэлнэ.
              </p>

              <div className="flex flex-col gap-3 w-full">
                <a
                  href={adLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-3 text-sm font-semibold text-white transition-all shadow-md backdrop-blur-md"
                >
                  Зар үзэх (Шинэ цонх)
                </a>

                {adCountdown === 0 ? (
                  <Button
                    size="lg"
                    className="w-full font-bold uppercase tracking-wider animate-bounce bg-primary text-white"
                    onClick={() => {
                      setShowAdGate(false);
                      setAdPassed(true);
                      setPlaying(true);
                    }}
                  >
                    Кино үзэх
                  </Button>
                ) : (
                  <button
                    disabled
                    className="w-full inline-flex items-center justify-center rounded-xl bg-zinc-900 border border-white/5 px-5 py-3 text-sm font-semibold text-zinc-500 cursor-not-allowed"
                  >
                    Хүлээх... ({adCountdown}с)
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : playing && canPlay ? (
          <div className="aspect-video w-full bg-black">
            <video
              id="movie-player"
              controls
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              autoPlay
              preload="metadata"
              className="h-full w-full"
              onPlay={() => logPlaybackEvent("play")}
              onPause={() => logPlaybackEvent("pause")}
              onSeeked={() => logPlaybackEvent("seek")}
              onEnded={() => logPlaybackEvent("ended")}
            >
              {getSubtitleUrl(movie.title || movie.title_en) && (
                <track
                  src={getSubtitleUrl(movie.title || movie.title_en)!}
                  kind="subtitles"
                  srcLang="mn"
                  label="Монгол"
                  default
                />
              )}
            </video>
          </div>
        ) : (
          <div className="relative h-[60vh] min-h-[360px] w-full overflow-hidden">
            {movie.backdrop_url || movie.poster_url ? (
              <img
                src={movie.backdrop_url || movie.poster_url!}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div className="hero-mask absolute inset-0" />
          </div>
        )}
      </div>

      <section
        className={`mx-auto max-w-5xl px-4 sm:px-6 ${
          playing && canPlay ? "mt-6" : "-mt-24"
        } transition-all duration-300`}
      >
        <div className="flex flex-col gap-8 rounded-2xl border border-white/5 bg-card/45 p-8 backdrop-blur-2xl sm:flex-row glass-card shadow-2xl shadow-black/80 relative overflow-hidden">
          {movie.poster_url && (
            <img
              src={movie.poster_url}
              alt={title}
              className="hidden h-64 w-44 rounded-xl object-cover sm:block border border-white/5 transition-transform duration-500 hover:scale-[1.02]"
              style={{ boxShadow: "var(--shadow-poster)" }}
            />
          )}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-secondary/80 px-2.5 py-0.5 text-xs text-secondary-foreground font-semibold border border-white/5">
                {movie.year}
              </span>
              <span className="rounded-md bg-secondary/80 px-2.5 py-0.5 text-xs text-secondary-foreground font-semibold border border-white/5">
                {movie.genre}
              </span>
              {movie.duration_min && (
                <span className="rounded-md bg-secondary/80 px-2.5 py-0.5 text-xs text-secondary-foreground font-semibold border border-white/5">
                  {movie.duration_min} {t("common.min")}
                </span>
              )}
              {movie.is_premium ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-premium px-2.5 py-0.5 text-xs font-bold text-premium-foreground shadow-sm shadow-premium/20 animate-pulse border border-premium/30">
                  <Crown className="h-3 w-3" /> {t("common.premium")}
                </span>
              ) : (
                <span className="rounded-md bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
                  {t("common.free")}
                </span>
              )}
            </div>
            <h1 className="font-display text-4xl font-bold uppercase tracking-wider text-white sm:text-5xl leading-tight drop-shadow-md">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-zinc-300 font-normal">{description}</p>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {movie.director && (
                <p>
                  <span className="text-muted-foreground">{t("common.director")}: </span>
                  {movie.director}
                </p>
              )}
              {movie.cast_list && (
                <p>
                  <span className="text-muted-foreground">{t("common.cast")}: </span>
                  {movie.cast_list}
                </p>
              )}
            </div>
            <div className="pt-2">
              {!user ? (
                <Button onClick={() => navigate({ to: "/login" })}>{t("nav.login")}</Button>
              ) : locked ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" /> {t("premium.locked")}
                  </span>
                  <Button asChild>
                    <Link to="/profile">{t("common.subscribe")}</Link>
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    if (movie.is_premium || adPassed) {
                      setPlaying(true);
                    } else {
                      setShowAdGate(true);
                    }
                  }}
                  disabled={!movie.video_url}
                >
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
            {related.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      )}

      {/* Adsterra Banners at the bottom */}
      <div className="pt-12 flex flex-col items-center gap-4 border-t border-white/5 mx-auto max-w-7xl px-4 sm:px-6 w-full">
        <div className="hidden sm:block w-full">
          <AdsterraBanner format="desktop" />
        </div>
        <div className="block sm:hidden w-full">
          <AdsterraBanner format="mobile" />
        </div>
      </div>
    </div>
  );
}
