import { Request, Response, NextFunction } from 'express'
import redis from '../redis'
import { RateLimitError } from '../../entities/rateLimitError'

const checkLimit = async (key: string, limit: number): Promise<boolean> => {
  const requestCount = await redis.get(key)
  const requestCountFormatted = requestCount ? parseInt(requestCount, 10) : 0

  return requestCountFormatted < limit
}

const incrementRequestCount = async (key: string, weigth: number) => {
  await redis.incrby(key, weigth)
}

const checkIfKeyExistAndSetExpirationTime = async (key: string) => {
  const keyExists = await redis.exists(key)

  if (!keyExists) {
    await redis.set(key, 0)
    const expirationTime = parseInt(process.env.EXPIRATION_TIME_IN_SECONDS || '3600', 10)
    await redis.expire(key, expirationTime)
  }
}

export const rateLimiterMiddlewareForIp = async (req: Request, res: Response, weigth: number) => {
  const { ip } = req
  const ipKey = `ip:${ip}`

  await checkIfKeyExistAndSetExpirationTime(ipKey)

  const ipLimit = parseInt(process.env.IP_LIMIT || '100', 10)
  const canMakeRequest = await checkLimit(ipKey, ipLimit)

  if (!canMakeRequest) {
    const ipTtl = await redis.ttl(ipKey)

    throw new RateLimitError({
      error: 'Rate limit exceeded',
      message: `Ip rate limit exceeded. Try again in ${ipTtl} seconds.`,
    })
  }

  await incrementRequestCount(ipKey, weigth)
}

export const rateLimiterMiddlewareForToken = async (req: Request, res: Response, weigth: number) => {
  const token = req.headers['authorization']

  const tokenKey = `jwt:${token}`

  await checkIfKeyExistAndSetExpirationTime(tokenKey)

  const tokenLimit = parseInt(process.env.TOKEN_LIMIT || '200', 10)
  const canMakeRequest = await checkLimit(tokenKey, tokenLimit)

  if (!canMakeRequest) {
    const tokenTtl = await redis.ttl(tokenKey)

    throw new RateLimitError({
      error: 'Rate limit exceeded',
      message: `Token rate limit exceeded. Try again in ${tokenTtl} seconds.`,
    })
  }

  await incrementRequestCount(tokenKey, weigth)
}

const rateLimiterMiddlewareFactory = (weight: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers['authorization']
      if (!token) {
        await rateLimiterMiddlewareForIp(req, res, weight)
      } else {
        await rateLimiterMiddlewareForToken(req, res, weight)
      }
      next()
    } catch (error) {
      res.status(429).json(error)
    }
  }
}

export const rateLimiterMiddleware = rateLimiterMiddlewareFactory
