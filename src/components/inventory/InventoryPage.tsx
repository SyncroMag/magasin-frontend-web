import { CheckCircle2, CircleDollarSign, Printer, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { money } from '../../utils/format'
import { confirmAction, notifyError, notifySuccess } from '../../utils/notifications'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import type { StockInventory } from '../../types'

type InventoryPageProps = {
  token: string
  onCompleted: () => Promise<void>
}

export function InventoryPage({ token, onCompleted }: InventoryPageProps) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [inventory, setInventory] = useState<StockInventory | null>(null)
  const [actualValues, setActualValues] = useState<Record<number, string>>({})
  const [isLoading, setLoading] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [comments, setComments] = useState<Record<number, string>>({})
  const items = useMemo(() => inventory?.items ?? [], [inventory])
  const { pageItems, controls } = usePaginatedItems(items)
  const isCompleted = inventory?.status === 'COMPLETED'

  useEffect(() => {
    let active = true
    setLoading(true)
    api.stockInventory(token, month)
      .then((result) => {
        if (!active) return
        setInventory(result)
        setActualValues(valuesFromInventory(result))
        setComments(commentsFromInventory(result))
      })
      .catch((error) => {
        if (active) notifyError(error instanceof Error ? error.message : 'Inventaire impossible a charger')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [month, token])

  const draftItems = items.map((item) => ({
    product_id: item.product_id,
    actual_quantity: parseActualQuantity(actualValues[item.product_id]),
  }))

  async function saveDraft() {
    if (!inventory || isCompleted) return
    setSaving(true)
    try {
      const result = await api.saveStockInventory(token, month, draftItems)
      setInventory(result)
      setActualValues(valuesFromInventory(result))
      setComments(commentsFromInventory(result))
      notifySuccess('Inventaire enregistre.')
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  async function completeInventory() {
    if (!inventory || isCompleted) return
    const missingCount = draftItems.filter((item) => item.actual_quantity === null).length
    if (missingCount > 0) {
      notifyError(`Renseignez le stock reel des ${missingCount} produit(s) restant(s).`)
      return
    }
    const confirmed = await confirmAction(
      'Confirmer et terminer cet inventaire ?',
      "Le stock de l'application sera remplace par les quantites reelles saisies.",
    )
    if (!confirmed) return

    setSaving(true)
    try {
      const result = await api.completeStockInventory(token, month, draftItems)
      setInventory(result)
      setActualValues(valuesFromInventory(result))
      setComments(commentsFromInventory(result))
      notifySuccess('Inventaire termine et stock mis a jour.')
      await onCompleted()
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Confirmation impossible')
    } finally {
      setSaving(false)
    }
  }

  async function saveComment(itemId: number) {
    const comment = (comments[itemId] ?? '').trim()
    if (!comment) {
      notifyError('Ajoutez un commentaire avant de l enregistrer.')
      return
    }
    setSaving(true)
    try {
      const result = await api.updateStockInventoryComment(token, itemId, comment)
      setInventory(result)
      setComments(commentsFromInventory(result))
      notifySuccess('Commentaire enregistre.')
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Commentaire impossible a enregistrer')
    } finally {
      setSaving(false)
    }
  }

  async function payDifference(itemId: number, productName: string, amount: number) {
    const confirmed = await confirmAction(
      `Payer ${money(amount)} pour ${productName} ?`,
      'Une sortie sera enregistree dans les mouvements de Caisse.',
    )
    if (!confirmed) return
    setSaving(true)
    try {
      const result = await api.payStockInventoryDifference(token, itemId)
      setInventory(result)
      setComments(commentsFromInventory(result))
      notifySuccess('Regularisation payee et enregistree en Caisse.')
      await onCompleted()
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Paiement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="view-stack inventory-page">
      <section className="panel inventory-toolbar-panel">
        <div>
          <p className="eyebrow">Periode</p>
          <h2>Inventaire mensuel</h2>
        </div>
        <label>
          Mois
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
        <button className="ghost-button" type="button" onClick={() => inventory && printInventory(inventory, actualValues)} disabled={!inventory}>
          <Printer size={17} aria-hidden="true" />
          Imprimer
        </button>
      </section>

      <section className="metric-grid inventory-metrics">
        <InventoryMetric label="Produits" value={inventory?.total_products ?? 0} />
        <InventoryMetric label="Comptes" value={inventory?.counted_products ?? 0} />
        <InventoryMetric label="Difference" value={liveTotals(items, actualValues).difference} />
        <InventoryMetric label="Prix a retourner" value={money(liveTotals(items, actualValues).returnAmount)} />
      </section>

      <section className="panel view-stack inventory-table-panel">
        <div className="panel-header">
          <div><p className="eyebrow">Stock physique</p><h2>Liste des produits</h2></div>
          <div className="panel-actions">
            <span className={isCompleted ? 'pill ok' : 'pill info'}>{isCompleted ? 'Termine' : 'Brouillon'}</span>
            {!isCompleted && (
              <button className="primary-button compact-button" type="button" onClick={() => void saveDraft()} disabled={isSaving}>
                <Save size={16} aria-hidden="true" /> Enregistrer
              </button>
            )}
          </div>
        </div>

        <div className="table-wrap">
          <table className="inventory-table">
            <thead><tr><th>Type</th><th>Categorie</th><th>Produit</th><th>Stock application</th><th>Stock reel</th><th>Difference</th><th>Prix a retourner</th></tr></thead>
            <tbody>
              {pageItems.map((item) => {
                const actual = parseActualQuantity(actualValues[item.product_id])
                const difference = actual === null ? null : item.app_quantity - actual
                const returnAmount = difference === null ? null : Math.max(difference, 0) * item.purchase_price
                return (
                  <tr key={item.id}>
                    <td data-label="Type">{item.product_type}</td>
                    <td data-label="Categorie">{item.product_category}</td>
                    <td data-label="Produit"><strong>{item.product_name}</strong></td>
                    <td data-label="Stock application">{item.app_quantity}</td>
                    <td data-label="Stock reel">
                      <input className="inventory-quantity-input" type="number" min="0" step="1" value={actualValues[item.product_id] ?? ''} disabled={isCompleted} onChange={(event) => setActualValues((current) => ({ ...current, [item.product_id]: event.target.value }))} aria-label={`Stock reel de ${item.product_name}`} />
                    </td>
                    <td data-label="Difference" className={difference !== null && difference > 0 ? 'amount-negative' : ''}>{difference ?? '-'}</td>
                    <td data-label="Prix a retourner">{returnAmount === null ? '-' : money(returnAmount)}</td>
                  </tr>
                )
              })}
              {!isLoading && items.length === 0 && <tr><td className="empty-cell" colSpan={7}>Aucun produit actif.</td></tr>}
            </tbody>
          </table>
        </div>
        <PaginationControls {...controls} />
        {isLoading && <p className="muted">Chargement de l inventaire...</p>}
        {!isCompleted && (
          <button className="primary-button inventory-complete-button" type="button" onClick={() => void completeInventory()} disabled={isSaving || isLoading}>
            <CheckCircle2 size={20} aria-hidden="true" /> Confirmer l inventaire et terminer
          </button>
        )}
      </section>

      <RegularizationPanel
        inventory={inventory}
        comments={comments}
        isSaving={isSaving}
        onCommentChange={(itemId, value) => setComments((current) => ({ ...current, [itemId]: value }))}
        onSaveComment={saveComment}
        onPay={payDifference}
      />
    </div>
  )
}

type RegularizationPanelProps = {
  inventory: StockInventory | null
  comments: Record<number, string>
  isSaving: boolean
  onCommentChange: (itemId: number, value: string) => void
  onSaveComment: (itemId: number) => Promise<void>
  onPay: (itemId: number, productName: string, amount: number) => Promise<void>
}

function RegularizationPanel({
  inventory,
  comments,
  isSaving,
  onCommentChange,
  onSaveComment,
  onPay,
}: RegularizationPanelProps) {
  const differenceItems = useMemo(
    () => (inventory?.items ?? []).filter((item) => item.difference !== null && item.difference !== 0),
    [inventory],
  )
  const { pageItems, controls } = usePaginatedItems(differenceItems)
  const paidTotal = differenceItems.reduce(
    (total, item) => total + (item.regularization_paid_at ? Number(item.return_amount ?? 0) : 0),
    0,
  )
  const pendingTotal = differenceItems.reduce(
    (total, item) => total + (!item.regularization_paid_at ? Number(item.return_amount ?? 0) : 0),
    0,
  )

  return (
    <section className="panel view-stack inventory-regularization-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Caisse</p>
          <h2>Regularisation des differences</h2>
        </div>
        <CircleDollarSign size={21} aria-hidden="true" />
      </div>
      <div className="panel-actions">
        <span className="pill">Produits avec ecart: {differenceItems.length}</span>
        <span className="pill warn">A payer: {money(pendingTotal)}</span>
        <span className="pill ok">Paye: {money(paidTotal)}</span>
      </div>

      {inventory?.status !== 'COMPLETED' ? (
        <p className="muted">Terminez l inventaire pour enregistrer les commentaires et regulariser les differences.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="inventory-regularization-table">
              <thead>
                <tr><th>Produit</th><th>Ecart</th><th>Montant</th><th>Commentaire</th><th>Etat</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const amount = Number(item.return_amount ?? 0)
                  const isPaid = Boolean(item.regularization_paid_at)
                  const savedComment = (item.regularization_comment ?? '').trim()
                  const currentComment = (comments[item.id] ?? '').trim()
                  return (
                    <tr key={item.id}>
                      <td data-label="Produit"><strong>{item.product_name}</strong><span>{item.product_type} / {item.product_category}</span></td>
                      <td data-label="Ecart" className={Number(item.difference) > 0 ? 'amount-negative' : 'amount-positive'}>{item.difference}</td>
                      <td data-label="Montant"><strong>{money(amount)}</strong></td>
                      <td data-label="Commentaire">
                        <input
                          className="inventory-comment-input"
                          value={comments[item.id] ?? ''}
                          disabled={isPaid}
                          maxLength={500}
                          onChange={(event) => onCommentChange(item.id, event.target.value)}
                          placeholder="Motif de la difference"
                        />
                      </td>
                      <td data-label="Etat">
                        {isPaid ? <span className="pill ok">Paye</span> : amount > 0 ? <span className="pill warn">A payer</span> : <span className="pill info">Excedent</span>}
                      </td>
                      <td data-label="Actions">
                        <div className="row-actions">
                          {!isPaid && (
                            <button className="ghost-button compact-button" type="button" disabled={isSaving || !currentComment || currentComment === savedComment} onClick={() => void onSaveComment(item.id)}>
                              <Save size={15} aria-hidden="true" /> Commenter
                            </button>
                          )}
                          {!isPaid && amount > 0 && (
                            <button className="primary-button compact-button" type="button" disabled={isSaving || !savedComment || currentComment !== savedComment} onClick={() => void onPay(item.id, item.product_name, amount)}>
                              <CircleDollarSign size={15} aria-hidden="true" /> Payer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {differenceItems.length === 0 && <tr><td className="empty-cell" colSpan={6}>Aucune difference constatee.</td></tr>}
              </tbody>
            </table>
          </div>
          <PaginationControls {...controls} />
        </>
      )}
    </section>
  )
}

function InventoryMetric({ label, value }: { label: string; value: string | number }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>
}

function valuesFromInventory(inventory: StockInventory) {
  return Object.fromEntries(inventory.items.map((item) => [item.product_id, item.actual_quantity === null ? '' : String(item.actual_quantity)]))
}

function commentsFromInventory(inventory: StockInventory) {
  return Object.fromEntries(inventory.items.map((item) => [item.id, item.regularization_comment ?? '']))
}

function parseActualQuantity(value?: string) {
  if (value === undefined || value.trim() === '') return null
  const quantity = Number(value)
  return Number.isInteger(quantity) && quantity >= 0 ? quantity : null
}

function liveTotals(items: StockInventory['items'], values: Record<number, string>) {
  return items.reduce((totals, item) => {
    const actual = parseActualQuantity(values[item.product_id])
    if (actual === null) return totals
    const difference = item.app_quantity - actual
    totals.difference += difference
    totals.returnAmount += Math.max(difference, 0) * item.purchase_price
    return totals
  }, { difference: 0, returnAmount: 0 })
}

function printInventory(inventory: StockInventory, values: Record<number, string>) {
  const popup = window.open('', 'stock-inventory-print', 'width=1200,height=820')
  if (!popup) return
  const rows = inventory.items.map((item) => {
    const actual = parseActualQuantity(values[item.product_id])
    const difference = actual === null ? null : item.app_quantity - actual
    const returnAmount = difference === null ? null : Math.max(difference, 0) * item.purchase_price
    return `<tr><td>${escapeHtml(item.product_type)}</td><td>${escapeHtml(item.product_category)}</td><td>${escapeHtml(item.product_name)}</td><td>${item.app_quantity}</td><td>${actual ?? '-'}</td><td>${difference ?? '-'}</td><td>${returnAmount === null ? '-' : money(returnAmount)}</td></tr>`
  }).join('')
  popup.document.write(`<!doctype html><html><head><title>Inventaire ${inventory.month}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1d2926}h1{margin:0 0 4px}p{margin:0 0 20px;color:#60706b}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccd5d1;padding:8px;text-align:left}th{background:#eef3f1}</style></head><body><h1>Inventaire</h1><p>Mois ${escapeHtml(inventory.month)} - ${inventory.status === 'COMPLETED' ? 'Termine' : 'Brouillon'}</p><table><thead><tr><th>Type</th><th>Categorie</th><th>Produit</th><th>Stock application</th><th>Stock reel</th><th>Difference</th><th>Prix a retourner</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`)
  popup.document.close()
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}
