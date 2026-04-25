import { Check, ClipboardCheck, X } from 'lucide-react'
import { dateLabel } from '../../utils/format'
import type { Approval } from '../../types'

type ApprovalsPageProps = {
  approvals: Approval[]
  reviewComments: Record<number, string>
  onCommentChange: (approvalId: number, value: string) => void
  onReview: (approval: Approval, approve: boolean) => void
}

export function ApprovalsPage({
  approvals,
  reviewComments,
  onCommentChange,
  onReview,
}: ApprovalsPageProps) {
  return (
    <article className="panel view-stack" id="approvals">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Controle</p>
          <h2>Demandes d approbation</h2>
        </div>
        <ClipboardCheck size={20} aria-hidden="true" />
      </div>
      <div className="approval-list">
        {approvals.map((approval) => (
          <div className="approval-row" key={approval.id}>
            <div>
              <strong>
                {approval.action} {approval.table_name} #{approval.record_id}
              </strong>
              <span>
                {approval.approval_count}/{approval.required_approvals} validation - creee le{' '}
                {dateLabel(approval.created_at)}
              </span>
              <code>{JSON.stringify(approval.new_data ?? {})}</code>
            </div>
            <input
              placeholder="Commentaire"
              value={reviewComments[approval.id] ?? ''}
              onChange={(event) => onCommentChange(approval.id, event.target.value)}
            />
            <div className="row-actions">
              <button
                type="button"
                className="primary-button compact-button"
                onClick={() => onReview(approval, true)}
              >
                <Check size={16} aria-hidden="true" />
                OK
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
          </div>
        ))}
        {approvals.length === 0 && <p className="muted">Aucune demande en attente.</p>}
      </div>
    </article>
  )
}
