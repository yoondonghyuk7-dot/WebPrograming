// 의료기관 페이지 - TTL 데이터 기반 카카오맵 병원 표시

const API_BASE = window.__API_BASE ||
    (location.port === '8001'
        ? `${location.protocol}//${location.host}`
        : 'http://localhost:8001');

let map = null;
let currentPositionMarker = null;
let customMarker = null;
let hospitalMarkers = [];
let hospitalInfoWindows = [];
let allHospitals = [];
let currentSearchCenter = null;
let geocoder = null;
let searchRadiusCircle = null;
let places = null;

// 지도 클릭 모드 (normal: 일반, custom: 커스텀 마커 배치)
let mapClickMode = 'normal';

// 마커 추가 성공/실패 카운터
let markerSuccessCount = 0;
let markerFailCount = 0;
let totalToSearch = 0;

document.addEventListener('DOMContentLoaded', initHospitalsPage);

async function initHospitalsPage() {
    // 카카오맵 API 체크
    if (typeof kakao === 'undefined' || !kakao.maps) {
        document.getElementById('hospitalMap').innerHTML =
            '<div style="padding: 50px; text-align: center; color: #666;">' +
            '<p>카카오맵을 로드할 수 없습니다.</p>' +
            '<p>API 키를 확인해주세요.</p></div>';
        return;
    }

    // Geocoder, Places 초기화
    geocoder = new kakao.maps.services.Geocoder();
    places = new kakao.maps.services.Places();

    // 지도 초기화
    initMap();

    // 병원 데이터 로드
    await loadHospitalData();
}

function initMap() {
    const mapContainer = document.getElementById('hospitalMap');
    const defaultPosition = new kakao.maps.LatLng(37.5665, 126.9780); // 서울시청

    const mapOption = {
        center: defaultPosition,
        level: 5
    };

    map = new kakao.maps.Map(mapContainer, mapOption);

    // 지도 컨트롤 추가
    const zoomControl = new kakao.maps.ZoomControl();
    map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    // 지도 클릭 이벤트
    kakao.maps.event.addListener(map, 'click', handleMapClick);

    // 현재 위치 가져오기
    getCurrentLocation();
}

function getCurrentLocation() {
    updateStatus('현재 위치를 가져오는 중...');

    if (!navigator.geolocation) {
        updateStatus('위치 서비스를 지원하지 않습니다. 기본 위치를 사용합니다.');
        setDefaultLocation();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const currentPosition = new kakao.maps.LatLng(lat, lng);

            // 지도 중심 이동
            map.setCenter(currentPosition);
            currentSearchCenter = currentPosition;

            // 현재 위치 마커 추가
            addCurrentLocationMarker(currentPosition);

            // 주변 병원 검색
            searchNearbyHospitals();
        },
        (error) => {
            console.error('위치 가져오기 실패:', error);
            updateStatus('위치를 가져올 수 없습니다. 기본 위치를 사용합니다.');
            setDefaultLocation();
        },
        { timeout: 10000 }
    );
}

function setDefaultLocation() {
    const defaultPosition = new kakao.maps.LatLng(37.5665, 126.9780);
    map.setCenter(defaultPosition);
    currentSearchCenter = defaultPosition;
    addCurrentLocationMarker(defaultPosition);
    searchNearbyHospitals();
}

function addCurrentLocationMarker(position) {
    // 기존 현재 위치 마커 제거
    if (currentPositionMarker) {
        currentPositionMarker.setMap(null);
    }

    // 현재 위치 마커 (파란색 원형 + 펄스 애니메이션)
    const markerContent = document.createElement('div');
    markerContent.innerHTML = `
        <div class="current-location-marker">
            <div class="pulse-ring"></div>
            <div class="marker-dot"></div>
        </div>
    `;

    currentPositionMarker = new kakao.maps.CustomOverlay({
        position: position,
        content: markerContent,
        yAnchor: 0.5,
        xAnchor: 0.5
    });

    currentPositionMarker.setMap(map);
}

async function loadHospitalData() {
    try {
        updateStatus('병원 데이터를 불러오는 중...');

        const response = await fetch(`${API_BASE}/api/hospitals`);
        if (!response.ok) throw new Error('API 호출 실패');

        const data = await response.json();
        allHospitals = data.hospitals || [];

        console.log(`총 ${allHospitals.length}개 병원 데이터 로드됨`);

        // 주소 기반 좌표 변환
        await geocodeHospitals();

        // 주변 병원 검색 (좌표 변환 완료 후)
        if (currentSearchCenter) {
            searchNearbyHospitals();
        }

    } catch (error) {
        console.error('병원 데이터 로드 실패:', error);
        updateStatus('병원 데이터를 불러오는데 실패했습니다.');
    }
}

