// 검색 기능 및 빠른 검색 태그
document.addEventListener("DOMContentLoaded", function () {
    const searchForm = document.getElementById("searchForm");
    const searchBtn = document.querySelector(".search-btn");
    const searchInput = document.getElementById("searchInput");
    const quickTags = document.querySelectorAll(".quick-tag");
    const infoCloseBtn = document.getElementById("infoCloseBtn");

    // 검색 제출
    if (searchForm) {
        searchForm.addEventListener("submit", function (e) {
            e.preventDefault();
            performSearch(searchInput.value);
        });
    }

    // 빠른 검색 태그
    quickTags.forEach((tag) => {
        tag.addEventListener("click", function () {
            const query = this.getAttribute("data-query");
            searchInput.value = query;
            performSearch(query);
        });
    });

    // 정보 배너 닫기
    if (infoCloseBtn) {
        infoCloseBtn.addEventListener("click", function () {
            const infoBanner = document.querySelector(".header-info-banner");
            infoBanner.style.display = "none";
        });
    }

    function performSearch(query) {
        if (query.trim()) {
            const diseaseCards = document.querySelectorAll(".disease-card");
            diseaseCards.forEach((card) => {
                const title = card
                    .querySelector("h3")
                    .textContent.toLowerCase();
                const description = card
                    .querySelector("p")
                    .textContent.toLowerCase();

                if (
                    title.includes(query.toLowerCase()) ||
                    description.includes(query.toLowerCase())
                ) {
                    card.style.display = "flex";
                } else {
                    card.style.display = "none";
                }
            });
        } else {
            const diseaseCards = document.querySelectorAll(".disease-card");
            diseaseCards.forEach((card) => {
                card.style.display = "flex";
            });
        }
    }
});

// 메인 페이지 도넛 차트 그리기
document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("donutChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    const innerRadius = 60;

    // 샘플 데이터
    const data = [
        { label: "코로나19", value: 40, color: "#4285f4" },
        { label: "특감", value: 25, color: "#34a853" },
        { label: "장티푸스", value: 15, color: "#ea4335" },
        { label: "콜레라", value: 12, color: "#fbbc04" },
        { label: "기타", value: 8, color: "#ff9800" },
    ];

    let currentAngle = -Math.PI / 2; // 시작 각도 (12시 방향)

    data.forEach((item, index) => {
        const sliceAngle = (item.value / 100) * 2 * Math.PI;

        // 외부 호 그리기
        ctx.beginPath();
        ctx.arc(
            centerX,
            centerY,
            radius,
            currentAngle,
            currentAngle + sliceAngle
        );
        ctx.arc(
            centerX,
            centerY,
            innerRadius,
            currentAngle + sliceAngle,
            currentAngle,
            true
        );
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();

        // 테두리
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        currentAngle += sliceAngle;
    });

    // 중앙 텍스트
    ctx.fillStyle = "#333";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("감염병", centerX, centerY - 10);
    ctx.font = "16px Arial";
    ctx.fillText("통계", centerX, centerY + 15);
});
