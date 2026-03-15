import { useState, useEffect, useMemo, useRef } from "react";
import { SearchSelect, type SearchSelectItem } from "../ui/SearchSelect";
import { usePersisted } from "../../hooks/use-persisted";
import type { UniverseData } from "../../services/gateway";
import { calculateRoute, type CalculateResponse } from "../../services/route-api";

function formatTravelTime(seconds: number): string {
  if (!isFinite(seconds)) return "---";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

interface NavigationSidebarProps {
  universe: UniverseData | null;
  from: string | null;
  to: string | null;
  onFromChange: (value: string | null) => void;
  onToChange: (value: string | null) => void;
  onFocusSystem: (systemId: string) => void;
  onRouteCalculated: (pathSystemIds: number[] | null) => void;
}

export function NavigationSidebar({
  universe,
  from,
  to,
  onFromChange,
  onToChange,
  onFocusSystem,
  onRouteCalculated,
}: NavigationSidebarProps) {
  const solarSystems = universe?.solarSystems ?? [];
  const shipDetails = universe?.shipDetails ?? [];
  const gameTypes = universe?.gameTypes ?? [];

  const systemItems = useMemo<SearchSelectItem[]>(
    () => solarSystems.map((s) => ({ value: String(s.id), label: s.name })),
    [solarSystems],
  );

  const shipItems = useMemo<SearchSelectItem[]>(
    () => shipDetails.map((s) => ({ value: String(s.id), label: `${s.name} (${s.className})` })),
    [shipDetails],
  );

  const fuelItems = useMemo<SearchSelectItem[]>(() => {
    return gameTypes
      .filter((t) => t.groupName === "Crude Fuel" || t.groupName === "Hydrogen Fuel")
      .map((t) => ({ value: String(t.id), label: t.name }));
  }, [gameTypes]);

  const [ship, setShip] = usePersisted<string | null>("karum:nav:ship", null);
  const [fuelType, setFuelType] = usePersisted<string | null>("karum:nav:fuel", null);
  const [cargoWeight, setCargoWeight] = usePersisted("karum:nav:cargo", 50);
  const [heatLevel, setHeatLevel] = usePersisted("karum:nav:heat", 30);
  // Local slider values — update on drag, commit on release
  const [cargoDisplay, setCargoDisplay] = useState(cargoWeight);
  const [heatDisplay, setHeatDisplay] = useState(heatLevel);
  const draggingRef = useRef(false);

  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathExpanded, setPathExpanded] = useState(false);

  // Call backend when all inputs are ready
  useEffect(() => {
    if (!from || !to || !ship || !fuelType) {
      setResult(null);
      onRouteCalculated(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    calculateRoute({
      from_system_id: Number(from),
      to_system_id: Number(to),
      ship_id: Number(ship),
      fuel_type_id: Number(fuelType),
      cargo_percent: cargoWeight,
      heat_percent: heatLevel,
    })
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setLoading(false);
          onRouteCalculated(res.path.map((s) => s.system_id));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setResult(null);
          setLoading(false);
          onRouteCalculated(null);
        }
      });

    return () => { cancelled = true; };
  }, [from, to, ship, fuelType, cargoWeight, heatLevel]);

  return (
    <aside className="w-[320px] shrink-0 bg-card border-l-2 border-border flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-bold tracking-[0.1em] uppercase text-text">
          Route Planner
        </h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <SearchSelect
          label={
            <span className="flex items-center gap-2">
              <span>From</span>
              {from && systemItems.some((s) => s.value === from) && (
                <button
                  type="button"
                  onClick={() => onFocusSystem(from)}
                  className="text-amber hover:text-text cursor-pointer"
                >
                  locate
                </button>
              )}
            </span>
          }
          items={systemItems}
          value={from}
          onChange={onFromChange}
          placeholder={solarSystems.length ? "Origin system..." : "Loading systems..."}
        />

        <SearchSelect
          label={
            <span className="flex items-center gap-2">
              <span>To</span>
              {to && systemItems.some((s) => s.value === to) && (
                <button
                  type="button"
                  onClick={() => onFocusSystem(to)}
                  className="text-amber hover:text-text cursor-pointer"
                >
                  locate
                </button>
              )}
            </span>
          }
          items={systemItems}
          value={to}
          onChange={onToChange}
          placeholder={solarSystems.length ? "Destination system..." : "Loading systems..."}
        />

        <SearchSelect
          label="Ship"
          items={shipItems}
          value={ship}
          onChange={setShip}
          placeholder={shipDetails.length ? "Select ship..." : "Loading ships..."}
        />

        <SearchSelect
          label="Fuel Type"
          items={fuelItems}
          value={fuelType}
          onChange={setFuelType}
          placeholder={fuelItems.length ? "Select fuel..." : "Loading fuels..."}
        />

        {/* Cargo / Weight slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] text-text-dim tracking-wider uppercase">
              Cargo / Weight
            </label>
            <span className={`text-xs font-bold ${
              cargoDisplay > 80 ? "text-red" : cargoDisplay > 50 ? "text-orange" : "text-green"
            }`}>{cargoDisplay}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={cargoDisplay}
            onChange={(e) => { setCargoDisplay(Number(e.target.value)); draggingRef.current = true; }}
            onMouseUp={() => { setCargoWeight(cargoDisplay); draggingRef.current = false; }}
            onTouchEnd={() => { setCargoWeight(cargoDisplay); draggingRef.current = false; }}
            className="w-full h-1.5 bg-border appearance-none cursor-pointer accent-amber [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber [&::-webkit-slider-thumb]:border-0 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-amber [&::-moz-range-thumb]:border-0"
          />
          <div className="flex justify-between text-[9px] text-text-dim mt-1">
            <span>EMPTY</span>
            <span>FULL</span>
          </div>
        </div>

        {/* Heat Level slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] text-text-dim tracking-wider uppercase">
              Heat Level
            </label>
            <span className={`text-xs font-bold ${
              heatDisplay > 70 ? "text-red" : heatDisplay > 40 ? "text-orange" : "text-green"
            }`}>
              {heatDisplay}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={heatDisplay}
            onChange={(e) => { setHeatDisplay(Number(e.target.value)); draggingRef.current = true; }}
            onMouseUp={() => { setHeatLevel(heatDisplay); draggingRef.current = false; }}
            onTouchEnd={() => { setHeatLevel(heatDisplay); draggingRef.current = false; }}
            className="w-full h-1.5 bg-border appearance-none cursor-pointer accent-amber [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber [&::-webkit-slider-thumb]:border-0 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-amber [&::-moz-range-thumb]:border-0"
          />
          <div className="flex justify-between text-[9px] text-text-dim mt-1">
            <span>COOL</span>
            <span>CRITICAL</span>
          </div>
        </div>

        {/* Route Result */}
        {loading && (
          <div className="text-center py-4 text-xs text-text-dim">Calculating route...</div>
        )}

        {error && (
          <div className="border-2 border-red/30 bg-red/5 p-3 text-xs text-red">
            {error}
          </div>
        )}

        {result && !loading && (
          <div className="border-2 border-border p-4 space-y-3">
            <h3 className="text-[10px] text-text-dim tracking-wider uppercase">
              Route Summary — {result.total_jumps} jump{result.total_jumps !== 1 ? "s" : ""}
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-mid">Fuel Needed</span>
                <span className={`text-sm font-bold ${result.can_complete ? "text-amber" : "text-red"}`}>
                  {result.fuel_needed.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-text-mid">Fuel Capacity</span>
                <span className="text-sm text-text">{result.fuel_capacity.toLocaleString()}</span>
              </div>

              {/* Fuel bar */}
              <div className="w-full h-2 bg-border">
                <div
                  className={`h-full ${result.can_complete ? "bg-amber" : "bg-red"}`}
                  style={{ width: `${Math.min(100, (result.fuel_needed / result.fuel_capacity) * 100)}%` }}
                />
              </div>

              {!result.can_complete && (
                <div className="text-[10px] text-red font-bold tracking-wider uppercase">
                  Insufficient fuel — need {(result.fuel_needed - result.fuel_capacity).toLocaleString()} more
                </div>
              )}

              <div className="border-t border-border/50 pt-2 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-mid">Travel Time</span>
                  <span className="text-sm text-text font-bold">{formatTravelTime(result.travel_time_seconds)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-mid">Velocity</span>
                  <span className="text-xs text-text">{result.effective_velocity} m/s</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-mid">Distance</span>
                  <span className="text-xs text-text">{result.distance_au.toFixed(1)} AU</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-mid">Total Mass</span>
                  <span className="text-xs text-text">{(result.total_mass / 1_000_000).toFixed(1)}M kg</span>
                </div>
              </div>
            </div>

            {/* Collapsible path */}
            <button
              onClick={() => setPathExpanded(!pathExpanded)}
              className="w-full flex items-center justify-between border-t border-border/50 pt-2 cursor-pointer"
            >
              <span className="text-[10px] text-text-dim tracking-wider uppercase">
                Path ({result.path.length} systems)
              </span>
              <svg
                width="10"
                height="6"
                viewBox="0 0 10 6"
                className={`text-text-dim transition-transform ${pathExpanded ? "rotate-180" : ""}`}
              >
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>

            {pathExpanded && (
              <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                {result.path.map((step, i) => (
                  <button
                    key={step.system_id}
                    type="button"
                    onClick={() => onFocusSystem(String(step.system_id))}
                    className="w-full flex items-center gap-2 px-1 py-1 text-[10px] hover:bg-card-hover cursor-pointer text-left"
                  >
                    <span className="text-text-dim w-4 text-right shrink-0">{i + 1}</span>
                    <span className={`w-1.5 h-1.5 shrink-0 ${
                      i === 0 ? "bg-green" : i === result.path.length - 1 ? "bg-red" : "bg-amber/50"
                    }`} />
                    <span className="text-text-mid truncate">{step.system_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </aside>
  );
}
