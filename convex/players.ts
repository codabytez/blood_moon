import { mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'

export const list = query({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const myPlayer = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()

    const players = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()

    const game = await ctx.db.get(gameId)
    const gameEnded = game?.phase === 'ended'

    // Only spectating hosts (GMs) see all roles
    const isGM = (myPlayer?.isHost && myPlayer?.isSpectating) ?? false
    const isMafia = myPlayer?.role === 'mafia'
    const isMason = myPlayer?.role === 'mason'
    const mafiaSeesTeam = game?.settings?.mafiaSeesTeam ?? true

    return players.map(p => ({
      _id: p._id,
      name: p.name,
      isAlive: p.isAlive,
      isHost: p.isHost,
      isSpectating: p.isSpectating ?? false,
      // Reveal role to: game ended, GM, self, fellow mafia (if mafiaSeesTeam), or fellow mason
      role:
        gameEnded ||
        isGM ||
        p.sessionId === sessionId ||
        (mafiaSeesTeam && isMafia && p.role === 'mafia') ||
        (isMason && p.role === 'mason')
          ? p.role
          : undefined,
      seerResult: p.sessionId === sessionId ? p.seerResult : undefined,
      piResult: p.sessionId === sessionId ? p.piResult : undefined,
      ftResult: p.sessionId === sessionId ? p.ftResult : undefined,
      beholderResult: p.sessionId === sessionId ? p.beholderResult : undefined,
      silenced: p.silenced ?? false,
      isMe: p.sessionId === sessionId,
    }))
  },
})

export const me = query({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    return ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
  },
})

/** Host-only: toggle between playing (gets a role) and GM/spectating mode. Lobby only. */
export const toggleSpectating = mutation({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const player = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!player?.isHost) throw new ConvexError('Only the host can toggle this.')

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'lobby')
      throw new ConvexError('Can only change mode in lobby.')

    await ctx.db.patch(player._id, { isSpectating: !player.isSpectating })
  },
})
