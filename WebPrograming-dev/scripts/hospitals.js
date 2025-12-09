let map; // hospitals.html에서 사용될 메인 지도
let miniMap; // index.html에서 사용될 미니 지도
let currentMarker;
let hospitalMarkers = [];
let clinicMarkers = [];
let isolationMarkers = [];

// **********************************************
// 🚨 주소를 받아 마커와 인포윈도우를 표시하는 최종 함수
// **********************************************
function displayMarker(position, targetMap, addressText, isMiniMap = false) {
    // 1. 현재 위치 마커 이미지 설정 (기존 로직 유지)
    const currentImageSrc =
        "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png";
    const size = isMiniMap ? 30 : 50;
    const currentImageSize = new kakao.maps.Size(size, size);
    const currentImageOption = { offset: new kakao.maps.Point(size / 2, size) };
    const currentMarkerImage = new kakao.maps.MarkerImage(
        currentImageSrc,
        currentImageSize,
        currentImageOption
    );

    // 2. 마커 생성
    currentMarker = new kakao.maps.Marker({
        position: position,
        image: currentMarkerImage,
        map: targetMap,
    });

    // 3. 인포윈도우 표시 (메인 지도에서만 주소 포함하여 표시)
    if (!isMiniMap) {
        // addressText가 있을 경우에만 주소 표시
        const displayAddress = addressText
            ? addressText
            : "위치 정보를 가져올 수 없습니다.";

        const infoWindowContent = `
            <div style="padding:10px;text-align:center;">
                <b>현재 위치</b><br>
                ${displayAddress}
            </div>`;

        const currentInfoWindow = new kakao.maps.InfoWindow({
            content: infoWindowContent,
        });
        currentInfoWindow.open(targetMap, currentMarker);
    }
}

// **********************************************
// 🚨 좌표를 주소로 변환하는 핵심 로직 (Reverse Geocoding)
// **********************************************
function getAddressFromCoords(position, targetMap, isMiniMap) {
    // 카카오맵 API가 로드되지 않았거나 Geocoder 서비스가 없는 경우 대비
    if (
        typeof kakao.maps.services === "undefined" ||
        !kakao.maps.services.Geocoder
    ) {
        // 주소 없이 기본 마커만 표시
        displayMarker(
            position,
            targetMap,
            "주소 변환 서비스 로드 실패",
            isMiniMap
        );
        return;
    }

    const geocoder = new kakao.maps.services.Geocoder();

    geocoder.coord2Address(
        position.getLng(),
        position.getLat(),
        function (result, status) {
            let addressText = "";

            if (status === kakao.maps.services.Status.OK && result[0]) {
                // 도로명 주소 또는 지번 주소를 가져옴
                const roadAddr = result[0].road_address
                    ? result[0].road_address.address_name
                    : "";
                const jibunAddr = result[0].address
                    ? result[0].address.address_name
                    : "";

                // '현재 위치 : (주소)' 형식으로 표시
                addressText = `현재 위치: ${roadAddr || jibunAddr}`;
            } else {
                // 주소 변환 실패 시 인포윈도우에 표시할 텍스트
                addressText = "주소 정보 확인 불가";
                console.error("주소 변환 실패:", status);
            }

            // 최종적으로 마커 표시 함수 호출
            displayMarker(position, targetMap, addressText, isMiniMap);
        }
    );
}

