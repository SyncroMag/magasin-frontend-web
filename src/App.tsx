import './App.css'
import { clearSession, readSession, saveSession } from './auth/session'
import { Dashboard } from './components/Dashboard'
import { LoginPage } from './components/LoginPage'
import { useState } from 'react'
import type { Session } from './types'

function App() {
  const [session, setSession] = useState<Session | null>(() => readSession())

  function handleLogin(nextSession: Session) {
    saveSession(nextSession)
    setSession(nextSession)
    window.history.replaceState(null, '', '/dashboard')
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    window.history.replaceState(null, '', '/')
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <Dashboard session={session} onLogout={handleLogout} />
}

export default App
