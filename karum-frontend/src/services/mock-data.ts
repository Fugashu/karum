/**
 * Realistic mock data for development and API-down fallback.
 * Shapes match real Sui GraphQL + World API responses exactly.
 */

import type { ShopListing, SSUData, MergedShop, GameType, SolarSystem } from "../types";

// ============================================================================
// Mock Solar Systems
// ============================================================================

export const MOCK_SOLAR_SYSTEMS: SolarSystem[] = [
  { id: 30000001, name: "Angelice", constellationId: 20000001, regionId: 10000001, location: { x: -5103797186450162000, y: -442889159183433700, z: 1335601100954271700 } },
  { id: 30000002, name: "Serpentis", constellationId: 20000002, regionId: 10000002, location: { x: -11002921710805582000, y: -174975576069636100, z: -6580585888332382000 } },
  { id: 30000003, name: "Askur", constellationId: 20000003, regionId: 10000003, location: { x: -17415653955018424000, y: -684175370991173600, z: -2373760117339324400 } },
  { id: 30000010, name: "Phoenix Prime", constellationId: 20000001, regionId: 10000001, location: { x: -4200000000000000000, y: -300000000000000000, z: 1100000000000000000 } },
  { id: 30000015, name: "Nebula's Edge", constellationId: 20000005, regionId: 10000005, location: { x: -8500000000000000000, y: -500000000000000000, z: -3200000000000000000 } },
];

// ============================================================================
// Mock Game Types (resources)
// ============================================================================

export const MOCK_GAME_TYPES: GameType[] = [
  { id: 77728, name: "Sophrogon", description: "", mass: 1000, radius: 1, volume: 1, portionSize: 10000, groupName: "Mineral", groupId: 0, categoryName: "Material", categoryId: 4, iconUrl: "" },
  { id: 77729, name: "Rough Old Crude Matter", description: "Raw crude matter from rift extraction.", mass: 1100, radius: 1, volume: 1, portionSize: 10000, groupName: "Rift", groupId: 0, categoryName: "Asteroid", categoryId: 25, iconUrl: "" },
  { id: 77800, name: "Common Ore", description: "Standard asteroid ore.", mass: 500, radius: 1, volume: 1, portionSize: 5000, groupName: "Ore", groupId: 0, categoryName: "Asteroid", categoryId: 25, iconUrl: "" },
  { id: 77810, name: "Metal Rich Ore", description: "Dense metallic ore.", mass: 800, radius: 1, volume: 1, portionSize: 5000, groupName: "Ore", groupId: 0, categoryName: "Asteroid", categoryId: 25, iconUrl: "" },
  { id: 77518, name: "Lens 3X", description: "For use with Crude Extractors only.", mass: 38020, radius: 1, volume: 10, portionSize: 1, groupName: "Crude Mining Lens", groupId: 0, categoryName: "Charge", categoryId: 8, iconUrl: "" },
  { id: 72244, name: "Feral Data", description: "", mass: 0.1, radius: 1, volume: 0.1, portionSize: 1, groupName: "Rogue Drone Analysis Data", groupId: 0, categoryName: "Commodity", categoryId: 17, iconUrl: "" },
];

// ============================================================================
// Mock Shop Listings (our registry)
// ============================================================================

const now = Date.now();

