import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Crown, Copy, Send, CheckCircle2, Smartphone, Download } from "lucide-react";
import { toast } from "sonner";
import { createPendingPayment, listMyPayments } from "@/lib/payments.functions";

export const Route = createFileRoute("/plans")({ component: Plans });

type Settings = {
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  premium_price: number;
  telegram_bot_username: string;
};

function Plans() {
  const { t } = useI18n();
  const { user, profile, loading, refreshMeta } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const createPayment = useServerFn(createPendingPayment);
  const fetchMine = useServerFn(listMyPayments);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

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

  const submit = async () => {
    setSubmitting(true);
    try {
      await createPayment({});
      toast.success(t("plans.pending"));
      await refreshMeta();
      await loadMine();
    } catch (e: any) {
      toast.error(e.message);
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
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Title Header with gold drop shadow */}
      <div className="mb-10 text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-premium/10 border border-premium/30 shadow-lg shadow-premium/10 animate-bounce">
          <Crown className="h-10 w-10 text-premium" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow">{t("plans.title")}</h1>
        <p className="text-sm text-muted-foreground/80">Монголын шилдэг кинонуудыг хязгааргүй, өндөр чанартайгаар үзэх VIP эрх</p>
      </div>

      {profile.subscription_status === "premium" && (
        <div className="mb-6 rounded-xl border border-premium/40 bg-premium/5 p-5 text-sm glass-card shadow-lg shadow-premium/5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-premium animate-ping" />
            <p className="font-bold text-premium uppercase tracking-wider">{t("status.premium")}</p>
          </div>
          {profile.subscription_expires_at && (
            <p className="text-muted-foreground mt-1 text-xs">
              {t("status.expires")}:{" "}
              <span className="text-foreground font-semibold">
                {new Date(profile.subscription_expires_at).toLocaleDateString("mn-MN")}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Android APK Download Banner */}
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 glass-card shadow-lg shadow-primary/5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary">
          <Smartphone className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1">
          <p className="font-bold text-primary text-base">Гар утасны Native Апп</p>
          <p className="text-xs text-muted-foreground/90 leading-relaxed">
            moncone платформыг гар утсан дээрээ илүү хурдан, амар ашиглахын тулд албан ёсны Андройд апп-ыг (.apk) шууд татаж аваарай.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white font-bold gap-1.5 transition-all duration-300 shadow shadow-primary/20 hover:scale-[1.05] rounded-xl px-5"
        >
          <a href="/app-release.apk" download>
            <Download className="h-4 w-4" />
            Татах
          </a>
        </Button>
      </div>

      {/* Telegram connect banner */}
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-border/40 bg-card p-5 glass-card shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/80 border border-border/60 text-primary">
          <Send className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1">
          <p className="font-bold text-foreground">{t("plans.tg.title")}</p>
          <p className="text-xs text-muted-foreground/95 leading-relaxed">{t("plans.tg.desc")}</p>
          <p className="text-[10px] text-muted-foreground">
            Бот руу <code className="rounded bg-secondary/80 px-1.5 py-0.5 text-primary font-mono">/start {user.email}</code> гэж бичнэ үү.
          </p>
        </div>
        {profile.telegram_chat_id ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            <CheckCircle2 className="h-4 w-4" /> {t("tg.connected")}
          </span>
        ) : (
          <Button asChild size="sm" variant="secondary" className="font-bold rounded-xl px-5 hover:scale-[1.03]">
            <a href={`https://t.me/${tgUser}?start=${code}`}>{t("plans.tg.cta")}</a>
          </Button>
        )}
      </div>

      {/* Bank details */}
      <div className="space-y-6 rounded-xl border border-border/60 bg-card p-6 shadow-xl relative overflow-hidden glass-card">
        {/* Subtle royal gold gradient overlay on header */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-premium to-primary" />
        
        <h2 className="text-xl font-extrabold text-white">{t("plans.howto")}</h2>
        
        <div className="space-y-1">
          <Row label={t("plans.bank")} value={settings?.bank_name ?? "—"} />
          <Row
            label={t("plans.account")}
            value={settings?.bank_account_number || "(админ оруулаагүй)"}
            onCopy={() => settings?.bank_account_number && copy(settings.bank_account_number)}
          />
          <Row label={t("plans.holder")} value={settings?.bank_account_name || "—"} />
          <Row label={t("plans.amount")} value={`₮${price.toLocaleString()}`} />
          <Row label={t("plans.code")} value={code} onCopy={() => copy(code)} highlight />
        </div>

        <div className="rounded-xl bg-secondary/40 p-4 border border-border/20 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("plans.note")}:</p>
          <div className="flex items-center justify-between gap-3">
            <code className="text-sm font-bold text-primary font-mono select-all bg-background px-3 py-1.5 rounded-lg border border-border/40 flex-1">{note}</code>
            <Button size="icon" variant="ghost" onClick={() => copy(note)} className="hover:bg-primary/10 hover:text-primary">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button 
          onClick={submit} 
          disabled={submitting} 
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 rounded-xl text-base hover:scale-[1.01] transition-transform shadow-lg shadow-primary/10"
        >
          {submitting ? "..." : `🏦 Банкаар шилжүүлэх (Шилжүүлсэн гэрэл зураг илгээх)`}
        </Button>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-border/40"></div>
          <span className="flex-shrink mx-4 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">эсвэл</span>
          <div className="flex-grow border-t border-border/40"></div>
        </div>

        <Button 
          onClick={async () => {
            setSubmitting(true);
            try {
              // Direct mock Stripe Checkout Webhook trigger to test the automatic premium flow!
              const res = await fetch("/api/public/payments/stripe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "checkout.session.completed",
                  data: {
                    object: {
                      amount_total: price * 100,
                      metadata: {
                        user_id: user.id,
                        payment_code: `STRIPE-SIM-${code}`,
                      }
                    }
                  }
                })
              });
              const resData = await res.json() as any;
              if (resData.ok) {
                toast.success("💳 Stripe төлбөр амжилттай баталгаажиж, Premium эрх автоматаар идэвхжлээ!");
                await refreshMeta();
                await loadMine();
              } else {
                toast.error("Stripe симуляци амжилтгүй: " + resData.error);
              }
            } catch (e: any) {
              toast.error("Холболтын алдаа: " + e.message);
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting} 
          className="w-full bg-gradient-to-r from-[#635bff] to-[#8075ff] hover:brightness-[1.1] text-white font-bold py-6 rounded-xl text-base flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform shadow-lg shadow-[#635bff]/20"
        >
          <Crown className="h-5 w-5 animate-pulse" />
          <span>💳 Stripe-оор төлөх (Шуурхай / Автомат)</span>
        </Button>
      </div>

      {/* History */}
      {payments.length > 0 && (
        <div className="mt-8 rounded-lg border border-border/60 bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold">{t("plans.history")}</h2>
          <table className="w-full text-sm">
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-border/40">
                  <td className="py-2">{new Date(p.created_at).toLocaleDateString("mn-MN")}</td>
                  <td className="py-2">{p.payment_code}</td>
                  <td className="py-2">₮{p.amount.toLocaleString()}</td>
                  <td className="py-2 text-right">
                    <span
                      className={
                        p.status === "confirmed"
                          ? "text-primary"
                          : p.status === "pending"
                            ? "text-amber-500"
                            : "text-muted-foreground"
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/profile" className="hover:text-foreground">
          ← Профайл руу
        </Link>
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  onCopy,
  highlight,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className={highlight ? "font-mono text-lg font-bold text-primary" : "font-medium"}>
          {value}
        </span>
        {onCopy && (
          <Button size="icon" variant="ghost" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
