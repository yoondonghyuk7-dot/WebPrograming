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

# Write to file
with open("test_bae_fixed_result.txt", "w", encoding="utf-8") as f:
    f.write(f"검색어: {data['query']}\n\n")
    f.write(f"토큰: {data.get('tokens', [])}\n\n")
    f.write(f"매핑된 증상 ({len(data['keywords'])}개):\n")
    for kw in data['keywords']:
        f.write(f"  원본: {kw['original']} → 표준: {kw['standard']}\n")
        f.write(f"  URI: {kw['uri']}\n\n")

print("결과가 test_bae_fixed_result.txt 파일에 저장되었습니다.")
