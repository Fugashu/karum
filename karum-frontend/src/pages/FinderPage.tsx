import { useState } from "react";
import { Link } from "react-router-dom";
import { Transaction } from "@mysten/sui/transactions";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { useShops } from "../hooks/use-shops";
import { useFilters, type SortMode } from "../hooks/use-filters";
import { Header } from "../components/Header";
import { useWallet } from "../hooks/use-wallet";
import { useCharacter } from "../hooks/use-character";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { usePurchaseHistory, type Purchase } from "../hooks/use-purchase-history";
import { itemInfo } from "../services/item-types";
import { config } from "../config";
import type { MergedShop, ShopOffer } from "../types";

const VENDOR_PKG = config.vendor.packageId;
const VENDOR_CONFIG = config.vendor.configId;

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "stock-desc", label: "MOST STOCK" },
  { value: "updated-desc", label: "RECENTLY UPDATED" },
  { value: "price-asc", label: "LOWEST PRICE" },
  { value: "name-asc", label: "NAME A-Z" },
];

export function FinderPage() {
  const { data: shops = [], isLoading, error, refetch, isFetching } = useShops();
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

  const account = useCurrentAccount();
  const { data: purchases = [] } = usePurchaseHistory(account?.address);

  const activeSelect = "bg-amber/10 border-amber text-amber";
  const inactiveSelect = "bg-card border-border text-text-mid";

  return (
    <div className="min-h-screen bg-bg">
      <Header
        activePage="/"
        actions={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-8 h-8 flex items-center justify-center border border-border text-text-dim hover:border-amber hover:text-amber disabled:opacity-50 cursor-pointer"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
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
          </button>
        }
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search shops, systems, owners..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border-2 border-border px-4 py-2.5 text-text text-sm placeholder:text-text-dim focus:border-amber focus:outline-none"
          />
        </div>

        {/* Filter row */}
        <div className="flex gap-2 mb-5 flex-wrap items-center">
          <select
            value={filters.resourceTypeId ?? ""}
            onChange={(e) =>
              setResourceType(e.target.value ? Number(e.target.value) : null)
            }
            className={`border-2 px-3 py-2 text-xs focus:border-amber focus:outline-none appearance-none cursor-pointer min-w-[160px] ${
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

          <select
            value={filters.solarSystem ?? ""}
            onChange={(e) => setSolarSystem(e.target.value || null)}
            className={`border-2 px-3 py-2 text-xs focus:border-amber focus:outline-none appearance-none cursor-pointer min-w-[140px] ${
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

          <select
            value={filters.sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="bg-card border-2 border-border px-3 py-2 text-xs text-text-mid focus:border-amber focus:outline-none appearance-none cursor-pointer min-w-[150px]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

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

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setResourceType(null);
                setSolarSystem(null);
                if (filters.onlineOnly) toggleOnlineOnly();
              }}
              className="px-2 py-2 text-xs text-text-dim hover:text-red"
            >
              CLEAR ({activeFilterCount})
            </button>
          )}

          {/* Inline stats */}
          <div className="ml-auto flex gap-4 text-xs text-text-dim">
            <span>
              {filtered.length}{filtered.length !== shops.length ? ` / ${shops.length}` : ""} shops
            </span>
            <span className="text-green">
              {filtered.filter((s) => s.isOnline).length} online
            </span>
            <span>
              {new Set(filtered.flatMap((s) => s.listing.offers.map((o) => o.resource_type_id))).size} resources
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
        {!isLoading && (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-20 text-text-dim">
                {shops.length === 0
                  ? "No shops registered yet."
                  : "No shops match your filters."}
              </div>
            )}
            {filtered.map((shop) => {
              const isMine = account?.address === shop.listing.owner;
              return (
              <div
                key={shop.listing.ssu_id}
                className={`bg-card border-2 transition-colors ${
                  !shop.listing.is_active || !shop.isOnline
                    ? "opacity-50 border-border"
                    : isMine
                      ? "border-amber/40"
                      : "border-border hover:border-border-hover"
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
                    <h3 className="text-base font-bold text-text leading-tight">
                      {shop.listing.name}
                    </h3>
                    {isMine && (
                      <span className="text-[9px] text-amber font-bold tracking-wider border border-amber/40 px-1.5 py-0.5">
                        YOUR SHOP
                      </span>
                    )}
                    {!shop.isOnline && (
                      <span className="text-[9px] text-red font-bold tracking-wider">
                        OFFLINE
                      </span>
                    )}
                    {shop.listing.solar_system && (
                      <Link
                        to={`/navigation?system=${encodeURIComponent(shop.listing.solar_system)}&ssu=${encodeURIComponent(shop.listing.ssu_id)}`}
                        className="text-[10px] text-text-dim border border-border px-1.5 py-0.5 ml-1 hover:border-amber hover:text-amber transition-colors no-underline cursor-pointer"
                      >
                        navigate: {shop.listing.solar_system}
                      </Link>
                    )}
                  </div>
                  {shop.listing.description && (
                    <p className="font-body text-text-dim text-sm leading-relaxed">
                      {shop.listing.description}
                    </p>
                  )}
                </div>

                {/* Offers */}
                <div className="px-5 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {shop.listing.offers.map((offer, i) => {
                      const inStock = shop.ssu?.inventory.items.find(
                        (item) => item.type_id === offer.resource_type_id,
                      );
                      const isFilteredResource =
                        filters.resourceTypeId === offer.resource_type_id;
                      const info = itemInfo(offer.resource_type_id);
                      const stockQty = inStock?.quantity ?? 0;
                      const hasStock = stockQty >= offer.min_quantity;

                      return (
                        <div key={i} className="relative group">
                          <button
                            onClick={() =>
                              setResourceType(
                                isFilteredResource ? null : offer.resource_type_id,
                              )
                            }
                            className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                              isFilteredResource
                                ? "bg-amber/10 border-amber"
                                : "bg-bg border-border hover:border-border-hover"
                            }`}
                          >
                            <span className={isFilteredResource ? "text-amber" : "text-text"}>
                              {offer.resource_name}
                            </span>
                            <span className="text-text-dim">·</span>
                            <span className="text-amber font-bold">
                              {(offer.price_per_unit / 1_000_000_000).toFixed(3)}
                            </span>
                            <span className="text-text-dim text-[10px]">SUI</span>
                            <span className="text-text-dim">·</span>
                            <span className={`font-mono ${hasStock ? "text-green" : "text-red"}`}>
                              {hasStock ? stockQty.toLocaleString() : "0"}
                            </span>
                            <span className="text-text-dim text-[10px]">in stock</span>
                          </button>
                          {info && (
                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 pointer-events-none">
                              <div className="bg-elevated border border-border px-3 py-2 text-xs whitespace-nowrap">
                                <div className="text-text font-bold mb-0.5">{info.name}</div>
                                <div className="text-text-dim">
                                  {info.category} · {info.group}
                                </div>
                                <div className="text-text-dim">
                                  Vol: {info.volume} · Mass: {info.mass}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Buy panel */}
                  <BuyPanel shop={shop} onPurchase={() => refetch()} />
                </div>
              </div>
              );
            })}
          </div>
        )}
        {/* Purchase History */}
        {purchases.length > 0 && (
          <PurchaseHistory purchases={purchases} shops={shops} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 mt-12 text-center text-xs text-text-dim">
        KARUM — The Frontier's First Marketplace Network
      </footer>
    </div>
  );
}

