import Topbar from '../components/Topbar'
import { useState, useEffect, useRef } from 'react'

const RAILWAY = 'https://worker-production-d575.up.railway.app'

const ESTADOS_CONTACTO = [
  { id: '',                  label: 'Todos' },
  { id: 'no_leidos',        label: 'No leídos' },
  { id: 'lead_nuevo',       label: 'Lead Nuevo' },
  { id: 'lead_frio',        label: 'Lead Frío' },
  { id: 'lead_caliente',    label: 'Lead Caliente' },
  { id: 'cliente',          label: 'Cliente' },
  { id: 'cliente_recurrente', label: 'Cliente Recurrente' },
  { id: 'inactivo',         label: 'Inactivo' },
]

const ESTADOS_DROPDOWN = [
  { id: 'lead_nuevo',         label: 'Lead Nuevo' },
  { id: 'lead_frio',          label: 'Lead Frío' },
  { id: 'lead_caliente',      label: 'Lead Caliente' },
  { id: 'cliente',            label: 'Cliente' },
  { id: 'cliente_recurrente', label: 'Cliente Recurrente' },
  { id: 'cliente_ml',         label: 'Cliente ML' },
  { id: 'cliente_amazon',     label: 'Cliente Amazon' },
  { id: 'inactivo',           label: 'Inactivo' },
]

