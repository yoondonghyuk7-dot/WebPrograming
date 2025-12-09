// 검색 결과 페이지 메인 로직

let diseaseData = [];
let symptomData = [];
let regionRiskData = [];
let symptomSynonymsMap = {};

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async function() {
    // URL 파라미터에서 검색어 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('q') || '';
    
    // 샘플 모드 확인 (URL에 ?sample=true가 있으면 샘플 데이터 표시)
    const isSampleMode = urlParams.get('sample') === 'true';
    
    if (isSampleMode) {
        // 샘플 데이터 표시
        displaySampleResults();
        return;
    }
    
    if (!searchQuery) {
        // 검색어가 없으면 메인으로 리다이렉트
        window.location.href = 'index.html';
        return;
    }
    
    // 검색어 표시
    document.getElementById('searchQueryText').textContent = searchQuery;
    
    // TTL 파일 로드 및 파싱
    try {
        console.log('🔍 검색 시작, 검색어:', searchQuery);
        console.log('📥 TTL 파일 로드 시작...');
        await loadAllTTLData();
        console.log('✅ 데이터 로드 완료');
        console.log('📊 질병:', diseaseData.length, '개');
        console.log('📊 증상:', symptomData.length, '개');
        console.log('📊 동의어 맵:', Object.keys(symptomSynonymsMap).length, '개');
        
        if (diseaseData.length > 0) {
            console.log('샘플 질병:', diseaseData[0]);
        }
        if (symptomData.length > 0) {
            console.log('샘플 증상:', symptomData.slice(0, 3));
        }
        
        // 증상 분석 및 질병 추천
        await analyzeSymptomsAndRecommend(searchQuery);
        console.log('✅ 검색 완료');
    } catch (error) {
        console.error('❌ 에러 발생:', error);
        console.error('에러 메시지:', error.message);
        console.error('에러 스택:', error.stack);
        // 에러 발생 시 샘플 데이터 표시 (백엔드 연동 전 UI 확인용)
        console.log('⚠️ 에러로 인해 샘플 데이터를 표시합니다.');
        displaySampleResults();
    }
});

// 모든 TTL 파일 로드
async function loadAllTTLData() {
    // Infection_Rdf.ttl 로드 (질병 및 증상 데이터)
    // 여러 경로 시도 (서버 실행 위치에 따라 다를 수 있음)
    let infectionResponse;
    try {
        infectionResponse = await fetch('../Infection_Rdf.ttl');
    } catch (e) {
        try {
            infectionResponse = await fetch('Infection_Rdf.ttl');
        } catch (e2) {
            throw new Error('Infection_Rdf.ttl 파일을 찾을 수 없습니다.');
        }
    }
    
    const infectionContent = await infectionResponse.text();
    console.log('✅ Infection_Rdf.ttl 로드 완료, 크기:', infectionContent.length, 'bytes');
    
    const infectionParser = new TTLParser();
    infectionParser.parse(infectionContent);
    console.log('📊 파싱된 데이터:', infectionParser.data.length, '개 항목');
    
    // 질병 및 증상 데이터 추출
    extractDiseaseAndSymptomData(infectionParser.data);
    console.log('📊 추출된 질병:', diseaseData.length, '개');
    console.log('📊 추출된 증상:', symptomData.length, '개');
    console.log('📊 동의어 맵:', Object.keys(symptomSynonymsMap).length, '개');
    
    // disease-incidence-by-region.ttl 로드 (지역별 위험도 데이터)
    let regionResponse;
    try {
        regionResponse = await fetch('../disease-incidence-by-region.ttl');
        if (!regionResponse.ok) throw new Error('파일을 찾을 수 없습니다.');
    } catch (e) {
        try {
            regionResponse = await fetch('disease-incidence-by-region.ttl');
            if (!regionResponse.ok) throw new Error('파일을 찾을 수 없습니다.');
        } catch (e2) {
            console.warn('disease-incidence-by-region.ttl 파일을 찾을 수 없습니다. 지역 위험도 분석은 제한됩니다.');
            regionRiskData = [];
            return;
        }
    }
    
    const regionContent = await regionResponse.text();
    const regionParser = new TTLParser();
    regionParser.parse(regionContent);
    
    // 지역별 위험도 데이터 추출
    extractRegionRiskData(regionParser.data);
}

