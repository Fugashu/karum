/**
 * Wallet connection hook — EVE Vault only.
 * Uses @mysten/dapp-kit-react directly — no VaultProvider needed.
 */

import { useState, useCallback, useMemo } from "react";
import {
  useWallets,
  useCurrentAccount,
  useDAppKit,
} from "@mysten/dapp-kit-react";

export function useWallet() {
  const rawWallets = useWallets();
  const currentAccount = useCurrentAccount();
  const { connectWallet, disconnectWallet } = useDAppKit();
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const eveVault = useMemo(
    () =>
      rawWallets.find(
        (w) =>
          w.name.includes("Eve Vault") ||
          w.name.includes("EVE Frontier Client Wallet"),
      ),
    [rawWallets],
  );

  const isConnected = !!currentAccount;
  const walletAddress = currentAccount?.address;

  const handleConnect = useCallback(async () => {
    setError(null);
    setConnecting(true);

    if (!eveVault) {
      setError("EVE Vault not detected. Open the EVE Frontier client to connect.");
      setConnecting(false);
      return;
    }

    try {
      await connectWallet({ wallet: eveVault });
      setError(null);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("rejected") || msg.includes("denied")) {
        setError("Connection rejected by wallet.");
      } else {
        setError("Failed to connect EVE Vault. Is the game client running?");
      }
    } finally {
      setConnecting(false);
    }
  }, [eveVault, connectWallet]);

  const handleDisconnect = useCallback(() => {
    disconnectWallet();
    setError(null);
  }, [disconnectWallet]);

  return {
    eveVault,
    isConnected,
    connecting,
    walletAddress,
    currentAccount,
    error,
    handleConnect,
    handleDisconnect,
  };
}
