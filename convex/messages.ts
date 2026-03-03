import { mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'

export const send = mutation({
  args: {
    gameId: v.id('games'),
    content: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, { gameId, content, sessionId }) => {
    const player = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!player) throw new ConvexError('Player not found.')
    if (!player.isAlive) throw new ConvexError('Dead players cannot speak. 💀')

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'day')
      throw new ConvexError('Chat is only available during the day.')

    const trimmed = content.trim()
    if (!trimmed) throw new ConvexError('Message cannot be empty.')
    if (trimmed.length > 500)
      throw new ConvexError('Message too long (max 500 chars).')

    await ctx.db.insert('messages', {
      gameId,
      playerId: player._id,
      playerName: player.name,
      content: trimmed,
      round: game.round,
      createdAt: Date.now(),
    })
  },
})

export const list = query({
  args: { gameId: v.id('games'), round: v.number() },
  handler: async (ctx, { gameId, round }) => {
    return ctx.db
      .query('messages')
      .withIndex('by_game_round', q =>
        q.eq('gameId', gameId).eq('round', round)
      )
      .order('asc')
      .collect()
  },
})
