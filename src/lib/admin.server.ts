import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Asserts that the authenticated user is an admin.
 * If the user's email matches the configured admin email (case-insensitive) but they lack
 * the "admin" role row in the database, it automatically inserts the role (self-healing).
 * Otherwise, throws a Forbidden error.
 */
export async function assertAdmin(userId: string) {
  // 1. Fetch current roles from the database using service_role bypass
  const { data: roles, error: rolesErr } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesErr) {
    console.error("[assertAdmin] Database error while fetching roles:", rolesErr);
  }

  let isAdmin = roles?.some((r: { role: string }) => r.role === "admin");

  // 2. Self-healing bypass for the hardcoded admin email if role is missing
  if (!isAdmin) {
    try {
      const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (uErr) {
        console.error("[assertAdmin] Auth error fetching user by ID:", uErr);
      }

      const email = u?.user?.email;
      if (email?.toLowerCase() === "dolgoonoo473@gmail.com") {
        console.log(`[assertAdmin Self-Healing] Auto-inserting admin role for ${email} (${userId})`);
        
        const { error: insErr } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });

        if (insErr) {
          console.error("[assertAdmin Self-Healing] Error inserting admin role:", insErr);
        } else {
          console.log(`[assertAdmin Self-Healing] Successfully healed admin role in database for ${email}!`);
          isAdmin = true;
        }
      }
    } catch (e) {
      console.error("[assertAdmin Self-Healing] Exception during self-healing check:", e);
    }
  }

  // 3. Reject if not admin
  if (!isAdmin) {
    throw new Error("Forbidden");
  }
}
