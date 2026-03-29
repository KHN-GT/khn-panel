import { useState, useEffect } from 'react'
import Topbar from '../components/Topbar'

const RAILWAY = 'https://worker-production-d575.up.railway.app'
const TOKEN = () => localStorage.getItem('khn_token')

const CUENTAS = ['GTK', 'RBN', 'GDP']
const CUENTA_COLORS = {
  GTK: { bg: 'var(--purple-light)', color: 'var(--purple)', border: 'var(--purple-border)' },
  RBN: { bg: 'var(--green-light)',  color: 'var(--green)',  border: 'var(--green-border)' },
  GDP: { bg: 'var(--amber-light)',  color: 'var(--amber)',  border: 'var(--amber-border)' },
}

function badge(cuenta) {
  const c = CUENTA_COLORS[cuenta] || { bg: 'var(--surface2)', color: 'var(--text3)', border: 'var(--border)' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {cuenta}
    </span>
  )
}

function progressBar(diasRestantes) {
  const pct = Math.min(100, (diasRestantes / 60) * 100)
  const color = diasRestantes < 15 ? 'var(--red)' : diasRestantes < 30 ? 'var(--amber)' : 'var(--green)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface2)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: color, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 28, textAlign: 'right' }}>{diasRestantes}d</span>
    </div>
  )
}

function estadoBadge(estado) {
  const map = {
    pendiente:   { bg: 'var(--amber-light)', color: 'var(--amber)', border: 'var(--amber-border)' },
    en_progreso: { bg: 'var(--purple-light)', color: 'var(--purple)', border: 'var(--purple-border)' },
    resuelto:    { bg: 'var(--green-light)',  color: 'var(--green)',  border: 'var(--green-border)' },
    descartado:  { bg: 'var(--surface2)',     color: 'var(--text3)',  border: 'var(--border)' },
    en_espera:   { bg: 'var(--amber-light)',  color: 'var(--amber)', border: 'var(--amber-border)' },
  }
  const s = map[estado] || map.pendiente
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {estado}
    </span>
  )
}

function riskColor(score) {
  if (score >= 10) return 'var(--red)'
  if (score >= 5)  return 'var(--amber)'
  return 'var(--green)'
}

const thStyle = {
  textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700,
  color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px',
  borderBottom: '1.5px solid var(--border)', background: 'var(--surface)',
  position: 'sticky', top: 0,
}
const tdStyle = {
  padding: '8px 12px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)',
}

