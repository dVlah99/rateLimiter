import express from 'express'
import { authMiddleware } from './utils/middleware/authMiddleware'

const app = express()
app.use(express.json())

// Public route
app.get('/public', async (req, res) => {
  return res.status(200).json({ message: 'Public' })
})

// Private route
app.get('/private', authMiddleware, async (req, res) => {
  return res.status(200).json({ message: 'Private' })
})

app.listen(2000, () => {
  console.log(`Server running on port localhost:${2000}`)
})
