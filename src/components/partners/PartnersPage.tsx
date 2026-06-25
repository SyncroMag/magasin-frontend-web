import { Check, Handshake, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { FormattedNumberInput } from '../common/FormattedNumberInput'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import { confirmAction, importantAlert, notifyError, notifySuccess } from '../../utils/notifications'
import { dateLabel, dateSearchValues, money } from '../../utils/format'
import type { FormEvent } from 'react'
import type { PartnerPayout, Produit, ProduitCreate } from '../../types'

type PartnersPageProps = {
  produits: Produit[]
  token: string
  canManage: boolean
  canDelete: boolean
  onRefresh: () => Promise<void>
}

const emptyPartnerProduct: ProduitCreate = {
  type: '',
  categorie: '',
  nom: '',
  quantite: 0,
  seuil_alerte: 2,
  cout_achat: 0,
  prix_vente: 0,
  prix_plafond: 0,
  marge: 0,
  commentaire: '',
  is_partner: true,
  partner_name: '',
}

export function PartnersPage({ produits, token, canManage, canDelete, onRefresh }: PartnersPageProps) {
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<ProduitCreate>(emptyPartnerProduct)
  const [editingProduct, setEditingProduct] = useState<Produit | null>(null)
  const [isFormOpen, setFormOpen] = useState(false)
  const [pendingPayouts, setPendingPayouts] = useState<PartnerPayout[]>([])
  const [ledgerPayouts, setLedgerPayouts] = useState<PartnerPayout[]>([])
  const [payoutQuery, setPayoutQuery] = useState('')

  const partnerProducts = useMemo(
    () => produits.filter((produit) => produit.is_partner),
    [produits],
  )
  const typeOptions = useMemo(() => unique(produits.map((produit) => produit.type)), [produits])
  const categoryOptions = useMemo(
    () =>
      unique(
        produits
          .filter((produit) => !form.type || produit.type === form.type)
          .map((produit) => produit.categorie),
      ),
    [form.type, produits],
  )
  const productOptions = useMemo(
    () =>
      partnerProducts.filter(
        (produit) =>
          (!form.type || produit.type === form.type) &&
          (!form.categorie || produit.categorie === form.categorie),
      ),
    [form.categorie, form.type, partnerProducts],
  )
  const filteredProducts = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return partnerProducts

    return partnerProducts.filter((produit) =>
      [
        produit.type,
        produit.categorie,
        produit.nom,
        produit.partner_name ?? '',
        ...dateSearchValues(produit.created_at),
        ...dateSearchValues(produit.updated_at),
      ].some((field) =>
        field.toLowerCase().includes(value),
      ),
    )
  }, [partnerProducts, query])
  const { pageItems: paginatedProducts, controls: productPagination } = usePaginatedItems(filteredProducts)
  const filteredPendingPayouts = useMemo(
    () => filterPayouts(pendingPayouts, payoutQuery),
    [payoutQuery, pendingPayouts],
  )
  const filteredLedgerPayouts = useMemo(
    () => filterPayouts(ledgerPayouts, payoutQuery),
    [ledgerPayouts, payoutQuery],
  )
  const pendingTotals = useMemo(() => payoutTotals(filteredPendingPayouts), [filteredPendingPayouts])
  const ledgerTotals = useMemo(() => payoutTotals(filteredLedgerPayouts), [filteredLedgerPayouts])
  const { pageItems: paginatedPendingPayouts, controls: pendingPayoutPagination } = usePaginatedItems(filteredPendingPayouts)
  const { pageItems: paginatedLedgerPayouts, controls: ledgerPayoutPagination } = usePaginatedItems(filteredLedgerPayouts)
  const matchingProduct = partnerProducts.find(
    (produit) =>
      produit.nom.trim().toLowerCase() === form.nom.trim().toLowerCase() &&
      produit.type.trim().toLowerCase() === form.type.trim().toLowerCase() &&
      produit.categorie.trim().toLowerCase() === form.categorie.trim().toLowerCase(),
  )

  useEffect(() => {
    void loadPartnerPayouts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadPartnerPayouts() {
    try {
      const [pending, all] = await Promise.all([
        api.partnerPayouts(token, 'pending'),
        api.partnerPayouts(token, 'all'),
      ])
      setPendingPayouts(pending)
      setLedgerPayouts(all)
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Chargement ventes partenaire impossible')
    }
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload: ProduitCreate = {
      ...form,
      type: form.type.trim(),
      categorie: form.categorie.trim(),
      nom: form.nom.trim(),
      partner_name: (form.partner_name ?? '').trim(),
      is_partner: true,
    }

    if (!payload.partner_name) {
      notifyError('Nom partenaire obligatoire.')
      return
    }

    try {
      if (editingProduct) {
        const result = await api.updateProduit(token, editingProduct.id, payload)
        await showMutationResult(result, 'Article partenaire modifie.')
      } else if (matchingProduct) {
        const result = await api.updateProduit(token, matchingProduct.id, {
          ...payload,
          quantite: matchingProduct.quantite + Number(payload.quantite),
        })
        await showMutationResult(result, 'Article partenaire mis a jour.')
      } else {
        await api.createProduit(token, payload)
        notifySuccess('Article partenaire ajoute.')
      }

      resetForm()
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Operation partenaire impossible')
    }
  }

  function editProduct(produit: Produit) {
    setEditingProduct(produit)
    setFormOpen(true)
    setForm({
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
      is_partner: true,
      partner_name: produit.partner_name ?? '',
    })
  }

  async function deleteProduct(produit: Produit) {
    const confirmed = await confirmAction('Supprimer cet article partenaire ?', 'Cette action retire le produit du stock actif.')
    if (!confirmed) return

    try {
      await api.deleteProduit(token, produit.id)
      notifySuccess('Article partenaire supprime.')
      await onRefresh()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Suppression partenaire impossible')
    }
  }

  async function markPayoutPaid(payout: PartnerPayout) {
    const confirmed = await confirmAction(
      'Marquer ce retour comme paye ?',
      'La ligne sera retiree de la liste a payer et restera dans le grand livre partenaire.',
    )
    if (!confirmed) return

    try {
      await api.markPartnerPayoutPaid(token, payout.id)
      notifySuccess('Retour partenaire marque paye.')
      await loadPartnerPayouts()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Paiement partenaire impossible')
    }
  }

  function resetForm() {
    setEditingProduct(null)
    setForm(emptyPartnerProduct)
    setFormOpen(false)
  }

  return (
    <section className="view-stack">
      {isFormOpen && (
      <article className="panel view-stack">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Partenaire</p>
            <h2>{editingProduct ? 'Modifier article' : 'Nouvel article'}</h2>
          </div>
          <Handshake size={20} aria-hidden="true" />
        </div>
        <form className="compact-form" onSubmit={submitProduct}>
          <div className="two-cols">
            <label>
              Type
              <input
                list="partner-type-options"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value, categorie: '', nom: '' })}
                required
              />
              <datalist id="partner-type-options">
                {typeOptions.map((type) => (
                  <option value={type} key={type} />
                ))}
              </datalist>
            </label>
            <label>
              Categorie
              <input
                list="partner-category-options"
                value={form.categorie}
                onChange={(event) => setForm({ ...form, categorie: event.target.value, nom: '' })}
                disabled={!form.type}
                required
              />
              <datalist id="partner-category-options">
                {categoryOptions.map((categorie) => (
                  <option value={categorie} key={categorie} />
                ))}
              </datalist>
            </label>
          </div>
          <label>
            Produit
            <input
              list="partner-product-options"
              value={form.nom}
              onChange={(event) => {
                const produit = productOptions.find((item) => item.nom === event.target.value)
                setForm({
                  ...form,
                  nom: event.target.value,
                  seuil_alerte: produit?.seuil_alerte ?? form.seuil_alerte,
                  cout_achat: produit?.cout_achat ?? form.cout_achat,
                  prix_vente: produit?.prix_vente ?? form.prix_vente,
                  prix_plafond: produit?.prix_plafond ?? form.prix_plafond,
                  marge: produit?.marge ?? form.marge,
                  commentaire: produit?.commentaire ?? form.commentaire,
                  partner_name: produit?.partner_name ?? form.partner_name,
                })
              }}
              disabled={!form.categorie}
              required
            />
            <datalist id="partner-product-options">
              {productOptions.map((produit) => (
                <option value={produit.nom} key={produit.id} />
              ))}
            </datalist>
          </label>
          <label>
            Nom partenaire
            <input
              value={form.partner_name ?? ''}
              onChange={(event) => setForm({ ...form, partner_name: event.target.value })}
              required
            />
          </label>
          <div className="two-cols">
            <label>
              Quantite
              <input
                type="number"
                min="0"
                value={form.quantite}
                onChange={(event) => setForm({ ...form, quantite: Number(event.target.value) })}
              />
              {!editingProduct && matchingProduct && (
                <span className="profit-note">Stock actuel: {matchingProduct.quantite}</span>
              )}
            </label>
            <label>
              Seuil alerte
              <input
                type="number"
                min="0"
                value={form.seuil_alerte}
                onChange={(event) => setForm({ ...form, seuil_alerte: Number(event.target.value) })}
              />
            </label>
          </div>
          <div className="two-cols">
            <label>
              Prix d achat
              <FormattedNumberInput
                value={form.cout_achat}
                min={0}
                onValueChange={(cout_achat) => {
                  setForm({ ...form, cout_achat, marge: profitPercent(cout_achat, form.prix_vente) })
                }}
              />
            </label>
            <label>
              Prix vente
              <FormattedNumberInput
                value={form.prix_vente}
                min={0}
                onValueChange={(prix_vente) => {
                  setForm({ ...form, prix_vente, marge: profitPercent(form.cout_achat, prix_vente) })
                }}
              />
              <span className="profit-note">{profitLabel(form.cout_achat, form.prix_vente)}</span>
            </label>
          </div>
          <label>
            Prix plafond
            <FormattedNumberInput
              value={form.prix_plafond}
              min={0}
              onValueChange={(prix_plafond) => setForm({ ...form, prix_plafond })}
            />
          </label>
          <label>
            Commentaire
            <input value={form.commentaire ?? ''} onChange={(event) => setForm({ ...form, commentaire: event.target.value })} />
          </label>
          <div className="row-actions">
            {canManage && (
              <button className="primary-button" type="submit">
                {editingProduct ? <Save size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                {editingProduct ? 'Enregistrer' : matchingProduct ? 'Mettre a jour' : 'Ajouter'}
              </button>
            )}
            {editingProduct && (
              <button className="ghost-button" type="button" onClick={resetForm}>
                <X size={18} aria-hidden="true" />
                Annuler
              </button>
            )}
            {!editingProduct && (
              <button className="ghost-button" type="button" onClick={resetForm}>
                <X size={18} aria-hidden="true" />
                Annuler
              </button>
            )}
          </div>
        </form>
      </article>
      )}

      <article className="panel view-stack">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Ventes partenaire</p>
            <h2>Produits vendus a payer</h2>
          </div>
          <Handshake size={20} aria-hidden="true" />
        </div>
        <div className="panel-actions">
          <span className="pill warn">A retourner: {money(pendingTotals.returnAmount)}</span>
          <span className="pill ok">Benefice caisse: {money(pendingTotals.profit)}</span>
          <span className="pill">{filteredPendingPayouts.length} ligne(s)</span>
        </div>
        <label>
          Recherche ventes partenaire
          <span className="search-field">
            <Search size={18} aria-hidden="true" />
            <input value={payoutQuery} onChange={(event) => setPayoutQuery(event.target.value)} />
          </span>
        </label>
        <PartnerPayoutTable
          rows={paginatedPendingPayouts}
          canPay={canManage}
          onPay={(payout) => void markPayoutPaid(payout)}
          emptyText="Aucun produit partenaire a payer."
        />
        <PaginationControls {...pendingPayoutPagination} />
      </article>

      <article className="panel view-stack">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Partenaire</p>
            <h2>Grand livre des ventes partenaire</h2>
          </div>
        </div>
        <div className="panel-actions">
          <span className="pill">Total ventes: {money(ledgerTotals.saleAmount)}</span>
          <span className="pill warn">Total a retourner: {money(ledgerTotals.returnAmount)}</span>
          <span className="pill ok">Benefice: {money(ledgerTotals.profit)}</span>
        </div>
        <PartnerPayoutTable
          rows={paginatedLedgerPayouts}
          canPay={false}
          emptyText="Aucune vente partenaire."
        />
        <PaginationControls {...ledgerPayoutPagination} />
      </article>

      <article className="panel view-stack">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Partenaire</p>
            <h2>Articles partenaire</h2>
          </div>
          <div className="row-actions">
            <Handshake size={20} aria-hidden="true" />
            {canManage && !isFormOpen && (
              <button className="primary-button compact-button" type="button" onClick={() => setFormOpen(true)}>
                <Plus size={18} aria-hidden="true" />
                Ajouter
              </button>
            )}
          </div>
        </div>
        <label>
          Recherche
          <span className="search-field">
            <Search size={18} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </span>
        </label>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Partenaire</th>
                <th>Type</th>
                <th>Categorie</th>
                <th>Stock</th>
                <th>Prix achat</th>
                <th>Prix vente</th>
                <th>Benefice</th>
                {(canManage || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((produit) => (
                <tr key={produit.id}>
                  <td data-label="Produit">
                    <strong>{produit.nom}</strong>
                    <span>{produit.commentaire || 'Sans commentaire'}</span>
                  </td>
                  <td data-label="Partenaire">{produit.partner_name}</td>
                  <td data-label="Type">{produit.type}</td>
                  <td data-label="Categorie">{produit.categorie}</td>
                  <td data-label="Stock">{produit.quantite}</td>
                  <td data-label="Prix achat">{money(produit.cout_achat)}</td>
                  <td data-label="Prix vente">{money(produit.prix_vente)}</td>
                  <td data-label="Benefice">{profitLabel(produit.cout_achat, produit.prix_vente)}</td>
                  {(canManage || canDelete) && (
                    <td data-label="Actions">
                      <div className="icon-actions">
                        {canManage && (
                          <button className="icon-button" type="button" title="Modifier" onClick={() => editProduct(produit)}>
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="icon-button danger-icon"
                            type="button"
                            title="Supprimer"
                            onClick={() => deleteProduct(produit)}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={(canManage || canDelete) ? 9 : 8} className="empty-cell">
                    Aucun article partenaire.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls {...productPagination} />
      </article>
    </section>
  )
}

function PartnerPayoutTable({
  rows,
  canPay,
  onPay,
  emptyText,
}: {
  rows: PartnerPayout[]
  canPay: boolean
  onPay?: (payout: PartnerPayout) => void
  emptyText: string
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Vente</th>
            <th>Partenaire</th>
            <th>Produit</th>
            <th>QTT</th>
            <th>Montant vente</th>
            <th>A retourner</th>
            <th>Benefice</th>
            <th>Statut</th>
            {canPay && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((payout) => (
            <tr key={payout.id}>
              <td data-label="Date">{dateLabel(payout.date_vente)}</td>
              <td data-label="Vente">
                <strong>#{payout.numero_vente ?? payout.vente_id}</strong>
                <span>{payout.client}</span>
              </td>
              <td data-label="Partenaire">{payout.partner_name}</td>
              <td data-label="Produit">
                <strong>{payout.produit_nom}</strong>
                <span>{[payout.type, payout.categorie].filter(Boolean).join(' / ') || '-'}</span>
              </td>
              <td data-label="QTT">{payout.quantite}</td>
              <td data-label="Montant vente">{money(payout.montant_vente)}</td>
              <td data-label="A retourner">{money(payout.montant_a_retourner)}</td>
              <td data-label="Benefice">
                <strong className="amount-positive">{money(payout.benefice)}</strong>
              </td>
              <td data-label="Statut">
                <span className={payout.paid ? 'pill ok' : 'pill warn'}>
                  {payout.paid ? `Paye${payout.paid_at ? ` le ${dateLabel(payout.paid_at)}` : ''}` : 'Non paye'}
                </span>
              </td>
              {canPay && (
                <td data-label="Action">
                  {!payout.paid && (
                    <button className="primary-button compact-button" type="button" onClick={() => onPay?.(payout)}>
                      <Check size={16} aria-hidden="true" />
                      Payer
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={canPay ? 10 : 9} className="empty-cell">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function filterPayouts(rows: PartnerPayout[], query: string) {
  const value = query.trim().toLowerCase()
  if (!value) return rows

  return rows.filter((row) =>
    [
      row.numero_vente ?? '',
      row.client,
      row.partner_name,
      row.produit_nom,
      row.type ?? '',
      row.categorie ?? '',
      row.paid ? 'paye' : 'non paye',
      ...dateSearchValues(row.date_vente),
      ...dateSearchValues(row.paid_at),
    ].some((field) => field.toLowerCase().includes(value)),
  )
}

function payoutTotals(rows: PartnerPayout[]) {
  return rows.reduce(
    (totals, row) => {
      totals.saleAmount += Number(row.montant_vente) || 0
      totals.returnAmount += Number(row.montant_a_retourner) || 0
      totals.profit += Number(row.benefice) || 0
      return totals
    },
    { saleAmount: 0, returnAmount: 0, profit: 0 },
  )
}

function profitLabel(cout: number, prix: number) {
  if (!cout) return '0% benefice'
  return `${(((prix - cout) / cout) * 100).toFixed(1)}% benefice`
}

function profitPercent(cout: number, prix: number) {
  if (!cout) return 0
  return Number((((prix - cout) / cout) * 100).toFixed(2))
}

function isApprovalResponse(value: unknown): value is { detail: string } {
  return Boolean(value && typeof value === 'object' && 'detail' in value)
}

async function showMutationResult(value: unknown, successMessage: string) {
  if (isApprovalResponse(value)) {
    await importantAlert('Demande d approbation', value.detail, 'info')
    return
  }

  notifySuccess(successMessage)
}
