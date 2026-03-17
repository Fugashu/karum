"""SUI client for querying on-chain data (character names, etc.)."""

import httpx
from loguru import logger

from src.config import config

CHARACTER_TYPE = f"{config.eve_world_package_id}::character::Character"


class SUIClient:
    def __init__(self):
        # wallet address (lowercase) -> character name
        self._name_cache: dict[str, str] = {}

    async def get_username(self, wallet_address: str) -> str | None:
        """Resolve a wallet address to an EVE Frontier character name.

        Returns the character name or None if not found.
        """
        if not wallet_address:
            return None

        wallet_lower = wallet_address.lower()
        if wallet_lower in self._name_cache:
            return self._name_cache[wallet_lower]

        await self._refresh_name_cache()
        return self._name_cache.get(wallet_lower)

    async def _refresh_name_cache(self) -> None:
        """Fetch all Character objects from Sui GraphQL and populate the cache."""
        cursor: str | None = None
        has_more = True

        while has_more:
            after_clause = f'after: "{cursor}"' if cursor else ""
            query = f"""{{
              objects(
                filter: {{ type: "{CHARACTER_TYPE}" }}
                first: 50
                {after_clause}
              ) {{
                nodes {{
                  address
                  asMoveObject {{
                    contents {{
                      json
                    }}
                  }}
                }}
                pageInfo {{
                  hasNextPage
                  endCursor
                }}
              }}
            }}"""

            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        config.sui_graphql_url,
                        json={"query": query},
                        headers={"Content-Type": "application/json"},
                        timeout=10.0,
                    )
                    resp.raise_for_status()
            except Exception as e:
                logger.warning(f"GraphQL character lookup failed: {e}")
                return

            data = resp.json()
            nodes = (
                data.get("data", {}).get("objects", {}).get("nodes", [])
            )
            if not isinstance(nodes, list):
                return

            for node in nodes:
                fields = (
                    node.get("asMoveObject", {})
                    .get("contents", {})
                    .get("json", {})
                )
                if not fields:
                    continue
                addr = (fields.get("character_address") or "").lower()
                name = (fields.get("metadata") or {}).get("name") or ""
                if addr and name:
                    self._name_cache[addr] = name

            page_info = (
                data.get("data", {}).get("objects", {}).get("pageInfo", {})
            )
            if not page_info.get("hasNextPage"):
                has_more = False
            else:
                cursor = page_info.get("endCursor")

        logger.info(f"Character name cache refreshed: {len(self._name_cache)} entries")


sui_client = SUIClient()
