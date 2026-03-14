import { mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'
import { Id } from './_generated/dataModel'
import {
  NIGHT_MS,
  DAY_MS,
  formatRole,
  getSettings,
  doNightResolution,
  doElimination,
} from './_shared'

type Role =
  | 'mafia'
  | 'villager'
  | 'seer'
  | 'doctor'
  | 'hunter'
  | 'prince'
  | 'lycan'
  | 'mason'
  | 'apprenticeSeer'
  | 'bodyguard'
  | 'fortuneTeller'
  | 'playerInspector'
  | 'priest'
  | 'spellcaster'
  | 'amuletOfProtection'
  | 'beholder'
  | 'toughGuy'
  | 'king'
  | 'diseased'
  | 'cursed'
  | 'pacifist'
  | 'villageIdiot'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function assignRoles(playerCount: number): Role[] {
  const n = playerCount

  const mafiaCount =
    n >= 25 ? 6 : n >= 20 ? 5 : n >= 15 ? 4 : n >= 10 ? 3 : n >= 7 ? 2 : 1

  const roles: Role[] = [
    ...Array<Role>(mafiaCount).fill('mafia'),
    ...(n >= 5 ? (['seer'] as Role[]) : []),
    ...(n >= 7 ? (['doctor'] as Role[]) : []),
    ...(n >= 8 ? (['hunter'] as Role[]) : []),
    ...(n >= 9 ? (['mason', 'mason'] as Role[]) : []),
    ...(n >= 11 ? (['lycan'] as Role[]) : []),
    ...(n >= 13 ? (['apprenticeSeer', 'prince'] as Role[]) : []),
    ...(n >= 14 ? (['beholder'] as Role[]) : []),
    ...(n >= 15 ? (['bodyguard'] as Role[]) : []),
    ...(n >= 16 ? (['spellcaster'] as Role[]) : []),
    ...(n >= 17 ? (['fortuneTeller'] as Role[]) : []),
    ...(n >= 18 ? (['toughGuy'] as Role[]) : []),
    ...(n >= 19 ? (['cursed'] as Role[]) : []),
    ...(n >= 20 ? (['priest'] as Role[]) : []),
    ...(n >= 21 ? (['playerInspector'] as Role[]) : []),
    ...(n >= 22 ? (['king'] as Role[]) : []),
    ...(n >= 23 ? (['diseased'] as Role[]) : []),
    ...(n >= 24 ? (['pacifist'] as Role[]) : []),
    ...(n >= 25 ? (['amuletOfProtection'] as Role[]) : []),
    ...(n >= 26 ? (['villageIdiot'] as Role[]) : []),
  ]

  while (roles.length < n) roles.push('villager')

  // Fisher-Yates shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[roles[i], roles[j]] = [roles[j], roles[i]]
  }
  return roles
}

function assignRolesCustom(
  playerCount: number,
  customRoleKeys: string[]
): Role[] {
  const n = playerCount
  const mafiaCount =
    n >= 25 ? 6 : n >= 20 ? 5 : n >= 15 ? 4 : n >= 10 ? 3 : n >= 7 ? 2 : 1

  // Expand 'mason' to two slots
  const expanded: Role[] = []
  for (const key of customRoleKeys) {
    if (key === 'mason') {
      expanded.push('mason', 'mason')
    } else {
      expanded.push(key as Role)
    }
  }

  // Leave at least 1 villager slot
  const maxSpecial = Math.max(0, n - mafiaCount - 1)
  const selected = expanded.slice(0, maxSpecial)

  const roles: Role[] = [...Array<Role>(mafiaCount).fill('mafia'), ...selected]
  while (roles.length < n) roles.push('villager')

  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[roles[i], roles[j]] = [roles[j], roles[i]]
  }
  return roles
}

