import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Transaction } from "@mysten/sui/transactions";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { useShops } from "../hooks/use-shops";
import { useWallet } from "../hooks/use-wallet";
import { useCharacter } from "../hooks/use-character";
import { useOwnerNames } from "../hooks/use-owner-names";
import { useRemoveShop } from "../hooks/use-deactivate-shop";

import { itemInfo } from "../services/item-types";
import { getEnvConfig } from "../env-config";
import type { MergedShop, ShopOffer } from "../types";

export function ShopPage() {
  const { ssuId } = useParams<{ ssuId: string }>();
  const { data: shops = [], isLoading } = useShops();
  const { data: ownerNames } = useOwnerNames();

  const shop = useMemo(
    () => shops.find((s) => s.listing.ssu_id === ssuId) ?? null,
    [shops, ssuId],
  );

  return (
    <div className="min-h-screen bg-bg">


      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-text-dim hover:text-amber tracking-wider mb-6"
        >
          <span>&larr;</span> ALL SHOPS
        </Link>

        {isLoading && (
          <div className="text-center py-20 text-text-dim">Loading shop...</div>
        )}

        {!isLoading && !shop && (
          <div className="text-center py-20">
            <p className="text-text-dim text-sm mb-4">Shop not found.</p>
            <p className="text-text-dim text-xs font-mono mb-6">
              {ssuId}
            </p>
            <Link
              to="/"
              className="px-4 py-2 border-2 border-amber text-amber text-xs font-bold tracking-wider hover:bg-amber/10"
            >
              BROWSE ALL SHOPS
            </Link>
          </div>
        )}

        {shop && <ShopDetail shop={shop} ownerNames={ownerNames} />}
      </main>
    </div>
  );
}

// ============================================================================
// Shop Detail
// ============================================================================

