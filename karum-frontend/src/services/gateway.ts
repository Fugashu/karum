/**
 * EVE Frontier data gateway — fetches live SSU data from Sui GraphQL
 * and reference data from the World API.
 *
 * Architecture note: The old blockchain-gateway REST API is dead.
 * Smart assembly data now lives as Sui objects queried via GraphQL.
 * The World API provides reference data (types, solar systems).
 */

import { config } from "../config";
import { suiGraphql } from "./sui-client";
import type {
  SSUData,
  RawAssemblyJson,
  InventoryItem,
  AssemblyState,
  GameType,
  SolarSystem,
  PaginatedResponse,
} from "../types";

const WORLD_API = config.eve.worldApi;
const WORLD_PKG = config.eve.worldPackageId;

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
// Sui GraphQL — Live Smart Assembly Data
// ============================================================================

/** Parse status variant to our AssemblyState type */
function parseState(variant: string | undefined): AssemblyState {
  if (!variant) return "unknown";
  const v = variant.toLowerCase();
  if (v === "online") return "online";
  if (v === "offline" || v === "anchored") return "anchored";
  if (v === "unanchored") return "unanchored";
  if (v === "destroyed") return "destroyed";
  return "unknown";
}

/** SSU type constant from @evefrontier/dapp-kit */
const SSU_TYPE_SUFFIX = "::storage_unit::StorageUnit";

interface SSUGraphQLNode {
  address: string;
  asMoveObject: {
    contents: {
      json: RawAssemblyJson;
      type: { repr: string };
    };
    dynamicFields: {
      nodes: Array<{
        name: { json: unknown; type: { repr: string } };
        contents: { json: Record<string, unknown> };
      }>;
    };
  } | null;
}

