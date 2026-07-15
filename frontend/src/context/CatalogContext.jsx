import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as productsService from '../services/productsService';
import * as searchService from '../services/searchService';
import * as filtersService from '../services/filtersService';

const CatalogContext = createContext(null);

const PAGE_LIMIT = 12;

const EMPTY_FILTERS = { categoryIds: [], brandIds: [], colors: [], priceMin: undefined, priceMax: undefined };

export function CatalogProvider({ children }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [diagnostics, setDiagnostics] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [query, filters]);

  // v2: as opções de filtro (facets) deixam de ser buscadas uma única vez no
  // mount e passam a ser recalculadas a cada busca, com os mesmos q/filtros —
  // ver SPEC_V2.md 2.5.
  useEffect(() => {
    let cancelled = false;
    const trimmedQuery = query.trim();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const [resultData, facets] = await Promise.all([
          trimmedQuery
            ? searchService.search({ q: trimmedQuery, filters, page, limit: PAGE_LIMIT })
            : productsService.list({ filters, page, limit: PAGE_LIMIT }),
          filtersService.getFilters({ q: trimmedQuery || undefined, filters }),
        ]);
        if (cancelled) return;
        if (trimmedQuery) {
          setItems(resultData.items);
          setTotal(resultData.diagnostics.total);
          setDiagnostics(resultData.diagnostics);
        } else {
          setItems(resultData.items);
          setTotal(resultData.total);
          setDiagnostics(null);
        }
        setFilterOptions(facets);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Erro ao buscar produtos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, filters, page]);

  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const value = useMemo(
    () => ({
      query,
      setQuery,
      filters,
      setFilters,
      resetFilters,
      page,
      setPage,
      pageLimit: PAGE_LIMIT,
      items,
      total,
      diagnostics,
      filterOptions,
      loading,
      error,
    }),
    [query, filters, resetFilters, page, items, total, diagnostics, filterOptions, loading, error],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within a CatalogProvider');
  return ctx;
}
