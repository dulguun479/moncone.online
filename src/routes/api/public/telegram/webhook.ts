import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";
import { tgSend } from "@/lib/telegram.server";
import { uploadToR2 } from "@/lib/r2.server";

const ADMIN_EMAIL = "dolgoonoo473@gmail.com";

function deriveSecret(token: string) {
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

function safeEq(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
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
  const { data: prof } = await admin()
    .from("profiles").select("id").eq("telegram_chat_id", chatId).maybeSingle();
  if (!prof) return false;
  const { data } = await admin().auth.admin.getUserById((prof as { id: string }).id);
  return data?.user?.email === ADMIN_EMAIL;
}

async function downloadTelegramFile(fileId: string): Promise<{ data: ArrayBuffer; mimeType: string; extension: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing");

  const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
  const getFileRes = await fetch(getFileUrl);
  if (!getFileRes.ok) {
    throw new Error(`Failed to get file path from Telegram: ${getFileRes.status}`);
  }
  const getFileData = (await getFileRes.json()) as any;
  if (!getFileData.ok || !getFileData.result?.file_path) {
    throw new Error("Telegram getFile returned error or missing file_path");
  }

  const filePath = getFileData.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) {
    throw new Error(`Failed to download file from Telegram: ${fileRes.status}`);
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  const ext = filePath.split(".").pop() || "jpg";
  let mimeType = "image/jpeg";
  if (ext.toLowerCase() === "png") mimeType = "image/png";
  else if (ext.toLowerCase() === "gif") mimeType = "image/gif";
  else if (ext.toLowerCase() === "webp") mimeType = "image/webp";

  return { data: arrayBuffer, mimeType, extension: ext };
}

async function handleCommand(chatId: number, text: string, photo?: any) {
  const cleanText = text.trim();
  const cmd = cleanText.split(/\s+/);
  const head = cmd[0]?.toLowerCase();

  // /start command is available for everyone to link their account
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

  // Ensure user is an admin
  const isUserAdmin = await isAdminEmail(chatId);
  if (!isUserAdmin) {
    await tgSend(
      chatId,
      "ℹ️ Боломжтой команд: /start таны@email.com\n\n<i>Хэрэв та Админ бол эхлээд өөрийн бүртгэлтэй имэйл хаягаа холбоно уу.</i>",
    );
    return;
  }

  // --- ADMIN COMMANDS ---

  // 1. Image hosting helper: If admin sends just a photo, upload it to R2 and return the link
  if (photo && photo.length > 0 && head !== "/addmovie") {
    const largestPhoto = photo[photo.length - 1];
    await tgSend(chatId, "⏳ Зургийг R2 сан руу хуулж байна, түр хүлээнэ үү...");
    try {
      const { data, mimeType, extension } = await downloadTelegramFile(largestPhoto.file_id);
      const key = `posters/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
      const publicUrl = await uploadToR2(key, data, mimeType);

      await tgSend(
        chatId,
        `✅ <b>Зургийг амжилттай R2 руу хууллаа!</b>\n\n` +
          `🔗 Таны зургийн холбоос (URL):\n<code>${publicUrl}</code>\n\n` +
          `Үүнийг киноны постер эсвэл сурталчилгаанд шууд хуулж тавин ашиглаарай!`,
      );
    } catch (e: any) {
      console.error("[tg photo upload]", e);
      await tgSend(chatId, `❌ Зургийг хуулахад алдаа гарлаа: ${e.message}`);
    }
    return;
  }

  // 2. Add Movie command: /addmovie Title | Year | Genre | Video URL | Description
  if (head === "/addmovie") {
    const content = cleanText.slice(head.length).trim();
    if (!content) {
      await tgSend(
        chatId,
        "ℹ️ <b>Кино нэмэх заавар:</b>\n\n" +
          "Дараах хэлбэрээр бичиж илгээнэ үү:\n" +
          "<code>/addmovie Киноны нэр | Жил | Төрөл | Видео URL | Танилцуулга</code>\n\n" +
          "👉 <i>Жишээ:</i>\n" +
          "<code>/addmovie Аватар 2 | 2022 | Sci-Fi | https://cdn.moncone.online/videos/avatar2.mp4 | Далайн гүний ертөнцөд өрнөх түүх.</code>\n\n" +
          "📸 <b>Зураг хавсаргах:</b> Киноны зургийг давхар оруулахын тулд **зургаа хавсаргаад** тайлбарт (Caption) нь дээрх тушаалыг бичиж илгээнэ үү. Систем зургийг автоматаар постер болгон бүртгэх болно!",
      );
      return;
    }

    const parts = content.split("|").map((s) => s.trim());
    const title = parts[0];
    const yearStr = parts[1];
    const genre = parts[2] || "Бусад";
    const videoUrl = parts[3] || "";
    const description = parts[4] || "";

    if (!title) {
      await tgSend(chatId, "❌ Алдаа: Киноны нэрийг заавал оруулна уу.");
      return;
    }

    const year = parseInt(yearStr || "2026", 10);
    if (isNaN(year)) {
      await tgSend(chatId, "❌ Алдаа: Киноны жил тоо байх ёстой.");
      return;
    }

    let posterUrl: string | null = null;

    if (photo && photo.length > 0) {
      const largestPhoto = photo[photo.length - 1];
      await tgSend(chatId, "⏳ Киноны постерийг татаж, R2 руу хуулж байна...");
      try {
        const { data, mimeType, extension } = await downloadTelegramFile(largestPhoto.file_id);
        const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
        const key = `posters/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeTitle}.${extension}`;
        posterUrl = await uploadToR2(key, data, mimeType);
      } catch (e: any) {
        console.error("[tg movie poster upload]", e);
        await tgSend(
          chatId,
          `⚠️ Анхаар: Постер зургийг хуулахад алдаа гарсан тул зураггүйгээр нэмж байна. Алдаа: ${e.message}`,
        );
      }
    }

    await tgSend(chatId, "⏳ Киноны мэдээллийг санд бүртгэж байна...");
    try {
      const { data: newMovie, error } = await admin()
        .from("movies")
        .insert({
          title,
          year,
          genre,
          video_url: videoUrl,
          poster_url: posterUrl,
          description,
          is_featured: false,
          is_premium: false,
          views: 0,
        })
        .select()
        .single();

      if (error) throw error;

      await tgSend(
        chatId,
        `✅ <b>Шинэ кино амжилттай нэмэгдлээ!</b>\n\n` +
          `🎬 Нэр: <b>${newMovie.title}</b>\n` +
          `📅 Жил: <b>${newMovie.year}</b>\n` +
          `🎭 Төрөл: <b>${newMovie.genre}</b>\n` +
          (newMovie.poster_url ? `📸 Постер: <a href="${newMovie.poster_url}">Харах</a>\n` : "") +
          (newMovie.video_url ? `🎥 Видео: <a href="${newMovie.video_url}">Үзэх</a>\n` : "") +
          `📝 Танилцуулга: <i>${newMovie.description || "Байхгүй"}</i>\n\n` +
          `Тус кино moncone.online сайт дээр шууд үзэх боломжтой боллоо!`,
      );
    } catch (e: any) {
      console.error("[tg movie insert]", e);
      await tgSend(chatId, `❌ Мэдээллийн санд киног бүртгэхэд алдаа гарлаа: ${e.message}`);
    }
    return;
  }

  // 3. View Pending Payments (/pending)
  if (head === "/pending") {
    const { data } = await admin()
      .from("payments").select("payment_code, amount, created_at, user_id")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(20);
    if (!data?.length) {
      await tgSend(chatId, "✅ Хүлээгдэж буй төлбөр алга.");
      return;
    }
    const lines = await Promise.all(
      data.map(async (p: any) => {
        const { data: u } = await admin().auth.admin.getUserById(p.user_id as string);
        const d = new Date(p.created_at as string).toLocaleDateString("mn-MN");
        return `• <b>${p.payment_code}</b> · ${u?.user?.email ?? "?"} · ₮${p.amount} · ${d}`;
      }),
    );
    await tgSend(chatId, "<b>Хүлээгдэж буй төлбөрүүд:</b>\n" + lines.join("\n"));
    return;
  }

  // 4. View Statistics (/stats)
  if (head === "/stats") {
    const { count: users } = await admin().from("profiles").select("*", { count: "exact", head: true });
    const { count: premium } = await admin()
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "premium");
    const som = new Date();
    som.setDate(1);
    som.setHours(0, 0, 0, 0);
    const { data: pays } = await admin()
      .from("payments")
      .select("amount")
      .eq("status", "confirmed")
      .gte("confirmed_at", som.toISOString());
    const rev = (pays ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    await tgSend(
      chatId,
      `📊 <b>moncone статистик</b>\nХэрэглэгч: <b>${users}</b>\nПремиум: <b>${premium}</b>\nЭнэ сарын орлого: <b>₮${rev.toLocaleString()}</b>`,
    );
    return;
  }

  // 5. Confirm Payment (/confirm MN-XXXXX)
  if (head === "/confirm" && cmd[1]) {
    const code = cmd[1].toUpperCase();
    const { data: pmt } = await admin()
      .from("payments").select("id, user_id, status")
      .eq("payment_code", code).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!pmt) {
      await tgSend(chatId, `❌ ${code} хүлээгдэж буй төлбөр олдсонгүй.`);
      return;
    }
    const { error } = await admin().rpc("confirm_payment", { _payment_id: (pmt as any).id });
    if (error) {
      await tgSend(chatId, `❌ Алдаа: ${error.message}`);
      return;
    }
    const { data: profile } = await admin()
      .from("profiles")
      .select("telegram_chat_id, subscription_expires_at")
      .eq("id", (pmt as any).user_id)
      .single();
    const expiry = profile?.subscription_expires_at
      ? new Date(profile.subscription_expires_at as string).toLocaleDateString("mn-MN")
      : "";
    if (profile?.telegram_chat_id) {
      await tgSend(
        profile.telegram_chat_id as number,
        `✅ Таны <b>moncone Premium</b> эрх идэвхжлээ!\nДуусах: <b>${expiry}</b>\nКино үзэх: moncone.online`,
      );
    }
    await tgSend(chatId, `✅ ${code} баталгаажлаа. Дуусах: ${expiry}`);
    return;
  }

  // 6. Cancel Subscription (/cancel MN-XXXXX)
  if (head === "/cancel" && cmd[1]) {
    const code = cmd[1].toUpperCase();
    const { data: prof } = await admin()
      .from("profiles").select("id, telegram_chat_id").eq("payment_code", code).maybeSingle();
    if (!prof) {
      await tgSend(chatId, `❌ ${code} код олдсонгүй.`);
      return;
    }
    const { error } = await admin().rpc("cancel_subscription", { _user_id: (prof as any).id });
    if (error) {
      await tgSend(chatId, `❌ Алдаа: ${error.message}`);
      return;
    }
    if ((prof as any).telegram_chat_id) {
      await tgSend((prof as any).telegram_chat_id, "❌ Таны Premium эрх админ цуцалсан байна.");
    }
    await tgSend(chatId, `✅ ${code} цуцлагдлаа.`);
    return;
  }

  // Help command fallback
  await tgSend(
    chatId,
    "<b>Админ командууд:</b>\n\n" +
      "• /pending - Хүлээгдэж буй төлбөрүүд харах\n" +
      "• /stats - Вэбсайтын ерөнхий статистик харах\n" +
      "• /confirm MN-XXXXX - Захиалгын төлбөр баталгаажуулах\n" +
      "• /cancel MN-XXXXX - Хэрэглэгчийн эрх цуцлах\n" +
      "• /addmovie [Мэдээлэл] - Шинэ кино нэмэх\n\n" +
      "📸 <i>Та дурын зургийг чат руу шууд илгээвэл систем автоматаар Cloudflare R2-т хуулж, холбоосыг (URL) нь өгөх болно.</i>",
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

        const update = (await request.json()) as any;
        const msg = update.message ?? update.edited_message;
        const chatId = msg?.chat?.id;
        const text = msg?.text ?? msg?.caption ?? "";
        const photo = msg?.photo;

        if (!chatId) return Response.json({ ok: true, ignored: true });

        try {
          await handleCommand(chatId, text, photo);
        } catch (e) {
          console.error("[tg webhook]", e);
          await tgSend(chatId, "❌ Дотоод алдаа гарлаа.");
        }
        return Response.json({ ok: true });
      },
    },
  },
});
