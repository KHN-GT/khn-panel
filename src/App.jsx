import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Config from './pages/Config'

function PrivateRoute({ children }) {
  const authed = !!localStorage.getItem('khn_token')
  return authed ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('khn_token'))

  const handleLogin = () => setAuthed(true)
  const handleLogout = () => {
    localStorage.removeItem('khn_token')
    localStorage.removeItem('khn_user')
    setAuthed(false)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          authed ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/" element={
          <PrivateRoute>
            <Dashboard onLogout={handleLogout} />
          </PrivateRoute>
        } />
        <Route path="/config" element={
          <PrivateRoute>
            <Config onBack={() => window.history.back()} />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