export const MOCK_SHOP_LISTINGS: ShopListing[] = [
  {
    ssu_id: "0xaaa1111111111111111111111111111111111111111111111111111111111111",
    owner: "0xowner1111111111111111111111111111111111111111111111111111111111",
    name: "Angelice Fuel Depot",
    description: "Full-service fuel and ore depot. Fair prices, always stocked.",
    solar_system: "Angelice",
    offers: [
      { resource_name: "Sophrogon", resource_type_id: 77728, price_per_unit: 210, min_quantity: 100 },
      { resource_name: "Rough Old Crude Matter", resource_type_id: 77729, price_per_unit: 150, min_quantity: 50 },
    ],
    registered_at: now - 86400000 * 3,
    last_updated: now - 3600000,
    is_active: true,
  },
  {
    ssu_id: "0xbbb2222222222222222222222222222222222222222222222222222222222222",
    owner: "0xowner2222222222222222222222222222222222222222222222222222222222",
    name: "Serpentis Mining Exchange",
    description: "Ore refinery and trading post. Bulk discounts available.",
    solar_system: "Serpentis",
    offers: [
      { resource_name: "Common Ore", resource_type_id: 77800, price_per_unit: 85, min_quantity: 500 },
      { resource_name: "Metal Rich Ore", resource_type_id: 77810, price_per_unit: 340, min_quantity: 200 },
      { resource_name: "Lens 3X", resource_type_id: 77518, price_per_unit: 1200, min_quantity: 1 },
    ],
    registered_at: now - 86400000 * 5,
    last_updated: now - 7200000,
    is_active: true,
  },
  {
    ssu_id: "0xccc3333333333333333333333333333333333333333333333333333333333333",
    owner: "0xowner3333333333333333333333333333333333333333333333333333333333",
    name: "Askur Outpost Gamma",
    description: "Remote outpost with rare commodities.",
    solar_system: "Askur",
    offers: [
      { resource_name: "Feral Data", resource_type_id: 72244, price_per_unit: 5000, min_quantity: 10 },
    ],
    registered_at: now - 86400000 * 1,
    last_updated: now - 1800000,
    is_active: true,
  },
  {
    ssu_id: "0xddd4444444444444444444444444444444444444444444444444444444444444",
    owner: "0xowner4444444444444444444444444444444444444444444444444444444444",
    name: "Phoenix Refuel Station",
    description: "Emergency refueling. Premium prices for convenience.",
    solar_system: "Phoenix Prime",
    offers: [
      { resource_name: "Sophrogon", resource_type_id: 77728, price_per_unit: 280, min_quantity: 50 },
    ],
    registered_at: now - 86400000 * 7,
    last_updated: now - 86400000 * 2,
    is_active: true,
  },
  {
    ssu_id: "0xeee5555555555555555555555555555555555555555555555555555555555555",
    owner: "0xowner5555555555555555555555555555555555555555555555555555555555",
    name: "Nebula Salvage Yard",
    description: "Decommissioned. Owner relocated.",
    solar_system: "Nebula's Edge",
    offers: [
      { resource_name: "Common Ore", resource_type_id: 77800, price_per_unit: 60, min_quantity: 1000 },
    ],
    registered_at: now - 86400000 * 10,
    last_updated: now - 86400000 * 8,
    is_active: false,
  },
];

// ============================================================================
// Mock SSU Data (live on-chain state)
// ============================================================================

