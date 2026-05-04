import { Check, ChevronDown, ChevronUp, Pencil, Plus, Printer, ReceiptText, Send, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Fragment, useMemo, useState } from 'react'
import { api } from '../../api'
import { STORE_NAME } from '../../constants'
import { FormattedNumberInput } from '../common/FormattedNumberInput'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import { dateLabel, money } from '../../utils/format'
import { confirmAction, notifyError, notifySuccess } from '../../utils/notifications'
import type { FormEvent, ReactNode } from 'react'
import type { Produit, Transfert, Vente } from '../../types'

type SaleSection = 'list' | 'create' | 'transfer'

type CartLine = {
  produit_id: number
  nom: string
  partner_name?: string | null
  quantite: number
  prix_unitaire: number
  reduction: number
}

type SalesPageProps = {
  section: SaleSection
  produits: Produit[]
  ventes: Vente[]
  transferts: Transfert[]
  canManageSales: boolean
  token: string
  onRefresh: () => Promise<void>
}

export function SalesPage({
  section,
  produits,
  ventes,
  transferts,
  canManageSales,
  token,
  onRefresh,
}: SalesPageProps) {
  const [client, setClient] = useState('')
  const [type, setType] = useState('')
  const [categorie, setCategorie] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)
  const [lineDiscount, setLineDiscount] = useState(0)
  const [cartDiscount, setCartDiscount] = useState(0)
  const [comment, setComment] = useState('')
  const [transferDestination, setTransferDestination] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [editingSale, setEditingSale] = useState<Vente | null>(null)
  const [editClient, setEditClient] = useState('')
  const [editLines, setEditLines] = useState<CartLine[]>([])
  const [editType, setEditType] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editProductId, setEditProductId] = useState('')
  const [editQuantity, setEditQuantity] = useState(1)
  const [editPrice, setEditPrice] = useState(0)
  const [editLineDiscount, setEditLineDiscount] = useState(0)
  const [listType, setListType] = useState('')
  const [listCategory, setListCategory] = useState('')
  const [listProductId, setListProductId] = useState('')
  const [saleSearch, setSaleSearch] = useState('')
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null)
  const [appliedListFilters, setAppliedListFilters] = useState({
    type: '',
    categorie: '',
    productId: '',
    search: '',
  })

  const typeOptions = useMemo(() => unique(produits.map((produit) => produit.type)), [produits])
  const categoryOptions = useMemo(
    () => unique(produits.filter((produit) => !type || produit.type === type).map((produit) => produit.categorie)),
    [produits, type],
  )
  const productOptions = useMemo(
    () =>
      produits.filter(
        (produit) =>
          (!type || produit.type === type) &&
          (!categorie || produit.categorie === categorie),
      ),
    [categorie, produits, type],
  )
  const listCategoryOptions = useMemo(
    () => unique(produits.filter((produit) => !listType || produit.type === listType).map((produit) => produit.categorie)),
    [listType, produits],
  )
  const listProductOptions = useMemo(
    () =>
      produits.filter(
        (produit) =>
          (!listType || produit.type === listType) &&
          (!listCategory || produit.categorie === listCategory),
      ),
    [listCategory, listType, produits],
  )
  const selectedListProduct = produits.find((produit) => produit.id === Number(listProductId))
  const editCategoryOptions = useMemo(
    () => unique(produits.filter((produit) => !editType || produit.type === editType).map((produit) => produit.categorie)),
    [editType, produits],
  )
  const editProductOptions = useMemo(
    () =>
      produits.filter(
        (produit) =>
          (!editType || produit.type === editType) &&
          (!editCategory || produit.categorie === editCategory),
      ),
    [editCategory, editType, produits],
  )
  const filteredVentes = useMemo(
    () =>
      ventes.filter((vente) => {
        const matchesProductFilter =
          !appliedListFilters.type && !appliedListFilters.categorie && !appliedListFilters.productId
            ? true
            : (vente.details ?? []).some((detail) => {
          const produit = produits.find((item) => item.id === detail.produit_id)
          if (!produit) return false

          return (
            (!appliedListFilters.type || produit.type === appliedListFilters.type) &&
            (!appliedListFilters.categorie || produit.categorie === appliedListFilters.categorie) &&
            (!appliedListFilters.productId || produit.id === Number(appliedListFilters.productId))
          )
              })

        return (
          matchesProductFilter &&
          matchesSaleSearch(vente, appliedListFilters.search, produits)
        )
      }),
    [appliedListFilters, produits, ventes],
  )

  const selectedProduct = produits.find((produit) => produit.id === Number(productId))
  const selectedEditProduct = produits.find((produit) => produit.id === Number(editProductId))
  const { pageItems: paginatedVentes, controls: ventePagination } = usePaginatedItems(filteredVentes)
  const { pageItems: paginatedTransferts, controls: transfertPagination } = usePaginatedItems(transferts)
  const selectedProductAvailable = selectedProduct
    ? selectedProduct.quantite -
      cart
        .filter((line) => line.produit_id === selectedProduct.id)
        .reduce((total, line) => total + line.quantite, 0)
    : 0
  const currentLine: CartLine | null = selectedProduct
    ? {
        produit_id: selectedProduct.id,
        nom: selectedProduct.nom,
        partner_name: selectedProduct.is_partner ? selectedProduct.partner_name : null,
        quantite: quantity,
        prix_unitaire: price,
        reduction: lineDiscount,
      }
    : null
  const currentLineFinalPrice = currentLine ? lineTotal(currentLine) : 0
  const editProductAvailable = selectedEditProduct
    ? availableEditQuantity(selectedEditProduct.id, editLines, editingSale, produits)
    : 0
  const currentEditLine: CartLine | null = selectedEditProduct
    ? {
        produit_id: selectedEditProduct.id,
        nom: selectedEditProduct.nom,
        partner_name: selectedEditProduct.is_partner ? selectedEditProduct.partner_name : null,
        quantite: editQuantity,
        prix_unitaire: editPrice,
        reduction: editLineDiscount,
      }
    : null
  const subtotal = cart.reduce((total, line) => total + lineTotal(line), 0)
  const appliedCartDiscount = clampAmount(cartDiscount, subtotal)
  const total = Math.max(0, subtotal - appliedCartDiscount)
  const transferTotal = selectedProduct ? roundAmount(quantity * price) : 0

  function handleTypeChange(value: string) {
    setType(value)
    setCategorie('')
    setProductId('')
    setPrice(0)
  }

  function handleCategoryChange(value: string) {
    setCategorie(value)
    setProductId('')
    setPrice(0)
  }

  function handleProductChange(value: string) {
    setProductId(value)
    const produit = produits.find((item) => item.id === Number(value))
    setPrice(Number(produit?.prix_vente ?? 0))
  }

  function handleListTypeChange(value: string) {
    setListType(value)
    setListCategory('')
    setListProductId('')
  }

  function handleListCategoryChange(value: string) {
    setListCategory(value)
    setListProductId('')
  }

  function handleEditTypeChange(value: string) {
    setEditType(value)
    setEditCategory('')
    setEditProductId('')
    setEditPrice(0)
    setEditLineDiscount(0)
  }

  function handleEditCategoryChange(value: string) {
    setEditCategory(value)
    setEditProductId('')
    setEditPrice(0)
    setEditLineDiscount(0)
  }

  function handleEditProductChange(value: string) {
    setEditProductId(value)
    const produit = produits.find((item) => item.id === Number(value))
    setEditPrice(Number(produit?.prix_vente ?? 0))
    setEditLineDiscount(0)
  }

  function submitSaleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAppliedListFilters({
      type: listType,
      categorie: listCategory,
      productId: listProductId,
      search: saleSearch.trim(),
    })
    setExpandedSaleId(null)
  }

  function addToCart() {
    if (!selectedProduct) {
      notifyError('Choisis un produit.')
      return
    }

    if (quantity > selectedProductAvailable) {
      notifyError(`Quantite disponible: ${selectedProductAvailable}.`)
      return
    }

    setCart((current) => [
      ...current,
      {
        produit_id: selectedProduct.id,
        nom: selectedProduct.nom,
        partner_name: selectedProduct.is_partner ? selectedProduct.partner_name : null,
        quantite: quantity,
        prix_unitaire: price,
        reduction: lineDiscount,
      },
    ])
    setProductId('')
    setQuantity(1)
    setPrice(0)
    setLineDiscount(0)
  }

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (cart.length === 0) return

    try {
      const invalidLine = cart.find((line) => {
        const produit = produits.find((item) => item.id === line.produit_id)
        return !produit || line.quantite > produit.quantite
      })

      if (invalidLine) {
        notifyError(`Stock insuffisant pour ${invalidLine.nom}.`)
        return
      }

      await api.createVente(token, {
        client: client.trim() || 'Client comptoir',
        reduction_panier: appliedCartDiscount,
        details: buildSaleDetails(cart, appliedCartDiscount),
      })
      notifySuccess('Vente confirmee.')
      printReceipt(cart, client || 'Client comptoir', appliedCartDiscount, comment)
      resetSale()
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Creation vente impossible')
    }
  }

  async function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedProduct) {
      notifyError('Choisis un produit.')
      return
    }

    if (!transferDestination.trim()) {
      notifyError('Nom client ou point de vente obligatoire.')
      return
    }

    if (quantity > selectedProduct.quantite) {
      notifyError(`Stock disponible: ${selectedProduct.quantite}.`)
      return
    }

    if (price <= 0) {
      notifyError('Prix unitaire obligatoire.')
      return
    }

    try {
      await api.createTransfert(token, {
        produit_id: selectedProduct.id,
        quantite: quantity,
        prix_unitaire: price,
        point_vente: transferDestination.trim(),
        commentaire: comment.trim() || null,
      })
      notifySuccess('Transfert enregistre et notifie aux admins.')
      setTransferDestination('')
      setType('')
      setCategorie('')
      setProductId('')
      setQuantity(1)
      setPrice(0)
      setComment('')
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Transfert impossible')
    }
  }

  async function deleteSale(venteId: number) {
    const confirmed = await confirmAction('Supprimer cette vente ?', 'Le stock sera restaure.')
    if (!confirmed) return

    try {
      await api.deleteVente(token, venteId)
      notifySuccess('Vente supprimee.')
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Suppression vente impossible')
    }
  }

  async function updateTransferStatus(transfertId: number, statut: 'NON_PAYE' | 'PAYE' | 'REFUSE') {
    try {
      await api.updateTransfertStatus(token, transfertId, statut)
      notifySuccess(statut === 'REFUSE' ? 'Transfert refuse et stock retourne.' : 'Statut transfert mis a jour.')
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Mise a jour transfert impossible')
    }
  }

  function openEditSale(vente: Vente) {
    setEditingSale(vente)
    setEditClient(vente.client)
    setEditType('')
    setEditCategory('')
    setEditProductId('')
    setEditQuantity(1)
    setEditPrice(0)
    setEditLineDiscount(0)
    setEditLines(
      (vente.details ?? []).map((detail) => {
        const produit = produits.find((item) => item.id === detail.produit_id)
        return {
          produit_id: detail.produit_id,
          nom: produit?.nom ?? `Produit #${detail.produit_id}`,
          partner_name: detail.partner_name ?? produit?.partner_name ?? null,
          quantite: detail.quantite,
          prix_unitaire: Number(detail.prix_unitaire_initial ?? detail.prix_unitaire),
          reduction: Number(detail.reduction_ligne ?? 0),
        }
      }),
    )
  }

  function addEditLine() {
    if (!selectedEditProduct) {
      notifyError('Choisis un produit a ajouter.')
      return
    }

    if (editQuantity > editProductAvailable) {
      notifyError(`Quantite disponible: ${editProductAvailable}.`)
      return
    }

    setEditLines((current) => [
      ...current,
      {
        produit_id: selectedEditProduct.id,
        nom: selectedEditProduct.nom,
        partner_name: selectedEditProduct.is_partner ? selectedEditProduct.partner_name : null,
        quantite: editQuantity,
        prix_unitaire: editPrice,
        reduction: editLineDiscount,
      },
    ])
    setEditProductId('')
    setEditQuantity(1)
    setEditPrice(0)
    setEditLineDiscount(0)
  }

  function toggleSaleDetails(venteId: number) {
    setExpandedSaleId((current) => (current === venteId ? null : venteId))
  }

  async function submitEditSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingSale) return

    try {
      const invalidLine = editLines.find((line) => {
        return !produits.find((item) => item.id === line.produit_id) || line.quantite > availableEditQuantity(line.produit_id, editLines, editingSale, produits, line)
      })

      if (invalidLine) {
        notifyError(`Stock insuffisant pour ${invalidLine.nom}.`)
        return
      }

      await api.updateVente(token, editingSale.id, {
        client: editClient.trim() || 'Client comptoir',
        reduction_panier: 0,
        details: buildSaleDetails(editLines, 0),
      })
      setEditingSale(null)
      notifySuccess('Vente modifiee.')
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Modification vente impossible')
    }
  }

  function resetSale() {
    setClient('')
    setType('')
    setCategorie('')
    setProductId('')
    setQuantity(1)
    setPrice(0)
    setLineDiscount(0)
    setCartDiscount(0)
    setComment('')
    setTransferDestination('')
    setCart([])
  }

  if (section === 'list') {
    return (
      <article className="panel view-stack">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>Liste ventes</h2>
          </div>
          <ReceiptText size={20} aria-hidden="true" />
        </div>
        <form className="filter-form sales-filter-form" onSubmit={submitSaleSearch}>
          <label>
            Recherche
            <input
              value={saleSearch}
              onChange={(event) => setSaleSearch(event.target.value)}
              placeholder="Client, ticket ou produit"
            />
          </label>
          <label>
            Type
            <select value={listType} onChange={(event) => handleListTypeChange(event.target.value)}>
              <option value="">Tous les types</option>
              {typeOptions.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categorie
            <select
              value={listCategory}
              onChange={(event) => handleListCategoryChange(event.target.value)}
              disabled={!listType}
            >
              <option value="">Toutes les categories</option>
              {listCategoryOptions.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Produit
            <select
              value={listProductId}
              onChange={(event) => setListProductId(event.target.value)}
              disabled={!listCategory}
            >
              <option value="">Tous les produits</option>
              {listProductOptions.map((produit) => (
                <option key={produit.id} value={produit.id}>
                  {produit.nom}
                </option>
              ))}
            </select>
            {selectedListProduct?.is_partner && (
              <span className="profit-note">Partenaire: {selectedListProduct.partner_name}</span>
            )}
          </label>
          
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Client</th>
                <th>Date</th>
                <th>Total</th>
                <th>Vendeur</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVentes.map((vente) => {
                const isExpanded = expandedSaleId === vente.id
                const saleBenefit = calculateSaleBenefit(vente)

                return (
                  <Fragment key={vente.id}>
                    <tr
                      className={`clickable-row${isExpanded ? ' selected-row' : ''}`}
                      onClick={() => toggleSaleDetails(vente.id)}
                    >
                      <td data-label="Ticket">
                        <span className="expand-cell">
                          {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                          #{vente.id}
                        </span>
                      </td>
                      <td data-label="Client">{vente.client}</td>
                      <td data-label="Date">{dateLabel(vente.date_vente)}</td>
                      <td data-label="Total">{money(vente.total)}</td>
                      <td data-label="Vendeur">{vente.vendeur_id ?? '-'}</td>
                      <td data-label="Actions">
                        <div className="icon-actions">
                          <button
                            className="icon-button"
                            type="button"
                            title="Modifier"
                            onClick={(event) => {
                              event.stopPropagation()
                              openEditSale(vente)
                            }}
                            disabled={!canManageSales}
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            className="icon-button danger-icon"
                            type="button"
                            title="Supprimer"
                            onClick={(event) => {
                              event.stopPropagation()
                              void deleteSale(vente.id)
                            }}
                            disabled={!canManageSales}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="expanded-row">
                        <td colSpan={6} className="expanded-sale-cell">
                          <div className="sale-expanded">
                            <div className="sale-expanded-summary">
                              <div className="sale-summary-chip">
                                <span>Articles</span>
                                <strong>{(vente.details ?? []).length}</strong>
                              </div>
                              <div className="sale-summary-chip">
                                <span>Quantite totale</span>
                                <strong>{(vente.details ?? []).reduce((total, detail) => total + detail.quantite, 0)}</strong>
                                <small>Articles vendus</small>
                              </div>
                              <div className="sale-summary-chip">
                                <span>Benefice estime</span>
                                <strong>{money(saleBenefit)}</strong>
                                <small>{formatPercent(calculateSaleBenefitRate(vente, saleBenefit))} du total</small>
                              </div>
                            </div>
                            <div className="sale-detail-list">
                              {(vente.details ?? []).map((detail, index) => {
                                const produit = produits.find((item) => item.id === detail.produit_id)
                                const lineBenefit = calculateSaleDetailBenefit(detail)

                                return (
                                  <article className="sale-detail-card" key={`${vente.id}-${detail.produit_id}-${index}`}>
                                    <strong>{produit?.nom ?? `Produit #${detail.produit_id}`}</strong>
                                    <span>
                                      {produit?.type ?? 'Type inconnu'} / {produit?.categorie ?? 'Categorie inconnue'}
                                    </span>
                                    {detail.partner_name && <span>Partenaire: {detail.partner_name}</span>}
                                    <div className="sale-detail-metrics">
                                      <span>Quantite: {detail.quantite}</span>
                                      <span>Prix initial: {money(detail.prix_unitaire_initial ?? detail.prix_unitaire)}</span>
                                      <span>Prix unitaire: {money(detail.prix_unitaire)}</span>
                                      <span>Reduction ligne: -{money((detail.reduction_ligne ?? 0) * detail.quantite)}</span>
                                      <span>Part panier: -{money(detail.reduction_panier)}</span>
                                      <span>Total ligne: {money(detail.quantite * detail.prix_unitaire)}</span>
                                      <span>Prix achat: {money(detail.prix_achat)}</span>
                                      <span>Benefice ligne: {money(lineBenefit)}</span>
                                    </div>
                                  </article>
                                )
                              })}
                              {(vente.details ?? []).length === 0 && <p className="muted">Aucun detail pour cette vente.</p>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {filteredVentes.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    Aucune vente enregistree.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls {...ventePagination} />
        {editingSale && renderEditModal()}
      </article>
    )
  }

  if (section === 'transfer') {
    return (
      <section className="module-grid">
        <article className="panel module-side">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Ventes</p>
              <h2>Nouveau transfert</h2>
            </div>
            <Send size={20} aria-hidden="true" />
          </div>
          <form className="compact-form" onSubmit={submitTransfer}>
            <label>
              Type
              <select value={type} onChange={(event) => handleTypeChange(event.target.value)}>
                <option value="">Selectionner un type</option>
                {typeOptions.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
            ))}
          </select>
          {selectedProduct?.is_partner && (
            <span className="profit-note">Partenaire: {selectedProduct.partner_name}</span>
          )}
        </label>
            <label>
              Categorie
              <select value={categorie} onChange={(event) => handleCategoryChange(event.target.value)} disabled={!type}>
                <option value="">Selectionner une categorie</option>
                {categoryOptions.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Produit
              <select value={productId} onChange={(event) => handleProductChange(event.target.value)} disabled={!categorie}>
                <option value="">Selectionner un produit</option>
                {productOptions.map((produit) => (
                  <option key={produit.id} value={produit.id}>
                    {productOptionLabel(produit)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Client ou point de vente
              <input
                required
                value={transferDestination}
                onChange={(event) => setTransferDestination(event.target.value)}
              />
            </label>
            <div className="two-cols">
              <label>
                Quantite
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, selectedProduct?.quantite ?? 1)}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
                {selectedProduct && <span className="profit-note">Stock disponible: {selectedProduct.quantite}</span>}
              </label>
              <label>
                Prix unitaire
                <FormattedNumberInput
                  value={price}
                  min={0.01}
                  onValueChange={setPrice}
                />
              </label>
            </div>
            <label>
              Commentaire
              <input
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </label>
            <div className="ticket-summary">
              <div className="ticket-total">
                <span>Total transfert</span>
                <strong>{money(transferTotal)}</strong>
              </div>
            </div>
            <button className="primary-button" type="submit" disabled={!selectedProduct}>
              <Send size={18} aria-hidden="true" />
              Transferer
            </button>
          </form>
        </article>

        <article className="panel module-main">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Historique</p>
              <h2>Derniers transferts</h2>
            </div>
            <ReceiptText size={20} aria-hidden="true" />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Point de vente</th>
                  <th>Quantite</th>
                  <th>Prix unitaire</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransferts.map((transfert) => (
                  <tr key={transfert.id}>
                    <td data-label="Produit">
                      <strong>{transfert.produit?.nom ?? `Produit #${transfert.produit_id}`}</strong>
                      <span>
                        {transfert.produit?.type ?? '-'} / {transfert.produit?.categorie ?? '-'}
                      </span>
                    </td>
                    <td data-label="Point de vente">{transfert.point_vente}</td>
                    <td data-label="Quantite">{transfert.quantite}</td>
                    <td data-label="Prix unitaire">{money(transfert.prix_unitaire)}</td>
                    <td data-label="Statut">
                      <span className={transfert.statut === 'PAYE' ? 'pill ok' : 'pill warn'}>
                        {transferStatusLabel(transfert.statut)}
                      </span>
                    </td>
                    <td data-label="Date">{dateLabel(transfert.created_at)}</td>
                    <td data-label="Action">
                      <select
                        value={transfert.statut}
                        onChange={(event) => void updateTransferStatus(transfert.id, event.target.value as 'NON_PAYE' | 'PAYE' | 'REFUSE')}
                      >
                        <option value="NON_PAYE">Non paye</option>
                        <option value="PAYE">Paye</option>
                        <option value="REFUSE">Refuser</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {transferts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      Aucun transfert enregistre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls {...transfertPagination} />
        </article>
      </section>
    )
  }

  return (
    <section className="module-grid">
      <article className="panel module-side">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Caisse</p>
            <h2>Nouvelle vente</h2>
          </div>
          <Plus size={20} aria-hidden="true" />
        </div>
        <div className="compact-form">
          <label>
            Type
            <select value={type} onChange={(event) => handleTypeChange(event.target.value)}>
              <option value="">Selectionner un type</option>
              {typeOptions.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categorie
            <select value={categorie} onChange={(event) => handleCategoryChange(event.target.value)} disabled={!type}>
              <option value="">Selectionner une categorie</option>
              {categoryOptions.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Produit
            <select value={productId} onChange={(event) => handleProductChange(event.target.value)} disabled={!categorie}>
              <option value="">Selectionner un produit</option>
              {productOptions.map((produit) => (
                <option key={produit.id} value={produit.id}>
                  {productOptionLabel(produit)}
                </option>
              ))}
            </select>
          </label>
          <div className="two-cols">
            <label>
              Prix unitaire
              <input value={selectedProduct ? money(price) : ''} readOnly />
            </label>
            <label>
              Prix final produit
              <input value={selectedProduct ? money(currentLineFinalPrice) : ''} readOnly />
            </label>
          </div>
          <div className="two-cols">
            <label>
              Quantite
              <input
                type="number"
                min="1"
                max={Math.max(1, selectedProductAvailable)}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
              {selectedProduct && <span className="profit-note">Stock disponible: {selectedProductAvailable}</span>}
            </label>
          </div>
          <label>
            Reduction ligne (Ar)
            <FormattedNumberInput
              value={lineDiscount}
              min={0}
              onValueChange={setLineDiscount}
            />
          </label>
          <label>
            Montant apres reduction
            <input value={currentLine ? money(unitPriceAfterLineDiscount(currentLine)) : ''} readOnly />
          </label>
          <button className="ghost-button" type="button" onClick={addToCart}>
            <Plus size={18} aria-hidden="true" />
            Ajouter
          </button>
        </div>
      </article>

      <article className="panel module-main">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Panier</p>
            <h2>Panier a imprimer</h2>
          </div>
          <button
            className="ghost-button compact-button"
            type="button"
            onClick={() => printReceipt(cart, client || 'Client comptoir', appliedCartDiscount, comment)}
            disabled={cart.length === 0}
          >
            <Printer size={16} aria-hidden="true" />
            Imprimer
          </button>
        </div>
        <form className="compact-form sales-summary-form" onSubmit={submitSale}>
          <div className="sales-summary-fields">
            <label>
              Nom client
              <input
                value={client}
                onChange={(event) => setClient(event.target.value)}
              />
            </label>
            <label>
              Reduction panier (Ar)
              <FormattedNumberInput
                value={cartDiscount}
                min={0}
                onValueChange={setCartDiscount}
              />
            </label>
          </div>
          <label>
            Commentaire
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          <div className="sales-summary-actions">
            <button className="primary-button" disabled={cart.length === 0} type="submit">
              <Check size={18} aria-hidden="true" />
              Confirmer la vente
            </button>
          </div>
          <div className="ticket-lines">
            {cart.map((line, index) => (
              <div className="ticket-line" key={`${line.produit_id}-${index}`}>
                <span>
                  {line.nom} x {line.quantite}
                  {line.partner_name ? ` - partenaire ${line.partner_name}` : ''}
                  {line.reduction ? ` - remise ${money(line.reduction)}` : ''}
                </span>
                <strong>{money(lineTotal(line))}</strong>
                <button type="button" aria-label="Retirer ligne" onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
            {cart.length === 0 && <p className="muted">Panier vide.</p>}
          </div>
          <div className="ticket-summary">
            <div className="ticket-total">
              <span>Sous-total</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="ticket-total ticket-total-muted">
              <span>Reduction panier</span>
              <strong>-{money(appliedCartDiscount)}</strong>
            </div>
            <div className="ticket-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
          </div>
        </form>
      </article>
    </section>
  )

  function renderEditModal() {
    if (!editingSale) return null

    return (
      <Modal title={`Modifier vente #${editingSale.id}`} onClose={() => setEditingSale(null)}>
        <form className="modal-form" onSubmit={submitEditSale}>
          <label>
            Client
            <input value={editClient} onChange={(event) => setEditClient(event.target.value)} />
          </label>
          <div className="sale-edit-builder">
            <div className="two-cols">
              <label>
                Type
                <select value={editType} onChange={(event) => handleEditTypeChange(event.target.value)}>
                  <option value="">Selectionner un type</option>
                  {typeOptions.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Categorie
                <select value={editCategory} onChange={(event) => handleEditCategoryChange(event.target.value)} disabled={!editType}>
                  <option value="">Selectionner une categorie</option>
                  {editCategoryOptions.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Produit
              <select value={editProductId} onChange={(event) => handleEditProductChange(event.target.value)} disabled={!editCategory}>
                <option value="">Selectionner un produit</option>
                {editProductOptions.map((produit) => (
                  <option key={produit.id} value={produit.id}>
                    {productOptionLabel(produit)}
                  </option>
                ))}
              </select>
            </label>
            <div className="two-cols">
              <label>
                Quantite
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, editProductAvailable)}
                  value={editQuantity}
                  onChange={(event) => setEditQuantity(Number(event.target.value))}
                />
                {selectedEditProduct && <span className="profit-note">Stock disponible: {editProductAvailable}</span>}
              </label>
              <label>
                Prix unitaire initial
                <FormattedNumberInput value={editPrice} min={0} onValueChange={setEditPrice} />
              </label>
            </div>
            <div className="two-cols">
              <label>
                Reduction ligne
                <FormattedNumberInput value={editLineDiscount} min={0} onValueChange={setEditLineDiscount} />
              </label>
              <label>
                Montant apres reduction
                <input value={currentEditLine ? money(unitPriceAfterLineDiscount(currentEditLine)) : ''} readOnly />
              </label>
            </div>
            <button className="ghost-button" type="button" onClick={addEditLine} disabled={!selectedEditProduct}>
              <Plus size={16} aria-hidden="true" />
              Ajouter article
            </button>
          </div>
          {editLines.map((line, index) => (
            <div className="sale-edit-line" key={`${line.produit_id}-${index}`}>
              <div className="two-cols">
                <label>
                  Produit
                  <input value={line.nom} readOnly />
                </label>
                <label>
                  Quantite
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, availableEditQuantity(line.produit_id, editLines, editingSale, produits, line))}
                    value={line.quantite}
                    onChange={(event) =>
                      setEditLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, quantite: Number(event.target.value) } : item,
                        ),
                      )
                    }
                  />
                </label>
              </div>
              <div className="two-cols">
                <label>
                  Prix unitaire initial
                  <FormattedNumberInput
                    value={line.prix_unitaire}
                    min={0}
                    onValueChange={(prix_unitaire) =>
                      setEditLines((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, prix_unitaire } : item)),
                      )
                    }
                  />
                </label>
                <label>
                  Reduction ligne
                  <FormattedNumberInput
                    value={line.reduction}
                    min={0}
                    onValueChange={(reduction) =>
                      setEditLines((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, reduction } : item)),
                      )
                    }
                  />
                </label>
              </div>
              <div className="ticket-line sale-edit-line-summary">
                <span>Montant final ligne</span>
                <strong>{money(lineTotal(line))}</strong>
                <button
                  type="button"
                  aria-label="Retirer ligne"
                  onClick={() => setEditLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          <button className="primary-button" type="submit">
            <Check size={18} aria-hidden="true" />
            Enregistrer
          </button>
        </form>
      </Modal>
    )
  }
}

function lineTotal(line: CartLine) {
  return roundAmount(line.quantite * unitPriceAfterLineDiscount(line))
}

function unitPriceAfterLineDiscount(line: CartLine) {
  return Math.max(0, line.prix_unitaire - clampAmount(line.reduction, line.prix_unitaire))
}

function buildSaleDetails(lines: CartLine[], cartDiscount: number) {
  const subtotal = lines.reduce((total, line) => total + lineTotal(line), 0)
  const appliedCartDiscount = clampAmount(cartDiscount, subtotal)
  let remainingDiscount = appliedCartDiscount

  return lines.map((line, index) => {
    const baseLineTotal = lineTotal(line)
    const lineCartDiscountShare =
      index === lines.length - 1 || subtotal === 0
        ? remainingDiscount
        : roundAmount((appliedCartDiscount * baseLineTotal) / subtotal)

    remainingDiscount = roundAmount(Math.max(0, remainingDiscount - lineCartDiscountShare))

    return {
      produit_id: line.produit_id,
      quantite: line.quantite,
      prix_unitaire_initial: line.prix_unitaire,
      prix_unitaire:
        line.quantite > 0
          ? roundAmount(Math.max(0, baseLineTotal - lineCartDiscountShare) / line.quantite)
          : 0,
      reduction_ligne: line.reduction,
      reduction_panier: lineCartDiscountShare,
    }
  })
}

function clampAmount(value: number, maxValue = Number.POSITIVE_INFINITY) {
  return Math.min(maxValue, Math.max(0, Number(value) || 0))
}

function roundAmount(value: number) {
  return Number(value.toFixed(2))
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function productOptionLabel(produit: Produit) {
  return `${produit.nom} - stock ${produit.quantite}${produit.is_partner ? ` - partenaire ${produit.partner_name ?? ''}` : ''}`
}

function availableEditQuantity(
  produitId: number,
  editLines: CartLine[],
  sale: Vente | null,
  produits: Produit[],
  currentLine?: CartLine,
) {
  const produit = produits.find((item) => item.id === produitId)
  const existingSaleQuantity = (sale?.details ?? [])
    .filter((detail) => detail.produit_id === produitId)
    .reduce((total, detail) => total + detail.quantite, 0)
  const usedByOtherLines = editLines
    .filter((line) => line.produit_id === produitId && line !== currentLine)
    .reduce((total, line) => total + line.quantite, 0)

  return Math.max(1, (produit?.quantite ?? 0) + existingSaleQuantity - usedByOtherLines)
}

function matchesSaleSearch(vente: Vente, query: string, produits: Produit[]) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return true

  const searchableValues = [
    vente.client,
    String(vente.id),
    `#${vente.id}`,
    ...(vente.details ?? []).flatMap((detail) => {
      const produit = produits.find((item) => item.id === detail.produit_id)
      return [produit?.nom ?? '', produit?.type ?? '', produit?.categorie ?? '', detail.partner_name ?? '']
    }),
  ]

  return searchableValues.some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
}

function calculateSaleDetailBenefit(detail: NonNullable<Vente['details']>[number]) {
  const purchasePrice = Number(detail.prix_achat ?? 0)
  const unitPrice = Number(detail.prix_unitaire ?? 0)
  return roundAmount((unitPrice - purchasePrice) * detail.quantite)
}

function calculateSaleBenefit(vente: Vente) {
  return roundAmount((vente.details ?? []).reduce((total, detail) => total + calculateSaleDetailBenefit(detail), 0))
}

function calculateSaleBenefitRate(vente: Vente, saleBenefit = calculateSaleBenefit(vente)) {
  const saleTotal = Number(vente.total ?? 0)
  if (saleTotal <= 0) return 0
  return (saleBenefit / saleTotal) * 100
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`
}

function transferStatusLabel(value?: string) {
  if (value === 'PAYE') return 'Paye'
  if (value === 'REFUSE') return 'Refuse'
  return 'Non paye'
}

function printReceipt(lines: CartLine[], client: string, discount: number, comment: string) {
  if (lines.length === 0) return

  const subtotal = lines.reduce((total, line) => total + lineTotal(line), 0)
  const appliedCartDiscount = clampAmount(discount, subtotal)
  const total = Math.max(0, subtotal - appliedCartDiscount)
  const popup = window.open('', 'facture', 'width=360,height=620')
  if (!popup) return

  popup.document.write(`
    <html>
      <head>
        <title>Facture</title>
        <style>
          body { font-family: monospace; width: 280px; margin: 16px auto; color: #111; }
          h1 { font-size: 16px; text-align: center; margin: 0 0 8px; }
          .line, .total { display: flex; justify-content: space-between; gap: 10px; margin: 6px 0; }
          .total { border-top: 1px dashed #111; padding-top: 8px; font-weight: bold; }
          small { display: block; text-align: center; margin-top: 12px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(STORE_NAME)}</h1>
        <div>Client: ${escapeHtml(client)}</div>
        <div>Date: ${new Date().toLocaleString('fr-FR')}</div>
        <hr />
        ${lines
          .map(
            (line) => `
              <div>${escapeHtml(line.nom)} x ${line.quantite}${line.partner_name ? ` - partenaire ${escapeHtml(line.partner_name)}` : ''}</div>
              <div class="line"><span>${line.reduction ? `Remise ${money(line.reduction)}` : ''}</span><span>${money(lineTotal(line))}</span></div>
            `,
          )
          .join('')}
        <div class="line"><span>Sous-total</span><span>${money(subtotal)}</span></div>
        <div class="line"><span>Remise panier</span><span>-${money(appliedCartDiscount)}</span></div>
        <div class="total"><span>Total</span><span>${money(total)}</span></div>
        ${comment ? `<p>${escapeHtml(comment)}</p>` : ''}
        <small>Merci</small>
        <script>window.print()</script>
      </body>
    </html>
  `)
  popup.document.close()
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return entities[char]
  })
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
