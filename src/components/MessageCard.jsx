import { useState, useEffect } from 'react'
import ClaimTimer from './ClaimTimer'

const ACCT = {
  GTK: { color: 'var(--acct-gtk)', bg: 'var(--acct-gtk-bg)', br: 'var(--acct-gtk-br)' },
  RBN: { color: 'var(--acct-rbn)', bg: 'var(--acct-rbn-bg)', br: 'var(--acct-rbn-br)' },
  GDP: { color: 'var(--acct-gdp)', bg: 'var(--acct-gdp-bg)', br: 'var(--acct-gdp-br)' },
}
const CONF = {
  alta:          { dot: '#059669' },
  media:         { dot: '#d97706' },
  baja:          { dot: '#e53e3e' },
  fuera_horario: { dot: '#9aa0b8' },
}
const URGENCIA = {
  CRITICO:     { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', dot: '#dc2626', label: 'CRITICO',   pulse: true  },
  URGENTE:     { color: '#ea580c', bg: '#fff7ed', border: '#fdba74', dot: '#ea580c', label: 'URGENTE',   pulse: true  },
  MODERADO:    { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', dot: '#d97706', label: 'MODERADO',  pulse: false },
  INFORMATIVO: { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', dot: '#16a34a', label: 'NO AFECTA', pulse: false },
}

// Formatea segundos transcurridos en texto legible
function fmtElapsed(segundos) {
  if (segundos < 60)  return `${segundos}s`
  if (segundos < 3600) return `${Math.floor(segundos/60)}min`
  if (segundos < 86400) return `${Math.floor(segundos/3600)}h`
  return `${Math.floor(segundos/86400)}d`
}

// Color del timer según urgencia del tiempo
function timerColor(segundos) {
  if (segundos < 300)  return '#059669'  // verde: menos de 5 min
  if (segundos < 1800) return '#d97706'  // amarillo: menos de 30 min
  return '#dc2626'                        // rojo: más de 30 min
}

// Hook para timer en vivo
function useElapsedSeconds(creado_en) {
  const [secs, setSecs] = useState(() => {
    if (!creado_en) return null
    return Math.floor((Date.now() - new Date(creado_en).getTime()) / 1000)
  })
  useEffect(() => {
    if (!creado_en) return
    const id = setInterval(() => {
      setSecs(Math.floor((Date.now() - new Date(creado_en).getTime()) / 1000))
    }, 30000) // actualiza cada 30 segundos
    return () => clearInterval(id)
  }, [creado_en])
  return secs
}

export default function MessageCard({ item, selected, onClick }) {
  const ac      = ACCT[item.cuenta] || ACCT.GTK
  const cf      = CONF[item.confianza] || CONF.alta
  const isClaim = item.tipo === 'RECLAMO' || item.tipo === 'reclamo' || !!item.claim_id
  const isPrecompra = item.tipo === 'PRE-COMPRA'
  const urg     = isClaim ? (URGENCIA[item.urgencia] || URGENCIA.MODERADO) : null
  const isPendiente = item.estado === 'pendiente' || item.estado === 'IA_sugerida'

  // Timer solo para preguntas pendientes sin responder
  const elapsedSecs = useElapsedSeconds(
    (isPrecompra && isPendiente) ? item.creado_en : null
  )

  const cardBorder = isClaim
    ? (selected ? urg.color : urg.border)
    : (selected ? 'var(--purple)' : 'var(--border)')
  const cardBg = isClaim ? urg.bg : (selected ? 'var(--purple-light)' : 'var(--surface)')

  return (
    <div onClick={onClick} className="animate-in"
      style={{
        padding: '12px 14px', borderRadius: 'var(--radius)',
        border: `1.5px solid ${cardBorder}`, background: cardBg,
        cursor: 'pointer', marginBottom: 6, transition: 'all .15s',
        boxShadow: selected ? 'var(--shadow)' : 'none',
      }}>

      {/* Fila superior: nombre + badge cuenta + timer */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: isClaim ? urg.dot : cf.dot,
          animation: (isClaim && urg.pulse) ? 'pulse 1s infinite' : 'none',
        }} />
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)',
          flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {item.comprador || 'Comprador'}
        </span>
        {/* Timer PRE-COMPRA pendiente */}
        {isPrecompra && isPendiente && elapsedSecs !== null && (
          <span style={{
            fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:99,
            color: timerColor(elapsedSecs),
            background: timerColor(elapsedSecs) + '18',
            border: `1px solid ${timerColor(elapsedSecs)}44`,
            flexShrink:0, letterSpacing:'.02em'
          }}>
            {fmtElapsed(elapsedSecs)}
          </span>
        )}
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5,
          background:ac.bg, color:ac.color, border:`1px solid ${ac.br}`, flexShrink:0 }}>
          {item.cuenta}
        </span>
      </div>

      {/* Badge urgencia reclamo */}
      {isClaim && urg && (
        <div style={{ marginBottom:4 }}>
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99,
            background:urg.bg, color:urg.color, border:`1px solid ${urg.border}`, letterSpacing:'.05em' }}>
            {urg.label}
          </span>
        </div>
      )}

      {/* Producto */}
      {(item.producto || item.sku) && (
        <div style={{ fontSize:12, color:'var(--text2)', marginBottom:3,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {item.producto || item.sku}
        </div>
      )}

      {/* Precio y stock — solo PRE-COMPRA */}
      {isPrecompra && (item.precio != null || item.stock != null) && (
        <div style={{ display:'flex', gap:8, marginBottom:4, alignItems:'center' }}>
          {item.precio != null && (
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text)' }}>
              MX${Number(item.precio).toLocaleString('es-MX', {minimumFractionDigits:0})}
            </span>
          )}
          {item.stock != null && (
            <span style={{ fontSize:10, color: item.stock > 0 ? '#059669' : '#dc2626',
              fontWeight:600 }}>
              {item.stock > 0 ? `${item.stock.toLocaleString()} en stock` : 'Sin stock'}
            </span>
          )}
        </div>
      )}

      {/* Badge Pedido hecho — solo PRE-COMPRA */}
      {isPrecompra && item.pedido_hecho && (
        <div style={{ marginBottom:4 }}>
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99,
            background:'#dcfce7', color:'#16a34a', border:'1px solid #86efac',
            letterSpacing:'.04em' }}>
            ✓ Pedido hecho
          </span>
        </div>
      )}

      {/* Badge de estado — solo PRE-COMPRA */}
      {isPrecompra && (() => {
        const ESTADO_BADGE = {
          pendiente:      { label: 'Sin respuesta',     color: '#d97706', bg: '#fffbeb', br: '#fcd34d' },
          IA_sugerida:    { label: 'Respuesta IA lista', color: '#7c3aed', bg: '#f5f3ff', br: '#c4b5fd' },
          resuelto:       { label: 'Respondida',         color: '#059669', bg: '#f0fdf4', br: '#86efac' },
          fuera_horario:  { label: 'Fuera de horario',   color: '#6b7280', bg: '#f9fafb', br: '#d1d5db' },
          descartado:     { label: 'Descartada',         color: '#6b7280', bg: '#f9fafb', br: '#d1d5db' },
        }
        const b = ESTADO_BADGE[item.estado]
        if (!b) return null
        return (
          <div style={{ marginBottom:4 }}>
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99,
              background:b.bg, color:b.color, border:`1px solid ${b.br}`, letterSpacing:'.04em' }}>
              {b.label}
            </span>
          </div>
        )
      })()}

      {/* Preview pregunta */}
      <div style={{ fontSize:12, color:'var(--text3)',
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {item.mensaje_cliente?.slice(0, 70) || '—'}
      </div>

      {/* Timer reclamo — solo CRITICO y URGENTE */}
      {isClaim && item.timer_segundos != null && urg && urg.pulse && (
        <ClaimTimer timerSegundos={item.timer_segundos} style={{ marginTop:6 }} />
      )}
    </div>
  )
}
