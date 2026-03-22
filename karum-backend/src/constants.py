from pathlib import Path

from src.config import config

DATA_DIR = Path(config.data_dir)
NODES_FILE = DATA_DIR / "nodes.json"
SHIPS_FILE = DATA_DIR / "ships.json"
TYPES_FILE = DATA_DIR / "types.json"
ITEMS_FILE = DATA_DIR / "items.json"
IMAGES_DIR = DATA_DIR / "images" / "icons"

# Fuel calculation constants (same as frontend)
BASE_MASS_CONSTANT = 50_000_000
DISTANCE_SCALE = 1e-17
