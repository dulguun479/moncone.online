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
              { status: 400 },
            );
          }

          const otp = cleanPhone.endsWith("9999")
            ? "123456"
            : Math.floor(100000 + Math.random() * 900000).toString();
          const email = `phone-${cleanPhone}@moncone.online`;

          // Look up user, if exists update password to OTP, else create new
          const found = await findUserByEmail(email);
          if (found) {
            const { error } = await admin().auth.admin.updateUserById(found.id, {
              password: otp,
              user_metadata: {
                ...found.user_metadata,
                temp_otp: otp,
                last_otp_at: new Date().toISOString(),
              },
            });
            if (error) throw error;
          } else {
            const { error } = await admin().auth.admin.createUser({
              email,
              password: otp,
              email_confirm: true,
              user_metadata: {
                display_name: `Хэрэглэгч ${cleanPhone}`,
                temp_otp: otp,
                last_otp_at: new Date().toISOString(),
              },
            });
            if (error) throw error;
          }

          // If it is a test number ending in 9999, bypass SMS sending
          if (cleanPhone.endsWith("9999")) {
            console.log(`[sms.mn bypass] Test number ${cleanPhone} used. OTP set to: ${otp}`);
            return Response.json({
              success: true,
              message: "Код амжилттай илгээгдлээ! (Тест дугаар тул 123456 кодоор нэвтэрнэ үү)",
            });
          }

          // Send SMS via sms.mn gateway
          const smsToken = process.env.SMS_MN_API_KEY || "1YFHPXMGEHWYZ864Y31MYMXW";
          const smsMessage = `Таны moncone.online нэвтрэх нэг удаагийн код: ${otp}`;
          const formattedRecipient = `+976${cleanPhone}`;

          let smsSent = false;
          let smsErrorDetail = "";

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const smsResponse = await fetch("https://api.sms.mn/v1/send", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${smsToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: cleanPhone,
                message: smsMessage,
              }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!smsResponse.ok) {
              const errorText = await smsResponse.text();
              console.error("[sms.mn error response]", errorText);
              smsErrorDetail = errorText;
            } else {
              const smsResult = (await smsResponse.json()) as any;
              console.log("[sms.mn success]", smsResult);
              smsSent = true;
            }
          } catch (fetchErr: any) {
            console.error("[sms.mn fetch error]", fetchErr);
            smsErrorDetail = fetchErr.message || "Connection timeout";
          }

          // If SMS gateway failed, we still want to return a friendly response if it's the admin or if we want to allow testing
          if (!smsSent) {
            console.warn(
              `[SMS Fail Fallback] OTP is saved in Supabase metadata for ${email}. OTP: ${otp}`,
            );
            // Return a 200 with an info message so that they can retrieve it from Supabase console, but alert the UI
            return Response.json({
              success: true,
              warning: true,
              message: `Баталгаажуулах код үүсгэгдлээ! (SMS гарц түр саатсан тул та Supabase Auth хэсгээс кодоо харах боломжтой: ${otp})`,
              otp: otp, // Return in development or temporary for user ease since sms.mn is down
            });
          }

          return Response.json({ success: true, message: "Код амжилттай илгээгдлээ!" });
        } catch (e: any) {
          console.error("[sms/send error]", e);
          return Response.json(
            { error: e.message || "Дотоод алдаа гарлаа. Та дараа дахин оролдоно уу." },
            { status: 500 },
          );
        }
      },
    },
  },
});
