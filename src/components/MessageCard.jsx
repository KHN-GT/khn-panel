import ClaimTimer from './ClaimTimer'

const ACCT = {
  GTK: { color: 'var(--acct-gtk)', bg: 'var(--acct-gtk-bg)', br: 'var(--acct-gtk-br)' },
  RBN: { color: 'var(--acct-rbn)', bg: 'var(--acct-rbn-bg)', br: 'var(--acct-rbn-br)' },
  GDP: { color: 'var(--acct-gdp)', bg: 'var(--acct-gdp-bg)', br: 'var(--acct-gdp-br)' },
}
const CONF = {
  alta:          { color: 'var(--green)',  dot: '#059669' },
  media:         { color: 'var(--amber)',  dot: '#d97706' },
  baja:          { color: 'var(--red)',    dot: '#e53e3e' },
  fuera_horario: { color: 'var(--text3)',  dot: '#9aa0b8' },
}

export default function MessageCard({ item, selected, onClick }) {
  const ac   = ACCT[item.cuenta] || ACCT.GTK
  const cf   = CONF[item.confianza] || CONF.alta
  const isClaim = item.tipo === 'RECLAMO'

  return (
    <div
      onClick={onClick}
      className="animate-in"
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius)',
        border: `1.5px solid ${isClaim
          ? (selected ? 'var(--red)' : 'var(--red-border)')
          : (selected ? 'var(--purple)' : 'var(--border)')}`,
        background: isClaim
          ? (selected ? '#fef2f2' : 'var(--red-light)')
          : (selected ? 'var(--purple-light)' : 'var(--surface)'),
        cursor: 'pointer',
        marginBottom: 4,
        transition: 'all .15s',
        boxShadow: selected ? 'var(--shadow)' : 'none',
      }}
    >
      {/* Fila superior: nombre + badge cuenta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        {!isClaim && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: cf.dot,
          }} />
        )}
        {isClaim && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: 'var(--red)', animation: 'pulse 1s infinite',
          }} />
        )}
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--text)',
          flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.comprador || 'Comprador'}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: ac.bg, color: ac.color, border: `1px solid ${ac.br}`,
          letterSpacing: '.04em', flexShrink: 0,
        }}>
          {item.cuenta}
        </span>
      </div>

      {/* Producto */}
      <div style={{
        fontSize: 11, color: 'var(--text2)', marginBottom: 2,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.producto || item.sku || 'Sin producto'}
      </div>

      {/* Preview del mensaje */}
      <div style={{
        fontSize: 11, color: 'var(--text3)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.mensaje_cliente?.slice(0, 60) || '—'}
      </div>

      {/* Timer de reclamo */}
      {isClaim && item.timer_segundos != null && (
        <ClaimTimer timerSegundos={item.timer_segundos} style={{ marginTop: 5 }} />
      )}
    </div>
  )
}
