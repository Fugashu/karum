import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useShops } from "../hooks/use-shops";
import { usePurchaseHistory } from "../hooks/use-purchase-history";
import { useWallet } from "../hooks/use-wallet";

export function HistoryPage() {
  const { isConnected, handleConnect, eveVault } = useWallet();
  const account = useCurrentAccount();
  const { data: purchases = [], isLoading } = usePurchaseHistory(account?.address);
  const { data: shops = [] } = useShops();

  const shopName = (ssuId: string) => {
    const shop = shops.find((s) => s.listing.ssu_id === ssuId);
    return shop?.listing.name || `${ssuId.slice(0, 8)}...${ssuId.slice(-4)}`;
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-bg">
      <Header activePage="/history" />

      <main className="max-w-3xl mx-auto px-4 py-8 pb-16">
        <h2 className="text-sm font-bold tracking-[0.1em] uppercase text-text mb-6">
          Your Purchases
        </h2>

        {!isConnected && (
          <div className="text-center py-20">
            <p className="text-text-dim text-sm mb-4">Connect your wallet to see purchase history.</p>
            <button
              onClick={handleConnect}
              className="px-4 py-2 border-2 border-amber text-amber text-xs font-bold tracking-wider hover:bg-amber/10 cursor-pointer"
            >
              {eveVault ? "CONNECT EVE VAULT" : "NO EVE VAULT"}
            </button>
          </div>
        )}

        {isConnected && isLoading && (
          <div className="text-center py-20 text-text-dim text-sm">Loading purchases...</div>
        )}

        {isConnected && !isLoading && purchases.length === 0 && (
          <div className="text-center py-20 text-text-dim text-sm">No purchases yet.</div>
        )}

        {isConnected && purchases.length > 0 && (
          <div className="space-y-2">
            {purchases.map((p) => (
              <div
                key={`${p.txDigest}-${p.typeId}`}
                className="bg-card border-2 border-border px-5 py-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="text-text font-bold">{p.quantity}x</span>{" "}
                    <span className="text-text">{p.itemName}</span>
                  </div>
                  <div className="text-[10px] text-text-dim mt-1">
                    {shopName(p.ssuId)}
                  </div>
                </div>
                <div className="text-amber font-bold text-sm shrink-0">
                  {(p.totalPrice / 1_000_000_000).toFixed(4)} SUI
                </div>
                <div className="text-text-dim text-xs shrink-0 text-right min-w-[80px]">
                  {timeAgo(p.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
