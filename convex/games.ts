import { mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'
import { Id } from './_generated/dataModel'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function assignRoles(playerCount: number): string[] {
  const n = playerCount
  const mafiaCount = n >= 10 ? 3 : n >= 7 ? 2 : 1
  const hasSeer = n >= 5
  const hasDoctor = n >= 7
  const hasHunter = n >= 8
  const masonCount = n >= 9 ? 2 : 0
  const hasLycan = n >= 11
  const hasApprentice = n >= 13
  const hasPrince = n >= 13

  const roles: string[] = [
    ...Array(mafiaCount).fill('mafia'),
    ...(hasSeer ? ['seer'] : []),
    ...(hasDoctor ? ['doctor'] : []),
    ...(hasHunter ? ['hunter'] : []),
    ...Array(masonCount).fill('mason'),
    ...(hasLycan ? ['lycan'] : []),
    ...(hasApprentice ? ['apprenticeSeer'] : []),
    ...(hasPrince ? ['prince'] : []),
  ]
  while (roles.length < n) roles.push('villager')

  // Fisher-Yates shuffle
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

    const roles = assignRoles(activePlayers.length)
    for (let i = 0; i < activePlayers.length; i++) {
      await ctx.db.patch(activePlayers[i]._id, {
        role: roles[i] as
          | 'mafia'
          | 'villager'
          | 'seer'
          | 'doctor'
          | 'hunter'
          | 'prince'
          | 'lycan'
          | 'mason'
          | 'apprenticeSeer',
      })
    }

    await ctx.db.patch(gameId, { phase: 'night' })
  },
})

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

    const players = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()

    const aliveMafia = players.filter(p => p.isAlive && p.role === 'mafia')
    const aliveSeer = players.find(p => p.isAlive && p.role === 'seer')
    const aliveDoctor = players.find(p => p.isAlive && p.role === 'doctor')

    const actions = await ctx.db
      .query('nightActions')
      .withIndex('by_game_round', q =>
        q.eq('gameId', gameId).eq('round', game.round)
      )
      .collect()

    const killAction = actions.find(a => a.actionType === 'kill')
    const seerAction = actions.find(a => a.actionType === 'investigate')
    const doctorAction = actions.find(a => a.actionType === 'save')

    const missing: string[] = []
    if (aliveMafia.length > 0 && !killAction) missing.push('Mafia (kill)')
    if (aliveSeer && !seerAction) missing.push('Seer (investigate)')
    if (aliveDoctor && !doctorAction) missing.push('Doctor (protect)')

    if (missing.length > 0) {
      throw new ConvexError(`Waiting for: ${missing.join(', ')}`)
    }

    // ── Process night actions ─────────────────────────────────────
    const saveAction = actions.find(a => a.actionType === 'save')

    let announcement = ''
    let hunterKilledId: Id<'players'> | null = null

    if (killAction) {
      const target = await ctx.db.get(killAction.targetId)
      const isSaved =
        saveAction !== undefined && saveAction.targetId === killAction.targetId
      if (!isSaved && target) {
        await ctx.db.patch(killAction.targetId, { isAlive: false })

        // Promote apprentice seer if the Seer was killed
        if (target.role === 'seer') {
          const apprentice = players.find(
            p => p.isAlive && p.role === 'apprenticeSeer'
          )
          if (apprentice) await ctx.db.patch(apprentice._id, { role: 'seer' })
        }

        if (target.role === 'hunter') {
          hunterKilledId = killAction.targetId
          announcement = `☀️ The village woke to find ${target.name} dead. 💀`
        } else {
          announcement = `☀️ The village woke to find ${target.name} dead. 💀`
        }
      } else {
        announcement = `☀️ A quiet dawn — everyone survived. Someone was protected! 🛡️`
      }
    } else {
      announcement = `☀️ A peaceful night. Everyone woke up safe. 🌙`
    }

    // Seer investigation (lycan appears as Mafia)
    if (seerAction) {
      const target = await ctx.db.get(seerAction.targetId)
      if (target) {
        const isMalicious = target.role === 'mafia' || target.role === 'lycan'
        const result = isMalicious ? 'Mafia 😈' : 'Innocent 😇'
        await ctx.db.patch(seerAction.actorId, {
          seerResult: `${target.name} is ${result}`,
        })
      }
    }

    // If the hunter was killed, enter the revenge mini-phase instead of advancing to day
    if (hunterKilledId) {
      await ctx.db.patch(gameId, {
        phase: 'hunterRevenge',
        pendingHunterId: hunterKilledId,
        hunterReturnPhase: 'day',
        nightAnnouncement: announcement,
      })
      return
    }

    await ctx.db.patch(gameId, {
      phase: 'day',
      nightAnnouncement: announcement,
    })
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

    await ctx.db.patch(gameId, { phase: 'voting' })
  },
})

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

    const votesList = await ctx.db
      .query('votes')
      .withIndex('by_game_round', q =>
        q.eq('gameId', gameId).eq('round', game.round)
      )
      .collect()

    const voteCounts: Record<string, number> = {}
    for (const vote of votesList) {
      const key = vote.targetId as string
      voteCounts[key] = (voteCounts[key] ?? 0) + 1
    }

    let eliminationAnnouncement = ''

    if (Object.keys(voteCounts).length === 0) {
      eliminationAnnouncement = `🎲 No votes were cast. The night approaches once more...`
    } else {
      const maxVotes = Math.max(...Object.values(voteCounts))
      const topTargets = Object.entries(voteCounts).filter(
        ([, count]) => count === maxVotes
      )
      if (topTargets.length > 1) {
        eliminationAnnouncement = `🎲 It's a tie! No one was eliminated. The mystery continues...`
      } else {
        const eliminatedId = topTargets[0][0] as Id<'players'>
        const eliminated = await ctx.db.get(eliminatedId)
        if (eliminated) {
          // Prince is immune to the day vote
          if (eliminated.role === 'prince') {
            await ctx.db.patch(gameId, {
              phase: 'night',
              round: game.round + 1,
              eliminationAnnouncement: `👑 ${eliminated.name} was voted out, but they are the Prince — immune to elimination! The night falls...`,
              nightAnnouncement: undefined,
            })
            return
          }

          await ctx.db.patch(eliminatedId, { isAlive: false })

          // Promote apprentice seer if the Seer was voted out
          if (eliminated.role === 'seer') {
            const allPlayersNow = await ctx.db
              .query('players')
              .withIndex('by_game', q => q.eq('gameId', gameId))
              .collect()
            const apprentice = allPlayersNow.find(
              p => p.isAlive && p.role === 'apprenticeSeer'
            )
            if (apprentice) await ctx.db.patch(apprentice._id, { role: 'seer' })
          }

          const roleLabel =
            eliminated.role === 'mafia'
              ? 'MAFIA 😈'
              : `a ${eliminated.role?.toUpperCase()} 😇`
          eliminationAnnouncement = `⚰️ The village has spoken. ${eliminated.name} has been eliminated — they were ${roleLabel}!`

          // Hunter revenge — check win first; if game continues enter revenge phase
          if (eliminated.role === 'hunter') {
            const allPlayers = await ctx.db
              .query('players')
              .withIndex('by_game', q => q.eq('gameId', gameId))
              .collect()
            const alive = allPlayers.filter(p => p.isAlive && !p.isSpectating)
            const aliveMafia = alive.filter(p => p.role === 'mafia')
            const aliveVillagers = alive.filter(p => p.role !== 'mafia')

            if (aliveMafia.length === 0) {
              await ctx.db.patch(gameId, {
                phase: 'ended',
                winner: 'villagers',
                eliminationAnnouncement,
              })
            } else if (aliveMafia.length >= aliveVillagers.length) {
              await ctx.db.patch(gameId, {
                phase: 'ended',
                winner: 'mafia',
                eliminationAnnouncement,
              })
            } else {
              await ctx.db.patch(gameId, {
                phase: 'hunterRevenge',
                pendingHunterId: eliminatedId,
                hunterReturnPhase: 'night',
                eliminationAnnouncement,
              })
            }
            return
          }
        }
      }
    }

    // ── Win condition check (for non-hunter eliminations) ──────────
    const allPlayers = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()
    const alive = allPlayers.filter(p => p.isAlive && !p.isSpectating)
    const aliveMafia = alive.filter(p => p.role === 'mafia')
    const aliveVillagers = alive.filter(p => p.role !== 'mafia')

    if (aliveMafia.length === 0) {
      await ctx.db.patch(gameId, {
        phase: 'ended',
        winner: 'villagers',
        eliminationAnnouncement,
      })
    } else if (aliveMafia.length >= aliveVillagers.length) {
      await ctx.db.patch(gameId, {
        phase: 'ended',
        winner: 'mafia',
        eliminationAnnouncement,
      })
    } else {
      await ctx.db.patch(gameId, {
        phase: 'night',
        round: game.round + 1,
        eliminationAnnouncement,
        nightAnnouncement: undefined,
      })
    }
  },
})

