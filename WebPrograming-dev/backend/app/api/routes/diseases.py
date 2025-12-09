from fastapi import APIRouter, Depends

from app.deps import get_graphdb_client
from app.services.graphdb_client import GraphDBClient

router = APIRouter(prefix="/diseases", tags=["diseases"])


@router.get("", summary="List diseases for main cards")
async def list_diseases(graphdb: GraphDBClient = Depends(get_graphdb_client)):
    # TODO: replace stub with GraphDB query for disease summaries
    sample = [
        {"id": "disease-1", "name": "Example Disease", "level": "A", "summary": "Short description"},
        {"id": "disease-2", "name": "Sample Infection", "level": "B", "summary": "Short description"},
    ]
    return {"items": sample, "source": "stub", "graphdb": graphdb._endpoint}
