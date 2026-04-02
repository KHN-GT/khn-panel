import { useState, useEffect, useCallback } from 'react'
import Topbar from '../components/Topbar'

const RAILWAY = 'https://worker-production-d575.up.railway.app'

const C = {
  bg:       '#ffffff',
  bgSoft:   '#f9fafb',
  bgMuted:  '#f3f4f6',
  border:   '#e5e7eb',
  borderMd: '#d1d5db',
  txt:      '#111827',
  txtMd:    '#4b5563',
  txtSoft:  '#9ca3af',
  danger:   '#dc2626', dangerBg: '#fef2f2', dangerBorder: '#fecaca',
  warn:     '#d97706', warnBg:   '#fffbeb', warnBorder:   '#fde68a',
  ok:       '#16a34a', okBg:     '#f0fdf4', okBorder:     '#bbf7d0',
  blue:     '#2563eb', blueBg:   '#eff6ff', blueBorder:   '#bfdbfe',
}

const CUENTAS = ['GTK', 'RBN', 'GDP']
const NOMBRES = { GTK: 'Graphic Tek', RBN: 'RBN Inksys', GDP: 'GDP Ink' }
const IDS_ML  = { GTK: '#137479386',  RBN: '#654370551',  GDP: '#1713490278' }
const SEGS = ['#e53935','#f57c00','#ffc107','#8bc34a','#2e7d32']

function getLevelInfo(level_id = '') {
  const l = (level_id || '').toLowerCase()
  if (l.includes('red')   && !l.includes('green')) return { label:'Rojo',       color:'#b71c1c', seg:0, pct:'10%' }
  if (l.includes('orange'))                         return { label:'Naranja',    color:'#965B00', seg:1, pct:'30%' }
  if (l.includes('yellow'))                         return { label:'Amarillo',   color:'#856404', seg:2, pct:'50%' }
  if (l.includes('light_green'))                    return { label:'Verde claro',color:'#558b2f', seg:3, pct:'70%' }
  if (l.includes('green'))                          return { label:'Verde',      color:'#2e7d32', seg:4, pct:'90%' }
  return { label:'Sin datos', color: C.txtSoft, seg:-1, pct:'50%' }
}

function getDaysRemaining(creado_en) {
  if (!creado_en) return null
  return Math.max(0, Math.ceil((new Date(creado_en).getTime() + 60*86400000 - Date.now()) / 86400000))
}

function getExpiryStr(creado_en) {
  if (!creado_en) return ''
  return new Date(new Date(creado_en).getTime() + 60*86400000)
    .toLocaleDateString('es-MX', { day:'numeric', month:'short' })
}

function getOpenedStr(creado_en) {
  if (!creado_en) return '—'
  return new Date(creado_en).toLocaleDateString('es-MX', { day:'numeric', month:'short' })
}

function cdColor(days) {
  if (days >= 45) return '#c62828'
  if (days >= 35) return '#d84315'
  if (days >= 25) return '#e65100'
  if (days >= 18) return '#f57c00'
  if (days >= 12) return '#fbc02d'
  if (days >= 7)  return '#7cb342'
  return '#43a047'
}

function fmtPct(r) { return ((r||0)*100).toFixed(2)+'%' }

function calcReqs(m) {
  if(!m||m.error) return {met:0,needed:0,items:[]}
  const a=(m.claims_rate||0)<0.01
  const b=(m.transactions_completed||0)>=10
  const c=(m.cancellations_rate||0)<0.005
  const d=(m.delayed_rate||0)<0.08
  const met=[a,b,c,d].filter(Boolean).length
  const periodTotal = m.claims_period_total || m.transactions_total || 1
  const needed=a?0:Math.max(0,Math.ceil((m.claims_value||0)/0.015-periodTotal))
  return {met,needed,items:[
    {ok:a,text:a?'Sin reclamos excesivos':'Reducir reclamos bajo 1%'},
    {ok:b,text:'Ventas concretadas'},
    {ok:c,text:'Canceladas por ti'},
    {ok:d,text:'Despachaste con demora'},
  ]}
}

