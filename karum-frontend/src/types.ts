// ============================================================================
// EVE Frontier World API types (REST — reference data)
// ============================================================================

/** Game item/resource type from World API /v2/types */
export interface GameType {
  id: number;
  name: string;
  description: string;
  mass: number;
  radius: number;
  volume: number;
  portionSize: number;
  groupName: string;
  groupId: number;
  categoryName: string;
  categoryId: number;
  iconUrl: string;
  attributes?: Record<string, unknown>;
}

/** Solar system from World API /v2/solarsystems */
export interface SolarSystem {
  id: number;
  name: string;
  constellationId: number;
  regionId: number;
  location: { x: number; y: number; z: number };
  gateLinks?: unknown[];
}

/** Paginated response wrapper from World API */
export interface PaginatedResponse<T> {
  data: T[];
  metadata: { total: number; limit: number; offset: number };
}

// ============================================================================
// Sui on-chain types (Smart Assemblies via GraphQL)
// ============================================================================

/** Assembly state — from status.status.@variant */
export type AssemblyState =
  | "online"
  | "anchored"
  | "unanchored"
  | "destroyed"
  | "unknown";

/** Assembly type — derived from Move type repr */
export type AssemblyKind =
  | "SmartStorageUnit"
  | "SmartTurret"
  | "SmartGate"
  | "NetworkNode"
  | "Manufacturing"
  | "Refinery"
  | "Assembly";

/**
 * Raw JSON contents of a smart assembly Sui object.
 *
 * From Sui JSON-RPC, nested structs are wrapped as:
 *   { type: "0x...::module::Type", fields: { ... } }
 *
 * The `fields` at the top level of `content.fields` gives the StorageUnit's
 * direct fields. Nested values like `metadata`, `status`, `key`, `location`
 * each come wrapped in the { type, fields } pattern.
 *
 * Real example structure (from sui_getObject on a deployed SSU):
 *   energy_source_id: "0x..."
 *   inventory_keys: ["0x...", "0x..."]
 *   key: { type: "...::TenantItemId", fields: { item_id: "...", tenant: "utopia" } }
 *   metadata: { type: "...::Metadata", fields: { name: "", description: "", ... } }
 *   owner_cap_id: "0x..."
 *   status: { type: "...::AssemblyStatus", fields: { status: { variant: "OFFLINE" } } }
 *   type_id: "88083"
 */
export interface RawAssemblyJson {
  id: string | { id: string };
  type_id: string;
  key?: { fields?: { item_id: string; tenant: string }; item_id?: string; tenant?: string };
  metadata?: { fields?: { assembly_id: string; name: string; description: string; url: string } };
  status?: { fields?: { status: { variant?: string; "@variant"?: string } } };
  location?: { fields?: { location_hash: number[] | string } };
  inventory_keys?: string[];
  energy_source_id?: string;
  owner_cap_id?: string;
  // NetworkNode fields (when reading the energy source object)
  fuel?: {
    fields?: {
      max_capacity: string;
      burn_rate_in_ms: string;
      type_id: string;
      unit_volume: string;
      quantity: string;
      is_burning: boolean;
      previous_cycle_elapsed_time: string;
      burn_start_time: string;
      last_updated: string;
    };
  };
  energy_source?: {
    fields?: {
      max_energy_production: string;
      current_energy_production: string;
      total_reserved_energy: string;
    };
  };
  connected_assembly_ids?: string[];
}

/** Inventory item inside an SSU dynamic field */
export interface InventoryItem {
  id: string;
  item_id: string;
  location: { location_hash: string };
  quantity: number;
  tenant: string;
  type_id: number;
  name: string;
}

/** Processed SSU data from Sui GraphQL */
export interface SSUData {
  /** Sui object address */
  objectId: string;
  /** In-game item ID */
  itemId: number;
  /** Display name */
  name: string;
  description: string;
  dappUrl: string;
  /** online | anchored (offline) | unanchored | destroyed */
  state: AssemblyState;
  /** In-game type ID (e.g. 77917 = Heavy Storage) */
  typeId: number;
  /** Location hash for coordinate derivation */
  locationHash: string;
  /** Solar system (resolved from location or registry) */
  solarSystem?: SolarSystem;
  /** Owner character info */
  owner?: { id: string; name: string; address: string; tribeId: number };
  /** Energy source (parent network node) */
  energySourceId?: string;
  isParentNodeOnline?: boolean;
  /** Inventory */
  inventory: {
    capacity: number;
    usedCapacity: number;
    items: InventoryItem[];
  };
  /** Fuel info (from parent network node) */
  fuel?: {
    quantity: number;
    maxCapacity: number;
    burnRateMs: number;
    isBurning: boolean;
    burnStartTime: number;
    lastUpdated: number;
  };
}

// ============================================================================
// Karum ShopRegistry types (our Sui Move contract)
// ============================================================================

export interface ShopOffer {
  resource_name: string;
  resource_type_id: number;
  price_per_unit: number;
  min_quantity: number;
}

export interface ShopListing {
  ssu_id: string;
  owner: string;
  name: string;
  description: string;
  solar_system: string;
  offers: ShopOffer[];
  registered_at: number;
  last_updated: number;
  is_active: boolean;
}

// ============================================================================
// Merged view — registry listing + live SSU data
// ============================================================================

export interface MergedShop {
  /** Shop listing from our registry */
  listing: ShopListing;
  /** Live SSU data from Sui (null if SSU not found on-chain) */
  ssu: SSUData | null;
  /** Computed convenience fields */
  isOnline: boolean;
  fuelPercent: number;
  totalStock: number;
  /** True if listed offers don't match actual inventory */
  hasDiscrepancy: boolean;
}
