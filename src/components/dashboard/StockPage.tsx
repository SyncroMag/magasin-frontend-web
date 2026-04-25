import { Plus, Search } from 'lucide-react'
import { money } from '../../utils/format'
import type { FormEvent } from 'react'
import type { Produit, ProduitCreate } from '../../types'

type StockPageProps = {
  produits: Produit[]
  filteredProducts: Produit[]
  query: string
  canManageStock: boolean
  productForm: ProduitCreate
  onQueryChange: (value: string) => void
  onProductFormChange: (value: ProduitCreate) => void
  onCreateProduct: (event: FormEvent<HTMLFormElement>) => void
}

export function StockPage({
  produits,
  filteredProducts,
  query,
  canManageStock,
  productForm,
  onQueryChange,
  onProductFormChange,
  onCreateProduct,
}: StockPageProps) {
  return (
    <section className="module-grid">
      <article className="panel module-main">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Stock</p>
            <h2>Produits actifs</h2>
          </div>
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              placeholder="Rechercher produit, type, categorie"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Categorie</th>
                <th>Quantite</th>
                <th>Prix vente</th>
                <th>Marge</th>
                <th>Etat</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((produit) => (
                <tr key={produit.id}>
                  <td>
                    <strong>{produit.nom}</strong>
                    <span>{produit.type}</span>
                  </td>
                  <td>{produit.categorie}</td>
                  <td>{produit.quantite}</td>
                  <td>{money(produit.prix_vente)}</td>
                  <td>{money(produit.marge)}</td>
                  <td>
                    <span className={produit.quantite <= produit.seuil_alerte ? 'pill warn' : 'pill ok'}>
                      {produit.quantite <= produit.seuil_alerte ? 'Alerte' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    Aucun produit a afficher.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {canManageStock && (
        <article className="panel module-side">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Admin</p>
              <h2>Nouveau produit</h2>
            </div>
            <Plus size={20} aria-hidden="true" />
          </div>
          <form className="compact-form" onSubmit={onCreateProduct}>
            <input
              placeholder="Nom"
              value={productForm.nom}
              onChange={(event) => onProductFormChange({ ...productForm, nom: event.target.value })}
              required
            />
            <div className="two-cols">
              <input
                placeholder="Type"
                value={productForm.type}
                onChange={(event) => onProductFormChange({ ...productForm, type: event.target.value })}
                required
              />
              <input
                placeholder="Categorie"
                value={productForm.categorie}
                onChange={(event) =>
                  onProductFormChange({ ...productForm, categorie: event.target.value })
                }
                required
              />
            </div>
            <div className="two-cols">
              <input
                aria-label="Quantite"
                type="number"
                min="0"
                value={productForm.quantite}
                onChange={(event) =>
                  onProductFormChange({ ...productForm, quantite: Number(event.target.value) })
                }
              />
              <input
                aria-label="Seuil alerte"
                type="number"
                min="0"
                value={productForm.seuil_alerte}
                onChange={(event) =>
                  onProductFormChange({ ...productForm, seuil_alerte: Number(event.target.value) })
                }
              />
            </div>
            <div className="two-cols">
              <input
                aria-label="Cout achat"
                type="number"
                min="0"
                step="0.01"
                value={productForm.cout_achat}
                onChange={(event) =>
                  onProductFormChange({ ...productForm, cout_achat: Number(event.target.value) })
                }
              />
              <input
                aria-label="Prix vente"
                type="number"
                min="0"
                step="0.01"
                value={productForm.prix_vente}
                onChange={(event) =>
                  onProductFormChange({ ...productForm, prix_vente: Number(event.target.value) })
                }
              />
            </div>
            <div className="two-cols">
              <input
                aria-label="Prix plafond"
                type="number"
                min="0"
                step="0.01"
                value={productForm.prix_plafond}
                onChange={(event) =>
                  onProductFormChange({ ...productForm, prix_plafond: Number(event.target.value) })
                }
              />
              <input
                aria-label="Marge"
                type="number"
                step="0.01"
                value={productForm.marge}
                onChange={(event) =>
                  onProductFormChange({ ...productForm, marge: Number(event.target.value) })
                }
              />
            </div>
            <button className="primary-button" type="submit">
              <Plus size={18} aria-hidden="true" />
              Ajouter
            </button>
          </form>
        </article>
      )}

      {!canManageStock && (
        <article className="panel module-side">
          <p className="eyebrow">Resume</p>
          <h2>{produits.length} produits</h2>
          <p className="muted">Consultation stock disponible pour la vente.</p>
        </article>
      )}
    </section>
  )
}
