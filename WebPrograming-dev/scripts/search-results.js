// 검색 결과 페이지 - 사용자 위치 기반 위험도 분석 포함

document.addEventListener('DOMContentLoaded', initSearchResultsPage);

let userRegion = null; // 사용자 위치 기반 지역

const API_BASE =
    window.__API_BASE ||
    (location.port === '8001'
        ? `${location.protocol}//${location.host}`
        : 'http://localhost:8001');

// 좌표 기반 지역 판별 (간단한 한국 지역 매핑)
const REGION_BOUNDS = {
    '서울': { minLat: 37.4, maxLat: 37.7, minLng: 126.7, maxLng: 127.2 },
    '경기': { minLat: 36.9, maxLat: 38.3, minLng: 126.3, maxLng: 127.9 },
    '인천': { minLat: 37.3, maxLat: 37.6, minLng: 126.3, maxLng: 126.8 },
    '부산': { minLat: 34.8, maxLat: 35.4, minLng: 128.7, maxLng: 129.3 },
    '대구': { minLat: 35.7, maxLat: 36.0, minLng: 128.4, maxLng: 128.8 },
    '광주': { minLat: 35.0, maxLat: 35.3, minLng: 126.7, maxLng: 127.0 },
    '대전': { minLat: 36.2, maxLat: 36.5, minLng: 127.2, maxLng: 127.6 },
    '울산': { minLat: 35.4, maxLat: 35.7, minLng: 129.0, maxLng: 129.5 },
    '세종': { minLat: 36.4, maxLat: 36.7, minLng: 127.0, maxLng: 127.4 },
    '강원': { minLat: 37.0, maxLat: 38.6, minLng: 127.5, maxLng: 129.4 },
    '충북': { minLat: 36.4, maxLat: 37.2, minLng: 127.2, maxLng: 128.2 },
    '충남': { minLat: 36.0, maxLat: 37.0, minLng: 126.0, maxLng: 127.4 },
    '전북': { minLat: 35.3, maxLat: 36.2, minLng: 126.3, maxLng: 127.9 },
    '전남': { minLat: 34.0, maxLat: 35.5, minLng: 126.0, maxLng: 127.9 },
    '경북': { minLat: 35.6, maxLat: 37.1, minLng: 128.3, maxLng: 130.9 },
    '경남': { minLat: 34.6, maxLat: 35.9, minLng: 127.5, maxLng: 129.5 },
    '제주': { minLat: 33.1, maxLat: 33.6, minLng: 126.1, maxLng: 126.9 }
};

function getRegionFromCoords(lat, lng) {
    for (const [region, bounds] of Object.entries(REGION_BOUNDS)) {
        if (lat >= bounds.minLat && lat <= bounds.maxLat &&
            lng >= bounds.minLng && lng <= bounds.maxLng) {
            return region;
        }
    }
    return '전국'; // 기본값
}

async function getUserLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve('전국');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const region = getRegionFromCoords(
                    position.coords.latitude,
                    position.coords.longitude
                );
                resolve(region);
            },
            () => {
                resolve('전국'); // 위치 권한 거부 시 기본값
            },
            { timeout: 5000 }
        );
    });
}

async function initSearchResultsPage() {
    const { q, region } = getQueryParams();

    if (!q) {
        showNoResults('검색어가 없습니다.');
        return;
    }

    // 사용자 위치 감지 (URL 파라미터로 지역이 없으면)
    if (!region) {
        userRegion = await getUserLocation();
    } else {
        userRegion = region;
    }

    // 검색어 및 지역 표시
    const queryTextEl = document.getElementById('searchQueryText');
    if (queryTextEl) {
        let displayText = q;
        if (userRegion && userRegion !== '전국') {
            displayText += ` (📍 ${userRegion} 지역)`;
        }
        queryTextEl.textContent = displayText;
    }

    try {
        toggleLoading(true);
        const data = await fetchSearchResults(q, region);
        renderKeywords(data.keywords || []);
        await renderDiseaseRecommendations(data.recommendations || []);
        toggleLoading(false);

        const hasResults = Array.isArray(data.recommendations) && data.recommendations.length > 0;
        if (hasResults) {
            showSections();
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('검색 실패:', error);
        toggleLoading(false);
        showNoResults('검색 중 오류가 발생했습니다.');
    }
}

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        q: params.get('q') || '',
        region: params.get('region') || ''
    };
}

async function fetchSearchResults(q, region) {
    const params = new URLSearchParams({ q });
    if (region) params.set('region', region);
    const res = await fetch(`${API_BASE}/api/search/symptoms?${params.toString()}`);
    if (!res.ok) throw new Error(`검색 API 호출 실패: ${res.status}`);
    return await res.json();
}

