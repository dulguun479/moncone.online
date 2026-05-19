import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Ad = {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
};

export function AdSlot({ placement, className }: { placement: "home" | "movie" | "plans" | "profile"; className?: string }) {
  const [ad, setAd] = useState<Ad | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("ads")
        .select("id, title, image_url, link_url, placements, is_active, starts_at, ends_at")
        .eq("is_active", true)
        .contains("placements", [placement])
        .limit(20);
      const now = Date.now();
      const eligible = (data ?? []).filter((a: { starts_at: string | null; ends_at: string | null }) => {
        if (a.starts_at && new Date(a.starts_at).getTime() > now) return false;
        if (a.ends_at && new Date(a.ends_at).getTime() < now) return false;
        return true;
      });
      if (!mounted || eligible.length === 0) return;
      setAd(eligible[Math.floor(Math.random() * eligible.length)] as Ad);
    })();
    return () => { mounted = false; };
  }, [placement]);

  if (!ad) return null;

  const onClick = async () => {
    try {
      await supabase.from("ad_clicks").insert({ ad_id: ad.id, user_id: user?.id ?? null, page: placement });
    } catch (e) { console.error(e); }
  };

  return (
    <a
      href={ad.link_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={onClick}
      className={`block overflow-hidden rounded-lg border border-border/60 ${className ?? ""}`}
      aria-label={ad.title}
    >
      <img src={ad.image_url} alt={ad.title} className="h-auto w-full object-cover" loading="lazy" />
    </a>
  );
}
