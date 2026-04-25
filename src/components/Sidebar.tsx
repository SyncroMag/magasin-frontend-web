import { BarChart3, Boxes, ClipboardCheck, LogOut, ShoppingCart, Users } from 'lucide-react'
import { roleDetails } from '../constants'
import type { Session } from '../types'

export type DashboardView = 'overview' | 'stock' | 'sales' | 'approvals' | 'users'

type SidebarProps = {
  session: Session
  activeView: DashboardView
  canManageUsers: boolean
  canReviewApprovals: boolean
  onViewChange: (view: DashboardView) => void
  onLogout: () => void
}

export function Sidebar({
  session,
  activeView,
  canManageUsers,
  canReviewApprovals,
  onViewChange,
  onLogout,
}: SidebarProps) {
  function navClass(view: DashboardView) {
    return activeView === view ? 'active' : undefined
  }

  return (
    <aside className="sidebar">
      <div className="app-title">
        <div className="brand-mark compact">
          <Boxes size={22} aria-hidden="true" />
        </div>
        <div>
          <strong>GestionMagasin</strong>
          <span>{roleDetails[session.role].label}</span>
        </div>
      </div>

      <nav aria-label="Modules">
        <button className={navClass('overview')} type="button" onClick={() => onViewChange('overview')}>
          <BarChart3 size={18} aria-hidden="true" />
          Vue generale
        </button>
        <button className={navClass('stock')} type="button" onClick={() => onViewChange('stock')}>
          <Boxes size={18} aria-hidden="true" />
          Stock
        </button>
        <button className={navClass('sales')} type="button" onClick={() => onViewChange('sales')}>
          <ShoppingCart size={18} aria-hidden="true" />
          Ventes
        </button>
        {canReviewApprovals && (
          <button className={navClass('approvals')} type="button" onClick={() => onViewChange('approvals')}>
            <ClipboardCheck size={18} aria-hidden="true" />
            Approbations
          </button>
        )}
        {canManageUsers && (
          <button className={navClass('users')} type="button" onClick={() => onViewChange('users')}>
            <Users size={18} aria-hidden="true" />
            Utilisateurs
          </button>
        )}
      </nav>

      <div className="session-box">
        <span>{session.username}</span>
        <strong>{session.role}</strong>
        <button type="button" onClick={onLogout}>
          <LogOut size={16} aria-hidden="true" />
          Déconnecter
        </button>
      </div>
    </aside>
  )
}
