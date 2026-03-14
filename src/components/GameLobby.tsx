import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import PlayerAvatar from './PlayerAvatar'
import { IconCrown, IconEye, IconGamepad } from './Icons'
import SettingsPanel from './SettingsPanel'
import type { GameSettings } from '../../convex/_shared'

function GearIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

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
  settings: GameSettings
  onLeave: () => void
}

export default function GameLobby({
  gameId,
  gameCode,
  sessionId,
  players,
  isHost,
  isSpectating,
  settings,
  onLeave,
}: Props) {
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [kickingId, setKickingId] = useState<Id<'players'> | null>(null)
  const [kickConfirmId, setKickConfirmId] = useState<Id<'players'> | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const startGame = useMutation(api.games.startGame)
  const toggleSpectating = useMutation(api.players.toggleSpectating)
  const cancelGame = useMutation(api.games.cancelGame)
  const removePlayer = useMutation(api.games.removePlayer)

  const activePlayers = players.filter(p => !p.isSpectating)
  const playerCount = activePlayers.length
  const minRequired = 4
  const canStart = playerCount >= minRequired

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

  async function handleCancel() {
    setCanceling(true)
    try {
      await cancelGame({ gameId, sessionId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel.')
      setCanceling(false)
    }
  }

  async function handleKick(targetPlayerId: Id<'players'>) {
    setKickingId(targetPlayerId)
    setKickConfirmId(null)
    try {
      await removePlayer({ gameId, sessionId, targetPlayerId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove player.')
    } finally {
      setKickingId(null)
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
      {/* Settings gear button — fixed top-right */}
      <button
        onClick={() => setShowSettings(true)}
        title="Game Settings"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 40,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          color: 'var(--text2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.2s, color 0.2s',
        }}
      >
        <GearIcon />
      </button>
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

        {/* Settings modal */}
        <SettingsPanel
          gameId={gameId}
          sessionId={sessionId}
          isHost={isHost}
          settings={settings}
          playerCount={playerCount}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />

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
                  {isHost && !p.isMe && !p.isHost && (
                    <button
                      onClick={() =>
                        setKickConfirmId(prev =>
                          prev === p._id ? null : p._id
                        )
                      }
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: `1px solid ${kickConfirmId === p._id ? 'rgba(220,38,38,0.5)' : 'rgba(220,38,38,0.3)'}`,
                        background:
                          kickConfirmId === p._id
                            ? 'rgba(220,38,38,0.12)'
                            : 'transparent',
                        color: '#f87171',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                      }}
                    >
                      Kick
                    </button>
                  )}
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

        {/* Cancel confirm */}
        {showCancelConfirm && (
          <div
            className="card"
            style={{
              marginBottom: 12,
              borderColor: 'rgba(220,38,38,0.4)',
              background: 'rgba(220,38,38,0.07)',
            }}
          >
            <p
              className="font-heading"
              style={{
                margin: '0 0 6px',
                color: '#f87171',
                fontSize: '0.9rem',
              }}
            >
              Cancel this room?
            </p>
            <p
              style={{
                color: 'var(--text2)',
                fontSize: '0.82rem',
                margin: '0 0 12px',
              }}
            >
              All players will be notified and returned to the home screen.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={canceling}
                onClick={handleCancel}
              >
                {canceling ? 'Canceling...' : 'Yes, Cancel Room'}
              </button>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep Room
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {isHost ? (
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setShowCancelConfirm(true)}
              disabled={canceling}
            >
              Cancel Room
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={onLeave}
              style={{ flex: 1 }}
            >
              ← Leave
            </button>
          )}
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

      {/* Kick confirmation modal */}
      <KickModal
        target={players.find(p => p._id === kickConfirmId) ?? null}
        loading={kickingId === kickConfirmId}
        onConfirm={() => kickConfirmId && handleKick(kickConfirmId)}
        onCancel={() => setKickConfirmId(null)}
      />
    </div>
  )
}

function KickModal({
  target,
  loading,
  onConfirm,
  onCancel,
}: {
  target: { name: string } | null
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!target) return null
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 24,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="card card-accent animate-fade-in-scale"
        style={{ width: '100%', maxWidth: 360 }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(220,38,38,0.12)',
            border: '1.5px solid rgba(220,38,38,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 22,
          }}
        >
          🚪
        </div>
        <h2
          className="font-heading"
          style={{
            textAlign: 'center',
            margin: '0 0 8px',
            fontSize: '1.1rem',
            color: '#f87171',
          }}
        >
          Remove player?
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--text2)',
            fontSize: '0.88rem',
            margin: '0 0 20px',
            lineHeight: 1.5,
          }}
        >
          Are you sure you want to remove{' '}
          <strong style={{ color: 'var(--text)' }}>{target.name}</strong> from
          the room? They will be notified.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            style={{ flex: 1 }}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Removing...' : 'Yes, Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}