// 주변 의료기관 표시 함수 (기존과 동일)
function showNearbyFacilities(targetMap) {
    // 🚨 LOD에서 가져온다고 가정한 통합 데이터 (서울/경기 북부 포함)
    const facilities = [
        // 🚨 서울/경기 북부 지역 병원 (파란색 마커로 표시됨)
        {
            type: "hospital",
            name: "파주 운정 병원",
            lat: 37.7552,
            lng: 126.7641,
        },
        {
            type: "hospital",
            name: "양주 덕정 병원",
            lat: 37.8504,
            lng: 127.0545,
        },
        { type: "hospital", name: "김포 우리 병원", lat: 37.6213, lng: 126.68 },
        {
            type: "hospital",
            name: "고양 명지 병원",
            lat: 37.6698,
            lng: 126.8202,
        },
        {
            type: "hospital",
            name: "의정부 성모 병원",
            lat: 37.747,
            lng: 127.126,
        },

        // 기존 서울 중심 데이터
        {
            type: "hospital",
            name: "서울대학교병원",
            lat: 37.5818,
            lng: 127.0003,
        },
        { type: "hospital", name: "세브란스병원", lat: 37.562, lng: 126.9388 },
        { type: "hospital", name: "삼성서울병원", lat: 37.4882, lng: 127.0858 },

        // 의원 (초록색)
        { type: "clinic", name: "강남내과의원", lat: 37.5052, lng: 127.025 },
        { type: "clinic", name: "서울가정의학과의원", lat: 37.53, lng: 126.99 },

        // 격리시설 (주황색)
        {
            type: "isolation",
            name: "감염병 격리시설 A",
            lat: 37.58,
            lng: 127.05,
        },
        {
            type: "isolation",
            name: "감염병 격리시설 B",
            lat: 37.65,
            lng: 127.1,
        },
    ];

    facilities.forEach((facility) => {
        const position = new kakao.maps.LatLng(facility.lat, facility.lng);
        let markerImageSrc;
        let markerSize;

        if (facility.type === "hospital") {
            markerImageSrc =
                "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_blue.png";
            markerSize = new kakao.maps.Size(40, 40);
        } else if (facility.type === "clinic") {
            markerImageSrc =
                "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_green.png";
            markerSize = new kakao.maps.Size(35, 35);
        } else {
            markerImageSrc =
                "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_orange.png";
            markerSize = new kakao.maps.Size(40, 40);
        }

        const markerImageOption = {
            offset: new kakao.maps.Point(
                markerSize.width / 2,
                markerSize.height
            ),
        };
        const markerImage = new kakao.maps.MarkerImage(
            markerImageSrc,
            markerSize,
            markerImageOption
        );

        const marker = new kakao.maps.Marker({
            position: position,
            image: markerImage,
            map: targetMap, // 마커를 해당 지도에 올립니다.
        });

        // 메인 지도(hospitals.html)에서만 인포윈도우와 클릭 이벤트를 추가합니다.
        if (targetMap === map) {
            const infoWindow = new kakao.maps.InfoWindow({
                content: `<div style="padding:10px;text-align:center;"><b>${
                    facility.name
                }</b><br>${
                    facility.type === "hospital"
                        ? "병원"
                        : facility.type === "clinic"
                        ? "의원"
                        : "격리시설"
                }</div>`,
            });

            kakao.maps.event.addListener(marker, "click", function () {
                infoWindow.open(targetMap, marker);
            });

            // 마커 배열에 추가 (메인 지도 마커만 관리)
            if (facility.type === "hospital") {
                hospitalMarkers.push(marker);
            } else if (facility.type === "clinic") {
                clinicMarkers.push(marker);
            } else {
                isolationMarkers.push(marker);
            }
        }
    });
}

// 메인 지도 (hospitals.html) 초기화 함수
// hospitals.js 파일 수정

