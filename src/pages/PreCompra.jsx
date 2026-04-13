import { useState, useEffect, useRef, useCallback } from 'react'
import Topbar from '../components/Topbar'

const RAILWAY = 'https://worker-production-d575.up.railway.app'
const LIMIT = 50
const ACCT_BTNS = ['Todas', 'GTK', 'RBN', 'GDP']
const ACCT = {
  GTK: { color:'var(--acct-gtk)', bg:'var(--acct-gtk-bg)', br:'var(--acct-gtk-br)' },
  RBN: { color:'var(--acct-rbn)', bg:'var(--acct-rbn-bg)', br:'var(--acct-rbn-br)' },
  GDP: { color:'var(--acct-gdp)', bg:'var(--acct-gdp-bg)', br:'var(--acct-gdp-br)' },
}
const ESTADO_TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'respondidas', label: 'Respondidas' },
]

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('khn_token')}`, 'Content-Type': 'application/json' }
}

function formatFecha(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', hour12:false })
}

function estadoBadge(item) {
  const e = item.estado
  if (e === 'pendiente' || e === 'en_progreso' || e === 'IA_sugerida') {
    return { label: 'Pendiente', bg: '#fff7ed', color: '#ea580c', br: '#fed7aa' }
  }
  if (e === 'resuelto' || e === 'enviada' || e === 'fuera_horario') {
    if (item.respuesta_ia && (!item.atendido_por || item.atendido_por === 'IA'))
      return { label: 'Respondida IA', bg: '#eff6ff', color: '#2563eb', br: '#bfdbfe' }
    return { label: 'Respondida', bg: '#f0fdf4', color: '#16a34a', br: '#bbf7d0' }
  }
  return { label: e, bg: 'var(--surface2)', color: 'var(--text3)', br: 'var(--border)' }
}

function estadoFilterMatch(item, tab) {
  if (tab === 'todos') return true
  const e = item.estado
  if (tab === 'pendientes') return e === 'pendiente' || e === 'en_progreso' || e === 'IA_sugerida'
  // respondidas
  return e === 'resuelto' || e === 'enviada' || e === 'fuera_horario'
}

export default function PreCompra({ onLogout }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [cuenta, setCuenta] = useState('Todas')
  const [estadoTab, setEstadoTab] = useState('todos')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [expandedGroups, setExpandedGroups] = useState({})
  const [replyId, setReplyId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const timer = useRef(null)

  const handleSearch = useCallback((val) => {
    setSearch(val)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { setSearchDebounced(val); setOffset(0) }, 300)
  }, [])

  const load = useCallback(async (off = 0) => {
    setLoading(true)
    try {
      // Fetch ALL pre-compra: all estados, no archivado filter
      const estados = 'pendiente,en_progreso,IA_sugerida,resuelto,enviada,fuera_horario'
      let url = `${RAILWAY}/api/inbox?tipo=PRE-COMPRA&estado=${estados}&limit=${LIMIT}&offset=${off}`
      if (cuenta !== 'Todas') url += `&cuenta=${cuenta}`
      if (searchDebounced) url += `&q=${encodeURIComponent(searchDebounced)}`
      const r = await fetch(url, { headers: authHeaders() })
      const d = await r.json()
      setItems(d.items || [])
      setTotal(d.total || (d.items || []).length)
      setOffset(off)
    } catch { setItems([]) }
    setLoading(false)
  }, [cuenta, searchDebounced])

  useEffect(() => { load(0) }, [load])

  const sendReply = async (item) => {
    if (!replyText.trim() || sending) return
    setSending(true)
    try {
      const r = await fetch(`${RAILWAY}/api/inbox/${item.id}/approve`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ respuesta: replyText.trim() })
      })
      if (r.ok) {
        setItems(prev => prev.map(i => i.id === item.id
          ? { ...i, estado: 'resuelto', respuesta_ia: replyText.trim(), atendido_por: 'humano' }
          : i))
        setReplyId(null)
        setReplyText('')
      }
    } catch {}
    setSending(false)
  }

  // Client-side filter by estado tab
  const filtered = items.filter(i => estadoFilterMatch(i, estadoTab))

  // Group by comprador+item_id
  const groups = []
  const groupMap = {}
  filtered.forEach(i => {
    const key = (i.comprador_id || i.comprador || '?') + '|' + (i.item_id || i.sku || '?')
    if (!groupMap[key]) {
      groupMap[key] = { key, items: [] }
      groups.push(groupMap[key])
    }
    groupMap[key].items.push(i)
  })
  // Within each group, sort by creado_en ASC (chronological)
  groups.forEach(g => {
    g.items.sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en))
  })

  const totalPages = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  const renderCard = (item) => {
    const ac = ACCT[item.cuenta] || { color:'var(--text3)', bg:'var(--surface2)', br:'var(--border)' }
    const eb = estadoBadge(item)
    const isPendiente = item.estado === 'pendiente' || item.estado === 'en_progreso' || item.estado === 'IA_sugerida'
    const isPinned = item.pinned
    return (
      <div key={item.id} style={{
        background: isPinned ? '#fffbeb' : 'var(--surface)',
        border: isPinned ? '1.5px solid #fde68a' : '1.5px solid var(--border)',
        borderRadius:'var(--radius)', overflow:'hidden', position:'relative' }}>

        <div style={{ display:'flex', gap:0 }}>
          {/* Left: product info */}
          <div style={{ width:200, flexShrink:0, padding:14, borderRight:'1px solid var(--border)',
            display:'flex', flexDirection:'column', gap:8,
            background: isPinned ? '#fefce8' : 'var(--surface2)' }}>
            {item.imagen_thumbnail ? (
              <img src={item.imagen_thumbnail} alt=""
                style={{ width:'100%', height:120, objectFit:'contain', borderRadius:6,
                  background:'#fff', border:'1px solid var(--border)' }} />
            ) : (
              <div style={{ width:'100%', height:120, borderRadius:6, background:'var(--surface)',
                border:'1px solid var(--border)', display:'flex', alignItems:'center',
                justifyContent:'center', color:'var(--text3)', fontSize:28 }}>
                {'\uD83D\uDCF7'}
              </div>
            )}
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', lineHeight:1.4,
              overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
              {item.producto || item.sku || '-'}
            </div>
            {item.precio && (
              <div style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>
                ${Number(item.precio).toLocaleString('es-AR')}
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              {item.item_id && (
                <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'monospace' }}>
                  ID: {item.item_id}
                </div>
              )}
              {item.sku && (
                <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'monospace' }}>
                  SKU: {item.sku}
                </div>
              )}
            </div>
            <span style={{ alignSelf:'flex-start', fontSize:10, fontWeight:700, padding:'2px 8px',
              borderRadius:4, background:ac.bg, color:ac.color, border:`1px solid ${ac.br}` }}>
              {item.cuenta}
            </span>
          </div>

          {/* Right: conversation */}
          <div style={{ flex:1, padding:14, display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>
            {/* Meta row */}
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
                background:eb.bg, color:eb.color, border:`1px solid ${eb.br}` }}>
                {eb.label}
              </span>
              {isPinned && (
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
                  background:'#fef3c7', color:'#b45309', border:'1px solid #fde68a' }}>
                  {'\uD83D\uDCCC'} Pineada
                </span>
              )}
              {item.conversion_en && (
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
                  background:'#dcfce7', color:'#16a34a', border:'1px solid #bbf7d0' }}>
                  {'\u2705'} Compro
                </span>
              )}
              <span style={{ fontSize:11, color:'var(--text3)' }}>{formatFecha(item.creado_en)}</span>
              <span style={{ fontSize:11, color:'var(--text3)' }}>
                {item.comprador || 'Comprador'}
              </span>
            </div>

            {/* Pregunta */}
            <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.6 }}>
              {item.mensaje_cliente || '-'}
            </div>

            {/* Respuesta IA */}
            {item.respuesta_ia && (
              <div style={{ background:'var(--surface2)', border:'1px solid var(--border)',
                borderRadius:8, padding:'10px 14px', borderLeft:'3px solid var(--purple)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--purple)', marginBottom:4,
                  textTransform:'uppercase', letterSpacing:'.05em' }}>
                  Respuesta IA
                </div>
                <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, whiteSpace:'normal' }}>
                  {item.respuesta_ia}
                </div>
              </div>
            )}

            {/* Reply inline */}
            {isPendiente && replyId === item.id && (
              <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                  placeholder="Escribir respuesta..."
                  rows={3}
                  style={{ flex:1, fontSize:13, padding:'8px 10px', borderRadius:6,
                    border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)',
                    resize:'vertical', boxSizing:'border-box' }} />
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  <button onClick={() => sendReply(item)} disabled={sending}
                    style={{ fontSize:11, fontWeight:700, padding:'6px 14px', borderRadius:6,
                      background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer',
                      opacity: sending ? 0.6 : 1 }}>
                    {sending ? 'Enviando...' : 'Enviar'}
                  </button>
                  <button onClick={() => { setReplyId(null); setReplyText('') }}
                    style={{ fontSize:11, padding:'6px 10px', borderRadius:6,
                      border:'1px solid var(--border)', background:'transparent',
                      color:'var(--text3)', cursor:'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Responder button */}
            {isPendiente && replyId !== item.id && (
              <button onClick={() => { setReplyId(item.id); setReplyText(item.respuesta_ia || '') }}
                style={{ alignSelf:'flex-start', fontSize:11, fontWeight:600, padding:'5px 14px',
                  borderRadius:6, background:'var(--purple-light)', color:'var(--purple)',
                  border:'1px solid var(--purple-border)', cursor:'pointer' }}>
                Responder
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderGroup = (g) => {
    if (g.items.length === 1) return renderCard(g.items[0])

    const expanded = !!expandedGroups[g.key]
    const newest = g.items[g.items.length - 1] // last = most recent for display
    const rest = g.items.slice(0, -1)
    const peekCount = Math.min(rest.length, 2)

    return (
      <div key={g.key} style={{ marginBottom: expanded ? 0 : peekCount * 8 }}>
        {expanded ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ position:'relative', cursor:'pointer' }}
              onClick={() => setExpandedGroups(p => ({ ...p, [g.key]: false }))}>
              <div style={{ position:'absolute', top:10, right:10, fontSize:10, fontWeight:700,
                background:'var(--purple)', color:'#fff', borderRadius:99,
                padding:'2px 7px', zIndex:4, lineHeight:1.4, cursor:'pointer' }}>
                Colapsar
              </div>
              {renderCard(newest)}
            </div>
            <div style={{
              overflow:'hidden',
              maxHeight: '2000px',
              opacity: 1,
              transform: 'translateY(0)',
              transition:'max-height 280ms ease-out, opacity 220ms ease-out, transform 220ms ease-out',
            }}>
              {rest.map(i => (
                <div key={i.id} style={{ marginBottom:12 }}>
                  {renderCard(i)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ position:'relative', cursor:'pointer' }}
            onClick={() => setExpandedGroups(p => ({ ...p, [g.key]: true }))}>
            {Array.from({ length: peekCount }).map((_, pi) => (
              <div key={`peek-${g.key}-${pi}`}
                style={{
                  position:'absolute', bottom: -(pi + 1) * 8, left: (pi + 1) * 4,
                  right: 0, height: 8,
                  background: pi === 0 ? 'var(--surface2)' : 'var(--surface)',
                  border:'1px solid var(--border)', borderRadius:'0 0 8px 8px',
                  zIndex: 2 - pi,
                }} />
            ))}
            <div style={{ position:'relative', zIndex:3 }}>
              {renderCard(newest)}
              <span style={{
                position:'absolute', bottom:6, right:8, fontSize:10, fontWeight:700,
                background:'var(--purple)', color:'#fff', borderRadius:99,
                padding:'2px 7px', zIndex:4, lineHeight:1.4, pointerEvents:'none',
              }}>
                +{rest.length} mas
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <Topbar onLogout={onLogout} />

      {/* Header */}
      <div style={{ padding:'16px 24px', borderBottom:'1.5px solid var(--border)', background:'var(--surface)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <span style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>
            Pre-Compra
          </span>
          <span style={{ fontSize:13, color:'var(--text3)' }}>{total} preguntas</span>
        </div>

        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar comprador o SKU..."
            style={{ fontSize:13, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)',
              background:'var(--surface)', color:'var(--text)', minWidth:220 }} />

          {ACCT_BTNS.map(a => (
            <button key={a} onClick={() => { setCuenta(a); setOffset(0) }} style={{
              fontSize:12, fontWeight:700, padding:'6px 14px',
              borderRadius:'var(--radius-sm)',
              border:`1.5px solid ${cuenta === a ? 'var(--purple-border)' : 'var(--border)'}`,
              background: cuenta === a ? 'var(--purple-light)' : 'transparent',
              color: cuenta === a ? 'var(--purple)' : 'var(--text3)',
              cursor:'pointer',
            }}>
              {a}
            </button>
          ))}

          <span style={{ color:'var(--border2)', fontSize:16 }}>|</span>

          {ESTADO_TABS.map(st => (
            <button key={st.id} onClick={() => setEstadoTab(st.id)} style={{
              fontSize:12, fontWeight:700, padding:'6px 14px',
              borderRadius:'var(--radius-sm)',
              border:`1.5px solid ${estadoTab === st.id ? 'var(--purple-border)' : 'var(--border)'}`,
              background: estadoTab === st.id ? 'var(--purple-light)' : 'transparent',
              color: estadoTab === st.id ? 'var(--purple)' : 'var(--text3)',
              cursor:'pointer',
            }}>
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Cargando...</div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Sin resultados</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {groups.map(g => renderGroup(g))}
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div style={{ display:'flex', gap:8, justifyContent:'center', alignItems:'center', padding:'16px 0' }}>
            <button onClick={() => load(Math.max(0, offset - LIMIT))} disabled={offset === 0}
              style={{ fontSize:12, padding:'4px 12px', borderRadius:4, border:'1px solid var(--border)',
                background:'var(--surface)', color:'var(--text2)', cursor: offset === 0 ? 'default' : 'pointer',
                opacity: offset === 0 ? .5 : 1 }}>
              Anterior
            </button>
            <span style={{ fontSize:12, color:'var(--text3)' }}>
              Pagina {currentPage} de {totalPages} ({total} total)
            </span>
            <button onClick={() => load(offset + LIMIT)} disabled={offset + LIMIT >= total}
              style={{ fontSize:12, padding:'4px 12px', borderRadius:4, border:'1px solid var(--border)',
                background:'var(--surface)', color:'var(--text2)',
                cursor: offset + LIMIT >= total ? 'default' : 'pointer',
                opacity: offset + LIMIT >= total ? .5 : 1 }}>
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
