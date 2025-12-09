// 검색 기능 및 빠른 검색 태그
document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.getElementById('searchInput');
    const infoCloseBtn = document.getElementById('infoCloseBtn');
    
    // 검색 제출
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            performSearch(searchInput.value);
        });
    }
    
    // 정보 배너 닫기
    if (infoCloseBtn) {
        infoCloseBtn.addEventListener('click', function() {
            const infoBanner = document.querySelector('.header-info-banner');
            infoBanner.style.display = 'none';
        });
    }
    
    function performSearch(query) {
        if (query.trim()) {
            // 검색 결과 페이지로 이동
            window.location.href = `search-results.html?q=${encodeURIComponent(query.trim())}`;
        }
    }
});

// 메인 페이지 도넛 차트 그리기
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('donutChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    const innerRadius = 60;
    
    // 샘플 데이터
    const data = [
        { label: '코로나19', value: 40, color: '#4285f4' },
        { label: '특감', value: 25, color: '#34a853' },
        { label: '장티푸스', value: 15, color: '#ea4335' },
        { label: '콜레라', value: 12, color: '#fbbc04' },
        { label: '기타', value: 8, color: '#ff9800' }
    ];
    
    let currentAngle = -Math.PI / 2; // 시작 각도 (12시 방향)
    
    data.forEach((item, index) => {
        const sliceAngle = (item.value / 100) * 2 * Math.PI;
        
        // 외부 호 그리기
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        
        // 테두리
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        currentAngle += sliceAngle;
    });
    
    // 중앙 텍스트
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('감염병', centerX, centerY - 10);
    ctx.font = '16px Arial';
    ctx.fillText('통계', centerX, centerY + 15);
});

// 카카오맵 초기화
document.addEventListener('DOMContentLoaded', function() {
    const mapContainer = document.getElementById('kakao-map');
    
    if (mapContainer && typeof kakao !== 'undefined' && kakao.maps) {
        // 지도 중심 좌표 (서울시청)
        const mapOption = {
            center: new kakao.maps.LatLng(37.5665, 126.9780),
            level: 8 // 지도의 확대 레벨
        };
        
        // 지도 생성
        const map = new kakao.maps.Map(mapContainer, mapOption);
        
        // 샘플 의료기관 위치 (서울 지역)
        const hospitalPositions = [
            { name: '서울대학교병원', lat: 37.5663, lng: 126.9779 },
            { name: '세브란스병원', lat: 37.5623, lng: 126.9399 },
            { name: '삼성서울병원', lat: 37.4883, lng: 127.0874 },
            { name: '아산병원', lat: 37.5263, lng: 127.1142 },
            { name: '국립중앙의료원', lat: 37.5651, lng: 127.0048 },
            { name: '강남세브란스병원', lat: 37.4979, lng: 127.0276 },
            { name: '고려대학교 안암병원', lat: 37.5896, lng: 127.0273 }
        ];
        
        // 마커 생성 및 표시
        hospitalPositions.forEach((hospital, index) => {
            const markerPosition = new kakao.maps.LatLng(hospital.lat, hospital.lng);
            
            // 마커 생성
            const marker = new kakao.maps.Marker({
                position: markerPosition,
                map: map
            });
            
            // 커스텀 마커 이미지 (의료기관 아이콘)
            const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png';
            const imageSize = new kakao.maps.Size(30, 35);
            const imageOption = { offset: new kakao.maps.Point(15, 35) };
            
            const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
            marker.setImage(markerImage);
            
            // 인포윈도우 생성
            const infowindow = new kakao.maps.InfoWindow({
                content: `<div style="padding:5px;font-size:12px;">${hospital.name}</div>`
            });
            
            // 마커 클릭 이벤트
            kakao.maps.event.addListener(marker, 'click', function() {
                infowindow.open(map, marker);
            });
        });
        
        // 지도 클릭 시 섹션 클릭 이벤트 방지
        kakao.maps.event.addListener(map, 'click', function() {
            // 지도 클릭 시 페이지 이동 방지
        });
    } else if (mapContainer) {
        // 카카오맵 API가 로드되지 않은 경우 플레이스홀더 표시
        mapContainer.innerHTML = `
            <div class="map-placeholder">
                <div class="map-pin-large">
                    <div class="pulse-ring"></div>
                    📍
                </div>
                <div class="hospital-markers">
                    <div class="hospital-marker">🏥</div>
                    <div class="hospital-marker">🏥</div>
                    <div class="hospital-marker">🏥</div>
                    <div class="hospital-marker">🏥</div>
                    <div class="hospital-marker">🏥</div>
                    <div class="hospital-marker">🏥</div>
                    <div class="hospital-marker">🏥</div>
                </div>
            </div>
        `;
    }
});

// 섹션 클릭 이벤트
document.addEventListener('DOMContentLoaded', function() {
    const clickableSections = document.querySelectorAll('.clickable-section');
    
    clickableSections.forEach(section => {
        section.addEventListener('click', function(e) {
            // 버튼이나 다른 클릭 가능한 요소를 클릭한 경우는 제외
            // 지도 영역 클릭 시에도 제외
            if (e.target.closest('.more-btn') || 
                e.target.closest('button') || 
                e.target.closest('#kakao-map')) {
                return;
            }
            
            const link = this.getAttribute('data-link');
            if (link) {
                // 확대 효과
                this.style.transform = 'scale(1.05)';
                
                // 페이지 이동
                setTimeout(() => {
                    window.location.href = link;
                }, 200);
            }
        });
        
        // 키보드 접근성 지원
        section.setAttribute('tabindex', '0');
        section.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const link = this.getAttribute('data-link');
                if (link) {
                    window.location.href = link;
                }
            }
        });
    });
    
    // 감염병 카드 클릭 이벤트
    const diseaseCards = document.querySelectorAll('.disease-card');
    diseaseCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // 섹션 클릭 이벤트와 충돌 방지
            e.stopPropagation();
            
            // 확대 효과
            this.style.transform = 'scale(1.05)';
            
            // 감염병 상세 페이지로 이동
            setTimeout(() => {
                window.location.href = 'diseases.html';
            }, 200);
        });
    });
});