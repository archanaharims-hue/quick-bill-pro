import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
// 10-year signed URL (max practical)
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

async function compress(file: File, maxWidthOrHeight: number, maxSizeMB: number) {
  return imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.82,
  });
}

export type UploadedImage = { fullUrl: string; thumbUrl: string };

export async function compressAndUpload(file: File, userId: string): Promise<UploadedImage> {
  const [full, thumb] = await Promise.all([
    compress(file, 1200, 0.3),
    compress(file, 200, 0.05),
  ]);
  const id = crypto.randomUUID();
  const fullPath = `${userId}/${id}-full.webp`;
  const thumbPath = `${userId}/${id}-thumb.webp`;

  const [fullUp, thumbUp] = await Promise.all([
    supabase.storage.from(BUCKET).upload(fullPath, full, { contentType: "image/webp", upsert: false }),
    supabase.storage.from(BUCKET).upload(thumbPath, thumb, { contentType: "image/webp", upsert: false }),
  ]);
  if (fullUp.error) throw fullUp.error;
  if (thumbUp.error) throw thumbUp.error;

  const [fullSigned, thumbSigned] = await Promise.all([
    supabase.storage.from(BUCKET).createSignedUrl(fullPath, SIGNED_URL_TTL),
    supabase.storage.from(BUCKET).createSignedUrl(thumbPath, SIGNED_URL_TTL),
  ]);
  if (fullSigned.error) throw fullSigned.error;
  if (thumbSigned.error) throw thumbSigned.error;

  return {
    fullUrl: fullSigned.data.signedUrl,
    thumbUrl: thumbSigned.data.signedUrl,
  };
}
