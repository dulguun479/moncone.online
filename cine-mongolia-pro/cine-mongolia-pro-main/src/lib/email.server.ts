// Best-effort notification helper. Currently logs only — wire to Lovable Cloud
// email infrastructure once the sender domain is verified.
export async function sendNotificationEmail(to: string, subject: string, html: string) {
  console.log("[email] (stub) would send", { to, subject });
  // TODO: route to /lovable/email/transactional/send after email domain setup
  return { ok: true, stub: true } as const;
}
