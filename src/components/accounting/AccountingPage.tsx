import { ArrowRightLeft, Check, ChevronDown, ChevronUp, Pencil, Plus, Printer, ReceiptText, Save, Trash2, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { STORE_NAME } from '../../constants'
import { FormattedNumberInput } from '../common/FormattedNumberInput'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import { dateLabel, money } from '../../utils/format'
import { confirmAction, notifyError } from '../../utils/notifications'
import type { FormEvent, ReactNode } from 'react'
import type {
  AccountingAccount,
  AccountingEntry,
  AccountingInventory,
  AccountingSummary,
  Arrivage,
  Employe,
  Produit,
  Transfert,
  Vente,
} from '../../types'

export type AccountingSection = 'cash' | 'vault' | 'expenses' | 'inventory'

type AccountingPageProps = {
  section: AccountingSection
  token: string
  summary: AccountingSummary | null
  entries: AccountingEntry[]
  produits: Produit[]
  ventes: Vente[]
  transferts: Transfert[]
  employes: Employe[]
  onManual: (data: { account: AccountingAccount; amount: number; motif: string }) => Promise<void>
  onTransfer: (data: { from_account: AccountingAccount; to_account: AccountingAccount; amount: number; motif: string }) => Promise<void>
  onExpense: (data: { account: AccountingAccount; amount: number; motif: string }) => Promise<void>
  onSalaryPayment: (data: { account: AccountingAccount; employe_id: number; amount: number; motif?: string | null }) => Promise<void>
  onUpdateEntry: (entryId: number, data: { account: AccountingAccount; amount: number; motif: string }) => Promise<void>
  onDeleteEntry: (entryId: number) => Promise<void>
}

const accountBySection: Record<'cash' | 'vault', AccountingAccount> = {
  cash: 'CAISSE',
  vault: 'COFFRE',
}

type StockMovementRow = {
  id: string
  date: string
  type: 'ACHAT' | 'VENTE' | 'TRANSFERT'
  sens: 'ENTREE' | 'SORTIE'
  produit: string
  quantite: number
  valeur: number
  detail: string
}

type CashMovementRow = {
  id: string
  date: string
  operation: string
  canal: string
  motif: string
  debit: number
  credit: number
  source: 'COMPTA' | 'TIERS'
  countInTotals: boolean
  paymentStatus?: string
}

export function AccountingPage({
  section,
  token,
  summary,
  entries,
  produits,
  ventes,
  transferts,
  employes,
  onManual,
  onTransfer,
  onExpense,
  onSalaryPayment,
  onUpdateEntry,
  onDeleteEntry,
}: AccountingPageProps) {
  const [manualForm, setManualForm] = useState({ amount: 0, motif: '' })
  const [transferForm, setTransferForm] = useState({
    from_account: 'CAISSE' as AccountingAccount,
    to_account: 'COFFRE' as AccountingAccount,
    amount: 0,
    motif: '',
  })
  const [expenseForm, setExpenseForm] = useState({ account: 'CAISSE' as AccountingAccount, amount: 0, motif: '' })
  const [salaryForm, setSalaryForm] = useState({
    account: 'CAISSE' as AccountingAccount,
    employe_id: '',
  })
  const [inventoryMonth, setInventoryMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [inventory, setInventory] = useState<AccountingInventory | null>(null)
  const [arrivages, setArrivages] = useState<Arrivage[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const selectedSalaryEmploye = employes.find((item) => item.id === Number(salaryForm.employe_id))
  const salaryAbsenceDeduction = selectedSalaryEmploye
    ? Math.max(
        0,
        Number(selectedSalaryEmploye.salaire_mensuel) -
          Number(selectedSalaryEmploye.total_avances_mois) -
          Number(selectedSalaryEmploye.salaire_final),
      )
    : 0

  const account = section === 'cash' || section === 'vault' ? accountBySection[section] : null
  const visibleEntries = useMemo(
    () => (account ? entries.filter((entry) => entry.account === account) : entries),
    [account, entries],
  )
  const productsById = useMemo(() => new Map(produits.map((produit) => [produit.id, produit])), [produits])
  const salesById = useMemo(() => new Map(ventes.map((vente) => [vente.id, vente])), [ventes])
  const inventoryEntries = useMemo(() => inventory?.entries ?? [], [inventory])
  const activeProducts = useMemo(() => produits.filter((produit) => produit.is_active), [produits])
  const monthSales = useMemo(
    () => ventes.filter((vente) => !vente.modified_by_superadmin && isMonthMatch(saleDateValue(vente), inventoryMonth)),
    [inventoryMonth, ventes],
  )
  const monthTransfers = useMemo(
    () => transferts.filter((transfert) => isMonthMatch(transfert.created_at, inventoryMonth)),
    [inventoryMonth, transferts],
  )
  const monthArrivals = useMemo(
    () => arrivages.filter((arrivage) => isMonthMatch(arrivage.date_arrivage || arrivage.created_at, inventoryMonth)),
    [arrivages, inventoryMonth],
  )
  const stockMovements = useMemo(
    () => buildStockMovements({ sales: monthSales, transfers: monthTransfers, arrivals: monthArrivals, productsById }),
    [monthArrivals, monthSales, monthTransfers, productsById],
  )
  const activeProductsTotals = useMemo(
    () =>
      activeProducts.reduce(
        (totals, produit) => {
          totals.quantity += Number(produit.quantite) || 0
          totals.purchase += (Number(produit.quantite) || 0) * (Number(produit.cout_achat) || 0)
          totals.sale += (Number(produit.quantite) || 0) * (Number(produit.prix_vente) || 0)
          return totals
        },
        { quantity: 0, purchase: 0, sale: 0 },
      ),
    [activeProducts],
  )
  const arrivalsTotals = useMemo(
    () =>
      monthArrivals.reduce(
        (totals, arrivage) => {
          totals.lines += Number(arrivage.total_lignes) || 0
          totals.quantity += Number(arrivage.total_quantite) || 0
          for (const line of arrivage.lignes) {
            totals.purchase += Number(line.quantite_ajoutee || 0) * Number(line.cout_achat || 0)
            totals.sale += Number(line.quantite_ajoutee || 0) * Number(line.prix_vente || 0)
          }
          return totals
        },
        { lines: 0, quantity: 0, purchase: 0, sale: 0 },
      ),
    [monthArrivals],
  )
  const cashMovementRows = useMemo(
    () => buildGeneralCashMovements({ entries: inventoryEntries, transfers: monthTransfers, productsById, salesById }),
    [inventoryEntries, monthTransfers, productsById, salesById],
  )
  const cashMovementTotals = useMemo(
    () =>
      cashMovementRows.reduce(
        (totals, row) => {
          if (row.countInTotals) {
            totals.debit += row.debit
            totals.credit += row.credit
          }
          return totals
        },
        { debit: 0, credit: 0 },
      ),
    [cashMovementRows],
  )
  const transferCounters = useMemo(
    () => ({
      internal: cashMovementRows.filter((row) => row.operation.toLowerCase().includes('transfert interne')).length,
      tiers: cashMovementRows.filter((row) => row.source === 'TIERS').length,
      pending: cashMovementRows.filter((row) => row.source === 'TIERS' && row.paymentStatus === 'NON_PAYE').length,
    }),
    [cashMovementRows],
  )

  useEffect(() => {
    if (section !== 'inventory') return

    void loadInventory(inventoryMonth)
    void loadArrivages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, inventoryMonth, token])

  async function loadInventory(month: string) {
    setInventoryLoading(true)
    try {
      setInventory(await api.accountingInventory(token, month))
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Inventaire impossible a charger')
    } finally {
      setInventoryLoading(false)
    }
  }

  async function loadArrivages() {
    try {
      setArrivages(await api.arrivages(token))
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Arrivages impossibles a charger')
    }
  }

  async function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!account) return

    await onManual({ account, amount: Number(manualForm.amount), motif: manualForm.motif })
    setManualForm({ amount: 0, motif: '' })
  }

  async function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onTransfer({ ...transferForm, amount: Number(transferForm.amount) })
    setTransferForm({ from_account: 'CAISSE', to_account: 'COFFRE', amount: 0, motif: '' })
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onExpense({ ...expenseForm, amount: Number(expenseForm.amount) })
    setExpenseForm({ account: 'CAISSE', amount: 0, motif: '' })
  }

  async function submitSalaryPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSalaryEmploye) return

    await onSalaryPayment({
      account: salaryForm.account,
      employe_id: Number(salaryForm.employe_id),
      amount: Number(selectedSalaryEmploye?.salaire_final ?? 0),
    })
    printSalaryPaymentReceipt({
      employe: selectedSalaryEmploye,
      account: salaryForm.account,
      salaryAbsenceDeduction,
    })
    setSalaryForm({ account: 'CAISSE', employe_id: '' })
  }

  if (section === 'expenses') {
    return (
      <section className="view-stack">
        <div className="metric-grid accounting-metrics">
          <Metric label="Caisse" value={summary?.caisse ?? 0} />
          <Metric label="Coffre" value={summary?.coffre ?? 0} />
        </div>
        <section className="content-grid">
          <article className="panel view-stack">
            <PanelTitle eyebrow="Comptabilite" title="Depense" />
            <form className="modal-form" onSubmit={submitExpense}>
              <label>
                Compte
                <select
                  value={expenseForm.account}
                  onChange={(event) => setExpenseForm({ ...expenseForm, account: event.target.value as AccountingAccount })}
                >
                  <option value="CAISSE">Caisse</option>
                  <option value="COFFRE">Coffre</option>
                </select>
              </label>
              <label>
                Montant
                <FormattedNumberInput
                  value={expenseForm.amount}
                  min={0}
                  onValueChange={(amount) => setExpenseForm({ ...expenseForm, amount })}
                />
              </label>
              <label>
                Motif
                <input value={expenseForm.motif} onChange={(event) => setExpenseForm({ ...expenseForm, motif: event.target.value })} required />
              </label>
              <button className="primary-button" type="submit">
                <Check size={18} aria-hidden="true" />
                Enregistrer depense
              </button>
            </form>
          </article>
          <article className="panel view-stack">
            <PanelTitle eyebrow="Comptabilite" title="Paiement salaire" />
            <form className="modal-form" onSubmit={submitSalaryPayment}>
              <label>
                Compte
                <select
                  value={salaryForm.account}
                  onChange={(event) => setSalaryForm({ ...salaryForm, account: event.target.value as AccountingAccount })}
                >
                  <option value="CAISSE">Caisse</option>
                  <option value="COFFRE">Coffre</option>
                </select>
              </label>
              <label>
                Personnel
                <select
                  value={salaryForm.employe_id}
                  onChange={(event) => setSalaryForm({ ...salaryForm, employe_id: event.target.value })}
                  required
                >
                  <option value="">Selectionner</option>
                  {employes.map((employe) => (
                    <option value={employe.id} key={employe.id}>
                      {employe.nom} {employe.prenoms}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Montant net a payer
                <input value={money(selectedSalaryEmploye?.salaire_final ?? 0)} readOnly />
              </label>
              {selectedSalaryEmploye && (
                <div className="salary-breakdown">
                  <span>Salaire mensuel: {money(selectedSalaryEmploye.salaire_mensuel)}</span>
                  <span>Retenue absence: -{money(salaryAbsenceDeduction)}</span>
                  <span>Avances du mois: -{money(selectedSalaryEmploye.total_avances_mois)}</span>
                  <strong>Net: {money(selectedSalaryEmploye.salaire_final)}</strong>
                </div>
              )}
              <button className="primary-button" type="submit">
                <Check size={18} aria-hidden="true" />
                Payer salaire
              </button>
            </form>
          </article>
        </section>
        <EntriesTable
          entries={visibleEntries.filter((entry) => ['EXPENSE', 'SALARY_ADVANCE', 'SALARY_PAYMENT'].includes(entry.entry_type))}
          title="Depenses et salaires"
          printable
          printTitle="Depenses et salaires"
          onUpdateEntry={onUpdateEntry}
          onDeleteEntry={onDeleteEntry}
        />
      </section>
    )
  }

  if (section === 'inventory') {
    return (
      <section className="view-stack">
        <article className="panel view-stack">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Comptabilite</p>
              <h2>Inventaire mensuel</h2>
            </div>
            <button
              className="ghost-button compact-button"
              type="button"
              onClick={() =>
                printInventoryGeneralReport({
                  month: inventoryMonth,
                  inventory,
                  cashMovements: cashMovementRows,
                  cashTotals: cashMovementTotals,
                  stockMovements,
                  activeProducts,
                  activeProductsTotals,
                  arrivals: monthArrivals,
                  arrivalsTotals,
                })
              }
              disabled={inventoryLoading}
            >
              <Printer size={16} aria-hidden="true" />
              Imprimer
            </button>
          </div>
          <div className="toolbar-grid">
            <label>
              Mois
              <input
                type="month"
                value={inventoryMonth}
                onChange={(event) => setInventoryMonth(event.target.value)}
              />
            </label>
          </div>
        </article>

        <div className="metric-grid accounting-metrics">
          <Metric label="Caisse avant le mois" value={inventory?.opening.caisse ?? 0} />
          <Metric label="Coffre avant le mois" value={inventory?.opening.coffre ?? 0} />
          <Metric label="Total avant le mois" value={inventory?.opening.total ?? 0} />
          <Metric label="Caisse actuelle" value={inventory?.closing.caisse ?? summary?.caisse ?? 0} />
          <Metric label="Coffre actuel" value={inventory?.closing.coffre ?? summary?.coffre ?? 0} />
          <Metric label="Total actuel" value={inventory?.closing.total ?? summary?.total ?? 0} />
          <Metric label="Total entree" value={inventory?.total_in ?? 0} />
          <Metric label="Total sortie" value={inventory?.total_out ?? 0} />
        </div>

        <article className="panel view-stack">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Comptabilite</p>
              <h2>Mouvements comptables du mois</h2>
            </div>
          </div>
          <div className="panel-actions">
            <span className="pill info">Mois {inventoryMonth}</span>
            <span className="pill">Lignes: {cashMovementRows.length}</span>
            <span className="pill">Transferts internes: {transferCounters.internal}</span>
            <span className="pill ok">Debit: {money(cashMovementTotals.debit)}</span>
            <span className="pill warn">Credit: {money(cashMovementTotals.credit)}</span>
            <span className="pill">Transferts vers tiers: {transferCounters.tiers}</span>
            <span className="pill warn">Non payes: {transferCounters.pending}</span>
          </div>
          <CashMovementsTable rows={cashMovementRows} />
        </article>

        <article className="panel view-stack">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Inventaire stock</p>
              <h2>Produits actifs et valorisation</h2>
            </div>
          </div>
          <div className="panel-actions">
            <span className="pill">{activeProducts.length} produits actifs</span>
            <span className="pill info">Quantite totale: {activeProductsTotals.quantity}</span>
            <span className="pill ok">Valeur achat: {money(activeProductsTotals.purchase)}</span>
            <span className="pill warn">Valeur vente: {money(activeProductsTotals.sale)}</span>
          </div>
          <ActiveProductsTable rows={activeProducts} />
        </article>

        <article className="panel view-stack">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Inventaire stock</p>
              <h2>Liste des arrivages</h2>
            </div>
          </div>
          <div className="panel-actions">
            <span className="pill info">Mois {inventoryMonth}</span>
            <span className="pill">{monthArrivals.length} arrivages</span>
            <span className="pill">Lignes: {arrivalsTotals.lines}</span>
            <span className="pill ok">QTT: {arrivalsTotals.quantity}</span>
            <span className="pill warn">Valeur achat: {money(arrivalsTotals.purchase)}</span>
            <span className="pill">Valeur vente: {money(arrivalsTotals.sale)}</span>
          </div>
          <ArrivalsTable rows={monthArrivals} />
        </article>
      </section>
    )
  }

  return (
    <section className="view-stack">
      <div className="metric-grid accounting-metrics">
        <Metric label={account === 'CAISSE' ? 'Solde caisse' : 'Solde coffre'} value={account === 'CAISSE' ? summary?.caisse ?? 0 : summary?.coffre ?? 0} />
      </div>
      <section className="content-grid">
        <article className="panel view-stack">
          <PanelTitle eyebrow="Comptabilite" title={`Ajouter montant ${account === 'CAISSE' ? 'caisse' : 'coffre'}`} />
          <form className="modal-form" onSubmit={submitManual}>
            <label>
              Montant
              <FormattedNumberInput
                value={manualForm.amount}
                min={0}
                onValueChange={(amount) => setManualForm({ ...manualForm, amount })}
              />
            </label>
            <label>
              Motif / commentaire
              <input value={manualForm.motif} onChange={(event) => setManualForm({ ...manualForm, motif: event.target.value })} required />
            </label>
            <button className="primary-button" type="submit">
              <Plus size={18} aria-hidden="true" />
              Ajouter
            </button>
          </form>
        </article>
        <article className="panel view-stack">
          <PanelTitle eyebrow="Comptabilite" title="Transfert caisse / coffre" />
          <form className="modal-form" onSubmit={submitTransfer}>
            <div className="two-cols">
              <label>
                De
                <select
                  value={transferForm.from_account}
                  onChange={(event) => {
                    const fromAccount = event.target.value as AccountingAccount
                    setTransferForm({
                      ...transferForm,
                      from_account: fromAccount,
                      to_account: fromAccount === 'CAISSE' ? 'COFFRE' : 'CAISSE',
                    })
                  }}
                >
                  <option value="CAISSE">Caisse</option>
                  <option value="COFFRE">Coffre</option>
                </select>
              </label>
              <label>
                Vers
                <input value={transferForm.to_account === 'CAISSE' ? 'Caisse' : 'Coffre'} readOnly />
              </label>
            </div>
            <label>
              Montant
              <FormattedNumberInput
                value={transferForm.amount}
                min={0}
                onValueChange={(amount) => setTransferForm({ ...transferForm, amount })}
              />
            </label>
            <label>
              Motif / commentaire
              <input value={transferForm.motif} onChange={(event) => setTransferForm({ ...transferForm, motif: event.target.value })} required />
            </label>
            <button className="primary-button" type="submit">
              <ArrowRightLeft size={18} aria-hidden="true" />
              Transferer
            </button>
          </form>
        </article>
      </section>
      <EntriesTable entries={visibleEntries} onUpdateEntry={onUpdateEntry} onDeleteEntry={onDeleteEntry} />
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card accent-green">
      <span>{label}</span>
      <strong>{money(value)}</strong>
    </div>
  )
}

function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="panel-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <ReceiptText size={20} aria-hidden="true" />
    </div>
  )
}

