# Railway Deployment Guide

## Overview

This guide explains how to deploy the Supervek SEO App to Railway.app.

## Prerequisites

1. Railway.app account created
2. GitHub repository with the code
3. Required API keys and credentials:
   - Shopify API Key & Secret
   - Google Gemini API Key
   - PostgreSQL database connection string (from Railway)

## Deployment Steps

### 1. Connect Repository to Railway

1. Log in to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository: `supervek-seo-app`
4. Click "Deploy"

### 2. Configure Environment Variables

After deployment starts, configure the following environment variables in the Railway dashboard:

**Navigate to**: Project Settings → Variables

Add these environment variables:

| Variable | Value | Source |
|----------|-------|--------|
| `NODE_ENV` | `production` | Manual |
| `SHOPIFY_API_KEY` | Your Shopify API Key | Shopify Partner Dashboard |
| `SHOPIFY_API_SECRET` | Your Shopify API Secret | Shopify Partner Dashboard |
| `SHOPIFY_APP_URL` | `https://supervek-seo-app-production.up.railway.app` | Railway Dashboard |
| `SHOPIFY_API_SCOPE` | `write_products,write_content,read_content` | Manual (from shopify.app.toml) |
| `GEMINI_API_KEY` | Your Google Gemini API Key | Google AI Studio |
| `DATABASE_URL` | Automatically generated | Railway PostgreSQL plugin |

### 3. Add PostgreSQL Database

1. In your Railway project, click "Add"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically set the `DATABASE_URL` environment variable

### 4. Set Shopify Configuration

The following values from `shopify.app.toml` are already configured:
- **client_id**: `07ab69ee83fd5371870f61a6bad717ff`
- **scopes**: `write_products,write_content,read_content` (set as `SCOPES` env var)
- **webhooks**: Configured for app/uninstalled and app/scopes_update
- **redirect_url**: `https://supervek-seo-app-production.up.railway.app/auth/callback`

### 5. Deploy

Once all environment variables are configured:
1. Click "Deploy" in the Railway dashboard
2. Monitor the deployment logs for any errors
3. Verify the application starts successfully

## Troubleshooting

### Error: "Missing required environment variables: SHOPIFY_API_SCOPE"

**Cause**: Environment variables not set in Railway dashboard

**Solution**: Go to Railway dashboard → Project Variables and add all required environment variables listed above.

### Error: "Prisma migration failed"

**Cause**: Database not initialized or migrations not run

**Solution**: 
1. Check that `DATABASE_URL` is set correctly
2. The app includes automatic migration scripts that run on startup:
   ```
   npm run docker-start → npm run migrate-and-start → 
   → npm run resolve-migrations (marks old migrations) 
   → npm run setup (prisma generate) 
   → npm run migrate (prisma migrate deploy)
   → npm run start (react-router-serve)
   ```

### Application won't start

**Steps to debug**:
1. Check Railway deployment logs in dashboard
2. Verify all environment variables are set (see step 2 above)
3. Verify DATABASE_URL points to a PostgreSQL database
4. Confirm SHOPIFY_API_SCOPE environment variable is set to: `write_products,write_content,read_content`

## Local Development

For local development, create a `.env` file with values from `.env.example`:

```bash
cp .env.example .env
# Then edit .env with your local development values
```

## Key Files

- `Dockerfile` - Container configuration
- `.env.example` - Environment variable template
- `shopify.app.toml` - Shopify app configuration
- `package.json` - npm scripts for database migrations
- `prisma/schema.prisma` - Database schema

## Support

For issues:
1. Check Railway deployment logs
2. Review the error messages in the logs
3. Ensure all environment variables match the template in `.env.example`
4. Verify Shopify Partner Dashboard configuration
