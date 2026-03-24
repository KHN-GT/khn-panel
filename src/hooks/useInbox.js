import { useState, useEffect, useCallback, useRef } from "react"
const RAILWAY = "https://worker-production-d575.up.railway.app"
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("khn_token")
  const resp = await fetch(`${RAILWAY}${path}`, { ...options, headers: {"Authorization":`Bearer ${token}`,"Content-Type":"application/json",...options.headers} })
  if (resp.status === 401) { localStorage.removeItem("khn_token"); window.location.href = "/login"; return null }
  return resp.json()
}
export function useInbox(filters = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)
  const fetchInbox = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.cuenta) params.set("cuenta", filters.cuenta)
      const data = await apiFetch(`/api/inbox?${params}`)
      if (data) { setItems(data.items || []); setError(null) }
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }, [filters.cuenta])
  useEffect(() => {
    fetchInbox()
    pollRef.current = setInterval(fetchInbox, 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchInbox])
  const approve = async (id, respuesta) => { const data = await apiFetch(`/api/inbox/${id}/approve`, {method:"POST",body:JSON.stringify({respuesta})}); setItems(prev=>prev.filter(i=>i.id!==id)); return data }
  const discard = async (id) => { await apiFetch(`/api/inbox/${id}/discard`, {method:"POST"}); setItems(prev=>prev.filter(i=>i.id!==id)) }
  const correct = async (id, correccion) => apiFetch(`/api/inbox/${id}/correct`, {method:"POST",body:JSON.stringify({correccion})})
  const addItem = useCallback((item) => setItems(prev=>prev.some(i=>i.id===item.id)?prev:item.tipo==="RECLAMO"?[item,...prev]:[...prev,item]), [])
  const updateItem = useCallback((update) => setItems(prev=>prev.map(i=>i.id===update.id?{...i,...update}:i)), [])
  return { items, loading, error, approve, discard, correct, addItem, updateItem, refresh: fetchInbox }
}
