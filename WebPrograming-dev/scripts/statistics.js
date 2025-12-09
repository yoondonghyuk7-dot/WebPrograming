let ttlData = null;
let selectedDisease = null;
let allDiseases = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // TTL 데이터 로드
    ttlData = await loadTTLData();
    
    // 감염병 목록 초기화
    initDiseaseSelector();
    
    // 초기 뷰 표시
    switchView('disease');
});

// 감염병 선택 드롭다운 초기화
function initDiseaseSelector() {
    const select = document.getElementById('diseaseSelect');
    
    // TTL 데이터에서 감염병 목록 추출
    if (ttlData && ttlData.regionData) {
        // 지역 데이터에서 고유한 질병명 추출
        const diseaseSet = new Set();
        ttlData.regionData.forEach(item => {
            if (item.disease) {
                diseaseSet.add(item.disease);
            }
        });
        allDiseases = Array.from(diseaseSet);
    }
    
    // 샘플 데이터 (TTL 데이터가 없을 경우)
    if (allDiseases.length === 0) {
        allDiseases = ['수두', '장티푸스', '인플루엔자', '결핵', 'A형간염', 'B형간염', 'C형간염', '콜레라', '유행성 뇌수막염', '일본뇌염'];
    }
    
    // 드롭다운에 옵션 추가
    allDiseases.forEach(diseaseName => {
        const option = document.createElement('option');
        option.value = diseaseName;
        option.textContent = getKoreanDiseaseName(diseaseName);
        select.appendChild(option);
    });
}

// 감염병 변경 시
function onDiseaseChange() {
    const select = document.getElementById('diseaseSelect');
    selectedDisease = select.value;
    
    if (selectedDisease) {
        updateDiseaseView();
        updateGenderView();
    } else {
        clearTables();
    }
}

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
    
    // 선택된 감염병이 있으면 해당 뷰 업데이트
    if (selectedDisease) {
        if (viewType === 'disease') {
            updateDiseaseView();
        } else if (viewType === 'gender') {
            updateGenderView();
        }
    }
}

// 감염병별 뷰 업데이트 (지역별 통계)
function updateDiseaseView() {
    if (!selectedDisease) return;
    
    const title = document.getElementById('diseaseViewTitle');
    const tbody = document.getElementById('diseaseTableBody');
    
    // 제목 변경
    const koreanName = getKoreanDiseaseName(selectedDisease);
    title.textContent = `${koreanName} 통계`;
    
    // 테이블 초기화
    tbody.innerHTML = '';
    
    // 지역별 데이터 (9개 지역)
    const regions = [
        { name: '서울', code: 'Seoul' },
        { name: '부산', code: 'Busan' },
        { name: '대구', code: 'Daegu' },
        { name: '인천', code: 'Incheon' },
        { name: '광주', code: 'Gwangju' },
        { name: '대전', code: 'Daejeon' },
        { name: '울산', code: 'Ulsan' },
        { name: '경기', code: 'Gyeonggi' },
        { name: '전북', code: 'North Jeolla' }
    ];
    
    regions.forEach(region => {
        const row = document.createElement('tr');
        
        // 실제 데이터가 있으면 사용, 없으면 샘플 데이터
        let caseCount = 0;
        let incidenceRate = 0;
        
        if (ttlData && ttlData.regionData) {
            // TTL 데이터에서 해당 질병과 지역의 데이터 찾기
            const data = ttlData.regionData.find(d => {
                const diseaseMatch = d.disease && (
                    d.disease.toLowerCase().includes(selectedDisease.toLowerCase()) ||
                    selectedDisease.toLowerCase().includes(d.disease.toLowerCase())
                );
                const regionMatch = d.region && (
                    d.region.toLowerCase().includes(region.code.toLowerCase()) ||
                    d.region.toLowerCase().includes(region.name.toLowerCase())
                );
                return diseaseMatch && regionMatch;
            });
            
            if (data) {
                caseCount = data.caseCount || 0;
                incidenceRate = data.incidenceRate || 0;
            } else {
                // 샘플 데이터
                caseCount = Math.floor(Math.random() * 1000) + 100;
                incidenceRate = parseFloat((Math.random() * 20 + 5).toFixed(2));
            }
        } else {
            // 샘플 데이터
            caseCount = Math.floor(Math.random() * 1000) + 100;
            incidenceRate = parseFloat((Math.random() * 20 + 5).toFixed(2));
        }
        
        row.innerHTML = `
            <td>${region.name}</td>
            <td>${caseCount.toLocaleString()}건</td>
            <td>${incidenceRate}%</td>
        `;
        tbody.appendChild(row);
    });
}

