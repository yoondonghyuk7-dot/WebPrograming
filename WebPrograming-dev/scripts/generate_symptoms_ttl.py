#!/usr/bin/env python3
"""
schema:description에서 증상을 추출하여 TTL 파일을 생성하는 스크립트
"""
import re
import hashlib
from pathlib import Path

# TTL 파일 경로
INPUT_TTL = Path(__file__).parent.parent.parent / "Infection_Rdf.ttl"
OUTPUT_TTL = Path(__file__).parent.parent.parent / "Infection_Symptoms_Enhanced.ttl"

def extract_symptoms_from_text(text):
    """
    schema:description 텍스트에서 증상 추출
    """
    # 여러 패턴 시도
    patterns = [
        r'전형적인\s*증상은?\s*([^.。\n]+)',  # 전형적인 증상은
        r'주요\s*증상은?\s*([^.。\n]+)',     # 주요 증상은
        r'증상은?\s*([가-힣\s,]+?)(?:등|입니다|이며|으로)',  # 증상은 ... 등
        r'나타나는\s*증상은?\s*([^.。\n]+)',  # 나타나는 증상은
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            symptoms_text = match.group(1)
            # "등으로", "등입니다", "으로", "이며" 제거
            symptoms_text = re.sub(r'\s*(?:등|으로|입니다|이며|및).*$', '', symptoms_text)
            # 콤마로 분리
            symptoms = [s.strip() for s in symptoms_text.split(',') if s.strip()]
            # 길이 필터링 (너무 긴 것 제외, 너무 짧은 것도 제외)
            symptoms = [s for s in symptoms if 2 <= len(s) < 30 and not any(c.isdigit() for c in s)]
            if symptoms:
                return symptoms

    return []

def generate_symptom_uri(symptom_name):
    """
    증상 이름으로 URI 생성
    """
    # MD5 해시 사용
    hash_obj = hashlib.md5(symptom_name.encode('utf-8'))
    return f"http://knowledgemap.kr/koid/concept/symptom/{hash_obj.hexdigest()}"

def parse_ttl_file():
    """
    TTL 파일 파싱하여 감염병 URI와 description 추출
    """
    with open(INPUT_TTL, 'r', encoding='utf-8') as f:
        content = f.read()

    diseases = []

    # 각 감염병 블록을 찾기 위해 라인별로 처리
    lines = content.split('\n')
    current_disease = None
    in_description = False
    description_lines = []

    for i, line in enumerate(lines):
        # 감염병 URI 찾기
        if 'a schema:InfectiousDisease' in line or 'a koid:InfectiousDisease' in line:
            # 이전 감염병 처리
            if current_disease and description_lines:
                description = '\n'.join(description_lines)
                symptoms = extract_symptoms_from_text(description)
                if symptoms:
                    diseases.append({
                        'uri': current_disease['uri'],
                        'name': current_disease['name'],
                        'symptoms': symptoms
                    })
                    print(f"[OK] {current_disease['name']}: {len(symptoms)} symptoms - {', '.join(symptoms[:3])}...")

            # URI 추출
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

        # schema:description 시작
        elif current_disease and 'schema:description' in line and '"""' in line:
            in_description = True
            # 같은 줄에 내용이 있을 수 있음
            desc_start = line.split('"""', 1)
            if len(desc_start) > 1:
                desc_text = desc_start[1]
                if '"""' in desc_text:  # 한 줄에 끝나는 경우
                    description_lines.append(desc_text.split('"""')[0])
                    in_description = False
                else:
                    description_lines.append(desc_text)

        # description 내용 수집
        elif in_description:
            if '"""' in line:  # description 끝
                desc_text = line.split('"""')[0]
                description_lines.append(desc_text)
                in_description = False
            else:
                description_lines.append(line)

    # 마지막 감염병 처리
    if current_disease and description_lines:
        description = '\n'.join(description_lines)
        symptoms = extract_symptoms_from_text(description)
        if symptoms:
            diseases.append({
                'uri': current_disease['uri'],
                'name': current_disease['name'],
                'symptoms': symptoms
            })
            print(f"[OK] {current_disease['name']}: {len(symptoms)} symptoms - {', '.join(symptoms[:3])}...")

    return diseases

def generate_ttl_output(diseases):
    """
    새로운 TTL 파일 생성
    """
    lines = []
    lines.append("@prefix koid: <http://knowledgemap.kr/koid/def/> .")
    lines.append("@prefix skos: <http://www.w3.org/2004/02/skos/core#> .")
    lines.append("@prefix schema: <http://schema.org/> .")
    lines.append("")
    lines.append("# 감염병 증상 추가 매핑")
    lines.append("# 이 파일을 GraphDB에 Import하면 기존 데이터에 증상이 추가됩니다.")
    lines.append("")

    # 모든 고유 증상 수집
    all_symptoms = {}
    for disease in diseases:
        for symptom in disease['symptoms']:
            symptom_uri = generate_symptom_uri(symptom)
            if symptom_uri not in all_symptoms:
                all_symptoms[symptom_uri] = symptom

    # 증상 Concept 정의
    lines.append("# 증상 Concept 정의")
    for symptom_uri, symptom_name in all_symptoms.items():
        lines.append(f"<{symptom_uri}> a skos:Concept ;")
        lines.append(f'    skos:prefLabel "{symptom_name}"@ko ;')
        lines.append(f"    skos:broader <http://knowledgemap.kr/koid/concept_class/symptom> .")
        lines.append("")

    # 감염병에 증상 추가
    lines.append("# 감염병 - 증상 매핑")
    for disease in diseases:
        lines.append(f"# {disease['name']}")
        lines.append(f"<{disease['uri']}>")
        for i, symptom in enumerate(disease['symptoms']):
            symptom_uri = generate_symptom_uri(symptom)
            separator = ";" if i < len(disease['symptoms']) - 1 else "."
            lines.append(f"    koid:symptom <{symptom_uri}> {separator}")
        lines.append("")

    return "\n".join(lines)

def main():
    print("=" * 60)
    print("Infection Symptoms TTL Generator")
    print("=" * 60)
    print()

    if not INPUT_TTL.exists():
        print(f"ERROR: {INPUT_TTL} not found")
        return

    print(f"Reading TTL file: {INPUT_TTL}")
    diseases = parse_ttl_file()

    print()
    print(f"SUCCESS: Extracted symptoms from {len(diseases)} diseases")
    print()

    print("Generating TTL file...")
    ttl_content = generate_ttl_output(diseases)

    with open(OUTPUT_TTL, 'w', encoding='utf-8') as f:
        f.write(ttl_content)

    print(f"DONE: {OUTPUT_TTL}")
    print()
    print("=" * 60)
    print("Next steps:")
    print("1. Open GraphDB (http://localhost:7200)")
    print("2. Import -> RDF tab")
    print(f"3. Upload {OUTPUT_TTL.name}")
    print("4. Restart backend (uvicorn app.main:app --reload --port 8001)")
    print("5. Test frontend")
    print("=" * 60)

if __name__ == "__main__":
    main()
