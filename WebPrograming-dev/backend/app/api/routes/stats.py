from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import get_graphdb_client
from app.services.graphdb_client import GraphDBClient

router = APIRouter(prefix="/stats", tags=["stats"])

# Namespaces aligned with TTL files
SKOS_PREFIX = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>"
KOID_PREFIX = "PREFIX koid: <http://knowledgemap.kr/koid/def/>"
DCT_PREFIX = "PREFIX dcterms: <http://purl.org/dc/terms/>"
SCHEMA_PREFIX = "PREFIX schema: <http://schema.org/>"


async def query_region_timeseries(
    graphdb: GraphDBClient, disease_id: str, region: str, year: Optional[int] = None, limit: int = 5
) -> List[Dict[str, Any]]:
    """Fetch recent incidence stats by region/year."""
    year_filter = ""
    if year is not None:
        year_filter = f'FILTER(STR(?yearVal) = "{year}")'

    sparql = f"""
{SKOS_PREFIX}
{KOID_PREFIX}
{DCT_PREFIX}
{SCHEMA_PREFIX}
SELECT ?yearVal ?incidenceRate ?caseCount WHERE {{
  ?stat schema:location ?loc .
  ?loc skos:prefLabel ?regionLabel .
  ?stat schema:name ?diseaseConcept .
  ?diseaseConcept skos:prefLabel ?dLabel .
  OPTIONAL {{ ?stat koid:year ?yearVal . }}
  OPTIONAL {{ ?stat dcterms:identifier ?yearVal . }}
  OPTIONAL {{ ?stat koid:incidenceRate ?incidenceRate . }}
  OPTIONAL {{ ?stat koid:caseCount ?caseCount . }}
  FILTER(CONTAINS(LCASE(?regionLabel), LCASE("{region}")))
  FILTER(CONTAINS(LCASE(?dLabel), LCASE("{disease_id}")))
  {year_filter}
}}
ORDER BY DESC(?yearVal)
LIMIT {limit}
"""
    try:
        data = await graphdb.query(sparql)
    except Exception as exc:
        logging.getLogger(__name__).exception("SPARQL error (region timeseries)")
        raise HTTPException(status_code=502, detail=f"GraphDB query failed: {exc}")
    series: List[Dict[str, Any]] = []
    for b in data.get("results", {}).get("bindings", []):
        year_val = b.get("yearVal", {}).get("value")
        try:
            year_int = int(year_val)
        except (TypeError, ValueError):
            continue
        incidence = b.get("incidenceRate", {}).get("value")
        case_count = b.get("caseCount", {}).get("value")
        series.append(
            {
                "year": year_int,
                "incidenceRate": float(incidence) if incidence is not None else None,
                "caseCount": int(case_count) if case_count is not None else None,
            }
        )
    series.sort(key=lambda x: x["year"])
    return series


async def query_gender_age_breakdown(
    graphdb: GraphDBClient,
    disease_id: str,
    region: str,
    base_year: Optional[int],
    gender: Optional[str] = None,
    age_group: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Attempts to fetch gender/age breakdown. If not present in the graph, returns [].
    """
    filters = []
    if gender:
        filters.append(f'FILTER(LCASE(?gender) = LCASE("{gender}"))')
    if age_group:
        filters.append(f'FILTER(LCASE(?ageGroup) = LCASE("{age_group}"))')
    if base_year:
        filters.append(f'FILTER(STR(?yearVal) = "{base_year}")')
    filter_block = "\n  ".join(filters)

    sparql = f"""
{SKOS_PREFIX}
{KOID_PREFIX}
{DCT_PREFIX}
{SCHEMA_PREFIX}
SELECT ?gender ?ageGroup ?incidenceRate ?caseCount ?yearVal WHERE {{
  ?stat schema:location ?loc .
  ?loc skos:prefLabel ?regionLabel .
  ?stat schema:name ?diseaseConcept .
  ?diseaseConcept skos:prefLabel ?dLabel .
  OPTIONAL {{ ?stat koid:gender ?gender . }}
  OPTIONAL {{ ?stat koid:ageGroup ?ageGroup . }}
  OPTIONAL {{ ?stat koid:year ?yearVal . }}
  OPTIONAL {{ ?stat dcterms:identifier ?yearVal . }}
  OPTIONAL {{ ?stat koid:incidenceRate ?incidenceRate . }}
  OPTIONAL {{ ?stat koid:caseCount ?caseCount . }}
  FILTER(CONTAINS(LCASE(?regionLabel), LCASE("{region}")))
  FILTER(CONTAINS(LCASE(?dLabel), LCASE("{disease_id}")))
  {filter_block}
}}
LIMIT 200
"""
    try:
        data = await graphdb.query(sparql)
    except Exception as exc:
        logging.getLogger(__name__).exception("SPARQL error (gender/age breakdown)")
        raise HTTPException(status_code=502, detail=f"GraphDB query failed: {exc}")
    breakdown: List[Dict[str, Any]] = []
    for b in data.get("results", {}).get("bindings", []):
        breakdown.append(
            {
                "gender": b.get("gender", {}).get("value"),
                "ageGroup": b.get("ageGroup", {}).get("value"),
                "incidenceRate": float(b.get("incidenceRate", {}).get("value"))
                if b.get("incidenceRate")
                else None,
                "caseCount": int(b.get("caseCount", {}).get("value")) if b.get("caseCount") else None,
                "year": b.get("yearVal", {}).get("value"),
            }
        )
    return breakdown


@router.get("/incidence", summary="Incidence statistics by disease/region")
async def incidence_stats(
    diseaseId: str = Query(..., description="Disease identifier or label"),
    region: str = Query(..., description="Region name/label"),
    year: int | None = Query(None, description="Specific year; defaults to recent entries"),
    gender: str | None = Query(None, description="Optional gender filter"),
    ageGroup: str | None = Query(None, description="Optional age-group filter"),
    graphdb: GraphDBClient = Depends(get_graphdb_client),
):
    try:
        by_region = await query_region_timeseries(graphdb, diseaseId, region, year=year, limit=5)
        latest_year = year
        if not latest_year and by_region:
            latest_year = by_region[-1]["year"]

        by_gender_age = await query_gender_age_breakdown(
            graphdb, diseaseId, region, latest_year, gender=gender, age_group=ageGroup
        )

        return {
            "diseaseId": diseaseId,
            "region": region,
            "years": [item["year"] for item in by_region],
            "byRegion": by_region,
            "byGenderAge": by_gender_age,
            "filters": {"gender": gender, "ageGroup": ageGroup, "year": year},
        }
    except HTTPException:
        raise
    except Exception as exc:
        logging.getLogger(__name__).exception("Incidence endpoint error")
        raise HTTPException(status_code=502, detail=f"GraphDB query failed: {exc}")