export const create = mutation({
  args: { hostName: v.string(), sessionId: v.string() },
  handler: async (ctx, { hostName, sessionId }) => {
    let code = generateCode()
    let existing = await ctx.db
      .query('games')
      .withIndex('by_code', q => q.eq('code', code))
      .first()
    while (existing) {
      code = generateCode()
      existing = await ctx.db
        .query('games')
        .withIndex('by_code', q => q.eq('code', code))
        .first()
    }

    const gameId = await ctx.db.insert('games', {
      code,
      phase: 'lobby',
      round: 1,
    })

    const playerId = await ctx.db.insert('players', {
      gameId,
      name: hostName,
      isAlive: true,
      isHost: true,
      sessionId,
      isSpectating: false,
    })

    return { gameId, playerId, gameCode: code }
  },
})

export const join = mutation({
  args: { gameCode: v.string(), playerName: v.string(), sessionId: v.string() },
  handler: async (ctx, { gameCode, playerName, sessionId }) => {
    const game = await ctx.db
      .query('games')
      .withIndex('by_code', q => q.eq('code', gameCode.toUpperCase()))
      .first()
    if (!game)
      throw new ConvexError('Game not found. Check the code and try again.')
    if (game.phase !== 'lobby')
      throw new ConvexError('Game has already started.')

    const existing = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', game._id).eq('sessionId', sessionId)
      )
      .first()
    if (existing) return { gameId: game._id, playerId: existing._id }

    const allPlayers = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', game._id))
      .collect()
    if (playerName.trim().toUpperCase() === game.code) {
      throw new ConvexError('Your name cannot be the game code.')
    }
    if (
      allPlayers.some(p => p.name.toLowerCase() === playerName.toLowerCase())
    ) {
      throw new ConvexError('That name is already taken.')
    }

    const playerId = await ctx.db.insert('players', {
      gameId: game._id,
      name: playerName,
      isAlive: true,
      isHost: false,
      sessionId,
      isSpectating: false,
    })
    return { gameId: game._id, playerId }
  },
})

export const get = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, { gameId }) => ctx.db.get(gameId),
})

export const startGame = mutation({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const host = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!host?.isHost)
      throw new ConvexError('Only the host can start the game.')

    const allPlayers = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()

    const activePlayers = allPlayers.filter(p => !p.isSpectating)
    const minRequired = 4
    if (activePlayers.length < minRequired) {
      const hostNote = host.isSpectating
        ? ' (you are spectating — join as player or add more players)'
        : ''
      throw new ConvexError(
        `Need at least ${minRequired} players with roles to start.${hostNote}`
      )
    }

    const game = await ctx.db.get(gameId)
    const s = getSettings(game)
    const roles = s.customRoles
      ? assignRolesCustom(activePlayers.length, s.customRoles)
      : assignRoles(activePlayers.length)
    for (let i = 0; i < activePlayers.length; i++) {
      await ctx.db.patch(activePlayers[i]._id, { role: roles[i] })
    }

    // Set beholderResult for beholder player(s)
    const seerPlayer = activePlayers.find((_, i) => roles[i] === 'seer')
    if (seerPlayer) {
      for (let i = 0; i < activePlayers.length; i++) {
        if (roles[i] === 'beholder') {
          await ctx.db.patch(activePlayers[i]._id, {
            beholderResult: seerPlayer.name,
          })
        }
      }
    }

    await ctx.db.patch(gameId, {
      phase: 'night',
      phaseDeadline: Date.now() + NIGHT_MS,
    })
  },
})

/** Host-only manual advance to day. Validates required actions are submitted. */
export const advanceToDay = mutation({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const host = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!host?.isHost)
      throw new ConvexError('Only the host can advance phases.')

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'night')
      throw new ConvexError('Not in night phase.')

    await doNightResolution(ctx.db, gameId, false)
  },
})

/**
 * Auto-advance to day when timer expires. Callable by any player.
 * Auto-submits a random mafia kill if mafia hasn't acted.
 */
