import type { ReactNode } from "react";
import { useWallet } from "../hooks/use-wallet";

const NAV_ITEMS = [
  { href: "/", label: "FINDER" },
  { href: "/register", label: "REGISTER" },
  { href: "/navigation", label: "NAVIGATION" },
];

interface HeaderProps {
  activePage: "/" | "/register" | "/navigation";
  actions?: ReactNode;
}

export function Header({ activePage, actions }: HeaderProps) {
  const { isConnected, eveVault, walletAddress, handleConnect, handleDisconnect } = useWallet();

  return (
    <header className="border-b-2 border-border px-6 py-4 flex items-center justify-between shrink-0">
      <a href="/" className="text-2xl font-bold tracking-[0.12em] text-text hover:text-text no-underline">
        K<span className="text-amber">A</span>RUM
      </a>
      <div className="flex items-center gap-4">
        {actions}

        {isConnected ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
            <span className="text-xs text-text-mid font-mono">
              {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </span>
            <button
              onClick={handleDisconnect}
              className="text-[10px] text-text-dim hover:text-red tracking-wider cursor-pointer"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            className="px-3 py-1.5 border border-border text-xs text-text-dim hover:border-amber hover:text-amber tracking-wider cursor-pointer"
          >
            {eveVault ? "CONNECT" : "NO VAULT"}
          </button>
        )}

        <nav className="flex gap-4 text-sm text-text-mid">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={
                item.href === activePage
                  ? "text-amber border-b-2 border-amber pb-1"
                  : "hover:text-text"
              }
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
