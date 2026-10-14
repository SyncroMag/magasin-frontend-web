import { AlertTriangle, BadgeCheck, BarChart3, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { TablePaginationFooter, usePaginatedItems } from '../common/PaginationControls'
import { roleDetails } from '../../constants'
import { dateLabel, money } from '../../utils/format'
import type { Produit, Session, TopProduit, TopProduitBenefice, Vente, VenteParJour } from '../../types'

type OverviewPageProps = {
  session: Session
  lowStockProducts: Produit[]
  produits: Produit[]
  ventes: Vente[]
  topProduits: TopProduit[]
  topProduitsBenefice: TopProduitBenefice[]
  ventesParJour: VenteParJour[]
}

export function OverviewPage({
  session,
  lowStockProducts,
  produits,
  ventes,
  topProduits,
  topProduitsBenefice,
  ventesParJour,
}: OverviewPageProps) {
  const [revenueDateStart, setRevenueDateStart] = useState(() => currentMonthRange().start)
  const [revenueDateEnd, setRevenueDateEnd] = useState(() => currentMonthRange().end)
  const [showRevenueDates, setShowRevenueDates] = useState(false)
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState(true)
  const [showSalesChart, setShowSalesChart] = useState(true)

  const filteredVentes = useMemo(
    () => ventes.map(withoutPartnerLines).filter((vente) => (vente.details?.length ?? 0) > 0 && matchesSaleDateRange(vente, dateStart, dateEnd)),
    [dateEnd, dateStart, ventes],
  )
  const { pageItems: paginatedVentes, controls: ventePagination } = usePaginatedItems(filteredVentes)

  const revenueVentes = useMemo(
    () => ventes.map(withoutPartnerLines).filter((vente) => (vente.details?.length ?? 0) > 0 && matchesSaleDateRange(vente, revenueDateStart, revenueDateEnd)),
    [revenueDateEnd, revenueDateStart, ventes],
  )
  const netSales = useMemo(
    () => revenueVentes.reduce((total, vente) => total + Number(vente.total || 0), 0),
    [revenueVentes],
  )
  const totalProfit = useMemo(
    () => revenueVentes.reduce((total, vente) => total + calculateSaleProfit(vente), 0),
    [revenueVentes],
  )
  const totalReduction = useMemo(
    () => revenueVentes.reduce((total, vente) => total + calculateSaleReduction(vente), 0),
    [revenueVentes],
  )
  const grossSales = netSales + totalReduction
  const averageTicket = revenueVentes.length > 0 ? netSales / revenueVentes.length : 0
  const profitRate = netSales > 0 ? (totalProfit / netSales) * 100 : 0
  const canViewFinancialStats = session.role !== 'VENDEUR'

  return (
    <div className="view-stack">
      <section className="role-band">
        <BadgeCheck size={22} aria-hidden="true" />
        <div>
          <strong>{roleDetails[session.role].headline}</strong>
          <span>{roleDetails[session.role].permissions.join(' - ')}</span>
        </div>
      </section>

      {canViewFinancialStats && (
        <section className="metric-grid overview-metric-grid">
          <article className="metric-card accent-cyan">
            <span>Chiffre d affaire brut</span>
            <strong>{money(grossSales)}</strong>
            <small>Avant reductions sur la periode</small>
          </article>
          <article className="metric-card revenue-metric-card" style={{paddingTop:'0px'}}>
            <div className="metric-card-heading">
              <span>Chiffre d affaire net</span>
              <button
                className={`metric-calendar-button${showRevenueDates ? ' active' : ''}`}
                type="button"
                onClick={() => setShowRevenueDates((current) => !current)}
                aria-label={showRevenueDates ? 'Masquer la periode' : 'Afficher la periode'}
                title={showRevenueDates ? 'Masquer la periode' : 'Choisir la periode'}
              >
                <CalendarDays size={16} aria-hidden="true" />
              </button>
            </div>
            <strong>{money(netSales)}</strong>
            <small>{revenueVentes.length} ventes sur la periode</small>
            {showRevenueDates && (
              <div className="metric-date-range">
                <label>
                  Du
                  <input
                    type="date"
                    value={revenueDateStart}
                    max={revenueDateEnd || undefined}
                    onChange={(event) => setRevenueDateStart(event.target.value)}
                    aria-label="Date de debut du chiffre d'affaire net"
                  />
                </label>
                <label>
                  Au
                  <input
                    type="date"
                    value={revenueDateEnd}
                    min={revenueDateStart || undefined}
                    onChange={(event) => setRevenueDateEnd(event.target.value)}
                    aria-label="Date de fin du chiffre d'affaire net"
                  />
                </label>
              </div>
            )}
          </article>
          <article className="metric-card accent-green">
            <span>Benefice total</span>
            <strong>{money(totalProfit)}</strong>
            <small>{profitRate.toFixed(1)}% du net sur la periode</small>
          </article>
          <article className="metric-card accent-gold">
            <span>Ticket moyen</span>
            <strong>{money(averageTicket)}</strong>
            <small>Montant moyen sur la periode</small>
          </article>
        </section>
      )}

      <section className="content-grid dashboard-grid">
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
              <h2>Produits les plus vendus</h2>
            </div>
            <BarChart3 size={20} aria-hidden="true" />
          </div>
          <div className="stack-list">
            {topProduits.slice(0, 5).map((produit) => (
              <div className="stack-item" key={produit.id}>
                <div>
                  <strong>{produit.nom}</strong>
                  <span>{topProductMeta(produit, produits)}</span>
                  <small>Quantite vendue</small>
                </div>
                <b>{produit.quantite_vendue}</b>
              </div>
            ))}
            {topProduits.length === 0 && <p className="muted">Pas encore de ventes consolidees.</p>}
          </div>
        </article>

        {canViewFinancialStats && (
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Graphique</p>
                <h2>Ventes par jour</h2>
              </div>
              <button className="ghost-button compact-button" type="button" onClick={() => setShowSalesChart((current) => !current)}>
                {showSalesChart ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                {showSalesChart ? 'Hide' : 'Show'}
              </button>
            </div>
            {showSalesChart ? (
              ventesParJour.length > 0 ? (
                <SalesTrendChart data={ventesParJour} />
              ) : (
                <p className="muted">Pas encore de mouvement journalier.</p>
              )
            ) : (
              <p className="muted">Graphique masque.</p>
            )}
          </article>
        )}

        {canViewFinancialStats && (
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Rentabilite</p>
                <h2>Top produits par benefice</h2>
              </div>
              <BarChart3 size={20} aria-hidden="true" />
            </div>
            <div className="stack-list">
              {topProduitsBenefice.slice(0, 5).map((produit) => (
                <div className="stack-item" key={produit.id}>
                  <div>
                    <strong>{produit.nom}</strong>
                    <span>{topProductMeta(produit, produits)}</span>
                    <span>{produit.quantite_vendue} unites vendues</span>
                  </div>
                  <b>{money(produit.benefice_total)}</b>
                </div>
              ))}
              {topProduitsBenefice.length === 0 && <p className="muted">Pas encore de benefice consolide.</p>}
            </div>
          </article>
        )}

        <article className="panel wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Historique</p>
              <h2>Dernieres ventes</h2>
            </div>
            <div className="panel-actions">
              {canViewFinancialStats && <span className="pill">{ventesParJour.length} jours</span>}
              <button className="ghost-button compact-button" type="button" onClick={() => setShowHistory((current) => !current)}>
                {showHistory ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                {showHistory ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {showHistory ? (
            <>
              <form className="filter-form sales-filter-form" onSubmit={(event) => event.preventDefault()}>
                <label>
                  Date debut
                  <input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
                </label>
                <label>
                  Date fin
                  <input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} />
                </label>
              </form>
              <div className="table-wrap dashboard-table-wrap">
                <table className="dashboard-history-table">
                  <thead>
                    <tr>
                      <th>N vente</th>
                      <th>Client</th>
                      <th>Marchandises</th>
                      <th>Date</th>
                      <th>Reduction</th>
                      <th>Total</th>
                      <th>Vendeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVentes.map((vente) => {
                      const isExpanded = expandedSaleId === vente.id

                      return (
                        <Fragment key={vente.id}>
                          <tr
                            className={`clickable-row${isExpanded ? ' selected-row' : ''}`}
                            onClick={() => setExpandedSaleId(isExpanded ? null : vente.id)}
                          >
                            <td data-label="N vente">{saleNumber(vente)}</td>
                            <td data-label="Client">{vente.client}</td>
                            <td data-label="Marchandises">{saleProductsLabel(vente, produits)}</td>
                            <td data-label="Date">{dateLabel(vente.date_vente)}</td>
                            <td data-label="Reduction">{money(calculateSaleReduction(vente))}</td>
                            <td data-label="Total">{money(vente.total)}</td>
                            <td data-label="Vendeur">{vente.vendeur_id ?? '-'}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="expanded-row">
                              <td colSpan={7} className="expanded-sale-cell">
                                <div className="sale-expanded">
                                  <div className="sale-expanded-summary">
                                    <div className="sale-summary-chip">
                                      <span>Articles</span>
                                      <strong>{(vente.details ?? []).length}</strong>
                                    </div>
                                    <div className="sale-summary-chip">
                                      <span>Quantite totale</span>
                                      <strong>{(vente.details ?? []).reduce((total, detail) => total + detail.quantite, 0)}</strong>
                                      <small>Articles vendus</small>
                                    </div>
                                    <div className="sale-summary-chip">
                                      <span>Reduction totale</span>
                                      <strong>{money(calculateSaleReduction(vente))}</strong>
                                      <small>Lignes et panier</small>
                                    </div>
                                  </div>
                                  <div className="sale-detail-list">
                                    {(vente.details ?? []).map((detail, index) => {
                                      const produit = produits.find((item) => item.id === detail.produit_id)

                                      return (
                                        <article className="sale-detail-card" key={`${vente.id}-${detail.produit_id}-${index}`}>
                                          <strong>{produit?.nom ?? `Produit #${detail.produit_id}`}</strong>
                                          {produit && <span>{produit.type} / {produit.categorie}</span>}
                                          <div className="sale-detail-metrics">
                                            <span>Quantite: {detail.quantite}</span>
                                            <span>Prix initial: {money(detail.prix_unitaire_initial ?? detail.prix_unitaire)}</span>
                                            <span>Prix unitaire: {money(detail.prix_unitaire)}</span>
                                            <span>Reduction ligne: -{money((detail.reduction_ligne ?? 0) * detail.quantite)}</span>
                                            <span>Part panier: -{money(detail.reduction_panier)}</span>
                                            <span>Total ligne: {money(detail.quantite * detail.prix_unitaire)}</span>
                                          </div>
                                        </article>
                                      )
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                    {filteredVentes.length === 0 && (
                      <tr>
                        <td colSpan={7} className="empty-cell">
                          Aucune vente enregistree.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <TablePaginationFooter colSpan={7} {...ventePagination} />
                </table>
              </div>
            </>
          ) : (
            <p className="muted">Historique masque.</p>
          )}
        </article>
      </section>
    </div>
  )
}

function SalesTrendChart({ data }: { data: VenteParJour[] }) {
  const width = 640
  const height = 280
  const plotLeft = 72
  const plotRight = width - 20
  const plotTop = 20
  const plotBottom = height - 52
  const maxValue = Math.max(...data.map((item) => Number(item.total || 0)), 1)
  const stepX = data.length > 1 ? (plotRight - plotLeft) / (data.length - 1) : 0
  const yTicks = Array.from({ length: 5 }, (_, index) => (maxValue / 4) * index)
  const xTickStep = Math.max(1, Math.ceil((data.length - 1) / 5))
  const xTickIndexes = data
    .map((_, index) => index)
    .filter((index) => index % xTickStep === 0 || index === data.length - 1)
  const points = data.map((item, index) => {
    const x = plotLeft + stepX * index
    const y = plotBottom - ((Number(item.total || 0) / maxValue) * (plotBottom - plotTop))
    return `${x},${y}`
  })

  return (
    <div className="chart-shell">
      <svg className="dashboard-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ventes par jour">
        <defs>
          <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#147963" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#147963" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {yTicks.map((tick) => {
          const y = plotBottom - ((tick / maxValue) * (plotBottom - plotTop))
          return (
            <g key={tick}>
              <line className="chart-grid-line" x1={plotLeft} y1={y} x2={plotRight} y2={y} />
              <text className="chart-axis-tick" x={plotLeft - 10} y={y + 4} textAnchor="end">
                {formatAxisAmount(tick)}
              </text>
            </g>
          )
        })}
        <line className="chart-axis-line" x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} />
        <line className="chart-axis-line" x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} />
        <polygon
          fill="url(#salesArea)"
          stroke="none"
          points={`${plotLeft},${plotBottom} ${points.join(' ')} ${plotRight},${plotBottom}`}
        />
        <polyline fill="none" stroke="#147963" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points.join(' ')} />
        {data.map((item, index) => {
          const x = plotLeft + stepX * index
          const y = plotBottom - ((Number(item.total || 0) / maxValue) * (plotBottom - plotTop))
          return <circle key={item.date} cx={x} cy={y} r="4" fill="#e25b47" />
        })}
        {xTickIndexes.map((index) => {
          const x = plotLeft + stepX * index
          return (
            <g key={data[index].date}>
              <line className="chart-axis-line" x1={x} y1={plotBottom} x2={x} y2={plotBottom + 5} />
              <text className="chart-axis-tick" x={x} y={plotBottom + 19} textAnchor="middle">
                {shortAxisDate(data[index].date)}
              </text>
            </g>
          )
        })}
        <text className="chart-axis-title" x={(plotLeft + plotRight) / 2} y={height - 8} textAnchor="middle">Date</text>
        <text
          className="chart-axis-title"
          x={14}
          y={(plotTop + plotBottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${(plotTop + plotBottom) / 2})`}
        >
          Montant (Ar)
        </text>
      </svg>
      <div className="chart-legend">
        {data.slice(-6).map((item) => (
          <div className="chart-legend-item" key={item.date}>
            <span>{dateLabel(item.date)}</span>
            <strong>{money(item.total)}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function matchesSaleDateRange(vente: Vente, dateStart: string, dateEnd: string) {
  const saleDate = vente.date_vente ? new Date(vente.date_vente) : null
  if (!saleDate || Number.isNaN(saleDate.getTime())) return !dateStart && !dateEnd

  const start = dateStart ? new Date(`${dateStart}T00:00:00`) : null
  const end = dateEnd ? new Date(`${dateEnd}T23:59:59.999`) : null

  if (start && saleDate < start) return false
  if (end && saleDate > end) return false

  return true
}

function currentMonthRange() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  return {
    start: localDateValue(new Date(year, month, 1)),
    end: localDateValue(new Date(year, month + 1, 0)),
  }
}

function localDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
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

function calculateSaleReduction(vente: Vente) {
  return Number(
    (vente.details ?? [])
      .reduce(
        (total, detail) =>
          total +
          Number((detail.reduction_ligne ?? 0) * detail.quantite) +
          Number(detail.reduction_panier ?? 0),
        0,
      )
      .toFixed(2),
  )
}

function calculateSaleProfit(vente: Vente) {
  return (vente.details ?? []).reduce(
    (total, detail) =>
      total +
      (Number(detail.prix_unitaire) - Number(detail.prix_achat ?? 0)) * detail.quantite,
    0,
  )
}

function withoutPartnerLines(vente: Vente): Vente {
  const details = (vente.details ?? []).filter((detail) => !detail.is_partner_sale && !detail.partner_name)
  return {
    ...vente,
    details,
    total: details.reduce((total, detail) => total + Number(detail.prix_unitaire) * detail.quantite, 0),
  }
}

function formatAxisAmount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}k`
  return Math.round(value).toString()
}

function shortAxisDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

function saleProductsLabel(vente: Vente, produits: Produit[]) {
  const details = vente.details ?? []
  if (details.length === 0) return '-'

  const labels = details.slice(0, 2).map((detail) => {
    const produit = produits.find((item) => item.id === detail.produit_id)
    return `${produit?.nom ?? `Produit #${detail.produit_id}`} x${detail.quantite}`
  })

  return details.length > 2 ? `${labels.join(', ')} +${details.length - 2}` : labels.join(', ')
}

function topProductMeta(produit: TopProduit, produits: Produit[]) {
  const productDetails = produits.find((item) => item.id === produit.id)
  const type = produit.type || productDetails?.type
  const categorie = produit.categorie || productDetails?.categorie

  return [type, categorie].filter(Boolean).join(' / ') || 'Type et categorie non renseignes'
}
