import json

import networkx as nx
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from src.graph import GameData
from src.calculator import calculate_fuel
from src.constants import ITEMS_FILE, IMAGES_DIR

router = APIRouter()

# Set by main.py on startup
game_data: GameData | None = None


class RouteStep(BaseModel):
    system_id: int
    system_name: str


class RouteRequest(BaseModel):
    from_system_id: int
    to_system_id: int


class RouteResponse(BaseModel):
    path: list[RouteStep]
    total_jumps: int
    total_distance: float
    distances: list[float]


class CalculateRequest(BaseModel):
    from_system_id: int
    to_system_id: int
    ship_id: int
    fuel_type_id: int
    cargo_percent: float = Field(ge=0, le=100, default=50)
    heat_percent: float = Field(ge=0, le=100, default=30)


class CalculateResponse(BaseModel):
    path: list[RouteStep]
    total_jumps: int
    total_distance: float
    distances: list[float]
    distance_au: float
    fuel_needed: int
    fuel_capacity: int
    can_complete: bool
    travel_time_seconds: int
    effective_velocity: int
    total_mass: float
    ship_name: str
    fuel_name: str


def _require_graph() -> nx.Graph:
    if not game_data:
        raise HTTPException(status_code=503, detail="Game data not initialized yet")
    return game_data.graph


def _find_path(graph: nx.Graph, from_id: int, to_id: int) -> tuple[list[int], list[float]]:
    if from_id not in graph:
        raise HTTPException(status_code=404, detail=f"System {from_id} not found. It may not have been fetched yet — try re-fetching nodes.")
    if to_id not in graph:
        raise HTTPException(status_code=404, detail=f"System {to_id} not found. It may not have been fetched yet — try re-fetching nodes.")

    try:
        path_ids = nx.dijkstra_path(graph, from_id, to_id, weight="weight")
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=404, detail="No route found — these systems are in disconnected gate networks")

    distances = []
    for i in range(1, len(path_ids)):
        edge_data = graph.edges[path_ids[i - 1], path_ids[i]]
        distances.append(edge_data["weight"])

    return path_ids, distances


def _build_steps(graph: nx.Graph, path_ids: list[int]) -> list[RouteStep]:
    return [
        RouteStep(system_id=sid, system_name=graph.nodes[sid].get("name", ""))
        for sid in path_ids
    ]


@router.post("/route")
async def route(req: RouteRequest) -> RouteResponse:
    graph = _require_graph()
    path_ids, distances = _find_path(graph, req.from_system_id, req.to_system_id)

    return RouteResponse(
        path=_build_steps(graph, path_ids),
        total_jumps=len(path_ids) - 1,
        total_distance=sum(distances),
        distances=distances,
    )


@router.post("/calculate")
async def calculate(req: CalculateRequest) -> CalculateResponse:
    if not game_data:
        raise HTTPException(status_code=503, detail="Game data not initialized yet")

    graph = game_data.graph
    path_ids, distances = _find_path(graph, req.from_system_id, req.to_system_id)
    total_distance = sum(distances)

    ship = game_data.ships.get(req.ship_id)
    if not ship:
        raise HTTPException(status_code=404, detail=f"Ship {req.ship_id} not found")

    fuel = game_data.fuel_types.get(req.fuel_type_id)
    if not fuel:
        raise HTTPException(
            status_code=404,
            detail=f"Fuel type {req.fuel_type_id} not found. Available: {list(game_data.fuel_types.keys())}",
        )

    fuel_result = calculate_fuel(
        total_distance=total_distance,
        ship=ship,
        fuel_type=fuel,
        cargo_percent=req.cargo_percent,
        heat_percent=req.heat_percent,
    )

    return CalculateResponse(
        path=_build_steps(graph, path_ids),
        total_jumps=len(path_ids) - 1,
        total_distance=total_distance,
        distances=distances,
        ship_name=ship.get("name", ""),
        fuel_name=fuel.get("name", ""),
        **fuel_result,
    )


