import { RateLimitErrorPayload } from './rateLimitPayload'

export class RateLimitError extends Error {
  payload: RateLimitErrorPayload

  constructor(payload: RateLimitErrorPayload) {
    super('Rate limit error')
    this.payload = payload
  }
}
