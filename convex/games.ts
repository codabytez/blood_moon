import { mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'
import { Id } from './_generated/dataModel'

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

    // ── Step 0: ToughGuy scheduled death ─────────────────────────
    const scheduledDeath = players.find(
      p => p.isAlive && p.toughGuyScheduledDeath
    )
    if (scheduledDeath) {
      await ctx.db.patch(scheduledDeath._id, {
        isAlive: false,
        toughGuyScheduledDeath: false,
      })
      // Check apprenticeSeer promo if tough guy happened to be seer (edge case)
      if (scheduledDeath.role === 'seer') {
        const apprentice = players.find(
          p => p.isAlive && p.role === 'apprenticeSeer'
        )
        if (apprentice) await ctx.db.patch(apprentice._id, { role: 'seer' })
      }
    }

    // ── Step 1: Required action validation ───────────────────────
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
    const doctorAction = actions.find(
      a => a.actionType === 'save' || a.actionType === 'protect'
    )

    const missing: string[] = []
    if (aliveMafia.length > 0 && !killAction) missing.push('Mafia (kill)')
    if (aliveSeer && !seerAction) missing.push('Seer (investigate)')
    if (aliveDoctor && !doctorAction) missing.push('Doctor (protect)')

    if (missing.length > 0) {
      throw new ConvexError(`Waiting for: ${missing.join(', ')}`)
    }

    // ── Step 2: Collect all saves/protects ───────────────────────
    const saveActions = actions.filter(
      a => a.actionType === 'save' || a.actionType === 'protect'
    )

    // Determine which targets are saved
    const savedTargetIds = new Set<string>()
    for (const action of saveActions) {
      const actor = players.find(p => p._id === action.actorId)
      if (!actor) continue

      if (actor.role === 'doctor') {
        savedTargetIds.add(action.targetId)
      } else if (actor.role === 'bodyguard') {
        // Cannot protect same target as last night
        if (
          actor.bodyguardLastTargetId &&
          actor.bodyguardLastTargetId === action.targetId
        ) {
          // Invalid — skip (client should have prevented this)
        } else {
          savedTargetIds.add(action.targetId)
          await ctx.db.patch(actor._id, {
            bodyguardLastTargetId: action.targetId,
          })
        }
      } else if (actor.role === 'priest') {
        // Priest only protects on round 1
        if (game.round === 1) savedTargetIds.add(action.targetId)
      } else if (actor.role === 'amuletOfProtection') {
        if (!actor.amuletUsed) {
          savedTargetIds.add(action.targetId)
          await ctx.db.patch(actor._id, { amuletUsed: true })
        }
      }
    }

    // ── Step 3: Kill resolution ───────────────────────────────────
    let announcement: string
    let revengeKillerId: Id<'players'> | null = null

    // skipNextNightKill check (from Diseased death last round)
    if (game.skipNextNightKill) {
      await ctx.db.patch(gameId, { skipNextNightKill: false })
      announcement = `☀️ The Diseased's curse lingers — the Mafia could not strike tonight. Everyone survived!`
    } else if (killAction) {
      const target = players.find(p => p._id === killAction.targetId)
      const isSaved = savedTargetIds.has(killAction.targetId)

      if (isSaved || !target) {
        announcement = `☀️ A quiet dawn — everyone survived. Someone was protected! 🛡️`
      } else {
        // Special passive effects before marking dead
        if (target.role === 'toughGuy' && !target.toughGuyHit) {
          // Survives — will die next night
          await ctx.db.patch(target._id, {
            toughGuyHit: true,
            toughGuyScheduledDeath: true,
          })
          announcement = `☀️ A peaceful dawn... though dark forces stirred in the night. 🌙`
        } else if (target.role === 'cursed') {
          // Becomes Mafia instead of dying
          await ctx.db.patch(target._id, { role: 'mafia' })
          announcement = `☀️ A mysterious night passes. The village senses a dark change... 🌑`
        } else {
          // Normal death
          await ctx.db.patch(target._id, { isAlive: false })

          if (target.role === 'diseased') {
            await ctx.db.patch(gameId, { skipNextNightKill: true })
          }

          // Promote apprenticeSeer if seer killed
          if (target.role === 'seer') {
            const apprentice = players.find(
              p => p.isAlive && p.role === 'apprenticeSeer'
            )
            if (apprentice) await ctx.db.patch(apprentice._id, { role: 'seer' })
          }

          if (target.role === 'hunter' || target.role === 'king') {
            revengeKillerId = target._id
          }

          announcement = `☀️ The village woke to find ${target.name} dead. 💀`
        }
      }
    } else {
      announcement = `☀️ A peaceful night. Everyone woke up safe. 🌙`
    }

    // ── Step 4: Spellcaster silence ───────────────────────────────
    // Clear previous silences first
    for (const p of players) {
      if (p.silenced) await ctx.db.patch(p._id, { silenced: false })
    }
    const silenceAction = actions.find(a => a.actionType === 'silence')
    if (silenceAction) {
      await ctx.db.patch(silenceAction.targetId, { silenced: true })
    }

    // ── Step 5: Player Inspector results ─────────────────────────
    const inspectActions = actions.filter(a => a.actionType === 'inspect')
    for (const action of inspectActions) {
      const target = players.find(p => p._id === action.targetId)
      if (target) {
        const suspicious = target.role === 'mafia' || target.role === 'lycan'
        await ctx.db.patch(action.actorId, {
          piResult: suspicious ? 'Suspicious 🔴' : 'Clear 🟢',
        })
      }
    }

    // ── Step 6: Fortune Teller results ───────────────────────────
    const ftActions = actions.filter(a => a.actionType === 'investigate_ft')
    for (const action of ftActions) {
      const target = players.find(p => p._id === action.targetId)
      if (target?.role) {
        await ctx.db.patch(action.actorId, {
          ftResult: `${target.name} is ${target.role}`,
        })
      }
    }

    // ── Step 7: Seer investigation ───────────────────────────────
    if (seerAction) {
      const target = players.find(p => p._id === seerAction.targetId)
      if (target) {
        const isMalicious = target.role === 'mafia' || target.role === 'lycan'
        const result = isMalicious ? 'Mafia 😈' : 'Innocent 😇'
        await ctx.db.patch(seerAction.actorId, {
          seerResult: `${target.name} is ${result}`,
        })
      }
    }

    // ── Step 8: Advance phase or trigger revenge ──────────────────
    if (revengeKillerId) {
      await ctx.db.patch(gameId, {
        phase: 'hunterRevenge',
        pendingHunterId: revengeKillerId,
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

    const players = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()

    // King's vote counts as 2; silenced players' votes are discarded
    const voteCounts: Record<string, number> = {}
    for (const vote of votesList) {
      const voter = players.find(p => p._id === vote.voterId)
      if (!voter) continue
      if (voter.silenced) continue // silenced players cannot vote

      const weight = voter.role === 'king' ? 2 : 1
      const key = vote.targetId as string
      voteCounts[key] = (voteCounts[key] ?? 0) + weight
    }

    // Clear silenced status after voting resolves
    for (const p of players) {
      if (p.silenced) await ctx.db.patch(p._id, { silenced: false })
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
        const eliminated = players.find(p => p._id === eliminatedId)
        if (eliminated) {
          // Prince is immune to day vote
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

          // Promote apprenticeSeer if seer was eliminated
          if (eliminated.role === 'seer') {
            const apprentice = players.find(
              p => p.isAlive && p.role === 'apprenticeSeer'
            )
            if (apprentice) await ctx.db.patch(apprentice._id, { role: 'seer' })
          }

          const roleLabel =
            eliminated.role === 'mafia'
              ? 'MAFIA 😈'
              : `a ${eliminated.role?.toUpperCase()} 😇`
          eliminationAnnouncement = `⚰️ The village has spoken. ${eliminated.name} has been eliminated — they were ${roleLabel}!`

          // Hunter or King revenge — check win first
          if (eliminated.role === 'hunter' || eliminated.role === 'king') {
            const alive = players.filter(p => p.isAlive && !p.isSpectating)
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

    // ── Win condition check ────────────────────────────────────────
    const alive = players.filter(p => p.isAlive && !p.isSpectating)
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
    const revengeMsg = isKing
      ? `👑 The King's final decree: ${hunter.name} takes ${target.name} down with them!`
      : `💀 ${hunter.name} took ${target.name} down with them!`

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
          ? { nightAnnouncement: `${prevNight} ${revengeMsg}`.trim() }
          : { eliminationAnnouncement: `${prevElim} ${revengeMsg}`.trim() }),
      })
    } else if (aliveMafia.length >= aliveVillagers.length) {
      await ctx.db.patch(gameId, {
        phase: 'ended',
        winner: 'mafia',
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
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
      })
    } else {
      await ctx.db.patch(gameId, {
        phase: 'night',
        round: game.round + 1,
        pendingHunterId: undefined,
        hunterReturnPhase: undefined,
        eliminationAnnouncement: `${prevElim} ${revengeMsg}`.trim(),
        nightAnnouncement: undefined,
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
    })
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
