/**
 * Builds Transaction objects for writing to the ShopRegistry.
 * Never signs — signing happens in hooks via dapp-kit.
 */

import { Transaction } from "@mysten/sui/transactions";
import { config } from "../config";
import { getEnvConfig } from "../env-config";

const PACKAGE_ID = config.sui.packageId;
const REGISTRY_ID = config.sui.registryId;
const CLOCK = "0x6";

interface OfferInput {
  resourceName: string;
  resourceTypeId: number;
  pricePerUnit: number;
  minQuantity: number;
}

/**
 * Build a PTB that registers a shop and optionally adds offers in one tx.
 */
export function buildRegisterShopTx(
  ssuId: string,
  name: string,
  description: string,
  solarSystem: string,
  offers: OfferInput[] = [],
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::registry::register_shop`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.pure.address(ssuId),
      tx.pure.string(name),
      tx.pure.string(description),
      tx.pure.string(solarSystem),
      tx.object(CLOCK),
    ],
  });

  // Batch offers into the same PTB — both registry and vendor config
  for (const offer of offers) {
    // Add offer to ShopRegistry (for display/discovery)
    tx.moveCall({
      target: `${PACKAGE_ID}::registry::add_offer`,
      arguments: [
        tx.object(REGISTRY_ID),
        tx.pure.address(ssuId),
        tx.pure.string(offer.resourceName),
        tx.pure.u64(offer.resourceTypeId),
        tx.pure.u64(offer.pricePerUnit),
        tx.pure.u64(offer.minQuantity),
        tx.object(CLOCK),
      ],
    });

    // Also set price in VendorConfig (for on-chain buy enforcement)
    const envCfg = getEnvConfig();
    if (envCfg.vendorPackageId && envCfg.vendorConfigId) {
      tx.moveCall({
        target: `${envCfg.vendorPackageId}::vendor::set_price`,
        arguments: [
          tx.object(envCfg.vendorConfigId),
          tx.pure.address(ssuId),
          tx.pure.u64(offer.resourceTypeId),
          tx.pure.u64(offer.pricePerUnit),
          tx.pure.u32(offer.minQuantity),
        ],
      });
    }
  }

  return tx;
}

export function buildAddOfferTx(
  ssuId: string,
  resourceName: string,
  resourceTypeId: number,
  pricePerUnit: number,
  minQuantity: number,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::registry::add_offer`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.pure.address(ssuId),
      tx.pure.string(resourceName),
      tx.pure.u64(resourceTypeId),
      tx.pure.u64(pricePerUnit),
      tx.pure.u64(minQuantity),
      tx.object(CLOCK),
    ],
  });
  return tx;
}

export function buildUpdatePriceTx(
  ssuId: string,
  offerIndex: number,
  newPrice: number,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::registry::update_price`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.pure.address(ssuId),
      tx.pure.u64(offerIndex),
      tx.pure.u64(newPrice),
      tx.object(CLOCK),
    ],
  });
  return tx;
}

export function buildRemoveOfferTx(
  ssuId: string,
  offerIndex: number,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::registry::remove_offer`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.pure.address(ssuId),
      tx.pure.u64(offerIndex),
      tx.object(CLOCK),
    ],
  });
  return tx;
}

export function buildRemoveShopTx(ssuId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::registry::remove_shop`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.pure.address(ssuId),
      tx.object(CLOCK),
    ],
  });
  return tx;
}

export function buildDeactivateShopTx(ssuId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::registry::deactivate_shop`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.pure.address(ssuId),
      tx.object(CLOCK),
    ],
  });
  return tx;
}

export function buildReactivateShopTx(ssuId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::registry::reactivate_shop`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.pure.address(ssuId),
      tx.object(CLOCK),
    ],
  });
  return tx;
}
