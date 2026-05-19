// Server-only Telegram helper. Reads TELEGRAM_BOT_TOKEN at call time.
const API_BASE = "https://api.telegram.org";

export async function tgSend(chatId: number | string, text: string, parseMode: "HTML" | "Markdown" | undefined = "HTML") {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN missing — skipping send", { chatId, text });
    return { ok: false, skipped: true } as const;
  }
  const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode, disable_web_page_preview: true }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[telegram] sendMessage failed", res.status, body);
    return { ok: false } as const;
  }
  return (await res.json()) as { ok: boolean };
}

export async function tgSetWebhook(url: string, secretToken: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing");
  const res = await fetch(`${API_BASE}/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secretToken,
      allowed_updates: ["message"],
    }),
  });
  return res.json();
}
