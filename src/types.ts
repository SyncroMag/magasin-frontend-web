export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'VENDEUR'

export type Session = {
  accessToken: string
  tokenType: string
  role: Role
  username: string
  expiresAt?: number
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
  commentaire?: string | null
  is_partner: boolean
  partner_name?: string | null
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
}

export type ProduitCreate = Omit<Produit, 'id' | 'is_active' | 'updated_at'>

export type VenteDetail = {
  id?: number
  produit_id: number
  quantite: number
  prix_unitaire_initial?: number
  prix_unitaire: number
  reduction_ligne?: number
  reduction_panier?: number
  prix_achat?: number
  is_partner_sale?: boolean
  partner_name?: string | null
  partner_purchase_price?: number | null
  partner_payout_paid?: boolean
  partner_payout_paid_at?: string | null
  partner_payout_paid_by?: number | null
}

export type PartnerPayout = {
  id: number
  vente_id: number
  numero_vente?: string | null
  date_vente: string
  client: string
  produit_id: number
  produit_nom: string
  type?: string | null
  categorie?: string | null
  partner_name: string
  quantite: number
  prix_vente: number
  montant_vente: number
  prix_achat_partenaire: number
  montant_a_retourner: number
  benefice: number
  paid: boolean
  paid_at?: string | null
  paid_by?: number | null
}

export type Vente = {
  id: number
  numero_vente?: string
  client: string
  total: number
  reduction_panier?: number
  modified_by_superadmin?: boolean
  date_vente?: string
  vendeur_id?: number
  vendeur_nom?: string | null
  details?: VenteDetail[]
}

export type VenteCreate = {
  client: string
  reduction_panier?: number
  details: Array<{
    produit_id: number
    quantite: number
    prix_unitaire_initial?: number
    prix_unitaire: number
    reduction_ligne?: number
    reduction_panier?: number
  }>
}

export type Transfert = {
  id: number
  produit_id: number
  quantite: number
  prix_unitaire: number
  point_vente: string
  commentaire?: string | null
  statut: 'NON_PAYE' | 'PAYE' | 'REFUSE' | string
  created_by: number
  created_at: string
  produit?: Pick<Produit, 'id' | 'type' | 'categorie' | 'nom' | 'cout_achat'> | null
}

export type TransfertCreate = {
  produit_id: number
  quantite: number
  prix_unitaire: number
  point_vente: string
  commentaire?: string | null
}

export type ArrivageLineCreate = {
  type: string
  categorie: string
  nom: string
  quantite: number
  seuil_alerte: number
  cout_achat: number
  prix_vente: number
  prix_plafond: number
  marge: number
  commentaire?: string | null
  is_partner: boolean
  partner_name?: string | null
}

export type ArrivageCreate = {
  date_arrivage: string
  commentaire?: string | null
  lignes: ArrivageLineCreate[]
}

export type ArrivageUpdate = {
  date_arrivage?: string
  commentaire?: string | null
}

export type ArrivageDetail = {
  produit_id: number
  type: string
  categorie: string
  nom: string
  quantite_ajoutee: number
  stock_avant: number
  stock_apres: number
  seuil_alerte: number
  cout_achat: number
  prix_vente: number
  prix_plafond: number
  marge: number
  commentaire?: string | null
  is_partner: boolean
  partner_name?: string | null
}

export type Arrivage = {
  id: number
  date_arrivage: string
  commentaire?: string | null
  created_by: number
  created_at: string
  total_lignes: number
  total_quantite: number
  lignes: ArrivageDetail[]
}

export type User = {
  id: number
  username: string
  role: Role
  is_active: boolean
}

export type UserUpdate = {
  username?: string
  password?: string
  role?: Role
  is_active?: boolean
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
  first_reviewed_by?: number | null
  second_reviewed_by?: number | null
  required_approvals: number
  approval_count: number
  comment?: string | null
  created_at: string
  reviewed_at?: string | null
}

export type AdminNotification = {
  id: number
  title: string
  message: string
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export type OutilMagasin = {
  id: number
  type: string
  categorie?: string | null
  produit?: string | null
  quantite: number
  valeur_estimee?: number | string | null
}

export type OutilMagasinCreate = {
  type: string
  categorie?: string | null
  produit?: string | null
  quantite: number
  valeur_estimee?: number | string | null
}

export type AccountingAccount = 'CAISSE' | 'COFFRE'

export type AccountingEntry = {
  id: number
  account: AccountingAccount | string
  entry_type: string
  amount: number
  motif: string
  reference_type?: string | null
  reference_id?: number | null
  created_by?: number | null
  created_at: string
}

export type AccountingSummary = {
  caisse: number
  coffre: number
  total: number
}

export type AccountingInventory = {
  month: string
  opening: AccountingSummary
  closing: AccountingSummary
  entries: AccountingEntry[]
  total_in: number
  total_out: number
}

export type FactureUpload = {
  id: number
  filename: string
  original_filename: string
  content_type: string
  comment?: string | null
  uploaded_by?: number | null
  created_at: string
  file_url: string
}

export type AbsenceType = 'UN_JOUR' | 'DEUX_JOURS' | 'DEMI_JOURNEE'

export type EmployeAbsence = {
  id: number
  employe_id: number
  date_absence: string
  type_absence: AbsenceType | string
  jours: number
  commentaire?: string | null
  created_at: string
}

export type EmployeAvance = {
  id: number
  employe_id: number
  date_avance: string
  montant: number
  source_compte?: AccountingAccount | string
  commentaire?: string | null
  created_at: string
}

export type Employe = {
  id: number
  nom: string
  prenoms: string
  cin: string
  date_cin?: string | null
  lot?: string | null
  date_naissance?: string | null
  date_embauche: string
  salaire_mensuel: number
  salaire_final: number
  total_absences_mois: number
  total_avances_mois: number
  date_13eme_prevue: string
  montant_13eme_prevu: number
  absences: EmployeAbsence[]
  avances: EmployeAvance[]
}

export type EmployeCreate = {
  nom: string
  prenoms: string
  cin: string
  date_cin?: string | null
  lot?: string | null
  date_naissance?: string | null
  date_embauche: string
  salaire_mensuel: number
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

export type EtatProduitStatus = 'A_RETOURNER' | 'ENVOYE_FOURNISSEUR' | 'RETOUR_REINTEGRE' | 'REGLE'

export type EtatProduit = {
  id: number
  produit_id: number
  type_etat: 'DEPOT' | 'RETOUR'
  quantite: number
  date_signalement?: string | null
  date_envoi?: string | null
  date_retour?: string | null
  statut_retour?: EtatProduitStatus | string | null
  commentaire?: string | null
  stock_reintegre: boolean
  created_at: string
}

export type EtatProduitCreate = {
  produit_id: number
  type_etat: 'RETOUR'
  quantite: number
  statut_retour?: EtatProduitStatus
  commentaire?: string
}

export type EtatProduitUpdate = {
  date_envoi?: string | null
  date_retour?: string | null
  statut_retour?: EtatProduitStatus
  commentaire?: string | null
  stock_reintegre?: boolean
}

export type PaginatedEtatProduitResponse = {
  items: EtatProduit[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
