// Standard email notification helper. Currently logs to console (stub) — wire to your preferred SMTP or email service provider.
export async function sendNotificationEmail(to: string, subject: string, html: string) {
  console.log("[email] (stub) would send", { to, subject });
  return { ok: true, stub: true } as const;
}
