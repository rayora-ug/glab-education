import { createHmac, timingSafeEqual } from 'crypto'

const COOKIE_NAME = 'glab_admin_session'
const SESSION_LABEL = 'admin'

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured')
  return secret
}

// A single-admin site doesn't need per-user sessions stored anywhere — the
// cookie value is just an HMAC of a fixed label under a server-only secret,
// so any request presenting a value that recomputes to the same HMAC proves
// it was issued by this server after a correct password check, with no
// session store required (works fine on Netlify's stateless functions).
export function signAdminToken(): string {
  return createHmac('sha256', getSecret()).update(SESSION_LABEL).digest('hex')
}

export function isValidAdminToken(token: string | undefined | null): boolean {
  if (!token) return false
  const expected = signAdminToken()
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export { COOKIE_NAME }
