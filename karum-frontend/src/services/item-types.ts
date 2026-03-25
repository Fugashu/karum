/**
 * EVE Frontier item type lookup.
 * Loads dynamically from IndexedDB cache (populated by useUniverse).
 * Falls back to type ID string if cache not yet available.
 */

export interface ItemType {
  id: number;
  name: string;
  category: string;
  group: string;
  volume: number;
  mass: number;
}

let typeMap: Map<number, ItemType> = new Map();
let loaded = false;

// Try to load from IndexedDB on module init
function loadFromCache() {
  if (loaded) return;
  loaded = true;

  // Determine which env's cache to read
  let env = "utopia";
  try {
    const stored = localStorage.getItem("karum:environment");
    if (stored === "stillness" || stored === "utopia") env = stored;
  } catch { /* ignore */ }

  try {
    const req = indexedDB.open("karum-cache", 2);
    req.onsuccess = () => {
      try {
        const db = req.result;
        const tx = db.transaction("entries", "readonly");
        const store = tx.objectStore("entries");
        const get = store.get(`karum:universe:${env}`);
        get.onsuccess = () => {
          const entry = get.result;
          if (!entry?.data?.gameTypes) return;

          const map = new Map<number, ItemType>();
          for (const t of entry.data.gameTypes) {
            map.set(t.id, {
              id: t.id,
              name: t.name,
              category: t.categoryName ?? "",
              group: t.groupName ?? "",
              volume: t.volume ?? 0,
              mass: t.mass ?? 0,
            });
          }
          typeMap = map;
        };
      } catch {
        // ignore DB read errors
      }
    };
  } catch {
    // indexedDB not available
  }
}

loadFromCache();

/** Look up an item name by type_id, returns type_id as string if unknown */
export function itemName(typeId: number): string {
  return typeMap.get(typeId)?.name ?? `Type #${typeId}`;
}

/** Look up full item info by type_id */
export function itemInfo(typeId: number): ItemType | undefined {
  return typeMap.get(typeId);
}

/** Manually populate the type map (called by useUniverse after load) */
export function setGameTypes(types: Array<{ id: number; name: string; categoryName?: string; groupName?: string; volume?: number; mass?: number }>) {
  const map = new Map<number, ItemType>();
  for (const t of types) {
    map.set(t.id, {
      id: t.id,
      name: t.name,
      category: t.categoryName ?? "",
      group: t.groupName ?? "",
      volume: t.volume ?? 0,
      mass: t.mass ?? 0,
    });
  }
  typeMap = map;
}
