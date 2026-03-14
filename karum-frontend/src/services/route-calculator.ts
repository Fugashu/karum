import type { SolarSystem } from "../types";
import type { ShipDetail, GameType } from "./gateway";

export interface RouteResult {
  distance: number;
  fuelNeeded: number;
  fuelCapacity: number;
  canComplete: boolean;
  travelTime: number; // seconds
  effectiveVelocity: number;
  totalMass: number;
}

// Base mass constant — tuned so a Shuttle burning light fuel on a short hop uses ~50% tank
const BASE_MASS_CONSTANT = 50_000_000;

// Fuel efficiency multiplier based on fuel mass (lighter = more efficient)
// D1 Fuel (mass 20) → 1.0, Unstable Fuel (mass 42) → ~0.48
function fuelEfficiency(fuelMass: number): number {
  return 20 / fuelMass;
}

// Distance scale factor — universe coords are enormous, normalize to game units
// Typical inter-system distance is ~1e19, we want fuel numbers in the hundreds
const DISTANCE_SCALE = 1e-17;

function euclideanDistance(a: SolarSystem, b: SolarSystem): number {
  const dx = a.location.x - b.location.x;
  const dy = a.location.y - b.location.y;
  const dz = a.location.z - b.location.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate fuel consumption and travel stats for a direct route.
 *
 * Model:
 * - Fuel = (distance * totalMass) / (baseMassConstant * fuelEfficiency)
 * - Velocity is reduced by heat level (high heat = slower to avoid overheating)
 * - Cargo adds mass proportional to fuelCapacity (proxy for cargo bay size)
 */
export function calculateRoute(
  fromSystem: SolarSystem,
  toSystem: SolarSystem,
  ship: ShipDetail,
  fuel: GameType,
  cargoPercent: number, // 0-100
  heatPercent: number,  // 0-100
): RouteResult {
  const distance = euclideanDistance(fromSystem, toSystem);
  const normalizedDistance = distance * DISTANCE_SCALE;

  // Total mass = ship base mass + cargo (proportional to fuel capacity as proxy for bay size)
  const cargoMass = (cargoPercent / 100) * ship.fuelCapacity * fuel.mass * 10;
  const totalMass = ship.physics.mass + cargoMass;

  // Fuel efficiency from fuel type
  const efficiency = fuelEfficiency(fuel.mass);

  // Fuel consumption
  const fuelNeeded = Math.ceil(
    (normalizedDistance * totalMass) / (BASE_MASS_CONSTANT * efficiency),
  );

  const canComplete = fuelNeeded <= ship.fuelCapacity;

  // Effective velocity — heat reduces max speed
  // At 0% heat: full speed. At 100% heat: 30% speed (overheat throttling)
  const heatFactor = 1 - (heatPercent / 100) * 0.7;
  const effectiveVelocity = ship.physics.maximumVelocity * heatFactor;

  // Travel time in seconds (distance / velocity, with arbitrary time scale)
  const travelTime = effectiveVelocity > 0
    ? Math.ceil((normalizedDistance * 1000) / effectiveVelocity)
    : Infinity;

  return {
    distance: normalizedDistance,
    fuelNeeded,
    fuelCapacity: ship.fuelCapacity,
    canComplete,
    travelTime,
    effectiveVelocity: Math.round(effectiveVelocity),
    totalMass,
  };
}

/** Format seconds into a human-readable string */
export function formatTravelTime(seconds: number): string {
  if (!isFinite(seconds)) return "---";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}
