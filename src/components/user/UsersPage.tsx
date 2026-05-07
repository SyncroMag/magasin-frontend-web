import { Eye, EyeOff, Pencil, Save, Trash2, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import type { FormEvent } from 'react'
import type { ReactNode } from 'react'
import type { Role, User, UserUpdate } from '../../types'

type UserForm = {
  username: string
  password: string
  role: Role
}

type UsersPageProps = {
  users: User[]
  userForm: UserForm
  canCreateAdmin: boolean
  canEditUsers: boolean
  onUserFormChange: (value: UserForm) => void
  onCreateUser: (event: FormEvent<HTMLFormElement>) => void
  onUpdateUser: (userId: number, data: UserUpdate) => void
  onDeleteUser: (userId: number) => void
}

export function UsersPage({
  users,
  userForm,
  canCreateAdmin,
  canEditUsers,
  onUserFormChange,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}: UsersPageProps) {
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [editForm, setEditForm] = useState<UserUpdate>({})
  const { pageItems: paginatedUsers, controls: userPagination } = usePaginatedItems(users)

  function openEditUser(user: User) {
    setEditingUser(user)
    setEditForm({
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      password: '',
    })
  }

  function submitEditUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingUser) return

    const payload = { ...editForm }
    if (!payload.password) {
      delete payload.password
    }

    onUpdateUser(editingUser.id, payload)
    setEditingUser(null)
    setEditForm({})
  }

  return (
    <article className="panel view-stack" id="users">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Comptes</p>
          <h2>Utilisateurs</h2>
        </div>
        <button className="primary-button compact-button" type="button" onClick={() => setAddModalOpen(true)}>
          <UserPlus size={18} aria-hidden="true" />
          Ajouter
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Role</th>
              <th>Statut</th>
              {canEditUsers && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user) => (
              <tr key={user.id}>
                <td data-label="Utilisateur">
                  <strong>{user.username}</strong>
                </td>
                <td data-label="Role">{user.role}</td>
                <td data-label="Statut">
                  <span className={user.is_active ? 'pill ok' : 'pill warn'}>
                    {user.is_active ? 'Actif' : 'Desactive'}
                  </span>
                </td>
                {canEditUsers && (
                  <td data-label="Actions">
                    <div className="icon-actions">
                      <button
                        type="button"
                        className="icon-button"
                        title="Modifier"
                        aria-label="Modifier"
                        onClick={() => openEditUser(user)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-button danger-icon"
                        title="Supprimer"
                        aria-label="Supprimer"
                        onClick={() => onDeleteUser(user.id)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={canEditUsers ? 4 : 3} className="empty-cell">
                  Aucun utilisateur a afficher.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls {...userPagination} />

      {isAddModalOpen && (
        <Modal title="Ajouter un utilisateur" onClose={() => setAddModalOpen(false)}>
          <form
            className="modal-form"
            onSubmit={(event) => {
              onCreateUser(event)
              setAddModalOpen(false)
            }}
          >
            <label>
              Nom utilisateur
              <input
                value={userForm.username}
                onChange={(event) => onUserFormChange({ ...userForm, username: event.target.value })}
                required
              />
            </label>
            <PasswordInput
              label="Mot de passe"
              value={userForm.password}
              show={showAddPassword}
              required
              onToggle={() => setShowAddPassword((value) => !value)}
              onChange={(value) => onUserFormChange({ ...userForm, password: value })}
            />
            <label>
              Role
              <select
                value={userForm.role}
                onChange={(event) => onUserFormChange({ ...userForm, role: event.target.value as Role })}
              >
                <option value="VENDEUR">VENDEUR</option>
                <option value="ADMIN" disabled={!canCreateAdmin}>
                  ADMIN
                </option>
              </select>
            </label>
            <button className="primary-button" type="submit">
              <UserPlus size={18} aria-hidden="true" />
              Creer
            </button>
          </form>
        </Modal>
      )}

      {editingUser && (
        <Modal
          title={`Modifier ${editingUser.username}`}
          onClose={() => {
            setEditingUser(null)
            setEditForm({})
          }}
        >
          <form className="modal-form" onSubmit={submitEditUser}>
            <label>
              Nom utilisateur
              <input
                value={editForm.username ?? ''}
                onChange={(event) => setEditForm((current) => ({ ...current, username: event.target.value }))}
                required
              />
            </label>
            <PasswordInput
              label="Nouveau mot de passe"
              value={editForm.password ?? ''}
              show={showEditPassword}
              onToggle={() => setShowEditPassword((value) => !value)}
              onChange={(value) => setEditForm((current) => ({ ...current, password: value }))}
            />
            <label>
              Role
              <select
                value={editForm.role ?? 'VENDEUR'}
                onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value as Role }))}
              >
                <option value="VENDEUR">VENDEUR</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={Boolean(editForm.is_active)}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, is_active: event.target.checked }))
                }
              />
              Compte actif
            </label>
            <button className="primary-button" type="submit">
              <Save size={18} aria-hidden="true" />
              Enregistrer
            </button>
          </form>
        </Modal>
      )}
    </article>
  )
}

function PasswordInput({
  label,
  value,
  show,
  required,
  onToggle,
  onChange,
}: {
  label: string
  value: string
  show: boolean
  required?: boolean
  onToggle: () => void
  onChange: (value: string) => void
}) {
  return (
    <label>
      {label}
      <span className="password-field">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
        <button type="button" aria-label={show ? 'Masquer le mot de passe' : 'Voir le mot de passe'} onClick={onToggle}>
          {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </span>
    </label>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  )
}
