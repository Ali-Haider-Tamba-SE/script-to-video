import { createClient } from "@supabase/supabase-js";

import { getEnvConfig } from "@/lib/env";

function extensionFromType(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

function createAdminSupabaseClient() {
  const config = getEnvConfig();
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

export async function createSignedImageUpload(
  imageMimeType: string,
  requestId: string,
): Promise<{
  bucket: string;
  objectPath: string;
  token: string;
  signedUrl: string;
  publicUrl: string;
}> {
  const config = getEnvConfig();
  const supabase = createAdminSupabaseClient();

  const extension = extensionFromType(imageMimeType);
  const objectPath = `seedance/${requestId}-${crypto.randomUUID()}.${extension}`;

  const signedUploadResult = await supabase.storage
    .from(config.supabaseStorageBucket)
    .createSignedUploadUrl(objectPath, { upsert: false });

  if (signedUploadResult.error || !signedUploadResult.data) {
    throw new Error(
      `Supabase signed upload URL creation failed: ${signedUploadResult.error?.message ?? "Unknown error"}`,
    );
  }

  const publicUrlResult = supabase.storage
    .from(config.supabaseStorageBucket)
    .getPublicUrl(objectPath);

  const publicUrl = publicUrlResult.data.publicUrl;
  if (!publicUrl) {
    throw new Error("Supabase upload succeeded but public URL is missing.");
  }

  return {
    bucket: config.supabaseStorageBucket,
    objectPath,
    token: signedUploadResult.data.token,
    signedUrl: signedUploadResult.data.signedUrl,
    publicUrl,
  };
}
