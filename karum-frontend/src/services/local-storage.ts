interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > DEFAULT_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function setCached<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn("[local-storage] Failed to write cache:", key, e);
  }
}

/**
 * Fetch with localStorage cache. Returns cached data if fresh,
 * otherwise calls fetcher and caches the result.
 */
export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key);
  if (cached) return cached;

  const data = await fetcher();
  setCached(key, data);
  return data;
}
