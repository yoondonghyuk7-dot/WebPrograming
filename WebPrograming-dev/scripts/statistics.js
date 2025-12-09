// 통계 페이지: 텍스트 렌더링(그래프 없음) + 버튼/셀렉트 이벤트 정상화

const API_BASE =
    window.__API_BASE ||
    (location.port === '8001'
        ? `${location.protocol}//${location.host}`
        : 'http://localhost:8001');
const DEFAULT_REGION = 'Seoul';

document.addEventListener('DOMContentLoaded', initStatisticsPage);

async function initStatisticsPage() {
    bindEvents();
    await loadDiseases();
    await loadStats(); // 기본 선택 상태로 최초 조회
}

function bindEvents() {
    const diseaseSelect = document.getElementById('diseaseSelect');
    const regionInput = document.getElementById('regionInput');
    const loadButton = document.getElementById('loadButton');

    if (diseaseSelect) diseaseSelect.addEventListener('change', loadStats);
    if (regionInput) regionInput.addEventListener('change', loadStats);
    if (loadButton) loadButton.addEventListener('click', loadStats);

    // 뷰 토글 버튼(switchView 호출) 지원
    window.switchView = function(viewType) {
        const views = document.querySelectorAll('.chart-view');
        views.forEach(v => v.classList.remove('active'));
        const target = document.getElementById(viewType + 'View');
        if (target) target.classList.add('active');

        const buttons = document.querySelectorAll('.toggle-btn');
        buttons.forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.toggle-btn[data-view="${viewType}"]`);
        if (btn) btn.classList.add('active');
    };
}

async function loadDiseases() {
    const select = document.getElementById('diseaseSelect');
    if (!select) return;

    try {
        toggleLoading(true);
        const res = await fetch(`${API_BASE}/api/diseases?limit=200`);
        if (!res.ok) throw new Error(`diseases API 실패: ${res.status}`);
        const data = await res.json();
        const diseases = Array.isArray(data.diseases) ? data.diseases : [];
        select.innerHTML = '';
        diseases.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.diseaseId || d.id || d.name;
            opt.textContent = d.name || d.diseaseId || '알 수 없음';
            select.appendChild(opt);
        });
        showMessage('');
    } catch (e) {
        console.error(e);
        showMessage('감염병 목록을 불러오지 못했습니다.');
    } finally {
        toggleLoading(false);
    }
}

async function loadStats() {
    const diseaseId = getValue('diseaseSelect');
    const region = getValue('regionInput') || DEFAULT_REGION;
    const gender = getValue('genderFilter'); // 성별 셀렉트가 없을 수도 있음
    const ageGroup = getValue('ageGroupFilter');

    if (!diseaseId) {
        showMessage('감염병을 선택하세요.');
        clearLists();
        return;
    }

    try {
        toggleLoading(true);
        const stats = await fetchIncidence({ diseaseId, region, gender, ageGroup });
        renderRegion(stats.byRegion || []);
        renderGenderAge(stats.byGenderAge || []);
        showMessage('');
        console.log('Incidence stats:', stats);
    } catch (e) {
        console.error(e);
        showMessage('통계를 불러오는 중 오류가 발생했습니다.');
        clearLists();
    } finally {
        toggleLoading(false);
    }
}

async function fetchIncidence({ diseaseId, region, year, gender, ageGroup }) {
    const params = new URLSearchParams({ diseaseId, region });
    if (year) params.set('year', String(year));
    if (gender) params.set('gender', gender);
    if (ageGroup) params.set('ageGroup', ageGroup);

    const res = await fetch(`${API_BASE}/api/stats/incidence?${params.toString()}`);
    if (!res.ok) throw new Error(`통계 API 실패: ${res.status}`);
    return await res.json();
}

function renderRegion(byRegion) {
    const list = document.getElementById('statsRegionList');
    if (!list) return;
    if (!Array.isArray(byRegion) || byRegion.length === 0) {
        list.innerHTML = `<li>데이터 없음</li>`;
        return;
    }
    list.innerHTML = byRegion
        .map(
            row =>
                `${row.year ?? '-'}년 → 발생률 ${row.incidenceRate ?? '-'}%, 발생수 ${
                    row.caseCount != null ? row.caseCount : '-'
                }명`
        )
        .map(text => `<li>${text}</li>`)
        .join('');
}

function renderGenderAge(byGenderAge) {
    const list = document.getElementById('statsGenderAgeList');
    if (!list) return;
    if (!Array.isArray(byGenderAge) || byGenderAge.length === 0) {
        list.innerHTML = `<li>데이터 없음</li>`;
        return;
    }
    list.innerHTML = byGenderAge
        .map(row => {
            const genderLabel = row.gender || '-';
            const ageLabel = row.ageGroup || '-';
            const rate = row.incidenceRate ?? '-';
            const count = row.caseCount != null ? row.caseCount : '-';
            return `${genderLabel} / ${ageLabel} → 발생률 ${rate}%, ${count}명`;
        })
        .map(text => `<li>${text}</li>`)
        .join('');
}

function clearLists() {
    const regionList = document.getElementById('statsRegionList');
    const genderAgeList = document.getElementById('statsGenderAgeList');
    if (regionList) regionList.innerHTML = '';
    if (genderAgeList) genderAgeList.innerHTML = '';
}

function toggleLoading(show) {
    const loading = document.getElementById('loadingIndicator');
    if (loading) loading.style.display = show ? 'block' : 'none';
}

function showMessage(msg) {
    const el = document.getElementById('statsMessage');
    if (el) el.textContent = msg || '';
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}
