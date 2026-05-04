import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type PageSize = 5 | 10 | 'all'

export function usePaginatedItems<T>(items: T[], initialPageSize: PageSize = 5) {
  const [pageSize, setPageSize] = useState<PageSize>(initialPageSize)
  const [page, setPage] = useState(1)

  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [items, pageSize])

  const pageItems = useMemo(() => {
    if (pageSize === 'all') return items
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  return {
    pageItems,
    controls: {
      page,
      pageSize,
      total: items.length,
      totalPages,
      setPage,
      setPageSize,
    },
  }
}

export function PaginationControls({
  page,
  pageSize,
  total,
  totalPages,
  setPage,
  setPageSize,
}: {
  page: number
  pageSize: PageSize
  total: number
  totalPages: number
  setPage: (page: number) => void
  setPageSize: (pageSize: PageSize) => void
}) {
  if (total <= 5) return null

  return (
    <div className="pagination-controls">
      <div>
        <span>Affichage</span>
        <select
          value={pageSize}
          onChange={(event) => setPageSize(event.target.value === 'all' ? 'all' : Number(event.target.value) as 5 | 10)}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value="all">All</option>
        </select>
      </div>
      <span>
        {pageSize === 'all' ? `1-${total}` : `${Math.min(total, (page - 1) * pageSize + 1)}-${Math.min(total, page * pageSize)}`} / {total}
      </span>
      <div className="pagination-buttons">
        <button
          className="icon-button"
          type="button"
          aria-label="Page precedente"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1 || pageSize === 'all'}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Page suivante"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || pageSize === 'all'}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
