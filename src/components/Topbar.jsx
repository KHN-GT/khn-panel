import { useNavigate, useLocation } from 'react-router-dom'

const RAILWAY = 'https://worker-production-d575.up.railway.app'

export default function Topbar({ onLogout, pendingCount = 0, claimsCount = 0, onRefresh }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('khn_user') || '{}')

  const navBtn = (path, icon, title) => {
    const active = location.pathname === path
    return (
      <button onClick={() => navigate(path)} title={title}
        style={{ fontSize:15, background: active ? 'var(--purple-light)' : 'none',
          border: active ? '1px solid var(--purple-border)' : 'none',
          color: active ? 'var(--purple)' : 'var(--text3)',
          cursor:'pointer', padding:'5px 8px', borderRadius:6, lineHeight:1 }}>
        {icon}
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

      {/* Espaciador */}
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
          style={{ fontSize:18, background:'none', border:'none', color:'var(--text3)', cursor:'pointer', padding:'4px 6px', borderRadius:6 }}>
          ↺
        </button>
      )}

      {/* Nav buttons */}
      {navBtn('/supervision', '🔍', 'Supervisión IA')}
      {navBtn('/reportes',   '📊', 'Reportes')}
      {navBtn('/config',     '⚙️', 'Configuración')}

      {/* Avatar + Salir */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--purple-light)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:13, fontWeight:700, color:'var(--purple)', border:'1px solid var(--purple-border)' }}>
          {(user.nombre || 'A').charAt(0).toUpperCase()}
        </div>
        <button onClick={onLogout} style={{ fontSize:13, color:'var(--text3)',
          background:'none', border:'none', cursor:'pointer', padding:'4px' }}>
          Salir
        </button>
      </div>
    </div>
  )
}
