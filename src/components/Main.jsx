import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Main.css'

export default function Main() {
  const navigate = useNavigate()
  const [chartCanvas, setChartCanvas] = useState(null)

  useEffect(() => {
    if (chartCanvas) {
      drawChart(chartCanvas)
    }
  }, [chartCanvas])

  const drawChart = (canvas) => {
    const ctx = canvas.getContext('2d')
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 100
    const innerRadius = 60

    const data = [
      { label: '코로나19', value: 40, color: '#4285f4' },
      { label: '특감', value: 25, color: '#34a853' },
      { label: '장티푸스', value: 15, color: '#ea4335' },
      { label: '콜레라', value: 12, color: '#fbbc04' },
      { label: '기타', value: 8, color: '#ff9800' }
    ]

    let currentAngle = -Math.PI / 2

    data.forEach((item) => {
      const sliceAngle = (item.value / 100) * 2 * Math.PI

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true)
      ctx.closePath()
      ctx.fillStyle = item.color
      ctx.fill()

      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      currentAngle += sliceAngle
    })

    ctx.fillStyle = '#333'
    ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('감염병', centerX, centerY - 10)
    ctx.font = '16px Arial'
    ctx.fillText('통계', centerX, centerY + 15)
  }

  return (
    <div className="container">
      <main className="main-content">
        {/* 감염병 섹션 */}
        <section className="diseases-section">
          <h2>감염병</h2>
          <div className="disease-cards">
            <div className="disease-card grade1">
              <div className="disease-icon">🦠</div>
              <div className="grade-badge">1급</div>
              <h3>코로나19</h3>
              <p>코로나바이러스감염증-19는 SARS-CoV-2 바이러스에 의해 발생하는 호흡기 감염병입니다.</p>
              <button className="more-btn">더보기</button>
            </div>
            <div className="disease-card grade2">
              <div className="disease-icon">🦠</div>
              <div className="grade-badge">2급</div>
              <h3>특감</h3>
              <p>특정감염병은 법정감염병 중 특별한 관리가 필요한 감염병입니다.</p>
              <button className="more-btn">더보기</button>
            </div>
            <div className="disease-card grade3">
              <div className="disease-icon">🦠</div>
              <div className="grade-badge">3급</div>
              <h3>장티푸스</h3>
              <p>장티푸스는 살모넬라균에 의해 발생하는 전신성 감염병입니다.</p>
              <button className="more-btn">더보기</button>
            </div>
            <div className="disease-card grade1">
              <div className="disease-icon">🦠</div>
              <div className="grade-badge">1급</div>
              <h3>콜레라</h3>
              <p>콜레라는 비브리오 콜레라균에 의해 발생하는 급성 장관 감염병입니다.</p>
              <button className="more-btn">더보기</button>
            </div>
          </div>
          <button className="view-all-btn">모든 감염병 보기 →</button>
        </section>

        {/* 의료기관 섹션 */}
        <section className="hospitals-section">
          <h2>의료기관</h2>
          <div className="map-container">
            <div className="map-placeholder">
              <div className="map-pin-large">
                <div className="pulse-ring"></div>
                📍
              </div>
              <div className="hospital-markers">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="hospital-marker">🏥</div>
                ))}
              </div>
            </div>
          </div>
          <button className="view-all-btn" onClick={() => navigate('/hospitals')}>내 주변 병원 찾기 →</button>
        </section>

        {/* 통계 섹션 */}
        <section className="statistics-section">
          <h2>통계</h2>
          <div className="statistics-content">
            <div className="donut-chart-container">
              <canvas 
                id="donutChart" 
                width="300" 
                height="300"
                ref={setChartCanvas}
              ></canvas>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color blue"></span>
                <span>코로나19</span>
              </div>
              <div className="legend-item">
                <span className="legend-color green"></span>
                <span>특감</span>
              </div>
              <div className="legend-item">
                <span className="legend-color pink"></span>
                <span>장티푸스</span>
              </div>
              <div className="legend-item">
                <span className="legend-color light-green"></span>
                <span>콜레라</span>
              </div>
              <div className="legend-item">
                <span className="legend-color orange"></span>
                <span>기타</span>
              </div>
            </div>
          </div>
          <button className="view-all-btn" onClick={() => navigate('/statistics')}>상세 통계 보기 →</button>
        </section>
      </main>
    </div>
  )
}
