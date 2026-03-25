import { useState, useRef, useEffect } from 'react'
import ClaimTimer from './ClaimTimer'

const ACCT = {
  GTK: { color: 'var(--acct-gtk)', bg: 'var(--acct-gtk-bg)', br: 'var(--acct-gtk-br)' },
  RBN: { color: 'var(--acct-rbn)', bg: 'var(--acct-rbn-bg)', br: 'var(--acct-rbn-br)' },
  GDP: { color: 'var(--acct-gdp)', bg: 'var(--acct-gdp-bg)', br: 'var(--acct-gdp-br)' },
}
const CONF = {
  alta:         { label: 'ALTA',         color: 'var(--green)',  bg: 'var(--green-light)',  br: 'var(--green-border)'  },
  media:        { label: 'MEDIA',        color: 'var(--amber)',  bg: 'var(--amber-light)',  br: 'var(--amber-border)'  },
  baja:         { label: 'BAJA',         color: 'var(--red)',    bg: 'var(--red-light)',    br: 'var(--red-border)'    },
  fuera_horario:{ label: 'FUERA HORARIO',color: 'var(--text3)', bg: 'var(--surface2)',     br: 'var(--border)'        },
}
const ACCT_BROWSER = { GTK: 'Chrome', RBN: 'Maxthon', GDP: 'Firefox' }
const RAILWAY = 'https://worker-production-d575.up.railway.app'

