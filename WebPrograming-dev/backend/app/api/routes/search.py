from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Dict, List, Set

from fastapi import APIRouter, Depends, Query

from app.deps import get_graphdb_client
from app.services.graphdb_client import GraphDBClient

router = APIRouter(prefix="/search", tags=["search"])

# Namespaces taken from the TTL files in the repo
SKOS_PREFIX = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>"
KOID_PREFIX = "PREFIX koid: <http://knowledgemap.kr/koid/def/>"
DCT_PREFIX = "PREFIX dcterms: <http://purl.org/dc/terms/>"
SCHEMA_PREFIX = "PREFIX schema: <http://schema.org/>"


def tokenize_query(q: str) -> List[str]:
    tokens = re.findall(r"[0-9A-Za-z가-힣]+", q)
    return [tok.lower() for tok in tokens if len(tok.strip()) >= 2]


async def map_tokens_to_symptoms(graphdb: GraphDBClient, tokens: List[str]) -> List[Dict[str, Any]]:
    if not tokens:
        return []
    values = " ".join(f'("{tok}")' for tok in tokens)
    sparql = f"""
{SKOS_PREFIX}
SELECT ?input ?label ?pref ?uri WHERE {{
  VALUES (?input) {{ {values} }}
  ?uri (skos:prefLabel|skos:altLabel) ?label .
  BIND(LCASE(?label) AS ?lcLabel)
  FILTER(CONTAINS(?lcLabel, ?input))
  OPTIONAL {{ ?uri skos:prefLabel ?pref }}
}}
LIMIT 200
"""
    try:
        data = await graphdb.query(sparql)
    except Exception:
        return []

    matches: List[Dict[str, Any]] = []
    for b in data.get("results", {}).get("bindings", []):
        input_token = b.get("input", {}).get("value")
        uri = b.get("uri", {}).get("value")
        label = b.get("pref", {}).get("value") or b.get("label", {}).get("value")
        if input_token and label and uri:
            matches.append(
                {
                    "original": input_token,
                    "standard": label,
                    "uri": uri,
                    "found": True,
                }
            )
    return matches


async def fetch_disease_candidates(graphdb: GraphDBClient, normalized_labels: List[str]) -> List[Dict[str, Any]]:
    if not normalized_labels:
        return []
    targets = " ".join(f'"{lab.lower()}"' for lab in normalized_labels)
    sparql = f"""
{SKOS_PREFIX}
{KOID_PREFIX}
{DCT_PREFIX}
{SCHEMA_PREFIX}
SELECT ?disease ?diseaseLabelKo ?diseaseLabelEn ?definition ?symptomLabel WHERE {{
  ?disease a schema:InfectiousDisease .
  OPTIONAL {{ ?disease skos:prefLabel ?diseaseLabelKo . FILTER(LANG(?diseaseLabelKo) = "ko") }}
  OPTIONAL {{ ?disease skos:prefLabel ?diseaseLabelEn . FILTER(LANG(?diseaseLabelEn) = "en") }}
  OPTIONAL {{ ?disease koid:definition ?definition . }}
  ?disease koid:symptom ?symptom .
  ?symptom skos:prefLabel ?symptomLabel .
  BIND(LCASE(?symptomLabel) AS ?lcSymptom)
  VALUES ?targetSym {{ {targets} }}
  FILTER(CONTAINS(?lcSymptom, ?targetSym))
}}
LIMIT 400
"""
    try:
        data = await graphdb.query(sparql)
    except Exception:
        return []

    grouped: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"symptoms": set()})
    for b in data.get("results", {}).get("bindings", []):
        disease_uri = b.get("disease", {}).get("value")
        if not disease_uri:
            continue
        disease_label = b.get("diseaseLabelKo", {}).get("value") or disease_uri.rsplit("/", 1)[-1]
        disease_label_en = b.get("diseaseLabelEn", {}).get("value", "")
        definition = b.get("definition", {}).get("value", "")
        symptom_label = b.get("symptomLabel", {}).get("value")
        grouped[disease_uri].setdefault("label", disease_label)
        grouped[disease_uri].setdefault("labelEn", disease_label_en)
        grouped[disease_uri].setdefault("definition", definition)
        if symptom_label:
            grouped[disease_uri]["symptoms"].add(symptom_label.lower())

    normalized_set: Set[str] = {lab.lower() for lab in normalized_labels}
    results: List[Dict[str, Any]] = []
    for uri, payload in grouped.items():
        disease_symptoms: Set[str] = payload["symptoms"]
        intersection = disease_symptoms & normalized_set
        denom = max(len(disease_symptoms), len(normalized_set), 1)
        similarity = round((len(intersection) / denom) * 100)
        results.append(
            {
                "disease": {
                    "id": uri,
                    "name": payload.get("label", uri),
                    "nameEn": payload.get("labelEn", ""),
                    "description": payload.get("definition", ""),
                    "definition": payload.get("definition", ""),
                    "symptomNames": sorted({s.title() for s in disease_symptoms}),
                },
                "similarity": similarity,
                "matchedSymptoms": sorted({sym.title() for sym in intersection}),
            }
        )
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results


