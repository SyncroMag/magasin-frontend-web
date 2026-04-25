import { RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { emptyProduct } from '../constants'
import { numberValue } from '../utils/format'
import { ApprovalsPage } from './dashboard/ApprovalsPage'
import { OverviewPage } from './dashboard/OverviewPage'
import { SalesPage } from './dashboard/SalesPage'
import { StockPage } from './dashboard/StockPage'
import { UsersPage } from './dashboard/UsersPage'
import { Sidebar } from './Sidebar'
import type { DashboardView } from './Sidebar'
import type { FormEvent } from 'react'
import type {
  Approval,
  Benefice,
  ChiffreAffaires,
  Produit,
  ProduitCreate,
  Role,
  Session,
  TopProduit,
  User,
  Vente,
  VenteParJour,
} from '../types'

type DashboardProps = {
  session: Session
  onLogout: () => void
}

const viewTitles: Record<DashboardView, { eyebrow: string; title: string }> = {
  overview: { eyebrow: 'Dashboard', title: 'Vue generale' },
  stock: { eyebrow: 'Module', title: 'Stock' },
  sales: { eyebrow: 'Module', title: 'Ventes' },
  approvals: { eyebrow: 'Controle', title: 'Approbations' },
  users: { eyebrow: 'Administration', title: 'Utilisateurs' },
}

export function Dashboard({ session, onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState<DashboardView>('overview')
  const [produits, setProduits] = useState<Produit[]>([])
  const [ventes, setVentes] = useState<Vente[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [chiffreAffaires, setChiffreAffaires] = useState<ChiffreAffaires | null>(null)
  const [benefice, setBenefice] = useState<Benefice | null>(null)
  const [topProduits, setTopProduits] = useState<TopProduit[]>([])
  const [ventesParJour, setVentesParJour] = useState<VenteParJour[]>([])
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [productForm, setProductForm] = useState<ProduitCreate>(emptyProduct)
  const [saleClient, setSaleClient] = useState('Client comptoir')
  const [saleProductId, setSaleProductId] = useState('')
  const [saleQuantity, setSaleQuantity] = useState(1)
  const [salePrice, setSalePrice] = useState(0)
  const [saleLines, setSaleLines] = useState<
    Array<{ produit_id: number; quantite: number; prix_unitaire: number }>
  >([])
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'VENDEUR' as Role })
  const [reviewComments, setReviewComments] = useState<Record<number, string>>({})

  const canManageStock = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'
  const canManageUsers = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'
  const canCreateAdmin = session.role === 'SUPER_ADMIN'
  const canReviewApprovals = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'

  const lowStockProducts = useMemo(
    () => produits.filter((produit) => produit.quantite <= produit.seuil_alerte),
    [produits],
  )

  const filteredProducts = useMemo(() => {
    const value = query.trim().toLowerCase()

    if (!value) {
      return produits
    }

    return produits.filter((produit) =>
      [produit.nom, produit.type, produit.categorie].some((field) =>
        field.toLowerCase().includes(value),
      ),
    )
  }, [produits, query])

  const selectedSaleProduct = useMemo(
    () => produits.find((produit) => produit.id === Number(saleProductId)),
    [produits, saleProductId],
  )

  const saleTotal = saleLines.reduce(
    (total, line) => total + line.quantite * line.prix_unitaire,
    0,
  )

  async function loadDashboard() {
    setIsLoading(true)
    setError('')

    try {
      const token = session.accessToken
      const [
        productsResult,
        salesResult,
        revenueResult,
        benefitResult,
        topProductsResult,
        dailySalesResult,
        approvalsResult,
        usersResult,
      ] = await Promise.allSettled([
        api.produits(token),
        api.ventes(token),
        api.chiffreAffaires(token),
        api.benefice(token),
        api.topProduits(token),
        api.ventesParJour(token),
        canReviewApprovals ? api.approvals(token) : Promise.resolve([]),
        canManageUsers ? api.users(token) : Promise.resolve([]),
      ])

      if (productsResult.status === 'fulfilled') setProduits(productsResult.value)
      if (salesResult.status === 'fulfilled') setVentes(salesResult.value)
      if (revenueResult.status === 'fulfilled') setChiffreAffaires(revenueResult.value)
      if (benefitResult.status === 'fulfilled') setBenefice(benefitResult.value)
      if (topProductsResult.status === 'fulfilled') setTopProduits(topProductsResult.value)
      if (dailySalesResult.status === 'fulfilled') setVentesParJour(dailySalesResult.value)
      if (approvalsResult.status === 'fulfilled') setApprovals(approvalsResult.value)
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value)

      const rejected = [
        productsResult,
        salesResult,
        revenueResult,
        benefitResult,
        topProductsResult,
        dailySalesResult,
        approvalsResult,
        usersResult,
      ].find((result) => result.status === 'rejected')

      if (rejected?.status === 'rejected') {
        setError(rejected.reason instanceof Error ? rejected.reason.message : 'Chargement incomplet')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken])

  function changeView(view: DashboardView) {
    if (view === 'approvals' && !canReviewApprovals) return
    if (view === 'users' && !canManageUsers) return

    setActiveView(view)
    setNotice('')
    setError('')
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setError('')

    try {
      await api.createProduit(session.accessToken, productForm)
      setProductForm(emptyProduct)
      setNotice('Produit ajoute au stock.')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation produit impossible')
    }
  }

  function addSaleLine() {
    if (!selectedSaleProduct) {
      setError('Choisis un produit avant de l ajouter au ticket.')
      return
    }

    setSaleLines((current) => [
      ...current,
      {
        produit_id: selectedSaleProduct.id,
        quantite: saleQuantity,
        prix_unitaire: salePrice,
      },
    ])
    setSaleQuantity(1)
  }

  function handleSaleProductChange(productId: string) {
    setSaleProductId(productId)

    const product = produits.find((item) => item.id === Number(productId))
    if (product) {
      setSalePrice(numberValue(product.prix_vente))
    }
  }

  async function handleCreateSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (saleLines.length === 0) return

    setNotice('')
    setError('')

    try {
      await api.createVente(session.accessToken, {
        client: saleClient,
        details: saleLines,
      })
      setSaleLines([])
      setSaleClient('Client comptoir')
      setNotice('Vente enregistree et stock mis a jour.')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation vente impossible')
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setError('')

    try {
      await api.createUser(session.accessToken, userForm)
      setUserForm({ username: '', password: '', role: 'VENDEUR' })
      setNotice('Utilisateur cree.')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation utilisateur impossible')
    }
  }

  async function handleReview(approval: Approval, approve: boolean) {
    setNotice('')
    setError('')

    try {
      await api.reviewApproval(
        session.accessToken,
        approval.id,
        approve,
        reviewComments[approval.id],
      )
      setNotice(approve ? 'Demande approuvee.' : 'Demande refusee.')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision impossible')
    }
  }

  function renderView() {
    if (activeView === 'stock') {
      return (
        <StockPage
          produits={produits}
          filteredProducts={filteredProducts}
          query={query}
          canManageStock={canManageStock}
          productForm={productForm}
          onQueryChange={setQuery}
          onProductFormChange={setProductForm}
          onCreateProduct={handleCreateProduct}
        />
      )
    }

    if (activeView === 'sales') {
      return (
        <SalesPage
          produits={produits}
          ventes={ventes}
          ventesParJour={ventesParJour}
          saleClient={saleClient}
          saleProductId={saleProductId}
          saleQuantity={saleQuantity}
          salePrice={salePrice}
          saleLines={saleLines}
          saleTotal={saleTotal}
          onSaleClientChange={setSaleClient}
          onSaleProductChange={handleSaleProductChange}
          onSaleQuantityChange={setSaleQuantity}
          onSalePriceChange={setSalePrice}
          onAddSaleLine={addSaleLine}
          onRemoveSaleLine={(index) =>
            setSaleLines((current) => current.filter((_, itemIndex) => itemIndex !== index))
          }
          onCreateSale={handleCreateSale}
        />
      )
    }

    if (activeView === 'approvals' && canReviewApprovals) {
      return (
        <ApprovalsPage
          approvals={approvals}
          reviewComments={reviewComments}
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
          onUserFormChange={setUserForm}
          onCreateUser={handleCreateUser}
        />
      )
    }

    return (
      <OverviewPage
        session={session}
        chiffreAffaires={chiffreAffaires}
        benefice={benefice}
        lowStockProducts={lowStockProducts}
        ventes={ventes}
        topProduits={topProduits}
        ventesParJour={ventesParJour}
      />
    )
  }

  return (
    <main className="app-shell">
      <Sidebar
        session={session}
        activeView={activeView}
        canManageUsers={canManageUsers}
        canReviewApprovals={canReviewApprovals}
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

        {notice && <div className="message success">{notice}</div>}
        {error && <div className="message error">{error}</div>}

        <section className="view-panel" key={activeView}>
          {renderView()}
        </section>
      </section>
    </main>
  )
}
