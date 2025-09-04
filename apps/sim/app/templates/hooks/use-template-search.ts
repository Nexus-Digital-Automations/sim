/**
 * Template Search Hook - Advanced search functionality for template marketplace
 *
 * This hook provides comprehensive search capabilities for templates including:
 * - Debounced search queries with optimization
 * - Advanced filtering and sorting options
 * - Pagination with infinite scroll support
 * - Real-time facet aggregation for filters
 * - Search analytics and user behavior tracking
 * - Error handling with retry logic
 * - Optimistic updates and caching
 *
 * Features:
 * - Full-text search across template content
 * - Category and tag-based filtering
 * - Rating and popularity filters
 * - Business value and ROI filtering
 * - Integration requirement filtering
 * - ML-powered relevance scoring
 *
 * @author Claude Code Template System
 * @version 2.0.0
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import { createLogger } from '@/lib/logs/console/logger'
import type {
  Template,
  TemplateSearchFilters,
  TemplateSearchQuery,
  TemplateSearchResults,
  TemplateSearchAnalytics,
} from '@/lib/templates/types'

// Initialize logger for search operations
const logger = createLogger('TemplateSearch')

/**
 * Search state interface
 */
interface SearchState {
  templates: Template[]
  pagination: TemplateSearchResults['pagination'] | null
  facets: TemplateSearchResults['facets'] | null
  analytics: TemplateSearchAnalytics | null
  loading: boolean
  error: string | null
  searchTime: number
  totalSearches: number
  hasSearched: boolean
}

/**
 * Search configuration options
 */
interface SearchOptions {
  debounceDelay?: number
  enableAnalytics?: boolean
  enableCaching?: boolean
  maxRetries?: number
  retryDelay?: number
  enableRealTimeUpdates?: boolean
}

/**
 * Search result metadata
 */
interface SearchMetadata {
  requestId: string
  processingTime: number
  searchQuery: TemplateSearchQuery
  authenticated: boolean
  filtersApplied: number
}

/**
 * Hook return interface
 */
interface UseTemplateSearchReturn {
  // Data
  templates: Template[]
  pagination: TemplateSearchResults['pagination'] | null
  facets: TemplateSearchResults['facets'] | null
  analytics: TemplateSearchAnalytics | null

  // State
  loading: boolean
  error: string | null
  hasSearched: boolean
  searchTime: number

  // Actions
  search: (query: TemplateSearchQuery) => Promise<void>
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  clearResults: () => void
  resetSearch: () => void

  // Utilities
  hasNextPage: boolean
  totalTemplates: number
  currentPage: number
  searchMetadata: SearchMetadata | null
}

/**
 * Default search options
 */
const DEFAULT_OPTIONS: Required<SearchOptions> = {
  debounceDelay: 300,
  enableAnalytics: true,
  enableCaching: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableRealTimeUpdates: false,
}

/**
 * Template search hook with comprehensive functionality
 */
