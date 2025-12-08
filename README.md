# 감염병 정보 시스템

## 실행 방법

### 방법 1: Python HTTP 서버 (권장)
1. `start_server.bat` 파일을 더블클릭하거나
2. 터미널에서 다음 명령어 실행:
   ```bash
   python -m http.server 8000
   ```
3. 브라우저에서 `http://localhost:8000` 접속

### 방법 2: 직접 파일 열기
- `index.html` 파일을 브라우저로 직접 열기
- ⚠️ 주의: TTL 파일 로드 등 일부 기능이 제한될 수 있습니다.

### 방법 3: VS Code Live Server
1. VS Code에서 프로젝트 폴더 열기
2. Live Server 확장 설치
3. `index.html` 우클릭 → "Open with Live Server"

## 주요 기능

### 1. 메인 페이지
- 왼쪽: 감염병 정보 (4개 주요 감염병)
- 오른쪽: 의료기관 지도
- 아래: 통계 차트

### 2. 감염병 상세 페이지
- 19개 감염병 정보
- 검색 기능
- 카드 클릭 시 상세 정보 모달

### 3. 의료기관 상세 페이지
- 카카오맵 연동
- 주변 의료기관 표시
- ⚠️ 카카오맵 API 키 필요: `hospitals.html`에서 `YOUR_KAKAO_APP_KEY` 교체

### 4. 통계 상세 페이지
- 감염병별 / 지역별 / 성별 통계
- TTL 파일 데이터 파싱 및 시각화

## 파일 구조

```
고급웹/
├── index.html          # 메인 페이지
├── diseases.html       # 감염병 상세
├── hospitals.html      # 의료기관 상세
├── statistics.html     # 통계 상세
├── scripts/            # JavaScript 파일들
├── styles/             # CSS 파일들
├── csv-xls.ttl         # 감염병/성별 데이터
├── xlsx (1).ttl        # 지역별 데이터
└── start_server.bat    # 서버 시작 스크립트
```

## 주의사항

1. **카카오맵 API 키**: 의료기관 페이지를 사용하려면 카카오 개발자 콘솔에서 API 키를 발급받아 `hospitals.html`에 설정해야 합니다.

2. **TTL 파일**: 통계 페이지는 `csv-xls.ttl`과 `xlsx (1).ttl` 파일이 같은 디렉토리에 있어야 정상 작동합니다.

3. **CORS 정책**: 일부 브라우저에서는 로컬 파일 직접 열기 시 TTL 파일 로드가 차단될 수 있으므로, HTTP 서버를 통해 실행하는 것을 권장합니다.

