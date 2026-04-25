import { Check, Plus, ShoppingCart, X } from 'lucide-react'
import { dateLabel, money } from '../../utils/format'
import type { FormEvent } from 'react'
import type { Produit, Vente, VenteParJour } from '../../types'

type SaleLine = {
  produit_id: number
  quantite: number
  prix_unitaire: number
}

type SalesPageProps = {
  produits: Produit[]
  ventes: Vente[]
  ventesParJour: VenteParJour[]
  saleClient: string
  saleProductId: string
  saleQuantity: number
  salePrice: number
  saleLines: SaleLine[]
  saleTotal: number
  onSaleClientChange: (value: string) => void
  onSaleProductChange: (value: string) => void
  onSaleQuantityChange: (value: number) => void
  onSalePriceChange: (value: number) => void
  onAddSaleLine: () => void
  onRemoveSaleLine: (index: number) => void
  onCreateSale: (event: FormEvent<HTMLFormElement>) => void
}

export function SalesPage({
  produits,
  ventes,
  ventesParJour,
  saleClient,
  saleProductId,
  saleQuantity,
  salePrice,
  saleLines,
  saleTotal,
  onSaleClientChange,
  onSaleProductChange,
  onSaleQuantityChange,
  onSalePriceChange,
  onAddSaleLine,
  onRemoveSaleLine,
  onCreateSale,
}: SalesPageProps) {
  return (
    <section className="module-grid">
      <article className="panel module-side" id="ventes">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Caisse</p>
            <h2>Ticket vente</h2>
          </div>
          <ShoppingCart size={20} aria-hidden="true" />
        </div>
        <form className="compact-form" onSubmit={onCreateSale}>
          <input value={saleClient} onChange={(event) => onSaleClientChange(event.target.value)} />
          <select value={saleProductId} onChange={(event) => onSaleProductChange(event.target.value)}>
            <option value="">Choisir un produit</option>
            {produits.map((produit) => (
              <option key={produit.id} value={produit.id}>
                {produit.nom} - stock {produit.quantite}
              </option>
            ))}
          </select>
          <div className="two-cols">
            <input
              aria-label="Quantite vente"
              type="number"
              min="1"
              value={saleQuantity}
              onChange={(event) => onSaleQuantityChange(Number(event.target.value))}
            />
            <input
              aria-label="Prix unitaire"
              type="number"
              min="0"
              step="0.01"
              value={salePrice}
              onChange={(event) => onSalePriceChange(Number(event.target.value))}
            />
          </div>
          <button className="ghost-button" type="button" onClick={onAddSaleLine}>
            <Plus size={18} aria-hidden="true" />
            Ligne
          </button>
          <div className="ticket-lines">
            {saleLines.map((line, index) => {
              const produit = produits.find((item) => item.id === line.produit_id)
              return (
                <div className="ticket-line" key={`${line.produit_id}-${index}`}>
                  <span>
                    {produit?.nom ?? `Produit ${line.produit_id}`} x {line.quantite}
                  </span>
                  <strong>{money(line.prix_unitaire * line.quantite)}</strong>
                  <button type="button" aria-label="Retirer ligne" onClick={() => onRemoveSaleLine(index)}>
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="ticket-total">
            <span>Total</span>
            <strong>{money(saleTotal)}</strong>
          </div>
          <button className="primary-button" disabled={saleLines.length === 0} type="submit">
            <Check size={18} aria-hidden="true" />
            Encaisser
          </button>
        </form>
      </article>

      <article className="panel module-main">
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
              {ventes.slice(0, 12).map((vente) => (
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
  )
}
