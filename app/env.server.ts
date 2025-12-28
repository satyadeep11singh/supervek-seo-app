// app/env.server.ts
// Validate all required environment variables at startup

const requiredEnvVars = [
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'SHOPIFY_APP_URL',
  'GEMINI_API_KEY',
  'DATABASE_URL',
  'SHOPIFY_API_SCOPE',
] as const;

type EnvVar = typeof requiredEnvVars[number];

function validateEnv() {
  const missing: EnvVar[] = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Check your .env file or Railway environment variables configuration.`
    );
  }
}

// Validate on startup in production
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}

export const env = {
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY!,
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET!,
  SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL!,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  DATABASE_URL: process.env.DATABASE_URL!,
  SHOPIFY_API_SCOPE: process.env.SHOPIFY_API_SCOPE!,
  SHOP_CUSTOM_DOMAIN: process.env.SHOP_CUSTOM_DOMAIN,
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;