// 성별 뷰 업데이트
function updateGenderView() {
    if (!selectedDisease) return;
    
    const title = document.getElementById('genderViewTitle');
    const tbody = document.getElementById('genderTableBody');
    
    // 제목 변경
    const koreanName = getKoreanDiseaseName(selectedDisease);
    title.textContent = `${koreanName} 성별 통계`;
    
    // 테이블 초기화
    tbody.innerHTML = '';
    
    // 성별 데이터
    const genders = [
        { name: '남성', key: 'male' },
        { name: '여성', key: 'female' }
    ];
    
    genders.forEach(gender => {
        const row = document.createElement('tr');
        
        // 실제 데이터가 있으면 사용, 없으면 샘플 데이터
        let population = 0;
        let caseCount = 0;
        let incidenceRate = 0;
        
        if (ttlData && ttlData.genderData) {
            const data = ttlData.genderData.find(d => {
                const diseaseMatch = d.disease && (
                    d.disease.toLowerCase().includes(selectedDisease.toLowerCase()) ||
                    selectedDisease.toLowerCase().includes(d.disease.toLowerCase())
                );
                const genderMatch = d.gender === gender.key;
                return diseaseMatch && genderMatch;
            });
            
            if (data) {
                population = data.population || 0;
                caseCount = data.caseCount || 0;
                incidenceRate = data.incidenceRate || 0;
            } else {
                // 샘플 데이터
                population = Math.floor(Math.random() * 5000000) + 2000000;
                caseCount = Math.floor(Math.random() * 500) + 100;
                incidenceRate = parseFloat(((caseCount / population) * 100).toFixed(4));
            }
        } else {
            // 샘플 데이터
            population = Math.floor(Math.random() * 5000000) + 2000000;
            caseCount = Math.floor(Math.random() * 500) + 100;
            incidenceRate = parseFloat(((caseCount / population) * 100).toFixed(4));
        }
        
        row.innerHTML = `
            <td>${gender.name}</td>
            <td>${population.toLocaleString()}명</td>
            <td>${caseCount.toLocaleString()}건</td>
            <td>${incidenceRate}%</td>
        `;
        tbody.appendChild(row);
    });
}

// 테이블 초기화
function clearTables() {
    document.getElementById('diseaseTableBody').innerHTML = '';
    document.getElementById('genderTableBody').innerHTML = '';
    document.getElementById('diseaseViewTitle').textContent = '감염병별 통계';
    document.getElementById('genderViewTitle').textContent = '성별 통계';
}

// 한글 질병명 변환
function getKoreanDiseaseName(englishName) {
    const nameMap = {
        'Chickenpox': '수두',
        'Typhoid Fever': '장티푸스',
        'Influenza': '인플루엔자',
        'Tuberculosis': '결핵',
        'Hepatitis A': 'A형간염',
        'Hepatitis B': 'B형간염',
        'Hepatitis C': 'C형간염',
        'Cholera': '콜레라',
        'Meningococcal Disease': '유행성 뇌수막염',
        'Japanese Encephalitis': '일본뇌염'
    };
    
    // 이미 한글이면 그대로 반환
    if (nameMap[englishName]) {
        return nameMap[englishName];
    }
    
    // 부분 매칭 시도
    for (const [key, value] of Object.entries(nameMap)) {
        if (englishName.toLowerCase().includes(key.toLowerCase()) || 
            key.toLowerCase().includes(englishName.toLowerCase())) {
            return value;
        }
    }
    
    return englishName;
}

// TTL 파일 로드 및 파싱
async function loadTTLData() {
    try {
        // disease-incidence-by-region.ttl 로드
        let regionResponse;
        try {
            regionResponse = await fetch('../disease-incidence-by-region.ttl');
        } catch (e) {
            try {
                regionResponse = await fetch('disease-incidence-by-region.ttl');
            } catch (e2) {
                console.warn('disease-incidence-by-region.ttl 파일을 찾을 수 없습니다. 샘플 데이터를 사용합니다.');
                return {
                    regionData: [],
                    genderData: []
                };
            }
        }
        
        const regionContent = await regionResponse.text();
        const parser = new TTLParser();
        parser.parse(regionContent);
        
        // 지역별 데이터 추출
        const regionData = [];
        parser.data.forEach(item => {
            if (item['schema:name'] && item['schema:location']) {
                const diseaseName = extractLabel(item['schema:name']);
                const regionName = extractLabel(item['schema:location']);
                
                regionData.push({
                    disease: diseaseName,
                    region: regionName,
                    caseCount: item['koid:caseCount'] || 0,
                    incidenceRate: item['koid:incidenceRate'] || 0
                });
            }
        });
        
        // 성별 데이터 추출 (샘플 또는 실제 데이터)
        const genderData = [];
        // TODO: 성별 데이터 TTL 파일이 있으면 여기서 로드
        
        return {
            regionData: regionData,
            genderData: genderData
        };
    } catch (error) {
        console.error('TTL 데이터 로드 실패:', error);
        return {
            regionData: [],
            genderData: []
        };
    }
}

// 라벨 추출 헬퍼 함수
function extractLabel(label) {
    if (!label) return '';
    
    if (typeof label === 'string') {
        // 여러 언어 라벨이 섞여있는 경우: "A형간염"@ko,"Hepatitis A"@en
        const koMatch = label.match(/"([^"]+)"@ko/);
        if (koMatch) {
            return koMatch[1];
        }
        // 단일 따옴표 형식: "A형간염"@ko
        if (label.includes('@ko')) {
            const match = label.match(/"([^"]+)"@ko/);
            if (match) return match[1];
        }
        // 따옴표 제거
        return label.replace(/^"|"$/g, '').replace(/@\w+$/, '');
    }
    
    return label;
}
