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

const requestLimitValidation = async (key: string, limit: number): Promise<boolean> => {
  const keyExists = await redis.exists(key)

  if (!keyExists) {
    await redis.set(key, 0)
    const expirationTime = Number(process.env.EXPIRATION_TIME_IN_SECONDS) || 3600
    await redis.expire(key, expirationTime)

    return true
  } else {
    return await checkLimit(key, limit)
  }
}

const handleRateLimitExceeded = async (key: string) => {
  const ttl = await redis.ttl(key)
  const errorMessage = `Rate limit exceeded. Try again in ${ttl} seconds.`

  throw new RateLimitError({ error: 'Rate limit exceeded', message: errorMessage })
}

const ipLimiter = async (req: Request, weight: number) => {
  const { ip } = req
  const ipKey = `ip:${ip}`
  const ipLimit = Number(process.env.IP_LIMIT) || 100

  const canMakeRequest = await requestLimitValidation(ipKey, ipLimit)

  if (!canMakeRequest) {
    await handleRateLimitExceeded(ipKey)
  }

  await incrementRequestCount(ipKey, weight)
}

const tokenLimiter = async (req: Request, weight: number) => {
  const token = req.headers['authorization']
  const tokenKey = `token:${token}`
  const tokenLimit = Number(process.env.TOKEN_LIMIT) || 200

  const canMakeRequest = await requestLimitValidation(tokenKey, tokenLimit)

  if (!canMakeRequest) {
    await handleRateLimitExceeded(tokenKey)
  }

  await incrementRequestCount(tokenKey, weight)
}

const rateLimiterMiddlewareForIpFactory = (weight: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ipLimiter(req, weight)
      next()
    } catch (error) {
      res.status(429).json(error)
    }
  }
}

const rateLimiterMiddlewareForTokenFactory = (weight: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await tokenLimiter(req, weight)
      next()
    } catch (error) {
      res.status(429).json(error)
    }
  }
}

export const rateLimiterMiddlewareForToken = rateLimiterMiddlewareForTokenFactory

export const rateLimiterMiddlewareForIp = rateLimiterMiddlewareForIpFactory
