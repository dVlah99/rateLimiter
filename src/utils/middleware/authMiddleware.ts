import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    jwt.verify(token, process.env.SECRET as jwt.Secret)

    next()
  } catch (error) {
    return res.status(403).send({ message: 'Invalid token!' })
  }
}
