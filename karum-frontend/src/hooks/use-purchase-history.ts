/**
 * Hook to fetch purchase history for the connected wallet from on-chain events.
 */

import { useQuery } from "@tanstack/react-query";
import { suiClient } from "../services/sui-client";
import { itemName } from "../services/item-types";

// Event types in Sui always reference the ORIGINAL package ID where the struct
// was first defined, not the latest upgraded package. This never changes.
const VENDOR_ORIGINAL_PKG =
  "0xdc96f3d7b3c75b984366887cf6b577f529b288159e017c7e03e9e4c8521c8a62";

export interface Purchase {
  txDigest: string;
  ssuId: string;
  buyer: string;
  seller: string;
  typeId: number;
  itemName: string;
  quantity: number;
  totalPrice: number;
  timestamp: number;
}

export function usePurchaseHistory(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ["purchase-history", walletAddress],
    enabled: !!walletAddress,
    staleTime: 30_000,
    queryFn: async (): Promise<Purchase[]> => {
      if (!walletAddress) return [];

      const result = await suiClient.queryEvents({
        query: {
          MoveEventType: `${VENDOR_ORIGINAL_PKG}::vendor::PurchaseEvent`,
        },
        limit: 50,
        order: "descending",
      });

      return result.data
        .filter((ev) => {
          const json = ev.parsedJson as Record<string, unknown>;
          return json.buyer === walletAddress;
        })
        .map((ev) => {
          const json = ev.parsedJson as Record<string, unknown>;
          const typeId = Number(json.type_id ?? 0);
          return {
            txDigest: ev.id.txDigest,
            ssuId: String(json.ssu_id ?? ""),
            buyer: String(json.buyer ?? ""),
            seller: String(json.seller ?? ""),
            typeId,
            itemName: itemName(typeId) || `Type ${typeId}`,
            quantity: Number(json.quantity ?? 0),
            totalPrice: Number(json.total_price ?? 0),
            timestamp: Number(ev.timestampMs ?? 0),
          };
        });
    },
  });
}
