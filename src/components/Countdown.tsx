import { useEffect, useRef, useState } from 'react'
import { playTimerTick } from '../lib/sounds'

type Props = {
  deadline: number // Unix ms timestamp
  onExpire?: () => void
  style?: React.CSSProperties
}

export default function Countdown({ deadline, onExpire, style }: Props) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, deadline - Date.now()))
  const calledRef = useRef(false)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    calledRef.current = false

    const id = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now())
      setMsLeft(remaining)
      if (remaining === 0 && !calledRef.current) {
        calledRef.current = true
        onExpireRef.current?.()
        clearInterval(id)
      }
    }, 500)

    return () => clearInterval(id)
  }, [deadline])

  const totalSec = Math.ceil(msLeft / 1000)

  // Tick sound for the last 10 seconds
  const prevSecRef = useRef<number | null>(null)
  useEffect(() => {
    if (totalSec <= 10 && totalSec > 0 && totalSec !== prevSecRef.current) {
      prevSecRef.current = totalSec
      playTimerTick()
    }
  }, [totalSec])

  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  const display = `${mins}:${secs.toString().padStart(2, '0')}`

  const isUrgent = totalSec <= 30
  const isCritical = totalSec <= 10

  return (
    <span
      style={{
        fontFamily: 'Cinzel, serif',
        fontWeight: 700,
        fontSize: '0.85rem',
        color: isCritical ? '#f87171' : isUrgent ? '#fb923c' : 'var(--text2)',
        transition: 'color 0.5s',
        animation: isCritical ? 'pulse 1s infinite' : undefined,
        ...style,
      }}
    >
      {display}
    </span>
  )
}
