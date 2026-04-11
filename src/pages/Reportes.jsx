import Topbar from '../components/Topbar'
import { useState, useEffect, useMemo } from 'react'

const RAILWAY = 'https://worker-production-d575.up.railway.app'
const CUENTAS = ['Todas', 'GTK', 'RBN', 'GDP']
const TIPOS   = ['Todos', 'RECLAMO', 'POST-VENTA', 'PRE-COMPRA']
const ESTADOS = ['Todos', 'resuelto', 'descartado', 'pendiente', 'en_progreso']

const ACCT_COLOR = {
  GTK: { color:'var(--acct-gtk)', bg:'var(--acct-gtk-bg)', br:'var(--acct-gtk-br)', hex:'#7c3aed' },
  RBN: { color:'var(--acct-rbn)', bg:'var(--acct-rbn-bg)', br:'var(--acct-rbn-br)', hex:'#0891b2' },
  GDP: { color:'var(--acct-gdp)', bg:'var(--acct-gdp-bg)', br:'var(--acct-gdp-br)', hex:'#059669' },
}
const TIPO_COLOR = {
  RECLAMO:      { bg:'var(--red-light)',    color:'var(--red)',    br:'var(--red-border)',    hex:'#ef4444' },
  'POST-VENTA': { bg:'var(--amber-light)',  color:'var(--amber)',  br:'var(--amber-border)',  hex:'#f59e0b' },
  'PRE-COMPRA': { bg:'var(--purple-light)', color:'var(--purple)', br:'var(--purple-border)', hex:'#7c3aed' },
}
const ESTADO_COLOR = {
  resuelto:    { bg:'var(--green-light)', color:'var(--green)', br:'var(--green-border)'  },
  descartado:  { bg:'var(--surface2)',    color:'var(--text3)', br:'var(--border)'        },
  pendiente:   { bg:'var(--amber-light)', color:'var(--amber)', br:'var(--amber-border)'  },
  en_progreso: { bg:'var(--blue-light)',  color:'var(--blue)',  br:'var(--blue-border)'   },
}

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('khn_token')}`, 'Content-Type': 'application/json' }
}

// ── Grafica de barras SVG ────────────────────────────────────────
function BarChart({ data, height = 140, colorFn }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 100 / data.length
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width:'100%', height }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = (d.value / max) * (height - 24)
        const x = i * W + W * 0.1
        const w = W * 0.8
        const y = height - 20 - barH
        const color = colorFn ? colorFn(d) : '#7c3aed'
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={Math.max(barH, 1)} fill={color} rx="1" opacity="0.85" />
            {d.value > 0 && (
              <text x={x + w/2} y={y - 3} textAnchor="middle" fontSize="5" fill="currentColor" opacity="0.7">
                {d.value}
              </text>
            )}
            <text x={x + w/2} y={height - 4} textAnchor="middle" fontSize="4.5" fill="currentColor" opacity="0.5">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Grafica de linea SVG ─────────────────────────────────────────
function LineChart({ data, height = 120, color = '#7c3aed' }) {
  if (data.length < 2) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 100 / (data.length - 1)
  const points = data.map((d, i) => {
    const x = i * W
    const y = height - 20 - (d.value / max) * (height - 28)
    return `${x},${y}`
  }).join(' ')
  const areaPoints = `0,${height - 20} ` + points + ` ${100},${height - 20}`

  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width:'100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#lineGrad)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = i * W
        const y = height - 20 - (d.value / max) * (height - 28)
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="1.5" fill={color} />
            {i % Math.ceil(data.length / 7) === 0 && (
              <text x={x} y={height - 5} textAnchor="middle" fontSize="4.5" fill="currentColor" opacity="0.5">
                {d.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Dona SVG ─────────────────────────────────────────────────────
function DonutChart({ segments, size = 80 }) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  if (!total) return null
  let offset = 0
  const r = 28, cx = 40, cy = 40, circ = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 80 80" style={{ width: size, height: size }}>
      {segments.map((seg, i) => {
        const pct = seg.value / total
        const dash = pct * circ
        const gap  = circ - dash
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth="10"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circ}
            style={{ transition: 'stroke-dasharray 0.4s' }}
          />
        )
        offset += pct
        return el
      })}
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="currentColor">
        {total}
      </text>
      <text x={cx} y={cy+11} textAnchor="middle" fontSize="5" fill="currentColor" opacity="0.5">total</text>
    </svg>
  )
}

export default function Reportes({ onLogout }) {
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [cuenta,     setCuenta]     = useState('Todas')
  const [tipo,       setTipo]       = useState('Todos')
  const [estado,     setEstado]     = useState('Todos')
  const [busqueda,   setBusqueda]   = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [vista,      setVista]      = useState('graficas') // 'graficas' | 'tabla'
  const [rango,      setRango]      = useState('30') // dias

  useEffect(() => { cargar() }, [cuenta, tipo, estado, rango])

  const cargar = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (cuenta !== 'Todas') params.set('cuenta', cuenta)
    if (tipo   !== 'Todos') params.set('tipo',   tipo)
    params.set('estado', 'pendiente,en_progreso,resuelto,descartado,IA_sugerida,enviada,fuera_horario,en_espera')
    params.set('limit', '1000')
    try {
      const r = await fetch(`${RAILWAY}/api/inbox?${params}`, { headers: authHeaders() })
      const d = await r.json()
      setItems(Array.isArray(d.items) ? d.items : Array.isArray(d) ? d : [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }

  const filtrados = useMemo(() => {
    const diasAtras = new Date()
    diasAtras.setDate(diasAtras.getDate() - parseInt(rango))
    return items.filter(i => {
      if (busqueda) {
        const q = busqueda.toLowerCase()
        if (!((i.comprador||'').toLowerCase().includes(q) ||
              (i.producto||'').toLowerCase().includes(q)  ||
              (i.sku||'').toLowerCase().includes(q)       ||
              (i.orden_id||'').includes(q))) return false
      }
      if (fechaDesde && i.creado_en < fechaDesde) return false
      if (fechaHasta && i.creado_en > fechaHasta + 'T23:59:59') return false
      if (rango !== 'all' && i.creado_en && new Date(i.creado_en) < diasAtras) return false
      return true
    })
  }, [items, busqueda, fechaDesde, fechaHasta, rango])

  // ── Metricas ─────────────────────────────────────────────────
  const total      = filtrados.length
  const resueltos  = filtrados.filter(i => i.estado === 'resuelto').length
  const pendientes = filtrados.filter(i => ['pendiente','en_progreso'].includes(i.estado)).length
  const reclamos   = filtrados.filter(i => i.tipo === 'RECLAMO').length
  const tasaAten   = total ? Math.round(resueltos / total * 100) : 0

  // Tasa aprobacion IA (resueltos sin edicion = estado enviada o resuelto con confianza alta)
  const iaDirecta  = filtrados.filter(i => i.estado === 'resuelto' && i.confianza === 'alta').length
  const tasaIA     = resueltos ? Math.round(iaDirecta / resueltos * 100) : 0

  // Conversiones PRE-COMPRA
  const precompraRespondidas = filtrados.filter(i => i.tipo === 'PRE-COMPRA' && ['resuelto','enviada'].includes(i.estado)).length
  const conversiones = filtrados.filter(i => i.tipo === 'PRE-COMPRA' && i.conversion_en)
  const totalConversiones = conversiones.length
  const tasaConversion = precompraRespondidas ? Math.round(totalConversiones / precompraRespondidas * 100) : 0
  const tiempoPromedioConversion = (() => {
    const diffs = conversiones.filter(i => i.atendido_en).map(i =>
      (new Date(i.conversion_en) - new Date(i.atendido_en)) / 3600000
    ).filter(d => d > 0)
    if (!diffs.length) return null
    return Math.round(diffs.reduce((a,b) => a+b, 0) / diffs.length)
  })()

  // ── Datos para graficas ───────────────────────────────────────

  // Mensajes por dia (ultimos N dias)
  const diasData = useMemo(() => {
    const dias = parseInt(rango) || 30
    const buckets = {}
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('es-MX', { day:'2-digit', month:'short' })
      buckets[key] = { label: i === 0 ? 'Hoy' : label.replace(' ', '\n'), value: 0 }
    }
    filtrados.forEach(item => {
      if (item.creado_en) {
        const key = item.creado_en.slice(0, 10)
        if (buckets[key]) buckets[key].value++
      }
    })
    return Object.values(buckets)
  }, [filtrados, rango])

  // Por cuenta
  const cuentaData = ['GTK','RBN','GDP'].map(c => ({
    label: c,
    value: filtrados.filter(i => i.cuenta === c).length,
    color: ACCT_COLOR[c].hex
  }))

  // Por tipo
  const tipoData = [
    { label:'Reclamos',   value: filtrados.filter(i=>i.tipo==='RECLAMO').length,     color: TIPO_COLOR['RECLAMO'].hex      },
    { label:'Post-venta', value: filtrados.filter(i=>i.tipo==='POST-VENTA').length,  color: TIPO_COLOR['POST-VENTA'].hex   },
    { label:'Pre-compra', value: filtrados.filter(i=>i.tipo==='PRE-COMPRA').length,  color: TIPO_COLOR['PRE-COMPRA'].hex   },
  ]

  // Por dia de semana
  const diasSemana = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const semanaData = diasSemana.map((label, idx) => ({
    label,
    value: filtrados.filter(i => i.creado_en && new Date(i.creado_en).getDay() === idx).length
  }))

  // Por hora del dia
  const horaData = Array.from({length: 24}, (_, h) => ({
    label: h % 6 === 0 ? `${h}h` : '',
    value: filtrados.filter(i => i.creado_en && new Date(i.creado_en).getHours() === h).length
  }))

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Topbar onLogout={onLogout} />

      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

        {/* ── Header con controles */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Reportes</h1>
            <p style={{ fontSize:12, color:'var(--text3)', margin:'2px 0 0' }}>Analisis de actividad del panel</p>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
            {/* Rango */}
            {['7','14','30','90'].map(d => (
              <button key={d} onClick={() => setRango(d)}
                style={{ fontSize:12, fontWeight:700, padding:'5px 12px', borderRadius:6, cursor:'pointer',
                  background: rango===d ? 'var(--purple-light)' : 'transparent',
                  color: rango===d ? 'var(--purple)' : 'var(--text3)',
                  border: rango===d ? '1.5px solid var(--purple-border)' : '1px solid var(--border)' }}>
                {d}d
              </button>
            ))}
            <div style={{ width:1, height:20, background:'var(--border)' }} />
            {/* Vista */}
            {[['graficas','Graficas'],['tabla','Tabla']].map(([v,l]) => (
              <button key={v} onClick={() => setVista(v)}
                style={{ fontSize:12, fontWeight:700, padding:'5px 12px', borderRadius:6, cursor:'pointer',
                  background: vista===v ? 'var(--purple)' : 'transparent',
                  color: vista===v ? '#fff' : 'var(--text3)',
                  border: vista===v ? 'none' : '1px solid var(--border)' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── Filtros */}
        <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', padding:'12px 16px', marginBottom:16, display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar comprador, SKU, orden..."
            style={{ fontSize:13, padding:'6px 12px', borderRadius:6, border:'1.5px solid var(--border)', color:'var(--text)', flex:1, minWidth:180, outline:'none' }} />
          <div style={{ display:'flex', gap:4 }}>
            {CUENTAS.map(c => (
              <button key={c} onClick={() => setCuenta(c)}
                style={{ fontSize:11, fontWeight:700, padding:'5px 10px', borderRadius:6,
                  border:`1.5px solid ${cuenta===c ? (ACCT_COLOR[c]?.br||'var(--purple-border)') : 'var(--border)'}`,
                  background: cuenta===c ? (ACCT_COLOR[c]?.bg||'var(--purple-light)') : 'transparent',
                  color: cuenta===c ? (ACCT_COLOR[c]?.color||'var(--purple)') : 'var(--text3)', cursor:'pointer' }}>
                {c}
              </button>
            ))}
          </div>
          <select value={tipo} onChange={e => setTipo(e.target.value)}
            style={{ fontSize:12, padding:'6px 10px', borderRadius:6, border:'1.5px solid var(--border)', color:'var(--text)', outline:'none' }}>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={estado} onChange={e => setEstado(e.target.value)}
            style={{ fontSize:12, padding:'6px 10px', borderRadius:6, border:'1.5px solid var(--border)', color:'var(--text)', outline:'none' }}>
            {ESTADOS.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--text3)', fontSize:14 }}>Cargando datos...</div>
        ) : vista === 'graficas' ? (
          <>
            {/* ── KPI Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10, marginBottom:16 }}>
              {[
                { label:'Total',          value: total,          color:'var(--purple)', bg:'var(--purple-light)', br:'var(--purple-border)' },
                { label:'Resueltos',      value: resueltos,      color:'var(--green)',  bg:'var(--green-light)',  br:'var(--green-border)'  },
                { label:'Pendientes',     value: pendientes,     color:'var(--amber)',  bg:'var(--amber-light)',  br:'var(--amber-border)'  },
                { label:'Tasa atencion',  value: tasaAten + '%', color:'var(--blue)',   bg:'var(--blue-light)',   br:'var(--blue-border)'   },
                { label:'IA directa',     value: tasaIA + '%',   color:'var(--green)',  bg:'var(--green-light)',  br:'var(--green-border)'  },
              ].map(m => (
                <div key={m.label} style={{ background:m.bg, border:`1.5px solid ${m.br}`, borderRadius:'var(--radius)', padding:'14px 16px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:m.color, marginBottom:4, textTransform:'uppercase', letterSpacing:'.05em' }}>{m.label}</div>
                  <div style={{ fontSize:26, fontWeight:800, color:m.color }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* ── Conversiones PRE-COMPRA */}
            <div style={{ background:'var(--surface)', border:'1.5px solid #6ee7b7', borderRadius:'var(--radius)', padding:'16px 20px', marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12, color:'#047857' }}>Conversiones PRE-COMPRA</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }}>
                {[
                  { label:'Preguntas respondidas', value: precompraRespondidas, color:'var(--purple)' },
                  { label:'Conversiones detectadas', value: totalConversiones, color:'#047857' },
                  { label:'Tasa de conversion', value: tasaConversion + '%', color:'#047857' },
                  { label:'Tiempo prom. a compra', value: tiempoPromedioConversion !== null ? tiempoPromedioConversion + 'h' : '—', color:'var(--text2)' },
                ].map(m => (
                  <div key={m.label} style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'var(--radius-sm)', padding:'10px 14px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#6b7280', marginBottom:4, textTransform:'uppercase', letterSpacing:'.05em' }}>{m.label}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Grafica tendencia */}
            <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px', marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Mensajes por dia — ultimos {rango} dias</div>
              <LineChart data={diasData} height={130} color="#7c3aed" />
            </div>

            {/* ── Fila graficas secundarias */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>

              {/* Por cuenta */}
              <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Por cuenta</div>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
                  <DonutChart segments={cuentaData} size={90} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {cuentaData.map(d => (
                    <div key={d.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:d.color, flexShrink:0 }} />
                      <span style={{ fontSize:12, color:'var(--text2)', flex:1 }}>{d.label}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{d.value}</span>
                      <span style={{ fontSize:11, color:'var(--text3)' }}>{total ? Math.round(d.value/total*100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Por tipo */}
              <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Por tipo</div>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
                  <DonutChart segments={tipoData} size={90} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {tipoData.map(d => (
                    <div key={d.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:d.color, flexShrink:0 }} />
                      <span style={{ fontSize:12, color:'var(--text2)', flex:1 }}>{d.label}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{d.value}</span>
                      <span style={{ fontSize:11, color:'var(--text3)' }}>{total ? Math.round(d.value/total*100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Por dia de semana */}
              <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Por dia de semana</div>
                <BarChart data={semanaData} height={120} colorFn={d => {
                  const max = Math.max(...semanaData.map(x=>x.value),1)
                  const pct = d.value / max
                  return `rgba(124, 58, 237, ${0.3 + pct * 0.7})`
                }} />
              </div>
            </div>

            {/* ── Distribucion por hora */}
            <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px' }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Distribucion por hora del dia</div>
              <BarChart data={horaData} height={100} colorFn={d => {
                const max = Math.max(...horaData.map(x=>x.value),1)
                const pct = d.value / max
                return `rgba(8, 145, 178, ${0.2 + pct * 0.8})`
              }} />
            </div>
          </>
        ) : (
          <>
            {/* ── Vista tabla */}
            <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 110px 100px 120px 110px', padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em' }}>
                <div>Comprador / Producto</div><div>Cuenta</div><div>Tipo</div><div>Estado</div><div>Fecha</div><div>Atendido por</div>
              </div>
              {filtrados.length === 0 ? (
                <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Sin resultados</div>
              ) : filtrados.map((item, i) => {
                const tc = TIPO_COLOR[item.tipo]    || { bg:'var(--surface2)', color:'var(--text3)', br:'var(--border)' }
                const ec = ESTADO_COLOR[item.estado] || { bg:'var(--surface2)', color:'var(--text3)', br:'var(--border)' }
                const ac = ACCT_COLOR[item.cuenta]  || ACCT_COLOR.GTK
                const fecha = item.creado_en ? new Date(item.creado_en).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'2-digit' }) : '—'
                return (
                  <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1fr 90px 110px 100px 120px 110px', padding:'9px 16px', borderBottom: i < filtrados.length-1 ? '1px solid var(--border)' : 'none', alignItems:'center', background: i%2===0 ? 'transparent' : 'var(--surface2)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                      {item.imagen_thumbnail && <img src={item.imagen_thumbnail} alt="" style={{ width:32, height:32, objectFit:'contain', borderRadius:4, border:'1px solid var(--border)', background:'#fff' }} onError={e => { e.target.style.display='none' }} />}
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:280 }}>{item.comprador || '—'}</div>
                        <div style={{ fontSize:11, color:'var(--text3)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:280 }}>{item.producto || (item.sku ? `SKU: ${item.sku}` : '—')}</div>
                      </div>
                    </div>
                    <div><span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:ac.bg, color:ac.color, border:`1px solid ${ac.br}` }}>{item.cuenta}</span></div>
                    <div><span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:tc.bg, color:tc.color, border:`1px solid ${tc.br}` }}>{item.tipo}</span></div>
                    <div><span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:ec.bg, color:ec.color, border:`1px solid ${ec.br}` }}>{item.estado}</span></div>
                    <div style={{ fontSize:12, color:'var(--text2)' }}>{fecha}</div>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>{item.atendido_por || '—'}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:10, textAlign:'right' }}>{filtrados.length} registros</div>
          </>
        )}
      </div>
    </div>
  )
}