// 질병 및 증상 데이터 추출
function extractDiseaseAndSymptomData(parsedData) {
    const diseaseMap = new Map();
    const symptomMap = new Map();
    
    console.log('🔍 데이터 추출 시작, 총', parsedData.length, '개 항목');
    
    // 파싱된 데이터 샘플 확인
    console.log('📋 파싱된 데이터 샘플 (처음 3개):', parsedData.slice(0, 3));
    
    // 질병이나 증상이 있는 항목 찾기
    const itemsWithPrefLabel = parsedData.filter(item => item['skos:prefLabel']);
    console.log('📋 skos:prefLabel이 있는 항목:', itemsWithPrefLabel.length, '개');
    if (itemsWithPrefLabel.length > 0) {
        console.log('샘플 (prefLabel):', itemsWithPrefLabel[0]);
        console.log('prefLabel 값:', itemsWithPrefLabel[0]['skos:prefLabel']);
    }
    
    const itemsWithSymptom = parsedData.filter(item => item['koid:symptom']);
    console.log('📋 koid:symptom이 있는 항목:', itemsWithSymptom.length, '개');
    if (itemsWithSymptom.length > 0) {
        console.log('샘플 (symptom):', itemsWithSymptom[0]);
    }
    
    const itemsWithBroader = parsedData.filter(item => item['skos:broader']);
    console.log('📋 skos:broader가 있는 항목:', itemsWithBroader.length, '개');
    if (itemsWithBroader.length > 0) {
        console.log('샘플 (broader):', itemsWithBroader[0]);
        console.log('broader 값:', itemsWithBroader[0]['skos:broader']);
    }
    
    // 증상 관련 broader 값 찾기
    const symptomBroaderItems = parsedData.filter(item => {
        const broader = item['skos:broader'];
        if (!broader) return false;
        const broaderStr = typeof broader === 'string' ? broader : 
                          (Array.isArray(broader) ? broader.join(' ') : String(broader));
        return broaderStr.includes('symptom');
    });
    console.log('📋 symptom이 포함된 broader 항목:', symptomBroaderItems.length, '개');
    if (symptomBroaderItems.length > 0) {
        console.log('샘플 symptom broader:', symptomBroaderItems[0]);
        console.log('symptom broader 값:', symptomBroaderItems[0]['skos:broader']);
        console.log('symptom prefLabel:', symptomBroaderItems[0]['skos:prefLabel']);
    }
    
    for (const item of parsedData) {
        // 질병 데이터 추출
        if (item['skos:prefLabel'] && item['koid:symptom']) {
            const diseaseName = extractKoreanLabel(item['skos:prefLabel']);
            const diseaseNameEn = extractEnglishLabel(item['skos:prefLabel']);
            
            console.log('질병 발견:', { 
                diseaseName, 
                diseaseNameEn, 
                prefLabel: item['skos:prefLabel'],
                symptom: item['koid:symptom'],
                subject: item.subject
            });
            
            if (diseaseName) {
                const diseaseId = item.subject;
                const symptoms = Array.isArray(item['koid:symptom']) 
                    ? item['koid:symptom'] 
                    : [item['koid:symptom']];
                
                diseaseMap.set(diseaseId, {
                    id: diseaseId,
                    name: diseaseName,
                    nameEn: diseaseNameEn || diseaseName,
                    description: item['koid:definition'] || item['schema:description'] || '',
                    symptoms: symptoms,
                    grade: item['koid:classificationLevel'] || '',
                    definition: item['koid:definition'] || ''
                });
            }
        }
        
        // 증상 데이터 추출 (동의어 포함)
        if (item['skos:prefLabel']) {
            const broader = item['skos:broader'];
            const subject = item.subject || '';
            
            // subject URI를 확인하여 실제 증상만 추출
            // 실제 증상: /symptom/ 포함하고 /symptom_group/이 없음
            // 증상 그룹: /symptom_group/ 포함 (제외)
            const isActualSymptom = subject.includes('/symptom/') && 
                                   !subject.includes('/symptom_group/');
            
            // broader가 symptom 관련인지 확인 (symptom_group을 broader로 가지는 것은 실제 증상)
            let hasSymptomBroader = false;
            if (broader) {
                const broaderStr = typeof broader === 'string' ? broader : 
                                  (Array.isArray(broader) ? broader.join(' ') : String(broader));
                // symptom이 포함되어 있고 symptom_class가 아니면 OK
                // symptom_group을 broader로 가지는 것은 실제 증상이므로 포함
                hasSymptomBroader = broaderStr.includes('symptom') && 
                                   !broaderStr.includes('symptom_class');
            }
            
            // 실제 증상 추출 조건 완화
            // 1. subject에 /symptom/이 있고 /symptom_group/이 없으면 실제 증상
            // 2. 또는 broader가 symptom_group을 가리키는 경우 (실제 증상)
            const hasSymptomGroupBroader = broader && String(broader).includes('symptom_group');
            
            if (isActualSymptom || (hasSymptomBroader && hasSymptomGroupBroader)) {
                const symptomId = item.subject;
                const symptomName = extractKoreanLabel(item['skos:prefLabel']);
                const altLabels = Array.isArray(item['skos:altLabel']) 
                    ? item['skos:altLabel'].map(extractKoreanLabel).filter(Boolean)
                    : (item['skos:altLabel'] ? [extractKoreanLabel(item['skos:altLabel'])] : []);
                
                if (symptomName) {
                    symptomMap.set(symptomId, {
                        id: symptomId,
                        name: symptomName,
                        altLabels: altLabels
                    });
                    
                    // 동의어 맵 생성
                    symptomSynonymsMap[symptomName.toLowerCase()] = symptomName;
                    altLabels.forEach(alt => {
                        if (alt) {
                            symptomSynonymsMap[alt.toLowerCase()] = symptomName;
                        }
                    });
                } else {
                    // 증상명 추출 실패 시 디버깅
                    console.log('증상명 추출 실패:', {
                        prefLabel: item['skos:prefLabel'],
                        broader: item['skos:broader'],
                        subject: item.subject
                    });
                }
            }
        }
    }
    
    console.log('📊 추출된 질병:', diseaseMap.size, '개');
    console.log('📊 추출된 증상:', symptomMap.size, '개');
    console.log('📊 동의어 맵:', Object.keys(symptomSynonymsMap).length, '개');
    
    diseaseData = Array.from(diseaseMap.values());
    
    // 증상 ID를 증상명으로 변환
    const symptomIdToName = new Map();
    symptomMap.forEach((symptom, id) => {
        symptomIdToName.set(id, symptom.name);
    });
    
    // 질병 데이터의 증상 ID를 증상명으로 변환
    diseaseData.forEach(disease => {
        disease.symptomNames = disease.symptoms
            .map(id => symptomIdToName.get(id))
            .filter(Boolean);
    });
    
    symptomData = Array.from(symptomMap.values());
    
    if (symptomData.length > 0) {
        console.log('샘플 증상:', symptomData.slice(0, 3));
        console.log('전체 증상 목록:', symptomData.map(s => s.name));
        console.log('전체 동의어 맵:', symptomSynonymsMap);
    } else {
        console.warn('⚠️ 증상 데이터가 없습니다!');
    }
}

