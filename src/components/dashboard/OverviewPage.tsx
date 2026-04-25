import { AlertTriangle, BadgeCheck, BarChart3 } from 'lucide-react'
import { roleDetails } from '../../constants'
import { dateLabel, money } from '../../utils/format'
import type { Benefice, ChiffreAffaires, Produit, Session, TopProduit, Vente, VenteParJour } from '../../types'

type OverviewPageProps = {
  session: Session
  chiffreAffaires: ChiffreAffaires | null
  benefice: Benefice | null
  lowStockProducts: Produit[]
  ventes: Vente[]
  topProduits: TopProduit[]
  ventesParJour: VenteParJour[]
}

export function OverviewPage({
  session,
  chiffreAffaires,
  benefice,
  lowStockProducts,
  ventes,
  topProduits,
  ventesParJour,
}: OverviewPageProps) {
  return (
    <div className="view-stack">
      <section className="role-band">
        <BadgeCheck size={22} aria-hidden="true" />
        <div>
          <strong>{roleDetails[session.role].headline}</strong>
          <span>{roleDetails[session.role].permissions.join(' - ')}</span>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Chiffre d affaires</span>
          <strong>{money(chiffreAffaires?.chiffre_affaires)}</strong>
          <small>{chiffreAffaires?.nombre_ventes ?? 0} ventes</small>
        </article>
        <article className="metric-card accent-green">
          <span>Benefice estime</span>
          <strong>{money(benefice?.benefice_total)}</strong>
          <small>Marge sur details ventes</small>
        </article>
        <article className="metric-card accent-coral">
          <span>Stock faible</span>
          <strong>{lowStockProducts.length}</strong>
          <small>Produits sous seuil</small>
        </article>
        <article className="metric-card accent-cyan">
          <span>Tickets</span>
          <strong>{ventes.length}</strong>
          <small>Historique charge</small>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Alertes</p>
              <h2>Seuil stock</h2>
            </div>
            <AlertTriangle size={20} aria-hidden="true" />
          </div>
          <div className="stack-list">
            {lowStockProducts.slice(0, 6).map((produit) => (
              <div className="stack-item" key={produit.id}>
                <div>
                  <strong>{produit.nom}</strong>
                  <span>{produit.categorie}</span>
                </div>
                <b>{produit.quantite}</b>
              </div>
            ))}
            {lowStockProducts.length === 0 && <p className="muted">Aucun seuil critique.</p>}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Analyse</p>
              <h2>Top produits</h2>
            </div>
            <BarChart3 size={20} aria-hidden="true" />
          </div>
          <div className="stack-list">
            {topProduits.slice(0, 5).map((produit) => (
              <div className="stack-item" key={produit.id}>
                <div>
                  <strong>{produit.nom}</strong>
                  <span>Quantite vendue</span>
                </div>
                <b>{produit.quantite_vendue}</b>
              </div>
            ))}
            {topProduits.length === 0 && <p className="muted">Pas encore de ventes consolidees.</p>}
          </div>
        </article>

        <article className="panel wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Historique</p>
              <h2>Dernieres ventes</h2>
            </div>
            <span className="pill">{ventesParJour.length} jours</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Vendeur</th>
                </tr>
              </thead>
              <tbody>
                {ventes.slice(0, 8).map((vente) => (
                  <tr key={vente.id}>
                    <td>#{vente.id}</td>
                    <td>{vente.client}</td>
                    <td>{dateLabel(vente.date_vente)}</td>
                    <td>{money(vente.total)}</td>
                    <td>{vente.vendeur_id ?? '-'}</td>
                  </tr>
                ))}
                {ventes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      Aucune vente enregistree.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  )
}
