import { useWallet } from "../hooks/use-wallet";

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
              {/* Primary connect: EVE Vault or first wallet */}
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

                  {/* Show all wallets if more than one */}
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

          {/* Error feedback */}
          {error && (
            <p className="mt-3 text-sm text-red border border-red/30 bg-red/5 px-3 py-2">
              {error}
            </p>
          )}
        </div>

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
