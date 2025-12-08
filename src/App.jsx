import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Main from './components/Main'
import HospitalDetail from './pages/HospitalDetail'
import Statistics from './pages/Statistics'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div className="app-wrapper">
              <Header />
              <Main />
            </div>
          }
        />
        <Route path="/hospitals" element={<HospitalDetail />} />
        <Route path="/statistics" element={<Statistics />} />
      </Routes>
    </Router>
  )
}
