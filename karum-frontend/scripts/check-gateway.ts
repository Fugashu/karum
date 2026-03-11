/**
 * Phase 0: EVE Frontier API Discovery Script
 *
 * Maps all available data sources for Karum:
 *   1. World API (REST) — universe reference data (types, solar systems, ships, tribes)
 *   2. Sui GraphQL — live smart assembly data (SSUs, inventory, fuel, state)
 *
 * Run: npx tsx scripts/check-gateway.ts
 */

const WORLD_API = "https://world-api-stillness.live.tech.evefrontier.com";
const SUI_GRAPHQL = "https://graphql.testnet.sui.io/graphql";

// Stillness tenant config (from @evefrontier/dapp-kit v0.1.7)
const STILLNESS_PACKAGE_ID =
  "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c";

// ============================================================================
// Helpers
// ============================================================================

async function fetchJson(url: string): Promise<{ status: number; data: any }> {
  const res = await fetch(url);
  const data = await res.json();
  return { status: res.status, data };
}

async function gql<T = any>(
  query: string,
  variables: Record<string, unknown>,
): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
  const res = await fetch(SUI_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

function printJson(obj: any, maxLen = 3000): void {
  const str = JSON.stringify(obj, null, 2);
  console.log(str.length > maxLen ? str.slice(0, maxLen) + "\n  ... (truncated)" : str);
}

function divider(title: string): void {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(70)}\n`);
}

// ============================================================================
// 1. World API Discovery
// ============================================================================

async function discoverWorldApi() {
  divider("WORLD API — REST Endpoints");
  console.log(`Base: ${WORLD_API}\n`);

  // Health check
  console.log("--- GET /health ---");
  try {
    const { status, data } = await fetchJson(`${WORLD_API}/health`);
    console.log(`Status: ${status}  Response:`, data);
  } catch (e) {
    console.log(`ERROR: ${e}`);
  }

  // Endpoint scan
  const endpoints = [
    { path: "/v2/types", label: "Game types (resources, modules, etc.)" },
    { path: "/v2/solarsystems", label: "Solar systems" },
    { path: "/v2/constellations", label: "Constellations" },
    { path: "/v2/ships", label: "Ships" },
    { path: "/v2/tribes", label: "Tribes" },
    { path: "/config", label: "Service config" },
  ];

  console.log("\n--- Endpoint Scan ---");
  for (const ep of endpoints) {
    try {
      const { status, data } = await fetchJson(`${WORLD_API}${ep.path}?limit=1`);
      const total = data?.metadata?.total ?? "N/A";
      console.log(`GET ${ep.path.padEnd(22)} → ${status}  total: ${total}  (${ep.label})`);
    } catch (e) {
      console.log(`GET ${ep.path.padEnd(22)} → ERROR: ${e}`);
    }
  }

  // Sample: types (resources we care about)
  console.log("\n--- Sample: /v2/types?limit=5 ---");
  try {
    const { data } = await fetchJson(`${WORLD_API}/v2/types?limit=5`);
    console.log(`Total types: ${data.metadata.total}`);
    console.log("First item shape:");
    printJson(data.data[0]);
  } catch (e) {
    console.log(`ERROR: ${e}`);
  }

  // Sample: solar systems
  console.log("\n--- Sample: /v2/solarsystems?limit=2 ---");
  try {
    const { data } = await fetchJson(`${WORLD_API}/v2/solarsystems?limit=2`);
    console.log(`Total solar systems: ${data.metadata.total}`);
    console.log("First item shape:");
    printJson(data.data[0]);
  } catch (e) {
    console.log(`ERROR: ${e}`);
  }

  // Sample: single solar system detail
  console.log("\n--- Sample: /v2/solarsystems/30000001 ---");
  try {
    const { data } = await fetchJson(`${WORLD_API}/v2/solarsystems/30000001`);
    console.log("Detail shape:");
    printJson(data);
  } catch (e) {
    console.log(`ERROR: ${e}`);
  }

  // Sample: tribes
  console.log("\n--- Sample: /v2/tribes?limit=3 ---");
  try {
    const { data } = await fetchJson(`${WORLD_API}/v2/tribes?limit=3`);
    console.log(`Total tribes: ${data.metadata.total}`);
    printJson(data.data.slice(0, 3));
  } catch (e) {
    console.log(`ERROR: ${e}`);
  }

  // Check old blockchain-gateway (expected dead)
  console.log("\n--- Old blockchain-gateway-stillness (expected DEAD) ---");
  try {
    const res = await fetch(
      "https://blockchain-gateway-stillness.live.tech.evefrontier.com/health",
      { signal: AbortSignal.timeout(5000) },
    );
    console.log(`Status: ${res.status} (UNEXPECTED — should be dead!)`);
  } catch (e: any) {
    console.log(`Confirmed dead: ${e.cause?.code || e.message}`);
  }
}

// ============================================================================
// 2. Sui GraphQL Discovery — Smart Assemblies
// ============================================================================

async function discoverSuiGraphql() {
  divider("SUI GRAPHQL — Smart Assembly Data");
  console.log(`Endpoint: ${SUI_GRAPHQL}`);
  console.log(`Package:  ${STILLNESS_PACKAGE_ID}\n`);

  // 2a. Find the ObjectRegistry singleton
  console.log("--- Find ObjectRegistry singleton ---");
  const registryType = `${STILLNESS_PACKAGE_ID}::object_registry::ObjectRegistry`;
  const registryResult = await gql(
    `query GetRegistry($type: String) {
      objects(filter: { type: $type }, first: 1) {
        nodes { address }
      }
    }`,
    { type: registryType },
  );

  if (registryResult.errors?.length) {
    console.log("GraphQL errors:", registryResult.errors);
  }

  const registryAddress =
    registryResult.data?.objects?.nodes?.[0]?.address ?? null;
  console.log(`ObjectRegistry address: ${registryAddress || "NOT FOUND"}`);

  // 2b. Find SSU objects by type
  console.log("\n--- Find SmartStorageUnit objects ---");
  const ssuType = `${STILLNESS_PACKAGE_ID}::storage_unit::StorageUnit`;
  const ssuResult = await gql<any>(
    `query GetSSUs($type: String, $first: Int) {
      objects(filter: { type: $type }, first: $first) {
        nodes {
          address
          version
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
    { type: ssuType, first: 5 },
  );

  if (ssuResult.errors?.length) {
    console.log("GraphQL errors:", ssuResult.errors);
  }

  const ssuNodes = ssuResult.data?.objects?.nodes ?? [];
  console.log(`SSU objects found: ${ssuNodes.length}`);
  console.log(`Has more pages: ${ssuResult.data?.objects?.pageInfo?.hasNextPage ?? "N/A"}`);

  if (ssuNodes.length > 0) {
    console.log("\nFirst SSU — full object shape:");
    printJson(ssuNodes[0], 5000);

    // Extract key fields from the JSON contents
    const json = ssuNodes[0].asMoveObject?.contents?.json;
    if (json) {
      console.log("\n--- SSU JSON contents keys ---");
      console.log(Object.keys(json).join(", "));
      console.log("\n--- SSU status ---");
      console.log("status:", JSON.stringify(json.status));
      console.log("metadata:", JSON.stringify(json.metadata));
      console.log("location:", JSON.stringify(json.location));
      console.log("inventory_keys:", JSON.stringify(json.inventory_keys));
      console.log("energy_source_id:", json.energy_source_id);
      console.log("owner_cap_id:", json.owner_cap_id);
      console.log("type_id:", json.type_id);
    }

    // Dynamic fields (inventory etc.)
    const dynFields = ssuNodes[0].asMoveObject?.dynamicFields?.nodes ?? [];
    console.log(`\n--- Dynamic fields (${dynFields.length}) ---`);
    for (const df of dynFields) {
      console.log(`  name: ${JSON.stringify(df.name.json)} (type: ${df.name.type?.repr})`);
      const val = JSON.stringify(df.contents.json);
      console.log(`  value: ${val.slice(0, 500)}${val.length > 500 ? "..." : ""}`);
      console.log();
    }
  }

  // 2c. Try other assembly types
  console.log("--- Count all assembly types ---");
  const assemblyTypes = [
    { label: "SmartStorageUnit", suffix: "storage_unit::StorageUnit" },
    { label: "SmartTurret", suffix: "turret::Turret" },
    { label: "SmartGate", suffix: "gate::Gate" },
    { label: "NetworkNode", suffix: "network_node::NetworkNode" },
    { label: "Manufacturing", suffix: "manufacturing::Manufacturing" },
    { label: "Refinery", suffix: "refinery::Refinery" },
  ];

  for (const at of assemblyTypes) {
    const type = `${STILLNESS_PACKAGE_ID}::${at.suffix}`;
    const result = await gql<any>(
      `query Count($type: String) {
        objects(filter: { type: $type }, first: 1) {
          nodes { address }
          pageInfo { hasNextPage }
        }
      }`,
      { type },
    );
    const count = result.data?.objects?.nodes?.length ?? 0;
    const hasMore = result.data?.objects?.pageInfo?.hasNextPage ?? false;
    console.log(`${at.label.padEnd(22)} → found: ${count}${hasMore ? "+" : ""}`);
  }

  // 2d. Get an SSU with owner character (the full query the dapp-kit uses)
  if (ssuNodes.length > 0) {
    const ssuAddress = ssuNodes[0].address;
    console.log(`\n--- Fetch SSU with owner: ${ssuAddress} ---`);
    const charOwnerCapType = `${STILLNESS_PACKAGE_ID}::access::OwnerCap<${STILLNESS_PACKAGE_ID}::character::Character>`;

    const detailResult = await gql<any>(
      `query GetSSUDetail($objectId: SuiAddress!, $characterOwnerType: String!) {
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
                            objects(filter: { type: $characterOwnerType }, last: 1) {
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
                contents {
                  json
                  extract(path: "id") {
                    asAddress {
                      asObject {
                        asMoveObject {
                          contents { json }
                        }
                      }
                    }
                  }
                }
                name { json type { repr } }
              }
            }
          }
        }
      }`,
      { objectId: ssuAddress, characterOwnerType: charOwnerCapType },
    );

    if (detailResult.errors?.length) {
      console.log("GraphQL errors:", detailResult.errors);
    }

    const detailObj = detailResult.data?.object?.asMoveObject;
    if (detailObj) {
      console.log("SSU detail — contents.json:");
      printJson(detailObj.contents.json);

      // Energy source (network node providing power)
      const energyJson =
        detailObj.contents.energySource?.asAddress?.asObject?.asMoveObject
          ?.contents?.json;
      if (energyJson) {
        console.log("\nEnergy source (Network Node):");
        printJson(energyJson);
      } else {
        console.log("\nEnergy source: not linked or not found");
      }

      // Owner character
      const charJson =
        detailObj.contents.extract?.asAddress?.asObject?.asMoveObject?.owner
          ?.address?.objects?.nodes?.[0]?.contents?.authorizedObj?.asAddress
          ?.asObject?.asMoveObject?.contents?.json;
      if (charJson) {
        console.log("\nOwner character:");
        printJson(charJson);
      } else {
        console.log("\nOwner character: not resolved (may need different query path)");
      }

      // Dynamic fields (inventory)
      const dfs = detailObj.dynamicFields?.nodes ?? [];
      console.log(`\nDynamic fields with nested resolve: ${dfs.length}`);
      for (const df of dfs.slice(0, 3)) {
        console.log(`  name: ${JSON.stringify(df.name.json)}`);
        printJson(df.contents.json);
      }
    } else {
      console.log("SSU detail: object not found");
    }
  }
}

// ============================================================================
// 3. Datahub API (type info enrichment)
// ============================================================================

async function discoverDatahub() {
  divider("DATAHUB API — Game Type Info");
  const DATAHUB = "world-api-stillness.live.tech.evefrontier.com";

  // Fetch SSU type info
  const SSU_TYPE_ID = 77917;
  console.log(`--- GET /v2/types/${SSU_TYPE_ID} (SmartStorageUnit) ---`);
  try {
    const { data } = await fetchJson(`https://${DATAHUB}/v2/types/${SSU_TYPE_ID}`);
    printJson(data);
  } catch (e) {
    console.log(`ERROR: ${e}`);
  }

  // Fetch a resource type
  console.log("\n--- GET /v2/types/77728 (Sophrogon — mineral) ---");
  try {
    const { data } = await fetchJson(`https://${DATAHUB}/v2/types/77728`);
    printJson(data);
  } catch (e) {
    console.log(`ERROR: ${e}`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║     KARUM — Phase 0: EVE Frontier API Discovery                     ║");
  console.log("║     Date: " + new Date().toISOString().padEnd(59) + "║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");

  await discoverWorldApi();
  await discoverSuiGraphql();
  await discoverDatahub();

  divider("SUMMARY");
  console.log(`
DATA SOURCES FOR KARUM:

1. WORLD API (REST) — Universe reference data
   Base: ${WORLD_API}
   • /v2/types          — 390 game item types (resources, modules, etc.)
   • /v2/solarsystems   — 24,502 solar systems with coordinates
   • /v2/constellations — 2,279 constellations
   • /v2/ships          — 11 ship types
   • /v2/tribes         — player tribes
   Pagination: ?limit=N&offset=N (max 1000)

2. SUI GRAPHQL — Live smart assembly data (SSUs, inventory, state)
   Endpoint: ${SUI_GRAPHQL}
   Package:  ${STILLNESS_PACKAGE_ID}
   • Query by type to find all SSUs/assemblies
   • Each SSU has: id, type_id, metadata (name, desc, url), status (online/offline),
     location, inventory_keys, energy_source_id, owner_cap_id
   • Dynamic fields contain inventory data (items, capacity)
   • Owner chain: owner_cap_id → OwnerCap → Character
   • Energy source: energy_source_id → NetworkNode (fuel, energy production)

3. DATAHUB (same host as World API) — Type enrichment
   • /v2/types/{typeId} — name, description, icon, mass, volume, category

OLD blockchain-gateway-stillness.live.tech.evefrontier.com is DEAD (NXDOMAIN).
Smart assembly data moved to Sui on-chain objects queried via GraphQL.
  `);
}

main().catch(console.error);
