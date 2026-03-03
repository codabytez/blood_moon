import { ConvexError } from 'convex/values'

/** Extract a user-friendly message from any Convex mutation error. */
export function errMsg(err: unknown): string {
  if (err instanceof ConvexError) return String(err.data)
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}
