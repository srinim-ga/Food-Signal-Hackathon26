/**
 * Strongly typed configuration models.
 *
 * The app never reads process.env directly outside of appConfig.ts. Everything
 * flows through these typed shapes so config is validated once and injected.
 */

/** Azure OpenAI connection settings (server-side only, never sent to browser). */
export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
}

/** Azure Key Vault settings used to resolve secrets at startup. */
export interface KeyVaultConfig {
  name: string;
  uri: string;
}

/** Upload / model runtime limits. */
export interface LimitsConfig {
  maxUploadBytes: number;
  modelTimeoutMs: number;
}

/** Feature flags for swapping implementations without code changes. */
export interface FeatureFlags {
  /** Use the offline deterministic stub extractor instead of Azure OpenAI. */
  useStubExtractor: boolean;
}

/** The full, validated application configuration. */
export interface AppConfig {
  openAI: AzureOpenAIConfig;
  keyVault: KeyVaultConfig;
  limits: LimitsConfig;
  features: FeatureFlags;
}
