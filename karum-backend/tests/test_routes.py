import networkx as nx
import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.graph import GameData
from src import routes


@pytest.fixture(autouse=True)
def mock_game_data():
    """Create a small test graph with ships and fuel types."""
    G = nx.Graph()
    G.add_node(1, name="System A", location={"x": 0, "y": 0, "z": 0})
    G.add_node(2, name="System B", location={"x": 1e18, "y": 0, "z": 0})
    G.add_node(3, name="System C", location={"x": 2e18, "y": 0, "z": 0})
    G.add_node(4, name="System D", location={"x": 0, "y": 1e18, "z": 0})
    # A-B-C chain, D is disconnected
    G.add_edge(1, 2, weight=1e18)
    G.add_edge(2, 3, weight=1e18)

    ships = {
        87698: {
            "id": 87698,
            "name": "Wend",
            "className": "Shuttle",
            "physics": {"mass": 6800000, "maximumVelocity": 260, "heat": {"heatCapacity": 2, "conductance": 1.5}},
            "fuelCapacity": 200,
        }
    }

    fuel_types = {
        88335: {"id": 88335, "name": "D1 Fuel", "groupName": "Hydrogen Fuel", "mass": 20, "volume": 0.28}
    }

    routes.game_data = GameData(graph=G, ships=ships, fuel_types=fuel_types)
    yield
    routes.game_data = None


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["ready"] is True


def test_route_direct(client):
    resp = client.post("/api/route", json={"from_system_id": 1, "to_system_id": 2})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_jumps"] == 1
    assert len(data["path"]) == 2
    assert data["path"][0]["system_name"] == "System A"
    assert data["path"][1]["system_name"] == "System B"


def test_route_multi_hop(client):
    resp = client.post("/api/route", json={"from_system_id": 1, "to_system_id": 3})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_jumps"] == 2
    assert len(data["path"]) == 3


def test_route_disconnected(client):
    """System D is in a disconnected component (no edges in test graph)."""
    resp = client.post("/api/route", json={"from_system_id": 1, "to_system_id": 4})
    assert resp.status_code == 404
    assert "No route" in resp.json()["detail"]


def test_route_unknown_system(client):
    resp = client.post("/api/route", json={"from_system_id": 1, "to_system_id": 999})
    assert resp.status_code == 404


def test_calculate(client):
    resp = client.post("/api/calculate", json={
        "from_system_id": 1,
        "to_system_id": 3,
        "ship_id": 87698,
        "fuel_type_id": 88335,
        "cargo_percent": 50,
        "heat_percent": 30,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_jumps"] == 2
    assert data["ship_name"] == "Wend"
    assert data["fuel_name"] == "D1 Fuel"
    assert data["fuel_needed"] > 0
    assert data["fuel_capacity"] == 200
    assert isinstance(data["can_complete"], bool)
    assert data["effective_velocity"] > 0
    assert data["travel_time_seconds"] > 0


def test_calculate_unknown_ship(client):
    resp = client.post("/api/calculate", json={
        "from_system_id": 1,
        "to_system_id": 2,
        "ship_id": 999,
        "fuel_type_id": 88335,
    })
    assert resp.status_code == 404
    assert "Ship" in resp.json()["detail"]


def test_calculate_unknown_fuel(client):
    resp = client.post("/api/calculate", json={
        "from_system_id": 1,
        "to_system_id": 2,
        "ship_id": 87698,
        "fuel_type_id": 999,
    })
    assert resp.status_code == 404
    assert "Fuel" in resp.json()["detail"]


def test_neighbors(client):
    resp = client.get("/api/systems/2/neighbors")
    assert resp.status_code == 200
    data = resp.json()
    names = {s["system_name"] for s in data}
    assert names == {"System A", "System C"}


def test_graph_stats(client):
    resp = client.get("/api/graph/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["nodes"] == 4
    assert data["edges"] == 2
    assert data["ships"] == 1
    assert data["fuel_types"] == 1


def test_list_ships(client):
    resp = client.get("/api/ships")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Wend"


def test_list_fuel_types(client):
    resp = client.get("/api/fuel-types")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "D1 Fuel"
