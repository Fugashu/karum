import asyncio
import json
import math
from dataclasses import dataclass

import httpx
import networkx as nx
import numpy as np
from scipy.spatial import KDTree
from loguru import logger

from src.config import config
from src.constants import NODES_FILE, SHIPS_FILE, TYPES_FILE


def _distance(a: dict, b: dict) -> float:
    dx = a["location"]["x"] - b["location"]["x"]
    dy = a["location"]["y"] - b["location"]["y"]
    dz = a["location"]["z"] - b["location"]["z"]
    return math.sqrt(dx * dx + dy * dy + dz * dz)


async def _fetch_paginated(client: httpx.AsyncClient, endpoint: str, limit: int = 1000) -> list[dict]:
    items = []
    offset = 0

    while True:
        resp = await client.get(endpoint, params={"limit": limit, "offset": offset})
        resp.raise_for_status()
        data = resp.json()
        items.extend(data["data"])
        total = data["metadata"]["total"]
        logger.info(f"Fetched {endpoint} {len(items)}/{total}")
        if len(items) >= total:
            break
        offset += limit

    return items


async def _fetch_with_retry(
    client: httpx.AsyncClient,
    url: str,
    semaphore: asyncio.Semaphore,
) -> dict:
    attempt = 0
    async with semaphore:
        while True:
            try:
                resp = await client.get(url, timeout=10.0)
                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                attempt += 1
                wait = min(2 ** attempt, 30)  # cap at 30s
                logger.debug(f"{url} attempt {attempt} failed, retrying in {wait}s: {e}")
                await asyncio.sleep(wait)


# ============================================================================
# Nodes (solar systems with gate links)
# ============================================================================

async def fetch_and_save_nodes(client: httpx.AsyncClient) -> list[dict]:
    systems = await _fetch_paginated(client, "/v2/solarsystems")
    logger.info(f"Total systems: {len(systems)}")

    semaphore = asyncio.Semaphore(config.fetch_concurrency)
    tasks = [_fetch_with_retry(client, f"/v2/solarsystems/{s['id']}", semaphore) for s in systems]

    nodes = []
    for i, coro in enumerate(asyncio.as_completed(tasks)):
        result = await coro
        nodes.append(result)
        if (i + 1) % 1000 == 0:
            logger.info(f"Fetched details {i + 1}/{len(systems)}, with gates: {sum(1 for n in nodes if n.get('gateLinks'))}")

    logger.info(f"Fetched {len(nodes)} nodes, {sum(1 for n in nodes if n.get('gateLinks'))} have gates")
    NODES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(NODES_FILE, "w") as f:
        json.dump(nodes, f)
    logger.info(f"Saved nodes to {NODES_FILE}")

    return nodes


# ============================================================================
# Ships (detail endpoint per ship)
# ============================================================================

async def fetch_and_save_ships(client: httpx.AsyncClient) -> list[dict]:
    ship_list = await _fetch_paginated(client, "/v2/ships", limit=20)
    logger.info(f"Total ships: {len(ship_list)}")

    semaphore = asyncio.Semaphore(config.fetch_concurrency)
    tasks = [_fetch_with_retry(client, f"/v2/ships/{s['id']}", semaphore) for s in ship_list]

    ships = []
    for coro in asyncio.as_completed(tasks):
        result = await coro
        ships.append(result)

    logger.info(f"Fetched {len(ships)} ship details")
    SHIPS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SHIPS_FILE, "w") as f:
        json.dump(ships, f)
    logger.info(f"Saved ships to {SHIPS_FILE}")

    return ships


# ============================================================================
# Types (fuel, resources, etc.)
# ============================================================================

async def fetch_and_save_types(client: httpx.AsyncClient) -> list[dict]:
    types = await _fetch_paginated(client, "/v2/types")
    logger.info(f"Fetched {len(types)} types")
    TYPES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(TYPES_FILE, "w") as f:
        json.dump(types, f)
    logger.info(f"Saved types to {TYPES_FILE}")

    return types


# ============================================================================
# Graph building
# ============================================================================

