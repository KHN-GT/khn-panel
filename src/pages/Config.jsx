import { useState, useEffect } from 'react'

const RAILWAY = 'https://worker-production-d575.up.railway.app'
const CUENTAS = ['GTK', 'RBN', 'GDP']
const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DIAS_LABEL = { lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue', viernes:'Vie', sabado:'Sáb', domingo:'Dom' }
const CANALES = ['pre_compra','post_venta','reclamos']
const CANAL_LABEL = { pre_compra:'Preguntas', post_venta:'Post-venta', reclamos:'Reclamos' }
const MODOS = ['revision','semi_auto','automatico']
const MODO_LABEL = { revision:'Revisión manual', semi_auto:'Semi-automático', automatico:'Automático' }
const MODO_DESC = {
  revision: 'La IA sugiere, humano aprueba siempre',
  semi_auto: 'La IA envía si confianza alta, sino espera aprobación',
  automatico: 'La IA responde sola sin intervención humana',
}
const ACCT_COLOR = {
  GTK: { color:'var(--acct-gtk)', bg:'var(--acct-gtk-bg)', br:'var(--acct-gtk-br)' },
  RBN: { color:'var(--acct-rbn)', bg:'var(--acct-rbn-bg)', br:'var(--acct-rbn-br)' },
  GDP: { color:'var(--acct-gdp)', bg:'var(--acct-gdp-bg)', br:'var(--acct-gdp-br)' },
}

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('khn_token')}`, 'Content-Type': 'application/json' }
}

export default function Config({ onBack }) {
  const [tab, setTab]           = useState('modos')
  const [cuentaTab, setCuentaTab] = useState('GTK')
  const [modos, setModos]       = useState({})
  const [horarios, setHorarios] = useState({})
  const [mensajes, setMensajes] = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`${RAILWAY}/api/config/modos`,    { headers: authHeaders() }).then(r=>r.json()),
      fetch(`${RAILWAY}/api/config/horarios`, { headers: authHeaders() }).then(r=>r.json()),
      fetch(`${RAILWAY}/api/config/mensajes`, { headers: authHeaders() }).then(r=>r.json()),
    ]).then(([m, h, msg]) => {
      setModos(m)
      setHorarios(h)
      setMensajes(msg)
    }).finally(() => setLoading(false))
  }, [])

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  // ── MODOS ──────────────────────────────────────────────────────
  const saveModo = async (cuenta, canal, campo, valor) => {
    setSaving(true)
    const body = { ...((modos[cuenta]?.[canal]) || {}), [campo]: valor }
    try {
      const r = await fetch(`${RAILWAY}/api/config/modos/${cuenta}/${canal}`,
        { method:'PUT', headers: authHeaders(), body: JSON.stringify(body) })
      if (r.ok) {
        setModos(prev => ({ ...prev, [cuenta]: { ...(prev[cuenta]||{}), [canal]: { ...(prev[cuenta]?.[canal]||{}), [campo]: valor } } }))
        flash('✅ Guardado')
      } else flash('❌ Error al guardar')
    } catch { flash('❌ Error de conexión') }
    finally { setSaving(false) }
  }

  // ── HORARIOS ───────────────────────────────────────────────────
  const saveHorarios = async (cuenta) => {
    setSaving(true)
    const dias = horarios[cuenta] || []
    try {
      const r = await fetch(`${RAILWAY}/api/config/horarios/${cuenta}`,
        { method:'PUT', headers: authHeaders(), body: JSON.stringify(dias) })
      if (r.ok) flash('✅ Horarios guardados')
      else flash('❌ Error al guardar')
    } catch { flash('❌ Error de conexión') }
    finally { setSaving(false) }
  }

  const updateHorario = (cuenta, dia, campo, valor) => {
    setHorarios(prev => {
      const dias = [...(prev[cuenta] || DIAS.map(d => ({ dia:d, activo:true, inicio:'09:00', fin:'18:00', tz:'America/Mexico_City' })))]
      const idx = dias.findIndex(d => d.dia === dia)
      if (idx >= 0) dias[idx] = { ...dias[idx], [campo]: valor }
      else dias.push({ dia, activo:true, inicio:'09:00', fin:'18:00', tz:'America/Mexico_City', [campo]: valor })
      return { ...prev, [cuenta]: dias }
    })
  }

  // ── MENSAJES ───────────────────────────────────────────────────
  const saveMensajes = async (cuenta) => {
    setSaving(true)
    try {
      const r = await fetch(`${RAILWAY}/api/config/mensajes/${cuenta}`,
        { method:'PUT', headers: authHeaders(), body: JSON.stringify(mensajes[cuenta] || {}) })
      if (r.ok) flash('✅ Mensajes guardados')
      else flash('❌ Error al guardar')
    } catch { flash('❌ Error de conexión') }
    finally { setSaving(false) }
  }

  const ac = ACCT_COLOR[cuentaTab]

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:22, height:22, border:'2.5px solid var(--purple)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
      <div style={{ fontSize:14, color:'var(--text3)' }}>Cargando configuración...</div>
    </div>
  )

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Topbar */}
      <div style={{ background:'var(--surface)', borderBottom:'1.5px solid var(--border)', padding:'0 20px', height:54, display:'flex', alignItems:'center', gap:14, flexShrink:0, boxShadow:'var(--shadow)' }}>
        <button onClick={onBack} style={{ fontSize:18, background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:'4px 8px', borderRadius:6 }}>←</button>
        <div style={{ fontSize:17, fontWeight:800, color:'var(--text)', letterSpacing:'-.4px' }}>
          KHN<span style={{ color:'var(--purple)' }}>_botics</span>
        </div>
        <div style={{ width:1, height:20, background:'var(--border)' }} />
        <div style={{ fontSize:13, color:'var(--text3)', fontWeight:500 }}>⚙️ Configuración</div>
        {msg && <span style={{ marginLeft:'auto', fontSize:12, fontWeight:700, color: msg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>{msg}</span>}
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Sidebar izquierdo — secciones */}
        <div style={{ width:200, background:'var(--surface)', borderRight:'1.5px solid var(--border)', padding:'16px 12px', display:'flex', flexDirection:'column', gap:4 }}>
          {[
            { id:'modos',    label:'🤖 Modos IA',     desc:'Cómo responde la IA' },
            { id:'horarios', label:'🕐 Horarios',      desc:'Cuándo opera la IA' },
            { id:'mensajes', label:'💬 Mensajes',      desc:'Mensajes fuera de horario' },
          ].map(s => (
            <button key={s.id} onClick={() => setTab(s.id)} style={{
              textAlign:'left', padding:'10px 12px', borderRadius:'var(--radius-sm)',
              border: tab === s.id ? '1.5px solid var(--purple-border)' : '1.5px solid transparent',
              background: tab === s.id ? 'var(--purple-light)' : 'transparent',
              cursor:'pointer', transition:'all .15s'
            }}>
              <div style={{ fontSize:13, fontWeight:700, color: tab === s.id ? 'var(--purple)' : 'var(--text)' }}>{s.label}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{s.desc}</div>
            </button>
          ))}
        </div>

        {/* Contenido principal */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px' }}>

          {/* Tabs de cuenta */}
          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            {CUENTAS.map(c => {
              const a = ACCT_COLOR[c]
              const active = cuentaTab === c
              return (
                <button key={c} onClick={() => setCuentaTab(c)} style={{
                  fontSize:13, fontWeight:700, padding:'8px 20px', borderRadius:'var(--radius-sm)',
                  border: `1.5px solid ${active ? a.br : 'var(--border)'}`,
                  background: active ? a.bg : 'transparent',
                  color: active ? a.color : 'var(--text3)',
                  cursor:'pointer', transition:'all .15s'
                }}>{c}</button>
              )
            })}
          </div>

          {/* ── MODOS IA ── */}
          {tab === 'modos' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ fontSize:13, color:'var(--text3)', marginBottom:4 }}>
                Configura cómo responde la IA en cada canal para la cuenta <strong style={{ color: ac.color }}>{cuentaTab}</strong>
              </div>
              {CANALES.map(canal => {
                const actual = modos[cuentaTab]?.[canal]?.modo || 'revision'
                const umbral = modos[cuentaTab]?.[canal]?.umbral ?? 85
                return (
                  <div key={canal} style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                    <div style={{ padding:'12px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{CANAL_LABEL[canal]}</span>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                        background: actual === 'automatico' ? 'var(--green-light)' : actual === 'semi_auto' ? 'var(--amber-light)' : 'var(--purple-light)',
                        color: actual === 'automatico' ? 'var(--green)' : actual === 'semi_auto' ? 'var(--amber)' : 'var(--purple)',
                        border: `1px solid ${actual === 'automatico' ? 'var(--green-border)' : actual === 'semi_auto' ? 'var(--amber-border)' : 'var(--purple-border)'}` }}>
                        {MODO_LABEL[actual]}
                      </span>
                    </div>
                    <div style={{ padding:'16px' }}>
                      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                        {MODOS.map(m => (
                          <button key={m} onClick={() => saveModo(cuentaTab, canal, 'modo', m)} style={{
                            flex:1, padding:'10px 8px', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'all .15s',
                            border: actual === m
                              ? `2px solid ${m==='automatico'?'var(--green)':m==='semi_auto'?'var(--amber)':'var(--purple)'}`
                              : '1.5px solid var(--border)',
                            background: actual === m
                              ? (m==='automatico'?'var(--green-light)':m==='semi_auto'?'var(--amber-light)':'var(--purple-light)')
                              : 'transparent',
                            color: actual === m
                              ? (m==='automatico'?'var(--green)':m==='semi_auto'?'var(--amber)':'var(--purple)')
                              : 'var(--text3)',
                          }}>
                            <div style={{ fontSize:12, fontWeight:700 }}>{MODO_LABEL[m]}</div>
                            <div style={{ fontSize:10, marginTop:3, lineHeight:1.4 }}>{MODO_DESC[m]}</div>
                          </button>
                        ))}
                      </div>
                      {actual !== 'revision' && (
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <span style={{ fontSize:12, color:'var(--text2)', whiteSpace:'nowrap' }}>Umbral de confianza para auto-envío:</span>
                          <input type="range" min={50} max={100} value={umbral}
                            onChange={e => setModos(prev => ({ ...prev, [cuentaTab]: { ...(prev[cuentaTab]||{}), [canal]: { ...(prev[cuentaTab]?.[canal]||{}), umbral: +e.target.value } } }))}
                            onMouseUp={e => saveModo(cuentaTab, canal, 'umbral', +e.target.value)}
                            style={{ flex:1 }} />
                          <span style={{ fontSize:13, fontWeight:700, color:'var(--purple)', minWidth:36 }}>{umbral}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── HORARIOS ── */}
          {tab === 'horarios' && (
            <div>
              <div style={{ fontSize:13, color:'var(--text3)', marginBottom:16 }}>
                Define los días y horarios en que la IA opera para <strong style={{ color: ac.color }}>{cuentaTab}</strong>. Fuera de estos horarios, se usará el mensaje configurado.
              </div>
              <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>Horarios de operación — {cuentaTab}</span>
                </div>
                {DIAS.map((dia, i) => {
                  const diasCuenta = horarios[cuentaTab] || []
                  const d = diasCuenta.find(x => x.dia === dia) || { dia, activo:true, inicio:'09:00', fin:'18:00' }
                  return (
                    <div key={dia} style={{ padding:'12px 16px', borderBottom: i < DIAS.length-1 ? '1px solid var(--border)' : 'none',
                      display:'flex', alignItems:'center', gap:16, background: d.activo ? 'transparent' : 'var(--surface2)' }}>
                      <div style={{ width:40, fontSize:13, fontWeight:700, color: d.activo ? 'var(--text)' : 'var(--text3)' }}>
                        {DIAS_LABEL[dia]}
                      </div>
                      <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                        <input type="checkbox" checked={d.activo}
                          onChange={e => updateHorario(cuentaTab, dia, 'activo', e.target.checked)}
                          style={{ width:16, height:16 }} />
                        <span style={{ fontSize:12, color:'var(--text2)' }}>{d.activo ? 'Activo' : 'Inactivo'}</span>
                      </label>
                      {d.activo && (
                        <>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:12, color:'var(--text3)' }}>Desde</span>
                            <input type="time" value={d.inicio || '09:00'}
                              onChange={e => updateHorario(cuentaTab, dia, 'inicio', e.target.value)}
                              style={{ fontSize:13, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', color:'var(--text)' }} />
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:12, color:'var(--text3)' }}>Hasta</span>
                            <input type="time" value={d.fin || '18:00'}
                              onChange={e => updateHorario(cuentaTab, dia, 'fin', e.target.value)}
                              style={{ fontSize:13, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', color:'var(--text)' }} />
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              <button onClick={() => saveHorarios(cuentaTab)} disabled={saving}
                style={{ marginTop:16, fontSize:13, fontWeight:700, padding:'10px 24px', borderRadius:'var(--radius-sm)',
                  background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar horarios'}
              </button>
            </div>
          )}

          {/* ── MENSAJES FUERA DE HORARIO ── */}
          {tab === 'mensajes' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ fontSize:13, color:'var(--text3)' }}>
                Mensaje automático que se envía cuando llega un mensaje fuera del horario de operación para <strong style={{ color: ac.color }}>{cuentaTab}</strong>.
              </div>
              {CANALES.filter(c => c !== 'reclamos').map(canal => {
                const val = mensajes[cuentaTab]?.[canal]?.mensaje || ''
                return (
                  <div key={canal} style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                    <div style={{ padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{CANAL_LABEL[canal]}</span>
                    </div>
                    <div style={{ padding:'16px' }}>
                      <textarea
                        value={val}
                        onChange={e => setMensajes(prev => ({
                          ...prev,
                          [cuentaTab]: { ...(prev[cuentaTab]||{}), [canal]: { ...(prev[cuentaTab]?.[canal]||{}), mensaje: e.target.value } }
                        }))}
                        rows={4}
                        placeholder="Mensaje que recibirá el comprador fuera de horario..."
                        style={{ width:'100%', fontSize:13, padding:'10px 12px', borderRadius:'var(--radius-sm)',
                          border:'1.5px solid var(--border)', fontFamily:'inherit', resize:'vertical',
                          outline:'none', color:'var(--text)', lineHeight:1.6 }}
                      />
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>
                        {val.length}/500 caracteres
                      </div>
                    </div>
                  </div>
                )
              })}
              <button onClick={() => saveMensajes(cuentaTab)} disabled={saving}
                style={{ alignSelf:'flex-start', fontSize:13, fontWeight:700, padding:'10px 24px', borderRadius:'var(--radius-sm)',
                  background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar mensajes'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
