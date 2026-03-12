/**
 * Reads ShopRegistry from our Karum Sui Move contract.
 *
 * The Registry uses Table<address, ShopListing>. In Sui, Table entries
 * are dynamic fields on the Table's own UID, not the parent object.
 * So we first read the Registry to get the Table UID, then paginate
 * dynamic fields on that Table.
 */

import { config } from "../config";
import { suiClient } from "./sui-client";
import type { ShopListing, ShopOffer } from "../types";

const REGISTRY_ID = config.sui.registryId;

/** Cache the Table UID so we don't re-fetch the Registry every time */
let cachedTableId: string | null = null;

/**
 * Get the Table<address, ShopListing> object ID from the ShopRegistry.
 */
async function getTableId(): Promise<string> {
  if (cachedTableId) return cachedTableId;

  const obj = await suiClient.getObject({
    id: REGISTRY_ID,
    options: { showContent: true },
  });

  if (obj.data?.content?.dataType !== "moveObject") {
    throw new Error("[registry-reader] Registry is not a Move object");
  }

  const fields = obj.data.content.fields as Record<string, unknown>;
  const shops = fields.shops as { fields?: { id?: { id?: string } } };
  const tableId = shops?.fields?.id?.id;

  if (!tableId) {
    throw new Error("[registry-reader] Could not extract Table UID from Registry");
  }

  cachedTableId = tableId;
  return tableId;
}

/**
 * Fetch all shop listings from the ShopRegistry.
 * Paginates through dynamic fields on the Table object.
 */
export async function fetchAllShops(): Promise<ShopListing[]> {
  if (!REGISTRY_ID) {
    console.warn(
      "[registry-reader] No REGISTRY_OBJECT_ID configured. Returning empty.",
    );
    return [];
  }

  const tableId = await getTableId();
  const shops: ShopListing[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const page = await suiClient.getDynamicFields({
      parentId: tableId,
      cursor: cursor ?? undefined,
      limit: 50,
    });

    // Fetch full content for each dynamic field
    const fieldPromises = page.data.map(async (field) => {
      try {
        const obj = await suiClient.getDynamicFieldObject({
          parentId: tableId,
          name: field.name,
        });

        const content = obj.data?.content;
        if (content?.dataType !== "moveObject") return null;

        const fields = content.fields as Record<string, unknown>;
        return parseShopListing(fields);
      } catch (e) {
        console.warn("[registry-reader] Failed to read field:", field.name, e);
        return null;
      }
    });

    const results = await Promise.all(fieldPromises);
    for (const shop of results) {
      if (shop) shops.push(shop);
    }

    hasMore = page.hasNextPage;
    cursor = page.nextCursor ?? null;
  }

  return shops;
}

/**
 * Fetch a single shop listing by SSU ID.
 */
export async function fetchShop(ssuId: string): Promise<ShopListing | null> {
  if (!REGISTRY_ID) return null;

  try {
    const tableId = await getTableId();
    const obj = await suiClient.getDynamicFieldObject({
      parentId: tableId,
      name: {
        type: "address",
        value: ssuId,
      },
    });

    const content = obj.data?.content;
    if (content?.dataType !== "moveObject") return null;

    return parseShopListing(content.fields as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * Parse a ShopListing from Sui JSON-RPC dynamic field response.
 *
 * The response wraps the listing in Field<address, ShopListing>:
 *   { id, name: "0x...", value: { type: "...::ShopListing", fields: { ... } } }
 *
 * Offers come as vector of { type: "...::ShopOffer", fields: { ... } }
 */
function parseShopListing(fields: Record<string, unknown>): ShopListing {
  // Unwrap the dynamic field value wrapper
  const valueWrapper = fields.value as { fields?: Record<string, unknown> } | Record<string, unknown>;
  const value = (valueWrapper && "fields" in valueWrapper ? valueWrapper.fields : valueWrapper) ?? {};
  const v = value as Record<string, unknown>;

  // Parse offers — each wrapped in { type, fields }
  const offersRaw = (v.offers ?? []) as Array<unknown>;
  const offers: ShopOffer[] = offersRaw.map((raw) => {
    const o = unwrapFields(raw);
    return {
      resource_name: String(o.resource_name ?? ""),
      resource_type_id: Number(o.resource_type_id ?? 0),
      price_per_unit: Number(o.price_per_unit ?? 0),
      min_quantity: Number(o.min_quantity ?? 0),
    };
  });

  return {
    ssu_id: String(v.ssu_id ?? ""),
    owner: String(v.owner ?? ""),
    name: String(v.name ?? ""),
    description: String(v.description ?? ""),
    solar_system: String(v.solar_system ?? ""),
    offers,
    registered_at: Number(v.registered_at ?? 0),
    last_updated: Number(v.last_updated ?? 0),
    is_active: v.is_active === true || v.is_active === "true",
  };
}

/** Unwrap { type, fields } wrapping from Sui JSON-RPC */
function unwrapFields(val: unknown): Record<string, unknown> {
  if (val && typeof val === "object" && "fields" in val) {
    return (val as { fields: Record<string, unknown> }).fields;
  }
  return (val as Record<string, unknown>) ?? {};
}
