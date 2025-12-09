from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query

from app.deps import get_graphdb_client
from app.services.graphdb_client import GraphDBClient

router = APIRouter(prefix="/hospitals", tags=["hospitals"])

SKOS_PREFIX = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>"
KOID_PREFIX = "PREFIX koid: <http://knowledgemap.kr/koid/def/>"
SCHEMA_PREFIX = "PREFIX schema: <http://schema.org/>"


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
    region_filter = f'FILTER(CONTAINS(LCASE(?regionLabel), LCASE("{region}")))' if region else ""
    isolation_filter = ""
    if needs_isolation is True:
        isolation_filter = "FILTER(?hasIsolation = true)"

    sparql = f"""
{SKOS_PREFIX}
{KOID_PREFIX}
{SCHEMA_PREFIX}
SELECT ?hospital ?name ?address ?regionLabel ?lat ?lng ?hasIsolation WHERE {{
  ?hospital a koid:MedicalInstitution .
  OPTIONAL {{ ?hospital skos:prefLabel ?name . }}
  OPTIONAL {{ ?hospital schema:name ?name . }}
  OPTIONAL {{ ?hospital schema:address ?address . }}
  OPTIONAL {{ ?hospital koid:address ?address . }}
  OPTIONAL {{
    ?hospital schema:addressRegion ?region .
    ?region skos:prefLabel ?regionLabel .
  }}
  OPTIONAL {{
    ?hospital schema:geo ?geo .
    ?geo schema:latitude ?lat ;
         schema:longitude ?lng .
  }}
  OPTIONAL {{ ?hospital koid:latitude ?lat . }}
  OPTIONAL {{ ?hospital koid:longitude ?lng . }}
  OPTIONAL {{ ?hospital koid:hasIsolationFacility ?hasIsolation . }}
  {region_filter}
  {isolation_filter}
}}
LIMIT 500
"""
    data = await graphdb.query(sparql)
    hospitals: List[Dict[str, Any]] = []
    for b in data.get("results", {}).get("bindings", []):
        uri = b.get("hospital", {}).get("value")
        name = b.get("name", {}).get("value") if b.get("name") else None
        address = b.get("address", {}).get("value") if b.get("address") else None
        region_label = b.get("regionLabel", {}).get("value") if b.get("regionLabel") else None
        lat_val = b.get("lat", {}).get("value")
        lng_val = b.get("lng", {}).get("value")
        has_iso_val = b.get("hasIsolation", {}).get("value")

        try:
            lat = float(lat_val) if lat_val is not None else None
            lng = float(lng_val) if lng_val is not None else None
        except (TypeError, ValueError):
            lat, lng = None, None

        has_isolation = None
        if has_iso_val is not None:
            has_isolation = str(has_iso_val).lower() in ("true", "1", "yes")

        fallback_id = uri.rsplit("/", 1)[-1] if uri else None
        hospitals.append(
            {
                "id": fallback_id,
                "uri": uri,
                "name": name or fallback_id or "Unknown",
                "address": address or "",
                "region": region_label or "",
                "lat": lat,
                "lng": lng,
                "hasIsolation": has_isolation if has_isolation is not None else False,
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
    lat: float | None = Query(None, description="Latitude for radius filter"),
    lng: float | None = Query(None, description="Longitude for radius filter"),
    radius: float | None = Query(None, description="Radius in km for geo filter"),
    needsIsolation: bool | None = Query(None, description="If true, only hospitals with isolation facility"),
    graphdb: GraphDBClient = Depends(get_graphdb_client),
):
    hospitals = await fetch_hospitals(graphdb, region=region, needs_isolation=needsIsolation)

    if lat is not None and lng is not None and radius is not None:
        hospitals = filter_by_radius(hospitals, lat, lng, radius)

    return {"hospitals": hospitals}