export default function ReputacionShield({ onLogout }) {
  const [reclamos, setReclamos]   = useState([])
  const [resumen, setResumen]     = useState({})
  const [skuRisk, setSkuRisk]     = useState([])
  const [limites, setLimites]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [filtro, setFiltro]       = useState('Todas')

  useEffect(() => {
    const headers = { Authorization: `Bearer ${TOKEN()}` }
    Promise.all([
      fetch(`${RAILWAY}/api/reputacion/reclamos`,  { headers }).then(r => r.json()),
      fetch(`${RAILWAY}/api/reputacion/sku_risk`,   { headers }).then(r => r.json()),
      fetch(`${RAILWAY}/api/reputacion/limites`,    { headers }).then(r => r.json()),
    ]).then(([recl, sku, lim]) => {
      setReclamos(recl.reclamos || [])
      setResumen(recl.resumen || {})
      setSkuRisk((sku.sku_risk || []).filter(s => s.risk_score > 0))
      setLimites(lim)
    }).catch(e => console.error('Error cargando reputacion:', e))
      .finally(() => setLoading(false))
  }, [])

  const semaforo = (cuenta) => {
    const r = resumen[cuenta]
    if (!r || !limites) return { color: 'var(--text3)', bg: 'var(--surface2)', label: 'Sin datos' }
    const limNormal = limites.reclamos?.limite_normal || 1.5
    const limML     = limites.reclamos?.limite_mercadolider || 1.0
    const total     = r.total_afectando
    // Usar limite mas bajo como referencia
    if (total > limNormal * 100)      return { color: 'var(--red)',   bg: 'var(--red-light)',   label: 'Excede limite' }
    if (total > limNormal * 100 * .8) return { color: 'var(--amber)', bg: 'var(--amber-light)', label: 'Cerca del limite' }
    return { color: 'var(--green)', bg: 'var(--green-light)', label: 'OK' }
  }

  const reclamosFiltrados = filtro === 'Todas' ? reclamos : reclamos.filter(r => r.cuenta === filtro)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <Topbar onLogout={onLogout} />

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 24 }}>&#128737;</span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-.5px' }}>
              Reputation Shield
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
            Monitoreo de reputacion y riesgo por SKU
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>Cargando datos...</div>
        ) : (
          <>
            {/* RESUMEN POR CUENTA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
              {CUENTAS.map(c => {
                const r = resumen[c] || { total_activos: 0, total_afectando: 0, promedio_dias_restantes: 0 }
                const sem = semaforo(c)
                const cc = CUENTA_COLORS[c]
                return (
                  <div key={c} style={{ background: 'var(--surface)', border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: 18, boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: cc.color }}>{c}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                        background: sem.bg, color: sem.color, border: `1px solid ${sem.color}22` }}>
                        {sem.label}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{r.total_activos}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Activos</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: sem.color }}>{r.total_afectando}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Afectando</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{r.promedio_dias_restantes}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Dias prom.</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* RECLAMOS ACTIVOS */}
            <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius)', marginBottom: 28, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                borderBottom: '1.5px solid var(--border)' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Reclamos activos</span>
                <div style={{ flex: 1 }} />
                {['Todas', ...CUENTAS].map(f => (
                  <button key={f} onClick={() => setFiltro(f)}
                    style={{ fontSize: 12, fontWeight: filtro === f ? 700 : 500, padding: '4px 12px', borderRadius: 99,
                      border: filtro === f ? '1px solid var(--purple-border)' : '1px solid var(--border)',
                      background: filtro === f ? 'var(--purple-light)' : 'none',
                      color: filtro === f ? 'var(--purple)' : 'var(--text3)', cursor: 'pointer' }}>
                    {f}
                  </button>
                ))}
              </div>
              <div style={{ maxHeight: 420, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Cuenta</th>
                      <th style={thStyle}>Comprador</th>
                      <th style={thStyle}>Producto</th>
                      <th style={thStyle}>SKU</th>
                      <th style={thStyle}>Apertura</th>
                      <th style={thStyle}>Dias</th>
                      <th style={{ ...thStyle, minWidth: 120 }}>Restantes</th>
                      <th style={thStyle}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reclamosFiltrados.length === 0 ? (
                      <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text3)' }}>Sin reclamos</td></tr>
                    ) : reclamosFiltrados.map(r => (
                      <tr key={r.id} style={{ background: r.afecta_reputacion && r.dias_restantes < 15 ? 'var(--red-light)' : 'transparent' }}>
                        <td style={tdStyle}>{badge(r.cuenta)}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre_comprador || '-'}</td>
                        <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{r.producto || '-'}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{r.sku || '-'}</td>
                        <td style={{ ...tdStyle, fontSize: 12, whiteSpace: 'nowrap' }}>{r.creado_en ? new Date(r.creado_en).toLocaleDateString('es-AR') : '-'}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'center' }}>{r.dias_transcurridos}</td>
                        <td style={tdStyle}>{progressBar(r.dias_restantes)}</td>
                        <td style={tdStyle}>{estadoBadge(r.estado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SKU RISK */}
            <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)', marginBottom: 28 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1.5px solid var(--border)' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>SKU Risk</span>
                <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 10 }}>
                  {skuRisk.length} SKU{skuRisk.length !== 1 ? 's' : ''} con riesgo
                </span>
              </div>
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>SKU</th>
                      <th style={thStyle}>Cuenta</th>
                      <th style={thStyle}>Risk Score</th>
                      <th style={thStyle}>Reclamos</th>
                      <th style={thStyle}>Prob.Tecnicos</th>
                      <th style={thStyle}>Devoluciones</th>
                      <th style={thStyle}>No Recibidos</th>
                      <th style={thStyle}>Total msgs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skuRisk.length === 0 ? (
                      <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text3)' }}>Sin SKUs con riesgo</td></tr>
                    ) : skuRisk.map((s, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{s.sku}</td>
                        <td style={tdStyle}>{badge(s.cuenta)}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: riskColor(s.risk_score) }}>{s.risk_score}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{s.total_reclamos || 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{s.total_problemas_tecnicos || 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{s.total_devoluciones || 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{s.total_no_recibidos || 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{s.total_mensajes || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
