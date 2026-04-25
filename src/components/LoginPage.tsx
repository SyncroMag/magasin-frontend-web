import { Boxes, ChevronRight, Cloud, RefreshCw, ShieldCheck, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api'
import type { FormEvent } from 'react'
import type { Session } from '../types'

type LoginPageProps = {
  onLogin: (session: Session) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')

    try {
      const response = await api.login(username, password)
      onLogin({
        accessToken: response.access_token,
        tokenType: response.token_type,
        role: response.role,
        username,
      })
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell login-shell-simple">
        <div className="brand-panel">
          <div>
            <div className="brand-mark">
              <Boxes size={28} aria-hidden="true" />
            </div>
            <p className="eyebrow">GestionMagasin</p>
            <h1>Connexion magasin</h1>
            <p className="lead">Connectez-vous pour commencer.</p>
          </div>

          <div className="login-feature-list" aria-label="Details application">
            <div className="login-feature">
              <Boxes size={18} aria-hidden="true" />
              <span>Stock, seuils et produits</span>
            </div>
            <div className="login-feature">
              <ShoppingCart size={18} aria-hidden="true" />
              <span>Ventes et tickets rapides</span>
            </div>
            <div className="login-feature">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>Roles et validations sensibles</span>
            </div>
            <div className="login-feature">
              <Cloud size={18} aria-hidden="true" />
              <span>Synchronisation local et cloud</span>
            </div>
          </div>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div>
            <h2>Se connecter</h2>
          </div>

          {loginError && <div className="message error">{loginError}</div>}

          <label>
            Nom utilisateur
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Mot de passe
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className="primary-button" disabled={isLoggingIn} type="submit">
            {isLoggingIn ? (
              <RefreshCw size={18} aria-hidden="true" />
            ) : (
              <ChevronRight size={18} aria-hidden="true" />
            )}
            Entrer
          </button>
        </form>
      </section>
    </main>
  )
}
