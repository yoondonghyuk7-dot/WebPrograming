#!/usr/bin/env python3
"""
OpenRefine에서 export한 CSV를 TTL 파일로 변환 (증상 동의어 포함)
"""
import csv
import json
from pathlib import Path
from collections import defaultdict

INPUT_CSV = Path(__file__).parent.parent.parent / "Infection_Rdf (3).csv"
OUTPUT_TTL = Path(__file__).parent.parent.parent / "Infection_Symptoms_With_AltLabels.ttl"
MAPPING_JSON = Path(__file__).parent / "disease_id_to_uri_mapping.json"

def main():
    print("=" * 60)
    print("OpenRefine CSV to TTL Converter (with altLabels)")
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

    # 증상별 정보 수집 (symptom_uri -> {name, altLabels})
    all_symptoms = {}
    current_disease_id = None
    current_symptom_uri = None
    current_symptom_name = None

    with open(INPUT_CSV, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)

        for row in reader:
            disease_id = row.get('disease_id', '').strip()
            name_ko = row.get('한글감염병명', '').strip()
            name_en = row.get('감염병명_한글', '').strip()
            symptom_name = row.get('증상', '').strip()
            symptom_uri = row.get('Symptom_Concept_URI', '').strip()
            symptom_altlabel = row.get('symptom_altLabel', '').strip()

            # disease_id가 있으면 현재 disease 업데이트
            if disease_id:
                current_disease_id = disease_id
                disease_symptoms[disease_id]['disease_id'] = disease_id

                # 감염병 기본 정보 저장
                if name_ko:
                    disease_symptoms[disease_id]['name_ko'] = name_ko
                if name_en:
                    disease_symptoms[disease_id]['name_en'] = name_en

            # 증상 이름이 있으면 새로운 증상 시작
            if symptom_name and symptom_uri:
                current_symptom_uri = symptom_uri
                current_symptom_name = symptom_name

                # 증상 기본 정보 초기화
                if symptom_uri not in all_symptoms:
                    all_symptoms[symptom_uri] = {
                        'name': symptom_name,
                        'altLabels': []
                    }

                # 감염병에 증상 추가
                if current_disease_id and symptom_uri not in disease_symptoms[current_disease_id]['symptom_uris']:
                    disease_symptoms[current_disease_id]['symptom_uris'].append(symptom_uri)

            # altLabel이 있으면 현재 증상에 추가
            if symptom_altlabel and current_symptom_uri:
                # 중복 체크
                if symptom_altlabel not in all_symptoms[current_symptom_uri]['altLabels']:
                    # 증상 이름 자체는 제외 (prefLabel과 중복)
                    if symptom_altlabel != current_symptom_name:
                        all_symptoms[current_symptom_uri]['altLabels'].append(symptom_altlabel)

    print(f"Processed: {len(disease_symptoms)} diseases")
    print(f"Unique symptoms: {len(all_symptoms)}")

    # 동의어 통계
    total_altlabels = sum(len(s['altLabels']) for s in all_symptoms.values())
    print(f"Total altLabels: {total_altlabels}")
    print()

    # TTL 파일 생성
    lines = []
    lines.append("@prefix koid: <http://knowledgemap.kr/koid/def/> .")
    lines.append("@prefix skos: <http://www.w3.org/2004/02/skos/core#> .")
    lines.append("@prefix schema: <http://schema.org/> .")
    lines.append("")
    lines.append("# 증상 매핑 (OpenRefine으로 생성, 동의어 포함)")
    lines.append("")

    # 증상 Concept 정의 (동의어 포함)
    lines.append("# 증상 Concept 정의 (동의어 포함)")
    for symptom_uri, symptom_data in all_symptoms.items():
        symptom_name = symptom_data['name']
        altLabels = symptom_data['altLabels']

        lines.append(f"<{symptom_uri}> a skos:Concept ;")
        lines.append(f'    skos:prefLabel "{symptom_name}"@ko ;')

        # altLabel 추가
        if altLabels:
            for i, alt in enumerate(altLabels):
                separator = ";" if i < len(altLabels) - 1 else ";"
                lines.append(f'    skos:altLabel "{alt}"@ko {separator}')

        lines.append(f"    skos:broader <http://knowledgemap.kr/koid/concept_class/symptom> .")
        lines.append("")

        # 진행 상황 출력
        if altLabels:
            print(f"  {symptom_name}: {len(altLabels)} altLabels - {', '.join(altLabels[:3])}...")

    print()

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
    print("2. SPARQL -> Run UPDATE query to delete old symptoms:")
    print("   PREFIX koid: <http://knowledgemap.kr/koid/def/>")
    print("   DELETE { ?d koid:symptom ?s . ?s ?p ?o . }")
    print("   WHERE { ?d koid:symptom ?s . ?s ?p ?o . }")
    print("3. Import -> RDF tab")
    print(f"4. Upload: {OUTPUT_TTL.name}")
    print("5. Test search with synonyms (e.g., '미열', '고열')")
    print("=" * 60)

if __name__ == "__main__":
    main()
