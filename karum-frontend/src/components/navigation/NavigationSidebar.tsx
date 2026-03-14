import { useMemo } from "react";
import { SearchSelect, type SearchSelectItem } from "../ui/SearchSelect";
import { usePersisted } from "../../hooks/use-persisted";
import type { UniverseData } from "../../services/gateway";
import { calculateRoute, formatTravelTime, type RouteResult } from "../../services/route-calculator";

interface NavigationSidebarProps {
  universe: UniverseData | null;
  from: string | null;
  to: string | null;
  onFromChange: (value: string | null) => void;
  onToChange: (value: string | null) => void;
  onFocusSystem: (systemId: string) => void;
}

export function NavigationSidebar({
  universe,
  from,
  to,
  onFromChange,
  onToChange,
  onFocusSystem,
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

  const result = useMemo<RouteResult | null>(() => {
    if (!from || !to || !ship || !fuelType) return null;

    const fromSystem = solarSystems.find((s) => String(s.id) === from);
    const toSystem = solarSystems.find((s) => String(s.id) === to);
    const selectedShip = shipDetails.find((s) => String(s.id) === ship);
    const selectedFuel = gameTypes.find((t) => String(t.id) === fuelType);

    if (!fromSystem || !toSystem || !selectedShip || !selectedFuel) return null;

    return calculateRoute(fromSystem, toSystem, selectedShip, selectedFuel, cargoWeight, heatLevel);
  }, [from, to, ship, fuelType, cargoWeight, heatLevel, solarSystems, shipDetails, gameTypes]);

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
              cargoWeight > 80 ? "text-red" : cargoWeight > 50 ? "text-orange" : "text-green"
            }`}>{cargoWeight}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={cargoWeight}
            onChange={(e) => setCargoWeight(Number(e.target.value))}
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
              heatLevel > 70 ? "text-red" : heatLevel > 40 ? "text-orange" : "text-green"
            }`}>
              {heatLevel}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={heatLevel}
            onChange={(e) => setHeatLevel(Number(e.target.value))}
            className="w-full h-1.5 bg-border appearance-none cursor-pointer accent-amber [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber [&::-webkit-slider-thumb]:border-0 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-amber [&::-moz-range-thumb]:border-0"
          />
          <div className="flex justify-between text-[9px] text-text-dim mt-1">
            <span>COOL</span>
            <span>CRITICAL</span>
          </div>
        </div>

        {/* Route Result */}
        {result && (
          <div className="border-2 border-border p-4 space-y-3">
            <h3 className="text-[10px] text-text-dim tracking-wider uppercase">Route Summary</h3>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-mid">Fuel Needed</span>
                <span className={`text-sm font-bold ${result.canComplete ? "text-amber" : "text-red"}`}>
                  {result.fuelNeeded.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-text-mid">Fuel Capacity</span>
                <span className="text-sm text-text">{result.fuelCapacity.toLocaleString()}</span>
              </div>

              {/* Fuel bar */}
              <div className="w-full h-2 bg-border">
                <div
                  className={`h-full ${result.canComplete ? "bg-amber" : "bg-red"}`}
                  style={{ width: `${Math.min(100, (result.fuelNeeded / result.fuelCapacity) * 100)}%` }}
                />
              </div>

              {!result.canComplete && (
                <div className="text-[10px] text-red font-bold tracking-wider uppercase">
                  Insufficient fuel capacity — need {(result.fuelNeeded - result.fuelCapacity).toLocaleString()} more
                </div>
              )}

              <div className="border-t border-border/50 pt-2 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-mid">Travel Time</span>
                  <span className="text-sm text-text font-bold">{formatTravelTime(result.travelTime)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-mid">Velocity</span>
                  <span className="text-xs text-text">{result.effectiveVelocity} m/s</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-mid">Distance</span>
                  <span className="text-xs text-text">{result.distance.toFixed(1)} AU</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-mid">Total Mass</span>
                  <span className="text-xs text-text">{(result.totalMass / 1_000_000).toFixed(1)}M kg</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </aside>
  );
}
