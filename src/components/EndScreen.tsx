import { useState, useEffect } from 'react'
import { Id } from '../../convex/_generated/dataModel'
import PlayerAvatar from './PlayerAvatar'
import { playVillageWins, playMafiaWins } from '../lib/sounds'
import { analytics } from '../lib/analytics'

type Player = {
  _id: Id<'players'>
  name: string
  isAlive: boolean
  isHost: boolean
  role?: string
  isMe?: boolean
  isSpectating?: boolean
}

type Props = {
  winner: 'villagers' | 'mafia'
  players: Player[]
  eliminationAnnouncement?: string
  isHost: boolean
  onPlayAgain: () => Promise<void>
  onLeave: () => void
}

const ROLE_CONFIGS: Record<
  string,
  { icon: string; label: string; headerClass: string }
> = {
  mafia: { icon: '😈', label: 'The Mafia', headerClass: 'badge-mafia' },
  seer: { icon: '🔮', label: 'Seer', headerClass: 'badge-seer' },
  apprenticeSeer: {
    icon: '🔭',
    label: 'Apprentice Seer',
    headerClass: 'badge-apprenticeSeer',
  },
  doctor: { icon: '💉', label: 'Doctor', headerClass: 'badge-doctor' },
  hunter: { icon: '🏹', label: 'Hunter', headerClass: 'badge-hunter' },
  prince: { icon: '👑', label: 'Prince', headerClass: 'badge-prince' },
  lycan: { icon: '🐺', label: 'Lycan', headerClass: 'badge-lycan' },
  mason: { icon: '🧱', label: 'Masons', headerClass: 'badge-mason' },
  villager: { icon: '🏡', label: 'Villagers', headerClass: 'badge-villager' },
}

const ROLE_ORDER = [
  'mafia',
  'seer',
  'apprenticeSeer',
  'doctor',
  'hunter',
  'prince',
  'lycan',
  'mason',
  'villager',
]

