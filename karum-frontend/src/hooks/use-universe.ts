import { useState, useEffect } from "react";
import { fetchUniverse, type UniverseData } from "../services/gateway";
import { cachedFetch } from "../services/local-storage";
import { setGameTypes } from "../services/item-types";
import { useEnvironment } from "../context/EnvironmentContext";

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

// Per-environment inflight promises to prevent duplicate fetches
const inflightPromises = new Map<string, Promise<{ data: UniverseData; fromCache: boolean }>>();

export function useUniverse(): UseUniverseResult {
  const { env } = useEnvironment();
  const [universe, setUniverse] = useState<UniverseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const cacheKey = `karum:universe:${env}`;

    if (!inflightPromises.has(cacheKey)) {
      inflightPromises.set(
        cacheKey,
        cachedFetch<UniverseData>(
          cacheKey,
          () => {
            setProgress(0);
            return fetchUniverse(setProgress);
          },
          validateUniverse,
        ),
      );
    }

    setLoading(true);
    inflightPromises.get(cacheKey)!.then(({ data, fromCache }) => {
      setUniverse(data);
      setLoading(false);
      if (!fromCache) setProgress(100);
      if (data.gameTypes) setGameTypes(data.gameTypes);
    });
  }, [env]);

  return { universe, loading, progress };
}
