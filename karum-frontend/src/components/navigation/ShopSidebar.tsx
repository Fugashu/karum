import { useState, useMemo } from "react";
import { useShops } from "../../hooks/use-shops";
import { SearchSelect, type SearchSelectItem } from "../ui/SearchSelect";
import type { MergedShop } from "../../types";

type SortMode = "price-asc" | "price-desc" | "stock-desc" | "name-asc";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "price-asc", label: "LOWEST PRICE" },
  { value: "price-desc", label: "HIGHEST PRICE" },
  { value: "stock-desc", label: "MOST STOCK" },
  { value: "name-asc", label: "NAME A-Z" },
];

interface ShopSidebarProps {
  onNavigateToShop?: (systemName: string) => void;
}

export function ShopSidebar({ onNavigateToShop }: ShopSidebarProps) {
  const { data: shops = [], isLoading } = useShops();
  const [resourceFilter, setResourceFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("price-asc");

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
      switch (sort) {
        case "price-asc": {
          const aMin = minPrice(a, resourceFilter);
          const bMin = minPrice(b, resourceFilter);
          return aMin - bMin;
        }
        case "price-desc": {
          const aMax = maxPrice(a, resourceFilter);
          const bMax = maxPrice(b, resourceFilter);
          return bMax - aMax;
        }
        case "stock-desc":
          return b.totalStock - a.totalStock;
        case "name-asc":
          return a.listing.name.localeCompare(b.listing.name);
        default:
          return 0;
      }
    });

    return result;
  }, [shops, resourceFilter, sort]);

  return (
    <aside className="w-[280px] shrink-0 bg-card border-r-2 border-border flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border">
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
        <div className="flex gap-1.5 flex-wrap">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setSort(o.value)}
              className={`px-2 py-1 text-[9px] font-bold tracking-wider border cursor-pointer ${
                sort === o.value
                  ? "border-amber text-amber bg-amber/10"
                  : "border-border text-text-dim hover:border-border-hover"
              }`}
            >
              {o.label}
            </button>
          ))}
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
                {shop.listing.solar_system && (
                  <span className="text-[9px] text-text-dim tracking-wider ml-auto shrink-0">
                    {shop.listing.solar_system}
                  </span>
                )}
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

function maxPrice(shop: MergedShop, resourceFilter: string | null): number {
  const offers = resourceFilter
    ? shop.listing.offers.filter((o) => String(o.resource_type_id) === resourceFilter)
    : shop.listing.offers;
  if (offers.length === 0) return 0;
  return Math.max(...offers.map((o) => o.price_per_unit));
}
