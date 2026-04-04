import Topbar from '../components/Topbar'
import { useState, useEffect } from 'react'

const RAILWAY = 'https://worker-production-d575.up.railway.app'

const ACCION_LABELS = {
  'auto_enviado':     { label: 'Auto enviada', color: '#6366f1', bg: '#eef2ff' },
  'aprobado_humano':  { label: 'Aprobada', color: '#059669', bg: '#ecfdf5' },
  'editado_humano':   { label: 'Editada', color: '#d97706', bg: '#fffbeb' },
  'fuera_horario':    { label: 'Fuera horario', color: '#9aa0b8', bg: '#f0f2f7' },
}

export default function Supervision({ onLogout }) {
  const [items, setItems]           = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(false)
  const [filtCuenta, setFiltCuenta]     = useState('')
  const [filtError, setFiltError]       = useState('')
  const [filtDesde, setFiltDesde]       = useState('')
  const [filtHasta, setFiltHasta]       = useState('')
  const [filtRespondido, setFiltRespondido] = useState('')
  const [busqueda, setBusqueda]             = useState('')
  const [offset, setOffset]         = useState(0)
  const [corrModal, setCorrModal]   = useState(null)  // {id, mensaje, respuesta_ia}
  const [corrTexto, setCorrTexto]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [success, setSuccess]       = useState('')
  const [canalTab, setCanalTab]     = useState('pre_compra')
  const LIMIT = 30

  const load = async (off = 0) => {
    setLoading(true)
    const tok = localStorage.getItem('khn_token')
    let url = `${RAILWAY}/api/feedback?limit=${LIMIT}&offset=${off}&canal=${canalTab}`
    if (filtCuenta)     url += `&cuenta=${filtCuenta}`
    if (filtError)      url += `&es_error=${filtError}`
    if (filtDesde)      url += `&fecha_desde=${filtDesde}`
    if (filtHasta)      url += `&fecha_hasta=${filtHasta}`
    if (filtRespondido) url += `&respondido_por=${filtRespondido}`
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } })
      const d = await r.json()
      setItems(d.items || [])
      setTotal(d.total || 0)
      setOffset(off)
    } catch { setItems([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(0) }, [filtCuenta, filtError, filtDesde, filtHasta, filtRespondido, canalTab])

  const handleCorregir = async () => {
    if (!corrTexto.trim()) return
    setSaving(true)
    const tok = localStorage.getItem('khn_token')
    try {
      const r = await fetch(`${RAILWAY}/api/feedback/${corrModal.id}/corregir`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ correccion: corrTexto })
      })
      const d = await r.json()
      if (d.ok) {
        setSuccess('Corrección guardada y agregada al entrenamiento')
        setCorrModal(null); setCorrTexto('')
        load(offset)
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch {}
    finally { setSaving(false) }
  }

  const fmtFecha = (s) => {
    if (!s) return ''
    try { return new Date(s).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) }
    catch { return s }
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>
      <Topbar onLogout={onLogout} />

      {/* Header */}
      <div style={{ padding:'16px 24px', borderBottom:'1.5px solid var(--border)', background:'var(--surface)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <button onClick={() => window.history.back()}
            style={{ fontSize:14, fontWeight:600, padding:'5px 12px', borderRadius:'var(--radius-sm)',
              border:'1px solid var(--border)', background:'transparent', color:'var(--text3)', cursor:'pointer' }}>
            ← Volver
          </button>
          <span style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>Historial de Preguntas</span>
          <span style={{ fontSize:13, color:'var(--text3)' }}>{total} registros</span>
          {success && <span style={{ fontSize:13, fontWeight:600, color:'var(--green)' }}>{success}</span>}
          <div style={{ marginLeft:'auto' }}>
            <button onClick={() => {
              const rows = [['Fecha','Cuenta','Pregunta','Respuesta','Respondido por','Usuario','Confianza']]
              items.forEach(i => rows.push([
                i.creado_en || '', i.cuenta || '', `"${(i.mensaje_cliente||'').replace(/"/g,'""')}"`,
                `"${(i.respuesta_final||i.respuesta_ia||'').replace(/"/g,'""')}"`,
                i.respondido_por || 'IA', i.usuario_respuesta || '', i.confianza_ia || ''
              ]))
              const csv = rows.map(r => r.join(',')).join('\n')
              const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
              a.download = `historial_preguntas_${new Date().toISOString().slice(0,10)}.csv`
              a.click()
            }}
              style={{ fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:'var(--radius-sm)',
                border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text2)', cursor:'pointer' }}>
              Exportar CSV
            </button>
          </div>
        </div>
        {/* Tabs canal */}
        <div style={{ display:'flex', gap:0, marginBottom:10, borderBottom:'2px solid var(--border)' }}>
          {[
            { key:'pre_compra', label:'Pre-compra' },
            { key:'post_venta', label:'Post-venta' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setCanalTab(tab.key)}
              style={{
                padding:'7px 20px', fontSize:13, fontWeight:600, cursor:'pointer',
                background:'none', border:'none',
                color: canalTab === tab.key ? 'var(--purple)' : 'var(--text3)',
                borderBottom: canalTab === tab.key ? '2px solid var(--purple)' : '2px solid transparent',
                marginBottom:-2, transition:'all .15s',
              }}>{tab.label}</button>
          ))}
        </div>
        {/* Filtros */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <select value={filtCuenta} onChange={e => setFiltCuenta(e.target.value)}
            style={{ fontSize:13, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', cursor:'pointer' }}>
            <option value=''>Todas las cuentas</option>
            <option value='GTK'>GTK</option>
            <option value='RBN'>RBN</option>
            <option value='GDP'>GDP</option>
          </select>
          <select value={filtError} onChange={e => setFiltError(e.target.value)}
            style={{ fontSize:13, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', cursor:'pointer' }}>
            <option value=''>Todos</option>
            <option value='false'>Sin errores</option>
            <option value='true'>Marcados como error</option>
          </select>
          <select value={filtRespondido} onChange={e => setFiltRespondido(e.target.value)}
            style={{ fontSize:13, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', cursor:'pointer' }}>
            <option value=''>Respondido por: Todos</option>
            <option value='IA'>IA</option>
            <option value='humano'>Humano</option>
          </select>
          <span style={{ fontSize:12, color:'var(--text3)' }}>Desde</span>
          <input type='date' value={filtDesde} onChange={e => setFiltDesde(e.target.value)}
            style={{ fontSize:13, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' }} />
          <span style={{ fontSize:12, color:'var(--text3)' }}>Hasta</span>
          <input type='date' value={filtHasta} onChange={e => setFiltHasta(e.target.value)}
            style={{ fontSize:13, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' }} />
          <input type='text' value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder='Buscar en pregunta o respuesta...'
            style={{ fontSize:13, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', minWidth:220 }} />
          <button onClick={() => { setFiltCuenta(''); setFiltError(''); setFiltDesde(''); setFiltHasta(''); setFiltRespondido(''); setBusqueda('') }}
            style={{ fontSize:13, padding:'6px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'transparent', color:'var(--text3)', cursor:'pointer' }}>
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:40, fontSize:14, color:'var(--text3)' }}>Cargando...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, fontSize:14, color:'var(--text3)' }}>Sin registros</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {items.filter(item => {
              if (!busqueda.trim()) return true
              const q = busqueda.toLowerCase()
              return (item.mensaje_cliente || '').toLowerCase().includes(q) ||
                     (item.respuesta_final || item.respuesta_ia || '').toLowerCase().includes(q)
            }).map(item => {
              const acInfo = ACCION_LABELS[item.accion] || { label: item.accion, color:'var(--text3)', bg:'var(--surface2)' }
              return (
                <div key={item.id} style={{
                  background:'var(--surface)', border:`1.5px solid ${item.es_error ? 'var(--red-border)' : 'var(--border)'}`,
                  borderRadius:'var(--radius)', padding:'14px 16px',
                  borderLeft: `4px solid ${item.es_error ? 'var(--red)' : acInfo.color}`
                }}>
                  {/* Fila superior */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:99, background:acInfo.bg, color:acInfo.color }}>
                      {acInfo.label}
                    </span>
                    <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:5, background:'var(--surface2)', color:'var(--text2)', border:'1px solid var(--border)' }}>
                      {item.cuenta}
                    </span>
                    {item.respondido_por === 'humano' ? (
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'#ecfdf5', color:'#059669', border:'1px solid #a7f3d0' }}>
                        👤 {item.usuario_respuesta || 'Humano'}
                      </span>
                    ) : (
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'#eef2ff', color:'#6366f1', border:'1px solid #c7d2fe' }}>
                        IA Automática
                      </span>
                    )}
                    <span style={{ fontSize:12, color:'var(--text3)' }}>Agente: {item.agente}</span>
                    <span style={{ fontSize:12, color:'var(--text3)' }}>Confianza: {item.confianza_ia}</span>
                    <span style={{ fontSize:12, color:'var(--text3)', marginLeft:'auto' }}>{fmtFecha(item.creado_en)}</span>
                    {item.es_error && (
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--red)', padding:'2px 8px', borderRadius:99, background:'var(--red-light)', border:'1px solid var(--red-border)' }}>
                        ⚠ Error marcado
                      </span>
                    )}
                  </div>
                  {/* Pregunta */}
                  <div style={{ fontSize:13, color:'var(--text2)', marginBottom:6, fontStyle:'italic' }}>
                    "{item.mensaje_cliente}"
                  </div>
                  {/* Respuesta IA */}
                  <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.55, marginBottom:8 }}>
                    {item.respuesta_final || item.respuesta_ia}
                  </div>
                  {/* Corrección previa */}
                  {item.es_error && item.correccion_humana && (
                    <div style={{ fontSize:13, color:'var(--green)', background:'var(--green-light)', border:'1px solid var(--green-border)', borderRadius:'var(--radius-sm)', padding:'8px 12px', marginBottom:8 }}>
                      ✓ Corrección: {item.correccion_humana}
                    </div>
                  )}
                  {/* Botón corregir */}
                  {item.accion === 'corregido_post_envio' ? (
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--green)', padding:'3px 10px', borderRadius:99, background:'var(--green-light)', border:'1px solid var(--green-border)', display:'inline-flex', alignItems:'center', gap:4 }}>
                      ✓ Ya corregida
                    </span>
                  ) : item.es_error ? (
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--green)', display:'inline-flex', alignItems:'center', gap:4 }}>
                      Ya corregida
                    </span>
                  ) : (
                    <button
                      onClick={() => { setCorrModal(item); setCorrTexto('') }}
                      style={{ fontSize:12, fontWeight:600, padding:'5px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--red-border)', background:'var(--red-light)', color:'var(--red)', cursor:'pointer' }}>
                      Marcar como error
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Paginación */}
        {total > LIMIT && (
          <div style={{ display:'flex', justifyContent:'center', gap:10, padding:'16px 0' }}>
            <button onClick={() => load(Math.max(0, offset - LIMIT))} disabled={offset === 0}
              style={{ fontSize:13, padding:'6px 16px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', cursor:'pointer', opacity: offset === 0 ? .4 : 1 }}>
              ← Anterior
            </button>
            <span style={{ fontSize:13, color:'var(--text3)', padding:'6px 0' }}>
              {Math.floor(offset/LIMIT)+1} / {Math.ceil(total/LIMIT)}
            </span>
            <button onClick={() => load(offset + LIMIT)} disabled={offset + LIMIT >= total}
              style={{ fontSize:13, padding:'6px 16px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--surface)', cursor:'pointer', opacity: offset+LIMIT >= total ? .4 : 1 }}>
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Modal corrección */}
      {corrModal && (
        <div onClick={() => setCorrModal(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'var(--surface)', borderRadius:'var(--radius)', padding:'24px', width:560, maxWidth:'95vw', boxShadow:'0 8px 32px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:12 }}>Marcar respuesta como error</div>
            <div style={{ fontSize:13, color:'var(--text2)', background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'10px 14px', marginBottom:4, fontStyle:'italic' }}>
              "{corrModal.mensaje_cliente}"
            </div>
            <div style={{ fontSize:13, color:'var(--text3)', marginBottom:16 }}>
              Respuesta IA: {corrModal.respuesta_ia?.slice(0, 120)}...
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:6 }}>
              Escribe la respuesta correcta:
            </div>
            <textarea
              value={corrTexto}
              onChange={e => setCorrTexto(e.target.value)}
              rows={5}
              placeholder="Escribe aquí la respuesta correcta que la IA debería haber dado..."
              style={{ width:'100%', fontSize:14, padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--border)', outline:'none', fontFamily:'inherit', lineHeight:1.55, resize:'vertical', color:'var(--text)', background:'var(--surface)' }}
              autoFocus
            />
            <div style={{ display:'flex', gap:10, marginTop:16, justifyContent:'flex-end' }}>
              <button onClick={() => setCorrModal(null)}
                style={{ fontSize:13, padding:'8px 18px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'transparent', color:'var(--text3)', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleCorregir} disabled={saving || !corrTexto.trim()}
                style={{ fontSize:13, fontWeight:700, padding:'8px 20px', borderRadius:'var(--radius-sm)', border:'none', background:'var(--red)', color:'#fff', cursor:'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar corrección'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
