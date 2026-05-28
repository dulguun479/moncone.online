import { Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Film, Globe, LogOut, Shield, User as UserIcon, Download, Send } from "lucide-react";
import { useState, useEffect } from "react";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [tgUser, setTgUser] = useState("moncone_bot");

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
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default prompt
      e.preventDefault();
      // Cache the prompt event
      setDeferredPrompt(e);
      // Reveal the premium install action button
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Turn off if already loaded inside native shell context (standalone display)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA installation outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Film className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">moncone</span>
        </Link>
        <nav className="hidden gap-5 text-sm text-muted-foreground md:flex">
          <Link
            to="/"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground transition-colors"
          >
            {t("nav.home")}
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              activeProps={{ className: "text-foreground" }}
              className="hover:text-foreground transition-colors"
            >
              {t("nav.admin")}
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {showInstallBtn && (
            <>
              {/* Desktop Layout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstallClick}
                className="hidden md:flex gap-1.5 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 animate-pulse font-medium shadow-sm shadow-primary/10"
              >
                <Download className="h-4 w-4" />
                <span>Апп Суулгах</span>
              </Button>
              {/* Mobile Layout Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleInstallClick}
                className="flex md:hidden border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 animate-pulse"
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="text-primary hover:text-primary-foreground hover:bg-primary/10 transition-colors"
            title="Telegram"
          >
            <a href={`https://t.me/${tgUser}`}>
              <Send className="h-4 w-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "mn" ? "en" : "mn")}
            className="gap-1.5"
          >
            <Globe className="h-4 w-4" />
            <span className="uppercase">{lang}</span>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/profile">
                  <UserIcon className="h-4 w-4" />
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/admin">
                    <Shield className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">{t("nav.signup")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