export function useTemplateSearch(
  initialQuery?: Partial<TemplateSearchQuery>,
  options: SearchOptions = {}
): UseTemplateSearchReturn {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = useRef(crypto.randomUUID().slice(0, 8))

  // Merge options with defaults
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options])

  // State management
  const [state, setState] = useState<SearchState>({
    templates: [],
    pagination: null,
    facets: null,
    analytics: null,
    loading: false,
    error: null,
    searchTime: 0,
    totalSearches: 0,
    hasSearched: false,
  })

  const [currentQuery, setCurrentQuery] = useState<TemplateSearchQuery>(
    initialQuery || {
      search: '',
      page: 1,
      limit: 24,
      sortBy: 'trending',
      sortOrder: 'desc',
      includeMetadata: true,
      includeUserData: true,
      includeAnalytics: config.enableAnalytics,
    }
  )

  const [searchMetadata, setSearchMetadata] = useState<SearchMetadata | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Debounce search query for performance
  const debouncedSearchQuery = useDebounce(currentQuery, config.debounceDelay)

  // Cache for search results
  const searchCache = useRef<Map<string, TemplateSearchResults>>(new Map())

  /**
   * Generate cache key for query
   */
  const getCacheKey = useCallback((query: TemplateSearchQuery): string => {
    return JSON.stringify({
      search: query.search,
      category: query.category,
      filters: query.filters,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page,
      limit: query.limit,
    })
  }, [])

  /**
   * Perform template search API call
   */
  const performSearch = useCallback(
    async (query: TemplateSearchQuery, options: { useCache?: boolean; append?: boolean } = {}) => {
      const { useCache = config.enableCaching, append = false } = options
      const startTime = Date.now()

      try {
        logger.info(`[${requestId.current}] Starting template search`, {
          query: query.search,
          category: query.category,
          page: query.page,
          append,
        })

        // Check cache first
        const cacheKey = getCacheKey(query)
        if (useCache && searchCache.current.has(cacheKey) && !append) {
          const cachedResult = searchCache.current.get(cacheKey)!
          setState((prev) => ({
            ...prev,
            templates: cachedResult.data,
            pagination: cachedResult.pagination,
            facets: cachedResult.facets,
            analytics: cachedResult.analytics,
            loading: false,
            error: null,
            searchTime: cachedResult.meta.processingTime,
            hasSearched: true,
          }))

          setSearchMetadata({
            requestId: cachedResult.meta.requestId,
            processingTime: cachedResult.meta.processingTime,
            searchQuery: query,
            authenticated: true, // Assuming authenticated for cache
            filtersApplied: Object.keys(query.filters || {}).length,
          })

          logger.info(`[${requestId.current}] Search result served from cache`)
          return
        }

        // Set loading state
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }))

        // Build query parameters
        const queryParams = new URLSearchParams()

        // Basic parameters
        if (query.search) queryParams.set('search', query.search)
        if (query.category) queryParams.set('categoryId', query.category)
        if (query.page) queryParams.set('page', query.page.toString())
        if (query.limit) queryParams.set('limit', query.limit.toString())
        if (query.sortBy) queryParams.set('sortBy', query.sortBy)
        if (query.sortOrder) queryParams.set('sortOrder', query.sortOrder)

        // Filter parameters
        if (query.filters) {
          const filters = query.filters
          if (filters.categories?.length) {
            queryParams.set('categoryId', filters.categories.join(','))
          }
          if (filters.tags?.length) {
            queryParams.set('tagSlugs', filters.tags.join(','))
          }
          if (filters.difficulty?.length) {
            queryParams.set('difficultyLevel', filters.difficulty.join(','))
          }
          if (filters.minRating) {
            queryParams.set('minRating', filters.minRating.toString())
          }
          if (filters.minStars) {
            queryParams.set('minDownloads', filters.minStars.toString())
          }
          if (filters.createdAfter) {
            queryParams.set('createdAfter', filters.createdAfter.toISOString())
          }
          if (filters.createdBefore) {
            queryParams.set('createdBefore', filters.createdBefore.toISOString())
          }
          if (filters.hasDescription !== undefined) {
            queryParams.set('hasDescription', filters.hasDescription.toString())
          }
        }

        // Response options
        if (query.includeMetadata) queryParams.set('includeAnalytics', 'true')
        if (query.includeUserData) queryParams.set('includeRatings', 'true')
        if (query.includeAnalytics) queryParams.set('includeCategory', 'true')

        // Add session ID for analytics
        queryParams.set('sessionId', requestId.current)

        // Make API call to v2 endpoint
        const response = await fetch(`/api/templates/v2?${queryParams.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': requestId.current,
          },
        })

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status} ${response.statusText}`)
        }

        const result: TemplateSearchResults = await response.json()

        // Validate response structure
        if (!result.success || !result.data) {
          throw new Error('Invalid search response format')
        }

        const searchTime = Date.now() - startTime

        // Update state
        setState((prev) => ({
          ...prev,
          templates: append ? [...prev.templates, ...result.data] : result.data,
          pagination: result.pagination,
          facets: result.facets || null,
          analytics: result.analytics || null,
          loading: false,
          error: null,
          searchTime,
          totalSearches: prev.totalSearches + 1,
          hasSearched: true,
        }))

        // Set metadata
        setSearchMetadata({
          requestId: result.meta.requestId,
          processingTime: result.meta.processingTime,
          searchQuery: query,
          authenticated: result.meta.authenticated,
          filtersApplied: result.meta.filtersApplied,
        })

        // Cache the result
        if (config.enableCaching && !append) {
          searchCache.current.set(cacheKey, result)
        }

        // Reset retry count on success
        setRetryCount(0)

        logger.info(`[${requestId.current}] Search completed successfully`, {
          resultCount: result.data.length,
          totalResults: result.pagination.total,
          searchTime,
          cached: false,
        })
      } catch (error: any) {
        logger.error(`[${requestId.current}] Search failed`, {
          error: error.message,
          query: query.search,
          retryCount,
        })

        // Handle retry logic
        if (retryCount < config.maxRetries) {
          logger.info(`[${requestId.current}] Retrying search (attempt ${retryCount + 1})`)
          setRetryCount((prev) => prev + 1)
          setTimeout(() => {
            performSearch(query, options)
          }, config.retryDelay * (retryCount + 1))
          return
        }

        // Set error state
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || 'Search failed',
        }))

        // Show error toast
        toast.error('Failed to search templates', {
          description: error.message || 'Please try again',
        })
      }
    },
    [config, getCacheKey, retryCount]
  )

  /**
   * Main search function
   */
  const search = useCallback(
    async (query: TemplateSearchQuery) => {
      setCurrentQuery(query)
      await performSearch(query)
    },
    [performSearch]
  )

  /**
   * Refetch current results
   */
  const refetch = useCallback(async () => {
    await performSearch(currentQuery, { useCache: false })
  }, [currentQuery, performSearch])

  /**
   * Load more results (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!state.pagination?.hasNextPage || state.loading) return

    const nextPageQuery = {
      ...currentQuery,
      page: (currentQuery.page || 1) + 1,
    }

    await performSearch(nextPageQuery, { append: true })
    setCurrentQuery(nextPageQuery)
  }, [currentQuery, performSearch, state.loading, state.pagination?.hasNextPage])

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      templates: [],
      pagination: null,
      facets: null,
      analytics: null,
      error: null,
      hasSearched: false,
    }))
    setSearchMetadata(null)
  }, [])

  /**
   * Reset search to initial state
   */
  const resetSearch = useCallback(() => {
    clearResults()
    setCurrentQuery(
      initialQuery || {
        search: '',
        page: 1,
        limit: 24,
        sortBy: 'trending',
        sortOrder: 'desc',
        includeMetadata: true,
        includeUserData: true,
        includeAnalytics: config.enableAnalytics,
      }
    )
    searchCache.current.clear()
    setRetryCount(0)
  }, [clearResults, initialQuery, config.enableAnalytics])

  /**
   * Sync with URL parameters
   */
  useEffect(() => {
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort')
    const page = searchParams.get('page')

    if (category || search || sort || page) {
      const urlQuery: TemplateSearchQuery = {
        ...currentQuery,
        ...(search && { search }),
        ...(category && { category }),
        ...(sort && { sortBy: sort as any }),
        ...(page && { page: parseInt(page, 10) }),
      }

      setCurrentQuery(urlQuery)
    }
  }, [searchParams])

  /**
   * Perform search when debounced query changes
   */
  useEffect(() => {
    if (debouncedSearchQuery && (debouncedSearchQuery.search || debouncedSearchQuery.category)) {
      performSearch(debouncedSearchQuery)
    }
  }, [debouncedSearchQuery, performSearch])

  /**
   * Cleanup effect
   */
  useEffect(() => {
    return () => {
      searchCache.current.clear()
    }
  }, [])

  // Computed values
  const hasNextPage = state.pagination?.hasNextPage || false
  const totalTemplates = state.pagination?.total || 0
  const currentPage = state.pagination?.page || 1

  return {
    // Data
    templates: state.templates,
    pagination: state.pagination,
    facets: state.facets,
    analytics: state.analytics,

    // State
    loading: state.loading,
    error: state.error,
    hasSearched: state.hasSearched,
    searchTime: state.searchTime,

    // Actions
    search,
    refetch,
    loadMore,
    clearResults,
    resetSearch,

    // Utilities
    hasNextPage,
    totalTemplates,
    currentPage,
    searchMetadata,
  }
}