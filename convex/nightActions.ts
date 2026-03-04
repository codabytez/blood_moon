import { mutation } from './_generated/server'
import { v, ConvexError } from 'convex/values'

const PASSIVE_ROLES = new Set([
  'villager',
  'hunter',
  'prince',
  'lycan',
  'mason',
  'apprenticeSeer',
  'beholder',
  'toughGuy',
  'king',
  'diseased',
  'cursed',
  'pacifist',
  'villageIdiot',
])

export const submit = mutation({
  args: {
    gameId: v.id('games'),
    targetId: v.id('players'),
    sessionId: v.string(),
  },
  handler: async (ctx, { gameId, targetId, sessionId }) => {
    const actor = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!actor) throw new ConvexError('Player not found.')
    if (!actor.isAlive) throw new ConvexError('Dead players cannot act.')
    if (!actor.role || PASSIVE_ROLES.has(actor.role))
      throw new ConvexError('This role has no night action.')

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'night')
      throw new ConvexError('Not in night phase.')

    // Priest can only act on round 1
    if (actor.role === 'priest' && game.round !== 1)
      throw new ConvexError('The Priest can only act on the first night.')

    // Amulet can only be used once
    if (actor.role === 'amuletOfProtection' && actor.amuletUsed)
      throw new ConvexError('The Amulet of Protection has already been used.')

    const target = await ctx.db.get(targetId)
    if (!target || !target.isAlive) throw new ConvexError('Invalid target.')

    // Bodyguard cannot protect same player two nights in a row
    if (
      actor.role === 'bodyguard' &&
      actor.bodyguardLastTargetId &&
      actor.bodyguardLastTargetId === targetId
    ) {
      throw new ConvexError(
        'You cannot protect the same player two nights in a row.'
      )
    }

    const actionType = roleToActionType(actor.role)

    if (actionType === 'kill') {
      // Any mafia member can update the shared kill target
      const existingKill = await ctx.db
        .query('nightActions')
        .withIndex('by_game_round', q =>
          q.eq('gameId', gameId).eq('round', game.round)
        )
        .filter(q => q.eq(q.field('actionType'), 'kill'))
        .first()

      if (existingKill) {
        await ctx.db.patch(existingKill._id, { targetId, actorId: actor._id })
      } else {
        await ctx.db.insert('nightActions', {
          gameId,
          round: game.round,
          actorId: actor._id,
          targetId,
          actionType: 'kill',
        })
      }
    } else {
      // All other roles: one action per player per round (update if exists)
      const existing = await ctx.db
        .query('nightActions')
        .withIndex('by_actor_round', q =>
          q.eq('actorId', actor._id).eq('round', game.round)
        )
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, { targetId, actionType })
      } else {
        await ctx.db.insert('nightActions', {
          gameId,
          round: game.round,
          actorId: actor._id,
          targetId,
          actionType,
        })
      }
    }
  },
})

function roleToActionType(
  role: string
):
  | 'kill'
  | 'investigate'
  | 'save'
  | 'protect'
  | 'inspect'
  | 'silence'
  | 'investigate_ft' {
  switch (role) {
    case 'mafia':
      return 'kill'
    case 'seer':
      return 'investigate'
    case 'doctor':
    case 'priest':
    case 'amuletOfProtection':
      return 'save'
    case 'bodyguard':
      return 'protect'
    case 'playerInspector':
      return 'inspect'
    case 'spellcaster':
      return 'silence'
    case 'fortuneTeller':
      return 'investigate_ft'
    default:
      return 'save'
  }
}
