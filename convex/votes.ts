import { mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'
import { Id } from './_generated/dataModel'
import { doElimination } from './_shared'

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

    // ── Auto-tally: if all eligible voters have now voted ──────────
    const allPlayers = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()

    const eligibleVoters = allPlayers.filter(
      p => p.isAlive && !p.isSpectating && p.role !== 'pacifist' && !p.silenced
    )

    const updatedVotes = await ctx.db
      .query('votes')
      .withIndex('by_game_round', q =>
        q.eq('gameId', gameId).eq('round', game.round)
      )
      .collect()

    if (
      eligibleVoters.length > 0 &&
      updatedVotes.length >= eligibleVoters.length
    ) {
      await doElimination(ctx.db, gameId)
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
    if (!game)
      return { tally: [], myVote: null, totalVotes: 0, voterStatuses: [] }

    const votes = await ctx.db
      .query('votes')
      .withIndex('by_game_round', q =>
        q.eq('gameId', gameId).eq('round', game.round)
      )
      .collect()

    const players = await ctx.db
      .query('players')
      .withIndex('by_game', q => q.eq('gameId', gameId))
      .collect()

    // Build tally with target names
    const voteCounts: Record<string, { count: number; targetName: string }> = {}
    for (const vote of votes) {
      const key = vote.targetId as string
      if (!voteCounts[key]) {
        const tgt = await ctx.db.get(vote.targetId as Id<'players'>)
        voteCounts[key] = { count: 0, targetName: tgt?.name ?? 'Unknown' }
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

    // Voter statuses: who has voted, who hasn't (eligible voters only)
    const votedPlayerIds = new Set(votes.map(v => v.voterId as string))
    const eligibleVoters = players.filter(
      p => p.isAlive && !p.isSpectating && p.role !== 'pacifist' && !p.silenced
    )
    const voterStatuses = eligibleVoters.map(p => ({
      playerId: p._id,
      playerName: p.name,
      hasVoted: votedPlayerIds.has(p._id as string),
      isMe: p.sessionId === myPlayer?.sessionId,
    }))

    return {
      tally,
      myVote,
      totalVotes: votes.length,
      voterStatuses,
    }
  },
})
