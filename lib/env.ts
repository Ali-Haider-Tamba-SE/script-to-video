type EnvConfig = {
  seedanceApiKey: string;
  seedanceApiUrl: string;
  seedanceModel: string;
  requestTimeoutMs: number;
};

const DEFAULT_SEEDANCE_API_URL = "https://api.kie.ai";
const DEFAULT_SEEDANCE_MODEL = "bytedance/seedance-1.5-pro";
const DEFAULT_TIMEOUT_MS = 120_000;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getApiKeyFromEnv(): string {
  return (
    process.env.KIE_API_KEY ??
    process.env.ARK_API_KEY ??
    getRequiredEnv("SEEDANCE_API_KEY")
  );
}

function parseTimeout(value: string | undefined): number {
  if (!value) {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return parsed;
}

export function getEnvConfig(): EnvConfig {
  return {
    seedanceApiKey: getApiKeyFromEnv(),
    seedanceApiUrl: process.env.SEEDANCE_API_URL ?? DEFAULT_SEEDANCE_API_URL,
    seedanceModel: process.env.SEEDANCE_MODEL ?? DEFAULT_SEEDANCE_MODEL,
    requestTimeoutMs: parseTimeout(process.env.SEEDANCE_REQUEST_TIMEOUT_MS),
  };
}
