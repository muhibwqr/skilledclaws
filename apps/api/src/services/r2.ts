import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucket = process.env.CLOUDFLARE_R2_BUCKET;

const client =
  endpoint && accessKeyId && secretAccessKey && bucket
    ? new S3Client({
        region: "auto",
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : null;

const BUCKET_NAME = bucket ?? "";
const DOWNLOAD_URL_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

export function isR2Configured(): boolean {
  return Boolean(client && BUCKET_NAME);
}

export async function uploadSkillZip(
  key: string,
  buffer: Buffer,
  contentType = "application/zip"
): Promise<void> {
  if (!client) {
    throw new Error("R2 is not configured");
  }
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function getPresignedDownloadUrl(key: string): Promise<string> {
  if (!client) {
    throw new Error("R2 is not configured");
  }
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}

export function skillKey(sessionId: string, skillName: string): string {
  const safeName = skillName.replace(/[^a-z0-9-_]/gi, "_");
  return `skills/${sessionId}/${safeName}.skills`;
}
