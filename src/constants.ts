import type { ProduitCreate, Role } from './types'

export const SESSION_KEY = 'gestion-magasin-session'

export const roleDetails: Record<
  Role,
  {
    label: string
    headline: string
    permissions: string[]
  }
> = {
  SUPER_ADMIN: {
    label: 'Super admin',
    headline: 'Controle total, validations et operations sensibles.',
    permissions: ['Acces complet', 'Gestion admins', 'Override approvals'],
  },
  ADMIN: {
    label: 'Admin',
    headline: 'Pilotage stock, ventes, produits et demandes sensibles.',
    permissions: ['Stock', 'Produits', 'Ventes', 'Approbations'],
  },
  VENDEUR: {
    label: 'Vendeur',
    headline: 'Vente rapide et consultation du stock disponible.',
    permissions: ['Voir stock', 'Etat produit', 'Creer ventes'],
  },
}

export const emptyProduct: ProduitCreate = {
  type: '',
  categorie: '',
  nom: '',
  quantite: 0,
  seuil_alerte: 2,
  cout_achat: 0,
  prix_vente: 0,
  prix_plafond: 0,
  marge: 0,
}