// ============================================================================
// Buy Panel
// ============================================================================

function BuyPanel({ shop, onPurchase }: { shop: MergedShop; onPurchase: () => void }) {
  const { isConnected, handleConnect, eveVault, walletAddress } = useWallet();
  const { character, loading: charLoading } = useCharacter(isConnected ? walletAddress : undefined);
  const dAppKit = useDAppKit();

  const [selectedOffer, setSelectedOffer] = useState<ShopOffer | null>(null);
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
      setSelectedOffer(null);
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

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      {!isConnected ? (
        <button
          onClick={() => handleConnect()}
          className="px-3 py-1.5 border border-amber/50 text-amber text-xs font-bold tracking-wider hover:bg-amber/10"
        >
          {eveVault ? "CONNECT EVE VAULT TO BUY" : "OPEN EVE CLIENT TO BUY"}
        </button>
      ) : !selectedOffer ? (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-text-dim tracking-wider mr-1">BUY</span>
          {shop.listing.offers.map((offer, i) => {
            const stock = shop.ssu?.inventory.items.find(
              (item) => item.type_id === offer.resource_type_id,
            );
            const available = stock && stock.quantity >= offer.min_quantity;
            return (
              <button
                key={i}
                onClick={() => available ? setSelectedOffer(offer) : undefined}
                disabled={!available}
                className={`px-2.5 py-1 border text-xs ${
                  available
                    ? "border-amber/50 text-amber hover:bg-amber/10 cursor-pointer"
                    : "border-border text-text-dim opacity-30 cursor-not-allowed"
                }`}
              >
                {offer.resource_name}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-amber font-bold text-sm">{selectedOffer.resource_name}</span>
            <span className="text-xs text-text-dim">
              @ {(selectedOffer.price_per_unit / 1_000_000_000).toFixed(4)} SUI per unit
            </span>
            <button
              onClick={() => { setSelectedOffer(null); setStatus("idle"); setMessage(""); }}
              className="text-[10px] text-text-dim hover:text-red ml-auto tracking-wider"
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
      )}
    </div>
  );
}

// ============================================================================
// Purchase History
// ============================================================================

function PurchaseHistory({ purchases, shops }: { purchases: Purchase[]; shops: MergedShop[] }) {
  const [expanded, setExpanded] = useState(false);

  const shopName = (ssuId: string) => {
    const shop = shops.find((s) => s.listing.ssu_id === ssuId);
    return shop?.listing.name || `${ssuId.slice(0, 8)}...${ssuId.slice(-4)}`;
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const shown = expanded ? purchases : purchases.slice(0, 3);

  return (
    <div className="mt-8 border-t-2 border-border pt-6">
      <h3 className="text-sm font-bold tracking-wider text-text mb-3">
        YOUR PURCHASES
      </h3>

      <div className="space-y-2">
        {shown.map((p) => (
          <div
            key={`${p.txDigest}-${p.typeId}`}
            className="bg-card border border-border px-4 py-3 flex items-center gap-4 text-sm"
          >
            <div className="flex-1 min-w-0">
              <span className="text-text font-bold">{p.quantity}x</span>{" "}
              <span className="text-text">{p.itemName}</span>
            </div>
            <div className="text-amber font-bold shrink-0">
              {(p.totalPrice / 1_000_000_000).toFixed(4)} SUI
            </div>
            <div className="text-text-dim text-xs shrink-0 text-right min-w-[100px]">
              <div>{shopName(p.ssuId)}</div>
              <div>{timeAgo(p.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>

      {purchases.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-text-dim hover:text-amber tracking-wider"
        >
          {expanded ? "SHOW LESS" : `SHOW ALL (${purchases.length})`}
        </button>
      )}
    </div>
  );
}
