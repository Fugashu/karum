import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { NavigationMap } from "../components/navigation/NavigationMap";
import { NavigationSidebar } from "../components/navigation/NavigationSidebar";
import type { SolarSystem } from "../types";

export function NavigationPage() {
  const [searchParams] = useSearchParams();
  const system = searchParams.get("system");
  const [solarSystems, setSolarSystems] = useState<SolarSystem[]>([]);

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b-2 border-border px-6 py-4 flex items-center justify-between shrink-0">
        <a href="/" className="text-2xl font-bold tracking-[0.12em] text-text hover:text-text no-underline">
          K<span className="text-amber">A</span>RUM
        </a>
        <nav className="flex gap-4 text-sm text-text-mid">
          <a href="/" className="hover:text-text">
            FINDER
          </a>
          <a href="/navigation" className="text-amber border-b-2 border-amber pb-1">
            NAVIGATION
          </a>
          <a href="/register" className="hover:text-text">
            REGISTER
          </a>
        </nav>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Map area */}
        <NavigationMap onSystemsLoaded={setSolarSystems} />

        {/* Sidebar */}
        <NavigationSidebar initialSystem={system} solarSystems={solarSystems} />
      </div>
    </div>
  );
}
