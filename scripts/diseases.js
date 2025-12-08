// 감염병 데이터
const diseases = [
    {
        id: 1,
        nameKo: '코로나19',
        nameEn: 'COVID-19',
        icon: '🦠',
        iconColor: '#ff4444',
        grade: '1급',
        gradeType: 'grade1',
        description: '코로나바이러스감염증-19는 SARS-CoV-2 바이러스에 의해 발생하는 호흡기 감염병입니다.',
        symptoms: ['발열', '기침', '호흡곤란', '폐렴'],
        transmission: '주로 비말(침방울)을 통한 호흡기 전파',
        pathogen: 'SARS-CoV-2 바이러스',
        complications: '급성 호흡곤란 증후군, 다장기 부전',
        vaccination: '백신 접종 가능 (mRNA 백신, 바이러스 벡터 백신 등)',
        sideEffects: '주사 부위 통증, 발열, 두통, 근육통',
        isolation: true
    },
    {
        id: 2,
        nameKo: '특정감염병',
        nameEn: 'Special Infectious Disease',
        icon: '🦠',
        iconColor: '#ff9800',
        grade: '2급',
        gradeType: 'grade2',
        description: '특정감염병은 법정감염병 중 특별한 관리가 필요한 감염병입니다.',
        symptoms: ['발열', '두통', '전신쇠약'],
        transmission: '병원체에 따라 다양',
        pathogen: '다양한 병원체',
        complications: '병원체에 따라 상이',
        vaccination: '병원체에 따라 상이',
        sideEffects: '병원체에 따라 상이',
        isolation: false
    },
    {
        id: 3,
        nameKo: '장티푸스',
        nameEn: 'Typhoid Fever',
        icon: '🦠',
        iconColor: '#ff9800',
        grade: '2급',
        gradeType: 'grade2',
        description: '장티푸스는 살모넬라균에 의해 발생하는 전신성 감염병입니다.',
        symptoms: ['고열', '두통', '복통', '설사'],
        transmission: '오염된 음식물이나 물을 통한 경구 감염',
        pathogen: 'Salmonella Typhi',
        complications: '장천공, 장출혈',
        vaccination: '장티푸스 백신 접종 가능',
        sideEffects: '주사 부위 통증, 발열',
        isolation: true
    },
    {
        id: 4,
        nameKo: '콜레라',
        nameEn: 'Cholera',
        icon: '🦠',
        iconColor: '#ff4444',
        grade: '1급',
        gradeType: 'grade1',
        description: '콜레라는 비브리오 콜레라균에 의해 발생하는 급성 장관 감염병입니다.',
        symptoms: ['심한 설사', '구토', '탈수'],
        transmission: '오염된 물이나 음식물을 통한 경구 감염',
        pathogen: 'Vibrio cholerae',
        complications: '심한 탈수, 쇼크, 사망',
        vaccination: '콜레라 백신 접종 가능',
        sideEffects: '경미한 위장 장애',
        isolation: true
    },
    {
        id: 5,
        nameKo: 'A형 간염',
        nameEn: 'Hepatitis A',
        icon: '🦠',
        iconColor: '#ffc107',
        grade: '3급',
        gradeType: 'grade3',
        description: 'A형 간염은 A형 간염 바이러스에 의해 발생하는 급성 간염입니다.',
        symptoms: ['황달', '피로', '식욕부진', '발열'],
        transmission: '오염된 음식물이나 물을 통한 경구 감염',
        pathogen: 'Hepatitis A Virus (HAV)',
        complications: '급성 간부전',
        vaccination: 'A형 간염 백신 접종 가능',
        sideEffects: '주사 부위 통증, 발열',
        isolation: false
    },
    {
        id: 6,
        nameKo: 'B형 간염',
        nameEn: 'Hepatitis B',
        icon: '🦠',
        iconColor: '#ff9800',
        grade: '2급',
        gradeType: 'grade2',
        description: 'B형 간염은 B형 간염 바이러스에 의해 발생하는 간염입니다.',
        symptoms: ['황달', '피로', '복통'],
        transmission: '혈액, 성접촉, 수직 감염',
        pathogen: 'Hepatitis B Virus (HBV)',
        complications: '만성 간염, 간경변, 간암',
        vaccination: 'B형 간염 백신 접종 가능',
        sideEffects: '주사 부위 통증',
        isolation: false
    },
    {
        id: 7,
        nameKo: '수두',
        nameEn: 'Chickenpox',
        icon: '🦠',
        iconColor: '#ffc107',
        grade: '3급',
        gradeType: 'grade3',
        description: '수두는 수두-대상포진 바이러스에 의해 발생하는 급성 발진성 질환입니다.',
        symptoms: ['발진', '발열', '가려움'],
        transmission: '비말, 공기 전파',
        pathogen: 'Varicella-Zoster Virus (VZV)',
        complications: '세균성 피부 감염, 폐렴, 뇌염',
        vaccination: '수두 백신 접종 가능',
        sideEffects: '주사 부위 통증, 발진',
        isolation: true
    },
    {
        id: 8,
        nameKo: '유행성 뇌수막염',
        nameEn: 'Meningococcal Disease',
        icon: '🦠',
        iconColor: '#ff4444',
        grade: '1급',
        gradeType: 'grade1',
        description: '유행성 뇌수막염은 뇌수막구균에 의해 발생하는 중증 감염병입니다.',
        symptoms: ['고열', '두통', '경부강직', '의식저하'],
        transmission: '비말 전파',
        pathogen: 'Neisseria meningitidis',
        complications: '뇌수막염, 패혈증, 사망',
        vaccination: '뇌수막구균 백신 접종 가능',
        sideEffects: '주사 부위 통증, 발열',
        isolation: true
    },
    {
        id: 9,
        nameKo: '유행성 출혈열',
        nameEn: 'Hemorrhagic Fever with Renal Syndrome',
        icon: '🦠',
        iconColor: '#ff4444',
        grade: '1급',
        gradeType: 'grade1',
        description: '유행성 출혈열은 한타바이러스에 의해 발생하는 급성 발열성 질환입니다.',
        symptoms: ['발열', '출혈', '신부전'],
        transmission: '쥐의 배설물을 통한 감염',
        pathogen: 'Hantavirus',
        complications: '급성 신부전, 사망',
        vaccination: '백신 없음',
        sideEffects: '-',
        isolation: true
    },
    {
        id: 10,
        nameKo: '일본뇌염',
        nameEn: 'Japanese Encephalitis',
        icon: '🦠',
        iconColor: '#ff4444',
        grade: '1급',
        gradeType: 'grade1',
        description: '일본뇌염은 일본뇌염 바이러스에 의해 발생하는 중추신경계 감염병입니다.',
        symptoms: ['고열', '두통', '의식저하', '경련'],
        transmission: '모기에 의한 전파',
        pathogen: 'Japanese Encephalitis Virus',
        complications: '뇌염, 사망, 신경계 후유증',
        vaccination: '일본뇌염 백신 접종 가능',
        sideEffects: '주사 부위 통증, 발열',
        isolation: false
    },
    {
        id: 11,
        nameKo: '폐렴구균 감염증',
        nameEn: 'Pneumococcal Disease',
        icon: '🦠',
        iconColor: '#ff9800',
        grade: '2급',
        gradeType: 'grade2',
        description: '폐렴구균 감염증은 폐렴구균에 의해 발생하는 감염병입니다.',
        symptoms: ['발열', '기침', '호흡곤란'],
        transmission: '비말 전파',
        pathogen: 'Streptococcus pneumoniae',
        complications: '폐렴, 수막염, 패혈증',
        vaccination: '폐렴구균 백신 접종 가능',
        sideEffects: '주사 부위 통증, 발열',
        isolation: false
    },
    {
        id: 12,
        nameKo: '에볼라바이러스',
        nameEn: 'Ebolavirus',
        icon: '🦠',
        iconColor: '#ff4444',
        grade: '1급',
        gradeType: 'grade1',
        description: '에볼라바이러스는 에볼라바이러스에 의해 발생하는 중증 출혈열입니다.',
        symptoms: ['고열', '출혈', '설사', '구토'],
        transmission: '감염자의 체액 접촉',
        pathogen: 'Ebolavirus',
        complications: '다장기 부전, 사망',
        vaccination: '에볼라 백신 접종 가능',
        sideEffects: '주사 부위 통증, 발열',
        isolation: true
    },
    {
        id: 13,
        nameKo: 'C형 간염',
        nameEn: 'Hepatitis C',
        icon: '🦠',
        iconColor: '#ff9800',
        grade: '2급',
        gradeType: 'grade2',
        description: 'C형 간염은 C형 간염 바이러스에 의해 발생하는 간염입니다.',
        symptoms: ['황달', '피로', '복통'],
        transmission: '혈액, 성접촉',
        pathogen: 'Hepatitis C Virus (HCV)',
        complications: '만성 간염, 간경변, 간암',
        vaccination: '백신 없음',
        sideEffects: '-',
        isolation: false
    },
    {
        id: 14,
        nameKo: '말라리아',
        nameEn: 'Malaria',
        icon: '🦠',
        iconColor: '#ff4444',
        grade: '1급',
        gradeType: 'grade1',
        description: '말라리아는 말라리아 원충에 의해 발생하는 열대성 질환입니다.',
        symptoms: ['주기적 발열', '오한', '두통'],
        transmission: '모기에 의한 전파',
        pathogen: 'Plasmodium species',
        complications: '뇌말라리아, 사망',
        vaccination: '말라리아 예방약 복용',
        sideEffects: '예방약 부작용',
        isolation: false
    },
    {
        id: 15,
        nameKo: '발진티푸스',
        nameEn: 'Typhus',
        icon: '🦠',
        iconColor: '#ff9800',
        grade: '2급',
        gradeType: 'grade2',
        description: '발진티푸스는 리케차에 의해 발생하는 발열성 질환입니다.',
        symptoms: ['발열', '발진', '두통'],
        transmission: '벼룩이나 진드기에 의한 전파',
        pathogen: 'Rickettsia',
        complications: '뇌염, 사망',
        vaccination: '백신 없음',
        sideEffects: '-',
        isolation: false
    },
    {
        id: 16,
        nameKo: '풀무티푸스',
        nameEn: 'Endemic Typhus',
        icon: '🦠',
        iconColor: '#ff9800',
        grade: '3급',
        gradeType: 'grade3',
        description: '풀무티푸스는 리케차에 의해 발생하는 발열성 질환입니다.',
        symptoms: ['발열', '발진'],
        transmission: '벼룩에 의한 전파',
        pathogen: 'Rickettsia typhi',
        complications: '드물게 중증 합병증',
        vaccination: '백신 없음',
        sideEffects: '-',
        isolation: false
    },
    {
        id: 17,
        nameKo: '쯔쯔가무시병',
        nameEn: 'Scrub Typhus',
        icon: '🦠',
        iconColor: '#ff9800',
        grade: '2급',
        gradeType: 'grade2',
        description: '쯔쯔가무시병은 오리엔티아 쯔쯔가무시에 의해 발생하는 발열성 질환입니다.',
        symptoms: ['발열', '발진', '가피'],
        transmission: '진드기에 의한 전파',
        pathogen: 'Orientia tsutsugamushi',
        complications: '폐렴, 뇌염',
        vaccination: '백신 없음',
        sideEffects: '-',
        isolation: false
    },
    {
        id: 18,
        nameKo: '진드기매개 뇌염',
        nameEn: 'Tick-borne Encephalitis',
        icon: '🦠',
        iconColor: '#ff4444',
        grade: '1급',
        gradeType: 'grade1',
        description: '진드기매개 뇌염은 진드기매개 뇌염 바이러스에 의해 발생하는 중추신경계 감염병입니다.',
        symptoms: ['발열', '두통', '의식저하'],
        transmission: '진드기에 의한 전파',
        pathogen: 'Tick-borne Encephalitis Virus',
        complications: '뇌염, 사망',
        vaccination: '진드기매개 뇌염 백신 접종 가능',
        sideEffects: '주사 부위 통증',
        isolation: false
    },
    {
        id: 19,
        nameKo: '매독',
        nameEn: 'Syphilis',
        icon: '🦠',
        iconColor: '#ff9800',
        grade: '2급',
        gradeType: 'grade2',
        description: '매독은 매독균에 의해 발생하는 성매개 감염병입니다.',
        symptoms: ['초기: 궤양', '2기: 발진', '3기: 신경계 증상'],
        transmission: '성접촉, 수직 감염',
        pathogen: 'Treponema pallidum',
        complications: '신경매독, 심혈관 매독',
        vaccination: '백신 없음',
        sideEffects: '-',
        isolation: false
    }
];

