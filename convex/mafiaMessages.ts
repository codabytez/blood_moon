import { mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'

/** Send a message to the private mafia channel. Only mafia players can send. */
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
    if (player.role !== 'mafia')
      throw new ConvexError('Only mafia can use this channel.')
    if (!player.isAlive)
      throw new ConvexError('Dead players cannot send messages.')

    const trimmed = content.trim()
    if (!trimmed) throw new ConvexError('Message cannot be empty.')
    if (trimmed.length > 500)
      throw new ConvexError('Message too long (max 500 chars).')

    const game = await ctx.db.get(gameId)
    if (!game || game.phase === 'lobby' || game.phase === 'ended') {
      throw new ConvexError('Mafia chat is not available right now.')
    }

    await ctx.db.insert('mafiaMessages', {
      gameId,
      playerId: player._id,
      playerName: player.name,
      content: trimmed,
      createdAt: Date.now(),
    })
  },
})

/** List mafia messages. Only mafia players and spectating hosts (GMs) can read. */
export const list = query({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const me = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()

    const isGM = me?.isHost && me.isSpectating
    const isMafia = me?.role === 'mafia'

    if (!isGM && !isMafia) return [] // unauthorized

    return ctx.db
      .query('mafiaMessages')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .order('asc')
      .collect()
  },
})
