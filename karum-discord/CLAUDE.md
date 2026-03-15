# Karum Discord Bot

Discord bot for the Karum marketplace — EVE Frontier resource locator.

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

- **discord.py** for the bot
- **pydantic-settings** for config, loads from `.env.local`
- **httpx** for calling the Karum backend API
- **loguru** for logging

## Backend API

The bot calls the Karum backend at `KARUM_KARUM_API_URL`:
- `POST /api/calculate` — route calculation with fuel
- `POST /api/distances` — batch distances from one system to many
- `GET /api/ships` — list ships
- `GET /api/fuel-types` — list fuel types
- `GET /api/graph/stats` — graph statistics

## Commands

```bash
make dev          # Run the bot
make test         # Run tests
make docker       # Build docker image
make help         # Show all targets
```
