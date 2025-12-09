#!/usr/bin/env python3
"""
OpenRefine에서 export한 CSV를 TTL 파일로 변환
"""
import csv
import json
from pathlib import Path
from collections import defaultdict

INPUT_CSV = Path(__file__).parent.parent.parent / "Infection_Rdf (3).csv"
OUTPUT_TTL = Path(__file__).parent.parent.parent / "Infection_Symptoms_OpenRefine.ttl"
MAPPING_JSON = Path(__file__).parent / "disease_id_to_uri_mapping.json"

def main():
    print("=" * 60)
    print("OpenRefine CSV to TTL Converter")
    print("=" * 60)
    print()

    if not INPUT_CSV.exists():
        print(f"ERROR: {INPUT_CSV} not found")
        return

    if not MAPPING_JSON.exists():
        print(f"ERROR: {MAPPING_JSON} not found")
        print("Run: python build_disease_id_mapping.py")
        return

    # Load disease_id -> URI mapping
    with open(MAPPING_JSON, 'r', encoding='utf-8') as f:
        disease_id_to_uri = json.load(f)

    print(f"Loaded {len(disease_id_to_uri)} disease URI mappings")
    print(f"Reading: {INPUT_CSV}")

    # 감염병별 증상 수집
    disease_symptoms = defaultdict(lambda: {
        'name_ko': None,
        'name_en': None,
        'disease_id': None,
        'symptom_uris': []
    })

    all_symptoms = {}  # symptom_uri -> symptom_name
    current_disease_id = None  # 현재 처리 중인 disease_id

    with open(INPUT_CSV, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)

        for row in reader:
            disease_id = row.get('disease_id', '').strip()
            name_ko = row.get('한글감염병명', '').strip()
            name_en = row.get('감염병명_한글', '').strip()
            symptom_name = row.get('증상', '').strip()
            symptom_uri = row.get('Symptom_Concept_URI', '').strip()

            # disease_id가 있으면 현재 disease 업데이트
            if disease_id:
                current_disease_id = disease_id
                disease_symptoms[disease_id]['disease_id'] = disease_id

                # 감염병 기본 정보 저장
                if name_ko:
                    disease_symptoms[disease_id]['name_ko'] = name_ko
                if name_en:
                    disease_symptoms[disease_id]['name_en'] = name_en

            # disease_id가 없어도 current_disease_id가 있으면 해당 감염병에 속함
            if not current_disease_id:
                continue

            # 증상 URI가 있으면 추가 (current_disease_id에)
            if symptom_uri and symptom_name:
                # 중복 체크
                if symptom_uri not in disease_symptoms[current_disease_id]['symptom_uris']:
                    disease_symptoms[current_disease_id]['symptom_uris'].append(symptom_uri)
                    all_symptoms[symptom_uri] = symptom_name

    print(f"Processed: {len(disease_symptoms)} diseases")
    print(f"Unique symptoms: {len(all_symptoms)}")
    print()

    # TTL 파일 생성
    lines = []
    lines.append("@prefix koid: <http://knowledgemap.kr/koid/def/> .")
    lines.append("@prefix skos: <http://www.w3.org/2004/02/skos/core#> .")
    lines.append("@prefix schema: <http://schema.org/> .")
    lines.append("")
    lines.append("# 증상 매핑 (OpenRefine으로 생성)")
    lines.append("")

    # 증상 Concept 정의
    lines.append("# 증상 Concept 정의")
    for symptom_uri, symptom_name in all_symptoms.items():
        lines.append(f"<{symptom_uri}> a skos:Concept ;")
        lines.append(f'    skos:prefLabel "{symptom_name}"@ko ;')
        lines.append(f"    skos:broader <http://knowledgemap.kr/koid/concept_class/symptom> .")
        lines.append("")

    # 감염병 - 증상 매핑
    lines.append("# 감염병 - 증상 매핑")
    for disease_id, data in disease_symptoms.items():
        if not data['symptom_uris']:
            continue

        # disease_id를 실제 hash URI로 변환
        disease_uri = disease_id_to_uri.get(disease_id)
        if not disease_uri:
            print(f"  WARNING: No URI mapping for {disease_id}, skipping...")
            continue

        name_ko = data['name_ko'] or data['name_en'] or disease_id

        lines.append(f"# {name_ko}")
        lines.append(f"<{disease_uri}>")

        for i, symptom_uri in enumerate(data['symptom_uris']):
            separator = ";" if i < len(data['symptom_uris']) - 1 else "."
            lines.append(f"    koid:symptom <{symptom_uri}> {separator}")

        lines.append("")

        # 진행 상황 출력
        print(f"  {name_ko}: {len(data['symptom_uris'])} symptoms")

    # 파일 저장
    with open(OUTPUT_TTL, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print()
    print(f"TTL created: {OUTPUT_TTL}")
    print()
    print("=" * 60)
    print("Next steps:")
    print("1. Open GraphDB (http://localhost:7200)")
    print("2. Import -> RDF tab")
    print(f"3. Upload: {OUTPUT_TTL.name}")
    print("4. Restart backend server")
    print("5. Test frontend (http://localhost:8000/diseases.html)")
    print("=" * 60)

if __name__ == "__main__":
    main()
