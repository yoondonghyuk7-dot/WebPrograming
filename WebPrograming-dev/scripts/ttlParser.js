// 간단한 TTL 파일 파서
class TTLParser {
    constructor() {
        this.prefixes = {};
        this.data = [];
    }

    // TTL 파일 파싱
    parse(ttlContent) {
        const lines = ttlContent.split('\n');
        let currentSubject = null;
        let currentData = {};

        for (let line of lines) {
            line = line.trim();
            
            // 빈 줄이나 주석 건너뛰기
            if (!line || line.startsWith('#')) continue;

            // Prefix 정의
            if (line.startsWith('@prefix')) {
                this.parsePrefix(line);
                continue;
            }

            // 주제(subject) 시작
            if (line.startsWith('<') || line.startsWith('_:')) {
                // 이전 주제 저장
                if (currentSubject && Object.keys(currentData).length > 0) {
                    this.data.push({ ...currentData });
                }
                
                // 새 주제 시작
                const subjectMatch = line.match(/^([^ ]+)/);
                if (subjectMatch) {
                    currentSubject = subjectMatch[1];
                    currentData = { subject: currentSubject };
                }
            }

            // 속성 파싱
            if (currentSubject) {
                // 세미콜론으로 끝나는 줄 처리
                if (line.includes(';')) {
                    const properties = line.split(';');
                    for (let prop of properties) {
                        const trimmed = prop.trim();
                        if (trimmed) {
                            this.parseProperty(trimmed, currentData);
                        }
                    }
                } 
                // 마침표로 끝나는 줄 처리 (마지막 속성)
                else if (line.includes('.')) {
                    const prop = line.replace(/\.+$/, '').trim();
                    if (prop) {
                        this.parseProperty(prop, currentData);
                    }
                }
                // 세미콜론이나 마침표가 없는 경우 (속성의 연속)
                else if (line.trim()) {
                    this.parseProperty(line.trim(), currentData);
                }
            }
        }

        // 마지막 주제 저장
        if (currentSubject && Object.keys(currentData).length > 0) {
            this.data.push({ ...currentData });
        }

        return this.data;
    }

    // Prefix 파싱
    parsePrefix(line) {
        const match = line.match(/@prefix\s+(\w+):\s+<([^>]+)>/);
        if (match) {
            this.prefixes[match[1]] = match[2];
        }
    }

    // 속성 파싱
    parseProperty(prop, data) {
        if (!prop) return;

        // 더 유연한 정규식: prefix:property 값 형식
        const match = prop.match(/^(\w+):(\w+)\s+(.+)$/);
        if (match) {
            const prefix = match[1];
            const property = match[2];
            let value = match[3].trim();

            // 여러 언어 라벨 처리 (쉼표로 구분된 값들)
            // "A형간염"@ko,"Hepatitis A"@en 형식은 원본 문자열 그대로 저장
            // 나중에 extractKoreanLabel/extractEnglishLabel에서 처리
            if (value.includes(',') && value.includes('"') && value.includes('@')) {
                // 원본 문자열 그대로 저장 (세미콜론 제거만)
                value = value.replace(/;+$/, '').trim();
                const fullProperty = `${prefix}:${property}`;
                if (data[fullProperty]) {
                    if (!Array.isArray(data[fullProperty])) {
                        data[fullProperty] = [data[fullProperty]];
                    }
                    data[fullProperty].push(value);
                } else {
                    data[fullProperty] = value;
                }
                return; // 여기서 종료
            } else {
                // 단일 값 처리
                value = value.replace(/^"|"$/g, ''); // 따옴표 제거
                value = value.replace(/@\w+$/, ''); // 언어 태그 제거
                value = value.replace(/\^\^<[^>]+>$/, ''); // 타입 제거
                value = value.replace(/^<|>$/g, ''); // 꺾쇠 괄호 제거
            }

            // 숫자 변환
            if (/^\d+$/.test(value)) {
                value = parseInt(value);
            } else if (/^\d+\.\d+$/.test(value)) {
                value = parseFloat(value);
            }

            const fullProperty = `${prefix}:${property}`;
            if (data[fullProperty]) {
                // 이미 값이 있으면 배열로 변환
                if (!Array.isArray(data[fullProperty])) {
                    data[fullProperty] = [data[fullProperty]];
                }
                data[fullProperty].push(value);
            } else {
                data[fullProperty] = value;
            }
        }
    }

