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

# 한국어-영어 감염병 이름 매핑 (통계 데이터는 영어로 저장됨)
DISEASE_NAME_MAPPING = {
    "수두": "chickenpox",
    "장티푸스": "typhoid fever",
    "A형간염": "hepatitis A",
    "B형간염": "hepatitis B",
    "C형간염": "hepatitis C",
    "콜레라": "cholera",
    "유행성 뇌수막염": "meningococcal disease",
    "일본뇌염": "Japanese encephalitis",
    "신증후군출혈열": "hemorrhagic fever with renal syndrome",
    "폐렴구균 감염증": "Pneumococcal disease",
    "b형헤모필루스인플루엔자": "Haemophilus influenzae type B infection",
    "홍역": "measles",
    "에볼라바이러스": "Ebolavirus",
    "말라리아": "malaria",
    "발진티푸스": "typhus",
    "쯔쯔가무시병": "scrub typhus",
    "진드기매개뇌염": "tick-borne encephalitis",
    "매독": "syphilis",
    "지방형 발진티푸스": "endemic typhus",
}

# 영어-한국어 지역명 매핑 (통계 데이터는 영어로 저장됨)
REGION_NAME_MAPPING = {
    "Seoul": "서울",
    "Busan": "부산",
    "Daegu": "대구",
    "Incheon": "인천",
    "Gwangju": "광주",
    "Daejeon": "대전",
    "Ulsan": "울산",
    "Sejong": "세종",
    "Gyeonggi Province": "경기",
    "Gangwon Province": "강원",
    "North Chungcheong": "충북",
    "South Chungcheong": "충남",
    "North Jeolla": "전북",
    "South Jeolla": "전남",
    "North Gyeongsang": "경북",
    "South Gyeongsang": "경남",
    "Jeju Province": "제주",
    "South Korea": "전국",
}


def normalize_disease_name(disease_id: str) -> str:
    """한국어 이름을 영어로 변환, 이미 영어면 그대로 반환"""
    return DISEASE_NAME_MAPPING.get(disease_id, disease_id)


def translate_region_name(region_en: str) -> str:
    """영어 지역명을 한국어로 변환"""
    return REGION_NAME_MAPPING.get(region_en, region_en)


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


@router.get("/by-region", summary="Get statistics by region for a disease")
async def stats_by_region(
    diseaseId: str = Query(..., description="Disease identifier"),
    graphdb: GraphDBClient = Depends(get_graphdb_client),
):
    """감염병별 지역 발생률 데이터"""
    # 한국어 이름을 영어로 변환
    search_name = normalize_disease_name(diseaseId)

    # 지역별로 집계 (GROUP BY)하여 중복 제거
    # 데이터 손상 방지: stat + diseaseConcept 조합을 유일하게 만든 후 집계
    sparql = f"""
{SKOS_PREFIX}
{KOID_PREFIX}
{SCHEMA_PREFIX}
SELECT ?regionLabel
       (SUM(?maxCaseCount) AS ?totalCaseCount)
       (AVG(?maxIncidenceRate) AS ?avgIncidenceRate)
WHERE {{
  SELECT ?stat ?diseaseConcept ?regionLabel
         (MAX(?caseCount) AS ?maxCaseCount)
         (MAX(?incidenceRate) AS ?maxIncidenceRate)
  WHERE {{
    ?stat schema:location ?loc .
    ?loc skos:prefLabel ?regionLabel .
    ?stat schema:name ?diseaseConcept .
    ?diseaseConcept skos:prefLabel ?diseaseLabel .
    OPTIONAL {{ ?stat koid:caseCount ?caseCount . }}
    OPTIONAL {{ ?stat koid:incidenceRate ?incidenceRate . }}
    FILTER(CONTAINS(LCASE(?diseaseLabel), LCASE("{search_name}")))
  }}
  GROUP BY ?stat ?diseaseConcept ?regionLabel
}}
GROUP BY ?regionLabel
ORDER BY DESC(?avgIncidenceRate)
"""
    try:
        data = await graphdb.query(sparql)
        regions = []
        for b in data.get("results", {}).get("bindings", []):
            region_label_en = b.get("regionLabel", {}).get("value")
            total_case_count = b.get("totalCaseCount", {}).get("value")
            avg_incidence_rate = b.get("avgIncidenceRate", {}).get("value")

            # 영어 지역명을 한글로 변환
            region_label_ko = translate_region_name(region_label_en)

            regions.append({
                "region": region_label_ko,
                "caseCount": int(float(total_case_count)) if total_case_count else 0,
                "incidenceRate": float(avg_incidence_rate) if avg_incidence_rate else 0.0
            })

        return {"diseaseId": diseaseId, "regions": regions}
    except Exception as exc:
        logging.getLogger(__name__).exception("Region stats error")
        raise HTTPException(status_code=502, detail=f"GraphDB query failed: {exc}")


