import { useNavigate, useLocation } from 'react-router-dom'

const RAILWAY = 'https://worker-production-d575.up.railway.app'

export default function Topbar({ onLogout, pendingCount = 0, claimsCount = 0, onRefresh }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('khn_user') || '{}')
  const rol = user.rol || 'operador'
  const esSupervisorOAdmin = ['admin', 'supervisor'].includes(rol)
  const esAdmin = rol === 'admin'

  const navBtn = (path, label, title) => {
    const active = location.pathname === path
    return (
      <button onClick={() => navigate(path)} title={title}
        style={{ fontSize:13, fontWeight: active ? 700 : 500,
          background: active ? 'var(--purple-light)' : 'none',
          border: active ? '1px solid var(--purple-border)' : '1px solid transparent',
          color: active ? 'var(--purple)' : 'var(--text3)',
          cursor:'pointer', padding:'5px 10px', borderRadius:6, lineHeight:1 }}>
        {label}
      </button>
    )
  }

  return (
    <div style={{ height:48, padding:'0 18px', borderBottom:'1.5px solid var(--border)',
      background:'var(--surface)', flexShrink:0, display:'flex', alignItems:'center',
      gap:10, boxShadow:'var(--shadow)', zIndex:100 }}>

      {/* Logo */}
      <span onClick={() => navigate('/')} style={{ fontSize:16, fontWeight:800,
        color:'var(--purple)', cursor:'pointer', letterSpacing:'-0.5px', userSelect:'none' }}>
        KHN_botics
      </span>

      <span style={{ color:'var(--border2)', fontSize:16 }}>|</span>
      <span style={{ fontSize:13, color:'var(--text3)', fontWeight:500 }}>Panel de operaciones</span>

      {/* Badge reclamos */}
      {claimsCount > 0 && (
        <div onClick={() => navigate('/')}
          style={{ fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:99,
            background:'var(--red-light)', color:'var(--red)', border:'1px solid var(--red-border)',
            cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--red)', display:'inline-block' }}></span>
          {claimsCount} reclamo{claimsCount > 1 ? 's' : ''}
        </div>
      )}

      <div style={{ flex:1 }} />

      {/* Badge pendientes */}
      {pendingCount > 0 && (
        <div style={{ fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:99,
          background:'var(--purple-light)', color:'var(--purple)', border:'1px solid var(--purple-border)' }}>
          {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
        </div>
      )}

      {/* Refresh - solo en dashboard */}
      {onRefresh && (
        <button onClick={onRefresh} title="Actualizar"
          style={{ fontSize:16, background:'none', border:'none', color:'var(--text3)', cursor:'pointer', padding:'4px 6px', borderRadius:6 }}>
          &#8635;
        </button>
      )}

      {/* Nav buttons segun rol */}
      {navBtn('/supervision', 'Supervision', 'Supervision IA')}
      {esSupervisorOAdmin && navBtn('/reportes', 'Reportes', 'Reportes')}
      {esSupervisorOAdmin && navBtn('/config', 'Config', 'Configuracion')}
      {esAdmin && navBtn('/usuarios', 'Usuarios', 'Gestion de usuarios')}

      {/* Rol badge */}
      <div style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99, textTransform:'uppercase',
        background: esAdmin ? '#2d1f5e' : esSupervisorOAdmin ? '#1a3a2a' : 'var(--surface2)',
        color: esAdmin ? '#a78bfa' : esSupervisorOAdmin ? '#34d399' : 'var(--text3)',
        border: esAdmin ? '1px solid #4c1d95' : esSupervisorOAdmin ? '1px solid #065f46' : '1px solid var(--border)' }}>
        {rol}
      </div>

      {/* Avatar + Salir */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--purple-light)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:13, fontWeight:700, color:'var(--purple)', border:'1px solid var(--purple-border)' }}>
          {(user.nombre || user.username || 'A').charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize:12, color:'var(--text3)' }}>{user.nombre || user.username}</span>
        <button onClick={onLogout} style={{ fontSize:13, color:'var(--text3)',
          background:'none', border:'none', cursor:'pointer', padding:'4px' }}>
          Salir
        </button>
      </div>
    </div>
  )
}
