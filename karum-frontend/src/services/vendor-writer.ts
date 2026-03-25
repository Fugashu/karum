/**
 * Builds Transaction objects for the Karum Vendor extension.
 * Never signs — signing happens in hooks via dapp-kit.
 *
 * Contract: karum_vendor::vendor
 * Functions: authorize, set_price, remove_price, buy
 */

import { Transaction } from "@mysten/sui/transactions";
import { getEnvConfig } from "../env-config";

/**
 * Build a PTB that authorizes the Karum extension on an SSU.
 * Must be called once by the SSU owner before buyers can purchase.
 *
 * Requires: StorageUnit (mut), OwnerCap<StorageUnit>
 */
export function buildAuthorizeTx(
  storageUnitId: string,
  ownerCapId: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${getEnvConfig().vendorPackageId}::vendor::authorize`,
    arguments: [
      tx.object(storageUnitId),
      tx.object(ownerCapId),
    ],
  });
  return tx;
}

/**
 * Build a PTB that sets a price for a resource type on an SSU.
 * Can be called multiple times to update prices.
 *
 * @param ssuId - The SSU's on-chain address
 * @param typeId - The EVE resource type ID (e.g. 77728 for Sophrogon)
 * @param pricePerUnit - Price in MIST (1 SUI = 1,000,000,000 MIST)
 * @param minQuantity - Minimum purchase quantity
 */
export function buildSetPriceTx(
  ssuId: string,
  typeId: number,
  pricePerUnit: number,
  minQuantity: number,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${getEnvConfig().vendorPackageId}::vendor::set_price`,
    arguments: [
      tx.object(getEnvConfig().vendorConfigId),
      tx.pure.address(ssuId),
      tx.pure.u64(typeId),
      tx.pure.u64(pricePerUnit),
      tx.pure.u32(minQuantity),
    ],
  });
  return tx;
}

/**
 * Build a PTB that removes a price listing for a resource type.
 */
export function buildRemovePriceTx(
  ssuId: string,
  typeId: number,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${getEnvConfig().vendorPackageId}::vendor::remove_price`,
    arguments: [
      tx.object(getEnvConfig().vendorConfigId),
      tx.pure.address(ssuId),
      tx.pure.u64(typeId),
    ],
  });
  return tx;
}

/**
 * Build a PTB that purchases items from an SSU.
 *
 * The buyer's Character object is required — it determines which
 * inventory slot the items get deposited into on the SSU.
 *
 * @param storageUnitId - The SSU object to buy from
 * @param buyerCharacterId - The buyer's Character object ID
 * @param typeId - The resource type to buy
 * @param quantity - How many to buy
 * @param totalPriceMist - Exact total price in MIST (price_per_unit × quantity)
 */
export function buildBuyTx(
  storageUnitId: string,
  buyerCharacterId: string,
  typeId: number,
  quantity: number,
  totalPriceMist: number,
): Transaction {
  const tx = new Transaction();

  // Split exact payment from gas coin
  const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(totalPriceMist)]);

  tx.moveCall({
    target: `${getEnvConfig().vendorPackageId}::vendor::buy`,
    arguments: [
      tx.object(getEnvConfig().vendorConfigId),
      tx.object(storageUnitId),
      tx.object(buyerCharacterId),
      tx.pure.u64(typeId),
      tx.pure.u32(quantity),
      payment,
    ],
  });

  return tx;
}

/**
 * Build a PTB that sets prices for multiple resource types in one transaction.
 * Useful when configuring a shop for the first time.
 */
export function buildSetPricesBatchTx(
  ssuId: string,
  prices: Array<{ typeId: number; pricePerUnit: number; minQuantity: number }>,
): Transaction {
  const tx = new Transaction();
  for (const p of prices) {
    tx.moveCall({
      target: `${getEnvConfig().vendorPackageId}::vendor::set_price`,
      arguments: [
        tx.object(getEnvConfig().vendorConfigId),
        tx.pure.address(ssuId),
        tx.pure.u64(p.typeId),
        tx.pure.u64(p.pricePerUnit),
        tx.pure.u32(p.minQuantity),
      ],
    });
  }
  return tx;
}
