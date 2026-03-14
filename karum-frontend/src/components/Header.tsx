import { Link } from "react-router-dom";
import { useWallet } from "../hooks/use-wallet";

const NAV_ITEMS = [
  { href: "/", label: "SHOPS" },
  { href: "/navigation", label: "NAVIGATE" },
  { href: "/register", label: "REGISTER" },
];

interface HeaderProps {
  activePage: "/" | "/register" | "/navigation" | "/history";
}

export function Header({ activePage }: HeaderProps) {
  const { isConnected, eveVault, walletAddress, handleConnect, handleDisconnect } = useWallet();

  return (
    <header className="border-b-2 border-border px-6 py-4 flex items-center shrink-0">
      {/* Left — logo */}
      <Link to="/" className="text-2xl font-bold tracking-[0.12em] text-text hover:text-text no-underline">
        K<span className="text-amber">A</span>RUM
      </Link>

      {/* Center — nav */}
      <nav className="flex-1 flex justify-center gap-4 text-sm text-text-mid">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={
              item.href === activePage
                ? "text-amber border-b-2 border-amber pb-1"
                : "hover:text-text"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right — wallet + purchases */}
      <div className="flex items-center gap-4">
        {isConnected ? (
          <div className="flex items-center gap-3">
            <Link
              to="/history"
              className={`text-xs tracking-wider ${
                activePage === "/history"
                  ? "text-amber border-b-2 border-amber pb-1"
                  : "text-text-dim hover:text-text"
              }`}
            >
              PURCHASES
            </Link>
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
            {eveVault ? "CONNECT" : "NO EVE VAULT"}
          </button>
        )}
      </div>
    </header>
  );
}
