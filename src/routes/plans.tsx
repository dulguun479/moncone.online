import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Crown, Copy, Send, CheckCircle2, Smartphone, Download, 
  X, AlertCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { createPendingPayment, listMyPayments } from "@/lib/payments.functions";

export const Route = createFileRoute("/plans")({ 
  validateSearch: (search: Record<string, unknown>) => ({
    stripe: search.stripe as string | undefined,
    sid: search.sid as string | undefined,
  }),
  component: Plans 
});

type Settings = {
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  premium_price: number;
  telegram_bot_username: string;
};

type PaymentMethodId = "qpay" | "visa" | "skins" | "crypto" | "giftcard";

function Plans() {
  const { t } = useI18n();
  const { user, profile, loading, refreshMeta } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<PaymentMethodId | null>(null);
  const [giftCode, setGiftCode] = useState("");
  const [stripeLoading, setStripeLoading] = useState(false);
  
  // Crypto selection state
  const [selectedCrypto, setSelectedCrypto] = useState<"btc" | "usdt" | "sol">("usdt");

  const search = useSearch({ from: "/plans" });
  const createPayment = useServerFn(createPendingPayment);
  const fetchMine = useServerFn(listMyPayments);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // Handle Stripe redirect result — verifies payment directly with Stripe (no webhook needed)
  useEffect(() => {
    const stripeResult = (search as any).stripe;
    const sessionId = (search as any).sid;

    if (stripeResult === "success" && sessionId && user?.id) {
      // Verify payment with Stripe and activate VIP automatically
      const verifyAndActivate = async () => {
        const toastId = toast.loading("💳 Stripe төлбөр баталгаажуулж байна...");
        try {
          const res = await fetch("/api/public/payments/stripe-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, user_id: user.id }),
          });
          const data = await res.json() as any;
          if (data.ok) {
            toast.success("🎉 Stripe төлбөр амжилттай! VIP эрх идэвхжлээ!", { id: toastId });
            await refreshMeta();
            await loadMine();
          } else {
            toast.error("Баталгаажуулалт амжилтгүй: " + (data.error ?? "Алдаа"), { id: toastId });
          }
        } catch (e: any) {
          toast.error("Холболтын алдаа: " + e.message, { id: toastId });
        }
      };
      verifyAndActivate();
    } else if (stripeResult === "cancel") {
      toast.error("Stripe төлбөр цуцлагдлаа.");
    }
  }, [(search as any).stripe, (search as any).sid, user?.id]);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(data as Settings | null);
      });
  }, []);

  const loadMine = async () => {
    try {
      const { payments } = await fetchMine();
      setPayments(payments);
    } catch {}
  };

  useEffect(() => {
    if (user) loadMine();
  }, [user]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Хуулагдлаа");
  };

  // Traditional bank payment submit flow inside QPay modal
  const submitBankTransfer = async () => {
    setSubmitting(true);
    try {
      await createPayment({});
      toast.success("🏦 Шилжүүлгийн хүсэлт илгээгдлээ. Төлбөр баталгаажихыг хүлээж байна.");
      await refreshMeta();
      await loadMine();
      setActiveModal(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // REAL Stripe Checkout — redirects to Stripe hosted payment page
  const submitStripePayment = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/public/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          payment_code: code,
          amount: price,
          email: user?.email,
        }),
      });
      const data = await res.json() as any;
      if (data.ok && data.url) {
        // Redirect to Stripe's hosted checkout page
        window.location.href = data.url;
      } else {
        toast.error("Stripe холбоос үүсгэхэд алдаа: " + (data.error ?? "Мэдэгдэхгүй"));
      }
    } catch (e: any) {
      toast.error("Холболтын алдаа: " + e.message);
    } finally {
      setStripeLoading(false);
    }
  };

  // REAL Gift Code — validates against Supabase gift_codes table
  const handleGiftCodeSubmit = async () => {
    if (!giftCode.trim()) {
      toast.error("Гифт код оруулна уу");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/payments/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id, code: giftCode.trim() }),
      });
      const data = await res.json() as any;
      if (data.ok) {
        toast.success(`🎁 Гифт код амжилттай идэвхжлээ! ${data.days} хоногийн VIP эрх нэмэгдлээ.`);
        setGiftCode("");
        await refreshMeta();
        await loadMine();
        setActiveModal(null);
      } else {
        toast.error(data.error ?? "Код хүчингүй байна");
      }
    } catch (e: any) {
      toast.error("Алдаа гарлаа: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !profile) return null;
  const price = settings?.premium_price ?? 10000;
  const code = profile.payment_code ?? "—";
  const tgUser = settings?.telegram_bot_username ?? "moncone_bot";
  const note = `${user.email} ${code}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Title Header with gold glow */}
      <div className="mb-12 text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-premium/10 border border-premium/30 shadow-lg shadow-premium/20 animate-bounce">
          <Crown className="h-8 w-8 text-premium" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow">
          VIP ЭРХ ИДЭВХЖҮҮЛЭХ
        </h1>
        <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
          Шилдэг кинонуудыг хязгааргүй, зар сурталчилгаагүй үзэх төлбөрийн хэрэгслээ сонгоно уу.
        </p>
      </div>

      {profile.subscription_status === "premium" && (
        <div className="mb-8 rounded-2xl border border-premium/40 bg-premium/5 p-5 text-sm glass-card shadow-lg shadow-premium/5 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-premium animate-ping" />
            <p className="font-bold text-premium uppercase tracking-wider">Идэвхтэй VIP Хэрэглэгч</p>
          </div>
          {profile.subscription_expires_at && (
            <p className="text-muted-foreground mt-1 text-xs">
              Дуусах хугацаа:{" "}
              <span className="text-foreground font-semibold">
                {new Date(profile.subscription_expires_at).toLocaleDateString("mn-MN")}
              </span>
            </p>
          )}
        </div>
      )}

      {/* APK & Telegram Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        
        {/* Telegram connect banner */}
        <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-[#0e0f12] p-5 glass-card shadow-lg hover:border-primary/30 transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <Send className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-bold text-foreground text-sm">{t("plans.tg.title")}</p>
            <p className="text-xs text-muted-foreground/95 leading-snug">{t("plans.tg.desc")}</p>
            <p className="text-[10px] text-muted-foreground">
              Код: <code className="rounded bg-secondary/80 px-1 py-0.5 text-primary font-mono font-bold">/start {user.email}</code>
            </p>
          </div>
          {profile.telegram_chat_id ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
              <CheckCircle2 className="h-4 w-4" /> {t("tg.connected")}
            </span>
          ) : (
            <Button asChild size="sm" variant="secondary" className="font-bold rounded-xl px-4 hover:scale-[1.03] text-xs transition-transform shrink-0">
              <a href={`https://t.me/${tgUser}?start=${code}`}>{t("plans.tg.cta")}</a>
            </Button>
          )}
        </div>

        {/* Android APK Download Banner */}
        <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-[#0e0f12] p-5 glass-card shadow-lg hover:border-primary/30 transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <Smartphone className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-bold text-foreground text-sm">Гар утасны Native Апп</p>
            <p className="text-xs text-muted-foreground/90 leading-snug">
              Апп-ыг утаснаасаа хурдан ашиглахын тулд албан ёсны Андройд багцыг шууд татна уу.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white font-bold gap-1.5 transition-all duration-300 hover:scale-[1.03] rounded-xl px-4 text-xs shrink-0"
          >
            <a href="/app-release.apk" download>
              <Download className="h-3.5 w-3.5" />
              Татах
            </a>
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LUXURY PAYMENT METHODS GRID (MATCHING THE UPLOADED DESIGN) */}
      {/* ======================================================== */}
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
        Төлбөрийн хэрэгсэл сонгох
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
        
        {/* CARD 1: QPAY */}
        <div 
          onClick={() => setActiveModal("qpay")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-border/60 bg-[#121214] p-8 transition-all duration-300 hover:border-premium hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] flex flex-col justify-between min-h-[220px]"
        >
          {/* Logo Center */}
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-white text-[#121214] font-black text-2xl group-hover:scale-105 transition-transform">
                Q
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-[#121214] border-2 border-white rounded-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white" />
                </div>
              </div>
              <span className="text-3xl font-black text-white tracking-tight">Pay</span>
            </div>
          </div>
          {/* Footer Mini Logos */}
          <div className="flex items-center justify-center gap-3 border-t border-white/5 pt-4 text-[10px] text-muted-foreground/80">
            <span className="bg-white/5 px-2 py-0.5 rounded">SocialPay</span>
            <span className="bg-white/5 px-2 py-0.5 rounded">БОГД БАНК</span>
            <span className="bg-white/5 px-2 py-0.5 rounded">ТӨРИЙН БАНК</span>
          </div>
        </div>

        {/* CARD 2: VISA / ONLINE CARD */}
        <div 
          onClick={() => setActiveModal("visa")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-border/60 bg-[#121214] p-8 transition-all duration-300 hover:border-primary hover:shadow-[0_0_20px_rgba(99,91,255,0.15)] flex flex-col justify-between min-h-[220px]"
        >
          {/* Badge top-right */}
          <span className="absolute top-4 right-4 bg-[#1a1b1f] text-[10px] font-bold text-muted-foreground/90 px-2.5 py-1 rounded-full border border-white/5">
            +20 methods
          </span>

          {/* Visa Center Logo */}
          <div className="flex items-center justify-center py-6">
            <span className="text-white font-extrabold italic text-4xl group-hover:scale-105 transition-transform flex items-center gap-0.5">
              VISA<span className="text-xs align-super font-mono not-italic text-primary">/ MC</span>
            </span>
          </div>

          {/* Footer Mini Logos */}
          <div className="flex items-center justify-center gap-4 border-t border-white/5 pt-4 text-xs font-semibold text-muted-foreground/80">
            <span className="text-pink-500">skrill</span>
            <span className="text-white flex items-center gap-0.5"> Pay</span>
            <span className="text-white flex items-center gap-0.5">
              <span className="text-blue-500">G</span>
              <span className="text-red-500">o</span>
              <span className="text-yellow-500">o</span>
              <span className="text-blue-500">g</span>
              <span className="text-green-500">l</span>
              <span className="text-red-500">e</span> Pay
            </span>
          </div>
        </div>

        {/* CARD 3: PAY BY SKINS */}
        <div 
          onClick={() => setActiveModal("skins")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-border/60 bg-[#121214] p-0 transition-all duration-300 hover:border-amber-500 hover:shadow-[0_0_20px_rgba(243,169,42,0.15)] flex flex-col justify-between min-h-[220px]"
        >
          {/* Content area */}
          <div className="p-6 flex flex-col items-center justify-center flex-grow space-y-3">
            {/* AK-47 Graphic */}
            <svg viewBox="0 0 120 40" className="h-9 w-auto text-[#f3a92a] group-hover:scale-105 transition-transform duration-300" fill="currentColor">
              <path d="M5 21h12l2-3h5l1 3h3l1-2h4l1 2h14v-2h3v2h2v-4h2v4h4v-3h2v3h5l4-8h10l2 2h8v2l4-2 12-1 3 3 15-2 2 4-1 6-5 4-12-1-3-4-8-1-5 2-8-2-4 3h-5l-1-2h-3v2h-2v-3h-4v3h-3l-2-2h-8v2h-8l-2-3H23l-2 3H12l-1-2H5v-2z" fill="#f3a92a" />
            </svg>
            <span className="text-lg font-black tracking-widest text-[#f3a92a] font-mono">
              PAY BY SKINS
            </span>
          </div>

          {/* Special neon visual banner buttons exactly like the design */}
          <div className="grid grid-cols-2 text-center text-xs font-black tracking-wider border-t border-white/5">
            <div className="bg-[#00f3ff] text-[#0b0c10] py-3.5 uppercase font-extrabold font-sans">
              +20% БОНУС АВ
            </div>
            <div className="bg-[#54f08e] text-[#0b0c10] py-3.5 uppercase font-extrabold font-sans">
              ШУУРХАЙ ҮЛДЭГДЭЛ
            </div>
          </div>
        </div>

        {/* CARD 4: CRYPTO */}
        <div 
          onClick={() => setActiveModal("crypto")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-border/60 bg-[#121214] p-8 transition-all duration-300 hover:border-orange-500 hover:shadow-[0_0_20px_rgba(247,147,26,0.15)] flex flex-col justify-between min-h-[220px]"
        >
          {/* Logo center */}
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#f7931a] flex items-center justify-center text-white font-extrabold text-xl shadow shadow-[#f7931a]/30 group-hover:rotate-12 transition-transform">
                ₿
              </div>
              <span className="text-2xl font-black text-white tracking-widest font-mono">CRYPTO</span>
            </div>
          </div>

          {/* Footer crypto icons */}
          <div className="flex items-center justify-center gap-2.5 border-t border-white/5 pt-4 text-xs font-bold">
            <span className="w-5 h-5 rounded-full bg-[#f7931a]/20 border border-[#f7931a] text-[#f7931a] flex items-center justify-center text-[10px]">₿</span>
            <span className="w-5 h-5 rounded-full bg-[#627eea]/20 border border-[#627eea] text-[#627eea] flex items-center justify-center text-[10px]">Ξ</span>
            <span className="w-5 h-5 rounded-full bg-[#ba9f33]/20 border border-[#ba9f33] text-[#ba9f33] flex items-center justify-center text-[10px]">Ð</span>
            <span className="w-5 h-5 rounded-full bg-[#345d9d]/20 border border-[#345d9d] text-[#345d9d] flex items-center justify-center text-[10px]">Ł</span>
            <span className="w-5 h-5 rounded-full bg-[#26a17b]/20 border border-[#26a17b] text-[#26a17b] flex items-center justify-center text-[10px]">₮</span>
            <span className="w-5 h-5 rounded-full bg-[#ec0623]/20 border border-[#ec0623] text-[#ec0623] flex items-center justify-center text-[10px]">▲</span>
            <span className="w-5 h-5 rounded-full bg-[#14f195]/20 border border-[#14f195] text-[#14f195] flex items-center justify-center text-[10px]">S</span>
          </div>
        </div>

        {/* CARD 5: GIFT CARD (PAYPAL / ALIPAY) */}
        <div 
          onClick={() => setActiveModal("giftcard")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-border/60 bg-[#121214] p-8 transition-all duration-300 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(0,121,193,0.15)] flex flex-col justify-between min-h-[220px] md:col-span-2 lg:col-span-2"
        >
          {/* Header */}
          <div className="text-center">
            <span className="text-xs uppercase font-extrabold tracking-widest text-muted-foreground/80 font-mono">
              GIFT CARD
            </span>
          </div>

          {/* PayPal Card Center */}
          <div className="flex items-center justify-center py-4">
            <div className="py-2.5 px-8 rounded-xl bg-white border-2 border-[#003087]/10 flex items-center justify-center gap-1 shadow-md group-hover:scale-105 transition-transform duration-300">
              <span className="text-2xl font-black text-[#003087] italic">Pay</span>
              <span className="text-2xl font-black text-[#0079c1] italic">Pal</span>
            </div>
          </div>

          {/* Footer mini payment brands */}
          <div className="flex items-center justify-center gap-5 border-t border-white/5 pt-4 text-xs font-semibold text-muted-foreground/70">
            <span className="text-blue-400 flex items-center gap-1">支 Alipay</span>
            <span className="text-green-500 flex items-center gap-1">● WeChat Pay</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* INTERACTIVE POPUP MODALS FOR PAYMENT METHOD WORKFLOWS */}
      {/* ======================================================== */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-2xl glass-card animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-premium" />
                <h3 className="text-lg font-extrabold text-white uppercase tracking-wider">
                  {activeModal === "qpay" && "🏦 QPay / Дансаар шилжүүлэх"}
                  {activeModal === "visa" && "💳 Карт болон Олон Улсын Төлбөр"}
                  {activeModal === "skins" && "🔫 CS:GO / Steam Skins-ээр төлөх"}
                  {activeModal === "crypto" && "₿ Крипто Төлбөр (Crypto)"}
                  {activeModal === "giftcard" && "🎁 Gift Card / PayPal Идэвхжүүлэх"}
                </h3>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* MODAL 1: QPAY / BANK TRANSFER */}
            {activeModal === "qpay" && (
              <div className="space-y-5">
                {/* Simulated QPay QR Code container */}
                <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl border-4 border-premium/30 max-w-[200px] mx-auto space-y-2.5">
                  <div className="w-36 h-36 bg-[#121214] flex flex-col items-center justify-center p-2 rounded-lg relative">
                    {/* Simulated elegant QR code graphics */}
                    <div className="w-full h-full border border-white/20 grid grid-cols-5 grid-rows-5 gap-1.5 p-1">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`rounded-sm ${(i % 3 === 0 || i % 7 === 0 || i === 0 || i === 4 || i === 20 || i === 24) ? "bg-white" : "bg-transparent"}`} 
                        />
                      ))}
                    </div>
                    {/* Central QPay overlay icon */}
                    <div className="absolute inset-0 m-auto w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#121214] font-black text-sm border-2 border-[#121214]">
                      Q
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-black tracking-wider text-[#121214] uppercase">Уншуулахыг хүлээж байна</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  QPay QR-ийг банкны апп-аараа уншуулах эсвэл дараах банкны данс руу утгыг яг зөв бичиж шилжүүлэг хийнэ үү.
                </p>

                {/* Account Details Row Box */}
                <div className="space-y-1 rounded-xl bg-background/50 border border-border/40 p-4">
                  <div className="flex justify-between border-b border-border/20 py-2 text-xs">
                    <span className="text-muted-foreground">Банкны нэр:</span>
                    <span className="font-semibold text-white">{settings?.bank_name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 py-2 text-xs">
                    <span className="text-muted-foreground">Дансны дугаар:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-white font-mono">{settings?.bank_account_number || "—"}</span>
                      {settings?.bank_account_number && (
                        <Button size="icon" variant="ghost" className="h-5 w-5 hover:text-primary" onClick={() => copy(settings.bank_account_number)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between border-b border-border/20 py-2 text-xs">
                    <span className="text-muted-foreground">Хүлээн авагч:</span>
                    <span className="font-semibold text-white">{settings?.bank_account_name || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 py-2 text-xs">
                    <span className="text-muted-foreground">Шилжүүлэх дүн:</span>
                    <span className="font-bold text-premium text-sm">₮{price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 text-xs">
                    <span className="text-muted-foreground">Шилжүүлгийн утга (Note):</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-primary">{note}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5 hover:text-primary" onClick={() => copy(note)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setActiveModal(null)}
                    variant="outline" 
                    className="flex-1 rounded-xl py-6 font-bold"
                  >
                    Буцах
                  </Button>
                  <Button 
                    onClick={submitBankTransfer}
                    disabled={submitting}
                    className="flex-grow bg-primary hover:bg-primary/90 text-white font-bold py-6 rounded-xl"
                  >
                    {submitting ? "..." : "🏦 Би шилжүүлсэн"}
                  </Button>
                </div>
              </div>
            )}

            {/* MODAL 2: VISA / CARD PAYMENTS */}
            {activeModal === "visa" && (
              <div className="space-y-5">
                {/* Credit card template mock-up */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1d1f27] via-[#2d2f3b] to-[#14151b] p-6 border border-white/10 shadow-lg text-white space-y-6">
                  {/* Chip and logo */}
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-7 rounded bg-amber-500/20 border border-amber-500/40 relative">
                      <div className="absolute inset-y-0 left-3 w-0.5 bg-amber-500/40" />
                      <div className="absolute inset-x-0 top-3 h-0.5 bg-amber-500/40" />
                    </div>
                    <span className="text-xl font-bold italic">VISA</span>
                  </div>
                  
                  {/* Card number */}
                  <div className="font-mono text-lg tracking-widest text-center select-all">
                    ••••  ••••  ••••  {code.slice(-4).padEnd(4, "•")}
                  </div>

                  {/* Card footer details */}
                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Хэрэглэгч</p>
                      <p className="font-bold select-all">{user.email?.split("@")[0].toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase">Дүн</p>
                      <p className="font-bold text-premium">₮{price.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary/20 rounded-full blur-xl" />
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Stripe-оор дамжуулан дотоодын болон олон улсын виза картыг ашиглан автомат системээр эрхээ шууд идэвхжүүлэх боломжтой.
                </p>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setActiveModal(null)}
                    variant="outline" 
                    className="flex-1 rounded-xl py-6 font-bold"
                    disabled={stripeLoading}
                  >
                    Буцах
                  </Button>
                  <Button 
                    onClick={submitStripePayment}
                    disabled={stripeLoading}
                    className="flex-grow bg-gradient-to-r from-[#635bff] to-[#8075ff] hover:brightness-[1.1] text-white font-bold py-6 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    {stripeLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Stripe рүү холбогдож байна...</span>
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4" />
                        <span>Картаар төлөх (Шуурхай)</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* MODAL 3: PAY BY SKINS */}
            {activeModal === "skins" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center space-y-2">
                  <span className="bg-amber-500 text-[#0b0c10] text-[10px] font-black px-2 py-0.5 rounded-full">
                    ОНЦГОЙ БОНУС: +20% ӨДӨР НЭМЭГДЭНЭ
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    CS:GO (CS2), Dota2 тоглоомын зэвсэг, скинийг ашиглан VIP эрхээ идэвхжүүлээрэй. Скиний зах зээлийн үнэлгээнээс хамаарч VIP хоног дээр тань дахин **20%-ийн үнэгүй бонус** хоног нэмэгдэх болно!
                  </p>
                </div>

                {/* Steam trade setup details */}
                <div className="space-y-3 rounded-xl bg-background/50 border border-border/40 p-4 text-xs">
                  <div className="space-y-1">
                    <p className="text-muted-foreground uppercase text-[10px] font-bold">Скин хүлээн авах заавар:</p>
                    <p className="text-white leading-relaxed font-medium">
                      1. Доорх холбоосоор орж манай админы Telegram хаяг руу холбогдоно.<br />
                      2. Өөрийн Steam Trade Link-ийг илгээнэ.<br />
                      3. Скин тохиролцон шилжүүлж, VIP эрхээ шууд идэвхжүүлнэ.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setActiveModal(null)}
                    variant="outline" 
                    className="flex-1 rounded-xl py-6 font-bold"
                  >
                    Буцах
                  </Button>
                  <Button 
                    asChild
                    className="flex-grow bg-amber-500 hover:bg-amber-500/90 text-[#0b0c10] font-black py-6 rounded-xl"
                  >
                    <a href={`https://t.me/${tgUser}?start=skins-${code}`}>
                      🔫 Telegram-аар илгээх
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* MODAL 4: CRYPTO PAYMENTS */}
            {activeModal === "crypto" && (
              <div className="space-y-5">
                <p className="text-xs text-muted-foreground text-center">
                  Идэвхжүүлэхийг хүсэж буй крипто зоосоо сонгон, хаягийг хуулж аваад төлбөрөө хийнэ үү.
                </p>

                {/* Coin tabs selection */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <button 
                    onClick={() => setSelectedCrypto("usdt")}
                    className={`py-2.5 rounded-xl font-bold border transition-colors ${selectedCrypto === "usdt" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border/40 bg-background hover:bg-secondary/40 text-muted-foreground"}`}
                  >
                    USDT (TRC20)
                  </button>
                  <button 
                    onClick={() => setSelectedCrypto("btc")}
                    className={`py-2.5 rounded-xl font-bold border transition-colors ${selectedCrypto === "btc" ? "border-[#f7931a] bg-[#f7931a]/10 text-[#f7931a]" : "border-border/40 bg-background hover:bg-secondary/40 text-muted-foreground"}`}
                  >
                    Bitcoin
                  </button>
                  <button 
                    onClick={() => setSelectedCrypto("sol")}
                    className={`py-2.5 rounded-xl font-bold border transition-colors ${selectedCrypto === "sol" ? "border-[#14f195] bg-[#14f195]/10 text-[#14f195]" : "border-border/40 bg-background hover:bg-secondary/40 text-muted-foreground"}`}
                  >
                    Solana
                  </button>
                </div>

                {/* Deposit box content */}
                <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs border-b border-border/20 pb-2">
                    <span className="text-muted-foreground">Илгээх зоос:</span>
                    <span className="font-bold text-white uppercase">
                      {selectedCrypto === "usdt" && "USDT (TRC-20)"}
                      {selectedCrypto === "btc" && "Bitcoin (BTC)"}
                      {selectedCrypto === "sol" && "Solana (SOL)"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Орлогын хаяг (Deposit Address):</span>
                    <div className="flex items-center gap-2 bg-[#0e0f12] p-2.5 rounded-lg border border-white/5">
                      <code className="text-xs text-primary font-mono select-all break-all flex-1 leading-normal">
                        {selectedCrypto === "usdt" && "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"}
                        {selectedCrypto === "btc" && "bc1qxy2kg3zh497qh6h4cch48zp5yzh225z6xkegvv"}
                        {selectedCrypto === "sol" && "HN7cAB1K1W91KSSCGvJcrYzk9hZ2yP5yZ8s1"}
                      </code>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary shrink-0" 
                        onClick={() => {
                          const addr = selectedCrypto === "usdt" ? "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" : selectedCrypto === "btc" ? "bc1qxy2kg3zh497qh6h4cch48zp5yzh225z6xkegvv" : "HN7cAB1K1W91KSSCGvJcrYzk9hZ2yP5yZ8s1";
                          copy(addr);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-muted-foreground">Бодох хэмжээ:</span>
                    <span className="font-extrabold text-white font-mono">
                      {selectedCrypto === "usdt" && `$4.00 USDT`}
                      {selectedCrypto === "btc" && `0.00006 BTC`}
                      {selectedCrypto === "sol" && `0.025 SOL`}
                    </span>
                  </div>

                  <div className="rounded bg-amber-500/10 border border-amber-500/20 p-2.5 text-[10px] text-amber-500 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <p className="leading-normal">
                      Зөвхөн заасан сүлжээгээр зоосоо илгээнэ үү. Буруу сүлжээгээр илгээсэн тохиолдолд зоос сэргэх боломжгүй бөгөөд хохирлыг систем хариуцахгүй.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setActiveModal(null)}
                    variant="outline" 
                    className="flex-1 rounded-xl py-6 font-bold"
                  >
                    Буцах
                  </Button>
                  <Button 
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        // Submit a simulated pending crypto payment
                        await createPayment({});
                        toast.success("₿ Крипто шилжүүлгийн хүсэлт бүртгэгдлээ. Гүйлгээ баталгаажмагц эрх идэвхжинэ.");
                        await refreshMeta();
                        await loadMine();
                        setActiveModal(null);
                      } catch (e: any) {
                        toast.error(e.message);
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    className="flex-grow bg-orange-500 hover:bg-orange-500/90 text-white font-bold py-6 rounded-xl"
                  >
                    {submitting ? "..." : "₿ Би шилжүүлсэн"}
                  </Button>
                </div>
              </div>
            )}

            {/* MODAL 5: GIFT CARD PAYMENTS */}
            {activeModal === "giftcard" && (
              <div className="space-y-5">
                <p className="text-xs text-muted-foreground text-center">
                  PayPal болон бусад олон улсын сувгаар авсан VIP Gift Card кодыг доор оруулан эрхээ идэвхжүүлнэ.
                </p>

                {/* Gift Code inputs */}
                <div className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Гифт Код оруулах:</label>
                    <input 
                      type="text" 
                      value={giftCode}
                      onChange={(e) => setGiftCode(e.target.value)}
                      placeholder="MONCONE-GIFT-XXXX"
                      className="w-full rounded-xl bg-background border border-border/60 py-3.5 px-4 text-center font-mono text-base font-bold text-primary focus:border-primary focus:outline-none placeholder:text-muted-foreground/45 placeholder:font-sans placeholder:text-sm uppercase"
                    />
                  </div>
                  
                  <div className="rounded bg-primary/10 border border-primary/20 p-3 text-[10px] text-primary flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <p className="leading-normal">
                      Код нь том жижиг үсгийн ялгаагүй бөгөөд ашигласан даруйд VIP идэвхжинэ. Хэрэв танд код байхгүй бол админтай холбогдож PayPal-аар төлөх заавар аваарай.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setActiveModal(null)}
                    variant="outline" 
                    className="flex-1 rounded-xl py-6 font-bold"
                  >
                    Буцах
                  </Button>
                  <Button 
                    onClick={handleGiftCodeSubmit}
                    disabled={submitting}
                    className="flex-grow bg-primary hover:bg-primary/90 text-white font-bold py-6 rounded-xl"
                  >
                    {submitting ? "Уншиж байна..." : "🎁 Код идэвхжүүлэх"}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* History section */}
      {payments.length > 0 && (
        <div className="mt-12 rounded-2xl border border-border/60 bg-[#0e0f12] p-6 glass-card shadow-lg">
          <h2 className="mb-4 text-lg font-bold text-white uppercase tracking-wider">Миний төлбөрийн түүх</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-muted-foreground border-b border-white/5 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Огноо</th>
                  <th className="pb-3 font-semibold">Төлбөрийн код</th>
                  <th className="pb-3 font-semibold">Дүн</th>
                  <th className="pb-3 font-semibold text-right">Төлөв</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p) => (
                  <tr key={p.id} className="text-muted-foreground/90">
                    <td className="py-3.5">{new Date(p.created_at).toLocaleDateString("mn-MN")}</td>
                    <td className="py-3.5 font-mono select-all">{p.payment_code}</td>
                    <td className="py-3.5 font-bold text-white">₮{p.amount.toLocaleString()}</td>
                    <td className="py-3.5 text-right font-semibold">
                      <span
                        className={
                          p.status === "confirmed"
                            ? "text-[#54f08e] bg-[#54f08e]/10 px-2 py-0.5 rounded"
                            : p.status === "pending"
                              ? "text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded"
                              : "text-muted-foreground bg-white/5 px-2 py-0.5 rounded"
                        }
                      >
                        {p.status === "confirmed" && "Амжилттай"}
                        {p.status === "pending" && "Хүлээгдэж буй"}
                        {p.status !== "confirmed" && p.status !== "pending" && p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        <Link to="/profile" className="hover:text-foreground inline-flex items-center gap-1">
          ← Профайл руу буцах
        </Link>
      </p>
    </div>
  );
}
