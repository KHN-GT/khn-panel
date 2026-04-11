import { useState, useEffect } from 'react'
import Topbar from '../components/Topbar'

const API = 'https://worker-production-d575.up.railway.app'

const ROL_COLORS = {
  admin:      { bg: '#2d1f5e', color: '#a78bfa', border: '#4c1d95' },
  supervisor: { bg: '#1a3a2a', color: '#34d399', border: '#065f46' },
  operador:   { bg: '#1e293b', color: '#94a3b8', border: '#334155' },
}

const CUENTAS_OPTS = ['GTK', 'RBN', 'GDP']

const EMPTY_FORM = { username: '', nombre: '', password: '', rol: 'operador', cuentas: ['GTK','RBN','GDP'], activo: true }

export default function Usuarios({ onLogout }) {
  const token = localStorage.getItem('khn_token')
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [flash, setFlash]       = useState('')

  // Modal
  const [modal, setModal]   = useState(null) // null | 'crear' | 'editar'
  const [editId, setEditId] = useState(null)
  const [form, setForm]     = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const showFlash = (msg, isError = false) => {
    setFlash({ msg, isError })
    setTimeout(() => setFlash(''), 3000)
  }

  const fetchUsuarios = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/usuarios`, { headers })
      if (!r.ok) throw new Error('Sin acceso')
      const data = await r.json()
      setUsuarios(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsuarios() }, [])

  const openCrear = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setModal('crear')
  }

  const openEditar = (u) => {
    setForm({ username: u.username, nombre: u.nombre || '', password: '', rol: u.rol, cuentas: u.cuentas || ['GTK','RBN','GDP'], activo: u.activo })
    setEditId(u.id)
    setModal('editar')
  }

  const handleToggleCuenta = (c) => {
    setForm(f => ({
      ...f,
      cuentas: f.cuentas.includes(c) ? f.cuentas.filter(x => x !== c) : [...f.cuentas, c]
    }))
  }

  const handleSave = async () => {
    if (!form.username || (!editId && !form.password)) {
      showFlash('Usuario y contrasena son requeridos', true)
      return
    }
    setSaving(true)
    try {
      const url = editId ? `${API}/api/usuarios/${editId}` : `${API}/api/usuarios`
      const method = editId ? 'PUT' : 'POST'
      const body = { ...form }
      if (editId && !body.password) delete body.password
      const r = await fetch(url, { method, headers, body: JSON.stringify(body) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error guardando')
      showFlash(editId ? 'Usuario actualizado' : 'Usuario creado')
      setModal(null)
      fetchUsuarios()
    } catch (e) {
      showFlash(e.message, true)
    } finally {
      setSaving(false)
    }
  }

  const handleDesactivar = async (u) => {
    if (!confirm(`Desactivar a ${u.username}?`)) return
    try {
      const r = await fetch(`${API}/api/usuarios/${u.id}`, { method: 'DELETE', headers })
      if (!r.ok) throw new Error('Error desactivando')
      showFlash('Usuario desactivado')
      fetchUsuarios()
    } catch (e) {
      showFlash(e.message, true)
    }
  }

  const handleReactivar = async (u) => {
    try {
      const r = await fetch(`${API}/api/usuarios/${u.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ activo: true })
      })
      if (!r.ok) throw new Error('Error reactivando')
      showFlash('Usuario reactivado')
      fetchUsuarios()
    } catch (e) {
      showFlash(e.message, true)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg)', color:'var(--text)' }}>
      <Topbar onLogout={onLogout} />

      <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', maxWidth:900, margin:'0 auto', width:'100%' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, margin:0, color:'var(--text)' }}>Gestion de Usuarios</h1>
            <p style={{ fontSize:13, color:'var(--text3)', margin:'4px 0 0' }}>
              Administra accesos y roles del panel
            </p>
          </div>
          <button onClick={openCrear}
            style={{ background:'var(--purple)', color:'#fff', border:'none', borderRadius:8,
              padding:'9px 18px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
            + Nuevo usuario
          </button>
        </div>

        {/* Flash */}
        {flash && (
          <div style={{ padding:'10px 16px', borderRadius:8, marginBottom:16, fontSize:13, fontWeight:600,
            background: flash.isError ? 'var(--red-light)' : 'var(--green-light)',
            color: flash.isError ? 'var(--red)' : 'var(--green)',
            border: `1px solid ${flash.isError ? 'var(--red-border)' : 'var(--green-border)'}` }}>
            {flash.msg}
          </div>
        )}

        {/* Error acceso */}
        {error && (
          <div style={{ padding:'16px', borderRadius:8, background:'var(--red-light)',
            color:'var(--red)', border:'1px solid var(--red-border)', fontSize:14 }}>
            Error: {error} — Solo administradores pueden ver esta pagina.
          </div>
        )}

        {/* Tabla */}
        {loading ? (
          <div style={{ color:'var(--text3)', fontSize:14, marginTop:32, textAlign:'center' }}>Cargando...</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {usuarios.map(u => {
              const colors = ROL_COLORS[u.rol] || ROL_COLORS.operador
              return (
                <div key={u.id} style={{ background:'var(--surface)', border:'1px solid var(--border)',
                  borderRadius:10, padding:'14px 18px', display:'flex', alignItems:'center', gap:16,
                  opacity: u.activo ? 1 : 0.5 }}>

                  {/* Avatar */}
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--purple-light)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:15, fontWeight:800, color:'var(--purple)', border:'1.5px solid var(--purple-border)',
                    flexShrink:0 }}>
                    {(u.nombre || u.username).charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>
                      {u.nombre || u.username}
                      {!u.activo && <span style={{ fontSize:11, color:'var(--text3)', fontWeight:500, marginLeft:8 }}>(inactivo)</span>}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>@{u.username}</div>
                  </div>

                  {/* Rol badge */}
                  <div style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99,
                    background: colors.bg, color: colors.color, border:`1px solid ${colors.border}`,
                    textTransform:'uppercase', letterSpacing:0.5 }}>
                    {u.rol}
                  </div>

                  {/* Cuentas */}
                  <div style={{ display:'flex', gap:4 }}>
                    {(u.cuentas || []).map(c => (
                      <span key={c} style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                        background:'var(--surface2)', color:'var(--text2)', border:'1px solid var(--border)' }}>
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Acciones */}
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => openEditar(u)}
                      style={{ fontSize:12, padding:'5px 12px', borderRadius:6, cursor:'pointer',
                        background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text2)' }}>
                      Editar
                    </button>
                    {u.activo ? (
                      <button onClick={() => handleDesactivar(u)}
                        style={{ fontSize:12, padding:'5px 12px', borderRadius:6, cursor:'pointer',
                          background:'var(--red-light)', border:'1px solid var(--red-border)', color:'var(--red)' }}>
                        Desactivar
                      </button>
                    ) : (
                      <button onClick={() => handleReactivar(u)}
                        style={{ fontSize:12, padding:'5px 12px', borderRadius:6, cursor:'pointer',
                          background:'var(--green-light)', border:'1px solid var(--green-border)', color:'var(--green)' }}>
                        Reactivar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {usuarios.length === 0 && !error && (
              <div style={{ color:'var(--text3)', fontSize:14, textAlign:'center', marginTop:32 }}>
                No hay usuarios registrados.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12,
            padding:'28px 32px', width:420, maxWidth:'90vw' }}>

            <h2 style={{ margin:'0 0 20px', fontSize:17, fontWeight:800 }}>
              {modal === 'crear' ? 'Nuevo usuario' : 'Editar usuario'}
            </h2>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Username - solo al crear */}
              {modal === 'crear' && (
                <div>
                  <label style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>Usuario *</label>
                  <input value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))}
                    placeholder="ej. maria_ops"
                    style={{ width:'100%', marginTop:4, padding:'8px 10px', borderRadius:6,
                      background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text)',
                      fontSize:13, boxSizing:'border-box' }} />
                </div>
              )}

              {/* Nombre */}
              <div>
                <label style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>Nombre completo</label>
                <input value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
                  placeholder="ej. Maria Lopez"
                  style={{ width:'100%', marginTop:4, padding:'8px 10px', borderRadius:6,
                    background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text)',
                    fontSize:13, boxSizing:'border-box' }} />
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>
                  {modal === 'editar' ? 'Nueva contrasena (dejar vacio para no cambiar)' : 'Contrasena *'}
                </label>
                <input type="password" value={form.password}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  placeholder={modal === 'editar' ? 'Sin cambios' : ''}
                  style={{ width:'100%', marginTop:4, padding:'8px 10px', borderRadius:6,
                    background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text)',
                    fontSize:13, boxSizing:'border-box' }} />
              </div>

              {/* Rol */}
              <div>
                <label style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>Rol</label>
                <select value={form.rol} onChange={e => setForm(f => ({...f, rol: e.target.value}))}
                  style={{ width:'100%', marginTop:4, padding:'8px 10px', borderRadius:6,
                    background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text)',
                    fontSize:13, boxSizing:'border-box' }}>
                  <option value="operador">Operador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Cuentas */}
              <div>
                <label style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>Cuentas asignadas</label>
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  {CUENTAS_OPTS.map(c => (
                    <button key={c} onClick={() => handleToggleCuenta(c)}
                      style={{ padding:'6px 14px', borderRadius:6, fontSize:13, fontWeight:700, cursor:'pointer',
                        background: form.cuentas.includes(c) ? 'var(--purple-light)' : 'var(--bg)',
                        color: form.cuentas.includes(c) ? 'var(--purple)' : 'var(--text3)',
                        border: form.cuentas.includes(c) ? '1.5px solid var(--purple-border)' : '1px solid var(--border)' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Botones */}
            <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)}
                style={{ padding:'8px 18px', borderRadius:7, border:'1px solid var(--border)',
                  background:'var(--bg)', color:'var(--text2)', fontSize:13, cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding:'8px 20px', borderRadius:7, border:'none',
                  background:'var(--purple)', color:'#fff', fontSize:13, fontWeight:700,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
