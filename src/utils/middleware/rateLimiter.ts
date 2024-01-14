import { Request, Response, NextFunction } from 'express'
import redis from '../redis'
import { RateLimitError } from '../../entities/rateLimitError'

const checkLimit = async (key: string, limit: number): Promise<boolean> => {
  const requestCount = await redis.get(key)
  const requestCountFormatted = requestCount ? parseInt(requestCount, 10) : 0
  return requestCountFormatted < limit
}

const incrementRequestCount = async (key: string, weight: number) => {
  await redis.incrby(key, weight)
}

const checkIfKeyExistAndSetExpirationTime = async (key: string) => {
  const keyExists = await redis.exists(key)

  if (!keyExists) {
    await redis.set(key, 0)
    const expirationTime = Number(process.env.EXPIRATION_TIME_IN_SECONDS) || 3600
    await redis.expire(key, expirationTime)
  }
}

const handleRateLimitExceeded = async (res: Response, key: string, ttl: number) => {
  const errorMessage = `Rate limit exceeded. Try again in ${ttl} seconds.`
  res.status(429).json(new RateLimitError({ error: 'Rate limit exceeded', message: errorMessage }))
}

export const rateLimiterMiddlewareForIp = async (req: Request, res: Response, weight: number) => {
  const { ip } = req
  const ipKey = `ip:${ip}`

  await checkIfKeyExistAndSetExpirationTime(ipKey)

  const ipLimit = Number(process.env.IP_LIMIT) || 100
  const canMakeRequest = await checkLimit(ipKey, ipLimit)

  if (!canMakeRequest) {
    const ipTtl = await redis.ttl(ipKey)
    await handleRateLimitExceeded(res, ipKey, ipTtl)
  }

  await incrementRequestCount(ipKey, weight)
}

export const rateLimiterMiddlewareForToken = async (req: Request, res: Response, weight: number, token: string) => {
  const tokenKey = `token:${token}`

  await checkIfKeyExistAndSetExpirationTime(tokenKey)

  const tokenLimit = Number(process.env.TOKEN_LIMIT) || 200
  const canMakeRequest = await checkLimit(tokenKey, tokenLimit)

  if (!canMakeRequest) {
    const tokenTtl = await redis.ttl(tokenKey)
    await handleRateLimitExceeded(res, tokenKey, tokenTtl)
  }

  await incrementRequestCount(tokenKey, weight)
}

const rateLimiterMiddlewareFactory = (weight: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers['authorization']
      if (!token) {
        await rateLimiterMiddlewareForIp(req, res, weight)
      } else {
        await rateLimiterMiddlewareForToken(req, res, weight, token)
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

export const rateLimiterMiddleware = rateLimiterMiddlewareFactory
