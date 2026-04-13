import Topbar from '../components/Topbar'
import { useState, useEffect } from 'react'
import { useSound, getSoundPrefs, setSoundPrefs } from '../hooks/useSound'

const RAILWAY = 'https://worker-production-d575.up.railway.app'
const CUENTAS = ['GTK', 'RBN', 'GDP']
const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DIAS_LABEL = { lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue', viernes:'Vie', sabado:'Sáb', domingo:'Dom' }
const CANALES = ['pre_compra','post_venta','reclamos']
const CANAL_LABEL = { pre_compra:'Preguntas', post_venta:'Post-venta', reclamos:'Reclamos' }
const MODOS = ['revision','semi_auto','automatico']
const MODO_LABEL = { revision:'Revisión manual', semi_auto:'Semi-automático', automatico:'Automático' }
const MODO_DESC  = { revision:'La IA sugiere, humano aprueba siempre', semi_auto:'La IA envía si confianza alta, sino espera aprobación', automatico:'La IA responde sola sin intervención humana' }
const ACCT_COLOR = {
  GTK: { color:'var(--acct-gtk)', bg:'var(--acct-gtk-bg)', br:'var(--acct-gtk-br)' },
  RBN: { color:'var(--acct-rbn)', bg:'var(--acct-rbn-bg)', br:'var(--acct-rbn-br)' },
  GDP: { color:'var(--acct-gdp)', bg:'var(--acct-gdp-bg)', br:'var(--acct-gdp-br)' },
}
const CATEGORIAS = ['GENERAL','COMPATIBILIDAD','TINTA','CHIP','PRECIO','CONFIGURACION','DEVOLUCION','ENVIO']

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('khn_token')}`, 'Content-Type': 'application/json' }
}

const TEMPLATE_BLANK = { titulo:'', categoria:'GENERAL', texto:'', cuenta:'TODAS', activo:true, orden:0 }

export default function Config({ onLogout }) {
  const [tab,        setTab]        = useState('modos')
  const [cuentaTab,  setCuentaTab]  = useState('GTK')
  const [modos,      setModos]      = useState({})
  const [pendingModos, setPendingModos] = useState(null)
  const [horarios,   setHorarios]   = useState({})
  const [modoFestivo, setModoFestivo] = useState({})
  const [mensajes,   setMensajes]   = useState({})
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState('')
  const [alertas,    setAlertas]    = useState({})
  const [soundPrefs, setSoundPrefsState] = useState(getSoundPrefs)
  const { playAlert } = useSound()
  const SOUND_TIPOS = [
    { id: 'RECLAMO',      label: 'Reclamos',   color: 'var(--red)',    desc: 'Alerta cuando llega un reclamo nuevo' },
    { id: 'POST-VENTA',   label: 'Post-venta', color: 'var(--amber)',  desc: 'Alerta cuando llega un mensaje de post-venta' },
    { id: 'PRE-COMPRA',   label: 'Preguntas',  color: 'var(--purple)', desc: 'Alerta cuando llega una pregunta pre-compra' },
  ]
  const updateSoundPref = (tipo, key, value) => {
    const newPrefs = { ...soundPrefs, [tipo]: { ...soundPrefs[tipo], [key]: value } }
    setSoundPrefsState(newPrefs)
    setSoundPrefs(newPrefs)
  }

  // Templates state
  const [templates,     setTemplates]     = useState([])
  const [loadingTpl,    setLoadingTpl]    = useState(false)
  const [editingTpl,    setEditingTpl]    = useState(null)   // null | 'new' | template obj
  const [tplForm,       setTplForm]       = useState(TEMPLATE_BLANK)
  const [tplBusqueda,   setTplBusqueda]   = useState('')

  // Compatibilidades state
  const [compats,        setCompats]        = useState([])
  const [loadingCompat,  setLoadingCompat]  = useState(false)
  const [editingCompat,  setEditingCompat]  = useState(null)
  const [compatForm,     setCompatForm]     = useState({ sku:'', modelo_impresora:'', cuenta:'TODAS', notas:'' })
  const [compatBusqueda, setCompatBusqueda] = useState('')
  const [csvTexto,       setCsvTexto]       = useState('')
  const [showCsvImport,  setShowCsvImport]  = useState(false)
  const [importando,     setImportando]     = useState(false)
  const [importResult,   setImportResult]   = useState(null)

  // Mensajes proactivos state
  const [proactivos,       setProactivos]       = useState({})
  const [loadingProact,    setLoadingProact]    = useState(false)
  const [savingProact,     setSavingProact]     = useState('')

  // Contencion state
  const [contencion,        setContencion]        = useState({})
  const [loadingCont,       setLoadingCont]       = useState(false)
  const [savingCont,        setSavingCont]        = useState('')
  const [contFlash,         setContFlash]         = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`${RAILWAY}/api/config/modos`,    { headers: authHeaders() }).then(r=>r.json()),
      fetch(`${RAILWAY}/api/config/horarios`, { headers: authHeaders() }).then(r=>r.json()),
      fetch(`${RAILWAY}/api/config/mensajes`, { headers: authHeaders() }).then(r=>r.json()),
      fetch(`${RAILWAY}/api/config/alertas`,  { headers: authHeaders() }).then(r=>r.json()),
      fetch(`${RAILWAY}/api/config/modo-festivo`, { headers: authHeaders() }).then(r=>r.json()),
    ]).then(([m, h, msg, al, mf]) => { setModos(m); setHorarios(h); setMensajes(msg); setAlertas(al); setModoFestivo(mf || {}) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'templates') loadTemplates()
    if (tab === 'compatibilidades') loadCompats()
    if (tab === 'proactivos') loadProactivos()
    if (tab === 'contencion') loadContencion()
  }, [tab])

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  // ── Contencion ────────────────────────────────────────────────
  const loadContencion = async () => {
    setLoadingCont(true)
    try {
      const r = await fetch(`${RAILWAY}/api/config/contencion`, { headers: authHeaders() })
      const d = await r.json()
      setContencion(d)
    } catch { setContencion({}) }
    finally { setLoadingCont(false) }
  }

  const saveContencion = async (cuenta) => {
    setSavingCont(cuenta)
    try {
      const r = await fetch(`${RAILWAY}/api/config/contencion/${cuenta}`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(contencion[cuenta])
      })
      if (r.ok) {
        setContFlash(cuenta)
        setTimeout(() => setContFlash(p => p === cuenta ? '' : p), 2000)
      }
    } catch {}
    setSavingCont('')
  }

  const resetInstrucciones = async (cuenta) => {
    try {
      const r = await fetch(`${RAILWAY}/api/config/contencion/${cuenta}/reset-instrucciones`, {
        method: 'POST', headers: authHeaders()
      })
      const d = await r.json()
      if (d.ok) {
        setContencion(prev => ({ ...prev, [cuenta]: { ...prev[cuenta], instrucciones_ia: d.instrucciones_ia } }))
      }
    } catch {}
  }

  const updateCont = (cuenta, field, value) => {
    setContencion(prev => ({ ...prev, [cuenta]: { ...prev[cuenta], [field]: value } }))
  }

  // ── Mensajes proactivos ───────────────────────────────────────
  const loadProactivos = async () => {
    setLoadingProact(true)
    try {
      const r = await fetch(`${RAILWAY}/api/mensajes-proactivos`, { headers: authHeaders() })
      const rows = await r.json()
      const map = {}
      for (const row of rows) {
        const key = `${row.cuenta}_${row.evento}`
        map[key] = { activo: row.activo, modo: row.modo || 'proactivo', mensaje: row.mensaje || '' }
      }
      setProactivos(map)
    } catch { flash('Error cargando mensajes proactivos') }
    setLoadingProact(false)
  }

  const getProact = (cuenta, evento) => {
    return proactivos[`${cuenta}_${evento}`] || { activo: false, modo: 'proactivo', mensaje: '' }
  }

  const updateProact = (cuenta, evento, field, value) => {
    const key = `${cuenta}_${evento}`
    setProactivos(prev => ({ ...prev, [key]: { ...getProact(cuenta, evento), [field]: value } }))
  }

  const saveProactivo = async (cuenta, evento) => {
    const key = `${cuenta}_${evento}`
    setSavingProact(key)
    const cfg = getProact(cuenta, evento)
    try {
      const r = await fetch(`${RAILWAY}/api/mensajes-proactivos`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ cuenta, evento, modo: cfg.modo, activo: cfg.activo, mensaje: cfg.mensaje })
      })
      if (r.ok) flash(`Guardado ${cuenta} → ${evento}`)
      else flash('Error al guardar')
    } catch { flash('Error de conexión') }
    setSavingProact('')
  }

  // ── Templates ─────────────────────────────────────────────────
  const loadTemplates = async () => {
    setLoadingTpl(true)
    try {
      const r = await fetch(`${RAILWAY}/api/templates`, { headers: authHeaders() })
      const d = await r.json()
      setTemplates(d.templates || [])
    } catch { flash('Error cargando templates') }
    setLoadingTpl(false)
  }

  const saveTemplate = async () => {
    if (!tplForm.titulo.trim() || !tplForm.texto.trim()) { flash('Titulo y texto son requeridos'); return }
    setSaving(true)
    try {
      const isNew = editingTpl === 'new'
      const url   = isNew ? `${RAILWAY}/api/templates` : `${RAILWAY}/api/templates/${editingTpl.id}`
      const r = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: authHeaders(), body: JSON.stringify(tplForm) })
      if (r.ok) {
        flash(isNew ? '✅ Template creado' : '✅ Template guardado')
        setEditingTpl(null)
        setTplForm(TEMPLATE_BLANK)
        loadTemplates()
      } else { flash('Error al guardar') }
    } catch { flash('Error de conexion') }
    setSaving(false)
  }

  const deleteTemplate = async (id) => {
    if (!confirm('¿Eliminar este template?')) return
    try {
      await fetch(`${RAILWAY}/api/templates/${id}`, { method: 'DELETE', headers: authHeaders() })
      flash('Template eliminado')
      loadTemplates()
    } catch { flash('Error al eliminar') }
  }

  const startEdit = (tpl) => { setEditingTpl(tpl); setTplForm({ titulo:tpl.titulo, categoria:tpl.categoria, texto:tpl.texto, cuenta:tpl.cuenta, activo:tpl.activo, orden:tpl.orden }) }
  const startNew  = ()    => { setEditingTpl('new'); setTplForm(TEMPLATE_BLANK) }
  const cancelEdit = ()   => { setEditingTpl(null); setTplForm(TEMPLATE_BLANK) }

  // ── Compatibilidades ──────────────────────────────────────
  const loadCompats = async () => {
    setLoadingCompat(true)
    try {
      const r = await fetch(`${RAILWAY}/api/compatibilidades?limit=500`, { headers: authHeaders() })
      const d = await r.json()
      setCompats(d.items || [])
    } catch { flash('Error cargando compatibilidades') }
    setLoadingCompat(false)
  }

  const saveCompat = async () => {
    if (!compatForm.sku.trim() || !compatForm.modelo_impresora.trim()) {
      flash('SKU y modelo son requeridos'); return
    }
    setSaving(true)
    try {
      const isNew = editingCompat === 'new'
      const url   = isNew ? `${RAILWAY}/api/compatibilidades` : `${RAILWAY}/api/compatibilidades/${editingCompat.id}`
      const r = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: authHeaders(), body: JSON.stringify(compatForm) })
      if (r.ok) {
        flash(isNew ? 'Registro creado' : 'Registro guardado')
        setEditingCompat(null)
        setCompatForm({ sku:'', modelo_impresora:'', cuenta:'TODAS', notas:'' })
        loadCompats()
      } else { flash('Error al guardar') }
    } catch { flash('Error de conexion') }
    setSaving(false)
  }

  const deleteCompat = async (id) => {
    if (!confirm('Eliminar este registro?')) return
    try {
      await fetch(`${RAILWAY}/api/compatibilidades/${id}`, { method: 'DELETE', headers: authHeaders() })
      flash('Registro eliminado')
      loadCompats()
    } catch { flash('Error al eliminar') }
  }

  const importarCsv = async () => {
    if (!csvTexto.trim()) { flash('Pega el contenido CSV primero'); return }
    setImportando(true); setImportResult(null)
    try {
      const r = await fetch(`${RAILWAY}/api/compatibilidades/importar`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ csv_texto: csvTexto })
      })
      const d = await r.json()
      if (d.ok) {
        setImportResult(d)
        flash(`Importado: ${d.insertados} nuevos, ${d.omitidos} omitidos`)
        setCsvTexto('')
        setShowCsvImport(false)
        loadCompats()
      } else { flash('Error: ' + d.error) }
    } catch { flash('Error de conexion') }
    setImportando(false)
  }


  // ── Alertas ───────────────────────────────────────────────────
  const saveAlertas = async (cuenta) => {
    setSaving(true)
    try {
      const r = await fetch(`${RAILWAY}/api/config/alertas/${cuenta}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify(alertas[cuenta] || { inicio: '08:00', fin: '21:00', activo: true })
      })
      if (r.ok) { flash('Horario de alertas guardado') } else { flash('Error al guardar') }
    } catch { flash('Error de conexion') }
    setSaving(false)
  }

  const updateAlerta = (cuenta, campo, valor) => {
    setAlertas(prev => ({
      ...prev,
      [cuenta]: { ...(prev[cuenta] || { inicio: '08:00', fin: '21:00', activo: true }), [campo]: valor }
    }))
  }

  // ── Modos ─────────────────────────────────────────────────────
  const editModo = (cuenta, canal, campo, valor) => {
    setPendingModos(prev => {
      const base = prev || JSON.parse(JSON.stringify(modos))
      return { ...base, [cuenta]: { ...(base[cuenta]||{}), [canal]: { ...(base[cuenta]?.[canal]||{}), [campo]: valor } } }
    })
  }
  const hasPendingModos = (() => {
    if (!pendingModos) return false
    return JSON.stringify(pendingModos) !== JSON.stringify(modos)
  })()
  const savePendingModos = async () => {
    if (!pendingModos) return
    setSaving(true)
    try {
      const promises = []
      for (const cuenta of CUENTAS) {
        for (const canal of CANALES) {
          const prev = modos[cuenta]?.[canal] || {}
          const next = pendingModos[cuenta]?.[canal] || {}
          if (JSON.stringify(prev) !== JSON.stringify(next)) {
            promises.push(
              fetch(`${RAILWAY}/api/config/modos/${cuenta}/${canal}`, { method:'PUT', headers: authHeaders(), body: JSON.stringify(next) })
            )
          }
        }
      }
      const results = await Promise.all(promises)
      if (results.every(r => r.ok)) {
        setModos(JSON.parse(JSON.stringify(pendingModos)))
        setPendingModos(null)
        flash('Guardado')
      } else { flash('Error al guardar') }
    } catch { flash('Error de conexion') }
    setSaving(false)
  }
  const cancelPendingModos = () => setPendingModos(null)

  // ── Horarios ──────────────────────────────────────────────────
  const saveHorarios = async (cuenta) => {
    setSaving(true)
    try {
      const r = await fetch(`${RAILWAY}/api/config/horarios/${cuenta}`, { method:'PUT', headers: authHeaders(), body: JSON.stringify(horarios[cuenta] || []) })
      if (r.ok) { flash('Horarios guardados') } else { flash('Error al guardar') }
    } catch { flash('Error de conexion') }
    setSaving(false)
  }

  const toggleFestivo = async (cuenta) => {
    const nuevoVal = !modoFestivo[cuenta]
    setModoFestivo(prev => ({ ...prev, [cuenta]: nuevoVal }))
    try {
      const r = await fetch(`${RAILWAY}/api/config/modo-festivo/${cuenta}`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ activo: nuevoVal })
      })
      if (r.ok) flash(nuevoVal ? 'Modo festivo activado' : 'Modo festivo desactivado')
      else { setModoFestivo(prev => ({ ...prev, [cuenta]: !nuevoVal })); flash('Error al guardar') }
    } catch { setModoFestivo(prev => ({ ...prev, [cuenta]: !nuevoVal })); flash('Error de conexion') }
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

  // ── Mensajes ──────────────────────────────────────────────────
  const saveMensajes = async (cuenta) => {
    setSaving(true)
    try {
      const r = await fetch(`${RAILWAY}/api/config/mensajes/${cuenta}`, { method:'PUT', headers: authHeaders(), body: JSON.stringify(mensajes[cuenta] || {}) })
      if (r.ok) { flash('Mensajes guardados') } else { flash('Error al guardar') }
    } catch { flash('Error de conexion') }
    setSaving(false)
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
      <Topbar onLogout={onLogout} />

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ── Sidebar izquierdo */}
        <div style={{ width:200, background:'var(--surface)', borderRight:'1.5px solid var(--border)', padding:'16px 12px', display:'flex', flexDirection:'column', gap:4 }}>
          {[
            { id:'modos',            label:'Modos IA',        desc:'Como responde la IA'   },
            { id:'horarios',         label:'Horarios',         desc:'Cuando opera la IA'    },
            { id:'mensajes',         label:'Mensajes',         desc:'Fuera de horario'       },
            { id:'templates',        label:'Templates',        desc:'Respuestas rapidas'     },
            { id:'compatibilidades', label:'Compatibilidades', desc:'SKU y modelos compat.'  },
            { id:'alertas',          label:'Alertas',          desc:'Horario notif. Telegram' },
            { id:'sonidos',          label:'Sonidos',          desc:'Alertas sonoras panel'  },
            { id:'proactivos',       label:'Msg Proactivos',   desc:'Enviado / Entregado'    },
            { id:'contencion',       label:'Contencion',       desc:'Deteccion de frustracion' },
          ].map(s => (
            <button key={s.id} onClick={() => setTab(s.id)}
              style={{ textAlign:'left', padding:'10px 12px', borderRadius:'var(--radius-sm)', border: tab === s.id ? '1.5px solid var(--purple-border)' : '1.5px solid transparent', background: tab === s.id ? 'var(--purple-light)' : 'transparent', cursor:'pointer', transition:'all .15s' }}>
              <div style={{ fontSize:13, fontWeight:700, color: tab === s.id ? 'var(--purple)' : 'var(--text)' }}>{s.label}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{s.desc}</div>
            </button>
          ))}
        </div>

        {/* ── Contenido principal */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px' }}>

          {/* Tabs de cuenta — no aplica a templates ni compatibilidades */}
          {tab !== 'templates' && tab !== 'compatibilidades' && tab !== 'alertas' && tab !== 'proactivos' && (
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              {CUENTAS.map(c => {
                const a = ACCT_COLOR[c]; const active = cuentaTab === c
                return (
                  <button key={c} onClick={() => setCuentaTab(c)}
                    style={{ fontSize:13, fontWeight:700, padding:'8px 20px', borderRadius:'var(--radius-sm)', border: `1.5px solid ${active ? a.br : 'var(--border)'}`, background: active ? a.bg : 'transparent', color: active ? a.color : 'var(--text3)', cursor:'pointer', transition:'all .15s' }}>
                    {c}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── MODOS IA */}
          {tab === 'modos' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <div style={{ fontSize:13, color:'var(--text3)', flex:1 }}>
                  Configura cómo responde la IA en cada canal para la cuenta <strong style={{ color: ac.color }}>{cuentaTab}</strong>
                </div>
                {hasPendingModos && (
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--amber)', display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ width:6, height:6, borderRadius:99, background:'var(--amber)', display:'inline-block' }} />
                    Cambios sin guardar
                  </span>
                )}
              </div>
              {CANALES.map(canal => {
                const src     = pendingModos || modos
                const actual  = src[cuentaTab]?.[canal]?.modo || 'revision'
                const umbral  = src[cuentaTab]?.[canal]?.umbral ?? 85
                return (
                  <div key={canal} style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                    <div style={{ padding:'12px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{CANAL_LABEL[canal]}</span>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                        background: actual==='automatico'?'var(--green-light)':actual==='semi_auto'?'var(--amber-light)':'var(--purple-light)',
                        color: actual==='automatico'?'var(--green)':actual==='semi_auto'?'var(--amber)':'var(--purple)',
                        border: `1px solid ${actual==='automatico'?'var(--green-border)':actual==='semi_auto'?'var(--amber-border)':'var(--purple-border)'}` }}>
                        {MODO_LABEL[actual]}
                      </span>
                    </div>
                    <div style={{ padding:'16px' }}>
                      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                        {MODOS.map(m => (
                          <button key={m} onClick={() => editModo(cuentaTab, canal, 'modo', m)}
                            style={{ flex:1, padding:'10px 8px', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'all .15s',
                              border: actual===m ? `2px solid ${m==='automatico'?'var(--green)':m==='semi_auto'?'var(--amber)':'var(--purple)'}` : '1.5px solid var(--border)',
                              background: actual===m ? (m==='automatico'?'var(--green-light)':m==='semi_auto'?'var(--amber-light)':'var(--purple-light)') : 'transparent',
                              color: actual===m ? (m==='automatico'?'var(--green)':m==='semi_auto'?'var(--amber)':'var(--purple)') : 'var(--text3)' }}>
                            <div style={{ fontSize:12, fontWeight:700 }}>{MODO_LABEL[m]}</div>
                            <div style={{ fontSize:10, marginTop:3, lineHeight:1.4 }}>{MODO_DESC[m]}</div>
                          </button>
                        ))}
                      </div>
                      {actual !== 'revision' && (
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <span style={{ fontSize:12, color:'var(--text2)', whiteSpace:'nowrap' }}>Umbral de confianza:</span>
                          <input type="range" min={50} max={100} value={umbral}
                            onChange={e => editModo(cuentaTab, canal, 'umbral', +e.target.value)}
                            style={{ flex:1 }} />
                          <span style={{ fontSize:13, fontWeight:700, color:'var(--purple)', minWidth:36 }}>{umbral}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {hasPendingModos && (
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', paddingTop:4 }}>
                  <button onClick={cancelPendingModos}
                    style={{ fontSize:13, fontWeight:600, padding:'8px 18px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text2)', cursor:'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={savePendingModos} disabled={saving}
                    style={{ fontSize:13, fontWeight:700, padding:'8px 18px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--green-border)', background:'var(--green)', color:'#fff', cursor:'pointer', opacity: saving ? .6 : 1 }}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── HORARIOS */}
          {tab === 'horarios' && (
            <div>
              <div style={{ fontSize:13, color:'var(--text3)', marginBottom:16 }}>
                Define los días y horarios de operación para <strong style={{ color: ac.color }}>{cuentaTab}</strong>.
              </div>
              <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>Horarios de operación — {cuentaTab}</span>
                </div>
                {DIAS.map((dia, i) => {
                  const diasCuenta = horarios[cuentaTab] || []
                  const d = diasCuenta.find(x => x.dia === dia) || { dia, activo:true, inicio:'09:00', fin:'18:00' }
                  return (
                    <div key={dia} style={{ padding:'12px 16px', borderBottom: i < DIAS.length-1 ? '1px solid var(--border)' : 'none', display:'flex', alignItems:'center', gap:16, background: d.activo ? 'transparent' : 'var(--surface2)' }}>
                      <div style={{ width:40, fontSize:13, fontWeight:700, color: d.activo ? 'var(--text)' : 'var(--text3)' }}>{DIAS_LABEL[dia]}</div>
                      <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                        <input type="checkbox" checked={d.activo} onChange={e => updateHorario(cuentaTab, dia, 'activo', e.target.checked)} style={{ width:16, height:16 }} />
                        <span style={{ fontSize:12, color:'var(--text2)' }}>{d.activo ? 'Activo' : 'Inactivo'}</span>
                      </label>
                      {d.activo && (
                        <>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:12, color:'var(--text3)' }}>Desde</span>
                            <input type="time" value={d.inicio || '09:00'} onChange={e => updateHorario(cuentaTab, dia, 'inicio', e.target.value)}
                              style={{ fontSize:13, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', color:'var(--text)' }} />
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:12, color:'var(--text3)' }}>Hasta</span>
                            <input type="time" value={d.fin || '18:00'} onChange={e => updateHorario(cuentaTab, dia, 'fin', e.target.value)}
                              style={{ fontSize:13, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', color:'var(--text)' }} />
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Modo festivo */}
              <div style={{ marginTop:16, padding:'14px 16px', background: modoFestivo[cuentaTab] ? '#fef3c7' : 'var(--surface)',
                border: `1.5px solid ${modoFestivo[cuentaTab] ? '#f59e0b' : 'var(--border)'}`,
                borderRadius:'var(--radius)', display:'flex', alignItems:'center', gap:12 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', flex:1 }}>
                  <input type="checkbox" checked={!!modoFestivo[cuentaTab]}
                    onChange={() => toggleFestivo(cuentaTab)}
                    style={{ width:18, height:18 }} />
                  <span style={{ fontSize:14 }}>Modo festivo</span>
                  <span style={{ fontSize:12, color:'var(--text3)' }}>
                    Forzar fuera de horario (el worker siempre responde como fuera de horario)
                  </span>
                </label>
                {modoFestivo[cuentaTab] && (
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99,
                    background:'#f59e0b', color:'#fff' }}>ACTIVO</span>
                )}
              </div>
              <button onClick={() => saveHorarios(cuentaTab)} disabled={saving}
                style={{ marginTop:16, fontSize:13, fontWeight:700, padding:'10px 24px', borderRadius:'var(--radius-sm)', background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar horarios'}
              </button>
            </div>
          )}

          {/* ── MENSAJES FUERA DE HORARIO */}
          {tab === 'mensajes' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ fontSize:13, color:'var(--text3)' }}>
                Mensaje automático fuera de horario para <strong style={{ color: ac.color }}>{cuentaTab}</strong>.
              </div>
              {CANALES.filter(c => c !== 'reclamos').map(canal => {
                const val = mensajes[cuentaTab]?.[canal]?.mensaje || ''
                return (
                  <div key={canal} style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                    <div style={{ padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{CANAL_LABEL[canal]}</span>
                    </div>
                    <div style={{ padding:'16px' }}>
                      <textarea value={val}
                        onChange={e => setMensajes(prev => ({ ...prev, [cuentaTab]: { ...(prev[cuentaTab]||{}), [canal]: { ...(prev[cuentaTab]?.[canal]||{}), mensaje: e.target.value } } }))}
                        rows={4} placeholder="Mensaje para el comprador fuera de horario..."
                        style={{ width:'100%', fontSize:13, padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', fontFamily:'inherit', resize:'vertical', outline:'none', color:'var(--text)', lineHeight:1.6 }} />
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>{val.length}/500 caracteres</div>
                    </div>
                  </div>
                )
              })}
              {/* Plantilla envio de paquete */}
              <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                <div style={{ padding:'10px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>Mensaje de envio de paquete</span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'var(--green-light)', color:'var(--green)', border:'1px solid var(--green-border)', fontWeight:600 }}>Automatico</span>
                </div>
                <div style={{ padding:'16px' }}>
                  <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10, lineHeight:1.6 }}>
                    Se envia automaticamente cuando el paquete sale del almacen. Variables disponibles:
                    <span style={{ fontFamily:'monospace', fontSize:11, background:'var(--surface2)', padding:'1px 6px', borderRadius:4, margin:'0 4px' }}>{'{nombre}'}</span>
                    <span style={{ fontFamily:'monospace', fontSize:11, background:'var(--surface2)', padding:'1px 6px', borderRadius:4, margin:'0 4px' }}>{'{producto}'}</span>
                    <span style={{ fontFamily:'monospace', fontSize:11, background:'var(--surface2)', padding:'1px 6px', borderRadius:4, margin:'0 4px' }}>{'{tracking}'}</span>
                  </div>
                  <textarea
                    value={mensajes[cuentaTab]?.envio_paquete?.mensaje || ''}
                    onChange={e => setMensajes(prev => ({
                      ...prev,
                      [cuentaTab]: {
                        ...(prev[cuentaTab] || {}),
                        envio_paquete: { ...(prev[cuentaTab]?.envio_paquete || {}), mensaje: e.target.value }
                      }
                    }))}
                    rows={5}
                    placeholder={`Ej: Hola {nombre}, tu pedido ({producto}) ya fue enviado. Puedes rastrearlo con: {tracking}`}
                    style={{ width:'100%', fontSize:13, padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', fontFamily:'inherit', resize:'vertical', outline:'none', color:'var(--text)', lineHeight:1.6, boxSizing:'border-box' }}
                  />
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>
                    {(mensajes[cuentaTab]?.envio_paquete?.mensaje || '').length}/500 caracteres
                  </div>
                </div>
              </div>

              <button onClick={() => saveMensajes(cuentaTab)} disabled={saving}
                style={{ alignSelf:'flex-start', fontSize:13, fontWeight:700, padding:'10px 24px', borderRadius:'var(--radius-sm)', background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar mensajes'}
              </button>
            </div>
          )}

          {/* ── TEMPLATES */}
          {tab === 'templates' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Header con botón nuevo */}
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>📋 Biblioteca de Templates</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Respuestas rápidas disponibles para los operadores en el panel de preguntas</div>
                </div>
                <button onClick={startNew} style={{ marginLeft:'auto', fontSize:13, fontWeight:700, padding:'9px 18px', borderRadius:'var(--radius-sm)', background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer' }}>
                  + Nuevo template
                </button>
              </div>

              {/* Formulario de edición */}
              {editingTpl && (
                <div style={{ background:'var(--surface)', border:'1.5px solid var(--purple-border)', borderRadius:'var(--radius)', overflow:'hidden', boxShadow:'var(--shadow-md)' }}>
                  <div style={{ padding:'12px 16px', background:'var(--purple-light)', borderBottom:'1px solid var(--purple-border)', display:'flex', alignItems:'center' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--purple)', flex:1 }}>
                      {editingTpl === 'new' ? '➕ Nuevo template' : `âœï¸ Editando: ${editingTpl.titulo}`}
                    </span>
                    <button onClick={cancelEdit} style={{ fontSize:14, background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}>✕</button>
                  </div>
                  <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <div>
                        <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:4 }}>TÃTULO *</label>
                        <input value={tplForm.titulo} onChange={e => setTplForm(p => ({...p, titulo: e.target.value}))}
                          placeholder="Ej: Compatibilidad con HP 8015"
                          style={{ width:'100%', fontSize:13, padding:'8px 10px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', outline:'none', color:'var(--text)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:4 }}>CATEGORÃA</label>
                        <select value={tplForm.categoria} onChange={e => setTplForm(p => ({...p, categoria: e.target.value}))}
                          style={{ width:'100%', fontSize:13, padding:'8px 10px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', color:'var(--text)', outline:'none' }}>
                          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:4 }}>CUENTA</label>
                        <select value={tplForm.cuenta} onChange={e => setTplForm(p => ({...p, cuenta: e.target.value}))}
                          style={{ width:'100%', fontSize:13, padding:'8px 10px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', color:'var(--text)', outline:'none' }}>
                          <option value="TODAS">Todas las cuentas</option>
                          {CUENTAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:4 }}>ORDEN</label>
                        <input type="number" min={0} value={tplForm.orden} onChange={e => setTplForm(p => ({...p, orden: +e.target.value}))}
                          style={{ width:'100%', fontSize:13, padding:'8px 10px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', outline:'none', color:'var(--text)' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:4 }}>TEXTO DE RESPUESTA *</label>
                      <textarea value={tplForm.texto} onChange={e => setTplForm(p => ({...p, texto: e.target.value}))}
                        rows={5} placeholder="Escribe el texto de la respuesta..."
                        style={{ width:'100%', fontSize:13, padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', fontFamily:'inherit', resize:'vertical', outline:'none', color:'var(--text)', lineHeight:1.6 }} />
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{tplForm.texto.length} caracteres</div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={saveTemplate} disabled={saving}
                        style={{ fontSize:13, fontWeight:700, padding:'9px 20px', borderRadius:'var(--radius-sm)', background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'Guardando...' : '💾 Guardar'}
                      </button>
                      <button onClick={cancelEdit}
                        style={{ fontSize:13, fontWeight:600, padding:'9px 16px', borderRadius:'var(--radius-sm)', background:'transparent', color:'var(--text2)', border:'1.5px solid var(--border)', cursor:'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Buscador */}
              <input value={tplBusqueda} onChange={e => setTplBusqueda(e.target.value)}
                placeholder="Buscar por título, texto o categoría..."
                style={{ fontSize:13, padding:'8px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', outline:'none', color:'var(--text)' }} />

              {/* Lista de templates */}
              {loadingTpl ? (
                <div style={{ textAlign:'center', padding:32, color:'var(--text3)' }}>Cargando templates...</div>
              ) : (() => {
                const q = tplBusqueda.toLowerCase()
                const filtrados = templates.filter(t => !q || t.titulo.toLowerCase().includes(q) || t.texto.toLowerCase().includes(q) || t.categoria.toLowerCase().includes(q))
                if (filtrados.length === 0) return (
                  <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>
                    <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--text2)' }}>
                      {templates.length === 0 ? 'No hay templates todavía' : 'Sin resultados'}
                    </div>
                    {templates.length === 0 && (
                      <div style={{ fontSize:12, marginTop:6 }}>Crea tu primer template con el botón "+ Nuevo template"</div>
                    )}
                  </div>
                )
                // Agrupar por categoría
                const porCategoria = filtrados.reduce((acc, t) => {
                  const cat = t.categoria || 'GENERAL'
                  if (!acc[cat]) acc[cat] = []
                  acc[cat].push(t)
                  return acc
                }, {})
                return Object.entries(porCategoria).map(([cat, items]) => (
                  <div key={cat}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8, paddingBottom:4, borderBottom:'1px solid var(--border)' }}>
                      {cat} ({items.length})
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {items.map(t => (
                        <div key={t.id} style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', padding:'12px 16px', display:'flex', gap:12, alignItems:'flex-start' }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                              <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{t.titulo}</span>
                              {t.cuenta !== 'TODAS' && (
                                <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99, background: ACCT_COLOR[t.cuenta]?.bg || 'var(--surface2)', color: ACCT_COLOR[t.cuenta]?.color || 'var(--text3)', border: `1px solid ${ACCT_COLOR[t.cuenta]?.br || 'var(--border)'}` }}>
                                  {t.cuenta}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                              {t.texto}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                            <button onClick={() => startEdit(t)}
                              style={{ fontSize:11, fontWeight:600, padding:'5px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--purple-border)', background:'var(--purple-light)', color:'var(--purple)', cursor:'pointer' }}>
                              Editar
                            </button>
                            <button onClick={() => deleteTemplate(t.id)}
                              style={{ fontSize:11, fontWeight:600, padding:'5px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--red-border)', background:'var(--red-light)', color:'var(--red)', cursor:'pointer' }}>
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}

          {/* ── COMPATIBILIDADES */}
          {tab === 'compatibilidades' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Tabla de compatibilidades</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Relaciona SKUs con modelos de impresora. La IA usa estos datos para responder con precision.</div>
                </div>
                <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                  <button onClick={() => { setShowCsvImport(p => !p); setImportResult(null) }}
                    style={{ fontSize:12, fontWeight:700, padding:'8px 16px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--amber-border)', background: showCsvImport ? 'var(--amber)' : 'var(--amber-light)', color: showCsvImport ? '#fff' : 'var(--amber)', cursor:'pointer' }}>
                    Importar CSV
                  </button>
                  <button onClick={() => { setEditingCompat('new'); setCompatForm({ sku:'', modelo_impresora:'', cuenta:'TODAS', notas:'' }) }}
                    style={{ fontSize:12, fontWeight:700, padding:'8px 16px', borderRadius:'var(--radius-sm)', background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer' }}>
                    + Nuevo registro
                  </button>
                </div>
              </div>

              {/* Importar CSV */}
              {showCsvImport && (
                <div style={{ background:'var(--surface)', border:'1.5px solid var(--amber-border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                  <div style={{ padding:'10px 16px', background:'var(--amber-light)', borderBottom:'1px solid var(--amber-border)' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--amber)' }}>Importar desde CSV</span>
                  </div>
                  <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>
                      Formato requerido: <code style={{ fontSize:11, background:'var(--surface2)', padding:'1px 6px', borderRadius:4 }}>sku,modelo_impresora,cuenta,notas</code>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>
                      Ejemplo:<br/>
                      <code style={{ fontSize:10 }}>CRT-H954_0T,HP OfficeJet Pro 8710,GDP,</code><br/>
                      <code style={{ fontSize:10 }}>CRT-H954_0T,HP OfficeJet Pro 8720,GDP,</code>
                    </div>
                    <textarea value={csvTexto} onChange={e => setCsvTexto(e.target.value)}
                      rows={8} placeholder="Pega aqui el contenido CSV..."
                      style={{ width:'100%', fontSize:12, padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', fontFamily:'monospace', resize:'vertical', outline:'none', color:'var(--text)', lineHeight:1.5 }} />
                    {importResult && (
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--green)' }}>
                        Insertados: {importResult.insertados} | Omitidos: {importResult.omitidos} | Errores: {importResult.errores}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={importarCsv} disabled={importando || !csvTexto.trim()}
                        style={{ fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:'var(--radius-sm)', background:'var(--amber)', color:'#fff', border:'none', cursor:'pointer', opacity: importando ? .6 : 1 }}>
                        {importando ? 'Importando...' : 'Importar'}
                      </button>
                      <button onClick={() => { setShowCsvImport(false); setCsvTexto('') }}
                        style={{ fontSize:12, fontWeight:600, padding:'8px 14px', borderRadius:'var(--radius-sm)', background:'transparent', color:'var(--text2)', border:'1.5px solid var(--border)', cursor:'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario alta/edicion individual */}
              {editingCompat && (
                <div style={{ background:'var(--surface)', border:'1.5px solid var(--purple-border)', borderRadius:'var(--radius)', overflow:'hidden', boxShadow:'var(--shadow-md)' }}>
                  <div style={{ padding:'10px 16px', background:'var(--purple-light)', borderBottom:'1px solid var(--purple-border)', display:'flex', alignItems:'center' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--purple)', flex:1 }}>
                      {editingCompat === 'new' ? 'Nuevo registro' : 'Editar registro'}
                    </span>
                    <button onClick={() => setEditingCompat(null)} style={{ fontSize:14, background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}>x</button>
                  </div>
                  <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                      <div>
                        <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:4 }}>SKU *</label>
                        <input value={compatForm.sku} onChange={e => setCompatForm(p => ({...p, sku: e.target.value.toUpperCase()}))}
                          placeholder="CRT-H954_0T"
                          style={{ width:'100%', fontSize:13, padding:'8px 10px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', outline:'none', color:'var(--text)', fontFamily:'monospace' }} />
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:4 }}>CUENTA</label>
                        <select value={compatForm.cuenta} onChange={e => setCompatForm(p => ({...p, cuenta: e.target.value}))}
                          style={{ width:'100%', fontSize:13, padding:'8px 10px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', color:'var(--text)', outline:'none' }}>
                          <option value="TODAS">Todas las cuentas</option>
                          {CUENTAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:4 }}>NOTAS</label>
                        <input value={compatForm.notas} onChange={e => setCompatForm(p => ({...p, notas: e.target.value}))}
                          placeholder="Opcional"
                          style={{ width:'100%', fontSize:13, padding:'8px 10px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', outline:'none', color:'var(--text)' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', display:'block', marginBottom:4 }}>MODELO DE IMPRESORA *</label>
                      <input value={compatForm.modelo_impresora} onChange={e => setCompatForm(p => ({...p, modelo_impresora: e.target.value}))}
                        placeholder="HP OfficeJet Pro 8710"
                        style={{ width:'100%', fontSize:13, padding:'8px 10px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', outline:'none', color:'var(--text)' }} />
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={saveCompat} disabled={saving}
                        style={{ fontSize:13, fontWeight:700, padding:'9px 20px', borderRadius:'var(--radius-sm)', background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer', opacity: saving ? .6 : 1 }}>
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button onClick={() => setEditingCompat(null)}
                        style={{ fontSize:13, fontWeight:600, padding:'9px 16px', borderRadius:'var(--radius-sm)', background:'transparent', color:'var(--text2)', border:'1.5px solid var(--border)', cursor:'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Buscador */}
              <input value={compatBusqueda} onChange={e => setCompatBusqueda(e.target.value)}
                placeholder="Buscar por SKU, modelo o notas..."
                style={{ fontSize:13, padding:'8px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', outline:'none', color:'var(--text)' }} />

              {/* Lista */}
              {loadingCompat ? (
                <div style={{ textAlign:'center', padding:32, color:'var(--text3)' }}>Cargando...</div>
              ) : (() => {
                const q = compatBusqueda.toLowerCase()
                const filtrados = compats.filter(c =>
                  !q || c.sku.toLowerCase().includes(q) ||
                  c.modelo_impresora.toLowerCase().includes(q) ||
                  (c.notas || '').toLowerCase().includes(q)
                )
                if (filtrados.length === 0) return (
                  <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>
                    <div style={{ fontSize:32, marginBottom:10 }}>-</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--text2)' }}>
                      {compats.length === 0 ? 'Sin registros aun' : 'Sin resultados'}
                    </div>
                  </div>
                )
                // Agrupar por SKU
                const porSku = filtrados.reduce((acc, c) => {
                  if (!acc[c.sku]) acc[c.sku] = []
                  acc[c.sku].push(c)
                  return acc
                }, {})
                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>{filtrados.length} registros</div>
                    {Object.entries(porSku).map(([sku, items]) => (
                      <div key={sku} style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                        <div style={{ padding:'8px 14px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                          <code style={{ fontSize:12, fontWeight:700, color:'var(--blue)' }}>{sku}</code>
                          <span style={{ fontSize:11, color:'var(--text3)' }}>{items.length} modelo{items.length > 1 ? 's' : ''}</span>
                          <button onClick={() => { setEditingCompat('new'); setCompatForm({ sku, modelo_impresora:'', cuenta:'TODAS', notas:'' }) }}
                            style={{ marginLeft:'auto', fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--purple-border)', background:'var(--purple-light)', color:'var(--purple)', cursor:'pointer' }}>
                            + Modelo
                          </button>
                        </div>
                        {items.map(c => (
                          <div key={c.id} style={{ padding:'8px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ flex:1 }}>
                              <span style={{ fontSize:13, color:'var(--text)' }}>{c.modelo_impresora}</span>
                              {c.notas && <span style={{ fontSize:11, color:'var(--text3)', marginLeft:8 }}>({c.notas})</span>}
                            </div>
                            {c.cuenta !== 'TODAS' && (
                              <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99, background: ACCT_COLOR[c.cuenta]?.bg || 'var(--surface2)', color: ACCT_COLOR[c.cuenta]?.color || 'var(--text3)', border:`1px solid ${ACCT_COLOR[c.cuenta]?.br || 'var(--border)'}` }}>
                                {c.cuenta}
                              </span>
                            )}
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={() => { setEditingCompat(c); setCompatForm({ sku:c.sku, modelo_impresora:c.modelo_impresora, cuenta:c.cuenta, notas:c.notas||'' }) }}
                                style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--purple-border)', background:'var(--purple-light)', color:'var(--purple)', cursor:'pointer' }}>
                                Editar
                              </button>
                              <button onClick={() => deleteCompat(c.id)}
                                style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--red-border)', background:'var(--red-light)', color:'var(--red)', cursor:'pointer' }}>
                                Quitar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── ALERTAS TELEGRAM */}
          {tab === 'sonidos' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ fontSize:13, color:'var(--text3)', marginBottom:4 }}>
                Configura las alertas sonoras del panel. Los sonidos se reproducen cuando llega un mensaje nuevo.
              </div>
              {SOUND_TIPOS.map(({ id, label, color, desc }) => (
                <div key={id} style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'14px 16px',
                  border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color }}>{label}</div>
                      <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{desc}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <button onClick={() => playAlert(id)} style={{
                        fontSize:12, padding:'5px 12px', borderRadius:'var(--radius-sm)', cursor:'pointer',
                        border:`1.5px solid ${color}`, background:'transparent', color, fontWeight:600,
                      }}>Probar</button>
                      <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                        <input type="checkbox"
                          checked={soundPrefs[id]?.enabled ?? true}
                          onChange={e => updateSoundPref(id, 'enabled', e.target.checked)}
                          style={{ width:16, height:16, cursor:'pointer', accentColor: color }}
                        />
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--text2)' }}>
                          {soundPrefs[id]?.enabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:12, color:'var(--text3)', minWidth:60 }}>Volumen</span>
                    <input type="range" min="0" max="1" step="0.05"
                      value={soundPrefs[id]?.volume ?? 0.7}
                      onChange={e => updateSoundPref(id, 'volume', parseFloat(e.target.value))}
                      disabled={!soundPrefs[id]?.enabled}
                      style={{ flex:1, accentColor: color, opacity: soundPrefs[id]?.enabled ? 1 : 0.4 }}
                    />
                    <span style={{ fontSize:12, color:'var(--text3)', minWidth:32, textAlign:'right' }}>
                      {Math.round((soundPrefs[id]?.volume ?? 0.7) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'alertas' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:540 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Horario de alertas Telegram</div>
                <div style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>
                  Las alertas de reclamos fuera de este horario se silenciaran automaticamente.
                </div>
              </div>

              {['GTK','RBN','GDP'].map(cuenta => {
                const al = alertas[cuenta] || { inicio:'08:00', fin:'21:00', activo:true }
                const ac = ACCT_COLOR[cuenta]
                return (
                  <div key={cuenta} style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                    <div style={{ padding:'12px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:13, fontWeight:700, color: ac.color }}>{cuenta}</span>
                      <label style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto', cursor:'pointer' }}>
                        <input type="checkbox" checked={al.activo !== false}
                          onChange={e => updateAlerta(cuenta, 'activo', e.target.checked)}
                          style={{ width:16, height:16 }} />
                        <span style={{ fontSize:12, color:'var(--text2)' }}>
                          {al.activo !== false ? 'Alertas activas' : 'Alertas desactivadas'}
                        </span>
                      </label>
                    </div>
                    <div style={{ padding:'16px', display:'flex', alignItems:'center', gap:20, opacity: al.activo !== false ? 1 : 0.4, pointerEvents: al.activo !== false ? 'auto' : 'none' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, color:'var(--text3)', whiteSpace:'nowrap' }}>Desde</span>
                        <input type="time" value={al.inicio || '08:00'}
                          onChange={e => updateAlerta(cuenta, 'inicio', e.target.value)}
                          style={{ fontSize:13, padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)', color:'var(--text)', background:'var(--bg)' }} />
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, color:'var(--text3)', whiteSpace:'nowrap' }}>Hasta</span>
                        <input type="time" value={al.fin || '21:00'}
                          onChange={e => updateAlerta(cuenta, 'fin', e.target.value)}
                          style={{ fontSize:13, padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)', color:'var(--text)', background:'var(--bg)' }} />
                      </div>
                      <span style={{ fontSize:12, color:'var(--text3)' }}>hora Mexico</span>
                    </div>
                    <div style={{ padding:'0 16px 14px' }}>
                      <button onClick={() => saveAlertas(cuenta)} disabled={saving}
                        style={{ fontSize:12, fontWeight:700, padding:'7px 18px', borderRadius:6,
                          background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer',
                          opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                )
              })}

              <div style={{ fontSize:12, color:'var(--text3)', padding:'12px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, lineHeight:1.6 }}>
                Los mensajes de inicio del worker, errores criticos del sistema y callbacks de Telegram seguiran funcionando siempre, independiente de este horario.
              </div>
            </div>
          )}

          {tab === 'proactivos' && (
            <div style={{ display:'flex', flexDirection:'column', gap:24, maxWidth:600 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Mensajes Proactivos</div>
                <div style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>
                  Envia mensajes automaticos al comprador cuando su pedido cambia de estado (enviado o entregado).
                </div>
              </div>

              {loadingProact ? (
                <div style={{ fontSize:13, color:'var(--text3)', padding:20, textAlign:'center' }}>Cargando...</div>
              ) : CUENTAS.map(cuenta => {
                const ac = ACCT_COLOR[cuenta]
                return (
                  <div key={cuenta} style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                    <div style={{ padding:'12px 16px', background: ac.bg, borderBottom:`1.5px solid ${ac.br}` }}>
                      <span style={{ fontSize:14, fontWeight:700, color: ac.color }}>{cuenta}</span>
                    </div>

                    {['ENVIADO', 'ENTREGADO'].map(evento => {
                      const cfg = getProact(cuenta, evento)
                      const key = `${cuenta}_${evento}`
                      const isSaving = savingProact === key
                      return (
                        <div key={evento} style={{ padding:'16px', borderBottom:'1px solid var(--border)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', flex:1 }}>
                              {evento === 'ENVIADO' ? '📦 Pedido Enviado' : '✅ Pedido Entregado'}
                            </span>
                            <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                              <input type="checkbox" checked={cfg.activo}
                                onChange={e => updateProact(cuenta, evento, 'activo', e.target.checked)}
                                style={{ width:16, height:16 }} />
                              <span style={{ fontSize:12, color: cfg.activo ? 'var(--green)' : 'var(--text3)', fontWeight:600 }}>
                                {cfg.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </label>
                          </div>

                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                            <span style={{ fontSize:12, color:'var(--text3)' }}>Modo:</span>
                            {['proactivo', 'reactivo'].map(m => (
                              <button key={m} onClick={() => updateProact(cuenta, evento, 'modo', m)}
                                style={{
                                  fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:6, cursor:'pointer',
                                  border: cfg.modo === m ? '1.5px solid var(--purple-border)' : '1.5px solid var(--border)',
                                  background: cfg.modo === m ? 'var(--purple-light)' : 'transparent',
                                  color: cfg.modo === m ? 'var(--purple)' : 'var(--text3)',
                                }}>
                                {m === 'proactivo' ? 'Proactivo' : 'Reactivo'}
                              </button>
                            ))}
                          </div>

                          <div style={{ position:'relative' }}>
                            <textarea value={cfg.mensaje} onChange={e => {
                                if (e.target.value.length <= 350) updateProact(cuenta, evento, 'mensaje', e.target.value)
                              }}
                              rows={3} placeholder={`Mensaje que se envia cuando el pedido es ${evento.toLowerCase()}...`}
                              style={{ width:'100%', fontSize:13, padding:'10px 12px', borderRadius:6, border:'1px solid var(--border)',
                                fontFamily:'inherit', resize:'vertical', outline:'none', color:'var(--text)', background:'var(--bg)' }} />
                            <span style={{ position:'absolute', bottom:8, right:10, fontSize:11, color: cfg.mensaje.length > 330 ? 'var(--red)' : 'var(--text3)' }}>
                              {cfg.mensaje.length}/350
                            </span>
                          </div>

                          <div style={{ marginTop:10 }}>
                            <button onClick={() => saveProactivo(cuenta, evento)} disabled={isSaving}
                              style={{ fontSize:12, fontWeight:700, padding:'7px 18px', borderRadius:6,
                                background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer',
                                opacity: isSaving ? 0.6 : 1 }}>
                              {isSaving ? 'Guardando...' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              <div style={{ fontSize:12, color:'var(--text3)', padding:'12px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, lineHeight:1.6 }}>
                <b>Proactivo:</b> el worker envia el mensaje automaticamente al detectar el cambio de estado en ML.<br/>
                <b>Reactivo:</b> el mensaje se guarda como template pero no se envia automaticamente (proximamente).
              </div>
            </div>
          )}

          {/* ── TAB: Contencion ── */}
          {tab === 'contencion' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ fontSize:13, color:'var(--text3)', lineHeight:1.6 }}>
                Configura la deteccion automatica de compradores frustrados y la respuesta de contencion por cuenta.
              </div>
              {loadingCont ? (
                <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Cargando...</div>
              ) : ['GTK','RBN','GDP'].map(c => {
                const cfg = contencion[c] || {}
                const isOn = !!cfg.activo
                return (
                  <div key={c} style={{ background: isOn ? 'var(--surface)' : 'var(--surface2)',
                    border: isOn ? '1.5px solid var(--purple-border)' : '1px solid var(--border)',
                    borderRadius:10, overflow:'hidden', opacity: isOn ? 1 : 0.7, transition:'all .2s' }}>
                    {/* Header */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'14px 20px', borderBottom: isOn ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{c}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        {contFlash === c && (
                          <span style={{ fontSize:12, fontWeight:600, color:'#16a34a' }}>Guardado</span>
                        )}
                        <label style={{ position:'relative', display:'inline-block', width:44, height:24, cursor:'pointer' }}>
                          <input type="checkbox" checked={isOn}
                            onChange={e => updateCont(c, 'activo', e.target.checked)}
                            style={{ opacity:0, width:0, height:0 }} />
                          <span style={{ position:'absolute', inset:0, borderRadius:12,
                            background: isOn ? 'var(--purple)' : 'var(--border2)',
                            transition:'background .2s' }}>
                            <span style={{ position:'absolute', top:2, left: isOn ? 22 : 2,
                              width:20, height:20, borderRadius:10, background:'#fff',
                              transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
                          </span>
                        </label>
                      </div>
                    </div>
                    {/* Body — only when ON */}
                    {isOn && (
                      <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                        {/* Modo */}
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:6 }}>Modo</div>
                          <div style={{ display:'flex', gap:8 }}>
                            {[
                              { id:'solo_alertar', label:'Solo alertar (Telegram)' },
                              { id:'auto_responder', label:'Responder automaticamente' },
                            ].map(m => (
                              <label key={m.id} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer',
                                fontSize:13, padding:'6px 14px', borderRadius:6,
                                border: cfg.modo === m.id ? '1.5px solid var(--purple-border)' : '1px solid var(--border)',
                                background: cfg.modo === m.id ? 'var(--purple-light)' : 'transparent',
                                color: cfg.modo === m.id ? 'var(--purple)' : 'var(--text2)' }}>
                                <input type="radio" name={`modo_${c}`} value={m.id}
                                  checked={cfg.modo === m.id}
                                  onChange={() => updateCont(c, 'modo', m.id)}
                                  style={{ display:'none' }} />
                                {m.label}
                              </label>
                            ))}
                          </div>
                        </div>
                        {/* Umbral */}
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:6 }}>
                            Umbral de deteccion: {cfg.umbral_score || 3}
                            <span style={{ fontWeight:400, marginLeft:8 }}>
                              ({(cfg.umbral_score || 3) <= 1 ? 'Muy sensible' : (cfg.umbral_score || 3) <= 2 ? 'Sensible' : (cfg.umbral_score || 3) === 3 ? 'Equilibrado' : (cfg.umbral_score || 3) === 4 ? 'Conservador' : 'Solo casos graves'})
                            </span>
                          </div>
                          <input type="range" min={1} max={5} value={cfg.umbral_score || 3}
                            onChange={e => updateCont(c, 'umbral_score', Number(e.target.value))}
                            style={{ width:'100%', maxWidth:300 }} />
                        </div>
                        {/* Derivar WhatsApp */}
                        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                          <input type="checkbox" checked={cfg.derivar_whatsapp !== false}
                            onChange={e => updateCont(c, 'derivar_whatsapp', e.target.checked)} />
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Derivar a WhatsApp</div>
                            <div style={{ fontSize:11, color:'var(--text3)' }}>Mencionar el QR del paquete para contacto por WhatsApp</div>
                          </div>
                        </label>
                        {/* Instrucciones IA */}
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:6 }}>Instrucciones para la IA</div>
                          <textarea value={cfg.instrucciones_ia || ''}
                            onChange={e => updateCont(c, 'instrucciones_ia', e.target.value)}
                            style={{ width:'100%', boxSizing:'border-box', fontSize:13, padding:'10px 12px',
                              borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)',
                              color:'var(--text)', resize:'vertical', minHeight:150, fontFamily:'inherit',
                              lineHeight:1.5 }} />
                          <button onClick={() => resetInstrucciones(c)}
                            style={{ marginTop:6, fontSize:11, padding:'4px 12px', borderRadius:4,
                              border:'1px solid var(--border)', background:'var(--surface2)',
                              color:'var(--text3)', cursor:'pointer' }}>
                            Restaurar default
                          </button>
                        </div>
                        {/* Guardar */}
                        <button onClick={() => saveContencion(c)} disabled={savingCont === c}
                          style={{ alignSelf:'flex-start', fontSize:13, fontWeight:600, padding:'8px 20px',
                            borderRadius:6, background:'var(--purple)', color:'#fff', border:'none',
                            cursor:'pointer', opacity: savingCont === c ? 0.6 : 1 }}>
                          {savingCont === c ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

