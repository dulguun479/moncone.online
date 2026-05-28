import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Crown, Copy, Send, CheckCircle2 } from "lucide-react";
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
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Crown className="h-7 w-7 text-premium" />
        <h1 className="text-3xl font-bold">{t("plans.title")}</h1>
      </div>

      {profile.subscription_status === "premium" && (
        <div className="mb-6 rounded-lg border border-premium/40 bg-premium/10 p-4 text-sm">
          <p className="font-semibold text-premium">✓ {t("status.premium")}</p>
          {profile.subscription_expires_at && (
            <p className="text-muted-foreground">
              {t("status.expires")}:{" "}
              {new Date(profile.subscription_expires_at).toLocaleDateString("mn-MN")}
            </p>
          )}
        </div>
      )}

      {/* Telegram connect banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-border/60 bg-card p-4">
        <Send className="mt-0.5 h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="font-medium">{t("plans.tg.title")}</p>
          <p className="text-sm text-muted-foreground">{t("plans.tg.desc")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Бот руу <code className="rounded bg-secondary px-1.5 py-0.5">/start {user.email}</code>{" "}
            гэж бичнэ үү.
          </p>
        </div>
        {profile.telegram_chat_id ? (
          <span className="inline-flex items-center gap-1 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" /> {t("tg.connected")}
          </span>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <a href={`https://t.me/${tgUser}`} target="_blank" rel="noreferrer">
              {t("plans.tg.cta")}
            </a>
          </Button>
        )}
      </div>

      {/* Bank details */}
      <div className="space-y-4 rounded-lg border border-border/60 bg-card p-6">
        <h2 className="text-lg font-semibold">{t("plans.howto")}</h2>
        <Row label={t("plans.bank")} value={settings?.bank_name ?? "—"} />
        <Row
          label={t("plans.account")}
          value={settings?.bank_account_number || "(админ оруулаагүй)"}
          onCopy={() => settings?.bank_account_number && copy(settings.bank_account_number)}
        />
        <Row label={t("plans.holder")} value={settings?.bank_account_name || "—"} />
        <Row label={t("plans.amount")} value={`₮${price.toLocaleString()}`} />
        <Row label={t("plans.code")} value={code} onCopy={() => copy(code)} highlight />

        <div className="rounded-md bg-secondary/60 p-3 text-sm">
          <p className="mb-1 font-medium">{t("plans.note")}:</p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-primary">{note}</code>
            <Button size="icon" variant="ghost" onClick={() => copy(note)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full">
          {submitting ? "..." : t("plans.confirm")}
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
