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


def remove_korean_josa(token: str) -> str:
    """한국어 조사 및 어미 제거 (이/가/을/를/은/는/과/와/도/만/에/으로/로/고/다/함/요 등)"""
    if len(token) <= 1:
        return token

    # 2글자 어미 먼저 처리 (더 구체적인 패턴)
    double_eomi = ['어요', '아요', '해요', '네요', 'ㅂ니다', '습니다']
    for eomi in double_eomi:
        if token.endswith(eomi) and len(token) > len(eomi):
            return token[:-len(eomi)]

    # 1글자 조사
    single_josa = ['이', '가', '을', '를', '은', '는', '과', '와', '도', '만', '에', '의']
    for josa in single_josa:
        if token.endswith(josa) and len(token) > len(josa):
            return token[:-len(josa)]

    # 2글자 조사
    double_josa = ['에서', '에게', '으로', '에도', '부터', '까지', '처럼', '마저', '조차']
    for josa in double_josa:
        if token.endswith(josa) and len(token) > len(josa):
            return token[:-len(josa)]

    # 1글자 동사/형용사 어미 (조사 다음에 처리)
    single_eomi = ['고', '다', '요', '네', '지', '니']
    for eomi in single_eomi:
        if token.endswith(eomi) and len(token) > len(eomi):
            return token[:-len(eomi)]

    # 2글자 어미
    double_eomi_2 = ['함', '음', '기']
    for eomi in double_eomi_2:
        if token.endswith(eomi) and len(token) > len(eomi):
            return token[:-len(eomi)]

    # '로'는 받침이 없을 때만 (으로는 위에서 처리)
    if token.endswith('로') and len(token) > 1:
        return token[:-1]

    return token


def tokenize_query(q: str) -> List[str]:
    tokens = re.findall(r"[0-9A-Za-z가-힣]+", q)
    # 조사/어미 제거 전에 2글자 이상인 토큰만 처리
    # 제거 후 1글자가 되어도 유효한 토큰으로 인정 (예: "배가" → "배", "열이" → "열")
    result = []
    for tok in tokens:
        if len(tok.strip()) >= 2:  # 원본이 2글자 이상이면
            cleaned = remove_korean_josa(tok.lower())
            # 조사/어미 제거 후에는 1글자도 허용
            if len(cleaned) >= 1:
                result.append(cleaned)
    return result


async def map_tokens_to_symptoms(graphdb: GraphDBClient, tokens: List[str]) -> List[Dict[str, Any]]:
    if not tokens:
        return []

    # 각 토큰마다 정확한 매칭을 위해 개별 쿼리 실행
    # prefLabel 기준으로 중복 제거 (같은 증상 개념은 하나의 prefLabel로 통합)
    # 증상 URI만 반환 (concept/symptom 패턴 필터링)
    seen_labels: Set[str] = set()
    matches: List[Dict[str, Any]] = []

    for tok in tokens:
        sparql = f"""
{SKOS_PREFIX}
SELECT DISTINCT ?uri ?pref WHERE {{
  ?uri (skos:prefLabel|skos:altLabel) ?label .
  FILTER(CONTAINS(LCASE(STR(?label)), "{tok}"))
  FILTER(CONTAINS(STR(?uri), "concept/symptom"))
  OPTIONAL {{ ?uri skos:prefLabel ?pref }}
}}
LIMIT 20
"""
        try:
            data = await graphdb.query(sparql)

            for b in data.get("results", {}).get("bindings", []):
                uri = b.get("uri", {}).get("value")
                pref_label = b.get("pref", {}).get("value", "")

                # prefLabel로 중복 체크 (서로 다른 URI라도 같은 prefLabel이면 하나만 표시)
                label = pref_label or tok
                if label and label.lower() not in seen_labels:
                    seen_labels.add(label.lower())
                    matches.append(
                        {
                            "original": tok,
                            "standard": label,
                            "uri": uri,
                            "found": True,
                        }
                    )
        except Exception:
            continue

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


@router.get("/debug-tokens", summary="Debug tokenization")
async def debug_tokens(q: str = Query(..., description="Query to tokenize")):
    """디버그용: 토큰화 결과만 반환"""
    tokens = tokenize_query(q)
    return {"query": q, "tokens": tokens}


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
        "tokens": tokens,  # Add tokens for debugging
        "keywords": keywords,
        "recommendations": recommendations,
        "region": region,
    }
