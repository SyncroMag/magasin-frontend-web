import { Check, ChevronDown, ChevronRight, Pencil, Plus, Save, Trash2, UserPlus, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Fragment, useMemo, useState } from 'react'
import { FormattedNumberInput } from '../common/FormattedNumberInput'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import { dateLabel, money } from '../../utils/format'
import type { FormEvent, ReactNode } from 'react'
import type { AbsenceType, AccountingAccount, Employe, EmployeCreate } from '../../types'

type PersonnelPageProps = {
  employes: Employe[]
  canManage: boolean
  month: string
  onMonthChange: (month: string) => void
  onCreate: (employe: EmployeCreate) => Promise<void>
  onUpdate: (employeId: number, employe: Partial<EmployeCreate>) => Promise<void>
  onDelete: (employeId: number) => void
  onCreateAbsence: (employeId: number, absence: { date_absence: string; type_absence: AbsenceType; commentaire?: string | null }) => Promise<void>
  onDeleteAbsence: (absenceId: number) => void
  onCreateAvance: (
    employeId: number,
    avance: { date_avance: string; montant: number; source_compte?: AccountingAccount; commentaire?: string | null },
  ) => Promise<void>
  onDeleteAvance: (avanceId: number) => void
}

const emptyEmploye = (): EmployeCreate => ({
  nom: '',
  prenoms: '',
  cin: '',
  date_cin: '',
  lot: '',
  date_naissance: '',
  date_embauche: todayValue(),
  salaire_mensuel: 0,
})