// 지역별 위험도 데이터 추출
function extractRegionRiskData(parsedData) {
    const regionMap = new Map();
    const diseaseNameMap = new Map();
    
    // 지역 및 질병 이름 매핑
    for (const item of parsedData) {
        if (item['skos:prefLabel']) {
            const label = item['skos:prefLabel'];
            if (typeof label === 'string') {
                if (label.includes('Province') || label === 'Seoul' || label === 'Sejong' || label === 'Ulsan' || label === 'Daejeon' || label === 'Daegu' || label === 'Busan' || label === 'Incheon' || label === 'Gwangju') {
                    regionMap.set(item.subject, label);
                } else if (!label.includes('Province') && !label.includes('location')) {
                    diseaseNameMap.set(item.subject, label);
                }
            }
        }
    }
    
    // 지역별 질병 데이터 추출
    const riskDataMap = new Map();
    
    for (const item of parsedData) {
        if (item['schema:location'] && item['schema:name'] && item['koid:incidenceRate']) {
            const locationId = item['schema:location'];
            const diseaseId = item['schema:name'];
            const regionName = regionMap.get(locationId);
            const diseaseName = diseaseNameMap.get(diseaseId);
            const incidenceRate = parseFloat(item['koid:incidenceRate']);
            
            if (regionName && diseaseName) {
                const key = `${diseaseName.toLowerCase()}_${regionName.toLowerCase()}`;
                riskDataMap.set(key, {
                    disease: diseaseName,
                    region: regionName,
                    rate: incidenceRate
                });
            }
        }
    }
    
    regionRiskData = Array.from(riskDataMap.values());
}

// 한글 라벨 추출
function extractKoreanLabel(label) {
    if (!label) return null;
    
    if (typeof label === 'string') {
        // 여러 언어 라벨이 섞여있는 경우: "A형간염"@ko,"Hepatitis A"@en
        const koMatch = label.match(/"([^"]+)"@ko/);
        if (koMatch) {
            return koMatch[1];
        }
        // 이미 파싱된 경우: A형간염"@ko,"Hepatitis A 또는 진드기 매개뇌염"@ko,"Tick-borne encephalitis"
        if (label.includes('"@ko')) {
            // 따옴표가 앞에 없을 수도 있음
            const match = label.match(/([^"]+)"@ko/);
            if (match) {
                let result = match[1];
                // 앞뒤 따옴표 제거
                result = result.replace(/^"|"$/g, '');
                return result;
            }
        }
        // 이스케이프된 따옴표 처리: 진드기 매개뇌염\"@ko,\"Tick-borne encephalitis\"
        if (label.includes('\\"@ko')) {
            const match = label.match(/([^\\"]+)\\"@ko/);
            if (match) {
                return match[1].replace(/^"|"$/g, '');
            }
        }
        // 단일 따옴표 형식 (뒤 따옴표만 있는 경우): 발열" 또는 기침"
        if (label.endsWith('"') && !label.startsWith('"') && !label.includes('@')) {
            // 뒤 따옴표만 제거
            return label.slice(0, -1);
        }
        // 단일 따옴표 형식: "A형간염"@ko
        if (label.includes('@ko')) {
            const match = label.match(/"([^"]+)"@ko/);
            if (match) return match[1];
        }
    }
    
    // 배열인 경우
    if (Array.isArray(label)) {
        for (const item of label) {
            if (typeof item === 'string') {
                const koMatch = item.match(/"([^"]+)"@ko/);
                if (koMatch) return koMatch[1];
                // 뒤 따옴표만 있는 경우
                if (item.endsWith('"') && !item.startsWith('"') && !item.includes('@')) {
                    return item.slice(0, -1);
                }
            }
        }
    }
    
    return null;
}

// 영어 라벨 추출
function extractEnglishLabel(label) {
    if (!label) return null;
    
    if (typeof label === 'string') {
        // 여러 언어 라벨이 섞여있는 경우: "A형간염"@ko,"Hepatitis A"@en
        const enMatch = label.match(/"([^"]+)"@en/);
        if (enMatch) {
            return enMatch[1];
        }
        // 이미 파싱된 경우
        if (label.includes('"@en')) {
            const match = label.match(/([^"]+)"@en/);
            if (match) {
                return match[1].replace(/^"|"$/g, '');
            }
        }
        // 단일 따옴표 형식
        if (label.includes('@en')) {
            const match = label.match(/"([^"]+)"@en/);
            if (match) return match[1];
        }
    }
    
    // 배열인 경우
    if (Array.isArray(label)) {
        for (const item of label) {
            if (typeof item === 'string') {
                const enMatch = item.match(/"([^"]+)"@en/);
                if (enMatch) return enMatch[1];
            }
        }
    }
    
    return null;
}

