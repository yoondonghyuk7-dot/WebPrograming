from functools import lru_cache

from app.core.config import get_settings
from app.services.graphdb_client import GraphDBClient


@lru_cache
def get_graphdb_client() -> GraphDBClient:
    settings = get_settings()
    return GraphDBClient(
        endpoint=settings.graphdb_endpoint,
        username=settings.graphdb_username,
        password=settings.graphdb_password,
    )
