import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Config from './pages/Config'
import Reportes from './pages/Reportes'
import Supervision from './pages/Supervision'
import Usuarios from './pages/Usuarios'
import ReputacionShield from './pages/ReputacionShield'
import WhatsApp from './pages/WhatsApp'

function getUserRol() {
  try { return JSON.parse(localStorage.getItem('khn_user') || '{}').rol || 'operador' } catch { return 'operador' }
}

function PrivateRoute({ children }) {
  const authed = !!localStorage.getItem('khn_token')
  return authed ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const authed = !!localStorage.getItem('khn_token')
  if (!authed) return <Navigate to="/login" replace />
  if (getUserRol() !== 'admin') return <Navigate to="/" replace />
  return children
}

function SupervisorRoute({ children }) {
  const authed = !!localStorage.getItem('khn_token')
  if (!authed) return <Navigate to="/login" replace />
  const rol = getUserRol()
  if (!['admin', 'supervisor'].includes(rol)) return <Navigate to="/" replace />
  return children
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
          <PrivateRoute><Dashboard onLogout={handleLogout} /></PrivateRoute>
        } />
        <Route path="/supervision" element={
          <PrivateRoute><Supervision onLogout={handleLogout} /></PrivateRoute>
        } />
        <Route path="/reportes" element={
          <SupervisorRoute><Reportes onLogout={handleLogout} /></SupervisorRoute>
        } />
        <Route path="/config" element={
          <SupervisorRoute><Config onLogout={handleLogout} /></SupervisorRoute>
        } />
        <Route path="/usuarios" element={
          <AdminRoute><Usuarios onLogout={handleLogout} /></AdminRoute>
        } />
        <Route path="/reputacion" element={
          <SupervisorRoute><ReputacionShield onLogout={handleLogout} /></SupervisorRoute>
        } />
        <Route path="/whatsapp" element={
          <SupervisorRoute><WhatsApp onLogout={handleLogout} /></SupervisorRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
