// 통계 페이지: TTL 파싱 대신 백엔드 /api/stats/incidence 연동

const API_BASE =
    window.__API_BASE ||
    (location.port === '8001'
        ? `${location.protocol}//${location.host}`
        : 'http://localhost:8001');

document.addEventListener('DOMContentLoaded', async function() {
    await initDiseaseOptions();
    bindEvents();
    await loadAndRenderStats();
});

async function initDiseaseOptions() {
    const select = document.getElementById('diseaseSelect');
    if (!select) return;
    // 시도: /api/diseases 에서 옵션 채우기
    try {
        const res = await fetch(`${API_BASE}/api/diseases?limit=50`);
        if (!res.ok) throw new Error(`diseases API 실패 ${res.status}`);
        const data = await res.json();
        const diseases = Array.isArray(data.diseases) ? data.diseases : [];
        select.innerHTML = '';
        diseases.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.diseaseId || d.id || d.name;
            opt.textContent = d.name || d.diseaseId;
            select.appendChild(opt);
        });
    } catch (e) {
        console.warn('diseases API 실패, 기본 목록 사용:', e);
        const fallback = ['Influenza', 'Tuberculosis', 'Hepatitis A', 'Hepatitis B', 'Chickenpox'];
        select.innerHTML = '';
        fallback.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
    }
}

function bindEvents() {
    const diseaseSelect = document.getElementById('diseaseSelect');
    const regionSelect = document.getElementById('regionSelect');
    const genderSelect = document.getElementById('genderFilter');
    const ageSelect = document.getElementById('ageGroupFilter');

    if (diseaseSelect) diseaseSelect.addEventListener('change', loadAndRenderStats);
    if (regionSelect) regionSelect.addEventListener('change', loadAndRenderStats);
    if (genderSelect) genderSelect.addEventListener('change', loadAndRenderStats);
    if (ageSelect) ageSelect.addEventListener('change', loadAndRenderStats);
}

async function loadAndRenderStats() {
    const diseaseId = getSelectValue('diseaseSelect');
    const region = getSelectValue('regionSelect');
    const gender = getSelectValue('genderFilter');
    const ageGroup = getSelectValue('ageGroupFilter');

    if (!diseaseId || !region) {
        showError('감염병과 지역을 선택하세요.');
        return;
    }

    try {
        showLoading(true);
        const stats = await fetchIncidenceStats({ diseaseId, region, gender, ageGroup });
        renderYearSeries(stats);
        renderGenderAge(stats);
        showContent();
    } catch (e) {
        console.error(e);
        showError('통계를 불러오는 중 오류가 발생했습니다.');
    } finally {
        showLoading(false);
    }
}

function getSelectValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

async function fetchIncidenceStats({ diseaseId, region, year, gender, ageGroup }) {
    const params = new URLSearchParams({ diseaseId, region });
    if (year) params.set('year', String(year));
    if (gender) params.set('gender', gender);
    if (ageGroup) params.set('ageGroup', ageGroup);

    const res = await fetch(`${API_BASE}/api/stats/incidence?${params.toString()}`);
    if (!res.ok) throw new Error(`통계 API 호출 실패: ${res.status}`);
    return await res.json();
}

function renderYearSeries(stats) {
    const titleEl = document.getElementById('diseaseViewTitle');
    const tbody = document.getElementById('diseaseTableBody');
    if (titleEl) titleEl.textContent = `${stats.region || ''} 연도별 발생 통계`;
    if (tbody) {
        tbody.innerHTML = '';
        const series = Array.isArray(stats.byRegion) ? stats.byRegion : [];
        if (series.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3">데이터가 없습니다.</td></tr>`;
            return;
        }
        series.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.year ?? ''}</td>
                <td>${row.caseCount != null ? row.caseCount.toLocaleString() : '-'}</td>
                <td>${row.incidenceRate != null ? row.incidenceRate : '-'}%</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function renderGenderAge(stats) {
    const titleEl = document.getElementById('genderViewTitle');
    const tbody = document.getElementById('genderTableBody');
    if (titleEl) titleEl.textContent = `${stats.region || ''} 성별·연령대 분포`;
    if (tbody) {
        tbody.innerHTML = '';
        const breakdown = Array.isArray(stats.byGenderAge) ? stats.byGenderAge : [];
        if (breakdown.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">데이터가 없습니다.</td></tr>`;
            return;
        }
        breakdown.forEach(row => {
            const genderLabel = row.gender || '-';
            const ageLabel = row.ageGroup || '-';
            const caseCount = row.caseCount != null ? row.caseCount.toLocaleString() : '-';
            const rate = row.incidenceRate != null ? row.incidenceRate : '-';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${genderLabel}</td>
                <td>${ageLabel}</td>
                <td>${caseCount}</td>
                <td>${rate}%</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function showLoading(show) {
    const el = document.getElementById('statsLoading');
    if (el) el.style.display = show ? 'block' : 'none';
}

function showError(msg) {
    const err = document.getElementById('statsError');
    if (err) {
        err.style.display = 'block';
        err.textContent = msg || '오류가 발생했습니다.';
    }
    showLoading(false);
    hideContent();
}

function showContent() {
    const err = document.getElementById('statsError');
    const noData = document.getElementById('noStats');
    if (err) err.style.display = 'none';
    if (noData) noData.style.display = 'none';
}

function hideContent() {
    // 사용 중인 UI에 따라 추가 조정 가능
}
