/**
 * Template Search Hook
 * Provides comprehensive template search functionality with debouncing, filtering, and pagination
 */

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import type { Template, TemplateSearchFilters, TemplateSearchQuery } from '@/lib/templates/types'

export interface UseTemplateSearchOptions {
  initialQuery?: string
  initialFilters?: TemplateSearchFilters
  pageSize?: number
  debounceMs?: number
}

export interface UseTemplateSearchReturn {
  // Search state
  query: string
  filters: TemplateSearchFilters
  results: Template[]
  loading: boolean
  error: string | null
  
  // Pagination
  currentPage: number
  totalPages: number
  totalCount: number
  hasMore: boolean
  
  // Actions
  setQuery: (query: string) => void
  setFilters: (filters: Partial<TemplateSearchFilters>) => void
  search: (searchQuery?: string, searchFilters?: TemplateSearchFilters) => Promise<void>
  loadMore: () => Promise<void>
  reset: () => void
  
  // Utilities
  refetch: () => Promise<void>
  clearError: () => void
}

/**
 * Custom hook for template search functionality
 */
export function useTemplateSearch(options: UseTemplateSearchOptions = {}): UseTemplateSearchReturn {
  const {
    initialQuery = '',
    initialFilters = {},
    pageSize = 20,
    debounceMs = 300
  } = options

  // Search state
  const [query, setQuery] = useState(initialQuery)
  const [filters, setFiltersState] = useState<TemplateSearchFilters>(initialFilters)
  const [results, setResults] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Debounced search query
  const debouncedQuery = useDebounce(query, debounceMs)

  /**
   * Update filters while preserving existing ones
   */
  const setFilters = useCallback((newFilters: Partial<TemplateSearchFilters>) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters
    }))
  }, [])

  /**
   * Build search query object
   */
  const buildSearchQuery = useCallback((
    searchQuery: string, 
    searchFilters: TemplateSearchFilters,
    page: number = 1
  ): TemplateSearchQuery => {
    return {
      q: searchQuery.trim(),
      page,
      limit: pageSize,
      ...searchFilters
    }
  }, [pageSize])

  /**
   * Execute search API call
   */
  const executeSearch = useCallback(async (
    searchQuery: TemplateSearchQuery,
    append: boolean = false
  ): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const searchParams = new URLSearchParams()
      Object.entries(searchQuery).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)))
          } else {
            searchParams.set(key, String(value))
          }
        }
      })

      const response = await fetch(`/api/templates/search?${searchParams.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      const newResults = data.templates || []
      
      setResults(prev => append ? [...prev, ...newResults] : newResults)
      setTotalPages(data.totalPages || 0)
      setTotalCount(data.totalCount || 0)
      setHasMore(data.hasMore || false)
      setCurrentPage(searchQuery.page || 1)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
      console.error('Template search error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Perform search with current query and filters
   */
  const search = useCallback(async (
    searchQuery: string = query,
    searchFilters: TemplateSearchFilters = filters
  ): Promise<void> => {
    const searchQueryObject = buildSearchQuery(searchQuery, searchFilters, 1)
    await executeSearch(searchQueryObject, false)
  }, [query, filters, buildSearchQuery, executeSearch])

  /**
   * Load more results (pagination)
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loading) return

    const nextPage = currentPage + 1
    const searchQueryObject = buildSearchQuery(query, filters, nextPage)
    await executeSearch(searchQueryObject, true)
  }, [hasMore, loading, currentPage, query, filters, buildSearchQuery, executeSearch])

  /**
   * Reset search state
   */
  const reset = useCallback(() => {
    setQuery(initialQuery)
    setFiltersState(initialFilters)
    setResults([])
    setCurrentPage(1)
    setTotalPages(0)
    setTotalCount(0)
    setHasMore(false)
    setError(null)
  }, [initialQuery, initialFilters])

  /**
   * Refetch current search
   */
  const refetch = useCallback(async (): Promise<void> => {
    await search(query, filters)
  }, [search, query, filters])

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Auto-search when debounced query or filters change
   */
  useEffect(() => {
    if (debouncedQuery || Object.keys(filters).length > 0) {
      search(debouncedQuery, filters)
    }
  }, [debouncedQuery, filters, search])

  return {
    // Search state
    query,
    filters,
    results,
    loading,
    error,
    
    // Pagination
    currentPage,
    totalPages,
    totalCount,
    hasMore,
    
    // Actions
    setQuery,
    setFilters,
    search,
    loadMore,
    reset,
    
    // Utilities
    refetch,
    clearError
  }
}