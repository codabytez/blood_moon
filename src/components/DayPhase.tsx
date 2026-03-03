import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import PlayerAvatar from './PlayerAvatar'
import { IconSun, IconSkull, IconChat, IconEye } from './Icons'

type Player = {
  _id: Id<'players'>
  name: string
  isAlive: boolean
  isHost: boolean
  role?: string
  seerResult?: string
  isMe?: boolean
  isSpectating?: boolean
}

type Props = {
  gameId: Id<'games'>
  sessionId: string
  round: number
  players: Player[]
  isHost: boolean
  isGM: boolean
  isAlive: boolean
  nightAnnouncement?: string
  myRole: string
  onAdvanceToVoting: () => void
}

export default function DayPhase({
  gameId,
  sessionId,
  round,
  players,
  isHost,
  isGM,
  nightAnnouncement,
  myRole,
  onAdvanceToVoting,
}: Props) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [mafiaMessage, setMafiaMessage] = useState('')
  const [sendingMafia, setSendingMafia] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const mafiaChatEndRef = useRef<HTMLDivElement>(null)

  const sendMessage = useMutation(api.messages.send)
  const messages = useQuery(api.messages.list, { gameId, round })
  const sendMafiaMsg = useMutation(api.mafiaMessages.send)
  const mafiaMessages = useQuery(api.mafiaMessages.list, { gameId, sessionId })

  const canSeeMafiaChat = myRole === 'mafia' || isGM

  const me = players.find(p => p.isMe)
  const alivePlayers = players.filter(p => p.isAlive)
  const deadPlayers = players.filter(p => !p.isAlive)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    mafiaChatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mafiaMessages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || !me?.isAlive) return
    setSending(true)
    try {
      await sendMessage({ gameId, content: message.trim(), sessionId })
      setMessage('')
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  async function handleSendMafia(e: React.FormEvent) {
    e.preventDefault()
    if (!mafiaMessage.trim()) return
    setSendingMafia(true)
    try {
      await sendMafiaMsg({ gameId, content: mafiaMessage.trim(), sessionId })
      setMafiaMessage('')
    } catch {
      // ignore
    } finally {
      setSendingMafia(false)
    }
  }

  async function handleVoting() {
    setAdvancing(true)
    try {
      await onAdvanceToVoting()
    } finally {
      setAdvancing(false)
    }
  }

  const seerResult = me?.seerResult

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
      }}
    >
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Header */}
        <div
          className="animate-fade-in"
          style={{ textAlign: 'center', marginBottom: 20 }}
        >
          <p
            className="font-heading"
            style={{
              color: 'var(--text2)',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: '0 0 4px',
            }}
          >
            Round {round} •
          </p>
          <h1
            className="font-title"
            style={{
              color: 'var(--accent)',
              fontSize: '2rem',
              margin: 0,
              textShadow: '0 0 30px var(--accent-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <IconSun size={28} color="var(--accent)" />
            Dawn Breaks
          </h1>
        </div>

        {/* Night announcement */}
        {nightAnnouncement && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              textAlign: 'center',
              borderColor: 'rgba(220,38,38,0.4)',
              background: 'rgba(220,38,38,0.06)',
              animationDelay: '0.1s',
            }}
          >
            <p
              className="font-heading"
              style={{
                color: 'var(--text2)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                margin: '0 0 8px',
              }}
            >
              What happened last night
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '1rem',
                color: 'var(--text)',
                lineHeight: 1.5,
              }}
            >
              {nightAnnouncement}
            </p>
          </div>
        )}

        {/* Seer private result */}
        {myRole === 'seer' && seerResult && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: 'rgba(124,58,237,0.4)',
              background: 'rgba(124,58,237,0.08)',
              animationDelay: '0.15s',
            }}
          >
            <p
              className="font-heading"
              style={{
                color: '#a78bfa',
                margin: '0 0 6px',
                fontSize: '0.8rem',
              }}
            >
              🔮 Your Investigation Result
            </p>
            <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>
              {seerResult}
            </p>
            <p
              style={{
                margin: '6px 0 0',
                color: 'var(--text3)',
                fontSize: '0.75rem',
              }}
            >
              Only you can see this.
            </p>
          </div>
        )}

        {/* Players status */}
        <div
          className="card animate-fade-in"
          style={{ marginBottom: 16, animationDelay: '0.2s' }}
        >
          <h2
            className="font-heading"
            style={{
              margin: '0 0 12px',
              fontSize: '0.9rem',
              color: 'var(--text2)',
            }}
          >
            Village — {alivePlayers.length} alive
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {players.map(p => (
              <div
                key={p._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 12px',
                  borderRadius: 8,
                  background: p.isAlive ? 'var(--surface)' : 'rgba(0,0,0,0.15)',
                  opacity: p.isAlive ? 1 : 0.5,
                  border: `1px solid ${p.isMe && p.isAlive ? 'var(--border-accent)' : 'var(--border)'}`,
                }}
              >
                <PlayerAvatar name={p.name} size={28} dead={!p.isAlive} />
                <span
                  style={{
                    flex: 1,
                    fontWeight: p.isMe ? 600 : 400,
                    textDecoration: p.isAlive ? 'none' : 'line-through',
                    color: p.isAlive ? 'var(--text)' : '#6b7280',
                  }}
                >
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
                {isGM && p.role ? (
                  <span className={`badge badge-${p.role}`}>{p.role}</span>
                ) : !p.isAlive ? (
                  <span className="badge badge-dead">Eliminated</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Dead players */}
        {deadPlayers.length > 0 && (
          <div
            className="card animate-fade-in"
            style={{ marginBottom: 16, opacity: 0.7, animationDelay: '0.25s' }}
          >
            <p
              className="font-heading"
              style={{
                margin: '0 0 8px',
                fontSize: '0.8rem',
                color: 'var(--text3)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <IconSkull size={13} color="var(--text3)" /> Eliminated
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {deadPlayers.map(p => (
                <span key={p._id} className="badge badge-dead">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Village chat */}
        <div
          className="card animate-fade-in"
          style={{ marginBottom: 16, animationDelay: '0.3s' }}
        >
          <h2
            className="font-heading"
            style={{
              margin: '0 0 12px',
              fontSize: '0.9rem',
              color: 'var(--text2)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <IconChat size={14} color="var(--text2)" /> Village Discussion
          </h2>

          <div
            style={{
              height: 260,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 12,
              paddingRight: 4,
            }}
          >
            {!messages || messages.length === 0 ? (
              <p
                style={{
                  color: 'var(--text3)',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  margin: 'auto 0',
                }}
              >
                No messages yet. Start the debate!
              </p>
            ) : (
              messages.map(msg => (
                <div
                  key={msg._id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf:
                      msg.playerId === players.find(p => p.isMe)?._id
                        ? 'flex-end'
                        : 'flex-start',
                    maxWidth: '80%',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text3)',
                      marginBottom: 2,
                      paddingLeft: 4,
                    }}
                  >
                    {msg.playerName}
                  </span>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      background:
                        msg.playerId === players.find(p => p.isMe)?._id
                          ? 'var(--accent)'
                          : 'var(--surface-solid)',
                      color:
                        msg.playerId === players.find(p => p.isMe)?._id
                          ? '#fff'
                          : 'var(--text)',
                      fontSize: '0.88rem',
                      border: `1px solid var(--border)`,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {me?.isAlive && !isGM ? (
            <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="Speak your mind..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={500}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!message.trim() || sending}
                style={{ whiteSpace: 'nowrap' }}
              >
                Send
              </button>
            </form>
          ) : (
            <p
              style={{
                color: 'var(--text3)',
                fontSize: '0.82rem',
                textAlign: 'center',
                margin: 0,
                padding: '8px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {isGM ? (
                <>
                  <IconEye size={13} color="var(--text3)" /> Game Masters
                  observe silently.
                </>
              ) : (
                <>
                  <IconSkull size={13} color="var(--text3)" /> The dead cannot
                  speak.
                </>
              )}
            </p>
          )}
        </div>

        {/* Mafia HQ chat */}
        {canSeeMafiaChat && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: 'rgba(220,38,38,0.35)',
              background: 'rgba(220,38,38,0.04)',
              animationDelay: '0.35s',
            }}
          >
            <h2
              className="font-heading"
              style={{
                margin: '0 0 12px',
                fontSize: '0.9rem',
                color: '#f87171',
              }}
            >
              😈 Mafia HQ
            </h2>

            <div
              style={{
                height: 180,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 12,
                paddingRight: 4,
              }}
            >
              {!mafiaMessages || mafiaMessages.length === 0 ? (
                <p
                  style={{
                    color: 'var(--text3)',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    margin: 'auto 0',
                  }}
                >
                  No messages yet...
                </p>
              ) : (
                mafiaMessages.map(msg => {
                  const isMyMsg =
                    players.find(p => p.isMe)?._id === msg.playerId
                  return (
                    <div
                      key={msg._id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignSelf: isMyMsg ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text3)',
                          marginBottom: 2,
                          paddingLeft: 4,
                        }}
                      >
                        {msg.playerName}
                      </span>
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: 10,
                          background: isMyMsg
                            ? 'rgba(220,38,38,0.7)'
                            : 'var(--surface-solid)',
                          color: isMyMsg ? '#fff' : 'var(--text)',
                          fontSize: '0.88rem',
                          border: '1px solid rgba(220,38,38,0.3)',
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={mafiaChatEndRef} />
            </div>

            {myRole === 'mafia' && me?.isAlive ? (
              <form
                onSubmit={handleSendMafia}
                style={{ display: 'flex', gap: 8 }}
              >
                <input
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="Whisper to your allies..."
                  value={mafiaMessage}
                  onChange={e => setMafiaMessage(e.target.value)}
                  maxLength={500}
                />
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={!mafiaMessage.trim() || sendingMafia}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Send
                </button>
              </form>
            ) : (
              <p
                style={{
                  color: 'var(--text3)',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  margin: 0,
                  fontStyle: 'italic',
                }}
              >
                {isGM
                  ? 'Observing mafia communications'
                  : 'Dead mafia cannot send.'}
              </p>
            )}
          </div>
        )}

        {/* Host voting button */}
        {isHost && (
          <button
            className="btn btn-danger btn-lg animate-fade-in"
            style={{ width: '100%', animationDelay: '0.4s' }}
            disabled={advancing}
            onClick={handleVoting}
          >
            {advancing ? 'Starting...' : 'Start Voting'}
          </button>
        )}
      </div>
    </div>
  )
}
