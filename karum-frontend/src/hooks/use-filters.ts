import { useMemo, useState } from "react";
import type { MergedShop } from "../types";

export type SortMode =
  | "stock-desc"
  | "price-asc"
  | "fuel-asc"
  | "updated-desc"
  | "name-asc";

export interface FilterState {
  search: string;
  resourceTypeId: number | null;
  solarSystem: string | null;
  onlineOnly: boolean;
  sort: SortMode;
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  resourceTypeId: null,
  solarSystem: null,
  onlineOnly: false,
  sort: "stock-desc",
};

export function useFilters(shops: MergedShop[]) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const filtered = useMemo(() => {
    let result = [...shops];

    // Search: name, system, SSU ID
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.listing.name.toLowerCase().includes(q) ||
          s.listing.solar_system.toLowerCase().includes(q) ||
          s.listing.ssu_id.toLowerCase().includes(q) ||
          s.ssu?.owner?.name.toLowerCase().includes(q),
      );
    }

    // Resource type filter
    if (filters.resourceTypeId !== null) {
      result = result.filter((s) =>
        s.listing.offers.some(
          (o) => o.resource_type_id === filters.resourceTypeId,
        ),
      );
    }

    // Solar system filter
    if (filters.solarSystem) {
      result = result.filter(
        (s) => s.listing.solar_system === filters.solarSystem,
      );
    }

    // Online only
    if (filters.onlineOnly) {
      result = result.filter((s) => s.isOnline);
    }

    // Sort
    result.sort((a, b) => {
      switch (filters.sort) {
        case "stock-desc":
          return b.totalStock - a.totalStock;
        case "price-asc": {
          const aMin = Math.min(...a.listing.offers.map((o) => o.price_per_unit), Infinity);
          const bMin = Math.min(...b.listing.offers.map((o) => o.price_per_unit), Infinity);
          return aMin - bMin;
        }
        case "fuel-asc":
          return a.fuelPercent - b.fuelPercent;
        case "updated-desc":
          return b.listing.last_updated - a.listing.last_updated;
        case "name-asc":
          return a.listing.name.localeCompare(b.listing.name);
        default:
          return 0;
      }
    });

    return result;
  }, [shops, filters]);

  // Derived: unique solar systems and resource types for filter dropdowns
  const solarSystems = useMemo(
    () => [...new Set(shops.map((s) => s.listing.solar_system))].sort(),
    [shops],
  );

  const resourceTypes = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of shops) {
      for (const o of s.listing.offers) {
        map.set(o.resource_type_id, o.resource_name);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shops]);

  return {
    filters,
    setFilters,
    setSearch: (search: string) => setFilters((f) => ({ ...f, search })),
    setResourceType: (id: number | null) =>
      setFilters((f) => ({ ...f, resourceTypeId: id })),
    setSolarSystem: (system: string | null) =>
      setFilters((f) => ({ ...f, solarSystem: system })),
    toggleOnlineOnly: () =>
      setFilters((f) => ({ ...f, onlineOnly: !f.onlineOnly })),
    setSort: (sort: SortMode) => setFilters((f) => ({ ...f, sort })),
    filtered,
    solarSystems,
    resourceTypes,
  };
}
