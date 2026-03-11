/**
 * Reads ShopRegistry from our Karum Sui Move contract.
 * Uses getDynamicFields() pagination on the registry shared object.
 */

import { config } from "../config";
import { suiClient } from "./sui-client";
import type { ShopListing, ShopOffer } from "../types";

const REGISTRY_ID = config.sui.registryId;

/**
 * Fetch all shop listings from the ShopRegistry.
 * Paginates through dynamic fields on the registry shared object.
 */
export async function fetchAllShops(): Promise<ShopListing[]> {
  if (!REGISTRY_ID) {
    console.warn(
      "[registry-reader] No REGISTRY_OBJECT_ID configured. Returning empty.",
    );
    return [];
  }

  const shops: ShopListing[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const page: Awaited<ReturnType<typeof suiClient.getDynamicFields>> = await suiClient.getDynamicFields({
      parentId: REGISTRY_ID,
      cursor: cursor ?? undefined,
      limit: 50,
    });

    // Fetch full content for each dynamic field
    const fieldPromises = page.data.map(async (field) => {
      try {
        const obj = await suiClient.getDynamicFieldObject({
          parentId: REGISTRY_ID,
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
    const obj = await suiClient.getDynamicFieldObject({
      parentId: REGISTRY_ID,
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

function parseShopListing(fields: Record<string, unknown>): ShopListing {
  const value = (fields.value ?? fields) as Record<string, unknown>;

  const offersRaw = (value.offers ?? []) as Array<Record<string, unknown>>;
  const offers: ShopOffer[] = offersRaw.map((o) => ({
    resource_name: String(o.resource_name ?? ""),
    resource_type_id: Number(o.resource_type_id ?? 0),
    price_per_unit: Number(o.price_per_unit ?? 0),
    min_quantity: Number(o.min_quantity ?? 0),
  }));

  return {
    ssu_id: String(value.ssu_id ?? ""),
    owner: String(value.owner ?? ""),
    name: String(value.name ?? ""),
    description: String(value.description ?? ""),
    solar_system: String(value.solar_system ?? ""),
    offers,
    registered_at: Number(value.registered_at ?? 0),
    last_updated: Number(value.last_updated ?? 0),
    is_active: Boolean(value.is_active ?? true),
  };
}
