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

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold">{t("profile.title")}</h1>

      <div className="space-y-6 rounded-lg border border-border/60 bg-card p-6">
        <div className="space-y-1.5">
          <Label>{t("auth.email")}</Label>
          <Input value={user.email ?? ""} disabled />
        </div>
        <div className="space-y-1.5">
          <Label>{t("auth.name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving}>
          {t("profile.save")}
        </Button>
      </div>

      <div className="mt-6 rounded-lg border border-border/60 bg-card p-6">
        <h2 className="mb-3 text-lg font-semibold">{t("profile.plan")}</h2>
        <div className="flex items-center justify-between">
          <div>
            {isPremium ? (
              <>
                <p className="inline-flex items-center gap-2 text-premium font-semibold">
                  <Crown className="h-4 w-4" /> {t("status.premium")}
                </p>
                {profile.subscription_expires_at && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("status.expires")}:{" "}
                    {new Date(profile.subscription_expires_at).toLocaleDateString("mn-MN")} ·{" "}
                    {daysLeft} {t("status.daysLeft")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Free · реклам үзнэ, зөвхөн үнэгүй кинонууд</p>
            )}
          </div>
          <Button asChild className="bg-premium text-premium-foreground hover:bg-premium/90">
            <Link to="/plans">{isPremium ? t("status.renew") : t("profile.upgrade")}</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border/60 bg-card p-6">
        <h2 className="mb-2 text-lg font-semibold">Telegram</h2>
        {profile.telegram_chat_id ? (
          <p className="inline-flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-4 w-4" /> {t("tg.connected")}
          </p>
        ) : (
          <p className="inline-flex items-center gap-2 text-muted-foreground">
            <Send className="h-4 w-4" /> {t("tg.notConnected")} —{" "}
            <Link to="/plans" className="underline">
              холбох заавар
            </Link>
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Таны төлбөрийн код: <code className="text-primary">{profile.payment_code}</code>
      </p>
    </div>
  );
}
