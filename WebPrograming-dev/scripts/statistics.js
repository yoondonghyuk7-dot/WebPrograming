// 통계 페이지: 지역/성별 데이터 시각화

const API_BASE =
    window.__API_BASE ||
    (location.port === '8001'
        ? `${location.protocol}//${location.host}`
        : 'http://localhost:8001');

let genderChart = null; // Chart.js 인스턴스 저장
let currentView = 'disease'; // 현재 활성 뷰

document.addEventListener('DOMContentLoaded', initStatisticsPage);

async function initStatisticsPage() {
    bindEvents();
    await loadDiseases();
}

function bindEvents() {
    // 뷰 토글 버튼
    window.switchView = function(viewType) {
        currentView = viewType;
        const views = document.querySelectorAll('.chart-view');
        views.forEach(v => v.classList.remove('active'));
        const target = document.getElementById(viewType + 'View');
        if (target) target.classList.add('active');

        const buttons = document.querySelectorAll('.toggle-btn');
        buttons.forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.toggle-btn[data-view="${viewType}"]`);
        if (btn) btn.classList.add('active');
    };

    // 감염병 선택 이벤트
    window.onDiseaseChange = async function() {
        const diseaseId = getValue('diseaseSelect');
        if (!diseaseId) {
            clearAllData();
            return;
        }

        await loadStatsByDisease(diseaseId);
    };
}

async function loadDiseases() {
    const select = document.getElementById('diseaseSelect');
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE}/api/diseases?limit=200`);
        if (!res.ok) throw new Error(`diseases API 실패: ${res.status}`);
        const data = await res.json();
        const diseases = Array.isArray(data.diseases) ? data.diseases : [];

        // 기존 옵션 유지하고 API 데이터 추가
        const existingOptions = Array.from(select.querySelectorAll('option[value!=""]'));
        const existingNames = new Set(existingOptions.map(o => o.textContent));

        diseases.forEach(d => {
            const name = d.name || d.diseaseId || '알 수 없음';
            if (!existingNames.has(name)) {
                const opt = document.createElement('option');
                opt.value = name; // 질병 이름을 값으로 사용
                opt.textContent = name;
                select.appendChild(opt);
            }
        });
    } catch (e) {
        console.error(e);
        console.warn('감염병 목록을 불러오지 못했습니다. 기본 목록을 사용합니다.');
    }
}

async function loadStatsByDisease(diseaseId) {
    try {
        // 지역별 통계 로드
        const regionRes = await fetch(`${API_BASE}/api/stats/by-region?diseaseId=${encodeURIComponent(diseaseId)}`);
        if (!regionRes.ok) throw new Error(`지역별 통계 API 실패: ${regionRes.status}`);
        const regionData = await regionRes.json();

        // 성별/연령별 통계 로드
        const genderRes = await fetch(`${API_BASE}/api/stats/by-gender-age?diseaseId=${encodeURIComponent(diseaseId)}`);
        if (!genderRes.ok) throw new Error(`성별/연령별 통계 API 실패: ${genderRes.status}`);
        const genderData = await genderRes.json();

        // 데이터 렌더링
        renderRegionTable(regionData.regions || []);
        renderGenderAgeTable(genderData.data || []);
        renderGenderChart(genderData.data || []);

        // 타이틀 업데이트
        updateViewTitles(diseaseId);
    } catch (e) {
        console.error(e);
        alert('통계 데이터를 불러오는 중 오류가 발생했습니다.');
        clearAllData();
    }
}

function renderRegionTable(regions) {
    const tbody = document.getElementById('diseaseTableBody');
    if (!tbody) return;

    if (!Array.isArray(regions) || regions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">데이터가 없습니다</td></tr>';
        return;
    }

    tbody.innerHTML = regions.map(row => {
        const region = row.region || '-';
        const caseCount = row.caseCount != null ? row.caseCount : '-';
        const incidenceRate = row.incidenceRate != null ? row.incidenceRate.toFixed(2) : '-';

        return `
            <tr>
                <td>${region}</td>
                <td>${caseCount}</td>
                <td>${incidenceRate}</td>
            </tr>
        `;
    }).join('');
}

function renderGenderAgeTable(data) {
    const tbody = document.getElementById('genderTableBody');
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">데이터가 없습니다</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(row => {
        const gender = row.gender || '-';
        const ageRange = row.ageRange || '-';
        const caseCount = row.caseCount != null ? row.caseCount : '-';

        return `
            <tr>
                <td>${gender}</td>
                <td>${ageRange}</td>
                <td>${caseCount}</td>
            </tr>
        `;
    }).join('');
}

function renderGenderChart(data) {
    const canvas = document.getElementById('genderChart');
    if (!canvas) return;

    // 기존 차트 제거
    if (genderChart) {
        genderChart.destroy();
        genderChart = null;
    }

    if (!Array.isArray(data) || data.length === 0) {
        return;
    }

    // 성별/연령대별로 데이터 그룹화
    const maleData = {};
    const femaleData = {};
    const ageRanges = new Set();

    data.forEach(row => {
        const gender = (row.gender || '').toLowerCase();
        const ageRange = row.ageRange || '';
        const caseCount = row.caseCount || 0;

        ageRanges.add(ageRange);

        // female을 먼저 체크해야 함 ('female'.includes('male') === true 이므로)
        if (gender === 'female' || gender === '여성') {
            femaleData[ageRange] = caseCount;
        } else if (gender === 'male' || gender === '남성') {
            maleData[ageRange] = caseCount;
        }
    });

    const sortedAgeRanges = Array.from(ageRanges).sort();

    const chartData = {
        labels: sortedAgeRanges,
        datasets: [
            {
                label: '남성',
                data: sortedAgeRanges.map(age => maleData[age] || 0),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            },
            {
                label: '여성',
                data: sortedAgeRanges.map(age => femaleData[age] || 0),
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }
        ]
    };

    const ctx = canvas.getContext('2d');
    genderChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '발생 건수'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '연령대'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: '성별/연령별 발생 건수'
                }
            }
        }
    });
}

function updateViewTitles(diseaseId) {
    const diseaseViewTitle = document.getElementById('diseaseViewTitle');
    const genderViewTitle = document.getElementById('genderViewTitle');

    if (diseaseViewTitle) {
        diseaseViewTitle.textContent = `${diseaseId} - 지역별 통계`;
    }
    if (genderViewTitle) {
        genderViewTitle.textContent = `${diseaseId} - 성별/연령별 통계`;
    }
}

function clearAllData() {
    const diseaseTableBody = document.getElementById('diseaseTableBody');
    const genderTableBody = document.getElementById('genderTableBody');

    if (diseaseTableBody) diseaseTableBody.innerHTML = '';
    if (genderTableBody) genderTableBody.innerHTML = '';

    if (genderChart) {
        genderChart.destroy();
        genderChart = null;
    }

    const diseaseViewTitle = document.getElementById('diseaseViewTitle');
    const genderViewTitle = document.getElementById('genderViewTitle');

    if (diseaseViewTitle) diseaseViewTitle.textContent = '감염병별 통계';
    if (genderViewTitle) genderViewTitle.textContent = '성별/연령별 통계';
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}
