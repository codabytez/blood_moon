import { ConvexError } from 'convex/values'
import { Id } from './_generated/dataModel'

export const NIGHT_MS = 120_000 // 2 minutes
export const DAY_MS = 180_000 // 3 minutes
export const HUNTER_MS = 60_000 // 1 minute

export type GameSettings = {
  nightSeconds: number
  daySeconds: number
  hunterSeconds: number
  revealRoleOnDeath: boolean
  customRoles?: string[]
  skipRoleReveal: boolean
  deadCanChat: boolean
  mafiaSeesTeam: boolean
  timerVisibleToAll: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSettings(game: any): GameSettings {
  const s = game?.settings ?? {}
  return {
    nightSeconds: s.nightSeconds ?? 120,
    daySeconds: s.daySeconds ?? 180,
    hunterSeconds: s.hunterSeconds ?? 60,
    revealRoleOnDeath: s.revealRoleOnDeath ?? true,
    customRoles: s.customRoles,
    skipRoleReveal: s.skipRoleReveal ?? false,
    deadCanChat: s.deadCanChat ?? false,
    mafiaSeesTeam: s.mafiaSeesTeam ?? true,
    timerVisibleToAll: s.timerVisibleToAll ?? true,
  }
}

const ROLE_LABELS: Record<string, string> = {
  mafia: 'Mafia',
  villager: 'Villager',
  seer: 'Seer',
  doctor: 'Doctor',
  hunter: 'Hunter',
  prince: 'Prince',
  lycan: 'Lycan',
  mason: 'Mason',
  apprenticeSeer: 'Apprentice Seer',
  bodyguard: 'Bodyguard',
  fortuneTeller: 'Fortune Teller',
  playerInspector: 'Player Inspector',
  priest: 'Priest',
  spellcaster: 'Spellcaster',
  amuletOfProtection: 'Amulet of Protection',
  beholder: 'Beholder',
  toughGuy: 'Tough Guy',
  king: 'King',
  diseased: 'Diseased',
  cursed: 'Cursed',
  pacifist: 'Pacifist',
  villageIdiot: 'Village Idiot',
}

export function formatRole(role: string | undefined): string {
  return role ? (ROLE_LABELS[role] ?? role) : 'Unknown'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

/**
 * Core night resolution logic.
 * skipMissingValidation=true: auto-advance path (no validation errors thrown)
 * skipMissingValidation=false: manual host path (throws ConvexError if required actions missing)
 */
export async function doNightResolution(
  db: DB,
  gameId: Id<'games'>,
  skipMissingValidation = false
): Promise<void> {
  const game = await db.get(gameId)
  if (!game || game.phase !== 'night') return
  const s = getSettings(game)

  const players: DB[] = await db
    .query('players')
    .withIndex('by_game', (q: DB) => q.eq('gameId', gameId))
    .collect()

  // ── Step 0: ToughGuy scheduled death ─────────────────────────
  const scheduledDeath = players.find(
    (p: DB) => p.isAlive && p.toughGuyScheduledDeath
  )
  if (scheduledDeath) {
    await db.patch(scheduledDeath._id, {
      isAlive: false,
      toughGuyScheduledDeath: false,
    })
    if (scheduledDeath.role === 'seer') {
      const apprentice = players.find(
        (p: DB) => p.isAlive && p.role === 'apprenticeSeer'
      )
      if (apprentice) await db.patch(apprentice._id, { role: 'seer' })
    }
  }

  const actions: DB[] = await db
    .query('nightActions')
    .withIndex('by_game_round', (q: DB) =>
      q.eq('gameId', gameId).eq('round', game.round)
    )
    .collect()

  const killAction = actions.find((a: DB) => a.actionType === 'kill')
  const seerAction = actions.find((a: DB) => a.actionType === 'investigate')

  // ── Step 1: Validation (manual path only) ─────────────────────
  if (!skipMissingValidation) {
    const aliveMafia = players.filter(
      (p: DB) => p.isAlive && p.role === 'mafia'
    )
    const aliveSeer = players.find((p: DB) => p.isAlive && p.role === 'seer')
    const aliveDoctor = players.find(
      (p: DB) => p.isAlive && p.role === 'doctor'
    )
    const doctorAction = actions.find(
      (a: DB) => a.actionType === 'save' || a.actionType === 'protect'
    )

    const missing: string[] = []
    if (aliveMafia.length > 0 && !killAction) missing.push('Mafia (kill)')
    if (aliveSeer && !seerAction) missing.push('Seer (investigate)')
    if (aliveDoctor && !doctorAction) missing.push('Doctor (protect)')

    if (missing.length > 0) {
      throw new ConvexError(`Waiting for: ${missing.join(', ')}`)
    }
  }

  // ── Step 2: Collect all saves/protects ───────────────────────
  const saveActions = actions.filter(
    (a: DB) => a.actionType === 'save' || a.actionType === 'protect'
  )

  const savedTargetIds = new Set<string>()
  for (const action of saveActions) {
    const actor = players.find((p: DB) => p._id === action.actorId)
    if (!actor) continue

    if (actor.role === 'doctor') {
      savedTargetIds.add(action.targetId)
    } else if (actor.role === 'bodyguard') {
      if (
        actor.bodyguardLastTargetId &&
        actor.bodyguardLastTargetId === action.targetId
      ) {
        // Invalid repeat — skip
      } else {
        savedTargetIds.add(action.targetId)
        await db.patch(actor._id, { bodyguardLastTargetId: action.targetId })
      }
    } else if (actor.role === 'priest') {
      if (game.round === 1) savedTargetIds.add(action.targetId)
    } else if (actor.role === 'amuletOfProtection') {
      if (!actor.amuletUsed) {
        savedTargetIds.add(action.targetId)
        await db.patch(actor._id, { amuletUsed: true })
      }
    }
  }

  // ── Step 3: Kill resolution ───────────────────────────────────
  let announcement: string
  let revengeKillerId: Id<'players'> | null = null

  if (game.skipNextNightKill) {
    await db.patch(gameId, { skipNextNightKill: false })
    announcement = `The Diseased's curse lingers — the Mafia could not strike tonight. Everyone survived.`
  } else if (killAction) {
    const target = players.find((p: DB) => p._id === killAction.targetId)
    const isSaved = savedTargetIds.has(killAction.targetId)

    if (isSaved || !target) {
      announcement = `A quiet dawn — everyone survived the night. Someone was protected.`
    } else {
      if (target.role === 'toughGuy' && !target.toughGuyHit) {
        await db.patch(target._id, {
          toughGuyHit: true,
          toughGuyScheduledDeath: true,
        })
        announcement = `A peaceful dawn... though dark forces stirred in the night.`
      } else if (target.role === 'cursed') {
        await db.patch(target._id, { role: 'mafia' })
        announcement = `A mysterious night passes. The village senses a dark change...`
      } else {
        await db.patch(target._id, { isAlive: false })

        if (target.role === 'diseased') {
          await db.patch(gameId, { skipNextNightKill: true })
        }

        if (target.role === 'seer') {
          const apprentice = players.find(
            (p: DB) => p.isAlive && p.role === 'apprenticeSeer'
          )
          if (apprentice) await db.patch(apprentice._id, { role: 'seer' })
        }

        if (target.role === 'hunter' || target.role === 'king') {
          revengeKillerId = target._id
        }

        if (!s.revealRoleOnDeath) {
          announcement = `${target.name} was found dead at dawn.`
        } else {
          const roleLabel = formatRole(target.role)
          const isMafia = target.role === 'mafia'
          announcement = `${target.name} was found dead at dawn. They were the ${isMafia ? 'Mafia 😈' : roleLabel + ' 😇'}.`
        }
      }
    }
  } else {
    announcement = `A peaceful night. Everyone woke up safe.`
  }

  // ── Step 4: Spellcaster silence ───────────────────────────────
  for (const p of players) {
    if (p.silenced) await db.patch(p._id, { silenced: false })
  }
  const silenceAction = actions.find((a: DB) => a.actionType === 'silence')
  if (silenceAction) {
    await db.patch(silenceAction.targetId, { silenced: true })
  }

  // ── Step 5: Player Inspector results ─────────────────────────
  const inspectActions = actions.filter((a: DB) => a.actionType === 'inspect')
  for (const action of inspectActions) {
    const target = players.find((p: DB) => p._id === action.targetId)
    if (target) {
      const suspicious = target.role === 'mafia' || target.role === 'lycan'
      await db.patch(action.actorId, {
        piResult: suspicious ? 'Suspicious' : 'Clear',
      })
    }
  }

  // ── Step 6: Fortune Teller results ───────────────────────────
  const ftActions = actions.filter((a: DB) => a.actionType === 'investigate_ft')
  for (const action of ftActions) {
    const target = players.find((p: DB) => p._id === action.targetId)
    if (target?.role) {
      await db.patch(action.actorId, {
        ftResult: `${target.name} is the ${formatRole(target.role)}`,
      })
    }
  }

  // ── Step 7: Seer investigation ───────────────────────────────
  if (seerAction) {
    const target = players.find((p: DB) => p._id === seerAction.targetId)
    if (target) {
      const isMalicious = target.role === 'mafia' || target.role === 'lycan'
      const result = isMalicious ? 'Mafia 😈' : 'Innocent 😇'
      await db.patch(seerAction.actorId, {
        seerResult: `${target.name} is ${result}`,
      })
    }
  }

  // ── Step 8: Advance phase or trigger revenge ──────────────────
  if (revengeKillerId) {
    await db.patch(gameId, {
      phase: 'hunterRevenge',
      pendingHunterId: revengeKillerId,
      hunterReturnPhase: 'day',
      nightAnnouncement: announcement,
      phaseDeadline: Date.now() + s.hunterSeconds * 1000,
    })
    return
  }

  await db.patch(gameId, {
    phase: 'day',
    nightAnnouncement: announcement,
    phaseDeadline: Date.now() + s.daySeconds * 1000,
  })
}

/**
 * Core elimination logic (processElimination).
 * Called by both the manual host path and auto-tally path.
 */
export async function doElimination(
  db: DB,
  gameId: Id<'games'>
): Promise<void> {
  const game = await db.get(gameId)
  if (!game || game.phase !== 'voting') return
  const s = getSettings(game)

  const votesList: DB[] = await db
    .query('votes')
    .withIndex('by_game_round', (q: DB) =>
      q.eq('gameId', gameId).eq('round', game.round)
    )
    .collect()

  const players: DB[] = await db
    .query('players')
    .withIndex('by_game', (q: DB) => q.eq('gameId', gameId))
    .collect()

  // King's vote counts as 2; silenced players' votes are discarded
  const voteCounts: Record<string, number> = {}
  for (const vote of votesList) {
    const voter = players.find((p: DB) => p._id === vote.voterId)
    if (!voter || voter.silenced) continue
    const weight = voter.role === 'king' ? 2 : 1
    const key = vote.targetId as string
    voteCounts[key] = (voteCounts[key] ?? 0) + weight
  }

  // Clear silenced status after voting resolves
  for (const p of players) {
    if (p.silenced) await db.patch(p._id, { silenced: false })
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
      const eliminated = players.find((p: DB) => p._id === eliminatedId)

      if (eliminated) {
        // Prince is immune to day vote
        if (eliminated.role === 'prince') {
          const princeMsg = s.revealRoleOnDeath
            ? `👑 ${eliminated.name} was voted out, but they are the Prince — immune to elimination! The night falls...`
            : `${eliminated.name} was voted out but survived!`
          await db.patch(gameId, {
            phase: 'night',
            round: game.round + 1,
            eliminationAnnouncement: princeMsg,
            nightAnnouncement: undefined,
            phaseDeadline: Date.now() + s.nightSeconds * 1000,
          })
          return
        }

        await db.patch(eliminatedId, { isAlive: false })
        // Update in-memory array so win checks below reflect the death
        eliminated.isAlive = false

        // Promote apprenticeSeer if seer was eliminated
        if (eliminated.role === 'seer') {
          const apprentice = players.find(
            (p: DB) => p.isAlive && p.role === 'apprenticeSeer'
          )
          if (apprentice) await db.patch(apprentice._id, { role: 'seer' })
        }

        if (!s.revealRoleOnDeath) {
          eliminationAnnouncement = `⚰️ The village has spoken. ${eliminated.name} has been eliminated!`
        } else {
          const roleLabel = formatRole(eliminated.role)
          const isMafia = eliminated.role === 'mafia'
          eliminationAnnouncement = `⚰️ The village has spoken. ${eliminated.name} has been eliminated — they were the ${isMafia ? 'MAFIA 😈' : roleLabel + ' 😇'}!`
        }

        // Hunter or King revenge
        if (eliminated.role === 'hunter' || eliminated.role === 'king') {
          const alive = players.filter((p: DB) => p.isAlive && !p.isSpectating)
          const aliveMafia = alive.filter((p: DB) => p.role === 'mafia')
          const aliveVillagers = alive.filter((p: DB) => p.role !== 'mafia')

          if (aliveMafia.length === 0) {
            await db.patch(gameId, {
              phase: 'ended',
              winner: 'villagers',
              eliminationAnnouncement,
            })
          } else if (aliveMafia.length >= aliveVillagers.length) {
            await db.patch(gameId, {
              phase: 'ended',
              winner: 'mafia',
              eliminationAnnouncement,
            })
          } else {
            await db.patch(gameId, {
              phase: 'hunterRevenge',
              pendingHunterId: eliminatedId,
              hunterReturnPhase: 'night',
              eliminationAnnouncement,
              phaseDeadline: Date.now() + s.hunterSeconds * 1000,
            })
          }
          return
        }
      }
    }
  }

  // ── Win condition check ────────────────────────────────────────
  const alive = players.filter((p: DB) => p.isAlive && !p.isSpectating)
  const aliveMafia = alive.filter((p: DB) => p.role === 'mafia')
  const aliveVillagers = alive.filter((p: DB) => p.role !== 'mafia')

  if (aliveMafia.length === 0) {
    await db.patch(gameId, {
      phase: 'ended',
      winner: 'villagers',
      eliminationAnnouncement,
    })
  } else if (aliveMafia.length >= aliveVillagers.length) {
    await db.patch(gameId, {
      phase: 'ended',
      winner: 'mafia',
      eliminationAnnouncement,
    })
  } else {
    await db.patch(gameId, {
      phase: 'night',
      round: game.round + 1,
      eliminationAnnouncement,
      nightAnnouncement: undefined,
      phaseDeadline: Date.now() + s.nightSeconds * 1000,
    })
  }
}
