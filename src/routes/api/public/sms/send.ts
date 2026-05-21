import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

let _admin: any = null;
function admin(): any {
  if (!_admin) {
    _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

async function findUserByEmail(email: string): Promise<any | null> {
  let page = 1;
  while (true) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 100 });
    if (error || !data?.users || data.users.length === 0) {
      break;
    }
    const found = data.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 100) break;
    page++;
  }
  return null;
}

export const Route = createFileRoute("/api/public/sms/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as any;
          const rawPhone = body.phone ?? "";
          const cleanPhone = rawPhone.replace(/\D/g, "").replace(/^976/, "");
          if (cleanPhone.length !== 8) {
            return Response.json(
              { error: "Монгол улсын 8 оронтой утасны дугаар оруулна уу." },
              { status: 400 }
            );
          }

          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const email = `phone-${cleanPhone}@moncone.online`;

          // Look up user, if exists update password to OTP, else create new
          const found = await findUserByEmail(email);
          if (found) {
            const { error } = await admin().auth.admin.updateUserById(found.id, { password: otp });
            if (error) throw error;
          } else {
            const { error } = await admin().auth.admin.createUser({
              email,
              password: otp,
              email_confirm: true,
              user_metadata: { display_name: `Хэрэглэгч ${cleanPhone}` },
            });
            if (error) throw error;
          }

          // Send SMS via sms.mn gateway
          const smsToken = process.env.SMS_MN_API_KEY || "1YFHPXMGEHWYZ864Y31MYMXW";
          const smsMessage = `Таны moncone.online нэвтрэх нэг удаагийн код: ${otp}`;
          const formattedRecipient = `+976${cleanPhone}`;

          const smsResponse = await fetch("https://api.sms.mn/v1/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${smsToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: formattedRecipient,
              message: smsMessage,
            }),
          });

          if (!smsResponse.ok) {
            const errorText = await smsResponse.text();
            console.error("[sms.mn error response]", errorText);
            throw new Error(`SMS илгээхэд алдаа гарлаа: ${errorText}`);
          }

          const smsResult = (await smsResponse.json()) as any;
          console.log("[sms.mn success]", smsResult);

          return Response.json({ success: true, message: "Код амжилттай илгээгдлээ!" });
        } catch (e: any) {
          console.error("[sms/send error]", e);
          return Response.json(
            { error: e.message || "Дотоод алдаа гарлаа. Та дараа дахин оролдоно уу." },
            { status: 500 }
          );
        }
      },
    },
  },
});
