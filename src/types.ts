export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'VENDEUR'

export type Session = {
  accessToken: string
  tokenType: string
  role: Role
  username: string
}

export type Produit = {
  id: number
  type: string
  categorie: string
  nom: string
  quantite: number
  seuil_alerte: number
  cout_achat: number
  prix_vente: number
  prix_plafond: number
  marge: number
  is_active: boolean
}

export type ProduitCreate = Omit<Produit, 'id' | 'is_active'>

export type VenteDetail = {
  produit_id: number
  quantite: number
  prix_unitaire: number
  prix_achat?: number
}

export type Vente = {
  id: number
  client: string
  total: number
  date_vente?: string
  vendeur_id?: number
  details?: VenteDetail[]
}

export type VenteCreate = {
  client: string
  details: Array<{
    produit_id: number
    quantite: number
    prix_unitaire: number
  }>
}

export type User = {
  id: number
  username: string
  role: Role
  is_active: boolean
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type Approval = {
  id: number
  table_name: string
  record_id: number
  action: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  status: ApprovalStatus
  requested_by: number
  reviewed_by?: number | null
  required_approvals: number
  approval_count: number
  comment?: string | null
  created_at: string
  reviewed_at?: string | null
}

export type ChiffreAffaires = {
  chiffre_affaires: number
  nombre_ventes: number
}

export type Benefice = {
  benefice_total: number
}

export type TopProduit = {
  id: number
  nom: string
  quantite_vendue: number
}

export type VenteParJour = {
  date: string
  total: number
}
