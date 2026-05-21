import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Film, Mail, Smartphone } from "lucide-react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [codeSent, setCodeSent] = useState(false);
  const [tgUser, setTgUser] = useState("moncone_bot");
  const [phoneVerificationMethod, setPhoneVerificationMethod] = useState<"telegram" | "sms">("telegram");

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("telegram_bot_username")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.telegram_bot_username) {
          setTgUser(data.telegram_bot_username);
        }
      });
  }, []);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (loginMethod === "email") {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        toast.error("Имэйл хаягаа оруулна уу.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Нэвтрэх кодыг таны имэйл рүү илгээлээ!");
        setCodeSent(true);
      }
    }
  };

  const handleTelegramCode = async () => {
    const cleanPhone = phone.trim();
    if (!/^\d{8}$/.test(cleanPhone)) {
      toast.error("Монгол улсын 8 оронтой утасны дугаар оруулна уу.");
      return;
    }
    setPhoneVerificationMethod("telegram");
    window.open(`https://t.me/${tgUser}?start=otp`, "_blank");
    toast.success(
      "Telegram чат руу шилжлээ. 'Start' болон '📱 Утасны дугаар илгээх' товчийг дарж нэвтрэх кодоо авна уу!"
    );
    setCodeSent(true);
  };

  const handleSmsCode = async () => {
    const cleanPhone = phone.trim();
    if (!/^\d{8}$/.test(cleanPhone)) {
      toast.error("Монгол улсын 8 оронтой утасны дугаар оруулна уу.");
      return;
    }
    setLoading(true);
    setPhoneVerificationMethod("sms");
    try {
      const response = await fetch("/api/public/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      setLoading(false);
      const data = await response.json() as any;
      if (!response.ok) {
        toast.error(data.error || "SMS илгээхэд алдаа гарлаа.");
      } else {
        toast.success("Нэвтрэх кодыг таны утас руу SMS-ээр илгээлээ!");
        setCodeSent(true);
      }
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "Сүлжээний алдаа гарлаа. Дахин оролдоно уу.");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      toast.error("Нэг удаагийн нууц кодоо оруулна уу.");
      setLoading(false);
      return;
    }

    if (loginMethod === "email") {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanOtp,
        type: "email",
      });
      setLoading(false);
      if (error) {
        toast.error("Буруу эсвэл хугацаа нь дууссан код байна.");
      } else {
        toast.success("Тавтай морил!");
        navigate({ to: "/" });
      }
    } else {
      const cleanPhone = phone.trim();
      const loginEmail = `phone-${cleanPhone}@moncone.online`;
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: cleanOtp,
      });
      setLoading(false);
      if (error) {
        if (phoneVerificationMethod === "sms") {
          toast.error("Баталгаажуулах код буруу байна эсвэл хугацаа нь дууссан байна. Дахин оролдоно уу.");
        } else {
          toast.error("Код буруу байна эсвэл Telegram-аар баталгаажуулаагүй байна. Дахин оролдоно уу.");
        }
      } else {
        toast.success("Тавтай морил!");
        navigate({ to: "/" });
      }
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 animate-fade-in">
        <Film className="h-10 w-10 text-primary animate-pulse" />
        <h1 className="text-2xl font-bold tracking-tight text-white">Нэвтрэх / Бүртгүүлэх</h1>
        <p className="text-xs text-muted-foreground text-center">
          Имэйл эсвэл Утасны дугаараараа шууд нэвтэрнэ үү.
        </p>
      </div>
      <div className="space-y-6 rounded-lg border border-border/60 bg-card p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Method Toggle Tabs (only show if code is not sent yet) */}
        {!codeSent && (
          <div className="grid grid-cols-2 gap-1 rounded-md bg-secondary/30 p-1">
            <button
              type="button"
              onClick={() => setLoginMethod("email")}
              className={`flex items-center justify-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
                loginMethod === "email"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-4 w-4" />
              Имэйлээр
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod("phone")}
              className={`flex items-center justify-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
                loginMethod === "phone"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-4 w-4" />
              Утасны дугаараар
            </button>
          </div>
        )}

        {!codeSent ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            {loginMethod === "email" ? (
              <>
                <div className="space-y-1.5 transition-all duration-300">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Түр хүлээнэ үү..." : "Нэвтрэх код авах"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-1.5 transition-all duration-300 animate-slide-in">
                  <Label htmlFor="phone">Утасны дугаар</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
                      +976
                    </span>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      pattern="[0-9]{8}"
                      maxLength={8}
                      placeholder="XXXXXXXX"
                      className="pl-14 font-mono text-white tracking-wider"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Монгол улсын 8 оронтой дугаарыг бичнэ үү (Жишээ: 99112233)
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <Button
                    type="button"
                    onClick={handleTelegramCode}
                    className="w-full bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-medium flex items-center justify-center gap-2 cursor-pointer transition-all duration-300"
                    disabled={loading}
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.37.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/>
                    </svg>
                    Telegram-аар код авах (ҮНЭГҮЙ)
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSmsCode}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-border/80 cursor-pointer transition-all duration-300"
                    disabled={loading}
                  >
                    SMS-ээр код авах
                  </Button>
                </div>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4 animate-scale-up">
            <div className="rounded bg-secondary/20 p-3 text-xs text-muted-foreground border border-border/40">
              {loginMethod === "email" ? (
                <p>
                  Бид таны <b>{email}</b> имэйл рүү 6 оронтой нууц код илгээлээ. Имэйл хаягаа шалгана уу.
                </p>
              ) : (
                <p>
                  Таны утас руу илгээсэн 6 оронтой нэг удаагийн баталгаажуулах кодыг (SMS) доор оруулна уу.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="otpCode">Баталгаажуулах код (OTP)</Label>
              <Input
                id="otpCode"
                type="text"
                required
                maxLength={6}
                placeholder="XXXXXX"
                className="text-center font-mono text-xl tracking-[0.5em] pl-[0.5em] text-white"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Баталгаажуулж байна..." : "Баталгаажуулах & Нэвтрэх"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setOtpCode("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground text-center w-full block mt-2 hover:underline"
            >
              Дугаар эсвэл имэйл өөрчлөх
            </button>
          </form>
        )}

        {/* Separator (only show if code is not sent yet) */}
        {!codeSent && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Эсвэл</span>
              </div>
            </div>

            {/* Google Sign-in Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 border-border/80 hover:bg-secondary/40 transition-all duration-300"
              onClick={handleGoogleLogin}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.136 4.113-3.41 0-6.173-2.763-6.173-6.173s2.763-6.173 6.173-6.173c1.558 0 2.979.577 4.077 1.527l3.057-3.057C18.966 1.838 15.79 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.898 0 10.871-4.227 10.871-11.24 0-.668-.057-1.312-.172-1.955H12.24z"
                />
              </svg>
              Google хаягаар шууд нэвтрэх
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
