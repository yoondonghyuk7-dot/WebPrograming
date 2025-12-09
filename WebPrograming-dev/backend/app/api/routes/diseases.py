from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query

from app.deps import get_graphdb_client
from app.services.graphdb_client import GraphDBClient

router = APIRouter(prefix="/diseases", tags=["diseases"])

SKOS_PREFIX = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>"
KOID_PREFIX = "PREFIX koid: <http://knowledgemap.kr/koid/def/>"
DCT_PREFIX = "PREFIX dcterms: <http://purl.org/dc/terms/>"
SCHEMA_PREFIX = "PREFIX schema: <http://schema.org/>"


def grade_to_type(grade: str | None) -> str:
    if not grade:
        return "grade2"
    if "1" in grade:
        return "grade1"
    if "2" in grade:
        return "grade2"
    if "3" in grade:
        return "grade3"
    return "grade4"


@router.get("", summary="List diseases for main cards")
async def list_diseases(
    limit: int = Query(4, ge=1, le=50, description="Number of diseases to return"),
    graphdb: GraphDBClient = Depends(get_graphdb_client),
):
    sparql = f"""
{SKOS_PREFIX}
{KOID_PREFIX}
{DCT_PREFIX}
{SCHEMA_PREFIX}
SELECT ?disease ?nameKo ?identifier ?grade ?definition WHERE {{
  ?disease a schema:InfectiousDisease .
  OPTIONAL {{ ?disease skos:prefLabel ?nameKo . FILTER(LANG(?nameKo) = "ko") }}
  OPTIONAL {{ ?disease dcterms:identifier ?identifier . }}
  OPTIONAL {{ ?disease koid:classificationLevel ?grade . }}
  OPTIONAL {{ ?disease koid:definition ?definition . }}
  OPTIONAL {{ ?disease schema:description ?definition . }}
}}
ORDER BY ?grade ?nameKo
LIMIT {limit}
"""
    data = await graphdb.query(sparql)
    diseases: List[Dict[str, Any]] = []
    for b in data.get("results", {}).get("bindings", []):
        uri = b.get("disease", {}).get("value")
        name_ko = b.get("nameKo", {}).get("value") if b.get("nameKo") else None
        identifier = b.get("identifier", {}).get("value") if b.get("identifier") else None
        grade = b.get("grade", {}).get("value") if b.get("grade") else None
        definition = b.get("definition", {}).get("value") if b.get("definition") else ""

        fallback_id = uri.rsplit("/", 1)[-1] if uri else None
        disease_id = identifier or fallback_id
        display_name = name_ko or fallback_id or "Unknown"

        diseases.append(
            {
                "id": uri,
                "diseaseId": disease_id,
                "name": display_name,
                "nameKo": display_name,
                "grade": grade or "",
                "gradeType": grade_to_type(grade),
                "definition": definition,
                "description": definition,
            }
        )

    return {"diseases": diseases}
