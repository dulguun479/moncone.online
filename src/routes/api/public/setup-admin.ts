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
            return Response.json(
              {
                ok: false,
                message:
                  "Missing Supabase server credentials. Please make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
              },
              { status: 500 },
            );
          }

          const admin = createClient<Database>(url, serviceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          // -------------------------------------------------------------
          // TEMPORARY: Seed New Adsterra Smartlink to public.ads table
          // -------------------------------------------------------------
          try {
            await admin.from("ads").update({ is_active: false }).contains("placements", ["movie"]);
            const adPayload = {
              title: "Adsterra Smartlink",
              image_url: "/download.png",
              link_url: "https://www.effectivecpmnetwork.com/c1bry7q6qc?key=858e26086591042439beb9626c5105ef",
              placements: ["movie"],
              is_active: true
            };
            await admin.from("ads").delete().eq("title", "Adsterra Smartlink");
            await admin.from("ads").insert(adPayload);
            console.log("Successfully seeded new Adsterra Smartlink!");
          } catch (adErr: any) {
            console.error("Ad seeding error:", adErr.message);
          }
          // -------------------------------------------------------------



          // Unconditionally seed and configure real Mongolian movies first!
          // Set "Цогт Тайж" to featured and free
          await admin
            .from("movies")
            .update({
              is_featured: true,
              is_premium: false,
              director: "Юрий Тарич",
              cast_list: "Ц.Цэгмид, А.Цэрэндэндэв, Ж.Лхасүрэн",
              description: "Монголын кино урлагийн алтан үеийн сод бүтээл болох 'Цогт Тайж' түүхэн кино. Б.Ринчений зохиолоор бүтээгдсэн бөгөөд монголчуудын тусгаар тогтнол, эх оронч сэтгэлгээг харуулна.",
            })
            .eq("title", "Цогт Тайж (Tsogt Taij)");

          // Disable is_featured on other movies
          await admin
            .from("movies")
            .update({ is_featured: false })
            .neq("title", "Цогт Тайж (Tsogt Taij)");

          // Delete duplicate misspelled "Унур Бул (1980)" if exists
          await admin.from("movies").delete().eq("title", "Унур Бул (1980)");

          // Upsert "Тунгалаг Тамир" — insert if missing, update all details always
          const { data: tungalag } = await admin
            .from("movies")
            .select("id")
            .eq("title", "Тунгалаг Тамир (Clear Tamir)")
            .maybeSingle();

          const tungalagData = {
            title: "Тунгалаг Тамир (Clear Tamir)",
            title_en: "Clear Tamir",
            description: "Монголын уран зохиолын сод бүтээл Ч.Лодойдамбын 'Тунгалаг Тамир' романы сэдэвт түүхэн дэлгэцийн бүтээл. Монголчуудын амьдрал, хувьсгалын түүхийг өгүүлнэ.",
            description_en: "The classic historical film based on the legendary novel 'Clear Tamir' by Ch. Lodoidamba, illustrating Mongolian life, struggles, and history.",
            genre: "Түүхэн",
            year: 1970,
            duration_min: 120,
            cast_list: "Л.Лхасүрэн, П.Цэвэлсүрэн, Н.Дагийранз",
            director: "Р.Доржпалам",
            poster_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/posters/tungalag_tamir.png",
            backdrop_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/posters/tungalag_tamir.png",
            video_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/videos/tungalag_tamir.mp4",
            is_premium: false,
            is_featured: false,
            views: 0
          };

          if (!tungalag) {
            await admin.from("movies").insert(tungalagData);
          } else {
            await admin.from("movies").update(tungalagData).eq("id", tungalag.id);
          }

          // Upsert "Ардын Элч" — insert if missing, update all details always
          const { data: elch } = await admin
            .from("movies")
            .select("id")
            .eq("title", "Ардын Элч (People's Envoy)")
            .maybeSingle();

          const elchData = {
            title: "Ардын Элч (People's Envoy)",
            title_en: "People's Envoy",
            description: "Монгол ардын хувьсгалын түүхт үеийн эх оронч сэтгэлгээг харуулсан кино урлагийн гайхалтай бүтээл. Ариунаа бүсгүйн зоригт тэмцлийг харуулна. Зохиолч Ч.Ойдов.",
            description_en: "An epic movie depicting the patriotic struggle during the Mongolian people's revolution, focusing on the brave woman Ariunaa. Written by Ch. Oidov.",
            genre: "Драм",
            year: 1959,
            duration_min: 95,
            cast_list: "П.Цэвэлсүрэн, Д.Ичинхорлоо, Ж.Лхасүрэн",
            director: "Д.Жигжид",
            poster_url: "/ardyn_elch_new.png",
            backdrop_url: "/ardyn_elch_new.png",
            video_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/videos/ardyn_elch.mp4",
            is_premium: false,
            is_featured: false,
            views: 0
          };

          if (!elch) {
            await admin.from("movies").insert(elchData);
          } else {
            await admin.from("movies").update(elchData).eq("id", elch.id);
          }

          // Always fix Цогт Тайж video URL + new unique poster
          await admin.from("movies").update({
            video_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/videos/tsogt_taij.mp4",
            poster_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/posters/tsogt_taij_new.png",
            backdrop_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/posters/tsogt_taij_new.png"
          }).eq("title", "Цогт Тайж (Tsogt Taij)");

          // Upsert "Өнөр бүл (1980)" — correctly spelled
          const { data: unurBul } = await admin
            .from("movies")
            .select("id")
            .eq("title", "Өнөр бүл (1980)")
            .maybeSingle();

          const unurBulData = {
            title: "Өнөр бүл (1980)",
            title_en: "Unur Bul (1980)",
            description: "1980 онд бүтээгдсэн Монголын сонгодог инээдмийн уран сайхны бүтээл. Ганц бие залуу Гармаагийн амьдралд тохиолдох хөгжилтэй адал явдлыг өгүүлнэ. Зохиолч Д.Дожоодорж.",
            description_en: "A classic 1980 Mongolian comedy film depicting the funny adventures in the life of a bachelor named Garmaa. Written by D. Dojoodorj.",
            genre: "Драм",
            year: 1980,
            duration_min: 87,
            cast_list: "Ч.Алтан-Өлзий, Ц.Чулуунцэцэг, Б.Пүрэв",
            director: "Д.Жигжид",
            poster_url: "/unur_bul_new.png",
            backdrop_url: "/unur_bul_new.png",
            video_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/videos/unur_bul.mp4",
            is_premium: false,
            is_featured: false,
            views: 0
          };

          if (!unurBul) {
            await admin.from("movies").insert(unurBulData);
          } else {
            await admin.from("movies").update(unurBulData).eq("id", unurBul.id);
          }

          // 1. Fetch all users using the auth admin client to find dolgoonoo473@gmail.com
          const {
            data: { users },
            error: listError,
          } = await admin.auth.admin.listUsers();
          if (listError) {
            return Response.json(
              { ok: false, error: "Failed to list users: " + listError.message },
              { status: 500 },
            );
          }

          const adminEmail = process.env.ADMIN_EMAIL || import.meta.env.VITE_ADMIN_EMAIL || "dolgoonoo473@gmail.com";
          const targetEmail = adminEmail.toLowerCase();
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
            const { error: insertProfError } = await admin.from("profiles").insert({
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
            const { error: insertRoleError } = await admin.from("user_roles").insert({
              user_id: uid,
              role: "admin",
            });

            if (insertRoleError) {
              return Response.json(
                {
                  ok: false,
                  error: `Failed to insert admin role: ${insertRoleError.message}. Details: ${insertRoleError.details}`,
                },
                { status: 500 },
              );
            }
            roleAssigned = true;
          }

          return Response.json({
            ok: true,
            message: `Successfully setup admin user permissions and seeded Mongolian movies!`,
            details: {
              userId: uid,
              email: matchedUser.email,
              profileCreated,
              roleAssigned,
              currentRoles: hasAdminRole
                ? (roles?.map((r) => r.role) ?? [])
                : [...(roles?.map((r) => r.role) || []), "admin"],
            },
          });
        } catch (err) {
          return Response.json(
            {
              ok: false,
              error: (err as Error).message,
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
