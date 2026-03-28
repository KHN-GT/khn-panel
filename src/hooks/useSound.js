import { useCallback, useRef } from 'react'

const SOUND_PREFS_KEY = 'khn_sound_prefs'

const DEFAULT_PREFS = {
  RECLAMO:    { enabled: true, volume: 0.8 },
  'POST-VENTA': { enabled: true, volume: 0.6 },
  'PRE-COMPRA': { enabled: true, volume: 0.5 },
}

export function getSoundPrefs() {
  try {
    const saved = localStorage.getItem(SOUND_PREFS_KEY)
    return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}

export function setSoundPrefs(prefs) {
  localStorage.setItem(SOUND_PREFS_KEY, JSON.stringify(prefs))
}

// Genera un tono con Web Audio API
function playTone(ctx, frequency, duration, volume, type = 'sine') {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
  gainNode.gain.setValueAtTime(0, ctx.currentTime)
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

// Sonidos diferenciados por tipo
const SOUNDS = {
  'RECLAMO': (ctx, volume) => {
    // Dos pulsos urgentes - tono grave
    playTone(ctx, 440, 0.15, volume, 'square')
    setTimeout(() => playTone(ctx, 380, 0.2, volume, 'square'), 200)
  },
  'POST-VENTA': (ctx, volume) => {
    // Tono doble ascendente - amigable
    playTone(ctx, 520, 0.12, volume, 'sine')
    setTimeout(() => playTone(ctx, 660, 0.15, volume, 'sine'), 150)
  },
  'PRE-COMPRA': (ctx, volume) => {
    // Tono simple suave - info
    playTone(ctx, 600, 0.18, volume * 0.7, 'sine')
  },
}

export function useSound() {
  const ctxRef = useRef(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const playAlert = useCallback((tipo) => {
    const prefs = getSoundPrefs()
    const pref = prefs[tipo]
    if (!pref?.enabled) return
    try {
      const ctx = getCtx()
      const soundFn = SOUNDS[tipo]
      if (soundFn) soundFn(ctx, pref.volume)
    } catch (e) {
      console.warn('[useSound] Error reproduciendo alerta:', e)
    }
  }, [getCtx])

  return { playAlert }
}