// 증상 분석 및 질병 추천 함수
async function analyzeSymptomsAndRecommend(userInput) {
    console.log('🔍 증상 분석 시작, 입력:', userInput);
    
    // 1. 증상 키워드 분석 및 동의어 매핑
    const extractedKeywords = extractAndMapSymptoms(userInput);
    console.log('📝 추출된 키워드:', extractedKeywords);
    displayKeywordTags(extractedKeywords);
    
    // 2. 질병 유사도 계산 및 추천
    const recommendations = calculateDiseaseSimilarity(extractedKeywords);
    console.log('🎯 추천 질병:', recommendations.length, '개');
    if (recommendations.length > 0) {
        console.log('추천 결과:', recommendations.slice(0, 3));
    }
    
    // 로딩 숨기기
    document.getElementById('loadingIndicator').style.display = 'none';
    
    if (recommendations.length === 0) {
        console.warn('⚠️ 추천 질병이 없습니다. 샘플 데이터를 표시합니다.');
        // 결과가 없으면 샘플 데이터 표시 (백엔드 연동 전 UI 확인용)
        displaySampleResults();
        return;
    }
    
    // 섹션 표시
    document.getElementById('analysisSection').style.display = 'block';
    document.getElementById('recommendationsSection').style.display = 'block';
    
    displayDiseaseRecommendations(recommendations);
}

