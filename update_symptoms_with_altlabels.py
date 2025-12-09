#!/usr/bin/env python3
"""
GraphDB에 동의어가 포함된 증상 데이터 업데이트
"""
import asyncio
import httpx
from pathlib import Path

GRAPHDB_ENDPOINT = "http://localhost:7200/repositories/koid"
GRAPHDB_STATEMENTS = "http://localhost:7200/repositories/koid/statements"
TTL_FILE = Path(__file__).parent / "Infection_Symptoms_With_AltLabels.ttl"

async def delete_old_symptoms_and_concepts():
    """기존 증상 매핑과 증상 Concept 모두 삭제"""
    print("=" * 60)
    print("Step 1: Deleting old symptoms and concepts from GraphDB")
    print("=" * 60)

    delete_query = """
PREFIX koid: <http://knowledgemap.kr/koid/def/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

DELETE {
  ?disease koid:symptom ?symptom .
  ?symptom ?p ?o .
}
WHERE {
  ?disease koid:symptom ?symptom .
  ?symptom ?p ?o .
}
"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GRAPHDB_ENDPOINT + "/statements",
            data={"update": delete_query},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        if resp.status_code in [200, 204]:
            print("OK - Old symptoms and concepts deleted successfully")
        else:
            print(f"ERROR - Failed to delete: {resp.status_code}")
            print(resp.text)
            return False

    return True

async def upload_new_ttl():
    """새 TTL 파일 업로드 (동의어 포함)"""
    print()
    print("=" * 60)
    print("Step 2: Uploading new symptoms TTL with altLabels")
    print("=" * 60)

    if not TTL_FILE.exists():
        print(f"ERROR: {TTL_FILE} not found")
        return False

    with open(TTL_FILE, 'r', encoding='utf-8') as f:
        ttl_content = f.read()

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            GRAPHDB_STATEMENTS,
            content=ttl_content,
            headers={"Content-Type": "text/turtle"}
        )

        if resp.status_code in [200, 204]:
            print("OK - New symptoms with altLabels uploaded successfully")
        else:
            print(f"ERROR - Failed to upload: {resp.status_code}")
            print(resp.text)
            return False

    return True

async def verify_symptoms():
    """증상 개수 및 동의어 확인"""
    print()
    print("=" * 60)
    print("Step 3: Verifying symptom counts")
    print("=" * 60)

    verify_query = """
PREFIX koid: <http://knowledgemap.kr/koid/def/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?disease ?diseaseName (COUNT(?symptom) AS ?symptomCount) WHERE {
  ?disease a <http://schema.org/InfectiousDisease> .
  ?disease skos:prefLabel ?diseaseName .
  OPTIONAL {
    ?disease koid:symptom ?symptom .
  }
  FILTER(lang(?diseaseName) = "ko")
}
GROUP BY ?disease ?diseaseName
ORDER BY DESC(?symptomCount)
LIMIT 5
"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GRAPHDB_ENDPOINT,
            data={"query": verify_query},
            headers={"Accept": "application/sparql-results+json"}
        )

        if resp.status_code != 200:
            print(f"ERROR - Query failed: {resp.status_code}")
            return False

        result = resp.json()
        bindings = result.get("results", {}).get("bindings", [])

        print()
        for binding in bindings:
            disease_name = binding.get("diseaseName", {}).get("value", "Unknown")
            symptom_count = binding.get("symptomCount", {}).get("value", "0")
            print(f"  {disease_name}: {symptom_count} symptoms")

    # altLabel 개수 확인
    print()
    print("=" * 60)
    print("Step 4: Verifying altLabel counts")
    print("=" * 60)

    altlabel_query = """
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?symptom ?prefLabel (COUNT(?altLabel) AS ?altLabelCount) WHERE {
  ?symptom a skos:Concept .
  ?symptom skos:prefLabel ?prefLabel .
  OPTIONAL {
    ?symptom skos:altLabel ?altLabel .
  }
  FILTER(lang(?prefLabel) = "ko")
}
GROUP BY ?symptom ?prefLabel
ORDER BY DESC(?altLabelCount)
LIMIT 5
"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GRAPHDB_ENDPOINT,
            data={"query": altlabel_query},
            headers={"Accept": "application/sparql-results+json"}
        )

        if resp.status_code != 200:
            print(f"ERROR - Query failed: {resp.status_code}")
            return False

        result = resp.json()
        bindings = result.get("results", {}).get("bindings", [])

        print()
        for binding in bindings:
            symptom_name = binding.get("prefLabel", {}).get("value", "Unknown")
            alt_count = binding.get("altLabelCount", {}).get("value", "0")
            print(f"  {symptom_name}: {alt_count} altLabels")

    return True

async def main():
    print()
    print("=" * 60)
    print("GraphDB Symptoms Update Script (with altLabels)")
    print("=" * 60)
    print()

    # Step 1: 기존 증상 및 Concept 삭제
    if not await delete_old_symptoms_and_concepts():
        print("\nFailed to delete old symptoms")
        return

    # Step 2: 새 TTL 업로드
    if not await upload_new_ttl():
        print("\nFailed to upload new TTL")
        return

    # Step 3 & 4: 검증
    await verify_symptoms()

    print()
    print("=" * 60)
    print("Complete! Now you can search with synonyms:")
    print("  - '미열' will match '발열'")
    print("  - '배아픔' will match '복통'")
    print("  - '토함' will match '구토'")
    print("=" * 60)
    print()

if __name__ == "__main__":
    asyncio.run(main())