async function geocodeHospitals() {
    // 카카오 API로 주소 → 좌표 변환
    let geocodedCount = 0;

    for (let i = 0; i < allHospitals.length; i++) {
        const hospital = allHospitals[i];

        // 이미 좌표가 있으면 스킵
        if (hospital.lat && hospital.lng) continue;

        // 주소로 좌표 검색
        if (hospital.address) {
            try {
                const coords = await searchAddressToCoords(hospital.address);
                if (coords) {
                    hospital.lat = coords.lat;
                    hospital.lng = coords.lng;
                    geocodedCount++;
                }
            } catch (e) {
                console.warn(`좌표 변환 실패: ${hospital.name}`);
            }
        }

        // API 호출 제한 방지를 위한 딜레이
        if (i > 0 && i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log(`${geocodedCount}개 병원 좌표 변환 완료`);
}

function searchAddressToCoords(address) {
    return new Promise((resolve, reject) => {
        if (!geocoder) {
            reject('Geocoder not initialized');
            return;
        }

        geocoder.addressSearch(address, (result, status) => {
            if (status === kakao.maps.services.Status.OK && result[0]) {
                resolve({
                    lat: parseFloat(result[0].y),
                    lng: parseFloat(result[0].x)
                });
            } else {
                reject('Address not found');
            }
        });
    });
}

function searchNearbyHospitals() {
    if (!currentSearchCenter) return;

    const radius = parseInt(document.getElementById('radiusSelect')?.value || '3');
    const radiusMeters = radius * 1000;

    // 기존 마커 및 인포윈도우 제거
    clearHospitalMarkers();

    // 반경 내 병원 필터링
    const nearbyHospitals = allHospitals.filter(hospital => {
        if (!hospital.lat || !hospital.lng) return false;

        const hospitalPosition = new kakao.maps.LatLng(hospital.lat, hospital.lng);
        const distance = getDistance(currentSearchCenter, hospitalPosition);

        hospital.distance = distance;
        return distance <= radiusMeters;
    });

    // 거리순 정렬
    nearbyHospitals.sort((a, b) => a.distance - b.distance);

    // 카운터 초기화
    markerSuccessCount = 0;
    markerFailCount = 0;
    totalToSearch = nearbyHospitals.length;

    // 상태 업데이트
    const statusText = nearbyHospitals.length > 0
        ? `반경 ${radius}km 내 ${nearbyHospitals.length}개 의료기관 검색 중...`
        : `반경 ${radius}km 내 의료기관이 없습니다.`;
    updateStatus(statusText);

    // 검색 반경 원 표시
    drawSearchRadius(currentSearchCenter, radiusMeters);

    // 각 병원에 대해 카카오맵에서 검색 후 마커 표시
    nearbyHospitals.forEach((hospital, index) => {
        // API 호출 제한을 위해 딜레이 추가
        setTimeout(() => {
            searchAndAddMarker(hospital);
        }, index * 200);
    });
}

// 마커 카운터 업데이트 및 상태 표시
function updateMarkerCount(success) {
    if (success) {
        markerSuccessCount++;
    } else {
        markerFailCount++;
    }

    const completed = markerSuccessCount + markerFailCount;
    const radius = parseInt(document.getElementById('radiusSelect')?.value || '3');

    if (completed === totalToSearch) {
        updateStatus(`반경 ${radius}km 내 ${markerSuccessCount}개 의료기관 표시 완료`);
    } else {
        updateStatus(`반경 ${radius}km 내 의료기관 검색 중... (${completed}/${totalToSearch})`);
    }
}

// 이름이 URI인지 확인
function isUriName(name) {
    return name && name.startsWith('http');
}

// 주소에서 병원 이름 추출 시도 (예: "경기도 안양시 만안구 삼덕로 9 (안양동, 안양샘병원)" -> "안양샘병원")
function extractHospitalNameFromAddress(address) {
    if (!address) return null;
    // 괄호 안에 병원/의원 이름이 있는 경우 추출
    const match = address.match(/[,\s]([^,()]+(?:병원|의원|센터|의료원))\)?$/);
    if (match) {
        return match[1].trim();
    }
    return null;
}

// 카카오맵에서 병원 검색 후 마커 추가
function searchAndAddMarker(hospital) {
    // 이름이 URI인 경우 주소에서 병원명 추출 또는 주소로 검색
    let searchKeyword = hospital.name;

    if (isUriName(hospital.name)) {
        // 주소에서 병원명 추출 시도
        const extractedName = extractHospitalNameFromAddress(hospital.address);
        if (extractedName) {
            searchKeyword = extractedName;
            console.log(`URI 이름 -> 추출된 병원명: ${extractedName}`);
        } else if (hospital.address) {
            // 주소로 검색
            searchByAddress(hospital);
            return;
        } else {
            console.warn(`검색 불가: ${hospital.name} (주소 없음)`);
            updateMarkerCount(false);
            return;
        }
    }

    // 병원명으로 카카오맵 장소 검색
    places.keywordSearch(searchKeyword, function(result, status) {
        if (status === kakao.maps.services.Status.OK && result.length > 0) {
            // 검색 결과 중 가장 관련성 높은 병원 선택
            const place = result[0];
            addKakaoMarker(place, hospital);
        } else {
            // 병원명 검색 실패 시 주소로 검색
            if (hospital.address) {
                searchByAddress(hospital);
            } else {
                console.warn(`검색 실패: ${searchKeyword}`);
                updateMarkerCount(false);
            }
        }
    }, {
        category_group_code: 'HP8'  // 병원 카테고리
    });
}

// 주소 기반 검색
function searchByAddress(hospital) {
    // 주소에서 괄호 앞 부분만 추출 (도로명 주소)
    let cleanAddress = hospital.address;
    const parenIndex = cleanAddress.indexOf('(');
    if (parenIndex > 0) {
        cleanAddress = cleanAddress.substring(0, parenIndex).trim();
    }

    places.keywordSearch(cleanAddress + ' 병원', function(result, status) {
        if (status === kakao.maps.services.Status.OK && result.length > 0) {
            addKakaoMarker(result[0], hospital);
        } else {
            // 최후의 수단: 좌표 기반 주변 병원 검색
            if (hospital.lat && hospital.lng) {
                searchNearbyByCoords(hospital);
            } else {
                console.warn(`주소 검색 실패: ${hospital.address}`);
                updateMarkerCount(false);
            }
        }
    }, {
        category_group_code: 'HP8'
    });
}

// 좌표 기반 주변 병원 검색
function searchNearbyByCoords(hospital) {
    const coords = new kakao.maps.LatLng(hospital.lat, hospital.lng);

    places.categorySearch('HP8', function(result, status) {
        if (status === kakao.maps.services.Status.OK && result.length > 0) {
            // 가장 가까운 병원 선택
            addKakaoMarker(result[0], hospital);
        } else {
            console.warn(`좌표 검색 실패: ${hospital.lat}, ${hospital.lng}`);
            updateMarkerCount(false);
        }
    }, {
        location: coords,
        radius: 500  // 500m 반경
    });
}

// 카카오맵 마커와 인포윈도우 추가
function addKakaoMarker(place, hospitalData) {
    const position = new kakao.maps.LatLng(place.y, place.x);

    // 카카오맵 기본 마커 생성
    const marker = new kakao.maps.Marker({
        position: position,
        map: map
    });

    hospitalMarkers.push(marker);

    // 카카오맵 스타일 인포윈도우 내용 생성
    const iwContent = `
        <div style="padding:15px;width:280px;font-family:'Noto Sans KR',sans-serif;">
            <div style="font-size:16px;font-weight:bold;color:#333;margin-bottom:8px;">
                ${place.place_name}
            </div>
            <div style="font-size:13px;color:#666;margin-bottom:5px;">
                ${place.address_name}
            </div>
            ${place.road_address_name ? `
                <div style="font-size:12px;color:#888;margin-bottom:8px;">
                    (도로명) ${place.road_address_name}
                </div>
            ` : ''}
            ${place.phone ? `
                <div style="font-size:13px;color:#1e90ff;margin-bottom:8px;">
                    📞 ${place.phone}
                </div>
            ` : ''}
            ${hospitalData.isolationBeds ? `
                <div style="font-size:12px;color:#e67e22;font-weight:bold;margin-bottom:8px;">
                    🔒 음압격리병상 ${hospitalData.isolationBeds}개 보유
                </div>
            ` : ''}
            <div style="margin-top:10px;display:flex;gap:8px;">
                <a href="https://map.kakao.com/link/map/${place.id}" target="_blank"
                   style="flex:1;text-align:center;padding:8px;background:#f8f8f8;border-radius:4px;text-decoration:none;color:#333;font-size:12px;">
                    🗺️ 큰지도
                </a>
                <a href="https://map.kakao.com/link/to/${place.id}" target="_blank"
                   style="flex:1;text-align:center;padding:8px;background:#fee500;border-radius:4px;text-decoration:none;color:#333;font-size:12px;">
                    🚗 길찾기
                </a>
            </div>
            ${place.place_url ? `
                <div style="margin-top:8px;">
                    <a href="${place.place_url}" target="_blank"
                       style="display:block;text-align:center;padding:8px;background:#3396ff;border-radius:4px;text-decoration:none;color:white;font-size:12px;">
                        카카오맵에서 보기
                    </a>
                </div>
            ` : ''}
        </div>
    `;

    // 인포윈도우 생성
    const infowindow = new kakao.maps.InfoWindow({
        content: iwContent,
        removable: true  // X 버튼으로 닫기 가능
    });

    hospitalInfoWindows.push(infowindow);

    // 마커 클릭 시 인포윈도우 표시
    kakao.maps.event.addListener(marker, 'click', function() {
        // 다른 인포윈도우 모두 닫기
        hospitalInfoWindows.forEach(iw => iw.close());

        // 현재 인포윈도우 열기
        infowindow.open(map, marker);
    });

    console.log(`마커 추가: ${place.place_name}`);
    updateMarkerCount(true);
}

function getDistance(pos1, pos2) {
    const R = 6371000;
    const lat1 = pos1.getLat() * Math.PI / 180;
    const lat2 = pos2.getLat() * Math.PI / 180;
    const deltaLat = (pos2.getLat() - pos1.getLat()) * Math.PI / 180;
    const deltaLng = (pos2.getLng() - pos1.getLng()) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function drawSearchRadius(center, radiusMeters) {
    if (searchRadiusCircle) {
        searchRadiusCircle.setMap(null);
    }

    searchRadiusCircle = new kakao.maps.Circle({
        center: center,
        radius: radiusMeters,
        strokeWeight: 2,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.8,
        strokeStyle: 'dashed',
        fillColor: '#3b82f6',
        fillOpacity: 0.1
    });

    searchRadiusCircle.setMap(map);
}

function clearHospitalMarkers() {
    hospitalMarkers.forEach(marker => marker.setMap(null));
    hospitalMarkers = [];

    hospitalInfoWindows.forEach(iw => iw.close());
    hospitalInfoWindows = [];
}

function handleMapClick(mouseEvent) {
    if (mapClickMode !== 'custom') return;

    const latlng = mouseEvent.latLng;

    // 커스텀 마커 배치
    placeCustomMarker(latlng);

    // 검색 중심 변경
    currentSearchCenter = latlng;

    // 주변 병원 재검색
    searchNearbyHospitals();

    // 모드 리셋
    mapClickMode = 'normal';
    updatePlaceMarkerButton(false);
}

function placeCustomMarker(position) {
    if (customMarker) {
        customMarker.setMap(null);
    }

    const markerContent = document.createElement('div');
    markerContent.innerHTML = `
        <div class="custom-search-marker">
            <div class="custom-marker-pin">
                <span>📌</span>
            </div>
            <div class="custom-marker-label">검색 위치</div>
        </div>
    `;

    customMarker = new kakao.maps.CustomOverlay({
        position: position,
        content: markerContent,
        yAnchor: 1
    });

    customMarker.setMap(map);
}

function togglePlaceMarkerMode() {
    mapClickMode = mapClickMode === 'custom' ? 'normal' : 'custom';
    updatePlaceMarkerButton(mapClickMode === 'custom');

    if (mapClickMode === 'custom') {
        updateStatus('지도를 클릭하여 검색 위치를 선택하세요.');
    }
}

function updatePlaceMarkerButton(active) {
    const btn = document.getElementById('placeMarkerBtn');
    if (btn) {
        if (active) {
            btn.classList.add('active');
            btn.textContent = '❌ 취소';
        } else {
            btn.classList.remove('active');
            btn.textContent = '📌 마커 찍기';
        }
    }
}

function refreshMyLocation() {
    if (customMarker) {
        customMarker.setMap(null);
        customMarker = null;
    }

    getCurrentLocation();
}

function updateStatus(message) {
    const statusEl = document.getElementById('searchStatus');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function onRadiusChange() {
    searchNearbyHospitals();
}

// 전역 함수 노출
window.togglePlaceMarkerMode = togglePlaceMarkerMode;
window.refreshMyLocation = refreshMyLocation;
window.onRadiusChange = onRadiusChange;
