#!/usr/bin/env python3
"""
OpenRefine에서 매핑한 CSV를 TTL 파일로 변환
"""
import csv
import hashlib
from pathlib import Path

INPUT_CSV = Path(__file__).parent.parent.parent / "diseases_symptoms_mapped.csv"
OUTPUT_TTL = Path(__file__).parent.parent.parent / "Infection_Symptoms_Mapped.ttl"

def generate_symptom_uri(symptom_name):
    """증상 이름으로 URI 생성"""
    hash_obj = hashlib.md5(symptom_name.encode('utf-8'))
    return f"http://knowledgemap.kr/koid/concept/symptom/{hash_obj.hexdigest()}"

def main():
    print("=" * 60)
    print("CSV to TTL Converter for Symptoms")
    print("=" * 60)
    print()

    if not INPUT_CSV.exists():
        print(f"ERROR: {INPUT_CSV} not found")
        print("Please export from OpenRefine first!")
        return

    lines = []
    lines.append("@prefix koid: <http://knowledgemap.kr/koid/def/> .")
    lines.append("@prefix skos: <http://www.w3.org/2004/02/skos/core#> .")
    lines.append("@prefix schema: <http://schema.org/> .")
    lines.append("")
    lines.append("# 증상 매핑 (OpenRefine으로 생성)")
    lines.append("")

    all_symptoms = {}
    disease_symptoms = []

    print(f"Reading: {INPUT_CSV}")

    with open(INPUT_CSV, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            disease_uri = row['uri']
            disease_name = row['name']
            symptoms_str = row['symptoms']

            if not symptoms_str or symptoms_str.strip() == '':
                continue

            # "|"로 구분된 증상들
            symptoms = [s.strip() for s in symptoms_str.split('|') if s.strip()]

            if symptoms:
                print(f"  {disease_name}: {len(symptoms)} symptoms")

                # 증상 URI 생성 및 저장
                symptom_uris = []
                for symptom in symptoms:
                    symptom_uri = generate_symptom_uri(symptom)
                    all_symptoms[symptom_uri] = symptom
                    symptom_uris.append(symptom_uri)

                disease_symptoms.append({
                    'uri': disease_uri,
                    'name': disease_name,
                    'symptom_uris': symptom_uris
                })

    print()
    print(f"Processed: {len(disease_symptoms)} diseases")
    print(f"Unique symptoms: {len(all_symptoms)}")
    print()

    # 증상 Concept 정의
    lines.append("# 증상 Concept 정의")
    for symptom_uri, symptom_name in all_symptoms.items():
        lines.append(f"<{symptom_uri}> a skos:Concept ;")
        lines.append(f'    skos:prefLabel "{symptom_name}"@ko ;')
        lines.append(f"    skos:broader <http://knowledgemap.kr/koid/concept_class/symptom> .")
        lines.append("")

    # 감염병 - 증상 매핑
    lines.append("# 감염병 - 증상 매핑")
    for disease in disease_symptoms:
        lines.append(f"# {disease['name']}")
        lines.append(f"<{disease['uri']}>")
        for i, symptom_uri in enumerate(disease['symptom_uris']):
            separator = ";" if i < len(disease['symptom_uris']) - 1 else "."
            lines.append(f"    koid:symptom <{symptom_uri}> {separator}")
        lines.append("")

    with open(OUTPUT_TTL, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"TTL created: {OUTPUT_TTL}")
    print()
    print("=" * 60)
    print("Next steps:")
    print("1. Open GraphDB (http://localhost:7200)")
    print("2. Import -> RDF tab")
    print(f"3. Upload: {OUTPUT_TTL.name}")
    print("4. Restart backend server")
    print("5. Test frontend")
    print("=" * 60)

if __name__ == "__main__":
    main()
