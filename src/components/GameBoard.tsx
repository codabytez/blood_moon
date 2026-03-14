import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { applyTheme } from '../lib/theme'
import {
  playNightFall,
  playDawnRise,
  playGameStart,
  playElimination,
} from '../lib/sounds'
import { errMsg } from '../lib/errMsg'
import PlayerAvatar from './PlayerAvatar'
import GameLobby from './GameLobby'
import RoleReveal from './RoleReveal'
import NightPhase from './NightPhase'
import DayPhase from './DayPhase'
import VotingPhase from './VotingPhase'
import HunterRevenge from './HunterRevenge'
import EndScreen from './EndScreen'

type Props = {
  gameId: Id<'games'>
  sessionId: string
  onLeave: () => void
}

export default function GameBoard({ gameId, sessionId, onLeave }: Props) {
  const game = useQuery(api.games.get, { gameId })
  const players = useQuery(api.players.list, { gameId, sessionId })
  const me = useQuery(api.players.me, { gameId, sessionId })
  const nightStatus = useQuery(api.games.getNightActionStatus, {
    gameId,
    sessionId,
  })

  const [showRoleReveal, setShowRoleReveal] = useState(false)
  const [prevPhase, setPrevPhase] = useState<string | null>(null)
  // Refs track the PREVIOUS value *inside* the effect, avoiding stale closure issues
  const soundPhaseRef = useRef<string | null>(null)
  const soundNightAnnRef = useRef<string | undefined>(undefined)
  const soundElimAnnRef = useRef<string | undefined>(undefined)
  const [showHostControls, setShowHostControls] = useState(false)
  const [kickConfirmId, setKickConfirmId] = useState<Id<'players'> | null>(null)
  const [kickingId, setKickingId] = useState<Id<'players'> | null>(null)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [ending, setEnding] = useState(false)
  const [hostError, setHostError] = useState('')

  const advanceToDay = useMutation(api.games.advanceToDay)
  const advanceToVoting = useMutation(api.games.advanceToVoting)
  const processElimination = useMutation(api.games.processElimination)
  const resetGame = useMutation(api.games.resetGame)
  const cancelGame = useMutation(api.games.cancelGame)
  const removePlayer = useMutation(api.games.removePlayer)

  async function handleEndGame() {
    setEnding(true)
    setHostError('')
    try {
      await cancelGame({ gameId, sessionId })
    } catch (err) {
      setHostError(errMsg(err))
      setEnding(false)
    }
  }

  async function handleKick(targetPlayerId: Id<'players'>) {
    setKickingId(targetPlayerId)
    setHostError('')
    try {
      await removePlayer({ gameId, sessionId, targetPlayerId })
      setKickConfirmId(null)
    } catch (err) {
      setHostError(errMsg(err))
    } finally {
      setKickingId(null)
    }
  }

  useEffect(() => {
    if (!game) return

    const prevSoundPhase = soundPhaseRef.current
    const curr = game.phase

    // ── Theme ──────────────────────────────────────────────
    if (curr === 'night' || curr === 'hunterRevenge' || curr === 'ended') {
      applyTheme('night')
    } else if (curr === 'day' || curr === 'voting') {
      applyTheme('day')
    }

    // ── Phase-transition sounds ────────────────────────────
    if (prevSoundPhase !== null && prevSoundPhase !== curr) {
      if (curr === 'night') {
        playNightFall()
      } else if (curr === 'day') {
        // Dawn rises from night or after hunter/king revenge
        if (prevSoundPhase === 'night' || prevSoundPhase === 'hunterRevenge') {
          playDawnRise()
        }
      }
    }
    soundPhaseRef.current = curr

    // ── Elimination sounds — watch announcement fields ─────
    const prevNightAnn = soundNightAnnRef.current
    if (
      game.nightAnnouncement !== prevNightAnn &&
      game.nightAnnouncement?.includes('dead')
    ) {
      playElimination()
    }
    soundNightAnnRef.current = game.nightAnnouncement

    const prevElimAnn = soundElimAnnRef.current
    if (
      game.eliminationAnnouncement !== prevElimAnn &&
      game.eliminationAnnouncement?.includes('⚰️')
    ) {
      playElimination()
    }
    soundElimAnnRef.current = game.eliminationAnnouncement
  }, [game])

  // Detect lobby→night transition using the React previous-value pattern.
  // Normalize undefined→null so the comparison is stable while game is loading.
  const currentPhase = game?.phase ?? null
  if (currentPhase !== prevPhase) {
    if (prevPhase === 'lobby' && currentPhase === 'night') {
      if (me?.role && !showRoleReveal) setShowRoleReveal(true)
      playGameStart()
    }
    setPrevPhase(currentPhase)
  }

  if (game === undefined || players === undefined || me === undefined) {
    return <LoadingScreen />
  }

  if (game === null) {
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
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🌑</div>
        <h2 className="font-heading" style={{ margin: '0 0 8px' }}>
          Game not found
        </h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24 }}>
          The game may have ended or the link is invalid.
        </p>
        <button className="btn btn-primary" onClick={onLeave}>
          Return Home
        </button>
      </div>
    )
  }

  if (me === null) {
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
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(220,38,38,0.1)',
            border: '1.5px solid rgba(220,38,38,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 32,
          }}
        >
          🚪
        </div>
        <h2
          className="font-heading"
          style={{ margin: '0 0 8px', color: '#f87171' }}
        >
          You were removed
        </h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24, maxWidth: 300 }}>
          The host removed you from the room.
        </p>
        <button className="btn btn-primary" onClick={onLeave}>
          Return Home
        </button>
      </div>
    )
  }

  const isHost = me.isHost
  const isSpectating = me.isSpectating ?? false
  // isGM: host who chose to spectate — sees everything, has no role
  const isGM = isHost && isSpectating
  const myRole = me.role ?? 'villager'

  const settings = {
    nightSeconds: game.settings?.nightSeconds ?? 120,
    daySeconds: game.settings?.daySeconds ?? 180,
    hunterSeconds: game.settings?.hunterSeconds ?? 60,
    revealRoleOnDeath: game.settings?.revealRoleOnDeath ?? true,
    customRoles: game.settings?.customRoles,
    skipRoleReveal: game.settings?.skipRoleReveal ?? false,
    deadCanChat: game.settings?.deadCanChat ?? false,
    mafiaSeesTeam: game.settings?.mafiaSeesTeam ?? true,
    timerVisibleToAll: game.settings?.timerVisibleToAll ?? true,
  }

  // Role reveal overlay (only for players with a role)
  if (showRoleReveal && me.role && !isSpectating && !settings.skipRoleReveal) {
    return (
      <RoleReveal role={me.role} onDismiss={() => setShowRoleReveal(false)} />
    )
  }

  // ── CANCELED ───────────────────────────────────────────
  if (game.phase === 'canceled') {
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
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div className="animate-fade-in" style={{ maxWidth: 360 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(220,38,38,0.1)',
              border: '1.5px solid rgba(220,38,38,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 32,
            }}
          >
            🚫
          </div>
          <h2
            className="font-title"
            style={{
              color: '#f87171',
              margin: '0 0 10px',
              fontSize: '1.8rem',
              textShadow: '0 0 20px rgba(220,38,38,0.4)',
            }}
          >
            Room Canceled
          </h2>
          <p
            style={{
              color: 'var(--text2)',
              margin: '0 0 28px',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            {isHost
              ? 'You have canceled the room. All players have been notified.'
              : 'The host has canceled the room.'}
          </p>
          <button className="btn btn-primary" onClick={onLeave}>
            Return Home
          </button>
        </div>
      </div>
    )
  }

  // ── LOBBY ──────────────────────────────────────────────
  if (game.phase === 'lobby') {
    return (
      <GameLobby
        gameId={gameId}
        gameCode={game.code}
        sessionId={sessionId}
        players={players}
        isHost={isHost}
        isSpectating={isSpectating}
        settings={settings}
        onLeave={onLeave}
      />
    )
  }

  // ── ENDED ──────────────────────────────────────────────
  if (game.phase === 'ended') {
    return (
      <EndScreen
        winner={game.winner!}
        players={players}
        eliminationAnnouncement={game.eliminationAnnouncement}
        isHost={isHost}
        onPlayAgain={async () => {
          await resetGame({ gameId, sessionId })
        }}
        onLeave={onLeave}
      />
    )
  }

  // Host controls overlay — shown during all active game phases
  const hostControls = isHost && (
    <HostControls
      players={players}
      open={showHostControls}
      onOpen={() => setShowHostControls(true)}
      onClose={() => {
        setShowHostControls(false)
        setShowEndConfirm(false)
        setKickConfirmId(null)
        setHostError('')
      }}
      showEndConfirm={showEndConfirm}
      onRequestEnd={() => setShowEndConfirm(true)}
      onCancelEnd={() => setShowEndConfirm(false)}
      ending={ending}
      onConfirmEnd={handleEndGame}
      kickConfirmId={kickConfirmId}
      onRequestKick={id => setKickConfirmId(id)}
      onCancelKick={() => setKickConfirmId(null)}
      kickingId={kickingId}
      onConfirmKick={handleKick}
      error={hostError}
    />
  )

  // ── NIGHT ──────────────────────────────────────────────
  if (game.phase === 'night') {
    return (
      <>
        <NightPhase
          gameId={gameId}
          sessionId={sessionId}
          round={game.round}
          players={players}
          myRole={myRole}
          isHost={isHost}
          isGM={isGM}
          eliminationAnnouncement={game.eliminationAnnouncement}
          nightActionStatus={nightStatus ?? null}
          phaseDeadline={game.phaseDeadline}
          timerVisibleToAll={settings.timerVisibleToAll}
          onAdvanceToDay={async () => {
            await advanceToDay({ gameId, sessionId })
          }}
        />
        {hostControls}
      </>
    )
  }

  // ── DAY ────────────────────────────────────────────────
  if (game.phase === 'day') {
    return (
      <>
        <DayPhase
          gameId={gameId}
          sessionId={sessionId}
          round={game.round}
          players={players}
          isHost={isHost}
          isGM={isGM}
          nightAnnouncement={game.nightAnnouncement}
          myRole={myRole}
          isAlive={me.isAlive}
          phaseDeadline={game.phaseDeadline}
          timerVisibleToAll={settings.timerVisibleToAll}
          deadCanChat={settings.deadCanChat}
          onAdvanceToVoting={async () => {
            await advanceToVoting({ gameId, sessionId })
          }}
        />
        {hostControls}
      </>
    )
  }

  // ── HUNTER REVENGE ─────────────────────────────────────
  if (game.phase === 'hunterRevenge' && game.pendingHunterId) {
    return (
      <>
        <HunterRevenge
          gameId={gameId}
          sessionId={sessionId}
          players={players}
          pendingHunterId={game.pendingHunterId}
          isGM={isGM}
          nightAnnouncement={game.nightAnnouncement}
          eliminationAnnouncement={game.eliminationAnnouncement}
          phaseDeadline={game.phaseDeadline}
        />
        {hostControls}
      </>
    )
  }

  // ── VOTING ─────────────────────────────────────────────
  if (game.phase === 'voting') {
    return (
      <>
        <VotingPhase
          gameId={gameId}
          sessionId={sessionId}
          round={game.round}
          players={players}
          isHost={isHost}
          isGM={isGM}
          isAlive={me.isAlive}
          onProcessElimination={async () => {
            await processElimination({ gameId, sessionId })
          }}
        />
        {hostControls}
      </>
    )
  }

  return <LoadingScreen />
}

