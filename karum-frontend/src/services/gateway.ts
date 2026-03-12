/**
 * EVE Frontier data gateway — fetches live SSU data from Sui JSON-RPC
 * and reference data from the World API.
 *
 * Architecture: SSUs are Sui shared objects. We read them directly via
 * suiClient.getObject(), then follow references to get fuel (from the
 * parent NetworkNode) and inventory items.
 *
 * The old blockchain-gateway REST API and the /v2/smartassemblies endpoint
 * are both dead. Direct Sui RPC is the only path to live SSU data.
 */

import { config } from "../config";
import { suiClient } from "./sui-client";
import type {
  SSUData,
  AssemblyState,
  GameType,
  SolarSystem,
  PaginatedResponse,
} from "../types";

const WORLD_API = config.eve.worldApi;

// ============================================================================
// World API — Reference Data (REST)
// ============================================================================

/** Fetch all game types (resources, modules, deployables). Cached by React Query. */
export async function fetchGameTypes(
  limit = 1000,
  offset = 0,
): Promise<PaginatedResponse<GameType>> {
  const res = await fetch(
    `${WORLD_API}/v2/types?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) throw new Error(`World API /v2/types: ${res.status}`);
  return res.json();
}

/** Fetch a single game type by ID. */
export async function fetchGameType(typeId: number): Promise<GameType> {
  const res = await fetch(`${WORLD_API}/v2/types/${typeId}`);
  if (!res.ok) throw new Error(`World API /v2/types/${typeId}: ${res.status}`);
  return res.json();
}

/** Fetch solar systems. */
export async function fetchSolarSystems(
  limit = 1000,
  offset = 0,
): Promise<PaginatedResponse<SolarSystem>> {
  const res = await fetch(
    `${WORLD_API}/v2/solarsystems?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) throw new Error(`World API /v2/solarsystems: ${res.status}`);
  return res.json();
}

/** Fetch a single solar system by ID. */
export async function fetchSolarSystem(id: number): Promise<SolarSystem> {
  const res = await fetch(`${WORLD_API}/v2/solarsystems/${id}`);
  if (!res.ok)
    throw new Error(`World API /v2/solarsystems/${id}: ${res.status}`);
  return res.json();
}

// ============================================================================
// Sui JSON-RPC — Live SSU Data
// ============================================================================

/** Parse status variant string to our AssemblyState type */
function parseState(variant: string | undefined): AssemblyState {
  if (!variant) return "unknown";
  const v = variant.toUpperCase();
  if (v === "ONLINE") return "online";
  if (v === "OFFLINE" || v === "ANCHORED") return "anchored";
  if (v === "UNANCHORED") return "unanchored";
  if (v === "DESTROYED") return "destroyed";
  return "unknown";
}

/**
 * Unwrap a Move struct value from Sui JSON-RPC response.
 * Nested structs come as { type: "0x...::module::Type", fields: { ... } }
 */
function unwrap(val: unknown): Record<string, unknown> {
  if (val && typeof val === "object" && "fields" in val) {
    return (val as { fields: Record<string, unknown> }).fields;
  }
  return (val as Record<string, unknown>) ?? {};
}

/**
 * Fetch a single SSU's live data from Sui.
 *
 * Reads the StorageUnit object, then follows energy_source_id
 * to the NetworkNode for fuel data. Inventory items are read
 * from dynamic fields on the SSU.
 */
