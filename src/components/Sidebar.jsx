import MessageCard from './MessageCard'

const ACCT_BTNS = ['Todas', 'GTK', 'RBN', 'GDP']

export default function Sidebar({ items, selectedId, onSelect, acctFilter, onAcctFilter }) {
  const filtered = acctFilter === 'Todas' ? items : items.filter(i => i.cuenta === acctFilter)
  const claims   = filtered.filter(i => i.tipo === 'RECLAMO')
  const post     = filtered.filter(i => i.tipo === 'POST-VENTA')
  const pre      = filtered.filter(i => i.tipo === 'PRE-COMPRA')

  const SectionHeader = ({ label, count, color, bg, br }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 4px 6px', marginTop: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
        textTransform: 'uppercase', color: color || 'var(--text3)' }}>
        {label}
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
        background: bg || 'var(--surface2)', color: color || 'var(--text3)',
        border: `1px solid ${br || 'var(--border)'}` }}>
        {count}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )

  return (
    <div style={{
      background: 'var(--surface)', borderRight: '1.5px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Filtros de cuenta */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 12px 8px' }}>
        {ACCT_BTNS.map(a => (
          <button key={a} onClick={() => onAcctFilter(a)} style={{
            flex: 1, fontSize: 11, fontWeight: 700, padding: '6px 0',
            borderRadius: 'var(--radius-sm)',
            border: `1.5px solid ${acctFilter === a ? 'var(--purple-border)' : 'var(--border)'}`,
            background: acctFilter === a ? 'var(--purple-light)' : 'transparent',
            color: acctFilter === a ? 'var(--purple)' : 'var(--text3)',
            cursor: 'pointer', transition: 'all .15s',
          }}>
            {a}
          </button>
        ))}
      </div>

      {/* Cola */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
        {claims.length > 0 && (
          <>
            <SectionHeader label="Reclamos" count={claims.length}
              color="var(--red)" bg="var(--red-light)" br="var(--red-border)" />
            {claims.map(i => (
              <MessageCard key={i.id} item={i} selected={i.id === selectedId} onClick={() => onSelect(i)} />
            ))}
          </>
        )}

        {post.length > 0 && (
          <>
            <SectionHeader label="Post-venta" count={post.length}
              color="var(--amber)" bg="var(--amber-light)" br="var(--amber-border)" />
            {post.map(i => (
              <MessageCard key={i.id} item={i} selected={i.id === selectedId} onClick={() => onSelect(i)} />
            ))}
          </>
        )}

        {pre.length > 0 && (
          <>
            <SectionHeader label="Pre-compra" count={pre.length}
              color="var(--purple)" bg="var(--purple-light)" br="var(--purple-border)" />
            {pre.map(i => (
              <MessageCard key={i.id} item={i} selected={i.id === selectedId} onClick={() => onSelect(i)} />
            ))}
          </>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Todo atendido</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>No hay mensajes pendientes</div>
          </div>
        )}
      </div>
    </div>
  )
}
