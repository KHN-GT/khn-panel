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

  const [sending,   setSending]   = useState(false)
  const [showEspera, setShowEspera] = useState(false)
  const [motivoEspera, setMotivoEspera] = useState('')
  const [sendingEspera, setSendingEspera] = useState(false)
  const [success,   setSuccess]   = useState('')
  const [copied,    setCopied]    = useState(false)
  const [contexto,    setContexto]    = useState([])
  const [loadingCtx,  setLoadingCtx]  = useState(false)
  const [ordenData,     setOrdenData]     = useState(null)
  const [loadingOrden,  setLoadingOrden]  = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [activeTab, setActiveTab] = useState('postventa')
  const [preventaItems, setPreventaItems] = useState([])
  const [loadingPreventa, setLoadingPreventa] = useState(false)
  const [templates,     setTemplates]     = useState([])
  const [loadingTpl,    setLoadingTpl]    = useState(false)
  const [tplBusqueda,   setTplBusqueda]   = useState('')
  const [showEtiquetas, setShowEtiquetas] = useState(false)
  const [etiquetas,     setEtiquetas]     = useState([])
  const [etqSugeridas,  setEtqSugeridas]  = useState([])
  const [etqInput,      setEtqInput]      = useState('')
  const [loadingEtq,    setLoadingEtq]    = useState(false)
  const [showGallery,   setShowGallery]   = useState(false)
  const [galleryImages, setGalleryImages] = useState([])
  const [galleryIdx,    setGalleryIdx]    = useState(0)
  const [loadingGallery,setLoadingGallery]= useState(false)
  const [showMeta,     setShowMeta]     = useState(false)
  const [metaData,     setMetaData]     = useState(null)
  const [loadingMeta,  setLoadingMeta]  = useState(false)
  const threadRef = useRef(null)

  useEffect(() => {
    setEditMode(false)
    setEditText(item?.respuesta_ia || '')
    setSuccess(''); setCopied(false); setContexto([])
    setShowMeta(false); setMetaData(null)
    setShowEtiquetas(false); setEtqInput(''); setEtqSugeridas([])

    const token = localStorage.getItem('khn_token')
    setOrdenData(null)

    // Cargar etiquetas del mensaje actual
    if (item?.id) {
      fetch(`${RAILWAY}/api/inbox/${item.id}/etiquetas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : { etiquetas: [] })
        .then(data => setEtiquetas(data.etiquetas || []))
        .catch(() => {})
    }

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
      fetch(`${RAILWAY}/api/inbox?tipo=PRE-COMPRA&sku=${item.sku}&cuenta=${item.cuenta}&comprador=${encodeURIComponent(item.comprador || '')}&estado=pendiente,en_progreso,IA_sugerida,resuelto,descartado&limit=50`, {
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

  // fetch preventa del mismo comprador+SKU
  useEffect(() => {
    if (!item || item.tipo !== 'POST-VENTA') { setPreventaItems([]); return }
    if (!item.comprador || !item.sku) return
    setLoadingPreventa(true)
    const token = localStorage.getItem('khn_token')
    const BASE = (import.meta.env.VITE_WORKER_URL || 'https://worker-production-d575.up.railway.app')
    fetch(
      BASE + '/api/inbox?tipo=PRE-COMPRA'
      + '&comprador=' + encodeURIComponent(item.comprador)
      + '&sku=' + encodeURIComponent(item.sku)
      + '&cuenta=' + item.cuenta
      + '&estado=pendiente,en_progreso,IA_sugerida,resuelto,descartado,enviada&limit=30',
      { headers: { Authorization: 'Bearer ' + token } }
    )
      .then(r => r.json())
      .then(d => setPreventaItems(Array.isArray(d) ? d : (d.items || [])))
      .catch(() => setPreventaItems([]))
      .finally(() => setLoadingPreventa(false))
  }, [item?.id])

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

  const URGENCIA_STYLE = {
    CRITICO:     { color:'#dc2626', bg:'#fef2f2', border:'#fca5a5', label:'CRITICO',   icon:'🔴' },
    URGENTE:     { color:'#ea580c', bg:'#fff7ed', border:'#fdba74', label:'URGENTE',   icon:'🟠' },
    MODERADO:    { color:'#d97706', bg:'#fffbeb', border:'#fcd34d', label:'MODERADO',  icon:'🟡' },
    INFORMATIVO: { color:'#16a34a', bg:'#f0fdf4', border:'#86efac', label:'NO AFECTA', icon:'🟢' },
  }
  const urgStyle = isClaim ? (URGENCIA_STYLE[item.urgencia] || URGENCIA_STYLE.MODERADO) : null

  const buscarEtiquetas = async (q) => {
    if (!q.trim()) { setEtqSugeridas([]); return }
    const token = localStorage.getItem('khn_token')
    try {
      const r = await fetch(`${RAILWAY}/api/etiquetas?q=${encodeURIComponent(q)}&cuenta=${item.cuenta}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const d = await r.json()
      setEtqSugeridas(d.etiquetas || [])
    } catch { setEtqSugeridas([]) }
  }

  const agregarEtiqueta = async (nombre, color) => {
    const token = localStorage.getItem('khn_token')
    setLoadingEtq(true)
    try {
      const r = await fetch(`${RAILWAY}/api/inbox/${item.id}/etiquetas`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), color })
      })
      const d = await r.json()
      if (d.ok && d.etiqueta) {
        setEtiquetas(prev => prev.find(e => e.id === d.etiqueta.id) ? prev : [...prev, d.etiqueta])
        setEtqInput(''); setEtqSugeridas([])
      }
    } catch {} finally { setLoadingEtq(false) }
  }

  const quitarEtiqueta = async (etiquetaId) => {
    const token = localStorage.getItem('khn_token')
    try {
      await fetch(`${RAILWAY}/api/inbox/${item.id}/etiquetas/${etiquetaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setEtiquetas(prev => prev.filter(e => e.id !== etiquetaId))
    } catch {}
  }

  const handleDeleteQuestion = async () => {
    if (!window.confirm('¿Eliminar esta pregunta de Mercado Libre? Esta accion no se puede deshacer en ML.')) return
    const token = localStorage.getItem('khn_token')
    setSending(true)
    try {
      const r = await fetch(`${RAILWAY}/api/inbox/${item.id}/delete_question`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const d = await r.json()
      if (d.ok) {
        setSuccess(d.ml_eliminado ? '🗑 Eliminada en ML y panel' : '🗑 Eliminada del panel')
        setTimeout(() => onDiscard(item.id), 900)
      } else {
        setSuccess('❌ ' + (d.error || 'Error al eliminar'))
      }
    } catch { setSuccess('❌ Error de conexión') }
    finally { setSending(false) }
  }

  const handleCopyNumero = () => {
    if (!numeroCopia) return
    navigator.clipboard.writeText(numeroCopia).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500)
    })
  }

  const handleApprove = async () => {
    setSending(true)
    const textoFinal = editMode ? editText : item.respuesta_ia
    try {
      await onApprove(item.id, textoFinal)
      // Si hubo edición humana, guardar como corrección de entrenamiento automáticamente
      if (editMode && textoFinal !== item.respuesta_ia) {
        const tok = localStorage.getItem('khn_token')
        fetch(`${RAILWAY}/api/inbox/${item.id}/correct`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ correccion: textoFinal })
        }).catch(() => {})
      }
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
          maxWidth: '82%', padding: '12px 16px', borderRadius: 12,
          fontSize: 14, lineHeight: 1.6,
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
        <div style={{ fontSize:13, color:'var(--text3)', marginTop:4, paddingLeft:4, paddingRight:4, display:'flex', gap:6, alignItems:'center' }}>
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




  const handleEspera = async () => {
    if (!motivoEspera) return
    setSendingEspera(true)
    try {
      const token = localStorage.getItem('khn_token')
      const r = await fetch(`${RAILWAY}/api/inbox/${item.id}/espera`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoEspera })
      })
      const d = await r.json()
      if (d.ok) {
        setShowEspera(false)
        setMotivoEspera('')
        if (onDiscard) onDiscard(item.id)
      }
    } catch(e) { console.error(e) }
    finally { setSendingEspera(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* ── Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1.5px solid var(--border)', background:'var(--surface)', flexShrink:0, boxShadow:'var(--shadow)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
            <span style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>{item.comprador || 'Comprador'}</span>
            {item.comprador_nombre && (
              <span style={{ fontSize:12, color:'var(--text3)', fontWeight:400 }}>{item.comprador_nombre}</span>
            )}
          </div>
          <span style={{ fontSize:12, fontWeight:700, padding:'3px 8px', borderRadius:5, background:ac.bg, color:ac.color, border:`1px solid ${ac.br}` }}>
            {item.cuenta}
          </span>
          {isClaim && urgStyle && (
            <span style={{ fontSize:12, fontWeight:700, padding:'3px 8px', borderRadius:5,
              background: urgStyle.bg, color: urgStyle.color, border:`1px solid ${urgStyle.border}` }}>
              {urgStyle.icon} RECLAMO — {urgStyle.label}
            </span>
          )}
          {isClaim && item.estado === 'en_espera' && (
            <span style={{
              background: '#fef3c7', color: '#b45309', border: '1px solid #f59e0b',
              borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '2px 10px',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>⏸ EN ESPERA{item.motivo_espera ? ` — ${item.motivo_espera}` : ''}</span>
          )}

          )}
          {item.tipo === 'PRE-COMPRA' && item.pedido_hecho && (
            <span style={{ fontSize:12, fontWeight:700, padding:'3px 8px', borderRadius:5,
              background:'#dcfce7', color:'#16a34a', border:'1px solid #86efac' }}>
              ✓ Pedido hecho
            </span>
          )}
          {isResolved && (
            <span style={{ fontSize:12, fontWeight:700, padding:'3px 8px', borderRadius:5, background:'var(--green-light)', color:'var(--green)', border:'1px solid var(--green-border)', marginLeft:'auto' }}>
              {item.estado === 'resuelto' ? '✓ ATENDIDO' : '✗ DESCARTADO'}
            </span>
          )}
          {item.comprador_id && (
            <button
              onClick={async () => {
                setShowMeta(true)
                if (!metaData) {
                  setLoadingMeta(true)
                  const tok = localStorage.getItem('khn_token')
                  try {
                    const r = await fetch(`${RAILWAY}/api/inbox/${item.id}/comprador`, {
                      headers: { Authorization: 'Bearer ' + tok }
                    })
                    const d = await r.json()
                    setMetaData(d)
                  } catch { setMetaData({ error: 'No se pudo cargar' }) }
                  finally { setLoadingMeta(false) }
                }
              }}
              title="Ver información del comprador"
              style={{ marginLeft: isResolved ? 0 : 'auto', fontSize:13, fontWeight:700,
                padding:'4px 10px', borderRadius:99, border:'1.5px solid var(--border)',
                background: showMeta ? 'var(--purple)' : 'transparent',
                color: showMeta ? '#fff' : 'var(--text3)', cursor:'pointer' }}>
              ℹ
            </button>
          )}
        </div>
        {/* Producto: imagen + título completo */}
        {(item.imagen_thumbnail || item.producto) && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6, padding:'8px 10px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)' }}>
            {item.imagen_thumbnail && (
              <img
                onClick={async () => {
                  setShowGallery(true); setGalleryIdx(0)
                  if (galleryImages.length === 0) {
                    setLoadingGallery(true)
                    const tok = localStorage.getItem('khn_token')
                    try {
                      const r = await fetch(`${RAILWAY}/api/inbox/${item.id}/imagenes`, {
                        headers: { Authorization: 'Bearer ' + tok }
                      })
                      const d = await r.json()
                      setGalleryImages(d.pictures?.length ? d.pictures : [item.imagen_thumbnail])
                    } catch { setGalleryImages([item.imagen_thumbnail]) }
                    finally { setLoadingGallery(false) }
                  }
                }}
                src={item.imagen_thumbnail}
                alt="producto"
                style={{ width:72, height:72, objectFit:'contain', borderRadius:8, border:'1px solid var(--border)', flexShrink:0, background:'#fff', cursor:'zoom-in' }}
                onError={e => { e.target.style.display='none' }}
              />
            )}
            <div style={{ minWidth:0 }}>
              {item.producto && (
                <a
                  href={item.item_id ? `https://articulo.mercadolibre.com.mx/${item.item_id.replace('MLM','MLM-')}` : '#'}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:14, fontWeight:600, color:'var(--blue)', lineHeight:1.4,
                    wordBreak:'break-word', textDecoration:'none', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration='none'}
                  title="Ver publicación en Mercado Libre"
                >
                  {item.producto} ↗
                </a>
              )}
              {item.sku && (
                <div
                  onClick={() => { navigator.clipboard.writeText(item.sku); }}
                  title="Clic para copiar SKU"
                  style={{ fontSize:12, color:'var(--text3)', marginTop:3, cursor:'pointer',
                    display:'inline-flex', alignItems:'center', gap:4 }}>
                  SKU: <code style={{ color:'var(--blue)', fontSize:12, fontWeight:600 }}>{item.sku}</code>
                  <span style={{ fontSize:12, color:'var(--text3)', opacity:.6 }}>⎘</span>
                </div>
              )}
                {/* Tabs Posventa/Preventa inline */}
                {item.tipo === 'POST-VENTA' && (
                  <div style={{ display:'inline-flex', borderRadius:6, overflow:'hidden', border:'1px solid var(--border)', marginLeft:8 }}>
                    {['postventa','preventa'].map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        padding:'3px 12px', border:'none', cursor:'pointer', fontSize:12,
                        fontWeight: activeTab===tab ? '600' : '400',
                        background: activeTab===tab ? 'var(--blue)' : 'var(--surface2)',
                        color: activeTab===tab ? '#fff' : 'var(--text2)',
                        transition:'all 0.15s', display:'flex', alignItems:'center', gap:4,
                      }}>
                        {tab==='postventa' ? 'Posventa' : 'Preventa'}
                        {tab==='preventa' && preventaItems.length>0 && (
                          <span style={{ background:'rgba(255,255,255,0.3)', borderRadius:999, fontSize:10, padding:'0 5px', fontWeight:700 }}>
                            {preventaItems.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

            </div>
          </div>
        )}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop: (item.imagen_thumbnail || item.producto) ? 6 : 0 }}>
          {item.orden_id && (
            <div
              onClick={() => { navigator.clipboard.writeText(item.orden_id); }}
              title="Clic para copiar número de orden"
              style={{ fontSize:12, color:'var(--text2)', background:'var(--surface2)',
                border:'1px solid var(--border)', borderRadius:5, padding:'3px 10px',
                cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 }}
              onMouseEnter={e => e.currentTarget.style.background='var(--blue-light)'}
              onMouseLeave={e => e.currentTarget.style.background='var(--surface2)'}
            >
              Orden <code style={{ fontSize:12, fontWeight:700, color:'var(--blue)' }}>#{item.orden_id}</code>
              <span style={{ fontSize:12, color:'var(--text3)', opacity:.6 }}>⎘</span>
            </div>
          )}
          {!item.producto && item.sku && (
            <div
              onClick={() => { navigator.clipboard.writeText(item.sku); }}
              title="Clic para copiar SKU"
              style={{ fontSize:12, color:'var(--text2)', background:'var(--surface2)',
                border:'1px solid var(--border)', borderRadius:5, padding:'3px 10px',
                cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 }}
              onMouseEnter={e => e.currentTarget.style.background='var(--blue-light)'}
              onMouseLeave={e => e.currentTarget.style.background='var(--surface2)'}
            >
              SKU <code style={{ fontSize:12, fontWeight:700, color:'var(--blue)' }}>{item.sku}</code>
              <span style={{ fontSize:12, color:'var(--text3)', opacity:.6 }}>⎘</span>
            </div>
          )}
          {item.claim_id && urgStyle && (
            <div style={{ fontSize:13, fontWeight:600, padding:'2px 8px', borderRadius:5,
              color: urgStyle.color, background: urgStyle.bg, border:`1px solid ${urgStyle.border}` }}>
              Reclamo #{item.claim_id}
            </div>
          )}
        </div>
        {isClaim && item.timer_segundos != null && urgStyle && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8,
            background: urgStyle.bg, border:`1px solid ${urgStyle.border}`,
            borderRadius:'var(--radius-sm)', padding:'6px 10px' }}>
            <span style={{ fontSize:13, fontWeight:600, color: urgStyle.color }}>Tiempo abierto:</span>
            <ClaimTimer segundosIniciales={item.timer_segundos} />
          </div>
        )}
        {/* Etiquetas asignadas */}
        {etiquetas.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
            {etiquetas.map(e => (
              <span key={e.id} style={{
                fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:99,
                background: e.color + '22', color: e.color,
                border:`1px solid ${e.color}55`,
                display:'inline-flex', alignItems:'center', gap:4, cursor:'default'
              }}>
                {e.nombre}
                <span onClick={() => quitarEtiqueta(e.id)}
                  style={{ cursor:'pointer', opacity:.7, fontSize:13, lineHeight:1 }}>×</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Contenido principal: hilo + sidebar orden */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

      {/* ── Hilo */}

{(item && item.tipo !== 'POST-VENTA') || activeTab === 'postventa' ? (
<div ref={threadRef} style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>

        {/* Loader de contexto */}
        {loadingCtx && (
          <div style={{ textAlign:'center', fontSize:13, color:'var(--text3)', padding:'8px 0' }}>Cargando historial...</div>
        )}

        {/* Contexto reclamos: post-venta previos del mismo orden */}
        {isClaim && contexto.length > 0 && (
          <>
            <div style={{ textAlign:'center', fontSize:13, fontWeight:600, color:'var(--text3)', padding:'4px 0', borderBottom:'1px dashed var(--border)', marginBottom:4 }}>
              📋 Mensajes previos de post-venta — misma orden
            </div>
            {contexto.map((msg, i) => {
              const hiloCtx = Array.isArray(msg.hilo_json) ? msg.hilo_json : []
              return hiloCtx.map((m, j) => renderBubble(m, j, { dimmed: true, keyPrefix: `ctx-${i}-` }))
            })}
            <div style={{ textAlign:'center', fontSize:13, fontWeight:600, color:'var(--red)', padding:'4px 0', borderBottom:'1px dashed var(--red-border)', marginBottom:4 }}>
              🚨 Inicio del reclamo
            </div>
          </>
        )}

        {/* Contexto pre-compra: preguntas anteriores del mismo SKU */}
        {item.tipo === 'PRE-COMPRA' && contexto.length > 0 && (
          <>
            <div style={{ textAlign:'center', fontSize:12, fontWeight:700, color:'var(--text2)', padding:'6px 0', borderBottom:'1px solid var(--border)', marginBottom:8 }}>
              📋 {contexto.length} pregunta{contexto.length > 1 ? 's' : ''} previa{contexto.length > 1 ? 's' : ''} sobre este producto
            </div>
            {contexto.map((msg, i) => (
              <div key={`pctx-${i}`} style={{ opacity: 0.85 }}>
                {renderBubble({ r: 'b', t: msg.mensaje_cliente || '' }, 0, { dimmed: true, keyPrefix: `pctx-q-${i}-` })}
                {(msg.respuesta_final || msg.respuesta_ia) && renderBubble({ r: 's', t: msg.respuesta_final || msg.respuesta_ia }, 1, { dimmed: true, keyPrefix: `pctx-a-${i}-` })}
              </div>
            ))}
            <div style={{ textAlign:'center', fontSize:13, fontWeight:600, color:'var(--purple)', padding:'4px 0', borderBottom:'1px dashed var(--purple-border)', marginBottom:4 }}>
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
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:3, textAlign:'right', paddingRight:4 }}>
              {item.atendido_por || 'Sistema'}
            </div>
          </div>
        )}
      </div>

) : null}

        {/* Panel Preventa */}
        {item.tipo === 'POST-VENTA' && activeTab === 'preventa' && (
          <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>
            {loadingPreventa ? (
              <p style={{ color:'var(--text3)', textAlign:'center', marginTop:40 }}>Cargando...</p>
            ) : preventaItems.length === 0 ? (
              <p style={{ color:'var(--text3)', textAlign:'center', marginTop:40 }}>Sin preguntas previas</p>
            ) : preventaItems.map(prev => (
              <div key={prev.id} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 14px' }}>
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:13, color:'var(--text3)', flexShrink:0, fontWeight:600 }}>Q</span>
                  <span style={{ fontSize:14, color:'var(--text)', lineHeight:1.4 }}>{prev.mensaje_cliente || '---'}</span>
                </div>
                {(prev.respuesta_final || prev.respuesta_ia) && (
                  <div style={{ display:'flex', gap:8, paddingTop:8, borderTop:'1px solid var(--border)' }}>
                    <span style={{ fontSize:13, color:'var(--blue)', flexShrink:0, fontWeight:600 }}>A</span>
                    <span style={{ fontSize:14, color:'var(--text2)', lineHeight:1.4 }}>{prev.respuesta_final || prev.respuesta_ia}</span>
                  </div>
                )}
                <div style={{ marginTop:6, fontSize:11, color:'var(--text3)', textAlign:'right' }}>
                  {prev.creado_en ? new Date(prev.creado_en).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : ''}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* ── Sidebar derecho: info de la orden (solo POST-VENTA) */}
      {isPostVenta && (
        <div style={{ width:240, flexShrink:0, borderLeft:'1.5px solid var(--border)', overflowY:'auto', background:'var(--surface)', display:'flex', flexDirection:'column' }}>
          {loadingOrden ? (
            <div style={{ padding:16, fontSize:13, color:'var(--text3)', textAlign:'center' }}>Cargando orden...</div>
          ) : ordenData ? (
            <>
              {/* Estado orden + envío */}
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Estado</div>
                {(() => {
                  const eo = ESTADO_ORDEN[ordenData.estado_orden] || { label: ordenData.estado_orden, color:'var(--text2)', bg:'var(--surface2)' }
                  const ee = ESTADO_ENVIO[ordenData.envio_estado]  || { label: ordenData.envio_estado,  color:'var(--text2)', bg:'var(--surface2)' }
                  return (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:12, color:'var(--text3)', minWidth:46 }}>Orden</span>
                        <span style={{ fontSize:13, fontWeight:700, padding:'2px 8px', borderRadius:99, background:eo.bg, color:eo.color }}>{eo.label}</span>
                      </div>
                      {ordenData.envio_estado && (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:12, color:'var(--text3)', minWidth:46 }}>Envío</span>
                          <span style={{ fontSize:13, fontWeight:700, padding:'2px 8px', borderRadius:99, background:ee.bg, color:ee.color }}>{ee.label}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Producto + precio */}
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Producto</div>
                {item.imagen_thumbnail && (
                  <img src={item.imagen_thumbnail} alt="" style={{ width:'100%', maxHeight:80, objectFit:'contain', borderRadius:6, border:'1px solid var(--border)', background:'#fff', marginBottom:8 }}
                    onError={e => { e.target.style.display='none' }} />
                )}
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', lineHeight:1.4, marginBottom:4 }}>
                  {ordenData.producto || item.producto || '—'}
                </div>
                {ordenData.variante && (
                  <div style={{ fontSize:13, color:'var(--purple)', marginBottom:4 }}>{ordenData.variante}</div>
                )}
                <div style={{ fontSize:13, color:'var(--text3)', marginBottom:2 }}>SKU: {ordenData.sku || item.sku || '—'}</div>
                <div style={{ fontSize:13, color:'var(--text3)', marginBottom:2 }}>Cant: {ordenData.cantidad || 1}</div>
                {ordenData.total && (
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--green)', marginTop:6 }}>{fmtPeso(ordenData.total)}</div>
                )}
              </div>

              {/* Fechas */}
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Fechas</div>
                {[
                  { label:'Compra',    val: fmtFecha(ordenData.fecha_compra) },
                  { label:'Entrega est.', val: fmtFecha(ordenData.fecha_entrega_estimada) || fmtFecha(ordenData.fecha_entrega_desde) },
                ].filter(r => r.val).map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:13, color:'var(--text3)' }}>{row.label}</span>
                    <span style={{ fontSize:13, color:'var(--text)', fontWeight:600 }}>{row.val}</span>
                  </div>
                ))}
              </div>

              {/* Envío */}
              {(ordenData.transportista || ordenData.tracking_number) && (
                <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Envío</div>
                  {ordenData.transportista && (
                    <div style={{ fontSize:13, color:'var(--text2)', marginBottom:4 }}>🚚 {ordenData.transportista}</div>
                  )}
                  {ordenData.tracking_number && (
                    <div style={{ fontSize:12, color:'var(--text3)', wordBreak:'break-all', marginBottom:6 }}>
                      {ordenData.tracking_number.substring(0,20)}...
                    </div>
                  )}
                  {ordenData.tracking_url && (
                    <a href={ordenData.tracking_url} target="_blank" rel="noreferrer"
                      style={{ fontSize:13, fontWeight:600, color:'var(--blue)', textDecoration:'none', display:'block', padding:'5px 0' }}>
                      Ver seguimiento →
                    </a>
                  )}
                </div>
              )}

              {/* Comprador */}
              <div style={{ padding:'12px 14px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Comprador</div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{ordenData.comprador || item.comprador}</div>
                {ordenData.comprador_id && (
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>ID: {ordenData.comprador_id}</div>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding:16, fontSize:13, color:'var(--text3)', textAlign:'center', lineHeight:1.6 }}>
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
            <span style={{ fontSize:13, fontWeight:700, color:'var(--amber)', flex:1 }}>📋 TEMPLATES DE RESPUESTA</span>
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
                  <div style={{ padding:'5px 14px', fontSize:12, fontWeight:700, color:'var(--text3)', background:'var(--surface2)', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid var(--border)' }}>
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
                      <div style={{ fontSize:13, color:'var(--text3)', lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
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
            <span style={{ fontSize:13, fontWeight:700, color:'var(--purple)', letterSpacing:'.05em', textTransform:'uppercase' }}>Respuesta IA</span>
            <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:99, background:cf.bg, color:cf.color, border:`1px solid ${cf.br}` }}>{cf.label}</span>
            {item.agente && <span style={{ fontSize:13, color:'var(--text3)', marginLeft:'auto' }}>Agente: {item.agente}</span>}
            <button onClick={() => { setEditMode(!editMode); setEditText(item.respuesta_ia) }}
              style={{ marginLeft: item.agente ? 0 : 'auto', fontSize:13, fontWeight:600, padding:'3px 10px', borderRadius:5, border:'1px solid var(--purple-border)', background: editMode ? 'var(--purple)' : 'transparent', color: editMode ? '#fff' : 'var(--purple)', cursor:'pointer' }}>
              {editMode ? 'Cancelar' : '✏️ Editar'}
            </button>
          </div>
          {editMode
            ? <textarea value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleApprove(); }}} rows={7}
                style={{ width:'100%', border:'none', borderTop:'1px solid var(--border)', padding:'14px 16px', fontSize:14, color:'var(--text)', lineHeight:1.6, fontFamily:'inherit', resize:'vertical', outline:'none', background:'var(--blue-light)' }} />
            : <div onClick={() => { setEditMode(true); setEditText(item.respuesta_ia.replace(/\n+/g, ' ').trim()) }} style={{ padding:'14px 16px', fontSize:14, color:'var(--text)', lineHeight:1.6, cursor:'text' }}>{item.respuesta_ia}</div>
          }
          {/* Botones inline — Usar / Copiar */}
          {!editMode && (
            <div style={{ display:'flex', gap:6, padding:'6px 14px 10px', borderTop:'1px solid var(--border)', background:'var(--surface2)' }}>
              <button onClick={handleApprove} disabled={sending}
                style={{ fontSize:12, fontWeight:700, padding:'6px 16px', borderRadius:99, background:'var(--green)', color:'#fff', border:'none', cursor:'pointer', opacity: sending ? .6 : 1 }}>
                {sending ? 'Enviando...' : 'Usar'}
              </button>
              <button onClick={() => {
                navigator.clipboard.writeText(item.respuesta_ia)
                setSuccess('✓ Copiado')
                setTimeout(() => setSuccess(''), 2000)
              }}
                style={{ fontSize:13, fontWeight:600, padding:'4px 14px', borderRadius:99, background:'transparent', color:'var(--text2)', border:'1px solid var(--border)', cursor:'pointer' }}>
                Copiar
              </button>
              <button onClick={handleDiscard} disabled={sending}
                style={{ fontSize:13, fontWeight:600, padding:'4px 14px', borderRadius:99, background:'transparent', color:'var(--text3)', border:'1px solid var(--border)', cursor:'pointer' }}>
                Descartar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Corrección post-envío */}
      {isResolved && item.estado === 'resuelto' && corrMode && (
        <div style={{ margin:'0 14px 12px', background:'var(--surface)', border:'1.5px solid var(--amber-border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
          <div style={{ padding:'8px 14px', background:'var(--amber-light)', borderBottom:'1px solid var(--amber-border)', fontSize:13, fontWeight:700, color:'var(--amber)' }}>
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

      {/* ── Panel de Etiquetas */}
      {showEtiquetas && (
        <div style={{ margin:'0 14px 8px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.05em' }}>🏷 Etiquetas</span>
            <button onClick={() => { setShowEtiquetas(false); setEtqInput(''); setEtqSugeridas([]) }}
              style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'var(--text3)' }}>×</button>
          </div>
          <div style={{ padding:'10px 14px' }}>
            {/* Input para escribir/buscar etiqueta */}
            <div style={{ position:'relative' }}>
              <input
                value={etqInput}
                onChange={e => { setEtqInput(e.target.value); buscarEtiquetas(e.target.value) }}
                onKeyDown={e => { if (e.key === 'Enter' && etqInput.trim()) agregarEtiqueta(etqInput) }}
                placeholder="Escribe una etiqueta y presiona Enter..."
                style={{ width:'100%', padding:'8px 12px', fontSize:12, border:'1.5px solid var(--border)', borderRadius:'var(--radius-sm)', outline:'none', color:'var(--text)', background:'var(--surface)', boxSizing:'border-box' }}
              />
              {/* Sugerencias */}
              {etqSugeridas.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--surface)', border:'1.5px solid var(--border)', borderTop:'none', borderRadius:'0 0 var(--radius-sm) var(--radius-sm)', zIndex:10, maxHeight:140, overflowY:'auto' }}>
                  {etqSugeridas.filter(s => !etiquetas.find(e => e.id === s.id)).map(s => (
                    <div key={s.id} onClick={() => agregarEtiqueta(s.nombre, s.color)}
                      style={{ padding:'7px 12px', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <span style={{ width:10, height:10, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                      {s.nombre}
                    </div>
                  ))}
                  {/* Opcion crear nueva */}
                  {etqInput.trim() && !etqSugeridas.find(s => s.nombre.toLowerCase() === etqInput.toLowerCase()) && (
                    <div onClick={() => agregarEtiqueta(etqInput)}
                      style={{ padding:'7px 12px', fontSize:12, cursor:'pointer', color:'var(--purple)', fontWeight:600, borderTop:'1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--purple-light)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      + Crear "{etqInput}"
                    </div>
                  )}
                </div>
              )}
              {/* Crear si no hay sugerencias */}
              {etqInput.trim() && etqSugeridas.length === 0 && (
                <div style={{ marginTop:4, fontSize:13, color:'var(--text3)' }}>
                  Presiona Enter para crear <strong>"{etqInput}"</strong>
                </div>
              )}
            </div>
            {/* Etiquetas ya asignadas */}
            {etiquetas.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:10 }}>
                {etiquetas.map(e => (
                  <span key={e.id} style={{
                    fontSize:13, fontWeight:600, padding:'3px 10px', borderRadius:99,
                    background: e.color + '22', color: e.color,
                    border:`1px solid ${e.color}55`,
                    display:'inline-flex', alignItems:'center', gap:5
                  }}>
                    {e.nombre}
                    <span onClick={() => quitarEtiqueta(e.id)}
                      style={{ cursor:'pointer', opacity:.7, fontSize:13 }}>×</span>
                  </span>
                ))}
              </div>
            )}
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
            {/* En espera — solo reclamos */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setShowEspera(v => !v); setMotivoEspera('') }} style={{
                padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid #f59e0b',
                background: showEspera ? '#fef3c7' : 'transparent',
                color: '#b45309', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>⏸ En espera</button>
              {showEspera && (
                <div style={{
                  position: 'absolute', bottom: '110%', left: 0, zIndex: 100,
                  background: 'var(--surface)', border: '1.5px solid #f59e0b',
                  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
                  padding: '12px', minWidth: 240,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 8 }}>Motivo de espera</div>
                  {[
                    'Esperando devolucion del paquete',
                    'Esperando respuesta del comprador',
                    'Esperando resolucion de paqueteria',
                    'Esperando autorizacion interna',
                    'Otro motivo',
                  ].map(op => (
                    <div key={op} onClick={() => setMotivoEspera(op)} style={{
                      padding: '7px 10px', borderRadius: 6, marginBottom: 4, cursor: 'pointer',
                      fontSize: 13, color: 'var(--text)',
                      background: motivoEspera === op ? '#fef3c7' : 'var(--surface2)',
                      border: motivoEspera === op ? '1.5px solid #f59e0b' : '1.5px solid transparent',
                      fontWeight: motivoEspera === op ? 600 : 400,
                    }}>{op}</div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={handleEspera} disabled={!motivoEspera || sendingEspera} style={{
                      flex: 1, padding: '7px 0', borderRadius: 6, border: 'none',
                      background: motivoEspera ? '#f59e0b' : '#d1d5db',
                      color: '#fff', fontWeight: 700, fontSize: 13,
                      cursor: motivoEspera ? 'pointer' : 'not-allowed',
                    }}>{sendingEspera ? 'Guardando...' : 'Confirmar'}</button>
                    <button onClick={() => { setShowEspera(false); setMotivoEspera('') }} style={{
                      padding: '7px 12px', borderRadius: 6, border: '1.5px solid var(--border)',
                      background: 'var(--surface2)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
                    }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
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
            <button onClick={handleDeleteQuestion} disabled={sending}
              title="Eliminar esta pregunta directamente en Mercado Libre"
              style={{ fontSize:13, fontWeight:600, padding:'9px 13px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--red-border)', background:'var(--red-light)', color:'var(--red)', cursor:'pointer', opacity: sending ? .6 : 1 }}>
              🗑 Eliminar en ML
            </button>
          </>
        )}


        {success && (
          <span style={{ fontSize:12, fontWeight:600, marginLeft:'auto', color: success.startsWith('❌') ? 'var(--red)' : 'var(--green)' }}>
            {success}
          </span>
        )}
        {/* Botón etiquetas — siempre visible */}
        <button onClick={() => setShowEtiquetas(!showEtiquetas)}
          style={{ marginLeft:'auto', fontSize:13, fontWeight:700, padding:'7px 13px', borderRadius:'var(--radius-sm)',
            border:`1.5px solid ${showEtiquetas ? 'var(--purple)' : 'var(--border)'}`,
            background: showEtiquetas ? 'var(--purple)' : 'transparent',
            color: showEtiquetas ? '#fff' : 'var(--text3)', cursor:'pointer',
            display:'flex', alignItems:'center', gap:5 }}>
          🏷 {etiquetas.length > 0 ? etiquetas.length : ''}
        </button>
      </div>
      {/* ── Drawer Metadata Comprador ── */}
      {showMeta && (
        <div onClick={() => setShowMeta(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:9990,
            display:'flex', justifyContent:'flex-end' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:320, background:'var(--surface)', height:'100%', overflowY:'auto',
              boxShadow:'-4px 0 24px rgba(0,0,0,.15)', display:'flex', flexDirection:'column' }}>
            {/* Header drawer */}
            <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'var(--purple-light)' }}>
              <span style={{ fontSize:14, fontWeight:700, color:'var(--purple)' }}>
                ℹ Info del comprador
              </span>
              <button onClick={() => setShowMeta(false)}
                style={{ fontSize:18, background:'none', border:'none', cursor:'pointer',
                  color:'var(--text3)', lineHeight:1 }}>✕</button>
            </div>
            {/* Contenido */}
            <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:16 }}>
              {loadingMeta ? (
                <div style={{ textAlign:'center', padding:32, fontSize:13, color:'var(--text3)' }}>
                  Cargando datos...
                </div>
              ) : metaData?.error ? (
                <div style={{ fontSize:13, color:'var(--red)', padding:16, textAlign:'center' }}>
                  {metaData.error}
                </div>
              ) : metaData ? (
                <>
                  {/* Nombre y nickname */}
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {metaData.nombre && (
                      <span style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>
                        {metaData.nombre}
                      </span>
                    )}
                    <span style={{ fontSize:13, color:'var(--text3)' }}>@{metaData.nickname}</span>
                  </div>
                  {/* Reputacion */}
                  {metaData.reputacion_label && (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text3)',
                        textTransform:'uppercase', letterSpacing:'.05em' }}>Reputación</span>
                      <span style={{ fontSize:13, fontWeight:700, padding:'4px 12px',
                        borderRadius:99, display:'inline-flex', alignSelf:'flex-start',
                        background: metaData.reputacion_bg, color: metaData.reputacion_color }}>
                        ● {metaData.reputacion_label}
                      </span>
                    </div>
                  )}
                  {/* Ubicacion */}
                  {(metaData.ciudad || metaData.estado) && (
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text3)',
                        textTransform:'uppercase', letterSpacing:'.05em' }}>Ubicación</span>
                      <span style={{ fontSize:14, color:'var(--text)' }}>
                        📍 {[metaData.ciudad, metaData.estado].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {/* Compras */}
                  {metaData.total_compras > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text3)',
                        textTransform:'uppercase', letterSpacing:'.05em' }}>Historial de compras</span>
                      <div style={{ display:'flex', gap:12 }}>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontSize:20, fontWeight:700, color:'var(--text)' }}>
                            {metaData.total_compras}
                          </div>
                          <div style={{ fontSize:12, color:'var(--text3)' }}>Total</div>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontSize:20, fontWeight:700, color:'var(--green)' }}>
                            {metaData.compras_completadas}
                          </div>
                          <div style={{ fontSize:12, color:'var(--text3)' }}>Completadas</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Miembro desde */}
                  {metaData.miembro_desde && (
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text3)',
                        textTransform:'uppercase', letterSpacing:'.05em' }}>Miembro desde</span>
                      <span style={{ fontSize:14, color:'var(--text)' }}>
                        📅 {new Date(metaData.miembro_desde).toLocaleDateString('es-MX', {year:'numeric',month:'long'})}
                      </span>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Galería ── */}
      {showGallery && (
        <div
          onClick={() => { setShowGallery(false); setGalleryImages([]); }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:9999,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position:'relative', background:'#fff', borderRadius:12, padding:'16px',
              maxWidth:'92vw', maxHeight:'92vh', display:'flex', flexDirection:'column',
              alignItems:'center', gap:12, boxShadow:'0 8px 48px rgba(0,0,0,.6)' }}>
            <button onClick={() => { setShowGallery(false); setGalleryImages([]); }}
              style={{ position:'absolute', top:10, right:12, fontSize:20, background:'none',
                border:'none', cursor:'pointer', color:'#666', lineHeight:1, fontWeight:700 }}>✕</button>
            {loadingGallery
              ? <div style={{ padding:48, fontSize:13, color:'#888' }}>Cargando imágenes...</div>
              : <img src={galleryImages[galleryIdx]} alt={`imagen ${galleryIdx+1}`}
                  style={{ maxWidth:'78vw', maxHeight:'68vh', objectFit:'contain', borderRadius:8 }} />
            }
            {galleryImages.length > 1 && (
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <button onClick={() => setGalleryIdx(i => Math.max(0, i-1))}
                  disabled={galleryIdx === 0}
                  style={{ fontSize:22, background:'none', border:'none', cursor:'pointer',
                    color: galleryIdx === 0 ? '#ccc' : '#333' }}>&#8592;</button>
                <span style={{ fontSize:12, color:'#666', minWidth:50, textAlign:'center' }}>
                  {galleryIdx+1} / {galleryImages.length}
                </span>
                <button onClick={() => setGalleryIdx(i => Math.min(galleryImages.length-1, i+1))}
                  disabled={galleryIdx === galleryImages.length-1}
                  style={{ fontSize:22, background:'none', border:'none', cursor:'pointer',
                    color: galleryIdx === galleryImages.length-1 ? '#ccc' : '#333' }}>&#8594;</button>
              </div>
            )}
            {galleryImages.length > 1 && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center', maxWidth:520 }}>
                {galleryImages.map((img, i) => (
                  <img key={i} src={img} onClick={() => setGalleryIdx(i)} alt=""
                    style={{ width:50, height:50, objectFit:'contain', borderRadius:5,
                      cursor:'pointer', background:'#f5f5f5',
                      border: i === galleryIdx ? '2px solid var(--purple)' : '1px solid #ddd' }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}



