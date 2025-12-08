import { useNavigate } from 'react-router-dom'
import '../styles/Statistics.css'

export default function Statistics() {
  const navigate = useNavigate()

  const monthlyData = [
    { month: '1월', count: 245, trend: '+5%' },
    { month: '2월', count: 312, trend: '+27%' },
    { month: '3월', count: 278, trend: '-11%' },
    { month: '4월', count: 456, trend: '+64%' },
    { month: '5월', count: 389, trend: '-15%' },
    { month: '6월', count: 523, trend: '+35%' },
    { month: '7월', count: 412, trend: '-21%' },
    { month: '8월', count: 678, trend: '+65%' },
    { month: '9월', count: 567, trend: '-16%' },
    { month: '10월', count: 789, trend: '+39%' },
    { month: '11월', count: 643, trend: '-18%' },
    { month: '12월', count: 834, trend: '+30%' }
  ]

  const diseaseStats = [
    { name: '코로나19', count: 2845, percentage: 35, color: '#4285f4' },
    { name: '독감', count: 2123, percentage: 26, color: '#34a853' },
    { name: '결핵', count: 1567, percentage: 19, color: '#ea4335' },
    { name: '수두', count: 1023, percentage: 13, color: '#fbbc04' },
    { name: '기타', count: 456, percentage: 7, color: '#ff9800' }
  ]

  const topRegions = [
    { name: '서울특별시', count: 1856, percentage: 23 },
    { name: '경기도', count: 1543, percentage: 19 },
    { name: '부산광역시', count: 1234, percentage: 15 },
    { name: '대구광역시', count: 987, percentage: 12 },
    { name: '인천광역시', count: 745, percentage: 9 }
  ]

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 돌아가기
        </button>
        <h1>통계 정보</h1>
        <p>감염병 발생 현황 통계</p>
      </div>

      <div className="statistics-content">
        {/* 월별 통계 */}
        <section className="stats-section">
          <h2>월별 감염병 발생 현황</h2>
          <div className="chart-container monthly-chart">
            <svg viewBox="0 0 1000 400" className="bar-chart">
              {monthlyData.map((data, index) => {
                const barHeight = (data.count / 834) * 350
                const x = index * 80 + 30
                const y = 380 - barHeight

                return (
                  <g key={index}>
                    {/* 막대 */}
                    <rect
                      x={x}
                      y={y}
                      width="60"
                      height={barHeight}
                      fill="#4285f4"
                      rx="4"
                    />
                    {/* 레이블 */}
                    <text
                      x={x + 30}
                      y="395"
                      textAnchor="middle"
                      fontSize="12"
                      fill="#666"
                    >
                      {data.month}
                    </text>
                    {/* 값 */}
                    <text
                      x={x + 30}
                      y={y - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#333"
                      fontWeight="bold"
                    >
                      {data.count}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </section>

        {/* 감염병별 통계 */}
        <section className="stats-section">
          <h2>감염병별 발생 현황</h2>
          <div className="disease-stats">
            {diseaseStats.map((disease) => (
              <div key={disease.name} className="disease-stat-item">
                <div className="stat-header">
                  <h3>{disease.name}</h3>
                  <span className="stat-count">{disease.count}명</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${disease.percentage}%`,
                      backgroundColor: disease.color
                    }}
                  ></div>
                </div>
                <p className="stat-percentage">{disease.percentage}%</p>
              </div>
            ))}
          </div>
        </section>

        {/* 지역별 통계 */}
        <section className="stats-section">
          <h2>지역별 감염병 발생 현황</h2>
          <div className="region-stats">
            {topRegions.map((region, index) => (
              <div key={region.name} className="region-stat-item">
                <div className="rank">
                  <span className="rank-badge">{index + 1}</span>
                </div>
                <div className="region-info">
                  <h4>{region.name}</h4>
                  <p>{region.count}명</p>
                </div>
                <div className="region-progress">
                  <div
                    className="region-fill"
                    style={{ width: `${region.percentage}%` }}
                  ></div>
                </div>
                <span className="region-percentage">{region.percentage}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* 요약 통계 */}
        <section className="stats-section summary-section">
          <h2>주요 통계</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <h4>전체 감염자</h4>
              <p className="summary-value">8,214명</p>
              <span className="summary-change">+12.5%</span>
            </div>
            <div className="summary-card">
              <h4>월간 신규 감염자</h4>
              <p className="summary-value">834명</p>
              <span className="summary-change">+30%</span>
            </div>
            <div className="summary-card">
              <h4>주간 신규 감염자</h4>
              <p className="summary-value">187명</p>
              <span className="summary-change">+8.2%</span>
            </div>
            <div className="summary-card">
              <h4>최다 발생 질병</h4>
              <p className="summary-value">코로나19</p>
              <span className="summary-change">2,845명</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