export default function EndScreen({
  winner,
  players,
  eliminationAnnouncement,
  isHost,
  onPlayAgain,
  onLeave,
}: Props) {
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (winner === 'mafia') playMafiaWins()
    else playVillageWins()
    analytics.gameEnded(winner, players.filter(p => !p.isSpectating).length)
  }, [winner]) // eslint-disable-line react-hooks/exhaustive-deps

  const isMafiaWin = winner === 'mafia'

  const villagerWinStyle = {
    bgGrad:
      'linear-gradient(135deg, rgba(22,163,74,0.1), rgba(16,185,129,0.06))',
    borderColor: 'rgba(22,163,74,0.4)',
    titleColor: '#4ade80',
    glow: '0 0 60px rgba(22,163,74,0.3)',
    emoji: '🌅',
    title: 'Village Wins!',
    subtitle: 'The Mafia has been defeated. Peace returns to the village.',
  }

  const mafiaWinStyle = {
    bgGrad:
      'linear-gradient(135deg, rgba(220,38,38,0.12), rgba(124,58,237,0.06))',
    borderColor: 'rgba(220,38,38,0.5)',
    titleColor: '#f87171',
    glow: '0 0 60px rgba(220,38,38,0.4)',
    emoji: '🌕',
    title: 'Mafia Wins!',
    subtitle: 'Darkness falls. The Mafia has taken control of the village.',
  }

  const style = isMafiaWin ? mafiaWinStyle : villagerWinStyle

  // Group active (non-spectating) players by role
  const activePlayers = players.filter(p => !p.isSpectating)
  const grouped = ROLE_ORDER.reduce<Record<string, Player[]>>((acc, role) => {
    acc[role] = activePlayers.filter(p => p.role === role)
    return acc
  }, {})

  async function handlePlayAgain() {
    setResetting(true)
    try {
      await onPlayAgain()
    } catch {
      setResetting(false)
    }
    // Don't reset setResetting(false) on success — game will transition and component unmounts
  }

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 540 }}>
        {/* Winner banner */}
        <div
          className="card animate-fade-in-scale"
          style={{
            textAlign: 'center',
            padding: '48px 32px',
            marginBottom: 20,
            background: style.bgGrad,
            borderColor: style.borderColor,
            boxShadow: style.glow,
          }}
        >
          <div
            className="animate-float"
            style={{ fontSize: 80, marginBottom: 20 }}
          >
            {style.emoji}
          </div>
          <h1
            className="font-title"
            style={{
              color: style.titleColor,
              fontSize: 'clamp(2rem, 7vw, 3.5rem)',
              margin: '0 0 12px',
              textShadow: `0 0 30px ${style.borderColor}`,
            }}
          >
            {style.title}
          </h1>
          <p
            style={{
              color: 'var(--text2)',
              margin: 0,
              fontSize: '0.95rem',
              lineHeight: 1.5,
            }}
          >
            {style.subtitle}
          </p>

          {eliminationAnnouncement && (
            <div
              style={{
                marginTop: 20,
                padding: '10px 16px',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.2)',
                color: 'var(--text2)',
                fontSize: '0.85rem',
              }}
            >
              {eliminationAnnouncement}
            </div>
          )}
        </div>

        {/* Roles revealed — grouped by role */}
        <div
          className="card animate-fade-in"
          style={{ marginBottom: 16, animationDelay: '0.15s' }}
        >
          <h2
            className="font-heading"
            style={{
              margin: '0 0 16px',
              fontSize: '1rem',
              color: 'var(--text2)',
            }}
          >
            🎭 Roles Revealed
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {ROLE_ORDER.map((role, idx) => {
              const group = grouped[role]
              if (!group || group.length === 0) return null
              const cfg = ROLE_CONFIGS[role]
              return (
                <div key={role}>
                  {idx > 0 && (
                    <div className="divider" style={{ marginBottom: 16 }} />
                  )}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      className={`badge ${cfg.headerClass}`}
                      style={{ fontSize: '0.8rem' }}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                    <span
                      style={{ color: 'var(--text3)', fontSize: '0.75rem' }}
                    >
                      {group.length} player{group.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 7 }}
                  >
                    {group.map(p => (
                      <RoleRow key={p._id} player={p} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="animate-fade-in"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            animationDelay: '0.3s',
          }}
        >
          {isHost ? (
            <>
              <div
                className="card"
                style={{
                  padding: '16px 20px',
                  borderColor: 'rgba(124,58,237,0.25)',
                  background: 'rgba(124,58,237,0.05)',
                }}
              >
                <p
                  className="font-heading"
                  style={{
                    margin: '0 0 4px',
                    fontSize: '0.8rem',
                    color: 'var(--text2)',
                  }}
                >
                  Host Options
                </p>
                <p
                  style={{
                    color: 'var(--text3)',
                    margin: '0 0 12px',
                    fontSize: '0.8rem',
                  }}
                >
                  Play Again keeps the same room — everyone stays in, and you
                  can still invite new players with the code before starting.
                </p>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={resetting}
                    onClick={handlePlayAgain}
                  >
                    {resetting ? 'Resetting...' : '🔄 Play Again — Same Room'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%' }}
                    onClick={onLeave}
                  >
                    🚪 End Room & Leave
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  textAlign: 'center',
                  padding: '12px',
                  color: 'var(--text3)',
                  fontSize: '0.85rem',
                }}
              >
                Waiting for host to start another round...
              </div>
              <button
                className="btn btn-ghost"
                style={{ width: '100%' }}
                onClick={onLeave}
              >
                🚪 Leave Game
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function RoleRow({
  player,
}: {
  player: { name: string; role?: string; isAlive: boolean; isMe?: boolean }
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 12px',
        borderRadius: 8,
        background: 'var(--surface)',
        border: `1px solid ${player.isMe ? 'var(--border-accent)' : 'var(--border)'}`,
        opacity: player.isAlive ? 1 : 0.6,
      }}
    >
      <PlayerAvatar name={player.name} size={26} dead={!player.isAlive} />
      <span style={{ flex: 1, fontWeight: player.isMe ? 700 : 400 }}>
        {player.name}
        {player.isMe && (
          <span
            style={{ color: 'var(--text3)', fontSize: '0.8rem', marginLeft: 6 }}
          >
            (you)
          </span>
        )}
      </span>
      {!player.isAlive && (
        <span className="badge badge-dead" style={{ marginRight: 4 }}>
          ☠️ Eliminated
        </span>
      )}
    </div>
  )
}
