import { useState, useEffect } from "react";
import { fetchBatchDistances } from "../services/route-api";
import type { SolarSystem } from "../types";
import type { MergedShop } from "../types";

/**
 * Fetch Dijkstra distances from a source system to all unique shop systems.
 * Returns a Map<systemName, distance> or undefined if not ready.
 */
export function useShopDistances(
  myLocationName: string | null,
  solarSystems: SolarSystem[],
  shops: MergedShop[],
): Map<string, number> | undefined {
  const [distanceMap, setDistanceMap] = useState<Map<string, number> | undefined>();

  useEffect(() => {
    if (!myLocationName || solarSystems.length === 0 || shops.length === 0) {
      setDistanceMap(undefined);
      return;
    }

    const mySys = solarSystems.find((s) => s.name === myLocationName);
    if (!mySys) {
      setDistanceMap(undefined);
      return;
    }

    const nameToId = new Map(solarSystems.map((s) => [s.name, s.id]));
    const shopSystemNames = [...new Set(shops.map((s) => s.listing.solar_system))];
    const targetIds = shopSystemNames
      .map((n) => nameToId.get(n))
      .filter((id): id is number => id != null);

    if (targetIds.length === 0) return;

    let cancelled = false;

    fetchBatchDistances(mySys.id, targetIds)
      .then((entries) => {
        if (cancelled) return;
        const idToName = new Map(solarSystems.map((s) => [s.id, s.name]));
        const map = new Map<string, number>();
        for (const e of entries) {
          const name = idToName.get(e.system_id);
          if (name && e.distance >= 0) map.set(name, e.distance);
        }
        setDistanceMap(map);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[use-shop-distances] Failed:", err);
        setDistanceMap(undefined);
      });

    return () => { cancelled = true; };
  }, [myLocationName, solarSystems, shops]);

  return distanceMap;
}