// 증상 키워드 추출 및 동의어 매핑
function extractAndMapSymptoms(userInput) {
    const keywords = [];
    const inputLower = userInput.toLowerCase();
    const foundSynonyms = new Set();
    
    console.log('🔍 증상 추출 시작, 입력:', userInput);
    console.log('📋 사용 가능한 동의어 맵:', Object.keys(symptomSynonymsMap).length, '개');
    console.log('📋 동의어 샘플:', Object.keys(symptomSynonymsMap).slice(0, 10));
    console.log('📋 증상 데이터:', symptomData.length, '개');
    if (symptomData.length > 0) {
        console.log('📋 증상 샘플:', symptomData.map(s => s.name));
    }
    
    // 각 증상과 동의어를 확인
    for (const [synonym, standardTerm] of Object.entries(symptomSynonymsMap)) {
        if (inputLower.includes(synonym)) {
            if (!foundSynonyms.has(standardTerm)) {
                keywords.push({
                    original: synonym,
                    standard: standardTerm,
                    found: true
                });
                foundSynonyms.add(standardTerm);
                console.log('✅ 동의어 맵 매칭:', synonym, '→', standardTerm);
            }
        }
    }
    
    // 표준 용어가 직접 입력에 포함되어 있는지 확인
    symptomData.forEach(symptom => {
        const symptomNameLower = symptom.name.toLowerCase();
        if (inputLower.includes(symptomNameLower) && !foundSynonyms.has(symptom.name)) {
            keywords.push({
                original: symptom.name,
                standard: symptom.name,
                found: false
            });
            foundSynonyms.add(symptom.name);
            console.log('✅ 정확 매칭:', symptomNameLower, '→', symptom.name);
        }
    });
    
    // 추가 매칭: 일반적인 증상 표현을 표준 용어로 매핑
    // "열이 나고", "열이 오르고", "열이" 등 -> "발열"
    if ((inputLower.includes('열') || inputLower.includes('고열') || inputLower.includes('발열')) && !foundSynonyms.has('발열')) {
        // 발열 관련 증상 찾기
        const feverSymptoms = symptomData.filter(s => 
            s.name.includes('발열') || s.name.includes('열') || 
            (s.altLabels && s.altLabels.some(alt => alt.includes('열')))
        );
        if (feverSymptoms.length > 0) {
            keywords.push({
                original: '열',
                standard: feverSymptoms[0].name,
                found: true
            });
            foundSynonyms.add(feverSymptoms[0].name);
            console.log('✅ 부분 매칭 (열): 열 →', feverSymptoms[0].name);
        }
    }
    
    // "기침이 나고", "기침이 심하고" 등 -> "기침"
    if (inputLower.includes('기침') && !foundSynonyms.has('기침')) {
        // 기침 관련 증상 찾기
        const coughSymptoms = symptomData.filter(s => 
            s.name.includes('기침') || 
            (s.altLabels && s.altLabels.some(alt => alt.includes('기침')))
        );
        if (coughSymptoms.length > 0) {
            keywords.push({
                original: '기침',
                standard: coughSymptoms[0].name,
                found: false
            });
            foundSynonyms.add(coughSymptoms[0].name);
            console.log('✅ 부분 매칭 (기침): 기침 →', coughSymptoms[0].name);
        }
    }
    
    // 추가 증상 매칭 패턴
    const symptomPatterns = [
        { pattern: /두통|머리.*아프|두통이/, symptom: '두통' },
        { pattern: /복통|배.*아프|복부.*통증/, symptom: '복통' },
        { pattern: /구토|토함|토하고/, symptom: '구토' },
        { pattern: /설사|배변/, symptom: '설사' },
        { pattern: /피로|피로감|쇠약/, symptom: '피로감' },
        { pattern: /발진|뾰루지/, symptom: '발진' },
        { pattern: /황달/, symptom: '황달' }
    ];
    
    symptomPatterns.forEach(({ pattern, symptom }) => {
        if (pattern.test(inputLower) && !foundSynonyms.has(symptom)) {
            const foundSymptom = symptomData.find(s => s.name === symptom);
            if (foundSymptom) {
                keywords.push({
                    original: symptom,
                    standard: symptom,
                    found: false
                });
                foundSynonyms.add(symptom);
                console.log(`✅ 패턴 매칭: ${symptom}`);
            }
        }
    });
    
    // 키워드가 없어도 기본 증상 매칭 시도
    if (keywords.length === 0) {
        // 입력에서 일반적인 증상 키워드 추출
        const commonSymptoms = ['열', '기침', '두통', '복통', '구토', '설사', '피로', '발진', '황달'];
        for (const symptom of commonSymptoms) {
            if (inputLower.includes(symptom)) {
                // 증상 데이터에서 유사한 증상 찾기
                const foundSymptom = symptomData.find(s => 
                    s.name.includes(symptom) || 
                    (s.altLabels && s.altLabels.some(alt => alt.includes(symptom)))
                );
                if (foundSymptom && !foundSynonyms.has(foundSymptom.name)) {
                    keywords.push({
                        original: symptom,
                        standard: foundSymptom.name,
                        found: true
                    });
                    foundSynonyms.add(foundSymptom.name);
                    console.log(`✅ 일반 증상 매칭: ${symptom} → ${foundSymptom.name}`);
                    break;
                }
            }
        }
        
        // 여전히 키워드가 없으면 입력 전체를 키워드로 사용
        if (keywords.length === 0) {
            keywords.push({
                original: userInput,
                standard: userInput,
                found: false
            });
            console.log('⚠️ 키워드 없음, 입력 전체 사용:', userInput);
        }
    }
    
    console.log('📝 최종 추출된 키워드:', keywords);
    return keywords;
}

// 키워드 태그 표시
function displayKeywordTags(keywords) {
    const container = document.getElementById('keywordTags');
    container.innerHTML = '';
    
    keywords.forEach(keyword => {
        const tag = document.createElement('div');
        tag.className = 'keyword-tag';
        
        if (keyword.found && keyword.original !== keyword.standard) {
            // 동의어 매핑된 경우
            tag.innerHTML = `
                <span class="original">"${keyword.original}"</span>
                <span class="arrow">→</span>
                <span class="standard">${keyword.standard}</span>
            `;
        } else {
            // 표준 용어인 경우
            tag.innerHTML = `<span class="standard">${keyword.standard}</span>`;
        }
        
        container.appendChild(tag);
    });
}

