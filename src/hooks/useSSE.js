import { useEffect, useRef } from 'react'
import { SSE_URL } from '../api/client'

export function useSSE({ onNewItem, onUpdate, onConfigUpdate }) {
  const esRef    = useRef(null)
  const retryRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('khn_token')
    if (!token) return

    function connect() {
      try {
        const url = SSE_URL()
        const es  = new EventSource(url)
        esRef.current = es

        es.addEventListener('inbox_new', e => {
          try { onNewItem?.(JSON.parse(e.data)) } catch (_) {}
        })
        es.addEventListener('inbox_update', e => {
          try { onUpdate?.(JSON.parse(e.data)) } catch (_) {}
        })
        es.addEventListener('config_update', e => {
          try { onConfigUpdate?.(JSON.parse(e.data)) } catch (_) {}
        })
        es.addEventListener('ping', () => {})

        es.onopen = () => {
          console.log('[SSE] Conectado a Railway')
        }

        es.onerror = (err) => {
          console.warn('[SSE] Error de conexión — reintentando en 10s', err)
          es.close()
          esRef.current = null
          // Reintentar en 10s sin interrumpir el panel
          retryRef.current = setTimeout(connect, 10000)
        }
      } catch (e) {
        console.warn('[SSE] No disponible — usando polling de respaldo')
        // Si SSE falla, el polling de 30s en useInbox.js sigue funcionando
      }
    }

    // Intentar SSE — si falla, el panel sigue funcionando con polling
    connect()

    return () => {
      esRef.current?.close()
      clearTimeout(retryRef.current)
    }
  }, [])
}
