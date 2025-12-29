import Redis from 'ioredis';

// Create Redis client from URL
// Supports Vercel KV, Upstash, or any Redis-compatible service
const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;

  if (!redisUrl) {
    console.warn('No REDIS_URL configured - caching disabled');
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    return client;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
};

const redis = getRedisClient();

// Cache TTLs in seconds
export const CACHE_TTL = {
  CARD_DATA: 24 * 60 * 60,      // 24 hours - card data rarely changes
  CARD_PRICES: 60 * 60,          // 1 hour - prices update frequently
  COMBO_DATA: 6 * 60 * 60,       // 6 hours - combos change occasionally
  DECK_TEMP: 60 * 60,            // 1 hour - temporary deck storage
  AUTOCOMPLETE: 24 * 60 * 60,    // 24 hours - card names don't change
};

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = CACHE_TTL.CARD_DATA
): Promise<void> {
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

export async function cacheGetOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.CARD_DATA
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const fresh = await fetcher();

  // Store in cache (don't await - fire and forget)
  cacheSet(key, fresh, ttlSeconds);

  return fresh;
}

// Health check for Redis connection
export async function cacheHealthCheck(): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export { redis };
