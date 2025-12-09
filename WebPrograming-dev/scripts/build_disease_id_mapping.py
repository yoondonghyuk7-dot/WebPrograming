#!/usr/bin/env python3
"""
Infection_Rdf.ttl에서 disease_id -> URI 매핑 추출
"""
import re
import json
from pathlib import Path

INPUT_TTL = Path(__file__).parent.parent.parent / "Infection_Rdf.ttl"
OUTPUT_JSON = Path(__file__).parent / "disease_id_to_uri_mapping.json"

def extract_mapping():
    """TTL에서 dcterms:identifier와 URI 매핑 추출"""

    with open(INPUT_TTL, 'r', encoding='utf-8') as f:
        content = f.read()

    mapping = {}
    lines = content.split('\n')
    current_uri = None

    for line in lines:
        # 감염병 URI 찾기 (< ...id/xxxxx> a schema:InfectiousDisease)
        if 'a schema:InfectiousDisease' in line or 'a koid:InfectiousDisease' in line:
            uri_match = re.search(r'<(http://knowledgemap\.kr/koid/id/[^>]+)>', line)
            if uri_match:
                current_uri = uri_match.group(1)

        # dcterms:identifier 찾기
        elif current_uri and 'dcterms:identifier' in line:
            id_match = re.search(r'dcterms:identifier\s+"([^"]+)"', line)
            if id_match:
                disease_id = id_match.group(1)
                mapping[disease_id] = current_uri
                print(f"{disease_id} -> {current_uri}")
                current_uri = None  # 다음 disease로

    return mapping

def main():
    print("=" * 60)
    print("Building disease_id -> URI mapping")
    print("=" * 60)
    print()

    if not INPUT_TTL.exists():
        print(f"ERROR: {INPUT_TTL} not found")
        return

    print(f"Reading: {INPUT_TTL}")
    mapping = extract_mapping()

    print()
    print(f"Found {len(mapping)} disease mappings")
    print()

    # JSON으로 저장
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

    print(f"Saved to: {OUTPUT_JSON}")
    print()

if __name__ == "__main__":
    main()
