import type {
  Approval,
  Arrivage,
  ArrivageCreate,
  ArrivageUpdate,
  AccountingAccount,
  AccountingEntry,
  AccountingInventory,
  AccountingSummary,
  AdminNotification,
  Benefice,
  ChiffreAffaires,
  AbsenceType,
  Employe,
  EmployeCreate,
  EtatProduit,
  EtatProduitCreate,
  EtatProduitUpdate,
  FactureUpload,
  PaginatedEtatProduitResponse,
  OutilMagasin,
  OutilMagasinCreate,
  Produit,
  ProduitCreate,
  Role,
  TopProduit,
  Transfert,
  TransfertCreate,
  User,
  UserUpdate,
  Vente,
  VenteCreate,
  VenteParJour,
} from './types'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:8000`

type LoginResponse = {
  access_token: string
  token_type: string
  role: Role
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('auth-expired'))
    }

    const detail = data?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg).join(', ')
          : 'Operation impossible pour le moment'

    throw new Error(message)
  }

  return data as T
}

async function request<T>(
  path: string,
  token?: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  return parseResponse<T>(response)
}

export const api = {
  baseUrl: API_BASE_URL,

  assetUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  },

  async login(username: string, password: string): Promise<LoginResponse> {
    const form = new URLSearchParams()
    form.set('username', username)
    form.set('password', password)

    return request<LoginResponse>('/auth/login', undefined, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    })
  },

  produits(token?: string) {
    return request<Produit[]>('/produits/', token)
  },

  produitsInactifs(token: string) {
    return request<Produit[]>('/produits/inactifs', token)
  },

  createProduit(token: string, produit: ProduitCreate) {
    return request<Produit>('/produits/', token, {
      method: 'POST',
      body: JSON.stringify(produit),
    })
  },

  updateProduit(token: string, id: number, produit: Partial<ProduitCreate>) {
    return request<Produit | { detail: string }>(`/produits/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(produit),
    })
  },

  setProduitActive(token: string, id: number, is_active: boolean) {
    return request<Produit | { detail: string }>(`/produits/${id}/active`, token, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    })
  },

  deleteProduit(token: string, id: number) {
    return request<{ message: string }>(`/produits/${id}`, token, {
      method: 'DELETE',
    })
  },

  ventes(token: string) {
    return request<Vente[]>('/ventes/', token)
  },

  createVente(token: string, vente: VenteCreate) {
    return request<Vente>('/ventes/', token, {
      method: 'POST',
      body: JSON.stringify(vente),
    })
  },

  updateVente(token: string, id: number, vente: VenteCreate) {
    return request<{ message: string }>(`/ventes/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(vente),
    })
  },

  deleteVente(token: string, id: number) {
    return request<{ message: string }>(`/ventes/${id}`, token, {
      method: 'DELETE',
    })
  },

  transferts(token: string) {
    return request<Transfert[]>('/ventes/transferts', token)
  },

  createTransfert(token: string, transfert: TransfertCreate) {
    return request<Transfert>('/ventes/transferts', token, {
      method: 'POST',
      body: JSON.stringify(transfert),
    })
  },

  arrivages(token: string) {
    return request<Arrivage[]>('/arrivages/', token)
  },

  createArrivage(token: string, arrivage: ArrivageCreate) {
    return request<Arrivage>('/arrivages/', token, {
      method: 'POST',
      body: JSON.stringify(arrivage),
    })
  },

  updateArrivage(token: string, id: number, arrivage: ArrivageUpdate) {
    return request<Arrivage>(`/arrivages/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(arrivage),
    })
  },

  deleteArrivage(token: string, id: number) {
    return request<{ message: string }>(`/arrivages/${id}`, token, {
      method: 'DELETE',
    })
  },

  updateTransfertStatus(token: string, id: number, statut: 'NON_PAYE' | 'PAYE' | 'REFUSE') {
    return request<Transfert | { message: string }>(`/ventes/transferts/${id}/status`, token, {
      method: 'PATCH',
      body: JSON.stringify({ statut }),
    })
  },

  updateTransfert(
    token: string,
    id: number,
    transfert: Partial<Pick<TransfertCreate, 'quantite' | 'prix_unitaire' | 'point_vente' | 'commentaire'>>,
  ) {
    return request<Transfert>(`/ventes/transferts/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(transfert),
    })
  },

  deleteTransfert(token: string, id: number) {
    return request<{ message: string }>(`/ventes/transferts/${id}`, token, {
      method: 'DELETE',
    })
  },

  etatsProduits(token: string, showAll = false) {
    return request<PaginatedEtatProduitResponse>(
      `/etats-produits/?page_size=100&show_all=${showAll ? 'true' : 'false'}`,
      token,
    )
  },

  createEtatProduit(token: string, etat: EtatProduitCreate) {
    return request<EtatProduit>('/etats-produits/', token, {
      method: 'POST',
      body: JSON.stringify(etat),
    })
  },

  updateEtatProduit(token: string, id: number, etat: EtatProduitUpdate) {
    return request<EtatProduit>(`/etats-produits/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(etat),
    })
  },

  users(token: string) {
    return request<User[]>('/users/', token)
  },

  createUser(token: string, user: { username: string; password: string; role: Role }) {
    return request<User>('/users/', token, {
      method: 'POST',
      body: JSON.stringify(user),
    })
  },

  updateUser(token: string, id: number, user: UserUpdate) {
    return request<User>(`/users/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(user),
    })
  },

  deleteUser(token: string, id: number) {
    return request<{ message: string }>(`/users/${id}`, token, {
      method: 'DELETE',
    })
  },

  approvals(token: string, options?: { status?: 'PENDING' | 'APPROVED' | 'REJECTED'; include_all?: boolean }) {
    const params = new URLSearchParams()
    if (options?.status) params.set('status', options.status)
    if (options?.include_all) params.set('include_all', 'true')
    const query = params.toString()
    return request<Approval[]>(`/approvals/${query ? `?${query}` : ''}`, token)
  },

  adminNotifications(token: string) {
    return request<AdminNotification[]>('/admin-notifications/', token)
  },

  markAdminNotificationRead(token: string, id: number) {
    return request<AdminNotification>(`/admin-notifications/${id}/read`, token, {
      method: 'PATCH',
    })
  },

  reviewApproval(token: string, id: number, approve: boolean, comment?: string) {
    return request<{ status: string; approval_count: number; required_approvals: number }>(
      `/approvals/${id}/review`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ approve, comment: comment || null }),
      },
    )
  },

  chiffreAffaires(token: string) {
    return request<ChiffreAffaires>('/stats/chiffre-affaires', token)
  },

  benefice(token: string) {
    return request<Benefice>('/stats/benefice', token)
  },

  topProduits(token: string) {
    return request<TopProduit[]>('/stats/top-produits', token)
  },

  ventesParJour(token: string) {
    return request<VenteParJour[]>('/stats/ventes-par-jour', token)
  },

  outils(token: string) {
    return request<OutilMagasin[]>('/outils/', token)
  },

  createOutil(token: string, outil: OutilMagasinCreate) {
    return request<OutilMagasin>('/outils/', token, {
      method: 'POST',
      body: JSON.stringify(outil),
    })
  },

  updateOutil(token: string, id: number, outil: OutilMagasinCreate) {
    return request<{ message: string }>(`/outils/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(outil),
    })
  },

  deleteOutil(token: string, id: number) {
    return request<{ message: string }>(`/outils/${id}`, token, {
      method: 'DELETE',
    })
  },

  employes(token: string, month?: string) {
    return request<Employe[]>(`/personnel/${month ? `?month=${month}` : ''}`, token)
  },

  createEmploye(token: string, employe: EmployeCreate) {
    return request<Employe>('/personnel/', token, {
      method: 'POST',
      body: JSON.stringify(employe),
    })
  },

  updateEmploye(token: string, id: number, employe: Partial<EmployeCreate>) {
    return request<Employe>(`/personnel/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(employe),
    })
  },

  deleteEmploye(token: string, id: number) {
    return request<{ message: string }>(`/personnel/${id}`, token, {
      method: 'DELETE',
    })
  },

  createEmployeAbsence(
    token: string,
    employeId: number,
    absence: { date_absence: string; type_absence: AbsenceType; commentaire?: string | null },
  ) {
    return request<{ id: number }>(`/personnel/${employeId}/absences`, token, {
      method: 'POST',
      body: JSON.stringify(absence),
    })
  },

  deleteEmployeAbsence(token: string, absenceId: number) {
    return request<{ message: string }>(`/personnel/absences/${absenceId}`, token, {
      method: 'DELETE',
    })
  },

  createEmployeAvance(
    token: string,
    employeId: number,
    avance: { date_avance: string; montant: number; source_compte?: AccountingAccount; commentaire?: string | null },
  ) {
    return request<{ id: number }>(`/personnel/${employeId}/avances`, token, {
      method: 'POST',
      body: JSON.stringify(avance),
    })
  },

  deleteEmployeAvance(token: string, avanceId: number) {
    return request<{ message: string }>(`/personnel/avances/${avanceId}`, token, {
      method: 'DELETE',
    })
  },

  accountingSummary(token: string) {
    return request<AccountingSummary>('/comptabilite/summary', token)
  },

  accountingEntries(token: string, account?: AccountingAccount) {
    return request<AccountingEntry[]>(`/comptabilite/entries${account ? `?account=${account}` : ''}`, token)
  },

  accountingInventory(token: string, month: string) {
    return request<AccountingInventory>(`/comptabilite/inventory?month=${encodeURIComponent(month)}`, token)
  },

  addAccountingManual(token: string, data: { account: AccountingAccount; amount: number; motif: string }) {
    return request<AccountingEntry>('/comptabilite/manual', token, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  transferAccounting(
    token: string,
    data: { from_account: AccountingAccount; to_account: AccountingAccount; amount: number; motif: string },
  ) {
    return request<AccountingEntry[]>('/comptabilite/transfer', token, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  createExpense(token: string, data: { account: AccountingAccount; amount: number; motif: string }) {
    return request<AccountingEntry>('/comptabilite/depenses', token, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  createSalaryPayment(
    token: string,
    data: { account: AccountingAccount; employe_id: number; amount: number; motif?: string | null },
  ) {
    return request<AccountingEntry>('/comptabilite/salary-payments', token, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  factures(token: string) {
    return request<FactureUpload[]>('/factures/', token)
  },

  uploadFacture(token: string, data: { file: File; comment: string }) {
    const form = new FormData()
    form.set('file', data.file)
    form.set('comment', data.comment)

    return request<FactureUpload>('/factures/', token, {
      method: 'POST',
      body: form,
    })
  },
}
