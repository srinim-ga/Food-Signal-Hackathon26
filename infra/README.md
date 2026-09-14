# Infrastructure (placeholders only)

This folder contains **placeholder** Infrastructure as Code for Food Signal. It
does **not** connect to any real Azure subscription. Every value is a dummy or a
`TODO`.

## Files

- `main.bicep` - minimal deployable footprint: Static Web App (+ managed
  Functions API), Azure OpenAI, Key Vault, and the role assignment that lets the
  app read Key Vault secrets.
- `main.parameters.json` - dummy parameter values.

## Before deploying (real environment)

1. Replace dummy values and confirm the Azure OpenAI model/version is available
   in your target region.
2. Log in and select a subscription:
   ```powershell
   az login
   az account set --subscription "<YOUR_SUBSCRIPTION_ID>"   # TODO: real value
   ```
3. Create the resource group and deploy:
   ```powershell
   az group create -n rg-foodsignal -l eastus
   az deployment group create -g rg-foodsignal -f infra/main.bicep -p @infra/main.parameters.json
   ```
4. Store the real model secrets in Key Vault (never in code or app settings):
   ```powershell
   az keyvault secret set --vault-name <kv> --name AzureOpenAIEndpoint --value <endpoint>
   az keyvault secret set --vault-name <kv> --name AzureOpenAIKey --value <key>
   ```

See `Documents/Food-Signal-Azure-Setup-Guide.md` for the full manual walkthrough.
