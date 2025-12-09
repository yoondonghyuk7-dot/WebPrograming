// 기존 검색 결과 페이지 UI를 유지한 채 백엔드 /api/search/symptoms와 연동

document.addEventListener('DOMContentLoaded', initSearchResultsPage);

async function initSearchResultsPage() {
    const { q, region } = getQueryParams();

    if (!q) {
        showNoResults('검색어가 없습니다.');
        return;
    }

    // 검색어 표시
    const queryTextEl = document.getElementById('searchQueryText');
    if (queryTextEl) queryTextEl.textContent = q;

    try {
        toggleLoading(true);
        const data = await fetchSearchResults(q, region);
        renderKeywords(data.keywords || []);
        renderDiseaseRecommendations(data.recommendations || []);
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

const API_BASE =
    window.__API_BASE ||
    (location.port === '8001'
        ? `${location.protocol}//${location.host}`
        : 'http://localhost:8001');

async function fetchSearchResults(q, region) {
    const params = new URLSearchParams({ q });
    if (region) params.set('region', region);
    const res = await fetch(`${API_BASE}/api/search/symptoms?${params.toString()}`);
    if (!res.ok) throw new Error(`검색 API 호출 실패: ${res.status}`);
    return await res.json();
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

// 키워드 태그 렌더링 (입력 토큰/표준 증상 매핑)
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

// 질병 카드 렌더링
function renderDiseaseRecommendations(recommendations) {
    const container = document.getElementById('diseaseCardsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
        container.innerHTML = '<div class="loading">검색 결과가 없습니다.</div>';
        return;
    }

    recommendations.forEach(rec => {
        const card = createDiseaseCard(rec);
        container.appendChild(card);
    });
}

function createDiseaseCard(recommendation) {
    const { disease = {}, similarity = 0, matchedSymptoms = [], risk = null } = recommendation;
    const card = document.createElement('div');
    card.className = 'disease-card';
    card.style.cursor = 'pointer';

    let description = disease.description || disease.definition || '';
    if (description.length > 150) description = description.substring(0, 150) + '...';
    let highlightedDescription = description;
    matchedSymptoms.forEach(symptom => {
        const regex = new RegExp(`(${escapeRegExp(symptom)})`, 'gi');
        highlightedDescription = highlightedDescription.replace(
            regex,
            '<mark class="matched-symptom-highlight">$1</mark>'
        );
    });

    card.innerHTML = `
        <div class="disease-card-header">
            <div>
                <div class="disease-name">${disease.name || '알 수 없는 감염병'}</div>
                <div class="disease-name-en">${disease.nameEn || ''}</div>
            </div>
            <div class="similarity-badge">유사도 ${similarity}%</div>
        </div>

        <div class="disease-description">${highlightedDescription}</div>

        <div class="matched-symptoms">
            <div class="matched-symptoms-label">매칭 증상:</div>
            <div class="matched-symptoms-list">
                ${matchedSymptoms.map(symptom => `<span class="matched-symptom-tag">${symptom}</span>`).join('')}
            </div>
        </div>

        ${
            risk
                ? `
        <div class="risk-analysis ${risk.level || ''}">
            <div class="risk-badge">${risk.levelText || risk.level || '위험도 정보 없음'}</div>
            <div class="risk-text">${risk.summary || ''}</div>
            <div class="risk-statistics">${risk.statistics || ''}</div>
        </div>
        `
                : ''
        }
    `;

    card.addEventListener('click', () => {
        showDiseaseDetail(disease, matchedSymptoms, risk);
    });

    return card;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 상세 모달 표시 (기존 UI 유지)
function showDiseaseDetail(disease, matchedSymptoms, risk) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;

    const symptoms = disease.symptomNames || matchedSymptoms || [];
    const symptomsHTML = symptoms.length > 0
        ? symptoms.map(symptom => {
            const isMatched = matchedSymptoms && matchedSymptoms.includes(symptom);
            return `<li${isMatched ? ' style="color: #2563eb; font-weight: 600;"' : ''}>${symptom}${isMatched ? ' ✅' : ''}</li>`;
        }).join('')
        : '<li>정보가 없습니다.</li>';

    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="modal-title">
                <h2>${disease.name || '알 수 없는 감염병'}</h2>
                <p>${disease.nameEn || ''}</p>
            </div>
        </div>

        <div class="detail-section">
            <h3>설명</h3>
            <p>${disease.description || disease.definition || '설명이 없습니다.'}</p>
        </div>

        <div class="detail-section">
            <h3>증상</h3>
            <ul>${symptomsHTML}</ul>
        </div>

        ${risk ? `
        <div class="detail-section">
            <h3>지역 위험도</h3>
            <p>${risk.levelText || risk.level || ''}</p>
            <p>${risk.summary || ''}</p>
            <p style="color: #666; font-size: 0.9em;">${risk.statistics || ''}</p>
        </div>
        ` : ''}
    `;

    modal.style.display = 'block';
}

// 모달 닫기
function closeModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.style.display = 'none';
}

// 모달 외부 클릭 닫기
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target == modal) {
        closeModal();
    }
}
