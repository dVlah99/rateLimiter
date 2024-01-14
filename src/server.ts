import express from 'express'
import dotenv from 'dotenv'
import { authMiddleware } from './utils/middleware/authMiddleware'
import { rateLimiterMiddlewareForToken, rateLimiterMiddlewareForIp } from './utils/middleware/rateLimiter'

dotenv.config()
const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3000

// Public route - Weight = 1
app.get('/public', rateLimiterMiddlewareForIp(1), async (req, res) => {
  return res.status(200).json({ message: 'Public' })
})

// Private route - Weight = 2
app.get('/private', authMiddleware, rateLimiterMiddlewareForToken(2), async (req, res) => {
  return res.status(200).json({ message: 'Private' })
})

// PrivateHeavy route - Weight = 5
app.get('/privateHeavy', authMiddleware, rateLimiterMiddlewareForToken(5), async (req, res) => {
  return res.status(200).json({ message: 'Private but it is heavy' })
})

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`)
})
