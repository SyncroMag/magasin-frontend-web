import { SESSION_KEY } from '../constants'
import type { Session } from '../types'

export function readSession(): Session | null {
  const value = localStorage.getItem(SESSION_KEY)

  if (!value) {
    return null
  }

  try {
    const session = JSON.parse(value) as Session
    if (isSessionExpired(session)) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }

    return session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function isSessionExpired(session: Session) {
  return Boolean(session.expiresAt && session.expiresAt <= Date.now())
}

export function tokenExpiresAt(accessToken: string) {
  try {
    const [, payload] = accessToken.split('.')
    if (!payload) return null

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const normalized = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const decoded = JSON.parse(window.atob(normalized)) as { exp?: number }

    return decoded.exp ? decoded.exp * 1000 : null
  } catch {
    return null
  }
}
