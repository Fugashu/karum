import { useState, useMemo } from "react";
import { useShops } from "../../hooks/use-shops";
import { SearchSelect, type SearchSelectItem } from "../ui/SearchSelect";
import type { MergedShop } from "../../types";
import type { SolarSystem } from "../../types";

// price-asc → price-desc → null (off)
type PriceSort = "asc" | "desc" | null;
type DistSort = "asc" | "desc" | null;

interface ShopSidebarProps {
  onNavigateToShop?: (systemName: string) => void;
  fromSystemId: string | null;
  solarSystems: SolarSystem[];
}

export function ShopSidebar({ onNavigateToShop, fromSystemId, solarSystems }: ShopSidebarProps) {
  const { data: shops = [], isLoading } = useShops();
  const [resourceFilter, setResourceFilter] = useState<string | null>(null);
  const [priceSort, setPriceSort] = useState<PriceSort>("asc");
  const [distSort, setDistSort] = useState<DistSort>(null);
  // Track which was clicked most recently — that one is primary
  const [primary, setPrimary] = useState<"price" | "dist">("price");

  // Build system lookup by name
  const systemByName = useMemo(() => {
    const map = new Map<string, SolarSystem>();
    for (const s of solarSystems) map.set(s.name, s);
    return map;
  }, [solarSystems]);

  const fromSystem = useMemo(() => {
    if (!fromSystemId) return null;
    return solarSystems.find((s) => String(s.id) === fromSystemId) ?? null;
  }, [fromSystemId, solarSystems]);

  function cyclePriceSort() {
    if (priceSort === "asc") setPriceSort("desc");
    else if (priceSort === "desc") setPriceSort(null);
    else setPriceSort("asc");
    setPrimary("price");
  }

  function cycleDistSort() {
    if (distSort === "asc") setDistSort("desc");
    else if (distSort === "desc") setDistSort(null);
    else setDistSort("asc");
    setPrimary("dist");
  }

  // Build resource items for search select
  const resourceItems = useMemo<SearchSelectItem[]>(() => {
    const map = new Map<number, string>();
    for (const s of shops) {
      for (const o of s.listing.offers) {
        map.set(o.resource_type_id, o.resource_name);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ value: String(id), label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [shops]);

  // Calculate distance for a shop
  function shopDistance(shop: MergedShop): number | null {
    if (!fromSystem) return null;
    const sys = systemByName.get(shop.listing.solar_system);
    if (!sys) return null;
    const dx = fromSystem.location.x - sys.location.x;
    const dy = fromSystem.location.y - sys.location.y;
    const dz = fromSystem.location.z - sys.location.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Filter and sort shops
  const filtered = useMemo(() => {
    let result = shops.filter((s) => s.isOnline && s.listing.is_active);

    if (resourceFilter) {
      const typeId = Number(resourceFilter);
      result = result.filter((s) =>
        s.listing.offers.some((o) => o.resource_type_id === typeId),
      );
    }

    result.sort((a, b) => {
      const comparePrice = () => {
        if (!priceSort) return 0;
        const aP = minPrice(a, resourceFilter);
        const bP = minPrice(b, resourceFilter);
        return priceSort === "asc" ? aP - bP : bP - aP;
      };
      const compareDist = () => {
        if (!distSort || !fromSystem) return 0;
        const aD = shopDistance(a) ?? Infinity;
        const bD = shopDistance(b) ?? Infinity;
        return distSort === "asc" ? aD - bD : bD - aD;
      };

      const [first, second] = primary === "price"
        ? [comparePrice, compareDist]
        : [compareDist, comparePrice];

      return first() || second();
    });

    return result;
  }, [shops, resourceFilter, priceSort, distSort, fromSystem]);

  function formatDist(dist: number | null): string {
    if (dist === null) return "—";
    const au = dist * 1e-17;
    if (au < 1) return `${(au * 1000).toFixed(0)} mAU`;
    return `${au.toFixed(1)} AU`;
  }

  const priceSortIcon = priceSort === "asc" ? "↑" : priceSort === "desc" ? "↓" : "↕";
  const distSortIcon = distSort === "asc" ? "↑" : distSort === "desc" ? "↓" : "↕";

  return (
    <aside className="w-[280px] shrink-0 bg-card border-r-2 border-border flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-bold tracking-[0.1em] uppercase text-text">
          Shops
        </h2>
      </div>

      {/* Search + Sort */}
      <div className="px-4 py-3 border-b border-border space-y-2">
        <SearchSelect
          items={resourceItems}
          value={resourceFilter}
          onChange={setResourceFilter}
          placeholder="Filter by resource..."
        />
        <div className="flex gap-2">
          <button
            onClick={cyclePriceSort}
            className={`px-2 py-1 text-[9px] font-bold tracking-wider border cursor-pointer ${
              priceSort !== null
                ? "border-amber text-amber bg-amber/10"
                : "border-border text-text-dim hover:border-border-hover"
            }`}
          >
            PRICE {priceSortIcon}
          </button>
          <button
            onClick={cycleDistSort}
            className={`px-2 py-1 text-[9px] font-bold tracking-wider border cursor-pointer ${
              distSort !== null
                ? "border-amber text-amber bg-amber/10"
                : "border-border text-text-dim hover:border-border-hover"
            }`}
          >
            DISTANCE {distSortIcon}
          </button>
        </div>
      </div>

      {/* Shop list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="px-4 py-8 text-xs text-text-dim text-center">Loading shops...</div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="px-4 py-8 text-xs text-text-dim text-center">
            {resourceFilter ? "No shops sell this resource." : "No shops online."}
          </div>
        )}

        {filtered.map((shop) => {
          const offers = resourceFilter
            ? shop.listing.offers.filter((o) => String(o.resource_type_id) === resourceFilter)
            : shop.listing.offers;
          const dist = shopDistance(shop);

          return (
            <button
              key={shop.listing.ssu_id}
              type="button"
              onClick={() => onNavigateToShop?.(shop.listing.solar_system)}
              className="w-full text-left px-4 py-3 border-b border-border/50 hover:bg-card-hover transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 shrink-0 bg-green shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
                <span className="text-xs font-bold text-text truncate">{shop.listing.name}</span>
                <span className="text-[9px] text-text-dim tracking-wider ml-auto shrink-0">
                  {shop.listing.solar_system}
                  {dist !== null && ` · ${formatDist(dist)}`}
                </span>
              </div>

              <div className="space-y-1">
                {offers.map((offer, i) => {
                  const inStock = shop.ssu?.inventory.items.find(
                    (item) => item.type_id === offer.resource_type_id,
                  );
                  const stockQty = inStock?.quantity ?? 0;
                  const hasStock = stockQty >= offer.min_quantity;

                  return (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className="text-text-mid truncate mr-2">{offer.resource_name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-amber font-bold">
                          {(offer.price_per_unit / 1_000_000_000).toFixed(3)}
                        </span>
                        <span className="text-text-dim">SUI</span>
                        <span className={`font-mono ${hasStock ? "text-green" : "text-red"}`}>
                          {stockQty.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2.5 border-t border-border text-[9px] text-text-dim tracking-wider">
        {filtered.length} shop{filtered.length !== 1 ? "s" : ""} online
      </div>
    </aside>
  );
}

function minPrice(shop: MergedShop, resourceFilter: string | null): number {
  const offers = resourceFilter
    ? shop.listing.offers.filter((o) => String(o.resource_type_id) === resourceFilter)
    : shop.listing.offers;
  if (offers.length === 0) return Infinity;
  return Math.min(...offers.map((o) => o.price_per_unit));
}
