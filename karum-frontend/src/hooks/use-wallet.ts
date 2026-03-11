/**
 * Wallet connection hook with EVE Vault detection and proper error handling.
 * Uses @mysten/dapp-kit-react directly — no VaultProvider needed.
 */

import { useState, useCallback, useMemo } from "react";
import {
  useWallets,
  useCurrentAccount,
  useDAppKit,
} from "@mysten/dapp-kit-react";

/** Wallets known to register as Sui-compatible but fail to connect */
const BLOCKED_WALLETS = ["phantom"];

function isBlocked(name: string): boolean {
  return BLOCKED_WALLETS.some((b) => name.toLowerCase().includes(b));
}

export function useWallet() {
  const rawWallets = useWallets();
  const currentAccount = useCurrentAccount();
  const { connectWallet, disconnectWallet } = useDAppKit();
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Filter out wallets known to be incompatible
  const wallets = useMemo(
    () => rawWallets.filter((w) => !isBlocked(w.name)),
    [rawWallets],
  );

  const eveVault = wallets.find(
    (w) =>
      w.name.includes("Eve Vault") ||
      w.name.includes("EVE Frontier Client Wallet"),
  );

  const hasEveVault = !!eveVault;
  const isConnected = !!currentAccount;
  const walletAddress = currentAccount?.address;

  const handleConnect = useCallback(
    async (walletName?: string) => {
      setError(null);
      setConnecting(true);

      // Pick wallet: explicit choice > EVE Vault > first available
      const wallet = walletName
        ? wallets.find((w) => w.name === walletName)
        : eveVault || wallets[0];

      if (!wallet) {
        setError(
          wallets.length === 0
            ? "No Sui wallet detected. Install Sui Wallet or EVE Vault."
            : "Selected wallet not found.",
        );
        setConnecting(false);
        return;
      }

      try {
        await connectWallet({ wallet });
        setError(null);
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes("rejected") || msg.includes("denied")) {
          setError("Connection rejected by wallet.");
        } else {
          setError(`Failed to connect ${wallet.name}. Try another wallet.`);
        }
      } finally {
        setConnecting(false);
      }
    },
    [wallets, eveVault, connectWallet],
  );

  const handleDisconnect = useCallback(() => {
    disconnectWallet();
    setError(null);
  }, [disconnectWallet]);

  return {
    wallets,
    hasEveVault,
    isConnected,
    connecting,
    walletAddress,
    currentAccount,
    error,
    handleConnect,
    handleDisconnect,
  };
}
