import { Request, Response, NextFunction } from 'express'
import redis from '../redis'
import { RateLimitError } from '../../entities/rateLimitError'

export const rateLimiterMiddlewareForIp = async (req: Request, res: Response, next: NextFunction) => {
  const { ip } = req
  const ipKey = `ip:${ip}`

  await checkIfKeyExistAndSetExpirationTime(ipKey)

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

  incrementRequestCount(ipKey)

  next()
}

export const rateLimiterMiddlewareForToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']

  const tokenKey = `jwt:${token}`

  await checkIfKeyExistAndSetExpirationTime(tokenKey)

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

  incrementRequestCount(tokenKey)

  next()
}

const checkLimit = async (key: string, limit: number): Promise<boolean> => {
  const requestCount = await redis.get(key)
  const requestCountFormatted = requestCount ? parseInt(requestCount, 10) : 0

  return requestCountFormatted < limit
}

const incrementRequestCount = async (key: string) => {
  await redis.incr(key)
}

const checkIfKeyExistAndSetExpirationTime = async (key: string) => {
  const keyExists = await redis.exists(key)

  if (!keyExists) {
    await redis.set(key, 0)
    const expirationTime = parseInt(process.env.EXPIRATION_TIME_IN_SECONDS || '3600', 10)
    await redis.expire(key, expirationTime)
  }
}