    // 감염병별 데이터 집계
    aggregateByDisease() {
        const diseaseMap = {};
        
        for (let item of this.data) {
            const diseaseName = item['skos:prefLabel'] || item['skos:preLabel'];
            const caseCount = item['koid:caseCount'];
            
            if (diseaseName && caseCount) {
                if (!diseaseMap[diseaseName]) {
                    diseaseMap[diseaseName] = 0;
                }
                diseaseMap[diseaseName] += caseCount;
            }
        }
        
        return diseaseMap;
    }

    // 지역별 데이터 집계
    aggregateByRegion() {
        const regionMap = {};
        
        for (let item of this.data) {
            const region = item['schema:location'];
            const caseCount = item['koid:caseCount'];
            
            if (region && caseCount) {
                if (!regionMap[region]) {
                    regionMap[region] = 0;
                }
                regionMap[region] += caseCount;
            }
        }
        
        return regionMap;
    }

    // 성별 데이터 집계
    aggregateByGender() {
        const genderMap = { male: 0, female: 0 };
        
        for (let item of this.data) {
            const gender = item['schema:gender'];
            const caseCount = item['koid:caseCount'];
            
            if (gender && caseCount) {
                const genderKey = gender.toLowerCase();
                if (genderMap[genderKey] !== undefined) {
                    genderMap[genderKey] += caseCount;
                }
            }
        }
        
        return genderMap;
    }
}

// TTL 파일 로드 및 파싱
async function loadTTLData() {
    try {
        // csv-xls.ttl 파일 로드 (감염병별, 성별 데이터)
        const response1 = await fetch('csv-xls.ttl');
        const ttlContent1 = await response1.text();
        
        const parser1 = new TTLParser();
        parser1.parse(ttlContent1);
        
        // xlsx (1).ttl 파일 로드 (지역별 데이터)
        // 파일명에 공백이 있을 수 있으므로 여러 시도
        let response2;
        try {
            response2 = await fetch('xlsx%20(1).ttl');
        } catch (e) {
            try {
                response2 = await fetch('xlsx (1).ttl');
            } catch (e2) {
                console.warn('지역별 데이터 파일을 찾을 수 없습니다. 샘플 데이터를 사용합니다.');
                throw e2;
            }
        }
        const ttlContent2 = await response2.text();
        
        const parser2 = new TTLParser();
        parser2.parse(ttlContent2);
        
        // 데이터 집계
        const diseaseData = parser1.aggregateByDisease();
        const genderData = parser1.aggregateByGender();
        const regionData = parser2.aggregateByRegion();
        
        return {
            disease: diseaseData,
            gender: genderData,
            region: regionData
        };
    } catch (error) {
        console.error('TTL 파일 로드 실패:', error);
        // 에러 발생 시 샘플 데이터 반환
        return {
            disease: {
                'chickenpox': 65227,
                'measles': 82,
                'hepatitis A': 2000,
                'hepatitis B': 1000,
                'hepatitis C': 700,
                'scrub typhus': 117,
                'syphilis': 90
            },
            gender: {
                male: 35000,
                female: 32000
            },
            region: {
                'Gangwon Province': 3500,
                'Seoul': 15000,
                'Gyeonggi Province': 18000,
                'Chungbuk Province': 3000,
                'Chungnam Province': 4000,
                'Jeonbuk Province': 2500,
                'Jeonnam Province': 2000,
                'Gyeongbuk Province': 3500,
                'Gyeongnam Province': 4000,
                'Jeju Province': 1000
            }
        };
    }
}

// 감염병 이름 한글 변환
const diseaseNameMap = {
    'chickenpox': '수두',
    'measles': '홍역',
    'hepatitis A': 'A형 간염',
    'hepatitis B': 'B형 간염',
    'hepatitis C': 'C형 간염',
    'scrub typhus': '쯔쯔가무시병',
    'syphilis': '매독',
    'meningococcal disease': '유행성 뇌수막염',
    'hemorrhagic fever with renal syndrome': '유행성 출혈열',
    'Japanese encephalitis': '일본뇌염',
    'typhoid fever': '장티푸스',
    'Pneumococcal disease': '폐렴구균 감염증'
};

// 지역 이름 한글 변환
const regionNameMap = {
    'Gangwon Province': '강원',
    'Seoul': '서울',
    'Gyeonggi Province': '경기',
    'Chungbuk Province': '충북',
    'Chungnam Province': '충남',
    'Jeonbuk Province': '전북',
    'Jeonnam Province': '전남',
    'Gyeongbuk Province': '경북',
    'Gyeongnam Province': '경남',
    'Jeju Province': '제주'
};

