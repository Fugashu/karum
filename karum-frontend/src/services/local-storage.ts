interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const DB_NAME = "karum-cache";
const STORE_NAME = "entries";
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry<T> | undefined;
        if (!entry) return resolve(null);
        if (Date.now() - entry.timestamp > DEFAULT_TTL_MS) {
          // expired — clean up async
          idbDelete(key);
          return resolve(null);
        }
        resolve(entry.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet<T>(key: string, data: T): Promise<void> {
  try {
    const db = await openDB();
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry, key);
  } catch (e) {
    console.warn("[local-storage] Failed to write cache:", key, e);
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
  } catch {
    // ignore
  }
}

export interface CachedFetchResult<T> {
  data: T;
  fromCache: boolean;
}

/**
 * Fetch with IndexedDB cache. Returns cached data if fresh and valid,
 * otherwise calls fetcher and caches the result.
 * Optional `validate` — if it returns false, cached data is discarded.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  validate?: (data: T) => boolean,
): Promise<CachedFetchResult<T>> {
  const cached = await idbGet<T>(key);
  if (cached && (!validate || validate(cached))) {
    return { data: cached, fromCache: true };
  }

  const data = await fetcher();
  await idbSet(key, data);
  return { data, fromCache: false };
}
