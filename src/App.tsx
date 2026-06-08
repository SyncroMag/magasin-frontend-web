import './App.css'
import { clearSession, readSession, saveSession, tokenExpiresAt } from './auth/session'
import { Dashboard } from './components/dashboard/Dashboard'
import { LoginPage } from './components/auth/LoginPage'
import { useEffect } from 'react'
import { defaultDashboardPath } from './utils/routes'
import { useState } from 'react'
import type { Session } from './types'

function App() {
  const [session, setSession] = useState<Session | null>(() => readSession())

  function handleLogin(nextSession: Session) {
    const sessionWithExpiry = {
      ...nextSession,
      expiresAt: tokenExpiresAt(nextSession.accessToken) ?? Date.now() + 60 * 60 * 1000,
    }

    saveSession(sessionWithExpiry)
    setSession(sessionWithExpiry)
    window.history.replaceState(null, '', defaultDashboardPath)
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    window.history.replaceState(null, '', '/')
  }

  useEffect(() => {
    window.addEventListener('auth-expired', handleLogout)
    return () => window.removeEventListener('auth-expired', handleLogout)
  }, [])

  if (!session) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <Dashboard session={session} onLogout={handleLogout} />
}

export default App
