// 감염병 상세 페이지 - API 연동 버전

const API_BASE = window.__API_BASE ||
    (location.port === '8001'
        ? `${location.protocol}//${location.host}`
        : 'http://localhost:8001');

let diseases = []; // API에서 로드된 감염병 데이터
let showingAll = false;
const INITIAL_DISPLAY_COUNT = 8;

// 페이지 로드 시 API에서 감염병 데이터 로드
document.addEventListener('DOMContentLoaded', async function() {
    await loadDiseasesFromAPI();

    // URL 파라미터에서 disease 값 확인 (검색 결과 페이지에서 넘어온 경우)
    const params = new URLSearchParams(window.location.search);
    const targetDisease = params.get('disease');

    if (targetDisease && diseases.length > 0) {
        // 해당 질병 찾기
        const disease = diseases.find(d =>
            (d.name || d.nameKo || '').toLowerCase() === targetDisease.toLowerCase() ||
            (d.nameKo || '').toLowerCase() === targetDisease.toLowerCase()
        );

        if (disease) {
            // 약간의 지연 후 모달 표시 (렌더링 완료 후)
            setTimeout(() => showDetail(disease), 100);
        }
    }
});

// API에서 감염병 데이터 로드
async function loadDiseasesFromAPI() {
    const loadingEl = document.getElementById('loadingIndicator');
    const containerEl = document.getElementById('diseasesContainer');

    try {
        // 로딩 표시
        if (loadingEl) loadingEl.style.display = 'block';

        // API 호출
        const response = await fetch(`${API_BASE}/api/diseases?limit=200`);

        if (!response.ok) {
            throw new Error(`API 호출 실패: ${response.status}`);
        }

        const data = await response.json();
        diseases = data.diseases || [];

        // 데이터가 없는 경우
        if (diseases.length === 0) {
            containerEl.innerHTML = '<div class="no-data">감염병 정보가 없습니다.</div>';
            return;
        }

        // 초기 카드 표시
        renderDiseases(diseases.slice(0, INITIAL_DISPLAY_COUNT));

        // 더보기 버튼 표시
        if (diseases.length > INITIAL_DISPLAY_COUNT) {
            const showMoreBtn = document.getElementById('showMoreBtn');
            if (showMoreBtn) {
                showMoreBtn.classList.remove('hidden');
                showMoreBtn.textContent = `더보기 (${diseases.length - INITIAL_DISPLAY_COUNT}개 더)`;
            }
        }

    } catch (error) {
        console.error('감염병 데이터 로드 실패:', error);
        containerEl.innerHTML = `
            <div class="error-message">
                <p>감염병 정보를 불러오는데 실패했습니다.</p>
                <p>백엔드 서버가 실행 중인지 확인해주세요 (http://localhost:8001)</p>
                <button onclick="loadDiseasesFromAPI()">다시 시도</button>
            </div>
        `;
    } finally {
        // 로딩 숨기기
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

// 감염병 카드 렌더링
function renderDiseases(diseaseList) {
    const container = document.getElementById('diseasesContainer');
    if (!container) return;

    container.innerHTML = '';

    // 질병 ID 기준 중복 제거
    const seenIds = new Set();
    const uniqueDiseases = diseaseList.filter(disease => {
        const id = disease.id || disease.diseaseId;
        if (!id || seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
    });

    uniqueDiseases.forEach(disease => {
        const card = createDiseaseCard(disease);
        container.appendChild(card);
    });
}

// 감염병 카드 생성
function createDiseaseCard(disease) {
    const card = document.createElement('div');
    card.className = `disease-card ${disease.gradeType || 'grade2'}`;
    card.onclick = () => showDetail(disease);

    // 등급별 아이콘 선택
    const gradeType = disease.gradeType || 'grade2';
    let displayIcon = '🦠';
    if (gradeType === 'grade1') {
        displayIcon = '⚠️';
    }

    // 등급별 클래스
    const iconClass = `${gradeType}-icon`;
    const badgeClass = `${gradeType}-badge`;
    const btnClass = `${gradeType}-btn`;

    // 이름 표시 (nameKo 또는 name 사용)
    const displayName = disease.nameKo || disease.name || '알 수 없는 감염병';

    // 설명 표시 (description 또는 definition 사용, 100자로 제한)
    let description = disease.description || disease.definition || '설명이 없습니다.';
    if (description.length > 100) {
        description = description.substring(0, 100) + '...';
    }

    // 영문 이름 표시 (있으면)
    const nameEnHTML = disease.nameEn ? `<p class="disease-name-en" style="font-size: 0.8em; color: #888; margin-top: -5px;">${disease.nameEn}</p>` : '';

    card.innerHTML = `
        <div class="disease-icon ${iconClass}">${displayIcon}</div>
        <div class="grade-badge ${badgeClass}">${disease.grade || '등급 미상'}</div>
        <h3 class="disease-name-ko">${displayName}</h3>
        ${nameEnHTML}
        <p class="disease-description">${description}</p>
        <button class="more-btn ${btnClass}" onclick="event.stopPropagation(); showDetail(${JSON.stringify(disease).replace(/"/g, '&quot;')})">더보기</button>
    `;

    return card;
}

// 모든 감염병 표시
function showAllDiseases() {
    showingAll = true;
    renderDiseases(diseases);
    const showMoreBtn = document.getElementById('showMoreBtn');
    if (showMoreBtn) {
        showMoreBtn.classList.add('hidden');
    }
}

// 검색 필터링
function filterDiseases() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase().trim();

    // 검색어가 없으면 초기 상태로
    if (!searchTerm) {
        if (showingAll) {
            renderDiseases(diseases);
        } else {
            renderDiseases(diseases.slice(0, INITIAL_DISPLAY_COUNT));
        }
        return;
    }

    // 검색 필터링
    const filtered = diseases.filter(disease => {
        const nameKo = (disease.nameKo || disease.name || '').toLowerCase();
        const nameEn = (disease.nameEn || '').toLowerCase();
        const description = (disease.description || disease.definition || '').toLowerCase();
        const grade = (disease.grade || '').toLowerCase();

        return nameKo.includes(searchTerm) ||
               nameEn.includes(searchTerm) ||
               description.includes(searchTerm) ||
               grade.includes(searchTerm);
    });

    // 결과 렌더링
    if (filtered.length === 0) {
        const container = document.getElementById('diseasesContainer');
        container.innerHTML = `
            <div class="no-results">
                <p>검색 결과가 없습니다.</p>
                <p>"${searchTerm}"와 일치하는 감염병이 없습니다.</p>
            </div>
        `;
        return;
    }

    if (showingAll || filtered.length <= INITIAL_DISPLAY_COUNT) {
        renderDiseases(filtered);
        const showMoreBtn = document.getElementById('showMoreBtn');
        if (showMoreBtn) {
            showMoreBtn.classList.add('hidden');
        }
    } else {
        renderDiseases(filtered.slice(0, INITIAL_DISPLAY_COUNT));
        const showMoreBtn = document.getElementById('showMoreBtn');
        if (showMoreBtn) {
            showMoreBtn.classList.remove('hidden');
            showMoreBtn.textContent = `더보기 (${filtered.length - INITIAL_DISPLAY_COUNT}개 더)`;
        }
    }
}

// 상세 정보 표시
function showDetail(disease) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');

    if (!modal || !modalBody) return;

    // 이름
    const nameKo = disease.nameKo || disease.name || '알 수 없는 감염병';
    const nameEn = disease.nameEn || '';

    // 설명
    const description = disease.description || disease.definition || '설명이 없습니다.';

    // 등급
    const grade = disease.grade || '등급 미상';
    const gradeType = disease.gradeType || 'grade2';

    // 아이콘
    const icon = gradeType === 'grade1' ? '⚠️' : '🦠';
    const iconColor = gradeType === 'grade1' ? '#ff4444' :
                      gradeType === 'grade2' ? '#ff9800' : '#ffc107';

    // 증상 (API 응답에 따라 다를 수 있음)
    let symptomsHTML = '<li>증상 정보가 없습니다.</li>';
    let extractedSymptoms = [];

    // 1순위: symptoms 배열 (GraphDB에서 가져온 증상 - 가장 정확함)
    if (disease.symptoms && Array.isArray(disease.symptoms) && disease.symptoms.length > 0) {
        extractedSymptoms = disease.symptoms;
    }

    // 2순위: symptomNames 배열
    if (extractedSymptoms.length === 0 && disease.symptomNames && Array.isArray(disease.symptomNames) && disease.symptomNames.length > 0) {
        extractedSymptoms = disease.symptomNames;
    }

    // 3순위: description에서 상세 증상 추출 (fallback)
    if (extractedSymptoms.length === 0 && description) {
        extractedSymptoms = extractSymptomsFromDescription(description);
    }

    // 증상 HTML 생성
    if (extractedSymptoms.length > 0) {
        symptomsHTML = extractedSymptoms.map(s => `<li>${s}</li>`).join('');
    }

    // 증상 추출 함수 (description에서)
    function extractSymptomsFromDescription(desc) {
        // "전형적인 증상은 고열, 권태감, 식욕부진, ..." 패턴 매칭
        const match = desc.match(/전형적인\s*증상은?\s*([^.。]+)/);
        if (match && match[1]) {
            // "고열, 권태감, 식욕부진, 메스꺼움, 복통, 암갈색 소변, 황달 등으로" 형식에서 증상 추출
            const symptomsText = match[1].replace(/\s*등(으로|입니다|이며).*$/, ''); // "등으로" 이후 제거
            return symptomsText
                .split(/[,،]\s*/)
                .map(s => s.trim())
                .filter(s => s.length > 0 && s.length < 30)
                .slice(0, 15); // 최대 15개
        }
        return [];
    }

    // 정의(짧은 설명)
    const definition = disease.definition || '정의 정보가 없습니다.';

    // 전파경로, 치료, 이상반응 정보 추출
    const transmissionRoutes = disease.transmissionRoutes || [];
    const treatments = disease.treatments || [];
    const adverseEvents = disease.adverseEvents || [];

    // 근처 병원 버튼 표시 여부 (1급, 2급만)
    const showHospitalBtn = gradeType === 'grade1' || gradeType === 'grade2';

    // 원문을 ? 기준으로 섹션 분리 (Q&A 형태로 파싱)
    const descriptionSections = description.split('?').filter(s => s.trim());

    // 요약 (첫 번째 질문+답변)
    const summaryDesc = descriptionSections.length > 0
        ? descriptionSections[0].trim() + '?'
        : '설명이 없습니다.';

    // 원문 전체 HTML (질문과 답변을 분리)
    // 패턴: "A형간염이란? A형간염은... A형간염의 전파경로는? A형간염은..."
    // 각 섹션에서 마지막 질문(~은?, ~는?)을 찾아서 분리
    const fullDescHTML = descriptionSections.length > 1
        ? descriptionSections.map((section, idx) => {
            const trimmed = section.trim();

            if (idx === descriptionSections.length - 1) {
                // 마지막 섹션은 답변만 (질문 없음)
                return `<div class="desc-section">
                    <p class="desc-answer">${trimmed}</p>
                </div>`;
            }

            // 다음 질문 찾기: 마지막에 나오는 "~이란", "~은", "~는" 등으로 시작하는 부분
            // 예: "...가능합니다. A형간염의 전파경로는" -> 질문: "A형간염의 전파경로는?"
            const questionMatch = trimmed.match(/([가-힣A-Za-z0-9\s]+(?:이란|의\s*[가-힣]+[은는]|[은는]))$/);

            if (questionMatch) {
                const answer = trimmed.slice(0, trimmed.length - questionMatch[1].length).trim();
                const question = questionMatch[1].trim() + '?';

                return `<div class="desc-section">
                    ${answer ? `<p class="desc-answer">${answer}</p>` : ''}
                    <h4 class="desc-question">${question}</h4>
                </div>`;
            } else {
                // 질문 패턴을 못 찾으면 전체를 답변으로
                return `<div class="desc-section">
                    <p class="desc-answer">${trimmed}?</p>
                </div>`;
            }
        }).join('')
        : `<p>${description}</p>`;

    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="modal-icon" style="color: ${iconColor}">${icon}</div>
            <div class="modal-title">
                <h2>${nameKo}</h2>
                ${nameEn ? `<p>${nameEn}</p>` : ''}
            </div>
        </div>

        <div class="detail-section">
            <h3>등급</h3>
            <div class="grade-badge ${gradeType}">${grade}</div>
        </div>

        <div class="detail-section">
            <h3>정의</h3>
            <p>${summaryDesc}</p>
            ${descriptionSections.length > 1 ? `
            <div class="full-description-toggle">
                <button class="toggle-btn" onclick="toggleFullDescription(this)">
                    <span class="toggle-icon">▶</span> 원문 전체 보기
                </button>
                <div class="full-description-content" style="display: none;">
                    ${fullDescHTML}
                </div>
            </div>
            ` : ''}
        </div>

        <div class="detail-section">
            <h3>증상</h3>
            <ul>
                ${symptomsHTML}
            </ul>
        </div>

        ${transmissionRoutes.length > 0 ? `
        <div class="detail-section">
            <h3>전파경로</h3>
            <ul>
                ${transmissionRoutes.map(r => `<li>${r}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${treatments.length > 0 ? `
        <div class="detail-section">
            <h3>치료</h3>
            <ul>
                ${treatments.map(t => `<li>${t}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${adverseEvents.length > 0 ? `
        <div class="detail-section">
            <h3>이상반응</h3>
            <ul>
                ${adverseEvents.map(e => `<li>${e}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${showHospitalBtn ? `
        <div class="detail-section">
            <button class="hospital-btn" onclick="window.location.href='hospitals.html'">
                🏥 근처 병원 알아보기
            </button>
        </div>
        ` : ''}
    `;

    modal.style.display = 'block';
}

// 원문 전체보기 토글
function toggleFullDescription(btn) {
    const content = btn.nextElementSibling;
    const icon = btn.querySelector('.toggle-icon');

    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
        btn.childNodes[1].textContent = ' 원문 접기';
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
        btn.childNodes[1].textContent = ' 원문 전체 보기';
    }
}

// 모달 닫기
function closeModal() {
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target == modal) {
        closeModal();
    }
}
