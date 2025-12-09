from fastapi import APIRouter, Depends, Query

from app.deps import get_graphdb_client
from app.services.graphdb_client import GraphDBClient

router = APIRouter(prefix="/hospitals", tags=["hospitals"])


@router.get("", summary="List hospitals and isolation facilities")
async def list_hospitals(
    region: str | None = Query(None, description="Optional region code"),
    graphdb: GraphDBClient = Depends(get_graphdb_client),
):
    # TODO: fetch hospital/isolation facility data from GraphDB
    return {
        "region": region,
        "items": [],
        "note": "Replace with GraphDB hospitals query",
        "graphdb": graphdb._endpoint,
    }
