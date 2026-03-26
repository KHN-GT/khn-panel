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

export default function MessageCard({ item, selected, onClick }) {
  const ac      = ACCT[item.cuenta] || ACCT.GTK
  const cf      = CONF[item.confianza] || CONF.alta
  const isClaim = item.tipo === 'RECLAMO' || item.tipo === 'reclamo' || !!item.claim_id
  const urg     = isClaim ? (URGENCIA[item.urgencia] || URGENCIA.MODERADO) : null

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
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5,
          background:ac.bg, color:ac.color, border:`1px solid ${ac.br}`, flexShrink:0 }}>
          {item.cuenta}
        </span>
      </div>

      {isClaim && urg && (
        <div style={{ marginBottom:4 }}>
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99,
            background:urg.bg, color:urg.color, border:`1px solid ${urg.border}`, letterSpacing:'.05em' }}>
            {urg.label}
          </span>
        </div>
      )}

      {(item.producto || item.sku) && (
        <div style={{ fontSize:12, color:'var(--text2)', marginBottom:3,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {item.producto || item.sku}
        </div>
      )}

      <div style={{ fontSize:12, color:'var(--text3)',
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {item.mensaje_cliente?.slice(0, 70) || '—'}
      </div>

      {isClaim && item.timer_segundos != null && urg && urg.pulse && (
        <ClaimTimer timerSegundos={item.timer_segundos} style={{ marginTop:6 }} />
      )}
    </div>
  )
}
