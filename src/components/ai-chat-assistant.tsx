import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, X, Crown, Play, DollarSign, Info } from "lucide-react";

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
  isMonetization?: boolean;
};

export function AiChatAssistant() {
  const { t, lang } = useI18n();
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
        ? "Сайн байна уу! Би бол moncone платформын ухаалаг AI туслах байна. Танд үзэх сонирхолтой кино санал болгох уу? Эсвэл платформтой холбоотой асуултад хариулах уу?"
        : "Hello! I am the moncone smart AI assistant. Would you like me to recommend a movie to watch? Or answer questions about the platform?";
    
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
      let isMoney = false;

      if (lang === "mn") {
        if (q.includes("мөнгө") || q.includes("орлого") || q.includes("зарах") || q.includes("business") || q.includes("monetize") || q.includes("flippa") || q.includes("үнэ цэнэ")) {
          reply = "💵 **moncone платформоос мөнгө олох ба үнэ цэнийг өсгөх 3 үндсэн суваг:**\n\n1. **SVOD (Төлбөртэй гишүүнчлэл)**: Одоо ажиллаж байгаа Stripe болон Банк/QPay холболтоор дамжуулан хэрэглэгчид сар бүр VIP эрх худалдан авч, систем танд автомат орлого оруулна.\n2. **AVOD (Үнэгүй киноны сурталчилга)**: Вэбсайт болон апп-д Google AdSense холбох эсвэл видео тоглуулагчийн эхэнд VAST зар сурталчилгаа байршуулан үзэлтийн тоогоор орлого олох.\n3. **TVOD (Кино түрээс)**: Шинээр гарсан кино театрын блокбастеруудыг зөвхөн нэг удаагийн түрээсээр (Жишээ нь 5,000₮) 48 цаг үзэх эрхээр хэрэглэгчдэд борлуулж өндөр ашиг олох.\n\n*Энэхүү платформ нь Cloudflare Pages болон Supabase-ийн үнэгүй түвшнийг ашигладаг тул сарын тогтмол зардал нь **$0 (ямар ч зардалгүй)** бөгөөд ашгийн хувь өндөр байна!*";
          isMoney = true;
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
            reply = "💡 Надаас *'Түүхэн кино'*, *'Үнэгүй кино'*, *'Инээдмийн кино'* гэж асуух эсвэл вэбсайтыг зарах гэж байгаа бол *'Яаж мөнгө олох вэ?'* гэж асуугаарай. Танд туслахдаа таатай байх болно!";
          }
        }
      } else {
        // English flows
        if (q.includes("money") || q.includes("income") || q.includes("sell") || q.includes("business") || q.includes("monetize") || q.includes("flippa") || q.includes("value")) {
          reply = "💵 **3 Main Monetization Streams to Drive Profit on moncone:**\n\n1. **SVOD (Subscriptions)**: Users pay monthly premium subscription fees automatically via integrated Stripe or direct bank transfer flows.\n2. **AVOD (Advertisements)**: Perfect framework to display Google AdSense banner widgets or insert dynamic VAST video advertising at the beginning of video streams.\n3. **TVOD (Rentals)**: Rent out premium cinema blockbusters for a one-time fee (e.g., $1.99) for a 48-hour viewing license.\n\n*Running on Cloudflare Pages and Supabase Free Tiers, the monthly maintenance cost of this app is exactly **$0 (Zero Overhead)**, keeping profit margins extremely high!*";
          isMoney = true;
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
            reply = "💡 Ask me *'Historical movies'*, *'Free movies'*, *'VIP movies'* or ask *'How to make money?'* to view the platform monetization blueprint!";
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
          isMonetization: isMoney,
        },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  const suggestions =
    lang === "mn"
      ? [
          "🎬 Үнэгүй кинонууд?",
          "📚 Түүхэн кино санал болго?",
          "💵 Яаж мөнгө олох вэ?",
        ]
      : [
          "🎬 Free movies?",
          "📚 Historical movies?",
          "💵 How to make money?",
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
