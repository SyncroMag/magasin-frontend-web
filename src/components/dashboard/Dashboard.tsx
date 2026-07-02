import { Boxes, Menu, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api'
import { emptyProduct, STORE_NAME } from '../../constants'
import { dateSearchValues } from '../../utils/format'
import { confirmAction, importantAlert, notifyError, notifySuccess } from '../../utils/notifications'
import { pathForView, viewFromPath } from '../../utils/routes'
import { AccountingPage } from '../accounting/AccountingPage'
import { AdminNotificationsPage } from '../admin/AdminNotificationsPage'
import { OutilsPage } from '../admin/OutilsPage'
import { PersonnelPage } from '../admin/PersonnelPage'
import { ApprovalsPage } from '../approvals/ApprovalsPage'
import type { ApprovalFilter } from '../approvals/ApprovalsPage'
import { InvoiceUploadsPage } from '../invoices/InvoiceUploadsPage'
import { Sidebar } from '../layout/Sidebar'
import { OverviewPage } from '../overview/OverviewPage'
import { PartnersPage } from '../partners/PartnersPage'
import { SalesPage } from '../sales/SalesPage'
import { StockPage } from '../stock/StockPage'
import { UsersPage } from '../user/UsersPage'
import type { DashboardView } from '../layout/Sidebar'
import type { FormEvent } from 'react'
import type {
  AccountingAccount,
  AccountingEntry,
  AccountingSummary,
  Approval,
  AdminNotification,
  AbsenceType,
  Employe,
  EmployeCreate,
  OutilMagasin,
  OutilMagasinCreate,
  Produit,
  ProduitCreate,
  Role,
  Session,
  TopProduit,
  TopProduitBenefice,
  Transfert,
  User,
  UserUpdate,
  Vente,
  VenteParJour,
} from '../../types'

type DashboardProps = {
  session: Session
  onLogout: () => void
}

const viewTitles: Record<DashboardView, { eyebrow: string; title: string }> = {
  overview: { eyebrow: 'Dashboard', title: 'Vue generale' },
  'stock-types': { eyebrow: 'Article', title: 'Types' },
  'stock-categories': { eyebrow: 'Article', title: 'Categories' },
  'stock-arrivals': { eyebrow: 'Article', title: 'Arrivage' },
  'stock-states': { eyebrow: 'Article', title: 'Etat produit' },
  stock: { eyebrow: 'Module', title: 'Stock' },
  partners: { eyebrow: 'Partenaire', title: 'Articles partenaire' },
  'invoice-uploads': { eyebrow: 'Factures', title: 'Upload factures' },
  'sales-list': { eyebrow: 'Ventes', title: 'Liste ventes' },
  'sales-create': { eyebrow: 'Caisse', title: 'Nouvelle vente' },
  'sales-transfer': { eyebrow: 'Ventes', title: 'Transfert' },
  'accounting-cash': { eyebrow: 'Comptabilite', title: 'Caisse' },
  'accounting-vault': { eyebrow: 'Comptabilite', title: 'Coffre' },
  'accounting-expenses': { eyebrow: 'Comptabilite', title: 'Depense' },
  'accounting-inventory': { eyebrow: 'Comptabilite', title: 'Inventaire' },
  'admin-notifications': { eyebrow: 'Espace admin', title: 'Notifications' },
  'admin-tools': { eyebrow: 'Espace admin', title: 'Outils magasin' },
  'admin-personnel': { eyebrow: 'Espace admin', title: 'Personnel' },
  approvals: { eyebrow: 'Controle', title: 'Approbations' },
  users: { eyebrow: 'Administration', title: 'Utilisateurs' },
}

function playApprovalNotificationSound() {
  try {
    const context = new window.AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.value = 0.06
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.18)
  } catch {
    // ignore
  }
}

