import { UserPlus } from 'lucide-react'
import type { FormEvent } from 'react'
import type { Role, User } from '../../types'

type UserForm = {
  username: string
  password: string
  role: Role
}

type UsersPageProps = {
  users: User[]
  userForm: UserForm
  canCreateAdmin: boolean
  onUserFormChange: (value: UserForm) => void
  onCreateUser: (event: FormEvent<HTMLFormElement>) => void
}

export function UsersPage({
  users,
  userForm,
  canCreateAdmin,
  onUserFormChange,
  onCreateUser,
}: UsersPageProps) {
  return (
    <article className="panel view-stack" id="users">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Comptes</p>
          <h2>Utilisateurs</h2>
        </div>
        <UserPlus size={20} aria-hidden="true" />
      </div>
      <form className="user-form" onSubmit={onCreateUser}>
        <input
          placeholder="Nom utilisateur"
          value={userForm.username}
          onChange={(event) => onUserFormChange({ ...userForm, username: event.target.value })}
          required
        />
        <input
          placeholder="Mot de passe"
          type="password"
          value={userForm.password}
          onChange={(event) => onUserFormChange({ ...userForm, password: event.target.value })}
          required
        />
        <select
          value={userForm.role}
          onChange={(event) => onUserFormChange({ ...userForm, role: event.target.value as Role })}
        >
          <option value="VENDEUR">VENDEUR</option>
          <option value="ADMIN" disabled={!canCreateAdmin}>
            ADMIN
          </option>
        </select>
        <button className="primary-button" type="submit">
          <UserPlus size={18} aria-hidden="true" />
          Creer
        </button>
      </form>
      <div className="user-grid">
        {users.map((user) => (
          <div className="user-chip" key={user.id}>
            <strong>{user.username}</strong>
            <span>{user.role}</span>
            <em>{user.is_active ? 'Actif' : 'Desactive'}</em>
          </div>
        ))}
      </div>
    </article>
  )
}
