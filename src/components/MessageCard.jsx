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

export default function MessageCard({ item, selected, onClick }) {
  const ac      = ACCT[item.cuenta] || ACCT.GTK
  const cf      = CONF[item.confianza] || CONF.alta
  const isClaim = item.tipo === 'RECLAMO'

  return (
    <div onClick={onClick} className="animate-in"
      style={{
        padding: '12px 14px',
        borderRadius: 'var(--radius)',
        border: `1.5px solid ${isClaim
          ? (selected ? 'var(--red)' : 'var(--red-border)')
          : (selected ? 'var(--purple)' : 'var(--border)')}`,
        background: isClaim
          ? (selected ? '#fef2f2' : 'var(--red-light)')
          : (selected ? 'var(--purple-light)' : 'var(--surface)'),
        cursor: 'pointer', marginBottom: 6, transition: 'all .15s',
        boxShadow: selected ? 'var(--shadow)' : 'none',
      }}>

      {/* Fila superior: nombre + badge cuenta */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: isClaim ? 'var(--red)' : cf.dot,
          animation: isClaim ? 'pulse 1s infinite' : 'none',
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

      {/* Producto */}
      {(item.producto || item.sku) && (
        <div style={{ fontSize:12, color:'var(--text2)', marginBottom:3,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {item.producto || item.sku}
        </div>
      )}

      {/* Preview */}
      <div style={{ fontSize:12, color:'var(--text3)',
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {item.mensaje_cliente?.slice(0, 70) || '—'}
      </div>

      {/* Timer reclamo */}
      {isClaim && item.timer_segundos != null && (
        <ClaimTimer timerSegundos={item.timer_segundos} style={{ marginTop:6 }} />
      )}
    </div>
  )
}
