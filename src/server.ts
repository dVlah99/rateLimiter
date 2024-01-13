import express from 'express'
import dotenv from 'dotenv'
import { authMiddleware } from './utils/middleware/authMiddleware'
import { rateLimiterMiddlewareForIp, rateLimiterMiddlewareForToken } from './utils/middleware/rateLimiter'

dotenv.config()
const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3000

// Public route
app.get('/public', rateLimiterMiddlewareForIp, async (req, res) => {
  return res.status(200).json({ message: 'Public' })
})

// Private route - First check if the token is valid, then it check how many requests were made
app.get('/private', authMiddleware, rateLimiterMiddlewareForToken, async (req, res) => {
  return res.status(200).json({ message: 'Private' })
})

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`)
})
