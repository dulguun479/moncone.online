import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crown, Send, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  const { t } = useI18n();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);
  useEffect(() => {
    setName(profile?.display_name ?? "");
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Хадгаллаа");
  };

  if (!user || !profile) return null;
  const isPremium = profile.subscription_status === "premium";
  const daysLeft = profile.subscription_expires_at
    ? Math.max(
        0,
        Math.ceil((new Date(profile.subscription_expires_at).getTime() - Date.now()) / 86400000),
      )
    : 0;

  const isPhoneEmail = user.email?.startsWith("phone-") && user.email?.endsWith("@moncone.online");
  const hasNativePhone = !!user.phone;

  let displayEmail = user.email ?? "";
  let emailLabel = t("auth.email");

  if (isPhoneEmail) {
    displayEmail = `+976 ${user.email!.replace("phone-", "").replace("@moncone.online", "")}`;
    emailLabel = "Утасны дугаар";
  } else if (hasNativePhone) {
    displayEmail = user.phone!;
    emailLabel = "Утасны дугаар";
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <h1 className="mb-8 font-display text-4xl font-bold uppercase tracking-wider text-white">{t("profile.title")}</h1>

      <div className="space-y-6 rounded-2xl border border-white/5 bg-card/45 p-8 backdrop-blur-2xl glass-card shadow-2xl">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground/80 font-medium">{emailLabel}</Label>
          <Input value={displayEmail} disabled className="bg-black/20 border-white/5 rounded-xl text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground/80 font-medium">{t("auth.name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-black/20 border-white/5 focus-visible:ring-primary/45 rounded-xl text-white" />
        </div>
        <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-6 transition-all shadow shadow-primary/20 hover:scale-[1.03]">
          {t("profile.save")}
        </Button>
      </div>

      <div className="mt-6 rounded-2xl border border-white/5 bg-card/45 p-8 backdrop-blur-2xl glass-card shadow-2xl">
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wider text-white">{t("profile.plan")}</h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {isPremium ? (
              <>
                <p className="inline-flex items-center gap-2 text-premium font-bold tracking-wide uppercase text-sm">
                  <Crown className="h-4 w-4 animate-pulse" /> {t("status.premium")}
                </p>
                {profile.subscription_expires_at && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t("status.expires")}:{" "}
                    <span className="text-foreground font-semibold">
                      {new Date(profile.subscription_expires_at).toLocaleDateString("mn-MN")}
                    </span>{" "}
                    ·{" "}
                    <span className="text-primary font-bold">
                      {daysLeft} {t("status.daysLeft")}
                    </span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground/90 leading-relaxed">
                Free · реклам үзнэ, зөвхөн үнэгүй кинонууд
              </p>
            )}
          </div>
          <Button asChild className="bg-premium hover:bg-premium/90 text-premium-foreground font-bold rounded-xl px-6 shadow-lg shadow-premium/15 hover:scale-[1.03] transition-all">
            <Link to="/plans">{isPremium ? t("status.renew") : t("profile.upgrade")}</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/5 bg-card/45 p-8 backdrop-blur-2xl glass-card shadow-2xl">
        <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-wider text-white">Telegram</h2>
        {profile.telegram_chat_id ? (
          <p className="inline-flex items-center gap-2 text-primary font-bold text-sm">
            <CheckCircle2 className="h-4 w-4" /> {t("tg.connected")}
          </p>
        ) : (
          <p className="inline-flex items-center gap-2 text-muted-foreground/80 text-xs leading-relaxed">
            <Send className="h-4 w-4 text-primary" /> {t("tg.notConnected")} —{" "}
            <Link to="/plans" className="underline font-bold text-foreground hover:text-primary transition-colors">
              холбох заавар
            </Link>
          </p>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground/80 text-center">
        Таны төлбөрийн код: <code className="text-primary font-bold font-mono bg-primary/5 border border-primary/20 px-2 py-0.5 rounded ml-1">{profile.payment_code}</code>
      </p>
    </div>
  );
}
