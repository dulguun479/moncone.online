import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * POST /api/public/payments/gift
 * Validates a gift code and activates premium for the user.
 * Body: { user_id: string, code: string }
 */
export const Route = createFileRoute("/api/public/payments/gift")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          status: "active",
          gateway: "Gift Code Validator",
          timestamp: new Date().toISOString(),
          message: "Gift Code validator is ready. Use POST to redeem gift codes."
        });
      },
      POST: async ({ request }) => {
        try {
          const url = process.env.SUPABASE_URL || "";
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

          if (!url || !serviceKey) {
            return Response.json({ ok: false, error: "Server config error" }, { status: 500 });
          }

          const admin = createClient<Database>(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          const body = await request.json() as { user_id: string; code: string };
          const { user_id, code } = body;

          if (!user_id || !code) {
            return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });
          }

          const upperCode = code.toUpperCase().trim();

          // Look up gift code in database
          const { data: gift, error: findErr } = await admin
            .from("gift_codes" as any)
            .select("*")
            .eq("code", upperCode)
            .eq("is_used", false)
            .maybeSingle();

          if (findErr || !gift) {
            return Response.json({ ok: false, error: "Код хүчингүй эсвэл ашигласан байна" }, { status: 404 });
          }

          const giftData = gift as { id: string; days: number; code: string };
          const days = giftData.days ?? 30;

          // Calculate expiry
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);

          // Activate premium
          const { error: updateErr } = await admin
            .from("profiles")
            .update({
              subscription_status: "premium",
              subscription_expires_at: expiresAt.toISOString(),
            })
            .eq("id", user_id);

          if (updateErr) {
            return Response.json({ ok: false, error: updateErr.message }, { status: 500 });
          }

          // Mark code as used
          await admin
            .from("gift_codes" as any)
            .update({ is_used: true, used_by: user_id, used_at: new Date().toISOString() })
            .eq("id", giftData.id);

          // Log payment record
          await admin.from("payments").insert({
            user_id,
            payment_code: `GIFT-${upperCode}`,
            amount: 0,
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
          });

          return Response.json({ ok: true, days, expires_at: expiresAt.toISOString() });
        } catch (err: any) {
          return Response.json({ ok: false, error: err.message }, { status: 500 });
        }
      },
    },
  },
});
