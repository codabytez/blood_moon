import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { GameState } from '../App'
import { errMsg } from '../lib/errMsg'

type Props = {
  sessionId: string
  onGameJoined: (gs: GameState) => void
  onShowRules: () => void
}

type Modal = 'none' | 'host' | 'join'

export default function LandingPage({
  sessionId,
  onGameJoined,
  onShowRules,
}: Props) {
  const [modal, setModal] = useState<Modal>('none')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const createGame = useMutation(api.games.create)
  const joinGame = useMutation(api.games.join)

  function reset() {
    setModal('none')
    setName('')
    setCode('')
    setError('')
  }

  async function handleHost(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await createGame({ hostName: name.trim(), sessionId })
      onGameJoined({ gameId: result.gameId, playerId: result.playerId })
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await joinGame({
        gameCode: code.trim().toUpperCase(),
        playerName: name.trim(),
        sessionId,
      })
      onGameJoined({ gameId: result.gameId, playerId: result.playerId })
    } catch (err) {
      setError(errMsg(err))
    } finally {
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
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Hero */}
      <div
        className="animate-fade-in"
        style={{ textAlign: 'center', marginBottom: 56 }}
      >
        <div
          className="animate-float"
          style={{ fontSize: 72, marginBottom: 16 }}
        >
          🌕
        </div>
        <h1
          className="font-title"
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 5rem)',
            color: 'var(--moon)',
            textShadow:
              '0 0 40px rgba(220, 38, 38, 0.6), 0 2px 12px rgba(0,0,0,0.8)',
            margin: 0,
            letterSpacing: '0.05em',
            lineHeight: 1.1,
          }}
        >
          Blood Moon
        </h1>
        <p
          className="font-heading"
          style={{
            color: 'var(--text2)',
            fontSize: '1.05rem',
            marginTop: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          The night is watching
        </p>
      </div>

      {/* CTA Cards */}
      <div
        className="animate-fade-in"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          width: '100%',
          maxWidth: 520,
          animationDelay: '0.15s',
        }}
      >
        <button
          className="card card-accent"
          onClick={() => setModal('host')}
          style={{
            cursor: 'pointer',
            textAlign: 'center',
            padding: '32px 24px',
            transition: 'transform 0.2s, box-shadow 0.2s',
            border: 'none',
            color: 'var(--text)',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.transform =
              'translateY(-4px)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>👑</div>
          <div
            className="font-heading"
            style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 6 }}
          >
            Host a Game
          </div>
          <div style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>
            Create a room & invite friends
          </div>
        </button>

        <button
          className="card"
          onClick={() => setModal('join')}
          style={{
            cursor: 'pointer',
            textAlign: 'center',
            padding: '32px 24px',
            transition: 'transform 0.2s, box-shadow 0.2s',
            border: 'none',
            color: 'var(--text)',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.transform =
              'translateY(-4px)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
          <div
            className="font-heading"
            style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 6 }}
          >
            Join a Game
          </div>
          <div style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>
            Enter the code to join
          </div>
        </button>
      </div>

      {/* Role legend */}
      <div
        className="animate-fade-in"
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 48,
          animationDelay: '0.3s',
        }}
      >
        {[
          { emoji: '😈', label: 'Mafia', cls: 'badge-mafia' },
          { emoji: '🏡', label: 'Villager', cls: 'badge-villager' },
          { emoji: '🔮', label: 'Seer', cls: 'badge-seer' },
          { emoji: '💉', label: 'Doctor', cls: 'badge-doctor' },
          { emoji: '🏹', label: 'Hunter', cls: 'badge-hunter' },
          { emoji: '👑', label: 'Prince', cls: 'badge-prince' },
          { emoji: '🐺', label: 'Lycan', cls: 'badge-lycan' },
          { emoji: '🧱', label: 'Mason', cls: 'badge-mason' },
          {
            emoji: '🔭',
            label: 'Apprentice Seer',
            cls: 'badge-apprenticeSeer',
          },
        ].map(r => (
          <span key={r.label} className={`badge ${r.cls}`}>
            {r.emoji} {r.label}
          </span>
        ))}
      </div>

      {/* How to Play link */}
      <button
        className="animate-fade-in"
        onClick={onShowRules}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text3)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          marginTop: 20,
          letterSpacing: '0.05em',
          textDecoration: 'underline',
          textUnderlineOffset: 3,
          animationDelay: '0.4s',
        }}
      >
        How to Play
      </button>

      {/* Modal */}
      {modal !== 'none' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 24,
          }}
          onClick={e => {
            if (e.target === e.currentTarget) reset()
          }}
        >
          <div
            className="card card-accent animate-fade-in-scale"
            style={{ width: '100%', maxWidth: 400 }}
          >
            <h2
              className="font-heading"
              style={{ margin: '0 0 20px', fontSize: '1.3rem' }}
            >
              {modal === 'host' ? '👑 Host a Game' : '🚪 Join a Game'}
            </h2>

            <form onSubmit={modal === 'host' ? handleHost : handleJoin}>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {modal === 'join' && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        color: 'var(--text2)',
                        marginBottom: 6,
                        fontFamily: 'Cinzel, serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      Game Code
                    </label>
                    <input
                      className="input"
                      style={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.25em',
                        fontSize: '1.2rem',
                        fontFamily: 'Cinzel, serif',
                        textAlign: 'center',
                      }}
                      placeholder="ABC123"
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                )}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      color: 'var(--text2)',
                      marginBottom: 6,
                      fontFamily: 'Cinzel, serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Your Name
                  </label>
                  <input
                    className="input"
                    placeholder={
                      modal === 'host' ? 'Host name...' : 'Your name...'
                    }
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={24}
                    autoFocus={modal === 'host'}
                  />
                </div>

                {error && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(220,38,38,0.12)',
                      border: '1px solid rgba(220,38,38,0.3)',
                      borderRadius: 8,
                      color: '#f87171',
                      fontSize: '0.85rem',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={reset}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      loading ||
                      !name.trim() ||
                      (modal === 'join' && code.length < 6)
                    }
                    style={{ flex: 2 }}
                  >
                    {loading
                      ? '...'
                      : modal === 'host'
                        ? 'Create Game'
                        : 'Join Game'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
