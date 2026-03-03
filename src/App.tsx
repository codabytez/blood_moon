import { useEffect, useMemo, useState } from 'react'
import { Id } from '../convex/_generated/dataModel'
import Background from './components/Background'
import LandingPage from './components/LandingPage'
import GameBoard from './components/GameBoard'
import RulesPage from './components/RulesPage'
import { applyTheme, getClockTheme } from './lib/theme'

// ─── Types ────────────────────────────────────────────────
export type GameState = {
  gameId: Id<'games'>
  playerId: Id<'players'>
}

// ─── Session ID (persisted) ────────────────────────────────
function getOrCreateSessionId(): string {
  const key = 'blood_moon_session'
  const stored = localStorage.getItem(key)
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem(key, id)
  return id
}

export default function App() {
  const sessionId = useMemo(() => getOrCreateSessionId(), [])
  const [showRules, setShowRules] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(() => {
    try {
      const raw = localStorage.getItem('blood_moon_game')
      return raw ? (JSON.parse(raw) as GameState) : null
    } catch {
      return null
    }
  })

  // Clock-based theme on landing only; stops when in a game so phase theme isn't overridden
  useEffect(() => {
    if (gameState !== null) return
    applyTheme(getClockTheme())
    const interval = setInterval(() => applyTheme(getClockTheme()), 60_000)
    return () => clearInterval(interval)
  }, [gameState])

  function handleGameJoined(gs: GameState) {
    localStorage.setItem('blood_moon_game', JSON.stringify(gs))
    setGameState(gs)
  }

  function handleLeaveGame() {
    localStorage.removeItem('blood_moon_game')
    setGameState(null)
    applyTheme(getClockTheme())
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <Background />
      {gameState ? (
        <GameBoard
          gameId={gameState.gameId}
          sessionId={sessionId}
          onLeave={handleLeaveGame}
        />
      ) : (
        <LandingPage
          sessionId={sessionId}
          onGameJoined={handleGameJoined}
          onShowRules={() => setShowRules(true)}
        />
      )}
      {showRules && <RulesPage onClose={() => setShowRules(false)} />}
    </div>
  )
}
