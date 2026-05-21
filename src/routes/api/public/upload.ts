import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { uploadToR2 } from "@/lib/r2.server";
import { assertAdmin } from "@/lib/admin.server";

export const Route = createFileRoute("/api/public/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return Response.json({ error: "Unauthorized: Missing token" }, { status: 401 });
          }
          const token = authHeader.replace("Bearer ", "");
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            {
              global: { headers: { Authorization: `Bearer ${token}` } },
              auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
            }
          );
          const { data, error } = await supabase.auth.getUser(token);
          if (error || !data?.user) {
            return Response.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
          }

          // Assert that the user is an admin (with self-healing support)
          await assertAdmin(data.user.id);

          const formData = await request.formData();
          const file = formData.get("file") as File;
          const kind = formData.get("kind") as string;

          if (!file) {
            return Response.json({ error: "No file provided" }, { status: 400 });
          }

          const folderMap: Record<string, string> = {
            video: "videos",
            poster: "posters",
            backdrop: "backdrops",
            ad: "ads",
          };
          const folder = folderMap[kind] || "posters";
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

          const buffer = await file.arrayBuffer();
          const publicUrl = await uploadToR2(key, buffer, file.type || "application/octet-stream");

          return Response.json({ publicUrl, key });
        } catch (e: any) {
          console.error("[upload.ts server handler]", e);
          return Response.json({ error: e.message || "Internal Server Error" }, { status: 500 });
        }
      },
    },
  },
});
