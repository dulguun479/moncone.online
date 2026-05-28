import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tgSend } from "./telegram.server";
import { assertAdmin } from "./admin.server";

async function broadcastToAll(message: string, kind: string, senderId: string) {
  const { data: profs } = await supabaseAdmin
    .from("profiles")
    .select("telegram_chat_id")
    .not("telegram_chat_id", "is", null);
  const chats = (profs ?? [])
    .map((p: { telegram_chat_id: number }) => p.telegram_chat_id)
    .filter(Boolean);
  let sent = 0;
  for (const chat of chats) {
    try {
      const r = await tgSend(chat, message);
      if (r && (r as { ok?: boolean }).ok) sent++;
    } catch (e) {
      console.error("[broadcast]", chat, e);
    }
  }
  await supabaseAdmin.from("broadcasts").insert({
    sent_by: senderId,
    message,
    recipients_count: sent,
    kind,
  });
  return { total: chats.length, sent };
}

export const sendBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ message: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return broadcastToAll(data.message, "manual", context.userId);
  });

export const broadcastNewMovie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ movieId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: m } = await supabaseAdmin
      .from("movies")
      .select("id, title, broadcast_sent")
      .eq("id", data.movieId)
      .single();
    if (!m) throw new Error("Movie not found");
    if (m.broadcast_sent) return { skipped: true, total: 0, sent: 0 };
    const msg = `🎬 <b>Шинэ кино нэмэгдлээ:</b> ${m.title}\nОдоо үзэх: https://moncone.online`;
    const r = await broadcastToAll(msg, "new_movie", context.userId);
    await supabaseAdmin.from("movies").update({ broadcast_sent: true }).eq("id", m.id);
    return r;
  });
