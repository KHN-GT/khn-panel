import { useState, useEffect, useMemo, useRef } from 'react'
import Topbar from '../components/Topbar'

const RAILWAY = 'https://worker-production-d575.up.railway.app'

function authHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('khn_token')}`, 'Content-Type': 'application/json' }
}

const CUENTA_COLORS = { GTK: 'var(--acct-gtk)', RBN: 'var(--acct-rbn)', GDP: 'var(--acct-gdp)' }
const ACCT = {
  GTK: { color:'var(--acct-gtk)', bg:'var(--acct-gtk-bg)', br:'var(--acct-gtk-br)' },
  RBN: { color:'var(--acct-rbn)', bg:'var(--acct-rbn-bg)', br:'var(--acct-rbn-br)' },
  GDP: { color:'var(--acct-gdp)', bg:'var(--acct-gdp-bg)', br:'var(--acct-gdp-br)' },
}

export default function Ventas({ onLogout }) {
  const [modo, setModo] = useState('pendientes')
  const [dias, setDias] = useState(7)
  const [cuenta, setCuenta] = useState('')
  const [ordenes, setOrdenes] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const [seguimientos, setSeguimientos] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingSeg, setLoadingSeg] = useState(false)
  const [modal, setModal] = useState(null)
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const debounceRef = useRef(null)
  const [shipmentStatuses, setShipmentStatuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('khn_shipment_cache') || '{}') } catch { return {} }
  })
  const [logisticTypes, setLogisticTypes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('khn_logistic_cache') || '{}') } catch { return {} }
  })
  const [refreshingShip, setRefreshingShip] = useState({})
  const [selectedOrders, setSelectedOrders] = useState(new Set())
  const [refreshingBulk, setRefreshingBulk] = useState(false)
  const [editingNota, setEditingNota] = useState(null)
  const [notaText, setNotaText] = useState('')
  const [savingNota, setSavingNota] = useState(false)
  const [copied, setCopied] = useState(null)

  const toggleSelect = (shipment_id, cuentaId) => {
    setSelectedOrders(prev => {
      const next = new Set(prev)
      const key = `${shipment_id}|${cuentaId}`
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const isSelectable = (o) => {
    if (!o.shipment_id) return false
    const st = shipmentStatuses[o.shipment_id] || o.shipping_status
    return st !== 'delivered' && st !== 'cancelled'
  }

  const toggleSelectAll = () => {
    const selectable = ordenesFiltradas.filter(isSelectable)
    const allKeys = selectable.map(o => `${o.shipment_id}|${o.cuenta}`)
    const allSelected = allKeys.length > 0 && allKeys.every(k => selectedOrders.has(k))
    if (allSelected) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(allKeys))
    }
  }

  const refreshSelected = async () => {
    if (selectedOrders.size === 0) return
    setRefreshingBulk(true)
    const entries = [...selectedOrders].map(k => { const [sid, c] = k.split('|'); return { shipment_id: sid, cuenta: c } })
    await Promise.all(entries.map(e => refreshShipment(e.shipment_id, e.cuenta)))
    setSelectedOrders(new Set())
    setRefreshingBulk(false)
  }

  const refreshShipment = async (shipment_id, cuentaId) => {
    if (!shipment_id) return
    setRefreshingShip(p => ({ ...p, [shipment_id]: true }))
    try {
      const r = await fetch(`${RAILWAY}/api/ventas/shipment/${shipment_id}?cuenta=${cuentaId}`, { headers: authHeaders() })
      const d = await r.json()
      if (d.status) {
        setShipmentStatuses(prev => {
          const next = { ...prev, [shipment_id]: d.status }
          localStorage.setItem('khn_shipment_cache', JSON.stringify(next))
          return next
        })
      }
      if (d.logistic_type) {
        setLogisticTypes(prev => {
          const next = { ...prev, [shipment_id]: d.logistic_type }
          localStorage.setItem('khn_logistic_cache', JSON.stringify(next))
          return next
        })
      }
    } catch {}
    finally { setRefreshingShip(p => ({ ...p, [shipment_id]: false })) }
  }

  const handleBusqueda = (val) => {
    setBusqueda(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setBusquedaDebounced(val), 300)
  }

  const segMap = useMemo(() => {
    const m = {}
    seguimientos.forEach(s => { if (s.orden_id) m[s.orden_id] = s })
    return m
  }, [seguimientos])

  const ordenesFiltradas = useMemo(() => {
    const q = busquedaDebounced.toLowerCase().trim()
    let list = ordenes
    if (q) {
      list = list.filter(o =>
        (o.orden_id || '').toLowerCase().includes(q) ||
        (o.comprador_nickname || '').toLowerCase().includes(q) ||
        (o.comprador_nombre || '').toLowerCase().includes(q) ||
        (o.producto || '').toLowerCase().includes(q) ||
        (o.sku || '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => (segMap[b.orden_id] ? 1 : 0) - (segMap[a.orden_id] ? 1 : 0))
  }, [ordenes, busquedaDebounced, segMap])

  const autoRefreshLogisticTypes = (lista) => {
    const cache = (() => { try { return JSON.parse(localStorage.getItem('khn_logistic_cache') || '{}') } catch { return {} } })()
    const missing = lista.filter(o => o.shipment_id && !cache[o.shipment_id])
    if (missing.length > 0) {
      Promise.all(missing.map(o => refreshShipment(o.shipment_id, o.cuenta)))
    }
  }

  const cacheKey = modo === 'historico' ? 'khn_ventas_hist_cache' : 'khn_ventas_cache'
  const cacheTTL = modo === 'historico' ? 15 * 60 * 1000 : 5 * 60 * 1000

  const cargarOrdenes = async (forceRefresh = false) => {
    const key = modo === 'historico' ? 'khn_ventas_hist_cache' : 'khn_ventas_cache'
    const ttl = modo === 'historico' ? 15 * 60 * 1000 : 5 * 60 * 1000
    if (!forceRefresh) {
      try {
        const cached = JSON.parse(localStorage.getItem(key) || 'null')
        if (cached && cached.cuenta === cuenta && cached.modo === modo
            && (modo !== 'historico' || cached.dias === dias)
            && (Date.now() - cached.ts) < ttl) {
          setOrdenes(cached.ordenes)
          setLastUpdate(new Date(cached.ts))
          autoRefreshLogisticTypes(cached.ordenes)
          return
        }
      } catch {}
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (cuenta) params.set('cuenta', cuenta)
      if (modo === 'historico') {
        params.set('modo', 'historico')
        params.set('dias', String(dias))
      }
      const r = await fetch(`${RAILWAY}/api/ventas?${params}`, { headers: authHeaders() })
      const d = await r.json()
      const lista = d.ordenes || []
      const now = Date.now()
      setOrdenes(lista)
      setLastUpdate(new Date(now))
      localStorage.setItem(key, JSON.stringify({ ordenes: lista, cuenta, modo, dias, ts: now }))
      autoRefreshLogisticTypes(lista)
      // Resolve missing thumbnails in background
      const missing = lista.filter(o => o.item_id && !o.thumbnail).map(o => o.item_id)
      if (missing.length > 0) {
        fetch(`${RAILWAY}/api/ventas/resolve-thumbnails`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ item_ids: [...new Set(missing)] })
        }).then(r => r.json()).then(thumbs => {
          if (thumbs && typeof thumbs === 'object' && !thumbs.error) {
            setOrdenes(prev => prev.map(o =>
              o.item_id && thumbs[o.item_id] ? { ...o, thumbnail: thumbs[o.item_id] } : o
            ))
          }
        }).catch(() => {})
      }
    } catch { setOrdenes([]) }
    finally { setLoading(false) }
  }

  const cargarSeguimientos = async () => {
    setLoadingSeg(true)
    try {
      const r = await fetch(`${RAILWAY}/api/seguimientos`, { headers: authHeaders() })
      const d = await r.json()
      setSeguimientos(d.seguimientos || [])
    } catch { setSeguimientos([]) }
    finally { setLoadingSeg(false) }
  }

  useEffect(() => { setSelectedOrders(new Set()); cargarOrdenes() }, [cuenta, modo, dias])
  useEffect(() => { cargarSeguimientos() }, [])

  const crearSeguimiento = async () => {
    if (!modal) return
    setSaving(true)
    try {
      await fetch(`${RAILWAY}/api/seguimientos`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ ...modal, notas })
      })
      setModal(null); setNotas('')
      await cargarOrdenes(true)
      await cargarSeguimientos()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const desactivarSeguimiento = async (id) => {
    try {
      await fetch(`${RAILWAY}/api/seguimientos/${id}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ activo: false })
      })
      await cargarSeguimientos()
      await cargarOrdenes(true)
    } catch (e) { alert('Error: ' + e.message) }
  }

  const pinOrder = async (o) => {
    try {
      await fetch(`${RAILWAY}/api/seguimientos`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          orden_id: o.orden_id, cuenta: o.cuenta, producto: o.producto,
          sku: o.sku, comprador_nickname: o.comprador_nickname, notas: ''
        })
      })
      await cargarSeguimientos()
    } catch {}
  }

  const unpinOrder = async (segId) => {
    try {
      await fetch(`${RAILWAY}/api/seguimientos/${segId}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ activo: false })
      })
      await cargarSeguimientos()
    } catch {}
  }

  const saveOrderNota = async (segId) => {
    setSavingNota(true)
    try {
      await fetch(`${RAILWAY}/api/seguimientos/${segId}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ notas: notaText })
      })
      await cargarSeguimientos()
      setEditingNota(null)
    } catch {}
    setSavingNota(false)
  }

  const statusBadge = (st) => {
    const map = {
      delivered: { bg: '#ecfdf5', c: '#059669', b: '#a7f3d0' },
      shipped: { bg: '#eff6ff', c: '#2563eb', b: '#bfdbfe' },
      ready_to_ship: { bg: '#fefce8', c: '#d97706', b: '#fde68a' },
      pending: { bg: '#f5f5f5', c: '#737373', b: '#d4d4d4' },
      cancelled: { bg: '#fef2f2', c: '#dc2626', b: '#fecaca' },
      paid: { bg: '#ecfdf5', c: '#059669', b: '#a7f3d0' },
    }
    const s = map[st] || map.pending
    return (
      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
        background: s.bg, color: s.c, border: `1px solid ${s.b}` }}>
        {st === 'cancelled' ? 'Cancelada' : st || 'pendiente'}
      </span>
    )
  }

  const shippingBadge = (st) => {
    const map = {
      ready_to_ship: { bg: '#ecfdf5', c: '#059669', b: '#a7f3d0', label: 'Listo p/enviar' },
      shipped:       { bg: '#eff6ff', c: '#2563eb', b: '#bfdbfe', label: 'Enviado' },
      delivered:     { bg: '#f5f5f5', c: '#737373', b: '#d4d4d4', label: 'Entregado' },
      pending:       { bg: '#fefce8', c: '#d97706', b: '#fde68a', label: 'Pendiente' },
      cancelled:     { bg: '#fef2f2', c: '#dc2626', b: '#fecaca', label: 'Cancelado' },
    }
    const s = map[st] || { bg: '#f5f5f5', c: '#737373', b: '#d4d4d4', label: st || 'pendiente' }
    return (
      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
        background: s.bg, color: s.c, border: `1px solid ${s.b}` }}>
        {s.label}
      </span>
    )
  }

  const formatMonto = (m) => m != null ? `$${Number(m).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(prev => prev === key ? null : prev), 1500)
  }

  const tabStyle = (active) => ({
    padding: '8px 20px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
    borderRadius: '8px 8px 0 0', background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--purple)' : 'var(--text3)',
    borderBottom: active ? '2px solid var(--purple)' : '2px solid transparent',
  })

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <Topbar onLogout={onLogout} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', maxWidth: 1300, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1.5px solid var(--border)' }}>
          <button onClick={() => setModo('pendientes')} style={tabStyle(modo === 'pendientes')}>
            Pendientes de envio
          </button>
          <button onClick={() => setModo('historico')} style={tabStyle(modo === 'historico')}>
            Historial
          </button>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <select value={cuenta} onChange={e => setCuenta(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
              fontSize: 13, background: 'var(--surface)' }}>
            <option value="">Todas</option>
            <option value="GTK">GTK</option>
            <option value="RBN">RBN</option>
            <option value="GDP">GDP</option>
          </select>
          {modo === 'historico' && (
            <select value={dias} onChange={e => setDias(Number(e.target.value))}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                fontSize: 13, background: 'var(--surface)' }}>
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
            </select>
          )}
          <input type="text" value={busqueda} onChange={e => handleBusqueda(e.target.value)}
            placeholder="Buscar por orden, comprador, SKU..."
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
              fontSize: 13, background: 'var(--surface)', width: 240 }} />
          <label style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer', fontSize:12, color:'var(--text2)' }}>
            <input type="checkbox" checked={ordenesFiltradas.filter(isSelectable).length > 0 && ordenesFiltradas.filter(isSelectable).every(o => selectedOrders.has(`${o.shipment_id}|${o.cuenta}`))}
              onChange={toggleSelectAll} style={{ cursor:'pointer' }} />
            Todas
          </label>
          {selectedOrders.size > 0 ? (
            <button onClick={refreshSelected} disabled={refreshingBulk}
              style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer',
                opacity: refreshingBulk ? 0.6 : 1 }}>
              {refreshingBulk ? 'Actualizando...' : `\uD83D\uDD04 Actualizar (${selectedOrders.size})`}
            </button>
          ) : (
            <button onClick={() => { cargarOrdenes(true); cargarSeguimientos() }}
              style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Actualizar
            </button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {loading ? 'Cargando...' : `${ordenesFiltradas.length} ordenes`}
          </span>
          {lastUpdate && !loading && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              Actualizado a las {lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Ordenes - card layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>Cargando ordenes...</div>
          ) : ordenesFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
              {modo === 'historico' ? 'Sin ordenes en este rango' : 'Sin ordenes pendientes'}
            </div>
          ) : ordenesFiltradas.map((o, i) => {
            const seg = segMap[o.orden_id]
            const isPinned = !!seg
            const ac = ACCT[o.cuenta] || { color:'var(--text3)', bg:'var(--surface2)', br:'var(--border)' }
            const isFull = (logisticTypes[o.shipment_id] || o.logistic_type) === 'fulfillment'
            return (
              <div key={o.orden_id + i} className="animate-in" style={{
                background: isPinned ? '#fffbeb' : isFull ? 'rgba(59, 130, 246, 0.06)' : 'var(--surface)',
                border: isPinned ? '1.5px solid #fde68a' : isFull ? '0.5px solid rgba(59, 130, 246, 0.2)' : '0.5px solid var(--border)',
                borderRadius: 10, overflow: 'hidden', position: 'relative' }}>

                {/* Pin button */}
                <button onClick={() => isPinned ? unpinOrder(seg.id) : pinOrder(o)}
                  title={isPinned ? 'Despinear' : 'Pinear'}
                  style={{ position: 'absolute', top: 8, left: 8, zIndex: 5, fontSize: 13, lineHeight: 1,
                    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 6, border: isPinned ? '1px solid #fde68a' : '1px solid var(--border)',
                    background: isPinned ? '#fef3c7' : 'var(--surface)', cursor: 'pointer',
                    opacity: isPinned ? 1 : 0.4, transition: 'opacity 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => { if (!isPinned) e.currentTarget.style.opacity = 0.4 }}>
                  {'\uD83D\uDCCC'}
                </button>

                <div style={{ display: 'flex', gap: 0 }}>
                  {/* Left: thumbnail only */}
                  <div style={{ width: 140, flexShrink: 0, padding: 10, borderRight: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isPinned ? '#fefce8' : 'var(--surface2)' }}>
                    {o.thumbnail ? (
                      <img src={o.thumbnail} alt=""
                        style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: '100%', height: 80, borderRadius: 6, background: 'var(--surface)',
                        border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center' }}>
                        <span style={{ fontSize: 32, opacity: 0.3 }}>{'\uD83D\uDCE6'}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: all info */}
                  <div style={{ flex: 1, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    {/* Row 1: status + pin badge + date + comprador + checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {statusBadge(o.status)}
                      {isPinned && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                          {'\uD83D\uDCCC'} Pineada
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {o.fecha ? new Date(o.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          + ' ' + new Date(o.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        {o.comprador_nickname || 'Comprador'}
                      </span>
                      {o.comprador_nombre && (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{o.comprador_nombre}</span>
                      )}
                      {isSelectable(o) && (
                        <input type="checkbox"
                          checked={selectedOrders.has(`${o.shipment_id}|${o.cuenta}`)}
                          onChange={() => toggleSelect(o.shipment_id, o.cuenta)}
                          style={{ cursor: 'pointer', marginLeft: 'auto' }} />
                      )}
                    </div>

                    {/* Row 2: product title */}
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4,
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {o.producto || '-'}
                    </div>

                    {/* Row 3: price + SKU + cuenta + FULL */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{formatMonto(o.monto)}</span>
                      {o.sku && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>SKU: {o.sku}</span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 4, background: ac.bg, color: ac.color, border: `1px solid ${ac.br}` }}>
                        {o.cuenta}
                      </span>
                      {(logisticTypes[o.shipment_id] || o.logistic_type) === 'fulfillment' && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                          background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>FULL</span>
                      )}
                    </div>

                    {/* Row 4: copiable chips + orden link */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {o.item_id && (
                        <span onClick={() => copyToClipboard(o.item_id, `item_${o.orden_id}`)}
                          title="Copiar Item ID"
                          style={{ fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)',
                            borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: 'var(--text3)' }}>
                          {copied === `item_${o.orden_id}` ? '\u2713' : `ID: ${o.item_id}`}
                        </span>
                      )}
                      <span onClick={() => copyToClipboard(o.orden_id, `orden_${o.orden_id}`)}
                        title="Copiar numero de orden"
                        style={{ fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)',
                          borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: 'var(--text3)' }}>
                        {copied === `orden_${o.orden_id}` ? '\u2713' : `#${o.orden_id}`}
                      </span>
                      <span onClick={() => copyToClipboard(`https://www.mercadolibre.com.mx/ventas/${o.orden_id}/detalle`, `ml_${o.orden_id}`)}
                        title="Copiar link ML"
                        style={{ fontSize: 11, color: 'var(--purple)', cursor: 'pointer', fontWeight: 600 }}>
                        {copied === `ml_${o.orden_id}` ? '\u2713 Copiado' : `Ver en ML \u2197`}
                      </span>
                    </div>

                    {/* Row 5: shipping + refresh + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {shippingBadge(shipmentStatuses[o.shipment_id] || o.shipping_status)}
                      {o.shipment_id && (
                        <button onClick={() => refreshShipment(o.shipment_id, o.cuenta)}
                          disabled={refreshingShip[o.shipment_id]}
                          title="Actualizar estado de envio"
                          style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                            background: 'none', border: '1px solid var(--border)', color: 'var(--text3)',
                            opacity: refreshingShip[o.shipment_id] ? 0.4 : 1 }}>
                          {'\uD83D\uDD04'}
                        </button>
                      )}
                      {(o.tiene_seguimiento && !isPinned) ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: 'var(--purple-light)', color: 'var(--purple)', border: '1px solid var(--purple-border)' }}>
                          Seguimiento
                        </span>
                      ) : (!isPinned && (
                        <button onClick={() => { setModal(o); setNotas('') }}
                          title="Crear seguimiento"
                          style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                            background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                          Seguimiento
                        </button>
                      ))}
                      {o.shipment_id && (
                        <a href={`https://www.mercadolibre.com.mx/envios/detalle/${o.shipment_id}`}
                          target="_blank" rel="noopener noreferrer" title="Ver guia de envio"
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                            background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)',
                            textDecoration: 'none', fontWeight: 600 }}>
                          {'\uD83D\uDCCB'} Guia
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pin nota */}
                {isPinned && (
                  <div style={{ padding: '6px 16px 8px', background: '#fffbeb',
                    borderTop: '1px dashed #fde68a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>Nota:</span>
                    {editingNota === seg.id ? (
                      <>
                        <input type="text" value={notaText}
                          onChange={e => setNotaText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveOrderNota(seg.id) }}
                          placeholder="Nota del pin..."
                          style={{ flex: 1, fontSize: 12, padding: '3px 8px', borderRadius: 4,
                            border: '1px solid #fde68a', background: '#fffbeb', color: 'var(--text)',
                            maxWidth: 400 }} />
                        <button onClick={() => saveOrderNota(seg.id)} disabled={savingNota}
                          style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
                            background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer',
                            opacity: savingNota ? 0.6 : 1 }}>
                          Guardar
                        </button>
                        <button onClick={() => setEditingNota(null)}
                          style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4,
                            border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text3)', cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                        onClick={() => { setEditingNota(seg.id); setNotaText(seg.notas || '') }}>
                        <span style={{ fontSize: 12, color: '#b45309', fontStyle: seg.notas ? 'normal' : 'italic' }}>
                          {seg.notas || 'Agregar nota...'}
                        </span>
                        <span style={{ fontSize: 10, color: '#d97706' }}>{'\u270F\uFE0F'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Seguimientos activos - solo en modo pendientes */}
        {modo === 'pendientes' && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>
            Seguimientos activos
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', marginLeft: 8 }}>
              {seguimientos.length} total
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadingSeg ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Cargando...</div>
            ) : seguimientos.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Sin seguimientos activos</div>
            ) : seguimientos.map(s => {
              const ac = ACCT[s.cuenta] || ACCT.GTK
              return (
              <div key={s.id} className="animate-in"
                style={{ background: 'var(--surface)', border: '0.5px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', gap: 0 }}>
                  {/* Left: thumbnail placeholder */}
                  <div style={{ width: 140, flexShrink: 0, padding: 10, borderRight: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)' }}>
                    <div style={{ width: '100%', height: 80, borderRadius: 6, background: 'var(--surface)',
                      border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center' }}>
                      <span style={{ fontSize: 32, opacity: 0.3 }}>{'\uD83D\uDCE6'}</span>
                    </div>
                  </div>

                  {/* Right: info */}
                  <div style={{ flex: 1, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    {/* Row 1: cuenta badge + comprador + estado envio */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 4, background: ac.bg, color: ac.color, border: `1px solid ${ac.br}` }}>
                        {s.cuenta}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        {s.comprador_nickname || 'Comprador'}
                      </span>
                      {s.comprador_nombre && (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.comprador_nombre}</span>
                      )}
                      <span style={{ marginLeft: 'auto' }}>{shippingBadge(s.estado_envio)}</span>
                    </div>

                    {/* Row 2: producto */}
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4,
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {s.producto || '-'}
                    </div>

                    {/* Row 3: monto + SKU + mensaje badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{formatMonto(s.monto)}</span>
                      {s.sku && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>SKU: {s.sku}</span>
                      )}
                      {s.mensaje_enviado
                        ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                            background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>Mensaje enviado</span>
                        : <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                            background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)' }}>Sin mensaje</span>}
                    </div>

                    {/* Row 4: notas (si hay) */}
                    {s.notas && (
                      <div style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6,
                        background: '#fefce8', border: '1px solid #fde68a', color: '#92400e' }}>
                        {s.notas}
                      </div>
                    )}

                    {/* Row 5: boton quitar */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => desactivarSeguimiento(s.id)}
                        style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                          background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)',
                          fontWeight: 600 }}>
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        </div>
        )}
      </div>

      {/* Modal crear seguimiento */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setModal(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, width: 420,
              boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Crear seguimiento</h3>
            <div style={{ fontSize: 13, marginBottom: 12, color: 'var(--text2)' }}>
              <div><b>Orden:</b> {modal.orden_id}</div>
              <div><b>Comprador:</b> {modal.comprador_nickname} ({modal.comprador_nombre})</div>
              <div><b>Producto:</b> {modal.producto}</div>
              <div><b>Monto:</b> {formatMonto(modal.monto)}</div>
              <div><b>Cuenta:</b> {modal.cuenta}</div>
            </div>
            <textarea value={notas} onChange={e => setNotas(e.target.value)}
              placeholder="Notas (opcional)..."
              rows={3}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)',
                fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                Cancelar
              </button>
              <button onClick={crearSeguimiento} disabled={saving}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', background: 'var(--purple)', color: '#fff', border: 'none',
                  opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar seguimiento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
