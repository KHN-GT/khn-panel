import { useState, useEffect, useCallback } from 'react'

const RAILWAY = 'https://worker-production-d575.up.railway.app'

// ─── constantes ───────────────────────────────────────────────────────────────

const CUENTAS = ['GTK', 'RBN', 'GDP']
const NOMBRES = { GTK: 'Graphic Tek', RBN: 'RBN Inksys', GDP: 'GDP Ink' }
const IDS_ML  = { GTK: '#137479386', RBN: '#654370551', GDP: '#1713490278' }
const SEGS = [
  { bg: '#e53935' }, { bg: '#f57c00' }, { bg: '#ffc107' },
  { bg: '#8bc34a' }, { bg: '#2e7d32' },
]

// ─── helpers ──────────────────────────────────────────────────────────────────

function getLevelInfo(level_id = '') {
  const l = (level_id || '').toLowerCase()
  if (l.includes('red')   && !l.includes('green')) return { label: 'Rojo',        labelColor: '#b71c1c', seg: 0, pct: '10%' }
  if (l.includes('orange') || l === '4_orange')    return { label: 'Naranja',     labelColor: '#965B00', seg: 1, pct: '30%' }
  if (l.includes('yellow') || l === '3_yellow')    return { label: 'Amarillo',    labelColor: '#856404', seg: 2, pct: '50%' }
  if (l.includes('light_green') || l === '2_light_green') return { label: 'Verde claro', labelColor: '#558b2f', seg: 3, pct: '70%' }
  if (l.includes('green') || l === '1_green')      return { label: 'Verde',       labelColor: '#2e7d32', seg: 4, pct: '90%' }
  return { label: '—', labelColor: 'var(--color-text-tertiary)', seg: -1, pct: '50%' }
}

function getDaysRemaining(creado_en) {
  if (!creado_en) return null
  const exp = new Date(creado_en).getTime() + 60 * 86400000
  return Math.max(0, Math.ceil((exp - Date.now()) / 86400000))
}

