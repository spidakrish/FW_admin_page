# Infrastructure & Deployment Guide

This guide covers deploying the FW Admin Page to Azure.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  Azure Static Web Apps  │     │  Azure Container Apps   │
│  ───────────────────────│     │  ─────────────────────  │
│  Dashboard (Next.js)    │     │  API Gateway (Express)  │
│                         │     │                         │
│  • Global CDN           │────▶│  • Auto-scaling         │
│  • Hybrid SSR/SSG       │     │  • Health probes        │
│  • PR staging envs      │     │  • Key Vault secrets    │
│  • Built-in auth        │     │  • Container isolation  │
└─────────────────────────┘     └─────────────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────┐
                              │  Backend Services       │
                              │  ─────────────────────  │
                              │  • FW Analysis (5173)   │
                              │  • BackPro API (8000)   │
                              └─────────────────────────┘
```

## Components

| Component | Azure Service | Purpose |
|-----------|--------------|---------|
| Dashboard | Azure Static Web Apps | Next.js frontend with hybrid rendering |
| API Gateway | Azure Container Apps | Express proxy with auth and rate limiting |
| Secrets | Azure Key Vault | Secure storage for API keys and credentials |
| Registry | Azure Container Registry | Docker image storage |

## Prerequisites

1. **Azure Account** with active subscription
2. **Azure CLI** installed and authenticated
3. **GitHub Repository** with Actions enabled
4. **Docker** installed locally (for testing)

## Initial Azure Setup

### 1. Create Resource Group

```bash
# Set variables
RESOURCE_GROUP="fw-admin-rg"
LOCATION="eastus"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### 2. Create Azure Container Registry

```bash
ACR_NAME="fwadminacr"

az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Get credentials for GitHub Actions
az acr credential show --name $ACR_NAME
```

### 3. Create Container Apps Environment

```bash
ENVIRONMENT_NAME="fw-admin-env"

az containerapp env create \
  --name $ENVIRONMENT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### 4. Create Container App (API Gateway)

```bash
CONTAINER_APP_NAME="fw-admin-api-gateway"

az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
  --target-port 8787 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1.0Gi
```

### 5. Create Static Web App

```bash
SWA_NAME="fw-admin-dashboard"

az staticwebapp create \
  --name $SWA_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard
```

### 6. Create Key Vault (Optional but Recommended)

```bash
KEY_VAULT_NAME="fw-admin-kv"

az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Add secrets
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "fw-admin-api-keys" \
  --value "your-secure-api-key-1,your-secure-api-key-2"
```

## GitHub Actions Setup

### Required Secrets

Add these secrets in GitHub → Settings → Secrets and variables → Actions:

| Secret | Description | How to Get |
|--------|-------------|------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA deployment token | Azure Portal → SWA → Manage deployment token |
| `AZURE_CREDENTIALS` | Service principal JSON | See below |
| `AZURE_CONTAINER_REGISTRY` | ACR login server | `fwadminacr.azurecr.io` |
| `AZURE_CONTAINER_REGISTRY_USERNAME` | ACR username | `az acr credential show` |
| `AZURE_CONTAINER_REGISTRY_PASSWORD` | ACR password | `az acr credential show` |

### Create Service Principal for Azure Credentials

```bash
# Create service principal with Contributor role
az ad sp create-for-rbac \
  --name "fw-admin-github-actions" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth

# Copy the JSON output to AZURE_CREDENTIALS secret
```

### Required Variables

Add these variables in GitHub → Settings → Secrets and variables → Actions → Variables:

| Variable | Example Value |
|----------|---------------|
| `AZURE_RESOURCE_GROUP` | `fw-admin-rg` |
| `AZURE_CONTAINER_APP_NAME` | `fw-admin-api-gateway` |
| `AZURE_CONTAINER_APP_ENVIRONMENT` | `fw-admin-env` |
| `NEXT_PUBLIC_API_GATEWAY_URL` | `https://fw-admin-api-gateway.azurecontainerapps.io` |
| `NEXT_PUBLIC_FW_ANALYSIS_URL` | `https://your-analysis-service.com` |
| `NEXT_PUBLIC_BACKPRO_URL` | `https://your-backpro-service.com` |

