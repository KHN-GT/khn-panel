import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ConvPanel from '../components/ConvPanel'
import { useInbox } from '../hooks/useInbox'

export default function Dashboard({ onLogout }) {
  const [acctFilter, setAcctFilter] = useState('Todas')
  const [tipoFilter, setTipoFilter] = useState('RECLAMO')
  const [selectedItem, setSelected] = useState(null)
  const [mobileTab, setMobileTab]   = useState('queue')
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768)
  const navigate = useNavigate()

  const user = JSON.parse(localStorage.getItem('khn_user') || '{}')

  const { items, loading, error, approve, discard, correct, refresh } = useInbox({
    cuenta: acctFilter === 'Todas' ? '' : acctFilter,
  })

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (selectedItem && selectedItem.tipo !== tipoFilter) {
      setSelected(null)
    }
  }, [tipoFilter])

  const handleSelect = (item) => {
    setSelected(item)
    if (isMobile) setMobileTab('conv')
  }

  const handleApprove = async (id, respuesta) => {
    await approve(id, respuesta)
    setSelected(null)
  }

  const handleDiscard = async (id) => {
    await discard(id)
    setSelected(null)
  }

  const counts = {
    'RECLAMO':    items.filter(i => i.tipo === 'RECLAMO').length,
    'POST-VENTA': items.filter(i => i.tipo === 'POST-VENTA').length,
    'PRE-COMPRA': items.filter(i => i.tipo === 'PRE-COMPRA').length,
  }
  const pendingCount = items.length
  const claimsCount  = counts['RECLAMO']

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', fontSize:15 }}>

      {/* Topbar */}
      <div style={{ background:'var(--surface)', borderBottom:'1.5px solid var(--border)',
        padding:'0 20px', height:54, display:'flex', alignItems:'center', gap:14,
        flexShrink:0, boxShadow:'var(--shadow)', zIndex:10 }}>

        <div style={{ fontSize:17, fontWeight:800, color:'var(--text)', letterSpacing:'-.4px' }}>
          KHN<span style={{ color:'var(--purple)' }}>_botics</span>
        </div>
        <div style={{ width:1, height:20, background:'var(--border)' }} />
        <div style={{ fontSize:13, color:'var(--text3)', fontWeight:500 }}>Panel de operaciones</div>

        {claimsCount > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:6,
            background:'var(--red-light)', border:'1px solid var(--red-border)',
            borderRadius:99, padding:'4px 12px' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--red)',
              animation:'pulse 1s infinite', flexShrink:0 }} />
            <span style={{ fontSize:12, fontWeight:800, color:'var(--red)' }}>
              {claimsCount} reclamo{claimsCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          {pendingCount > 0 && (
            <div style={{ fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:99,
              background:'var(--purple-light)', color:'var(--purple)',
              border:'1px solid var(--purple-border)' }}>
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </div>
          )}
          <button onClick={refresh} title="Actualizar" style={{ fontSize:18, background:'none',
            border:'none', color:'var(--text3)', cursor:'pointer', padding:'4px 6px', borderRadius:6 }}>↺</button>

          {/* Botón Reportes */}
          <button onClick={() => navigate('/supervision')} title="Supervisión IA"
            style={{ fontSize:15, background:'none', border:'none', color:'var(--text3)',
              cursor:'pointer', padding:'4px 6px', borderRadius:6 }}>🔍</button>

          <button onClick={() => navigate('/reportes')} title="Reportes" 
            style={{ fontSize:15, background:'none', border:'none', color:'var(--text3)',
              cursor:'pointer', padding:'4px 6px', borderRadius:6 }}>📊</button>

          {/* Botón Reputación */}
          <button onClick={() => navigate('/reputacion')} title="Reputation Shield"
            style={{ fontSize:18, background:'none', border:'none',
              cursor:'pointer', padding:'4px 6px', borderRadius:6 }}>{'\uD83D\uDEE1\uFE0F'}</button>

          {/* Botón Configuración */}
          <button onClick={() => navigate('/config')} title="Configuración"
            style={{ fontSize:15, background:'none', border:'none', color:'var(--text3)',
              cursor:'pointer', padding:'4px 6px', borderRadius:6 }}>⚙️</button>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--purple-light)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:700, color:'var(--purple)',
              border:'1px solid var(--purple-border)' }}>
              {(user.nombre || 'A').charAt(0).toUpperCase()}
            </div>
            <button onClick={onLogout} style={{ fontSize:13, color:'var(--text3)',
              background:'none', border:'none', cursor:'pointer', padding:'4px' }}>
              Salir
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background:'var(--red-light)', border:'1px solid var(--red-border)',
          padding:'8px 20px', fontSize:13, color:'var(--red)', flexShrink:0 }}>
          Error: {error} —
          <button onClick={refresh} style={{ background:'none', border:'none', color:'var(--red)',
            cursor:'pointer', fontWeight:700, marginLeft:4, fontSize:13 }}>
            Reintentar
          </button>
        </div>
      )}

      {/* Layout */}
      {isMobile ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'flex', borderBottom:'1.5px solid var(--border)',
            background:'var(--surface)', flexShrink:0 }}>
            {[['queue','Cola'],['conv','Conversación']].map(([tab, label]) => (
              <button key={tab} onClick={() => setMobileTab(tab)} style={{
                flex:1, fontSize:13, fontWeight:600, padding:'12px 0', border:'none',
                background:'transparent', cursor:'pointer',
                color: mobileTab === tab ? 'var(--purple)' : 'var(--text3)',
                borderBottom: `2px solid ${mobileTab === tab ? 'var(--purple)' : 'transparent'}`,
              }}>
                {label}
                {tab === 'queue' && pendingCount > 0 && (
                  <span style={{ marginLeft:6, fontSize:11, fontWeight:700, padding:'1px 6px',
                    borderRadius:99, background:'var(--purple-light)', color:'var(--purple)' }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          {mobileTab === 'queue' ? (
            <div style={{ flex:1, overflow:'hidden', background:'var(--surface)' }}>
              {loading ? <LoadingState /> : (
                <Sidebar items={items} selectedId={selectedItem?.id}
                  onSelect={handleSelect} acctFilter={acctFilter} onAcctFilter={setAcctFilter}
                  tipoFilter={tipoFilter} onTipoFilter={setTipoFilter} />
              )}
            </div>
          ) : (
            <div style={{ flex:1, overflow:'hidden' }}>
              <ConvPanel item={selectedItem} onApprove={handleApprove}
                onDiscard={handleDiscard} onCorrect={correct} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'310px 1fr', overflow:'hidden' }}>
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
              background:'var(--surface)', borderRight:'1.5px solid var(--border)' }}>
              <LoadingState />
            </div>
          ) : (
            <Sidebar items={items} selectedId={selectedItem?.id}
              onSelect={handleSelect} acctFilter={acctFilter} onAcctFilter={setAcctFilter}
              tipoFilter={tipoFilter} onTipoFilter={setTipoFilter} />
          )}
          <ConvPanel item={selectedItem} onApprove={handleApprove}
            onDiscard={handleDiscard} onCorrect={correct} />
        </div>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:40, color:'var(--text3)', gap:12 }}>
      <div style={{ width:22, height:22, border:'2.5px solid var(--purple)',
        borderTopColor:'transparent', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
      <div style={{ fontSize:14 }}>Cargando mensajes...</div>
    </div>
  )
}
