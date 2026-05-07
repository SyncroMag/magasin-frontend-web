import { Pencil, Plus, Save, Trash2, Wrench, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useMemo, useState } from 'react'
import { FormattedNumberInput } from '../common/FormattedNumberInput'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import { money } from '../../utils/format'
import type { FormEvent, ReactNode } from 'react'
import type { OutilMagasin, OutilMagasinCreate } from '../../types'

type OutilsPageProps = {
  outils: OutilMagasin[]
  canManage: boolean
  onCreate: (outil: OutilMagasinCreate) => Promise<void>
  onUpdate: (outilId: number, outil: OutilMagasinCreate) => Promise<void>
  onDelete: (outilId: number) => void
}

const emptyOutil: OutilMagasinCreate = {
  type: '',
  categorie: '',
  produit: '',
  quantite: 0,
  valeur_estimee: 0,
}

export function OutilsPage({
  outils,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
}: OutilsPageProps) {
  const [isModalOpen, setModalOpen] = useState(false)
  const [editingOutil, setEditingOutil] = useState<OutilMagasin | null>(null)
  const [form, setForm] = useState<OutilMagasinCreate>(emptyOutil)
  const { pageItems: paginatedOutils, controls: outilPagination } = usePaginatedItems(outils)
  const typeOptions = useMemo(() => unique(outils.map((outil) => outil.type)), [outils])
  const categoryOptions = useMemo(
    () => unique(outils.filter((outil) => !form.type || outil.type === form.type).map((outil) => outil.categorie ?? '')),
    [form.type, outils],
  )
  const produitOptions = useMemo(
    () =>
      unique(
        outils
          .filter(
            (outil) =>
              (!form.type || outil.type === form.type) &&
              (!form.categorie || outil.categorie === form.categorie),
          )
          .map((outil) => outil.produit ?? ''),
      ),
    [form.categorie, form.type, outils],
  )

  function openCreate() {
    setEditingOutil(null)
    setForm(emptyOutil)
    setModalOpen(true)
  }

  function openEdit(outil: OutilMagasin) {
    setEditingOutil(outil)
    setForm({
      type: outil.type,
      categorie: outil.categorie ?? '',
      produit: outil.produit ?? '',
      quantite: Number(outil.quantite ?? 0),
      valeur_estimee: Number(outil.valeur_estimee ?? 0),
    })
    setModalOpen(true)
  }

  async function submitOutil(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = {
      ...form,
      categorie: form.categorie || null,
      produit: form.produit || null,
      quantite: Number(form.quantite) || 0,
      valeur_estimee: Number(form.valeur_estimee) || 0,
    }

    if (editingOutil) {
      await onUpdate(editingOutil.id, payload)
    } else {
      await onCreate(payload)
    }
    setModalOpen(false)
  }

  return (
    <article className="panel view-stack">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Espace admin</p>
          <h2>Outils magasin</h2>
        </div>
        {canManage && (
          <button className="primary-button compact-button" type="button" onClick={openCreate}>
            <Plus size={18} aria-hidden="true" />
            Ajouter
          </button>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Outil</th>
              <th>Produit</th>
              <th>Categorie</th>
              <th>Nombre</th>
              <th>Valeur estimee</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedOutils.map((outil) => (
              <tr key={outil.id}>
                <td data-label="Outil">
                  <strong>{outil.type}</strong>
                </td>
                <td data-label="Produit">{outil.produit || '-'}</td>
                <td data-label="Categorie">{outil.categorie || '-'}</td>
                <td data-label="Nombre">{outil.quantite}</td>
                <td data-label="Valeur estimee">{money(outil.valeur_estimee)}</td>
                {canManage && (
                  <td data-label="Actions">
                    <div className="icon-actions">
                      <button className="icon-button" type="button" title="Modifier" onClick={() => openEdit(outil)}>
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button danger-icon"
                        type="button"
                        title="Supprimer"
                        onClick={() => onDelete(outil.id)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {outils.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="empty-cell">
                  Aucun outil a afficher.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls {...outilPagination} />
      {isModalOpen && (
        <Modal title={editingOutil ? 'Modifier outil' : 'Ajouter outil'} onClose={() => setModalOpen(false)}>
          <form className="modal-form" onSubmit={submitOutil}>
            <label>
              Type
              <input
                list="outils-types"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value, categorie: '', produit: '' })}
                required
              />
              <datalist id="outils-types">
                {typeOptions.map((type) => (
                  <option value={type} key={type} />
                ))}
              </datalist>
            </label>
            <label>
              Categorie
              <input
                list="outils-categories"
                value={form.categorie ?? ''}
                onChange={(event) => setForm({ ...form, categorie: event.target.value, produit: '' })}
              />
              <datalist id="outils-categories">
                {categoryOptions.map((categorie) => (
                  <option value={categorie} key={categorie} />
                ))}
              </datalist>
            </label>
            <label>
              Produit
              <input
                list="outils-produits"
                value={form.produit ?? ''}
                onChange={(event) => setForm({ ...form, produit: event.target.value })}
              />
              <datalist id="outils-produits">
                {produitOptions.map((produit) => (
                  <option value={produit} key={produit} />
                ))}
              </datalist>
            </label>
            <label>
              Nombre
              <input
                type="number"
                min="0"
                value={Number(form.quantite ?? 0)}
                onChange={(event) => setForm({ ...form, quantite: Number(event.target.value) })}
              />
            </label>
            <label>
              Valeur estimee
              <FormattedNumberInput
                value={Number(form.valeur_estimee ?? 0)}
                min={0}
                onValueChange={(valeur_estimee) => setForm({ ...form, valeur_estimee })}
              />
            </label>
            <button className="primary-button" type="submit">
              {editingOutil ? <Save size={18} aria-hidden="true" /> : <Wrench size={18} aria-hidden="true" />}
              {editingOutil ? 'Enregistrer' : 'Creer'}
            </button>
          </form>
        </Modal>
      )}
    </article>
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

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}
