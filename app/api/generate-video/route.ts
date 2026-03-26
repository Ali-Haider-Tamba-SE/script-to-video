import { NextResponse } from "next/server";

import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_SCRIPT_LENGTH,
  MIN_SCRIPT_LENGTH,
} from "@/lib/generation-constraints";
import { generateSeedanceVideo, SeedanceApiError } from "@/lib/seedance";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    console.info("[api/generate-video] request:start", { requestId });
    const formData = await request.formData();
    const image = formData.get("image");
    const script = formData.get("script");

    if (!(image instanceof File)) {
      return badRequest("Image is required.");
    }

    if (!ALLOWED_IMAGE_TYPES.includes(image.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return badRequest("Image must be JPG, PNG, or WEBP.");
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return badRequest("Image must be 10MB or smaller.");
    }

    if (typeof script !== "string") {
      return badRequest("Script is required.");
    }

    const trimmedScript = script.trim();
    if (trimmedScript.length < MIN_SCRIPT_LENGTH) {
      return badRequest(`Script must be at least ${MIN_SCRIPT_LENGTH} characters.`);
    }

    if (trimmedScript.length > MAX_SCRIPT_LENGTH) {
      return badRequest(`Script must be ${MAX_SCRIPT_LENGTH} characters or fewer.`);
    }

    const result = await generateSeedanceVideo({
      image,
      script: trimmedScript,
      requestId,
    });

    console.info("[api/generate-video] request:success", {
      requestId,
      responseType: "videoUrl" in result ? "url" : "dataUrl",
    });
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof SeedanceApiError) {
      console.error("[api/generate-video] request:seedance-error", {
        requestId,
        statusCode: error.statusCode,
        message: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("[api/generate-video] request:unexpected-error", {
      requestId,
      error,
    });
    return NextResponse.json(
      { error: "Unexpected error while generating video." },
      { status: 500 },
    );
  }
}
