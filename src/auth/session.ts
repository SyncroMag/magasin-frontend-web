import { SESSION_KEY } from '../constants'
import type { Session } from '../types'

let memorySession: Session | null = null

function getStoredValue() {
  try {
    return localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
  } catch {
    try {
      return sessionStorage.getItem(SESSION_KEY)
    } catch {
      return null
    }
  }
}

function removeStoredValue() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage may be blocked by the browser on some client PCs.
  }

  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage may be blocked by the browser on some client PCs.
  }
}

export function readSession(): Session | null {
  if (memorySession && !isSessionExpired(memorySession)) {
    return memorySession
  }

  const value = getStoredValue()

  if (!value) {
    return null
  }

  try {
    const session = JSON.parse(value) as Session
    if (isSessionExpired(session)) {
      memorySession = null
      removeStoredValue()
      return null
    }

    memorySession = session
    return session
  } catch {
    memorySession = null
    removeStoredValue()
    return null
  }
}

export function saveSession(session: Session) {
  memorySession = session
  const value = JSON.stringify(session)

  try {
    localStorage.setItem(SESSION_KEY, value)
    return
  } catch {
    // Fall back below.
  }

  try {
    sessionStorage.setItem(SESSION_KEY, value)
  } catch {
    // The in-memory session still lets the user enter the app.
  }
}

export function clearSession() {
  memorySession = null
  removeStoredValue()
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