function calcTimeline(cuenta, reclamos, metricas) {
  const m = metricas[cuenta]
  if (!m || m.error) return null
  const total = m.transactions_total || 1
  const limitCount = Math.floor(total * 0.01)
  const sorted = reclamos
    .filter(r => r.cuenta === cuenta)
    .map(r => ({ ...r, expTs: r.creado_en ? new Date(r.creado_en).getTime()+60*86400000 : 0, expStr: getExpiryStr(r.creado_en) }))
    .sort((a,b) => a.expTs - b.expTs)
  let rem = sorted.length
  const events = []
  let recoveryDate = null
  for (let i=0; i<sorted.length; i++) {
    rem--
    const rate = rem/total
    const isKey = rem <= limitCount && !recoveryDate
    if (isKey) recoveryDate = sorted[i].expStr
    events.push({ date:sorted[i].expStr, remaining:rem, rate, isKey, idx:i+1 })
  }
  const currentRate = m.claims_rate||0
  return {
    events, recoveryDate, alreadyOk: currentRate<0.01, currentRate, limitCount,
    chartPts:    [currentRate*100, ...events.map(e=>parseFloat((e.rate*100).toFixed(2)))],
    chartLabels: ['Hoy', ...events.map(e=>e.date)],
  }
}

function LineChart({ pts, labels, limit }) {
  const W=260,H=100,PL=30,PR=22,PT=6,PB=26
  const cW=W-PL-PR, cH=H-PT-PB
  const maxY = Math.max(...pts,limit,0.1)*1.3
  const toX = i => PL+(pts.length<2 ? cW/2 : (i/(pts.length-1))*cW)
  const toY = v => PT+cH-(v/maxY)*cH
  const limitY = toY(limit)
  const poly = pts.map((v,i)=>`${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  const area = poly+` ${toX(pts.length-1).toFixed(1)},${(PT+cH).toFixed(1)} ${PL},${(PT+cH).toFixed(1)}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',overflow:'visible'}}>
      <polygon points={area} fill="rgba(37,99,235,0.08)"/>
      <line x1={PL} y1={limitY} x2={W-PR} y2={limitY} stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,3"/>
      <text x={W-PR+2} y={limitY+3} fontSize="8" fill="#dc2626">1%</text>
      <polyline points={poly} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((v,i)=><circle key={i} cx={toX(i)} cy={toY(v)} r="2.5" fill="#2563eb"/>)}
      {labels.map((l,i)=><text key={i} x={toX(i)} y={H-4} fontSize="8" fill="#9ca3af" textAnchor="middle">{l}</text>)}
      {[0,parseFloat((maxY/2).toFixed(1))].map((v,i)=>(
        <text key={i} x={PL-3} y={toY(v)+3} fontSize="8" fill="#9ca3af" textAnchor="end">{v.toFixed(1)}%</text>
      ))}
    </svg>
  )
}

