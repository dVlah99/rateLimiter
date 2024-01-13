import { Request, Response, NextFunction } from 'express'
import redis from '../redis'
import { RateLimitError } from '../../entities/rateLimitError'

export const rateLimiterMiddlewareForIp = async (req: Request, res: Response, next: NextFunction) => {
  const { ip } = req
  const ipKey = `ip:${ip}`

  const ipLimit = parseInt(process.env.IP_LIMIT || '100', 10)
  const canMakeRequest = await checkLimit(ipKey, ipLimit)

  if (!canMakeRequest) {
    const ipTtl = await redis.ttl(ipKey)

    return res.status(429).json(
      new RateLimitError({
        error: 'Rate limit exceeded',
        message: `IP rate limit exceeded. Try again in ${ipTtl} seconds.`,
      }),
    )
  }

  await incrementRequestCountAndSetExpireTime(ipKey, ipLimit)

  next()
}

export const rateLimiterMiddlewareForToken = async (req: Request, res: Response, next: NextFunction) => {
  // const { userToken } = req;
  const tokenKey = `token:${'test'}`

  const tokenLimit = parseInt(process.env.TOKEN_LIMIT || '200', 10)
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

  await incrementRequestCountAndSetExpireTime(tokenKey, tokenLimit)

  next()
}

const checkLimit = async (key: string, limit: number): Promise<boolean> => {
  const requestCount = await redis.get(key)
  const requestCountFormatted = requestCount ? parseInt(requestCount, 10) : 0

  return requestCountFormatted < limit
}

const incrementRequestCountAndSetExpireTime = async (key: string, limit: number) => {
  const incrementedCount = await redis.incr(key)

  if (incrementedCount >= limit) {
    const expirationTime = parseInt(process.env.EXPIRATION_TIME_IN_SECONDS || '3600', 10)
    await redis.expire(key, expirationTime)
  }
}
