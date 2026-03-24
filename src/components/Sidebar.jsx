import MessageCard from './MessageCard'

const TABS = [
  { id: 'RECLAMO',    label: 'Reclamos',   color: 'var(--red)',    bg: 'var(--red-light)',    br: 'var(--red-border)' },
  { id: 'POST-VENTA', label: 'Post-venta', color: 'var(--amber)',  bg: 'var(--amber-light)',  br: 'var(--amber-border)' },
  { id: 'PRE-COMPRA', label: 'Preguntas',  color: 'var(--purple)', bg: 'var(--purple-light)', br: 'var(--purple-border)' },
]
const ACCT_BTNS = ['Todas', 'GTK', 'RBN', 'GDP']

export default function Sidebar({ items, selectedId, onSelect, acctFilter, onAcctFilter, tipoFilter, onTipoFilter }) {
  const byTipo = (tipo) => items.filter(i =>
    i.tipo === tipo && (acctFilter === 'Todas' || i.cuenta === acctFilter)
  )
  const counts = {
    'RECLAMO':    byTipo('RECLAMO').length,
    'POST-VENTA': byTipo('POST-VENTA').length,
    'PRE-COMPRA': byTipo('PRE-COMPRA').length,
  }
  const filtered = byTipo(tipoFilter)

  return (
    <div style={{ background:'var(--surface)', borderRight:'1.5px solid var(--border)',
      display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Pestañas de tipo */}
      <div style={{ display:'flex', borderBottom:'1.5px solid var(--border)', flexShrink:0 }}>
        {TABS.map(tab => {
          const active = tipoFilter === tab.id
          return (
            <button key={tab.id} onClick={() => onTipoFilter(tab.id)} style={{
              flex: 1, padding: '11px 4px 10px', border: 'none',
              borderBottom: `2.5px solid ${active ? tab.color : 'transparent'}`,
              background: active ? tab.bg : 'transparent',
              cursor: 'pointer', transition: 'all .15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700,
                color: active ? tab.color : 'var(--text3)' }}>
                {tab.label}
              </span>
              {counts[tab.id] > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px',
                  borderRadius: 99, background: active ? tab.color : 'var(--surface2)',
                  color: active ? '#fff' : 'var(--text3)',
                  border: `1px solid ${active ? tab.color : 'var(--border)'}` }}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Filtros de cuenta */}
      <div style={{ display:'flex', gap:4, padding:'10px 10px 6px', flexShrink:0 }}>
        {ACCT_BTNS.map(a => (
          <button key={a} onClick={() => onAcctFilter(a)} style={{
            flex:1, fontSize:12, fontWeight:700, padding:'7px 0',
            borderRadius:'var(--radius-sm)',
            border:`1.5px solid ${acctFilter === a ? 'var(--purple-border)' : 'var(--border)'}`,
            background: acctFilter === a ? 'var(--purple-light)' : 'transparent',
            color: acctFilter === a ? 'var(--purple)' : 'var(--text3)',
            cursor:'pointer', transition:'all .15s',
          }}>
            {a}
          </button>
        ))}
      </div>

      {/* Cola */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 10px 10px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 16px', color:'var(--text3)' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>✓</div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text2)' }}>Todo atendido</div>
            <div style={{ fontSize:13, marginTop:4 }}>No hay mensajes pendientes</div>
          </div>
        ) : (
          filtered.map(i => (
            <MessageCard key={i.id} item={i} selected={i.id === selectedId} onClick={() => onSelect(i)} />
          ))
        )}
      </div>
    </div>
  )
}