let showingAll = false;
const INITIAL_DISPLAY_COUNT = 8;

// 페이지 로드 시 초기 카드 표시
document.addEventListener('DOMContentLoaded', function() {
    renderDiseases(diseases.slice(0, INITIAL_DISPLAY_COUNT));
});

// 감염병 카드 렌더링
function renderDiseases(diseaseList) {
    const container = document.getElementById('diseasesContainer');
    container.innerHTML = '';
    
    diseaseList.forEach(disease => {
        const card = createDiseaseCard(disease);
        container.appendChild(card);
    });
}

// 감염병 카드 생성
function createDiseaseCard(disease) {
    const card = document.createElement('div');
    card.className = `disease-card ${disease.gradeType}`;
    card.onclick = () => showDetail(disease);
    
    // 등급별 아이콘 선택
    let displayIcon = disease.icon;
    if (disease.gradeType === 'grade1') {
        displayIcon = '⚠️';
    } else if (disease.gradeType === 'grade2') {
        displayIcon = '🦠';
    } else if (disease.gradeType === 'grade3') {
        displayIcon = '🦠';
    }
    
    // 등급별 아이콘 클래스
    const iconClass = disease.gradeType === 'grade1' ? 'grade1-icon' : 
                     disease.gradeType === 'grade2' ? 'grade2-icon' : 
                     disease.gradeType === 'grade3' ? 'grade3-icon' : '';
    
    // 등급별 배지 클래스
    const badgeClass = disease.gradeType === 'grade1' ? 'grade1-badge' : 
                      disease.gradeType === 'grade2' ? 'grade2-badge' : 
                      disease.gradeType === 'grade3' ? 'grade3-badge' : '';
    
    // 등급별 버튼 클래스
    const btnClass = disease.gradeType === 'grade1' ? 'grade1-btn' : 
                    disease.gradeType === 'grade2' ? 'grade2-btn' : 
                    disease.gradeType === 'grade3' ? 'grade3-btn' : 
                    disease.gradeType === 'grade4' ? 'grade4-btn' : '';
    
    card.innerHTML = `
        <div class="disease-icon ${iconClass}">${displayIcon}</div>
        <div class="grade-badge ${badgeClass}">${disease.grade}</div>
        <h3 class="disease-name-ko">${disease.nameKo}</h3>
        <p class="disease-description">${disease.description}</p>
        <button class="more-btn ${btnClass}" onclick="event.stopPropagation(); showDetailById(${disease.id})">더보기</button>
    `;
    
    return card;
}

