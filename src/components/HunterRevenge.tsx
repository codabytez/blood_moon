import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { errMsg } from '../lib/errMsg'

type Player = {
  _id: Id<'players'>
  name: string
  isAlive: boolean
  isHost: boolean
  isMe?: boolean
  isSpectating?: boolean
  role?: string
}

type Props = {
  gameId: Id<'games'>
  sessionId: string
  players: Player[]
  pendingHunterId: Id<'players'>
  isGM: boolean
  nightAnnouncement?: string
  eliminationAnnouncement?: string
}

export default function HunterRevenge({
  gameId,
  sessionId,
  players,
  pendingHunterId,
  isGM,
  nightAnnouncement,
  eliminationAnnouncement,
}: Props) {
  const [selectedTarget, setSelectedTarget] = useState<Id<'players'> | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submitHunterKill = useMutation(api.games.submitHunterKill)

  const me = players.find(p => p.isMe)
  const isHunter = me?._id === pendingHunterId
  const hunter = players.find(p => p._id === pendingHunterId)
  const targetablePlayers = players.filter(
    p => p.isAlive && !p.isSpectating && p._id !== pendingHunterId
  )
  const announcement = nightAnnouncement || eliminationAnnouncement

  async function handleFire() {
    if (!selectedTarget) return
    setLoading(true)
    setError('')
    try {
      await submitHunterKill({ gameId, targetId: selectedTarget, sessionId })
    } catch (err) {
      setError(errMsg(err))
      setLoading(false)
    }
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
        padding: '24px',
        paddingTop: 'max(24px, env(safe-area-inset-top))',
      }}
    >
      {/* Header */}
      <div
        className="animate-fade-in"
        style={{
          textAlign: 'center',
          marginBottom: 24,
          width: '100%',
          maxWidth: 520,
        }}
      >
        <div
          className="animate-float"
          style={{ fontSize: 60, marginBottom: 8 }}
        >
          🏹
        </div>
        <h1
          className="font-title"
          style={{
            color: '#fb923c',
            fontSize: '2rem',
            margin: 0,
            textShadow: '0 0 30px rgba(251,146,60,0.5)',
          }}
        >
          Hunter's Last Stand
        </h1>
        <p
          style={{
            color: 'var(--text2)',
            margin: '8px 0 0',
            fontSize: '0.9rem',
          }}
        >
          {hunter?.name} rises from the grave for one final strike...
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Announcement */}
        {announcement && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: 'rgba(251,146,60,0.3)',
              background: 'rgba(251,146,60,0.06)',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: 0, color: '#fdba74', fontSize: '0.9rem' }}>
              {announcement}
            </p>
          </div>
        )}

        {/* Hunter targeting UI vs waiting screen */}
        {isHunter ? (
          <div
            className="card card-accent animate-fade-in"
            style={{ marginBottom: 16, borderColor: 'rgba(251,146,60,0.5)' }}
          >
            <h2
              className="font-heading"
              style={{ margin: '0 0 4px', fontSize: '1rem', color: '#fb923c' }}
            >
              🏹 Choose your final target
            </h2>
            <p
              style={{
                color: 'var(--text3)',
                margin: '0 0 16px',
                fontSize: '0.8rem',
              }}
            >
              You have been eliminated. Take one player down with you.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {targetablePlayers.map(p => (
                <button
                  key={p._id}
                  onClick={() =>
                    setSelectedTarget(prev => (prev === p._id ? null : p._id))
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background:
                      selectedTarget === p._id
                        ? 'rgba(251,146,60,0.18)'
                        : 'var(--surface)',
                    border: `1.5px solid ${selectedTarget === p._id ? '#fb923c' : 'var(--border)'}`,
                    cursor: 'pointer',
                    color: 'var(--text)',
                    transition: 'all 0.15s',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <span>👤</span>
                  <span
                    style={{ fontWeight: selectedTarget === p._id ? 600 : 400 }}
                  >
                    {p.name}
                  </span>
                  {selectedTarget === p._id && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        color: '#fb923c',
                        fontSize: '0.85rem',
                      }}
                    >
                      Selected ✓
                    </span>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(220,38,38,0.1)',
                  borderRadius: 8,
                  color: '#f87171',
                  fontSize: '0.85rem',
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', background: '#ea580c' }}
              disabled={!selectedTarget || loading}
              onClick={handleFire}
            >
              {loading ? 'Firing...' : '🏹 Fire!'}
            </button>
          </div>
        ) : (
          <div
            className="card animate-fade-in"
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              marginBottom: 16,
            }}
          >
            <div
              className="animate-float"
              style={{ fontSize: 60, marginBottom: 16 }}
            >
              🏹
            </div>
            <h2
              className="font-heading"
              style={{ margin: '0 0 8px', fontSize: '1.1rem' }}
            >
              The Hunter rises...
            </h2>
            <p style={{ color: 'var(--text2)', margin: 0, fontSize: '0.9rem' }}>
              {isGM
                ? `${hunter?.name} is choosing their final target.`
                : 'Wait silently. The Hunter takes aim...'}
            </p>
          </div>
        )}

        {/* Player list */}
        <div
          className="card animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          <h2
            className="font-heading"
            style={{
              margin: '0 0 12px',
              fontSize: '0.9rem',
              color: 'var(--text2)',
            }}
          >
            Village — {players.filter(p => p.isAlive && !p.isSpectating).length}{' '}
            alive
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {players
              .filter(p => !p.isSpectating)
              .map(p => (
                <div
                  key={p._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: 99,
                    background: p.isAlive
                      ? 'var(--surface)'
                      : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${
                      p._id === pendingHunterId
                        ? 'rgba(251,146,60,0.5)'
                        : p.isAlive
                          ? 'var(--border)'
                          : 'rgba(100,100,100,0.2)'
                    }`,
                    opacity: p.isAlive ? 1 : 0.4,
                    fontSize: '0.85rem',
                  }}
                >
                  <span>
                    {p._id === pendingHunterId ? '🏹' : p.isAlive ? '🌙' : '☠️'}
                  </span>
                  <span
                    style={{
                      fontWeight: p.isMe ? 600 : 400,
                      color: p.isAlive ? 'var(--text)' : '#9ca3af',
                      textDecoration: p.isAlive ? 'none' : 'line-through',
                    }}
                  >
                    {p.name}
                  </span>
                  {isGM && p.role && (
                    <span
                      className={`badge badge-${p.role}`}
                      style={{ fontSize: '0.65rem', padding: '1px 6px' }}
                    >
                      {p.role}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
