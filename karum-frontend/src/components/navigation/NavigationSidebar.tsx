import { useState, useMemo } from "react";
import { SearchSelect, type SearchSelectItem } from "../ui/SearchSelect";
import type { UniverseData } from "../../services/gateway";

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

  const [ship, setShip] = useState<string | null>(null);
  const [fuelType, setFuelType] = useState<string | null>(null);
  const [cargoWeight, setCargoWeight] = useState(50);
  const [heatLevel, setHeatLevel] = useState(30);

  function handleCalculate() {
    // TODO: implement route calculation
    console.log("Calculate route:", { from, to, ship, fuelType, cargoWeight, heatLevel });
  }

  const canCalculate = from && to && ship && fuelType;

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
      </div>

      {/* Calculate button */}
      <div className="px-5 py-4 border-t border-border">
        <button
          onClick={handleCalculate}
          disabled={!canCalculate}
          className={`w-full py-3 border-2 text-sm font-bold tracking-[0.12em] uppercase transition-colors ${
            canCalculate
              ? "border-amber text-amber hover:bg-amber/10 cursor-pointer"
              : "border-border text-text-dim cursor-not-allowed"
          }`}
        >
          Calculate
        </button>
      </div>
    </aside>
  );
}
