import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/telegram/check-env")({
  server: {
    handlers: {
      GET: async () => {
        const check = (key: string) => {
          const val = process.env[key];
          return {
            defined: !!val,
            length: val ? val.length : 0,
            preview: val ? (val.length > 8 ? val.slice(0, 4) + "..." + val.slice(-4) : "***") : null,
          };
        };

        let listUsersResult = null;
        try {
          const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 100 });
          if (error) {
            listUsersResult = { ok: false, error: error.message };
          } else {
            const emails = data.users.map((u: any) => u.email);
            const foundAdmin = emails.includes("dolgoonoo473@gmail.com");
            listUsersResult = {
              ok: true,
              count: data.users.length,
              emails,
              foundAdmin,
            };
          }
        } catch (e: any) {
          listUsersResult = { ok: false, error: e.message };
        }

        return Response.json({
          TELEGRAM_BOT_TOKEN: check("TELEGRAM_BOT_TOKEN"),
          SUPABASE_URL: check("SUPABASE_URL"),
          SUPABASE_SERVICE_ROLE_KEY: check("SUPABASE_SERVICE_ROLE_KEY"),
          R2_ACCESS_KEY_ID: check("R2_ACCESS_KEY_ID"),
          R2_SECRET_ACCESS_KEY: check("R2_SECRET_ACCESS_KEY"),
          R2_ACCOUNT_ID: check("R2_ACCOUNT_ID"),
          R2_BUCKET: check("R2_BUCKET"),
          R2_PUBLIC_BASE: check("R2_PUBLIC_BASE"),
          listUsersResult,
        });
      },
    },
  },
});
