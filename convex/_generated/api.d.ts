/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _shared from '../_shared.js'
import type * as games from '../games.js'
import type * as mafiaMessages from '../mafiaMessages.js'
import type * as messages from '../messages.js'
import type * as nightActions from '../nightActions.js'
import type * as players from '../players.js'
import type * as votes from '../votes.js'

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from 'convex/server'

declare const fullApi: ApiFromModules<{
  _shared: typeof _shared
  games: typeof games
  mafiaMessages: typeof mafiaMessages
  messages: typeof messages
  nightActions: typeof nightActions
  players: typeof players
  votes: typeof votes
}>

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'public'>
>

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'internal'>
>

export declare const components: {}
