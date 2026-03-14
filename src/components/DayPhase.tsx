import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import PlayerAvatar from './PlayerAvatar'
import { IconSun, IconSkull, IconChat, IconEye } from './Icons'
import Countdown from './Countdown'

type Player = {
  _id: Id<'players'>
  name: string
  isAlive: boolean
  isHost: boolean
  role?: string
  seerResult?: string
  isMe?: boolean
  isSpectating?: boolean
  silenced?: boolean
  piResult?: string
  ftResult?: string
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
  phaseDeadline?: number
  timerVisibleToAll?: boolean
  deadCanChat?: boolean
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
  phaseDeadline,
  timerVisibleToAll,
  deadCanChat,
  onAdvanceToVoting,
}: Props) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{
    id: Id<'messages'>
    name: string
    content: string
  } | null>(null)
  const [mafiaMessage, setMafiaMessage] = useState('')
  const [sendingMafia, setSendingMafia] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const mafiaChatEndRef = useRef<HTMLDivElement>(null)

  const sendMessage = useMutation(api.messages.send)
  const messages = useQuery(api.messages.list, { gameId, round })
  const sendMafiaMsg = useMutation(api.mafiaMessages.send)
  const mafiaMessages = useQuery(api.mafiaMessages.list, { gameId, sessionId })
  const autoAdvanceToVoting = useMutation(api.games.autoAdvanceToVoting)
  const calledAutoRef = useRef(false)

  async function handleTimerExpire() {
    if (calledAutoRef.current) return
    calledAutoRef.current = true
    try {
      await autoAdvanceToVoting({ gameId, sessionId })
    } catch {
      calledAutoRef.current = false
    }
  }

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
    if (!message.trim() || (!me?.isAlive && !deadCanChat)) return
    setSending(true)
    try {
      await sendMessage({
        gameId,
        content: message.trim(),
        sessionId,
        replyToId: replyingTo?.id,
      })
      setMessage('')
      setReplyingTo(null)
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
  const isSilenced = me?.silenced === true

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
          {phaseDeadline && (isHost || (timerVisibleToAll ?? true)) && (
            <div style={{ marginTop: 8 }}>
              <Countdown
                deadline={phaseDeadline}
                onExpire={() => {
                  void handleTimerExpire()
                }}
              />
              {isHost && !(timerVisibleToAll ?? true) && (
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: '0.65rem',
                    color: 'var(--text3)',
                    letterSpacing: '0.05em',
                  }}
                >
                  (visible to host only)
                </p>
              )}
            </div>
          )}
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

        {/* Silence banner */}
        {isSilenced && !isGM && me?.isAlive && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: 'rgba(139,92,246,0.45)',
              background: 'rgba(139,92,246,0.08)',
              textAlign: 'center',
              animationDelay: '0.1s',
            }}
          >
            <p
              className="font-heading"
              style={{
                color: '#a78bfa',
                margin: '0 0 4px',
                fontSize: '0.9rem',
              }}
            >
              🌀 You have been silenced
            </p>
            <p
              style={{ color: 'var(--text2)', margin: 0, fontSize: '0.82rem' }}
            >
              The Spellcaster stole your voice. You cannot chat or vote today.
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

        {/* Player Inspector private result */}
        {myRole === 'playerInspector' && me?.piResult && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: 'rgba(14,165,233,0.4)',
              background: 'rgba(14,165,233,0.07)',
              animationDelay: '0.15s',
            }}
          >
            <p
              className="font-heading"
              style={{
                color: '#38bdf8',
                margin: '0 0 6px',
                fontSize: '0.8rem',
              }}
            >
              🔍 Your Inspection Result
            </p>
            <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>
              {me.piResult}
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

        {/* Fortune Teller private result */}
        {myRole === 'fortuneTeller' && me?.ftResult && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: 'rgba(99,102,241,0.4)',
              background: 'rgba(99,102,241,0.07)',
              animationDelay: '0.15s',
            }}
          >
            <p
              className="font-heading"
              style={{
                color: '#818cf8',
                margin: '0 0 6px',
                fontSize: '0.8rem',
              }}
            >
              🎱 Your Fortune Telling Result
            </p>
            <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>
              {me.ftResult}
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
                  {p.silenced && p.isAlive && (
                    <span
                      style={{
                        color: '#a78bfa',
                        fontSize: '0.72rem',
                        marginLeft: 6,
                        fontStyle: 'italic',
                      }}
                    >
                      🌀 silenced
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
              messages.map(msg => {
                const isMyMsg = msg.playerId === players.find(p => p.isMe)?._id
                const canReply =
                  (me?.isAlive || deadCanChat) && !isGM && !isSilenced
                return (
                  <div
                    key={msg._id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 4,
                      alignSelf: isMyMsg ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      flexDirection: isMyMsg ? 'row-reverse' : 'row',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMyMsg ? 'flex-end' : 'flex-start',
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
                            ? 'var(--accent)'
                            : 'var(--surface-solid)',
                          color: isMyMsg ? '#fff' : 'var(--text)',
                          fontSize: '0.88rem',
                          border: `1px solid var(--border)`,
                          position: 'relative',
                        }}
                      >
                        {msg.replyToContent && (
                          <div
                            style={{
                              borderLeft: isMyMsg
                                ? '2px solid rgba(255,255,255,0.35)'
                                : '2px solid rgba(100,100,140,0.5)',
                              paddingLeft: 8,
                              marginBottom: 6,
                              opacity: 0.75,
                            }}
                          >
                            <p
                              style={{
                                margin: '0 0 2px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                              }}
                            >
                              {msg.replyToName}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: '0.75rem',
                                lineHeight: 1.3,
                                wordBreak: 'break-word',
                              }}
                            >
                              {msg.replyToContent}
                            </p>
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                    {canReply && (
                      <button
                        type="button"
                        onClick={() =>
                          setReplyingTo({
                            id: msg._id,
                            name: msg.playerName,
                            content: msg.content,
                          })
                        }
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text3)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          padding: '2px 4px',
                          flexShrink: 0,
                          opacity: 0.6,
                          lineHeight: 1,
                        }}
                        title="Reply"
                      >
                        ↩
                      </button>
                    )}
                  </div>
                )
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {(me?.isAlive || deadCanChat) && !isGM && !isSilenced ? (
            <>
              {deadCanChat && !me?.isAlive && (
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(156,163,175,0.8)',
                    textAlign: 'center',
                    margin: '0 0 8px',
                    padding: '4px 8px',
                    background: 'rgba(100,100,120,0.15)',
                    borderRadius: 6,
                    border: '1px solid rgba(100,100,120,0.25)',
                  }}
                >
                  👻 Dead Chat — your messages are visible to all
                </p>
              )}
              {replyingTo && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: 'rgba(100,100,120,0.18)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    marginBottom: 6,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.7rem',
                        color: 'var(--accent)',
                        fontWeight: 600,
                      }}
                    >
                      ↩ Replying to {replyingTo.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: 'var(--text3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {replyingTo.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text3)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
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
            </>
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
              ) : isSilenced ? (
                <>
                  <span style={{ fontSize: 13 }}>🌀</span> The Spellcaster has
                  silenced you.
                </>
              ) : !me?.isAlive && !deadCanChat ? (
                <>
                  <IconSkull size={13} color="var(--text3)" /> The dead cannot
                  speak.
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
