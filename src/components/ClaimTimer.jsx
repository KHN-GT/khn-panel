import { useState, useEffect } from 'react'

function fmt(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export default function ClaimTimer({ timerSegundos, style = {} }) {
  const [elapsed, setElapsed] = useState(timerSegundos || 0)

  useEffect(() => {
    setElapsed(timerSegundos || 0)
    const t = setInterval(() => setElapsed(p => p + 1), 1000)
    return () => clearInterval(t)
  }, [timerSegundos])

  const isUrgent = elapsed > 900 // 15 minutos
  const isCritical = elapsed > 3600 // 1 hora

  return (
    <span style={{
      fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
      color: isCritical ? '#dc2626' : isUrgent ? '#d97706' : '#e53e3e',
      display: 'flex', alignItems: 'center', gap: 4,
      ...style,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: isCritical ? '#dc2626' : '#e53e3e',
        animation: 'pulse 1s infinite',
      }} />
      {fmt(elapsed)}
    </span>
  )
}
