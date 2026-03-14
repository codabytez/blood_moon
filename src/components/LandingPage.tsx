import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { GameState } from '../App'
import { errMsg } from '../lib/errMsg'
import { IconMoon, IconCrown, IconLogIn } from './Icons'

type Props = {
  sessionId: string
  onGameJoined: (gs: GameState) => void
  onShowRules: () => void
}

type Modal = 'none' | 'host' | 'join'

const ROLES = [
  { label: 'Mafia', cls: 'badge-mafia' },
  { label: 'Villager', cls: 'badge-villager' },
  { label: 'Seer', cls: 'badge-seer' },
  { label: 'Doctor', cls: 'badge-doctor' },
  { label: 'Hunter', cls: 'badge-hunter' },
  { label: 'Prince', cls: 'badge-prince' },
  { label: 'Lycan', cls: 'badge-lycan' },
  { label: 'Mason', cls: 'badge-mason' },
  { label: 'Apprentice Seer', cls: 'badge-apprenticeSeer' },
  { label: 'Bodyguard', cls: 'badge-bodyguard' },
  { label: 'Fortune Teller', cls: 'badge-fortuneTeller' },
  { label: 'Player Inspector', cls: 'badge-playerInspector' },
  { label: 'Priest', cls: 'badge-priest' },
  { label: 'Spellcaster', cls: 'badge-spellcaster' },
  { label: 'Amulet of Protection', cls: 'badge-amuletOfProtection' },
  { label: 'Beholder', cls: 'badge-beholder' },
  { label: 'Tough Guy', cls: 'badge-toughGuy' },
  { label: 'King', cls: 'badge-king' },
  { label: 'Diseased', cls: 'badge-diseased' },
  { label: 'Cursed', cls: 'badge-cursed' },
  { label: 'Pacifist', cls: 'badge-pacifist' },
  { label: 'Village Idiot', cls: 'badge-villageIdiot' },
]

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

  const isHost = modal === 'host'

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
        padding: '32px 24px 48px',
      }}
    >
      {/* ── Hero ───────────────────────────────────────── */}
      <div
        className="animate-fade-in"
        style={{ textAlign: 'center', marginBottom: 56 }}
      >
        {/* Moon with layered pulse rings */}
        <div
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
          }}
        >
          {/* Outer slow ring */}
          <div
            className="animate-pulse-ring"
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'var(--accent-glow)',
              animationDuration: '2.8s',
            }}
          />
          {/* Inner faster ring */}
          <div
            className="animate-pulse-ring"
            style={{
              position: 'absolute',
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: 'var(--accent-glow)',
              animationDuration: '2.8s',
              animationDelay: '0.9s',
            }}
          />
          <div className="animate-float">
            <IconMoon
              size={72}
              color="var(--moon)"
              style={{ filter: 'drop-shadow(0 0 28px var(--moon))' }}
            />
          </div>
        </div>

        <h1
          className="font-title"
          style={{
            fontSize: 'clamp(2.8rem, 9vw, 5.5rem)',
            color: 'var(--moon)',
            textShadow:
              '0 0 60px rgba(220,38,38,0.7), 0 0 120px rgba(220,38,38,0.25), 0 2px 16px rgba(0,0,0,0.9)',
            margin: '0 0 14px',
            letterSpacing: '0.06em',
            lineHeight: 1.05,
          }}
        >
          Blood Moon
        </h1>

        <p
          className="font-heading"
          style={{
            color: 'var(--accent)',
            fontSize: '0.85rem',
            margin: '0 0 8px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
          }}
        >
          A Social Deduction Game
        </p>

        <p
          style={{
            color: 'var(--text3)',
            fontSize: '0.78rem',
            margin: 0,
            letterSpacing: '0.12em',
          }}
        >
          4 – 30 players &nbsp;·&nbsp; deception &nbsp;·&nbsp; strategy
        </p>
      </div>

      {/* ── CTA Cards ──────────────────────────────────── */}
      <div
        className="animate-fade-in"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          width: '100%',
          maxWidth: 480,
          animationDelay: '0.2s',
        }}
      >
        {/* Host */}
        <button
          className="card card-accent animate-glow-pulse"
          onClick={() => setModal('host')}
          style={{
            cursor: 'pointer',
            border: 'none',
            color: 'var(--text)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            padding: '32px 20px',
            transition: 'transform 0.22s ease',
          }}
          onMouseEnter={e =>
            (e.currentTarget.style.transform = 'translateY(-5px)')
          }
          onMouseLeave={e => (e.currentTarget.style.transform = '')}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'rgba(220,38,38,0.14)',
              border: '1.5px solid rgba(220,38,38,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconCrown size={28} color="var(--accent)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              className="font-heading"
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                marginBottom: 5,
                color: 'var(--text)',
              }}
            >
              Host a Game
            </div>
            <div style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>
              Create a room &amp; invite friends
            </div>
          </div>
        </button>

        {/* Join */}
        <button
          className="card"
          onClick={() => setModal('join')}
          style={{
            cursor: 'pointer',
            border: 'none',
            color: 'var(--text)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            padding: '32px 20px',
            transition: 'transform 0.22s ease',
          }}
          onMouseEnter={e =>
            (e.currentTarget.style.transform = 'translateY(-5px)')
          }
          onMouseLeave={e => (e.currentTarget.style.transform = '')}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'rgba(124,58,237,0.12)',
              border: '1.5px solid rgba(124,58,237,0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconLogIn size={28} color="var(--accent2)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              className="font-heading"
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                marginBottom: 5,
                color: 'var(--text)',
              }}
            >
              Join a Game
            </div>
            <div style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>
              Enter a code to join
            </div>
          </div>
        </button>
      </div>

      {/* ── Role legend ────────────────────────────────── */}
      <div
        className="animate-fade-in"
        style={{
          marginTop: 52,
          width: '100%',
          maxWidth: 480,
          animationDelay: '0.35s',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span
            className="font-heading"
            style={{
              color: 'var(--text3)',
              fontSize: '0.65rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Roles
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {ROLES.map(r => (
            <span key={r.label} className={`badge ${r.cls}`}>
              {r.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── How to Play ────────────────────────────────── */}
      <button
        className="animate-fade-in"
        onClick={onShowRules}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text3)',
          fontSize: '0.8rem',
          cursor: 'pointer',
          marginTop: 28,
          letterSpacing: '0.08em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          animationDelay: '0.5s',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text2)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
      >
        <span
          style={{
            fontFamily: 'Cinzel, serif',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          How to Play
        </span>
        <span style={{ opacity: 0.6 }}>›</span>
      </button>

      {/* ── Footer credit ──────────────────────────────── */}
      <div
        className="animate-fade-in"
        style={{
          marginTop: 48,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          animationDelay: '0.6s',
        }}
      >
        <p
          style={{
            color: 'var(--text3)',
            fontSize: '0.72rem',
            margin: 0,
            letterSpacing: '0.1em',
          }}
        >
          Built by{' '}
          <a
            href="https://obinnachidi.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(220,38,38,0.35)',
              paddingBottom: 1,
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLAnchorElement).style.color =
                'var(--moon)'
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor =
                'var(--moon)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLAnchorElement).style.color =
                'var(--accent)'
              ;(e.currentTarget as HTMLAnchorElement).style.borderColor =
                'rgba(220,38,38,0.35)'
            }}
          >
            Lisan al Gaib
          </a>
        </p>
        <a
          href="mailto:chidiobinna0001@gmail.com?subject=Blood Moon — Feedback"
          style={{
            color: 'var(--text3)',
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            opacity: 0.7,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e =>
            ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')
          }
          onMouseLeave={e =>
            ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.7')
          }
        >
          Bug? Suggestion? Say hi →
        </a>
      </div>

      {/* ── Modal ──────────────────────────────────────── */}
      {modal !== 'none' && (
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
            if (e.target === e.currentTarget) reset()
          }}
        >
          <div
            className="card card-accent animate-fade-in-scale"
            style={{ width: '100%', maxWidth: 400 }}
          >
            {/* Modal header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: isHost
                    ? 'rgba(220,38,38,0.14)'
                    : 'rgba(124,58,237,0.12)',
                  border: `1.5px solid ${isHost ? 'rgba(220,38,38,0.35)' : 'rgba(124,58,237,0.28)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isHost ? (
                  <IconCrown size={20} color="var(--accent)" />
                ) : (
                  <IconLogIn size={20} color="var(--accent2)" />
                )}
              </div>
              <h2
                className="font-heading"
                style={{ margin: 0, fontSize: '1.2rem' }}
              >
                {isHost ? 'Host a Game' : 'Join a Game'}
              </h2>
              <button
                onClick={reset}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  cursor: 'pointer',
                  fontSize: '1.3rem',
                  lineHeight: 1,
                  padding: '2px 6px',
                  borderRadius: 6,
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={isHost ? handleHost : handleJoin}>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                {!isHost && (
                  <div>
                    <label style={labelStyle}>Game Code</label>
                    <input
                      className="input"
                      style={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.3em',
                        fontSize: '1.3rem',
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
                  <label style={labelStyle}>Your Name</label>
                  <input
                    className="input"
                    placeholder={isHost ? 'Host name...' : 'Your name...'}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={24}
                    autoFocus={isHost}
                  />
                </div>

                {error && (
                  <div
                    style={{
                      padding: '9px 13px',
                      background: 'rgba(220,38,38,0.1)',
                      border: '1px solid rgba(220,38,38,0.28)',
                      borderRadius: 8,
                      color: '#f87171',
                      fontSize: '0.85rem',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
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
                      loading || !name.trim() || (!isHost && code.length < 6)
                    }
                    style={{ flex: 2 }}
                  >
                    {loading ? '...' : isHost ? 'Create Game' : 'Join Game'}
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  color: 'var(--text2)',
  marginBottom: 7,
  fontFamily: 'Cinzel, serif',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}