function EntriesTable({
  entries,
  title = 'Mouvements',
  footer = null,
  printable = false,
  printTitle = 'Mouvements',
  onUpdateEntry,
  onDeleteEntry,
}: {
  entries: AccountingEntry[]
  title?: string
  footer?: ReactNode
  printable?: boolean
  printTitle?: string
  onUpdateEntry?: (entryId: number, data: { account: AccountingAccount; amount: number; motif: string }) => Promise<void>
  onDeleteEntry?: (entryId: number) => Promise<void>
}) {
  const { pageItems, controls } = usePaginatedItems(entries)
  const [editingEntry, setEditingEntry] = useState<{
    id: number
    account: AccountingAccount
    amount: number
    motif: string
  } | null>(null)

  function openEditEntry(entry: AccountingEntry) {
    setEditingEntry({
      id: entry.id,
      account: entry.account === 'COFFRE' ? 'COFFRE' : 'CAISSE',
      amount: Math.abs(Number(entry.amount) || 0),
      motif: entry.motif,
    })
  }

  async function submitEditEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingEntry || !onUpdateEntry) return

    await onUpdateEntry(editingEntry.id, {
      account: editingEntry.account,
      amount: Number(editingEntry.amount),
      motif: editingEntry.motif,
    })
    setEditingEntry(null)
  }

  async function deleteEntry(entry: AccountingEntry) {
    if (!onDeleteEntry) return
    const confirmed = await confirmAction(
      'Supprimer ce mouvement ?',
      'Le solde caisse/coffre sera recalcule apres suppression.',
    )
    if (!confirmed) return

    await onDeleteEntry(entry.id)
    if (editingEntry?.id === entry.id) {
      setEditingEntry(null)
    }
  }

  const hasActions = Boolean(onUpdateEntry || onDeleteEntry)

  return (
    <article className="panel view-stack">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Comptabilite</p>
          <h2>{title}</h2>
        </div>
        {printable && (
          <button className="ghost-button compact-button" type="button" onClick={() => printEntries(entries, printTitle)}>
            <Printer size={16} aria-hidden="true" />
            Imprimer
          </button>
        )}
      </div>
      {editingEntry && (
        <form className="modal-form accounting-edit-form" onSubmit={submitEditEntry}>
          <div className="two-cols">
            <label>
              Compte
              <select
                value={editingEntry.account}
                onChange={(event) => setEditingEntry({ ...editingEntry, account: event.target.value as AccountingAccount })}
              >
                <option value="CAISSE">Caisse</option>
                <option value="COFFRE">Coffre</option>
              </select>
            </label>
            <label>
              Montant
              <FormattedNumberInput
                value={editingEntry.amount}
                min={0}
                onValueChange={(amount) => setEditingEntry({ ...editingEntry, amount })}
              />
            </label>
          </div>
          <label>
            Motif
            <input
              value={editingEntry.motif}
              onChange={(event) => setEditingEntry({ ...editingEntry, motif: event.target.value })}
              required
            />
          </label>
          <div className="icon-actions">
            <button className="primary-button compact-button" type="submit">
              <Save size={16} aria-hidden="true" />
              Enregistrer
            </button>
            <button className="ghost-button compact-button" type="button" onClick={() => setEditingEntry(null)}>
              <X size={16} aria-hidden="true" />
              Annuler
            </button>
          </div>
        </form>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Compte</th>
              <th>Type</th>
              <th>Motif</th>
              <th>Montant</th>
              {hasActions && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((entry) => {
              const canEditEntry = isEditableAccountingEntry(entry)

              return (
                <tr key={entry.id}>
                  <td data-label="Date">{dateLabel(entry.created_at)}</td>
                  <td data-label="Compte">{entry.account === 'CAISSE' ? 'Caisse' : 'Coffre'}</td>
                  <td data-label="Type">{entryTypeLabel(entry.entry_type)}</td>
                  <td data-label="Motif">{entry.motif}</td>
                  <td data-label="Montant">
                    <strong className={Number(entry.amount) < 0 ? 'amount-negative' : 'amount-positive'}>
                      {money(entry.amount)}
                    </strong>
                  </td>
                  {hasActions && (
                    <td data-label="Action">
                      {canEditEntry ? (
                        <div className="icon-actions">
                          <button type="button" className="icon-button" title="Modifier mouvement" onClick={() => openEditEntry(entry)}>
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="icon-button danger-icon"
                            title="Supprimer mouvement"
                            onClick={() => void deleteEntry(entry)}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <span className="muted-cell">Auto</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={hasActions ? 6 : 5} className="empty-cell">
                  Aucun mouvement.
                </td>
              </tr>
            )}
            {footer}
          </tbody>
        </table>
      </div>
      <PaginationControls {...controls} />
    </article>
  )
}

function isEditableAccountingEntry(entry: AccountingEntry) {
  return ['MANUAL_IN', 'EXPENSE', 'SALARY_PAYMENT'].includes(entry.entry_type)
}

function CashMovementsTable({ rows }: { rows: CashMovementRow[] }) {
  const { pageItems, controls } = usePaginatedItems(rows)

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Operation</th>
              <th>Canal</th>
              <th>Motif</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((row) => (
              <tr key={row.id}>
                <td data-label="Date">{dateLabel(row.date)}</td>
                <td data-label="Operation">{row.operation}</td>
                <td data-label="Canal">{row.canal}</td>
                <td data-label="Motif">
                  <strong>{row.motif}</strong>
                  <span>
                    {row.source === 'TIERS'
                      ? row.paymentStatus === 'NON_PAYE'
                        ? 'Source: transfert vers tiers - paiement en attente'
                        : 'Source: transfert vers tiers'
                      : 'Source: comptabilite'}
                  </span>
                </td>
                <td data-label="Debit">
                  <strong className={row.debit > 0 ? 'amount-positive' : ''}>{row.debit > 0 ? money(row.debit) : '-'}</strong>
                </td>
                <td data-label="Credit">
                  <strong className={row.credit > 0 ? 'amount-negative' : ''}>{row.credit > 0 ? money(row.credit) : '-'}</strong>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-cell">
                  Aucun mouvement pour ce mois.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls {...controls} />
    </>
  )
}

function ActiveProductsTable({ rows }: { rows: Produit[] }) {
  const { pageItems, controls } = usePaginatedItems(rows)

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Type / Categorie</th>
              <th>QTT</th>
              <th>Cout unitaire</th>
              <th>Prix vente</th>
              <th>Valeur achat</th>
              <th>Valeur vente</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((produit) => (
              <tr key={produit.id}>
                <td data-label="Produit">
                  <strong>{produit.nom}</strong>
                  <span>{produit.partner_name ? `Partenaire: ${produit.partner_name}` : 'Interne'}</span>
                </td>
                <td data-label="Type / Categorie">
                  {produit.type} / {produit.categorie}
                </td>
                <td data-label="QTT">{produit.quantite}</td>
                <td data-label="Cout unitaire">{money(produit.cout_achat)}</td>
                <td data-label="Prix vente">{money(produit.prix_vente)}</td>
                <td data-label="Valeur achat">{money(Number(produit.quantite) * Number(produit.cout_achat))}</td>
                <td data-label="Valeur vente">{money(Number(produit.quantite) * Number(produit.prix_vente))}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-cell">
                  Aucun produit actif.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls {...controls} />
    </>
  )
}

function ArrivalsTable({ rows }: { rows: Arrivage[] }) {
  const { pageItems, controls } = usePaginatedItems(rows)
  const [expandedArrivalId, setExpandedArrivalId] = useState<number | null>(null)

  function toggleArrival(arrivageId: number) {
    setExpandedArrivalId((current) => (current === arrivageId ? null : arrivageId))
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date arrivage</th>
              <th>Commentaire</th>
              <th>Lignes</th>
              <th>QTT</th>
              <th>Valeur achat</th>
              <th>Valeur vente</th>
              <th>Enregistre le</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((arrivage) => {
              const isExpanded = expandedArrivalId === arrivage.id
              const purchaseValue = arrivage.lignes.reduce(
                (total, line) => total + Number(line.quantite_ajoutee) * Number(line.cout_achat),
                0,
              )
              const saleValue = arrivage.lignes.reduce(
                (total, line) => total + Number(line.quantite_ajoutee) * Number(line.prix_vente),
                0,
              )

              return (
                <Fragment key={arrivage.id}>
                  <tr
                    className={`clickable-row${isExpanded ? ' selected-row' : ''}`}
                    onClick={() => toggleArrival(arrivage.id)}
                  >
                    <td data-label="Date arrivage">{dateLabel(arrivage.date_arrivage)}</td>
                    <td data-label="Commentaire">{arrivage.commentaire || '-'}</td>
                    <td data-label="Lignes">{arrivage.total_lignes}</td>
                    <td data-label="QTT">{arrivage.total_quantite}</td>
                    <td data-label="Valeur achat">{money(purchaseValue)}</td>
                    <td data-label="Valeur vente">{money(saleValue)}</td>
                    <td data-label="Enregistre le">{dateLabel(arrivage.created_at)}</td>
                    <td data-label="Details">
                      {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="expanded-row">
                      <td colSpan={8} className="expanded-sale-cell">
                        <div className="ticket-lines">
                          {arrivage.lignes.map((line, index) => (
                            <div className="ticket-line" key={`${arrivage.id}-${line.produit_id}-${index}`}>
                              <span>
                                {line.nom} ({line.type} / {line.categorie}) x {line.quantite_ajoutee}
                                {line.is_partner ? ` - partenaire ${line.partner_name || ''}` : ''}
                                {` - stock ${line.stock_avant} -> ${line.stock_apres}`}
                              </span>
                              <strong>
                                PA {money(line.cout_achat)} | PV {money(line.prix_vente)} | Total {money(Number(line.quantite_ajoutee) * Number(line.prix_vente))}
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-cell">
                  Aucun arrivage pour ce mois.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls {...controls} />
    </>
  )
}

function isMonthMatch(value: string | null | undefined, month: string) {
  if (!value) return false
  const directMatch = value.slice(0, 7)
  if (/^\d{4}-\d{2}$/.test(directMatch)) {
    return directMatch === month
  }

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    const parsedMonth = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
    return parsedMonth === month
  }

  return false
}

function saleDateValue(vente: Vente) {
  if (vente.date_vente) return vente.date_vente

  const withCreatedAt = vente as Vente & { created_at?: string; createdAt?: string }
  return withCreatedAt.created_at ?? withCreatedAt.createdAt ?? null
}

function saleNumber(vente: Vente) {
  return vente.numero_vente || formatSaleNumberFromDate(vente.date_vente) || String(vente.id)
}

function formatSaleNumberFromDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`
}

function buildStockMovements({
  sales,
  transfers,
  arrivals,
  productsById,
}: {
  sales: Vente[]
  transfers: Transfert[]
  arrivals: Arrivage[]
  productsById: Map<number, Produit>
}) {
  const rows: StockMovementRow[] = []

  for (const arrivage of arrivals) {
    for (let index = 0; index < arrivage.lignes.length; index += 1) {
      const line = arrivage.lignes[index]
      rows.push({
        id: `arrival-${arrivage.id}-${index}-${line.produit_id}`,
        date: arrivage.date_arrivage || arrivage.created_at,
        type: 'ACHAT',
        sens: 'ENTREE',
        produit: line.nom || `Produit #${line.produit_id}`,
        quantite: Number(line.quantite_ajoutee) || 0,
        valeur: (Number(line.quantite_ajoutee) || 0) * (Number(line.cout_achat) || 0),
        detail: `Arrivage #${arrivage.id}`,
      })
    }
  }

  for (const vente of sales) {
    const details = vente.details ?? []
    for (let index = 0; index < details.length; index += 1) {
      const detail = details[index]
      const produit = productsById.get(detail.produit_id)
      rows.push({
        id: `sale-${vente.id}-${index}-${detail.produit_id}`,
        date: saleDateValue(vente) || '',
        type: 'VENTE',
        sens: 'SORTIE',
        produit: produit?.nom ?? `Produit #${detail.produit_id}`,
        quantite: Number(detail.quantite) || 0,
        valeur: (Number(detail.quantite) || 0) * (Number(detail.prix_unitaire) || 0),
        detail: `Vente #${saleNumber(vente)} - ${vente.client}`,
      })
    }
  }

  for (const transfert of transfers) {
    const isRefused = transfert.statut === 'REFUSE'
    rows.push({
      id: `transfer-${transfert.id}`,
      date: transfert.created_at,
      type: 'TRANSFERT',
      sens: isRefused ? 'ENTREE' : 'SORTIE',
      produit: transfert.produit?.nom ?? productsById.get(transfert.produit_id)?.nom ?? `Produit #${transfert.produit_id}`,
      quantite: Number(transfert.quantite) || 0,
      valeur: (Number(transfert.quantite) || 0) * (Number(transfert.prix_unitaire) || 0),
      detail: `${transfert.point_vente} (${transfert.statut})`,
    })
  }

  return rows.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0
    const bTime = b.date ? new Date(b.date).getTime() : 0
    return bTime - aTime
  })
}

function buildGeneralCashMovements({
  entries,
  transfers,
  productsById,
  salesById,
}: {
  entries: AccountingEntry[]
  transfers: Transfert[]
  productsById: Map<number, Produit>
  salesById: Map<number, Vente>
}) {
  const rows: CashMovementRow[] = entries.map((entry) => {
    const amount = Number(entry.amount) || 0
    return {
      id: `entry-${entry.id}`,
      date: entry.created_at,
      operation: accountingOperationLabel(entry),
      canal: entry.account === 'CAISSE' ? 'Caisse' : entry.account === 'COFFRE' ? 'Coffre' : String(entry.account),
      motif: accountingMotif(entry, salesById),
      debit: amount > 0 ? amount : 0,
      credit: amount < 0 ? Math.abs(amount) : 0,
      source: 'COMPTA',
      countInTotals: true,
    }
  })

  for (const transfert of transfers) {
    const relatedAccountingEntry = entries.some(
      (entry) =>
        Number(entry.reference_id ?? 0) === transfert.id &&
        String(entry.reference_type ?? '')
          .toLowerCase()
          .includes('transfert'),
    )
    const total = (Number(transfert.quantite) || 0) * (Number(transfert.prix_unitaire) || 0)
    const showLegacyPaidAmount = transfert.statut === 'PAYE' && !relatedAccountingEntry
    const debit = showLegacyPaidAmount ? total : 0

    rows.push({
      id: `tiers-${transfert.id}`,
      date: transfert.created_at,
      operation: transfert.statut === 'NON_PAYE' ? 'Transfert vers tiers - non paye' : 'Transfert vers tiers',
      canal: 'Tiers',
      motif: `${transfert.point_vente} (${transfert.statut}) - ${
        transfert.produit?.nom ?? productsById.get(transfert.produit_id)?.nom ?? `Produit #${transfert.produit_id}`
      }`,
      debit,
      credit: 0,
      source: 'TIERS',
      countInTotals: showLegacyPaidAmount,
      paymentStatus: transfert.statut,
    })
  }

  return rows.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0
    const bTime = b.date ? new Date(b.date).getTime() : 0
    return bTime - aTime
  })
}

function accountingMotif(entry: AccountingEntry, salesById: Map<number, Vente>) {
  const rawMotif = entry.motif || '-'
  if (String(entry.reference_type ?? '').toLowerCase() !== 'vente' || !entry.reference_id) {
    return rawMotif
  }

  const vente = salesById.get(Number(entry.reference_id))
  if (!vente) return rawMotif

  const nextSaleLabel = `vente #${saleNumber(vente)}`
  if (entry.entry_type === 'SALE') {
    return `Vente #${saleNumber(vente)} - ${vente.client}`
  }

  return rawMotif.replace(/vente\s+#?\d+/i, nextSaleLabel)
}

function accountingOperationLabel(entry: AccountingEntry) {
  if (entry.entry_type === 'TRANSFER_OUT') {
    if (entry.account === 'CAISSE') return 'Transfert interne Caisse -> Coffre'
    if (entry.account === 'COFFRE') return 'Transfert interne Coffre -> Caisse'
    return 'Transfert interne sortant'
  }

  if (entry.entry_type === 'TRANSFER_IN') {
    if (entry.account === 'COFFRE') return 'Transfert interne Caisse -> Coffre'
    if (entry.account === 'CAISSE') return 'Transfert interne Coffre -> Caisse'
    return 'Transfert interne entrant'
  }

  return entryTypeLabel(entry.entry_type)
}

function entryTypeLabel(value: string) {
  const labels: Record<string, string> = {
    MANUAL_IN: 'Ajout manuel',
    TRANSFER_IN: 'Transfert recu',
    TRANSFER_OUT: 'Transfert envoye',
    SALE: 'Vente',
    SALE_ADJUSTMENT: 'Ajustement vente',
    EXPENSE: 'Depense',
    SALARY_ADVANCE: 'Avance salaire',
    SALARY_ADVANCE_CANCEL: 'Annulation avance',
    SALARY_PAYMENT: 'Paiement salaire',
    PARTNER_PAYOUT: 'Retour partenaire',
    PARTNER_PAYOUT_ADJUSTMENT: 'Ajustement partenaire',
    TRANSFER_PAYMENT: 'Paiement transfert',
    TRANSFER_PAYMENT_ADJUSTMENT: 'Ajustement paiement transfert',
    TRANSFER_PAYMENT_CANCEL: 'Annulation paiement transfert',
  }

  return labels[value] ?? value
}

function printInventoryGeneralReport({
  month,
  inventory,
  cashMovements,
  cashTotals,
  stockMovements,
  activeProducts,
  activeProductsTotals,
  arrivals,
  arrivalsTotals,
}: {
  month: string
  inventory: AccountingInventory | null
  cashMovements: CashMovementRow[]
  cashTotals: { debit: number; credit: number }
  stockMovements: StockMovementRow[]
  activeProducts: Produit[]
  activeProductsTotals: { quantity: number; purchase: number; sale: number }
  arrivals: Arrivage[]
  arrivalsTotals: { lines: number; quantity: number; purchase: number; sale: number }
}) {
  const popup = window.open('', 'inventaire-general', 'width=1200,height=820')
  if (!popup) return

  popup.document.write(`
    <html>
      <head>
        <title>Inventaire general ${escapeHtml(month)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          h2 { margin: 18px 0 8px; font-size: 15px; }
          .subtitle { color: #555; margin-bottom: 10px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0 14px; }
          .box { border: 1px solid #bbb; padding: 8px; border-radius: 6px; }
          .box span { display: block; color: #555; font-size: 12px; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
          th, td { border: 1px solid #bbb; padding: 7px; text-align: left; vertical-align: top; }
          th { background: #f2f2f2; }
          .positive { color: #087443; font-weight: bold; }
          .negative { color: #b42318; font-weight: bold; }
          .muted { color: #666; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(STORE_NAME)}</h1>
        <div class="subtitle">Inventaire general - Mois ${escapeHtml(month)}</div>
        <div class="summary">
          <div class="box"><span>Caisse avant mois</span><strong>${money(inventory?.opening.caisse ?? 0)}</strong></div>
          <div class="box"><span>Coffre avant mois</span><strong>${money(inventory?.opening.coffre ?? 0)}</strong></div>
          <div class="box"><span>Caisse actuelle</span><strong>${money(inventory?.closing.caisse ?? 0)}</strong></div>
          <div class="box"><span>Coffre actuel</span><strong>${money(inventory?.closing.coffre ?? 0)}</strong></div>
        </div>

        <h2>Mouvements comptables du mois (debit / credit)</h2>
        <div class="summary">
          <div class="box"><span>Debit total</span><strong class="positive">${money(cashTotals.debit)}</strong></div>
          <div class="box"><span>Credit total</span><strong class="negative">${money(cashTotals.credit)}</strong></div>
          <div class="box"><span>Lignes</span><strong>${cashMovements.length}</strong></div>
          <div class="box"><span>Transferts vers tiers</span><strong>${cashMovements.filter((row) => row.source === 'TIERS').length}</strong></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Operation</th>
              <th>Canal</th>
              <th>Motif</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            ${cashMovements
              .map(
                (row) => `
                  <tr>
                    <td>${dateLabel(row.date)}</td>
                    <td>${escapeHtml(row.operation)}</td>
                    <td>${escapeHtml(row.canal)}</td>
                    <td>${escapeHtml(row.motif)}</td>
                    <td class="${row.debit > 0 ? 'positive' : 'muted'}">${row.debit > 0 ? money(row.debit) : '-'}</td>
                    <td class="${row.credit > 0 ? 'negative' : 'muted'}">${row.credit > 0 ? money(row.credit) : '-'}</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>

        <h2>Produits actifs et valorisation</h2>
        <div class="summary">
          <div class="box"><span>Produits actifs</span><strong>${activeProducts.length}</strong></div>
          <div class="box"><span>Quantite totale</span><strong>${activeProductsTotals.quantity}</strong></div>
          <div class="box"><span>Valeur achat</span><strong>${money(activeProductsTotals.purchase)}</strong></div>
          <div class="box"><span>Valeur vente</span><strong>${money(activeProductsTotals.sale)}</strong></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Type / Categorie</th>
              <th>QTT</th>
              <th>Cout unitaire</th>
              <th>Prix vente</th>
              <th>Valeur achat</th>
              <th>Valeur vente</th>
            </tr>
          </thead>
          <tbody>
            ${activeProducts
              .map(
                (produit) => `
                  <tr>
                    <td>${escapeHtml(produit.nom)}</td>
                    <td>${escapeHtml(`${produit.type} / ${produit.categorie}`)}</td>
                    <td>${Number(produit.quantite) || 0}</td>
                    <td>${money(produit.cout_achat)}</td>
                    <td>${money(produit.prix_vente)}</td>
                    <td>${money((Number(produit.quantite) || 0) * (Number(produit.cout_achat) || 0))}</td>
                    <td>${money((Number(produit.quantite) || 0) * (Number(produit.prix_vente) || 0))}</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>

        <h2>Liste des arrivages</h2>
        <div class="summary">
          <div class="box"><span>Arrivages</span><strong>${arrivals.length}</strong></div>
          <div class="box"><span>Lignes</span><strong>${arrivalsTotals.lines}</strong></div>
          <div class="box"><span>QTT</span><strong>${arrivalsTotals.quantity}</strong></div>
          <div class="box"><span>Valeur achat / vente</span><strong>${money(arrivalsTotals.purchase)} / ${money(arrivalsTotals.sale)}</strong></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date arrivage</th>
              <th>Commentaire</th>
              <th>Lignes</th>
              <th>QTT</th>
              <th>Valeur achat</th>
              <th>Valeur vente</th>
              <th>Detail lignes</th>
            </tr>
          </thead>
          <tbody>
            ${arrivals
              .map((arrivage) => {
                const purchase = arrivage.lignes.reduce(
                  (total, line) => total + Number(line.quantite_ajoutee) * Number(line.cout_achat),
                  0,
                )
                const sale = arrivage.lignes.reduce(
                  (total, line) => total + Number(line.quantite_ajoutee) * Number(line.prix_vente),
                  0,
                )
                return `
                  <tr>
                    <td>${dateLabel(arrivage.date_arrivage)}</td>
                    <td>${escapeHtml(arrivage.commentaire || '-')}</td>
                    <td>${arrivage.total_lignes}</td>
                    <td>${arrivage.total_quantite}</td>
                    <td>${money(purchase)}</td>
                    <td>${money(sale)}</td>
                    <td>${arrivage.lignes
                      .map((line) => {
                        const label = `${line.nom} (${line.type} / ${line.categorie}) x ${line.quantite_ajoutee}${
                          line.is_partner ? ` - partenaire ${line.partner_name || ''}` : ''
                        } - stock ${line.stock_avant} -> ${line.stock_apres}`
                        const value = `PA ${money(line.cout_achat)} | PV ${money(line.prix_vente)} | Total ${money(
                          Number(line.quantite_ajoutee) * Number(line.prix_vente),
                        )}`
                        return `<div>${escapeHtml(label)}<br/><strong>${escapeHtml(value)}</strong></div>`
                      })
                      .join('<hr/>')}</td>
                  </tr>
                `
              })
              .join('')}
          </tbody>
        </table>

        <h2 class="muted">Mouvements stock (trace)</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Sens</th>
              <th>Produit</th>
              <th>QTT</th>
              <th>Valeur</th>
            </tr>
          </thead>
          <tbody>
            ${stockMovements
              .map(
                (row) => `
                  <tr>
                    <td>${dateLabel(row.date)}</td>
                    <td>${escapeHtml(row.type)}</td>
                    <td>${escapeHtml(row.sens)}</td>
                    <td>${escapeHtml(row.produit)}</td>
                    <td>${row.quantite}</td>
                    <td>${money(row.valeur)}</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
        <script>window.print()</script>
      </body>
    </html>
  `)
  popup.document.close()
}

function printEntries(entries: AccountingEntry[], title: string) {
  const popup = window.open('', 'mouvements', 'width=920,height=720')
  if (!popup) return

  popup.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          .subtitle { margin-bottom: 14px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #bbb; padding: 7px; text-align: left; }
          th { background: #f2f2f2; }
          .positive { color: #087443; font-weight: bold; }
          .negative { color: #b42318; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(STORE_NAME)}</h1>
        <div class="subtitle">${escapeHtml(title)}</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Compte</th>
              <th>Type</th>
              <th>Motif</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            ${entries
              .map(
                (entry) => `
                  <tr>
                    <td>${dateLabel(entry.created_at)}</td>
                    <td>${entry.account === 'CAISSE' ? 'Caisse' : 'Coffre'}</td>
                    <td>${entryTypeLabel(entry.entry_type)}</td>
                    <td>${escapeHtml(entry.motif)}</td>
                    <td class="${Number(entry.amount) < 0 ? 'negative' : 'positive'}">${money(entry.amount)}</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
        <script>window.print()</script>
      </body>
    </html>
  `)
  popup.document.close()
}

function printSalaryPaymentReceipt({
  employe,
  account,
  salaryAbsenceDeduction,
}: {
  employe: Employe
  account: AccountingAccount
  salaryAbsenceDeduction: number
}) {
  const popup = window.open('', 'salary-payment', 'width=760,height=720')
  if (!popup) return

  popup.document.write(`
    <html>
      <head>
        <title>Paiement salaire ${escapeHtml(`${employe.nom} ${employe.prenoms}`)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          .subtitle { margin-bottom: 14px; color: #555; }
          .sheet { display: grid; gap: 14px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .box { border: 1px solid #bbb; padding: 10px; border-radius: 6px; }
          .box span { display: block; color: #555; font-size: 12px; margin-bottom: 4px; }
          .box strong { display: block; font-size: 15px; }
          .summary { width: 100%; border-collapse: collapse; margin-top: 6px; }
          .summary th, .summary td { border: 1px solid #bbb; padding: 8px; text-align: left; }
          .summary th { background: #f2f2f2; }
          .negative { color: #b42318; font-weight: bold; }
          .positive { color: #087443; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(STORE_NAME)}</h1>
        <div class="subtitle">Paiement salaire personnel</div>
        <div class="sheet">
          <div class="grid">
            <div class="box">
              <span>Personnel</span>
              <strong>${escapeHtml(`${employe.nom} ${employe.prenoms}`)}</strong>
            </div>
            <div class="box">
              <span>Date</span>
              <strong>${new Date().toLocaleString('fr-FR')}</strong>
            </div>
            <div class="box">
              <span>CIN</span>
              <strong>${escapeHtml(employe.cin)}</strong>
            </div>
            <div class="box">
              <span>Compte de paiement</span>
              <strong>${account === 'CAISSE' ? 'Caisse' : 'Coffre'}</strong>
            </div>
          </div>
          <table class="summary">
            <thead>
              <tr>
                <th>Libelle</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Salaire mensuel</td>
                <td>${money(employe.salaire_mensuel)}</td>
              </tr>
              <tr>
                <td>Retenue absence</td>
                <td class="negative">-${money(salaryAbsenceDeduction)}</td>
              </tr>
              <tr>
                <td>Avances du mois</td>
                <td class="negative">-${money(employe.total_avances_mois)}</td>
              </tr>
              <tr>
                <td>Net a payer</td>
                <td class="positive">${money(employe.salaire_final)}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
