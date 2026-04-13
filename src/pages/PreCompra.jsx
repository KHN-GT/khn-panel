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
  const [replyId, setReplyId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [editingPinNota, setEditingPinNota] = useState(null)
  const [pinNotaText, setPinNotaText] = useState('')
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
        body: JSON.stringify({ respuesta_final: replyText.trim(), accion: 'aprobado' })
      })
      if (r.ok) {
        setItems(prev => prev.map(i => i.id === item.id
          ? { ...i, estado: 'enviada', respuesta_ia: replyText.trim(), atendido_por: 'humano' }
          : i))
        setReplyId(null)
        setReplyText('')
      }
    } catch {}
    setSending(false)
  }

  const togglePin = async (item) => {
    const newPinned = !item.pinned
    try {
      const r = await fetch(`${RAILWAY}/api/inbox/${item.id}/pin`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ pinned: newPinned, pin_nota: newPinned ? (item.pin_nota || '') : '' })
      })
      if (r.ok) {
        setItems(prev => prev.map(i => i.id === item.id
          ? { ...i, pinned: newPinned, pin_nota: newPinned ? (i.pin_nota || '') : '' }
          : i))
      }
    } catch {}
  }

  const savePinNota = async (item) => {
    try {
      const r = await fetch(`${RAILWAY}/api/inbox/${item.id}/pin`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ pinned: true, pin_nota: pinNotaText })
      })
      if (r.ok) {
        setItems(prev => prev.map(i => i.id === item.id
          ? { ...i, pin_nota: pinNotaText }
          : i))
        setEditingPinNota(null)
      }
    } catch {}
  }

  // Client-side filter by estado tab, pinned first
  const filtered = items
    .filter(i => estadoFilterMatch(i, estadoTab))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

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

        {/* Pin button */}
        <button onClick={(e) => { e.stopPropagation(); togglePin(item) }}
          title={isPinned ? 'Despinear' : 'Pinear'}
          style={{ position:'absolute', top:6, left:6, zIndex:5, fontSize:14, lineHeight:1,
            width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
            borderRadius:6, border: isPinned ? '1px solid #fde68a' : '1px solid var(--border)',
            background: isPinned ? '#fef3c7' : 'var(--surface)', cursor:'pointer',
            opacity: isPinned ? 1 : 0.5, transition:'opacity 150ms' }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => { if (!isPinned) e.currentTarget.style.opacity = 0.5 }}>
          {'\uD83D\uDCCC'}
        </button>

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
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>
                {item.comprador || item.comprador_nombre || 'Comprador'}
              </span>
            </div>

            {/* Pin nota */}
            {isPinned && (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {editingPinNota === item.id ? (
                  <>
                    <input type="text" value={pinNotaText}
                      onChange={e => setPinNotaText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') savePinNota(item) }}
                      placeholder="Nota del pin..."
                      style={{ flex:1, fontSize:12, padding:'4px 8px', borderRadius:4,
                        border:'1px solid #fde68a', background:'#fffbeb', color:'var(--text)',
                        maxWidth:300 }} />
                    <button onClick={() => savePinNota(item)}
                      style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:4,
                        background:'#f59e0b', color:'#fff', border:'none', cursor:'pointer' }}>
                      Guardar
                    </button>
                    <button onClick={() => setEditingPinNota(null)}
                      style={{ fontSize:10, padding:'3px 8px', borderRadius:4,
                        border:'1px solid var(--border)', background:'transparent',
                        color:'var(--text3)', cursor:'pointer' }}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setEditingPinNota(item.id); setPinNotaText(item.pin_nota || '') }}>
                    <span style={{ fontSize:12, color:'#b45309', fontStyle: item.pin_nota ? 'normal' : 'italic' }}>
                      {item.pin_nota || 'Agregar nota...'}
                    </span>
                    <span style={{ fontSize:10, color:'#d97706' }}>{'\u270F\uFE0F'}</span>
                  </div>
                )}
              </div>
            )}

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
                  onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') sendReply(item) }}
                  placeholder="Escribe tu respuesta..."
                  rows={4}
                  style={{ flex:1, fontSize:13, padding:'8px 10px', borderRadius:6,
                    border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)',
                    resize:'vertical', boxSizing:'border-box', minHeight:100 }} />
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
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Sin resultados</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map(item => renderCard(item))}
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