export function PersonnelPage({
  employes,
  canManage,
  month,
  onMonthChange,
  onCreate,
  onUpdate,
  onDelete,
  onCreateAbsence,
  onDeleteAbsence,
  onCreateAvance,
  onDeleteAvance,
}: PersonnelPageProps) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [activePanel, setActivePanel] = useState<'absence' | 'avance' | null>(null)
  const [isModalOpen, setModalOpen] = useState(false)
  const [editingEmploye, setEditingEmploye] = useState<Employe | null>(null)
  const [form, setForm] = useState<EmployeCreate>(emptyEmploye())
  const [absenceForm, setAbsenceForm] = useState({
    employeId: '',
    date_absence: todayValue(),
    type_absence: 'UN_JOUR' as AbsenceType,
    commentaire: '',
  })
  const [avanceForm, setAvanceForm] = useState({
    employeId: '',
    source_compte: 'CAISSE' as AccountingAccount,
    date_avance: todayValue(),
    montant: 0,
    commentaire: '',
  })

  const filteredEmployes = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return employes

    return employes.filter((employe) =>
      [employe.nom, employe.prenoms, employe.cin, employe.lot ?? ''].some((field) =>
        field.toLowerCase().includes(value),
      ),
    )
  }, [employes, query])
  const { pageItems: paginatedEmployes, controls: employePagination } = usePaginatedItems(filteredEmployes)

  function openCreate() {
    setEditingEmploye(null)
    setForm(emptyEmploye())
    setModalOpen(true)
  }

  function openEdit(employe: Employe) {
    setEditingEmploye(employe)
    setForm({
      nom: employe.nom,
      prenoms: employe.prenoms,
      cin: employe.cin,
      date_cin: employe.date_cin ?? '',
      lot: employe.lot ?? '',
      date_naissance: employe.date_naissance ?? '',
      date_embauche: employe.date_embauche,
      salaire_mensuel: Number(employe.salaire_mensuel),
    })
    setModalOpen(true)
  }

  async function submitEmploye(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = cleanEmployePayload(form)
    if (editingEmploye) {
      await onUpdate(editingEmploye.id, payload)
    } else {
      await onCreate(payload)
    }
    setModalOpen(false)
  }

  async function submitAbsence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const employeId = Number(absenceForm.employeId)
    if (!employeId) return

    await onCreateAbsence(employeId, {
      date_absence: absenceForm.date_absence,
      type_absence: absenceForm.type_absence,
      commentaire: absenceForm.commentaire || null,
    })
    setAbsenceForm({
      employeId: '',
      date_absence: todayValue(),
      type_absence: 'UN_JOUR',
      commentaire: '',
    })
    setActivePanel(null)
  }

  async function submitAvance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const employeId = Number(avanceForm.employeId)
    if (!employeId) return

    await onCreateAvance(employeId, {
      date_avance: avanceForm.date_avance,
      montant: Number(avanceForm.montant),
      source_compte: avanceForm.source_compte,
      commentaire: avanceForm.commentaire || null,
    })
    setAvanceForm({ employeId: '', source_compte: 'CAISSE', date_avance: todayValue(), montant: 0, commentaire: '' })
    setActivePanel(null)
  }

  function cancelQuickPanel() {
    setActivePanel(null)
    setAbsenceForm({ employeId: '', date_absence: todayValue(), type_absence: 'UN_JOUR', commentaire: '' })
    setAvanceForm({ employeId: '', source_compte: 'CAISSE', date_avance: todayValue(), montant: 0, commentaire: '' })
  }

  return (
    <section className="view-stack">
      <div className="external-action-bar">
        <button className="ghost-button compact-button" type="button" onClick={() => setActivePanel('absence')} disabled={!canManage}>
          <Plus size={18} aria-hidden="true" />
          Ajouter absence
        </button>
        <button className="ghost-button compact-button" type="button" onClick={() => setActivePanel('avance')} disabled={!canManage}>
          <Plus size={18} aria-hidden="true" />
          Ajouter avance
        </button>
        <button className="primary-button compact-button" type="button" onClick={openCreate} disabled={!canManage}>
          <UserPlus size={18} aria-hidden="true" />
          Ajouter personnel
        </button>
      </div>

      {activePanel === 'absence' && (
        <form className="external-form-panel" onSubmit={submitAbsence}>
          <label>
            Personnel
            <select
              value={absenceForm.employeId}
              onChange={(event) => setAbsenceForm({ ...absenceForm, employeId: event.target.value })}
              required
            >
              <option value="">Selectionner un personnel</option>
              {employes.map((employe) => (
                <option value={employe.id} key={employe.id}>
                  {employe.nom} {employe.prenoms}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              value={absenceForm.date_absence}
              onChange={(event) => setAbsenceForm({ ...absenceForm, date_absence: event.target.value })}
            />
          </label>
          <label>
            Type
            <select
              value={absenceForm.type_absence}
              onChange={(event) => setAbsenceForm({ ...absenceForm, type_absence: event.target.value as AbsenceType })}
            >
              <option value="UN_JOUR">1 jour</option>
              <option value="DEUX_JOURS">2 jours</option>
              <option value="DEMI_JOURNEE">1/2 journee</option>
            </select>
          </label>
          <label>
            Commentaire
            <input
              value={absenceForm.commentaire}
              onChange={(event) => setAbsenceForm({ ...absenceForm, commentaire: event.target.value })}
            />
          </label>
          <div className="filter-actions">
            <button className="primary-button compact-button" type="submit">
              <Check size={16} aria-hidden="true" />
              Enregistrer
            </button>
            <button className="ghost-button compact-button" type="button" onClick={cancelQuickPanel}>
              <X size={16} aria-hidden="true" />
              Annuler
            </button>
          </div>
        </form>
      )}

      {activePanel === 'avance' && (
        <form className="external-form-panel" onSubmit={submitAvance}>
          <label>
            Personnel
            <select
              value={avanceForm.employeId}
              onChange={(event) => setAvanceForm({ ...avanceForm, employeId: event.target.value })}
              required
            >
              <option value="">Selectionner un personnel</option>
              {employes.map((employe) => (
                <option value={employe.id} key={employe.id}>
                  {employe.nom} {employe.prenoms}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              value={avanceForm.date_avance}
              onChange={(event) => setAvanceForm({ ...avanceForm, date_avance: event.target.value })}
            />
          </label>
          <label>
            Compte
            <select
              value={avanceForm.source_compte}
              onChange={(event) => setAvanceForm({ ...avanceForm, source_compte: event.target.value as AccountingAccount })}
            >
              <option value="CAISSE">Caisse</option>
              <option value="COFFRE">Coffre</option>
            </select>
          </label>
          <label>
            Montant
            <FormattedNumberInput
              value={avanceForm.montant}
              min={0}
              onValueChange={(montant) => setAvanceForm({ ...avanceForm, montant })}
            />
          </label>
          <label>
            Commentaire
            <input
              value={avanceForm.commentaire}
              onChange={(event) => setAvanceForm({ ...avanceForm, commentaire: event.target.value })}
            />
          </label>
          <div className="filter-actions">
            <button className="primary-button compact-button" type="submit">
              <Check size={16} aria-hidden="true" />
              Enregistrer
            </button>
            <button className="ghost-button compact-button" type="button" onClick={cancelQuickPanel}>
              <X size={16} aria-hidden="true" />
              Annuler
            </button>
          </div>
        </form>
      )}

      <article className="panel view-stack">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Espace admin</p>
            <h2>Personnel</h2>
          </div>
        </div>

        <div className="toolbar-grid personnel-toolbar">
          <label>
            Recherche
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label>
            Mois salaire
            <input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} />
          </label>
        </div>
        <div className="table-wrap">
          <table className="personnel-table">
            <thead>
              <tr>
                <th>Employe</th>
                <th>CIN</th>
                <th>Embauche</th>
                <th>Salaire mensuel</th>
                <th>Avances</th>
                <th>Salaire final</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEmployes.map((employe) => {
                const isExpanded = selectedId === employe.id

                return (
                  <Fragment key={employe.id}>
                    <tr
                      className={isExpanded ? 'selected-row' : undefined}
                      onClick={() => setSelectedId(isExpanded ? null : employe.id)}
                    >
                      <td data-label="Employe">
                        <span className="expand-cell">
                          {isExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                          <span>
                            <strong>{employe.nom}</strong>
                            <span>{employe.prenoms}</span>
                          </span>
                        </span>
                      </td>
                      <td data-label="CIN">{employe.cin}</td>
                      <td data-label="Embauche">{dateLabel(employe.date_embauche)}</td>
                      <td data-label="Salaire mensuel">{money(employe.salaire_mensuel)}</td>
                      <td data-label="Avances">{money(employe.total_avances_mois)}</td>
                      <td data-label="Salaire final">{money(employe.salaire_final)}</td>
                      <td data-label="Actions" onClick={(event) => event.stopPropagation()}>
                        <div className="icon-actions">
                          <button className="icon-button" type="button" title="Modifier" onClick={() => openEdit(employe)}>
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            className="icon-button danger-icon"
                            type="button"
                            title="Supprimer"
                            onClick={() => onDelete(employe.id)}
                            disabled={!canManage}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="expanded-row">
                        <td colSpan={7}>
                          <div className="expanded-content">
                            <div className="metric-card accent-green">
                              <span>Date 13e mois prevue</span>
                              <strong>{dateLabel(employe.date_13eme_prevue)}</strong>
                              <small>Montant: {money(employe.montant_13eme_prevu)}</small>
                            </div>
                            <div>
                              <strong>Absences recentes</strong>
                              <div className="stack-list compact-list">
                                {employe.absences.slice(0, 4).map((absence) => (
                                  <div className="stack-item" key={absence.id}>
                                    <div>
                                      <strong>{absenceLabel(absence.type_absence)}</strong>
                                      <span>{dateLabel(absence.date_absence)}</span>
                                    </div>
                                    <button
                                      className="icon-button danger-icon"
                                      type="button"
                                      onClick={() => onDeleteAbsence(absence.id)}
                                      disabled={!canManage}
                                    >
                                      <X size={16} aria-hidden="true" />
                                    </button>
                                  </div>
                                ))}
                                {employe.absences.length === 0 && <p className="muted">Aucune absence.</p>}
                              </div>
                            </div>
                            <div>
                              <strong>Avances recentes</strong>
                              <div className="stack-list compact-list">
                                {employe.avances.slice(0, 4).map((avance) => (
                                  <div className="stack-item" key={avance.id}>
                                    <div>
                                      <strong>{money(avance.montant)}</strong>
                                      <span>{dateLabel(avance.date_avance)}</span>
                                    </div>
                                    <button
                                      className="icon-button danger-icon"
                                      type="button"
                                      onClick={() => onDeleteAvance(avance.id)}
                                      disabled={!canManage}
                                    >
                                      <X size={16} aria-hidden="true" />
                                    </button>
                                  </div>
                                ))}
                                {employe.avances.length === 0 && <p className="muted">Aucune avance.</p>}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {filteredEmployes.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    Aucun personnel a afficher.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls {...employePagination} />

      {isModalOpen && (
        <Modal title={editingEmploye ? 'Modifier personnel' : 'Ajouter personnel'} onClose={() => setModalOpen(false)}>
          <form className="modal-form" onSubmit={submitEmploye}>
            <EmployeFields form={form} onChange={setForm} />
            <button className="primary-button" type="submit">
              {editingEmploye ? <Save size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
              {editingEmploye ? 'Enregistrer' : 'Creer'}
            </button>
          </form>
        </Modal>
      )}
      </article>
    </section>
  )
}

function EmployeFields({
  form,
  onChange,
}: {
  form: EmployeCreate
  onChange: (form: EmployeCreate) => void
}) {
  return (
    <>
      <div className="two-cols">
        <label>
          Nom
          <input value={form.nom} onChange={(event) => onChange({ ...form, nom: event.target.value })} required />
        </label>
        <label>
          Prenoms
          <input value={form.prenoms} onChange={(event) => onChange({ ...form, prenoms: event.target.value })} required />
        </label>
      </div>
      <div className="two-cols">
        <label>
          CIN
          <input value={form.cin} onChange={(event) => onChange({ ...form, cin: event.target.value })} required />
        </label>
        <label>
          Date CIN
          <input type="date" value={form.date_cin ?? ''} onChange={(event) => onChange({ ...form, date_cin: event.target.value })} />
        </label>
      </div>
      <label>
        Lot
        <input value={form.lot ?? ''} onChange={(event) => onChange({ ...form, lot: event.target.value })} />
      </label>
      <div className="two-cols">
        <label>
          Date naissance
          <input
            type="date"
            value={form.date_naissance ?? ''}
            onChange={(event) => onChange({ ...form, date_naissance: event.target.value })}
          />
        </label>
        <label>
          Date embauche
          <input
            type="date"
            value={form.date_embauche}
            onChange={(event) => onChange({ ...form, date_embauche: event.target.value })}
            required
          />
        </label>
      </div>
      <label>
        Salaire mensuel
        <FormattedNumberInput
          value={form.salaire_mensuel}
          min={0}
          required
          onValueChange={(salaire_mensuel) => onChange({ ...form, salaire_mensuel })}
        />
      </label>
    </>
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

function cleanEmployePayload(form: EmployeCreate) {
  return {
    ...form,
    date_cin: form.date_cin || null,
    lot: form.lot || null,
    date_naissance: form.date_naissance || null,
    salaire_mensuel: Number(form.salaire_mensuel),
  }
}

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function absenceLabel(value: string) {
  if (value === 'DEUX_JOURS') return '2 jours'
  if (value === 'DEMI_JOURNEE') return '1/2 journee'
  return '1 jour'
}
