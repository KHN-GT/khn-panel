import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import ConvPanel from '../components/ConvPanel'
import { useInbox } from '../hooks/useInbox'

// SSE desactivado temporalmente — se reactiva cuando el worker tenga CORS fix en Railway
// import { useSSE } from '../hooks/useSSE'

export default function Dashboard({ onLogout }) {
  const [acctFilter, setAcctFilter] = useState('Todas')
  const [selectedItem, setSelected] = useState(null)
  const [mobileTab, setMobileTab]   = useState('queue')
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768)

  const user = JSON.parse(localStorage.getItem('khn_user') || '{}')

  const { items, loading, error, approve, discard, correct, refresh } = useInbox({
    cuenta: acctFilter === 'Todas' ? '' : acctFilter,
  })

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

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

  const claimsCount  = items.filter(i => i.tipo === 'RECLAMO').length
  const pendingCount = items.length

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Topbar */}
      <div style={{ background:'var(--surface)', borderBottom:'1.5px solid var(--border)',
        padding:'0 18px', height:50, display:'flex', alignItems:'center', gap:12,
        flexShrink:0, boxShadow:'var(--shadow)', zIndex:10 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', letterSpacing:'-.4px' }}>
          KHN<span style={{ color:'var(--purple)' }}>_botics</span>
        </div>
        <div style={{ width:1, height:18, background:'var(--border)' }} />
        <div style={{ fontSize:12, color:'var(--text3)', fontWeight:500 }}>Panel de operaciones</div>

        {claimsCount > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:5,
            background:'var(--red-light)', border:'1px solid var(--red-border)',
            borderRadius:99, padding:'3px 10px' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--red)',
              animation:'pulse 1s infinite', flexShrink:0 }} />
            <span style={{ fontSize:11, fontWeight:700, color:'var(--red)' }}>
              {claimsCount} reclamo{claimsCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          {pendingCount > 0 && (
            <div style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
              background:'var(--purple-light)', color:'var(--purple)',
              border:'1px solid var(--purple-border)' }}>
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </div>
          )}
          <button onClick={refresh} title="Actualizar" style={{ fontSize:16, background:'none',
            border:'none', color:'var(--text3)', cursor:'pointer', padding:'4px 6px',
            borderRadius:6 }}>↺</button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--purple-light)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:700, color:'var(--purple)', border:'1px solid var(--purple-border)' }}>
              {(user.nombre || 'A').charAt(0).toUpperCase()}
            </div>
            <button onClick={onLogout} style={{ fontSize:11, color:'var(--text3)',
              background:'none', border:'none', cursor:'pointer', padding:'4px' }}>
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:'var(--red-light)', border:'1px solid var(--red-border)',
          padding:'8px 18px', fontSize:12, color:'var(--red)', flexShrink:0 }}>
          Error al cargar mensajes: {error} —
          <button onClick={refresh} style={{ background:'none', border:'none', color:'var(--red)',
            cursor:'pointer', fontWeight:600, marginLeft:4, fontSize:12 }}>
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
                flex:1, fontSize:12, fontWeight:600, padding:'11px 0', border:'none',
                background:'transparent', cursor:'pointer',
                color: mobileTab === tab ? 'var(--purple)' : 'var(--text3)',
                borderBottom: `2px solid ${mobileTab === tab ? 'var(--purple)' : 'transparent'}`,
              }}>
                {label}
                {tab === 'queue' && pendingCount > 0 && (
                  <span style={{ marginLeft:6, fontSize:10, fontWeight:700, padding:'1px 5px',
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
                  onSelect={handleSelect} acctFilter={acctFilter} onAcctFilter={setAcctFilter} />
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
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'285px 1fr', overflow:'hidden' }}>
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
              background:'var(--surface)', borderRight:'1.5px solid var(--border)' }}>
              <LoadingState />
            </div>
          ) : (
            <Sidebar items={items} selectedId={selectedItem?.id}
              onSelect={handleSelect} acctFilter={acctFilter} onAcctFilter={setAcctFilter} />
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
      justifyContent:'center', padding:40, color:'var(--text3)', gap:10 }}>
      <div style={{ width:20, height:20, border:'2px solid var(--purple)',
        borderTopColor:'transparent', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
      <div style={{ fontSize:12 }}>Cargando mensajes...</div>
    </div>
  )
}
