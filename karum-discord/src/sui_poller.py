"""Polls Sui for ShopRegistered events and notifies Discord."""

import asyncio

import discord
import httpx
from loguru import logger

from src.config import config
from src.guild_config import get_all_notification_channels
from src.sui_client import sui_client


EVENT_TYPE = f"{config.registry_package_id}::registry::ShopRegistered"


async def query_events(cursor: str | None = None) -> tuple[list[dict], str | None]:
    """Query ShopRegistered events from Sui JSON-RPC."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "suix_queryEvents",
        "params": [
            {"MoveEventType": EVENT_TYPE},
            cursor,
            10,
            True,  # descending
        ],
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(config.sui_rpc_url, json=payload, timeout=10.0)
        resp.raise_for_status()
        result = resp.json().get("result", {})

    events = result.get("data", [])
    next_cursor = result.get("nextCursor")
    return events, next_cursor


async def build_embed(event: dict) -> discord.Embed:
    """Build a Discord embed from a ShopRegistered event."""
    parsed = event.get("parsedJson", {})
    name = parsed.get("name", "Unknown")
    solar_system = parsed.get("solar_system", "Unknown")
    owner = parsed.get("owner", "")
    ssu_id = parsed.get("ssu_id", "")

    owner_short = f"{owner[:6]}...{owner[-4:]}" if len(owner) > 10 else owner
    ssu_short = f"{ssu_id[:6]}...{ssu_id[-4:]}" if len(ssu_id) > 10 else ssu_id

    owner_name = await sui_client.get_username(owner)
    owner_display = f"{owner_name} ({owner_short})" if owner_name else owner_short

    embed = discord.Embed(
        title=f"New Shop: {name}",
        description="A new shop has been registered on the KARUM marketplace.",
        color=0xE8A832,
    )
    embed.add_field(name="Solar System", value=solar_system, inline=True)
    embed.add_field(name="Owner", value=owner_display, inline=True)
    embed.add_field(name="SSU", value=ssu_short, inline=False)
    embed.set_footer(text="KARUM — The Frontier's First Marketplace Network")

    return embed


async def poll_loop(bot: discord.Client):
    """Poll for new ShopRegistered events and broadcast to all configured channels."""
    await bot.wait_until_ready()

    logger.info(f"Polling for ShopRegistered events every {config.poll_interval_seconds}s")

    # Seed seen IDs from latest events
    seen_ids: set[str] = set()
    try:
        events, _ = await query_events()
        for e in events:
            seen_ids.add(_event_id(e))
        logger.info(f"Initial state: {len(seen_ids)} existing events")
    except Exception as e:
        logger.error(f"Failed to seed events: {e}")

    while not bot.is_closed():
        await asyncio.sleep(config.poll_interval_seconds)

        try:
            events, _ = await query_events()
            for event in events:
                eid = _event_id(event)
                if eid in seen_ids:
                    continue

                seen_ids.add(eid)
                embed = await build_embed(event)
                shop_name = event.get("parsedJson", {}).get("name", "?")

                channel_ids = get_all_notification_channels()
                if not channel_ids:
                    logger.debug(f"New shop '{shop_name}' but no channels configured")
                    continue

                for cid in channel_ids:
                    ch = bot.get_channel(cid)
                    if not ch:
                        continue
                    try:
                        await ch.send(embed=embed)
                        logger.info(f"Posted '{shop_name}' to #{ch}")
                    except Exception as e:
                        logger.warning(f"Failed to send to channel {cid}: {e}")
        except Exception as e:
            logger.error(f"Poll error: {e}")


def _event_id(event: dict) -> str:
    eid = event.get("id", {})
    return eid.get("txDigest", "") + str(eid.get("eventSeq", ""))
