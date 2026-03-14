# Navigation & Fuel Consumption Research

## Data Sources

All data comes from the EVE Frontier World API (`world-api-utopia.uat.pub.evefrontier.com`).

### Ships (`/v2/ships` + `/v2/ships/:id`)

**Confidence: HIGH** — Data comes directly from the game API.

11 ships total. The list endpoint returns basic info, the detail endpoint returns full stats:

| Ship | Class | Mass | Max Velocity | Fuel Capacity | Heat Cap | Conductance |
|------|-------|------|-------------|---------------|----------|-------------|
| USV | Frigate | 30.3M | 280 | 2,420 | 1.8 | 0.55 |
| Chumaq | Combat BC | 1,487M | 170 | 270,585 | 3.0 | 0.35 |
| TADES | Destroyer | 74.7M | 420 | 5,972 | 2.5 | 0.625 |
| MCF | Frigate | 30.3M | 280 | 2,420 | 1.8 | 0.55 |
| HAF | Frigate | 30.3M | 280 | 2,420 | 1.8 | 0.55 |
| LORHA | Frigate | 30.3M | 280 | 2,420 | 1.8 | 0.55 |
| MAUL | Cruiser | 548M | 400 | 24,160 | 2.5 | 1.25 |
| Wend | Shuttle | 6.8M | 260 | 200 | 2.0 | 1.5 |
| Recurve | Corvette | 9.75M | 260 | 1,750 | 2.0 | 0.875 |
| Reflex | Corvette | 9.75M | 260 | 1,750 | 2.0 | 0.875 |
| Reiver | Corvette | 9.75M | 260 | 1,750 | 2.0 | 0.875 |

Key observations:
- Mass ranges from 6.8M (Shuttle) to 1.5B (Battlecruiser) — 200x difference
- Fuel capacity correlates with mass — bigger ship = bigger tank
- Velocity varies 170–420 m/s
- Heat capacity and conductance affect overheating during sustained travel

### Fuel Types (`/v2/types` filtered by groupName)

**Confidence: HIGH** — Data comes directly from the game API.

Two fuel groups found:

**Crude Fuel:**
| ID | Name | Mass | Volume |
|----|------|------|--------|
| 78437 | EU-90 Fuel | 30 | 0.28 |
| 78515 | SOF-80 Fuel | 30 | 0.28 |
| 78516 | EU-40 Fuel | 25 | 0.28 |
| 84868 | SOF-40 Fuel | 25 | 0.28 |

**Hydrogen Fuel:**
| ID | Name | Mass | Volume |
|----|------|------|--------|
| 77818 | Unstable Fuel | 42 | 0.28 |
| 88319 | D2 Fuel | 30 | 0.28 |
| 88335 | D1 Fuel | 20 | 0.28 |

(3 "Fuel Experiment Transcript" items exist but are Miscellaneous lore items, not actual fuel)

Key observations:
- All fuels have the same volume (0.28) — mass is the differentiator
- D1 Fuel is lightest (20), Unstable Fuel is heaviest (42)
- Lighter fuel = more efficient (less mass added to ship per unit)

### Solar Systems (`/v2/solarsystems`)

**Confidence: HIGH** — 24,502 systems with 3D coordinates.

Coordinates are in very large numbers (1e18–1e19 range). Typical inter-system distances are on the order of 1e19.

### Gate Links (`/v2/solarsystems/:id` detail)

**Confidence: HIGH** — Stargates connect systems. Each gate has a destination system.

Not all systems have gates. Gate links form the traversable graph of the universe.

## Fuel Consumption Model

**Confidence: LOW** — No official documentation exists for fuel consumption formulas. The model below is our best approximation based on the available ship stats.

### Formula

```
fuelNeeded = (normalizedDistance × totalMass) / (BASE_MASS_CONSTANT × fuelEfficiency)
```

Where:
- `normalizedDistance = euclidean_3d_distance × 1e-17` (scaling huge coords to usable range)
- `totalMass = shipMass + cargoMass`
- `cargoMass = (cargoPercent/100) × fuelCapacity × fuelMass × 10`
- `fuelEfficiency = 20 / fuelMass` (D1=1.0, EU-40=0.8, Unstable=0.48)
- `BASE_MASS_CONSTANT = 50,000,000`

### Travel Time

```
effectiveVelocity = maxVelocity × (1 - heatPercent/100 × 0.7)
travelTime = (normalizedDistance × 1000) / effectiveVelocity
```

At 0% heat: full speed. At 100% heat: 30% max speed.

### What we don't know

- **Actual fuel burn formula** — The game may use a completely different model
- **Gate travel cost** — Gates might have a fixed fuel cost per jump
- **Warp mechanics** — Ships might warp (not fly linearly) which changes everything
- **Heat dissipation over time** — We model heat as static, but it likely changes during travel
- **Fuel efficiency modifiers** — Ship modules or skills might affect consumption
- **Route optimization** — Shortest path through gates vs. straight-line distance

### Resources checked

- `https://docs.evefrontier.com` — No fuel/travel mechanics documented
- World API endpoints `/v2/fuel`, `/v2/travel`, `/v2/navigation`, `/v2/routes` — All 404
- Ship detail API — Has physics stats but no explicit fuel burn rate field
