from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query

from app.deps import get_graphdb_client
from app.services.graphdb_client import GraphDBClient

router = APIRouter(prefix="/hospitals", tags=["hospitals"])

SKOS_PREFIX = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>"
KOID_PREFIX = "PREFIX koid: <http://knowledgemap.kr/koid/def/>"
KOAD_PREFIX = "PREFIX koad: <http://vocab.datahub.kr/def/administrative-division/>"
SCHEMA_PREFIX = "PREFIX schema: <http://schema.org/>"
DCTERMS_PREFIX = "PREFIX dcterms: <http://purl.org/dc/terms/>"


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in kilometers between two lat/lng points."""
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


async def fetch_hospitals(
    graphdb: GraphDBClient, region: Optional[str], needs_isolation: Optional[bool]
) -> List[Dict[str, Any]]:
    region_filter = f'FILTER(CONTAINS(LCASE(STR(?cityLabel)), LCASE("{region}")))' if region else ""
    isolation_filter = ""
    if needs_isolation is True:
        isolation_filter = "FILTER(xsd:integer(?isolationBeds) > 0)"

    # HospitalData.ttl 구조에 맞는 SPARQL 쿼리
    # 언어 태그(@ko)가 있는 리터럴을 처리하기 위해 STR() 사용
    sparql = f"""
{SKOS_PREFIX}
{KOID_PREFIX}
{KOAD_PREFIX}
{SCHEMA_PREFIX}
{DCTERMS_PREFIX}
SELECT DISTINCT ?hospital (STR(?nameRaw) AS ?name) (STR(?addressRaw) AS ?address) (STR(?cityLabelRaw) AS ?cityLabel) (STR(?typeLabelRaw) AS ?typeLabel) ?icuBeds ?isolationBeds WHERE {{
  ?hospital a schema:Hospital .
  ?hospital schema:name ?nameRaw .
  OPTIONAL {{ ?hospital schema:address ?addressRaw . }}
  OPTIONAL {{
    ?hospital koad:city ?city .
    ?city skos:prefLabel ?cityLabelRaw .
  }}
  OPTIONAL {{
    ?hospital dcterms:type ?type .
    ?type skos:prefLabel ?typeLabelRaw .
  }}
  OPTIONAL {{ ?hospital koid:icuBeds ?icuBeds . }}
  OPTIONAL {{ ?hospital koid:isolationBeds ?isolationBeds . }}
  {region_filter}
  {isolation_filter}
}}
ORDER BY ?name
LIMIT 500
"""
    data = await graphdb.query(sparql)
    hospitals: List[Dict[str, Any]] = []
    seen_names: set = set()

    for b in data.get("results", {}).get("bindings", []):
        uri = b.get("hospital", {}).get("value")
        name = b.get("name", {}).get("value") if b.get("name") else None

        # 중복 제거 (이름 기준)
        if name and name in seen_names:
            continue
        if name:
            seen_names.add(name)

        address = b.get("address", {}).get("value") if b.get("address") else None
        city_label = b.get("cityLabel", {}).get("value") if b.get("cityLabel") else None
        type_label = b.get("typeLabel", {}).get("value") if b.get("typeLabel") else None
        icu_beds = b.get("icuBeds", {}).get("value") if b.get("icuBeds") else None
        isolation_beds = b.get("isolationBeds", {}).get("value") if b.get("isolationBeds") else None

        fallback_id = uri.rsplit("/", 1)[-1] if uri else None
        hospitals.append(
            {
                "id": fallback_id,
                "uri": uri,
                "name": name or fallback_id or "Unknown",
                "address": address or "",
                "city": city_label or "",
                "type": type_label or "",
                "icuBeds": int(icu_beds) if icu_beds else 0,
                "isolationBeds": int(isolation_beds) if isolation_beds else 0,
                "hasIsolation": int(isolation_beds) > 0 if isolation_beds else False,
            }
        )
    return hospitals


def filter_by_radius(hospitals: List[Dict[str, Any]], lat: float, lng: float, radius_km: float) -> List[Dict[str, Any]]:
    filtered: List[Dict[str, Any]] = []
    for h in hospitals:
        if h.get("lat") is None or h.get("lng") is None:
            continue
        dist = haversine(lat, lng, h["lat"], h["lng"])
        if dist <= radius_km:
            h_copy = dict(h)
            h_copy["distanceKm"] = round(dist, 3)
            filtered.append(h_copy)
    filtered.sort(key=lambda x: x.get("distanceKm", 0))
    return filtered


@router.get("", summary="List hospitals and isolation facilities")
async def list_hospitals(
    region: str | None = Query(None, description="Region name filter (optional)"),
    needsIsolation: bool | None = Query(None, description="If true, only hospitals with isolation facility"),
    graphdb: GraphDBClient = Depends(get_graphdb_client),
):
    """병원 목록 조회 (TTL 데이터 기반)"""
    hospitals = await fetch_hospitals(graphdb, region=region, needs_isolation=needsIsolation)
    return {"hospitals": hospitals, "total": len(hospitals)}