def risk_from_series(values: List[float]) -> Dict[str, Any]:
    if not values:
        return {"level": "unknown", "summary": "No regional data", "statistics": ""}
    avg = sum(values) / len(values)
    mx = max(values)
    if mx >= 20:
        level = "severe"
        level_text = "심각"
    elif mx >= 10:
        level = "warning"
        level_text = "경계"
    elif mx >= 5:
        level = "caution"
        level_text = "주의"
    else:
        level = "safe"
        level_text = "안전"
    summary = f"최근 {len(values)}개 기간 평균 {avg:.2f}, 최대 {mx:.2f}"
    return {"level": level, "levelText": level_text, "summary": summary, "statistics": f"Avg {avg:.2f}, Max {mx:.2f}"}


async def fetch_region_risk(graphdb: GraphDBClient, disease_label: str, region: str) -> Dict[str, Any]:
    sparql = f"""
{SKOS_PREFIX}
{KOID_PREFIX}
{DCT_PREFIX}
{SCHEMA_PREFIX}
SELECT ?incidenceRate WHERE {{
  ?stat schema:location ?loc .
  ?loc skos:prefLabel ?regionLabel .
  ?stat schema:name ?diseaseConcept .
  ?diseaseConcept skos:prefLabel ?dLabel .
  ?stat koid:incidenceRate ?incidenceRate .
  FILTER(CONTAINS(LCASE(?regionLabel), LCASE("{region}")))
  FILTER(CONTAINS(LCASE(?dLabel), LCASE("{disease_label}")))
}}
LIMIT 5
"""
    try:
        data = await graphdb.query(sparql)
    except Exception:
        return {"level": "unknown", "summary": "GraphDB query failed", "statistics": ""}

    values: List[float] = []
    for b in data.get("results", {}).get("bindings", []):
        incidence_val = b.get("incidenceRate", {}).get("value")
        try:
            values.append(float(incidence_val))
        except (TypeError, ValueError):
            continue
    return risk_from_series(values)


@router.get("/symptoms", summary="Search diseases by symptoms")
async def search_by_symptoms(
    q: str = Query(..., description="Symptom keywords or sentence"),
    region: str | None = Query(None, description="Optional region name for risk analysis"),
    graphdb: GraphDBClient = Depends(get_graphdb_client),
):
    tokens = tokenize_query(q)
    keywords = await map_tokens_to_symptoms(graphdb, tokens)
    standard_terms = [m["standard"] for m in keywords]
    recommendations = await fetch_disease_candidates(graphdb, standard_terms)

    if region:
        for rec in recommendations:
            risk = await fetch_region_risk(graphdb, rec["disease"]["name"], region)
            rec["risk"] = risk

    return {
        "query": q,
        "keywords": keywords,
        "recommendations": recommendations,
        "region": region,
    }
