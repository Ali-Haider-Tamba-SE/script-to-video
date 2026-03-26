import { NextResponse } from "next/server";

import {
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
    const payload = (await request.json()) as {
      imageUrl?: string;
      script?: string;
    };
    const { imageUrl, script } = payload;

    if (typeof imageUrl !== "string" || !imageUrl.trim()) {
      return badRequest("Image URL is required.");
    }

    let parsedImageUrl: URL;
    try {
      parsedImageUrl = new URL(imageUrl);
    } catch {
      return badRequest("Image URL must be a valid URL.");
    }

    if (parsedImageUrl.protocol !== "http:" && parsedImageUrl.protocol !== "https:") {
      return badRequest("Image URL must be http or https.");
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
      imageUrl: parsedImageUrl.toString(),
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
