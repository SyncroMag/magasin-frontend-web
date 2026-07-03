import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardCheck,
  FolderTree,
  Handshake,
  ImageUp,
  Layers3,
  LogOut,
  PackageSearch,
  ReceiptText,
  Send,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { roleDetails, STORE_NAME } from '../../constants'
import type { Session } from '../../types'

export type DashboardView =
  | 'overview'
  | 'stock-types'
  | 'stock-categories'
  | 'stock'
  | 'stock-arrivals'
  | 'stock-states'
  | 'partners'
  | 'invoice-uploads'
  | 'sales-list'
  | 'sales-create'
  | 'sales-transfer'
  | 'accounting-cash'
  | 'accounting-vault'
  | 'accounting-expenses'
  | 'accounting-inventory'
  | 'inventory'
  | 'admin-notifications'
  | 'admin-tools'
  | 'admin-personnel'
  | 'approvals'
  | 'users'

type SidebarProps = {
  session: Session
  activeView: DashboardView
  canManageUsers: boolean
  canReviewApprovals: boolean
  unreadNotificationCount: number
  pendingApprovalCount: number
  isOpen: boolean
  onClose: () => void
  onViewChange: (view: DashboardView) => void
  onLogout: () => void
}

export function Sidebar({
  session,
  activeView,
  canManageUsers,
  canReviewApprovals,
  unreadNotificationCount,
  pendingApprovalCount,
  isOpen,
  onClose,
  onViewChange,
  onLogout,
}: SidebarProps) {
  const [articleOpen, setArticleOpen] = useState(activeView.startsWith('stock'))
  const [salesOpen, setSalesOpen] = useState(activeView.startsWith('sales'))
  const [accountingOpen, setAccountingOpen] = useState(activeView.startsWith('accounting'))
  const [adminOpen, setAdminOpen] = useState(
    activeView === 'admin-notifications' ||
      activeView === 'admin-tools' ||
      activeView === 'admin-personnel' ||
      activeView === 'approvals',
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (activeView.startsWith('stock')) {
        setArticleOpen(true)
      }
      if (activeView.startsWith('sales')) {
        setSalesOpen(true)
      }
      if (activeView.startsWith('accounting')) {
        setAccountingOpen(true)
      }
      if (
        activeView === 'admin-notifications' ||
        activeView === 'admin-tools' ||
        activeView === 'admin-personnel' ||
        activeView === 'approvals'
      ) {
        setAdminOpen(true)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [activeView])

  function navClass(view: DashboardView) {
    return activeView === view ? 'active' : undefined
  }

  function articleClass() {
    return activeView.startsWith('stock') ? 'active' : undefined
  }

  function chooseView(view: DashboardView) {
    onViewChange(view)
    onClose()
  }

  function toggleArticleMenu() {
    setArticleOpen((current) => !current)
  }

  function toggleSalesMenu() {
    setSalesOpen((current) => !current)
  }

  function toggleAccountingMenu() {
    setAccountingOpen((current) => !current)
  }

  function adminClass() {
    return activeView === 'admin-notifications' ||
      activeView === 'admin-tools' ||
      activeView === 'admin-personnel' ||
      activeView === 'approvals'
      ? 'active'
      : undefined
  }

  function toggleAdminMenu() {
    setAdminOpen((current) => !current)
  }

  return (
    <aside className={isOpen ? 'sidebar open' : 'sidebar'}>
      <div className="app-title">
        <div className="brand-mark compact">
          <Boxes size={22} aria-hidden="true" />
        </div>
        <div>
          <strong>{STORE_NAME}</strong>
          <span>{roleDetails[session.role].label}</span>
        </div>
        <button className="sidebar-close" type="button" aria-label="Fermer le menu" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Modules">
        <button className={navClass('overview')} type="button" onClick={() => chooseView('overview')}>
          <BarChart3 size={18} aria-hidden="true" />
          Vue generale
        </button>
        <button
          className={articleClass()}
          type="button"
          onClick={toggleArticleMenu}
        >
          <PackageSearch size={18} aria-hidden="true" />
          Article
        </button>
        {articleOpen && (
          <div className="submenu">
            <button className={navClass('stock-types')} type="button" onClick={() => chooseView('stock-types')}>
              <Layers3 size={16} aria-hidden="true" />
              Type
            </button>
            <button
              className={navClass('stock-categories')}
              type="button"
              onClick={() => chooseView('stock-categories')}
            >
              <FolderTree size={16} aria-hidden="true" />
              Categorie
            </button>
            <button className={navClass('stock')} type="button" onClick={() => chooseView('stock')}>
              <Tags size={16} aria-hidden="true" />
              Stock
            </button>
            <button className={navClass('stock-arrivals')} type="button" onClick={() => chooseView('stock-arrivals')}>
              <PackageSearch size={16} aria-hidden="true" />
              Arrivage
            </button>
            <button className={navClass('stock-states')} type="button" onClick={() => chooseView('stock-states')}>
              <ClipboardCheck size={16} aria-hidden="true" />
              Etat produit
            </button>
          </div>
        )}
        {canManageUsers && (
          <button className={navClass('partners')} type="button" onClick={() => chooseView('partners')}>
            <Handshake size={18} aria-hidden="true" />
            Partenaire
          </button>
        )}
        {canManageUsers && (
          <button className={navClass('invoice-uploads')} type="button" onClick={() => chooseView('invoice-uploads')}>
            <ImageUp size={18} aria-hidden="true" />
            Factures
          </button>
        )}
        <button
          className={activeView.startsWith('sales') ? 'active' : undefined}
          type="button"
          onClick={toggleSalesMenu}
        >
          <ShoppingCart size={18} aria-hidden="true" />
          Ventes
        </button>
        {salesOpen && (
          <div className="submenu">
            <button className={navClass('sales-create')} type="button" onClick={() => chooseView('sales-create')}>
              <ShoppingCart size={16} aria-hidden="true" />
              Nouvelle vente
            </button>
            <button className={navClass('sales-list')} type="button" onClick={() => chooseView('sales-list')}>
              <ReceiptText size={16} aria-hidden="true" />
              Liste ventes
            </button>
            <button className={navClass('sales-transfer')} type="button" onClick={() => chooseView('sales-transfer')}>
              <Send size={16} aria-hidden="true" />
              Transfert
            </button>
          </div>
        )}
        {canManageUsers && (
          <button
            className={activeView.startsWith('accounting') ? 'active' : undefined}
            type="button"
            onClick={toggleAccountingMenu}
          >
            <Wallet size={18} aria-hidden="true" />
            Comptabilite
          </button>
        )}
        {canManageUsers && accountingOpen && (
          <div className="submenu">
            <button className={navClass('accounting-cash')} type="button" onClick={() => chooseView('accounting-cash')}>
              <Wallet size={16} aria-hidden="true" />
              Caisse
            </button>
            <button className={navClass('accounting-vault')} type="button" onClick={() => chooseView('accounting-vault')}>
              <Wallet size={16} aria-hidden="true" />
              Coffre
            </button>
            <button className={navClass('accounting-expenses')} type="button" onClick={() => chooseView('accounting-expenses')}>
              <ReceiptText size={16} aria-hidden="true" />
              Depense
            </button>
            <button className={navClass('accounting-inventory')} type="button" onClick={() => chooseView('accounting-inventory')}>
              <ClipboardCheck size={16} aria-hidden="true" />
              Bilan de Caisse
            </button>
          </div>
        )}
        {canManageUsers && (
          <button className={navClass('inventory')} type="button" onClick={() => chooseView('inventory')}>
            <ClipboardCheck size={18} aria-hidden="true" />
            Inventaire
          </button>
        )}
        {(canReviewApprovals || canManageUsers) && (
          <>
            <button className={adminClass()} type="button" onClick={toggleAdminMenu}>
              <ShieldCheck size={18} aria-hidden="true" />
              <span className="nav-item-label">
                Espace admin
                {pendingApprovalCount > 0 && <span className="notification-badge">{`${pendingApprovalCount}!`}</span>}
                {unreadNotificationCount > 0 && <span className="notification-badge">{unreadNotificationCount}</span>}
              </span>
            </button>
            {adminOpen && (
              <div className="submenu">
                {canReviewApprovals && (
                  <button
                    className={navClass('admin-notifications')}
                    type="button"
                    onClick={() => chooseView('admin-notifications')}
                  >
                    <Bell size={16} aria-hidden="true" />
                    <span className="nav-item-label">
                      Notifications
                      {unreadNotificationCount > 0 && <span className="notification-badge">{unreadNotificationCount}</span>}
                    </span>
                  </button>
                )}
                {canManageUsers && (
                  <button className={navClass('admin-tools')} type="button" onClick={() => chooseView('admin-tools')}>
                    <Wrench size={16} aria-hidden="true" />
                    Outils magasin
                  </button>
                )}
                {canManageUsers && (
                  <button className={navClass('admin-personnel')} type="button" onClick={() => chooseView('admin-personnel')}>
                    <Users size={16} aria-hidden="true" />
                    Personnel
                  </button>
                )}
                {canReviewApprovals && (
                  <button className={navClass('approvals')} type="button" onClick={() => chooseView('approvals')}>
                    <ClipboardCheck size={16} aria-hidden="true" />
                    <span className="nav-item-label">
                      Approbations
                      {pendingApprovalCount > 0 && <span className="notification-badge">{pendingApprovalCount}</span>}
                    </span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {canManageUsers && (
          <button className={navClass('users')} type="button" onClick={() => chooseView('users')}>
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
          Deconnecter
        </button>
      </div>
    </aside>
  )
}
