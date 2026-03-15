"""Per-guild configuration stored as JSON."""

import json
from pathlib import Path

from loguru import logger

from src.config import config

_path = Path(config.guild_config_path)
_guilds: dict[int, dict] = {}


def _load():
    global _guilds
    if not _path.exists():
        _guilds = {}
        return
    try:
        with open(_path) as f:
            raw = json.load(f)
        _guilds = {int(k): v for k, v in raw.items()}
    except Exception as e:
        logger.warning(f"Failed to load guild config: {e}")
        _guilds = {}


def _save():
    _path.parent.mkdir(parents=True, exist_ok=True)
    with open(_path, "w") as f:
        json.dump({str(k): v for k, v in _guilds.items()}, f, indent=2)


_load()


def set_notification_channel(guild_id: int, channel_id: int):
    if guild_id not in _guilds:
        _guilds[guild_id] = {}
    _guilds[guild_id]["notification_channel_id"] = channel_id
    _save()
    logger.info(f"Guild {guild_id}: notification channel set to {channel_id}")


def get_notification_channel(guild_id: int) -> int | None:
    return _guilds.get(guild_id, {}).get("notification_channel_id")


def get_all_notification_channels() -> list[int]:
    """Return all configured channel IDs across all guilds."""
    return [
        g["notification_channel_id"]
        for g in _guilds.values()
        if "notification_channel_id" in g
    ]
