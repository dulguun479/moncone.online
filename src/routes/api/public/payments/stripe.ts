import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * moncone Automated Stripe Webhook & Subscription Integration
 * 
 * This endpoint processes incoming webhook notifications from Stripe. When a user
 * successfully subscribes or completes checkout, it automatically promotes them 
 * to Premium status in Supabase, bypassing the need for manual bank transfer approvals.
 */

export const Route = createFileRoute("/api/public/payments/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const url = process.env.SUPABASE_URL || "";
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

          if (!url || !serviceKey) {
            console.error("Missing server-side Supabase credentials");
            return Response.json({ ok: false, error: "Configuration error" }, { status: 500 });
          }

          const admin = createClient<Database>(url, serviceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          // Parse webhook body
          const body = await request.json() as any;
          const eventType = body.type;

          console.log(`🔔 Stripe Webhook Received event: ${eventType}`);

          if (eventType === "checkout.session.completed") {
            const session = body.data.object;
            const userId = session.metadata?.user_id;
            const paymentCode = session.metadata?.payment_code;
            const amount = session.amount_total ? session.amount_total / 100 : 10000;

            if (!userId) {
              console.error("❌ Stripe Checkout Session missing user_id in metadata");
              return Response.json({ ok: false, error: "Missing metadata" }, { status: 400 });
            }

            console.log(`✅ Stripe Payment confirmed for user: ${userId}, Amount: ₮${amount}`);

            // Calculate expiration (30 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            // 1. Update user profile subscription
            const { error: profError } = await admin
              .from("profiles")
              .update({
                subscription_status: "premium",
                subscription_expires_at: expiresAt.toISOString(),
              })
              .eq("id", userId);

            if (profError) {
              console.error("❌ Failed to update profile subscription:", profError.message);
              return Response.json({ ok: false, error: profError.message }, { status: 500 });
            }

            // 2. Insert verified payment history
            const { error: payError } = await admin
              .from("payments")
              .insert({
                user_id: userId,
                payment_code: paymentCode || "STRIPE-INSTANT",
                amount: amount,
                status: "confirmed",
                confirmed_at: new Date().toISOString(),
              });

            if (payError) {
              console.warn("⚠️ Warning: Failed to record payment history row:", payError.message);
            }

            // 3. Optional: Notify user/admin via Telegram if configured
            try {
              const { data: prof } = await admin
                .from("profiles")
                .select("telegram_chat_id")
                .eq("id", userId)
                .maybeSingle();

              if (prof?.telegram_chat_id) {
                const botToken = process.env.TELEGRAM_BOT_TOKEN;
                if (botToken) {
                  const msg = `⚡ <b>Төлбөр баталгаажлаа!</b>\nТаны <b>moncone Premium</b> эрх идэвхжлээ.\nДуусах хугацаа: <b>${expiresAt.toLocaleDateString("mn-MN")}</b>.`;
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chat_id: prof.telegram_chat_id,
                      text: msg,
                      parse_mode: "HTML",
                    }),
                  });
                }
              }
            } catch (tgErr) {
              console.warn("⚠️ Failed to send automated Telegram update:", tgErr);
            }

            console.log(`🎉 Automated Premium Activation complete for User: ${userId}`);
            return Response.json({ ok: true, message: "Subscription activated" });
          }

          return Response.json({ ok: true, message: "Event ignored" });
        } catch (err: any) {
          console.error("❌ Stripe webhook handling crash:", err.message);
          return Response.json({ ok: false, error: err.message }, { status: 500 });
        }
      },
    },
  },
});
