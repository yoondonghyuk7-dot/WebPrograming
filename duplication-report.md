# Duplicate functionality between static pages and React implementation

This repository currently contains both the legacy static HTML/CSS/JS pages and a new React single-page app that re-implements the same user flows. The following overlaps exist:

## Landing page (검색/카드/도넛 차트)
- Static `index.html` renders the hero with search box, quick tags, disease cards, hospital map placeholder, and statistics preview, all wired up by `scripts/main.js` for search filtering and drawing the donut chart.
- React `Header.jsx` and `Main.jsx` recreate the same sections, including identical search filtering logic against `.disease-card` DOM nodes and the same hard-coded disease list and donut chart drawing code.

## 병원 정보
- Static `hospitals.html` + `scripts/hospitals.js` provide a dedicated 주변 의료기관 페이지 with a back button, descriptive text, and an interactive Kakao map showing hospitals/clinics/isolation facilities.
- React `HospitalDetail.jsx` offers a separate “의료기관 정보” page with a back button, list of hospital cards, and modal details for each card, covering the same functional area (finding hospital details) as the static page, but with different mock data and no map.

## 통계 뷰
- Static `statistics.html` with `scripts/statistics.js` and `scripts/ttlParser.js` shows toggleable disease/region/gender charts via Chart.js.
- React `Statistics.jsx` implements its own 월별/질병별/지역별/요약 통계 sections with inline SVG charts and progress bars, targeting the same statistics experience without using the static Chart.js setup.

## 감염병 카드 목록
- The main landing page in both static (`index.html`) and React (`Main.jsx`) includes the same four 감염병 카드 (코로나19/특감/장티푸스/콜레라) with identical text and styling hooks, meaning the list is maintained twice.

These parallel implementations indicate duplicated maintenance effort across the old static site and the new React app.
