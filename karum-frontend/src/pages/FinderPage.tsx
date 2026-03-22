import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Transaction } from "@mysten/sui/transactions";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { useShops } from "../hooks/use-shops";
import { useFilters, type SortMode } from "../hooks/use-filters";
import { useUniverse } from "../hooks/use-universe";
import { usePersisted } from "../hooks/use-persisted";
import { useShopDistances } from "../hooks/use-shop-distances";
import { useOwnerNames } from "../hooks/use-owner-names";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SearchSelect, type SearchSelectItem } from "../components/ui/SearchSelect";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useWallet } from "../hooks/use-wallet";
import { useCharacter } from "../hooks/use-character";
import { ItemCard } from "../components/ui/ItemCard";
import { config } from "../config";
import type { MergedShop, ShopOffer } from "../types";

const VENDOR_PKG = config.vendor.packageId;
const VENDOR_CONFIG = config.vendor.configId;

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "stock-desc", label: "MOST STOCK" },
  { value: "updated-desc", label: "RECENTLY UPDATED" },
  { value: "price-asc", label: "LOWEST PRICE" },
  { value: "distance-asc", label: "NEAREST" },
  { value: "name-asc", label: "NAME A-Z" },
];

const DISTANCE_SCALE = 1e-17;

function formatDist(raw: number): string {
  const au = raw * DISTANCE_SCALE;
  if (au < 1) return `${(au * 1000).toFixed(0)} mAU`;
  return `${au.toFixed(1)} AU`;
}