// 모든 감염병 표시
function showAllDiseases() {
    showingAll = true;
    renderDiseases(diseases);
    document.getElementById('showMoreBtn').classList.add('hidden');
}

// 검색 필터링
function filterDiseases() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filtered = diseases.filter(disease => 
        disease.nameKo.toLowerCase().includes(searchTerm) ||
        disease.nameEn.toLowerCase().includes(searchTerm) ||
        disease.description.toLowerCase().includes(searchTerm) ||
        disease.symptoms.some(s => s.toLowerCase().includes(searchTerm))
    );
    
    if (showingAll || filtered.length <= INITIAL_DISPLAY_COUNT) {
        renderDiseases(filtered);
        document.getElementById('showMoreBtn').classList.add('hidden');
    } else {
        renderDiseases(filtered.slice(0, INITIAL_DISPLAY_COUNT));
        document.getElementById('showMoreBtn').classList.remove('hidden');
        document.getElementById('showMoreBtn').textContent = `더보기 (${filtered.length - INITIAL_DISPLAY_COUNT}개 더)`;
    }
}

// ID로 상세 정보 표시
function showDetailById(id) {
    const disease = diseases.find(d => d.id === id);
    if (disease) {
        showDetail(disease);
    }
}

// 상세 정보 표시
function showDetail(disease) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="modal-icon" style="color: ${disease.iconColor}">${disease.icon}</div>
            <div class="modal-title">
                <h2>${disease.nameKo}</h2>
                <p>${disease.nameEn}</p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>등급</h3>
            <div class="grade-badge ${disease.gradeType}">${disease.grade}</div>
            <div class="isolation-badge ${disease.isolation ? 'yes' : 'no'}">
                격리 ${disease.isolation ? '필요' : '불필요'}
            </div>
        </div>
        
        <div class="detail-section">
            <h3>정의</h3>
            <p>${disease.description}</p>
        </div>
        
        <div class="detail-section">
            <h3>증상</h3>
            <ul>
                ${disease.symptoms.map(symptom => `<li>${symptom}</li>`).join('')}
            </ul>
        </div>
        
        <div class="detail-grid">
            <div class="detail-item">
                <strong>전파경로</strong>
                <p>${disease.transmission}</p>
            </div>
            <div class="detail-item">
                <strong>병원체</strong>
                <p>${disease.pathogen}</p>
            </div>
            <div class="detail-item">
                <strong>합병증</strong>
                <p>${disease.complications}</p>
            </div>
            <div class="detail-item">
                <strong>예방접종</strong>
                <p>${disease.vaccination}</p>
            </div>
            <div class="detail-item">
                <strong>이상반응</strong>
                <p>${disease.sideEffects}</p>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// 모달 닫기
function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target == modal) {
        closeModal();
    }
}