type HostControlsProps = {
  players: Array<{
    _id: Id<'players'>
    name: string
    isAlive: boolean
    isHost: boolean
    isSpectating?: boolean
    isMe?: boolean
  }>
  open: boolean
  onOpen: () => void
  onClose: () => void
  showEndConfirm: boolean
  onRequestEnd: () => void
  onCancelEnd: () => void
  ending: boolean
  onConfirmEnd: () => void
  kickConfirmId: Id<'players'> | null
  onRequestKick: (id: Id<'players'>) => void
  onCancelKick: () => void
  kickingId: Id<'players'> | null
  onConfirmKick: (id: Id<'players'>) => void
  error: string
}

function HostControls({
  players,
  open,
  onOpen,
  onClose,
  showEndConfirm,
  onRequestEnd,
  onCancelEnd,
  ending,
  onConfirmEnd,
  kickConfirmId,
  onRequestKick,
  onCancelKick,
  kickingId,
  onConfirmKick,
  error,
}: HostControlsProps) {
  const kickTarget = players.find(p => p._id === kickConfirmId)

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={onOpen}
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 40,
            padding: '7px 14px',
            borderRadius: 8,
            background: 'rgba(10,8,20,0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(220,38,38,0.3)',
            color: '#f87171',
            fontSize: '0.75rem',
            fontFamily: 'Cinzel, serif',
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          ⚙ Host
        </button>
      )}

      {/* Panel overlay */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: 24,
          }}
          onClick={e => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <div
            className="card card-accent animate-fade-in-scale"
            style={{
              width: '100%',
              maxWidth: 420,
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <h2
                className="font-heading"
                style={{ margin: 0, fontSize: '1rem', color: 'var(--text2)' }}
              >
                Host Controls
              </h2>
              <button
                onClick={onClose}
                style={{
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

            {error && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(220,38,38,0.1)',
                  border: '1px solid rgba(220,38,38,0.25)',
                  borderRadius: 8,
                  color: '#f87171',
                  fontSize: '0.82rem',
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            {/* End game section */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)',
                marginBottom: 16,
              }}
            >
              <p
                className="font-heading"
                style={{
                  margin: '0 0 4px',
                  fontSize: '0.82rem',
                  color: '#f87171',
                }}
              >
                End Game
              </p>
              <p
                style={{
                  color: 'var(--text3)',
                  fontSize: '0.77rem',
                  margin: '0 0 12px',
                }}
              >
                All players will be sent to the canceled screen.
              </p>
              {showEndConfirm ? (
                <div>
                  <p
                    style={{
                      color: 'var(--text2)',
                      fontSize: '0.85rem',
                      margin: '0 0 10px',
                    }}
                  >
                    Are you sure you want to end the game for everyone?
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1 }}
                      onClick={onCancelEnd}
                    >
                      Keep Playing
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ flex: 1 }}
                      disabled={ending}
                      onClick={onConfirmEnd}
                    >
                      {ending ? 'Ending...' : 'Yes, End Game'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn btn-danger btn-sm"
                  style={{ width: '100%' }}
                  onClick={onRequestEnd}
                >
                  End Game
                </button>
              )}
            </div>

            {/* Players section */}
            <p
              className="font-heading"
              style={{
                margin: '0 0 10px',
                fontSize: '0.8rem',
                color: 'var(--text2)',
              }}
            >
              Players — {players.filter(p => !p.isSpectating).length}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {players
                .filter(p => !p.isSpectating)
                .map(p => (
                  <div key={p._id}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '7px 10px',
                        borderRadius: 8,
                        background: 'var(--surface)',
                        border: `1px solid ${kickConfirmId === p._id ? 'rgba(220,38,38,0.4)' : 'var(--border)'}`,
                        opacity: p.isAlive ? 1 : 0.5,
                      }}
                    >
                      <PlayerAvatar name={p.name} size={26} dead={!p.isAlive} />
                      <span
                        style={{
                          flex: 1,
                          fontSize: '0.88rem',
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
                              fontSize: '0.75rem',
                              marginLeft: 6,
                            }}
                          >
                            (you)
                          </span>
                        )}
                      </span>
                      {!p.isHost && (
                        <button
                          onClick={() =>
                            kickConfirmId === p._id
                              ? onCancelKick()
                              : onRequestKick(p._id)
                          }
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            border: `1px solid ${kickConfirmId === p._id ? 'rgba(220,38,38,0.5)' : 'rgba(220,38,38,0.25)'}`,
                            background:
                              kickConfirmId === p._id
                                ? 'rgba(220,38,38,0.12)'
                                : 'transparent',
                            color: '#f87171',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {kickConfirmId === p._id ? 'Cancel' : 'Remove'}
                        </button>
                      )}
                      {p.isHost && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text3)',
                            fontStyle: 'italic',
                          }}
                        >
                          host
                        </span>
                      )}
                    </div>

                    {/* Inline kick confirmation */}
                    {kickConfirmId === p._id && kickTarget && (
                      <div
                        style={{
                          margin: '4px 0 0',
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: 'rgba(220,38,38,0.07)',
                          border: '1px solid rgba(220,38,38,0.3)',
                        }}
                      >
                        <p
                          style={{
                            color: 'var(--text2)',
                            fontSize: '0.83rem',
                            margin: '0 0 10px',
                          }}
                        >
                          Remove{' '}
                          <strong style={{ color: 'var(--text)' }}>
                            {kickTarget.name}
                          </strong>{' '}
                          from the game?
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ flex: 1 }}
                            onClick={onCancelKick}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ flex: 1 }}
                            disabled={kickingId === p._id}
                            onClick={() => onConfirmKick(p._id)}
                          >
                            {kickingId === p._id
                              ? 'Removing...'
                              : 'Yes, Remove'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function LoadingScreen() {
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
        gap: 16,
      }}
    >
      <div className="animate-float" style={{ fontSize: 48 }}>
        🌕
      </div>
      <p
        className="font-heading"
        style={{
          color: 'var(--text2)',
          letterSpacing: '0.15em',
          fontSize: '0.9rem',
        }}
      >
        The village stirs...
      </p>
    </div>
  )
}