// 메인 지도 (hospitals.html) 초기화 함수
function initMainMap() {
    const defaultPosition = new kakao.maps.LatLng(37.5665, 126.978);
    const mapContainer = document.getElementById("map");

    if (!mapContainer) return;

    const mapOption = {
        center: defaultPosition,
        level: 5,
    };

    map = new kakao.maps.Map(mapContainer, mapOption);

    // *******************************************************************
    // 🚨 1. 지도 컨트롤 추가 및 위치 수정 (Zoom/현위치: RIGHT, 지도타입: TOPRIGHT)
    // *******************************************************************

    // B. 지도 타입 컨트롤 (지도/스카이뷰 전환 버튼)은 오른쪽 상단에 유지합니다.
    const mapTypeControl = new kakao.maps.MapTypeControl();
    map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);

    // A. 줌 컨트롤 (확대/축소 버튼)을 RIGHT에 추가합니다. (수직 중앙 기준)
    const zoomControl = new kakao.maps.ZoomControl();
    map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT); // 🚨 RIGHT로 변경

    // C. 커스텀 현위치 버튼을 생성하고 RIGHT에 추가합니다.
    const currentLocationBtn = document.createElement("div");
    currentLocationBtn.className = "custom-current-location-control";
    currentLocationBtn.title = "현위치 이동";

    // 버튼 스타일 (이전과 동일하게 설정)
    currentLocationBtn.innerHTML = "📍";
    currentLocationBtn.style.cssText =
        "width: 36px; height: 36px; background-color: #fff; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); cursor: pointer; text-align: center; line-height: 36px; font-size: 18px; margin-top: 5px;"; // 🚨 CSS로 간격 조정을 위한 margin-top 추가

    // 버튼 클릭 이벤트 리스너 추가 (로직 유지)
    currentLocationBtn.onclick = function () {
        if (navigator.geolocation) {
            // ... (Geolocation 로직 유지) ...
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const currentPos = new kakao.maps.LatLng(lat, lng);
                    map.setCenter(currentPos); // 지도를 현재 위치로 이동
                },
                function (error) {
                    alert("위치 정보를 가져오는 데 실패했습니다.");
                    console.error("위치 정보 오류:", error);
                }
            );
        } else {
            alert("Geolocation을 지원하지 않는 브라우저입니다.");
        }
    };

    // 🚨 현위치 버튼도 RIGHT에 추가하여 ZoomControl 바로 아래에 쌓이도록 합니다.
    map.addControl(currentLocationBtn, kakao.maps.ControlPosition.RIGHT);

    // *******************************************************************
    // 🚨 지도 컨트롤 추가 (수정 부분 끝)
    // *******************************************************************

    // ... (기존 현재 위치 가져오기 로직 유지) ...
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const currentPos = new kakao.maps.LatLng(lat, lng);

                map.setCenter(currentPos);
                // 🚨 주소 변환 후 마커 표시 (주소 필요)
                getAddressFromCoords(currentPos, map, false);
                showNearbyFacilities(map);
            },
            function (error) {
                console.error("위치 정보를 가져올 수 없습니다:", error);
                // 🚨 위치 오류 시 기본 위치로 주소 변환 후 마커 표시
                getAddressFromCoords(defaultPosition, map, false);
                showNearbyFacilities(map);
            }
        );
    } else {
        // 🚨 Geolocation 미지원 시 기본 위치로 주소 변환 후 마커 표시
        getAddressFromCoords(defaultPosition, map, false);
        showNearbyFacilities(map);
    }
}

// 미니맵 (index.html) 초기화 함수
function initMiniMap() {
    const defaultPosition = new kakao.maps.LatLng(37.5665, 126.978);
    const miniMapContainer = document.getElementById("miniMap");

    if (!miniMapContainer) return;

    const mapOption = {
        center: defaultPosition,
        level: 8, // 넓은 범위로 미니맵 표시
        draggable: false,
        scrollwheel: false,
        disableDoubleClick: true,
    };

    miniMap = new kakao.maps.Map(miniMapContainer, mapOption);

    // 현재 위치 가져오기
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const currentPos = new kakao.maps.LatLng(lat, lng);

                miniMap.setCenter(currentPos);
                // 🚨 미니맵은 주소 없이 마커만 표시
                displayMarker(currentPos, miniMap, null, true);
                showNearbyFacilities(miniMap);
            },
            function (error) {
                // 🚨 위치 오류 시 기본 위치에 마커만 표시
                displayMarker(defaultPosition, miniMap, null, true);
                showNearbyFacilities(miniMap);
            }
        );
    } else {
        // 🚨 Geolocation 미지원 시 기본 위치에 마커만 표시
        displayMarker(defaultPosition, miniMap, null, true);
        showNearbyFacilities(miniMap);
    }
}

// 🚨 DOMContentLoaded 시 페이지에 따라 적절한 지도 초기화 함수 호출
document.addEventListener("DOMContentLoaded", function () {
    // API 키 로드 여부 체크 (hospitals.html에 있는 로직 유지)
    const mapDiv = document.getElementById("map");
    if (mapDiv && (typeof kakao === "undefined" || !kakao.maps)) {
        console.error(
            "카카오맵 API를 로드할 수 없습니다. API 키를 확인해주세요."
        );
        mapDiv.innerHTML =
            '<div style="padding: 50px; text-align: center; color: #666;"><p>카카오맵을 표시하려면 API 키가 필요합니다.</p><p>hospitals.html 파일에서 YOUR_KAKAO_APP_KEY를 실제 API 키로 교체하고 services 라이브러리를 추가해주세요.</p></div>';
        return;
    }

    kakao.maps.load(function () {
        if (document.getElementById("map")) {
            // hospitals.html (메인 지도 페이지)
            initMainMap();
        } else if (document.getElementById("miniMap")) {
            // index.html (미니맵 페이지)
            initMiniMap();
        }
    });
});