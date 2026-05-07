import { Bell, Check, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PaginationControls, usePaginatedItems } from '../common/PaginationControls'
import { dateLabel, dateSearchValues, money } from '../../utils/format'
import type { AdminNotification } from '../../types'

type AdminNotificationsPageProps = {
  notifications: AdminNotification[]
  onMarkRead: (notificationId: number) => void
}

export function AdminNotificationsPage({
  notifications,
  onMarkRead,
}: AdminNotificationsPageProps) {
  const [query, setQuery] = useState('')

  const filteredNotifications = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return notifications

    return notifications.filter((notification) => {
      const data = notification.data ?? {}
      return [
        notification.title,
        notification.message,
        String(data.produit ?? ''),
        String(data.type ?? ''),
        String(data.categorie ?? ''),
        String(data.point_vente ?? ''),
        ...dateSearchValues(notification.created_at),
      ].some((field) => field.toLowerCase().includes(value))
    })
  }, [notifications, query])
  const { pageItems: paginatedNotifications, controls: notificationPagination } = usePaginatedItems(filteredNotifications)

  return (
    <article className="panel view-stack">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Espace admin</p>
          <h2>Notifications</h2>
        </div>
        <Bell size={20} aria-hidden="true" />
      </div>
      <div className="toolbar-grid notification-toolbar">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Recherche notification"
          />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Etat</th>
              <th>Date</th>
              <th>Produit</th>
              <th>Destination</th>
              <th>Quantite</th>
              <th>Montant unitaire</th>
              <th>Total</th>
              <th>Message</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedNotifications.map((notification) => {
              const data = notification.data ?? {}
              const unitAmount = numberFromNotification(data.montant_unitaire ?? data.prix_unitaire)
              const totalAmount = numberFromNotification(
                data.montant_total ?? unitAmount * numberFromNotification(data.quantite),
              )

              return (
                <tr className={notification.is_read ? undefined : 'notification-unread'} key={notification.id}>
                  <td data-label="Etat">
                    <span className={notification.is_read ? 'pill ok' : 'pill warn'}>
                      {notification.is_read ? 'Lu' : 'Non lu'}
                    </span>
                  </td>
                  <td data-label="Date">{dateLabel(notification.created_at)}</td>
                  <td data-label="Produit">
                    <strong>{String(data.produit ?? '-')}</strong>
                    <span>
                      {String(data.type ?? '-')} / {String(data.categorie ?? '-')}
                    </span>
                  </td>
                  <td data-label="Destination">{String(data.point_vente ?? '-')}</td>
                  <td data-label="Quantite">{String(data.quantite ?? '-')}</td>
                  <td data-label="Montant unitaire">{unitAmount ? money(unitAmount) : '-'}</td>
                  <td data-label="Total">{totalAmount ? money(totalAmount) : '-'}</td>
                  <td data-label="Message">{notification.message}</td>
                  <td data-label="Action">
                    <button
                      type="button"
                      className="primary-button compact-button"
                      onClick={() => onMarkRead(notification.id)}
                      disabled={notification.is_read}
                    >
                      <Check size={16} aria-hidden="true" />
                      Lu
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredNotifications.length === 0 && (
              <tr>
                <td colSpan={9} className="empty-cell">
                  Aucune notification.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls {...notificationPagination} />
    </article>
  )
}

function numberFromNotification(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
