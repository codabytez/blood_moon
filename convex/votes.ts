import { mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'
import { Id } from './_generated/dataModel'

export const submit = mutation({
  args: {
    gameId: v.id('games'),
    targetId: v.id('players'),
    sessionId: v.string(),
  },
  handler: async (ctx, { gameId, targetId, sessionId }) => {
    const voter = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()
    if (!voter) throw new ConvexError('Player not found.')
    if (!voter.isAlive) throw new ConvexError('Dead players cannot vote.')

    const game = await ctx.db.get(gameId)
    if (!game || game.phase !== 'voting')
      throw new ConvexError('Not in voting phase.')

    const target = await ctx.db.get(targetId)
    if (!target || !target.isAlive || target._id === voter._id)
      throw new ConvexError('Invalid vote target.')

    // One vote per round — update if already voted this round
    const existing = await ctx.db
      .query('votes')
      .withIndex('by_voter', q => q.eq('voterId', voter._id))
      .order('desc')
      .first()

    if (existing && existing.round === game.round) {
      await ctx.db.patch(existing._id, { targetId })
    } else {
      await ctx.db.insert('votes', {
        gameId,
        round: game.round,
        voterId: voter._id,
        targetId,
      })
    }
  },
})

export const list = query({
  args: { gameId: v.id('games'), sessionId: v.string() },
  handler: async (ctx, { gameId, sessionId }) => {
    const myPlayer = await ctx.db
      .query('players')
      .withIndex('by_game_session', q =>
        q.eq('gameId', gameId).eq('sessionId', sessionId)
      )
      .first()

    const game = await ctx.db.get(gameId)
    if (!game) return { tally: [], myVote: null, totalVotes: 0 }

    const votes = await ctx.db
      .query('votes')
      .withIndex('by_game_round', q =>
        q.eq('gameId', gameId).eq('round', game.round)
      )
      .collect()

    // Build tally with target names
    const voteCounts: Record<string, { count: number; targetName: string }> = {}
    for (const vote of votes) {
      const key = vote.targetId as string
      if (!voteCounts[key]) {
        const target = await ctx.db.get(vote.targetId as Id<'players'>)
        voteCounts[key] = { count: 0, targetName: target?.name ?? 'Unknown' }
      }
      voteCounts[key].count++
    }

    const tally = Object.entries(voteCounts)
      .map(([targetId, data]) => ({
        targetId,
        targetName: data.targetName,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)

    const myVote = myPlayer
      ? (votes.find(v => v.voterId === myPlayer._id)?.targetId ?? null)
      : null

    return {
      tally: myPlayer?.isHost ? tally : tally.map(t => ({ ...t })), // everyone sees tally
      myVote,
      totalVotes: votes.length,
    }
  },
})
