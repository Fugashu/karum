import math

from src.constants import BASE_MASS_CONSTANT, DISTANCE_SCALE


def fuel_efficiency(fuel_mass: float) -> float:
    """Lighter fuel = more efficient. D1 (mass 20) → 1.0, Unstable (mass 42) → ~0.48."""
    return 20.0 / fuel_mass


def calculate_fuel(
    total_distance: float,
    ship: dict,
    fuel_type: dict,
    cargo_percent: float,
    heat_percent: float,
) -> dict:
    """
    Calculate fuel consumption and travel stats for a route.

    Args:
        total_distance: Raw euclidean distance (sum of edge weights from Dijkstra)
        ship: Ship detail dict from World API
        fuel_type: Game type dict for the fuel
        cargo_percent: 0-100
        heat_percent: 0-100

    Returns:
        Dict with fuel_needed, fuel_capacity, can_complete, travel_time, effective_velocity, total_mass
    """
    normalized_distance = total_distance * DISTANCE_SCALE

    ship_mass = ship["physics"]["mass"]
    fuel_capacity = ship["fuelCapacity"]
    fuel_mass = fuel_type["mass"]
    max_velocity = ship["physics"]["maximumVelocity"]

    cargo_mass = (cargo_percent / 100.0) * fuel_capacity * fuel_mass * 10
    total_mass = ship_mass + cargo_mass

    efficiency = fuel_efficiency(fuel_mass)

    fuel_needed = math.ceil(
        (normalized_distance * total_mass) / (BASE_MASS_CONSTANT * efficiency)
    )

    can_complete = fuel_needed <= fuel_capacity

    heat_factor = 1.0 - (heat_percent / 100.0) * 0.7
    effective_velocity = max_velocity * heat_factor

    travel_time = (
        math.ceil((normalized_distance * 1000) / effective_velocity)
        if effective_velocity > 0
        else float("inf")
    )

    return {
        "distance_au": normalized_distance,
        "fuel_needed": fuel_needed,
        "fuel_capacity": fuel_capacity,
        "can_complete": can_complete,
        "travel_time_seconds": travel_time,
        "effective_velocity": round(effective_velocity),
        "total_mass": total_mass,
    }
