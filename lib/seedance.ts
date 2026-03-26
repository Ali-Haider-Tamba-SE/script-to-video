import { getEnvConfig } from "@/lib/env";

export type SeedanceSuccessResult =
  | { videoUrl: string }
  | { videoDataUrl: string; mimeType: string };

export class SeedanceApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "SeedanceApiError";
    this.statusCode = statusCode;
  }
}

type ProviderLikeError = Error & {
  statusCode?: number;
  responseBody?: string;
};

type GenerateSeedanceVideoInput = {
  imageUrl: string;
  script: string;
  requestId?: string;
};

export async function generateSeedanceVideo({
  imageUrl,
  script,
  requestId = "unknown",
}: GenerateSeedanceVideoInput): Promise<SeedanceSuccessResult> {
  const config = getEnvConfig();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    console.info("[seedance] request:start", {
      requestId,
      apiUrl: config.seedanceApiUrl,
      model: config.seedanceModel,
      imageUrl,
      scriptLength: script.length,
      timeoutMs: config.requestTimeoutMs,
      provider: "kie-api",
    });

    const createResponse = await fetch(`${config.seedanceApiUrl}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.seedanceApiKey}`,
      },
      body: JSON.stringify({
        model: config.seedanceModel,
        input: {
          prompt: script,
          input_urls: [imageUrl],
          aspect_ratio: "16:9",
          resolution: "720p",
          duration: "4",
          fixed_lens: false,
          generate_audio: true,
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const createPayload = (await createResponse.json()) as {
      code?: number;
      msg?: string;
      data?: { taskId?: string };
    };

    if (!createResponse.ok || createPayload.code !== 200 || !createPayload.data?.taskId) {
      throw new SeedanceApiError(
        createPayload.msg || "Failed to create KIE video generation task.",
        createPayload.code === 401 ? 401 : 502,
      );
    }

    const taskId = createPayload.data.taskId;
    console.info("[seedance] request:task-created", { requestId, taskId });

    const pollStart = Date.now();
    const pollIntervalMs = 3000;
    while (Date.now() - pollStart < config.requestTimeoutMs) {
      const recordResponse = await fetch(
        `${config.seedanceApiUrl}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.seedanceApiKey}`,
          },
          signal: controller.signal,
          cache: "no-store",
        },
      );

      const recordPayload = (await recordResponse.json()) as {
        code?: number;
        msg?: string;
        data?: {
          state?: string;
          resultJson?: string;
          failMsg?: string;
        };
      };

      if (!recordResponse.ok || recordPayload.code !== 200) {
        throw new SeedanceApiError(
          recordPayload.msg || "Failed while checking KIE task status.",
          recordPayload.code === 401 ? 401 : 502,
        );
      }

      const state = recordPayload.data?.state;
      console.info("[seedance] request:task-state", { requestId, taskId, state });

      if (state === "success") {
        const resultJson = recordPayload.data?.resultJson;
        if (!resultJson) {
          throw new SeedanceApiError("KIE task succeeded but result was empty.");
        }

        const parsed = JSON.parse(resultJson) as { resultUrls?: string[] };
        const videoUrl = parsed.resultUrls?.[0];
        if (!videoUrl) {
          throw new SeedanceApiError("KIE task succeeded but no video URL was returned.");
        }

        console.info("[seedance] request:success-kie", {
          requestId,
          taskId,
          hasVideoUrl: true,
        });
        return { videoUrl };
      }

      if (state === "fail") {
        throw new SeedanceApiError(
          recordPayload.data?.failMsg || "KIE task failed.",
          502,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new SeedanceApiError("KIE task timed out before completion.", 504);
  } catch (error) {
    if (error instanceof SeedanceApiError) {
      console.error("[seedance] request:seedance-api-error", {
        requestId,
        statusCode: error.statusCode,
        message: error.message,
      });
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error("[seedance] request:timeout", {
        requestId,
        timeoutMs: config.requestTimeoutMs,
      });
      throw new SeedanceApiError(
        "Seedance request timed out. Try a shorter script or try again.",
        504,
      );
    }

    const providerError = error as ProviderLikeError;
    const providerStatus = providerError.statusCode;
    const mappedMessage = error instanceof Error ? error.message : "Unknown SDK error";
    const responseBody = providerError.responseBody;

    if (providerStatus && providerStatus >= 400) {
      const finalStatus = providerStatus === 401 || providerStatus === 403 ? providerStatus : 502;
      const finalMessage =
        providerStatus === 401
          ? "Authentication failed. Use a valid KIE API key (KIE_API_KEY)."
          : mappedMessage;

      console.error("[seedance] request:provider-http-error", {
        requestId,
        providerStatus,
        mappedMessage,
        responseBody,
      });
      throw new SeedanceApiError(finalMessage, finalStatus);
    }

    console.error("[seedance] request:network-or-unknown-error", {
      requestId,
      error,
      mappedMessage,
    });
    throw new SeedanceApiError(`Seedance request failed: ${mappedMessage}`, 502);
  } finally {
    clearTimeout(timeoutId);
  }
}
