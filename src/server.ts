import express from 'express'
import { authMiddleware } from './utils/middleware/authMiddleware'
import dotenv from 'dotenv'
import { rateLimiterMiddleware } from './utils/rateLimiter'

dotenv.config()
const app = express()
app.use(express.json())

const PORT = process.env.PORT

// Public route
app.get('/public', rateLimiterMiddleware, async (req, res) => {
  return res.status(200).json({ message: 'Public' })
})

// Private route
app.get('/private', rateLimiterMiddleware, authMiddleware, async (req, res) => {
  return res.status(200).json({ message: 'Private' })
})

app.listen(PORT, () => {
  console.log(`Server running on port localhost:${PORT}`)
})
