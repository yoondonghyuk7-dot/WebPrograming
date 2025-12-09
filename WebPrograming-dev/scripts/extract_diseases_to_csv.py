#!/usr/bin/env python3
"""
TTL 파일에서 감염병 정보를 추출하여 CSV로 변환
OpenRefine에서 증상 매핑 작업을 위해 사용
"""
import re
import csv
from pathlib import Path

INPUT_TTL = Path(__file__).parent.parent.parent / "Infection_Rdf.ttl"
OUTPUT_CSV = Path(__file__).parent.parent.parent / "diseases_for_mapping.csv"

def extract_diseases():
    """TTL 파일에서 감염병 정보 추출"""
    with open(INPUT_TTL, 'r', encoding='utf-8') as f:
        content = f.read()

    diseases = []
    lines = content.split('\n')
    current_disease = None
    in_description = False
    description_lines = []

    for line in lines:
        # 감염병 URI 찾기
        if 'a schema:InfectiousDisease' in line or 'a koid:InfectiousDisease' in line:
            # 이전 감염병 저장
            if current_disease and description_lines:
                description = ' '.join(description_lines)

                # 증상 섹션 추출 (여러 패턴 시도)
                symptom_match = None
                patterns = [
                    r'전형적인\s*증상은?\s*([^.。]+)',
                    r'주요\s*증상은?\s*([^.。]+)',
                    r'증상은?\s*([가-힣\s,]+?)(?:등|입니다|이며|으로)',
                ]

                for pattern in patterns:
                    symptom_match = re.search(pattern, description)
                    if symptom_match:
                        break

                symptom_text = symptom_match.group(1) if symptom_match else ""

                diseases.append({
                    'uri': current_disease['uri'],
                    'name': current_disease['name'],
                    'description': description[:200] + '...' if len(description) > 200 else description,
                    'symptom_text': symptom_text
                })

            # 새 감염병 시작
            uri_match = re.search(r'<(http://knowledgemap\.kr/koid/id/[^>]+)>', line)
            if uri_match:
                current_disease = {'uri': uri_match.group(1), 'name': 'Unknown'}
                in_description = False
                description_lines = []

        # 한국어 이름 추출
        elif current_disease and 'skos:prefLabel' in line and '@ko' in line:
            name_match = re.search(r'"([^"]+)"@ko', line)
            if name_match:
                current_disease['name'] = name_match.group(1)

        # schema:description 수집
        elif current_disease and 'schema:description' in line and '"""' in line:
            in_description = True
            desc_start = line.split('"""', 1)
            if len(desc_start) > 1:
                desc_text = desc_start[1]
                if '"""' in desc_text:
                    description_lines.append(desc_text.split('"""')[0])
                    in_description = False
                else:
                    description_lines.append(desc_text)
        elif in_description:
            if '"""' in line:
                description_lines.append(line.split('"""')[0])
                in_description = False
            else:
                description_lines.append(line.strip())

    # 마지막 감염병 저장
    if current_disease and description_lines:
        description = ' '.join(description_lines)
        symptom_match = re.search(r'전형적인\s*증상은?\s*([^.。]+)', description)
        symptom_text = symptom_match.group(1) if symptom_match else ""

        diseases.append({
            'uri': current_disease['uri'],
            'name': current_disease['name'],
            'description': description[:200] + '...' if len(description) > 200 else description,
            'symptom_text': symptom_text
        })

    return diseases

def main():
    print("=" * 60)
    print("TTL to CSV Converter for Symptom Mapping")
    print("=" * 60)
    print()

    if not INPUT_TTL.exists():
        print(f"ERROR: {INPUT_TTL} not found")
        return

    print(f"Reading: {INPUT_TTL}")
    diseases = extract_diseases()

    print(f"Extracted: {len(diseases)} diseases")
    print()

    # CSV 작성
    with open(OUTPUT_CSV, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['uri', 'name', 'description', 'symptom_text', 'symptoms'])
        writer.writeheader()

        for d in diseases:
            writer.writerow({
                'uri': d['uri'],
                'name': d['name'],
                'description': d['description'],
                'symptom_text': d['symptom_text'],
                'symptoms': ''  # OpenRefine에서 채울 예정
            })

    print(f"CSV created: {OUTPUT_CSV}")
    print()
    print("=" * 60)
    print("Next steps:")
    print("1. Open OpenRefine (http://127.0.0.1:3333)")
    print("2. Create Project -> Choose Files")
    print(f"3. Select: {OUTPUT_CSV.name}")
    print("4. Follow OPENREFINE_SYMPTOM_MAPPING_GUIDE.md")
    print("=" * 60)

if __name__ == "__main__":
    main()