function ShopDetail({ shop, ownerNames }: { shop: MergedShop; ownerNames?: Map<string, string> }) {
  const { isConnected, walletAddress } = useWallet();
  const isMine = isConnected && walletAddress === shop.listing.owner;

  const fuelPercent =
    shop.ssu?.fuel && shop.ssu.fuel.maxCapacity > 0
      ? Math.round((shop.ssu.fuel.quantity / shop.ssu.fuel.maxCapacity) * 100)
      : 0;

  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = `${window.location.origin}/shop/${shop.listing.ssu_id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className={`bg-card border-2 ${
        isMine ? "border-amber/40" : "border-border"
      } ${!shop.isOnline ? "opacity-60" : ""}`}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-2">
          <span
            className={`w-2.5 h-2.5 shrink-0 ${
              shop.isOnline
                ? "bg-green shadow-[0_0_6px_rgba(74,222,128,0.6)]"
                : "bg-red"
            }`}
          />
          <h2 className="text-lg font-bold text-text">{shop.listing.name}</h2>
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
          <button
            onClick={handleShare}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 border border-border text-xs text-text-dim hover:border-amber hover:text-amber cursor-pointer transition-colors"
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
        </div>

        {shop.listing.description && (
          <p className="font-body text-text-mid text-sm leading-relaxed mb-3">
            {shop.listing.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-4 text-xs text-text-dim">
          {shop.listing.solar_system && (
            <Link
              to={`/navigation?system=${encodeURIComponent(shop.listing.solar_system)}&ssu=${encodeURIComponent(shop.listing.ssu_id)}`}
              className="hover:text-amber transition-colors"
            >
              {shop.listing.solar_system}
            </Link>
          )}
          <span>
            Fuel:{" "}
            <span className={fuelPercent > 20 ? "text-green" : "text-red"}>
              {fuelPercent}%
            </span>
          </span>
          <span>
            Owner:{" "}
            {ownerNames?.get(shop.listing.owner.toLowerCase()) || (
              <span className="font-mono">
                {shop.listing.owner.slice(0, 6)}...{shop.listing.owner.slice(-4)}
              </span>
            )}
          </span>
          <button
            type="button"
            className="group font-mono inline-flex items-center gap-1 hover:text-amber transition-colors cursor-pointer"
            onClick={(e) => {
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
        </div>
      </div>

      {/* Offers */}
      <div className="px-6 pb-5 border-t border-border/50 pt-4">
        <h3 className="text-xs text-text-dim tracking-wider mb-3">OFFERS</h3>
        <div className="space-y-2">
          {shop.listing.offers.map((offer, i) => {
            const inStock = shop.ssu?.inventory.items.find(
              (item) => item.type_id === offer.resource_type_id,
            );
            const stockQty = inStock?.quantity ?? 0;
            const hasStock = stockQty >= offer.min_quantity;
            const info = itemInfo(offer.resource_type_id);

            return (
              <div
                key={i}
                className="flex items-center gap-3 bg-bg border border-border px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text font-bold">
                    {offer.resource_name}
                  </div>
                  {info && (
                    <div className="text-[10px] text-text-dim mt-0.5">
                      {info.category} · {info.group}
                    </div>
                  )}
                </div>
                <div className="text-amber font-bold text-sm shrink-0">
                  {(offer.price_per_unit / 1_000_000_000).toFixed(3)} SUI
                </div>
                <div
                  className={`text-sm font-mono shrink-0 ${
                    hasStock ? "text-green" : "text-red"
                  }`}
                >
                  {stockQty.toLocaleString()}
                </div>
                <span className="text-[10px] text-text-dim shrink-0">
                  in stock
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buy panel (desktop only — wallet not available on mobile) */}
      <div className="hidden sm:block px-6 pb-5">
        <ShopBuyPanel shop={shop} />
      </div>

      {/* Owner controls */}
      {isMine && (
        <div className="px-6 pb-5">
          <ShopOwnerControls shop={shop} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Owner Controls — deactivate / reactivate shop
// ============================================================================

function ShopOwnerControls({ shop }: { shop: MergedShop }) {
  const { removeShop, isRemoving } = useRemoveShop();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function handleRemove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setStatus("idle");
    setMessage("");
    try {
      await removeShop(shop.listing.ssu_id);
      setStatus("success");
      setMessage(
        "Shop removed from the registry. You can re-register it anytime.",
      );
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message || String(e));
    }
  }

  return (
    <div className="border-t border-border/50 pt-4 space-y-3">
      <h3 className="text-xs text-text-dim tracking-wider">MANAGE SHOP</h3>

      <div className="flex items-center gap-3 flex-wrap">
        {confirming ? (
          <>
            <span className="text-xs text-text-mid">
              This will permanently remove your shop from the registry. You can
              re-register later.
            </span>
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className="px-4 py-1.5 border-2 border-red text-red text-xs font-bold tracking-wider hover:bg-red/10 disabled:opacity-50 cursor-pointer"
            >
              {isRemoving ? "..." : "YES, REMOVE"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-4 py-1.5 border border-border text-text-dim text-xs tracking-wider hover:border-text-dim cursor-pointer"
            >
              CANCEL
            </button>
          </>
        ) : (
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="px-4 py-1.5 border-2 border-red/50 text-red text-xs font-bold tracking-wider hover:bg-red/10 disabled:opacity-50 cursor-pointer"
          >
            REMOVE SHOP
          </button>
        )}
      </div>

      {message && (
        <p
          className={`text-xs border px-3 py-2 ${
            status === "success"
              ? "text-green border-green/30 bg-green/5"
              : "text-red border-red/30 bg-red/5"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Buy Panel (same logic as FinderPage but standalone)
// ============================================================================

function ShopBuyPanel({ shop }: { shop: MergedShop }) {
  const { isConnected, handleConnect, eveVault, walletAddress } = useWallet();
  const { character, loading: charLoading } = useCharacter(
    isConnected ? walletAddress : undefined,
  );
  const dAppKit = useDAppKit();

  const [selectedOffer, setSelectedOffer] = useState<ShopOffer | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [characterId, setCharacterId] = useState("");
  const [charPrefilled, setCharPrefilled] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  if (character && !charPrefilled) {
    setCharacterId(character.objectId);
    setCharPrefilled(true);
  }

  const inStock = selectedOffer
    ? shop.ssu?.inventory.items.find(
        (i) => i.type_id === selectedOffer.resource_type_id,
      )
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

      const envCfg = getEnvConfig();
      tx.moveCall({
        target: `${envCfg.vendorPackageId}::vendor::buy`,
        arguments: [
          tx.object(envCfg.vendorConfigId),
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
      setMessage(
        `Purchased ${qty}x ${selectedOffer.resource_name}! Tx: ${digest}`,
      );
      setSelectedOffer(null);
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

  const isOwner =
    isConnected && walletAddress && walletAddress === shop.listing.owner;
  if (!shop.isOnline) return null;
  if (isOwner) return null;

  return (
    <div className="border-t border-border/50 pt-4">
      {!isConnected ? (
        <button
          onClick={() => handleConnect()}
          className="px-4 py-2 border-2 border-amber text-amber text-xs font-bold tracking-wider hover:bg-amber/10 cursor-pointer"
        >
          {eveVault ? "CONNECT EVE VAULT TO BUY" : "NO EVE VAULT"}
        </button>
      ) : !selectedOffer ? (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-text-dim tracking-wider mr-1">
            BUY
          </span>
          {shop.listing.offers.map((offer, i) => {
            const stock = shop.ssu?.inventory.items.find(
              (item) => item.type_id === offer.resource_type_id,
            );
            const available = stock && stock.quantity >= offer.min_quantity;
            return (
              <button
                key={i}
                onClick={() => (available ? setSelectedOffer(offer) : undefined)}
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
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-amber font-bold text-sm">
              {selectedOffer.resource_name}
            </span>
            <span className="text-xs text-text-dim">
              @ {(selectedOffer.price_per_unit / 1_000_000_000).toFixed(4)} SUI
              per unit
            </span>
            <button
              onClick={() => {
                setSelectedOffer(null);
                setStatus("idle");
                setMessage("");
              }}
              className="text-[10px] text-text-dim hover:text-red ml-auto tracking-wider cursor-pointer"
            >
              CANCEL
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-text-dim tracking-wider">
                QTY
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={selectedOffer.min_quantity}
                max={maxQty}
                className="w-20 bg-bg border-2 border-border px-2 py-1 text-sm text-amber text-right focus:border-amber focus:outline-none"
              />
              <span className="text-xs text-text-dim">
                / {maxQty.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-dim tracking-wider">
                TOTAL
              </span>
              <span className="text-sm text-amber font-bold">
                {(totalPrice / 1_000_000_000).toFixed(4)} SUI
              </span>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-text-dim tracking-wider shrink-0">
              CHARACTER
            </label>
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
              className="px-5 py-1 border-2 border-amber text-amber font-bold text-xs tracking-wider hover:bg-amber/10 disabled:opacity-50 cursor-pointer"
            >
              {status === "loading" ? "..." : "BUY"}
            </button>
          </div>
          {character && characterId === character.objectId && (
            <p className="text-[10px] text-text-dim">
              {character.name} (auto-detected)
            </p>
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
