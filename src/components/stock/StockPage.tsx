import { Check, ChevronDown, ChevronUp, Pencil, Plus, Power, Save, Search, Send, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { emptyProduct } from '../../constants'
import { FormattedNumberInput } from '../common/FormattedNumberInput'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import { dateLabel, dateSearchValues, money } from '../../utils/format'
import { confirmAction, notifyError, notifySuccess } from '../../utils/notifications'
import type { FormEvent } from 'react'
import type { ReactNode } from 'react'
import type { Arrivage, EtatProduit, EtatProduitStatus, Produit, ProduitCreate } from '../../types'

type StockSection = 'types' | 'categories' | 'stock' | 'arrivals' | 'states'
type StockStatusFilter = 'all' | 'alert' | 'out'

type StockPageProps = {
  section: StockSection
  produits: Produit[]
  filteredProducts: Produit[]
  query: string
  canManageStock: boolean
  canDeleteStock: boolean
  token: string
  onRefresh: () => Promise<void>
  productForm: ProduitCreate
  typeFilter: string
  categoryFilter: string
  onQueryChange: (value: string) => void
  onProductFormChange: (value: ProduitCreate) => void
  onCreateProduct: (event: FormEvent<HTMLFormElement>) => Promise<boolean>
  onTypeFilterChange: (value: string) => void
  onCategoryFilterChange: (value: string) => void
  onUpdateProduct: (productId: number, data: Partial<ProduitCreate>) => void
  onDeleteProduct: (productId: number) => void
  onToggleProductActive: (productId: number, isActive: boolean) => Promise<void>
  onRenameType: (oldType: string, nextType: string) => void
  onDeleteType: (type: string) => void
  onRenameCategory: (oldCategory: string, nextCategory: string) => void
  onDeleteCategory: (category: string) => void
}

type GroupEditor = {
  kind: 'type' | 'category'
  label: string
  value: string
}

type ArrivalCartLine = {
  id: string
  form: ProduitCreate
}

type ArrivalEditor = {
  id: number
  date_arrivage: string
  commentaire: string
}

export function StockPage({
  section,
  produits,
  filteredProducts,
  query,
  canManageStock,
  canDeleteStock,
  token,
  onRefresh,
  productForm,
  typeFilter,
  categoryFilter,
  onQueryChange,
  onProductFormChange,
  onCreateProduct,
  onTypeFilterChange,
  onCategoryFilterChange,
  onUpdateProduct,
  onDeleteProduct,
  onToggleProductActive,
  onRenameType,
  onDeleteType,
  onRenameCategory,
  onDeleteCategory,
}: StockPageProps) {
  const [isProductModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Produit | null>(null)
  const [editForm, setEditForm] = useState<ProduitCreate | null>(null)
  const [groupEditor, setGroupEditor] = useState<GroupEditor | null>(null)
  const [etatsProduits, setEtatsProduits] = useState<EtatProduit[]>([])
  const [isStateFormOpen, setStateFormOpen] = useState(false)
  const [showAllStates, setShowAllStates] = useState(false)
  const [stateSearch, setStateSearch] = useState('')
  const [stateType, setStateType] = useState('')
  const [stateCategory, setStateCategory] = useState('')
  const [isArrivalFormOpen, setArrivalFormOpen] = useState(false)
  const [arrivalForm, setArrivalForm] = useState<ProduitCreate>(() => cloneProductForm(emptyProduct))
  const [arrivalCart, setArrivalCart] = useState<ArrivalCartLine[]>([])
  const [editingArrivalLineId, setEditingArrivalLineId] = useState<string | null>(null)
  const [arrivalDate, setArrivalDate] = useState(todayValue())
  const [arrivalComment, setArrivalComment] = useState('')
  const [arrivalHistory, setArrivalHistory] = useState<Arrivage[]>([])
  const [arrivalSearch, setArrivalSearch] = useState('')
  const [expandedArrivalId, setExpandedArrivalId] = useState<number | null>(null)
  const [arrivalEditor, setArrivalEditor] = useState<ArrivalEditor | null>(null)
  const [isSubmittingArrival, setSubmittingArrival] = useState(false)
  const [inactiveProducts, setInactiveProducts] = useState<Produit[]>([])
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>('all')
  const [stateForm, setStateForm] = useState({
    produit_id: '',
    quantite: 1,
    statut_retour: 'A_RETOURNER' as EtatProduitStatus,
    commentaire: '',
  })
  const showStockActions = canManageStock || canDeleteStock
  const showStockFinancialColumns = canManageStock
  const showStateActions = canManageStock

  const typeOptions = useMemo(() => unique(produits.map((produit) => produit.type)), [produits])
  const categoryOptions = useMemo(
    () => unique(produits.map((produit) => produit.categorie)),
    [produits],
  )

  const modalCategoryOptions = useMemo(
    () =>
      unique(
        produits
          .filter((produit) => !productForm.type || produit.type === productForm.type)
          .map((produit) => produit.categorie),
      ),
    [produits, productForm.type],
  )

  const modalProductOptions = useMemo(
    () =>
      produits.filter(
        (produit) =>
          (!productForm.type || produit.type === productForm.type) &&
          (!productForm.categorie || produit.categorie === productForm.categorie),
      ),
    [produits, productForm.categorie, productForm.type],
  )

  const stockFilterCategoryOptions = useMemo(
    () =>
      unique(
        produits
          .filter((produit) => !typeFilter || produit.type === typeFilter)
          .map((produit) => produit.categorie),
      ),
    [produits, typeFilter],
  )

  const typeRows = useMemo(
    () =>
      typeOptions.map((type) => {
        const products = produits.filter((produit) => produit.type === type)
        return {
          type,
          categoryCount: unique(products.map((produit) => produit.categorie)).length,
          productCount: products.length,
        }
      }),
    [produits, typeOptions],
  )

  const categoryRows = useMemo(
    () =>
      categoryOptions.map((categorie) => {
        const products = produits.filter((produit) => produit.categorie === categorie)
        return {
          categorie,
          typeCount: unique(products.map((produit) => produit.type)).length,
          productCount: products.length,
        }
      }),
    [categoryOptions, produits],
  )

  const matchingProduct = produits.find(
    (produit) =>
      produit.nom.trim().toLowerCase() === productForm.nom.trim().toLowerCase() &&
      produit.type.trim().toLowerCase() === productForm.type.trim().toLowerCase() &&
      produit.categorie.trim().toLowerCase() === productForm.categorie.trim().toLowerCase(),
  )

  const stateCategoryOptions = useMemo(
    () =>
      unique(
        produits
          .filter((produit) => !stateType || produit.type === stateType)
          .map((produit) => produit.categorie),
      ),
    [produits, stateType],
  )

  const stateProductOptions = useMemo(
    () =>
      produits.filter(
        (produit) =>
          (!stateType || produit.type === stateType) &&
          (!stateCategory || produit.categorie === stateCategory),
      ),
    [produits, stateCategory, stateType],
  )
  const arrivalCategoryOptions = useMemo(
    () =>
      unique(
        produits
          .filter((produit) => !arrivalForm.type || produit.type === arrivalForm.type)
          .map((produit) => produit.categorie),
      ),
    [arrivalForm.type, produits],
  )
  const arrivalProductOptions = useMemo(
    () =>
      produits.filter(
        (produit) =>
          (!arrivalForm.type || produit.type === arrivalForm.type) &&
          (!arrivalForm.categorie || produit.categorie === arrivalForm.categorie),
      ),
    [arrivalForm.categorie, arrivalForm.type, produits],
  )
  const matchingArrivalProduct = useMemo(
    () =>
      produits.find(
        (produit) =>
          matchesProductIdentity(produit, arrivalForm),
      ),
    [arrivalForm, produits],
  )
  const arrivalTotalQuantity = useMemo(
    () => arrivalCart.reduce((total, line) => total + Number(line.form.quantite || 0), 0),
    [arrivalCart],
  )
  const filteredArrivalHistory = useMemo(() => {
    const value = arrivalSearch.trim().toLowerCase()
    if (!value) return arrivalHistory

    return arrivalHistory.filter((arrivage) =>
      [
        arrivage.commentaire ?? '',
        ...dateSearchValues(arrivage.date_arrivage),
        ...dateSearchValues(arrivage.created_at),
        ...arrivage.lignes.flatMap((line) => [
          line.nom,
          line.type,
          line.categorie,
          line.partner_name ?? '',
          String(line.quantite_ajoutee),
          String(line.stock_avant),
          String(line.stock_apres),
          String(line.prix_vente),
          money(line.prix_vente),
        ]),
      ].some((field) => field.toLowerCase().includes(value)),
    )
  }, [arrivalHistory, arrivalSearch])
  const filteredArrivalValueTotal = useMemo(
    () =>
      filteredArrivalHistory.reduce(
        (total, arrivage) =>
          total +
          arrivage.lignes.reduce(
            (lineTotal, line) => lineTotal + Number(line.quantite_ajoutee) * Number(line.prix_vente),
            0,
          ),
        0,
      ),
    [filteredArrivalHistory],
  )
  const productsById = useMemo(() => new Map(produits.map((produit) => [produit.id, produit])), [produits])
  const filteredEtatsProduits = useMemo(() => {
    const value = stateSearch.trim().toLowerCase()
    if (!value) return etatsProduits

    return etatsProduits.filter((etat) => {
      const produit = productsById.get(etat.produit_id)
      return [
        produit?.nom ?? '',
        produit?.type ?? '',
        produit?.categorie ?? '',
        etat.commentaire ?? '',
        stateLabel(etat.statut_retour),
        ...dateSearchValues(etat.date_signalement),
        ...dateSearchValues(etat.date_envoi),
        ...dateSearchValues(etat.date_retour),
      ].some((field) => field.toLowerCase().includes(value))
    })
  }, [etatsProduits, productsById, stateSearch])
  const selectedStateProduct = productsById.get(Number(stateForm.produit_id))
  const { pageItems: paginatedTypeRows, controls: typePagination } = usePaginatedItems(typeRows)
  const { pageItems: paginatedCategoryRows, controls: categoryPagination } = usePaginatedItems(categoryRows)
  const { pageItems: paginatedArrivalHistory, controls: arrivalPagination } = usePaginatedItems(filteredArrivalHistory)
  const { pageItems: paginatedEtatsProduits, controls: statePagination } = usePaginatedItems(filteredEtatsProduits)
  const stockStatusCounts = useMemo(
    () => ({
      alert: produits.filter((produit) => produit.quantite > 0 && produit.quantite <= produit.seuil_alerte).length,
      out: produits.filter((produit) => produit.quantite <= 0).length,
    }),
    [produits],
  )
  const statusFilteredProducts = useMemo(
    () => filteredProducts.filter((produit) => {
      if (stockStatusFilter === 'alert') return produit.quantite > 0 && produit.quantite <= produit.seuil_alerte
      if (stockStatusFilter === 'out') return produit.quantite <= 0
      return true
    }),
    [filteredProducts, stockStatusFilter],
  )
  const { pageItems: paginatedFilteredProducts, controls: productPagination } = usePaginatedItems(statusFilteredProducts)
  const { pageItems: paginatedInactiveProducts, controls: inactiveProductPagination } = usePaginatedItems(inactiveProducts)

  useEffect(() => {
    if (section !== 'states') return

    void loadEtatsProduits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, showAllStates])

  useEffect(() => {
    if (section !== 'arrivals') return
    setExpandedArrivalId(null)
    void loadArrivals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  useEffect(() => {
    if (section !== 'stock') return
    if (!canManageStock) return
    void loadInactiveProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, canManageStock])

  async function loadEtatsProduits() {
    try {
      const result = await api.etatsProduits(token, showAllStates)
      setEtatsProduits(result.items)
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Chargement etat produit impossible')
    }
  }

  async function loadArrivals() {
    try {
      const result = await api.arrivages(token)
      setArrivalHistory(result)
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Chargement arrivages impossible')
    }
  }

  async function loadInactiveProducts() {
    try {
      const result = await api.produitsInactifs(token)
      setInactiveProducts(result)
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Chargement produits inactifs impossible')
    }
  }

  async function createEtatProduit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedStateProduct) {
      notifyError('Choisis un produit.')
      return
    }

    if (stateForm.quantite > selectedStateProduct.quantite) {
      notifyError(`Quantite disponible: ${selectedStateProduct.quantite}.`)
      return
    }

    try {
      await api.createEtatProduit(token, {
        produit_id: Number(stateForm.produit_id),
        type_etat: 'RETOUR',
        quantite: stateForm.quantite,
        statut_retour: stateForm.statut_retour,
        commentaire: stateForm.commentaire,
      })
      setStateForm({ produit_id: '', quantite: 1, statut_retour: 'A_RETOURNER', commentaire: '' })
      setStateType('')
      setStateCategory('')
      setStateFormOpen(false)
      notifySuccess('Etat produit ajoute.')
      await loadEtatsProduits()
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Creation etat produit impossible')
    }
  }

  async function updateEtatProduit(etat: EtatProduit, nextStatus: EtatProduitStatus) {
    try {
      const payload = {
        statut_retour: nextStatus,
        date_envoi: nextStatus === 'ENVOYE_FOURNISSEUR' ? todayValue() : undefined,
        date_retour: nextStatus === 'RETOUR_REINTEGRE' || nextStatus === 'REGLE' ? todayValue() : undefined,
        stock_reintegre: nextStatus === 'RETOUR_REINTEGRE',
      }

      await api.updateEtatProduit(token, etat.id, payload)
      notifySuccess('Etat produit modifie.')
      await loadEtatsProduits()
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Modification etat produit impossible')
    }
  }

  function resetStateForm() {
    setStateForm({ produit_id: '', quantite: 1, statut_retour: 'A_RETOURNER', commentaire: '' })
    setStateType('')
    setStateCategory('')
    setStateFormOpen(false)
  }

  function openArrivalForm() {
    setArrivalFormOpen(true)
    setArrivalForm(cloneProductForm(emptyProduct))
    setArrivalCart([])
    setEditingArrivalLineId(null)
    setArrivalDate(todayValue())
    setArrivalComment('')
  }

  function cancelArrivalForm() {
    setArrivalFormOpen(false)
    setArrivalForm(cloneProductForm(emptyProduct))
    setArrivalCart([])
    setEditingArrivalLineId(null)
    setArrivalDate(todayValue())
    setArrivalComment('')
  }

  function addOrUpdateArrivalLine() {
    const normalized = normalizeProductForm(arrivalForm)

    if (!normalized.type || !normalized.categorie || !normalized.nom) {
      notifyError('Type, categorie et produit obligatoires.')
      return
    }

    if (normalized.quantite <= 0) {
      notifyError('Quantite a ajouter obligatoire.')
      return
    }

    if (editingArrivalLineId) {
      setArrivalCart((current) =>
        current.map((line) =>
          line.id === editingArrivalLineId
            ? { ...line, form: normalized }
            : line,
        ),
      )
      setEditingArrivalLineId(null)
    } else {
      setArrivalCart((current) => [...current, { id: randomId(), form: normalized }])
    }

    setArrivalForm(cloneProductForm(emptyProduct))
  }

  function editArrivalLine(lineId: string) {
    const line = arrivalCart.find((item) => item.id === lineId)
    if (!line) return

    setEditingArrivalLineId(line.id)
    setArrivalForm(cloneProductForm(line.form))
  }

  function removeArrivalLine(lineId: string) {
    if (editingArrivalLineId === lineId) {
      setEditingArrivalLineId(null)
      setArrivalForm(cloneProductForm(emptyProduct))
    }
    setArrivalCart((current) => current.filter((line) => line.id !== lineId))
  }

  async function submitArrival(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (arrivalCart.length === 0) {
      notifyError('Ajoute au moins un produit dans le panier.')
      return
    }

    if (!arrivalDate) {
      notifyError('Date d arrivage obligatoire.')
      return
    }

    setSubmittingArrival(true)
    try {
      await api.createArrivage(token, {
        date_arrivage: arrivalDate,
        commentaire: arrivalComment.trim() || null,
        lignes: arrivalCart.map((line) => {
          const payload = normalizeProductForm(line.form)
          return {
            type: payload.type,
            categorie: payload.categorie,
            nom: payload.nom,
            quantite: payload.quantite,
            seuil_alerte: payload.seuil_alerte,
            cout_achat: payload.cout_achat,
            prix_vente: payload.prix_vente,
            prix_plafond: payload.prix_plafond,
            marge: payload.marge,
            commentaire: payload.commentaire || null,
            is_partner: payload.is_partner,
            partner_name: payload.partner_name ?? null,
          }
        }),
      })

      notifySuccess('Arrivage enregistre.')
      cancelArrivalForm()
      await loadArrivals()
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Enregistrement arrivage impossible')
      await onRefresh()
    } finally {
      setSubmittingArrival(false)
    }
  }

  function toggleArrivalRow(arrivageId: number) {
    setExpandedArrivalId((current) => (current === arrivageId ? null : arrivageId))
  }

  function openArrivalEditor(arrivage: Arrivage) {
    setArrivalEditor({
      id: arrivage.id,
      date_arrivage: arrivage.date_arrivage?.slice(0, 10) ?? todayValue(),
      commentaire: arrivage.commentaire ?? '',
    })
  }

  async function saveArrivalEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!arrivalEditor) return

    if (!arrivalEditor.date_arrivage) {
      notifyError('Date d arrivage obligatoire.')
      return
    }

    try {
      await api.updateArrivage(token, arrivalEditor.id, {
        date_arrivage: arrivalEditor.date_arrivage,
        commentaire: arrivalEditor.commentaire.trim() || null,
      })
      notifySuccess('Arrivage modifie.')
      setArrivalEditor(null)
      await loadArrivals()
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Modification arrivage impossible')
    }
  }

  async function deleteArrival(arrivageId: number) {
    const confirmed = await confirmAction(
      'Supprimer cet arrivage ?',
      'Le stock ajoute par cet arrivage sera retire.',
    )
    if (!confirmed) return

    try {
      await api.deleteArrivage(token, arrivageId)
      notifySuccess('Arrivage supprime.')
      if (expandedArrivalId === arrivageId) {
        setExpandedArrivalId(null)
      }
      await loadArrivals()
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Suppression arrivage impossible')
    }
  }

  async function toggleProductActive(produit: Produit, nextActive: boolean) {
    const confirmed = await confirmAction(
      nextActive ? 'Activer ce produit ?' : 'Desactiver ce produit ?',
      nextActive ? 'Le produit redevient disponible dans le stock actif.' : 'Le produit sera retire du stock actif.',
    )
    if (!confirmed) return

    try {
      await onToggleProductActive(produit.id, nextActive)
      await loadInactiveProducts()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Changement statut produit impossible')
    }
  }

  function openEditProduct(produit: Produit) {
    setEditingProduct(produit)
    setEditForm({
      type: produit.type,
      categorie: produit.categorie,
      nom: produit.nom,
      quantite: produit.quantite,
      seuil_alerte: produit.seuil_alerte,
      cout_achat: produit.cout_achat,
      prix_vente: produit.prix_vente,
      prix_plafond: produit.prix_plafond,
      marge: produit.marge,
      commentaire: produit.commentaire ?? '',
      is_partner: produit.is_partner,
      partner_name: produit.partner_name ?? null,
    })
  }

  function submitEditProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingProduct || !editForm) return

    onUpdateProduct(editingProduct.id, editForm)
    setEditingProduct(null)
    setEditForm(null)
  }

  function submitGroupEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!groupEditor) return

    if (groupEditor.kind === 'type') {
      onRenameType(groupEditor.label, groupEditor.value)
    } else {
      onRenameCategory(groupEditor.label, groupEditor.value)
    }
    setGroupEditor(null)
  }

  if (section === 'types') {
    return (
      <article className="panel view-stack">
        <DataHeader
          eyebrow="Article"
          title="Types"
          action={canManageStock ? <AddButton onClick={() => setProductModalOpen(true)} /> : null}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Categories</th>
                <th>Produits</th>
                {showStockActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedTypeRows.map((row) => (
                <tr key={row.type}>
                  <td data-label="Type">
                    <strong>{row.type}</strong>
                  </td>
                  <td data-label="Categories">{row.categoryCount}</td>
                  <td data-label="Produits">{row.productCount}</td>
                  {showStockActions && (
                    <td data-label="Actions">
                      <IconActions
                        canEdit={canManageStock}
                        canDelete={canDeleteStock}
                        onEdit={() => setGroupEditor({ kind: 'type', label: row.type, value: row.type })}
                        onDelete={() => onDeleteType(row.type)}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {typeRows.length === 0 && <EmptyRow colSpan={showStockActions ? 4 : 3} />}
            </tbody>
          </table>
        </div>
        <PaginationControls {...typePagination} />
        {renderProductModal()}
        {renderGroupModal()}
      </article>
    )
  }

  if (section === 'categories') {
    return (
      <article className="panel view-stack">
        <DataHeader
          eyebrow="Article"
          title="Categories"
          action={canManageStock ? <AddButton onClick={() => setProductModalOpen(true)} /> : null}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Categorie</th>
                <th>Types</th>
                <th>Produits</th>
                {showStockActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedCategoryRows.map((row) => (
                <tr key={row.categorie}>
                  <td data-label="Categorie">
                    <strong>{row.categorie}</strong>
                  </td>
                  <td data-label="Types">{row.typeCount}</td>
                  <td data-label="Produits">{row.productCount}</td>
                  {showStockActions && (
                    <td data-label="Actions">
                      <IconActions
                        canEdit={canManageStock}
                        canDelete={canDeleteStock}
                        onEdit={() =>
                          setGroupEditor({
                            kind: 'category',
                            label: row.categorie,
                            value: row.categorie,
                          })
                        }
                        onDelete={() => onDeleteCategory(row.categorie)}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {categoryRows.length === 0 && <EmptyRow colSpan={showStockActions ? 4 : 3} />}
            </tbody>
          </table>
        </div>
        <PaginationControls {...categoryPagination} />
        {renderProductModal()}
        {renderGroupModal()}
      </article>
    )
  }

  if (section === 'states') {
    return (
      <article className="panel view-stack">
        <DataHeader
          eyebrow="Article"
          title="Etat produit"
          action={
            <div className="panel-actions">
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={showAllStates}
                  onChange={(event) => setShowAllStates(event.target.checked)}
                />
                Voir tout
              </label>
              {canManageStock && !isStateFormOpen && (
                <button
                  className="primary-button compact-button"
                  type="button"
                  onClick={() => setStateFormOpen(true)}
                >
                  <Plus size={18} aria-hidden="true" />
                  Ajouter un etat
                </button>
              )}
            </div>
          }
        />

        {canManageStock && isStateFormOpen && (
          <form className="external-form-panel" onSubmit={createEtatProduit}>
            <label>
              Type
              <select
                value={stateType}
                onChange={(event) => {
                  setStateType(event.target.value)
                  setStateCategory('')
                  setStateForm((current) => ({ ...current, produit_id: '' }))
                }}
                required
              >
                <option value="">Selectionner un type</option>
                {typeOptions.map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categorie
              <select
                value={stateCategory}
                onChange={(event) => {
                  setStateCategory(event.target.value)
                  setStateForm((current) => ({ ...current, produit_id: '' }))
                }}
                disabled={!stateType}
                required
              >
                <option value="">Selectionner une categorie</option>
                {stateCategoryOptions.map((categorie) => (
                  <option value={categorie} key={categorie}>
                    {categorie}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Produit
              <select
                value={stateForm.produit_id}
                onChange={(event) => setStateForm((current) => ({ ...current, produit_id: event.target.value }))}
                disabled={!stateCategory}
                required
              >
                <option value="">Selectionner un produit</option>
                {stateProductOptions.map((produit) => (
                  <option value={produit.id} key={produit.id}>
                    {produit.nom} - stock {produit.quantite}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantite retour
              <input
                type="number"
                min="1"
                max={Math.max(1, selectedStateProduct?.quantite ?? 1)}
                value={stateForm.quantite}
                onChange={(event) => setStateForm((current) => ({ ...current, quantite: Number(event.target.value) }))}
              />
              {selectedStateProduct && (
                <span className="profit-note">Stock disponible: {selectedStateProduct.quantite}</span>
              )}
            </label>
            <label>
              Commentaire
              <input
                value={stateForm.commentaire}
                onChange={(event) => setStateForm((current) => ({ ...current, commentaire: event.target.value }))}
              />
            </label>
            <div className="filter-actions">
              <button className="primary-button compact-button" type="submit">
                <Plus size={18} aria-hidden="true" />
                Ajouter
              </button>
              <button className="ghost-button compact-button" type="button" onClick={resetStateForm}>
                <X size={16} aria-hidden="true" />
                Annuler
              </button>
            </div>
          </form>
        )}

        <label>
          Recherche
          <span className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              value={stateSearch}
              onChange={(event) => setStateSearch(event.target.value)}
              placeholder="Produit, type, categorie, statut..."
            />
          </span>
        </label>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Type produit</th>
                <th>Categorie</th>
                <th>Quantite</th>
                <th>Statut</th>
                <th>Dates</th>
                <th>Commentaire</th>
                {showStateActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedEtatsProduits.map((etat) => {
                const produit = productsById.get(etat.produit_id)
                return (
                  <tr key={etat.id}>
                    <td data-label="Produit">
                      <strong>{produit?.nom ?? `Produit #${etat.produit_id}`}</strong>
                    </td>
                    <td data-label="Type produit">{produit?.type ?? '-'}</td>
                    <td data-label="Categorie">{produit?.categorie ?? '-'}</td>
                    <td data-label="Quantite">{etat.quantite}</td>
                    <td data-label="Statut">
                      <span className={etat.stock_reintegre ? 'pill ok' : 'pill warn'}>
                        {stateLabel(etat.statut_retour)}
                      </span>
                    </td>
                    <td data-label="Dates">
                      <span>Signalement: {dateLabel(etat.date_signalement)}</span>
                      <span>Envoi: {dateLabel(etat.date_envoi)}</span>
                      <span>Retour: {dateLabel(etat.date_retour)}</span>
                    </td>
                    <td data-label="Commentaire">{etat.commentaire || '-'}</td>
                    {showStateActions && (
                      <td data-label="Actions">
                        <div className="icon-actions">
                          <button
                            type="button"
                            className="icon-button"
                            title="Envoyer fournisseur"
                            onClick={() => updateEtatProduit(etat, 'ENVOYE_FOURNISSEUR')}
                          >
                            <Send size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            title="Retour reintegre"
                            onClick={() => updateEtatProduit(etat, 'RETOUR_REINTEGRE')}
                          >
                            <Check size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {filteredEtatsProduits.length === 0 && <EmptyRow colSpan={showStateActions ? 8 : 7} />}
            </tbody>
          </table>
        </div>
        <PaginationControls {...statePagination} />
      </article>
    )
  }

  if (section === 'arrivals') {
    return (
      <article className="panel view-stack">
        <DataHeader
          eyebrow="Article"
          title="Arrivage"
          action={canManageStock && !isArrivalFormOpen ? <AddButton onClick={openArrivalForm} /> : null}
        />

        {canManageStock && isArrivalFormOpen && (
          <section className="module-grid">
            <article className="panel module-side">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Arrivage</p>
                  <h2>{editingArrivalLineId ? 'Modifier ligne' : 'Ajouter produit'}</h2>
                </div>
              </div>
              <div className="compact-form">
                <ProductFields
                  form={arrivalForm}
                  typeOptions={typeOptions}
                  categoryOptions={arrivalCategoryOptions}
                  productOptions={arrivalProductOptions}
                  availableQuantity={matchingArrivalProduct?.quantite ?? 0}
                  onChange={setArrivalForm}
                  mode="stock"
                />
                <button className="ghost-button" type="button" onClick={addOrUpdateArrivalLine}>
                  <Plus size={16} aria-hidden="true" />
                  {editingArrivalLineId ? 'Modifier ligne' : 'Ajouter au panier'}
                </button>
              </div>
            </article>

            <article className="panel module-main">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Panier</p>
                  <h2>Produits a ajouter</h2>
                </div>
              </div>
              <form className="compact-form sales-summary-form" onSubmit={submitArrival}>
                <div className="sales-summary-fields">
                  <label>
                    Date d arrivage
                    <input
                      type="date"
                      value={arrivalDate}
                      onChange={(event) => setArrivalDate(event.target.value)}
                      required
                    />
                  </label><br></br>
                  <label>
                    Quantite totale
                    <input value={arrivalTotalQuantity} readOnly />
                  </label>
                </div>
                <label>
                  Commentaire
                  <input
                    value={arrivalComment}
                    onChange={(event) => setArrivalComment(event.target.value)}
                    placeholder="Commentaire global de l arrivage"
                  />
                </label>

                <div className="ticket-lines">
                  {arrivalCart.map((line) => (
                    <div className="ticket-line" key={line.id}>
                      <span>
                        {line.form.nom} ({line.form.type} / {line.form.categorie}) x {line.form.quantite}
                      </span>
                      <strong>{money(line.form.prix_vente)}</strong>
                      <div className="icon-actions">
                        <button type="button" className="icon-button" title="Modifier" onClick={() => editArrivalLine(line.id)}>
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-button danger-icon"
                          title="Supprimer"
                          onClick={() => removeArrivalLine(line.id)}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {arrivalCart.length === 0 && <p className="muted">Panier vide.</p>}
                </div>

                <div className="sales-summary-actions">
                  <button className="primary-button" type="submit" disabled={isSubmittingArrival || arrivalCart.length === 0}>
                    <Save size={18} aria-hidden="true" />
                    Enregistrer l arrivage
                  </button>
                  <button className="ghost-button" type="button" onClick={cancelArrivalForm}>
                    <X size={16} aria-hidden="true" />
                    Annuler
                  </button>
                </div>
              </form>
            </article>
          </section>
        )}

        <div className="panel-actions">
          <label>
            Recherche
            <span className="search-field">
              <Search size={18} aria-hidden="true" />
              <input
                value={arrivalSearch}
                onChange={(event) => setArrivalSearch(event.target.value)}
                placeholder="Date, commentaire, produit, type..."
              />
            </span>
          </label>
          <span className="pill info">Valeur totale: {money(filteredArrivalValueTotal)}</span>
        </div>

        <div className="table-wrap">
          <table className="arrival-history-table">
            <thead>
              <tr>
                <th>Date arrivage</th>
                <th>Commentaire</th>
                <th>Lignes</th>
                <th className="arrival-qtt-col">QTT</th>
                <th>Valeur</th>
                <th>Enregistre le</th>
                <th>Details</th>
                {canDeleteStock && <th className="arrival-actions-col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedArrivalHistory.map((arrivage) => {
                const isExpanded = expandedArrivalId === arrivage.id
                const arrivalValue = arrivage.lignes.reduce(
                  (total, line) => total + Number(line.quantite_ajoutee) * Number(line.prix_vente),
                  0,
                )

                return (
                  <Fragment key={arrivage.id}>
                    <tr
                      className={`clickable-row${isExpanded ? ' selected-row' : ''}`}
                      onClick={() => toggleArrivalRow(arrivage.id)}
                    >
                      <td data-label="Date arrivage">{dateLabel(arrivage.date_arrivage)}</td>
                      <td data-label="Commentaire">{arrivage.commentaire || '-'}</td>
                      <td data-label="Lignes">{arrivage.total_lignes}</td>
                      <td className="arrival-qtt-col" data-label="QTT">{arrivage.total_quantite}</td>
                      <td data-label="Valeur">{money(arrivalValue)}</td>
                      <td data-label="Enregistre le">{dateLabel(arrivage.created_at)}</td>
                      <td data-label="Details">
                        {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                      </td>
                      {canDeleteStock && (
                        <td className="arrival-actions-col" data-label="Actions">
                          <div className="icon-actions">
                            <button
                              type="button"
                              className="icon-button"
                              title="Modifier"
                              onClick={(event) => {
                                event.stopPropagation()
                                openArrivalEditor(arrivage)
                              }}
                            >
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-button danger-icon"
                              title="Supprimer"
                              onClick={(event) => {
                                event.stopPropagation()
                                void deleteArrival(arrivage.id)
                              }}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {isExpanded && (
                      <tr className="expanded-row">
                        <td colSpan={canDeleteStock ? 8 : 7} className="expanded-sale-cell">
                          <div className="ticket-lines">
                            {arrivage.lignes.map((line, index) => (
                              <div className="ticket-line" key={`${arrivage.id}-${line.nom}-${index}`}>
                                <span>
                                  {line.nom} ({line.type} / {line.categorie}) x {line.quantite_ajoutee}
                                  {line.is_partner ? ` - partenaire ${line.partner_name || ''}` : ''}
                                  {` - stock ${line.stock_avant} -> ${line.stock_apres}`}
                                </span>
                                <strong>
                                  PA {money(line.cout_achat)} | Total {money(Number(line.quantite_ajoutee) * Number(line.prix_vente))}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {filteredArrivalHistory.length === 0 && <EmptyRow colSpan={canDeleteStock ? 8 : 7} />}
            </tbody>
          </table>
        </div>
        <PaginationControls {...arrivalPagination} />
        {renderArrivalEditModal()}
      </article>
    )
  }

  return (
    <>
    <article className="panel view-stack">
      <DataHeader
        eyebrow="Article"
        title="Stock"
        action={canManageStock ? <AddButton onClick={() => setProductModalOpen(true)} /> : null}
      />
      <div className="stock-summary-grid">
        <button
          className={`stock-summary-card${stockStatusFilter === 'all' ? ' active' : ''}`}
          type="button"
          onClick={() => setStockStatusFilter('all')}
        >
          <span>Articles en stock</span>
          <strong>{produits.length}</strong>
          <small>Afficher tous</small>
        </button>
        <div className="stock-summary-card inactive">
          <span>Produits inactifs</span>
          <strong>{inactiveProducts.length}</strong>
          <small>Liste separee ci-dessous</small>
        </div>
        <button
          className={`stock-summary-card alert${stockStatusFilter === 'alert' ? ' active' : ''}`}
          type="button"
          onClick={() => setStockStatusFilter((current) => current === 'alert' ? 'all' : 'alert')}
        >
          <span>Produits en alerte</span>
          <strong>{stockStatusCounts.alert}</strong>
          <small>Cliquer pour filtrer</small>
        </button>
        <button
          className={`stock-summary-card danger${stockStatusFilter === 'out' ? ' active' : ''}`}
          type="button"
          onClick={() => setStockStatusFilter((current) => current === 'out' ? 'all' : 'out')}
        >
          <span>Rupture de stock</span>
          <strong>{stockStatusCounts.out}</strong>
          <small>Cliquer pour filtrer</small>
        </button>
      </div>
      <div className="toolbar-grid">
        <label>
          Recherche
          <span className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </span>
        </label>
        <label>
          Filtrer par type
          <select
            value={typeFilter}
            onChange={(event) => {
              onTypeFilterChange(event.target.value)
              onCategoryFilterChange('')
            }}
          >
            <option value="">Tous les types</option>
            {typeOptions.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filtrer par categorie
          <select
            value={categoryFilter}
            onChange={(event) => {
              onCategoryFilterChange(event.target.value)
            }}
            disabled={!typeFilter}
          >
            <option value="">Toutes les categories</option>
            {stockFilterCategoryOptions.map((categorie) => (
              <option value={categorie} key={categorie}>
                {categorie}
              </option>
            ))}
          </select>
        </label>
        
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Type</th>
              <th>Categorie</th>
              <th>Quantite</th>
              {showStockFinancialColumns && <th>Cout (Ar)</th>}
              <th>Prix vente (Ar)</th>
              {showStockFinancialColumns && <th>Marge</th>}
              <th>Partenaire</th>
              <th>Etat</th>
              {showStockActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedFilteredProducts.map((produit) => (
              <tr key={produit.id}>
                <td data-label="Produit">
                  <strong>{produit.nom}</strong>
                  <span>{produit.commentaire || 'Sans commentaire'}</span>
                </td>
                <td data-label="Type">{produit.type}</td>
                <td data-label="Categorie">{produit.categorie}</td>
                <td data-label="Quantite">{produit.quantite}</td>
                {showStockFinancialColumns && <td data-label="Cout">{money(produit.cout_achat)}</td>}
                <td data-label="Prix vente">{money(produit.prix_vente)}</td>
                {showStockFinancialColumns && <td data-label="Marge">{profitLabel(produit.cout_achat, produit.prix_vente)}</td>}
                <td data-label="Partenaire">
                  {produit.is_partner ? (
                    <span className="pill info">{produit.partner_name || 'Partenaire'}</span>
                  ) : (
                    '-'
                  )}
                </td>
                <td data-label="Etat">
                  <span className={produit.quantite <= 0 ? 'pill danger' : produit.quantite <= produit.seuil_alerte ? 'pill alert' : 'pill ok'}>
                    {produit.quantite <= 0 ? 'Rupture' : produit.quantite <= produit.seuil_alerte ? 'Alerte' : 'OK'}
                  </span>
                </td>
                {showStockActions && (
                  <td data-label="Actions">
                    <IconActions
                      canEdit={canManageStock}
                      canDelete={canDeleteStock}
                      canToggleActive={canManageStock}
                      isActive={true}
                      onEdit={() => openEditProduct(produit)}
                      onDelete={() => onDeleteProduct(produit.id)}
                      onToggleActive={() => void toggleProductActive(produit, false)}
                    />
                  </td>
                )}
              </tr>
            ))}
            {statusFilteredProducts.length === 0 && <EmptyRow colSpan={7 + (showStockFinancialColumns ? 2 : 0) + (showStockActions ? 1 : 0)} />}
          </tbody>
        </table>
      </div>
      <PaginationControls {...productPagination} />
    </article>

      {canManageStock && (
        <article className="panel view-stack stock-inactive-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Stock</p>
              <h2>Produits inactifs</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Type</th>
                  <th>Categorie</th>
                  <th>Partenaire</th>
                  <th>Etat</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInactiveProducts.map((produit) => (
                  <tr key={produit.id}>
                    <td data-label="Produit">
                      <strong>{produit.nom}</strong>
                      <span>{produit.commentaire || 'Sans commentaire'}</span>
                    </td>
                    <td data-label="Type">{produit.type}</td>
                    <td data-label="Categorie">{produit.categorie}</td>
                    <td data-label="Partenaire">
                      {produit.is_partner ? (
                        <span className="pill info">{produit.partner_name || 'Partenaire'}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td data-label="Etat">
                      <span className="pill danger">Desactive</span>
                    </td>
                    <td data-label="Actions">
                      <IconActions
                        canEdit={false}
                        canDelete={false}
                        canToggleActive={true}
                        isActive={false}
                        onEdit={() => undefined}
                        onDelete={() => undefined}
                        onToggleActive={() => void toggleProductActive(produit, true)}
                      />
                    </td>
                  </tr>
                ))}
                {inactiveProducts.length === 0 && <EmptyRow colSpan={6} />}
              </tbody>
            </table>
          </div>
          <PaginationControls {...inactiveProductPagination} />
        </article>
      )}

      {renderProductModal()}
      {renderEditProductModal()}
    </>
  )

  function renderProductModal() {
    if (!isProductModalOpen) return null

    return (
      <Modal title="Mettre a jour le stock" onClose={() => setProductModalOpen(false)}>
        <form
          className="modal-form"
          onSubmit={async (event) => {
            const success = await onCreateProduct(event)
            if (success) {
              setProductModalOpen(false)
            }
          }}
        >
          <ProductFields
            form={productForm}
            typeOptions={typeOptions}
            categoryOptions={modalCategoryOptions}
            productOptions={modalProductOptions}
            availableQuantity={matchingProduct?.quantite ?? 0}
            onChange={onProductFormChange}
            mode="stock"
          />
          <button className="primary-button" type="submit">
            {matchingProduct ? <Save size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
            {matchingProduct ? 'Mettre a jour' : 'Ajouter'}
          </button>
        </form>
      </Modal>
    )
  }

  function renderEditProductModal() {
    if (!editingProduct || !editForm) return null

    return (
      <Modal
        title={`Modifier ${editingProduct.nom}`}
        onClose={() => {
          setEditingProduct(null)
          setEditForm(null)
        }}
      >
        <form className="modal-form" onSubmit={submitEditProduct}>
          <ProductFields
            form={editForm}
            typeOptions={typeOptions}
            categoryOptions={categoryOptions}
            productOptions={[]}
            availableQuantity={editingProduct.quantite}
            onChange={setEditForm}
            mode="edit"
          />
          <button className="primary-button" type="submit">
            <Save size={18} aria-hidden="true" />
            Enregistrer
          </button>
        </form>
      </Modal>
    )
  }

  function renderArrivalEditModal() {
    if (!arrivalEditor) return null

    return (
      <Modal
        title={`Modifier arrivage #${arrivalEditor.id}`}
        onClose={() => setArrivalEditor(null)}
      >
        <form className="modal-form" onSubmit={saveArrivalEditor}>
          <label>
            Date d arrivage
            <input
              type="date"
              value={arrivalEditor.date_arrivage}
              onChange={(event) =>
                setArrivalEditor((current) =>
                  current ? { ...current, date_arrivage: event.target.value } : current,
                )
              }
              required
            />
          </label>
          <label>
            Commentaire
            <input
              value={arrivalEditor.commentaire}
              onChange={(event) =>
                setArrivalEditor((current) =>
                  current ? { ...current, commentaire: event.target.value } : current,
                )
              }
            />
          </label>
          <button className="primary-button" type="submit">
            <Save size={18} aria-hidden="true" />
            Enregistrer
          </button>
        </form>
      </Modal>
    )
  }

  function renderGroupModal() {
    if (!groupEditor) return null

    return (
      <Modal
        title={groupEditor.kind === 'type' ? 'Modifier type' : 'Modifier categorie'}
        onClose={() => setGroupEditor(null)}
      >
        <form className="modal-form" onSubmit={submitGroupEditor}>
          <label>
            Nouveau nom
            <input
              value={groupEditor.value}
              onChange={(event) =>
                setGroupEditor((current) =>
                  current ? { ...current, value: event.target.value } : current,
                )
              }
              required
            />
          </label>
          <button className="primary-button" type="submit">
            <Save size={18} aria-hidden="true" />
            Enregistrer
          </button>
        </form>
      </Modal>
    )
  }
}

function ProductFields({
  form,
  typeOptions,
  categoryOptions,
  productOptions,
  availableQuantity,
  onChange,
  mode,
}: {
  form: ProduitCreate
  typeOptions: string[]
  categoryOptions: string[]
  productOptions: Produit[]
  availableQuantity: number
  onChange: (value: ProduitCreate) => void
  mode: 'stock' | 'edit'
}) {
  function resetStockFields(next: Partial<ProduitCreate> = {}) {
    return {
      ...form,
      categorie: '',
      nom: '',
      quantite: 0,
      seuil_alerte: 2,
      cout_achat: 0,
      prix_vente: 0,
      prix_plafond: 0,
      marge: 0,
      commentaire: '',
      ...next,
    }
  }

  return (
    <>
      <div className="two-cols">
        <label>
          Type
          <input
            list="stock-type-options"
            value={form.type}
            onChange={(event) =>
              onChange(
                mode === 'stock'
                  ? resetStockFields({ type: event.target.value })
                  : { ...form, type: event.target.value },
              )
            }
            placeholder="Type existant ou nouveau"
            required
          />
          <datalist id="stock-type-options">
            {typeOptions.map((type) => (
              <option value={type} key={type} />
            ))}
          </datalist>
        </label>
        <label>
          Categorie
          <input
            list="stock-category-options"
            value={form.categorie}
            onChange={(event) =>
              onChange(
                mode === 'stock'
                  ? resetStockFields({ type: form.type, categorie: event.target.value })
                  : { ...form, categorie: event.target.value },
              )
            }
            placeholder="Categorie existante ou nouvelle"
            disabled={mode === 'stock' ? !form.type : false}
            required
          />
          <datalist id="stock-category-options">
            {categoryOptions.map((categorie) => (
              <option value={categorie} key={categorie} />
            ))}
          </datalist>
        </label>
      </div>

      <label>
        Nom du produit
        <input
          list={mode === 'stock' ? 'stock-product-options' : undefined}
          value={form.nom}
          onChange={(event) => {
            if (mode === 'stock') {
              const produit = productOptions.find((item) => item.nom === event.target.value)
              onChange({
                ...resetStockFields({ type: form.type, categorie: form.categorie, nom: event.target.value }),
                seuil_alerte: produit?.seuil_alerte ?? form.seuil_alerte,
                cout_achat: produit?.cout_achat ?? form.cout_achat,
                prix_vente: produit?.prix_vente ?? form.prix_vente,
                prix_plafond: produit?.prix_plafond ?? form.prix_plafond,
                marge: produit?.marge ?? form.marge,
                commentaire: produit?.commentaire ?? form.commentaire,
              })
              return
            }

            onChange({ ...form, nom: event.target.value })
          }}
          placeholder="Produit existant ou nouveau"
          disabled={mode === 'stock' ? !form.categorie : false}
          required
        />
        {mode === 'stock' && (
          <datalist id="stock-product-options">
            {productOptions.map((produit) => (
              <option value={produit.nom} key={produit.id} />
            ))}
          </datalist>
        )}
      </label>

      <div className="two-cols">
        <label>
          Quantite a ajouter
          <input
            type="number"
            min="0"
            value={form.quantite}
            onChange={(event) => onChange({ ...form, quantite: Number(event.target.value) })}
          />
        </label>
        <label>
          Quantite dispo
          <input value={availableQuantity} readOnly />
        </label>
      </div>

      <div className="two-cols">
        <label>
          Prix d achat / cout (Ar)
          <FormattedNumberInput
            value={form.cout_achat}
            min={0}
            onValueChange={(cout_achat) =>
              onChange({
                ...form,
                cout_achat,
                marge: profitPercent(cout_achat, form.prix_vente),
              })
            }
          />
        </label>
        <label>
          Prix de vente (Ar)
          <FormattedNumberInput
            value={form.prix_vente}
            min={0}
            onValueChange={(prix_vente) =>
              onChange({
                ...form,
                prix_vente,
                marge: profitPercent(form.cout_achat, prix_vente),
              })
            }
          />
          <span className="profit-note">{profitLabel(form.cout_achat, form.prix_vente)}</span>
        </label>
      </div>

      <div className="two-cols">
        <label>
          Prix plafond (Ar)
          <FormattedNumberInput
            value={form.prix_plafond}
            min={0}
            onValueChange={(prix_plafond) => onChange({ ...form, prix_plafond })}
          />
          <span className="profit-note">{profitLabel(form.cout_achat, form.prix_plafond)}</span>
        </label>
        <label>
          Seuil alerte
          <input
            type="number"
            min="0"
            value={form.seuil_alerte}
            onChange={(event) => onChange({ ...form, seuil_alerte: Number(event.target.value) })}
          />
        </label>
      </div>

      <label>
        Commentaire
        <input
          value={form.commentaire ?? ''}
          onChange={(event) => onChange({ ...form, commentaire: event.target.value })}
        />
      </label>
    </>
  )
}

function DataHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action: ReactNode
}) {
  return (
    <div className="panel-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="primary-button compact-button" type="button" onClick={onClick}>
      <Plus size={18} aria-hidden="true" />
      Ajouter
    </button>
  )
}

function IconActions({
  canEdit,
  canDelete,
  canToggleActive = false,
  isActive = true,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  canEdit: boolean
  canDelete: boolean
  canToggleActive?: boolean
  isActive?: boolean
  onEdit: () => void
  onDelete: () => void
  onToggleActive?: () => void
}) {
  return (
    <div className="icon-actions">
      {canEdit && (
        <button type="button" className="icon-button" title="Modifier" aria-label="Modifier" onClick={onEdit}>
          <Pencil size={16} aria-hidden="true" />
        </button>
      )}
      {canToggleActive && onToggleActive && (
        <button
          type="button"
          className={`icon-button${isActive ? ' danger-icon' : ''}`}
          title={isActive ? 'Desactiver' : 'Activer'}
          aria-label={isActive ? 'Desactiver' : 'Activer'}
          onClick={onToggleActive}
        >
          <Power size={16} aria-hidden="true" />
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          className="icon-button danger-icon"
          title="Supprimer"
          aria-label="Supprimer"
          onClick={onDelete}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      )}
    </div>
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

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-cell">
        Aucun element a afficher.
      </td>
    </tr>
  )
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function profitLabel(cout: number, prix: number) {
  if (!cout) return '0% benefice'
  return `${(((prix - cout) / cout) * 100).toFixed(1)}% benefice`
}

function profitPercent(cout: number, prix: number) {
  if (!cout) return 0
  return Number((((prix - cout) / cout) * 100).toFixed(2))
}

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function stateLabel(value?: string | null) {
  if (value === 'ENVOYE_FOURNISSEUR') return 'Envoye fournisseur'
  if (value === 'RETOUR_REINTEGRE') return 'Retour, revendable'
  if (value === 'REGLE') return 'Regle'
  return 'A retourner'
}

function cloneProductForm(value: ProduitCreate): ProduitCreate {
  return {
    ...value,
    commentaire: value.commentaire ?? '',
    partner_name: value.partner_name ?? null,
  }
}

function normalizeProductForm(value: ProduitCreate): ProduitCreate {
  const type = value.type.trim()
  const categorie = value.categorie.trim()
  const nom = value.nom.trim()
  const cout_achat = Number(value.cout_achat) || 0
  const prix_vente = Number(value.prix_vente) || 0
  const is_partner = Boolean(value.is_partner)

  return {
    ...value,
    type,
    categorie,
    nom,
    quantite: Math.max(0, Number(value.quantite) || 0),
    seuil_alerte: Math.max(0, Number(value.seuil_alerte) || 0),
    cout_achat,
    prix_vente,
    prix_plafond: Math.max(0, Number(value.prix_plafond) || 0),
    marge: profitPercent(cout_achat, prix_vente),
    commentaire: value.commentaire?.trim() ?? '',
    is_partner,
    partner_name: is_partner ? (value.partner_name?.trim() || null) : null,
  }
}

function matchesProductIdentity(produit: Produit, form: ProduitCreate) {
  return (
    produit.nom.trim().toLowerCase() === form.nom.trim().toLowerCase() &&
    produit.type.trim().toLowerCase() === form.type.trim().toLowerCase() &&
    produit.categorie.trim().toLowerCase() === form.categorie.trim().toLowerCase() &&
    Boolean(produit.is_partner) === Boolean(form.is_partner)
  )
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
