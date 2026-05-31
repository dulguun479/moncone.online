import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { Database } from "@/integrations/supabase/types";

/**
 * POST /api/public/payments/checkout
 * Creates a real Stripe Checkout Session and returns the redirect URL.
 * The success_url embeds the session_id so we can verify payment on return
 * without needing any webhook configuration.
 */
export const Route = createFileRoute("/api/public/payments/checkout")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          status: "active",
          gateway: "Stripe Checkout Initiator",
          timestamp: new Date().toISOString(),
          message: "Checkout initiator is ready. Use POST to create a Stripe session."
        });
      },
      POST: async ({ request }) => {
        try {
          const stripeSecret = process.env.STRIPE_SECRET_KEY;
          if (!stripeSecret) {
            return Response.json({ ok: false, error: "Stripe key missing" }, { status: 500 });
          }

          const stripe = new Stripe(stripeSecret, { apiVersion: "2025-04-30.basil" });

          const body = await request.json() as {
            user_id: string;
            payment_code: string;
            amount: number;
            email?: string;
          };

          const { user_id, payment_code, amount, email } = body;
          if (!user_id || !payment_code || !amount) {
            return Response.json({ ok: false, error: "Missing required fields" }, { status: 400 });
          }

          // Convert MNT to USD cents (1 USD ≈ 3400 MNT)
          const amountUsd = Math.max(50, Math.round((amount / 3400) * 100));

          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            customer_email: email || undefined,
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Moncone VIP Premium — 30 хоног",
                    description: "Монгол кино стриминг платформын VIP эрх",
                  },
                  unit_amount: amountUsd,
                },
                quantity: 1,
              },
            ],
            metadata: { user_id, payment_code },
            // IMPORTANT: session_id embedded so the verify endpoint can activate VIP on return
            success_url: `https://moncone.online/plans?stripe=success&sid={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://moncone.online/plans?stripe=cancel`,
          });

          return Response.json({ ok: true, url: session.url, session_id: session.id });
        } catch (err: any) {
          console.error("Stripe Checkout error:", err.message);
          return Response.json({ ok: false, error: err.message }, { status: 500 });
        }
      },
    },
  },
});
