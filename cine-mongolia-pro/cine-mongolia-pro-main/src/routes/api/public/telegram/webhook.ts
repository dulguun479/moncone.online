import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";
import { tgSend } from "@/lib/telegram.server";

const ADMIN_EMAIL = "dolgoonoo473@gmail.com";
const SITE_URL = "https://tanstack-start-app.dolgoonoo473.workers.dev";

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

async function getProfileByChatId(chatId: number) {
  const { data } = await admin()
    .from("profiles")
    .select("id, subscription_status, subscription_expires_at, payment_code")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  return data;
}

async function getUserEmailByChatId(chatId: number): Promise<string | null> {
  const prof = await getProfileByChatId(chatId);
  if (!prof) return null;
  const { data } = await admin().auth.admin.getUserById(prof.id);
  return data?.user?.email ?? null;
}

async function isAdminChat(chatId: number): Promise<boolean> {
  const email = await getUserEmailByChatId(chatId);
  return email === ADMIN_EMAIL;
}

async function handleCommand(chatId: number, text: string) {
  const cmd = text.trim().split(/\s+/);
  const head = cmd[0]?.toLowerCase();

  // ══════════════════════════════════════════════
  //  /start — бүртгэл холболт
  // ══════════════════════════════════════════════
  if (head === "/start") {
    const arg = cmd[1];
    if (!arg) {
      await tgSend(
        chatId,
        `🎬 <b>moncone Telegram Bot-д тавтай морил!</b>\n\n` +
        `Telegram холбохын тулд:\n` +
        `<code>/start таны@email.com</code>\n\n` +
        `Бусад командуудыг харахдаа:\n` +
        `<code>/help</code>`,
      );
      return;
    }
    const { data: users } = await admin().auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = users?.users?.find((u: any) => u.email?.toLowerCase() === arg.toLowerCase());
    if (!found) {
      await tgSend(chatId,
        `❌ <b>${arg}</b> имэйл бүртгэлгүй байна.\n\n` +
        `Эхлээд бүртгүүлнэ үү: ${SITE_URL}/signup`
      );
      return;
    }
    await admin().from("profiles").update({ telegram_chat_id: chatId }).eq("id", found.id);
    const { data: prof } = await admin().from("profiles")
      .select("payment_code, subscription_status").eq("id", found.id).single();
    await tgSend(chatId,
      `✅ <b>Амжилттай холбогдлоо!</b>\n\n` +
      `📧 Имэйл: ${arg}\n` +
      `💳 Таны код: <b>${prof?.payment_code ?? "—"}</b>\n` +
      `⭐ Эрх: <b>${prof?.subscription_status === "premium" ? "Premium" : "Үнэгүй"}</b>\n\n` +
      `Цаашид төлбөр баталгаажих мэдэгдэл энд ирнэ.\n` +
      `Бусад командыг харах: /help`
    );
    return;
  }

  // ══════════════════════════════════════════════
  //  /help — командын жагсаалт
  // ══════════════════════════════════════════════
  if (head === "/help") {
    const isAdmin = await isAdminChat(chatId);
    const prof = await getProfileByChatId(chatId);
    const userCmds =
      `📱 <b>Хэрэглэгчийн командууд:</b>\n` +
      `/start email — Telegram холбох\n` +
      `/mycode — Төлбөрийн код харах\n` +
      `/mystatus — Эрхийн байдал шалгах\n` +
      `/pay — Хэрхэн төлөх заавар\n` +
      `/help — Энэхүү тусламж\n`;
    const adminCmds = isAdmin
      ? `\n🔐 <b>Админ командууд:</b>\n` +
        `/pending — Хүлээгдэж буй төлбөрүүд\n` +
        `/stats — Нийт статистик\n` +
        `/confirm MN-XXXXX — Төлбөр баталгаажуулах\n` +
        `/cancel MN-XXXXX — Эрх цуцлах\n` +
        `/users — Сүүлийн хэрэглэгчид\n` +
        `/find email — Хэрэглэгч хайх\n`
      : "";
    const linked = prof
      ? `\n✅ Таны акаунт холбогдсон байна.`
      : `\n⚠️ Эхлээд /start email командаар холбоно уу.`;
    await tgSend(chatId, userCmds + adminCmds + linked);
    return;
  }

  // ══════════════════════════════════════════════
  //  /mycode — өөрийн төлбөрийн код
  // ══════════════════════════════════════════════
  if (head === "/mycode") {
    const prof = await getProfileByChatId(chatId);
    if (!prof) {
      await tgSend(chatId, `⚠️ Эхлээд акаунтаа холбоно уу:\n<code>/start таны@email.com</code>`);
      return;
    }
    await tgSend(chatId,
      `💳 <b>Таны төлбөрийн код:</b>\n\n` +
      `<code>${prof.payment_code ?? "Код үүсээгүй байна"}</code>\n\n` +
      `Энэ кодыг төлбөр хийхдээ <b>гүйлгээний утга</b>-д бичнэ үү.\n` +
      `Дэлгэрэнгүй: /pay`
    );
    return;
  }

  // ══════════════════════════════════════════════
  //  /mystatus — эрхийн байдал
  // ══════════════════════════════════════════════
  if (head === "/mystatus") {
    const prof = await getProfileByChatId(chatId);
    if (!prof) {
      await tgSend(chatId, `⚠️ Эхлээд акаунтаа холбоно уу:\n<code>/start таны@email.com</code>`);
      return;
    }
    const isPremium = prof.subscription_status === "premium";
    const expiresAt = prof.subscription_expires_at
      ? new Date(prof.subscription_expires_at).toLocaleDateString("mn-MN")
      : null;
    if (isPremium) {
      await tgSend(chatId,
        `⭐ <b>Premium эрхтэй!</b>\n\n` +
        `Дуусах огноо: <b>${expiresAt}</b>\n\n` +
        `Кино үзэх: ${SITE_URL}`
      );
    } else {
      await tgSend(chatId,
        `📺 <b>Үнэгүй эрхтэй байна.</b>\n\n` +
        `Premium болох: ${SITE_URL}/plans\n\n` +
        `Хэрхэн төлөх: /pay`
      );
    }
    return;
  }

  // ══════════════════════════════════════════════
  //  /pay — төлбөрийн заавар
  // ══════════════════════════════════════════════
  if (head === "/pay") {
    const prof = await getProfileByChatId(chatId);
    const code = prof?.payment_code ?? "таны код";
    await tgSend(chatId,
      `💳 <b>Хэрхэн Premium болох:</b>\n\n` +
      `1️⃣ Вэбсайтад нэвтэрнэ үү\n` +
      `   ${SITE_URL}\n\n` +
      `2️⃣ "Subscription" цэс рүү орно\n\n` +
      `3️⃣ Дансанд мөнгө шилжүүлнэ:\n` +
      `   📱 <b>QPay / M-Bank / Khan Bank</b>\n\n` +
      `4️⃣ Гүйлгээний утгад заавал бичнэ:\n` +
      `   <code>${code}</code>\n\n` +
      `5️⃣ Танд 24 цагийн дотор эрх нээгдэнэ\n\n` +
      `❓ Асуудал гарвал: /help`
    );
    return;
  }

  // ══════════════════════════════════════════════
  //  Доороос ЗӨВХӨН АДМИНД ажиллана
  // ══════════════════════════════════════════════
  if (!(await isAdminChat(chatId))) {
    await tgSend(chatId,
      `ℹ️ Командын жагсаалт: /help\n\n` +
      `Акаунт холбоогүй бол:\n<code>/start таны@email.com</code>`
    );
    return;
  }

  // /pending — хүлээгдэж буй төлбөрүүд
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
    await tgSend(chatId,
      `<b>⏳ Хүлээгдэж буй төлбөрүүд (${data.length}):</b>\n` + lines.join("\n") +
      `\n\nБаталгаажуулах: <code>/confirm MN-XXXXX</code>`
    );
    return;
  }

  // /stats — статистик
  if (head === "/stats") {
    const { count: users } = await admin().from("profiles").select("*", { count: "exact", head: true });
    const { count: premium } = await admin().from("profiles")
      .select("*", { count: "exact", head: true }).eq("subscription_status", "premium");
    const { count: pending } = await admin().from("payments")
      .select("*", { count: "exact", head: true }).eq("status", "pending");
    const som = new Date(); som.setDate(1); som.setHours(0, 0, 0, 0);
    const { data: pays } = await admin().from("payments").select("amount")
      .eq("status", "confirmed").gte("confirmed_at", som.toISOString());
    const rev = (pays ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    await tgSend(chatId,
      `📊 <b>moncone статистик</b>\n\n` +
      `👤 Нийт хэрэглэгч: <b>${users}</b>\n` +
      `⭐ Premium: <b>${premium}</b>\n` +
      `⏳ Хүлээгдэж буй: <b>${pending}</b>\n` +
      `💰 Энэ сарын орлого: <b>₮${rev.toLocaleString()}</b>`
    );
    return;
  }

  // /confirm MN-XXXXX — баталгаажуулах
  if (head === "/confirm" && cmd[1]) {
    const code = cmd[1].toUpperCase();
    const { data: pmt } = await admin()
      .from("payments").select("id, user_id, status, amount")
      .eq("payment_code", code).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!pmt) { await tgSend(chatId, `❌ <b>${code}</b> хүлээгдэж буй төлбөр олдсонгүй.`); return; }
    const { error } = await admin().rpc("confirm_payment", { _payment_id: (pmt as any).id });
    if (error) { await tgSend(chatId, `❌ Алдаа: ${error.message}`); return; }
    const { data: profile } = await admin().from("profiles")
      .select("telegram_chat_id, subscription_expires_at").eq("id", (pmt as any).user_id).single();
    const expiry = profile?.subscription_expires_at
      ? new Date(profile.subscription_expires_at as string).toLocaleDateString("mn-MN") : "—";
    if (profile?.telegram_chat_id) {
      await tgSend(profile.telegram_chat_id as number,
        `🎉 <b>Таны moncone Premium эрх идэвхжлээ!</b>\n\n` +
        `⭐ Эрх: Premium\n` +
        `📅 Дуусах: <b>${expiry}</b>\n\n` +
        `Кино үзэх: ${SITE_URL}`
      );
    }
    await tgSend(chatId, `✅ <b>${code}</b> баталгаажлаа!\n💰 Дүн: ₮${(pmt as any).amount}\n📅 Дуусах: ${expiry}`);
    return;
  }

  // /cancel MN-XXXXX — цуцлах
  if (head === "/cancel" && cmd[1]) {
    const code = cmd[1].toUpperCase();
    const { data: prof } = await admin()
      .from("profiles").select("id, telegram_chat_id").eq("payment_code", code).maybeSingle();
    if (!prof) { await tgSend(chatId, `❌ <b>${code}</b> код олдсонгүй.`); return; }
    const { error } = await admin().rpc("cancel_subscription", { _user_id: (prof as any).id });
    if (error) { await tgSend(chatId, `❌ Алдаа: ${error.message}`); return; }
    if ((prof as any).telegram_chat_id) {
      await tgSend((prof as any).telegram_chat_id, "❌ Таны Premium эрх цуцлагдсан байна. Асуудал байвал холбогдоно уу.");
    }
    await tgSend(chatId, `✅ <b>${code}</b> эрх цуцлагдлаа.`);
    return;
  }

  // /users — сүүлийн бүртгэлүүд
  if (head === "/users") {
    const { data } = await admin().from("profiles")
      .select("id, subscription_status, created_at").order("created_at", { ascending: false }).limit(10);
    if (!data?.length) { await tgSend(chatId, "Хэрэглэгч алга."); return; }
    const lines = await Promise.all(data.map(async (p: any) => {
      const { data: u } = await admin().auth.admin.getUserById(p.id);
      const d = new Date(p.created_at).toLocaleDateString("mn-MN");
      const badge = p.subscription_status === "premium" ? "⭐" : "📺";
      return `${badge} ${u?.user?.email ?? "?"} · ${d}`;
    }));
    await tgSend(chatId, `<b>👤 Сүүлийн 10 хэрэглэгч:</b>\n` + lines.join("\n"));
    return;
  }

  // /find email — хэрэглэгч хайх
  if (head === "/find" && cmd[1]) {
    const email = cmd[1].toLowerCase();
    const { data: users } = await admin().auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = users?.users?.find((u: any) => u.email?.toLowerCase().includes(email));
    if (!found) { await tgSend(chatId, `❌ <b>${email}</b> хэрэглэгч олдсонгүй.`); return; }
    const { data: prof } = await admin().from("profiles")
      .select("payment_code, subscription_status, subscription_expires_at").eq("id", found.id).single();
    const expiry = prof?.subscription_expires_at
      ? new Date(prof.subscription_expires_at).toLocaleDateString("mn-MN") : "—";
    await tgSend(chatId,
      `👤 <b>Хэрэглэгчийн мэдээлэл:</b>\n\n` +
      `📧 Имэйл: ${found.email}\n` +
      `💳 Код: <code>${prof?.payment_code ?? "—"}</code>\n` +
      `⭐ Эрх: <b>${prof?.subscription_status === "premium" ? "Premium" : "Үнэгүй"}</b>\n` +
      `📅 Дуусах: ${expiry}`
    );
    return;
  }

  // Default admin help
  await tgSend(chatId,
    `<b>Бүх командууд:</b> /help`
  );
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
          await tgSend(chatId, "❌ Дотоод алдаа гарлаа. Дахин оролдоно уу.");
        }
        return Response.json({ ok: true });
      },
    },
  },
});