export function Dashboard({ session, onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState<DashboardView>(() => viewFromPath(window.location.pathname))
  const [produits, setProduits] = useState<Produit[]>([])
  const [ventes, setVentes] = useState<Vente[]>([])
  const [transferts, setTransferts] = useState<Transfert[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([])
  const [accountingSummary, setAccountingSummary] = useState<AccountingSummary | null>(null)
  const [accountingEntries, setAccountingEntries] = useState<AccountingEntry[]>([])
  const [outils, setOutils] = useState<OutilMagasin[]>([])
  const [employes, setEmployes] = useState<Employe[]>([])
  const [topProduits, setTopProduits] = useState<TopProduit[]>([])
  const [topProduitsBenefice, setTopProduitsBenefice] = useState<TopProduitBenefice[]>([])
  const [ventesParJour, setVentesParJour] = useState<VenteParJour[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [productForm, setProductForm] = useState<ProduitCreate>(emptyProduct)
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'VENDEUR' as Role })
  const [reviewComments, setReviewComments] = useState<Record<number, string>>({})
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('PENDING')
  const [stockTypeFilter, setStockTypeFilter] = useState('')
  const [stockCategoryFilter, setStockCategoryFilter] = useState('')
  const [personnelMonth, setPersonnelMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const previousPendingApprovalCount = useRef(0)

  const canManageStock = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'
  const canManageUsers = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'
  const canCreateAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'
  const canReviewApprovals = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'
  const canProcessApprovals = session.role === 'ADMIN'
  const canViewFinancialStats = session.role !== 'VENDEUR'
  const canAccessTransfers = session.role === 'VENDEUR' || session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'

  const lowStockProducts = useMemo(
    () => produits.filter((produit) => produit.quantite <= produit.seuil_alerte),
    [produits],
  )
  const unreadNotificationCount = useMemo(
    () => adminNotifications.filter((notification) => !notification.is_read).length,
    [adminNotifications],
  )
  const pendingApprovalCount = pendingApprovalsCount

  const filteredProducts = useMemo(() => {
    const value = query.trim().toLowerCase()

    return produits
      .filter((produit) =>
        (!stockTypeFilter || produit.type === stockTypeFilter) &&
        (!stockCategoryFilter || produit.categorie === stockCategoryFilter) &&
        (!value ||
          [
            produit.nom,
            produit.type,
            produit.categorie,
            produit.partner_name ?? '',
            ...dateSearchValues(produit.created_at),
            ...dateSearchValues(produit.updated_at),
          ].some((field) =>
            field.toLowerCase().includes(value),
          )),
      )
      .sort((a, b) => Number(a.is_partner) - Number(b.is_partner))
  }, [produits, query, stockCategoryFilter, stockTypeFilter])

  async function loadDashboard() {
    setIsLoading(true)

    try {
      const token = session.accessToken
      const [
        productsResult,
        salesResult,
        topProductsResult,
        topProfitProductsResult,
        dailySalesResult,
        transfersResult,
        approvalsResult,
        pendingApprovalsResult,
        notificationsResult,
        accountingSummaryResult,
        accountingEntriesResult,
        toolsResult,
        employeesResult,
        usersResult,
      ] = await Promise.allSettled([
        api.produits(token),
        api.ventes(token),
        api.topProduits(token),
        canViewFinancialStats ? api.topProduitsBenefice(token) : Promise.resolve([]),
        canViewFinancialStats ? api.ventesParJour(token) : Promise.resolve([]),
        canAccessTransfers ? api.transferts(token) : Promise.resolve([]),
        canReviewApprovals
          ? api.approvals(token, approvalFilter === 'ALL' ? { include_all: true } : { status: approvalFilter })
          : Promise.resolve([]),
        canReviewApprovals ? api.approvals(token, { status: 'PENDING' }) : Promise.resolve([]),
        canReviewApprovals ? api.adminNotifications(token) : Promise.resolve([]),
        canManageUsers ? api.accountingSummary(token) : Promise.resolve(null),
        canManageUsers ? api.accountingEntries(token) : Promise.resolve([]),
        canManageUsers ? api.outils(token) : Promise.resolve([]),
        canManageUsers ? api.employes(token, personnelMonth) : Promise.resolve([]),
        canManageUsers ? api.users(token) : Promise.resolve([]),
      ])

      if (productsResult.status === 'fulfilled') setProduits(productsResult.value)
      if (salesResult.status === 'fulfilled') setVentes(salesResult.value)
      if (topProductsResult.status === 'fulfilled') setTopProduits(topProductsResult.value)
      if (topProfitProductsResult.status === 'fulfilled') setTopProduitsBenefice(topProfitProductsResult.value)
      if (dailySalesResult.status === 'fulfilled') setVentesParJour(dailySalesResult.value)
      if (transfersResult.status === 'fulfilled') setTransferts(transfersResult.value)
      if (approvalsResult.status === 'fulfilled') setApprovals(approvalsResult.value)
      if (pendingApprovalsResult.status === 'fulfilled') {
        setPendingApprovalsCount(pendingApprovalsResult.value.length)
        previousPendingApprovalCount.current = pendingApprovalsResult.value.length
      }
      if (notificationsResult.status === 'fulfilled') setAdminNotifications(notificationsResult.value)
      if (accountingSummaryResult.status === 'fulfilled') setAccountingSummary(accountingSummaryResult.value)
      if (accountingEntriesResult.status === 'fulfilled') setAccountingEntries(accountingEntriesResult.value)
      if (toolsResult.status === 'fulfilled') setOutils(toolsResult.value)
      if (employeesResult.status === 'fulfilled') setEmployes(employeesResult.value)
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value)

      const rejected = [
        productsResult,
        salesResult,
        topProductsResult,
        topProfitProductsResult,
        dailySalesResult,
        transfersResult,
        approvalsResult,
        pendingApprovalsResult,
        notificationsResult,
        accountingSummaryResult,
        accountingEntriesResult,
        toolsResult,
        employeesResult,
        usersResult,
      ].find((result) => result.status === 'rejected')

      if (rejected?.status === 'rejected') {
        showError(rejected.reason instanceof Error ? rejected.reason.message : 'Chargement incomplet')
      }
    } finally {
      setIsLoading(false)
    }
  }

  function resetMenuInputs() {
    setQuery('')
    setProductForm(emptyProduct)
    setStockTypeFilter('')
    setStockCategoryFilter('')
    setUserForm({ username: '', password: '', role: 'VENDEUR' })
    setReviewComments({})
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken, approvalFilter])

  useEffect(() => {
    if (!canReviewApprovals) return

    const intervalId = window.setInterval(async () => {
      try {
        const token = session.accessToken
        const [nextApprovals, nextPendingApprovals, nextNotifications] = await Promise.all([
          api.approvals(token, approvalFilter === 'ALL' ? { include_all: true } : { status: approvalFilter }),
          api.approvals(token, { status: 'PENDING' }),
          api.adminNotifications(token),
        ])

        const nextPending = nextPendingApprovals.length
        if (nextPending > previousPendingApprovalCount.current) {
          playApprovalNotificationSound()
          notifySuccess('Nouvelle demande d approbation recue.')
        }
        previousPendingApprovalCount.current = nextPending
        setPendingApprovalsCount(nextPending)
        setApprovals(nextApprovals)
        setAdminNotifications(nextNotifications)
      } catch {
        // poll silencieux
      }
    }, 15000)

    return () => window.clearInterval(intervalId)
  }, [approvalFilter, canReviewApprovals, session.accessToken])

  useEffect(() => {
    if (window.location.pathname === '/dashboard' || window.location.pathname === '/gestion') {
      window.history.replaceState(null, '', pathForView(activeView))
    } else if (window.location.pathname !== pathForView(activeView)) {
      window.history.replaceState(null, '', pathForView(activeView))
    }

    function handlePopState() {
      const nextView = viewFromPath(window.location.pathname)
      resetMenuInputs()
      setActiveView(nextView)
      void loadDashboard()
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (
      ((activeView === 'approvals' || activeView === 'admin-notifications') && !canReviewApprovals) ||
      ((activeView === 'admin-tools' || activeView === 'admin-personnel') && !canManageUsers) ||
      (activeView.startsWith('accounting') && !canManageUsers) ||
      (activeView === 'partners' && !canManageUsers) ||
      (activeView === 'invoice-uploads' && !canManageUsers) ||
      (activeView === 'users' && !canManageUsers)
    ) {
      const timeoutId = window.setTimeout(() => {
        setActiveView('overview')
        window.history.replaceState(null, '', pathForView('overview'))
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [activeView, canManageUsers, canReviewApprovals])

  function changeView(view: DashboardView) {
    if (view === 'approvals' && !canReviewApprovals) return
    if (view === 'admin-notifications' && !canReviewApprovals) return
    if ((view === 'admin-tools' || view === 'admin-personnel') && !canManageUsers) return
    if (view.startsWith('accounting') && !canManageUsers) return
    if (view === 'partners' && !canManageUsers) return
    if (view === 'invoice-uploads' && !canManageUsers) return
    if (view === 'users' && !canManageUsers) return
    if (view === activeView) {
      setSidebarOpen(false)
      return
    }

    resetMenuInputs()
    setActiveView(view)
    setSidebarOpen(false)
    window.history.pushState(null, '', pathForView(view))
    void loadDashboard()
  }

  function showSuccess(message: string) {
    notifySuccess(message)
  }

  function showError(message: string) {
    notifyError(message)
  }

  function isApprovalResponse(value: unknown): value is { detail: string } {
    return Boolean(value && typeof value === 'object' && 'detail' in value)
  }

  async function showMutationResult(value: unknown, successMessage: string) {
    if (isApprovalResponse(value)) {
      await importantAlert('Demande d approbation', value.detail, 'info')
      return
    }

    showSuccess(successMessage)
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      const existingProduct = produits.find(
        (produit) =>
          produit.nom.trim().toLowerCase() === productForm.nom.trim().toLowerCase() &&
          produit.type.trim().toLowerCase() === productForm.type.trim().toLowerCase() &&
          produit.categorie.trim().toLowerCase() === productForm.categorie.trim().toLowerCase() &&
          Boolean(produit.is_partner) === Boolean(productForm.is_partner),
      )

      if (existingProduct) {
        const result = await api.updateProduit(session.accessToken, existingProduct.id, {
          ...productForm,
          quantite: existingProduct.quantite + Number(productForm.quantite),
        })
        await showMutationResult(result, 'Produit mis a jour.')
      } else {
        await api.createProduit(session.accessToken, productForm)
        showSuccess('Produit ajoute au stock.')
      }

      setProductForm(emptyProduct)
      await loadDashboard()
      return true
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Creation produit impossible')
      return false
    }
  }

  async function handleUpdateProduct(productId: number, data: Partial<ProduitCreate>) {
    try {
      const result = await api.updateProduit(session.accessToken, productId, data)
      await showMutationResult(result, 'Produit modifie.')
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Modification produit impossible')
    }
  }

  async function handleDeleteProduct(productId: number) {
    const confirmed = await confirmAction('Supprimer ce produit ?', 'Cette action retire le produit du stock actif.')
    if (!confirmed) return

    try {
      await api.deleteProduit(session.accessToken, productId)
      showSuccess('Produit supprime.')
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression produit impossible')
    }
  }

  async function handleToggleProductActive(productId: number, isActive: boolean) {
    try {
      const result = await api.setProduitActive(session.accessToken, productId, isActive)
      await showMutationResult(result, isActive ? 'Produit active.' : 'Produit desactive.')
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Changement statut produit impossible')
    }
  }

  async function handleRenameType(oldType: string, nextType: string) {
    const type = nextType.trim()
    if (!type || oldType === type) return

    try {
      const results = await Promise.all(
        produits
          .filter((produit) => produit.type === oldType)
          .map((produit) => api.updateProduit(session.accessToken, produit.id, { type })),
      )
      if (results.some(isApprovalResponse)) {
        await importantAlert('Demande d approbation', 'La modification du type attend une approbation.', 'info')
      } else {
        showSuccess('Type modifie.')
      }
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Modification type impossible')
    }
  }

  async function handleDeleteType(type: string) {
    const confirmed = await confirmAction('Supprimer ce type ?', 'Tous les produits de ce type seront retires du stock actif.')
    if (!confirmed) return

    try {
      await Promise.all(
        produits
          .filter((produit) => produit.type === type)
          .map((produit) => api.deleteProduit(session.accessToken, produit.id)),
      )
      showSuccess('Type supprime.')
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression type impossible')
    }
  }

  async function handleRenameCategory(oldCategory: string, nextCategory: string) {
    const categorie = nextCategory.trim()
    if (!categorie || oldCategory === categorie) return

    try {
      const results = await Promise.all(
        produits
          .filter((produit) => produit.categorie === oldCategory)
          .map((produit) => api.updateProduit(session.accessToken, produit.id, { categorie })),
      )
      if (results.some(isApprovalResponse)) {
        await importantAlert('Demande d approbation', 'La modification de categorie attend une approbation.', 'info')
      } else {
        showSuccess('Categorie modifiee.')
      }
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Modification categorie impossible')
    }
  }

  async function handleDeleteCategory(category: string) {
    const confirmed = await confirmAction(
      'Supprimer cette categorie ?',
      'Tous les produits de cette categorie seront retires du stock actif.',
    )
    if (!confirmed) return

    try {
      await Promise.all(
        produits
          .filter((produit) => produit.categorie === category)
          .map((produit) => api.deleteProduit(session.accessToken, produit.id)),
      )
      showSuccess('Categorie supprimee.')
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression categorie impossible')
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await api.createUser(session.accessToken, userForm)
      setUserForm({ username: '', password: '', role: 'VENDEUR' })
      showSuccess('Utilisateur cree.')
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Creation utilisateur impossible')
    }
  }

  async function handleUpdateUser(userId: number, data: UserUpdate) {
    try {
      await api.updateUser(session.accessToken, userId, data)
      showSuccess('Utilisateur modifie.')
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Modification utilisateur impossible')
    }
  }

  async function handleDeleteUser(userId: number) {
    const confirmed = await confirmAction('Supprimer cet utilisateur ?', 'Le compte sera desactive.')
    if (!confirmed) return

    try {
      await api.deleteUser(session.accessToken, userId)
      showSuccess('Utilisateur supprime.')
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression utilisateur impossible')
    }
  }

  async function handleReview(approval: Approval, approve: boolean) {
    try {
      const result = await api.reviewApproval(
        session.accessToken,
        approval.id,
        approve,
        reviewComments[approval.id],
      )
      if (approve) {
        if (result.status === 'APPROVED') {
          await importantAlert('Approbation acceptee', 'La demande a ete approuvee.', 'success')
        } else {
          showSuccess(`Validation enregistree (${result.approval_count}/${result.required_approvals}).`)
        }
      } else {
        showSuccess('Demande refusee.')
      }
      setReviewComments((current) => ({ ...current, [approval.id]: '' }))
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Decision impossible')
    }
  }

  async function handleMarkNotificationRead(notificationId: number) {
    try {
      await api.markAdminNotificationRead(session.accessToken, notificationId)
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Notification impossible a modifier')
    }
  }

  async function handleCreateOutil(outil: OutilMagasinCreate) {
    try {
      await api.createOutil(session.accessToken, outil)
      showSuccess('Outil ajoute.')
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Creation outil impossible')
    }
  }

  async function handleUpdateOutil(outilId: number, outil: OutilMagasinCreate) {
    try {
      await api.updateOutil(session.accessToken, outilId, outil)
      showSuccess('Outil modifie.')
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Modification outil impossible')
    }
  }

  async function handleDeleteOutil(outilId: number) {
    const confirmed = await confirmAction('Supprimer cet outil ?', 'Cette action retire l outil du magasin.')
    if (!confirmed) return

    try {
      await api.deleteOutil(session.accessToken, outilId)
      showSuccess('Outil supprime.')
      await loadDashboard()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression outil impossible')
    }
  }

  async function refreshEmployes(month = personnelMonth) {
    try {
      setEmployes(await api.employes(session.accessToken, month))
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Chargement personnel impossible')
    }
  }

  async function handlePersonnelMonthChange(month: string) {
    setPersonnelMonth(month)
    await refreshEmployes(month)
  }

  async function handleCreateEmploye(employe: EmployeCreate) {
    try {
      await api.createEmploye(session.accessToken, employe)
      showSuccess('Personnel ajoute.')
      await refreshEmployes()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Creation personnel impossible')
    }
  }

  async function handleUpdateEmploye(employeId: number, employe: Partial<EmployeCreate>) {
    try {
      await api.updateEmploye(session.accessToken, employeId, employe)
      showSuccess('Personnel modifie.')
      await refreshEmployes()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Modification personnel impossible')
    }
  }

  async function handleDeleteEmploye(employeId: number) {
    const confirmed = await confirmAction('Supprimer ce personnel ?', 'Ses absences et avances seront aussi supprimees.')
    if (!confirmed) return

    try {
      await api.deleteEmploye(session.accessToken, employeId)
      showSuccess('Personnel supprime.')
      await refreshEmployes()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression personnel impossible')
    }
  }

  async function handleCreateAbsence(
    employeId: number,
    absence: { date_absence: string; type_absence: AbsenceType; commentaire?: string | null },
  ) {
    try {
      await api.createEmployeAbsence(session.accessToken, employeId, absence)
      showSuccess('Absence ajoutee.')
      await refreshEmployes()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Creation absence impossible')
    }
  }

  async function handleDeleteAbsence(absenceId: number) {
    try {
      await api.deleteEmployeAbsence(session.accessToken, absenceId)
      showSuccess('Absence supprimee.')
      await refreshEmployes()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression absence impossible')
    }
  }

  async function handleCreateAvance(
    employeId: number,
    avance: { date_avance: string; montant: number; source_compte?: AccountingAccount; commentaire?: string | null },
  ) {
    try {
      await api.createEmployeAvance(session.accessToken, employeId, avance)
      showSuccess('Avance ajoutee.')
      await refreshEmployes()
      await refreshAccounting()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Creation avance impossible')
    }
  }

  async function handleDeleteAvance(avanceId: number) {
    try {
      await api.deleteEmployeAvance(session.accessToken, avanceId)
      showSuccess('Avance supprimee.')
      await refreshEmployes()
      await refreshAccounting()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression avance impossible')
    }
  }

  async function refreshAccounting() {
    try {
      const [summary, entries] = await Promise.all([
        api.accountingSummary(session.accessToken),
        api.accountingEntries(session.accessToken),
      ])
      setAccountingSummary(summary)
      setAccountingEntries(entries)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Chargement comptabilite impossible')
    }
  }

  async function handleManualAccounting(data: { account: AccountingAccount; amount: number; motif: string }) {
    try {
      await api.addAccountingManual(session.accessToken, data)
      showSuccess('Montant ajoute.')
      await refreshAccounting()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ajout comptable impossible')
    }
  }

  async function handleTransferAccounting(data: {
    from_account: AccountingAccount
    to_account: AccountingAccount
    amount: number
    motif: string
  }) {
    try {
      await api.transferAccounting(session.accessToken, data)
      showSuccess('Transfert effectue.')
      await refreshAccounting()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Transfert impossible')
    }
  }

  async function handleCreateExpense(data: { account: AccountingAccount; amount: number; motif: string }) {
    try {
      await api.createExpense(session.accessToken, data)
      showSuccess('Depense enregistree.')
      await refreshAccounting()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Depense impossible')
    }
  }

  async function handleCreateSalaryPayment(data: {
    account: AccountingAccount
    employe_id: number
    amount: number
    motif?: string | null
  }) {
    try {
      await api.createSalaryPayment(session.accessToken, data)
      showSuccess('Paiement salaire enregistre.')
      await refreshAccounting()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Paiement salaire impossible')
    }
  }

  async function handleUpdateAccountingEntry(
    entryId: number,
    data: { account: AccountingAccount; amount: number; motif: string },
  ) {
    try {
      await api.updateAccountingEntry(session.accessToken, entryId, data)
      showSuccess('Mouvement modifie.')
      await refreshAccounting()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Modification mouvement impossible')
    }
  }

  async function handleDeleteAccountingEntry(entryId: number) {
    try {
      await api.deleteAccountingEntry(session.accessToken, entryId)
      showSuccess('Mouvement supprime.')
      await refreshAccounting()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression mouvement impossible')
    }
  }

  function renderView() {
    if (
      activeView === 'stock' ||
      activeView === 'stock-types' ||
      activeView === 'stock-categories' ||
      activeView === 'stock-arrivals' ||
      activeView === 'stock-states'
    ) {
      return (
        <StockPage
          section={
            activeView === 'stock-types'
              ? 'types'
              : activeView === 'stock-categories'
                ? 'categories'
                : activeView === 'stock-arrivals'
                  ? 'arrivals'
                : activeView === 'stock-states'
                  ? 'states'
                  : 'stock'
          }
          produits={produits}
          filteredProducts={filteredProducts}
          query={query}
          canManageStock={canManageStock}
          canDeleteStock={session.role === 'SUPER_ADMIN'}
          token={session.accessToken}
          onRefresh={loadDashboard}
          productForm={productForm}
          typeFilter={stockTypeFilter}
          categoryFilter={stockCategoryFilter}
          onQueryChange={setQuery}
          onProductFormChange={setProductForm}
          onCreateProduct={handleCreateProduct}
          onTypeFilterChange={setStockTypeFilter}
          onCategoryFilterChange={setStockCategoryFilter}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onToggleProductActive={handleToggleProductActive}
          onRenameType={handleRenameType}
          onDeleteType={handleDeleteType}
          onRenameCategory={handleRenameCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )
    }

    if (activeView === 'sales-list' || activeView === 'sales-create' || activeView === 'sales-transfer') {
      return (
        <SalesPage
          section={
            activeView === 'sales-list'
              ? 'list'
              : activeView === 'sales-transfer'
                ? 'transfer'
                : 'create'
          }
          canManageSales={session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'}
          canManageTransferActions={session.role === 'VENDEUR' || session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'}
          canManageTransferRecords={session.role === 'SUPER_ADMIN'}
          canViewFinancialStats={canViewFinancialStats}
          token={session.accessToken}
          onRefresh={loadDashboard}
          produits={produits}
          ventes={ventes}
          transferts={transferts}
        />
      )
    }

    if (activeView === 'partners' && canManageUsers) {
      return (
        <PartnersPage
          produits={produits}
          token={session.accessToken}
          canManage={canManageUsers}
          canDelete={session.role === 'SUPER_ADMIN'}
          onRefresh={loadDashboard}
        />
      )
    }

    if (activeView === 'invoice-uploads' && canManageUsers) {
      return <InvoiceUploadsPage token={session.accessToken} />
    }

    if (activeView.startsWith('accounting') && canManageUsers) {
      return (
        <AccountingPage
          section={
            activeView === 'accounting-cash'
              ? 'cash'
              : activeView === 'accounting-vault'
                ? 'vault'
                : activeView === 'accounting-expenses'
                  ? 'expenses'
                  : 'inventory'
          }
          token={session.accessToken}
          summary={accountingSummary}
          entries={accountingEntries}
          produits={produits}
          ventes={ventes}
          transferts={transferts}
          employes={employes}
          onManual={handleManualAccounting}
          onTransfer={handleTransferAccounting}
          onExpense={handleCreateExpense}
          onSalaryPayment={handleCreateSalaryPayment}
          onUpdateEntry={handleUpdateAccountingEntry}
          onDeleteEntry={handleDeleteAccountingEntry}
        />
      )
    }

    if (activeView === 'admin-notifications' && canReviewApprovals) {
      return (
        <AdminNotificationsPage
          notifications={adminNotifications}
          onMarkRead={handleMarkNotificationRead}
        />
      )
    }

    if (activeView === 'admin-tools' && canManageUsers) {
      return (
        <OutilsPage
          outils={outils}
          canManage={canManageUsers}
          onCreate={handleCreateOutil}
          onUpdate={handleUpdateOutil}
          onDelete={handleDeleteOutil}
        />
      )
    }

    if (activeView === 'admin-personnel' && canManageUsers) {
      return (
        <PersonnelPage
          employes={employes}
          canManage={canManageUsers}
          month={personnelMonth}
          onMonthChange={handlePersonnelMonthChange}
          onCreate={handleCreateEmploye}
          onUpdate={handleUpdateEmploye}
          onDelete={handleDeleteEmploye}
          onCreateAbsence={handleCreateAbsence}
          onDeleteAbsence={handleDeleteAbsence}
          onCreateAvance={handleCreateAvance}
          onDeleteAvance={handleDeleteAvance}
        />
      )
    }

    if (activeView === 'approvals' && canReviewApprovals) {
      return (
        <ApprovalsPage
          approvals={approvals}
          users={users}
          filter={approvalFilter}
          canReviewActions={canProcessApprovals}
          reviewComments={reviewComments}
          onFilterChange={setApprovalFilter}
          onCommentChange={(approvalId, value) =>
            setReviewComments((current) => ({ ...current, [approvalId]: value }))
          }
          onReview={handleReview}
        />
      )
    }

    if (activeView === 'users' && canManageUsers) {
      return (
        <UsersPage
          users={users}
          userForm={userForm}
          canCreateAdmin={canCreateAdmin}
          canAssignSuperAdmin={session.role === 'SUPER_ADMIN'}
          canEditUsers={session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'}
          onUserFormChange={setUserForm}
          onCreateUser={handleCreateUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
        />
      )
    }

    return (
      <OverviewPage
        session={session}
        lowStockProducts={lowStockProducts}
        produits={produits}
        ventes={ventes}
        topProduits={topProduits}
        topProduitsBenefice={topProduitsBenefice}
        ventesParJour={ventesParJour}
      />
    )
  }

  return (
    <main className="app-shell">
      <div className="mobile-topline">
        <button
          className="mobile-menu-button"
          type="button"
          aria-label="Ouvrir le menu"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="mobile-brand">
          <Boxes size={18} aria-hidden="true" />
          <span>{STORE_NAME}</span>
        </div>
      </div>

      {isSidebarOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        session={session}
        activeView={activeView}
        canManageUsers={canManageUsers}
        canReviewApprovals={canReviewApprovals}
        unreadNotificationCount={unreadNotificationCount}
        pendingApprovalCount={pendingApprovalCount}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onViewChange={changeView}
        onLogout={onLogout}
      />

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{viewTitles[activeView].eyebrow}</p>
            <h1>{viewTitles[activeView].title}</h1>
          </div>
          <button className="ghost-button" type="button" onClick={() => loadDashboard()} disabled={isLoading}>
            <RefreshCw size={18} aria-hidden="true" />
            Actualiser
          </button>
        </header>

        <section className="view-panel" key={activeView}>
          {renderView()}
        </section>
      </section>
    </main>
  )
}
