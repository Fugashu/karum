/**
 * Bring a Network Node online on EVE Frontier (Sui testnet).
 *
 * Usage:
 *   PRIVATE_KEY=suiprivkey1... npx tsx scripts/online-nwn.ts
 *
 * The private key is your EVE Frontier wallet key (the one that controls
 * your character). You can export it from your wallet settings.
 *
 * Object IDs are hardcoded from on-chain data for Fugashu's deployment.
 * If you need to bring a different node online, update the constants below.
 */

import { Transaction } from "@mysten/sui/transactions";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

// ============================================================================
// Configuration — update these if your objects differ
// ============================================================================

const PACKAGE_ID =
  "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75";

const NETWORK_NODE_ID =
  "0x0fe4c18a3825baccf91055d2d8d097e545322a6cd725b47c09e26b7edbd1b3e0";

const OWNER_CAP_ID =
  "0xe0d6e419e0344e6a8a4a232edeb33c38dd7f38cf79ae09185c8cf0555bb9fd05";

const CHARACTER_ID =
  "0x51b28253bafccb33ed0cebed09d5079a7e005e1aed9919afa9fe31f4698d04e1";

const CLOCK = "0x6";

// ============================================================================
// Script
// ============================================================================

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("Set PRIVATE_KEY env var. Example:");
    console.error("  PRIVATE_KEY=suiprivkey1... npx tsx scripts/online-nwn.ts");
    process.exit(1);
  }

  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const address = keypair.getPublicKey().toSuiAddress();
  console.log("Wallet address:", address);

  const client = new SuiJsonRpcClient({
    network: "testnet",
    url: "https://fullnode.testnet.sui.io:443",
  });

  // Verify current status
  const nodeObj = await client.getObject({
    id: NETWORK_NODE_ID,
    options: { showContent: true },
  });
  const content = nodeObj.data?.content;
  const fields = (content?.dataType === "moveObject" ? content.fields : {}) as Record<string, any>;
  const status = fields?.status?.fields?.status;
  console.log("Current NWN status:", status?.variant ?? "unknown");

  if (status?.variant === "ONLINE") {
    console.log("Already online! Nothing to do.");
    return;
  }

  console.log("\nBuilding transaction to bring NetworkNode online...");

  const tx = new Transaction();

  // 1. Borrow OwnerCap from character
  const [ownerCap, receipt] = tx.moveCall({
    target: `${PACKAGE_ID}::character::borrow_owner_cap`,
    typeArguments: [`${PACKAGE_ID}::network_node::NetworkNode`],
    arguments: [tx.object(CHARACTER_ID), tx.object(OWNER_CAP_ID)],
  });

  // 2. Bring the network node online
  tx.moveCall({
    target: `${PACKAGE_ID}::network_node::online`,
    arguments: [tx.object(NETWORK_NODE_ID), ownerCap, tx.object(CLOCK)],
  });

  // 3. Return OwnerCap to character
  tx.moveCall({
    target: `${PACKAGE_ID}::character::return_owner_cap`,
    typeArguments: [`${PACKAGE_ID}::network_node::NetworkNode`],
    arguments: [tx.object(CHARACTER_ID), ownerCap, receipt],
  });

  console.log("Signing and executing...");

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  console.log("\nTransaction digest:", result.digest);
  console.log(
    "Status:",
    result.effects?.status?.status ?? "unknown",
  );

  if (result.effects?.status?.status === "success") {
    console.log("\nNetwork Node is now ONLINE!");
  } else {
    console.error("\nTransaction failed:", result.effects?.status);
  }
}

main().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
