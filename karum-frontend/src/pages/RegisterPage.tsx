import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { useWallet } from "../hooks/use-wallet";
import { useRegisterShop } from "../hooks/use-register-shop";
import { suiClient } from "../services/sui-client";
import { fetchSSU } from "../services/gateway";
import { itemName } from "../services/item-types";
import { config } from "../config";
import type { SSUData, InventoryItem } from "../types";

const PKG =
  "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75";
const ENERGY_CONFIG =
  "0x9285364e8104c04380d9cc4a001bbdfc81a554aad441c2909c2d3bd52a0c9c62";
const VENDOR_PKG = config.vendor.packageId;

interface OfferRow {
  item: InventoryItem;
  resolvedName: string;
  enabled: boolean;
  pricePerUnit: string;
}

interface SSUState {
  data: SSUData;
  objectFields: Record<string, unknown>;
  ownerCapId: string;
  characterId: string;
  isOnline: boolean;
  isAuthorized: boolean;
  networkNodeId: string | null;
}

export function RegisterPage() {
  const {
    eveVault,
    isConnected,
    connecting,
    walletAddress,
    error,
    handleConnect,
    handleDisconnect,
  } = useWallet();

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b-2 border-border px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-2xl font-bold tracking-[0.12em] text-text hover:text-text no-underline">
          K<span className="text-amber">A</span>RUM
        </a>
        <nav className="flex gap-4 text-sm text-text-mid">
          <a href="/" className="hover:text-text">FINDER</a>
          <a href="/register" className="text-amber border-b-2 border-amber pb-1">REGISTER</a>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold tracking-wider mb-6">
          REGISTER YOUR SHOP
        </h2>

        {/* Wallet connection */}
        <div className="bg-card border-2 border-border p-6 mb-6">
          <p className="font-body text-text-mid mb-4">
            Connect your EVE Vault to register an SSU as a public marketplace.
            We'll guide you through each step.
          </p>

          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
              <span className="text-sm text-text-mid font-mono">
                {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
              </span>
              <button
                onClick={handleDisconnect}
                className="ml-auto px-3 py-1.5 border border-border text-xs text-text-dim hover:border-red hover:text-red"
              >
                DISCONNECT
              </button>
            </div>
          ) : (
            <div>
              {eveVault ? (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="px-6 py-3 border-2 border-amber text-amber font-bold text-sm tracking-wider hover:bg-amber/10 disabled:opacity-50"
                >
                  {connecting ? "CONNECTING..." : "CONNECT EVE VAULT"}
                </button>
              ) : (
                <p className="font-body text-text-dim text-sm">
                  EVE Vault not detected. Open the EVE Frontier client to connect.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red border border-red/30 bg-red/5 px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {isConnected && <SetupFlow />}
      </main>
    </div>
  );
}

// ============================================================================
// Unified Setup Flow — Load SSU → Bring Online → Authorize → Set Prices
// ============================================================================

function SetupFlow() {
  const dAppKit = useDAppKit();
  const { registerShop, isPending } = useRegisterShop();

  // SSU loading
  const [ssuId, setSsuId] = useState("");
  const [ssuState, setSsuState] = useState<SSUState | null>(null);
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "error">("idle");
  const [loadError, setLoadError] = useState("");

  // Action feedback
  const [actionStatus, setActionStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [actionMessage, setActionMessage] = useState("");

  // Registration form
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [solarSystem, setSolarSystem] = useState("");
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  // ---- Load SSU ----
  async function handleLoad() {
    const id = ssuId.trim();
    if (!id) return;

    setLoadStatus("loading");
    setLoadError("");
    setSsuState(null);
    setOffers([]);
    setActionStatus("idle");
    setActionMessage("");
    setSubmitStatus("idle");
    setSubmitMessage("");

    try {
      // Fetch live SSU data (inventory, fuel, status)
      const data = await fetchSSU(id);
      if (!data) throw new Error("SSU not found. Check the object ID.");

      // Fetch on-chain object for owner_cap, extension status
      const obj = await suiClient.getObject({
        id,
        options: { showContent: true, showType: true },
      });
      const content = obj.data?.content;
      if (content?.dataType !== "moveObject") throw new Error("Not a Move object");

      const objType = obj.data?.type ?? "";
      if (!objType.includes("::storage_unit::StorageUnit")) {
        throw new Error("Not a StorageUnit.");
      }

      const fields = content.fields as Record<string, unknown>;
      const ownerCapId = fields.owner_cap_id as string;
      if (!ownerCapId) throw new Error("No owner_cap_id on this SSU");

      // Check online status
      const statusField = fields.status as { fields?: { status?: { variant?: string } } } | undefined;
      const isOnline = statusField?.fields?.status?.variant === "ONLINE";

      // Check extension authorization: extension is a TypeName with fields.name containing the witness
      const ext = fields.extension as { fields?: { name?: string } } | undefined;
      const isAuthorized = typeof ext?.fields?.name === "string" && ext.fields.name.includes("KarumAuth");

      // Find Character from OwnerCap
      const capObj = await suiClient.getObject({
        id: ownerCapId,
        options: { showOwner: true },
      });
      const owner = capObj.data?.owner;
      if (!owner || typeof owner !== "object" || !("AddressOwner" in owner)) {
        throw new Error("OwnerCap owner not found — is this your SSU?");
      }
      const characterId = (owner as { AddressOwner: string }).AddressOwner;

      const networkNodeId = (fields.energy_source_id as string) || null;

      setSsuState({
        data,
        objectFields: fields,
        ownerCapId,
        characterId,
        isOnline,
        isAuthorized,
        networkNodeId,
      });

      // Pre-fill form
      if (data.name) setShopName(data.name);

      // Build offers from inventory
      const items = data.inventory.items.filter((item) => item.quantity > 0);
      if (items.length > 0) {
        setOffers(
          items.map((item) => ({
            item,
            resolvedName: itemName(item.type_id) || `Type ${item.type_id}`,
            enabled: true,
            pricePerUnit: "",
          })),
        );
      }

      setLoadStatus("idle");
    } catch (e: any) {
      setLoadError(e?.message || String(e));
      setLoadStatus("error");
    }
  }

  // ---- Bring Online ----
  async function handleBringOnline() {
    if (!ssuState) return;
    const id = ssuId.trim();

    setActionStatus("loading");
    setActionMessage("Sign the transaction in your wallet...");

    try {
      const tx = new Transaction();
      const { characterId, ownerCapId, networkNodeId } = ssuState;

      if (!networkNodeId) throw new Error("SSU has no energy_source_id");

      const [ownerCap, receipt] = tx.moveCall({
        target: `${PKG}::character::borrow_owner_cap`,
        typeArguments: [`${PKG}::storage_unit::StorageUnit`],
        arguments: [tx.object(characterId), tx.object(ownerCapId)],
      });

      tx.moveCall({
        target: `${PKG}::storage_unit::online`,
        arguments: [
          tx.object(id),
          tx.object(networkNodeId),
          tx.object(ENERGY_CONFIG),
          ownerCap,
        ],
      });

      tx.moveCall({
        target: `${PKG}::character::return_owner_cap`,
        typeArguments: [`${PKG}::storage_unit::StorageUnit`],
        arguments: [tx.object(characterId), ownerCap, receipt],
      });

      await dAppKit.signAndExecuteTransaction({ transaction: tx as any });

      setSsuState((prev) => prev ? { ...prev, isOnline: true } : prev);
      setActionStatus("success");
      setActionMessage("SSU is now ONLINE!");
    } catch (e: any) {
      setActionStatus("error");
      const msg = e?.message || String(e);
      setActionMessage(msg.includes("rejected") ? "Transaction rejected." : msg);
    }
  }

  // ---- Authorize Extension ----
  async function handleAuthorize() {
    if (!ssuState) return;
    const id = ssuId.trim();

    setActionStatus("loading");
    setActionMessage("Sign the transaction in your wallet...");

    try {
      const tx = new Transaction();
      const { characterId, ownerCapId } = ssuState;

      const [ownerCap, receipt] = tx.moveCall({
        target: `${PKG}::character::borrow_owner_cap`,
        typeArguments: [`${PKG}::storage_unit::StorageUnit`],
        arguments: [tx.object(characterId), tx.object(ownerCapId)],
      });

      tx.moveCall({
        target: `${VENDOR_PKG}::vendor::authorize`,
        arguments: [tx.object(id), ownerCap],
      });

      tx.moveCall({
        target: `${PKG}::character::return_owner_cap`,
        typeArguments: [`${PKG}::storage_unit::StorageUnit`],
        arguments: [tx.object(characterId), ownerCap, receipt],
      });

      await dAppKit.signAndExecuteTransaction({ transaction: tx as any });

      setSsuState((prev) => prev ? { ...prev, isAuthorized: true } : prev);
      setActionStatus("success");
      setActionMessage("Karum vendor extension authorized!");
    } catch (e: any) {
      setActionStatus("error");
      const msg = e?.message || String(e);
      setActionMessage(msg.includes("rejected") ? "Transaction rejected." : msg);
    }
  }

  // ---- Register Shop ----
  function updateOffer(index: number, field: "enabled" | "pricePerUnit", value: string | boolean) {
    setOffers((prev) => prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitStatus("idle");
    setSubmitMessage("");

    const trimmedName = shopName.trim();
    if (!trimmedName) {
      setSubmitStatus("error");
      setSubmitMessage("Shop name is required.");
      return;
    }

    const enabledOffers = offers.filter((o) => o.enabled);
    if (enabledOffers.length === 0) {
      setSubmitStatus("error");
      setSubmitMessage("Enable at least one offer.");
      return;
    }

    const missingPrices = enabledOffers.filter((o) => !o.pricePerUnit || Number(o.pricePerUnit) <= 0);
    if (missingPrices.length > 0) {
      setSubmitStatus("error");
      setSubmitMessage(`Set a price for: ${missingPrices.map((o) => o.resolvedName).join(", ")}`);
      return;
    }

    try {
      await registerShop({
        ssuId: ssuId.trim(),
        name: trimmedName,
        description: description.trim(),
        solarSystem: solarSystem.trim(),
        offers: enabledOffers.map((o) => ({
          resourceName: o.resolvedName,
          resourceTypeId: o.item.type_id,
          pricePerUnit: Math.round(Number(o.pricePerUnit) * 1_000_000_000),
          minQuantity: 1,
        })),
      });

      setSubmitStatus("success");
      setSubmitMessage("Shop registered on-chain! It will appear on the Finder page.");
    } catch (err: any) {
      setSubmitStatus("error");
      const msg = err?.message || String(err);
      setSubmitMessage(msg.includes("rejected") ? "Transaction rejected." : msg);
    }
  }

  const fuelPercent =
    ssuState?.data.fuel && ssuState.data.fuel.maxCapacity > 0
      ? Math.round((ssuState.data.fuel.quantity / ssuState.data.fuel.maxCapacity) * 100)
      : 0;

  const inputClass =
    "w-full bg-bg border-2 border-border px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:border-amber focus:outline-none";

  // Determine current step
  const step = !ssuState ? 1 : !ssuState.isOnline ? 2 : !ssuState.isAuthorized ? 3 : 4;

  return (
    <div className="space-y-4">
      {/* Step 1: Load SSU */}
      <div className="bg-card border-2 border-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <StepBadge n={1} active={step === 1} done={step > 1} />
          <h3 className="text-sm font-bold tracking-wider">LOAD YOUR SSU</h3>
        </div>
        <p className="font-body text-text-dim text-sm mb-4">
          Paste your Smart Storage Unit's in-game assembly ID.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="0x..."
            value={ssuId}
            onChange={(e) => setSsuId(e.target.value)}
            className="flex-1 bg-bg border-2 border-border px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:border-amber focus:outline-none font-mono"
          />
          <button
            onClick={handleLoad}
            disabled={loadStatus === "loading" || !ssuId.trim()}
            className="px-5 py-2.5 border-2 border-amber text-amber font-bold text-sm tracking-wider hover:bg-amber/10 disabled:opacity-50"
          >
            {loadStatus === "loading" ? "..." : "LOAD"}
          </button>
        </div>

        {loadError && (
          <p className="mt-3 text-sm text-red border border-red/30 bg-red/5 px-3 py-2">
            {loadError}
          </p>
        )}

        {/* SSU info card */}
        {ssuState && (
          <div className="mt-4 border border-border p-4">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`w-2.5 h-2.5 shrink-0 ${
                  ssuState.isOnline
                    ? "bg-green shadow-[0_0_6px_rgba(74,222,128,0.6)]"
                    : "bg-red"
                }`}
              />
              <span className="text-text font-bold">
                {ssuState.data.name || "Unnamed SSU"}
              </span>
              <span className={`text-xs font-bold ${ssuState.isOnline ? "text-green" : "text-red"}`}>
                {ssuState.isOnline ? "ONLINE" : "OFFLINE"}
              </span>
              <span className={`text-xs font-bold ${ssuState.isAuthorized ? "text-green" : "text-text-dim"}`}>
                {ssuState.isAuthorized ? "AUTHORIZED" : "NOT AUTHORIZED"}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-text-dim">
              <span>Fuel: <span className={fuelPercent > 20 ? "text-green" : "text-red"}>{fuelPercent}%</span></span>
              <span>Items: {ssuState.data.inventory.items.filter((i) => i.quantity > 0).length}</span>
              <span>Capacity: {ssuState.data.inventory.usedCapacity}/{ssuState.data.inventory.capacity}</span>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Bring Online */}
      {ssuState && (
        <div className={`bg-card border-2 p-6 ${step === 2 ? "border-amber" : "border-border"}`}>
          <div className="flex items-center gap-3 mb-3">
            <StepBadge n={2} active={step === 2} done={ssuState.isOnline} />
            <h3 className="text-sm font-bold tracking-wider">BRING ONLINE</h3>
          </div>

          {ssuState.isOnline ? (
            <p className="text-sm text-green">SSU is online.</p>
          ) : (
            <>
              <p className="font-body text-text-dim text-sm mb-4">
                Your SSU must be online before it can accept purchases.
              </p>
              <button
                onClick={handleBringOnline}
                disabled={actionStatus === "loading"}
                className="px-5 py-2.5 border-2 border-amber text-amber font-bold text-sm tracking-wider hover:bg-amber/10 disabled:opacity-50"
              >
                {actionStatus === "loading" && step === 2 ? "..." : "BRING ONLINE"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 3: Authorize Extension */}
      {ssuState && ssuState.isOnline && (
        <div className={`bg-card border-2 p-6 ${step === 3 ? "border-amber" : "border-border"}`}>
          <div className="flex items-center gap-3 mb-3">
            <StepBadge n={3} active={step === 3} done={ssuState.isAuthorized} />
            <h3 className="text-sm font-bold tracking-wider">AUTHORIZE VENDOR</h3>
          </div>

          {ssuState.isAuthorized ? (
            <p className="text-sm text-green">Karum vendor extension authorized.</p>
          ) : (
            <>
              <p className="font-body text-text-dim text-sm mb-4">
                Authorize Karum to handle trades on your SSU. This lets buyers purchase items
                directly from your inventory by paying SUI. Required once per SSU.
              </p>
              <button
                onClick={handleAuthorize}
                disabled={actionStatus === "loading"}
                className="px-5 py-2.5 border-2 border-amber text-amber font-bold text-sm tracking-wider hover:bg-amber/10 disabled:opacity-50"
              >
                {actionStatus === "loading" && step === 3 ? "..." : "AUTHORIZE"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Action feedback (shared between online + authorize) */}
      {actionMessage && (
        <p
          className={`text-sm border px-3 py-2 ${
            actionStatus === "success"
              ? "text-green border-green/30 bg-green/5"
              : actionStatus === "error"
                ? "text-red border-red/30 bg-red/5"
                : "text-text-mid border-border"
          }`}
        >
          {actionMessage}
        </p>
      )}

      {/* Step 4: Set Prices + Register */}
      {ssuState && ssuState.isOnline && ssuState.isAuthorized && offers.length > 0 && (
        <form onSubmit={handleSubmit} className="bg-card border-2 border-amber p-6">
          <div className="flex items-center gap-3 mb-4">
            <StepBadge n={4} active={step === 4} done={submitStatus === "success"} />
            <h3 className="text-sm font-bold tracking-wider">SET PRICES & REGISTER</h3>
          </div>

          {/* Shop Name */}
          <div className="mb-4">
            <label className="block text-xs text-text-dim tracking-wider mb-1.5">SHOP NAME *</label>
            <input
              type="text"
              placeholder="e.g. Fugashu's Fuel Depot"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              maxLength={64}
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-xs text-text-dim tracking-wider mb-1.5">DESCRIPTION</label>
            <textarea
              placeholder="What does your shop offer? Tips for buyers?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={280}
              rows={2}
              className={`${inputClass} resize-none font-body`}
            />
            <p className="text-xs text-text-dim mt-1 text-right">{description.length}/280</p>
          </div>

          {/* Solar System */}
          <div className="mb-6">
            <label className="block text-xs text-text-dim tracking-wider mb-1.5">SOLAR SYSTEM</label>
            <input
              type="text"
              placeholder="e.g. EFOS-0S3"
              value={solarSystem}
              onChange={(e) => setSolarSystem(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Inventory offers */}
          <div className="mb-6">
            <h4 className="text-xs text-text-dim tracking-wider mb-3">
              INVENTORY — SET PRICES FOR ITEMS YOU WANT TO SELL
            </h4>

            <div className="space-y-2">
              {offers.map((offer, i) => (
                <div
                  key={offer.item.type_id}
                  className={`flex items-center gap-3 border px-4 py-3 ${
                    offer.enabled ? "border-border" : "border-border opacity-40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => updateOffer(i, "enabled", !offer.enabled)}
                    className={`w-5 h-5 border-2 shrink-0 flex items-center justify-center text-xs ${
                      offer.enabled
                        ? "border-amber bg-amber/10 text-amber"
                        : "border-border text-transparent"
                    }`}
                  >
                    {offer.enabled ? "+" : ""}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text font-bold truncate">{offer.resolvedName}</div>
                    <div className="text-xs text-text-dim">{offer.item.quantity.toLocaleString()} in stock</div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={offer.pricePerUnit}
                      onChange={(e) => updateOffer(i, "pricePerUnit", e.target.value)}
                      min="0"
                      step="0.001"
                      disabled={!offer.enabled}
                      className="w-24 bg-bg border-2 border-border px-2 py-1.5 text-sm text-amber text-right focus:border-amber focus:outline-none disabled:opacity-30"
                    />
                    <span className="text-xs text-text-dim">SUI</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-2 text-xs text-text-dim px-12">
              <span className="flex-1" />
              <span className="w-28 text-right">price per unit</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 border-2 border-amber text-amber font-bold text-sm tracking-wider hover:bg-amber/10 disabled:opacity-50"
          >
            {isPending ? "REGISTERING..." : "REGISTER SHOP"}
          </button>

          {submitMessage && (
            <p
              className={`mt-4 text-sm border px-3 py-2 ${
                submitStatus === "success"
                  ? "text-green border-green/30 bg-green/5"
                  : "text-red border-red/30 bg-red/5"
              }`}
            >
              {submitMessage}
            </p>
          )}
        </form>
      )}

      {/* No inventory warning */}
      {ssuState && ssuState.isOnline && ssuState.isAuthorized && offers.length === 0 && (
        <div className="bg-card border-2 border-border p-6">
          <p className="text-sm text-red">
            SSU has no items in inventory. Stock it first, then reload.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step Badge
// ============================================================================

function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span
      className={`w-6 h-6 flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
        done
          ? "border-green bg-green/10 text-green"
          : active
            ? "border-amber bg-amber/10 text-amber"
            : "border-border text-text-dim"
      }`}
    >
      {done ? "\u2713" : n}
    </span>
  );
}
