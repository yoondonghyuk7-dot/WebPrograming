import { useState } from 'react'
import './Header.css'

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [infoBannerVisible, setInfoBannerVisible] = useState(true)

  const handleSearch = (e) => {
    e.preventDefault()
    performSearch(searchQuery)
  }

  const handleQuickTag = (tag) => {
    setSearchQuery(tag)
    performSearch(tag)
  }

  const performSearch = (query) => {
    const diseaseCards = document.querySelectorAll('.disease-card')
    if (query.trim()) {
      diseaseCards.forEach(card => {
        const title = card.querySelector('h3')?.textContent.toLowerCase() || ''
        const description = card.querySelector('p')?.textContent.toLowerCase() || ''
        
        if (title.includes(query.toLowerCase()) || description.includes(query.toLowerCase())) {
          card.style.display = 'flex'
        } else {
          card.style.display = 'none'
        }
      })
    } else {
      diseaseCards.forEach(card => {
        card.style.display = 'flex'
      })
    }
  }

  return (
    <header className="header-section">
      {/* 배경 패턴 */}
      <div className="header-pattern">
        <div className="pattern-blob pattern-blob-1"></div>
        <div className="pattern-blob pattern-blob-2"></div>
      </div>

      <div className="header-wrapper">
        {/* 메인 타이틀 */}
        <div className="header-title-section">
          <h1 className="header-title">감염병 통합 정보 플랫폼</h1>
          <p className="header-subtitle">국내 감염병 현황을 한 곳에서 확인하세요</p>
        </div>

        {/* 검색창 */}
        <div className="header-search-wrapper">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-group">
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input 
                type="text" 
                className="search-input" 
                placeholder="감염병을 검색하세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="search-btn">검색</button>
            </div>
          </form>

          {/* 빠른 검색 태그 */}
          <div className="quick-search-tags">
            <span className="quick-search-label">인기 검색어:</span>
            {['코로나19', '독감', '결핵', '수두'].map((tag) => (
              <button
                key={tag}
                className="quick-tag"
                onClick={() => handleQuickTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 정보 메시지 */}
      {infoBannerVisible && (
        <div className="header-info-banner">
          <svg className="info-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span className="info-text">거동 감염병 예방 위해 손 씻기, 마스크 착용 등 기본 위생 수칙을 준수해주세요.</span>
          <button className="info-close-btn" onClick={() => setInfoBannerVisible(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
    </header>
  )
}