async function fetchRiskAnalysis(diseaseId, region) {
    try {
        const params = new URLSearchParams({ diseaseId, region });
        const res = await fetch(`${API_BASE}/api/stats/risk-analysis?${params.toString()}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error('위험도 분석 API 오류:', e);
        return null;
    }
}

function toggleLoading(show) {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) loadingEl.style.display = show ? 'block' : 'none';
}

function showSections() {
    const analysisSection = document.getElementById('analysisSection');
    const recommendationsSection = document.getElementById('recommendationsSection');
    const noResultsEl = document.getElementById('noResults');
    if (analysisSection) analysisSection.style.display = 'block';
    if (recommendationsSection) recommendationsSection.style.display = 'block';
    if (noResultsEl) noResultsEl.style.display = 'none';
}

function showNoResults(msg) {
    const analysisSection = document.getElementById('analysisSection');
    const recommendationsSection = document.getElementById('recommendationsSection');
    const noResultsEl = document.getElementById('noResults');
    if (analysisSection) analysisSection.style.display = 'none';
    if (recommendationsSection) recommendationsSection.style.display = 'none';
    if (noResultsEl) {
        noResultsEl.style.display = 'block';
        if (msg) {
            const h3 = noResultsEl.querySelector('h3');
            if (h3) h3.textContent = msg;
        }
    }
}

// 키워드 태그 렌더링
function renderKeywords(keywords) {
    const container = document.getElementById('keywordTags');
    if (!container) return;
    container.innerHTML = '';

    if (!Array.isArray(keywords) || keywords.length === 0) {
        container.innerHTML = '<span class="keyword-tag empty">매칭된 증상이 없습니다.</span>';
        return;
    }

    keywords.forEach(keyword => {
        const tag = document.createElement('span');
        tag.className = 'keyword-tag';
        if (keyword.standard && keyword.original && keyword.standard !== keyword.original) {
            tag.innerHTML = `
                <span class="original">"${keyword.original}"</span>
                <span class="arrow">→</span>
                <span class="standard">${keyword.standard}</span>
            `;
        } else {
            tag.innerHTML = `<span class="standard">${keyword.standard || keyword.original || '증상'}</span>`;
        }
        container.appendChild(tag);
    });
}

// 질병 카드 렌더링 (감염병 정보 페이지 스타일 + 위험도 분석)
async function renderDiseaseRecommendations(recommendations) {
    const container = document.getElementById('diseaseCardsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
        container.innerHTML = '<div class="loading">검색 결과가 없습니다.</div>';
        return;
    }

    // 질병 ID 기준 중복 제거
    const seenIds = new Set();
    const uniqueRecommendations = recommendations.filter(rec => {
        const id = rec.disease?.id;
        if (!id || seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
    });

    // 각 질병에 대해 위험도 분석 추가
    for (const rec of uniqueRecommendations) {
        const card = await createDiseaseCard(rec);
        container.appendChild(card);
    }
}

async function createDiseaseCard(recommendation) {
    const { disease = {}, similarity = 0, matchedSymptoms = [] } = recommendation;
    const card = document.createElement('div');

    // 등급 결정 (기본: grade2)
    const gradeType = disease.gradeType || 'grade2';
    card.className = `disease-card ${gradeType}`;
    card.style.cursor = 'pointer';

    // 등급별 아이콘
    const displayIcon = gradeType === 'grade1' ? '⚠️' : '🦠';

    // 설명 처리
    let description = disease.description || disease.definition || '';
    if (description.length > 100) description = description.substring(0, 100) + '...';

    // 매칭 증상 하이라이트
    let highlightedDescription = description;
    matchedSymptoms.forEach(symptom => {
        const regex = new RegExp(`(${escapeRegExp(symptom)})`, 'gi');
        highlightedDescription = highlightedDescription.replace(
            regex,
            '<mark class="matched-symptom-highlight">$1</mark>'
        );
    });

    // 사용자 위치 기반 위험도 분석 가져오기
    let riskHTML = '';
    if (userRegion) {
        const diseaseName = disease.name || disease.nameKo || '';
        const riskData = await fetchRiskAnalysis(diseaseName, userRegion);

        if (riskData && riskData.level !== 'unknown') {
            const levelClass = riskData.level || 'safe';
            const stats = riskData.statistics;

            riskHTML = `
            <div class="risk-analysis-card ${levelClass}">
                <div class="risk-header-card">
                    <span class="risk-icon-card">📊</span>
                    <span class="risk-title-card">📍 ${userRegion} 지역 위험도</span>
                </div>
                <div class="risk-badge-card ${levelClass}">${riskData.levelText}</div>
                <div class="risk-summary-card">${riskData.summary}</div>
                ${stats ? `
                <div class="risk-stats-card">
                    <span>📊 ${stats.recordsAnalyzed}개 데이터</span>
                    <span>📈 평균 ${stats.avgIncidenceRate}%</span>
                    <span>🔺 최대 ${stats.maxIncidenceRate}%</span>
                </div>
                ` : ''}
            </div>
            `;
        } else if (riskData && riskData.level === 'unknown') {
            riskHTML = `
            <div class="risk-analysis-card unknown">
                <div class="risk-header-card">
                    <span class="risk-icon-card">📊</span>
                    <span class="risk-title-card">📍 ${userRegion} 지역 위험도</span>
                </div>
                <div class="risk-summary-card" style="color: #666;">
                    해당 지역의 통계 데이터가 없습니다.
                </div>
            </div>
            `;
        }
    }

    card.innerHTML = `
        <div class="card-top-bar ${gradeType}"></div>
        <div class="card-content">
            <div class="card-header">
                <div class="disease-icon-card">${displayIcon}</div>
                <div class="similarity-badge">유사도 ${similarity}%</div>
            </div>
            <div class="grade-badge ${gradeType}">${disease.grade || '감염병'}</div>
            <h3 class="disease-name-card">${disease.name || '알 수 없는 감염병'}</h3>
            ${disease.nameEn ? `<p class="disease-name-en-card">${disease.nameEn}</p>` : ''}
            <p class="disease-description-card">${highlightedDescription}</p>

            <div class="matched-symptoms-card">
                <div class="matched-symptoms-label">매칭 증상:</div>
                <div class="matched-symptoms-list">
                    ${matchedSymptoms.map(s => `<span class="matched-symptom-tag">${s}</span>`).join('')}
                </div>
            </div>

            ${riskHTML}
        </div>
    `;

    // 카드 클릭 시 감염병 정보 페이지로 이동
    card.addEventListener('click', () => {
        const diseaseName = disease.name || '';
        if (diseaseName) {
            // 감염병 정보 페이지로 이동하면서 질병명을 쿼리 파라미터로 전달
            window.location.href = `diseases.html?disease=${encodeURIComponent(diseaseName)}`;
        }
    });

    return card;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