export const autoAdvanceToDay = mutation({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const caller = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!caller) return

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'night') return
    if (!game.phaseDeadline || Date.now() < game.phaseDeadline) return

    const players = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()

    const aliveMafia = players.filter(p => p.isAlive && p.role === 'mafia')
    const actions = await ctx.db
      .query('nightActions')
      .withIndex('by_game_round', q =>
        q.eq('gameId', gameId).eq('round', game.round)
      )
      .collect()
    const killAction = actions.find(
      (a: { actionType: string }) => a.actionType === 'kill'
    )

    // Auto-submit random mafia kill if missing
    if (aliveMafia.length > 0 && !killAction) {
      const targets = players.filter(
        p => p.isAlive && p.role !== 'mafia' && !p.isSpectating
      )
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)]
        await ctx.db.insert('nightActions', {
          gameId,
          round: game.round,
          actorId: aliveMafia[0]._id,
          targetId: target._id,
          actionType: 'kill',
        })
      }
    }

    await doNightResolution(ctx.db, gameId, true)
  },
})

export const advanceToVoting = mutation({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const host = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!host?.isHost)
      throw new ConvexError('Only the host can advance phases.')

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'day')
      throw new ConvexError('Not in day phase.')

    await ctx.db.patch(gameId, { phase: 'voting', phaseDeadline: undefined })
  },
})

/** Auto-advance day → voting when day timer expires. Callable by any player. */
export const autoAdvanceToVoting = mutation({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const caller = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!caller) return

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'day') return
    if (!game.phaseDeadline || Date.now() < game.phaseDeadline) return

    await ctx.db.patch(gameId, { phase: 'voting', phaseDeadline: undefined })
  },
})

/** Host-only manual elimination processing. */
export const processElimination = mutation({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const host = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!host?.isHost)
      throw new ConvexError('Only the host can process elimination.')

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'voting')
      throw new ConvexError('Not in voting phase.')

    await doElimination(ctx.db, gameId)
  },
})

/** Auto-process elimination once all eligible voters have voted. Callable by any player. */
export const autoProcessElimination = mutation({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const caller = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!caller) return

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'voting') return

    const players = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()

    const eligibleVoters = players.filter(
      p => p.isAlive && !p.isSpectating && p.role !== 'pacifist' && !p.silenced
    )

    const votes = await ctx.db
      .query('votes')
      .withIndex('by_game_round', q =>
        q.eq('gameId', gameId).eq('round', game.round)
      )
      .collect()

    // Only auto-process if all eligible voters have cast their vote
    if (eligibleVoters.length === 0 || votes.length < eligibleVoters.length)
      return

    await doElimination(ctx.db, gameId)
  },
})