class BatchDistanceRequest(BaseModel):
    from_system_id: int
    to_system_ids: list[int]


class DistanceEntry(BaseModel):
    system_id: int
    distance: float
    jumps: int


@router.post("/distances")
async def batch_distances(req: BatchDistanceRequest) -> list[DistanceEntry]:
    """Calculate shortest path distances from one system to many."""
    graph = _require_graph()

    if req.from_system_id not in graph:
        raise HTTPException(status_code=404, detail=f"System {req.from_system_id} not found")

    # Single-source Dijkstra gives all distances at once — very efficient
    try:
        all_distances = nx.single_source_dijkstra_path_length(graph, req.from_system_id, weight="weight")
    except Exception:
        all_distances = {}

    # Also get jump counts via BFS (unweighted shortest path)
    try:
        all_jumps = nx.single_source_shortest_path_length(graph, req.from_system_id)
    except Exception:
        all_jumps = {}

    results = []
    for tid in req.to_system_ids:
        dist = all_distances.get(tid, -1)
        jumps = all_jumps.get(tid, -1)
        results.append(DistanceEntry(system_id=tid, distance=dist, jumps=jumps))

    return results


@router.get("/ships")
async def list_ships() -> list[dict]:
    if not game_data:
        raise HTTPException(status_code=503, detail="Game data not initialized yet")
    return list(game_data.ships.values())


@router.get("/fuel-types")
async def list_fuel_types() -> list[dict]:
    if not game_data:
        raise HTTPException(status_code=503, detail="Game data not initialized yet")
    return list(game_data.fuel_types.values())


@router.get("/systems/{system_id}/neighbors")
async def get_neighbors(system_id: int) -> list[RouteStep]:
    graph = _require_graph()
    if system_id not in graph:
        raise HTTPException(status_code=404, detail=f"System {system_id} not in graph")
    return [
        RouteStep(system_id=nid, system_name=graph.nodes[nid].get("name", ""))
        for nid in graph.neighbors(system_id)
    ]


@router.get("/graph/stats")
async def graph_stats() -> dict:
    graph = _require_graph()
    return {
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "connected_components": nx.number_connected_components(graph),
        "ships": len(game_data.ships) if game_data else 0,
        "fuel_types": len(game_data.fuel_types) if game_data else 0,
    }


# ---------------------------------------------------------------------------
# Items & Images
# ---------------------------------------------------------------------------

_items_cache: list[dict] | None = None


def _load_items() -> list[dict]:
    global _items_cache
    if _items_cache is not None:
        return _items_cache

    if not ITEMS_FILE.exists():
        raise HTTPException(status_code=503, detail="items.json not found")

    with open(ITEMS_FILE) as f:
        _items_cache = json.load(f)
    return _items_cache


@router.get("/items")
async def list_items() -> list[dict]:
    """Return all game items from the World API snapshot."""
    return _load_items()


@router.get("/items/{type_id}")
async def get_item(type_id: int) -> dict:
    """Return a single item by type ID."""
    items = _load_items()
    for item in items:
        if item["id"] == type_id:
            return item
    raise HTTPException(status_code=404, detail=f"Item {type_id} not found")


@router.get("/items/{type_id}/icon")
async def get_item_icon(type_id: int) -> FileResponse:
    """Return the icon PNG for an item by type ID.

    Looks for `{type_id}.png` in the images directory.
    Falls back to `default.png` if no specific icon exists.
    """
    icon_path = IMAGES_DIR / f"{type_id}.png"
    if icon_path.is_file():
        return FileResponse(icon_path, media_type="image/png")

    default_path = IMAGES_DIR / "default.png"
    if default_path.is_file():
        return FileResponse(default_path, media_type="image/png")

    raise HTTPException(status_code=404, detail=f"No icon for item {type_id}")
