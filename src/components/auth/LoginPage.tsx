import { Boxes, ChevronRight, Cloud, Eye, EyeOff, RefreshCw, ShieldCheck, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../api'
import { STORE_NAME } from '../../constants'
import { notifyError, notifySuccess } from '../../utils/notifications'
import type { FormEvent } from 'react'
import type { Session } from '../../types'

type LoginPageProps = {
  onLogin: (session: Session) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoggingIn(true)

    try {
      const response = await api.login(username, password)
      notifySuccess('Connexion reussie.')
      onLogin({
        accessToken: response.access_token,
        tokenType: response.token_type,
        role: response.role,
        username,
      })
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Connexion impossible')
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
            <p className="eyebrow">{STORE_NAME}</p>
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
            <span className="password-field">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Voir le mot de passe'}
                title={showPassword ? 'Masquer' : 'Voir'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </span>
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
