// =============================================================================
// Food Signal - Minimal deployable footprint (Infrastructure as Code)
// =============================================================================
// Provisions the smallest working set from Food-Signal-Technical-Details.md:
//   - Azure Static Web App (hosts PWA + managed Functions API)
//   - Azure OpenAI (vision-capable deployment)
//   - Key Vault (stores the model key/endpoint)
//   - Role assignment: SWA managed identity -> Key Vault Secrets User
//
// TODO: Replace all dummy defaults below with actual values during deployment.
// This template is a PLACEHOLDER and is not wired to any real subscription.
// Deploy with:  az deployment group create -g <rg> -f infra/main.bicep -p @infra/main.parameters.json
// =============================================================================

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Short name prefix used to build resource names.')
param namePrefix string = 'foodsignal'

@description('Azure OpenAI model deployment name used by the API.')
param openAiDeploymentName string = 'gpt-4.1'

@description('Azure OpenAI model name. TODO: confirm availability in the target region.')
param openAiModelName string = 'gpt-4.1'

@description('Azure OpenAI model version. TODO: confirm availability in the target region.')
param openAiModelVersion string = '2025-04-14'

var openAiName = 'openai-${namePrefix}'
var keyVaultName = 'kv-${namePrefix}'
var swaName = 'swa-${namePrefix}'

// --- Azure OpenAI ---
resource openAi 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: openAiName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'OpenAI'
  properties: {
    customSubDomainName: openAiName
    publicNetworkAccess: 'Enabled'
  }
}

resource openAiDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openAi
  name: openAiDeploymentName
  sku: {
    name: 'Standard'
    capacity: 10
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: openAiModelName
      version: openAiModelVersion
    }
  }
}

// --- Key Vault (RBAC-enabled) ---
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
  }
}

// TODO: After deployment, store the real Azure OpenAI key/endpoint as secrets:
//   az keyvault secret set --vault-name <kv> --name AzureOpenAIEndpoint --value <endpoint>
//   az keyvault secret set --vault-name <kv> --name AzureOpenAIKey --value <key>

// --- Static Web App (Standard SKU required for managed identity) ---
resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: swaName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    // TODO: Connect the real GitHub repo + branch at deploy time, or deploy via SWA CLI.
    buildProperties: {
      appLocation: '/frontend'
      apiLocation: '/api'
      outputLocation: 'dist'
    }
  }
}

// --- Role assignment: SWA identity can read Key Vault secrets ---
// Key Vault Secrets User built-in role id.
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, staticWebApp.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: staticWebApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalType: 'ServicePrincipal'
  }
}

// --- Outputs (dummy-safe; real values populate after a real deployment) ---
output staticWebAppName string = staticWebApp.name
output openAiEndpoint string = openAi.properties.endpoint
output keyVaultName string = keyVault.name
