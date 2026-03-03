import { mutation } from './_generated/server'
import { v, ConvexError } from 'convex/values'

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
    const passiveRoles = new Set([
      'villager',
      'hunter',
      'prince',
      'lycan',
      'mason',
      'apprenticeSeer',
    ])
    if (!actor.role || passiveRoles.has(actor.role))
      throw new ConvexError('This role has no night action.')

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'night')
      throw new ConvexError('Not in night phase.')

    const target = await ctx.db.get(targetId)
    if (!target || !target.isAlive) throw new ConvexError('Invalid target.')

    const actionType =
      actor.role === 'mafia'
        ? 'kill'
        : actor.role === 'seer'
          ? 'investigate'
          : 'save'

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
      // Seer / Doctor — one action per player per round
      const existing = await ctx.db
        .query('nightActions')
        .withIndex('by_actor_round', q =>
          q.eq('actorId', actor._id).eq('round', game.round)
        )
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, { targetId })
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
