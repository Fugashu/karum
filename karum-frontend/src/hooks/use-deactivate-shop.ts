import { useDAppKit } from "@mysten/dapp-kit-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { buildRemoveShopTx } from "../services/registry-writer";

export function useRemoveShop() {
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();

  const { mutateAsync: removeShop, isPending: isRemoving } = useMutation({
    mutationKey: ["karum", "remove-shop"],
    mutationFn: async (ssuId: string) => {
      const tx = buildRemoveShopTx(ssuId);
      const result = await dAppKit.signAndExecuteTransaction({
        transaction: tx as any,
      });
      await queryClient.invalidateQueries({ queryKey: ["karum-shops"] });
      return result;
    },
  });

  return { removeShop, isRemoving };
}
