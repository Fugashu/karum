import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { NavigationMap, type NavigationMapHandle } from "../components/navigation/NavigationMap";
import { NavigationSidebar } from "../components/navigation/NavigationSidebar";
import { ShopSidebar } from "../components/navigation/ShopSidebar";
import { useShops } from "../hooks/use-shops";
import { useUniverse } from "../hooks/use-universe";
import { usePersisted } from "../hooks/use-persisted";

function MobileBlocker() {
  return (
    <div className="sm:hidden flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="border-2 border-border p-8 bg-card max-w-sm">
        <div className="text-2xl font-bold tracking-wider mb-4">
          NAVIGATION
        </div>
        <p className="font-body text-text-mid text-base leading-relaxed mb-4">
          The 3D star map requires a larger screen. Please visit this page on a desktop browser.
        </p>
        <a
          href="/"
          className="inline-block px-4 py-2 border-2 border-amber text-amber text-xs font-bold tracking-wider hover:bg-amber/10"
        >
          BACK TO SHOPS
        </a>
      </div>
    </div>
  );
}

export function NavigationPage() {
  const [searchParams] = useSearchParams();
  const systemParam = searchParams.get("system");
  const { universe, progress } = useUniverse();
  const [from, setFrom] = usePersisted<string | null>("karum:nav:from", null);
  const [to, setTo] = usePersisted<string | null>("karum:nav:to", null);
  const [resolvedParam, setResolvedParam] = useState(false);
  const mapRef = useRef<NavigationMapHandle>(null);
  const [routePath, setRoutePath] = useState<number[] | null>(null);
  const { data: shops = [] } = useShops();

  const shopSystemNames = useMemo(
    () => shops
      .filter((s) => s.isOnline && s.listing.is_active && s.listing.solar_system)
      .map((s) => s.listing.solar_system),
    [shops],
  );

  // Resolve system name from URL param once universe loads
  useEffect(() => {
    if (!systemParam || resolvedParam || !universe) return;
    const match = universe.solarSystems.find(
      (s) => s.name === systemParam || String(s.id) === systemParam,
    );
    if (match) setTo(String(match.id));
    setResolvedParam(true);
  }, [systemParam, resolvedParam, universe]);

  return (
    <div className="h-full bg-bg flex flex-col overflow-hidden">
      <MobileBlocker />


      <div className="hidden sm:flex flex-1 min-h-0 overflow-hidden">
        <ShopSidebar
          fromSystemId={from}
          solarSystems={universe?.solarSystems ?? []}
          onNavigateToShop={(systemName) => {
            if (!universe) return;
            const match = universe.solarSystems.find((s) => s.name === systemName);
            if (match) setTo(String(match.id));
          }}
        />
        <NavigationMap
          ref={mapRef}
          systems={universe?.solarSystems ?? []}
          progress={progress}
          fromCache={progress === null}
          fromSystemId={from}
          toSystemId={to}
          shopSystemNames={shopSystemNames}
          routePath={routePath}
        />
        <NavigationSidebar
          universe={universe}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onFocusSystem={(systemId) => mapRef.current?.focusSystem(systemId)}
          onRouteCalculated={setRoutePath}
        />
      </div>
    </div>
  );
}
