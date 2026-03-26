import { NextResponse } from "next/server";

import { ALLOWED_IMAGE_TYPES } from "@/lib/generation-constraints";
import { createSignedImageUpload } from "@/lib/supabase-storage";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const payload = (await request.json()) as { contentType?: string };
    const contentType = payload.contentType;

    if (typeof contentType !== "string") {
      return badRequest("Image contentType is required.");
    }

    if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return badRequest("Image must be JPG, PNG, or WEBP.");
    }

    const uploadTarget = await createSignedImageUpload(contentType, requestId);
    return NextResponse.json(uploadTarget, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[api/create-image-upload] request:unexpected-error", {
      requestId,
      error,
    });
    return NextResponse.json(
      { error: "Could not create image upload target." },
      { status: 500 },
    );
  }
}
