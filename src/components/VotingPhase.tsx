import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { errMsg } from '../lib/errMsg'
import PlayerAvatar from './PlayerAvatar'
import { IconCrosshair, IconSkull, IconEye, IconWarning } from './Icons'

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
  gameId: Id<'games'>
  sessionId: string
  round: number
  players: Player[]
  isHost: boolean
  isGM: boolean
  isAlive: boolean
  onProcessElimination: () => Promise<void>
}

export default function VotingPhase({
  gameId,
  sessionId,
  round,
  players,
  isHost,
  isGM,
  onProcessElimination,
}: Props) {
  const [processing, setProcessing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const submitVote = useMutation(api.votes.submit)
  const voteData = useQuery(api.votes.list, { gameId, sessionId })

  const me = players.find(p => p.isMe)
  const alivePlayers = players.filter(p => p.isAlive && !p.isSpectating)
  const myVote = voteData?.myVote
  const tally = voteData?.tally ?? []
  const totalVotes = voteData?.totalVotes ?? 0

  async function handleVote(targetId: Id<'players'>) {
    setSubmitting(true)
    setError('')
    try {
      await submitVote({ gameId, targetId, sessionId })
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSubmitting(false)
    }
  }

  function requestEliminate() {
    if (totalVotes < alivePlayers.length) {
      setShowConfirm(true)
    } else {
      void confirmEliminate()
    }
  }

  async function confirmEliminate() {
    setShowConfirm(false)
    setProcessing(true)
    try {
      await onProcessElimination()
    } finally {
      setProcessing(false)
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
      }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Header */}
        <div
          className="animate-fade-in"
          style={{ textAlign: 'center', marginBottom: 24 }}
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
            }}
          >
            🗳️ Time to Vote
          </h1>
          <p
            style={{
              color: 'var(--text2)',
              margin: '8px 0 0',
              fontSize: '0.9rem',
            }}
          >
            Choose who to eliminate from the village
          </p>
        </div>

        {/* Vote tally */}
        <div
          className="card animate-fade-in"
          style={{ marginBottom: 16, animationDelay: '0.05s' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: tally.length > 0 ? 12 : 0,
            }}
          >
            <p
              className="font-heading"
              style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text2)' }}
            >
              Vote Tally
            </p>
            <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
              {totalVotes} / {alivePlayers.length} voted
            </span>
          </div>

          {tally.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tally.map(t => {
                const pct = alivePlayers.length
                  ? Math.round((t.count / alivePlayers.length) * 100)
                  : 0
                return (
                  <div key={t.targetId}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                        fontSize: '0.85rem',
                      }}
                    >
                      <span>{t.targetName}</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        {t.count} vote{t.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: 'var(--border)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'var(--accent)',
                          borderRadius: 3,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p
              style={{ color: 'var(--text3)', fontSize: '0.85rem', margin: 0 }}
            >
              No votes yet...
            </p>
          )}
        </div>

        {/* Vote targets */}
        {me?.isAlive && !isGM && (
          <div
            className="card animate-fade-in"
            style={{ marginBottom: 16, animationDelay: '0.1s' }}
          >
            <h2
              className="font-heading"
              style={{ margin: '0 0 14px', fontSize: '0.95rem' }}
            >
              {myVote ? 'Your vote is cast' : 'Cast your vote'}
            </h2>

            {myVote && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(217,119,6,0.1)',
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: '0.85rem',
                  color: 'var(--text2)',
                  border: '1px solid rgba(217,119,6,0.2)',
                }}
              >
                You voted for{' '}
                <strong style={{ color: 'var(--accent)' }}>
                  {players.find(p => p._id === myVote)?.name}
                </strong>
                . You can change it.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alivePlayers
                .filter(p => !p.isMe && !p.isSpectating)
                .map(p => (
                  <button
                    key={p._id}
                    onClick={() => handleVote(p._id)}
                    disabled={submitting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 14px',
                      borderRadius: 8,
                      background:
                        myVote === p._id
                          ? 'rgba(220,38,38,0.1)'
                          : 'var(--surface)',
                      border: `1.5px solid ${myVote === p._id ? 'rgba(220,38,38,0.5)' : 'var(--border)'}`,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      color: 'var(--text)',
                      transition: 'all 0.15s',
                      width: '100%',
                      textAlign: 'left',
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {myVote === p._id ? (
                      <IconCrosshair size={20} color="#f87171" />
                    ) : (
                      <PlayerAvatar name={p.name} size={28} />
                    )}
                    <span style={{ fontWeight: myVote === p._id ? 600 : 400 }}>
                      {p.name}
                    </span>
                    {myVote === p._id && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          color: '#f87171',
                          fontSize: '0.8rem',
                          fontFamily: 'Cinzel, serif',
                        }}
                      >
                        Your Vote ✓
                      </span>
                    )}
                  </button>
                ))}
            </div>

            {error && (
              <p
                style={{
                  color: '#f87171',
                  fontSize: '0.85rem',
                  marginTop: 10,
                  marginBottom: 0,
                }}
              >
                {error}
              </p>
            )}
          </div>
        )}

        {/* GM view */}
        {isGM && (
          <div
            className="card animate-fade-in"
            style={{
              textAlign: 'center',
              padding: '24px',
              marginBottom: 16,
              borderColor: 'rgba(124,58,237,0.3)',
              background: 'rgba(124,58,237,0.06)',
              animationDelay: '0.1s',
            }}
          >
            <p
              className="font-heading"
              style={{
                margin: '0 0 4px',
                color: '#a78bfa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <IconEye size={14} color="#a78bfa" /> Game Master View
            </p>
            <p
              style={{ color: 'var(--text3)', margin: 0, fontSize: '0.85rem' }}
            >
              Observing the vote. Tally and eliminate when ready.
            </p>
          </div>
        )}

        {/* Dead player message */}
        {!me?.isAlive && !isGM && (
          <div
            className="card animate-fade-in"
            style={{
              textAlign: 'center',
              padding: '40px 24px',
              animationDelay: '0.1s',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <IconSkull size={44} color="#6b7280" />
            </div>
            <p className="font-heading" style={{ margin: '0 0 6px' }}>
              You are eliminated
            </p>
            <p
              style={{ color: 'var(--text2)', margin: 0, fontSize: '0.88rem' }}
            >
              Watch silently as the living vote.
            </p>
          </div>
        )}

        {/* Player list */}
        <div
          className="card animate-fade-in"
          style={{ marginBottom: 16, animationDelay: '0.15s' }}
        >
          <h2
            className="font-heading"
            style={{
              margin: '0 0 10px',
              fontSize: '0.85rem',
              color: 'var(--text2)',
            }}
          >
            Players
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {players.map(p => (
              <div
                key={p._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px 4px 5px',
                  borderRadius: 99,
                  background: p.isAlive ? 'var(--surface)' : 'rgba(0,0,0,0.15)',
                  border: `1px solid ${p.isAlive ? 'var(--border)' : 'transparent'}`,
                  opacity: p.isAlive ? 1 : 0.4,
                  fontSize: '0.82rem',
                }}
              >
                {p.isAlive ? (
                  <PlayerAvatar name={p.name} size={20} />
                ) : (
                  <IconSkull size={14} color="#6b7280" />
                )}
                <span
                  style={{
                    color: p.isAlive ? 'var(--text)' : '#6b7280',
                    textDecoration: p.isAlive ? 'none' : 'line-through',
                    fontWeight: p.isMe ? 600 : 400,
                  }}
                >
                  {p.name}
                </span>
                {isGM && p.role && (
                  <span
                    className={`badge badge-${p.role}`}
                    style={{ fontSize: '0.62rem', padding: '1px 5px' }}
                  >
                    {p.role}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Host process button */}
        {isHost && (
          <>
            {showConfirm && (
              <div
                className="card animate-fade-in"
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
                    fontSize: '0.9rem',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <IconWarning size={14} color="#f87171" /> Not everyone has
                  voted
                </p>
                <p
                  style={{
                    color: 'var(--text2)',
                    fontSize: '0.85rem',
                    margin: '0 0 14px',
                  }}
                >
                  Only {totalVotes} of {alivePlayers.length} players have voted.
                  Proceeding will tally the current votes — those who haven't
                  voted won't count.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    disabled={processing}
                    onClick={() => void confirmEliminate()}
                  >
                    {processing ? 'Processing...' : 'Proceed Anyway'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ flex: 1 }}
                    onClick={() => setShowConfirm(false)}
                  >
                    Wait for Votes
                  </button>
                </div>
              </div>
            )}

            {!showConfirm && (
              <button
                className="btn btn-danger btn-lg animate-fade-in"
                style={{ width: '100%', animationDelay: '0.2s' }}
                disabled={processing}
                onClick={requestEliminate}
              >
                {processing ? 'Processing...' : 'Tally Votes & Eliminate'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
