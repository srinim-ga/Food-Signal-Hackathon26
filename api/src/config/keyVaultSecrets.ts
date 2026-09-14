/**
 * Resolves secrets from Azure Key Vault using managed identity.
 *
 * This is the trusted boundary described in the technical design: the model key
 * never lives in the PWA bundle or app settings in production. Locally, the stub
 * path is used and this module is not called.
 *
 * TODO: Wire this into container.ts when USE_STUB_EXTRACTOR=false and real Azure
 * resources exist. It is intentionally not invoked by the offline scaffold.
 */
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import type { KeyVaultConfig } from "../config/configModels.js";

export interface ResolvedSecrets {
  openAiEndpoint: string;
  openAiKey: string;
}

/**
 * Reads AzureOpenAIEndpoint and AzureOpenAIKey secrets from Key Vault.
 *
 * @throws Error when the vault is unreachable or secrets are missing. Callers
 * should treat this as a fatal startup error and fall back to a clear message.
 */
export async function resolveSecrets(config: KeyVaultConfig): Promise<ResolvedSecrets> {
  // Managed identity in Azure; DefaultAzureCredential also supports az login locally.
  const credential = new DefaultAzureCredential();
  const client = new SecretClient(config.uri, credential);

  const [endpoint, key] = await Promise.all([
    client.getSecret("AzureOpenAIEndpoint"),
    client.getSecret("AzureOpenAIKey"),
  ]);

  return {
    openAiEndpoint: endpoint.value ?? "",
    openAiKey: key.value ?? "",
  };
}
