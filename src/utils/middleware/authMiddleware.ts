import { Request, Response, NextFunction } from 'express'

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const isValidToken = true
  if (!isValidToken) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  next()
}
