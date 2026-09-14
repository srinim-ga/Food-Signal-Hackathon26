/**
 * Loads and validates configuration from environment variables exactly once.
 *
 * Local values come from api/local.settings.json (see the .example file); in
 * Azure they come from Static Web App / Function app settings, with secrets
 * resolved from Key Vault via managed identity (see keyVaultSecrets.ts).
 *
 * TODO: Replace dummy values with real Azure resource values during deployment.
 */
import type { AppConfig } from "./configModels.js";

function readEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    // Do not throw for dummy-friendly startup; log-and-default keeps the stub
    // path working offline. Real deployments should set every value.
    return "";
  }
  return value;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw.toLowerCase() === "true" || raw === "1";
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

let cached: AppConfig | undefined;

/** Returns the singleton, lazily-loaded application configuration. */
export function getConfig(): AppConfig {
  if (cached) return cached;

  cached = {
    openAI: {
      // TODO: Replace with actual Azure OpenAI endpoint during deployment.
      endpoint: readEnv("AZURE_OPENAI_ENDPOINT", "https://dummy-openai-endpoint.openai.azure.com"),
      // TODO: In production this is resolved from Key Vault, never from settings.
      apiKey: readEnv("AZURE_OPENAI_API_KEY", "dummy-openai-api-key"),
      deployment: readEnv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1"),
      apiVersion: readEnv("AZURE_OPENAI_API_VERSION", "2024-10-21"),
    },
    keyVault: {
      name: readEnv("KEYVAULT_NAME", "dummy-keyvault"),
      // TODO: Replace with actual Key Vault URI during deployment.
      uri: readEnv("KEYVAULT_URI", "https://dummy-keyvault.vault.azure.net"),
    },
    limits: {
      maxUploadBytes: readInt("MAX_UPLOAD_BYTES", 10 * 1024 * 1024),
      modelTimeoutMs: readInt("MODEL_TIMEOUT_MS", 30_000),
    },
    features: {
      // Default true so the scaffold runs fully offline without Azure.
      useStubExtractor: readBool("USE_STUB_EXTRACTOR", true),
    },
  };

  return cached;
}

/** Test hook: reset the cached config between test cases. */
export function resetConfigCache(): void {
  cached = undefined;
}
