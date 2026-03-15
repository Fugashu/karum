import { useState, useEffect } from "react";
import { fetchUniverse, type UniverseData } from "../services/gateway";
import { cachedFetch } from "../services/local-storage";
import { setGameTypes } from "../services/item-types";

interface UseUniverseResult {
  universe: UniverseData | null;
  loading: boolean;
  progress: number | null;
}

const validateUniverse = (d: UniverseData) =>
  Array.isArray(d.constellations) &&
  Array.isArray(d.solarSystems) && d.solarSystems.length > 0 &&
  Array.isArray(d.shipDetails) && d.shipDetails.length > 0 &&
  Array.isArray(d.gameTypes) && d.gameTypes.length > 0;

// Shared promise so concurrent callers don't trigger multiple fetches
let inflightPromise: Promise<{ data: UniverseData; fromCache: boolean }> | null = null;

export function useUniverse(): UseUniverseResult {
  const [universe, setUniverse] = useState<UniverseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!inflightPromise) {
      inflightPromise = cachedFetch<UniverseData>(
        "karum:universe",
        () => {
          setProgress(0);
          return fetchUniverse(setProgress);
        },
        validateUniverse,
      );
    }

    inflightPromise.then(({ data, fromCache }) => {
      setUniverse(data);
      setLoading(false);
      if (!fromCache) setProgress(100);
      if (data.gameTypes) setGameTypes(data.gameTypes);
    });
  }, []);

  return { universe, loading, progress };
}
