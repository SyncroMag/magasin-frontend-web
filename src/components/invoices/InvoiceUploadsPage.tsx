import { Download, Eye, ImageUp, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../api'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import { dateLabel } from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notifications'
import type { FormEvent } from 'react'
import type { FactureUpload } from '../../types'

type InvoiceUploadsPageProps = {
  token: string
}

export function InvoiceUploadsPage({ token }: InvoiceUploadsPageProps) {
  const [factures, setFactures] = useState<FactureUpload[]>([])
  const [comment, setComment] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [selectedFacture, setSelectedFacture] = useState<FactureUpload | null>(null)
  const { pageItems: paginatedFactures, controls: facturePagination } = usePaginatedItems(factures)

  useEffect(() => {
    void loadFactures()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadFactures() {
    try {
      setFactures(await api.factures(token))
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Chargement factures impossible')
    }
  }

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      notifyError('Choisis une image de facture.')
      return
    }

    setLoading(true)
    try {
      await api.uploadFacture(token, { file, comment })
      setFile(null)
      setComment('')
      const input = document.getElementById('invoice-upload-file') as HTMLInputElement | null
      if (input) input.value = ''
      notifySuccess('Facture uploadee.')
      await loadFactures()
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Upload facture impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="view-stack">
      <article className="panel view-stack">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Factures</p>
            <h2>Upload image facture</h2>
          </div>
          <ImageUp size={20} aria-hidden="true" />
        </div>
        <form className="toolbar-grid" onSubmit={submitUpload}>
          <label>
            Image
            <input
              id="invoice-upload-file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
            />
          </label>
          <label>
            Commentaire
            <input value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
          <button className="primary-button" type="submit" disabled={isLoading}>
            <Plus size={18} aria-hidden="true" />
            Uploader
          </button>
        </form>
      </article>

      <article className="panel view-stack">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Factures</p>
            <h2>Images uploadees</h2>
          </div>
          <ImageUp size={20} aria-hidden="true" />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fichier</th>
                <th>Commentaire</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFactures.map((facture) => (
                <tr key={facture.id} className="clickable-row" onClick={() => setSelectedFacture(facture)}>
                  <td data-label="Fichier">
                    <strong>{facture.original_filename}</strong>
                    <span>{facture.content_type}</span>
                  </td>
                  <td data-label="Commentaire">{facture.comment || '-'}</td>
                  <td data-label="Date">{dateLabel(facture.created_at)}</td>
                  <td data-label="Actions">
                    <div className="icon-actions">
                      <button
                        className="icon-button"
                        type="button"
                        title="Voir"
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedFacture(facture)
                        }}
                      >
                        <Eye size={16} aria-hidden="true" />
                      </button>
                      <a
                        className="icon-button"
                        title="Telecharger"
                        href={api.assetUrl(facture.file_url)}
                        download={facture.original_filename}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Download size={16} aria-hidden="true" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {factures.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    Aucune facture uploadee.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls {...facturePagination} />
      </article>

      {selectedFacture && (
        <ImageModal facture={selectedFacture} onClose={() => setSelectedFacture(null)} />
      )}
    </section>
  )
}

function ImageModal({ facture, onClose }: { facture: FactureUpload; onClose: () => void }) {
  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel image-modal-panel" role="dialog" aria-modal="true" aria-label="Facture">
        <div className="modal-header">
          <div>
            <h2>{facture.original_filename}</h2>
            <span>{facture.comment || 'Sans commentaire'}</span>
          </div>
          <div className="icon-actions">
            <a className="icon-button" href={api.assetUrl(facture.file_url)} download={facture.original_filename}>
              <Download size={18} aria-hidden="true" />
            </a>
            <button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <img className="invoice-preview" src={api.assetUrl(facture.file_url)} alt={facture.original_filename} />
      </section>
    </div>,
    document.body,
  )
}
