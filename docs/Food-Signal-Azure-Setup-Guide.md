# Food Signal – Azure Resource Setup Guide

This guide walks through creating the Azure resources for the Food Signal MVP, step by step. It covers the required resources from `Food-Signal-Technical-Details.md`:

- Resource group
- Azure OpenAI + a vision-capable model deployment
- Azure Key Vault (stores the model key)
- Azure Static Web Apps (hosts the PWA + managed Functions API)
- Managed identity + role assignments
- Application Insights (diagnostics)

You can follow the **Azure CLI** path (recommended, fastest to reproduce) or the **Azure Portal** path. Do both only if noted.

---

## 0. Prerequisites

Install these once:

- An Azure subscription with permission to create resources and access to Azure OpenAI.
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- [Azure Static Web Apps CLI](https://azure.github.io/static-web-apps-cli/) (`npm install -g @azure/static-web-apps-cli`)
- [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local) (for local API dev)
- Node.js 18+ and npm.

> Azure OpenAI requires that your subscription is approved/enabled for the service. Confirm access before starting.

Sign in and pick your subscription:

```powershell
az login
az account set --subscription "<YOUR_SUBSCRIPTION_ID_OR_NAME>"
az account show --output table
```

Set reusable variables for this session (PowerShell):

```powershell
$RG="rg-foodsignal"
$LOCATION="eastus"                 # pick a region where Azure OpenAI + your model are available
$OPENAI="openai-foodsignal"        # must be globally unique
$KV="kv-foodsignal-$(Get-Random -Maximum 9999)"  # Key Vault names must be globally unique, 3-24 chars
$APPINSIGHTS="appinsights-foodsignal"
$SWA="swa-foodsignal"
$MODEL_DEPLOYMENT="gpt-4.1"        # your Azure OpenAI deployment name
```

---

## 1. Create the Resource Group

All resources live in one group so they are easy to manage and delete together.

```powershell
az group create --name $RG --location $LOCATION --output table
```

Portal alternative: **Create a resource > Resource group**, name it `rg-foodsignal`, choose your region.

---

## 2. Create Azure OpenAI and Deploy a Model

### 2.1 Create the Azure OpenAI resource

```powershell
az cognitiveservices account create `
  --name $OPENAI `
  --resource-group $RG `
  --location $LOCATION `
  --kind OpenAI `
  --sku S0 `
  --yes `
  --output table
```

### 2.2 Deploy a vision-capable model

Deploy the model your app will call (for example GPT-4.1). Model names and versions vary by region; list what is available first.

```powershell
# See models available to your account
az cognitiveservices account list-models `
  --name $OPENAI `
  --resource-group $RG `
  --query "[].{model:name, version:version}" `
  --output table

# Create a deployment (adjust model + version to what is available)
az cognitiveservices account deployment create `
  --name $OPENAI `
  --resource-group $RG `
  --deployment-name $MODEL_DEPLOYMENT `
  --model-name gpt-4.1 `
  --model-version "2025-04-14" `
  --model-format OpenAI `
  --sku-capacity 10 `
  --sku-name "Standard"
```

### 2.3 Capture the endpoint and key

```powershell
$OPENAI_ENDPOINT = az cognitiveservices account show `
  --name $OPENAI --resource-group $RG `
  --query "properties.endpoint" -o tsv

$OPENAI_KEY = az cognitiveservices account keys list `
  --name $OPENAI --resource-group $RG `
  --query "key1" -o tsv

Write-Host "Endpoint: $OPENAI_ENDPOINT"
```

> Do not paste the key into code or the frontend. It goes into Key Vault in the next step.

Portal alternative: **Create a resource > Azure OpenAI**, then open **Azure AI Foundry / Model deployments** to deploy the model, and read **Keys and Endpoint**.

---

## 3. Create Key Vault and Store the Secret

Key Vault keeps the Azure OpenAI key out of your code and the browser bundle.

```powershell
az keyvault create `
  --name $KV `
  --resource-group $RG `
  --location $LOCATION `
  --output table

# Store the endpoint and key as secrets
az keyvault secret set --vault-name $KV --name "AzureOpenAIEndpoint" --value $OPENAI_ENDPOINT
az keyvault secret set --vault-name $KV --name "AzureOpenAIKey" --value $OPENAI_KEY
```

> If you get an authorization error setting secrets, grant yourself access:
> ```powershell
> $ME = az ad signed-in-user show --query id -o tsv
> az role assignment create --assignee $ME --role "Key Vault Secrets Officer" `
>   --scope $(az keyvault show --name $KV --resource-group $RG --query id -o tsv)
> ```

Portal alternative: **Create a resource > Key Vault**, then **Objects > Secrets > Generate/Import** to add `AzureOpenAIEndpoint` and `AzureOpenAIKey`.

---

## 4. Create Application Insights

Used for request timing, failures, and demo debugging. Avoid logging raw profile values.

```powershell
# Ensure the Application Insights CLI extension is available
az extension add --name application-insights --only-show-errors

az monitor app-insights component create `
  --app $APPINSIGHTS `
  --location $LOCATION `
  --resource-group $RG `
  --application-type web `
  --output table

# Capture the connection string for your Functions app settings
$APPINSIGHTS_CONNECTION = az monitor app-insights component show `
  --app $APPINSIGHTS --resource-group $RG `
  --query "connectionString" -o tsv
```

Portal alternative: **Create a resource > Application Insights**, resource group `rg-foodsignal`, type **Web**.

---

## 5. Create Azure Static Web Apps (PWA + Managed Functions API)

Static Web Apps hosts the PWA frontend and provides an integrated Functions API, so you deploy the frontend and backend together with HTTPS and CI/CD.

### 5.1 Recommended: create from your GitHub repo

Push your project to GitHub first (frontend in the app folder, API in an `api/` folder). Then:

```powershell
az staticwebapp create `
  --name $SWA `
  --resource-group $RG `
  --location $LOCATION `
  --source "https://github.com/<your-org>/<your-repo>" `
  --branch main `
  --app-location "/" `
  --api-location "api" `
  --output-location "dist" `
  --login-with-github
```

- `--app-location`: folder containing the PWA source.
- `--api-location`: folder containing the Azure Functions API (`api`).
- `--output-location`: build output folder (`dist` for Vite, `.next`/`out` for Next.js export, etc.).

This wires up a GitHub Actions workflow that builds and deploys on every push.

### 5.2 Alternative: create empty, deploy with the SWA CLI

```powershell
az staticwebapp create --name $SWA --resource-group $RG --location $LOCATION --output table
# Later, from your project root after a build:
swa deploy ./dist --api-location ./api --deployment-token $(az staticwebapp secrets list --name $SWA --resource-group $RG --query "properties.apiKey" -o tsv)
```

Portal alternative: **Create a resource > Static Web App**, connect GitHub, set app/api/output locations.

---

## 6. Give the API a Managed Identity and Grant Key Vault Access

The Functions API reads secrets from Key Vault using a managed identity, so no key is stored in code or app settings.

```powershell
# Enable a system-assigned identity on the Static Web App (Standard plan required for managed identity)
az staticwebapp update --name $SWA --resource-group $RG --sku Standard

$SWA_PRINCIPAL_ID = az staticwebapp identity assign `
  --name $SWA --resource-group $RG `
  --query "principalId" -o tsv

# Grant that identity permission to read Key Vault secrets
$KV_ID = az keyvault show --name $KV --resource-group $RG --query id -o tsv
az role assignment create `
  --assignee $SWA_PRINCIPAL_ID `
  --role "Key Vault Secrets User" `
  --scope $KV_ID
```

> If your Key Vault uses access policies instead of RBAC, grant `get`/`list` on secrets to `$SWA_PRINCIPAL_ID` via `az keyvault set-policy`.

---

## 7. Configure API Settings

Provide the API with the model deployment name, Key Vault references, and Application Insights connection.

```powershell
az staticwebapp appsettings set `
  --name $SWA --resource-group $RG `
  --setting-names `
    "AZURE_OPENAI_DEPLOYMENT=$MODEL_DEPLOYMENT" `
    "KEYVAULT_NAME=$KV" `
    "APPLICATIONINSIGHTS_CONNECTION_STRING=$APPINSIGHTS_CONNECTION"
```

In the Functions code, resolve the endpoint/key from Key Vault at startup using the managed identity (for example with `DefaultAzureCredential` and `SecretClient`). The browser never sees these values.

---

## 8. Verify the Setup

```powershell
# List everything created in the resource group
az resource list --resource-group $RG --output table

# Confirm the model deployment exists
az cognitiveservices account deployment list --name $OPENAI --resource-group $RG --output table

# Confirm secrets exist (names only, not values)
az keyvault secret list --vault-name $KV --query "[].name" -o table

# Get the live PWA URL
az staticwebapp show --name $SWA --resource-group $RG --query "defaultHostname" -o tsv
```

Open the returned hostname in a browser to confirm the PWA loads over HTTPS.

---

## 9. Optional Resources (add only if needed)

| Resource | When to add | CLI starting point |
| --- | --- | --- |
| Azure AI Document Intelligence | Menu images/PDFs the LLM vision struggles to read | `az cognitiveservices account create --kind FormRecognizer --sku S0 ...` |
| Azure Blob Storage | If menu images must be stored temporarily | `az storage account create ...` |
| Azure Cosmos DB | Post-hackathon durable profiles (needs consent) | `az cosmosdb create ...` |
| Azure AI Search | Post-hackathon regional dish/ingredient knowledge | `az search service create ...` |

---

## 10. Clean Up

To avoid ongoing charges after the hackathon, delete the whole resource group:

```powershell
az group delete --name $RG --yes --no-wait
```

> This permanently deletes every resource created in this guide. Key Vault may be recoverable during its soft-delete retention window; purge separately if you need the name back immediately.

---

## Quick Reference: Minimal Required Set

1. Resource group
2. Azure OpenAI + model deployment
3. Key Vault + secrets
4. Application Insights
5. Static Web Apps (with managed Functions API)
6. Managed identity + Key Vault role assignment

That is the smallest footprint that keeps the model key server-side and gives you a working PWA + API for the demo.
