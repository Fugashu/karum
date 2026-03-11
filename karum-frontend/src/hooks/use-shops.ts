/**
 * Core hook: fetches registry listings + live SSU data, merges them.
 * Falls back to mock data if either source fails or VITE_USE_MOCK_DATA=true.
 */

import { useQuery } from "@tanstack/react-query";
import { config } from "../config";
import { fetchAllShops } from "../services/registry-reader";
import { fetchSSUBatch } from "../services/gateway";
import { getMockMergedShops } from "../services/mock-data";
import type { MergedShop } from "../types";

const REFETCH_INTERVAL = 60_000; // 60s

async function fetchAndMerge(): Promise<MergedShop[]> {
  if (config.useMockData) {
    return getMockMergedShops();
  }

  try {
    // 1. Read all shop listings from our registry
    const listings = await fetchAllShops();
    if (listings.length === 0) {
      // No shops registered yet — return empty (not mock)
      return [];
    }

    // 2. Batch-fetch live SSU data for every registered shop
    const ssuIds = listings.map((l) => l.ssu_id);
    const ssuMap = await fetchSSUBatch(ssuIds);

    // 3. Merge
    return listings.map((listing) => {
      const ssu = ssuMap.get(listing.ssu_id) ?? null;
      const isOnline = ssu?.state === "online";
      const fuelPercent = ssu?.fuel
        ? Math.round((ssu.fuel.quantity / ssu.fuel.maxCapacity) * 100)
        : 0;
      const totalStock =
        ssu?.inventory.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

      const hasDiscrepancy = listing.offers.some((offer) => {
        const inStock = ssu?.inventory.items.find(
          (item) => item.type_id === offer.resource_type_id,
        );
        return !inStock || inStock.quantity < offer.min_quantity;
      });

      return { listing, ssu, isOnline, fuelPercent, totalStock, hasDiscrepancy };
    });
  } catch (err) {
    console.error("[use-shops] Fetch failed, falling back to mock data:", err);
    return getMockMergedShops();
  }
}

export function useShops() {
  return useQuery<MergedShop[]>({
    queryKey: ["karum-shops"],
    queryFn: fetchAndMerge,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: REFETCH_INTERVAL / 2,
  });
}
