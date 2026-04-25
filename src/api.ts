import type {
  Approval,
  Benefice,
  ChiffreAffaires,
  Produit,
  ProduitCreate,
  Role,
  TopProduit,
  User,
  Vente,
  VenteCreate,
  VenteParJour,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

type LoginResponse = {
  access_token: string
  token_type: string
  role: Role
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
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

  createProduit(token: string, produit: ProduitCreate) {
    return request<Produit>('/produits/', token, {
      method: 'POST',
      body: JSON.stringify(produit),
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

  users(token: string) {
    return request<User[]>('/users/', token)
  },

  createUser(token: string, user: { username: string; password: string; role: Role }) {
    return request<User>('/users/', token, {
      method: 'POST',
      body: JSON.stringify(user),
    })
  },

  approvals(token: string) {
    return request<Approval[]>('/approvals/', token)
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
}
