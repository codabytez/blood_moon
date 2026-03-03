import { useEffect, useState } from 'react'

type Role =
  | 'mafia'
  | 'villager'
  | 'seer'
  | 'doctor'
  | 'hunter'
  | 'prince'
  | 'lycan'
  | 'mason'
  | 'apprenticeSeer'

const ROLE_CONFIG: Record<
  Role,
  {
    emoji: string
    label: string
    color: string
    bg: string
    border: string
    desc: string
  }
> = {
  mafia: {
    emoji: '😈',
    label: 'Mafia',
    color: '#f87171',
    bg: 'rgba(220,38,38,0.12)',
    border: 'rgba(220,38,38,0.5)',
    desc: 'Blend in. Lie boldly. Eliminate the villagers at night. Make sure they never suspect you.',
  },
  villager: {
    emoji: '🏡',
    label: 'Villager',
    color: '#4ade80',
    bg: 'rgba(22,163,74,0.12)',
    border: 'rgba(22,163,74,0.4)',
    desc: 'Use your wits and intuition. Debate, accuse, and vote out the Mafia before they get you.',
  },
  seer: {
    emoji: '🔮',
    label: 'Seer',
    color: '#a78bfa',
    bg: 'rgba(124,58,237,0.12)',
    border: 'rgba(124,58,237,0.4)',
    desc: 'Each night, investigate one player to learn if they are Mafia. Use your knowledge wisely.',
  },
  doctor: {
    emoji: '💉',
    label: 'Doctor',
    color: '#38bdf8',
    bg: 'rgba(2,132,199,0.12)',
    border: 'rgba(2,132,199,0.4)',
    desc: 'Each night, protect one player from being killed. You may protect yourself.',
  },
  hunter: {
    emoji: '🏹',
    label: 'Hunter',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.12)',
    border: 'rgba(251,146,60,0.5)',
    desc: 'No night action. But when eliminated — day or night — you choose one player to take down with you.',
  },
  prince: {
    emoji: '👑',
    label: 'Prince',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.5)',
    desc: 'Day votes cannot eliminate you. You survive every vote. The Mafia can still kill you at night.',
  },
  lycan: {
    emoji: '🐺',
    label: 'Lycan',
    color: '#a3e635',
    bg: 'rgba(163,230,53,0.12)',
    border: 'rgba(163,230,53,0.45)',
    desc: "You're on the Villager team — but the Seer sees a monster in you. Be careful who you trust.",
  },
  mason: {
    emoji: '🧱',
    label: 'Mason',
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.12)',
    border: 'rgba(148,163,184,0.45)',
    desc: 'You and your Mason partner know each other and are confirmed Villagers. Work together to root out evil.',
  },
  apprenticeSeer: {
    emoji: '🔭',
    label: 'Apprentice Seer',
    color: '#c084fc',
    bg: 'rgba(192,132,252,0.12)',
    border: 'rgba(192,132,252,0.45)',
    desc: "The Seer's gift will pass to you if they fall. Until then, stay hidden and keep watch.",
  },
}

type Props = {
  role: Role
  onDismiss: () => void
}

export default function RoleReveal({ role, onDismiss }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const cfg = ROLE_CONFIG[role]

  useEffect(() => {
    // Flip after a short dramatic pause
    const t1 = setTimeout(() => setFlipped(true), 900)
    const t2 = setTimeout(() => setShowButton(true), 2200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(8px)',
        padding: 24,
      }}
    >
      {/* Dramatic text */}
      <p
        className="font-heading animate-fade-in"
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.9rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          marginBottom: 40,
        }}
      >
        Your fate has been sealed...
      </p>

      {/* Flip Card */}
      <div
        className="flip-container animate-fade-in-scale"
        style={{ width: 280, height: 380, marginBottom: 40 }}
      >
        <div className={`flip-card${flipped ? ' flipped' : ''}`}>
          {/* Card back (face down) */}
          <div
            className="flip-front"
            style={{
              background: 'linear-gradient(135deg, #1a0a2e, #0f0c28)',
              border: '2px solid rgba(220,38,38,0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontSize: 72,
                marginBottom: 12,
                filter: 'grayscale(0.2)',
              }}
            >
              🌕
            </div>
            <p
              className="font-title"
              style={{
                color: 'rgba(220,38,38,0.7)',
                fontSize: '1.1rem',
                letterSpacing: '0.15em',
              }}
            >
              Blood Moon
            </p>
          </div>

          {/* Card front (role revealed) */}
          <div
            className="flip-back"
            style={{
              background: cfg.bg,
              border: `2px solid ${cfg.border}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 28,
              textAlign: 'center',
              boxShadow: `0 0 40px ${cfg.border}`,
            }}
          >
            <div style={{ fontSize: 80, marginBottom: 16 }}>{cfg.emoji}</div>
            <h2
              className="font-title"
              style={{
                color: cfg.color,
                fontSize: '1.8rem',
                margin: '0 0 16px',
                textShadow: `0 0 20px ${cfg.border}`,
              }}
            >
              {cfg.label}
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {cfg.desc}
            </p>
          </div>
        </div>
      </div>

      {showButton && (
        <button
          className="btn btn-primary btn-lg animate-fade-in"
          onClick={onDismiss}
          style={{ minWidth: 200 }}
        >
          Enter the Night →
        </button>
      )}
    </div>
  )
}
