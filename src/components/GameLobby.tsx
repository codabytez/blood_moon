import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import PlayerAvatar from './PlayerAvatar'
import { IconCrown, IconEye, IconGamepad } from './Icons'

type Player = {
  _id: Id<'players'>
  name: string
  isAlive: boolean
  isHost: boolean
  isSpectating?: boolean
  isMe?: boolean
}

type Props = {
  gameId: Id<'games'>
  gameCode: string
  sessionId: string
  players: Player[]
  isHost: boolean
  isSpectating: boolean
  onLeave: () => void
}

export default function GameLobby({
  gameId,
  gameCode,
  sessionId,
  players,
  isHost,
  isSpectating,
  onLeave,
}: Props) {
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [toggling, setToggling] = useState(false)

  const startGame = useMutation(api.games.startGame)
  const toggleSpectating = useMutation(api.players.toggleSpectating)

  const activePlayers = players.filter(p => !p.isSpectating)
  const minRequired = 4
  const canStart = activePlayers.length >= minRequired

  async function handleStart() {
    setStarting(true)
    setError('')
    try {
      await startGame({ gameId, sessionId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game.')
      setStarting(false)
    }
  }

  async function handleToggle() {
    setToggling(true)
    try {
      await toggleSpectating({ gameId, sessionId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle.')
    } finally {
      setToggling(false)
    }
  }

  function copyCode() {
    void navigator.clipboard.writeText(gameCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p
            className="font-heading"
            style={{
              color: 'var(--text2)',
              fontSize: '0.8rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: '0 0 8px',
            }}
          >
            Game Lobby
          </p>
          <h1
            className="font-title"
            style={{
              fontSize: '2.2rem',
              color: 'var(--moon)',
              textShadow: '0 0 30px var(--accent-glow)',
              margin: 0,
            }}
          >
            Blood Moon
          </h1>
        </div>

        {/* Game Code */}
        <div
          className="card card-accent"
          style={{ textAlign: 'center', marginBottom: 20 }}
        >
          <p
            className="font-heading"
            style={{
              color: 'var(--text2)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              margin: '0 0 8px',
            }}
          >
            Share this code
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <span
              className="font-title"
              style={{
                fontSize: '2.5rem',
                color: 'var(--accent)',
                letterSpacing: '0.3em',
                textShadow: '0 0 20px var(--accent-glow)',
              }}
            >
              {gameCode}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={copyCode}
              style={{ minWidth: 72 }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Host mode toggle */}
        {isHost && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 20,
              borderColor: isSpectating
                ? 'rgba(124,58,237,0.4)'
                : 'var(--border-accent)',
            }}
          >
            <p
              className="font-heading"
              style={{
                margin: '0 0 10px',
                fontSize: '0.8rem',
                color: 'var(--text2)',
              }}
            >
              Your role as host
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => !isSpectating || handleToggle()}
                disabled={toggling || !isSpectating}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 8,
                  border: `2px solid ${!isSpectating ? 'var(--accent)' : 'var(--border)'}`,
                  background: !isSpectating
                    ? 'rgba(220,38,38,0.1)'
                    : 'var(--surface)',
                  color: !isSpectating ? 'var(--accent)' : 'var(--text2)',
                  cursor: !isSpectating ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 4,
                  }}
                >
                  <IconGamepad
                    size={22}
                    color={!isSpectating ? 'var(--accent)' : 'var(--text2)'}
                  />
                </div>
                <div
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  Playing
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text3)',
                    marginTop: 2,
                  }}
                >
                  Get a role & participate
                </div>
              </button>
              <button
                onClick={() => isSpectating || handleToggle()}
                disabled={toggling || isSpectating}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 8,
                  border: `2px solid ${isSpectating ? 'rgba(124,58,237,0.6)' : 'var(--border)'}`,
                  background: isSpectating
                    ? 'rgba(124,58,237,0.1)'
                    : 'var(--surface)',
                  color: isSpectating ? '#a78bfa' : 'var(--text2)',
                  cursor: isSpectating ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 4,
                  }}
                >
                  <IconEye
                    size={22}
                    color={isSpectating ? '#a78bfa' : 'var(--text2)'}
                  />
                </div>
                <div
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  Game Master
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text3)',
                    marginTop: 2,
                  }}
                >
                  See everything, no role
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Players */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2
              className="font-heading"
              style={{ margin: 0, fontSize: '1rem' }}
            >
              Players
            </h2>
            <span
              className="badge"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text2)',
              }}
            >
              {activePlayers.length} playing
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {players.map((p, i) => (
              <div
                key={p._id}
                className="animate-fade-in"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 12px',
                  borderRadius: 8,
                  background: p.isMe
                    ? 'rgba(220,38,38,0.05)'
                    : 'var(--surface)',
                  border: `1px solid ${p.isMe ? 'var(--border-accent)' : 'var(--border)'}`,
                  animationDelay: `${i * 0.06}s`,
                  opacity: p.isSpectating ? 0.75 : 1,
                }}
              >
                <PlayerAvatar name={p.name} size={30} />
                <span style={{ flex: 1, fontWeight: p.isMe ? 600 : 400 }}>
                  {p.name}
                  {p.isMe && (
                    <span
                      style={{
                        color: 'var(--text3)',
                        fontSize: '0.8rem',
                        marginLeft: 6,
                      }}
                    >
                      (you)
                    </span>
                  )}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.isHost && !p.isSpectating && (
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(220,38,38,0.1)',
                        color: 'var(--accent)',
                        border: '1px solid var(--border-accent)',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <IconCrown size={10} color="var(--accent)" /> Host
                    </span>
                  )}
                  {p.isSpectating && (
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(124,58,237,0.1)',
                        color: '#a78bfa',
                        border: '1px solid rgba(124,58,237,0.3)',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <IconEye size={10} color="#a78bfa" /> GM
                    </span>
                  )}
                </div>
              </div>
            ))}

            {players.length === 0 && (
              <p
                style={{
                  color: 'var(--text3)',
                  textAlign: 'center',
                  padding: '16px 0',
                  margin: 0,
                }}
              >
                Waiting for players to join...
              </p>
            )}
          </div>

          {!canStart && (
            <p
              style={{
                color: 'var(--text2)',
                fontSize: '0.8rem',
                textAlign: 'center',
                marginTop: 12,
                marginBottom: 0,
              }}
            >
              Need at least {minRequired} players with roles (
              {Math.max(0, minRequired - activePlayers.length)} more needed)
            </p>
          )}
        </div>

        {/* Actions */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(220,38,38,0.12)',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 8,
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost"
            onClick={onLeave}
            style={{ flex: 1 }}
          >
            ← Leave
          </button>
          {isHost ? (
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={!canStart || starting}
              onClick={handleStart}
            >
              {starting ? 'Starting...' : 'Start Game'}
            </button>
          ) : (
            <div
              className="card"
              style={{
                flex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                textAlign: 'center',
                color: 'var(--text2)',
                fontSize: '0.85rem',
              }}
            >
              Waiting for host to start...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