@router.get("/by-gender-age", summary="Get statistics by gender and age for a disease")
async def stats_by_gender_age(
    diseaseId: str = Query(..., description="Disease identifier"),
    graphdb: GraphDBClient = Depends(get_graphdb_client),
):
    """감염병별 성별/연령별 건수 데이터"""
    # 한국어 이름을 영어로 변환
    search_name = normalize_disease_name(diseaseId)

    # 성별/연령대별로 집계 (GROUP BY)하여 중복 제거
    # 데이터 손상 방지: stat + diseaseConcept 조합을 유일하게 만든 후 집계
    sparql = f"""
{SKOS_PREFIX}
{KOID_PREFIX}
{SCHEMA_PREFIX}
SELECT ?genderLabel ?ageLabel (SUM(?maxCaseCount) AS ?totalCaseCount) WHERE {{
  SELECT ?stat ?diseaseConcept ?genderLabel ?ageLabel (MAX(?caseCount) AS ?maxCaseCount) WHERE {{
    ?stat schema:about ?disease .
    ?stat schema:name ?diseaseConcept .
    ?diseaseConcept skos:prefLabel ?diseaseLabel .
    ?stat schema:gender ?gender .
    ?gender skos:prefLabel ?genderLabel .
    ?stat schema:ageRange ?age .
    ?age skos:prefLabel ?ageLabel .
    ?stat koid:caseCount ?caseCount .
    FILTER(CONTAINS(LCASE(?diseaseLabel), LCASE("{search_name}")))
  }}
  GROUP BY ?stat ?diseaseConcept ?genderLabel ?ageLabel
}}
GROUP BY ?genderLabel ?ageLabel
ORDER BY ?genderLabel ?ageLabel
"""
    try:
        data = await graphdb.query(sparql)
        gender_age_data = []
        for b in data.get("results", {}).get("bindings", []):
            gender_label = b.get("genderLabel", {}).get("value")
            age_label = b.get("ageLabel", {}).get("value")
            total_case_count = b.get("totalCaseCount", {}).get("value")

            gender_age_data.append({
                "gender": gender_label,
                "ageRange": age_label,
                "caseCount": int(float(total_case_count)) if total_case_count else 0
            })

        return {"diseaseId": diseaseId, "data": gender_age_data}
    except Exception as exc:
        logging.getLogger(__name__).exception("Gender/Age stats error")
        raise HTTPException(status_code=502, detail=f"GraphDB query failed: {exc}")


@router.get("/risk-analysis", summary="5-year risk analysis for a disease in a region")
async def risk_analysis(
    diseaseId: str = Query(..., description="Disease identifier"),
    region: str = Query(..., description="Region name (e.g., 전북, 서울)"),
    graphdb: GraphDBClient = Depends(get_graphdb_client),
):
    """
    5년 치 통계 데이터를 기반으로 지역별 감염병 위험도 분석
    위험도 4단계: 안전(safe), 주의(caution), 경계(warning), 심각(severe)
    """
    # 한국어 이름을 영어로 변환
    search_name = normalize_disease_name(diseaseId)

    # 한국어 지역명을 영어로 변환 (역방향 매핑)
    region_en = region
    for en, ko in REGION_NAME_MAPPING.items():
        if ko == region or region in ko:
            region_en = en
            break

    # 지역별 통계 데이터 조회
    sparql = f"""
{SKOS_PREFIX}
{KOID_PREFIX}
{DCT_PREFIX}
{SCHEMA_PREFIX}
SELECT ?incidenceRate ?caseCount WHERE {{
  ?stat schema:location ?loc .
  ?loc skos:prefLabel ?regionLabel .
  ?stat schema:name ?diseaseConcept .
  ?diseaseConcept skos:prefLabel ?diseaseLabel .
  OPTIONAL {{ ?stat koid:incidenceRate ?incidenceRate . }}
  OPTIONAL {{ ?stat koid:caseCount ?caseCount . }}
  FILTER(CONTAINS(LCASE(?regionLabel), LCASE("{region_en}")))
  FILTER(CONTAINS(LCASE(?diseaseLabel), LCASE("{search_name}")))
}}
LIMIT 10
"""
    try:
        data = await graphdb.query(sparql)
        records = []
        total_incidence = 0.0
        total_cases = 0
        max_incidence = 0.0

        for b in data.get("results", {}).get("bindings", []):
            incidence = b.get("incidenceRate", {}).get("value")
            case_count = b.get("caseCount", {}).get("value")

            inc_float = float(incidence) if incidence else 0.0
            case_int = int(float(case_count)) if case_count else 0

            if inc_float > 0 or case_int > 0:
                records.append({
                    "incidenceRate": inc_float,
                    "caseCount": case_int
                })

                total_incidence += inc_float
                total_cases += case_int
                max_incidence = max(max_incidence, inc_float)

        # 데이터가 없으면 unknown 반환
        if not records:
            return {
                "diseaseId": diseaseId,
                "region": region,
                "level": "unknown",
                "levelText": "데이터 없음",
                "summary": f"{region} 지역의 {diseaseId} 통계 데이터가 없습니다.",
                "statistics": None,
                "yearlyData": []
            }

        # 위험도 계산 (발생률 기준)
        avg_incidence = total_incidence / len(records)

        # 4단계 위험도 판정 (발생률 기준)
        # 심각: 최대 발생률 >= 20 또는 평균 >= 15
        # 경계: 최대 발생률 >= 10 또는 평균 >= 7
        # 주의: 최대 발생률 >= 5 또는 평균 >= 3
        # 안전: 그 외
        if max_incidence >= 20 or avg_incidence >= 15:
            level = "severe"
            level_text = "심각"
        elif max_incidence >= 10 or avg_incidence >= 7:
            level = "warning"
            level_text = "경계"
        elif max_incidence >= 5 or avg_incidence >= 3:
            level = "caution"
            level_text = "주의"
        else:
            level = "safe"
            level_text = "안전"

        return {
            "diseaseId": diseaseId,
            "region": region,
            "level": level,
            "levelText": level_text,
            "summary": f"근 5년간 {region} 지역의 평균 발생률은 {avg_incidence:.2f}%로 '{level_text}' 수준입니다.",
            "statistics": {
                "avgIncidenceRate": round(avg_incidence, 2),
                "maxIncidenceRate": round(max_incidence, 2),
                "totalCases": total_cases,
                "recordsAnalyzed": len(records)
            },
            "yearlyData": records
        }
    except Exception as exc:
        logging.getLogger(__name__).exception("Risk analysis error")
        raise HTTPException(status_code=502, detail=f"GraphDB query failed: {exc}")


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
