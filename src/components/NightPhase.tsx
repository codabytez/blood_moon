import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import Countdown from './Countdown'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { errMsg } from '../lib/errMsg'
import PlayerAvatar from './PlayerAvatar'
import { IconCheck, IconHourglass, IconMoon, IconSkull, IconEye } from './Icons'

type Player = {
  _id: Id<'players'>
  name: string
  isAlive: boolean
  isHost: boolean
  role?: string
  isMe?: boolean
  isSpectating?: boolean
  piResult?: string
  ftResult?: string
  beholderResult?: string
}

type ActionStatus = {
  isGM: boolean
  mafiaNeeded: boolean
  mafiaSubmitted: boolean
  mafiaTargetName: string | null
  seerNeeded: boolean
  seerSubmitted: boolean
  seerTargetName: string | null
  doctorNeeded: boolean
  doctorSubmitted: boolean
  doctorTargetName: string | null
  bodyguardNeeded: boolean
  bodyguardSubmitted: boolean
  bodyguardTargetName: string | null
  spellcasterNeeded: boolean
  spellcasterSubmitted: boolean
  spellcasterTargetName: string | null
  fortuneTellerNeeded: boolean
  fortuneTellerSubmitted: boolean
  fortuneTellerTargetName: string | null
  piNeeded: boolean
  piSubmitted: boolean
  piTargetName: string | null
  priestNeeded: boolean
  priestSubmitted: boolean
  amuletNeeded: boolean
  amuletSubmitted: boolean
  allReady: boolean
} | null

type Props = {
  gameId: Id<'games'>
  sessionId: string
  round: number
  players: Player[]
  myRole: string
  isHost: boolean
  isGM: boolean
  eliminationAnnouncement?: string
  nightActionStatus: ActionStatus
  phaseDeadline?: number
  timerVisibleToAll?: boolean
  onAdvanceToDay: () => Promise<void>
}

const roleActions: Record<
  string,
  { verb: string; icon: string; color: string; warning: string }
> = {
  mafia: {
    verb: 'Choose your target to eliminate',
    icon: '🗡️',
    color: '#f87171',
    warning: 'Choose wisely — the village will notice.',
  },
  seer: {
    verb: 'Choose someone to investigate',
    icon: '🔮',
    color: '#a78bfa',
    warning: 'Your vision will be revealed at dawn.',
  },
  doctor: {
    verb: 'Choose someone to protect',
    icon: '💉',
    color: '#38bdf8',
    warning: 'You may also protect yourself.',
  },
  bodyguard: {
    verb: 'Choose someone to protect tonight',
    icon: '🛡️',
    color: '#2dd4bf',
    warning: 'You cannot protect the same player two nights in a row.',
  },
  fortuneTeller: {
    verb: 'Peer into the future — choose who to read',
    icon: '🎱',
    color: '#818cf8',
    warning: 'You will learn their exact role at dawn.',
  },
  playerInspector: {
    verb: "Inspect a player's alignment",
    icon: '🔍',
    color: '#38bdf8',
    warning: 'You will learn if they are Suspicious or Clear.',
  },
  priest: {
    verb: 'Bless one player — first night only',
    icon: '⛪',
    color: '#fb7185',
    warning: 'Your blessing only works on the first night.',
  },
  spellcaster: {
    verb: 'Silence one player for the day',
    icon: '🌀',
    color: '#a78bfa',
    warning: 'The silenced player cannot chat or vote tomorrow.',
  },
  amuletOfProtection: {
    verb: 'Use the amulet to protect one player',
    icon: '🧿',
    color: '#fbbf24',
    warning: 'Once used, the amulet is spent. Choose wisely.',
  },
  hunter: {
    verb: 'Wait in the shadows',
    icon: '🏹',
    color: '#fb923c',
    warning:
      'If you are eliminated, you choose one player to take down with you.',
  },
  prince: {
    verb: 'Rest easy — your vote-shield holds',
    icon: '👑',
    color: '#fbbf24',
    warning: 'Day votes cannot touch you. Night is another matter.',
  },
  lycan: {
    verb: 'The night is long...',
    icon: '🐺',
    color: '#a3e635',
    warning: "You're a Villager at heart — but the Seer sees a monster in you.",
  },
  mason: {
    verb: 'Trust your fellow Mason',
    icon: '🧱',
    color: '#94a3b8',
    warning:
      'You and your Mason partner are confirmed Villagers. Check the player list below.',
  },
  apprenticeSeer: {
    verb: 'The Seer still lives — wait',
    icon: '🔭',
    color: '#c084fc',
    warning:
      "If the Seer falls, their gift passes to you. You'll act from the next night.",
  },
  beholder: {
    verb: 'The Beholder watches in silence',
    icon: '👁️',
    color: '#22d3ee',
    warning: 'You know who the Seer is. Guard that secret with your life.',
  },
  toughGuy: {
    verb: 'Rest easy — you can take a hit',
    icon: '💪',
    color: '#fb923c',
    warning:
      'You will survive the first werewolf attack — but you die the following night.',
  },
  king: {
    verb: 'Rule wisely — your vote counts double',
    icon: '🤴',
    color: '#facc15',
    warning:
      'If you are eliminated, you get a revenge shot just like the Hunter.',
  },
  diseased: {
    verb: 'Sleep, and hope they do not find you',
    icon: '🤢',
    color: '#94a3b8',
    warning:
      'If the Mafia kills you, they cannot kill anyone the following night.',
  },
  cursed: {
    verb: 'The curse runs deep...',
    icon: '🩸',
    color: '#f87171',
    warning:
      'If the Mafia targets you, you will become one of them instead of dying.',
  },
  pacifist: {
    verb: 'You seek peace, not justice',
    icon: '🕊️',
    color: '#7dd3fc',
    warning:
      'You cannot vote to eliminate anyone. But your voice still matters.',
  },
  villageIdiot: {
    verb: 'Blend in... or not',
    icon: '🤡',
    color: '#a3e635',
    warning: 'No special powers — just a good excuse for acting suspicious.',
  },
}

