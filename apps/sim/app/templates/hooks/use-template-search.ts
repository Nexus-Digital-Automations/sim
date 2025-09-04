/**
 * Template Search Hook - Fixed Interface
 * Provides comprehensive template search functionality matching main page expectations
 */

import { useCallback, useEffect, useState } from 'react'
import type {
  Template,
  TemplateSearchFilters,
  TemplateSearchQuery,
  TemplateSearchResults,
} from '@/lib/templates/types'

export interface UseTemplateSearchOptions {
  initialQuery?: string
  initialFilters?: TemplateSearchFilters
  pageSize?: number
  debounceMs?: number
}

export interface UseTemplateSearchReturn {
  // Search results data - matching main page expectations
  templates: Template[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  } | null
  loading: boolean
  error: string | null
  facets: {
    categories: { name: string; count: number }[]
    tags: { name: string; count: number }[]
    authors: { name: string; count: number }[]
    difficulty: { level: string; count: number }[]
  } | null
  analytics: {
    searchTime: number
    resultCount: number
    popularTemplates: Template[]
    relatedSearches: string[]
    categoryDistribution: Record<string, number>
    trendingTags: string[]
    recommendedTemplates: Template[]
  } | null

  // Pagination convenience properties
  hasNextPage: boolean

  // Actions
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
}

/**
 * Custom hook for template search functionality - Updated Implementation
 */
export function useTemplateSearch(searchQuery: TemplateSearchQuery): UseTemplateSearchReturn {
  // Search state
  const [templates, setTemplates] = useState<Template[]>([])
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facets, setFacets] = useState<{
    categories: { name: string; count: number }[]
    tags: { name: string; count: number }[]
    authors: { name: string; count: number }[]
    difficulty: { level: string; count: number }[]
  } | null>(null)
  const [analytics, setAnalytics] = useState<{
    searchTime: number
    resultCount: number
    popularTemplates: Template[]
    relatedSearches: string[]
    categoryDistribution: Record<string, number>
    trendingTags: string[]
    recommendedTemplates: Template[]
  } | null>(null)

  /**
   * Build search parameters for API call
   */
  const buildSearchParams = useCallback((query: TemplateSearchQuery): URLSearchParams => {
    const params = new URLSearchParams()

    // Basic search parameters
    if (query.search?.trim()) {
      params.set('search', query.search.trim())
    }
    if (query.category) {
      params.set('category', query.category)
    }
    if (query.sortBy) {
      params.set('sortBy', query.sortBy)
    }
    if (query.sortOrder) {
      params.set('sortOrder', query.sortOrder)
    }
    if (query.page) {
      params.set('page', query.page.toString())
    }
    if (query.limit) {
      params.set('limit', query.limit.toString())
    }

    // Filter parameters
    if (query.filters) {
      const filters = query.filters

      if (filters.categories && filters.categories.length > 0) {
        filters.categories.forEach((cat) => params.append('categories', cat))
      }
      if (filters.tags && filters.tags.length > 0) {
        filters.tags.forEach((tag) => params.append('tags', tag))
      }
      if (filters.difficulty && filters.difficulty.length > 0) {
        filters.difficulty.forEach((diff) => params.append('difficulty', diff))
      }
      if (filters.minRating !== undefined) {
        params.set('minRating', filters.minRating.toString())
      }
      if (filters.hasDescription !== undefined) {
        params.set('hasDescription', filters.hasDescription.toString())
      }
      if (filters.createdAfter) {
        params.set('createdAfter', filters.createdAfter.toISOString())
      }
      if (filters.createdBefore) {
        params.set('createdBefore', filters.createdBefore.toISOString())
      }
    }

    // Include options
    if (query.includeMetadata) {
      params.set('includeMetadata', 'true')
    }
    if (query.includeUserData) {
      params.set('includeUserData', 'true')
    }
    if (query.includeAnalytics) {
      params.set('includeAnalytics', 'true')
    }

    return params
  }, [])

  /**
   * Execute search API call
   */
  const executeSearch = useCallback(
    async (query: TemplateSearchQuery): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const searchParams = buildSearchParams(query)
        const response = await fetch(`/api/templates/search?${searchParams.toString()}`)

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`)
        }

        const data: TemplateSearchResults = await response.json()

        if (!data || typeof data !== 'object') {
          throw new Error('Invalid search response format')
        }

        // Set search results
        setTemplates(data.data || [])
        setPagination(data.pagination || null)
        setFacets(data.facets || null)
        setAnalytics(data.analytics || null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed'
        setError(errorMessage)
        setTemplates([])
        setPagination(null)
        setFacets(null)
        setAnalytics(null)
        console.error('Template search error:', err)
      } finally {
        setLoading(false)
      }
    },
    [buildSearchParams]
  )

  /**
   * Refetch current search
   */
  const refetch = useCallback(async (): Promise<void> => {
    await executeSearch(searchQuery)
  }, [executeSearch, searchQuery])

  /**
   * Load more results (pagination)
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!pagination?.hasNext || loading) return

    const nextPageQuery: TemplateSearchQuery = {
      ...searchQuery,
      page: (pagination.page || 1) + 1,
    }

    try {
      setLoading(true)
      const searchParams = buildSearchParams(nextPageQuery)
      const response = await fetch(`/api/templates/search?${searchParams.toString()}`)

      if (!response.ok) {
        throw new Error(`Load more failed: ${response.statusText}`)
      }

      const data: TemplateSearchResults = await response.json()

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid load more response format')
      }

      // Append new templates to existing ones
      setTemplates((prev) => [...prev, ...(data.data || [])])
      setPagination(data.pagination || null)
      // Note: We don't update facets and analytics on load more as they should remain from initial search
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more templates'
      setError(errorMessage)
      console.error('Template load more error:', err)
    } finally {
      setLoading(false)
    }
  }, [pagination, loading, searchQuery, buildSearchParams])

  /**
   * Execute search when query changes
   */
  useEffect(() => {
    executeSearch(searchQuery)
  }, [searchQuery, executeSearch])

  // Computed values
  const hasNextPage = pagination?.hasNext || false

  return {
    // Search results data
    templates,
    pagination,
    loading,
    error,
    facets,
    analytics,

    // Pagination convenience
    hasNextPage,

    // Actions
    refetch,
    loadMore,
  }
}