// 질병 유사도 계산
function calculateDiseaseSimilarity(keywords) {
    console.log('🎯 유사도 계산 시작, 키워드:', keywords);
    console.log('📊 질병 데이터:', diseaseData.length, '개');
    
    const standardTerms = keywords.map(k => k.standard.toLowerCase());
    console.log('📝 표준 키워드:', standardTerms);
    
    const recommendations = diseaseData.map(disease => {
        if (!disease.symptomNames || disease.symptomNames.length === 0) {
            return null;
        }
        
        const diseaseSymptoms = disease.symptomNames.map(s => s.toLowerCase());
        
        console.log(`질병: ${disease.name}, 증상:`, disease.symptomNames);
        
        // 일치하는 증상 개수 계산
        const matchedSymptoms = standardTerms.filter(term => 
            diseaseSymptoms.some(symptom => 
                symptom.includes(term) || term.includes(symptom)
            )
        );
        
        // 키워드가 질병명이나 설명에 포함되어 있는지도 확인
        const diseaseNameMatch = standardTerms.some(term => 
            disease.name.toLowerCase().includes(term) || 
            (disease.description && disease.description.toLowerCase().includes(term))
        );
        
        // 매칭이 있거나 질병명/설명에 키워드가 포함되면 추천
        const hasMatch = matchedSymptoms.length > 0 || diseaseNameMatch;
        
        if (hasMatch) {
            console.log(`  ✅ 매칭된 증상:`, matchedSymptoms);
            if (diseaseNameMatch) {
                console.log(`  ✅ 질병명/설명 매칭`);
            }
        }
        
        // 유사도 계산
        let similarity = 0;
        if (matchedSymptoms.length > 0) {
            similarity = (matchedSymptoms.length / Math.max(standardTerms.length, diseaseSymptoms.length)) * 100;
        } else if (diseaseNameMatch) {
            // 질병명/설명 매칭은 낮은 유사도 부여
            similarity = 30;
        }
        
        if (hasMatch) {
            console.log(`  📊 유사도: ${similarity.toFixed(2)}%, 매칭: ${matchedSymptoms.length}개`);
        }
        
        if (hasMatch) {
            return {
                disease: disease,
                similarity: Math.round(similarity),
                matchedSymptoms: matchedSymptoms.map(term => {
                    // 원래 증상명 찾기
                    const found = diseaseSymptoms.find(s => s.includes(term) || term.includes(s));
                    return disease.symptomNames.find(s => s.toLowerCase() === found);
                }).filter(Boolean)
            };
        }
        
        return null;
    }).filter(r => r && r.similarity > 0);
    
    // 유사도 순으로 정렬
    recommendations.sort((a, b) => b.similarity - a.similarity);
    
    console.log('🎯 최종 추천:', recommendations.length, '개');
    if (recommendations.length > 0) {
        console.log('추천 결과:', recommendations.map(r => ({
            질병: r.disease.name,
            유사도: r.similarity + '%',
            매칭증상: r.matchedSymptoms
        })));
    }
    
    return recommendations;
}

// 질병 추천 카드 표시
function displayDiseaseRecommendations(recommendations) {
    const container = document.getElementById('diseaseCardsContainer');
    container.innerHTML = '';
    
    if (recommendations.length === 0) {
        container.innerHTML = '<div class="loading">검색 결과가 없습니다.</div>';
        return;
    }
    
    recommendations.forEach(rec => {
        const card = createDiseaseCard(rec);
        container.appendChild(card);
    });
}

// 질병 카드 생성
function createDiseaseCard(recommendation) {
    const { disease, similarity, matchedSymptoms } = recommendation;
    const card = document.createElement('div');
    card.className = 'disease-card';
    card.style.cursor = 'pointer'; // 클릭 가능 표시
    
    // 카드 클릭 이벤트 추가
    card.addEventListener('click', () => {
        showDiseaseDetail(disease, matchedSymptoms);
    });
    
    // 지역 위험도 분석
    const riskInfo = getRegionalRisk(disease.name);
    
    // 설명 텍스트 정리 및 매칭 증상 하이라이트
    let description = disease.description || disease.definition || '';
    if (description.length > 150) {
        description = description.substring(0, 150) + '...';
    }
    
    // 매칭 증상 하이라이트 적용
    let highlightedDescription = description;
    if (matchedSymptoms && matchedSymptoms.length > 0) {
        matchedSymptoms.forEach(symptom => {
            // 설명 텍스트에서 해당 증상을 찾아 하이라이트
            const regex = new RegExp(`(${symptom})`, 'gi');
            highlightedDescription = highlightedDescription.replace(
                regex, 
                '<mark class="matched-symptom-highlight">$1</mark>'
            );
        });
    }
    
    card.innerHTML = `
        <div class="disease-card-header">
            <div>
                <div class="disease-name">${disease.name}</div>
                <div class="disease-name-en">${disease.nameEn || ''}</div>
            </div>
            <div class="similarity-badge">유사도 ${similarity}%</div>
        </div>
        
        <div class="disease-description">${highlightedDescription}</div>
        
        <div class="matched-symptoms">
            <div class="matched-symptoms-label">일치하는 증상:</div>
            <div class="matched-symptoms-list">
                ${matchedSymptoms.map(symptom => 
                    `<span class="matched-symptom-tag">${symptom}</span>`
                ).join('')}
            </div>
        </div>
        
        ${riskInfo ? `
        <div class="risk-analysis ${riskInfo.level}">
            <div class="risk-badge">${riskInfo.levelText}</div>
            <div class="risk-text">${riskInfo.message}</div>
            <div class="risk-statistics">${riskInfo.statistics}</div>
        </div>
        ` : ''}
    `;
    
    return card;
}