export default function NightPhase({
  gameId,
  sessionId,
  round,
  players,
  myRole,
  isHost,
  isGM,
  eliminationAnnouncement,
  nightActionStatus,
  phaseDeadline,
  timerVisibleToAll,
  onAdvanceToDay,
}: Props) {
  const [selectedTarget, setSelectedTarget] = useState<Id<'players'> | null>(
    null
  )
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [advanceError, setAdvanceError] = useState('')
  const [error, setError] = useState('')
  const [mafiaMessage, setMafiaMessage] = useState('')
  const [sendingMafia, setSendingMafia] = useState(false)
  const mafiaChatEndRef = useRef<HTMLDivElement>(null)

  const submitAction = useMutation(api.nightActions.submit)
  const sendMafiaMsg = useMutation(api.mafiaMessages.send)
  const mafiaMessages = useQuery(api.mafiaMessages.list, { gameId, sessionId })
  const autoAdvanceToDay = useMutation(api.games.autoAdvanceToDay)
  const calledAutoRef = useRef(false)

  async function handleTimerExpire() {
    if (calledAutoRef.current) return
    calledAutoRef.current = true
    try {
      await autoAdvanceToDay({ gameId, sessionId })
    } catch {
      calledAutoRef.current = false
    }
  }

  const canSeeMafiaChat = myRole === 'mafia' || isGM
  const me = players.find(p => p.isMe)
  const targetablePlayers = players.filter(
    p => p.isAlive && !p.isMe && !p.isSpectating
  )
  const myMafiaPartners =
    myRole === 'mafia'
      ? players.filter(p => p.role === 'mafia' && !p.isMe && p.isAlive)
      : []
  const hasAction =
    myRole === 'mafia' ||
    myRole === 'seer' ||
    myRole === 'doctor' ||
    myRole === 'bodyguard' ||
    myRole === 'fortuneTeller' ||
    myRole === 'playerInspector' ||
    myRole === 'priest' ||
    myRole === 'spellcaster' ||
    myRole === 'amuletOfProtection'
  const actionCfg = roleActions[myRole]

  useEffect(() => {
    mafiaChatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mafiaMessages])

  async function handleSubmit() {
    if (!selectedTarget) return
    setLoading(true)
    setError('')
    try {
      await submitAction({ gameId, targetId: selectedTarget, sessionId })
      setSubmitted(true)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleAdvance() {
    setAdvancing(true)
    setAdvanceError('')
    try {
      await onAdvanceToDay()
    } catch (err) {
      setAdvanceError(errMsg(err))
    } finally {
      setAdvancing(false)
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
      {/* Phase header */}
      <div
        className="animate-fade-in"
        style={{
          textAlign: 'center',
          marginBottom: 24,
          width: '100%',
          maxWidth: 520,
        }}
      >
        <p
          className="font-heading"
          style={{
            color: 'rgba(155,140,192,0.6)',
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
            color: '#e8e0f8',
            fontSize: '2rem',
            margin: 0,
            textShadow: '0 0 30px rgba(220,38,38,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <IconMoon size={28} color="#e8e0f8" />
          Night Falls
        </h1>
        <p
          style={{
            color: 'var(--text2)',
            margin: '8px 0 0',
            fontSize: '0.9rem',
          }}
        >
          Silence falls over the village...
        </p>
        {phaseDeadline && !isGM && (timerVisibleToAll ?? true) && (
          <div style={{ marginTop: 8 }}>
            <Countdown
              deadline={phaseDeadline}
              onExpire={() => {
                void handleTimerExpire()
              }}
            />
          </div>
        )}
      </div>

      {/* Previous round elimination */}
      {eliminationAnnouncement && round > 1 && (
        <div
          className="card animate-fade-in"
          style={{
            width: '100%',
            maxWidth: 520,
            marginBottom: 16,
            borderColor: 'rgba(220,38,38,0.3)',
            background: 'rgba(220,38,38,0.06)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.9rem' }}>
            {eliminationAnnouncement}
          </p>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Beholder result (night 1 only — shows seer's name) */}
        {!isGM && myRole === 'beholder' && me?.beholderResult && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: 'rgba(6,182,212,0.4)',
              background: 'rgba(6,182,212,0.07)',
            }}
          >
            <p
              className="font-heading"
              style={{
                color: '#22d3ee',
                margin: '0 0 6px',
                fontSize: '0.8rem',
              }}
            >
              👁️ Your Beholder Sight
            </p>
            <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>
              The Seer is{' '}
              <strong style={{ color: '#22d3ee' }}>{me.beholderResult}</strong>
            </p>
            <p
              style={{
                margin: '6px 0 0',
                color: 'var(--text3)',
                fontSize: '0.75rem',
              }}
            >
              Only you can see this. Protect them.
            </p>
          </div>
        )}

        {/* Player Inspector result from previous night */}
        {!isGM && myRole === 'playerInspector' && me?.piResult && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: 'rgba(14,165,233,0.4)',
              background: 'rgba(14,165,233,0.07)',
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

        {/* Fortune Teller result from previous night */}
        {!isGM && myRole === 'fortuneTeller' && me?.ftResult && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: 'rgba(99,102,241,0.4)',
              background: 'rgba(99,102,241,0.07)',
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

        {/* Mafia allies */}
        {myRole === 'mafia' && myMafiaPartners.length > 0 && (
          <div
            className="card animate-fade-in"
            style={{ marginBottom: 16, borderColor: 'rgba(220,38,38,0.3)' }}
          >
            <p
              className="font-heading"
              style={{
                margin: '0 0 10px',
                fontSize: '0.85rem',
                color: '#f87171',
              }}
            >
              😈 Your Mafia Partners
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {myMafiaPartners.map(p => (
                <span key={p._id} className="badge badge-mafia">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Mason partners */}
        {myRole === 'mason' && (
          <div
            className="card animate-fade-in"
            style={{ marginBottom: 16, borderColor: 'rgba(148,163,184,0.3)' }}
          >
            <p
              className="font-heading"
              style={{
                margin: '0 0 10px',
                fontSize: '0.85rem',
                color: '#94a3b8',
              }}
            >
              🧱 Your Mason Brother
            </p>
            {players.filter(p => p.role === 'mason' && !p.isMe).length > 0 ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {players
                  .filter(p => p.role === 'mason' && !p.isMe)
                  .map(p => (
                    <span key={p._id} className="badge badge-mason">
                      {p.name}
                      {!p.isAlive && ' ☠️'}
                    </span>
                  ))}
              </div>
            ) : (
              <p
                style={{
                  color: 'var(--text3)',
                  fontSize: '0.85rem',
                  margin: 0,
                }}
              >
                Your partner has fallen.
              </p>
            )}
          </div>
        )}

        {/* HOST PANEL */}
        {isHost && nightActionStatus && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: isGM ? 'rgba(124,58,237,0.25)' : 'var(--border)',
            }}
          >
            <h2
              className="font-heading"
              style={{
                margin: '0 0 14px',
                fontSize: '0.95rem',
                color: isGM ? '#a78bfa' : 'var(--text2)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isGM ? (
                <>
                  <IconEye size={14} color="#a78bfa" />
                  Game Master — Night Status
                </>
              ) : (
                'Night Actions'
              )}
            </h2>

            {phaseDeadline && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
                  Auto-advance in{' '}
                </span>
                <Countdown
                  deadline={phaseDeadline}
                  onExpire={() => {
                    void handleTimerExpire()
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nightActionStatus.mafiaNeeded && (
                <StatusRow
                  label="Mafia Kill"
                  submitted={nightActionStatus.mafiaSubmitted}
                  target={nightActionStatus.mafiaTargetName ?? undefined}
                />
              )}
              {nightActionStatus.seerNeeded && (
                <StatusRow
                  label="Seer Investigation"
                  submitted={nightActionStatus.seerSubmitted}
                  target={nightActionStatus.seerTargetName ?? undefined}
                />
              )}
              {nightActionStatus.doctorNeeded && (
                <StatusRow
                  label="Doctor Protection"
                  submitted={nightActionStatus.doctorSubmitted}
                  target={nightActionStatus.doctorTargetName ?? undefined}
                />
              )}
              {nightActionStatus.bodyguardNeeded && (
                <StatusRow
                  label="Bodyguard Protection"
                  submitted={nightActionStatus.bodyguardSubmitted}
                  target={nightActionStatus.bodyguardTargetName ?? undefined}
                />
              )}
              {nightActionStatus.spellcasterNeeded && (
                <StatusRow
                  label="Spellcaster Silence"
                  submitted={nightActionStatus.spellcasterSubmitted}
                  target={nightActionStatus.spellcasterTargetName ?? undefined}
                />
              )}
              {nightActionStatus.fortuneTellerNeeded && (
                <StatusRow
                  label="Fortune Teller Reading"
                  submitted={nightActionStatus.fortuneTellerSubmitted}
                  target={
                    nightActionStatus.fortuneTellerTargetName ?? undefined
                  }
                />
              )}
              {nightActionStatus.piNeeded && (
                <StatusRow
                  label="Player Inspector"
                  submitted={nightActionStatus.piSubmitted}
                  target={nightActionStatus.piTargetName ?? undefined}
                />
              )}
              {nightActionStatus.priestNeeded && (
                <StatusRow
                  label="Priest Blessing"
                  submitted={nightActionStatus.priestSubmitted}
                />
              )}
              {nightActionStatus.amuletNeeded && (
                <StatusRow
                  label="Amulet of Protection"
                  submitted={nightActionStatus.amuletSubmitted}
                />
              )}
            </div>

            <div className="divider" />

            {advanceError && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(220,38,38,0.1)',
                  borderRadius: 8,
                  color: '#f87171',
                  fontSize: '0.85rem',
                  marginBottom: 10,
                }}
              >
                {advanceError}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={advancing || !nightActionStatus.allReady}
              onClick={handleAdvance}
            >
              {advancing
                ? 'Processing...'
                : nightActionStatus.allReady
                  ? 'Advance to Day'
                  : 'Waiting for players to act...'}
            </button>
          </div>
        )}

        {/* PLAYER ACTION CARD */}
        {!isGM && me?.isAlive && hasAction && (
          <div
            className="card card-accent animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: submitted
                ? 'rgba(22,163,74,0.4)'
                : `${actionCfg?.color}40`,
            }}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <IconCheck size={44} color="#4ade80" />
                </div>
                <p
                  className="font-heading"
                  style={{
                    color: '#4ade80',
                    margin: '0 0 6px',
                    fontSize: '1rem',
                  }}
                >
                  Action submitted
                </p>
                <p
                  style={{
                    color: 'var(--text2)',
                    margin: 0,
                    fontSize: '0.85rem',
                  }}
                >
                  Wait for dawn...
                </p>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 12 }}
                  onClick={() => setSubmitted(false)}
                >
                  Change target
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{actionCfg?.icon}</span>
                  <div>
                    <p
                      className="font-heading"
                      style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        color: actionCfg?.color,
                      }}
                    >
                      {actionCfg?.verb}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color: 'var(--text3)',
                        fontSize: '0.78rem',
                      }}
                    >
                      {actionCfg?.warning}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {targetablePlayers
                    .filter(p => myRole !== 'mafia' || p.role !== 'mafia')
                    .map(p => (
                      <button
                        key={p._id}
                        onClick={() =>
                          setSelectedTarget(prev =>
                            prev === p._id ? null : p._id
                          )
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 14px',
                          borderRadius: 8,
                          background:
                            selectedTarget === p._id
                              ? `${actionCfg?.color}18`
                              : 'var(--surface)',
                          border: `1.5px solid ${selectedTarget === p._id ? actionCfg?.color : 'var(--border)'}`,
                          cursor: 'pointer',
                          color: 'var(--text)',
                          transition: 'all 0.15s',
                          width: '100%',
                          textAlign: 'left',
                        }}
                      >
                        <PlayerAvatar name={p.name} size={28} />
                        <span
                          style={{
                            fontWeight: selectedTarget === p._id ? 600 : 400,
                          }}
                        >
                          {p.name}
                        </span>
                        {selectedTarget === p._id && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              color: actionCfg?.color,
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
                  style={{ width: '100%' }}
                  disabled={!selectedTarget || loading}
                  onClick={handleSubmit}
                >
                  {loading ? 'Submitting...' : `${actionCfg?.icon} Confirm`}
                </button>
              </>
            )}
          </div>
        )}

        {/* Villager / Passive role / Dead waiting screen */}
        {!isGM && (!hasAction || !me?.isAlive) && (
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
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {!me?.isAlive ? (
                <IconSkull size={52} color="#6b7280" />
              ) : (
                <span style={{ fontSize: 52 }}>
                  {roleActions[myRole]?.icon ?? '😴'}
                </span>
              )}
            </div>
            <h2
              className="font-heading"
              style={{
                margin: '0 0 8px',
                fontSize: '1.1rem',
                color: me?.isAlive
                  ? (roleActions[myRole]?.color ?? 'var(--text)')
                  : 'var(--text)',
              }}
            >
              {!me?.isAlive
                ? 'You are dead'
                : (roleActions[myRole]?.verb ?? 'The night is long...')}
            </h2>
            <p style={{ color: 'var(--text2)', margin: 0, fontSize: '0.9rem' }}>
              {!me?.isAlive
                ? 'Watch silently. Your lips are sealed until the game ends.'
                : (roleActions[myRole]?.warning ??
                  'Close your eyes. The village sleeps... but not everyone.')}
            </p>
          </div>
        )}

        {/* Mafia HQ chat */}
        {canSeeMafiaChat && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 16,
              borderColor: 'rgba(220,38,38,0.35)',
              background: 'rgba(220,38,38,0.04)',
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
                height: 200,
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
                  No messages yet. Coordinate your plan...
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

        {/* Alive players list */}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {players
              .filter(p => !p.isSpectating)
              .map(p => (
                <div
                  key={p._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px 4px 5px',
                    borderRadius: 99,
                    background: p.isAlive
                      ? 'var(--surface)'
                      : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${p.isAlive ? 'var(--border)' : 'rgba(100,100,100,0.2)'}`,
                    opacity: p.isAlive ? 1 : 0.45,
                    fontSize: '0.85rem',
                  }}
                >
                  {p.isAlive ? (
                    <IconMoon size={13} color="var(--text3)" />
                  ) : (
                    <IconSkull size={13} color="#6b7280" />
                  )}
                  <span
                    style={{
                      fontWeight: p.isMe ? 600 : 400,
                      color: p.isAlive ? 'var(--text)' : '#9ca3af',
                      textDecoration: p.isAlive ? 'none' : 'line-through',
                    }}
                  >
                    {p.name}
                  </span>
                  {p.role && (
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

function StatusRow({
  label,
  submitted,
  target,
}: {
  label: string
  submitted: boolean
  target?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 8,
        background: submitted ? 'rgba(22,163,74,0.08)' : 'rgba(0,0,0,0.2)',
        border: `1px solid ${submitted ? 'rgba(22,163,74,0.3)' : 'var(--border)'}`,
      }}
    >
      {submitted ? (
        <IconCheck size={16} color="#4ade80" />
      ) : (
        <IconHourglass size={16} color="var(--text3)" />
      )}
      <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text2)' }}>
        {label}
      </span>
      {submitted && target && (
        <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600 }}>
          → {target}
        </span>
      )}
      {!submitted && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
          Waiting...
        </span>
      )}
    </div>
  )
}
