import { createClient } from "@supabase/supabase-js";

import { getEnvConfig } from "@/lib/env";

function extensionFromType(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

export async function uploadImageAndGetPublicUrl(
  image: File,
  requestId: string,
): Promise<string> {
  const config = getEnvConfig();
  const supabase = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      auth: { persistSession: false },
    },
  );

  const extension = extensionFromType(image.type);
  const objectPath = `seedance/${requestId}-${crypto.randomUUID()}.${extension}`;
  const arrayBuffer = await image.arrayBuffer();

  const uploadResult = await supabase.storage
    .from(config.supabaseStorageBucket)
    .upload(objectPath, arrayBuffer, {
      contentType: image.type || "application/octet-stream",
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadResult.error) {
    throw new Error(`Supabase upload failed: ${uploadResult.error.message}`);
  }

  const publicUrlResult = supabase.storage
    .from(config.supabaseStorageBucket)
    .getPublicUrl(objectPath);

  const publicUrl = publicUrlResult.data.publicUrl;
  if (!publicUrl) {
    throw new Error("Supabase upload succeeded but public URL is missing.");
  }

  return publicUrl;
}
