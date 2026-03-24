import { useState, useRef, useEffect } from 'react'
import ClaimTimer from './ClaimTimer'

const ACCT = {
  GTK: { color: 'var(--acct-gtk)', bg: 'var(--acct-gtk-bg)', br: 'var(--acct-gtk-br)' },
  RBN: { color: 'var(--acct-rbn)', bg: 'var(--acct-rbn-bg)', br: 'var(--acct-rbn-br)' },
  GDP: { color: 'var(--acct-gdp)', bg: 'var(--acct-gdp-bg)', br: 'var(--acct-gdp-br)' },
}
const CONF = {
  alta:          { label: 'ALTA',          color: 'var(--green)',  bg: 'var(--green-light)',  br: 'var(--green-border)' },
  media:         { label: 'MEDIA',         color: 'var(--amber)',  bg: 'var(--amber-light)',  br: 'var(--amber-border)' },
  baja:          { label: 'BAJA',          color: 'var(--red)',    bg: 'var(--red-light)',    br: 'var(--red-border)' },
  fuera_horario: { label: 'FUERA HORARIO', color: 'var(--text3)', bg: 'var(--surface2)',     br: 'var(--border)' },
}

const RAILWAY = 'https://worker-production-d575.up.railway.app'

export default function ConvPanel({ item, onApprove, onDiscard, onCorrect }) {
  const [editMode, setEditMode]   = useState(false)
  const [editText, setEditText]   = useState('')
  const [corrMode, setCorrMode]   = useState(false)
  const [corrText, setCorrText]   = useState('')
  const [sending, setSending]     = useState(false)
  const [success, setSuccess]     = useState('')
  const threadRef                 = useRef(null)

  useEffect(() => {
    setEditMode(false)
    setEditText(item?.respuesta_ia || '')
    setCorrMode(false)
    setCorrText('')
    setSuccess('')
    setTimeout(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
    }, 50)
  }, [item?.id])

  if (!item) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', height:'100%', gap:10, color:'var(--text3)' }}>
      <div style={{ fontSize:36 }}>💬</div>
      <div style={{ fontSize:14, fontWeight:500, color:'var(--text2)' }}>Selecciona un mensaje</div>
      <div style={{ fontSize:12 }}>para ver la conversación</div>
    </div>
  )

  const ac       = ACCT[item.cuenta] || ACCT.GTK
  const cf       = CONF[item.confianza] || CONF.alta

  const isClaim  = item.tipo === 'RECLAMO' || item.tipo === 'reclamo' || !!item.claim_id || item.canal === 'reclamos'
  const isResolved = ['resuelto','descartado'].includes(item.estado)

  // Link al reclamo en ML
  const claimLink = item.claim_id
    ? `https://www.mercadolibre.com.mx/ventas/reclamos/${item.claim_id}`
    : item.orden_id
    ? `https://www.mercadolibre.com.mx/ventas/${item.orden_id}`
    : null

  const handleApprove = async () => {
    setSending(true)
    try {
      const texto = editMode ? editText : item.respuesta_ia
      await onApprove(item.id, texto)
      setSuccess('✅ Enviado a MercadoLibre')
    } catch (e) {
      setSuccess('❌ Error: ' + (e?.message || 'Error desconocido'))
    } finally { setSending(false) }
  }

  const handleDiscard = async () => {
    setSending(true)
    try {
      await onDiscard(item.id)
      setSuccess('🗑 Descartado')
    } catch (e) {
      setSuccess('❌ Error al descartar')
    } finally { setSending(false) }
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
    } catch (e) {
      setSuccess('❌ Error')
    } finally { setSending(false) }
  }

  const handleCorrect = async () => {
    if (!corrText.trim()) return
    setSending(true)
    try {
      await onCorrect(item.id, corrText)
      setSuccess('📚 Corrección guardada')
      setCorrMode(false); setCorrText('')
    } catch (e) {
      setSuccess('❌ Error')
    } finally { setSending(false) }
  }

  const hilo = Array.isArray(item.hilo_json) ? item.hilo_json : []

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1.5px solid var(--border)',
        background:'var(--surface)', flexShrink:0, boxShadow:'var(--shadow)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>
            {item.comprador || 'Comprador'}
          </span>
          <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5,
            background:ac.bg, color:ac.color, border:`1px solid ${ac.br}` }}>
            {item.cuenta}
          </span>
          {isClaim && (
            <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5,
              background:'var(--red-light)', color:'var(--red)', border:'1px solid var(--red-border)' }}>
              🚨 RECLAMO
            </span>
          )}
          {isResolved && (
            <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5,
              background:'var(--green-light)', color:'var(--green)', border:'1px solid var(--green-border)',
              marginLeft:'auto' }}>
              {item.estado === 'resuelto' ? '✓ ATENDIDO' : '✗ DESCARTADO'}
            </span>
          )}
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {item.orden_id && (
            <div style={{ fontSize:11, color:'var(--text2)', background:'var(--surface2)',
              border:'1px solid var(--border)', borderRadius:5, padding:'2px 8px' }}>
              Orden <code style={{ fontSize:10, color:'var(--blue)' }}>#{item.orden_id}</code>
            </div>
          )}
          {item.sku && (
            <div style={{ fontSize:11, color:'var(--text2)', background:'var(--surface2)',
              border:'1px solid var(--border)', borderRadius:5, padding:'2px 8px' }}>
              SKU <code style={{ fontSize:10, color:'var(--blue)' }}>{item.sku}</code>
            </div>
          )}
          {item.producto && (
            <div style={{ fontSize:11, color:'var(--text2)', background:'var(--surface2)',
              border:'1px solid var(--border)', borderRadius:5, padding:'2px 8px',
              maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {item.producto}
            </div>
          )}
          {item.claim_id && (
            <div style={{ fontSize:11, color:'var(--red)', background:'var(--red-light)',
              border:'1px solid var(--red-border)', borderRadius:5, padding:'2px 8px', fontWeight:600 }}>
              Reclamo #{item.claim_id}
            </div>
          )}
        </div>

        {isClaim && item.timer_segundos != null && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8,
            background:'var(--red-light)', border:'1px solid var(--red-border)',
            borderRadius:'var(--radius-sm)', padding:'6px 10px' }}>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--red)' }}>Tiempo abierto:</span>
            <ClaimTimer segundosIniciales={item.timer_segundos} />
          </div>
        )}
      </div>

      {/* Hilo de conversación */}
      <div ref={threadRef} style={{ flex:1, overflowY:'auto', padding:'14px',
        display:'flex', flexDirection:'column', gap:10 }}>
        {hilo.map((msg, i) => {
          const isBot = msg.from === 'seller'
          return (
            <div key={i} style={{ display:'flex', flexDirection:'column',
              alignItems: isBot ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius:12,
                fontSize:13, lineHeight:1.55, color:'var(--text)',
                background: isBot ? 'var(--purple-light)' : isClaim ? 'var(--red-light)' : 'var(--surface)',
                border: `1px solid ${isBot ? 'var(--purple-border)' : isClaim ? 'var(--red-border)' : 'var(--border)'}` }}>
                {msg.text}
              </div>
              <div style={{ fontSize:10, color:'var(--text3)', marginTop:3, paddingLeft:4, paddingRight:4 }}>
                {isBot ? (item.cuenta || 'Seller') : (item.comprador || 'Comprador')}
                {msg.date && <> · {new Date(msg.date).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' })}</>}
              </div>
            </div>
          )
        })}

        {/* Respuesta final enviada */}
        {isResolved && item.respuesta_final && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
            <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius:12,
              background:'var(--green-light)', border:'1px solid var(--green-border)',
              fontSize:13, lineHeight:1.55, color:'var(--text)' }}>
              {item.respuesta_final}
            </div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:3, textAlign:'right', paddingRight:4 }}>
              {item.atendido_por || 'Sistema'}
            </div>
          </div>
        )}
      </div>

      {/* Bloque IA para mensajes con respuesta */}
      {!isResolved && !isClaim && item.respuesta_ia && (
        <div style={{ margin:'0 14px 12px', background:'var(--surface)',
          border:'1.5px solid var(--purple-border)', borderRadius:'var(--radius)',
          boxShadow:'var(--shadow-md)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px',
            background:'var(--purple-light)', borderBottom:'1px solid var(--purple-border)' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--purple)',
              letterSpacing:'.05em', textTransform:'uppercase' }}>Respuesta IA</span>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
              background:cf.bg, color:cf.color, border:`1px solid ${cf.br}` }}>
              {cf.label}
            </span>
            {item.agente && (
              <span style={{ fontSize:11, color:'var(--text3)', marginLeft:'auto' }}>
                Agente: {item.agente}
              </span>
            )}
            <button onClick={() => { setEditMode(!editMode); setEditText(item.respuesta_ia) }}
              style={{ marginLeft: item.agente ? 0 : 'auto', fontSize:11, fontWeight:600,
                padding:'3px 10px', borderRadius:5, border:'1px solid var(--purple-border)',
                background: editMode ? 'var(--purple)' : 'transparent',
                color: editMode ? '#fff' : 'var(--purple)', cursor:'pointer' }}>
              {editMode ? 'Cancelar' : '✏️ Editar'}
            </button>
          </div>
          {editMode ? (
            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
              style={{ width:'100%', border:'none', borderTop:'1px solid var(--border)',
                padding:'12px 14px', fontSize:13, color:'var(--text)', lineHeight:1.55,
                fontFamily:'inherit', resize:'vertical', outline:'none', background:'var(--blue-light)' }} />
          ) : (
            <div style={{ padding:'12px 14px', fontSize:13, color:'var(--text)', lineHeight:1.55 }}>
              {item.respuesta_ia}
            </div>
          )}
        </div>
      )}

      {/* Corrección post-envío */}
      {isResolved && item.estado === 'resuelto' && corrMode && (
        <div style={{ margin:'0 14px 12px', background:'var(--surface)',
          border:'1.5px solid var(--amber-border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
          <div style={{ padding:'8px 14px', background:'var(--amber-light)',
            borderBottom:'1px solid var(--amber-border)',
            fontSize:11, fontWeight:700, color:'var(--amber)' }}>
            CORREGIR PARA ENTRENAMIENTO
          </div>
          <textarea value={corrText} onChange={e => setCorrText(e.target.value)} rows={3}
            placeholder="Escribe la respuesta correcta..."
            style={{ width:'100%', border:'none', padding:'10px 14px', fontSize:13,
              fontFamily:'inherit', resize:'none', outline:'none', color:'var(--text)' }} />
          <div style={{ display:'flex', gap:8, padding:'8px 14px',
            borderTop:'1px solid var(--border)', background:'var(--surface2)' }}>
            <button onClick={handleCorrect} disabled={sending || !corrText.trim()}
              style={{ fontSize:12, fontWeight:700, padding:'7px 16px', borderRadius:'var(--radius-sm)',
                background:'var(--amber)', color:'#fff', border:'none', cursor:'pointer',
                opacity: sending || !corrText.trim() ? .6 : 1 }}>
              Guardar
            </button>
            <button onClick={() => setCorrMode(false)}
              style={{ fontSize:12, fontWeight:600, padding:'7px 12px', borderRadius:'var(--radius-sm)',
                background:'transparent', color:'var(--text2)', border:'1px solid var(--border)', cursor:'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Barra de acciones */}
      <div style={{ padding:'12px 14px', borderTop:'1.5px solid var(--border)',
        background:'var(--surface)', display:'flex', gap:8, flexShrink:0, flexWrap:'wrap',
        alignItems:'center' }}>

        {/* RECLAMO — botones específicos */}
        {isClaim && !isResolved && (
          <>
            {claimLink && (
              <a href={claimLink} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:12, fontWeight:700, padding:'9px 18px',
                  borderRadius:'var(--radius-sm)', border:'1.5px solid var(--red-border)',
                  background:'var(--red)', color:'#fff', cursor:'pointer',
                  textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6 }}>
                🔗 Ver reclamo en ML
              </a>
            )}
            <button onClick={handleMarkResolved} disabled={sending}
              style={{ fontSize:12, fontWeight:700, padding:'9px 18px',
                borderRadius:'var(--radius-sm)', border:'1.5px solid var(--green-border)',
                background:'var(--green)', color:'#fff', cursor:'pointer',
                opacity: sending ? .6 : 1 }}>
              {sending ? 'Guardando...' : '✓ Marcar atendido'}
            </button>
            <button onClick={handleDiscard} disabled={sending}
              style={{ fontSize:12, fontWeight:600, padding:'9px 18px',
                borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)',
                background:'var(--surface)', color:'var(--text2)', cursor:'pointer' }}>
              Descartar
            </button>
          </>
        )}

        {/* POST-VENTA / PRE-COMPRA — botones normales */}
        {!isClaim && !isResolved && item.respuesta_ia && (
          <>
            <button onClick={handleApprove} disabled={sending}
              style={{ fontSize:12, fontWeight:700, padding:'9px 18px',
                borderRadius:'var(--radius-sm)', border:'1.5px solid var(--green-border)',
                background:'var(--green)', color:'#fff', cursor:'pointer',
                opacity: sending ? .6 : 1 }}>
              {sending ? 'Enviando...' : 'Aprobar y enviar'}
            </button>
            <button onClick={() => { setEditMode(!editMode); setEditText(item.respuesta_ia) }}
              style={{ fontSize:12, fontWeight:700, padding:'9px 18px',
                borderRadius:'var(--radius-sm)', border:'1.5px solid var(--purple-border)',
                background:'var(--purple-light)', color:'var(--purple)', cursor:'pointer' }}>
              {editMode ? 'Cancelar edición' : '✏️ Editar'}
            </button>
            {editMode && (
              <button onClick={handleApprove} disabled={sending || !editText.trim()}
                style={{ fontSize:12, fontWeight:700, padding:'9px 18px',
                  borderRadius:'var(--radius-sm)', border:'1.5px solid var(--green-border)',
                  background:'var(--green)', color:'#fff', cursor:'pointer',
                  opacity: sending ? .6 : 1 }}>
                Enviar editado
              </button>
            )}
            <button onClick={handleDiscard} disabled={sending}
              style={{ fontSize:12, fontWeight:600, padding:'9px 18px',
                borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)',
                background:'var(--surface)', color:'var(--text2)', cursor:'pointer' }}>
              Descartar
            </button>
          </>
        )}

        {/* Corrección post-envío */}
        {isResolved && item.estado === 'resuelto' && !corrMode && !isClaim && (
          <button onClick={() => setCorrMode(true)}
            style={{ fontSize:12, fontWeight:600, padding:'9px 16px',
              borderRadius:'var(--radius-sm)', border:'1.5px solid var(--amber-border)',
              background:'var(--amber-light)', color:'var(--amber)', cursor:'pointer' }}>
            Corregir para entrenamiento
          </button>
        )}

        {success && (
          <span style={{ fontSize:12, fontWeight:600, marginLeft:'auto',
            color: success.startsWith('❌') ? 'var(--red)' : 'var(--green)' }}>
            {success}
          </span>
        )}
      </div>
    </div>
  )
}