/** Hunter or King fires their final shot after being eliminated. */
export const submitHunterKill = mutation({
  args: {
    gameId: v.id('games'),
    targetId: v.id('players'),
    sessionId: v.string(),
  },
  handler: async (ctx, { gameId, targetId, sessionId }) => {
    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'hunterRevenge')
      throw new ConvexError('Not in hunter revenge phase.')

    const hunter = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!hunter) throw new ConvexError('Player not found.')
    if (hunter._id !== game.pendingHunterId)
      throw new ConvexError('Only the Hunter or King can fire their last shot.')

    const target = await ctx.db.get(targetId)
    if (!target || !target.isAlive || target._id === hunter._id)
      throw new ConvexError('Invalid target.')

    await ctx.db.patch(targetId, { isAlive: false })

    // Promote apprenticeSeer if the Seer was the target
    if (target.role === 'seer') {
      const allPlayersNow = await ctx.db
        .query('players')
        .withIndex('by_game', q => q.eq('gameId', gameId))
        .collect()
      const apprentice = allPlayersNow.find(
        p => p.isAlive && p.role === 'apprenticeSeer'
      )
      if (apprentice) await ctx.db.patch(apprentice._id, { role: 'seer' })
    }

    const isKing = hunter.role === 'king'
    const targetRoleLabel = formatRole(target.role)
    const targetIsMafia = target.role === 'mafia'
    const targetRoleStr = targetIsMafia ? 'Mafia 😈' : targetRoleLabel + ' 😇'
    const revengeMsg = isKing
      ? `👑 The King's final decree: ${hunter.name} condemned ${target.name} (${targetRoleStr})!`
      : `💀 ${hunter.name}'s last shot took down ${target.name} (${targetRoleStr})!`

    const prevNight = game.nightAnnouncement ?? ''
    const prevElim = game.eliminationAnnouncement ?? ''

    const allPlayers = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()
    const alive = allPlayers.filter(p => p.isAlive && !p.isSpectating)
    const aliveMafia = alive.filter(p => p.role === 'mafia')
    const aliveVillagers = alive.filter(p => p.role !== 'mafia')

    const returnPhase = game.hunterReturnPhase ?? 'day'

    if (aliveMafia.length === 0) {
      await ctx.db.patch(gameId, {
        phase: 'ended',
        winner: 'villagers',
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        phaseDeadline: undefined,
        ...(returnPhase === 'day'
          ? { nightAnnouncement: `${prevNight} ${revengeMsg}`.trim() }
          : { eliminationAnnouncement: `${prevElim} ${revengeMsg}`.trim() }),
      })
    } else if (aliveMafia.length >= aliveVillagers.length) {
      await ctx.db.patch(gameId, {
        phase: 'ended',
        winner: 'mafia',
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        phaseDeadline: undefined,
        ...(returnPhase === 'day'
          ? { nightAnnouncement: `${prevNight} ${revengeMsg}`.trim() }
          : { eliminationAnnouncement: `${prevElim} ${revengeMsg}`.trim() }),
      })
    } else if (returnPhase === 'day') {
      await ctx.db.patch(gameId, {
        phase: 'day',
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        nightAnnouncement: `${prevNight} ${revengeMsg}`.trim(),
        phaseDeadline: Date.now() + DAY_MS,
      })
    } else {
      await ctx.db.patch(gameId, {
        phase: 'night',
        round: game.round + 1,
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        eliminationAnnouncement: `${prevElim} ${revengeMsg}`.trim(),
        nightAnnouncement: undefined,
        phaseDeadline: Date.now() + NIGHT_MS,
      })
    }
  },
})

/** Auto-skip hunter revenge when timer expires. Callable by any player. */
export const autoSkipHunterRevenge = mutation({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const caller = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!caller) return

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'hunterRevenge') return
    if (!game.phaseDeadline || Date.now() < game.phaseDeadline) return

    const allPlayers = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()
    const alive = allPlayers.filter(p => p.isAlive && !p.isSpectating)
    const aliveMafia = alive.filter(p => p.role === 'mafia')
    const aliveVillagers = alive.filter(p => p.role !== 'mafia')

    const returnPhase = game.hunterReturnPhase ?? 'day'
    const prevNight = game.nightAnnouncement ?? ''
    const prevElim = game.eliminationAnnouncement ?? ''

    if (aliveMafia.length === 0) {
      await ctx.db.patch(gameId, {
        phase: 'ended',
        winner: 'villagers',
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        phaseDeadline: undefined,
      })
    } else if (aliveMafia.length >= aliveVillagers.length) {
      await ctx.db.patch(gameId, {
        phase: 'ended',
        winner: 'mafia',
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        phaseDeadline: undefined,
      })
    } else if (returnPhase === 'day') {
      await ctx.db.patch(gameId, {
        phase: 'day',
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        nightAnnouncement: prevNight,
        phaseDeadline: Date.now() + DAY_MS,
      })
    } else {
      await ctx.db.patch(gameId, {
        phase: 'night',
        round: game.round + 1,
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        eliminationAnnouncement: prevElim,
        nightAnnouncement: undefined,
        phaseDeadline: Date.now() + NIGHT_MS,
      })
    }
  },
})