const ESTADO_BADGE = {
  lead_nuevo:         { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  lead_frio:          { color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
  lead_caliente:      { color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  cliente:            { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  cliente_recurrente: { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  cliente_ml:         { color: '#eab308', bg: '#fefce8', border: '#fde047' },
  cliente_amazon:     { color: '#f97316', bg: '#fff7ed', border: '#fdba74' },
  inactivo:           { color: '#9ca3af', bg: '#f3f4f6', border: '#d1d5db' },
}

const ACCT_BTNS = ['Todas', 'GTK', 'RBN', 'GDP']

function fmtHora(s) {
  if (!s) return ''
  try {
    const d = new Date(s)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  } catch { return '' }
}

export default function WhatsApp({ onLogout }) {
  const [conversaciones, setConversaciones] = useState([])
  const [selected, setSelected]   = useState(null)
  const [mensajes, setMensajes]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [busqueda, setBusqueda]   = useState('')
  const [filtCuenta, setFiltCuenta] = useState('')
  const [filtEstado, setFiltEstado] = useState('')
  const [inputMsg, setInputMsg]   = useState('')
  const [showInfo, setShowInfo]   = useState(true)
  const [editNombre, setEditNombre] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [editNotas, setEditNotas]   = useState('')
  const msgsEndRef = useRef(null)

  const token = () => localStorage.getItem('khn_token')

  const loadConversaciones = async () => {
    setLoading(true)
    try {
      let url = `${RAILWAY}/api/whatsapp/conversaciones`
      if (filtCuenta) url += `?cuenta=${filtCuenta}`
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      const d = await r.json()
      setConversaciones(Array.isArray(d) ? d : [])
    } catch { setConversaciones([]) }
    finally { setLoading(false) }
  }

  const loadMensajes = async (convId) => {
    setLoadingMsgs(true)
    try {
      const r = await fetch(`${RAILWAY}/api/whatsapp/conversaciones/${convId}/mensajes`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      const d = await r.json()
      setMensajes(Array.isArray(d) ? d : [])
    } catch { setMensajes([]) }
    finally { setLoadingMsgs(false) }
  }

  useEffect(() => { loadConversaciones() }, [filtCuenta])

  useEffect(() => {
    if (selected) {
      loadMensajes(selected.id)
      setEditNombre(selected.nombre || '')
      setEditEstado(selected.estado || 'lead_nuevo')
      setEditNotas('')
    }
  }, [selected?.id])

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const filtered = conversaciones.filter(c => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      if (!(c.nombre || '').toLowerCase().includes(q) && !(c.telefono || '').includes(q)) return false
    }
    if (filtEstado === 'no_leidos') return (c.no_leidos || 0) > 0
    if (filtEstado && c.estado !== filtEstado) return false
    return true
  })

  const estadoBadge = (estado) => {
    const info = ESTADO_BADGE[estado]
    if (!info) return null
    const label = ESTADOS_DROPDOWN.find(e => e.id === estado)?.label || estado
    return (
      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
        background: info.bg, color: info.color, border: `1px solid ${info.border}` }}>
        {label}
      </span>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <Topbar onLogout={onLogout} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar izquierdo ── */}
        <div style={{ width: 280, flexShrink: 0, borderRight: '1.5px solid var(--border)',
          background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#25d366' }}>WhatsApp</span>
            <div style={{ flex: 1 }} />
            <button style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--border)',
              background: 'var(--surface2)', color: 'var(--text)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>

          {/* Buscador */}
          <div style={{ padding: '8px 10px 4px' }}>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar nombre o teléfono..."
              style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                outline: 'none' }} />
          </div>

          {/* Filtros cuenta */}
          <div style={{ display: 'flex', gap: 4, padding: '6px 10px 2px' }}>
            {ACCT_BTNS.map(a => {
              const val = a === 'Todas' ? '' : a
              const active = filtCuenta === val
              return (
                <button key={a} onClick={() => setFiltCuenta(val)} style={{
                  flex: 1, fontSize: 11, fontWeight: 700, padding: '5px 0', borderRadius: 'var(--radius-sm)',
                  border: active ? '1.5px solid var(--purple-border)' : '1.5px solid var(--border)',
                  background: active ? 'var(--purple-light)' : 'var(--surface)',
                  color: active ? 'var(--purple)' : 'var(--text3)', cursor: 'pointer',
                }}>{a}</button>
              )
            })}
          </div>

          {/* Filtros estado */}
          <div style={{ padding: '6px 10px 6px' }}>
            <select value={filtEstado} onChange={e => setFiltEstado(e.target.value)}
              style={{ width: '100%', fontSize: 12, padding: '5px 8px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                cursor: 'pointer' }}>
              {ESTADOS_CONTACTO.map(e => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>

          {/* Lista conversaciones */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>Cargando...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>Sin conversaciones</div>
            ) : filtered.map(c => {
              const isSelected = selected?.id === c.id
              return (
                <div key={c.id} onClick={() => setSelected(c)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    background: isSelected ? 'var(--purple-light)' : 'var(--surface)',
                    borderLeft: isSelected ? '3px solid var(--purple)' : '3px solid transparent',
                    transition: 'all .1s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.nombre || c.telefono}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{fmtHora(c.ultimo_mensaje_en)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)', flex: 1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.ultimo_mensaje?.slice(0, 50) || '—'}
                    </span>
                    {(c.no_leidos || 0) > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, minWidth: 18, height: 18,
                        borderRadius: '50%', background: '#25d366', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {c.no_leidos}
                      </span>
                    )}
                  </div>
                  {c.estado && c.estado !== 'abierta' && (
                    <div style={{ marginTop: 3 }}>{estadoBadge(c.estado)}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Panel central — mensajes ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text3)', fontSize: 15 }}>
              Selecciona una conversación
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '10px 18px', borderBottom: '1.5px solid var(--border)',
                background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  {selected.nombre || selected.telefono}
                </span>
                {selected.nombre && (
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{selected.telefono}</span>
                )}
                {estadoBadge(selected.estado)}
                <div style={{ flex: 1 }} />
                <button onClick={() => setShowInfo(v => !v)} style={{
                  fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: showInfo ? 'var(--purple-light)' : 'var(--surface)',
                  color: showInfo ? 'var(--purple)' : 'var(--text3)', cursor: 'pointer',
                }}>{showInfo ? 'Ocultar info' : 'Ver info'}</button>
              </div>

              {/* Mensajes */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px',
                background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {loadingMsgs ? (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)', fontSize: 13 }}>Cargando mensajes...</div>
                ) : mensajes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)', fontSize: 13 }}>Sin mensajes</div>
                ) : mensajes.map(m => {
                  const saliente = m.direccion === 'saliente'
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: saliente ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '65%', padding: '8px 12px', borderRadius: 10,
                        background: saliente ? '#dcf8c6' : 'var(--surface)',
                        border: `1px solid ${saliente ? '#b5e2a0' : 'var(--border)'}`,
                        fontSize: 14, color: 'var(--text)', lineHeight: 1.5,
                      }}>
                        <div>{m.contenido}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'right', marginTop: 3 }}>
                          {fmtHora(m.creado_en)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={msgsEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '10px 18px', borderTop: '1.5px solid var(--border)',
                background: 'var(--surface)', display: 'flex', gap: 8, flexShrink: 0 }}>
                <input type="text" value={inputMsg} onChange={e => setInputMsg(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) e.preventDefault() }}
                  style={{ flex: 1, fontSize: 14, padding: '9px 14px', borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                    outline: 'none', fontFamily: 'inherit' }} />
                <button style={{
                  padding: '9px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
                  background: '#25d366', color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer',
                }}>Enviar</button>
              </div>
            </>
          )}
        </div>

        {/* ── Panel derecho — info contacto ── */}
        {selected && showInfo && (
          <div style={{ width: 260, flexShrink: 0, borderLeft: '1.5px solid var(--border)',
            background: 'var(--surface)', overflowY: 'auto', padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#25d36622',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, color: '#25d366', border: '2px solid #25d366' }}>
                {(selected.nombre || selected.telefono || '?').charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Nombre editable */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 3, display: 'block' }}>Nombre</label>
              <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                  outline: 'none' }} />
            </div>

            {/* Teléfono */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 3, display: 'block' }}>Teléfono</label>
              <div style={{ fontSize: 13, color: 'var(--text)', padding: '6px 10px',
                background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                {selected.telefono}
              </div>
            </div>

            {/* Estado */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 3, display: 'block' }}>Estado</label>
              <select value={editEstado} onChange={e => setEditEstado(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                  cursor: 'pointer' }}>
                {ESTADOS_DROPDOWN.map(e => (
                  <option key={e.id} value={e.id}>{e.label}</option>
                ))}
              </select>
            </div>

            {/* Notas internas */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 3, display: 'block' }}>Notas internas</label>
              <textarea value={editNotas} onChange={e => setEditNotas(e.target.value)}
                rows={4} placeholder="Notas sobre este contacto..."
                style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                  outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            {/* Etiquetas placeholder */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 3, display: 'block' }}>Etiquetas</label>
              <div style={{ fontSize: 12, color: 'var(--text3)', padding: '10px',
                background: 'var(--surface2)', borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--border)', textAlign: 'center' }}>
                Sin etiquetas
              </div>
            </div>

            {/* Cuenta */}
            {selected.cuenta && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 3, display: 'block' }}>Cuenta</label>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', padding: '6px 10px',
                  background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  {selected.cuenta}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
