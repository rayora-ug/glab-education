import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isValidAdminToken, COOKIE_NAME } from './adminAuth'

// Every /api/admin/* route calls this first. Returns a 401 response to
// return immediately if the request isn't from a logged-in admin, or null
// if it's fine to proceed — callers do `const denied = await requireAdmin(); if (denied) return denied`.
export async function requireAdmin(): Promise<NextResponse | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!isValidAdminToken(token)) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
  }
  return null
}

// Calls the GLAB Apps Script backend with an admin action. Admin-ness was
// already verified by requireAdmin() before this is ever called — Code.gs
// itself only checks the same shared token every other action uses, since
// gatekeeping admin access is this Next.js layer's job, not the script's.
export async function callAdminAction(action: string, payload: Record<string, unknown> = {}) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return { success: false, error: 'The admin panel is not configured yet.' }
  }
  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ action, token, ...payload }),
  })
  return res.json()
}