export const resetGame = mutation({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const host = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!host?.isHost)
      throw new ConvexError('Only the host can reset the game.')

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'ended')
      throw new ConvexError('Can only reset after the game ends.')

    const players = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()
    for (const player of players) {
      await ctx.db.patch(player._id, {
        role: undefined,
        isAlive: true,
        seerResult: undefined,
        piResult: undefined,
        ftResult: undefined,
        beholderResult: undefined,
        silenced: undefined,
        toughGuyHit: undefined,
        toughGuyScheduledDeath: undefined,
        amuletUsed: undefined,
        bodyguardLastTargetId: undefined,
      })
    }

    const nightActions = await ctx.db
      .query('nightActions')
      .withIndex('by_game_round', q => q.eq('gameId', gameId))
      .collect()
    for (const a of nightActions) await ctx.db.delete(a._id)

    const votes = await ctx.db
      .query('votes')
      .withIndex('by_game_round', q => q.eq('gameId', gameId))
      .collect()
    for (const v of votes) await ctx.db.delete(v._id)

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_game_round', q => q.eq('gameId', gameId))
      .collect()
    for (const m of messages) await ctx.db.delete(m._id)

    const mafiaMessages = await ctx.db
      .query('mafiaMessages')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()
    for (const m of mafiaMessages) await ctx.db.delete(m._id)

    await ctx.db.patch(gameId, {
      phase: 'lobby',
      round: 1,
      winner: undefined,
      eliminationAnnouncement: undefined,
      nightAnnouncement: undefined,
      pendingHunterId: undefined,
      hunterReturnPhase: undefined,
      skipNextNightKill: undefined,
      phaseDeadline: undefined,
    })
  },
})

export const cancelGame = mutation({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const host = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!host?.isHost)
      throw new ConvexError('Only the host can cancel the room.')

    await ctx.db.patch(gameId, { phase: 'canceled', phaseDeadline: undefined })
  },
})

export const updateSettings = mutation({
  args: {
    gameId: v.id('games'),
    sessionId: v.string(),
    settings: v.object({
      nightSeconds: v.optional(v.number()),
      daySeconds: v.optional(v.number()),
      hunterSeconds: v.optional(v.number()),
      revealRoleOnDeath: v.optional(v.boolean()),
      customRoles: v.optional(v.array(v.string())),
      skipRoleReveal: v.optional(v.boolean()),
      deadCanChat: v.optional(v.boolean()),
      mafiaSeesTeam: v.optional(v.boolean()),
      timerVisibleToAll: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { gameId, sessionId, settings }) => {
    const host = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!host?.isHost)
      throw new ConvexError('Only the host can change settings.')

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'lobby')
      throw new ConvexError('Settings can only be changed in the lobby.')

    const current = game.settings ?? {}
    await ctx.db.patch(gameId, { settings: { ...current, ...settings } })
  },
})

export const removePlayer = mutation({
  args: {
    gameId: v.id('games'),
    sessionId: v.string(),
    targetPlayerId: v.id('players'),
  },
  handler: async (ctx, { gameId, sessionId, targetPlayerId }) => {
    const host = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!host?.isHost)
      throw new ConvexError('Only the host can remove players.')

    const game = await ctx.db.get(gameId)
    if (!game) throw new ConvexError('Game not found.')
    if (game.phase === 'ended' || game.phase === 'canceled')
      throw new ConvexError('Cannot remove players from a finished game.')

    const target = await ctx.db.get(targetPlayerId)
    if (!target || target.gameId !== gameId)
      throw new ConvexError('Player not found in this game.')
    if (target.isHost) throw new ConvexError('Cannot remove the host.')

    await ctx.db.delete(targetPlayerId)
  },
})

