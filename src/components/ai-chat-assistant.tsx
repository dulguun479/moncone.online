import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, X, Crown, Play } from "lucide-react";

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

type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
  matchedMovies?: Movie[];
};

export function AiChatAssistant() {
  const { lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch movies on mount
  useEffect(() => {
    supabase
      .from("movies")
      .select("id, title, title_en, description, description_en, genre, year, poster_url, is_premium")
      .then(({ data }) => {
        if (data) setMovies(data as Movie[]);
      });
  }, []);

  // Initialize welcome message
  useEffect(() => {
    const welcomeText =
      lang === "mn"
        ? "Сайн байна уу! Би бол moncone платформын ухаалаг AI туслах байна. Танд Монгол киноны алтан үе, бидний бахархалт өв соёл, түүхэн сонирхолтой фактуудын талаар ярьж өгөх үү? Мөн сонирхсон киног тань хайж, санал болгож чадна шүү! ✨"
        : "Hello! I am the moncone smart AI assistant. Would you like to chat about the Golden Era of Mongolian cinema, nomadic heritage, fun movie trivia, or get a personalized recommendation? ✨";
    
    setMessages([
      {
        id: "welcome",
        sender: "bot",
        text: welcomeText,
      },
    ]);
  }, [lang]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (textToSend: string) => {
    const query = textToSend.trim();
    if (!query) return;

    // Add user message
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: query,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate smart localized thinking
    setTimeout(() => {
      const q = query.toLowerCase();
      let reply = "";
      let matched: Movie[] = [];

      if (lang === "mn") {
        if (q.includes("алтан үе") || q.includes("хуучны") || q.includes("классик") || q.includes("сор") || q.includes("masterpiece") || q.includes("golden era")) {
          matched = movies.filter((m) => m.title?.includes("Цогт") || m.title?.includes("Тамир") || m.title?.includes("Элч") || m.title?.includes("Өнөр"));
          reply = "🇲🇳 **Монгол киноны Алтан үеийн сор бүтээлүүд:**\n\nМонголын кино урлагийн алтан үе (1950-1980 он) бол Монгол хүний сэтгэл зүй, түүх, нүүдэлчин ахуй, үндэсний тусгаар тогтнолыг дэлхийн хэмжээнд гайхалтай харуулж чадсан сод цаг үе юм. \n\n*   **Цогт Тайж (1945)** - Эх оронч үзэл, үндэсний эв нэгдлийн сүр хүч.\n*   **Тунгалаг Тамир (1970-1973)** - Нийгмийн шилжилтийн үеийн Монгол амьдралын толь.\n*   **Ардын Элч (1959)** - Эрэлхэг Ариунаа бүсгүйн зориг тэвчээр.\n*   **Өнөр Бүл (1980)** - Нийслэл хотын хөгжил, залуусын хөдөлмөрч сэтгэлгээг харуулсан инээдмийн шилдэг бүтээл.\n\nЭдгээр сод бүтээлүүдээс сонгоод шууд үзээрэй:";
        } else if (q.includes("өв соёл") || q.includes("соёл") || q.includes("нүүдэл") || q.includes("heritage") || q.includes("culture") || q.includes("монгол соёл")) {
          matched = movies.filter((m) => m.title?.includes("Цогт") || m.title?.includes("Тамир") || m.title?.includes("Элч"));
          reply = "🐎 **Монгол өв соёл ба кино урлаг:**\n\nМонгол кинонууд бол зүгээр нэг үзвэр биш, манай **нүүдэлчин өв соёл, ёс заншил, хүлэг морио дээдлэх сэтгэлгээ, уудам тал нутаг**-ийн амьд баримт юм. \n\nҮлгэр жишээ нь, *'Цогт тайж'* кинонд Монгол хуяг дуулга, баатруудын эрэлхэг дүр, эх нутгаа хамгаалах тангараг маш тод дүрслэгдсэн байдаг бол *'Тунгалаг тамир'* кинонд нүүдэлчдийн гэр бүлийн ёс заншил, ах захаа хүндлэх ёс, байгаль эхтэйгээ харьцах ухааныг маш нарийн харуулдаг. \n\nМонгол өв соёлыг шингээсэн түүхэн бүтээлүүдээс санал болгож байна:";
        } else if (q.includes("асуулт") || q.includes("хариулт") || q.includes("хөгжилтэй") || q.includes("тоглоом") || q.includes("fact") || q.includes("fun") || q.includes("quiz")) {
          reply = "🎬 **Монгол киноны хөгжилтэй асуулт хариулт ба сонирхолтой фактууд!**\n\n1. ❓ **Та мэдэх үү?** *'Өнөр бүл'* (1980) киноны Гармаа трактор дээрээ ямар дууг дуулдаг вэ?\n   👉 *Хариулт: 'Улаанбаатарын үдэш' дууг маш хөгжилтэйгээр дуулж, Тэцэгт сэтгэлээ илчилдэг шүү дээ!* \n\n2. ❓ **Та мэдэх үү?** *'Цогт тайж'* киног Дэлхийн II дайны хүнд хэцүү үед буюу 1945 онд бүтээсэн бөгөөд жүжигчдийн өмссөн хуяг дуулга, зэвсэг хэрэглэл нь бүгд музейн бодит үзмэрүүд байсан бөгөөд маш хүнд жинтэй байсан гэдэг!\n\n3. ❓ **Та мэдэх үү?** *'Тунгалаг тамир'* киноны Эрдэнийн дүрд тоглосон жүжигчин бол Монгол улсын Төрийн шагналт, найруулагч Ц.Цэвээнравдан гуай юм! Тэрээр алдарт жүжигчин Н.Сувд гуайн аав билээ.\n\nТа өөр ямар киноны түүх сонсмоор байна?";
        } else if (q.includes("түүхэн") || q.includes("history")) {
          matched = movies.filter((m) => m.genre?.toLowerCase().includes("түүхэн") || m.title?.includes("Цогт") || m.title?.includes("Тамир") || m.title?.includes("Элч"));
          if (matched.length > 0) {
            reply = "📚 **Танд санал болгох манай шилдэг түүхэн кинонууд:**\n\nЭдгээр түүхэн бүтээлүүд нь Монголын соёл, түүхийн үнэ цэнийг харуулсан шилдэг кинонууд юм. Дор дурдсан хуудаснаас шууд үзэх боломжтой:";
          } else {
            reply = "Уучлаарай, одоогоор системд түүхэн ангиллын кино ороогүй байна. Тун удахгүй баяжуулагдах болно!";
          }
        } else if (q.includes("үнэгүй") || q.includes("free")) {
          matched = movies.filter((m) => !m.is_premium);
          if (matched.length > 0) {
            reply = "🎁 **Танд санал болгох үнэгүй үзэх боломжтой кинонууд:**\n\nЭдгээр кинонуудыг та бүртгүүлээд ямар ч төлбөргүйгээр шууд үзэх боломжтой:";
          } else {
            reply = "Одоогоор бүх кинонууд маань VIP хэрэглэгчдэд зориулсан байна. Та Plans цэс рүү орж эрхээ идэвхжүүлээрэй!";
          }
        } else if (q.includes("vip") || q.includes("premium") || q.includes("төлбөртэй")) {
          matched = movies.filter((m) => m.is_premium);
          if (matched.length > 0) {
            reply = "👑 **Манай VIP сангийн шилдэг бүтээлүүд:**\n\nЭдгээр кинонуудыг үзэхийн тулд та профайлаасаа premium багцыг идэвхжүүлэх шаардлагатай. Танд санал болгох кинонууд:";
          } else {
            reply = "Одоогоор манайд VIP кино ороогүй байна.";
          }
        } else if (q.includes("инээдэм") || q.includes("comedy")) {
          matched = movies.filter((m) => m.genre?.toLowerCase().includes("инээдэм") || m.title?.includes("Өнөр") || m.title?.includes("Бүтэлгүй"));
          if (matched.length > 0) {
            reply = "🎭 **Танд инээд бэлэглэх шилдэг инээдмийн кинонууд:**\n\nГэр бүлээрээ үзэж, халуун дулаан уур амьсгал бүрдүүлэхэд хамгийн тохиромжтой бүтээлүүд:";
          } else {
            reply = "Уучлаарай, инээдмийн кино одоогоор олдсонгүй.";
          }
        } else {
          // Default contextual keyword search
          matched = movies.filter((m) => 
            m.title?.toLowerCase().includes(q) || 
            m.title_en?.toLowerCase().includes(q) || 
            m.genre?.toLowerCase().includes(q)
          );
          if (matched.length > 0) {
            reply = `🔍 **Хайлтын үр дүнд тохирсон кинонууд (${matched.length}):**\n\nТаны хайсан сэдэвт тохирох дараах кинонуудыг санал болгож байна:`;
          } else {
            reply = "💡 Надаас *'Алтан үе'*, *'Үнэгүй кино'*, *'Инээдмийн кино'*, *'Өв соёл'* эсвэл *'Асуулт хариулт'* гэж асуугаарай. Танд туслахдаа таатай байх болно!";
          }
        }
      } else {
        // English flows
        if (q.includes("golden era") || q.includes("classic") || q.includes("old") || q.includes("masterpiece")) {
          matched = movies.filter((m) => m.title?.includes("Tsogt") || m.title?.includes("Tamir") || m.title?.includes("Envoy") || m.title?.includes("Unur"));
          reply = "🇲🇳 **The Golden Era of Mongolian Cinema:**\n\nThe Golden Era (1950s–1980s) represents the pinnacle of Mongolian cinematic history. Backed by excellent writing and legendary performances, these films offer deep insights into the nomadic soul, historical struggles, and pristine culture of Mongolia.\n\n*   **Tsogt Taij (1945)** - A wartime epic showing patriotism, national unity, and classical literature.\n*   **Tungalag Tamir (1970-1973)** - A multi-part masterpiece depicting societal transitions and historical shifts.\n*   **Ardyn Elch (1959)** - A legendary tale of courage, independence, and the legendary female protagonist Ariunaa.\n*   **Unur Bul (1980)** - A brilliant Ulaanbaatar comedy about romance, labor, and bustling city life.\n\nSelect a masterpiece from below to watch:";
        } else if (q.includes("culture") || q.includes("heritage") || q.includes("nomad") || q.includes("mongolian culture")) {
          matched = movies.filter((m) => m.title?.includes("Tsogt") || m.title?.includes("Tamir") || m.title?.includes("Envoy"));
          reply = "🐎 **Mongolian Nomadic Heritage & Film:**\n\nMongolian cinema is a beautiful canvas showcasing the **nomadic lifestyle, pristine landscapes, horse-riding mastery, and warm hospitality** of the steppe.\n\nFor example, *'Tsogt Taij'* features authentic armor and epic combat philosophies, while *'Tungalag Tamir'* intricately documents yurt living, nomadic traditions, and the profound connection between humans and Mother Nature.\n\nExplore these culturally rich titles below:";
        } else if (q.includes("quiz") || q.includes("fun") || q.includes("fact") || q.includes("game") || q.includes("question")) {
          reply = "🎬 **Fun Cinema Facts & Quick Quiz!**\n\n1. ❓ **Did you know?** *'Tsogt Taij'* (1945) was produced during World War II despite heavy resources constraints. The steel armor and weapons used by actors were real heavy historical museum artifacts!\n\n2. ❓ **Did you know?** The lead actor who played Erdene in the classic *'Tungalag Tamir'* is the father of legendary Mongolian actress N. Suvd!\n\n3. ❓ **Did you know?** *'Unur Bul'* (1980) features a famous tractor driving scene where the protagonist Garma sings a hilarious romantic declaration.\n\nWhat other movie details would you like to explore?";
        } else if (q.includes("history") || q.includes("historical")) {
          matched = movies.filter((m) => m.genre?.toLowerCase().includes("түүхэн") || m.title?.includes("Tsogt") || m.title?.includes("Tamir") || m.title?.includes("Envoy"));
          if (matched.length > 0) {
            reply = "📚 **We recommend these outstanding historical movies on our platform:**\n\nThese masterpieces showcase Mongolian national history and heritage. You can watch them directly:";
          } else {
            reply = "We don't have historical movies cataloged at this second. They will be added very soon!";
          }
        } else if (q.includes("free") || q.includes("watch free")) {
          matched = movies.filter((m) => !m.is_premium);
          if (matched.length > 0) {
            reply = "🎁 **Free movies you can play right away without a pass:**\n\nRegister an account and start playing these selected movies instantly:";
          } else {
            reply = "All movies are currently premium. Activate your premium VIP pass in the Plans page!";
          }
        } else if (q.includes("vip") || q.includes("premium")) {
          matched = movies.filter((m) => m.is_premium);
          if (matched.length > 0) {
            reply = "👑 **Top Premium VIP releases in our library:**\n\nActivate a premium monthly subscription pass to unlock these amazing movies:";
          } else {
            reply = "No VIP premium movies found.";
          }
        } else if (q.includes("comedy") || q.includes("comedies")) {
          matched = movies.filter((m) => m.genre?.toLowerCase().includes("инээдэм") || m.title?.includes("Unur") || m.title?.includes("Unur Bul"));
          if (matched.length > 0) {
            reply = "🎭 **Top comedies to bring a smile to your face:**\n\nPerfect selections for high family entertainment:";
          } else {
            reply = "No comedies found.";
          }
        } else {
          matched = movies.filter((m) => 
            m.title?.toLowerCase().includes(q) || 
            m.title_en?.toLowerCase().includes(q) || 
            m.genre?.toLowerCase().includes(q)
          );
          if (matched.length > 0) {
            reply = `🔍 **Search Results Match (${matched.length}):**\n\nWe found these titles matched with your query:`;
          } else {
            reply = "💡 Ask me *'Golden Era'* classics, *'Free movies'*, *'Mongolian culture'*, or ask for a *'Quiz'* to get fun trivia!";
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "bot",
          text: reply,
          matchedMovies: matched.slice(0, 3), // Max 3 items to fit beautifully
        },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  const suggestions =
    lang === "mn"
      ? [
          "🎬 Үнэгүй кинонууд?",
          "🇲🇳 Алтан үеийн сор бүтээлүүд?",
          "✨ Өв соёл ба Кино урлаг?",
          "❓ Асуулт хариулт & Фактууд?",
        ]
      : [
          "🎬 Free movies?",
          "🇲🇳 Golden Era Masterpieces?",
          "✨ Heritage & Nomadic Culture?",
          "❓ Cinema Quiz & Facts?",
        ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Dynamic pulsing floating orb button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-rose-500 to-orange-400 text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer shadow-[var(--shadow-neon-red)]"
        >
          {/* Pulsing ring */}
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
          <Sparkles className="h-6 w-6 relative z-10 transition-transform duration-500 group-hover:rotate-12" />
        </button>
      )}

      {/* Main Glassmorphic Chat Widget Panel */}
      {isOpen && (
        <div className="flex h-[500px] w-[360px] flex-col rounded-2xl border border-white/10 bg-card/65 shadow-2xl shadow-black/80 backdrop-blur-3xl glass-card animate-in fade-in slide-in-from-bottom-8 duration-500">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 p-4 bg-black/20 rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <Sparkles className="h-4.5 w-4.5" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-wide uppercase font-display">moncone AI</p>
                <p className="text-[10px] text-muted-foreground/80 leading-none">Ухаалаг кино зөвлөх</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hidden">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col space-y-1.5 ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-primary text-white rounded-tr-none shadow-md shadow-primary/15"
                      : "bg-secondary/40 text-zinc-100 border border-white/5 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-line font-normal">{msg.text}</p>
                </div>

                {/* Embedded Rich Recommendation Movie Cards */}
                {msg.matchedMovies && msg.matchedMovies.length > 0 && (
                  <div className="w-[90%] grid grid-cols-1 gap-2 pt-1 animate-in fade-in duration-500">
                    {msg.matchedMovies.map((movie) => {
                      const { title } = pickLocalized(movie, lang);
                      return (
                        <div
                          key={movie.id}
                          className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 p-2.5 glass-card shadow hover:border-primary/40 transition-colors group"
                        >
                          {movie.poster_url && (
                            <img
                              src={movie.poster_url}
                              alt=""
                              className="h-14 w-10 rounded object-cover border border-white/5 flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-bold text-white group-hover:text-primary transition-colors">
                              {title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {movie.year} · {movie.genre}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              {movie.is_premium ? (
                                <span className="inline-flex items-center gap-0.5 rounded bg-premium/20 border border-premium/30 px-1 py-0.2 text-[8px] font-extrabold uppercase text-premium shadow-sm">
                                  <Crown className="h-2 w-2" /> VIP
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded bg-primary/15 border border-primary/20 px-1 py-0.2 text-[8px] font-bold text-primary">
                                  FREE
                                </span>
                              )}
                              <Link
                                to="/movie/$id"
                                params={{ id: movie.id }}
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary hover:underline ml-auto"
                              >
                                <Play className="h-2 w-2 fill-current" /> {lang === "mn" ? "Үзэх" : "Play"}
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Simulated typing dot animation */}
            {isTyping && (
              <div className="flex items-center gap-1 bg-secondary/40 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 w-16 text-center">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions chips bar */}
          <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-white/5 bg-black/10">
            {suggestions.map((sug) => (
              <button
                key={sug}
                onClick={() => handleSend(sug.slice(2).replace("?", ""))}
                className="text-[10px] font-bold text-zinc-300 hover:text-white bg-secondary/50 hover:bg-secondary border border-white/5 rounded-full px-2.5 py-1 transition-all hover:scale-[1.03] cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Chat Footer Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2 border-t border-white/5 p-3.5 bg-black/20 rounded-b-2xl"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === "mn" ? "Асуултаа бичнэ үү..." : "Ask me anything..."}
              className="flex-1 bg-black/30 border-white/5 text-xs text-white focus-visible:ring-primary/45 rounded-xl h-9 px-3 placeholder:text-muted-foreground/60"
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 text-white shadow shadow-primary/20 flex-shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
