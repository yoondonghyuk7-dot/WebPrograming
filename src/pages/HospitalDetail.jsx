import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/HospitalDetail.css'

export default function HospitalDetail() {
  const navigate = useNavigate()
  const [selectedHospital, setSelectedHospital] = useState(null)

  const hospitals = [
    {
      id: 1,
      name: '서울대학교병원',
      address: '서울시 종로구 대학로 101',
      phone: '02-2072-2114',
      department: '감염내과',
      beds: 50,
      rating: 4.8,
      distance: '1.2km'
    },
    {
      id: 2,
      name: '삼성서울병원',
      address: '서울시 강남구 일원로 81',
      phone: '02-3410-2114',
      department: '감염내과',
      beds: 45,
      rating: 4.7,
      distance: '2.5km'
    },
    {
      id: 3,
      name: '아산의료원',
      address: '서울시 송파구 올림픽로 43길 3',
      phone: '02-3010-5001',
      department: '감염내과',
      beds: 40,
      rating: 4.6,
      distance: '3.1km'
    },
    {
      id: 4,
      name: '서울성모병원',
      address: '서울시 서초구 반포대로 222',
      phone: '02-2258-1114',
      department: '감염내과',
      beds: 35,
      rating: 4.5,
      distance: '4.2km'
    },
    {
      id: 5,
      name: '강북삼성병원',
      address: '서울시 강북구 솔샘로 81',
      phone: '02-6901-0114',
      department: '감염내과',
      beds: 30,
      rating: 4.4,
      distance: '5.3km'
    },
    {
      id: 6,
      name: '국립중앙의료원',
      address: '서울시 중구 을지로 245',
      phone: '02-2260-7114',
      department: '감염병관리과',
      beds: 60,
      rating: 4.9,
      distance: '0.8km'
    }
  ]

  return (
    <div className="hospital-detail-container">
      <div className="hospital-detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 돌아가기
        </button>
        <h1>의료기관 정보</h1>
        <p>감염병 진료 가능한 의료기관 목록</p>
      </div>

      <div className="hospital-detail-content">
        {/* 필터링 섹션 */}
        <div className="filter-section">
          <div className="filter-item">
            <label>거리순</label>
            <select>
              <option>가까운순</option>
              <option>먼순</option>
            </select>
          </div>
          <div className="filter-item">
            <label>평점순</label>
            <select>
              <option>높은순</option>
              <option>낮은순</option>
            </select>
          </div>
          <div className="filter-item">
            <label>병상 수</label>
            <input type="number" placeholder="최소 병상 수" />
          </div>
        </div>

        {/* 병원 목록 */}
        <div className="hospitals-grid">
          {hospitals.map((hospital) => (
            <div
              key={hospital.id}
              className="hospital-card"
              onClick={() => setSelectedHospital(hospital)}
            >
              <div className="hospital-card-header">
                <h3>{hospital.name}</h3>
                <div className="hospital-rating">
                  <span className="star">★</span>
                  <span className="rating-value">{hospital.rating}</span>
                </div>
              </div>
              <div className="hospital-info">
                <p><strong>주소:</strong> {hospital.address}</p>
                <p><strong>전화:</strong> {hospital.phone}</p>
                <p><strong>진료과:</strong> {hospital.department}</p>
                <p><strong>병상 수:</strong> {hospital.beds}개</p>
                <p><strong>거리:</strong> {hospital.distance}</p>
              </div>
              <button className="detail-btn">상세보기 →</button>
            </div>
          ))}
        </div>
      </div>

      {/* 상세 정보 모달 */}
      {selectedHospital && (
        <div className="modal-overlay" onClick={() => setSelectedHospital(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedHospital(null)}>✕</button>
            <h2>{selectedHospital.name}</h2>
            <div className="modal-info">
              <div className="info-row">
                <span className="label">주소:</span>
                <span className="value">{selectedHospital.address}</span>
              </div>
              <div className="info-row">
                <span className="label">전화:</span>
                <span className="value">{selectedHospital.phone}</span>
              </div>
              <div className="info-row">
                <span className="label">진료과:</span>
                <span className="value">{selectedHospital.department}</span>
              </div>
              <div className="info-row">
                <span className="label">병상 수:</span>
                <span className="value">{selectedHospital.beds}개</span>
              </div>
              <div className="info-row">
                <span className="label">평점:</span>
                <span className="value">
                  <span className="star">★</span> {selectedHospital.rating}점
                </span>
              </div>
              <div className="info-row">
                <span className="label">거리:</span>
                <span className="value">{selectedHospital.distance}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="call-btn">전화 통화</button>
              <button className="map-btn">지도에서 보기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
