import re

def remove_korean_josa(token: str) -> str:
    """한국어 조사 및 어미 제거 (이/가/을/를/은/는/과/와/도/만/에/으로/로/고/다/함/요 등)"""
    if len(token) <= 1:
        return token

    # 2글자 어미 먼저 처리 (더 구체적인 패턴)
    double_eomi = ['어요', '아요', '해요', '네요', 'ㅂ니다', '습니다']
    for eomi in double_eomi:
        if token.endswith(eomi) and len(token) > len(eomi):
            return token[:-len(eomi)]

    # 1글자 조사
    single_josa = ['이', '가', '을', '를', '은', '는', '과', '와', '도', '만', '에', '의']
    for josa in single_josa:
        if token.endswith(josa) and len(token) > len(josa):
            return token[:-len(josa)]

    # 2글자 조사
    double_josa = ['에서', '에게', '으로', '에도', '부터', '까지', '처럼', '마저', '조차']
    for josa in double_josa:
        if token.endswith(josa) and len(token) > len(josa):
            return token[:-len(josa)]

    # 1글자 동사/형용사 어미 (조사 다음에 처리)
    single_eomi = ['고', '다', '요', '네', '지', '니']
    for eomi in single_eomi:
        if token.endswith(eomi) and len(token) > len(eomi):
            return token[:-len(eomi)]

    # 2글자 어미
    double_eomi_2 = ['함', '음', '기']
    for eomi in double_eomi_2:
        if token.endswith(eomi) and len(token) > len(eomi):
            return token[:-len(eomi)]

    # '로'는 받침이 없을 때만 (으로는 위에서 처리)
    if token.endswith('로') and len(token) > 1:
        return token[:-1]

    return token


def tokenize_query(q: str):
    tokens = re.findall(r"[0-9A-Za-z가-힣]+", q)
    # 조사/어미 제거 전에 2글자 이상인 토큰만 처리
    # 제거 후 1글자가 되어도 유효한 토큰으로 인정 (예: "배가" → "배", "열이" → "열")
    result = []
    for tok in tokens:
        if len(tok.strip()) >= 2:  # 원본이 2글자 이상이면
            cleaned = remove_korean_josa(tok.lower())
            # 조사/어미 제거 후에는 1글자도 허용
            if len(cleaned) >= 1:
                result.append(cleaned)
    return result


# Test
query = "배가 많이 아프고 열이 엄청나고 기침이 나고 어지럽고 의식이 혼란함"
tokens = tokenize_query(query)

# Write to file
with open("tokens_result.txt", "w", encoding="utf-8") as f:
    f.write(f"원본: {query}\n\n")
    f.write(f"토큰화 결과 ({len(tokens)}개):\n")
    for i, tok in enumerate(tokens, 1):
        f.write(f"{i}. {tok}\n")

print(f"Results written to tokens_result.txt")
