import { Check, ClipboardCheck, X } from 'lucide-react'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import { dateLabel } from '../../utils/format'
import type { Approval, User } from '../../types'

export type ApprovalFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'

type ApprovalsPageProps = {
  approvals: Approval[]
  users: User[]
  filter: ApprovalFilter
  canReviewActions: boolean
  reviewComments: Record<number, string>
  onFilterChange: (value: ApprovalFilter) => void
  onCommentChange: (approvalId: number, value: string) => void
  onReview: (approval: Approval, approve: boolean) => void
}

export function ApprovalsPage({
  approvals,
  users,
  filter,
  canReviewActions,
  reviewComments,
  onFilterChange,
  onCommentChange,
  onReview,
}: ApprovalsPageProps) {
  const { pageItems: paginatedApprovals, controls: approvalPagination } = usePaginatedItems(approvals)
  const userById = new Map(users.map((user) => [user.id, user.username]))

  return (
    <article className="panel view-stack" id="approvals">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Controle</p>
          <h2>Demandes d approbation</h2>
        </div>
        <ClipboardCheck size={20} aria-hidden="true" />
      </div>
      <div className="panel-actions">
        <button
          type="button"
          className={filter === 'PENDING' ? 'primary-button compact-button' : 'ghost-button compact-button'}
          onClick={() => onFilterChange('PENDING')}
        >
          En attente
        </button>
        <button
          type="button"
          className={filter === 'ALL' ? 'primary-button compact-button' : 'ghost-button compact-button'}
          onClick={() => onFilterChange('ALL')}
        >
          Voir liste des demandes
        </button>
        <button
          type="button"
          className={filter === 'APPROVED' ? 'primary-button compact-button' : 'ghost-button compact-button'}
          onClick={() => onFilterChange('APPROVED')}
        >
          Acceptees
        </button>
        <button
          type="button"
          className={filter === 'REJECTED' ? 'primary-button compact-button' : 'ghost-button compact-button'}
          onClick={() => onFilterChange('REJECTED')}
        >
          Refusees
        </button>
        {!canReviewActions && <span className="pill info">Lecture seule</span>}
      </div>
      <div className="approval-list">
        {paginatedApprovals.map((approval) => (
          <div className="approval-row" key={approval.id}>
            <div>
              <strong>
                {humanApprovalTitle(approval, userById.get(approval.requested_by))}
              </strong>
              <span>
                {approval.status} - {approval.approval_count}/{approval.required_approvals} validation - creee le{' '}
                {dateLabel(approval.created_at)}
              </span>
              <span>Date de demande: {dateLabel(approval.created_at)}</span>
              {approval.reviewed_at && <span>Derniere revue: {dateLabel(approval.reviewed_at)}</span>}
              <code>{changeSummary(approval)}</code>
            </div>
            {approval.status === 'PENDING' && canReviewActions && (
              <>
                <label>
                  Commentaire
                  <input
                    value={reviewComments[approval.id] ?? ''}
                    onChange={(event) => onCommentChange(approval.id, event.target.value)}
                  />
                </label>
                <div className="row-actions">
                  <button
                    type="button"
                    className="primary-button compact-button"
                    onClick={() => onReview(approval, true)}
                  >
                    <Check size={16} aria-hidden="true" />
                    Confirmer
                  </button>
                  <button
                    type="button"
                    className="danger-button compact-button"
                    onClick={() => onReview(approval, false)}
                  >
                    <X size={16} aria-hidden="true" />
                    Refuser
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {approvals.length === 0 && <p className="muted">{emptyMessage(filter)}</p>}
      </div>
      <PaginationControls {...approvalPagination} />
    </article>
  )
}

function changeSummary(approval: Approval) {
  const oldData = approval.old_data ?? {}
  const newData = approval.new_data ?? {}
  const keys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]))
  if (keys.length === 0) return 'Aucune modification detaillee'

  return keys
    .map((key) => {
      const oldValue = key in oldData ? stringifyValue(oldData[key]) : '-'
      const newValue = key in newData ? stringifyValue(newData[key]) : '-'
      return `${key}: ${oldValue} -> ${newValue}`
    })
    .join('\n')
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function emptyMessage(filter: ApprovalFilter) {
  if (filter === 'PENDING') return 'Aucune demande en attente.'
  if (filter === 'APPROVED') return 'Aucune demande acceptee.'
  if (filter === 'REJECTED') return 'Aucune demande refusee.'
  return 'Aucune demande a afficher.'
}

function humanApprovalTitle(approval: Approval, username?: string) {
  const actor = username ? `Utilisateur ${username}` : `Utilisateur #${approval.requested_by}`
  const target = `${approval.table_name} #${approval.record_id}`
  const nextActive = asBoolean(approval.new_data?.is_active)
  const prevActive = asBoolean(approval.old_data?.is_active)

  if (approval.table_name === 'produits' && nextActive !== null && prevActive !== null && nextActive !== prevActive) {
    return `${actor} veut ${nextActive ? 'activer' : 'desactiver'} produit #${approval.record_id}`
  }

  if (approval.action === 'DELETE') {
    return `${actor} veut supprimer ${target}`
  }

  return `${actor} veut modifier ${target}`
}

function asBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}
