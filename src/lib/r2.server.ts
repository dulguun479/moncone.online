// R2 presigned URL helper (server-only). Uses aws4fetch — Worker compatible.
import { AwsClient } from "aws4fetch";

function getClient() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  return new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
}

export function r2Endpoint(key: string) {
  const account = process.env.R2_ACCOUNT_ID!;
  const bucket = process.env.R2_BUCKET!;
  return `https://${account}.r2.cloudflarestorage.com/${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

export function r2PublicUrl(key: string) {
  const base = (process.env.R2_PUBLIC_BASE || "").replace(/\/+$/, "");
  return `${base}/${key}`;
}

export async function signR2PutUrl(key: string, contentType: string, expiresSeconds = 3600) {
  const client = getClient();
  const url = new URL(r2Endpoint(key));
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  const signed = await client.sign(
    new Request(url.toString(), { method: "PUT", headers: { "Content-Type": contentType } }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}