## Container App Configuration

### Environment Variables

Set these in Azure Portal → Container App → Configuration → Environment variables:

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars \
    "NODE_ENV=production" \
    "PORT=8787" \
    "LOG_LEVEL=info" \
    "FW_ANALYSIS_SERVICE_URL=https://your-analysis-service.com" \
    "BACKPRO_SERVICE_URL=https://your-backpro-service.com" \
    "CORS_ORIGINS=https://your-dashboard-url.azurestaticapps.net"
```

### Secrets (via Key Vault)

```bash
# Enable managed identity
az containerapp identity assign \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --system-assigned

# Get identity principal ID
IDENTITY_ID=$(az containerapp identity show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId -o tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $IDENTITY_ID \
  --secret-permissions get list

# Reference secret in container app
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --secrets "api-keys=keyvaultref:https://$KEY_VAULT_NAME.vault.azure.net/secrets/fw-admin-api-keys,identityref:system" \
  --set-env-vars "FW_ADMIN_API_KEYS=secretref:api-keys"
```

### Scaling Rules

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 1 \
  --max-replicas 10 \
  --scale-rule-name http-scale \
  --scale-rule-http-concurrency 100
```

### Health Probes

The Container App uses these health probes (configured via ARM/Bicep or Portal):

- **Startup Probe**: `/api/v1/health` - Checks if app started
- **Liveness Probe**: `/api/v1/health` - Checks if app is alive
- **Readiness Probe**: `/api/v1/health` - Checks if app can receive traffic

## Local Docker Testing

### Build and Run

```bash
# From repository root
cd services/api-gateway

# Build image
docker build -t fw-admin-api-gateway .

# Run with environment variables
docker run -p 8787:8787 \
  -e NODE_ENV=production \
  -e FW_ADMIN_API_KEYS=test-key \
  -e FW_ANALYSIS_SERVICE_URL=http://host.docker.internal:5173 \
  -e BACKPRO_SERVICE_URL=http://host.docker.internal:8000 \
  fw-admin-api-gateway

# Test health endpoint
curl http://localhost:8787/api/v1/health
```

### Using Docker Compose

```bash
# From repository root
docker compose up

# Or just the API gateway
docker compose up api-gateway
```

## Custom Domain Setup

### For Static Web App (Dashboard)

1. Go to Azure Portal → Static Web App → Custom domains
2. Add your domain (e.g., `app.fw-data.com`)
3. Validate ownership via CNAME or TXT record
4. SSL certificate is automatically provisioned

### For Container App (API Gateway)

```bash
az containerapp hostname add \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname api.fw-data.com

# Bind certificate (if using custom cert)
az containerapp hostname bind \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname api.fw-data.com \
  --certificate $CERTIFICATE_NAME
```

## Monitoring

### Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app fw-admin-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --kind web

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app fw-admin-insights \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)

# Add to Container App
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars "APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=$INSTRUMENTATION_KEY"
```

## Troubleshooting

### View Container Logs

```bash
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --follow
```

### Check Container App Status

```bash
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "{status:properties.runningStatus, replicas:properties.template.scale}"
```

### Common Issues

1. **502 Bad Gateway**: Check if the container is healthy and port 8787 is exposed
2. **Container not starting**: Check logs for startup errors
3. **Environment variables not set**: Verify in Azure Portal → Configuration
4. **CORS errors**: Ensure `CORS_ORIGINS` includes the dashboard URL

## Cost Estimation

| Service | SKU | Estimated Monthly Cost |
|---------|-----|----------------------|
| Static Web Apps | Standard | ~$9/month |
| Container Apps | Consumption | ~$0-50/month (pay per use) |
| Container Registry | Basic | ~$5/month |
| Key Vault | Standard | ~$0.03/10k operations |

**Total estimated cost**: $15-75/month depending on traffic

## Security Checklist

- [ ] API keys stored in Key Vault (not environment variables)
- [ ] Container App uses managed identity for Key Vault access
- [ ] CORS restricted to dashboard domain only
- [ ] HTTPS enforced on all endpoints
- [ ] Rate limiting configured
- [ ] Logs don't contain sensitive data
- [ ] Service principal has minimal required permissions
