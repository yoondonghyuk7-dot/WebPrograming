from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    graphdb_endpoint: str = "http://localhost:7200/repositories/your-repo"
    graphdb_username: str | None = None
    graphdb_password: str | None = None

    api_host: str = "0.0.0.0"
    api_port: int = 8001

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
