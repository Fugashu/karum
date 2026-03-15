from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from src.graph import init_game_data
from src import routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — loading game data...")
    routes.game_data = await init_game_data()
    logger.info("Game data ready")
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Karum Route API",
    description="Dijkstra-based pathfinding through EVE Frontier's stargate network",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "ready": routes.game_data is not None}
