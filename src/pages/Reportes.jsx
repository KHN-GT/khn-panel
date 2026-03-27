import Topbar from '../components/Topbar'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const RAILWAY = 'https://worker-production-d575.up.railway.app'
const CUENTAS = ['Todas', 'GTK', 'RBN', 'GDP']
const TIPOS   = ['Todos', 'RECLAMO', 'POST-VENTA', 'PRE-COMPRA']
const ESTADOS = ['Todos', 'resuelto', 'descartado', 'pendiente', 'en_progreso']

const ACCT_COLOR = {
  GTK: { color:'var(--acct-gtk)', bg:'var(--acct-gtk-bg)', br:'var(--acct-gtk-br)' },
  RBN: { color:'var(--acct-rbn)', bg:'var(--acct-rbn-bg)', br:'var(--acct-rbn-br)' },
  GDP: { color:'var(--acct-gdp)', bg:'var(--acct-gdp-bg)', br:'var(--acct-gdp-br)' },
}
const TIPO_COLOR = {
  RECLAMO:      { bg:'var(--red-light)',    color:'var(--red)',    br:'var(--red-border)'    },
  'POST-VENTA': { bg:'var(--amber-light)',  color:'var(--amber)',  br:'var(--amber-border)'  },
  'PRE-COMPRA': { bg:'var(--purple-light)', color:'var(--purple)', br:'var(--purple-border)' },
}
const ESTADO_COLOR = {
  resuelto:    { bg:'var(--green-light)', color:'var(--green)', br:'var(--green-border)'   },
  descartado:  { bg:'var(--surface2)',    color:'var(--text3)', br:'var(--border)'         },
  pendiente:   { bg:'var(--amber-light)', color:'var(--amber)', br:'var(--amber-border)'   },
  en_progreso: { bg:'var(--blue-light)',  color:'var(--blue)',  br:'var(--blue-border)'    },
}

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('khn_token')}`, 'Content-Type': 'application/json' }
}

export default function Reportes({ onLogout }) {
  const navigate = useNavigate()
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [cuenta,     setCuenta]     = useState('Todas')
  const [tipo,       setTipo]       = useState('Todos')
  const [estado,     setEstado]     = useState('Todos')
  const [busqueda,   setBusqueda]   = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  useEffect(() => { cargar() }, [cuenta, tipo, estado])

  const cargar = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (cuenta !== 'Todas') params.set('cuenta', cuenta)
    if (tipo   !== 'Todos') params.set('tipo',   tipo)
    params.set('estado', estado === 'Todos' ? 'pendiente,en_progreso,resuelto,descartado' : estado)
    params.set('limit', '500')
    try {
      const r = await fetch(`${RAILWAY}/api/inbox?${params}`, { headers: authHeaders() })
      const d = await r.json()
      setItems(Array.isArray(d.items) ? d.items : Array.isArray(d) ? d : [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }

  const filtrados = items.filter(i => {
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!((i.comprador||'').toLowerCase().includes(q) ||
            (i.producto||'').toLowerCase().includes(q)  ||
            (i.sku||'').toLowerCase().includes(q)       ||
            (i.orden_id||'').includes(q))) return false
    }
    if (fechaDesde && i.creado_en < fechaDesde) return false
    if (fechaHasta && i.creado_en > fechaHasta + 'T23:59:59') return false
    return true
  })

  // Métricas — resuelto + descartado = atendidos
  const total     = filtrados.length
  const atendidos = filtrados.filter(i => ['resuelto','descartado'].includes(i.estado)).length
  const pendientes= filtrados.filter(i => i.estado === 'pendiente').length
  const reclamos  = filtrados.filter(i => i.tipo === 'RECLAMO').length
  const tasaAten  = total ? Math.round(atendidos / total * 100) : 0

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Topbar onLogout={onLogout} />

      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

        {/* ── Métricas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Total mensajes',   value: total,              color:'var(--purple)', bg:'var(--purple-light)', br:'var(--purple-border)' },
            { label:'Atendidos',        value: atendidos,          color:'var(--green)',  bg:'var(--green-light)',  br:'var(--green-border)'  },
            { label:'Pendientes',       value: pendientes,         color:'var(--amber)',  bg:'var(--amber-light)',  br:'var(--amber-border)'  },
            { label:'Tasa atención',    value: tasaAten + '%',     color:'var(--blue)',   bg:'var(--blue-light)',   br:'var(--blue-border)'   },
          ].map(m => (
            <div key={m.label} style={{ background:m.bg, border:`1.5px solid ${m.br}`, borderRadius:'var(--radius)', padding:'16px 20px' }}>
              <div style={{ fontSize:11, fontWeight:600, color:m.color, marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:28, fontWeight:800, color:m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* ── Fila 2 métricas: desglose por tipo */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Reclamos',   value: filtrados.filter(i=>i.tipo==='RECLAMO').length,      ...TIPO_COLOR['RECLAMO']      },
            { label:'Post-venta', value: filtrados.filter(i=>i.tipo==='POST-VENTA').length,   ...TIPO_COLOR['POST-VENTA']   },
            { label:'Pre-compra', value: filtrados.filter(i=>i.tipo==='PRE-COMPRA').length,   ...TIPO_COLOR['PRE-COMPRA']   },
          ].map(m => (
            <div key={m.label} style={{ background:m.bg, border:`1.5px solid ${m.br}`, borderRadius:'var(--radius)', padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:22, fontWeight:800, color:m.color, minWidth:36 }}>{m.value}</div>
              <div style={{ fontSize:12, fontWeight:600, color:m.color }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filtros */}
        <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px', marginBottom:16, display:'flex', flexWrap:'wrap', gap:12, alignItems:'center' }}>
          <input
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por comprador, SKU, orden..."
            style={{ fontSize:13, padding:'7px 12px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', color:'var(--text)', flex:1, minWidth:200, outline:'none' }}
          />
          <div style={{ display:'flex', gap:4 }}>
            {CUENTAS.map(c => (
              <button key={c} onClick={() => setCuenta(c)}
                style={{ fontSize:12, fontWeight:700, padding:'6px 12px', borderRadius:'var(--radius-sm)',
                  border:`1.5px solid ${cuenta===c ? (ACCT_COLOR[c]?.br||'var(--purple-border)') : 'var(--border)'}`,
                  background: cuenta===c ? (ACCT_COLOR[c]?.bg||'var(--purple-light)') : 'transparent',
                  color: cuenta===c ? (ACCT_COLOR[c]?.color||'var(--purple)') : 'var(--text3)', cursor:'pointer' }}>
                {c}
              </button>
            ))}
          </div>
          <select value={tipo} onChange={e => setTipo(e.target.value)}
            style={{ fontSize:13, padding:'7px 10px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', color:'var(--text)', cursor:'pointer', outline:'none' }}>
            {TIPOS.map(t => <option key={t} value={t}>{t === 'Todos' ? 'Todos los tipos' : t}</option>)}
          </select>
          <select value={estado} onChange={e => setEstado(e.target.value)}
            style={{ fontSize:13, padding:'7px 10px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', color:'var(--text)', cursor:'pointer', outline:'none' }}>
            {ESTADOS.map(e => <option key={e} value={e}>{e === 'Todos' ? 'Todos los estados' : e}</option>)}
          </select>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'var(--text3)' }}>Desde</span>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              style={{ fontSize:12, padding:'6px 8px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', color:'var(--text)', outline:'none' }} />
            <span style={{ fontSize:12, color:'var(--text3)' }}>Hasta</span>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              style={{ fontSize:12, padding:'6px 8px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', color:'var(--text)', outline:'none' }} />
          </div>
        </div>

        {/* ── Tabla */}
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Cargando historial...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📭</div>
            <div style={{ fontSize:14, fontWeight:600 }}>Sin resultados</div>
          </div>
        ) : (
          <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 110px 100px 130px 110px', padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em' }}>
              <div>Comprador / Producto</div>
              <div>Cuenta</div>
              <div>Tipo</div>
              <div>Estado</div>
              <div>Fecha</div>
              <div>Atendido por</div>
            </div>
            {filtrados.map((item, i) => {
              const tc  = TIPO_COLOR[item.tipo]    || { bg:'var(--surface2)', color:'var(--text3)', br:'var(--border)' }
              const ec  = ESTADO_COLOR[item.estado] || { bg:'var(--surface2)', color:'var(--text3)', br:'var(--border)' }
              const ac  = ACCT_COLOR[item.cuenta]  || ACCT_COLOR.GTK
              const fecha = item.creado_en
                ? new Date(item.creado_en).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'2-digit' })
                : '—'
              // Línea de producto: título completo si existe, si no SKU con label
              const productoLabel = item.producto
                ? item.producto
                : item.sku
                  ? `SKU: ${item.sku}`
                  : '—'
              return (
                <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1fr 100px 110px 100px 130px 110px', padding:'10px 16px', borderBottom: i < filtrados.length-1 ? '1px solid var(--border)' : 'none', alignItems:'center', background: i%2===0 ? 'transparent' : 'var(--surface2)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                    {item.imagen_thumbnail && (
                      <img src={item.imagen_thumbnail} alt=""
                        style={{ width:36, height:36, objectFit:'contain', borderRadius:4, border:'1px solid var(--border)', flexShrink:0, background:'#fff' }}
                        onError={e => { e.target.style.display='none' }}
                      />
                    )}
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:300 }}>
                        {item.comprador || 'Comprador'}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:300 }}>
                        {productoLabel}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, background:ac.bg, color:ac.color, border:`1px solid ${ac.br}` }}>
                      {item.cuenta}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, background:tc.bg, color:tc.color, border:`1px solid ${tc.br}` }}>
                      {item.tipo}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, background:ec.bg, color:ec.color, border:`1px solid ${ec.br}` }}>
                      {item.estado}
                    </span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>{fecha}</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>{item.atendido_por || '—'}</div>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ fontSize:12, color:'var(--text3)', marginTop:12, textAlign:'right' }}>
          {filtrados.length} registros mostrados
        </div>
      </div>
    </div>
  )
}