export async function fetchSSU(objectId: string): Promise<SSUData | null> {
  try {
    // 1. Get the StorageUnit object
    const ssuObj = await suiClient.getObject({
      id: objectId,
      options: { showContent: true, showOwner: true, showType: true },
    });

    if (!ssuObj.data?.content || ssuObj.data.content.dataType !== "moveObject") {
      console.warn("[gateway] SSU not found or not a Move object:", objectId);
      return null;
    }

    const fields = ssuObj.data.content.fields as Record<string, unknown>;
    const metadata = unwrap(fields.metadata);
    const status = unwrap(fields.status);
    const key = unwrap(fields.key);
    const location = unwrap(fields.location);

    // Status enum: { type: "...::Status", variant: "ONLINE", fields: {} }
    // variant is a sibling of fields, NOT inside fields — don't unwrap
    const statusEnum = status.status as Record<string, unknown> | undefined;
    const stateVariant =
      (statusEnum?.variant as string) ??
      (statusEnum?.["@variant"] as string | undefined);

    const ssu: SSUData = {
      objectId,
      itemId: parseInt(String(key.item_id ?? "0"), 10),
      name: String(metadata.name ?? ""),
      description: String(metadata.description ?? ""),
      dappUrl: String(metadata.url ?? ""),
      state: parseState(stateVariant),
      typeId: parseInt(String(fields.type_id ?? "0"), 10),
      locationHash: Array.isArray(location.location_hash)
        ? location.location_hash.map((b: number) => b.toString(16).padStart(2, "0")).join("")
        : String(location.location_hash ?? ""),
      energySourceId: fields.energy_source_id as string | undefined,
      inventory: { capacity: 0, usedCapacity: 0, items: [] },
    };

    // 2. Follow energy_source_id to get fuel from NetworkNode
    if (ssu.energySourceId) {
      try {
        const nodeObj = await suiClient.getObject({
          id: ssu.energySourceId,
          options: { showContent: true },
        });

        if (nodeObj.data?.content?.dataType === "moveObject") {
          const nodeFields = nodeObj.data.content.fields as Record<string, unknown>;
          const fuel = unwrap(nodeFields.fuel);
          const energy = unwrap(nodeFields.energy_source);

          ssu.fuel = {
            quantity: parseInt(String(fuel.quantity ?? "0"), 10),
            maxCapacity: parseInt(String(fuel.max_capacity ?? "0"), 10),
            burnRateMs: parseInt(String(fuel.burn_rate_in_ms ?? "0"), 10),
            isBurning: fuel.is_burning === true,
            burnStartTime: parseInt(String(fuel.burn_start_time ?? "0"), 10),
            lastUpdated: parseInt(String(fuel.last_updated ?? "0"), 10),
          };

          // Check if parent node has online assemblies connected
          const energyProd = parseInt(String(energy.current_energy_production ?? "0"), 10);
          ssu.isParentNodeOnline = energyProd > 0 || ssu.fuel.isBurning;
        }
      } catch (e) {
        console.warn("[gateway] Failed to fetch energy source:", ssu.energySourceId, e);
      }
    }

    // 3. Read the OWNER's main inventory from dynamic fields on the SSU.
    //    The main inventory is keyed by the SSU's owner_cap_id (type 0x2::object::ID).
    //    We only read this one — buyer-owned inventories are separate slots
    //    that should NOT count toward "in stock" numbers.
    const ownerCapId = fields.owner_cap_id as string | undefined;
    try {
      const dynFields = await suiClient.getDynamicFields({
        parentId: objectId,
        limit: 50,
      });

      for (const df of dynFields.data) {
        if (!df.objectType?.includes("::inventory::Inventory")) continue;

        // Only read the owner's main inventory (keyed by owner_cap_id)
        if (ownerCapId) {
          const dfKey = df.name?.value;
          if (dfKey && dfKey !== ownerCapId) continue;
        }

        try {
          const dfObj = await suiClient.getObject({
            id: df.objectId,
            options: { showContent: true },
          });

          if (dfObj.data?.content?.dataType !== "moveObject") continue;
          const dfFields = dfObj.data.content.fields as Record<string, unknown>;
          const invValue = unwrap(dfFields.value);

          // Capacity
          if (invValue.max_capacity !== undefined) {
            ssu.inventory.capacity += parseInt(String(invValue.max_capacity), 10);
          }
          if (invValue.used_capacity !== undefined) {
            ssu.inventory.usedCapacity += parseInt(String(invValue.used_capacity), 10);
          }

          // Items: VecMap<u64, ItemEntry> → { contents: [{ key, value: ItemEntry }] }
          const itemsMap = unwrap(invValue.items);
          const contents = (itemsMap.contents ?? []) as Array<unknown>;

          for (const entry of contents) {
            const entryFields = unwrap(entry);
            const itemEntry = unwrap(entryFields.value);

            ssu.inventory.items.push({
              id: String(itemEntry.item_id ?? ""),
              item_id: String(itemEntry.item_id ?? ""),
              location: { location_hash: ssu.locationHash },
              quantity: parseInt(String(itemEntry.quantity ?? "0"), 10),
              tenant: String(itemEntry.tenant ?? ""),
              type_id: parseInt(String(itemEntry.type_id ?? "0"), 10),
              name: "", // resolved later via World API type lookup
            });
          }

          // Only need the one main inventory
          if (ownerCapId) break;
        } catch {
          // Skip unreadable inventory fields
        }
      }
    } catch {
      // No dynamic fields accessible
    }

    return ssu;
  } catch (e) {
    console.error("[gateway] Failed to fetch SSU:", objectId, e);
    return null;
  }
}

/**
 * Batch fetch SSU details by object ID.
 * Uses Promise.allSettled for resilience — one failure doesn't block others.
 */
export async function fetchSSUBatch(
  objectIds: string[],
): Promise<Map<string, SSUData>> {
  const results = await Promise.allSettled(objectIds.map(fetchSSU));
  const map = new Map<string, SSUData>();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value) {
      map.set(objectIds[i], r.value);
    }
  }
  return map;
}
