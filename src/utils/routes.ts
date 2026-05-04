import type { DashboardView } from '../components/layout/Sidebar'

export const defaultDashboardPath = '/gestion/overview'

const routes: Record<DashboardView, string> = {
  overview: defaultDashboardPath,
  'stock-types': '/gestion/types',
  'stock-categories': '/gestion/categories',
  stock: '/gestion/stock',
  'stock-arrivals': '/gestion/arrivage',
  'stock-states': '/gestion/etat-produits',
  partners: '/gestion/partenaires',
  'invoice-uploads': '/gestion/factures',
  'sales-list': '/gestion/ventes',
  'sales-create': '/gestion/nouvelle-vente',
  'sales-transfer': '/gestion/transfert',
  'accounting-cash': '/gestion/comptabilite/caisse',
  'accounting-vault': '/gestion/comptabilite/coffre',
  'accounting-expenses': '/gestion/comptabilite/depenses',
  'accounting-inventory': '/gestion/comptabilite/inventaire',
  'admin-notifications': '/gestion/notifications',
  'admin-tools': '/gestion/outils',
  'admin-personnel': '/gestion/personnel',
  approvals: '/gestion/approbations',
  users: '/gestion/utilisateurs',
}

export function pathForView(view: DashboardView) {
  return routes[view]
}

export function viewFromPath(pathname: string): DashboardView {
  const normalized = pathname.replace(/\/+$/, '') || '/'

  if (normalized === '/gestion' || normalized === '/dashboard' || normalized === defaultDashboardPath) return 'overview'
  if (normalized === '/gestion/types' || normalized === '/dashboard/types' || normalized === '/dashboard/articles/types') return 'stock-types'
  if (normalized === '/gestion/categories' || normalized === '/dashboard/categories' || normalized === '/dashboard/articles/categories') return 'stock-categories'
  if (normalized === '/gestion/stock' || normalized === '/dashboard/stock' || normalized === '/dashboard/articles/stock') return 'stock'
  if (normalized === '/gestion/arrivage') return 'stock-arrivals'
  if (normalized === '/gestion/etat-produits') return 'stock-states'
  if (normalized === '/gestion/partenaires') return 'partners'
  if (normalized === '/gestion/factures') return 'invoice-uploads'
  if (normalized === '/gestion/ventes' || normalized === '/dashboard/ventes') return 'sales-list'
  if (normalized === '/gestion/nouvelle-vente') return 'sales-create'
  if (normalized === '/gestion/transfert') return 'sales-transfer'
  if (normalized === '/gestion/comptabilite/caisse') return 'accounting-cash'
  if (normalized === '/gestion/comptabilite/coffre') return 'accounting-vault'
  if (normalized === '/gestion/comptabilite/depenses') return 'accounting-expenses'
  if (normalized === '/gestion/comptabilite/inventaire') return 'accounting-inventory'
  if (normalized === '/gestion/notifications') return 'admin-notifications'
  if (normalized === '/gestion/outils') return 'admin-tools'
  if (normalized === '/gestion/personnel') return 'admin-personnel'
  if (normalized === '/gestion/approbations' || normalized === '/dashboard/approbations') return 'approvals'
  if (normalized === '/gestion/utilisateurs' || normalized === '/dashboard/utilisateurs') return 'users'

  return 'overview'
}
