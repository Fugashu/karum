import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useWallet } from "../hooks/use-wallet";
import { useEnvironment } from "../context/EnvironmentContext";
import type { EveEnvironment } from "../env-config";

const NAV_ITEMS = [
  { href: "/", label: "SHOPS" },
  { href: "/navigation", label: "NAVIGATE", desktopOnly: true },
  { href: "/register", label: "REGISTER" },
];

const ENV_OPTIONS: { value: EveEnvironment; label: string }[] = [
  { value: "stillness", label: "STL" },
  { value: "utopia", label: "UTO" },
];

export function Header() {
  const { isConnected, eveVault, walletAddress, handleConnect, handleDisconnect } = useWallet();
  const { pathname } = useLocation();
  const activePage = pathname === "/" ? "/" : `/${pathname.split("/")[1]}`;
  const { env, setEnv } = useEnvironment();
  const [envNotice, setEnvNotice] = useState<string | null>(null);

  // Show a brief notice when env changes (skip initial mount)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const label = env === "stillness" ? "Stillness" : "Utopia";
    setEnvNotice(`Switched to ${label}. Make sure your EVE Vault is connected to the ${label} deployment.`);
    const t = setTimeout(() => setEnvNotice(null), 5000);
    return () => clearTimeout(t);
  }, [env]);

  return (
    <header className="border-b-2 border-border shrink-0">
      {/* Row 1: Logo + env toggle + wallet */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center">
        {/* Left — logo */}
        <Link to="/" className="text-text hover:text-text no-underline shrink-0">
          <span className="hidden sm:inline text-2xl font-bold tracking-[0.12em]">
            K<span className="text-amber">A</span>RUM
          </span>
          <img src="/favicon.svg" alt="KARUM" className="sm:hidden w-7 h-7" />
        </Link>

        {/* Desktop nav — hidden on mobile, shown in row 2 instead */}
        <nav className="hidden sm:flex flex-1 justify-center gap-4 text-sm text-text-mid">
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

        {/* Spacer on mobile to push toggle + wallet right */}
        <div className="flex-1 sm:hidden" />

        {/* Environment toggle */}
        <div className="flex items-center sm:mr-4 border-2 border-border">
          {ENV_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setEnv(opt.value)}
              className={`px-2 sm:px-2.5 py-1 text-[10px] font-bold tracking-wider cursor-pointer ${
                env === opt.value
                  ? "text-amber bg-amber/10"
                  : "text-text-dim hover:text-text-mid"
              }`}
            >
              <span className="sm:hidden">{opt.label}</span>
              <span className="hidden sm:inline">{opt.value === "stillness" ? "STILLNESS" : "UTOPIA"}</span>
            </button>
          ))}
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-4 ml-3 sm:ml-0">
          {isConnected ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/history"
                className={`hidden sm:inline text-xs tracking-wider ${
                  activePage === "/history"
                    ? "text-amber border-b-2 border-amber pb-1"
                    : "text-text-dim hover:text-text"
                }`}
              >
                PURCHASES
              </Link>
              <button
                onClick={handleDisconnect}
                className="w-2 h-2 rounded-full bg-green shadow-[0_0_6px_rgba(74,222,128,0.6)] cursor-pointer sm:cursor-default sm:pointer-events-none"
                title="Disconnect"
              />
              <span className="text-xs text-text-mid font-mono hidden sm:inline">
                {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </span>
              <button
                onClick={handleDisconnect}
                className="text-[10px] text-text-dim hover:text-red tracking-wider cursor-pointer hidden sm:inline"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="px-2 sm:px-3 py-1 sm:py-1.5 border border-border text-[10px] sm:text-xs text-text-dim hover:border-amber hover:text-amber tracking-wider cursor-pointer"
            >
              {eveVault ? "CONNECT" : "NO VAULT"}
            </button>
          )}
        </div>
      </div>

      {/* Env switch notice */}
      {envNotice && (
        <div className="px-4 sm:px-6 py-2 border-t border-border bg-amber/5 flex items-center justify-between">
          <span className="text-[11px] text-amber">{envNotice}</span>
          <button
            onClick={() => setEnvNotice(null)}
            className="text-[10px] text-text-dim hover:text-text cursor-pointer ml-3 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Row 2: Mobile nav tabs */}
      <nav className="sm:hidden flex border-t border-border">
        {NAV_ITEMS.filter((item) => !item.desktopOnly).map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex-1 text-center py-2.5 text-xs font-bold tracking-wider ${
              item.href === activePage
                ? "text-amber border-b-2 border-amber"
                : "text-text-dim hover:text-text"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
