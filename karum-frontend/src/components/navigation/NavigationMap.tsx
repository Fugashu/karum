import { useState, useEffect } from "react";
import { ProgressBar } from "../ui/ProgressBar";
import { fetchUniverse, type UniverseData } from "../../services/gateway";
import { cachedFetch } from "../../services/local-storage";
import type { SolarSystem } from "../../types";

interface NavigationMapProps {
  onSystemsLoaded: (systems: SolarSystem[]) => void;
}

export function NavigationMap({ onSystemsLoaded }: NavigationMapProps) {
  const [universeProgress, setUniverseProgress] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showLoaded, setShowLoaded] = useState(false);

  useEffect(() => {
    cachedFetch<UniverseData>("karum:universe", () => {
      setUniverseProgress(0);
      return fetchUniverse(setUniverseProgress);
    }).then((data) => {
      onSystemsLoaded(data.solarSystems);
      setUniverseProgress(100);
      setTimeout(() => {
        setLoaded(true);
        setTimeout(() => setShowLoaded(true), 50);
        setTimeout(() => setShowLoaded(false), 1050);
        setTimeout(() => {
          setLoaded(false);
          setUniverseProgress(null);
        }, 1550);
      }, 400);
    });
  }, []);

  return (
    <div className="relative flex-1 h-full flex items-center justify-center">
      <span className="text-text-dim text-sm tracking-wider uppercase">
        Map view
      </span>

      {/* Bottom-right progress / toast */}
      {(universeProgress !== null || loaded) && (
        <div className="absolute bottom-4 right-4 w-64">
          {!loaded ? (
            <div className="bg-elevated border border-border px-4 py-3">
              <ProgressBar progress={universeProgress!} label="Loading universe" />
            </div>
          ) : (
            <div
              className={`bg-elevated border border-border px-4 py-3 transition-opacity duration-500 ${
                showLoaded ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="text-[10px] text-green tracking-wider uppercase">
                Map details up to date
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
