import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { tgSend } from "@/lib/telegram.server";

export const Route = createFileRoute("/api/public/cron/expire")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("apikey");
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!anon || provided !== anon) return new Response("Unauthorized", { status: 401 });

        const admin = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } },
        );

        const { data, error } = await admin.rpc("expire_subscriptions");
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const expired = (data as any[]) ?? [];
        for (const row of expired) {
          if (row.telegram_chat_id) {
            await tgSend(
              row.telegram_chat_id,
              "❌ Таны moncone Premium эрх дууслаа. Үргэлжлүүлэхийн тулд төлбөр шилжүүлнэ үү: cine-mongolia-pro.lovable.app/plans",
            );
          }
        }

        // 3-day warning to upcoming expirations
        const in3 = new Date();
        in3.setDate(in3.getDate() + 3);
        const in4 = new Date();
        in4.setDate(in4.getDate() + 4);
        const { data: soon } = await admin
          .from("profiles")
          .select("id, telegram_chat_id, subscription_expires_at")
          .eq("subscription_status", "premium")
          .gte("subscription_expires_at", in3.toISOString())
          .lt("subscription_expires_at", in4.toISOString());
        for (const p of soon ?? []) {
          if (p.telegram_chat_id) {
            await tgSend(
              p.telegram_chat_id as number,
              "⚠️ Таны moncone Premium эрх 3 хоногийн дараа дуусна. ₮10,000 шилжүүлж сунгана уу.",
            );
          }
        }

        return Response.json({ ok: true, expired: expired.length, warned: soon?.length ?? 0 });
      },
    },
  },
});
