import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function uploadR2(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteR2(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function buildKey(prefix: string, originalName: string): string {
  const ext = originalName.split(".").pop() || "bin";
  const safeBase = originalName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
  return `${prefix}/${Date.now()}-${safeBase}.${ext}`;
}

export function urlToKey(url: string): string | null {
  if (!url.startsWith(PUBLIC_URL)) return null;
  return url.slice(PUBLIC_URL.length + 1);
}
