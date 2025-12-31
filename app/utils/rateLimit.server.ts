// app/utils/rateLimit.server.ts
// Rate limiting to prevent API abuse and DoS attacks

const RATE_LIMITS = {
  'blog-generation': { max: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  'research-topics': { max: 2, windowMs: 24 * 60 * 60 * 1000 }, // 2 per day
} as const;

interface RateLimit {
  shop: string;
  action: keyof typeof RATE_LIMITS;
  count: number;
  resetAt: Date;
}

// Store in-memory (for small scale; upgrade to Redis for production)
const rateLimitStore = new Map<string, RateLimit>();

export async function rateLimitCheck(
  shop: string,
  action: keyof typeof RATE_LIMITS
): Promise<string | null> {
  const key = `${shop}:${action}`;
  const limit = RATE_LIMITS[action];
  const now = new Date();

  let record = rateLimitStore.get(key);

  // Check if window has expired
  if (!record || record.resetAt < now) {
    record = {
      shop,
      action,
      count: 0,
      resetAt: new Date(now.getTime() + limit.windowMs),
    };
  }

  // Increment counter
  record.count++;

  // Check if exceeded
  if (record.count > limit.max) {
    const resetDate = Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000);
    return `Rate limit exceeded. Try again in ${resetDate} seconds.`;
  }

  // Save updated record
  rateLimitStore.set(key, record);

  return null;
}

// Clean up old records (run periodically)
export function cleanupRateLimits() {
  const now = new Date();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 60 * 60 * 1000);
}