/** Hunter fires their final shot after being eliminated. */
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
      throw new ConvexError('Only the Hunter can fire their last shot.')

    const target = await ctx.db.get(targetId)
    if (!target || !target.isAlive || target._id === hunter._id)
      throw new ConvexError('Invalid target.')

    await ctx.db.patch(targetId, { isAlive: false })

    // Promote apprentice seer if the Seer was the hunter's target
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

    const hunterMsg = `💀 ${hunter.name} took ${target.name} down with them!`
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
        ...(returnPhase === 'day'
          ? { nightAnnouncement: `${prevNight} ${hunterMsg}`.trim() }
          : { eliminationAnnouncement: `${prevElim} ${hunterMsg}`.trim() }),
      })
    } else if (aliveMafia.length >= aliveVillagers.length) {
      await ctx.db.patch(gameId, {
        phase: 'ended',
        winner: 'mafia',
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        ...(returnPhase === 'day'
          ? { nightAnnouncement: `${prevNight} ${hunterMsg}`.trim() }
          : { eliminationAnnouncement: `${prevElim} ${hunterMsg}`.trim() }),
      })
    } else if (returnPhase === 'day') {
      await ctx.db.patch(gameId, {
        phase: 'day',
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        nightAnnouncement: `${prevNight} ${hunterMsg}`.trim(),
      })
    } else {
      await ctx.db.patch(gameId, {
        phase: 'night',
        round: game.round + 1,
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        eliminationAnnouncement: `${prevElim} ${hunterMsg}`.trim(),
        nightAnnouncement: undefined,
      })
    }
  },
})

