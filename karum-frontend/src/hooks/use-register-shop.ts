import { useDAppKit } from "@mysten/dapp-kit-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { buildRegisterShopTx } from "../services/registry-writer";

interface RegisterShopInput {
  ssuId: string;
  name: string;
  description: string;
  solarSystem: string;
  offers: Array<{
    resourceName: string;
    resourceTypeId: number;
    pricePerUnit: number;
    minQuantity: number;
  }>;
}

export function useRegisterShop() {
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();

  const { mutateAsync: registerShop, isPending } = useMutation({
    mutationKey: ["karum", "register-shop"],
    mutationFn: async (input: RegisterShopInput) => {
      const tx = buildRegisterShopTx(
        input.ssuId,
        input.name,
        input.description,
        input.solarSystem,
        input.offers,
      );

      const result = await dAppKit.signAndExecuteTransaction({
        transaction: tx as any,
      });

      // Refresh shop list after successful registration
      await queryClient.invalidateQueries({ queryKey: ["karum-shops"] });

      return result;
    },
  });

  return { registerShop, isPending };
}