export default function ConvPanel({ item, onApprove, onDiscard, onCorrect }) {
  const [editMode,  setEditMode]  = useState(false)
  const [editText,  setEditText]  = useState('')
  const [corrMode,  setCorrMode]  = useState(false)
  const [corrText,  setCorrText]  = useState('')
  const [sending,   setSending]   = useState(false)
  const [success,   setSuccess]   = useState('')
  const [copied,    setCopied]    = useState(false)
  const [contexto,    setContexto]    = useState([])
  const [loadingCtx,  setLoadingCtx]  = useState(false)
  const [ordenData,     setOrdenData]     = useState(null)
  const [loadingOrden,  setLoadingOrden]  = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates,     setTemplates]     = useState([])
  const [loadingTpl,    setLoadingTpl]    = useState(false)
  const [tplBusqueda,   setTplBusqueda]   = useState('')
  const threadRef = useRef(null)

  useEffect(() => {
    setEditMode(false)
    setEditText(item?.respuesta_ia || '')
    setCorrMode(false); setCorrText('')
    setSuccess(''); setCopied(false); setContexto([])

    const token = localStorage.getItem('khn_token')
    setOrdenData(null)

    // Post-venta: cargar detalles de la orden en vivo
    if (item?.tipo === 'POST-VENTA' && item?.id) {
      setLoadingOrden(true)
      fetch(`${RAILWAY}/api/inbox/${item.id}/orden`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data && !data.error) setOrdenData(data) })
        .catch(() => {})
        .finally(() => setLoadingOrden(false))
    }

    // Reclamos: contexto post-venta del mismo orden
    if (item?.id && item?.orden_id && (item?.tipo === 'RECLAMO' || item?.tipo === 'reclamo' || item?.claim_id)) {
      setLoadingCtx(true)
      fetch(`${RAILWAY}/api/inbox?orden_id=${item.orden_id}&tipo=POST-VENTA`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : { items: [] })
        .then(data => {
          const otros = Array.isArray(data?.items) ? data.items.filter(m => m.id !== item.id) : []
          setContexto(otros)
        })
        .catch(() => setContexto([]))
        .finally(() => setLoadingCtx(false))
    }

    // Pre-compra: historial completo de preguntas del mismo SKU
    if (item?.tipo === 'PRE-COMPRA' && item?.sku) {
      setLoadingCtx(true)
      fetch(`${RAILWAY}/api/inbox?tipo=PRE-COMPRA&sku=${item.sku}&cuenta=${item.cuenta}&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : { items: [] })
        .then(data => {
          const todos = Array.isArray(data?.items) ? data.items : []
          const fechaActual = new Date(item.creado_en)
          const previos = todos
            .filter(m => m.id !== item.id && new Date(m.creado_en) < fechaActual)
            .sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en))
          setContexto(previos)
        })
        .catch(() => setContexto([]))
        .finally(() => setLoadingCtx(false))
    }

    setTimeout(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight }, 50)
  }, [item?.id])

  const loadTemplates = async () => {
    if (templates.length > 0) { setShowTemplates(true); return }
    setLoadingTpl(true)
    const token = localStorage.getItem('khn_token')
    try {
      const r = await fetch(`${RAILWAY}/api/templates?cuenta=${item?.cuenta || ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const d = await r.json()
      setTemplates(d.templates || [])
    } catch {}
    setLoadingTpl(false)
    setShowTemplates(true)
  }

  const insertTemplate = (texto) => {
    setEditText(texto)
    setEditMode(true)
    setShowTemplates(false)
    setTplBusqueda('')
  }

  if (!item) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'var(--text3)' }}>
      <div style={{ fontSize:36 }}>💬</div>
      <div style={{ fontSize:14, fontWeight:500, color:'var(--text2)' }}>Selecciona un mensaje</div>
      <div style={{ fontSize:12 }}>para ver la conversación</div>
    </div>
  )

  const ac  = ACCT[item.cuenta] || ACCT.GTK
  const cf  = CONF[item.confianza] || CONF.alta
  const isClaim   = item.tipo === 'RECLAMO' || item.tipo === 'reclamo' || !!item.claim_id || item.canal === 'reclamos'
  const isResolved= ['resuelto','descartado'].includes(item.estado)
  const numeroCopia = item.orden_id || item.claim_id || null

  const handleCopyNumero = () => {
    if (!numeroCopia) return
    navigator.clipboard.writeText(numeroCopia).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500)
    })
  }

  const handleApprove = async () => {
    setSending(true)
    try {
      await onApprove(item.id, editMode ? editText : item.respuesta_ia)
      setSuccess('✅ Enviado a MercadoLibre')
    } catch(e) { setSuccess('❌ Error: ' + (e?.message || 'Error desconocido')) }
    finally { setSending(false) }
  }

  const handleDiscard = async () => {
    setSending(true)
    try { await onDiscard(item.id); setSuccess('🗑 Descartado') }
    catch { setSuccess('❌ Error al descartar') }
    finally { setSending(false) }
  }

  const handleMarkResolved = async () => {
    setSending(true)
    try {
      const token = localStorage.getItem('khn_token')
      await fetch(`${RAILWAY}/api/inbox/${item.id}/discard`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      setSuccess('✅ Marcado como atendido')
      setTimeout(() => onDiscard(item.id), 800)
    } catch { setSuccess('❌ Error') }
    finally { setSending(false) }
  }

  const handleCorrect = async () => {
    if (!corrText.trim()) return
    setSending(true)
    try { await onCorrect(item.id, corrText); setSuccess('📚 Corrección guardada'); setCorrMode(false); setCorrText('') }
    catch { setSuccess('❌ Error') }
    finally { setSending(false) }
  }

  // ── hilo_json: cada mensaje tiene { r: 'b'|'s', t: '...' }
  // r='b' → buyer (comprador) | r='s' → seller (vendedor/nosotros)
  const hilo = Array.isArray(item.hilo_json) ? item.hilo_json : []

  const fmtTs = (ts) => {
    if (!ts) return null
    try {
      const d = new Date(ts)
      const hoy = new Date()
      const esHoy = d.toDateString() === hoy.toDateString()
      const ayer  = new Date(hoy); ayer.setDate(hoy.getDate()-1)
      const esAyer = d.toDateString() === ayer.toDateString()
      const hora  = d.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })
      if (esHoy)  return `Hoy ${hora}`
      if (esAyer) return `Ayer ${hora}`
      return d.toLocaleDateString('es-MX', { day:'2-digit', month:'short' }) + ' ' + hora
    } catch { return null }
  }

  const renderBubble = (msg, i, opts = {}) => {
    const isSeller = msg.r === 's'
    const text = msg.t || ''
    const ts   = fmtTs(msg.ts)
    const { dimmed = false, keyPrefix = '' } = opts
    return (
      <div key={`${keyPrefix}${i}`} style={{ display:'flex', flexDirection:'column', alignItems: isSeller ? 'flex-end' : 'flex-start', opacity: dimmed ? 0.75 : 1 }}>
        <div style={{
          maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
          fontSize: 13, lineHeight: 1.55,
          color: dimmed ? 'var(--text2)' : 'var(--text)',
          background: isSeller
            ? (dimmed ? '#f0f2ff' : 'var(--purple-light)')
            : (isClaim && !dimmed ? 'var(--red-light)' : 'var(--surface)'),
          border: `1px solid ${isSeller
            ? (dimmed ? 'var(--border)' : 'var(--purple-border)')
            : (isClaim && !dimmed ? 'var(--red-border)' : 'var(--border)')}`,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {text}
        </div>
        <div style={{ fontSize:10, color:'var(--text3)', marginTop:3, paddingLeft:4, paddingRight:4, display:'flex', gap:6, alignItems:'center' }}>
          <span>{isSeller ? (item.cuenta || 'Seller') : (item.comprador || 'Comprador')}</span>
          {ts && <span style={{ color:'var(--text3)', opacity:.7 }}>· {ts}</span>}
        </div>
      </div>
    )
  }

  const isPostVenta = item.tipo === 'POST-VENTA'

  // Helpers de formato
  const fmtPeso = (n) => n ? `$${Number(n).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})} MXN` : null
  const fmtFecha = (s) => {
    if (!s) return null
    try { return new Date(s).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) }
    catch { return s }
  }
  const ESTADO_ENVIO = {
    shipped:    { label:'Enviado',     color:'var(--blue)',   bg:'var(--blue-light)'   },
    delivered:  { label:'Entregado',   color:'var(--green)',  bg:'var(--green-light)'  },
    ready_to_ship:{ label:'Listo envío',color:'var(--amber)', bg:'var(--amber-light)'  },
    pending:    { label:'Pendiente',   color:'var(--amber)',  bg:'var(--amber-light)'  },
    cancelled:  { label:'Cancelado',   color:'var(--red)',    bg:'var(--red-light)'    },
  }
  const ESTADO_ORDEN = {
    paid:       { label:'Pagada',      color:'var(--green)',  bg:'var(--green-light)'  },
    confirmed:  { label:'Confirmada',  color:'var(--blue)',   bg:'var(--blue-light)'   },
    cancelled:  { label:'Cancelada',   color:'var(--red)',    bg:'var(--red-light)'    },
    pending:    { label:'Pendiente',   color:'var(--amber)',  bg:'var(--amber-light)'  },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* ── Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1.5px solid var(--border)', background:'var(--surface)', flexShrink:0, boxShadow:'var(--shadow)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{item.comprador || 'Comprador'}</span>
          <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5, background:ac.bg, color:ac.color, border:`1px solid ${ac.br}` }}>
            {item.cuenta}
          </span>
          {isClaim && (
            <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5, background:'var(--red-light)', color:'var(--red)', border:'1px solid var(--red-border)' }}>
              🚨 RECLAMO
            </span>
          )}
          {isResolved && (
            <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5, background:'var(--green-light)', color:'var(--green)', border:'1px solid var(--green-border)', marginLeft:'auto' }}>
              {item.estado === 'resuelto' ? '✓ ATENDIDO' : '✗ DESCARTADO'}
            </span>
          )}
        </div>
        {/* Producto: imagen + título completo */}
        {(item.imagen_thumbnail || item.producto) && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6, padding:'8px 10px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)' }}>
            {item.imagen_thumbnail && (
              <img
                src={item.imagen_thumbnail}
                alt="producto"
                style={{ width:52, height:52, objectFit:'contain', borderRadius:6, border:'1px solid var(--border)', flexShrink:0, background:'#fff' }}
                onError={e => { e.target.style.display='none' }}
              />
            )}
            <div style={{ minWidth:0 }}>
              {item.producto && (
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', lineHeight:1.4, wordBreak:'break-word' }}>
                  {item.producto}
                </div>
              )}
              {item.sku && (
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                  SKU: <code style={{ color:'var(--blue)', fontSize:10 }}>{item.sku}</code>
                </div>
              )}
            </div>
          </div>
        )}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop: (item.imagen_thumbnail || item.producto) ? 6 : 0 }}>
          {item.orden_id && (
            <div style={{ fontSize:11, color:'var(--text2)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:5, padding:'2px 8px' }}>
              Orden <code style={{ fontSize:10, color:'var(--blue)' }}>#{item.orden_id}</code>
            </div>
          )}
          {!item.producto && item.sku && (
            <div style={{ fontSize:11, color:'var(--text2)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:5, padding:'2px 8px' }}>
              SKU <code style={{ fontSize:10, color:'var(--blue)' }}>{item.sku}</code>
            </div>
          )}
          {item.claim_id && (
            <div style={{ fontSize:11, color:'var(--red)', background:'var(--red-light)', border:'1px solid var(--red-border)', borderRadius:5, padding:'2px 8px', fontWeight:600 }}>
              Reclamo #{item.claim_id}
            </div>
          )}
        </div>
        {isClaim && item.timer_segundos != null && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, background:'var(--red-light)', border:'1px solid var(--red-border)', borderRadius:'var(--radius-sm)', padding:'6px 10px' }}>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--red)' }}>Tiempo abierto:</span>
            <ClaimTimer segundosIniciales={item.timer_segundos} />
          </div>
        )}
      </div>

      {/* ── Contenido principal: hilo + sidebar orden */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

      {/* ── Hilo */}
      <div ref={threadRef} style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>

        {/* Loader de contexto */}
        {loadingCtx && (
          <div style={{ textAlign:'center', fontSize:11, color:'var(--text3)', padding:'8px 0' }}>Cargando historial...</div>
        )}

        {/* Contexto reclamos: post-venta previos del mismo orden */}
        {isClaim && contexto.length > 0 && (
          <>
            <div style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'var(--text3)', padding:'4px 0', borderBottom:'1px dashed var(--border)', marginBottom:4 }}>
              📋 Mensajes previos de post-venta — misma orden
            </div>
            {contexto.map((msg, i) => {
              const hiloCtx = Array.isArray(msg.hilo_json) ? msg.hilo_json : []
              return hiloCtx.map((m, j) => renderBubble(m, j, { dimmed: true, keyPrefix: `ctx-${i}-` }))
            })}
            <div style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'var(--red)', padding:'4px 0', borderBottom:'1px dashed var(--red-border)', marginBottom:4 }}>
              🚨 Inicio del reclamo
            </div>
          </>
        )}

        {/* Contexto pre-compra: preguntas anteriores del mismo SKU */}
        {item.tipo === 'PRE-COMPRA' && contexto.length > 0 && (
          <>
            <div style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'var(--text3)', padding:'4px 0', borderBottom:'1px dashed var(--border)', marginBottom:4 }}>
              📋 {contexto.length} pregunta{contexto.length > 1 ? 's' : ''} previa{contexto.length > 1 ? 's' : ''} sobre este producto
            </div>
            {contexto.map((msg, i) => (
              <div key={`pctx-${i}`} style={{ opacity: 0.65 }}>
                {renderBubble({ r: 'b', t: msg.mensaje_cliente || '' }, 0, { dimmed: true, keyPrefix: `pctx-q-${i}-` })}
                {msg.respuesta_final && renderBubble({ r: 's', t: msg.respuesta_final }, 1, { dimmed: true, keyPrefix: `pctx-a-${i}-` })}
              </div>
            ))}
            <div style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'var(--purple)', padding:'4px 0', borderBottom:'1px dashed var(--purple-border)', marginBottom:4 }}>
              💬 Pregunta actual
            </div>
          </>
        )}

        {/* Mensajes del hilo principal */}
        {hilo.length > 0
          ? hilo.map((msg, i) => renderBubble(msg, i))
          : item.mensaje_cliente
            ? renderBubble({ r: 'b', t: item.mensaje_cliente }, 0)
            : null
        }

        {/* Respuesta final enviada */}
        {isResolved && item.respuesta_final && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
            <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius:12, background:'var(--green-light)', border:'1px solid var(--green-border)', fontSize:13, lineHeight:1.55, color:'var(--text)' }}>
              {item.respuesta_final}
            </div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:3, textAlign:'right', paddingRight:4 }}>
              {item.atendido_por || 'Sistema'}
            </div>
          </div>
        )}
      </div>

      {/* ── Sidebar derecho: info de la orden (solo POST-VENTA) */}
      {isPostVenta && (
        <div style={{ width:240, flexShrink:0, borderLeft:'1.5px solid var(--border)', overflowY:'auto', background:'var(--surface)', display:'flex', flexDirection:'column' }}>
          {loadingOrden ? (
            <div style={{ padding:16, fontSize:11, color:'var(--text3)', textAlign:'center' }}>Cargando orden...</div>
          ) : ordenData ? (
            <>
              {/* Estado orden + envío */}
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Estado</div>
                {(() => {
                  const eo = ESTADO_ORDEN[ordenData.estado_orden] || { label: ordenData.estado_orden, color:'var(--text2)', bg:'var(--surface2)' }
                  const ee = ESTADO_ENVIO[ordenData.envio_estado]  || { label: ordenData.envio_estado,  color:'var(--text2)', bg:'var(--surface2)' }
                  return (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:10, color:'var(--text3)', minWidth:46 }}>Orden</span>
                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:eo.bg, color:eo.color }}>{eo.label}</span>
                      </div>
                      {ordenData.envio_estado && (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:10, color:'var(--text3)', minWidth:46 }}>Envío</span>
                          <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:ee.bg, color:ee.color }}>{ee.label}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Producto + precio */}
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Producto</div>
                {item.imagen_thumbnail && (
                  <img src={item.imagen_thumbnail} alt="" style={{ width:'100%', maxHeight:80, objectFit:'contain', borderRadius:6, border:'1px solid var(--border)', background:'#fff', marginBottom:8 }}
                    onError={e => { e.target.style.display='none' }} />
                )}
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', lineHeight:1.4, marginBottom:4 }}>
                  {ordenData.producto || item.producto || '—'}
                </div>
                {ordenData.variante && (
                  <div style={{ fontSize:11, color:'var(--purple)', marginBottom:4 }}>{ordenData.variante}</div>
                )}
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:2 }}>SKU: {ordenData.sku || item.sku || '—'}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:2 }}>Cant: {ordenData.cantidad || 1}</div>
                {ordenData.total && (
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--green)', marginTop:6 }}>{fmtPeso(ordenData.total)}</div>
                )}
              </div>

              {/* Fechas */}
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Fechas</div>
                {[
                  { label:'Compra',    val: fmtFecha(ordenData.fecha_compra) },
                  { label:'Entrega est.', val: fmtFecha(ordenData.fecha_entrega_estimada) || fmtFecha(ordenData.fecha_entrega_desde) },
                ].filter(r => r.val).map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:11, color:'var(--text3)' }}>{row.label}</span>
                    <span style={{ fontSize:11, color:'var(--text)', fontWeight:600 }}>{row.val}</span>
                  </div>
                ))}
              </div>

              {/* Envío */}
              {(ordenData.transportista || ordenData.tracking_number) && (
                <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Envío</div>
                  {ordenData.transportista && (
                    <div style={{ fontSize:11, color:'var(--text2)', marginBottom:4 }}>🚚 {ordenData.transportista}</div>
                  )}
                  {ordenData.tracking_number && (
                    <div style={{ fontSize:10, color:'var(--text3)', wordBreak:'break-all', marginBottom:6 }}>
                      {ordenData.tracking_number.substring(0,20)}...
                    </div>
                  )}
                  {ordenData.tracking_url && (
                    <a href={ordenData.tracking_url} target="_blank" rel="noreferrer"
                      style={{ fontSize:11, fontWeight:600, color:'var(--blue)', textDecoration:'none', display:'block', padding:'5px 0' }}>
                      Ver seguimiento →
                    </a>
                  )}
                </div>
              )}

              {/* Comprador */}
              <div style={{ padding:'12px 14px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Comprador</div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{ordenData.comprador || item.comprador}</div>
                {ordenData.comprador_id && (
                  <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>ID: {ordenData.comprador_id}</div>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding:16, fontSize:11, color:'var(--text3)', textAlign:'center', lineHeight:1.6 }}>
              Sin datos<br/>de la orden
            </div>
          )}
        </div>
      )}

      </div>{/* fin flex row */}

      {/* ── Panel de Templates */}
      {showTemplates && !isResolved && !isClaim && (
        <div style={{ margin:'0 14px 12px', background:'var(--surface)', border:'1.5px solid var(--amber-border)', borderRadius:'var(--radius)', overflow:'hidden', boxShadow:'var(--shadow-md)' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:'var(--amber-light)', borderBottom:'1px solid var(--amber-border)' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--amber)', flex:1 }}>📋 TEMPLATES DE RESPUESTA</span>
            <button onClick={() => { setShowTemplates(false); setTplBusqueda('') }}
              style={{ fontSize:14, background:'none', border:'none', cursor:'pointer', color:'var(--text3)', lineHeight:1 }}>✕</button>
          </div>
          {/* Buscador */}
          <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--border)' }}>
            <input
              value={tplBusqueda}
              onChange={e => setTplBusqueda(e.target.value)}
              placeholder="Buscar template..."
              autoFocus
              style={{ width:'100%', fontSize:12, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', outline:'none', color:'var(--text)', background:'var(--surface2)' }}
            />
          </div>
          {/* Lista */}
          <div style={{ maxHeight:260, overflowY:'auto' }}>
            {loadingTpl ? (
              <div style={{ padding:16, fontSize:12, color:'var(--text3)', textAlign:'center' }}>Cargando templates...</div>
            ) : (() => {
              const q = tplBusqueda.toLowerCase()
              const filtrados = templates.filter(t =>
                !q || t.titulo.toLowerCase().includes(q) || t.texto.toLowerCase().includes(q) || t.categoria.toLowerCase().includes(q)
              )
              if (filtrados.length === 0) return (
                <div style={{ padding:16, fontSize:12, color:'var(--text3)', textAlign:'center' }}>Sin resultados</div>
              )
              // Agrupar por categoría
              const porCategoria = filtrados.reduce((acc, t) => {
                const cat = t.categoria || 'GENERAL'
                if (!acc[cat]) acc[cat] = []
                acc[cat].push(t)
                return acc
              }, {})
              return Object.entries(porCategoria).map(([cat, items]) => (
                <div key={cat}>
                  <div style={{ padding:'5px 14px', fontSize:10, fontWeight:700, color:'var(--text3)', background:'var(--surface2)', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid var(--border)' }}>
                    {cat}
                  </div>
                  {items.map(t => (
                    <div key={t.id}
                      onClick={() => insertTemplate(t.texto)}
                      style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', transition:'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{t.titulo}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                        {t.texto}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* ── Bloque IA */}
      {!isResolved && !isClaim && item.respuesta_ia && (
        <div style={{ margin:'0 14px 12px', background:'var(--surface)', border:'1.5px solid var(--purple-border)', borderRadius:'var(--radius)', boxShadow:'var(--shadow-md)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:'var(--purple-light)', borderBottom:'1px solid var(--purple-border)' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--purple)', letterSpacing:'.05em', textTransform:'uppercase' }}>Respuesta IA</span>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:cf.bg, color:cf.color, border:`1px solid ${cf.br}` }}>{cf.label}</span>
            {item.agente && <span style={{ fontSize:11, color:'var(--text3)', marginLeft:'auto' }}>Agente: {item.agente}</span>}
            <button onClick={() => { setEditMode(!editMode); setEditText(item.respuesta_ia) }}
              style={{ marginLeft: item.agente ? 0 : 'auto', fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:5, border:'1px solid var(--purple-border)', background: editMode ? 'var(--purple)' : 'transparent', color: editMode ? '#fff' : 'var(--purple)', cursor:'pointer' }}>
              {editMode ? 'Cancelar' : '✏️ Editar'}
            </button>
          </div>
          {editMode
            ? <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
                style={{ width:'100%', border:'none', borderTop:'1px solid var(--border)', padding:'12px 14px', fontSize:13, color:'var(--text)', lineHeight:1.55, fontFamily:'inherit', resize:'vertical', outline:'none', background:'var(--blue-light)' }} />
            : <div style={{ padding:'12px 14px', fontSize:13, color:'var(--text)', lineHeight:1.55 }}>{item.respuesta_ia}</div>
          }
        </div>
      )}

      {/* ── Corrección post-envío */}
      {isResolved && item.estado === 'resuelto' && corrMode && (
        <div style={{ margin:'0 14px 12px', background:'var(--surface)', border:'1.5px solid var(--amber-border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
          <div style={{ padding:'8px 14px', background:'var(--amber-light)', borderBottom:'1px solid var(--amber-border)', fontSize:11, fontWeight:700, color:'var(--amber)' }}>
            CORREGIR PARA ENTRENAMIENTO
          </div>
          <textarea value={corrText} onChange={e => setCorrText(e.target.value)} rows={3} placeholder="Escribe la respuesta correcta..."
            style={{ width:'100%', border:'none', padding:'10px 14px', fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', color:'var(--text)' }} />
          <div style={{ display:'flex', gap:8, padding:'8px 14px', borderTop:'1px solid var(--border)', background:'var(--surface2)' }}>
            <button onClick={handleCorrect} disabled={sending || !corrText.trim()}
              style={{ fontSize:12, fontWeight:700, padding:'7px 16px', borderRadius:'var(--radius-sm)', background:'var(--amber)', color:'#fff', border:'none', cursor:'pointer', opacity: sending || !corrText.trim() ? .6 : 1 }}>
              Guardar
            </button>
            <button onClick={() => setCorrMode(false)}
              style={{ fontSize:12, fontWeight:600, padding:'7px 12px', borderRadius:'var(--radius-sm)', background:'transparent', color:'var(--text2)', border:'1px solid var(--border)', cursor:'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Barra de acciones */}
      <div style={{ padding:'12px 14px', borderTop:'1.5px solid var(--border)', background:'var(--surface)', display:'flex', gap:8, flexShrink:0, flexWrap:'wrap', alignItems:'center' }}>

        {isClaim && (
          <>
            <button onClick={handleCopyNumero} disabled={!numeroCopia}
              style={{ fontSize:12, fontWeight:700, padding:'9px 18px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--red-border)', background: copied ? 'var(--green)' : 'var(--red)', color:'#fff', cursor:'pointer', transition:'background .2s', display:'inline-flex', alignItems:'center', gap:6 }}>
              {copied ? '✓ Número copiado' : '🔗 Ver reclamo en ML'}
            </button>
            <button onClick={handleMarkResolved} disabled={sending}
              style={{ fontSize:12, fontWeight:700, padding:'9px 18px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--green-border)', background:'var(--green)', color:'#fff', cursor:'pointer', opacity: sending ? .6 : 1 }}>
              {sending ? 'Guardando...' : '✓ Marcar atendido'}
            </button>
            <button onClick={handleDiscard} disabled={sending}
              style={{ fontSize:12, fontWeight:600, padding:'9px 18px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text2)', cursor:'pointer' }}>
              Descartar
            </button>
          </>
        )}

        {!isClaim && !isResolved && item.respuesta_ia && (
          <>
            <button onClick={handleApprove} disabled={sending}
              style={{ fontSize:12, fontWeight:700, padding:'9px 18px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--green-border)', background:'var(--green)', color:'#fff', cursor:'pointer', opacity: sending ? .6 : 1 }}>
              {sending ? 'Enviando...' : 'Aprobar y enviar'}
            </button>
            <button onClick={() => { setEditMode(!editMode); setEditText(item.respuesta_ia) }}
              style={{ fontSize:12, fontWeight:700, padding:'9px 18px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--purple-border)', background:'var(--purple-light)', color:'var(--purple)', cursor:'pointer' }}>
              {editMode ? 'Cancelar edición' : '✏️ Editar'}
            </button>
            {editMode && (
              <button onClick={handleApprove} disabled={sending || !editText.trim()}
                style={{ fontSize:12, fontWeight:700, padding:'9px 18px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--green-border)', background:'var(--green)', color:'#fff', cursor:'pointer', opacity: sending ? .6 : 1 }}>
                Enviar editado
              </button>
            )}
            <button onClick={loadTemplates}
              style={{ fontSize:12, fontWeight:700, padding:'9px 18px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--amber-border)', background: showTemplates ? 'var(--amber)' : 'var(--amber-light)', color: showTemplates ? '#fff' : 'var(--amber)', cursor:'pointer' }}>
              📋 Templates
            </button>
            <button onClick={handleDiscard} disabled={sending}
              style={{ fontSize:12, fontWeight:600, padding:'9px 18px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text2)', cursor:'pointer' }}>
              Descartar
            </button>
          </>
        )}

        {isResolved && item.estado === 'resuelto' && !corrMode && !isClaim && (
          <button onClick={() => setCorrMode(true)}
            style={{ fontSize:12, fontWeight:600, padding:'9px 16px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--amber-border)', background:'var(--amber-light)', color:'var(--amber)', cursor:'pointer' }}>
            Corregir para entrenamiento
          </button>
        )}

        {success && (
          <span style={{ fontSize:12, fontWeight:600, marginLeft:'auto', color: success.startsWith('❌') ? 'var(--red)' : 'var(--green)' }}>
            {success}
          </span>
        )}
      </div>
    </div>
  )
}
