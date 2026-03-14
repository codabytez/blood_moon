import posthog from 'posthog-js'

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const host =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  'https://us.i.posthog.com'

export function initAnalytics() {
  if (!key) return
  posthog.init(key, {
    api_host: host,
    person_profiles: 'never', // no PII — anonymous event tracking only
    capture_pageview: true,
    capture_pageleave: true,
  })
}

function track(event: string, props?: Record<string, unknown>) {
  if (!key) return
  posthog.capture(event, props)
}

export const analytics = {
  gameCreated() {
    track('game_created')
  },

  playerJoined() {
    track('player_joined')
  },

  gameStarted(playerCount: number) {
    track('game_started', { player_count: playerCount })
  },

  gameEnded(winner: 'villagers' | 'mafia', playerCount: number) {
    track('game_ended', { winner, player_count: playerCount })
  },

  rulesViewed() {
    track('rules_viewed')
  },
}
