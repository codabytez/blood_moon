import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { applyTheme } from '../lib/theme'
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

  const advanceToDay = useMutation(api.games.advanceToDay)
  const advanceToVoting = useMutation(api.games.advanceToVoting)
  const processElimination = useMutation(api.games.processElimination)
  const resetGame = useMutation(api.games.resetGame)

  useEffect(() => {
    if (!game) return
    if (game.phase === 'night') applyTheme('night')
    else if (game.phase === 'day' || game.phase === 'voting') applyTheme('day')
    else if (game.phase === 'ended') applyTheme('night')
  }, [game])

  // Detect lobby→night transition using the React-recommended previous-value pattern:
  // calling setState conditionally during render causes an immediate synchronous re-render.
  if (game?.phase !== prevPhase) {
    if (
      prevPhase === 'lobby' &&
      game?.phase === 'night' &&
      me?.role &&
      !showRoleReveal
    ) {
      setShowRoleReveal(true)
    }
    setPrevPhase(game?.phase ?? null)
  }

  if (game === undefined || players === undefined || me === undefined) {
    return <LoadingScreen />
  }

  if (game === null || me === null) {
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

  const isHost = me.isHost
  const isSpectating = me.isSpectating ?? false
  // isGM: host who chose to spectate — sees everything, has no role
  const isGM = isHost && isSpectating
  const myRole = me.role ?? 'villager'

  // Role reveal overlay (only for players with a role)
  if (showRoleReveal && me.role && !isSpectating) {
    return (
      <RoleReveal role={me.role} onDismiss={() => setShowRoleReveal(false)} />
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

  // ── NIGHT ──────────────────────────────────────────────
  if (game.phase === 'night') {
    return (
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
        onAdvanceToDay={async () => {
          await advanceToDay({ gameId, sessionId })
        }}
      />
    )
  }

  // ── DAY ────────────────────────────────────────────────
  if (game.phase === 'day') {
    return (
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
        onAdvanceToVoting={async () => {
          await advanceToVoting({ gameId, sessionId })
        }}
      />
    )
  }

  // ── HUNTER REVENGE ─────────────────────────────────────
  if (game.phase === 'hunterRevenge' && game.pendingHunterId) {
    return (
      <HunterRevenge
        gameId={gameId}
        sessionId={sessionId}
        players={players}
        pendingHunterId={game.pendingHunterId}
        isGM={isGM}
        nightAnnouncement={game.nightAnnouncement}
        eliminationAnnouncement={game.eliminationAnnouncement}
      />
    )
  }

  // ── VOTING ─────────────────────────────────────────────
  if (game.phase === 'voting') {
    return (
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
    )
  }

  return <LoadingScreen />
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
