"""Integration test using real cached node data."""
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.constants import NODES_FILE, SHIPS_FILE, TYPES_FILE
from src.graph import build_graph, GameData, _load_json
from src.main import app
from src import routes


@pytest.fixture(autouse=True)
def real_game_data():
    if not NODES_FILE.exists():
        pytest.skip("No cached nodes.json — run `make fetch-nodes` first")

    nodes = _load_json(NODES_FILE)

    ships_list = _load_json(SHIPS_FILE) if SHIPS_FILE.exists() else []
    types_list = _load_json(TYPES_FILE) if TYPES_FILE.exists() else []

    start = time.perf_counter()
    graph = build_graph(nodes)
    build_time = time.perf_counter() - start
    print(f"\nGraph build time: {build_time:.2f}s")

    ships = {s["id"]: s for s in ships_list}
    fuel_types = {
        t["id"]: t for t in types_list
        if t.get("groupName") in ("Crude Fuel", "Hydrogen Fuel")
    }

    routes.game_data = GameData(graph=graph, ships=ships, fuel_types=fuel_types)
    yield
    routes.game_data = None


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


def test_route_eq5_to_if2(client):
    """Route from EQ5-N6N (30018324) to IF2-S94 (30016358)."""
    start = time.perf_counter()
    resp = client.post("/api/route", json={
        "from_system_id": 30018324,
        "to_system_id": 30016358,
    })
    elapsed = time.perf_counter() - start

    print(f"Route calculation took: {elapsed * 1000:.1f}ms")
    assert resp.status_code == 200

    data = resp.json()
    print(f"Jumps: {data['total_jumps']}")
    print(f"Distance: {data['total_distance']:.2e}")
    print(f"Path: {' -> '.join(s['system_name'] for s in data['path'][:10])}{'...' if len(data['path']) > 10 else ''}")


def test_calculate_eq5_to_if2(client):
    """Full calculation from EQ5-N6N to IF2-S94 with Wend + D1 Fuel."""
    start = time.perf_counter()
    resp = client.post("/api/calculate", json={
        "from_system_id": 30018324,
        "to_system_id": 30016358,
        "ship_id": 87698,
        "fuel_type_id": 88335,
        "cargo_percent": 50,
        "heat_percent": 30,
    })
    elapsed = time.perf_counter() - start

    print(f"Calculate took: {elapsed * 1000:.1f}ms")
    assert resp.status_code == 200

    data = resp.json()
    print(f"Jumps: {data['total_jumps']}")
    print(f"Fuel: {data['fuel_needed']}/{data['fuel_capacity']} (can complete: {data['can_complete']})")
    print(f"Travel time: {data['travel_time_seconds']}s")
    print(f"Ship: {data['ship_name']}, Fuel: {data['fuel_name']}")
