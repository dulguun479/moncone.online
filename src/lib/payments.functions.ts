import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tgSend } from "./telegram.server";
import { sendNotificationEmail } from "./email.server";
import { assertAdmin } from "./admin.server";

// User: create a pending payment row using their own payment_code
export const createPendingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("payment_code")
      .eq("id", userId)
      .maybeSingle();
    const code = (prof as { payment_code?: string } | null)?.payment_code;
    if (!code) throw new Error("No payment code on profile");

    const { data: settings } = await supabase
      .from("app_settings")
      .select("premium_price")
      .eq("id", 1)
      .maybeSingle();
    const amount = (settings as { premium_price?: number } | null)?.premium_price ?? 10000;

    const { data, error } = await supabase
      .from("payments")
      .insert({ user_id: userId, payment_code: code, amount, status: "pending" })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Notify admin via Telegram
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
      const { data: s } = await supabaseAdmin
        .from("app_settings").select("admin_telegram_chat_id").eq("id", 1).maybeSingle();
      const adminChat = (s as { admin_telegram_chat_id?: number } | null)?.admin_telegram_chat_id;
      if (adminChat) {
        await tgSend(
          adminChat,
          `💰 <b>Шинэ төлбөр хүлээгдэж байна</b>\nКод: <b>${code}</b>\nДүн: ₮${amount.toLocaleString()}\nХэрэглэгч: ${u?.user?.email ?? "?"}\n\nБаталгаажуулах: <code>/confirm ${code}</code>`,
        );
      }
    } catch (e) {
      console.error("[admin notify]", e);
    }
    return { payment: data };
  });

// Admin: confirm a payment by id. Activates 30-day premium + notifies user.
export const adminConfirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { paymentId: string }) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await assertAdmin(userId);

    const { data: confirmed, error } = await supabaseAdmin
      .rpc("confirm_payment", { _payment_id: data.paymentId });
    if (error) throw new Error(error.message);
    const payment = Array.isArray(confirmed) ? confirmed[0] : confirmed;

    // Notify user
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("telegram_chat_id, subscription_expires_at, id")
      .eq("id", payment.user_id)
      .single();
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(payment.user_id);
    const email = u?.user?.email;
    const expiry = prof?.subscription_expires_at
      ? new Date(prof.subscription_expires_at).toLocaleDateString("mn-MN")
      : "";

    const msg = `✅ Таны <b>moncone Premium</b> эрх идэвхжлээ!\nДуусах: <b>${expiry}</b>\nКино үзэх: moncone.online`;
    if (prof?.telegram_chat_id) {
      await tgSend(prof.telegram_chat_id as number, msg);
    }
    if (email) {
      await sendNotificationEmail(
        email,
        "moncone Premium идэвхжлээ",
        `<p>Сайн байна уу,</p><p>${msg.replace(/\n/g, "<br/>")}</p>`,
      );
    }
    return { ok: true, payment };
  });

// Admin: cancel a user's subscription
export const adminCancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.rpc("cancel_subscription", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin: list all payments with user emails
export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    const userIds = Array.from(new Set((payments ?? []).map((p: { user_id: string }) => p.user_id)));
    const emailMap: Record<string, string> = {};
    for (const id of userIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      if (u?.user?.email) emailMap[id] = u.user.email;
    }
    return {
      payments: (payments ?? []).map((p: { user_id: string }) => ({
        ...p,
        email: emailMap[p.user_id] ?? null,
      })),
    };
  });

// Admin: stats summary
export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { count: users } = await supabaseAdmin.from("profiles").select("*", { count: "exact", head: true });
    const { count: premium } = await supabaseAdmin
      .from("profiles").select("*", { count: "exact", head: true }).eq("subscription_status", "premium");
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const { data: monthPayments } = await supabaseAdmin
      .from("payments").select("amount")
      .eq("status", "confirmed")
      .gte("confirmed_at", startOfMonth.toISOString());
    const revenue = (monthPayments ?? []).reduce((s: number, p: { amount: number }) => s + (p.amount ?? 0), 0);
    return { users: users ?? 0, premium: premium ?? 0, revenue };
  });

// Admin: update settings
export const adminUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      bank_name: z.string().min(1).max(100),
      bank_account_number: z.string().min(1).max(50),
      bank_account_name: z.string().min(1).max(100),
      premium_price: z.number().int().min(1000).max(10_000_000),
      telegram_bot_username: z.string().min(1).max(50),
      admin_telegram_chat_id: z.number().int().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// User: list own payments
export const listMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });
    return { payments: data ?? [] };
  });
