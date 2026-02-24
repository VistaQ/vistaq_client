/**
 * Client-side cache utility using localStorage
 * Reduces API calls by caching responses with TTL (Time To Live)
 * Uses user-specific cache keys to prevent cross-contamination
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId: string; // Track which user this cache belongs to
}

/**
 * Get cached data if it exists, is not stale, and belongs to the current user
 */
export function getCache<T>(key: string, currentUserId: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if cache belongs to a different user
    if (entry.userId !== currentUserId) {
      localStorage.removeItem(key);
      return null;
    }

    // Check if cache is stale
    if (age > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Set cache data with current timestamp and user ID
 */
export function setCache<T>(key: string, data: T, userId: string): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      userId
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

/**
 * Invalidate (remove) cached data
 */
export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

/**
 * Invalidate all cache entries for a specific user
 */
export function invalidateUserCache(userId: string): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry = JSON.parse(cached);
            if (entry.userId === userId) {
              localStorage.removeItem(key);
            }
          }
        } catch (_e) {
          // Skip invalid entries
        }
      }
    });
  } catch (error) {
    console.error('User cache invalidation error:', error);
  }
}

/**
 * Clear all cache entries (for logout)
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Clear all cache error:', error);
  }
}

/**
 * Build a user-specific cache key
 */
export function buildCacheKey(userId: string, resource: string): string {
  return `cache_${userId}_${resource}`;
}