// 샘플 데이터로 UI 표시 (백엔드 연동 전 테스트용)
function displaySampleResults() {
    // URL에서 검색어 가져오기 (없으면 기본값)
    const urlParams = new URLSearchParams(window.location.search);
    const sampleQuery = urlParams.get('q') || '열이 나고 기침이 나요';
    document.getElementById('searchQueryText').textContent = sampleQuery;
    
    // 샘플 키워드 추출 결과
    const sampleKeywords = [
        { original: '열', standard: '발열', found: true },
        { original: '기침', standard: '기침', found: false }
    ];
    displayKeywordTags(sampleKeywords);
    
    // 샘플 질병 추천 결과 (더 많은 샘플 추가)
    const sampleRecommendations = [
        {
            disease: {
                id: 'sample1',
                name: '인플루엔자',
                nameEn: 'Influenza',
                description: '인플루엔자 바이러스에 의한 급성 호흡기 감염병으로 발열, 기침, 두통, 근육통 등의 증상이 나타납니다.',
                symptomNames: ['발열', '기침', '두통', '근육통']
            },
            similarity: 85,
            matchedSymptoms: ['발열', '기침']
        },
        {
            disease: {
                id: 'sample2',
                name: '결핵',
                nameEn: 'Tuberculosis',
                description: '결핵균에 의한 만성 감염병으로 발열, 기침, 객혈, 체중감소 등의 증상이 나타납니다.',
                symptomNames: ['발열', '기침', '객혈', '체중감소']
            },
            similarity: 75,
            matchedSymptoms: ['발열', '기침']
        },
        {
            disease: {
                id: 'sample3',
                name: 'A형간염',
                nameEn: 'Hepatitis A',
                description: 'A형간염 바이러스 감염으로 고열과 황달 등이 나타나는 급성 간염입니다.',
                symptomNames: ['발열', '황달', '피로감']
            },
            similarity: 50,
            matchedSymptoms: ['발열']
        },
        {
            disease: {
                id: 'sample4',
                name: '수두',
                nameEn: 'Varicella',
                description: '수두-대상포진 바이러스에 의한 급성 발진성 질환으로 발열과 전신성 발진이 특징입니다.',
                symptomNames: ['발열', '발진', '두통']
            },
            similarity: 45,
            matchedSymptoms: ['발열']
        },
        {
            disease: {
                id: 'sample5',
                name: '장티푸스',
                nameEn: 'Typhoid Fever',
                description: '살모넬라균에 의한 전신성 감염병으로 지속적인 발열, 두통, 복통 등의 증상이 나타납니다.',
                symptomNames: ['발열', '두통', '복통']
            },
            similarity: 40,
            matchedSymptoms: ['발열']
        }
    ];
    
    // 로딩 숨기기
    document.getElementById('loadingIndicator').style.display = 'none';
    
    // 섹션 표시
    document.getElementById('analysisSection').style.display = 'block';
    document.getElementById('recommendationsSection').style.display = 'block';
    
    // 질병 카드 표시
    displayDiseaseRecommendations(sampleRecommendations);
}

// 지역 위험도 분석
function getRegionalRisk(diseaseName) {
    // 기본 지역을 전북으로 설정 (나중에 사용자 위치 기반으로 변경 가능)
    const defaultRegion = 'North Jeolla';
    
    // 질병명 매칭 (한글/영문)
    const diseaseNameLower = diseaseName.toLowerCase();
    
    // 지역별 위험도 데이터에서 찾기
    const riskData = regionRiskData.find(data => {
        const dataDiseaseLower = data.disease.toLowerCase();
        const dataRegionLower = data.region.toLowerCase();
        
        // 질병명 매칭 (부분 일치)
        const diseaseMatch = diseaseNameLower.includes(dataDiseaseLower) || 
                           dataDiseaseLower.includes(diseaseNameLower);
        
        // 지역 매칭
        const regionMatch = dataRegionLower === defaultRegion.toLowerCase();
        
        return diseaseMatch && regionMatch;
    });
    
    // 실제 데이터가 없으면 샘플 데이터 사용 (UI 테스트용)
    let rate;
    if (!riskData) {
        // 샘플 데이터 처리
        const sampleRiskData = {
            '인플루엔자': { rate: 12.5, region: '전북' },
            '결핵': { rate: 8.3, region: '전북' },
            'a형간염': { rate: 15.4, region: '전북' },
            '수두': { rate: 6.2, region: '전북' },
            '장티푸스': { rate: 3.1, region: '전북' }
        };
        
        // 샘플 데이터 확인
        const sampleKey = Object.keys(sampleRiskData).find(key => 
            diseaseNameLower.includes(key.toLowerCase()) || 
            key.toLowerCase().includes(diseaseNameLower)
        );
        
        if (sampleKey) {
            rate = sampleRiskData[sampleKey].rate;
        } else {
            return null;
        }
    } else {
        rate = riskData.rate;
    }
    
    // 위험도 레벨 결정
    let level, levelText;
    if (rate < 5) {
        level = 'safe';
        levelText = '안전';
    } else if (rate < 10) {
        level = 'caution';
        levelText = '주의';
    } else if (rate < 20) {
        level = 'warning';
        levelText = '경계';
    } else {
        level = 'severe';
        levelText = '심각';
    }
    
    const regionNameKo = '전북';
    
    return {
        level: level,
        levelText: levelText,
        message: `데이터 분석 결과, 근 5년 동안 해당 질병의 ${regionNameKo} 지역 발생률은 평균 ${rate.toFixed(1)}%로 '${levelText}' 수준입니다.`,
        statistics: `평균 발생률: ${rate.toFixed(1)}%`
    };
}

