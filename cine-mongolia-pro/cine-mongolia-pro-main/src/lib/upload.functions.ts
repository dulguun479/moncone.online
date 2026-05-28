import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signR2PutUrl, r2PublicUrl } from "./r2.server";

async function assertAdmin(userId: string) {
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (!roles?.some((r: { role: string }) => r.role === "admin")) throw new Error("Forbidden");
}

const folderMap: Record<string, string> = {
  video: "videos",
  poster: "posters",
  backdrop: "backdrops",
  ad: "ads",
};

export const getUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        kind: z.enum(["video", "poster", "backdrop", "ad"]),
        filename: z.string().min(1).max(200),
        contentType: z.string().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${folderMap[data.kind]}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const uploadUrl = await signR2PutUrl(key, data.contentType, 3600);
    return { uploadUrl, key, publicUrl: r2PublicUrl(key) };
  });
