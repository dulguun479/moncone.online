import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { Database } from "@/integrations/supabase/types";

/**
 * POST /api/public/payments/stripe-verify
 *
 * Called from the browser immediately after Stripe redirects back to
 * /plans?stripe=success&sid=XXXX.  No webhook required.
 *
 * Flow:
 *   1. Receive { session_id, user_id } from the browser
 *   2. Ask Stripe directly: "was this session actually paid?"
 *   3. If yes  → activate 30-day Premium in Supabase, record payment
 *   4. If no   → return error
 */
export const Route = createFileRoute("/api/public/payments/stripe-verify")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          status: "active",
          gateway: "Stripe Direct Verification",
          timestamp: new Date().toISOString(),
          message: "Secure Direct Verification is ready. Use POST to verify Stripe sessions."
        });
      },
      POST: async ({ request }) => {
        try {
          const stripeSecret = process.env.STRIPE_SECRET_KEY;
          const supabaseUrl = process.env.SUPABASE_URL || "";
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

          if (!stripeSecret || !supabaseUrl || !serviceKey) {
            return Response.json(
              { ok: false, error: "Server configuration missing" },
              { status: 500 },
            );
          }

          const stripe = new Stripe(stripeSecret, { apiVersion: "2025-04-30.basil" });
          const admin = createClient<Database>(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          const body = (await request.json()) as {
            session_id: string;
            user_id: string;
          };

          const { session_id, user_id } = body;
          if (!session_id || !user_id) {
            return Response.json({ ok: false, error: "Missing session_id or user_id" }, { status: 400 });
          }

          // ──────────────────────────────────────────────
          // 1. Ask Stripe: did this session actually pay?
          // ──────────────────────────────────────────────
          const session = await stripe.checkout.sessions.retrieve(session_id);

          if (session.payment_status !== "paid") {
            return Response.json(
              { ok: false, error: `Төлбөр хийгдээгүй байна (status: ${session.payment_status})` },
              { status: 402 },
            );
          }

          // Double-check user_id from metadata matches the caller
          const metaUserId = session.metadata?.user_id;
          if (metaUserId && metaUserId !== user_id) {
            return Response.json({ ok: false, error: "User mismatch" }, { status: 403 });
          }

          // ──────────────────────────────────────────────
          // 2. Prevent double-activation: check if already
          //    recorded this session_id
          // ──────────────────────────────────────────────
          const { data: existing } = await admin
            .from("payments")
            .select("id")
            .eq("payment_code", `STRIPE-${session_id}`)
            .maybeSingle();

          if (existing) {
            // Already activated — return success anyway
            return Response.json({ ok: true, already: true });
          }

          // ──────────────────────────────────────────────
          // 3. Activate 30-day VIP
          // ──────────────────────────────────────────────
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          const { error: profErr } = await admin
            .from("profiles")
            .update({
              subscription_status: "premium",
              subscription_expires_at: expiresAt.toISOString(),
            })
            .eq("id", user_id);

          if (profErr) {
            return Response.json({ ok: false, error: profErr.message }, { status: 500 });
          }

          // Also sync subscriptions table
          await admin
            .from("subscriptions")
            .upsert({ user_id, tier: "premium", current_period_end: expiresAt.toISOString(), updated_at: new Date().toISOString() });

          // ──────────────────────────────────────────────
          // 4. Record in payments history
          // ──────────────────────────────────────────────
          const amountMnt = session.amount_total
            ? Math.round((session.amount_total / 100) * 3400)
            : 10000;

          await admin.from("payments").insert({
            user_id,
            payment_code: `STRIPE-${session_id}`,
            amount: amountMnt,
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
            note: "Stripe Checkout автомат баталгаажуулалт",
          });

          // ──────────────────────────────────────────────
          // 5. Notify user via Telegram (if linked)
          // ──────────────────────────────────────────────
          try {
            const { data: prof } = await admin
              .from("profiles")
              .select("telegram_chat_id")
              .eq("id", user_id)
              .maybeSingle();
            const chatId = (prof as any)?.telegram_chat_id;
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            if (chatId && botToken) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `✅ <b>Stripe төлбөр баталгаажлаа!</b>\nТаны <b>Moncone VIP</b> эрх идэвхжлээ.\nДуусах: <b>${expiresAt.toLocaleDateString("mn-MN")}</b>`,
                  parse_mode: "HTML",
                }),
              });
            }
          } catch { /* non-fatal */ }

          console.log(`✅ Stripe VIP activated for user ${user_id}, expires ${expiresAt.toISOString()}`);
          return Response.json({ ok: true, expires_at: expiresAt.toISOString() });
        } catch (err: any) {
          console.error("stripe-verify error:", err.message);
          return Response.json({ ok: false, error: err.message }, { status: 500 });
        }
      },
    },
  },
});