export const getNightActionStatus = query({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const me = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()

    if (!me?.isHost) return null

    const isGM = me.isHost && (me.isSpectating ?? false)

    const game = await ctx.db.get(gameId)
    if (!game) return null

    const players = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()

    const aliveMafia = players.filter(p => p.isAlive && p.role === 'mafia')
    const aliveSeer = players.find(p => p.isAlive && p.role === 'seer')
    const aliveDoctor = players.find(p => p.isAlive && p.role === 'doctor')
    const aliveBodyguard = players.find(
      p => p.isAlive && p.role === 'bodyguard'
    )
    const aliveSpellcaster = players.find(
      p => p.isAlive && p.role === 'spellcaster'
    )
    const aliveFortuneTeller = players.find(
      p => p.isAlive && p.role === 'fortuneTeller'
    )
    const alivePI = players.find(p => p.isAlive && p.role === 'playerInspector')
    const alivePriest = players.find(
      p => p.isAlive && p.role === 'priest' && game.round === 1
    )
    const aliveAmulet = players.find(
      p => p.isAlive && p.role === 'amuletOfProtection' && !p.amuletUsed
    )

    const actions = await ctx.db
      .query('nightActions')
      .withIndex('by_game_round', q =>
        q.eq('gameId', gameId).eq('round', game.round)
      )
      .collect()

    const killAction = actions.find(a => a.actionType === 'kill')
    const seerAction = actions.find(a => a.actionType === 'investigate')
    const doctorAction = actions.find(
      a =>
        a.actionType === 'save' &&
        players.find(p => p._id === a.actorId)?.role === 'doctor'
    )
    const bodyguardAction = actions.find(a => a.actionType === 'protect')
    const spellcasterAction = actions.find(a => a.actionType === 'silence')
    const ftAction = actions.find(a => a.actionType === 'investigate_ft')
    const piAction = actions.find(a => a.actionType === 'inspect')
    const priestAction = actions.find(
      a =>
        a.actionType === 'save' &&
        players.find(p => p._id === a.actorId)?.role === 'priest'
    )
    const amuletAction = actions.find(
      a =>
        a.actionType === 'save' &&
        players.find(p => p._id === a.actorId)?.role === 'amuletOfProtection'
    )

    const getName = async (id: Id<'players'> | undefined) =>
      id && isGM ? ((await ctx.db.get(id))?.name ?? null) : null

    return {
      isGM,
      mafiaNeeded: aliveMafia.length > 0,
      mafiaSubmitted: !!killAction,
      mafiaTargetName: await getName(killAction?.targetId),
      seerNeeded: !!aliveSeer,
      seerSubmitted: !!seerAction,
      seerTargetName: await getName(seerAction?.targetId),
      doctorNeeded: !!aliveDoctor,
      doctorSubmitted: !!doctorAction,
      doctorTargetName: await getName(doctorAction?.targetId),
      bodyguardNeeded: !!aliveBodyguard,
      bodyguardSubmitted: !!bodyguardAction,
      bodyguardTargetName: await getName(bodyguardAction?.targetId),
      spellcasterNeeded: !!aliveSpellcaster,
      spellcasterSubmitted: !!spellcasterAction,
      spellcasterTargetName: await getName(spellcasterAction?.targetId),
      fortuneTellerNeeded: !!aliveFortuneTeller,
      fortuneTellerSubmitted: !!ftAction,
      fortuneTellerTargetName: await getName(ftAction?.targetId),
      piNeeded: !!alivePI,
      piSubmitted: !!piAction,
      piTargetName: await getName(piAction?.targetId),
      priestNeeded: !!alivePriest,
      priestSubmitted: !!priestAction,
      amuletNeeded: !!aliveAmulet,
      amuletSubmitted: !!amuletAction,
      allReady:
        (!aliveMafia.length || !!killAction) &&
        (!aliveSeer || !!seerAction) &&
        (!aliveDoctor || !!doctorAction),
    }
  },
})
