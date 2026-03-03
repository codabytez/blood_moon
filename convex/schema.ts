import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  games: defineTable({
    code: v.string(),
    phase: v.union(
      v.literal('lobby'),
      v.literal('night'),
      v.literal('day'),
      v.literal('voting'),
      v.literal('hunterRevenge'),
      v.literal('ended')
    ),
    round: v.number(),
    winner: v.optional(v.union(v.literal('villagers'), v.literal('mafia'))),
    nightAnnouncement: v.optional(v.string()),
    eliminationAnnouncement: v.optional(v.string()),
    // Hunter revenge mini-phase
    pendingHunterId: v.optional(v.id('players')),
    hunterReturnPhase: v.optional(
      v.union(v.literal('day'), v.literal('night'))
    ),
  }).index('by_code', ['code']),

  players: defineTable({
    gameId: v.id('games'),
    name: v.string(),
    role: v.optional(
      v.union(
        v.literal('mafia'),
        v.literal('villager'),
        v.literal('seer'),
        v.literal('doctor'),
        v.literal('hunter'),
        v.literal('prince'),
        v.literal('lycan'),
        v.literal('mason'),
        v.literal('apprenticeSeer')
      )
    ),
    isAlive: v.boolean(),
    isHost: v.boolean(),
    sessionId: v.string(),
    seerResult: v.optional(v.string()),
    // Host only: false = playing with a role, true = GM/spectator (sees everything, no role)
    isSpectating: v.optional(v.boolean()),
  })
    .index('by_game', ['gameId'])
    .index('by_session', ['sessionId'])
    .index('by_game_session', ['gameId', 'sessionId']),

  nightActions: defineTable({
    gameId: v.id('games'),
    round: v.number(),
    actorId: v.id('players'),
    targetId: v.id('players'),
    actionType: v.union(
      v.literal('kill'),
      v.literal('investigate'),
      v.literal('save')
    ),
  })
    .index('by_game_round', ['gameId', 'round'])
    .index('by_actor_round', ['actorId', 'round']),

  votes: defineTable({
    gameId: v.id('games'),
    round: v.number(),
    voterId: v.id('players'),
    targetId: v.id('players'),
  })
    .index('by_game_round', ['gameId', 'round'])
    .index('by_voter', ['voterId']),

  messages: defineTable({
    gameId: v.id('games'),
    playerId: v.id('players'),
    playerName: v.string(),
    content: v.string(),
    round: v.number(),
    createdAt: v.number(),
  }).index('by_game_round', ['gameId', 'round']),

  // Private mafia team chat — only visible to mafia players + spectating host
  mafiaMessages: defineTable({
    gameId: v.id('games'),
    playerId: v.id('players'),
    playerName: v.string(),
    content: v.string(),
    createdAt: v.number(),
  }).index('by_game', ['gameId']),
})
