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
  | 'bodyguard'
  | 'fortuneTeller'
  | 'playerInspector'
  | 'priest'
  | 'spellcaster'
  | 'amuletOfProtection'
  | 'beholder'
  | 'toughGuy'
  | 'king'
  | 'diseased'
  | 'cursed'
  | 'pacifist'
  | 'villageIdiot'

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
  bodyguard: {
    emoji: '🛡️',
    label: 'Bodyguard',
    color: '#2dd4bf',
    bg: 'rgba(20,184,166,0.12)',
    border: 'rgba(20,184,166,0.4)',
    desc: 'Each night, choose one player to protect. If the Mafia targets them, the Bodyguard takes the hit. You cannot protect the same player two nights in a row.',
  },
  fortuneTeller: {
    emoji: '🎱',
    label: 'Fortune Teller',
    color: '#818cf8',
    bg: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.4)',
    desc: "Each night, peer into the future and learn one player's exact role. More powerful than the Seer — but use your knowledge carefully.",
  },
  playerInspector: {
    emoji: '🔍',
    label: 'Player Inspector',
    color: '#38bdf8',
    bg: 'rgba(14,165,233,0.12)',
    border: 'rgba(14,165,233,0.4)',
    desc: 'Each night, inspect one player. You will learn if they are Suspicious (Mafia or Lycan) or Clear. Simple — but vital.',
  },
  priest: {
    emoji: '⛪',
    label: 'Priest',
    color: '#fb7185',
    bg: 'rgba(244,63,94,0.1)',
    border: 'rgba(244,63,94,0.4)',
    desc: 'On the very first night, bless one player with divine protection. If the Mafia targets them that night, they survive. After night 1, your power fades.',
  },
  spellcaster: {
    emoji: '🌀',
    label: 'Spellcaster',
    color: '#a78bfa',
    bg: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.4)',
    desc: 'Each night, cast a silence spell on one player. They will be unable to speak or vote the following day. A powerful disruptor.',
  },
  amuletOfProtection: {
    emoji: '🧿',
    label: 'Amulet of Protection',
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.4)',
    desc: 'Once per game, use the amulet to protect one player from a Mafia kill. After it is used, the amulet is spent and you become a simple Villager.',
  },
  beholder: {
    emoji: '👁️',
    label: 'Beholder',
    color: '#22d3ee',
    bg: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.4)',
    desc: 'At the start of the game, you learn who the Seer is. No night action — your power is pure knowledge. Guard that secret with your life.',
  },
  toughGuy: {
    emoji: '💪',
    label: 'Tough Guy',
    color: '#fb923c',
    bg: 'rgba(234,88,12,0.12)',
    border: 'rgba(234,88,12,0.4)',
    desc: 'You can survive the first werewolf attack. If the Mafia kills you, you cling to life — but you will die the following night. No second chances.',
  },
  king: {
    emoji: '🤴',
    label: 'King',
    color: '#facc15',
    bg: 'rgba(234,179,8,0.12)',
    border: 'rgba(234,179,8,0.4)',
    desc: 'Your vote counts as two. Wield your influence wisely. And if you are eliminated — by vote or by night — you get a revenge shot, just like the Hunter.',
  },
  diseased: {
    emoji: '🤢',
    label: 'Diseased',
    color: '#94a3b8',
    bg: 'rgba(71,85,105,0.15)',
    border: 'rgba(71,85,105,0.4)',
    desc: "If the Mafia kills you, they are sickened — and cannot kill anyone the following night. Your death may be the village's greatest gift.",
  },
  cursed: {
    emoji: '🩸',
    label: 'Cursed',
    color: '#f87171',
    bg: 'rgba(185,28,28,0.12)',
    border: 'rgba(185,28,28,0.4)',
    desc: 'A dark curse marks you. If the Mafia targets you at night, instead of dying you silently turn Mafia. Play innocent — and hope they find you.',
  },
  pacifist: {
    emoji: '🕊️',
    label: 'Pacifist',
    color: '#7dd3fc',
    bg: 'rgba(56,189,248,0.1)',
    border: 'rgba(56,189,248,0.35)',
    desc: 'You refuse to vote for execution. Your vote button is hidden — you cannot take part in elimination votes. Debate freely, but never cast judgment.',
  },
  villageIdiot: {
    emoji: '🤡',
    label: 'Village Idiot',
    color: '#a3e635',
    bg: 'rgba(132,204,22,0.12)',
    border: 'rgba(132,204,22,0.4)',
    desc: "You're just a villager — but with a good excuse for acting strange. No powers, no secrets. Blend in, cause chaos, or just enjoy the ride.",
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
