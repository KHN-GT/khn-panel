import { useState, useEffect } from 'react'
import Topbar from '../components/Topbar'

const RAILWAY = 'https://worker-production-d575.up.railway.app'

const C = {
  bg:'#ffffff', bgSoft:'#f9fafb', bgMuted:'#f3f4f6',
  border:'#e5e7eb', borderMd:'#d1d5db',
  txt:'#111827', txtMd:'#4b5563', txtSoft:'#9ca3af',
  danger:'#dc2626', dangerBg:'#fef2f2', dangerBorder:'#fecaca',
  warn:'#d97706', warnBg:'#fffbeb', warnBorder:'#fde68a',
  ok:'#16a34a', okBg:'#f0fdf4', okBorder:'#bbf7d0',
  blue:'#2563eb', blueBg:'#eff6ff', blueBorder:'#bfdbfe',
}

const CUENTAS = ['GTK','RBN','GDP']
const NOMBRES = { GTK:'Graphic Tek', RBN:'RBN Inksys', GDP:'GDP Ink' }

function riskColor(score) {
  if (score >= 15) return C.danger
  if (score >= 10) return C.warn
  if (score >= 5)  return '#ca8a04'
  return C.ok
}

function riskLabel(score) {
  if (score >= 15) return 'CRÍTICO'
  if (score >= 10) return 'ALTO'
  if (score >= 5)  return 'MEDIO'
  return 'BAJO'
}

function RiskBadge({ score }) {
  const color = riskColor(score)
  const label = riskLabel(score)
  return (
    <span style={{
      background: color + '18', color, border: `1px solid ${color}40`,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
      letterSpacing: 0.5,
    }}>{label} {score}</span>
  )
}

