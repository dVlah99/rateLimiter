import { Request, Response, NextFunction } from 'express'
import redis from './redis'
import { RateLimitError } from '../entities/rateLimitError'

//const tokenLimit = (process.env.TOKEN_LIMIT as unknown as number) || 200
const hourInSeconds = 30

export const rateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  //const { ip, userToken } = req
  const { ip } = req

  //const tokenKey = `token:${'TEST'}`
  const ipLimit = (process.env.IP_LIMIT as unknown as number) || 100

  const ipKey = `ip:${ip}`
  const ipCounter = await numberOfCalls(ipKey)
  const validNumberOfCalls = await checkCounter(ipCounter, ipLimit)

  if (!validNumberOfCalls) {
    const ipTtl = await redis.ttl(ipKey)
    return res.status(429).json(
      new RateLimitError({
        error: 'Rate limit exceeded',
        message: `IP rate limit exceeded. Try again in ${ipTtl} seconds.`,
      }),
    )
  }

  const incrementedCount = await redis.incr(ipKey)
  incrementedCount >= ipLimit ? redis.expire(ipKey, hourInSeconds) : false

  //const [tokenCount, ipCount] = await Promise.all([redis.incr(tokenKey), redis.incr(ipKey)])
  //const [ipCount, isNewKey] = await Promise.all([redis.incr(ipKey), redis.expire(ipKey, hourInSeconds)])
  //const tokenTtl = await redis.ttl(tokenKey)

  /*   if (tokenCount > tokenLimit) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Token rate limit exceeded. Try again in ${tokenTtl} seconds.`,
    })
  } */

  next()
}

const checkCounter = async (ipCounter: number, ipLimit: number): Promise<boolean> => {
  if ((ipCounter as number) >= (ipLimit as number)) {
    return false
  }
  return true
}

const numberOfCalls = async (ipKey: string): Promise<number> => {
  const ipCnt = await redis.get(ipKey)
  if (!ipCnt) {
    return 0
  } else {
    return parseInt(ipCnt, 10)
  }
}