/**
 * Reset a finished game back to lobby so the same group can play again.
 */
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
    })
  },
})

/**
 * Night action status — returned to any host.
 * GMs see who was targeted; playing hosts see submitted/pending only.
 */
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

    const actions = await ctx.db
      .query('nightActions')
      .withIndex('by_game_round', q =>
        q.eq('gameId', gameId).eq('round', game.round)
      )
      .collect()

    const killAction = actions.find(a => a.actionType === 'kill')
    const seerAction = actions.find(a => a.actionType === 'investigate')
    const doctorAction = actions.find(a => a.actionType === 'save')

    const killTarget =
      isGM && killAction ? await ctx.db.get(killAction.targetId) : null
    const seerTarget =
      isGM && seerAction ? await ctx.db.get(seerAction.targetId) : null
    const doctorTarget =
      isGM && doctorAction ? await ctx.db.get(doctorAction.targetId) : null

    return {
      isGM,
      mafiaNeeded: aliveMafia.length > 0,
      mafiaSubmitted: !!killAction,
      mafiaAction: killTarget ? { targetName: killTarget.name } : null,
      seerNeeded: !!aliveSeer,
      seerSubmitted: !!seerAction,
      seerAction: seerTarget ? { targetName: seerTarget.name } : null,
      doctorNeeded: !!aliveDoctor,
      doctorSubmitted: !!doctorAction,
      doctorAction: doctorTarget ? { targetName: doctorTarget.name } : null,
      allReady:
        (!aliveMafia.length || !!killAction) &&
        (!aliveSeer || !!seerAction) &&
        (!aliveDoctor || !!doctorAction),
    }
  },
})
