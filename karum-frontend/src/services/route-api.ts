import { config } from "../config";

const API = config.karum.apiUrl;

export interface RouteStep {
  system_id: number;
  system_name: string;
}

export interface CalculateRequest {
  from_system_id: number;
  to_system_id: number;
  ship_id: number;
  fuel_type_id: number;
  cargo_percent: number;
  heat_percent: number;
}

export interface CalculateResponse {
  path: RouteStep[];
  total_jumps: number;
  total_distance: number;
  distances: number[];
  distance_au: number;
  fuel_needed: number;
  fuel_capacity: number;
  can_complete: boolean;
  travel_time_seconds: number;
  effective_velocity: number;
  total_mass: number;
  ship_name: string;
  fuel_name: string;
}

export interface DistanceEntry {
  system_id: number;
  distance: number;
  jumps: number;
}

export async function fetchBatchDistances(
  fromSystemId: number,
  toSystemIds: number[],
): Promise<DistanceEntry[]> {
  const start = performance.now();

  const res = await fetch(`${API}/api/distances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from_system_id: fromSystemId, to_system_ids: toSystemIds }),
  });

  const elapsed = performance.now() - start;
  console.log(`[route-api] /api/distances (${toSystemIds.length} targets) took ${elapsed.toFixed(0)}ms`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }

  return res.json();
}

export async function calculateRoute(req: CalculateRequest): Promise<CalculateResponse> {
  const start = performance.now();

  const res = await fetch(`${API}/api/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  const elapsed = performance.now() - start;
  console.log(`[route-api] /api/calculate took ${elapsed.toFixed(0)}ms`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }

  return res.json();
}
