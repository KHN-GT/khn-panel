import { useState, useEffect, useCallback, useRef } from "react"
import { useSound } from "./useSound"

const RAILWAY = "https://worker-production-d575.up.railway.app"

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("khn_token")
  const r = await fetch(RAILWAY + path, {
    ...opts,
    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
  })
  if (r.status === 401) { localStorage.removeItem("khn_token"); window.location.href = "/login"; return null }
  return r.json()
}

export function useInbox(filters = {}) {
  const [items, setItems] = useState([])
  const { playAlert } = useSound()
  const prevIdsRef = useRef(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const fetchInbox = useCallback(async () => {
    try {
      const params = filters.cuenta ? "?cuenta=" + filters.cuenta : ""
      const data = await apiFetch("/api/inbox" + params)
      if (data) {
        const newItems = data.items || []
        // Detectar items genuinamente nuevos (no en el set anterior)
        if (prevIdsRef.current.size > 0) {
          const added = newItems.filter(i => !prevIdsRef.current.has(i.id))
          // Disparar una alerta por tipo (prioridad: RECLAMO > POST-VENTA > PRE-COMPRA)
          const tipos = ['RECLAMO', 'POST-VENTA', 'PRE-COMPRA']
          for (const tipo of tipos) {
            if (added.some(i => i.tipo === tipo)) {
              playAlert(tipo)
              break // solo un sonido a la vez
            }
          }
        }
        prevIdsRef.current = new Set(newItems.map(i => i.id))
        setItems(newItems)
        setError(null)
      }
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }, [filters.cuenta, playAlert])

  useEffect(() => {
    fetchInbox()
    pollRef.current = setInterval(fetchInbox, 30000)
    // Escuchar evento inbox-refresh (disparado por handleEspera)
    window.addEventListener('inbox-refresh', fetchInbox)
    return () => {
      clearInterval(pollRef.current)
      window.removeEventListener('inbox-refresh', fetchInbox)
    }
  }, [fetchInbox])

  const approve = async (id, respuesta) => {
    const data = await apiFetch("/api/inbox/" + id + "/approve", { method: "POST", body: JSON.stringify({ respuesta }) })
    setItems(prev => prev.filter(i => i.id !== id))
    return data
  }
  const discard = async (id) => {
    await apiFetch("/api/inbox/" + id + "/discard", { method: "POST" })
    setItems(prev => prev.filter(i => i.id !== id))
  }
  const correct = async (id, correccion) =>
    apiFetch("/api/inbox/" + id + "/correct", { method: "POST", body: JSON.stringify({ correccion }) })
  const addItem = useCallback((item) =>
    setItems(prev => prev.some(i => i.id === item.id) ? prev : item.tipo === "RECLAMO" ? [item, ...prev] : [...prev, item]), [])
  const updateItem = useCallback((update) =>
    setItems(prev => prev.map(i => i.id === update.id ? { ...i, ...update } : i)), [])

  return { items, loading, error, approve, discard, correct, addItem, updateItem, refresh: fetchInbox }
}
