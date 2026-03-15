from pydantic_settings import BaseSettings


class Config(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    world_api_url: str = "https://world-api-stillness.live.tech.evefrontier.com"
    data_dir: str = "data"
    fetch_concurrency: int = 5

    model_config = {"env_file": ".env.local", "env_prefix": "KARUM_"}


config = Config()