// 질병 상세 정보 표시 함수
function showDiseaseDetail(disease, matchedSymptoms) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    
    // 등급 정보 추출
    const classificationLevel = disease.grade || disease.classificationLevel || '';
    let grade = '';
    let gradeType = '';
    let isolation = false;
    
    // classificationLevel에서 등급 추출
    if (classificationLevel.includes('1') || classificationLevel.toLowerCase().includes('one') || classificationLevel === '1급') {
        grade = '1급';
        gradeType = 'grade1';
        isolation = true;
    } else if (classificationLevel.includes('2') || classificationLevel.toLowerCase().includes('two') || classificationLevel === '2급') {
        grade = '2급';
        gradeType = 'grade2';
        isolation = false;
    } else if (classificationLevel.includes('3') || classificationLevel.toLowerCase().includes('three') || classificationLevel === '3급') {
        grade = '3급';
        gradeType = 'grade3';
        isolation = false;
    } else {
        // 기본값
        grade = '2급';
        gradeType = 'grade2';
        isolation = false;
    }
    
    // 아이콘 및 색상 결정
    let icon = '🦠';
    let iconColor = '#ff9800';
    if (gradeType === 'grade1') {
        icon = '⚠️';
        iconColor = '#ff4444';
    } else if (gradeType === 'grade2') {
        icon = '🦠';
        iconColor = '#ff9800';
    } else if (gradeType === 'grade3') {
        icon = '🦠';
        iconColor = '#4caf50';
    }
    
    // 증상 목록 (매칭된 증상 강조)
    const symptoms = disease.symptomNames || [];
    const symptomsHTML = symptoms.length > 0 
        ? symptoms.map(symptom => {
            const isMatched = matchedSymptoms && matchedSymptoms.includes(symptom);
            return `<li${isMatched ? ' style="color: #2563eb; font-weight: 600;"' : ''}>${symptom}${isMatched ? ' ✓' : ''}</li>`;
        }).join('')
        : '<li>정보가 없습니다.</li>';
    
    // 지역 위험도 정보
    const riskInfo = getRegionalRisk(disease.name);
    
    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="modal-icon" style="color: ${iconColor}">${icon}</div>
            <div class="modal-title">
                <h2>${disease.name}</h2>
                <p>${disease.nameEn || ''}</p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>등급</h3>
            <div class="grade-badge ${gradeType}">${grade}</div>
            <div class="isolation-badge ${isolation ? 'yes' : 'no'}">
                격리 ${isolation ? '필요' : '불필요'}
            </div>
        </div>
        
        <div class="detail-section">
            <h3>정의</h3>
            <p>${disease.description || disease.definition || '정보가 없습니다.'}</p>
        </div>
        
        <div class="detail-section">
            <h3>증상</h3>
            <ul>
                ${symptomsHTML}
            </ul>
        </div>
        
        <div class="detail-grid">
            <div class="detail-item">
                <strong>전파경로</strong>
                <p>${disease.transmission || disease.transmissionRoute || '정보가 없습니다.'}</p>
            </div>
            <div class="detail-item">
                <strong>병원체</strong>
                <p>${disease.pathogen || '정보가 없습니다.'}</p>
            </div>
            <div class="detail-item">
                <strong>합병증</strong>
                <p>${disease.complications || '정보가 없습니다.'}</p>
            </div>
            <div class="detail-item">
                <strong>예방접종</strong>
                <p>${disease.vaccination || '정보가 없습니다.'}</p>
            </div>
            <div class="detail-item">
                <strong>이상반응</strong>
                <p>${disease.sideEffects || disease.adverseReactions || '정보가 없습니다.'}</p>
                <button class="hospital-btn" onclick="window.location.href='hospitals.html'">
                    🏥 근처 병원 알아보기
                </button>
            </div>
            ${riskInfo ? `
            <div class="detail-item">
                <strong>지역 위험도</strong>
                <div class="risk-badge ${riskInfo.level}" style="margin-top: 10px;">${riskInfo.levelText}</div>
                <p style="margin-top: 10px;">${riskInfo.message}</p>
                <p style="color: #666; font-size: 0.9em;">${riskInfo.statistics}</p>
            </div>
            ` : ''}
        </div>
    `;
    
    modal.style.display = 'block';
}

// 모달 닫기 함수
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

