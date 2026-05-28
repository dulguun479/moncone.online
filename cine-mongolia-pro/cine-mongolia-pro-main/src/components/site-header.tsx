import { Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Film, Globe, LogOut, Shield, User as UserIcon } from "lucide-react";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

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
