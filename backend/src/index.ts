import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for the frontend
app.use('/api/*', cors())

// Simple password hashing using Web Crypto API (SHA-256 for MVP)
async function hashPassword(password: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

app.post('/api/auth/register', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400)
    }

    const hashedPassword = await hashPassword(password)
    const id = crypto.randomUUID()

    // Insert to DB
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)'
    ).bind(id, email, hashedPassword).run()

    return c.json({ message: 'User created' }, 201)
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Email already exists' }, 400)
    }
    return c.json({ error: 'Server error' }, 500)
  }
})

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) {
    return c.json({ error: 'Email and password required' }, 400)
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email).first<{ id: string, password_hash: string }>()

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const hashedPassword = await hashPassword(password)
  if (hashedPassword !== user.password_hash) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const secret = c.env.JWT_SECRET || 'fallback-secret-for-local-dev'
  const token = await sign({ id: user.id }, secret)

  return c.json({ token, userId: user.id })
})

// Protected Routes Middleware
app.use('/api/transactions/*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  console.log('[Auth Middleware] Path:', c.req.path, '| Method:', c.req.method)
  console.log('[Auth Middleware] AuthHeader:', authHeader)

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or Invalid Auth Header format' }, 401)
  }

  const token = authHeader.split(' ')[1]
  try {
    const secret = c.env.JWT_SECRET || 'fallback-secret-for-local-dev'
    const payload = await verify(token, secret, 'HS256')
    c.set('userId', payload.id)
    await next()
  } catch (e: any) {
    console.log('[Auth Middleware] JWT Verify Error:', e.message || e)
    return c.json({ error: `Unauthorized: Token Verification Failed (${e.message || 'Unknown'})` }, 401)
  }
})

app.get('/api/transactions', async (c) => {
  const userId = c.get('userId' as any)
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()

  // Calculate balance
  const balance = results.reduce((acc: number, tx: any) => {
    return acc + (tx.type === 'income' ? tx.amount : -tx.amount)
  }, 0)

  return c.json({ transactions: results, balance })
})

app.post('/api/transactions', async (c) => {
  const userId = c.get('userId' as any)
  const { amount, type, description } = await c.req.json()

  if (!amount || !type || !description) {
    return c.json({ error: 'Missing fields' }, 400)
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO transactions (id, user_id, amount, type, description) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, userId, Number(amount), type, description).run()

  return c.json({ message: 'Transaction created', id }, 201)
})

export default app
