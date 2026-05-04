import { Check, Pencil, Plus, Save, Search, Send, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { FormattedNumberInput } from '../common/FormattedNumberInput'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import { dateLabel, money } from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notifications'
import type { FormEvent } from 'react'
import type { ReactNode } from 'react'
import type { EtatProduit, EtatProduitStatus, Produit, ProduitCreate } from '../../types'

type StockSection = 'types' | 'categories' | 'stock' | 'arrivals' | 'states'

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
  const [stateForm, setStateForm] = useState({
    produit_id: '',
    quantite: 1,
    statut_retour: 'A_RETOURNER' as EtatProduitStatus,
    commentaire: '',
  })

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
  const arrivalRows = useMemo(() => {
    const today = new Date()
    const month = today.getMonth()
    const year = today.getFullYear()

    return produits
      .filter((produit) => {
        const reference = produit.updated_at ?? produit.created_at
        if (!reference) return false
        const date = new Date(reference)
        return date.getMonth() === month && date.getFullYear() === year
      })
      .sort((a, b) => {
        const left = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
        const right = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
        return left - right
      })
  }, [produits])

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
      ].some((field) => field.toLowerCase().includes(value))
    })
  }, [etatsProduits, productsById, stateSearch])
  const selectedStateProduct = productsById.get(Number(stateForm.produit_id))
  const { pageItems: paginatedTypeRows, controls: typePagination } = usePaginatedItems(typeRows)
  const { pageItems: paginatedCategoryRows, controls: categoryPagination } = usePaginatedItems(categoryRows)
  const { pageItems: paginatedArrivalRows, controls: arrivalPagination } = usePaginatedItems(arrivalRows)
  const { pageItems: paginatedEtatsProduits, controls: statePagination } = usePaginatedItems(filteredEtatsProduits)
  const { pageItems: paginatedFilteredProducts, controls: productPagination } = usePaginatedItems(filteredProducts)

  useEffect(() => {
    if (section !== 'states') return

    void loadEtatsProduits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, showAllStates])

  async function loadEtatsProduits() {
    try {
      const result = await api.etatsProduits(token, showAllStates)
      setEtatsProduits(result.items)
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Chargement etat produit impossible')
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
                <th>Actions</th>
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
                  <td data-label="Actions">
                    <IconActions
                      canDelete={canDeleteStock}
                      onEdit={() => setGroupEditor({ kind: 'type', label: row.type, value: row.type })}
                      onDelete={() => onDeleteType(row.type)}
                    />
                  </td>
                </tr>
              ))}
              {typeRows.length === 0 && <EmptyRow colSpan={4} />}
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
                <th>Actions</th>
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
                  <td data-label="Actions">
                    <IconActions
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
                </tr>
              ))}
              {categoryRows.length === 0 && <EmptyRow colSpan={4} />}
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
              {canManageStock && (
                <button
                  className={isStateFormOpen ? 'ghost-button compact-button' : 'primary-button compact-button'}
                  type="button"
                  onClick={() => setStateFormOpen((current) => !current)}
                >
                  <Plus size={18} aria-hidden="true" />
                  {isStateFormOpen ? 'Fermer ajout' : 'Ajouter un etat'}
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
                <th>Actions</th>
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
                  </tr>
                )
              })}
              {filteredEtatsProduits.length === 0 && <EmptyRow colSpan={8} />}
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
        <DataHeader eyebrow="Article" title="Arrivage du mois" action={canManageStock ? <AddButton onClick={() => setProductModalOpen(true)} /> : null} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Type</th>
                <th>Categorie</th>
                <th>Stock</th>
                <th>Prix vente</th>
                <th>Mise a jour</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedArrivalRows.map((produit) => (
                <tr key={produit.id}>
                  <td data-label="Produit">
                    <strong>{produit.nom}</strong>
                    <span>{produit.commentaire || 'Sans commentaire'}</span>
                  </td>
                  <td data-label="Type">{produit.type}</td>
                  <td data-label="Categorie">{produit.categorie}</td>
                  <td data-label="Stock">{produit.quantite}</td>
                  <td data-label="Prix vente">{money(produit.prix_vente)}</td>
                  <td data-label="Mise a jour">{dateLabel(produit.updated_at ?? produit.created_at)}</td>
                  <td data-label="Statut">
                    <span className={produit.updated_at ? 'pill info' : 'pill ok'}>
                      {produit.updated_at ? 'Modifie ce mois' : 'Ajoute ce mois'}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <IconActions
                      canDelete={canDeleteStock}
                      onEdit={() => openEditProduct(produit)}
                      onDelete={() => onDeleteProduct(produit.id)}
                    />
                  </td>
                </tr>
              ))}
              {arrivalRows.length === 0 && <EmptyRow colSpan={8} />}
            </tbody>
          </table>
        </div>
        <PaginationControls {...arrivalPagination} />
        {renderProductModal()}
        {renderEditProductModal()}
      </article>
    )
  }

  return (
    <article className="panel view-stack">
      <DataHeader
        eyebrow="Article"
        title="Stock"
        action={canManageStock ? <AddButton onClick={() => setProductModalOpen(true)} /> : null}
      />
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
              <th>Cout (Ar)</th>
              <th>Prix vente (Ar)</th>
              <th>Marge</th>
              <th>Partenaire</th>
              <th>Date update</th>
              <th>Etat</th>
              <th>Actions</th>
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
                <td data-label="Cout">{money(produit.cout_achat)}</td>
                <td data-label="Prix vente">{money(produit.prix_vente)}</td>
                <td data-label="Marge">{profitLabel(produit.cout_achat, produit.prix_vente)}</td>
                <td data-label="Partenaire">
                  {produit.is_partner ? (
                    <span className="pill info">{produit.partner_name || 'Partenaire'}</span>
                  ) : (
                    '-'
                  )}
                </td>
                <td data-label="Date update">{dateLabel(produit.updated_at)}</td>
                <td data-label="Etat">
                  <span className={produit.quantite <= produit.seuil_alerte ? 'pill warn' : 'pill ok'}>
                    {produit.quantite <= produit.seuil_alerte ? 'Alerte' : 'OK'}
                  </span>
                </td>
                <td data-label="Actions">
                  <IconActions
                    canDelete={canDeleteStock}
                    onEdit={() => openEditProduct(produit)}
                    onDelete={() => onDeleteProduct(produit.id)}
                  />
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && <EmptyRow colSpan={11} />}
          </tbody>
        </table>
      </div>
      <PaginationControls {...productPagination} />

      {renderProductModal()}
      {renderEditProductModal()}
    </article>
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
  canDelete,
  onEdit,
  onDelete,
}: {
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="icon-actions">
      <button type="button" className="icon-button" title="Modifier" aria-label="Modifier" onClick={onEdit}>
        <Pencil size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="icon-button danger-icon"
        title="Supprimer"
        aria-label="Supprimer"
        onClick={onDelete}
        disabled={!canDelete}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
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