function TabResumen({ rows }) {
  const criticos  = rows.filter(r => r.risk_score >= 15).length
  const altos     = rows.filter(r => r.risk_score >= 10 && r.risk_score < 15).length
  const medios    = rows.filter(r => r.risk_score >= 5  && r.risk_score < 10).length
  const total_reclamos = rows.reduce((a,r) => a + (r.total_reclamos||0), 0)
  const total_dev      = rows.reduce((a,r) => a + (r.total_devoluciones||0), 0)
  const top10 = [...rows].sort((a,b) => b.risk_score - a.risk_score).slice(0,10)

  return (
    <div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20}}>
        {[
          { label:'SKUs Críticos', val:criticos, color:C.danger },
          { label:'SKUs Alto Riesgo', val:altos, color:C.warn },
          { label:'SKUs Medio Riesgo', val:medios, color:'#ca8a04' },
          { label:'Total Reclamos', val:total_reclamos, color:C.blue },
        ].map(k => (
          <div key={k.label} style={{background:C.bgSoft, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px'}}>
            <div style={{fontSize:11, color:C.txtSoft, marginBottom:4}}>{k.label}</div>
            <div style={{fontSize:24, fontWeight:700, color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{background:C.bgSoft, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden'}}>
        <div style={{padding:'12px 16px', borderBottom:`1px solid ${C.border}`, fontWeight:600, fontSize:13}}>
          Top 10 SKUs por Riesgo
        </div>
        <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
          <thead>
            <tr style={{background:C.bgMuted}}>
              {['SKU','Cuenta','Risk Score','Reclamos','Devoluciones','Problemas','No Recibidos','Últ. actividad'].map(h => (
                <th key={h} style={{padding:'8px 12px', textAlign:'left', fontSize:11, color:C.txtSoft, fontWeight:600}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top10.map((r,i) => (
              <tr key={i} style={{borderTop:`1px solid ${C.border}`, background: r.risk_score>=15 ? C.dangerBg : r.risk_score>=10 ? C.warnBg : C.bg}}>
                <td style={{padding:'8px 12px', fontSize:12, fontWeight:600}}>{r.sku}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.cuenta}</td>
                <td style={{padding:'8px 12px'}}><RiskBadge score={r.risk_score||0}/></td>
                <td style={{padding:'8px 12px', fontSize:12, color:C.danger}}>{r.total_reclamos||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_devoluciones||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_problemas_tecnicos||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_no_recibidos||0}</td>
                <td style={{padding:'8px 12px', fontSize:11, color:C.txtSoft}}>
                  {r.ultima_actualizacion ? new Date(r.ultima_actualizacion).toLocaleDateString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {top10.length === 0 && (
          <div style={{padding:24, textAlign:'center', color:C.txtSoft, fontSize:13}}>Sin datos de riesgo aún</div>
        )}
      </div>
    </div>
  )
}

function TabPorCuenta({ rows }) {
  const [cuenta, setCuenta] = useState('GTK')
  const filtered = rows.filter(r => r.cuenta === cuenta)
    .sort((a,b) => b.risk_score - a.risk_score)

  return (
    <div>
      <div style={{display:'flex', gap:8, marginBottom:16}}>
        {CUENTAS.map(c => (
          <button key={c} onClick={() => setCuenta(c)} style={{
            padding:'6px 16px', borderRadius:7, border:`1.5px solid ${cuenta===c ? C.blueBorder : C.border}`,
            background: cuenta===c ? C.blueBg : C.bg, color: cuenta===c ? C.blue : C.txtMd,
            cursor:'pointer', fontWeight: cuenta===c ? 700 : 400, fontSize:13,
          }}>{NOMBRES[c]}</button>
        ))}
      </div>
      <div style={{background:C.bgSoft, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
          <thead>
            <tr style={{background:C.bgMuted}}>
              {['SKU','Risk Score','Reclamos','Devoluciones','Problemas','Compatibilidad','Facturas','Total msgs'].map(h => (
                <th key={h} style={{padding:'8px 12px', textAlign:'left', fontSize:11, color:C.txtSoft, fontWeight:600}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r,i) => (
              <tr key={i} style={{borderTop:`1px solid ${C.border}`, background: r.risk_score>=15 ? C.dangerBg : r.risk_score>=10 ? C.warnBg : C.bg}}>
                <td style={{padding:'8px 12px', fontSize:12, fontWeight:600}}>{r.sku}</td>
                <td style={{padding:'8px 12px'}}><RiskBadge score={r.risk_score||0}/></td>
                <td style={{padding:'8px 12px', fontSize:12, color:C.danger}}>{r.total_reclamos||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_devoluciones||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_problemas_tecnicos||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_compatibilidad||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_facturas||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_mensajes||0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{padding:24, textAlign:'center', color:C.txtSoft, fontSize:13}}>Sin SKUs con riesgo en {NOMBRES[cuenta]}</div>
        )}
      </div>
    </div>
  )
}

function TabReclamos({ rows }) {
  const conReclamos = [...rows]
    .filter(r => r.total_reclamos > 0)
    .sort((a,b) => b.total_reclamos - a.total_reclamos)

  return (
    <div>
      <div style={{marginBottom:12, fontSize:13, color:C.txtMd}}>
        {conReclamos.length} SKUs con reclamos activos
      </div>
      <div style={{background:C.bgSoft, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
          <thead>
            <tr style={{background:C.bgMuted}}>
              {['SKU','Cuenta','Reclamos','Risk Score','No Recibidos','Devoluciones','Problemas Técnicos'].map(h => (
                <th key={h} style={{padding:'8px 12px', textAlign:'left', fontSize:11, color:C.txtSoft, fontWeight:600}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conReclamos.map((r,i) => (
              <tr key={i} style={{borderTop:`1px solid ${C.border}`, background: r.total_reclamos>=5 ? C.dangerBg : r.total_reclamos>=3 ? C.warnBg : C.bg}}>
                <td style={{padding:'8px 12px', fontSize:12, fontWeight:600}}>{r.sku}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.cuenta}</td>
                <td style={{padding:'8px 12px', fontSize:13, fontWeight:700, color:C.danger}}>{r.total_reclamos}</td>
                <td style={{padding:'8px 12px'}}><RiskBadge score={r.risk_score||0}/></td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_no_recibidos||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_devoluciones||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_problemas_tecnicos||0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {conReclamos.length === 0 && (
          <div style={{padding:24, textAlign:'center', color:C.ok, fontSize:13}}>✅ Sin SKUs con reclamos</div>
        )}
      </div>
    </div>
  )
}

function TabTodos({ rows }) {
  const [search, setSearch] = useState('')
  const filtered = rows
    .filter(r => !search || r.sku.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => b.risk_score - a.risk_score)

  return (
    <div>
      <input
        placeholder="Buscar SKU..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width:'100%', padding:'8px 12px', borderRadius:8,
          border:`1px solid ${C.borderMd}`, fontSize:13,
          marginBottom:12, boxSizing:'border-box',
        }}
      />
      <div style={{background:C.bgSoft, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
          <thead>
            <tr style={{background:C.bgMuted}}>
              {['SKU','Cuenta','Risk Score','Reclamos','Devoluciones','Problemas','Compatibilidad','Mensajes'].map(h => (
                <th key={h} style={{padding:'8px 12px', textAlign:'left', fontSize:11, color:C.txtSoft, fontWeight:600}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r,i) => (
              <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                <td style={{padding:'8px 12px', fontSize:12, fontWeight:600}}>{r.sku}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.cuenta}</td>
                <td style={{padding:'8px 12px'}}><RiskBadge score={r.risk_score||0}/></td>
                <td style={{padding:'8px 12px', fontSize:12, color: (r.total_reclamos||0)>0 ? C.danger : C.txtSoft}}>{r.total_reclamos||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_devoluciones||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_problemas_tecnicos||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_compatibilidad||0}</td>
                <td style={{padding:'8px 12px', fontSize:12}}>{r.total_mensajes||0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{padding:24, textAlign:'center', color:C.txtSoft, fontSize:13}}>Sin resultados</div>
        )}
      </div>
    </div>
  )
}

const TABS = [
  { id:'resumen',   label:'Resumen' },
  { id:'cuenta',    label:'Por Cuenta' },
  { id:'reclamos',  label:'Reclamos' },
  { id:'todos',     label:'Todos los SKUs' },
]

export default function SkuRisk({ onLogout }) {
  const [tab, setTab]       = useState('resumen')
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const token = () => localStorage.getItem('khn_token') || ''

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${RAILWAY}/api/reputacion/sku_risk`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      const d = await r.json()
      setRows(d.sku_risk || [])
      setLastUpdate(new Date())
    } catch(e) {
      console.error('sku_risk load error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const criticos = rows.filter(r => (r.risk_score||0) >= 15).length

  return (
    <div style={{minHeight:'100vh', background:C.bgMuted}}>
      <Topbar onLogout={onLogout} />
      <div style={{maxWidth:1100, margin:'0 auto', padding:'24px 16px'}}>

        {/* Header */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <div>
            <h1 style={{margin:0, fontSize:20, fontWeight:700, color:C.txt}}>SKU Risk Master</h1>
            <div style={{fontSize:12, color:C.txtSoft, marginTop:2}}>
              Monitoreo de riesgo por producto · {rows.length} SKUs tracked
              {lastUpdate && ` · Actualizado ${lastUpdate.toLocaleTimeString('es-MX')}`}
            </div>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            {criticos > 0 && (
              <span style={{background:C.dangerBg, color:C.danger, border:`1px solid ${C.dangerBorder}`,
                borderRadius:8, padding:'4px 12px', fontSize:12, fontWeight:700}}>
                🔴 {criticos} CRÍTICO{criticos>1?'S':''}
              </span>
            )}
            <button onClick={load} disabled={loading} style={{
              padding:'7px 16px', borderRadius:8, border:`1px solid ${C.borderMd}`,
              background:C.bg, cursor:'pointer', fontSize:13, color:C.txt,
            }}>
              {loading ? 'Cargando...' : '↻ Actualizar'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex', gap:4, marginBottom:16, background:C.bg, borderRadius:10,
          padding:4, border:`1px solid ${C.border}`, width:'fit-content'}}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:'6px 18px', borderRadius:7, border:'none',
              background: tab===t.id ? C.blue : 'transparent',
              color: tab===t.id ? '#fff' : C.txtMd,
              cursor:'pointer', fontWeight: tab===t.id ? 600 : 400, fontSize:13,
              transition:'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        {loading && rows.length === 0 ? (
          <div style={{padding:40, textAlign:'center', color:C.txtSoft}}>Cargando datos de riesgo...</div>
        ) : (
          <>
            {tab === 'resumen'  && <TabResumen rows={rows} />}
            {tab === 'cuenta'   && <TabPorCuenta rows={rows} />}
            {tab === 'reclamos' && <TabReclamos rows={rows} />}
            {tab === 'todos'    && <TabTodos rows={rows} />}
          </>
        )}
      </div>
    </div>
  )
}