def build_graph(nodes: list[dict]) -> nx.Graph:
    """
    Build a traversable graph from solar system data.

    Edges are created from:
    1. Intra-constellation: all systems in the same constellation are connected
       (you can fly between nearby systems)
    2. Gate links: stargates connecting systems across constellations
    3. Cross-constellation nearest neighbors: each system connects to its closest
       neighbor in a different constellation (bridging isolated clusters)
    """
    G = nx.Graph()

    by_id: dict[int, dict] = {}
    by_constellation: dict[int, list[dict]] = {}
    for node in nodes:
        by_id[node["id"]] = node
        G.add_node(node["id"], name=node.get("name", ""), location=node.get("location", {}))
        by_constellation.setdefault(node.get("constellationId", 0), []).append(node)

    gate_edges = 0
    constellation_edges = 0
    neighbor_edges = 0

    # 1. Intra-constellation edges
    for systems in by_constellation.values():
        for i, a in enumerate(systems):
            for b in systems[i + 1:]:
                weight = _distance(a, b)
                if not G.has_edge(a["id"], b["id"]):
                    G.add_edge(a["id"], b["id"], weight=weight)
                    constellation_edges += 1

    # 2. Gate link edges (may connect across constellations)
    for node in nodes:
        for gate in node.get("gateLinks", []):
            dest_id = gate["destination"]["id"]
            if dest_id not in by_id:
                continue
            weight = _distance(node, by_id[dest_id])
            if not G.has_edge(node["id"], dest_id):
                G.add_edge(node["id"], dest_id, weight=weight)
                gate_edges += 1

    # 3. Cross-constellation nearest neighbor using KDTree
    #    Bridges isolated constellations that have no gates
    coords = np.array([[n["location"]["x"], n["location"]["y"], n["location"]["z"]] for n in nodes])
    tree = KDTree(coords)

    # Query k=10 nearest, then pick closest that's in a different constellation
    _, indices = tree.query(coords, k=10)
    for i, node in enumerate(nodes):
        node_const = node.get("constellationId")
        for j in indices[i][1:]:  # skip self at index 0
            other = nodes[j]
            if other.get("constellationId") == node_const:
                continue
            weight = _distance(node, other)
            if not G.has_edge(node["id"], other["id"]):
                G.add_edge(node["id"], other["id"], weight=weight)
                neighbor_edges += 1
            break

    total = constellation_edges + gate_edges + neighbor_edges
    logger.info(
        f"Graph: {G.number_of_nodes()} nodes, {total} edges "
        f"(constellation={constellation_edges}, gates={gate_edges}, neighbors={neighbor_edges})"
    )
    return G


# ============================================================================
# Reference data container
# ============================================================================

@dataclass
class GameData:
    graph: nx.Graph
    ships: dict[int, dict]  # id -> ship detail
    fuel_types: dict[int, dict]  # id -> type (filtered to fuel only)


def _load_json(path) -> list[dict]:
    with open(path) as f:
        return json.load(f)


async def init_game_data() -> GameData:
    """Load all reference data from cache or fetch from API."""
    async with httpx.AsyncClient(base_url=config.world_api_url) as client:
        # Nodes
        if NODES_FILE.exists():
            logger.info(f"Loading cached nodes from {NODES_FILE}")
            nodes = _load_json(NODES_FILE)
        else:
            logger.info("No cached nodes, fetching from API...")
            nodes = await fetch_and_save_nodes(client)

        # Ships
        if SHIPS_FILE.exists():
            logger.info(f"Loading cached ships from {SHIPS_FILE}")
            ships_list = _load_json(SHIPS_FILE)
        else:
            logger.info("No cached ships, fetching from API...")
            ships_list = await fetch_and_save_ships(client)

        # Types
        if TYPES_FILE.exists():
            logger.info(f"Loading cached types from {TYPES_FILE}")
            types_list = _load_json(TYPES_FILE)
        else:
            logger.info("No cached types, fetching from API...")
            types_list = await fetch_and_save_types(client)

    graph = build_graph(nodes)
    ships = {s["id"]: s for s in ships_list}
    fuel_types = {
        t["id"]: t
        for t in types_list
        if t.get("groupName") in ("Crude Fuel", "Hydrogen Fuel")
    }

    logger.info(f"Ships: {len(ships)}, Fuel types: {len(fuel_types)}")

    return GameData(graph=graph, ships=ships, fuel_types=fuel_types)