function getExpiryStr(creado_en) {
  if (!creado_en) return ''
  const exp = new Date(new Date(creado_en).getTime() + 60 * 86400000)
  return exp.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function getOpenedStr(creado_en) {
  if (!creado_en) return '—'
  return new Date(creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// Más días restantes = peor (rojo), menos días = mejor (verde)
function cdColor(days) {
  if (days >= 45) return { bar: '#c62828', text: '#c62828' }
  if (days >= 35) return { bar: '#d84315', text: '#d84315' }
  if (days >= 25) return { bar: '#e65100', text: '#e65100' }
  if (days >= 18) return { bar: '#f57c00', text: '#f57c00' }
  if (days >= 12) return { bar: '#fbc02d', text: '#f9a825' }
  if (days >= 7)  return { bar: '#7cb342', text: '#558b2f' }
  return { bar: '#43a047', text: '#2e7d32' }
}

function fmtPct(r, decimals = 2) {
  return ((r || 0) * 100).toFixed(decimals) + '%'
}

function fmtMoney(n) {
  if (!n) return '—'
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return `$${Math.round(n / 1000)}k`
}

function calcReqs(m) {
  if (!m || m.error) return { met: 0, total: 4, items: [], donut: 0 }
  const claimsOk = (m.claims_rate || 0) < 0.01
  const ventasOk = (m.transactions_completed || 0) >= 10
  const cancelOk = (m.cancellations_rate || 0) < 0.005
  const delayOk  = (m.delayed_rate || 0) < 0.08
  const met = [claimsOk, ventasOk, cancelOk, delayOk].filter(Boolean).length
  const needed = claimsOk ? 0
    : Math.max(0, Math.ceil((m.claims_value || 0) / 0.01 - (m.transactions_total || 0)))
  return {
    met, total: 4, donut: (met / 4) * 100,
    items: [
      { ok: claimsOk, text: claimsOk ? 'Sin reclamos excesivos' : `Reducir reclamos bajo 1%${needed ? ` (≈${needed} ventas más)` : ''}` },
      { ok: ventasOk, text: 'Ventas concretadas' },
      { ok: cancelOk, text: 'Canceladas por ti' },
      { ok: delayOk,  text: 'Despachaste con demora' },
    ]
  }
}

function calcTimeline(cuenta, reclamos, metricas) {
  const m = metricas[cuenta]
  if (!m || m.error) return null
  const total = m.transactions_total || 1
  const limitCount = Math.floor(total * 0.01)

  const sorted = reclamos
    .filter(r => r.cuenta === cuenta)
    .map(r => ({
      ...r,
      expTs:  r.creado_en ? new Date(r.creado_en).getTime() + 60 * 86400000 : 0,
      expStr: getExpiryStr(r.creado_en),
    }))
    .sort((a, b) => a.expTs - b.expTs)

  let rem = sorted.length
  const events = []
  let recoveryDate = null

  for (let i = 0; i < sorted.length; i++) {
    rem--
    const rate = rem / total
    const isKey = rem <= limitCount && !recoveryDate
    if (isKey) recoveryDate = sorted[i].expStr
    events.push({ date: sorted[i].expStr, remaining: rem, rate, isKey, idx: i + 1 })
  }

  const currentRate = m.claims_rate || 0
  const alreadyOk   = currentRate < 0.01

  const chartPts    = [currentRate * 100, ...events.map(e => parseFloat((e.rate * 100).toFixed(2)))]
  const chartLabels = ['Hoy', ...events.map(e => e.date)]

  return { events, recoveryDate, alreadyOk, currentRate, sorted, chartPts, chartLabels, limitCount }
}

// ─── SVG line chart sin dependencias ─────────────────────────────────────────

function LineChart({ pts, labels, limit }) {
  const W = 260, H = 110, PL = 32, PR = 22, PT = 8, PB = 28
  const cW = W - PL - PR, cH = H - PT - PB
  const maxY = Math.max(...pts, limit, 0.1) * 1.3
  const toX = i => PL + (pts.length < 2 ? cW / 2 : (i / (pts.length - 1)) * cW)
  const toY = v => PT + cH - (v / maxY) * cH
  const limitY = toY(limit)
  const poly = pts.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  const area = poly + ` ${toX(pts.length - 1).toFixed(1)},${(PT + cH).toFixed(1)} ${PL},${(PT + cH).toFixed(1)}`
  const yTicks = [0, parseFloat((maxY / 2).toFixed(1)), parseFloat(maxY.toFixed(1))]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
      <polygon points={area} fill="rgba(55,138,221,0.08)" />
      <line x1={PL} y1={limitY} x2={W - PR} y2={limitY} stroke="#E24B4A" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x={W - PR + 2} y={limitY + 3} fontSize="8" fill="#E24B4A">1%</text>
      <polyline points={poly} fill="none" stroke="#378ADD" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((v, i) => <circle key={i} cx={toX(i)} cy={toY(v)} r="2.5" fill="#378ADD" />)}
      {labels.map((l, i) => (
        <text key={i} x={toX(i)} y={H - 4} fontSize="8" fill="#888" textAnchor="middle">{l}</text>
      ))}
      {yTicks.map((v, i) => (
        <text key={i} x={PL - 3} y={toY(v) + 3} fontSize="8" fill="#888" textAnchor="end">{v.toFixed(1)}%</text>
      ))}
    </svg>
  )
}

// ─── AccountCard ──────────────────────────────────────────────────────────────

function AccountCard({ cuenta, m, reclamos }) {
  const li   = getLevelInfo(m?.level_id)
  const reqs = calcReqs(m)
  const isErr = !m || m.error

  const metrics = [
    { label: 'Reclamos',     rate: m?.claims_rate,        value: m?.claims_value,        limit: 0.01  },
    { label: 'Mediaciones',  rate: m?.mediations_rate,    value: m?.mediations_value,    limit: 0.005 },
    { label: 'Canceladas',   rate: m?.cancellations_rate, value: m?.cancellations_value, limit: 0.005 },
    { label: 'Demora envio', rate: m?.delayed_rate,       value: m?.delayed_value,       limit: 0.08  },
  ]

  const s = { // shared styles
    card: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' },
    sect: { padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)' },
    row:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' },
  }

  return (
    <div style={s.card}>
      {/* header */}
      <div style={s.sect}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{NOMBRES[cuenta]}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{IDS_ML[cuenta]} · {cuenta}</div>
      </div>

      {/* semaforo */}
      <div style={s.sect}>
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reputacion ML</div>
        <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden' }}>
          {SEGS.map((sg, i) => (
            <div key={i} style={{ flex: 1, background: sg.bg, opacity: i === li.seg ? 1 : 0.35 }} />
          ))}
        </div>
        <div style={{ position: 'relative', height: 6 }}>
          {li.seg >= 0 && (
            <div style={{ position: 'absolute', left: li.pct, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid var(--color-text-primary)' }} />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: li.labelColor }}>● {li.label}</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Meta: Verde ▸</span>
        </div>
      </div>

      {/* medallas */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        {['MercadoLider', 'Platinum'].map(lbl => (
          <div key={lbl} style={{ fontSize: 10, color: 'var(--color-text-tertiary)', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, padding: '2px 6px', opacity: 0.4 }}>{lbl}</div>
        ))}
      </div>

      {/* metricas */}
      <div style={{ padding: '8px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        {isErr
          ? <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Sin datos de ML</div>
          : metrics.map(({ label, rate, value, limit }) => {
              const over = (rate || 0) > limit
              const pct  = Math.min(100, ((rate || 0) / limit) * 100)
              return (
                <div key={label} style={{ ...s.row, ':last-child': { borderBottom: 'none' } }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 44, height: 4, borderRadius: 2, background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: over ? '#E24B4A' : '#28a745', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, color: over ? '#c62828' : '#2e7d32' }}>
                      {fmtPct(rate)} ({value || 0})
                      {over && <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', fontWeight: 400 }}> lim {(limit * 100).toFixed(1)}%</span>}
                    </span>
                  </div>
                </div>
              )
            })
        }
      </div>

      {/* desempeno */}
      <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-border-secondary)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#378ADD" strokeWidth="3"
              strokeDasharray={`${reqs.donut.toFixed(1)} ${(100 - reqs.donut).toFixed(1)}`}
              strokeDashoffset="25" strokeLinecap="round" />
            <text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="500" fill="var(--color-text-primary)">{reqs.met}/4</text>
          </svg>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>Lo que falta para color verde</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 1 }}>Requisitos para MercadoLider</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {reqs.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${item.ok ? '#378ADD' : '#E24B4A'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: item.ok ? '#378ADD' : '#E24B4A', fontSize: 9, marginTop: 1 }}>
                {item.ok ? '✓' : '✕'}
              </div>
              <span style={{ color: item.ok ? 'var(--color-text-secondary)' : 'var(--color-text-primary)', fontWeight: item.ok ? 400 : 500, lineHeight: 1.3 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <div style={{ padding: '7px 14px', display: 'flex', justifyContent: 'space-between', background: 'var(--color-background-secondary)', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
        {[
          { num: m?.transactions_total || 0,     label: 'Ventas'      },
          { num: m?.transactions_completed || 0, label: 'Concretadas' },
        ].map(({ num, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{num}</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ClaimsTable ──────────────────────────────────────────────────────────────

function ClaimsTable({ reclamos, filtro, setFiltro }) {
  const urgStyle = u => ({
    CRITICO:   { bg: 'var(--color-background-danger)',  color: 'var(--color-text-danger)'  },
    URGENTE:   { bg: '#FFF0D4', color: '#965B00' },
    MODERADO:  { bg: '#FFF3CD', color: '#856404' },
    INFORMATIVO:{ bg: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' },
  }[u] || { bg: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' })

  // ordenar: mas dias primero (peor antes)
  const sorted = [...reclamos].sort((a, b) => (b.daysRemaining || 0) - (a.daysRemaining || 0))

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Reclamos activos que afectan reputacion</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Mas dias restantes = mas tiempo afectando · la barra se vuelve verde al acercarse al vencimiento</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 500, background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', padding: '2px 8px', borderRadius: 20 }}>{reclamos.length} total</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Todas', 'GTK', 'RBN', 'GDP'].map(f => (
              <button key={f} onClick={() => setFiltro(f)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', border: `0.5px solid ${filtro === f ? 'var(--color-border-info)' : 'var(--color-border-secondary)'}`, color: filtro === f ? 'var(--color-text-info)' : 'var(--color-text-secondary)', background: filtro === f ? 'var(--color-background-info)' : 'var(--color-background-primary)' }}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '38%' }} /><col style={{ width: '10%' }} />
            <col style={{ width: '26%' }} /><col style={{ width: '12%' }} /><col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'var(--color-background-secondary)' }}>
              {['Producto / Comprador', 'Cuenta', 'Tiempo afectando (mejor cuanto menos quede)', 'Urgencia', 'Accion'].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '8px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '20px 12px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>Sin reclamos activos en esta cuenta</td></tr>
            )}
            {sorted.map((r, i) => {
              const days = r.daysRemaining
              const cc   = cdColor(days ?? 60)
              const pct  = days != null ? ((days / 60) * 100) : 0
              const us   = urgStyle(r.urgencia)
              return (
                <tr key={r.id || i} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {r.imagen_thumbnail
                        ? <img src={r.imagen_thumbnail} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', border: '0.5px solid var(--color-border-tertiary)', flexShrink: 0 }} />
                        : <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🖨</div>
                      }
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.nombre_comprador || r.comprador || '—'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                          Abierto {getOpenedStr(r.creado_en)} · expira {getExpiryStr(r.creado_en)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{r.cuenta}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: cc.bar, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500, color: cc.text }}>{days != null ? `${days} dias restantes` : '—'}</span>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>vence {getExpiryStr(r.creado_en)}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 500, background: us.bg, color: us.color, padding: '2px 6px', borderRadius: 4 }}>{r.urgencia || '—'}</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <a href={`https://www.mercadolibre.com.mx/ventas/reclamos/${r.claim_id}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--color-text-info)', textDecoration: 'none' }}>Ver →</a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── RecoverySection ──────────────────────────────────────────────────────────

function RecoverySection({ metricas, reclamos, activeTab, setActiveTab }) {
  const tl = calcTimeline(activeTab, reclamos, metricas)

  return (
    <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', marginBottom: '1.5rem' }}>
      {/* header */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Estimado de recuperacion</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Proyeccion por cuenta sin nuevos reclamos</div>
      </div>

      {/* account tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
        {CUENTAS.map(acc => {
          const m      = metricas[acc]
          const isOver = (m?.claims_rate || 0) >= 0.01
          const tld    = calcTimeline(acc, reclamos, metricas)
          const isActive = activeTab === acc
          return (
            <div key={acc} onClick={() => setActiveTab(acc)} style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--border-radius-md)', border: `0.5px solid ${isActive ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`, background: isActive ? 'var(--color-background-info)' : 'var(--color-background-primary)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: isActive ? 'var(--color-text-info)' : 'var(--color-text-primary)' }}>{NOMBRES[acc]}</div>
                  <div style={{ fontSize: 10, color: isActive ? 'var(--color-text-info)' : 'var(--color-text-tertiary)', opacity: 0.85, marginTop: 1 }}>
                    {fmtPct(m?.claims_rate)} · {m?.claims_value || 0} reclamos
                  </div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOver ? '#E24B4A' : '#43a047', flexShrink: 0, marginTop: 3 }} />
              </div>
              <div style={{ marginTop: 5, fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4, display: 'inline-block', background: isOver ? 'var(--color-background-danger)' : 'var(--color-background-success)', color: isOver ? 'var(--color-text-danger)' : 'var(--color-text-success)' }}>
                {tld?.alreadyOk ? 'Dentro del limite' : tld?.recoveryDate ? `Recupera ${tld.recoveryDate}` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      {/* panel */}
      <div style={{ padding: 16 }}>
        {!tl
          ? <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Sin datos para esta cuenta</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24 }}>
              {/* timeline */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Timeline · {NOMBRES[activeTab]} · limite 1% (max {tl.limitCount} reclamos)
                </div>
                {tl.alreadyOk && (
                  <div style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-success)', border: '0.5px solid var(--color-border-success)', fontSize: 12, color: 'var(--color-text-success)', marginBottom: 10 }}>
                    Ya dentro del limite — mantener sin nuevos reclamos
                  </div>
                )}
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  {tl.events.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Sin reclamos activos en esta cuenta</div>}
                  {tl.events.map((ev, i) => (
                    <div key={i} style={{ position: 'relative', paddingBottom: i < tl.events.length - 1 ? 14 : 0, paddingLeft: 12 }}>
                      <div style={{ position: 'absolute', left: -20, top: 3, width: 8, height: 8, borderRadius: '50%', border: `1.5px solid ${ev.isKey ? '#639922' : '#E24B4A'}`, background: ev.isKey ? '#eaf3de' : '#fce8e8' }} />
                      {i < tl.events.length - 1 && <div style={{ position: 'absolute', left: -17, top: 11, bottom: 0, width: 1, background: 'var(--color-border-tertiary)' }} />}
                      <div style={{ fontSize: 11, fontWeight: ev.isKey ? 500 : 400, color: ev.isKey ? 'var(--color-text-success)' : 'var(--color-text-primary)' }}>
                        {ev.date} — vence reclamo #{ev.idx}{ev.isKey ? ' ✓' : ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>Quedan {ev.remaining} reclamos activos</div>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, display: 'inline-block', marginTop: 3, background: ev.isKey ? 'var(--color-background-success)' : 'var(--color-background-danger)', color: ev.isKey ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}>
                        {(ev.rate * 100).toFixed(2)}% · {ev.isKey ? 'baja del limite' : 'sigue por encima'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* chart + highlight */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Proyeccion de tasa</div>
                {tl.chartPts.length > 1
                  ? <LineChart pts={tl.chartPts} labels={tl.chartLabels} limit={1} />
                  : <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>—</div>
                }
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', gap: 10, background: tl.alreadyOk ? 'var(--color-background-secondary)' : 'var(--color-background-success)', border: `0.5px solid ${tl.alreadyOk ? 'var(--color-border-tertiary)' : 'var(--color-border-success)'}` }}>
                  <div style={{ fontSize: 18 }}>{tl.alreadyOk ? '✅' : '📅'}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: tl.alreadyOk ? 'var(--color-text-secondary)' : 'var(--color-text-success)' }}>
                      {tl.alreadyOk ? `${NOMBRES[activeTab]} ya esta dentro del limite` : `Recuperacion estimada: ${tl.recoveryDate || '—'}`}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 1, opacity: 0.8, color: tl.alreadyOk ? 'var(--color-text-secondary)' : 'var(--color-text-success)' }}>
                      {tl.alreadyOk
                        ? 'Mantener sin nuevos reclamos para conservar el estado'
                        : `${NOMBRES[activeTab]} baja de 1% y puede optar a MercadoLider`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}

// ─── SkuRisk + Resumen ────────────────────────────────────────────────────────

function BottomSection({ reclamos }) {
  const minDays = reclamos.length ? Math.min(...reclamos.map(r => getDaysRemaining(r.creado_en) ?? 60)) : null
  const cuentasEnRiesgo = CUENTAS.filter(c => {
    const items = reclamos.filter(r => r.cuenta === c)
    return items.length > 0
  }).length

  const vencenSemana = reclamos.filter(r => (getDaysRemaining(r.creado_en) ?? 60) <= 7).length

  // SKU risk desde reclamos (fallback si no hay endpoint)
  const skuMap = {}
  reclamos.forEach(r => {
    const sku = r.sku || 'sin-sku'
    skuMap[sku] = (skuMap[sku] || 0) + 1
  })
  const skus = Object.entries(skuMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxC = skus[0]?.[1] || 1

  const summaryItems = [
    { label: 'Reclamos afectando',    val: reclamos.length, color: reclamos.length > 0 ? 'var(--color-text-danger)' : 'var(--color-text-success)' },
    { label: 'Vencen esta semana',     val: vencenSemana,   color: vencenSemana > 0 ? '#965B00' : 'var(--color-text-success)' },
    { label: 'Cuentas en riesgo',      val: `${cuentasEnRiesgo} de 3`, color: cuentasEnRiesgo > 0 ? 'var(--color-text-danger)' : 'var(--color-text-success)' },
    { label: 'Mas proximo a vencer',   val: minDays != null ? `${minDays} dias` : '—', color: 'var(--color-text-success)' },
  ]

  const cardStyle = { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
      <div style={cardStyle}>
        <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>SKU Risk</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Por reclamos acumulados</div>
        </div>
        {skus.length === 0
          ? <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>Sin datos de SKU</div>
          : skus.map(([sku, count], i) => (
            <div key={sku} style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', borderBottom: i < skus.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 4, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', minWidth: 70 }}>{sku}</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / maxC) * 100}%`, background: count === maxC ? '#E24B4A' : '#EF9F27', borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 20, textAlign: 'right' }}>{count}</span>
            </div>
          ))
        }
      </div>
      <div style={cardStyle}>
        <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Resumen ejecutivo</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Todas las cuentas · hoy</div>
        </div>
        {summaryItems.map(({ label, val, color }, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: i < summaryItems.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flex: 1 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ReputacionShield() {
  const [metricas,    setMetricas]    = useState({})
  const [reclamos,    setReclamos]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [lastUpdate,  setLastUpdate]  = useState(null)
  const [refreshing,  setRefreshing]  = useState(false)
  const [recoveryTab, setRecoveryTab] = useState('GTK')
  const [filtro,      setFiltro]      = useState('Todas')

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      const tok = localStorage.getItem('khn_token')
      const headers = { Authorization: `Bearer ${tok}` }
      const [metRes, recRes] = await Promise.all([
        fetch(`${RAILWAY}/api/reputacion/metricas-reales`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${RAILWAY}/api/reputacion/reclamos`, { headers }).then(r => r.json()).catch(() => ([])),
      ])
      setMetricas(metRes || {})
      const raw = recRes
      setReclamos(Array.isArray(raw) ? raw : (raw?.reclamos || []))
      setLastUpdate(new Date())
    } catch (e) {
      console.error('[ReputacionShield] Error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const reclamosFiltrados = reclamos
    .filter(r => filtro === 'Todas' || r.cuenta === filtro)
    .map(r => ({ ...r, daysRemaining: getDaysRemaining(r.creado_en) }))

  function fmtLastUpdate() {
    if (!lastUpdate) return ''
    const diff = Math.floor((Date.now() - lastUpdate) / 60000)
    return diff < 1 ? 'hace menos de 1 min' : `hace ${diff} min`
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-text-secondary)', fontSize: 14 }}>
        Cargando datos de MercadoLibre...
      </div>
    )
  }

  return (
    <div style={{ padding: '1.25rem', maxWidth: 1100, fontFamily: 'var(--font-sans)' }}>
      {/* topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-background-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🛡️</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>Reputation Shield</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>Datos reales de MercadoLibre · ultimos 60 dias</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button onClick={fetchData} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '6px 12px', cursor: refreshing ? 'default' : 'pointer', opacity: refreshing ? 0.6 : 1 }}>
            {refreshing ? 'Actualizando...' : 'Actualizar desde ML'}
          </button>
          {lastUpdate && (
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#28a745', display: 'inline-block' }} />
              Actualizado {fmtLastUpdate()}
            </div>
          )}
        </div>
      </div>

      {/* tarjetas por cuenta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {CUENTAS.map(acc => (
          <AccountCard key={acc} cuenta={acc} m={metricas[acc]} reclamos={reclamos.filter(r => r.cuenta === acc)} />
        ))}
      </div>

      {/* tabla reclamos */}
      <ClaimsTable reclamos={reclamosFiltrados} filtro={filtro} setFiltro={setFiltro} />

      {/* recuperacion */}
      <RecoverySection metricas={metricas} reclamos={reclamos} activeTab={recoveryTab} setActiveTab={setRecoveryTab} />

      {/* SKU risk + resumen */}
      <BottomSection reclamos={reclamos} />
    </div>
  )
}