interface SSUListResponse {
  objects: {
    nodes: SSUGraphQLNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

/**
 * Fetch all SSUs from Sui via GraphQL.
 * Paginates through all StorageUnit objects.
 */
export async function fetchAllSSUs(): Promise<SSUData[]> {
  const ssuType = `${WORLD_PKG}${SSU_TYPE_SUFFIX}`;
  const allSSUs: SSUData[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const result: { data?: SSUListResponse; errors?: Array<{ message: string }> } = await suiGraphql<SSUListResponse>(
      `query GetSSUs($type: String, $first: Int, $after: String) {
        objects(filter: { type: $type }, first: $first, after: $after) {
          nodes {
            address
            asMoveObject {
              contents {
                json
                type { repr }
              }
              dynamicFields {
                nodes {
                  name { json type { repr } }
                  contents { json }
                }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { type: ssuType, first: 50, after: cursor },
    );

    if (result.errors?.length) {
      console.error("[gateway] SSU query errors:", result.errors);
      break;
    }

    const nodes = result.data?.objects?.nodes ?? [];
    for (const node of nodes) {
      const parsed = parseSSUNode(node);
      if (parsed) allSSUs.push(parsed);
    }

    hasMore = result.data?.objects?.pageInfo?.hasNextPage ?? false;
    cursor = result.data?.objects?.pageInfo?.endCursor ?? null;
  }

  return allSSUs;
}

/**
 * Fetch a single SSU with owner character and energy source data.
 * Uses the full assembly query from the dapp-kit.
 */
export async function fetchSSU(objectId: string): Promise<SSUData | null> {
  const charOwnerCapType = `${WORLD_PKG}::access::OwnerCap<${WORLD_PKG}::character::Character>`;

  const result = await suiGraphql<{
    object: {
      asMoveObject: {
        contents: {
          json: RawAssemblyJson;
          type: { repr: string };
          extract?: {
            asAddress?: {
              asObject?: {
                asMoveObject?: {
                  owner?: {
                    address?: {
                      objects?: {
                        nodes?: Array<{
                          contents?: {
                            authorizedObj?: {
                              asAddress?: {
                                asObject?: {
                                  asMoveObject?: {
                                    contents?: {
                                      json?: {
                                        id: string;
                                        metadata?: { name: string };
                                        character_address?: string;
                                        tribe_id?: number;
                                      };
                                    };
                                  };
                                };
                              };
                            };
                          };
                        }>;
                      };
                    };
                  };
                };
              };
            };
          };
          energySource?: {
            asAddress?: {
              asObject?: {
                asMoveObject?: {
                  contents?: { json?: RawAssemblyJson };
                };
              };
            };
          };
        };
        dynamicFields?: {
          nodes: Array<{
            name: { json: unknown; type: { repr: string } };
            contents: { json: Record<string, unknown> };
          }>;
        };
      } | null;
    };
  }>(
    `query GetSSUDetail($objectId: SuiAddress!, $charType: String!) {
      object(address: $objectId) {
        asMoveObject {
          contents {
            json
            type { repr }
            extract(path: "owner_cap_id") {
              asAddress {
                asObject {
                  asMoveObject {
                    owner {
                      ... on AddressOwner {
                        address {
                          objects(filter: { type: $charType }, last: 1) {
                            nodes {
                              contents {
                                authorizedObj: extract(path: "authorized_object_id") {
                                  asAddress {
                                    asObject {
                                      asMoveObject {
                                        contents { json }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            energySource: extract(path: "energy_source_id") {
              asAddress {
                asObject {
                  asMoveObject {
                    contents { json }
                  }
                }
              }
            }
          }
          dynamicFields {
            nodes {
              name { json type { repr } }
              contents { json }
            }
          }
        }
      }
    }`,
    { objectId, charType: charOwnerCapType },
  );

  if (result.errors?.length) {
    console.error("[gateway] SSU detail errors:", result.errors);
    return null;
  }

  const moveObj = result.data?.object?.asMoveObject;
  if (!moveObj) return null;

  const raw = moveObj.contents.json;
  const ssu = parseRawSSU(objectId, raw, moveObj.dynamicFields?.nodes ?? []);

  // Resolve owner character
  const charJson =
    moveObj.contents.extract?.asAddress?.asObject?.asMoveObject?.owner?.address
      ?.objects?.nodes?.[0]?.contents?.authorizedObj?.asAddress?.asObject
      ?.asMoveObject?.contents?.json;
  if (charJson) {
    ssu.owner = {
      id: charJson.id,
      name: charJson.metadata?.name ?? "Unknown",
      address: charJson.character_address ?? "",
      tribeId: charJson.tribe_id ?? 0,
    };
  }

  // Resolve energy source (parent network node)
  const energyJson =
    moveObj.contents.energySource?.asAddress?.asObject?.asMoveObject?.contents
      ?.json;
  if (energyJson) {
    const parentState = parseState(energyJson.status?.status?.["@variant"]);
    ssu.isParentNodeOnline = parentState === "online";
    if (energyJson.fuel) {
      ssu.fuel = {
        quantity: parseInt(energyJson.fuel.quantity, 10),
        maxCapacity: parseInt(energyJson.fuel.max_capacity, 10),
        burnRateMs: parseInt(energyJson.fuel.burn_rate_in_ms, 10),
        isBurning: energyJson.fuel.is_burning,
        burnStartTime: parseInt(energyJson.fuel.burn_start_time, 10),
        lastUpdated: parseInt(energyJson.fuel.last_updated, 10),
      };
    }
  }

  return ssu;
}

/**
 * Batch fetch SSU details by ID.
 * Uses Promise.allSettled for resilience.
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

// ============================================================================
// Parsing helpers
// ============================================================================

function parseSSUNode(node: {
  address: string;
  asMoveObject: {
    contents: { json: RawAssemblyJson };
    dynamicFields: {
      nodes: Array<{
        name: { json: unknown; type: { repr: string } };
        contents: { json: Record<string, unknown> };
      }>;
    };
  } | null;
}): SSUData | null {
  if (!node.asMoveObject) return null;
  return parseRawSSU(
    node.address,
    node.asMoveObject.contents.json,
    node.asMoveObject.dynamicFields.nodes,
  );
}

function parseRawSSU(
  objectId: string,
  raw: RawAssemblyJson,
  dynamicFields: Array<{
    name: { json: unknown };
    contents: { json: Record<string, unknown> };
  }>,
): SSUData {
  // Parse inventory from dynamic fields
  const inventoryKey = raw.inventory_keys?.[0];
  let capacity = 0;
  let usedCapacity = 0;
  let items: InventoryItem[] = [];

  if (inventoryKey) {
    for (const df of dynamicFields) {
      const nameJson = df.name.json;
      const nameStr =
        typeof nameJson === "string" ? nameJson : JSON.stringify(nameJson);
      if (nameStr === inventoryKey || nameStr === `"${inventoryKey}"`) {
        const val = df.contents.json as {
          value?: {
            max_capacity?: string;
            used_capacity?: string;
            items?: { contents?: Array<{ key: string; value: unknown }> };
          };
        };
        capacity = parseInt(val.value?.max_capacity ?? "0", 10);
        usedCapacity = parseInt(val.value?.used_capacity ?? "0", 10);
        items =
          val.value?.items?.contents?.map(
            (c) => c.value as InventoryItem,
          ) ?? [];
        break;
      }
    }
  }

  return {
    objectId,
    itemId: parseInt(raw.key?.item_id ?? "0", 10),
    name: raw.metadata?.name ?? "",
    description: raw.metadata?.description ?? "",
    dappUrl: raw.metadata?.url ?? "",
    state: parseState(raw.status?.status?.["@variant"]),
    typeId: parseInt(raw.type_id ?? "0", 10),
    locationHash: raw.location?.location_hash ?? "",
    energySourceId: raw.energy_source_id,
    inventory: { capacity, usedCapacity, items },
  };
}
