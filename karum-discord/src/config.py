from pydantic_settings import BaseSettings


class Config(BaseSettings):
    discord_token: str = ""
    sui_rpc_url: str = "https://fullnode.testnet.sui.io"
    sui_graphql_url: str = "https://graphql.testnet.sui.io/graphql"
    eve_world_package_id: str = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
    registry_package_id: str = "0xd247fa711afcf18a6dd28ee209e03c84bb81ec86cdd1f306fe941e141ecc4c14"
    poll_interval_seconds: int = 30
    command_prefix: str = "!"
    guild_config_path: str = "data/guilds.json"

    model_config = {"env_file": [".env", ".env.local"], "env_prefix": "KARUM_"}


config = Config()
