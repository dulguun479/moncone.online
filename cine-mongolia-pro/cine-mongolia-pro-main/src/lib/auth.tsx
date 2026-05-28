import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ProfileMeta = {
  payment_code: string | null;
  subscription_status: "free" | "premium";
  subscription_expires_at: string | null;
  telegram_chat_id: number | null;
  display_name: string | null;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  tier: "free" | "premium" | null;
  profile: ProfileMeta | null;
  refreshMeta: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  tier: null,
  profile: null,
  refreshMeta: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tier, setTier] = useState<"free" | "premium" | null>(null);
  const [profile, setProfile] = useState<ProfileMeta | null>(null);

  const loadMeta = async (uid: string) => {
    const [{ data: roles }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase
        .from("profiles")
        .select(
          "display_name, payment_code, subscription_status, subscription_expires_at, telegram_chat_id",
        )
        .eq("id", uid)
        .maybeSingle(),
    ]);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    const p = (prof as ProfileMeta | null) ?? null;
    setProfile(p);
    setTier((p?.subscription_status as "free" | "premium") ?? "free");
  };

  const refreshMeta = async () => {
    if (user?.id) await loadMeta(user.id);
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadMeta(s.user.id), 0);
      } else {
        setIsAdmin(false);
        setTier(null);
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadMeta(data.session.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{ user, session, loading, isAdmin, tier, profile, refreshMeta }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
