let map;
let currentMarker;
let hospitalMarkers = [];
let clinicMarkers = [];
let isolationMarkers = [];

// 카카오맵 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 카카오맵 API가 로드되지 않은 경우 처리
    if (typeof kakao === 'undefined' || !kakao.maps) {
        console.error('카카오맵 API를 로드할 수 없습니다. API 키를 확인해주세요.');
        document.getElementById('map').innerHTML = '<div style="padding: 50px; text-align: center; color: #666;"><p>카카오맵을 표시하려면 API 키가 필요합니다.</p><p>hospitals.html 파일에서 YOUR_KAKAO_APP_KEY를 실제 API 키로 교체해주세요.</p></div>';
        return;
    }
    
    // 카카오맵 API 로드
    kakao.maps.load(function() {
        // 기본 위치 (서울시청)
        const defaultPosition = new kakao.maps.LatLng(37.5665, 126.9780);
        
        // 지도 생성
        const mapContainer = document.getElementById('map');
        const mapOption = {
            center: defaultPosition,
            level: 5
        };
        
        map = new kakao.maps.Map(mapContainer, mapOption);
        
        // 현재 위치 가져오기
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const currentPos = new kakao.maps.LatLng(lat, lng);
                    
                    // 지도 중심 이동
                    map.setCenter(currentPos);
                    
                    // 현재 위치 마커 생성 (크게)
                    const currentImageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png';
                    const currentImageSize = new kakao.maps.Size(50, 50);
                    const currentImageOption = { offset: new kakao.maps.Point(25, 50) };
                    const currentMarkerImage = new kakao.maps.MarkerImage(currentImageSrc, currentImageSize, currentImageOption);
                    
                    currentMarker = new kakao.maps.Marker({
                        position: currentPos,
                        image: currentMarkerImage,
                        map: map
                    });
                    
                    // 현재 위치 인포윈도우
                    const currentInfoWindow = new kakao.maps.InfoWindow({
                        content: '<div style="padding:10px;text-align:center;"><b>현재 위치</b></div>'
                    });
                    currentInfoWindow.open(map, currentMarker);
                    
                    // 주변 의료기관 표시
                    showNearbyFacilities(currentPos);
                },
                function(error) {
                    console.error('위치 정보를 가져올 수 없습니다:', error);
                    // 기본 위치에 현재 위치 마커 표시
                    showCurrentLocationMarker(defaultPosition);
                    showNearbyFacilities(defaultPosition);
                }
            );
        } else {
            console.error('Geolocation을 지원하지 않습니다.');
            showCurrentLocationMarker(defaultPosition);
            showNearbyFacilities(defaultPosition);
        }
    });
});

// 현재 위치 마커 표시
function showCurrentLocationMarker(position) {
    const currentImageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png';
    const currentImageSize = new kakao.maps.Size(50, 50);
    const currentImageOption = { offset: new kakao.maps.Point(25, 50) };
    const currentMarkerImage = new kakao.maps.MarkerImage(currentImageSrc, currentImageSize, currentImageOption);
    
    currentMarker = new kakao.maps.Marker({
        position: position,
        image: currentMarkerImage,
        map: map
    });
    
    const currentInfoWindow = new kakao.maps.InfoWindow({
        content: '<div style="padding:10px;text-align:center;"><b>현재 위치</b></div>'
    });
    currentInfoWindow.open(map, currentMarker);
}

// 주변 의료기관 표시
function showNearbyFacilities(centerPosition) {
    // 샘플 의료기관 데이터 (실제로는 API에서 가져와야 함)
    const facilities = [
        // 병원 (파란색)
        { type: 'hospital', name: '서울대학교병원', lat: 37.5665 + 0.01, lng: 126.9780 + 0.01 },
        { type: 'hospital', name: '세브란스병원', lat: 37.5665 - 0.01, lng: 126.9780 + 0.01 },
        { type: 'hospital', name: '삼성서울병원', lat: 37.5665 + 0.015, lng: 126.9780 - 0.01 },
        
        // 의원 (초록색)
        { type: 'clinic', name: '강남내과의원', lat: 37.5665 + 0.005, lng: 126.9780 + 0.005 },
        { type: 'clinic', name: '서울가정의학과의원', lat: 37.5665 - 0.005, lng: 126.9780 - 0.005 },
        { type: 'clinic', name: '한강내과의원', lat: 37.5665 + 0.008, lng: 126.9780 + 0.008 },
        
        // 격리시설 (주황색)
        { type: 'isolation', name: '감염병 격리시설 A', lat: 37.5665 - 0.015, lng: 126.9780 - 0.015 },
        { type: 'isolation', name: '감염병 격리시설 B', lat: 37.5665 + 0.02, lng: 126.9780 + 0.02 },
    ];
    
    facilities.forEach(facility => {
        const position = new kakao.maps.LatLng(facility.lat, facility.lng);
        let markerImageSrc;
        let markerSize;
        
        if (facility.type === 'hospital') {
            // 병원 - 파란색 마커
            markerImageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_blue.png';
            markerSize = new kakao.maps.Size(40, 40);
        } else if (facility.type === 'clinic') {
            // 의원 - 초록색 마커
            markerImageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_green.png';
            markerSize = new kakao.maps.Size(35, 35);
        } else {
            // 격리시설 - 주황색 마커
            markerImageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_orange.png';
            markerSize = new kakao.maps.Size(40, 40);
        }
        
        const markerImageOption = { offset: new kakao.maps.Point(markerSize.width / 2, markerSize.height) };
        const markerImage = new kakao.maps.MarkerImage(markerImageSrc, markerSize, markerImageOption);
        
        const marker = new kakao.maps.Marker({
            position: position,
            image: markerImage,
            map: map
        });
        
        // 인포윈도우
        const infoWindow = new kakao.maps.InfoWindow({
            content: `<div style="padding:10px;text-align:center;"><b>${facility.name}</b><br>${facility.type === 'hospital' ? '병원' : facility.type === 'clinic' ? '의원' : '격리시설'}</div>`
        });
        
        // 마커 클릭 이벤트
        kakao.maps.event.addListener(marker, 'click', function() {
            infoWindow.open(map, marker);
        });
        
        // 마커 배열에 추가
        if (facility.type === 'hospital') {
            hospitalMarkers.push(marker);
        } else if (facility.type === 'clinic') {
            clinicMarkers.push(marker);
        } else {
            isolationMarkers.push(marker);
        }
    });
}