import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

export const Route = createFileRoute("/api/public/transcode-key")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const id = url.searchParams.get("id");
          const queryToken = url.searchParams.get("token");

          if (!id) {
            return new Response("Missing video ID", { status: 400 });
          }

          // Resolve key path
          const keyPath = path.join(process.cwd(), "keys", `${id}.key`);
          if (!fs.existsSync(keyPath)) {
            return new Response("Key not found", { status: 404 });
          }

          // Authentication
          let authenticated = false;

          // 1. Try Authorization header
          const authHeader = request.headers.get("authorization");
          let token = "";
          if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.replace("Bearer ", "");
          } else if (queryToken) {
            // 2. Try query parameter (crucial for native Safari/iOS HLS players)
            token = queryToken;
          }

          if (token) {
            const supabase = createClient(
              process.env.SUPABASE_URL!,
              process.env.SUPABASE_PUBLISHABLE_KEY!,
              {
                auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
              }
            );
            const { data, error } = await supabase.auth.getUser(token);
            if (!error && data?.user) {
              authenticated = true;
            }
          }

          if (!authenticated) {
            console.warn(`[DRM Key Access Blocked] Unauthenticated attempt to fetch HLS decryption key for: ${id}`);
            return new Response("Unauthorized: HLS video playback requires a valid user session.", { status: 401 });
          }

          // Read the 16-byte key binary
          const keyBuffer = fs.readFileSync(keyPath);

          // Return the raw 16-byte binary key
          return new Response(keyBuffer, {
            headers: {
              "Content-Type": "application/octet-stream",
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "Access-Control-Allow-Origin": "*", // Allow cross-origin video playback
            },
          });
        } catch (e: any) {
          console.error("[transcode-key.ts GET handler]", e);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