export const MOCK_SSU_DATA: SSUData[] = [
  {
    objectId: "0xaaa1111111111111111111111111111111111111111111111111111111111111",
    itemId: 100001,
    name: "Angelice Fuel Depot",
    description: "Full-service fuel and ore depot.",
    dappUrl: "",
    state: "online",
    typeId: 77917,
    locationHash: "loc_angelice_01",
    solarSystem: MOCK_SOLAR_SYSTEMS[0],
    owner: { id: "0xchar1", name: "Trader Kai", address: "0xowner1111111111111111111111111111111111111111111111111111111111", tribeId: 98000418 },
    energySourceId: "0xnn001",
    isParentNodeOnline: true,
    inventory: {
      capacity: 100000,
      usedCapacity: 45200,
      items: [
        { id: "inv1", item_id: "item_soph_1", location: { location_hash: "loc1" }, quantity: 3200, tenant: "stillness", type_id: 77728, name: "Sophrogon" },
        { id: "inv2", item_id: "item_crude_1", location: { location_hash: "loc1" }, quantity: 1800, tenant: "stillness", type_id: 77729, name: "Rough Old Crude Matter" },
      ],
    },
    fuel: { quantity: 85000, maxCapacity: 100000, burnRateMs: 60000, isBurning: true, burnStartTime: now - 3600000, lastUpdated: now - 300000 },
  },
  {
    objectId: "0xbbb2222222222222222222222222222222222222222222222222222222222222",
    itemId: 100002,
    name: "Serpentis Mining Exchange",
    description: "Ore refinery and trading post.",
    dappUrl: "",
    state: "online",
    typeId: 77917,
    locationHash: "loc_serpentis_01",
    solarSystem: MOCK_SOLAR_SYSTEMS[1],
    owner: { id: "0xchar2", name: "Miner Zara", address: "0xowner2222222222222222222222222222222222222222222222222222222222", tribeId: 1000167 },
    energySourceId: "0xnn002",
    isParentNodeOnline: true,
    inventory: {
      capacity: 200000,
      usedCapacity: 162000,
      items: [
        { id: "inv3", item_id: "item_ore_1", location: { location_hash: "loc2" }, quantity: 12400, tenant: "stillness", type_id: 77800, name: "Common Ore" },
        { id: "inv4", item_id: "item_mro_1", location: { location_hash: "loc2" }, quantity: 5800, tenant: "stillness", type_id: 77810, name: "Metal Rich Ore" },
        { id: "inv5", item_id: "item_lens_1", location: { location_hash: "loc2" }, quantity: 24, tenant: "stillness", type_id: 77518, name: "Lens 3X" },
      ],
    },
    fuel: { quantity: 42000, maxCapacity: 100000, burnRateMs: 45000, isBurning: true, burnStartTime: now - 7200000, lastUpdated: now - 600000 },
  },
  {
    objectId: "0xccc3333333333333333333333333333333333333333333333333333333333333",
    itemId: 100003,
    name: "Askur Outpost Gamma",
    description: "Remote outpost with rare commodities.",
    dappUrl: "",
    state: "online",
    typeId: 77917,
    locationHash: "loc_askur_01",
    solarSystem: MOCK_SOLAR_SYSTEMS[2],
    owner: { id: "0xchar3", name: "Scout Ren", address: "0xowner3333333333333333333333333333333333333333333333333333333333", tribeId: 98000418 },
    energySourceId: "0xnn003",
    isParentNodeOnline: true,
    inventory: {
      capacity: 50000,
      usedCapacity: 800,
      items: [
        { id: "inv6", item_id: "item_data_1", location: { location_hash: "loc3" }, quantity: 42, tenant: "stillness", type_id: 72244, name: "Feral Data" },
      ],
    },
    fuel: { quantity: 18000, maxCapacity: 100000, burnRateMs: 90000, isBurning: true, burnStartTime: now - 14400000, lastUpdated: now - 900000 },
  },
  {
    objectId: "0xddd4444444444444444444444444444444444444444444444444444444444444",
    itemId: 100004,
    name: "Phoenix Refuel Station",
    description: "Emergency refueling.",
    dappUrl: "",
    state: "anchored",
    typeId: 77917,
    locationHash: "loc_phoenix_01",
    solarSystem: MOCK_SOLAR_SYSTEMS[3],
    owner: { id: "0xchar4", name: "Captain Sol", address: "0xowner4444444444444444444444444444444444444444444444444444444444", tribeId: 1000167 },
    energySourceId: "0xnn004",
    isParentNodeOnline: false,
    inventory: {
      capacity: 75000,
      usedCapacity: 31000,
      items: [
        { id: "inv7", item_id: "item_soph_2", location: { location_hash: "loc4" }, quantity: 950, tenant: "stillness", type_id: 77728, name: "Sophrogon" },
      ],
    },
    fuel: { quantity: 3200, maxCapacity: 100000, burnRateMs: 60000, isBurning: false, burnStartTime: 0, lastUpdated: now - 86400000 * 2 },
  },
  {
    objectId: "0xeee5555555555555555555555555555555555555555555555555555555555555",
    itemId: 100005,
    name: "Nebula Salvage Yard",
    description: "Decommissioned.",
    dappUrl: "",
    state: "anchored",
    typeId: 77917,
    locationHash: "loc_nebula_01",
    solarSystem: MOCK_SOLAR_SYSTEMS[4],
    owner: { id: "0xchar5", name: "Hauler Vex", address: "0xowner5555555555555555555555555555555555555555555555555555555555", tribeId: 98000418 },
    energySourceId: "0xnn005",
    isParentNodeOnline: false,
    inventory: {
      capacity: 150000,
      usedCapacity: 0,
      items: [],
    },
    fuel: { quantity: 0, maxCapacity: 100000, burnRateMs: 60000, isBurning: false, burnStartTime: 0, lastUpdated: now - 86400000 * 8 },
  },
];

// ============================================================================
// Merged mock data (what the UI renders)
// ============================================================================

export function getMockMergedShops(): MergedShop[] {
  return MOCK_SHOP_LISTINGS.map((listing) => {
    const ssu = MOCK_SSU_DATA.find((s) => s.objectId === listing.ssu_id) ?? null;
    const isOnline = ssu?.state === "online";
    const fuelPercent = ssu?.fuel
      ? Math.round((ssu.fuel.quantity / ssu.fuel.maxCapacity) * 100)
      : 0;
    const totalStock = ssu?.inventory.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

    // Check for discrepancy: are listed resources actually in inventory?
    const hasDiscrepancy = listing.offers.some((offer) => {
      const inStock = ssu?.inventory.items.find(
        (item) => item.type_id === offer.resource_type_id,
      );
      return !inStock || inStock.quantity < offer.min_quantity;
    });

    return { listing, ssu, isOnline, fuelPercent, totalStock, hasDiscrepancy };
  });
}
