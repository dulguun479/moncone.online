import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/setup-admin")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const url = process.env.SUPABASE_URL;
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

          if (!url || !serviceKey) {
            return Response.json({
              ok: false,
              message: "Missing Supabase server credentials. Please make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
            }, { status: 500 });
          }

          const admin = createClient<Database>(url, serviceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          // 1. Fetch all users using the auth admin client to find dolgoonoo473@gmail.com
          const { data: { users }, error: listError } = await admin.auth.admin.listUsers();
          if (listError) {
            return Response.json({ ok: false, error: "Failed to list users: " + listError.message }, { status: 500 });
          }

          const targetEmail = "dolgoonoo473@gmail.com".toLowerCase();
          const matchedUser = users?.find((u) => u.email?.toLowerCase() === targetEmail);

          if (!matchedUser) {
            return Response.json({
              ok: false,
              message: `User '${targetEmail}' was not found in the database. Make sure you register/signup on the homepage first!`,
              usersRegisteredCount: users?.length ?? 0,
            });
          }

          const uid = matchedUser.id;

          // 2. Ensure profile exists in public.profiles
          const { data: profile, error: profError } = await admin
            .from("profiles")
            .select("*")
            .eq("id", uid)
            .maybeSingle();

          let profileCreated = false;
          if (!profile) {
            const { error: insertProfError } = await admin
              .from("profiles")
              .insert({
                id: uid,
                display_name: matchedUser.email?.split("@")[0] || "admin",
                subscription_status: "free",
                payment_code: "MN-" + Math.floor(10000 + Math.random() * 90000),
              });

            if (insertProfError) {
              console.error("Failed to insert profile:", insertProfError);
            } else {
              profileCreated = true;
            }
          }

          // 3. Ensure role exists in public.user_roles
          const { data: roles, error: rolesError } = await admin
            .from("user_roles")
            .select("*")
            .eq("user_id", uid);

          let roleAssigned = false;
          const hasAdminRole = roles?.some((r) => r.role === "admin");
          if (!hasAdminRole) {
            const { error: insertRoleError } = await admin
              .from("user_roles")
              .insert({
                user_id: uid,
                role: "admin",
              });

            if (insertRoleError) {
              return Response.json({
                ok: false,
                error: `Failed to insert admin role: ${insertRoleError.message}. Details: ${insertRoleError.details}`,
              }, { status: 500 });
            }
            roleAssigned = true;
          }

          return Response.json({
            ok: true,
            message: `Successfully setup admin user permissions!`,
            details: {
              userId: uid,
              email: matchedUser.email,
              profileCreated,
              roleAssigned,
              currentRoles: hasAdminRole ? roles.map((r) => r.role) : [...(roles?.map((r) => r.role) || []), "admin"],
            },
          });
        } catch (err) {
          return Response.json({
            ok: false,
            error: (err as Error).message,
          }, { status: 500 });
        }
      },
    },
  },
});
