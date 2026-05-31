import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { Database } from "@/integrations/supabase/types";

/**
 * moncone Automated Stripe Webhook & Subscription Integration
 * 
 * This endpoint processes incoming webhook notifications from Stripe. When a user
 * successfully subscribes or completes checkout, it double-checks the session
 * directly with Stripe's API for absolute security before promoting them 
 * to Premium status in Supabase.
 */

export const Route = createFileRoute("/api/public/payments/stripe")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          status: "active",
          gateway: "Stripe Webhook Gateway",
          timestamp: new Date().toISOString(),
          message: "Secure Webhook is active and listening for POST requests only."
        });
      },
      POST: async ({ request }) => {
        try {
          const url = process.env.SUPABASE_URL || "";
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
          const stripeSecret = process.env.STRIPE_SECRET_KEY;

          if (!url || !serviceKey || !stripeSecret) {
            console.error("Missing server-side configuration credentials");
            return Response.json({ ok: false, error: "Configuration error" }, { status: 500 });
          }

          const stripe = new Stripe(stripeSecret, { apiVersion: "2025-04-30.basil" });
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
            const sessionData = body.data.object;
            const sessionId = sessionData?.id;

            if (!sessionId) {
              console.error("❌ Stripe Webhook: Missing checkout session ID");
              return Response.json({ ok: false, error: "Missing session ID" }, { status: 400 });
            }

            // SECURE CHECK: Query Stripe directly to verify payment is authentic
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status !== "paid") {
              console.error(`❌ Stripe Webhook: Attempted mock session payment bypass (${sessionId})`);
              return Response.json({ ok: false, error: "Payment not completed" }, { status: 402 });
            }

            const userId = session.metadata?.user_id;
            const paymentCode = session.metadata?.payment_code || `STRIPE-${sessionId}`;
            const amountMnt = session.amount_total 
              ? Math.round((session.amount_total / 100) * 3400) 
              : 10000;

            if (!userId) {
              console.error("❌ Stripe Checkout Session missing user_id in metadata");
              return Response.json({ ok: false, error: "Missing user_id metadata" }, { status: 400 });
            }

            // Prevent duplicate activation
            const { data: existing } = await admin
              .from("payments")
              .select("id")
              .eq("payment_code", `STRIPE-${sessionId}`)
              .maybeSingle();

            if (existing) {
              console.log(`ℹ️ Webhook: Session ${sessionId} already processed`);
              return Response.json({ ok: true, message: "Already processed" });
            }

            console.log(`✅ Secure Stripe Payment confirmed for user: ${userId}, Amount: ₮${amountMnt}`);

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

            // Sync with subscriptions table
            await admin
              .from("subscriptions")
              .upsert({ 
                user_id: userId, 
                tier: "premium", 
                current_period_end: expiresAt.toISOString(), 
                updated_at: new Date().toISOString() 
              });

            // 2. Insert verified payment history
            const { error: payError } = await admin
              .from("payments")
              .insert({
                user_id: userId,
                payment_code: `STRIPE-${sessionId}`,
                amount: amountMnt,
                status: "confirmed",
                confirmed_at: new Date().toISOString(),
                note: "Stripe Webhook автомат баталгаажуулалт",
              });

            if (payError) {
              console.warn("⚠️ Warning: Failed to record payment history row:", payError.message);
            }

            // 3. Notify user via Telegram
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

