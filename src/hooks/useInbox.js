import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/client'

export function useInbox(filters = {}) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const pollRef               = useRef(null)

  const fetchInbox = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.cuenta) params.set('cuenta', filters.cuenta)
      if (filters.tipo)   params.set('tipo',   filters.tipo)
      // Llamada directa a Railway via axios (baseURL hardcodeada en client.js)
      const { data } = await api.get(`/api/inbox?${params}`)
      setItems(data.items || [])
      setError(null)
    } catch (e) {
      // Solo mostrar error si no es un abort por desmontar el componente
      if (e.code !== 'ERR_CANCELED') {
        setError(e.response?.data?.error || e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [filters.cuenta, filters.tipo])

  useEffect(() => {
    fetchInbox()
    // Polling de respaldo cada 30s (SSE es el canal principal cuando funciona)
    pollRef.current = setInterval(fetchInbox, 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchInbox])

  const addItem = useCallback((item) => {
    setItems(prev => {
      if (prev.some(i => i.id === item.id)) return prev
      if (item.tipo === 'RECLAMO') return [item, ...prev]
      return [...prev, item]
    })
    if (item.tipo === 'RECLAMO') {
      const prev = document.title
      document.title = '🚨 RECLAMO — KHN_botics'
      setTimeout(() => { document.title = prev }, 6000)
    }
  }, [])

  const updateItem = useCallback((update) => {
    setItems(prev =>
      prev.map(i => i.id === update.id ? { ...i, ...update } : i)
    )
    if (['resuelto', 'descartado'].includes(update.estado)) {
      setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== update.id))
      }, 1500)
    }
  }, [])

  const approve = async (id, respuesta) => {
    const { data } = await api.post(`/api/inbox/${id}/approve`, { respuesta })
    setItems(prev => prev.filter(i => i.id !== id))
    return data
  }

  const discard = async (id) => {
    await api.post(`/api/inbox/${id}/discard`)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const updateResponse = async (id, respuesta_ia) => {
    await api.patch(`/api/inbox/${id}`, { respuesta_ia })
    setItems(prev => prev.map(i => i.id === id ? { ...i, respuesta_ia } : i))
  }

  const correct = async (id, correccion) => {
    const { data } = await api.post(`/api/inbox/${id}/correct`, { correccion })
    return data
  }

  return {
    items, loading, error,
    approve, discard, updateResponse, correct,
    addItem, updateItem,
    refresh: fetchInbox,
  }
}
