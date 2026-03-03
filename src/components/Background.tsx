import { useEffect, useMemo, useState } from 'react'

function useTheme(): 'day' | 'night' {
  const [theme, setTheme] = useState<'day' | 'night'>(
    () =>
      (document.documentElement.getAttribute('data-theme') as
        | 'day'
        | 'night') ?? 'night'
  )
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const t = document.documentElement.getAttribute('data-theme') as
        | 'day'
        | 'night'
      setTheme(t ?? 'night')
    })
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => obs.disconnect()
  }, [])
  return theme
}

type Star = {
  id: number
  left: string
  top: string
  size: number
  delay: string
  duration: string
}

function NightBackground() {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        left: `${(i * 137.508) % 100}%`,
        top: `${(i * 97.3) % 100}%`,
        size: 1 + (i % 3),
        delay: `${(i * 0.37) % 4}s`,
        duration: `${2 + (i % 4)}s`,
      })),
    []
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #060614 55%, #000008 100%)',
        pointerEvents: 'none',
      }}
    >
      {/* Stars */}
      {stars.map(star => (
        <div
          key={star.id}
          className="animate-twinkle"
          style={
            {
              position: 'absolute',
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              borderRadius: '50%',
              background: '#fff',
              '--delay': star.delay,
              '--duration': star.duration,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Moon */}
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          top: '6%',
          right: '12%',
        }}
      >
        {/* Pulse ring */}
        <div
          className="animate-pulse-ring"
          style={{
            position: 'absolute',
            inset: -20,
            borderRadius: '50%',
            background: 'rgba(220, 38, 38, 0.12)',
          }}
        />
        {/* Moon circle */}
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 35% 35%, #ffe4b5, #f5c880 40%, #c8922a 100%)',
            boxShadow:
              '0 0 30px rgba(220, 120, 38, 0.5), 0 0 80px rgba(180, 60, 10, 0.3)',
          }}
        />
        {/* Blood red tint overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'rgba(180, 20, 20, 0.22)',
          }}
        />
      </div>

      {/* Fog / gradient at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30%',
          background:
            'linear-gradient(to top, rgba(30, 5, 5, 0.6) 0%, transparent 100%)',
        }}
      />
    </div>
  )
}

function DayBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, #87ceeb 0%, #b8e4f7 30%, #fef3c7 80%, #fde68a 100%)',
        pointerEvents: 'none',
      }}
    >
      {/* Sun */}
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          top: '7%',
          right: '14%',
        }}
      >
        {/* Sun glow */}
        <div
          style={{
            position: 'absolute',
            inset: -30,
            borderRadius: '50%',
            background: 'rgba(251, 191, 36, 0.25)',
            filter: 'blur(8px)',
          }}
        />
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 40% 40%, #fde68a, #fbbf24 60%, #f59e0b 100%)',
            boxShadow:
              '0 0 40px rgba(251, 191, 36, 0.7), 0 0 80px rgba(245, 158, 11, 0.4)',
          }}
        />
      </div>

      {/* Clouds */}
      {[
        { top: '15%', delay: '0s', duration: '35s', opacity: 0.85, scale: 1 },
        { top: '22%', delay: '12s', duration: '48s', opacity: 0.7, scale: 0.7 },
        { top: '30%', delay: '6s', duration: '40s', opacity: 0.6, scale: 0.9 },
      ].map((cloud, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: cloud.top,
            animation: `drift ${cloud.duration} linear infinite`,
            animationDelay: cloud.delay,
            opacity: cloud.opacity,
            transform: `scale(${cloud.scale})`,
          }}
        >
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <div
              style={{
                width: 140,
                height: 50,
                borderRadius: 99,
                background: 'rgba(255,255,255,0.9)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -25,
                left: 20,
                width: 70,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.9)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -15,
                left: 60,
                width: 55,
                height: 50,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)',
              }}
            />
          </div>
        </div>
      ))}

      {/* Warm ground glow */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '25%',
          background:
            'linear-gradient(to top, rgba(253, 230, 138, 0.5) 0%, transparent 100%)',
        }}
      />
    </div>
  )
}

export default function Background() {
  const theme = useTheme()

  return (
    <>
      <div
        style={{
          transition: 'opacity 1s ease',
          opacity: theme === 'night' ? 1 : 0,
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <NightBackground />
      </div>
      <div
        style={{
          transition: 'opacity 1s ease',
          opacity: theme === 'day' ? 1 : 0,
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <DayBackground />
      </div>
    </>
  )
}
