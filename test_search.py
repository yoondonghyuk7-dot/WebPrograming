import urllib.request
import urllib.parse
import json

# Test query
query = "배가 많이 아프고 열이 엄청나고 기침이 나고 어지럽고 의식이 혼란함"
encoded = urllib.parse.urlencode({'q': query})

# Make request
url = f'http://localhost:8001/api/search/symptoms?{encoded}'
response = urllib.request.urlopen(url)
data = json.load(response)

# Print results
print(f"검색어: {data['query']}")
print(f"\n토큰화 결과 ({len(data.get('tokens', []))}개):")
for tok in data.get('tokens', []):
    print(f"  - {tok}")

print(f"\n추출된 키워드 ({len(data['keywords'])}개):")
for kw in data['keywords']:
    print(f"  - 원본: '{kw['original']}' → 표준: '{kw['standard']}'")

print(f"\n추천 질병 ({len(data['recommendations'])}개):")
for i, rec in enumerate(data['recommendations'][:5], 1):
    disease = rec['disease']
    print(f"\n{i}. {disease['name']} (유사도: {rec['similarity']}%)")
    print(f"   증상: {', '.join(disease['symptomNames'])}")
    print(f"   매칭: {', '.join(rec['matchedSymptoms'])}")
