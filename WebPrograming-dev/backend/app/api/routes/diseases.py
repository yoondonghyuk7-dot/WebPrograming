from __future__ import annotations

from typing import Any, Dict, List, Optional

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

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
    limit: Optional[int] = Query(None, ge=1, le=5000, description="Number of diseases to return (omit for all)"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    graphdb: GraphDBClient = Depends(get_graphdb_client),
):
    # 넓은 타입 매칭 + 언어 필터 제거로 누락 방지
    limit_clause = f"LIMIT {limit}" if limit else ""
    offset_clause = f"OFFSET {offset}" if offset else ""

    sparql = f"""
{SKOS_PREFIX}
{KOID_PREFIX}
{DCT_PREFIX}
{SCHEMA_PREFIX}
SELECT DISTINCT ?disease ?labelKo ?labelEn ?identifier ?grade ?shortDef ?longDesc
       (GROUP_CONCAT(DISTINCT ?symptomLabel; separator="|") AS ?symptoms)
       (GROUP_CONCAT(DISTINCT ?routeLabel; separator="|") AS ?routes)
       (GROUP_CONCAT(DISTINCT ?treatmentLabel; separator="|") AS ?treatments)
       (GROUP_CONCAT(DISTINCT ?adverseEventLabel; separator="|") AS ?adverseEvents) WHERE {{
  {{ ?disease a schema:InfectiousDisease . }}
  UNION
  {{ ?disease a koid:InfectiousDisease . }}

  # 한국어 이름 (필수)
  OPTIONAL {{
    ?disease skos:prefLabel ?labelKo .
    FILTER(LANG(?labelKo) = "ko")
  }}

  # 영어 이름 (선택)
  OPTIONAL {{
    ?disease skos:prefLabel ?labelEn .
    FILTER(LANG(?labelEn) = "en")
  }}

  OPTIONAL {{ ?disease schema:name ?labelKo . }}
  OPTIONAL {{ ?disease dcterms:identifier ?identifier . }}
  OPTIONAL {{ ?disease koid:classificationLevel ?grade . }}
  OPTIONAL {{ ?disease koid:definition ?shortDef . }}
  OPTIONAL {{ ?disease schema:description ?longDesc . }}

  # 증상
  OPTIONAL {{
    ?disease koid:symptom ?symptom .
    ?symptom skos:prefLabel ?symptomLabel .
  }}

  # 전파경로
  OPTIONAL {{
    ?disease koid:transmissionRoute ?route .
    ?route skos:prefLabel ?routeLabel .
  }}

  # 치료
  OPTIONAL {{
    ?disease koid:treatment ?treatment .
    ?treatment skos:prefLabel ?treatmentLabel .
  }}

  # 이상반응
  OPTIONAL {{
    ?disease koid:adverseEvent ?adverseEvent .
    ?adverseEvent skos:prefLabel ?adverseEventLabel .
  }}
}}
GROUP BY ?disease ?labelKo ?labelEn ?identifier ?grade ?shortDef ?longDesc
{offset_clause}
{limit_clause}
"""
    try:
        data = await graphdb.query(sparql)
        bindings = data.get("results", {}).get("bindings", [])
        diseases: List[Dict[str, Any]] = []
        for b in bindings:
            uri = b.get("disease", {}).get("value")
            label_ko = b.get("labelKo", {}).get("value") if b.get("labelKo") else None
            label_en = b.get("labelEn", {}).get("value") if b.get("labelEn") else None
            identifier = b.get("identifier", {}).get("value") if b.get("identifier") else None
            grade = b.get("grade", {}).get("value") if b.get("grade") else None
            short_def = b.get("shortDef", {}).get("value") if b.get("shortDef") else ""
            long_desc = b.get("longDesc", {}).get("value") if b.get("longDesc") else ""
            symptoms_str = b.get("symptoms", {}).get("value") if b.get("symptoms") else ""
            routes_str = b.get("routes", {}).get("value") if b.get("routes") else ""
            treatments_str = b.get("treatments", {}).get("value") if b.get("treatments") else ""
            adverse_events_str = b.get("adverseEvents", {}).get("value") if b.get("adverseEvents") else ""

            # 증상 파싱 ("|"로 구분된 문자열을 배열로 변환)
            symptoms = []
            if symptoms_str:
                symptoms = [s.strip() for s in symptoms_str.split("|") if s.strip()]

            # 전파경로 파싱
            routes = []
            if routes_str:
                routes = [s.strip() for s in routes_str.split("|") if s.strip()]

            # 치료 파싱
            treatments = []
            if treatments_str:
                treatments = [s.strip() for s in treatments_str.split("|") if s.strip()]

            # 이상반응 파싱
            adverse_events = []
            if adverse_events_str:
                adverse_events = [s.strip() for s in adverse_events_str.split("|") if s.strip()]

            fallback_id = uri.rsplit("/", 1)[-1] if uri else None
            disease_id = identifier or fallback_id

            # 한국어 이름 우선, 없으면 fallback
            display_name_ko = label_ko or fallback_id or "Unknown"
            display_name_en = label_en or ""

            diseases.append(
                {
                    "id": uri,
                    "diseaseId": disease_id,
                    "name": display_name_ko,
                    "nameKo": display_name_ko,
                    "nameEn": display_name_en,
                    "grade": grade or "",
                    "gradeType": grade_to_type(grade),
                    "definition": short_def,
                    "description": long_desc or short_def,
                    "symptoms": symptoms,
                    "transmissionRoutes": routes,
                    "treatments": treatments,
                    "adverseEvents": adverse_events,
                }
            )
        return {"diseases": diseases}
    except Exception as exc:
        logging.getLogger(__name__).exception("Diseases endpoint error")
        raise HTTPException(status_code=502, detail=f"GraphDB query failed: {exc}")