export function FinderPage() {
  const { data: shops = [], isLoading, error, refetch, isFetching } = useShops();
  const [mobileToast, setMobileToast] = useState(false);
  const { universe } = useUniverse();
  const [myLocation, setMyLocation] = usePersisted<string | null>("karum:my-location", null);

  // Build system items for SearchSelect
  const systemItems = useMemo<SearchSelectItem[]>(() => {
    if (!universe) return [];
    return universe.solarSystems.map((s) => ({ value: s.name, label: s.name }));
  }, [universe]);

  const distanceMap = useShopDistances(myLocation, universe?.solarSystems ?? [], shops);
  const { data: ownerNames } = useOwnerNames();

  const {
    filtered,
    filters,
    setSearch,
    setResourceType,
    setSort,
    toggleOnlineOnly,
    resourceTypes,
  } = useFilters(shops, distanceMap);

  const account = useCurrentAccount();

  const resourceItems = useMemo<SearchSelectItem[]>(
    () => resourceTypes.map((r) => ({ value: String(r.id), label: r.name })),
    [resourceTypes],
  );

  const sortItems = useMemo<SearchSelectItem[]>(
    () => SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );

  return (
    <div className="min-h-screen bg-bg">
      <Header activePage="/" />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-16">
        {/* Reload + Search */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Search shops, systems, owners..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-card border-2 border-border px-4 py-2.5 text-text text-sm placeholder:text-text-dim focus:border-amber focus:outline-none"
          />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-border text-text-dim text-xs font-bold tracking-wider hover:border-amber hover:text-amber disabled:opacity-50 cursor-pointer"
          >
            <svg
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {isFetching ? "..." : "RELOAD"}
          </button>
        </div>

        {/* Filters — one row on desktop, stacked on mobile */}
        <div className="flex flex-wrap gap-2 mb-5 items-center">
          <div className="w-[calc(50%-4px)] sm:w-auto sm:min-w-[180px]">
            <SearchSelect
              items={systemItems}
              value={myLocation}
              onChange={setMyLocation}
              placeholder={universe ? "My location..." : "Loading..."}
            />
          </div>
          <div className="w-[calc(50%-4px)] sm:w-auto sm:min-w-[160px]">
            <SearchSelect
              items={resourceItems}
              value={filters.resourceTypeId !== null ? String(filters.resourceTypeId) : null}
              onChange={(v) => setResourceType(v ? Number(v) : null)}
              placeholder="All resources..."
            />
          </div>
          <div className="w-[calc(50%-4px)] sm:w-auto sm:min-w-[150px]">
            <SearchSelect
              items={sortItems}
              value={filters.sort}
              onChange={(v) => setSort((v as SortMode) ?? "stock-desc")}
              placeholder="Sort by..."
            />
          </div>

          <button
            onClick={toggleOnlineOnly}
            className={`px-3 py-2 border-2 text-xs font-bold tracking-wider ${
              filters.onlineOnly
                ? "bg-amber/10 border-amber text-amber"
                : "border-border text-text-dim hover:border-border-hover"
            }`}
          >
            ONLINE ONLY
          </button>

          <div className="ml-auto hidden sm:flex gap-4 text-xs text-text-dim items-center">
            <span>
              <span className="text-green">{filtered.filter((s) => s.isOnline).length}</span>/{filtered.length} online
            </span>
          </div>
        </div>

        {/* Loading / Error */}
        {isLoading && (
          <div className="text-center py-20 text-text-dim">
            Loading shops...
          </div>
        )}
        {error && (
          <div className="text-center py-20 text-red">
            Failed to load shops.
          </div>
        )}

        {/* Shop List */}
        {!isLoading && (() => {
          const filteredIds = new Set(filtered.map((s) => s.listing.ssu_id));
          return (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-20 text-text-dim">
                {shops.length === 0
                  ? "No shops registered yet."
                  : "No shops match your filters."}
              </div>
            )}
            {shops.map((shop) => (
              <ShopCard
                key={shop.listing.ssu_id}
                shop={shop}
                isVisible={filteredIds.has(shop.listing.ssu_id)}
                isMine={account?.address === shop.listing.owner}
                distLabel={(() => {
                  const dist = distanceMap?.get(shop.listing.solar_system);
                  return dist != null ? formatDist(dist) : null;
                })()}
                filters={filters}
                setResourceType={setResourceType}
                setMobileToast={setMobileToast}
                ownerNames={ownerNames}
                refetch={refetch}
              />
            ))}
          </div>
          );
        })()}
        {/* Mobile toast */}
        {mobileToast && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-card border-2 border-amber px-4 py-2.5 text-xs text-amber font-bold tracking-wider">
            Only available on desktop
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ============================================================================
// Shop Card
// ============================================================================

function ShopCard({
  shop,
  isVisible,
  isMine,
  distLabel,
  filters,
  setResourceType,
  setMobileToast,
  ownerNames,
  refetch,
}: {
  shop: MergedShop;
  isVisible: boolean;
  isMine: boolean;
  distLabel: string | null;
  filters: { resourceTypeId: number | null };
  setResourceType: (id: number | null) => void;
  setMobileToast: (v: boolean) => void;
  ownerNames?: Map<string, string>;
  refetch: () => void;
}) {
  const [selectedOffer, setSelectedOffer] = useState<ShopOffer | null>(null);

  return (
    <div
      className={`bg-card border-2 transition-all duration-300 ease-in-out overflow-hidden ${
        !isVisible
          ? "opacity-0 max-h-0 !m-0 !p-0 !border-0"
          : !shop.listing.is_active || !shop.isOnline
            ? "opacity-50 border-border max-h-[800px]"
            : isMine
              ? "border-amber/40 max-h-[800px]"
              : "border-border hover:border-border-hover max-h-[800px]"
      }`}
    >
      {/* Card header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5 mb-1">
          <span
            className={`w-2 h-2 shrink-0 ${
              shop.isOnline
                ? "bg-green shadow-[0_0_6px_rgba(74,222,128,0.6)]"
                : "bg-red"
            }`}
          />
          <Link
            to={`/shop/${shop.listing.ssu_id}`}
            className="text-base font-bold text-text leading-tight hover:text-amber transition-colors no-underline truncate"
          >
            {shop.listing.name}
          </Link>
          {isMine && (
            <span className="hidden sm:inline text-[9px] text-amber font-bold tracking-wider border border-amber/40 px-1.5 py-0.5">
              YOUR SHOP
            </span>
          )}
          {!shop.isOnline && (
            <span className="hidden sm:inline text-[9px] text-red font-bold tracking-wider">
              OFFLINE
            </span>
          )}
          {shop.listing.solar_system && (
            <Link
              to={`/navigation?system=${encodeURIComponent(shop.listing.solar_system)}&ssu=${encodeURIComponent(shop.listing.ssu_id)}`}
              className="hidden sm:inline text-[10px] text-text-dim border border-border px-1.5 py-0.5 ml-1 hover:border-amber hover:text-amber transition-colors no-underline cursor-pointer"
            >
              {shop.listing.solar_system}
            </Link>
          )}
          {distLabel && (
            <span className="hidden sm:inline text-[10px] text-text-dim ml-1">
              {distLabel}
            </span>
          )}
          <ShareButton ssuId={shop.listing.ssu_id} />
        </div>

        <div className="flex items-center gap-3 text-[10px] text-text-dim flex-wrap">
          <span>
            {ownerNames?.get(shop.listing.owner.toLowerCase()) || (
              <span className="font-mono">{shop.listing.owner.slice(0, 6)}...{shop.listing.owner.slice(-4)}</span>
            )}
          </span>
          <button
            type="button"
            className="group font-mono inline-flex items-center gap-1 hover:text-amber transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(shop.listing.ssu_id);
              const el = e.currentTarget;
              el.dataset.copied = "true";
              setTimeout(() => { el.dataset.copied = ""; }, 1500);
            }}
          >
            <span className="group-data-[copied=true]:hidden">
              SSU {shop.listing.ssu_id.slice(0, 6)}...{shop.listing.ssu_id.slice(-4)}
            </span>
            <span className="hidden group-data-[copied=true]:inline text-amber">COPIED</span>
            <svg className="w-2.5 h-2.5 group-data-[copied=true]:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><rect x="9" y="9" width="13" height="13"/><path d="M5 15H4V4h11v1"/></svg>
          </button>
          {isMine && (
            <span className="sm:hidden text-[9px] text-amber font-bold tracking-wider border border-amber/40 px-1.5 py-0.5">
              YOUR SHOP
            </span>
          )}
          {!shop.isOnline && (
            <span className="sm:hidden text-[9px] text-red font-bold tracking-wider">
              OFFLINE
            </span>
          )}
          <span className="sm:hidden ml-auto flex items-center gap-2">
            {distLabel && (
              <span className="text-text-dim">{distLabel}</span>
            )}
            {shop.listing.solar_system && (
              <button
                onClick={() => { setMobileToast(true); setTimeout(() => setMobileToast(false), 2000); }}
                className="text-text-dim border border-border px-1.5 py-0.5 hover:border-amber hover:text-amber transition-colors cursor-pointer"
              >
                {shop.listing.solar_system}
              </button>
            )}
          </span>
        </div>
        {shop.listing.description && (
          <p className="font-body text-text-dim text-sm leading-relaxed">
            {shop.listing.description}
          </p>
        )}
      </div>

      {/* Offers */}
      <div className="px-5 pb-4">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {shop.listing.offers.map((offer, i) => {
            const inStock = shop.ssu?.inventory.items.find(
              (item) => item.type_id === offer.resource_type_id,
            );
            const isFilteredResource =
              filters.resourceTypeId === offer.resource_type_id;
            const stockQty = inStock?.quantity ?? 0;
            const available = stockQty >= offer.min_quantity;

            return (
              <ItemCard
                key={i}
                typeId={offer.resource_type_id}
                name={offer.resource_name}
                quantity={stockQty}
                price={offer.price_per_unit}
                highlight={isFilteredResource}
                canBuy={available && shop.isOnline}
                onClick={() =>
                  setResourceType(
                    isFilteredResource ? null : offer.resource_type_id,
                  )
                }
                {...(!isMine && {
                  onBuy: () => setSelectedOffer(offer),
                  onMobileBuy: () => {
                    setMobileToast(true);
                    setTimeout(() => setMobileToast(false), 2000);
                  },
                })}
              />
            );
          })}
        </div>

        {/* Buy panel — only visible when an offer is selected via ItemCard BUY */}
        <div className="hidden sm:block">
          <BuyPanel
            shop={shop}
            onPurchase={() => refetch()}
            selectedOffer={selectedOffer}
            onClear={() => setSelectedOffer(null)}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Buy Panel
// ============================================================================

function BuyPanel({ shop, onPurchase, selectedOffer, onClear }: {
  shop: MergedShop;
  onPurchase: () => void;
  selectedOffer: ShopOffer | null;
  onClear: () => void;
}) {
  const { isConnected, handleConnect, eveVault, walletAddress } = useWallet();
  const { character, loading: charLoading } = useCharacter(isConnected ? walletAddress : undefined);
  const dAppKit = useDAppKit();

  const [quantity, setQuantity] = useState("1");
  const [characterId, setCharacterId] = useState("");
  const [charPrefilled, setCharPrefilled] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  if (character && !charPrefilled) {
    setCharacterId(character.objectId);
    setCharPrefilled(true);
  }

  const inStock = selectedOffer
    ? shop.ssu?.inventory.items.find((i) => i.type_id === selectedOffer.resource_type_id)
    : null;
  const maxQty = inStock?.quantity ?? 0;
  const qty = Math.max(1, Math.round(Number(quantity) || 1));
  const totalPrice = selectedOffer ? selectedOffer.price_per_unit * qty : 0;

  async function handleBuy() {
    if (!selectedOffer || !isConnected || !characterId.trim()) return;

    setStatus("loading");
    setMessage("Sign the transaction in your wallet...");

    try {
      const tx = new Transaction();
      const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(totalPrice)]);

      tx.moveCall({
        target: `${VENDOR_PKG}::vendor::buy`,
        arguments: [
          tx.object(VENDOR_CONFIG),
          tx.object(shop.listing.ssu_id),
          tx.object(characterId.trim()),
          tx.pure.u64(selectedOffer.resource_type_id),
          tx.pure.u32(qty),
          payment,
        ],
      });

      const result = await dAppKit.signAndExecuteTransaction({
        transaction: tx as any,
      });

      const digest = (result as any).digest ?? "submitted";
      setStatus("success");
      setMessage(`Purchased ${qty}x ${selectedOffer.resource_name}! Tx: ${digest}`);
      onClear();
      onPurchase();
    } catch (e: any) {
      setStatus("error");
      const msg = e?.message || String(e);
      if (msg.includes("rejected") || msg.includes("denied")) {
        setMessage("Transaction rejected by wallet.");
      } else {
        setMessage(msg);
      }
    }
  }

  const isOwner = isConnected && walletAddress && walletAddress === shop.listing.owner;
  if (!shop.isOnline) return null;
  if (isOwner) return null;
  if (!selectedOffer && !message) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      {!isConnected ? (
        <button
          onClick={() => handleConnect()}
          className="px-3 py-1.5 border border-amber/50 text-amber text-xs font-bold tracking-wider hover:bg-amber/10"
        >
          {eveVault ? "CONNECT EVE VAULT TO BUY" : "NO EVE VAULT"}
        </button>
      ) : selectedOffer ? (
        <div className="space-y-2.5">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-amber font-bold text-sm">{selectedOffer.resource_name}</span>
            <span className="text-xs text-text-dim">
              @ {(selectedOffer.price_per_unit / 1_000_000_000).toFixed(4)} SUI per unit
            </span>
            <button
              onClick={() => { onClear(); setStatus("idle"); setMessage(""); }}
              className="text-[10px] text-text-dim hover:text-red ml-auto tracking-wider cursor-pointer"
            >
              CANCEL
            </button>
          </div>

          {/* Qty + Total row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-text-dim tracking-wider">QTY</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={selectedOffer.min_quantity}
                max={maxQty}
                className="w-20 bg-bg border-2 border-border px-2 py-1 text-sm text-amber text-right focus:border-amber focus:outline-none"
              />
              <span className="text-xs text-text-dim">/ {maxQty.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-dim tracking-wider">TOTAL</span>
              <span className="text-sm text-amber font-bold">
                {(totalPrice / 1_000_000_000).toFixed(4)} SUI
              </span>
            </div>
          </div>

          {/* Character + Buy */}
          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-text-dim tracking-wider shrink-0">CHARACTER</label>
            <input
              type="text"
              placeholder={charLoading ? "Looking up..." : "0x..."}
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              className="flex-1 bg-bg border border-border px-2 py-1 text-xs text-text placeholder:text-text-dim focus:border-amber focus:outline-none font-mono"
            />
            <button
              onClick={handleBuy}
              disabled={status === "loading" || !characterId.trim()}
              className="px-5 py-1 border-2 border-amber text-amber font-bold text-xs tracking-wider hover:bg-amber/10 disabled:opacity-50"
            >
              {status === "loading" ? "..." : "BUY"}
            </button>
          </div>
          {character && characterId === character.objectId && (
            <p className="text-[10px] text-text-dim">{character.name} (auto-detected)</p>
          )}

          {message && (
            <p
              className={`text-xs border px-3 py-2 ${
                status === "success"
                  ? "text-green border-green/30 bg-green/5"
                  : status === "error"
                    ? "text-red border-red/30 bg-red/5"
                    : "text-text-mid border-border"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      ) : message ? (
        <p
          className={`text-xs border px-3 py-2 ${
            status === "success"
              ? "text-green border-green/30 bg-green/5"
              : status === "error"
                ? "text-red border-red/30 bg-red/5"
                : "text-text-mid border-border"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

// ============================================================================
// Share Button
// ============================================================================

function ShareButton({ ssuId }: { ssuId: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/shop/${ssuId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "KARUM Shop", url });
      } catch (_) { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [ssuId]);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleShare(); }}
      className="ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-text-dim hover:text-amber transition-colors cursor-pointer shrink-0"
      title="Copy shop link"
    >
      <svg
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      >
        <path d="M4 12v8h16v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
      {copied ? "COPIED" : "SHARE"}
    </button>
  );
}

