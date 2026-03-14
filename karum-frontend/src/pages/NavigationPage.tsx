import { useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../components/Header";
import { NavigationMap, type NavigationMapHandle } from "../components/navigation/NavigationMap";
import { NavigationSidebar } from "../components/navigation/NavigationSidebar";
import type { UniverseData } from "../services/gateway";

export function NavigationPage() {
  const [searchParams] = useSearchParams();
  const systemParam = searchParams.get("system");
  const [universe, setUniverse] = useState<UniverseData | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [resolvedParam, setResolvedParam] = useState(false);
  const mapRef = useRef<NavigationMapHandle>(null);

  const handleUniverseLoaded = useCallback((data: UniverseData) => {
    setUniverse(data);

    // Resolve system name from URL to system ID and set as "To"
    if (systemParam && !resolvedParam) {
      const match = data.solarSystems.find(
        (s) => s.name === systemParam || String(s.id) === systemParam,
      );
      if (match) {
        setTo(String(match.id));
      }
      setResolvedParam(true);
    }
  }, [systemParam, resolvedParam]);

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      <Header activePage="/navigation" />

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <NavigationMap
          ref={mapRef}
          onUniverseLoaded={handleUniverseLoaded}
          fromSystemId={from}
          toSystemId={to}
        />
        <NavigationSidebar
          universe={universe}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onFocusSystem={(systemId) => mapRef.current?.focusSystem(systemId)}
        />
      </div>
    </div>
  );
}
