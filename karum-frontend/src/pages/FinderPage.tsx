import { useShops } from "../hooks/use-shops";
import { useFilters, type SortMode } from "../hooks/use-filters";
import { itemInfo } from "../services/item-types";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "stock-desc", label: "MOST STOCK" },
  { value: "updated-desc", label: "RECENTLY UPDATED" },
  { value: "price-asc", label: "LOWEST PRICE" },
  { value: "fuel-asc", label: "LOWEST FUEL" },
  { value: "name-asc", label: "NAME A-Z" },
];

/** Mock distance for display — seeded from ssu_id hash */
function mockDistance(ssuId: string): string {
  let h = 0;
  for (let i = 0; i < ssuId.length; i++) {
    h = (h * 31 + ssuId.charCodeAt(i)) | 0;
  }
  const km = 50 + Math.abs(h % 950);
  return `${km} km`;
}

export function FinderPage() {
  const { data: shops = [], isLoading, error } = useShops();
  const {
    filtered,
    filters,
    setSearch,
    setResourceType,
    setSolarSystem,
    setSort,
    toggleOnlineOnly,
    resourceTypes,
    solarSystems,
  } = useFilters(shops);

  const activeFilterCount =
    (filters.resourceTypeId !== null ? 1 : 0) +
    (filters.solarSystem !== null ? 1 : 0) +
    (filters.onlineOnly ? 1 : 0);

  // Active filter styles (amber treatment)
  const activeSelect =
    "bg-amber/10 border-amber text-amber";
  const inactiveSelect =
    "bg-card border-border text-text-mid";

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b-2 border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-[0.12em] text-text">
          K<span className="text-amber">A</span>RUM
        </h1>
        <nav className="flex gap-4 text-sm text-text-mid">
          <a href="/" className="text-amber border-b-2 border-amber pb-1">
            FINDER
          </a>
          <a href="/register" className="hover:text-text">
            REGISTER
          </a>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="flex gap-3 mb-3 flex-wrap">
          <input
            type="text"
            placeholder="Search shops, systems, owners..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[240px] bg-card border-2 border-border px-4 py-3 text-text placeholder:text-text-dim focus:border-amber focus:outline-none"
          />
        </div>

        {/* Filter row */}
        <div className="flex gap-2 mb-6 flex-wrap items-center">
          {/* Resource dropdown */}
          <select
            value={filters.resourceTypeId ?? ""}
            onChange={(e) =>
              setResourceType(e.target.value ? Number(e.target.value) : null)
            }
            className={`border-2 px-3 py-2.5 text-sm focus:border-amber focus:outline-none appearance-none cursor-pointer min-w-[180px] ${
              filters.resourceTypeId !== null ? activeSelect : inactiveSelect
            }`}
          >
            <option value="">ALL RESOURCES</option>
            {resourceTypes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Solar system dropdown */}
          <select
            value={filters.solarSystem ?? ""}
            onChange={(e) => setSolarSystem(e.target.value || null)}
            className={`border-2 px-3 py-2.5 text-sm focus:border-amber focus:outline-none appearance-none cursor-pointer min-w-[160px] ${
              filters.solarSystem !== null ? activeSelect : inactiveSelect
            }`}
          >
            <option value="">ALL SYSTEMS</option>
            {solarSystems.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Sort dropdown */}
          <select
            value={filters.sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="bg-card border-2 border-border px-3 py-2.5 text-sm text-text-mid focus:border-amber focus:outline-none appearance-none cursor-pointer min-w-[180px]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Online only toggle */}
          <button
            onClick={toggleOnlineOnly}
            className="px-4 py-2.5 border-2 text-sm font-bold tracking-wider"
            style={
              filters.onlineOnly
                ? { backgroundColor: "rgba(232, 168, 50, 0.1)", borderColor: "#e8a832", color: "#e8a832" }
                : undefined
            }
          >
            ONLINE ONLY
          </button>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setResourceType(null);
                setSolarSystem(null);
                if (filters.onlineOnly) toggleOnlineOnly();
              }}
              className="px-3 py-2.5 text-xs text-text-dim hover:text-red"
            >
              CLEAR ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          {[
            {
              label: "SHOPS",
              value: `${filtered.length}${filtered.length !== shops.length ? ` / ${shops.length}` : ""}`,
            },
            {
              label: "ONLINE",
              value: filtered.filter((s) => s.isOnline).length,
              color: "text-green",
            },
            {
              label: "RESOURCES",
              value: new Set(
                filtered.flatMap((s) =>
                  s.listing.offers.map((o) => o.resource_type_id),
                ),
              ).size,
            },
            {
              label: "LOW FUEL",
              value: filtered.filter(
                (s) => s.fuelPercent < 20 && s.fuelPercent > 0,
              ).length,
              color: "text-orange",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border p-4">
              <div className="text-xs text-text-dim tracking-wider">
                {stat.label}
              </div>
              <div
                className={`leading-tight font-bold mt-1 ${stat.color ?? "text-text"}`}
                style={{ fontSize: "32px" }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Loading / Error */}
        {isLoading && (
          <div className="text-center py-20 text-text-dim">
            Loading shops...
          </div>
        )}
        {error && (
          <div className="text-center py-20 text-red">
            Failed to load shops. Using mock data.
          </div>
        )}

        {/* Shop List */}
        {!isLoading && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="text-center py-20 text-text-dim">
                {shops.length === 0
                  ? "No shops registered yet."
                  : "No shops match your filters."}
              </div>
            )}
            {filtered.map((shop) => {
              const hasHighStock = shop.totalStock > 5000;

              return (
                <div
                  key={shop.listing.ssu_id}
                  className={`bg-card border p-5 hover:bg-card-hover transition-colors relative ${
                    !shop.listing.is_active || !shop.isOnline ? "opacity-55" : ""
                  } ${
                    hasHighStock
                      ? "border-border-hover"
                      : "border-border hover:border-border-hover"
                  }`}
                  style={
                    hasHighStock
                      ? { borderLeftWidth: "3px", borderLeftColor: "#e8a832" }
                      : undefined
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {/* Status square — 10px */}
                        <span
                          className={`w-[10px] h-[10px] shrink-0 ${
                            shop.isOnline
                              ? "bg-green shadow-[0_0_6px_rgba(74,222,128,0.6)]"
                              : "bg-red"
                          }`}
                        />
                        <h3 className="text-lg font-bold text-text">
                          {shop.listing.name}
                        </h3>
                        {!shop.isOnline && (
                          <span className="text-red font-bold" style={{ fontSize: "9px", letterSpacing: "0.05em" }}>
                            OFFLINE
                          </span>
                        )}
                        <span className="text-xs text-text-dim border border-border px-2 py-0.5">
                          {shop.listing.solar_system}
                        </span>
                        <span className="text-xs text-text-dim">
                          {mockDistance(shop.listing.ssu_id)}
                        </span>
                        {shop.ssu?.owner && (
                          <span className="text-xs text-text-dim">
                            by {shop.ssu.owner.name}
                          </span>
                        )}
                      </div>
                      {/* Description: DM Sans 14px, dim color */}
                      <p className="font-body text-text-dim text-[14px] mb-3">
                        {shop.listing.description}
                      </p>
                      {/* Offers */}
                      <div className="flex flex-wrap gap-2">
                        {shop.listing.offers.map((offer, i) => {
                          const inStock = shop.ssu?.inventory.items.find(
                            (item) => item.type_id === offer.resource_type_id,
                          );
                          const isFilteredResource =
                            filters.resourceTypeId === offer.resource_type_id;
                          const info = itemInfo(offer.resource_type_id);
                          return (
                            <div key={i} className="relative group">
                              <button
                                onClick={() =>
                                  setResourceType(
                                    isFilteredResource
                                      ? null
                                      : offer.resource_type_id,
                                  )
                                }
                                className={`flex items-center gap-2 border px-3 py-1.5 text-xs cursor-pointer hover:border-border-hover ${
                                  isFilteredResource
                                    ? "bg-amber/10 border-amber text-amber"
                                    : "bg-bg border-border"
                                }`}
                              >
                                <span
                                  className={
                                    isFilteredResource
                                      ? "text-amber"
                                      : "text-text-mid"
                                  }
                                >
                                  {offer.resource_name}
                                </span>
                                <span className="text-amber font-bold">
                                  {offer.price_per_unit.toLocaleString()}
                                </span>
                                <span className="text-text-dim">|</span>
                                <span
                                  className={
                                    inStock &&
                                    inStock.quantity >= offer.min_quantity
                                      ? "text-green"
                                      : "text-red"
                                  }
                                >
                                  {inStock
                                    ? `${inStock.quantity.toLocaleString()} in stock`
                                    : "out of stock"}
                                </span>
                              </button>
                              {info && (
                                <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 pointer-events-none">
                                  <div className="bg-elevated border border-border px-3 py-2 text-xs whitespace-nowrap">
                                    <div className="text-text font-bold mb-1">{info.name}</div>
                                    <div className="text-text-dim">
                                      {info.category} · {info.group}
                                    </div>
                                    <div className="text-text-dim">
                                      Vol: {info.volume} · Mass: {info.mass}
                                    </div>
                                    <div className="text-text-dim">
                                      ID: {info.id}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Right side: fuel + stock compact */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-dim tracking-wider">FUEL</span>
                        <div className="w-16 h-2 bg-bg border border-border">
                          <div
                            className={`h-full ${
                              shop.fuelPercent > 50
                                ? "bg-green"
                                : shop.fuelPercent > 20
                                  ? "bg-orange"
                                  : "bg-red"
                            }`}
                            style={{ width: `${shop.fuelPercent}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${
                          shop.fuelPercent > 50
                            ? "text-green"
                            : shop.fuelPercent > 20
                              ? "text-orange"
                              : "text-red"
                        }`}>
                          {shop.fuelPercent}%
                        </span>
                      </div>
                      <span className="text-xs text-text-dim">
                        {shop.totalStock.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 mt-12 text-center text-xs text-text-dim">
        KARUM — The Frontier's First Marketplace Network
      </footer>
    </div>
  );
}
