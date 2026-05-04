import { ArrowRightLeft, Check, Plus, Printer, ReceiptText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { STORE_NAME } from '../../constants'
import { FormattedNumberInput } from '../common/FormattedNumberInput'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import { dateLabel, money } from '../../utils/format'
import { notifyError } from '../../utils/notifications'
import type { FormEvent, ReactNode } from 'react'
import type { AccountingAccount, AccountingEntry, AccountingInventory, AccountingSummary, Employe } from '../../types'

export type AccountingSection = 'cash' | 'vault' | 'expenses' | 'inventory'

type AccountingPageProps = {
  section: AccountingSection
  token: string
  summary: AccountingSummary | null
  entries: AccountingEntry[]
  employes: Employe[]
  onManual: (data: { account: AccountingAccount; amount: number; motif: string }) => Promise<void>
  onTransfer: (data: { from_account: AccountingAccount; to_account: AccountingAccount; amount: number; motif: string }) => Promise<void>
  onExpense: (data: { account: AccountingAccount; amount: number; motif: string }) => Promise<void>
  onSalaryPayment: (data: { account: AccountingAccount; employe_id: number; amount: number; motif?: string | null }) => Promise<void>
}

const accountBySection: Record<'cash' | 'vault', AccountingAccount> = {
  cash: 'CAISSE',
  vault: 'COFFRE',
}

export function AccountingPage({
  section,
  token,
  summary,
  entries,
  employes,
  onManual,
  onTransfer,
  onExpense,
  onSalaryPayment,
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

  useEffect(() => {
    if (section !== 'inventory') return

    void loadInventory(inventoryMonth)
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
        />
      </section>
    )
  }

  if (section === 'inventory') {
    const inventoryEntries = inventory?.entries ?? []

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
              onClick={() => inventory && printInventory(inventory)}
              disabled={!inventory || inventoryLoading}
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

        <EntriesTable
          entries={inventoryEntries}
          title={inventoryLoading ? 'Chargement inventaire' : 'Mouvements du mois'}
          footer={
            inventory ? (
              <tr className="total-row">
                <td data-label="Date">Total</td>
                <td data-label="Compte">-</td>
                <td data-label="Type">Entrees / sorties</td>
                <td data-label="Motif">Mois {inventory.month}</td>
                <td data-label="Montant" className="total-row-cell">
                  <strong className="amount-positive">{money(inventory.total_in)}</strong>
                  <span className="amount-negative"> / -{money(inventory.total_out)}</span>
                </td>
              </tr>
            ) : null
          }
        />
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
      <EntriesTable entries={visibleEntries} />
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
}: {
  entries: AccountingEntry[]
  title?: string
  footer?: ReactNode
  printable?: boolean
  printTitle?: string
}) {
  const { pageItems, controls } = usePaginatedItems(entries)

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
      <div className="table-wrap">
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
            {pageItems.map((entry) => (
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
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-cell">
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

function entryTypeLabel(value: string) {
  const labels: Record<string, string> = {
    MANUAL_IN: 'Ajout manuel',
    TRANSFER_IN: 'Transfert recu',
    TRANSFER_OUT: 'Transfert envoye',
    SALE: 'Vente',
    SALE_ADJUSTMENT: 'Ajustement vente',
    SALE_CANCEL: 'Annulation vente',
    EXPENSE: 'Depense',
    SALARY_ADVANCE: 'Avance salaire',
    SALARY_ADVANCE_CANCEL: 'Annulation avance',
    SALARY_PAYMENT: 'Paiement salaire',
    PARTNER_PAYOUT: 'Retour partenaire',
    PARTNER_PAYOUT_ADJUSTMENT: 'Ajustement partenaire',
    PARTNER_PAYOUT_CANCEL: 'Annulation retour partenaire',
  }

  return labels[value] ?? value
}

function printInventory(inventory: AccountingInventory) {
  const popup = window.open('', 'inventaire', 'width=920,height=720')
  if (!popup) return

  popup.document.write(`
    <html>
      <head>
        <title>Inventaire ${escapeHtml(inventory.month)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          h2 { margin: 18px 0 8px; font-size: 15px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; }
          .box { border: 1px solid #bbb; padding: 8px; }
          .box span { display: block; color: #555; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #bbb; padding: 7px; text-align: left; }
          th { background: #f2f2f2; }
          .positive { color: #087443; font-weight: bold; }
          .negative { color: #b42318; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(STORE_NAME)}</h1>
        <div>Inventaire comptable</div>
        <div>Mois: ${escapeHtml(inventory.month)}</div>
        <h2>Avant le mois</h2>
        <div class="summary">
          <div class="box"><span>Caisse</span><strong>${money(inventory.opening.caisse)}</strong></div>
          <div class="box"><span>Coffre</span><strong>${money(inventory.opening.coffre)}</strong></div>
          <div class="box"><span>Total</span><strong>${money(inventory.opening.total)}</strong></div>
        </div>
        <h2>Apres le mois</h2>
        <div class="summary">
          <div class="box"><span>Caisse</span><strong>${money(inventory.closing.caisse)}</strong></div>
          <div class="box"><span>Coffre</span><strong>${money(inventory.closing.coffre)}</strong></div>
          <div class="box"><span>Total</span><strong>${money(inventory.closing.total)}</strong></div>
        </div>
        <div class="summary">
          <div class="box"><span>Total entree</span><strong>${money(inventory.total_in)}</strong></div>
          <div class="box"><span>Total sortie</span><strong>${money(inventory.total_out)}</strong></div>
          <div class="box"><span>Mouvements</span><strong>${inventory.entries.length}</strong></div>
        </div>
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
            ${inventory.entries
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
