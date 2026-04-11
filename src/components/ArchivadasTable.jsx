import { useState, useEffect, useRef, useCallback } from 'react'

const RAILWAY = 'https://worker-production-d575.up.railway.app'
const LIMIT = 50
const ACCT_BTNS = ['Todas', 'GTK', 'RBN', 'GDP']
const ACCT = {
  GTK: { color:'var(--acct-gtk)', bg:'var(--acct-gtk-bg)', br:'var(--acct-gtk-br)' },
  RBN: { color:'var(--acct-rbn)', bg:'var(--acct-rbn-bg)', br:'var(--acct-rbn-br)' },
  GDP: { color:'var(--acct-gdp)', bg:'var(--acct-gdp-bg)', br:'var(--acct-gdp-br)' },
}

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('khn_token')}`, 'Content-Type': 'application/json' }
}

function formatFecha(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', hour12:false })
}

function tiempoCompra(atendido, conversion) {
  if (!atendido || !conversion) return null
  const diff = (new Date(conversion) - new Date(atendido)) / 3600000
  if (diff < 1) return `${Math.round(diff * 60)}min`
  if (diff < 24) return `${Math.round(diff)}h`
  return `${Math.round(diff / 24)}d`
}

export default function ArchivadasTable({ onClose }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [cuenta, setCuenta] = useState('Todas')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const timer = useRef(null)

  const handleSearch = useCallback((val) => {
    setSearch(val)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { setSearchDebounced(val); setOffset(0) }, 300)
  }, [])

  const load = useCallback(async (off = 0) => {
    setLoading(true)
    try {
      let url = `${RAILWAY}/api/inbox?tipo=PRE-COMPRA&archivado=true&limit=${LIMIT}&offset=${off}`
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

  const desarchivar = async (id) => {
    try {
      await fetch(`${RAILWAY}/api/inbox/${id}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ archivado: false })
      })
      setItems(prev => prev.filter(i => i.id !== id))
      setTotal(prev => prev - 1)
    } catch {}
  }

  const totalPages = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding:'16px 24px', borderBottom:'1.5px solid var(--border)', background:'var(--surface)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <button onClick={onClose}
            style={{ fontSize:14, fontWeight:600, padding:'5px 12px', borderRadius:'var(--radius-sm)',
              border:'1px solid var(--border)', background:'transparent', color:'var(--text3)', cursor:'pointer' }}>
            &#8592; Volver
          </button>
          <span style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>
            {'\uD83D\uDCE6'} Preguntas Archivadas
          </span>
          <span style={{ fontSize:13, color:'var(--text3)' }}>{total} registros</span>
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
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Cargando...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Sin resultados</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {items.map(item => {
              const ac = ACCT[item.cuenta] || { color:'var(--text3)', bg:'var(--surface2)', br:'var(--border)' }
              const tiempo = tiempoCompra(item.atendido_en, item.conversion_en)
              return (
                <div key={item.id} style={{ background:'var(--surface)', border:'1.5px solid var(--border)',
                  borderRadius:'var(--radius)', overflow:'hidden', position:'relative' }}>

                  {/* Desarchivar button */}
                  <button onClick={() => desarchivar(item.id)}
                    style={{ position:'absolute', top:10, right:10, fontSize:11, fontWeight:600,
                      padding:'4px 10px', borderRadius:6, border:'1px solid var(--border)',
                      background:'var(--surface)', color:'var(--text3)', cursor:'pointer', zIndex:2 }}
                    onMouseEnter={ev => { ev.currentTarget.style.background='var(--surface2)'; ev.currentTarget.style.color='var(--text)' }}
                    onMouseLeave={ev => { ev.currentTarget.style.background='var(--surface)'; ev.currentTarget.style.color='var(--text3)' }}>
                    Desarchivar
                  </button>

                  <div style={{ display:'flex', gap:0 }}>
                    {/* Left: product info */}
                    <div style={{ width:200, flexShrink:0, padding:14, borderRight:'1px solid var(--border)',
                      display:'flex', flexDirection:'column', gap:8, background:'var(--surface2)' }}>
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
                        <span style={{ fontSize:11, color:'var(--text3)' }}>{formatFecha(item.creado_en)}</span>
                        <span style={{ fontSize:11, color:'var(--text3)' }}>
                          {item.comprador || 'Comprador'}
                        </span>
                        {item.conversion_en && (
                          <span title={tiempo ? `Compro en ${tiempo}` : 'Compro'}
                            style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
                              background:'#dcfce7', color:'#16a34a', border:'1px solid #bbf7d0' }}>
                            {'\u2705'} Compro{tiempo ? ` en ${tiempo}` : ''}
                          </span>
                        )}
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
                    </div>
                  </div>
                </div>
              )
            })}
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
