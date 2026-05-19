import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "./admin.server";

export const adminFullStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { count: users } = await supabaseAdmin.from("profiles").select("*", { count: "exact", head: true });
    const { count: premium } = await supabaseAdmin
      .from("profiles").select("*", { count: "exact", head: true }).eq("subscription_status", "premium");

    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    const [{ data: todayP }, { data: monthP }] = await Promise.all([
      supabaseAdmin.from("payments").select("amount, confirmed_at")
        .eq("status", "confirmed").gte("confirmed_at", startOfToday.toISOString()),
      supabaseAdmin.from("payments").select("amount, confirmed_at")
        .eq("status", "confirmed").gte("confirmed_at", startOfMonth.toISOString()),
    ]);

    const todayRevenue = (todayP ?? []).reduce((s: number, p: { amount: number }) => s + (p.amount ?? 0), 0);
    const monthRevenue = (monthP ?? []).reduce((s: number, p: { amount: number }) => s + (p.amount ?? 0), 0);

    // Daily breakdown for the chart (last 30 days)
    const daily: Record<string, number> = {};
    const since = new Date(); since.setDate(since.getDate() - 29); since.setHours(0,0,0,0);
    const { data: monthAll } = await supabaseAdmin.from("payments")
      .select("amount, confirmed_at")
      .eq("status", "confirmed")
      .gte("confirmed_at", since.toISOString());
    for (let i = 0; i < 30; i++) {
      const d = new Date(since); d.setDate(since.getDate() + i);
      daily[d.toISOString().slice(0, 10)] = 0;
    }
    for (const p of monthAll ?? []) {
      if (!p.confirmed_at) continue;
      const k = new Date(p.confirmed_at).toISOString().slice(0, 10);
      if (k in daily) daily[k] += p.amount ?? 0;
    }
    const chart = Object.entries(daily).map(([date, amount]) => ({ date, amount }));

    return {
      users: users ?? 0,
      premium: premium ?? 0,
      todayRevenue,
      monthRevenue,
      chart,
    };
  });
