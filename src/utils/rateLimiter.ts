import { Request, Response, NextFunction } from 'express'
import redis from './redis'
import { RateLimitError } from '../entities/rateLimitError'

//const tokenLimit = (process.env.TOKEN_LIMIT as unknown as number) || 200
const hourInSeconds = 30

export const rateLimiterMiddlewareForIp = async (req: Request, res: Response, next: NextFunction) => {
  const { ip } = req

  const ipLimit = (process.env.IP_LIMIT as unknown as number) || 100

  const ipKey = `ip:${ip}`
  const validNumberOfCalls = await checkLimit(ipKey, ipLimit)

  if (!validNumberOfCalls) {
    const ipTtl = await redis.ttl(ipKey)
    return res.status(429).json(
      new RateLimitError({
        error: 'Rate limit exceeded',
        message: `IP rate limit exceeded. Try again in ${ipTtl} seconds.`,
      }),
    )
  }

  await incrementAndSetExpireTime(ipKey, ipLimit)

  next()
}

export const rateLimiterMiddlewareForToken = async (req: Request, res: Response, next: NextFunction) => {
  //const { userToken } = req

  const tokenKey = `token:${'test'}`
  const tokenLimit = (process.env.TOKEN_LIMIT as unknown as number) || 100

  const canMakeRequest = await checkLimit(tokenKey, tokenLimit)

  if (!canMakeRequest) {
    const tokenTtl = await redis.ttl(tokenKey)
    return res.status(429).json(
      new RateLimitError({
        error: 'Rate limit exceeded',
        message: `Token rate limit exceeded. Try again in ${tokenTtl} seconds.`,
      }),
    )
  }

  await incrementAndSetExpireTime(tokenKey, tokenLimit)

  next()
}

const checkLimit = async (key: string, limit: number): Promise<boolean> => {
  const requestCount = await redis.get(key)
  const requestCountFormatted = requestCount === null ? 0 : parseInt(requestCount, 10)

  if ((requestCountFormatted as number) >= (limit as number)) {
    return false
  }
  return true
}

const incrementAndSetExpireTime = async (key: string, limit: number) => {
  const incrementedCount = await redis.incr(key)
  incrementedCount >= limit ? redis.expire(key, hourInSeconds) : false
}
