import { createFileRoute } from "@tanstack/react-router";
import { tgSetWebhook } from "@/lib/telegram.server";
import { createHash } from "crypto";

function deriveSecret(token: string) {
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

export const Route = createFileRoute("/api/public/telegram/setup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const token = process.env.TELEGRAM_BOT_TOKEN;
          if (!token) {
            return Response.json(
              {
                ok: false,
                error:
                  "TELEGRAM_BOT_TOKEN environment variable is not configured on Cloudflare/Wrangler.",
              },
              { status: 500 },
            );
          }

          const urlObj = new URL(request.url);
          // Set live webhook endpoint
          const webhookUrl = `${urlObj.protocol}//${urlObj.host}/api/public/telegram/webhook`;
          const secretToken = deriveSecret(token);

          const result = await tgSetWebhook(webhookUrl, secretToken);

          return Response.json({
            ok: true,
            message: "Telegram Webhook configuration triggered successfully!",
            webhookUrl,
            telegramResponse: result,
          });
        } catch (err: any) {
          return Response.json(
            {
              ok: false,
              error: err.message,
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
