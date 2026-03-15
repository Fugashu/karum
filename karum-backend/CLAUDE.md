# Karum Backend — Route Calculator API

FastAPI backend providing Dijkstra-based pathfinding through EVE Frontier's stargate network.

You're my coding assistant, remember these preferences:

## Structure

- `src/` for all source code, `tests/` for all tests — never tests in `src/`
- Early return always over nested ifs
- Use `make` commands over raw shell commands
- `uv add` is the only way to install packages
- `loguru` for logging, no `print()` or `logging`
- `httpx` over `requests`
- `pytest` for testing

## Stack

- **FastAPI** + **uvicorn** for the API
- **networkx** for graph/pathfinding (Dijkstra)
- **pydantic-settings** for config, loads from `.env.local`
- **httpx** for fetching gate data from EVE World API
- **loguru** for logging

## API Design

The backend fetches all solar system gate links from the EVE World API on startup,
builds a networkx graph, and serves shortest-path queries via REST.

## EVE World API

- Base: `https://world-api-stillness.live.tech.evefrontier.com` (prod/stillness)
- Base: `https://world-api-utopia.uat.pub.evefrontier.com` (dev/utopia)
- Solar systems list: `GET /v2/solarsystems?limit=1000&offset=0`
- Solar system detail (has gateLinks): `GET /v2/solarsystems/:id`
- Gate links are only available per-system (no bulk endpoint)

## Commands

```bash
make dev          # Run dev server
make test         # Run tests
make docker       # Build docker image
make help         # Show all targets
```
