import Topbar from '../components/Topbar'
import { useState, useEffect, useRef, useCallback } from 'react'

const RAILWAY = 'https://worker-production-d575.up.railway.app'
const CUENTAS = ['TODAS', 'GTK', 'RBN', 'GDP']
const TIPOS_KB = ['GENERAL', 'COMPATIBILIDAD', 'CHIP', 'FACTURA', 'CONSULTA', 'PRECIO', 'ENVIO']

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('khn_token')}`, 'Content-Type': 'application/json' }
}

export default function Entrenamiento({ onLogout }) {
  const [tab, setTab] = useState('reglas')

  // ── Reglas IA state ─────────────────────────────────────────
  const [reglas, setReglas] = useState([])
  const [loadingReglas, setLoadingReglas] = useState(false)
  const [filtCuenta, setFiltCuenta] = useState('')
  const [filtDesde, setFiltDesde] = useState('')
  const [filtHasta, setFiltHasta] = useState('')
  const [editId, setEditId] = useState(null)
  const [editTexto, setEditTexto] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newTexto, setNewTexto] = useState('')
  const [newCuenta, setNewCuenta] = useState('TODAS')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // ── KB state ────────────────────────────────────────────────
  const [kbItems, setKbItems] = useState([])
  const [kbTotal, setKbTotal] = useState(0)
  const [kbLoading, setKbLoading] = useState(false)
  const [kbCuenta, setKbCuenta] = useState('')
  const [kbSearch, setKbSearch] = useState('')
  const [kbSearchDebounced, setKbSearchDebounced] = useState('')
  const [kbOffset, setKbOffset] = useState(0)
  const [showNewKb, setShowNewKb] = useState(false)
  const [kbForm, setKbForm] = useState({ pregunta: '', respuesta: '', tipo: 'GENERAL', cuenta: '' })
  const kbTimer = useRef(null)
  const KB_LIMIT = 50

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const handleKbSearch = useCallback((val) => {
    setKbSearch(val)
    clearTimeout(kbTimer.current)
    kbTimer.current = setTimeout(() => { setKbSearchDebounced(val); setKbOffset(0) }, 300)
  }, [])

  // ── Reglas: load ────────────────────────────────────────────
  const loadReglas = async () => {
    setLoadingReglas(true)
    try {
      let url = `${RAILWAY}/api/reglas-ia`
      if (filtCuenta) url += `?cuenta=${filtCuenta}`
      const r = await fetch(url, { headers: authHeaders() })
      const data = await r.json()
      data.sort((a, b) => (b.creado_en || '').localeCompare(a.creado_en || ''))
      setReglas(data)
    } catch { setReglas([]) }
    setLoadingReglas(false)
  }

  useEffect(() => { if (tab === 'reglas') loadReglas() }, [tab, filtCuenta])

  const saveRegla = async () => {
    if (!newTexto.trim()) return
    setSaving(true)
    try {
      const r = await fetch(`${RAILWAY}/api/reglas-ia`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ texto: newTexto, cuenta: newCuenta })
      })
      if ((await r.json()).ok) { flash('Regla creada'); setShowNew(false); setNewTexto(''); loadReglas() }
    } catch { flash('Error de conexion') }
    setSaving(false)
  }

  const updateRegla = async (id, data) => {
    try {
      const r = await fetch(`${RAILWAY}/api/reglas-ia/${id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data)
      })
      if ((await r.json()).ok) { flash('Regla actualizada'); setEditId(null); loadReglas() }
    } catch { flash('Error de conexion') }
  }

  const deleteRegla = async (id) => {
    if (!confirm('Eliminar esta regla?')) return
    try {
      await fetch(`${RAILWAY}/api/reglas-ia/${id}`, { method: 'DELETE', headers: authHeaders() })
      flash('Regla eliminada'); loadReglas()
    } catch { flash('Error') }
  }

  // ── KB: load ────────────────────────────────────────────────
  const loadKb = async (off = 0) => {
    setKbLoading(true)
    try {
      let url = `${RAILWAY}/api/knowledge-base?limit=${KB_LIMIT}&offset=${off}`
      if (kbCuenta) url += `&cuenta=${kbCuenta}`
      if (kbSearchDebounced) url += `&q=${encodeURIComponent(kbSearchDebounced)}`
      const r = await fetch(url, { headers: authHeaders() })
      const d = await r.json()
      setKbItems(d.items || []); setKbTotal(d.total || 0); setKbOffset(off)
    } catch { setKbItems([]) }
    setKbLoading(false)
  }

  useEffect(() => { if (tab === 'kb') loadKb(0) }, [tab, kbCuenta, kbSearchDebounced])

  const saveKbEntry = async () => {
    if (!kbForm.pregunta.trim() || !kbForm.respuesta.trim()) return
    setSaving(true)
    try {
      const r = await fetch(`${RAILWAY}/api/knowledge-base`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ pregunta: kbForm.pregunta, respuesta: kbForm.respuesta, tipo: kbForm.tipo, fuente: 'manual' })
      })
      if ((await r.json()).ok) {
        flash('Entrada agregada'); setShowNewKb(false)
        setKbForm({ pregunta: '', respuesta: '', tipo: 'GENERAL', cuenta: '' }); loadKb(kbOffset)
      }
    } catch { flash('Error de conexion') }
    setSaving(false)
  }

  const deleteKb = async (id) => {
    if (!confirm('Eliminar esta entrada de la base de conocimiento?')) return
    try {
      await fetch(`${RAILWAY}/api/knowledge-base/${id}`, { method: 'DELETE', headers: authHeaders() })
      flash('Entrada eliminada'); loadKb(kbOffset)
    } catch { flash('Error') }
  }

  const reglasFiltradas = reglas.filter(r => {
    if (!r.creado_en) return true
    const fecha = r.creado_en.slice(0, 10)
    if (filtDesde && fecha < filtDesde) return false
    if (filtHasta && fecha > filtHasta) return false
    return true
  })

  const ACCT = { TODAS: { color:'var(--text2)', bg:'var(--surface2)', br:'var(--border)' },
    GTK: { color:'var(--acct-gtk)', bg:'var(--acct-gtk-bg)', br:'var(--acct-gtk-br)' },
    RBN: { color:'var(--acct-rbn)', bg:'var(--acct-rbn-bg)', br:'var(--acct-rbn-br)' },
    GDP: { color:'var(--acct-gdp)', bg:'var(--acct-gdp-bg)', br:'var(--acct-gdp-br)' } }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>
      <Topbar onLogout={onLogout} />

      {/* Header */}
      <div style={{ padding:'16px 24px', borderBottom:'1.5px solid var(--border)', background:'var(--surface)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <button onClick={() => window.history.back()}
            style={{ fontSize:14, fontWeight:600, padding:'5px 12px', borderRadius:'var(--radius-sm)',
              border:'1px solid var(--border)', background:'transparent', color:'var(--text3)', cursor:'pointer' }}>
            &#8592; Volver
          </button>
          <span style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>Entrenamiento IA</span>
          {msg && <span style={{ fontSize:13, fontWeight:600, color:'var(--green)', marginLeft:12 }}>{msg}</span>}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:'2px solid var(--border)' }}>
          {[{ key:'reglas', label:'Reglas IA' }, { key:'kb', label:'Base de Conocimiento' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'7px 20px', fontSize:13, fontWeight:600, cursor:'pointer',
                background:'none', border:'none',
                color: tab === t.key ? 'var(--purple)' : 'var(--text3)',
                borderBottom: tab === t.key ? '2px solid var(--purple)' : '2px solid transparent',
                marginBottom:-2 }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>

        {/* ══════════ TAB: REGLAS IA ══════════ */}
        {tab === 'reglas' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:13, color:'var(--text3)', lineHeight:1.5 }}>
              Las reglas se inyectan directamente en la IA como verdad absoluta. Usalas para corregir comportamientos especificos.
            </div>

            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <select value={filtCuenta} onChange={e => setFiltCuenta(e.target.value)}
                style={{ fontSize:13, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' }}>
                <option value=''>Todas las cuentas</option>
                {CUENTAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="date" value={filtDesde} onChange={e => setFiltDesde(e.target.value)}
                title="Desde"
                style={{ fontSize:13, padding:'5px 8px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' }} />
              <span style={{ fontSize:12, color:'var(--text3)' }}>—</span>
              <input type="date" value={filtHasta} onChange={e => setFiltHasta(e.target.value)}
                title="Hasta"
                style={{ fontSize:13, padding:'5px 8px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' }} />
              {(filtDesde || filtHasta) && (
                <button onClick={() => { setFiltDesde(''); setFiltHasta('') }}
                  style={{ fontSize:11, padding:'4px 8px', borderRadius:4, border:'1px solid var(--border)',
                    background:'transparent', color:'var(--text3)', cursor:'pointer' }}>Limpiar</button>
              )}
              <button onClick={() => { setShowNew(true); setNewTexto(''); setNewCuenta('TODAS') }}
                style={{ fontSize:13, fontWeight:700, padding:'6px 16px', borderRadius:'var(--radius-sm)',
                  background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer' }}>
                + Nueva regla
              </button>
            </div>

            {/* New rule form */}
            {showNew && (
              <div style={{ background:'var(--surface)', border:'1.5px solid var(--purple-border)', borderRadius:'var(--radius)', padding:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--purple)', marginBottom:8, textTransform:'uppercase' }}>Nueva regla</div>
                <textarea value={newTexto} onChange={e => setNewTexto(e.target.value)}
                  placeholder="Ej: Nunca menciones precios de la competencia..."
                  rows={3} style={{ width:'100%', fontSize:13, padding:10, borderRadius:6, border:'1px solid var(--border)',
                    background:'var(--bg)', color:'var(--text)', resize:'vertical', boxSizing:'border-box' }} />
                <div style={{ display:'flex', gap:10, marginTop:8, alignItems:'center' }}>
                  <select value={newCuenta} onChange={e => setNewCuenta(e.target.value)}
                    style={{ fontSize:13, padding:'5px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' }}>
                    {CUENTAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={saveRegla} disabled={saving}
                    style={{ fontSize:13, fontWeight:700, padding:'6px 18px', borderRadius:6,
                      background:'var(--green)', color:'#fff', border:'none', cursor:'pointer', opacity: saving ? .6 : 1 }}>
                    Guardar
                  </button>
                  <button onClick={() => setShowNew(false)}
                    style={{ fontSize:13, padding:'6px 14px', borderRadius:6, border:'1px solid var(--border)',
                      background:'transparent', color:'var(--text3)', cursor:'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Rules list */}
            {loadingReglas ? (
              <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Cargando...</div>
            ) : reglasFiltradas.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>
                {reglas.length === 0 ? 'No hay reglas configuradas' : 'No hay reglas en el rango seleccionado'}
              </div>
            ) : (
              reglasFiltradas.map(regla => {
                const ac = ACCT[regla.cuenta] || ACCT.TODAS
                const isEditing = editId === regla.id
                return (
                  <div key={regla.id} style={{ background:'var(--surface)', border:`1.5px solid ${regla.activo ? 'var(--border)' : 'var(--red-border)'}`,
                    borderRadius:'var(--radius)', padding:'12px 16px', opacity: regla.activo ? 1 : .6 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <div style={{ flex:1 }}>
                        {isEditing ? (
                          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            <textarea value={editTexto} onChange={e => setEditTexto(e.target.value)} rows={3}
                              style={{ width:'100%', fontSize:13, padding:8, borderRadius:6, border:'1px solid var(--border)',
                                background:'var(--bg)', color:'var(--text)', resize:'vertical', boxSizing:'border-box' }} />
                            <div style={{ display:'flex', gap:8 }}>
                              <button onClick={() => updateRegla(regla.id, { texto: editTexto })}
                                style={{ fontSize:12, fontWeight:700, padding:'4px 14px', borderRadius:6,
                                  background:'var(--green)', color:'#fff', border:'none', cursor:'pointer' }}>Guardar</button>
                              <button onClick={() => setEditId(null)}
                                style={{ fontSize:12, padding:'4px 14px', borderRadius:6, border:'1px solid var(--border)',
                                  background:'transparent', color:'var(--text3)', cursor:'pointer' }}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.5 }}>{regla.texto}</div>
                            {regla.creado_en && <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
                              Agregada el {new Date(regla.creado_en).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })} a las {new Date(regla.creado_en).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', hour12:false })}
                            </div>}
                          </>
                        )}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
                          background:ac.bg, color:ac.color, border:`1px solid ${ac.br}` }}>{regla.cuenta}</span>
                        <label style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
                          <input type="checkbox" checked={regla.activo}
                            onChange={() => updateRegla(regla.id, { activo: !regla.activo })}
                            style={{ width:14, height:14 }} />
                          <span style={{ fontSize:11, color:'var(--text3)' }}>{regla.activo ? 'Activa' : 'Inactiva'}</span>
                        </label>
                        {!isEditing && (
                          <button onClick={() => { setEditId(regla.id); setEditTexto(regla.texto) }}
                            style={{ fontSize:11, padding:'3px 8px', borderRadius:4, border:'1px solid var(--border)',
                              background:'transparent', color:'var(--text2)', cursor:'pointer' }}>Editar</button>
                        )}
                        <button onClick={() => deleteRegla(regla.id)}
                          style={{ fontSize:11, padding:'3px 8px', borderRadius:4, border:'1px solid var(--red-border)',
                            background:'var(--red-light)', color:'var(--red)', cursor:'pointer' }}>Eliminar</button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ══════════ TAB: BASE DE CONOCIMIENTO ══════════ */}
        {tab === 'kb' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <input type="text" value={kbSearch} onChange={e => handleKbSearch(e.target.value)}
                placeholder="Buscar en pregunta o respuesta..."
                style={{ fontSize:13, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)',
                  background:'var(--surface)', color:'var(--text)', minWidth:220 }} />
              <select value={kbCuenta} onChange={e => { setKbCuenta(e.target.value); setKbOffset(0) }}
                style={{ fontSize:13, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' }}>
                <option value=''>Todas las cuentas</option>
                <option value='GTK'>GTK</option>
                <option value='RBN'>RBN</option>
                <option value='GDP'>GDP</option>
              </select>
              <button onClick={() => { setShowNewKb(true); setKbForm({ pregunta:'', respuesta:'', tipo:'GENERAL', cuenta:'' }) }}
                style={{ fontSize:13, fontWeight:700, padding:'6px 16px', borderRadius:'var(--radius-sm)',
                  background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer' }}>
                + Agregar entrada
              </button>
              <span style={{ fontSize:12, color:'var(--text3)', marginLeft:'auto' }}>{kbTotal} registros</span>
            </div>

            {/* New KB entry form */}
            {showNewKb && (
              <div style={{ background:'var(--surface)', border:'1.5px solid var(--purple-border)', borderRadius:'var(--radius)', padding:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--purple)', marginBottom:8, textTransform:'uppercase' }}>Nueva entrada</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <textarea value={kbForm.pregunta} onChange={e => setKbForm(p => ({ ...p, pregunta: e.target.value }))}
                    placeholder="Pregunta del cliente..." rows={2}
                    style={{ width:'100%', fontSize:13, padding:8, borderRadius:6, border:'1px solid var(--border)',
                      background:'var(--bg)', color:'var(--text)', resize:'vertical', boxSizing:'border-box' }} />
                  <textarea value={kbForm.respuesta} onChange={e => setKbForm(p => ({ ...p, respuesta: e.target.value }))}
                    placeholder="Respuesta correcta..." rows={3}
                    style={{ width:'100%', fontSize:13, padding:8, borderRadius:6, border:'1px solid var(--border)',
                      background:'var(--bg)', color:'var(--text)', resize:'vertical', boxSizing:'border-box' }} />
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <select value={kbForm.tipo} onChange={e => setKbForm(p => ({ ...p, tipo: e.target.value }))}
                      style={{ fontSize:13, padding:'5px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' }}>
                      {TIPOS_KB.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={saveKbEntry} disabled={saving}
                      style={{ fontSize:13, fontWeight:700, padding:'6px 18px', borderRadius:6,
                        background:'var(--green)', color:'#fff', border:'none', cursor:'pointer', opacity: saving ? .6 : 1 }}>
                      Guardar
                    </button>
                    <button onClick={() => setShowNewKb(false)}
                      style={{ fontSize:13, padding:'6px 14px', borderRadius:6, border:'1px solid var(--border)',
                        background:'transparent', color:'var(--text3)', cursor:'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* KB Table */}
            {kbLoading ? (
              <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Cargando...</div>
            ) : (
              <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 90px 100px 60px', padding:'10px 16px',
                  background:'var(--surface2)', borderBottom:'1px solid var(--border)',
                  fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em' }}>
                  <div>Pregunta</div><div>Respuesta</div><div>Tipo</div><div>Fuente</div><div></div>
                </div>
                {kbItems.length === 0 ? (
                  <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Sin resultados</div>
                ) : kbItems.map((item, i) => (
                  <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 90px 100px 60px',
                    padding:'9px 16px', borderBottom: i < kbItems.length-1 ? '1px solid var(--border)' : 'none',
                    alignItems:'center', background: i%2===0 ? 'transparent' : 'var(--surface2)' }}>
                    <div style={{ fontSize:12, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', paddingRight:8 }}
                      title={item.pregunta}>{item.pregunta}</div>
                    <div style={{ fontSize:12, color:'var(--text2)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', paddingRight:8 }}
                      title={item.respuesta}>{item.respuesta}</div>
                    <div><span style={{ fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:4,
                      background:'var(--surface2)', color:'var(--text3)', border:'1px solid var(--border)' }}>{item.tipo}</span></div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{item.fuente}</div>
                    <div>
                      <button onClick={() => deleteKb(item.id)}
                        style={{ fontSize:10, padding:'2px 8px', borderRadius:4, border:'1px solid var(--red-border)',
                          background:'var(--red-light)', color:'var(--red)', cursor:'pointer' }}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {kbTotal > KB_LIMIT && (
              <div style={{ display:'flex', gap:8, justifyContent:'center', alignItems:'center' }}>
                <button onClick={() => loadKb(Math.max(0, kbOffset - KB_LIMIT))} disabled={kbOffset === 0}
                  style={{ fontSize:12, padding:'4px 12px', borderRadius:4, border:'1px solid var(--border)',
                    background:'var(--surface)', color:'var(--text2)', cursor: kbOffset === 0 ? 'default' : 'pointer', opacity: kbOffset === 0 ? .5 : 1 }}>
                  Anterior
                </button>
                <span style={{ fontSize:12, color:'var(--text3)' }}>
                  {kbOffset + 1}-{Math.min(kbOffset + KB_LIMIT, kbTotal)} de {kbTotal}
                </span>
                <button onClick={() => loadKb(kbOffset + KB_LIMIT)} disabled={kbOffset + KB_LIMIT >= kbTotal}
                  style={{ fontSize:12, padding:'4px 12px', borderRadius:4, border:'1px solid var(--border)',
                    background:'var(--surface)', color:'var(--text2)', cursor: kbOffset + KB_LIMIT >= kbTotal ? 'default' : 'pointer',
                    opacity: kbOffset + KB_LIMIT >= kbTotal ? .5 : 1 }}>
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
