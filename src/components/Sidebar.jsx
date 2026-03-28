import { useState } from 'react'
import MessageCard from './MessageCard'

const TABS = [
  { id: 'RECLAMO',    label: 'Reclamos',   color: 'var(--red)',    bg: 'var(--red-light)',    br: 'var(--red-border)' },
  { id: 'POST-VENTA', label: 'Post-venta', color: 'var(--amber)',  bg: 'var(--amber-light)',  br: 'var(--amber-border)' },
  { id: 'PRE-COMPRA', label: 'Preguntas',  color: 'var(--purple)', bg: 'var(--purple-light)', br: 'var(--purple-border)' },
]
const ACCT_BTNS = ['Todas', 'GTK', 'RBN', 'GDP']
const RAILWAY = 'https://worker-production-d575.up.railway.app'

export default function Sidebar({ items, selectedId, onSelect, acctFilter, onAcctFilter, tipoFilter, onTipoFilter }) {
  const [etqFilter, setEtqFilter] = useState(null)
  const [reclamoSubTab, setReclamoSubTab] = useState('activos')  // etiqueta seleccionada para filtrar
  const [postvtSubTab,  setPostvtSubTab]  = useState('pendientes')
  const [etqOpciones, setEtqOpciones] = useState([])
  const [showEtqFilter, setShowEtqFilter] = useState(false)

  const loadEtqOpciones = async () => {
    if (etqOpciones.length > 0) { setShowEtqFilter(!showEtqFilter); return }
    const token = localStorage.getItem('khn_token')
    try {
      const r = await fetch(`${RAILWAY}/api/etiquetas`, { headers: { 'Authorization': `Bearer ${token}` } })
      const d = await r.json()
      setEtqOpciones(d.etiquetas || [])
      setShowEtqFilter(true)
    } catch {}
  }

  const byTipo = (tipo) => items.filter(i =>
    i.tipo === tipo && (acctFilter === 'Todas' || i.cuenta === acctFilter)
  )
  const counts = {
    'RECLAMO':    byTipo('RECLAMO').length,
    'POST-VENTA': byTipo('POST-VENTA').length,
    'PRE-COMPRA': byTipo('PRE-COMPRA').length,
  }
  // El filtro por etiqueta no está en el objeto item directamente,
  // así que lo mostramos como indicador visual por ahora
  const filteredBase = byTipo(tipoFilter)
  const filtered = tipoFilter === 'RECLAMO'
    ? filteredBase.filter(i => reclamoSubTab === 'en_espera'
        ? i.estado === 'en_espera'
        : i.estado !== 'en_espera')
    : tipoFilter === 'POST-VENTA'
    ? filteredBase.filter(i => postvtSubTab === 'revisados'
        ? i.estado === 'resuelto'
        : i.estado === 'pendiente' || i.estado === 'en_progreso' || i.estado === 'IA_sugerida')
    : filteredBase
  const countEspera     = byTipo('RECLAMO').filter(i => i.estado === 'en_espera').length
  const countActivos    = byTipo('RECLAMO').filter(i => i.estado !== 'en_espera').length
  const countPVPendiente = byTipo('POST-VENTA').filter(i => i.estado === 'pendiente' || i.estado === 'en_progreso').length
  const countPVRevisados = byTipo('POST-VENTA').filter(i => i.estado === 'resuelto').length

  return (
    <div style={{ background:'var(--surface)', borderRight:'1.5px solid var(--border)',
      display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Pestañas de tipo */}
      <div style={{ display:'flex', borderBottom:'1.5px solid var(--border)', flexShrink:0 }}>
        {TABS.map(tab => {
          const active = tipoFilter === tab.id
          return (
            <button key={tab.id} onClick={() => onTipoFilter(tab.id)} style={{
              flex: 1, padding: '11px 4px 10px', border: 'none',
              borderBottom: `2.5px solid ${active ? tab.color : 'transparent'}`,
              background: active ? tab.bg : 'transparent',
              cursor: 'pointer', transition: 'all .15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700,
                color: active ? tab.color : 'var(--text3)' }}>
                {tab.label}
              </span>
              {counts[tab.id] > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px',
                  borderRadius: 99, background: active ? tab.color : 'var(--surface2)',
                  color: active ? '#fff' : 'var(--text3)',
                  border: `1px solid ${active ? tab.color : 'var(--border)'}` }}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Filtros de cuenta */}
      <div style={{ display:'flex', gap:4, padding:'10px 10px 4px', flexShrink:0 }}>
        {ACCT_BTNS.map(a => (
          <button key={a} onClick={() => onAcctFilter(a)} style={{
            flex:1, fontSize:12, fontWeight:700, padding:'7px 0',
            borderRadius:'var(--radius-sm)',
            border:`1.5px solid ${acctFilter === a ? 'var(--purple-border)' : 'var(--border)'}`,
            background: acctFilter === a ? 'var(--purple-light)' : 'transparent',
            color: acctFilter === a ? 'var(--purple)' : 'var(--text3)',
            cursor:'pointer', transition:'all .15s',
          }}>
            {a}
          </button>
        ))}
      </div>

      {/* Sub-tabs Activos / En espera — solo Reclamos */}
      {tipoFilter === 'RECLAMO' && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, margin: '0 10px' }}>
          {[{id:'activos',label:'Activos',count:countActivos},{id:'en_espera',label:'En espera',count:countEspera}].map(st => (
            <button key={st.id} onClick={() => setReclamoSubTab(st.id)} style={{
              flex: 1, padding: '7px 0', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: reclamoSubTab === st.id ? 700 : 400,
              color: reclamoSubTab === st.id ? 'var(--red)' : 'var(--text3)',
              borderBottom: reclamoSubTab === st.id ? '2px solid var(--red)' : '2px solid transparent',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              {st.label}
              {st.count > 0 && (
                <span style={{ background: reclamoSubTab === st.id ? 'var(--red)' : 'var(--surface2)',
                  color: reclamoSubTab === st.id ? '#fff' : 'var(--text3)',
                  borderRadius: 99, fontSize: 10, fontWeight: 800, padding: '1px 6px',
                  border: '1px solid ' + (reclamoSubTab === st.id ? 'var(--red)' : 'var(--border)'),
                }}>{st.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Sub-tabs Pendientes / Revisados — solo Post-venta */}
      {tipoFilter === 'POST-VENTA' && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, margin: '0 10px' }}>
          {[{id:'pendientes',label:'Pendientes',count:countPVPendiente},{id:'revisados',label:'Revisados',count:countPVRevisados}].map(st => (
            <button key={st.id} onClick={() => setPostvtSubTab(st.id)} style={{
              flex: 1, padding: '7px 0', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: postvtSubTab === st.id ? 700 : 400,
              color: postvtSubTab === st.id ? 'var(--amber)' : 'var(--text3)',
              borderBottom: postvtSubTab === st.id ? '2px solid var(--amber)' : '2px solid transparent',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              {st.label}
              {st.count > 0 && (
                <span style={{ background: postvtSubTab === st.id ? 'var(--amber)' : 'var(--surface2)',
                  color: postvtSubTab === st.id ? '#fff' : 'var(--text3)',
                  borderRadius: 99, fontSize: 10, fontWeight: 800, padding: '1px 6px',
                  border: '1px solid ' + (postvtSubTab === st.id ? 'var(--amber)' : 'var(--border)'),
                }}>{st.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Filtro por etiqueta */}
      <div style={{ padding:'0 10px 6px', flexShrink:0 }}>
        <button onClick={loadEtqOpciones} style={{
          width:'100%', fontSize:13, fontWeight:600, padding:'5px 10px',
          borderRadius:'var(--radius-sm)', cursor:'pointer', textAlign:'left',
          border:`1.5px solid ${etqFilter ? etqFilter.color : 'var(--border)'}`,
          background: etqFilter ? etqFilter.color + '18' : 'transparent',
          color: etqFilter ? etqFilter.color : 'var(--text3)',
          display:'flex', alignItems:'center', gap:6
        }}>
          🏷 {etqFilter ? etqFilter.nombre : 'Filtrar por etiqueta'}
          {etqFilter && (
            <span onClick={e => { e.stopPropagation(); setEtqFilter(null) }}
              style={{ marginLeft:'auto', fontSize:13, opacity:.7 }}>×</span>
          )}
        </button>
        {showEtqFilter && etqOpciones.length > 0 && (
          <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderTop:'none', borderRadius:'0 0 var(--radius-sm) var(--radius-sm)', maxHeight:130, overflowY:'auto' }}>
            {etqOpciones.map(e => (
              <div key={e.id} onClick={() => { setEtqFilter(e); setShowEtqFilter(false) }}
                style={{ padding:'6px 10px', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}
                onMouseEnter={ev => ev.currentTarget.style.background='var(--surface2)'}
                onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:e.color, flexShrink:0 }} />
                {e.nombre}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cola */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 10px 10px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 16px', color:'var(--text3)' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>✓</div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text2)' }}>Todo atendido</div>
            <div style={{ fontSize:13, marginTop:4 }}>No hay mensajes pendientes</div>
          </div>
        ) : (
          filtered.map(i => (
            <MessageCard key={i.id} item={i} selected={i.id === selectedId} onClick={() => onSelect(i)} />
          ))
        )}
      </div>
    </div>
  )
}
