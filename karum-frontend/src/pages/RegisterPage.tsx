import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useDAppKit } from "@mysten/dapp-kit-react";
import { useWallet } from "../hooks/use-wallet";
import { suiClient } from "../services/sui-client";

const PKG =
  "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75";
const ENERGY_CONFIG =
  "0x9285364e8104c04380d9cc4a001bbdfc81a554aad441c2909c2d3bd52a0c9c62";

export function RegisterPage() {
  const {
    wallets,
    isConnected,
    connecting,
    walletAddress,
    hasEveVault,
    error,
    handleConnect,
    handleDisconnect,
  } = useWallet();

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b-2 border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-[0.12em] text-text">
          K<span className="text-amber">A</span>RUM
        </h1>
        <nav className="flex gap-4 text-sm text-text-mid">
          <a href="/" className="hover:text-text">FINDER</a>
          <a href="/register" className="text-amber border-b-2 border-amber pb-1">REGISTER</a>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold tracking-wider mb-6">
          REGISTER YOUR SHOP
        </h2>

        <div className="bg-card border-2 border-border p-6 mb-6">
          <p className="font-body text-text-mid mb-4">
            Connect your wallet to register an SSU as a public marketplace.
            Declare what you sell, set your prices, and appear on the Karum network.
          </p>

          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-green shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                <span className="text-sm text-text-mid font-mono">
                  {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 border-2 border-border text-sm text-text-dim hover:border-red hover:text-red"
              >
                DISCONNECT
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.length > 0 ? (
                <>
                  <button
                    onClick={() => handleConnect()}
                    disabled={connecting}
                    className="px-6 py-3 border-2 border-amber text-amber font-bold text-sm tracking-wider hover:bg-amber/10 disabled:opacity-50"
                  >
                    {connecting
                      ? "CONNECTING..."
                      : hasEveVault
                        ? "CONNECT EVE VAULT"
                        : `CONNECT ${wallets[0].name.toUpperCase()}`}
                  </button>

                  {wallets.length > 1 && (
                    <div className="pt-2">
                      <p className="text-xs text-text-dim mb-2">
                        Other wallets:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {wallets
                          .filter((w) =>
                            hasEveVault
                              ? !w.name.includes("Eve Vault") &&
                                !w.name.includes("EVE Frontier")
                              : w !== wallets[0],
                          )
                          .map((w) => (
                            <button
                              key={w.name}
                              onClick={() => handleConnect(w.name)}
                              disabled={connecting}
                              className="px-3 py-2 border border-border text-xs text-text-mid hover:border-border-hover hover:text-text disabled:opacity-50"
                            >
                              {w.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red">
                    No Sui wallet detected.
                  </p>
                  <p className="font-body text-text-dim text-sm">
                    Install{" "}
                    <a
                      href="https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber underline"
                    >
                      Sui Wallet
                    </a>{" "}
                    or EVE Vault to continue.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red border border-red/30 bg-red/5 px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Bring assemblies online via wallet */}
        {isConnected && <BringOnline />}

        <div className="bg-card border border-border p-6 text-text-dim text-sm">
          <p className="font-body">
            Registration form coming soon. You will need the Sui object ID of your
            deployed Smart Storage Unit.
          </p>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// Bring Assembly Online — auto-detects NetworkNode vs StorageUnit
// ============================================================================

function BringOnline() {
  const dAppKit = useDAppKit();
  const [objectId, setObjectId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleOnline() {
    const id = objectId.trim();
    if (!id) return;

    setStatus("loading");
    setMessage("Reading object...");

    try {
      // 1. Read the object to determine its type
      const obj = await suiClient.getObject({
        id,
        options: { showContent: true, showType: true },
      });

      const content = obj.data?.content;
      if (content?.dataType !== "moveObject") {
        throw new Error("Not a Move object");
      }

      const objType = obj.data?.type ?? "";
      const fields = content.fields as Record<string, unknown>;
      const ownerCapId = fields.owner_cap_id as string;
      if (!ownerCapId) throw new Error("No owner_cap_id on this object");

      // Check current status
      const statusField = fields.status as { fields?: { status?: { variant?: string } } } | undefined;
      const currentStatus = statusField?.fields?.status?.variant;
      if (currentStatus === "ONLINE") {
        setStatus("success");
        setMessage("Already ONLINE!");
        return;
      }

      // Detect type
      const isNetworkNode = objType.includes("::network_node::NetworkNode");
      const isStorageUnit = objType.includes("::storage_unit::StorageUnit");

      if (!isNetworkNode && !isStorageUnit) {
        throw new Error(`Unsupported type: ${objType.split("::").pop()}`);
      }

      // 2. Find the character that owns the OwnerCap
      setMessage("Finding character...");
      const capObj = await suiClient.getObject({
        id: ownerCapId,
        options: { showOwner: true },
      });

      const owner = capObj.data?.owner;
      if (!owner || typeof owner !== "object" || !("AddressOwner" in owner)) {
        throw new Error("OwnerCap owner not found — is this your node?");
      }
      const characterId = (owner as { AddressOwner: string }).AddressOwner;

      // 3. Build the transaction
      setMessage("Sign the transaction in your wallet...");
      const tx = new Transaction();

      if (isNetworkNode) {
        const [ownerCap, receipt] = tx.moveCall({
          target: `${PKG}::character::borrow_owner_cap`,
          typeArguments: [`${PKG}::network_node::NetworkNode`],
          arguments: [tx.object(characterId), tx.object(ownerCapId)],
        });

        tx.moveCall({
          target: `${PKG}::network_node::online`,
          arguments: [tx.object(id), ownerCap, tx.object("0x6")],
        });

        tx.moveCall({
          target: `${PKG}::character::return_owner_cap`,
          typeArguments: [`${PKG}::network_node::NetworkNode`],
          arguments: [tx.object(characterId), ownerCap, receipt],
        });
      } else {
        // StorageUnit — also needs networkNodeId and energyConfig
        const networkNodeId = fields.energy_source_id as string;
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
      }

      const result = await dAppKit.signAndExecuteTransaction({
        transaction: tx as any,
      });

      const digest = (result as any).digest ?? "submitted";
      const label = isNetworkNode ? "Network Node" : "Storage Unit";
      setStatus("success");
      setMessage(`${label} is ONLINE! Tx: ${digest}`);
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message || String(e));
    }
  }

  return (
    <div className="bg-card border-2 border-border p-6 mb-6">
      <h3 className="text-sm font-bold tracking-wider mb-3">
        BRING ONLINE
      </h3>
      <p className="font-body text-text-dim text-sm mb-4">
        Paste the Sui object ID of your Network Node or Storage Unit.
        Auto-detects the type and builds the right transaction.
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="0x... (NetworkNode or StorageUnit)"
          value={objectId}
          onChange={(e) => setObjectId(e.target.value)}
          className="flex-1 bg-bg border-2 border-border px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:border-amber focus:outline-none font-mono"
        />
        <button
          onClick={handleOnline}
          disabled={status === "loading" || !objectId.trim()}
          className="px-5 py-2.5 border-2 border-amber text-amber font-bold text-sm tracking-wider hover:bg-amber/10 disabled:opacity-50"
        >
          {status === "loading" ? "..." : "ONLINE"}
        </button>
      </div>

      {message && (
        <p
          className={`text-sm border px-3 py-2 ${
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
  );
}
