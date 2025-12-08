let diseaseChart, regionChart, genderChart;
let ttlData = null;

// 페이지 로드 시 차트 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // TTL 데이터 로드
    ttlData = await loadTTLData();
    
    // 차트 초기화
    initDiseaseChart();
    initRegionChart();
    initGenderChart();
});

// 뷰 전환
function switchView(viewType) {
    // 모든 뷰 숨기기
    document.querySelectorAll('.chart-view').forEach(view => {
        view.classList.remove('active');
    });
    
    // 모든 토글 버튼 비활성화
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 선택한 뷰 표시
    document.getElementById(viewType + 'View').classList.add('active');
    document.querySelector(`[data-view="${viewType}"]`).classList.add('active');
}

// 감염병별 차트 초기화
function initDiseaseChart() {
    const ctx = document.getElementById('diseaseChart');
    if (!ctx) return;
    
    // TTL 데이터에서 감염병별 데이터 추출
    const diseaseMap = ttlData?.disease || {};
    const labels = [];
    const data = [];
    
    // 데이터를 건수 순으로 정렬
    const sortedDiseases = Object.entries(diseaseMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // 상위 10개만 표시
    
    sortedDiseases.forEach(([name, count]) => {
        const koreanName = diseaseNameMap[name] || name;
        labels.push(koreanName);
        data.push(count);
    });
    
    diseaseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '감염병 발생 건수',
                data: data,
                backgroundColor: [
                    '#4285f4',
                    '#34a853',
                    '#ea4335',
                    '#fbbc04',
                    '#ff9800',
                    '#9c27b0',
                    '#e91e63',
                    '#607d8b'
                ],
                borderColor: [
                    '#4285f4',
                    '#34a853',
                    '#ea4335',
                    '#fbbc04',
                    '#ff9800',
                    '#9c27b0',
                    '#e91e63',
                    '#607d8b'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: '감염병별 발생 건수',
                    font: {
                        size: 18
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + '건';
                        }
                    }
                }
            }
        }
    });
}

// 지역별 차트 초기화
function initRegionChart() {
    const ctx = document.getElementById('regionChart');
    if (!ctx) return;
    
    // TTL 데이터에서 지역별 데이터 추출
    const regionMap = ttlData?.region || {};
    const labels = [];
    const data = [];
    
    Object.entries(regionMap).forEach(([name, count]) => {
        const koreanName = regionNameMap[name] || name;
        labels.push(koreanName);
        data.push(count);
    });
    
    regionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: '지역별 발생 건수',
                data: data,
                backgroundColor: [
                    '#4285f4',
                    '#34a853',
                    '#ea4335',
                    '#fbbc04',
                    '#ff9800',
                    '#9c27b0',
                    '#e91e63',
                    '#607d8b',
                    '#795548',
                    '#009688'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: '지역별 발생 건수 분포',
                    font: {
                        size: 18
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toLocaleString()}건 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 성별 차트 초기화
function initGenderChart() {
    const ctx = document.getElementById('genderChart');
    if (!ctx) return;
    
    // TTL 데이터에서 성별 데이터 추출
    const genderMap = ttlData?.gender || { male: 0, female: 0 };
    const labels = ['남성', '여성'];
    const data = [genderMap.male || 0, genderMap.female || 0];
    
    genderChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: '성별 발생 건수',
                data: data,
                backgroundColor: [
                    '#4285f4',
                    '#ea4335'
                ],
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 14
                        }
                    }
                },
                title: {
                    display: true,
                    text: '성별 발생 건수 분포',
                    font: {
                        size: 18
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toLocaleString()}건 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

