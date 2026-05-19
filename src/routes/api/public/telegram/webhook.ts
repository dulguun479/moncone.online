import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";
import { tgSend } from "@/lib/telegram.server";

const ADMIN_EMAIL = "dolgoonoo473@gmail.com";

function deriveSecret(token: string) {
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}
function safeEq(a: string, b: string) {
  const A = Buffer.from(a); const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

let _admin: any = null;
function admin(): any {
  if (!_admin) {
    _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

async function isAdminEmail(chatId: number): Promise<boolean> {
  // Look up profile by telegram_chat_id, then check user email
  const { data: prof } = await admin()
    .from("profiles").select("id").eq("telegram_chat_id", chatId).maybeSingle();
  if (!prof) return false;
  const { data } = await admin().auth.admin.getUserById((prof as { id: string }).id);
  return data?.user?.email === ADMIN_EMAIL;
}

async function handleCommand(chatId: number, text: string) {
  const cmd = text.trim().split(/\s+/);
  const head = cmd[0]?.toLowerCase();

  // /start [email] — link chat to user account
  if (head === "/start") {
    const arg = cmd[1];
    if (!arg) {
      await tgSend(
        chatId,
        "Сайн байна уу! moncone мэдэгдэл авахын тулд:\n<code>/start таны@email.com</code>\nгэж бичнэ үү.",
      );
      return;
    }
    // Find user by email
    const { data: users } = await admin().auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = users?.users?.find((u: any) => u.email?.toLowerCase() === arg.toLowerCase());
    if (!found) {
      await tgSend(chatId, "❌ Энэ имэйл бүртгэлгүй байна. Эхлээд moncone-д бүртгүүлнэ үү.");
      return;
    }
    await admin().from("profiles").update({ telegram_chat_id: chatId }).eq("id", found.id);
    await tgSend(chatId, "✅ Танай Telegram холбогдлоо. Цаашид төлбөр, эрхийн мэдэгдэл энд ирнэ.");
    return;
  }

  // ----- Admin only -----
  if (!(await isAdminEmail(chatId))) {
    await tgSend(chatId, "ℹ️ Боломжтой команд: /start таны@email.com");
    return;
  }

  if (head === "/pending") {
    const { data } = await admin()
      .from("payments").select("payment_code, amount, created_at, user_id")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(20);
    if (!data?.length) { await tgSend(chatId, "✅ Хүлээгдэж буй төлбөр алга."); return; }
    const lines = await Promise.all(data.map(async (p: any) => {
      const { data: u } = await admin().auth.admin.getUserById(p.user_id as string);
      const d = new Date(p.created_at as string).toLocaleDateString("mn-MN");
      return `• <b>${p.payment_code}</b> · ${u?.user?.email ?? "?"} · ₮${p.amount} · ${d}`;
    }));
    await tgSend(chatId, "<b>Хүлээгдэж буй төлбөрүүд:</b>\n" + lines.join("\n"));
    return;
  }

  if (head === "/stats") {
    const { count: users } = await admin().from("profiles").select("*", { count: "exact", head: true });
    const { count: premium } = await admin().from("profiles")
      .select("*", { count: "exact", head: true }).eq("subscription_status", "premium");
    const som = new Date(); som.setDate(1); som.setHours(0,0,0,0);
    const { data: pays } = await admin().from("payments").select("amount")
      .eq("status","confirmed").gte("confirmed_at", som.toISOString());
    const rev = (pays ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    await tgSend(chatId, `📊 <b>moncone статистик</b>\nХэрэглэгч: <b>${users}</b>\nПремиум: <b>${premium}</b>\nЭнэ сарын орлого: <b>₮${rev.toLocaleString()}</b>`);
    return;
  }

  if (head === "/confirm" && cmd[1]) {
    const code = cmd[1].toUpperCase();
    const { data: pmt } = await admin()
      .from("payments").select("id, user_id, status")
      .eq("payment_code", code).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!pmt) { await tgSend(chatId, `❌ ${code} хүлээгдэж буй төлбөр олдсонгүй.`); return; }
    const { error } = await admin().rpc("confirm_payment", { _payment_id: (pmt as any).id });
    if (error) { await tgSend(chatId, `❌ Алдаа: ${error.message}`); return; }
    const { data: profile } = await admin().from("profiles")
      .select("telegram_chat_id, subscription_expires_at").eq("id", (pmt as any).user_id).single();
    const expiry = profile?.subscription_expires_at
      ? new Date(profile.subscription_expires_at as string).toLocaleDateString("mn-MN") : "";
    if (profile?.telegram_chat_id) {
      await tgSend(profile.telegram_chat_id as number,
        `✅ Таны <b>moncone Premium</b> эрх идэвхжлээ!\nДуусах: <b>${expiry}</b>\nКино үзэх: cine-mongolia-pro.lovable.app`);
    }
    await tgSend(chatId, `✅ ${code} баталгаажлаа. Дуусах: ${expiry}`);
    return;
  }

  if (head === "/cancel" && cmd[1]) {
    const code = cmd[1].toUpperCase();
    const { data: prof } = await admin()
      .from("profiles").select("id, telegram_chat_id").eq("payment_code", code).maybeSingle();
    if (!prof) { await tgSend(chatId, `❌ ${code} код олдсонгүй.`); return; }
    const { error } = await admin().rpc("cancel_subscription", { _user_id: (prof as any).id });
    if (error) { await tgSend(chatId, `❌ Алдаа: ${error.message}`); return; }
    if ((prof as any).telegram_chat_id) {
      await tgSend((prof as any).telegram_chat_id,
        "❌ Таны Premium эрх админ цуцалсан байна.");
    }
    await tgSend(chatId, `✅ ${code} цуцлагдлаа.`);
    return;
  }

  await tgSend(chatId,
    "<b>Админ командууд:</b>\n/pending\n/stats\n/confirm MN-XXXXX\n/cancel MN-XXXXX");
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return new Response("Bot token not configured", { status: 503 });
        const expected = deriveSecret(token);
        const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEq(got, expected)) return new Response("Unauthorized", { status: 401 });

        const update = await request.json() as any;
        const msg = update.message ?? update.edited_message;
        const chatId = msg?.chat?.id;
        const text = msg?.text;
        if (!chatId || !text) return Response.json({ ok: true, ignored: true });

        try { await handleCommand(chatId, text); }
        catch (e) {
          console.error("[tg webhook]", e);
          await tgSend(chatId, "❌ Дотоод алдаа гарлаа.");
        }
        return Response.json({ ok: true });
      },
    },
  },
});
