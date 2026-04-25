import { SESSION_KEY } from '../constants'
import type { Session } from '../types'

export function readSession(): Session | null {
  const value = localStorage.getItem(SESSION_KEY)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as Session
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