function AccountCard({ cuenta, m }) {
  const li   = getLevelInfo(m?.level_id)
  const reqs = calcReqs(m)
  const isErr = !m || m.error
  const donutPct = (reqs.met/4)*100

  const metricsRows = [
    { label:'Reclamos',     rate:m?.claims_rate,        value:m?.claims_value,        limit:0.01  },
    { label:'Mediaciones',  rate:m?.mediations_rate,    value:m?.mediations_value,    limit:0.005 },
    { label:'Canceladas',   rate:m?.cancellations_rate, value:m?.cancellations_value, limit:0.005 },
    { label:'Demora envio', rate:m?.delayed_rate,       value:m?.delayed_value,       limit:0.08  },
  ]

  return (
    <div style={{background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <div style={{padding:'10px 14px 8px', borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:13, fontWeight:600, color:C.txt}}>{NOMBRES[cuenta]}</div>
        <div style={{fontSize:11, color:C.txtSoft}}>{IDS_ML[cuenta]} · {cuenta}</div>
      </div>

      <div style={{padding:'10px 14px 8px', borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:10, color:C.txtSoft, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em'}}>Reputacion ML</div>
        <div style={{display:'flex', height:8, borderRadius:4, overflow:'hidden', gap:2}}>
          {SEGS.map((bg,i)=>(
            <div key={i} style={{flex:1, background:bg, opacity:i===li.seg?1:0.28, borderRadius:i===0?'4px 0 0 4px':i===4?'0 4px 4px 0':'0'}}/>
          ))}
        </div>
        <div style={{position:'relative', height:7}}>
          {li.seg>=0 && <div style={{position:'absolute', left:li.pct, transform:'translateX(-50%)', width:0, height:0, borderLeft:'4px solid transparent', borderRight:'4px solid transparent', borderTop:'7px solid '+C.txt}}/>}
        </div>
        <div style={{display:'flex', justifyContent:'space-between', marginTop:2}}>
          <span style={{fontSize:11, fontWeight:600, color:li.color}}>● {li.label}</span>
          <span style={{fontSize:10, color:C.txtSoft}}>Meta: Verde ▸</span>
        </div>
      </div>

      <div style={{display:'flex', gap:5, padding:'6px 14px', borderBottom:`1px solid ${C.border}`}}>
        {[{icon:'🥇',label:'MercadoLider'},{icon:'🏆',label:'Platinum'}].map(({icon,label})=>(
          <div key={label} style={{display:'flex', alignItems:'center', gap:3, fontSize:10, color:C.txtSoft, background:C.bgMuted, border:`1px solid ${C.border}`, borderRadius:5, padding:'2px 7px', opacity:0.5}}>
            <span>{icon}</span><span>{label}</span>
          </div>
        ))}
      </div>

      <div style={{padding:'8px 14px', borderBottom:`1px solid ${C.border}`}}>
        {isErr
          ? <div style={{fontSize:12, color:C.txtSoft}}>Sin datos de ML</div>
          : metricsRows.map(({label,rate,value,limit},ri)=>{
              const over = (rate||0)>limit
              const barPct = Math.min(100,((rate||0)/limit)*100)
              return (
                <div key={label} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'3px 0', borderBottom:ri<3?`1px solid ${C.border}`:'none'}}>
                  <span style={{fontSize:11, color:C.txtMd}}>{label}</span>
                  <div style={{display:'flex', alignItems:'center', gap:5}}>
                    <div style={{width:46, height:4, borderRadius:2, background:C.bgMuted, overflow:'hidden'}}>
                      <div style={{height:'100%', width:`${barPct}%`, background:over?'#dc2626':'#16a34a', borderRadius:2}}/>
                    </div>
                    <span style={{fontSize:11, fontWeight:600, color:over?'#dc2626':'#16a34a'}}>
                      {fmtPct(rate)} ({value||0})
                      {over && <span style={{fontSize:9, color:C.txtSoft, fontWeight:400}}> lim {(limit*100).toFixed(1)}%</span>}
                    </span>
                  </div>
                </div>
              )
            })
        }
      </div>

      <div style={{padding:'10px 14px', borderBottom:`1px solid ${C.border}`, background:C.bgSoft, flex:1}}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
          <svg width="38" height="38" viewBox="0 0 36 36" style={{flexShrink:0}}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={C.border} strokeWidth="3"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2563eb" strokeWidth="3"
              strokeDasharray={`${donutPct.toFixed(1)} ${(100-donutPct).toFixed(1)}`}
              strokeDashoffset="25" strokeLinecap="round"/>
            <text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="600" fill={C.txt}>{reqs.met}/4</text>
          </svg>
          <div>
            <div style={{fontSize:12, fontWeight:600, color:C.txt, lineHeight:1.3}}>Lo que falta para color verde</div>
            <div style={{fontSize:10, color:C.txtMd, marginTop:1}}>Requisitos para MercadoLider</div>
          </div>
        </div>
        {reqs.needed > 0 && (
          <div style={{display:'flex', alignItems:'baseline', gap:6, marginBottom:10,
            padding:'7px 10px', background:'#fefce8', border:'1px solid #fde68a',
            borderRadius:7}}>
            <span style={{fontSize:22, fontWeight:700, color:'#92400e', lineHeight:1}}>
              {reqs.needed}
            </span>
            <span style={{fontSize:11, color:'#92400e', lineHeight:1.3}}>
              ventas sin reclamos para recuperar color verde
            </span>
          </div>
        )}
        <div style={{display:'flex', flexDirection:'column', gap:5}}>
          {reqs.items.map((item,i)=>(
            <div key={i} style={{display:'flex', alignItems:'flex-start', gap:7}}>
              <div style={{width:15, height:15, borderRadius:'50%', border:`1.5px solid ${item.ok?'#2563eb':'#dc2626'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:item.ok?'#2563eb':'#dc2626', fontSize:9, marginTop:1}}>
                {item.ok?'✓':'✕'}
              </div>
              <span style={{fontSize:11, color:item.ok?C.txtMd:C.txt, fontWeight:item.ok?400:500, lineHeight:1.35}}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:'8px 14px', display:'flex', justifyContent:'space-around', background:C.bgSoft, borderTop:`1px solid ${C.border}`}}>
        {[{num:m?.transactions_total||0, label:'Ventas'},{num:m?.transactions_completed||0, label:'Concretadas'}].map(({num,label})=>(
          <div key={label} style={{textAlign:'center'}}>
            <div style={{fontSize:14, fontWeight:700, color:C.txt}}>{num.toLocaleString('es-MX')}</div>
            <div style={{fontSize:10, color:C.txtSoft}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CopyChip({ r }) {
  const [copied, setCopied] = useState(false)
  const id = r.orden_id || r.order_id || ''
  const url = id
    ? `https://www.mercadolibre.com.mx/ventas/${id}/detalle`
    : r.claim_id
    ? `https://www.mercadolibre.com.mx/ventas/reclamos/${r.claim_id}`
    : null
  const handleCopy = () => {
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <span onClick={handleCopy} style={{
      display:'inline-flex', alignItems:'center', gap:4,
      fontSize:11, fontWeight:600, cursor: url ? 'pointer' : 'not-allowed',
      padding:'3px 9px', borderRadius:6,
      background: copied ? '#f0fdf4' : url ? '#eff6ff' : '#f3f4f6',
      color: copied ? '#16a34a' : url ? '#2563eb' : '#9ca3af',
      border: `1px solid ${copied ? '#bbf7d0' : url ? '#bfdbfe' : '#e5e7eb'}`,
      userSelect:'none', transition:'all 0.15s'
    }}>
      {copied ? '✓ Copiado' : url ? '⎘ Orden' : 'Sin ID'}
    </span>
  )
}

function ClaimsTable({ reclamos, filtro, setFiltro }) {
  const urgStyle = u => ({
    CRITICO:    { bg:'#fef2f2', color:'#dc2626' },
    URGENTE:    { bg:'#fffbeb', color:'#d97706' },
    MODERADO:   { bg:'#fefce8', color:'#ca8a04' },
    INFORMATIVO:{ bg:C.bgMuted, color:C.txtMd },
  }[u] || { bg:C.bgMuted, color:C.txtMd })

  const sorted = [...reclamos].sort((a,b)=>(b.daysRemaining||0)-(a.daysRemaining||0))

  return (
    <div style={{marginBottom:'1.5rem'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, flexWrap:'wrap', gap:8}}>
        <div>
          <div style={{fontSize:15, fontWeight:600, color:C.txt}}>Reclamos activos que afectan reputacion</div>
          <div style={{fontSize:12, color:C.txtSoft}}>Mas dias restantes = mas tiempo afectando · la barra se vuelve verde al acercarse al vencimiento</div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <span style={{fontSize:11, fontWeight:600, background:C.dangerBg, color:C.danger, padding:'2px 10px', borderRadius:20, border:`1px solid ${C.dangerBorder}`}}>{reclamos.length} total</span>
          <div style={{display:'flex', gap:5}}>
            {['Todas','GTK','RBN','GDP'].map(f=>(
              <button key={f} onClick={()=>setFiltro(f)} style={{fontSize:11, padding:'3px 11px', borderRadius:20, cursor:'pointer', border:`1px solid ${filtro===f?C.blueBorder:C.border}`, color:filtro===f?C.blue:C.txtMd, background:filtro===f?C.blueBg:C.bg, fontWeight:filtro===f?600:400}}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
          <colgroup>
            <col style={{width:'36%'}}/><col style={{width:'10%'}}/>
            <col style={{width:'28%'}}/><col style={{width:'12%'}}/><col style={{width:'14%'}}/>
          </colgroup>
          <thead>
            <tr style={{background:C.bgSoft}}>
              {['Producto / Comprador','Cuenta','Tiempo afectando (mejor cuanto menos quede)','Urgencia','Accion'].map(h=>(
                <th key={h} style={{textAlign:'left', fontSize:10, fontWeight:600, color:C.txtSoft, textTransform:'uppercase', letterSpacing:'0.05em', padding:'9px 12px', borderBottom:`1px solid ${C.border}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length===0 && <tr><td colSpan={5} style={{padding:'20px 12px', textAlign:'center', fontSize:13, color:C.txtSoft}}>Sin reclamos activos</td></tr>}
            {sorted.map((r,i)=>{
              const days = r.daysRemaining
              const barColor = cdColor(days??60)
              const pct = days!=null ? (days/60)*100 : 0
              const us = urgStyle(r.urgencia)
              return (
                <tr key={r.id||i} style={{borderBottom:`1px solid ${C.border}`}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bgSoft}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{padding:'9px 12px'}}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      {r.imagen_thumbnail
                        ? <img src={r.imagen_thumbnail} alt="" style={{width:30, height:30, borderRadius:5, objectFit:'cover', border:`1px solid ${C.border}`, flexShrink:0}}/>
                        : <div style={{width:30, height:30, borderRadius:5, background:C.bgMuted, border:`1px solid ${C.border}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13}}>📦</div>
                      }
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:11, color:C.txt, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500}}>
                          {r.producto||r.nombre_comprador||r.comprador||'—'}
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:4, marginTop:2, flexWrap:'wrap'}}>
                          {r.sku && (
                            <span style={{fontSize:9, fontWeight:600, background:'#f3f4f6',
                              border:'1px solid #e5e7eb', borderRadius:3, padding:'1px 5px',
                              color:'#6b7280', fontFamily:'monospace'}}>
                              {r.sku}
                            </span>
                          )}
                          {(r.nombre_comprador||r.comprador) && (
                            <span style={{fontSize:9, color:'#6b7280', fontWeight:500}}>
                              {r.nombre_comprador||r.comprador}
                            </span>
                          )}
                        </div>
                        <div style={{fontSize:10, color:C.txtSoft, marginTop:1}}>
                          Abierto {getOpenedStr(r.creado_en)} · expira {getExpiryStr(r.creado_en)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'9px 12px'}}>
                    <span style={{fontSize:11, fontWeight:600, color:C.txtMd, background:C.bgMuted, padding:'2px 7px', borderRadius:4}}>{r.cuenta}</span>
                  </td>
                  <td style={{padding:'9px 12px'}}>
                    <div style={{height:6, borderRadius:3, background:C.bgMuted, overflow:'hidden', marginBottom:3}}>
                      <div style={{height:'100%', width:`${pct}%`, background:barColor, borderRadius:3}}/>
                    </div>
                    <div style={{fontSize:10, display:'flex', justifyContent:'space-between'}}>
                      <span style={{fontWeight:600, color:barColor}}>{days!=null?`${days} dias restantes`:'—'}</span>
                      <span style={{color:C.txtSoft}}>vence {getExpiryStr(r.creado_en)}</span>
                    </div>
                  </td>
                  <td style={{padding:'9px 12px'}}>
                    <span style={{fontSize:10, fontWeight:600, background:us.bg, color:us.color, padding:'2px 7px', borderRadius:4}}>{r.urgencia||'—'}</span>
                  </td>
                  <td style={{padding:'9px 12px'}}>
                    <CopyChip r={r} />
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

function RecoverySection({ metricas, reclamos, activeTab, setActiveTab }) {
  const tl = calcTimeline(activeTab, reclamos, metricas)

  return (
    <div style={{background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', marginBottom:'1.5rem'}}>
      <div style={{padding:'12px 16px', borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:15, fontWeight:600, color:C.txt}}>Estimado de recuperacion</div>
        <div style={{fontSize:12, color:C.txtSoft, marginTop:2}}>Proyeccion por cuenta sin nuevos reclamos</div>
      </div>

      <div style={{display:'flex', gap:8, padding:'10px 14px', borderBottom:`1px solid ${C.border}`, background:C.bgSoft}}>
        {CUENTAS.map(acc=>{
          const m = metricas[acc]
          const isOver = (m?.claims_rate||0)>=0.01
          const tld = calcTimeline(acc, reclamos, metricas)
          const isActive = activeTab===acc
          return (
            <div key={acc} onClick={()=>setActiveTab(acc)} style={{flex:1, padding:'9px 13px', borderRadius:9, border:`1.5px solid ${isActive?C.blueBorder:C.border}`, background:isActive?C.blueBg:C.bg, cursor:'pointer'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:12, fontWeight:600, color:isActive?C.blue:C.txt}}>{NOMBRES[acc]}</div>
                  <div style={{fontSize:10, color:isActive?C.blue:C.txtSoft, marginTop:1, opacity:0.85}}>
                    {fmtPct(m?.claims_rate)} · {m?.claims_value||0} reclamos
                  </div>
                </div>
                <div style={{width:8, height:8, borderRadius:'50%', background:isOver?'#dc2626':'#16a34a', flexShrink:0, marginTop:2}}/>
              </div>
              <div style={{marginTop:6, fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:4, display:'inline-block', background:isOver?C.dangerBg:C.okBg, color:isOver?C.danger:C.ok, border:`1px solid ${isOver?C.dangerBorder:C.okBorder}`}}>
                {tld?.alreadyOk ? 'Dentro del limite' : tld?.recoveryDate ? `Recupera ${tld.recoveryDate}` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{padding:16}}>
        {!tl
          ? <div style={{fontSize:13, color:C.txtSoft}}>Sin datos para esta cuenta</div>
          : <div style={{display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:24}}>
              <div>
                <div style={{fontSize:11, fontWeight:600, color:C.txtMd, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                  Timeline · {NOMBRES[activeTab]} · limite 1% (max {tl.limitCount} reclamos)
                </div>
                {tl.alreadyOk && (
                  <div style={{padding:'8px 12px', borderRadius:8, background:C.okBg, border:`1px solid ${C.okBorder}`, fontSize:12, color:C.ok, marginBottom:10}}>
                    Ya dentro del limite — mantener sin nuevos reclamos
                  </div>
                )}
                <div style={{position:'relative', paddingLeft:20}}>
                  {tl.events.length===0 && <div style={{fontSize:12, color:C.txtSoft}}>Sin reclamos activos en esta cuenta</div>}
                  {tl.events.map((ev,i)=>(
                    <div key={i} style={{position:'relative', paddingBottom:i<tl.events.length-1?14:0, paddingLeft:12}}>
                      <div style={{position:'absolute', left:-20, top:3, width:8, height:8, borderRadius:'50%', border:`1.5px solid ${ev.isKey?'#16a34a':'#dc2626'}`, background:ev.isKey?C.okBg:C.dangerBg}}/>
                      {i<tl.events.length-1 && <div style={{position:'absolute', left:-17, top:11, bottom:0, width:1, background:C.border}}/>}
                      <div style={{fontSize:11, fontWeight:ev.isKey?600:400, color:ev.isKey?C.ok:C.txt}}>
                        {ev.date} — vence reclamo #{ev.idx}{ev.isKey?' ✓':''}
                      </div>
                      <div style={{fontSize:11, color:C.txtMd, marginTop:1}}>Quedan {ev.remaining} reclamos activos</div>
                      <span style={{fontSize:10, padding:'1px 6px', borderRadius:4, display:'inline-block', marginTop:3, background:ev.isKey?C.okBg:C.dangerBg, color:ev.isKey?C.ok:C.danger, border:`1px solid ${ev.isKey?C.okBorder:C.dangerBorder}`}}>
                        {(ev.rate*100).toFixed(2)}% · {ev.isKey?'baja del limite':'sigue por encima'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:11, fontWeight:600, color:C.txtMd, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em'}}>Proyeccion de tasa</div>
                {tl.chartPts.length>1
                  ? <LineChart pts={tl.chartPts} labels={tl.chartLabels} limit={1}/>
                  : <div style={{fontSize:12, color:C.txtSoft}}>—</div>
                }
                <div style={{marginTop:12, padding:'10px 14px', borderRadius:9, display:'flex', alignItems:'center', gap:10, background:tl.alreadyOk?C.bgSoft:C.okBg, border:`1px solid ${tl.alreadyOk?C.border:C.okBorder}`}}>
                  <div style={{fontSize:18}}>{tl.alreadyOk?'✅':'📅'}</div>
                  <div>
                    <div style={{fontSize:13, fontWeight:600, color:tl.alreadyOk?C.txtMd:C.ok}}>
                      {tl.alreadyOk ? `${NOMBRES[activeTab]} ya esta dentro del limite` : `Recuperacion estimada: ${tl.recoveryDate||'—'}`}
                    </div>
                    <div style={{fontSize:11, marginTop:1, color:tl.alreadyOk?C.txtSoft:C.ok, opacity:0.85}}>
                      {tl.alreadyOk
                        ? 'Mantener sin nuevos reclamos para conservar el estado'
                        : `${NOMBRES[activeTab]} baja de 1% y puede optar a MercadoLider`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
        }
      </div>
    </div>
  )
}

function BottomSection({ reclamos }) {
  const minDays = reclamos.length ? Math.min(...reclamos.map(r=>getDaysRemaining(r.creado_en)??60)) : null
  const cuentasEnRiesgo = CUENTAS.filter(c=>reclamos.some(r=>r.cuenta===c)).length
  const vencenSemana = reclamos.filter(r=>(getDaysRemaining(r.creado_en)??60)<=7).length
  const skuMap = {}
  reclamos.forEach(r=>{ const k=r.sku||'sin-sku'; skuMap[k]=(skuMap[k]||0)+1 })
  const skus = Object.entries(skuMap).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const maxC = skus[0]?.[1]||1
  const summaryItems = [
    { label:'Reclamos afectando',   val:reclamos.length,              color:reclamos.length>0?C.danger:C.ok },
    { label:'Vencen esta semana',   val:vencenSemana,                 color:vencenSemana>0?C.warn:C.ok },
    { label:'Cuentas en riesgo',    val:`${cuentasEnRiesgo} de 3`,    color:cuentasEnRiesgo>0?C.danger:C.ok },
    { label:'Mas proximo a vencer', val:minDays!=null?`${minDays} dias`:'—', color:C.ok },
  ]
  const cardSt = {background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden'}
  return (
    <div style={{display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:12}}>
      <div style={cardSt}>
        <div style={{padding:'10px 14px', borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:14, fontWeight:600, color:C.txt}}>SKU Risk</div>
          <div style={{fontSize:12, color:C.txtSoft, marginTop:2}}>Por reclamos acumulados</div>
        </div>
        {skus.length===0
          ? <div style={{padding:'12px 14px', fontSize:12, color:C.txtSoft}}>Sin datos de SKU en reclamos</div>
          : skus.map(([sku,count],i)=>(
            <div key={sku} style={{display:'flex', alignItems:'center', padding:'7px 14px', borderBottom:i<skus.length-1?`1px solid ${C.border}`:'none', gap:8}}>
              <span style={{fontSize:10, fontWeight:600, padding:'2px 6px', background:C.bgMuted, border:`1px solid ${C.border}`, borderRadius:4, color:C.txtMd, fontFamily:'monospace', minWidth:70}}>{sku}</span>
              <div style={{flex:1, height:4, borderRadius:2, background:C.bgMuted, overflow:'hidden'}}>
                <div style={{height:'100%', width:`${(count/maxC)*100}%`, background:count===maxC?'#dc2626':'#f97316', borderRadius:2}}/>
              </div>
              <span style={{fontSize:11, color:C.txtMd, minWidth:20, textAlign:'right', fontWeight:600}}>{count}</span>
            </div>
          ))
        }
      </div>
      <div style={cardSt}>
        <div style={{padding:'10px 14px', borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:14, fontWeight:600, color:C.txt}}>Resumen ejecutivo</div>
          <div style={{fontSize:12, color:C.txtSoft, marginTop:2}}>Todas las cuentas · hoy</div>
        </div>
        {summaryItems.map(({label,val,color},i)=>(
          <div key={label} style={{display:'flex', alignItems:'center', padding:'9px 14px', borderBottom:i<summaryItems.length-1?`1px solid ${C.border}`:'none', gap:8}}>
            <span style={{fontSize:12, color:C.txtMd, flex:1}}>{label}</span>
            <span style={{fontSize:14, fontWeight:700, color}}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReputacionShield({ onLogout }) {
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
      const h = { Authorization: `Bearer ${tok}` }
      const [metRes, recRes] = await Promise.all([
        fetch(`${RAILWAY}/api/reputacion/metricas-reales`, {headers:h}).then(r=>r.json()).catch(()=>({})),
        fetch(`${RAILWAY}/api/reputacion/reclamos`,        {headers:h}).then(r=>r.json()).catch(()=>([])),
      ])
      setMetricas(metRes||{})
      const raw = recRes
      setReclamos(Array.isArray(raw) ? raw : (raw?.reclamos||[]))
      setLastUpdate(new Date())
    } catch(e) {
      console.error('[ReputacionShield]', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(()=>{ fetchData() }, [fetchData])

  const reclamosFiltrados = reclamos
    .filter(r=>filtro==='Todas'||r.cuenta===filtro)
    .map(r=>({...r, daysRemaining:getDaysRemaining(r.creado_en)}))

  function fmtLastUpdate() {
    if (!lastUpdate) return ''
    const diff = Math.floor((Date.now()-lastUpdate)/60000)
    return diff<1 ? 'hace menos de 1 min' : `hace ${diff} min`
  }

  if (loading) return <div style={{padding:'2rem', color:C.txtSoft, fontSize:14}}>Cargando datos de MercadoLibre...</div>

  return (
    <div style={{height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden'}}>
    <Topbar onLogout={onLogout} />
    <div style={{flex:1, overflowY:'auto'}}>
    <div style={{padding:'1.25rem 2rem', maxWidth:1140, margin:'0 auto', fontFamily:'system-ui, -apple-system, sans-serif'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:10}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:34, height:34, borderRadius:9, background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, border:`1px solid ${C.dangerBorder}`}}>🛡️</div>
          <div>
            <div style={{fontSize:19, fontWeight:700, color:C.txt}}>Reputation Shield</div>
            <div style={{fontSize:13, color:C.txtSoft, marginTop:1}}>Datos reales de MercadoLibre · ultimos 60 dias</div>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <button onClick={fetchData} disabled={refreshing} style={{fontSize:13, color:C.txtMd, background:C.bgSoft, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 14px', cursor:refreshing?'default':'pointer', opacity:refreshing?0.6:1, fontWeight:500}}>
            {refreshing ? 'Actualizando...' : '↻ Actualizar desde ML'}
          </button>
          {lastUpdate && (
            <div style={{fontSize:12, color:C.txtSoft, display:'flex', alignItems:'center', gap:4, marginTop:4, justifyContent:'flex-end'}}>
              <span style={{width:6, height:6, borderRadius:'50%', background:'#16a34a', display:'inline-block'}}/>
              Actualizado {fmtLastUpdate()}
            </div>
          )}
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:14, marginBottom:'1.5rem'}}>
        {CUENTAS.map(acc=><AccountCard key={acc} cuenta={acc} m={metricas[acc]}/>)}
      </div>

      <ClaimsTable reclamos={reclamosFiltrados} filtro={filtro} setFiltro={setFiltro}/>
      <RecoverySection metricas={metricas} reclamos={reclamos} activeTab={recoveryTab} setActiveTab={setRecoveryTab}/>
      <BottomSection reclamos={reclamos}/>
    </div>
    </div>
    </div>
  )
}
