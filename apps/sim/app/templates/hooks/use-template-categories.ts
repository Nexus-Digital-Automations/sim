/**
 * Template Categories Hook - Category management for template marketplace
 *
 * This hook provides comprehensive category management functionality including:
 * - Hierarchical category structure with subcategories
 * - Category-based filtering and navigation
 * - Template count tracking per category
 * - Popular tag management within categories
 * - Category analytics and usage metrics
 * - Real-time category updates and synchronization
 * - Category search and discovery
 *
 * Features:
 * - Nested category hierarchy navigation
 * - Category-specific template counts
 * - Popular tags aggregation per category
 * - Category filtering and selection logic
 * - Integration with TEMPLATE_CATEGORIES constants
 * - Cache management for performance
 * - Error handling with fallback to static data
 *
 * @author Claude Code Template System
 * @version 2.0.0
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logs/console/logger'
import { TEMPLATE_CATEGORIES, CategoryManager, CategoryUtils } from '@/lib/templates/categories'
import type { TemplateCategory } from '@/lib/templates/types'

// Initialize logger for category operations
const logger = createLogger('TemplateCategories')

/**
 * Category state interface
 */
interface CategoryState {
  categories: TemplateCategory[]
  subcategories: TemplateCategory[]
  selectedCategory: string | null
  selectedSubcategory: string | null
  popularTags: Array<{ tag: string; count: number; categories: string[] }>
  categoryStats: {
    totalCategories: number
    totalSubcategories: number
    totalTags: number
    averageTemplatesPerCategory: number
    topCategories: Array<{ category: string; templateCount: number }>
  } | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

/**
 * Category configuration options
 */
interface CategoryOptions {
  enableRealTimeUpdates?: boolean
  enableAnalytics?: boolean
  cacheTimeout?: number
  maxRetries?: number
  retryDelay?: number
}

/**
 * Category filter configuration
 */
interface CategoryFilter {
  searchTerm?: string
  minTemplateCount?: number
  includeSubcategories?: boolean
  sortBy?: 'name' | 'templateCount' | 'id'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Hook return interface
 */
interface UseTemplateCategoriesReturn {
  // Data
  categories: TemplateCategory[]
  subcategories: TemplateCategory[]
  allCategories: TemplateCategory[] // Flattened list including subcategories
  categoryHierarchy: Array<{
    category: TemplateCategory
    subcategories: TemplateCategory[]
    path: string[]
  }>

  // Selection state
  selectedCategory: string | null
  selectedSubcategory: string | null
  selectedCategoryData: TemplateCategory | null
  selectedSubcategoryData: TemplateCategory | null

  // Analytics
  popularTags: Array<{ tag: string; count: number; categories: string[] }>
  categoryStats: CategoryState['categoryStats']

  // State
  loading: boolean
  error: string | null
  lastUpdated: Date | null

  // Actions
  selectCategory: (categoryId: string | null) => void
  selectSubcategory: (subcategoryId: string | null) => void
  clearSelection: () => void
  refreshCategories: () => Promise<void>
  searchCategories: (searchTerm: string) => TemplateCategory[]
  filterCategories: (filter: CategoryFilter) => TemplateCategory[]

  // Utilities
  getCategoryById: (categoryId: string) => TemplateCategory | null
  getSubcategoryById: (subcategoryId: string) => TemplateCategory | null
  getCategoryBreadcrumb: (categoryId: string) => Array<{ id: string; name: string }>
  isValidCategory: (categoryId: string) => boolean
  getCategoryColor: (category: TemplateCategory) => string
  getCategoryIcon: (category: TemplateCategory) => string
  updateTemplateCounts: (categoryCounts: Record<string, number>) => Promise<void>
}

/**
 * Default category options
 */
const DEFAULT_OPTIONS: Required<CategoryOptions> = {
  enableRealTimeUpdates: false,
  enableAnalytics: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
  retryDelay: 1000,
}

/**
 * Template categories hook with comprehensive functionality
 */
export function useTemplateCategories(options: CategoryOptions = {}): UseTemplateCategoriesReturn {
  const requestId = useRef(crypto.randomUUID().slice(0, 8))

  // Merge options with defaults
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options])

  // Category manager instance
  const categoryManager = useMemo(() => new CategoryManager(requestId.current), [])

  // State management
  const [state, setState] = useState<CategoryState>({
    categories: [],
    subcategories: [],
    selectedCategory: null,
    selectedSubcategory: null,
    popularTags: [],
    categoryStats: null,
    loading: false,
    error: null,
    lastUpdated: null,
  })

  const [retryCount, setRetryCount] = useState(0)

  // Cache management
  const cacheRef = useRef<{
    data: CategoryState | null
    timestamp: number
  }>({ data: null, timestamp: 0 })

  /**
   * Initialize categories from static data and API
   */
  const initializeCategories = useCallback(async () => {
    try {
      logger.info(`[${requestId.current}] Initializing template categories`)

      setState((prev) => ({ ...prev, loading: true, error: null }))

      // Start with static category data
      const staticCategories = categoryManager.getAllCategories()
      const staticSubcategories = categoryManager.getAllSubcategories()
      const staticPopularTags = categoryManager.getAllPopularTags()
      const staticStats = categoryManager.getCategoryStats()

      // Set static data immediately for better UX
      setState((prev) => ({
        ...prev,
        categories: staticCategories,
        subcategories: staticSubcategories,
        popularTags: staticPopularTags,
        categoryStats: staticStats,
        lastUpdated: new Date(),
      }))

      try {
        // Try to fetch updated category data from API
        const response = await fetch('/api/templates/v2/categories', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId.current,
          },
        })

        if (response.ok) {
          const data = await response.json()

          if (data.success && data.categories) {
            logger.info(`[${requestId.current}] Updated category data from API`)

            // Merge API data with static data
            const apiCategories = data.categories || staticCategories
            const apiSubcategories = data.subcategories || staticSubcategories
            const apiPopularTags = data.popularTags || staticPopularTags
            const apiStats = data.stats || staticStats

            setState((prev) => ({
              ...prev,
              categories: apiCategories,
              subcategories: apiSubcategories,
              popularTags: apiPopularTags,
              categoryStats: apiStats,
              loading: false,
              error: null,
              lastUpdated: new Date(),
            }))

            // Update cache
            cacheRef.current = {
              data: {
                ...prev,
                categories: apiCategories,
                subcategories: apiSubcategories,
                popularTags: apiPopularTags,
                categoryStats: apiStats,
              },
              timestamp: Date.now(),
            }

            setRetryCount(0)
          } else {
            throw new Error('Invalid API response format')
          }
        } else {
          // API failed, continue with static data
          logger.warn(`[${requestId.current}] API unavailable, using static category data`)
          setState((prev) => ({ ...prev, loading: false }))
        }
      } catch (apiError: any) {
        // API call failed, but we have static data
        logger.warn(`[${requestId.current}] Category API failed, using static data:`, apiError.message)
        setState((prev) => ({ ...prev, loading: false }))

        // Only show error if we have no data at all
        if (staticCategories.length === 0) {
          setState((prev) => ({ ...prev, error: 'Failed to load categories' }))
        }
      }
    } catch (error: any) {
      logger.error(`[${requestId.current}] Failed to initialize categories:`, error.message)

      // Try to use cached data
      if (cacheRef.current.data && Date.now() - cacheRef.current.timestamp < config.cacheTimeout * 2) {
        logger.info(`[${requestId.current}] Using cached category data`)
        setState(cacheRef.current.data)
        return
      }

      // Handle retry logic
      if (retryCount < config.maxRetries) {
        setRetryCount((prev) => prev + 1)
        setTimeout(() => {
          initializeCategories()
        }, config.retryDelay * (retryCount + 1))
        return
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load categories',
      }))

      toast.error('Failed to load template categories', {
        description: 'Using basic category structure',
      })
    }
  }, [categoryManager, config, retryCount])

  /**
   * Select a category
   */
  const selectCategory = useCallback((categoryId: string | null) => {
    logger.info(`[${requestId.current}] Selecting category:`, categoryId)

    setState((prev) => ({
      ...prev,
      selectedCategory: categoryId,
      selectedSubcategory: null, // Clear subcategory when changing category
    }))
  }, [])

  /**
   * Select a subcategory
   */
  const selectSubcategory = useCallback((subcategoryId: string | null) => {
    logger.info(`[${requestId.current}] Selecting subcategory:`, subcategoryId)

    setState((prev) => ({
      ...prev,
      selectedSubcategory: subcategoryId,
    }))
  }, [])

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedCategory: null,
      selectedSubcategory: null,
    }))
  }, [])

  /**
   * Refresh categories from API
   */
  const refreshCategories = useCallback(async () => {
    setRetryCount(0)
    await initializeCategories()
  }, [initializeCategories])

  /**
   * Search categories
   */
  const searchCategories = useCallback(
    (searchTerm: string): TemplateCategory[] => {
      return categoryManager.searchCategories(searchTerm)
    },
    [categoryManager]
  )

  /**
   * Filter categories with advanced options
   */
  const filterCategories = useCallback(
    (filter: CategoryFilter): TemplateCategory[] => {
      let categories = [...state.categories]

      // Apply search filter
      if (filter.searchTerm) {
        categories = searchCategories(filter.searchTerm)
      }

      // Apply template count filter
      if (filter.minTemplateCount !== undefined) {
        categories = CategoryUtils.filterCategoriesByTemplateCount(categories, filter.minTemplateCount)
      }

      // Apply sorting
      if (filter.sortBy || filter.sortOrder) {
        categories = CategoryUtils.sortCategories(
          categories,
          filter.sortBy || 'name',
          filter.sortOrder || 'asc'
        )
      }

      return categories
    },
    [state.categories, searchCategories]
  )

  /**
   * Get category by ID
   */
  const getCategoryById = useCallback(
    (categoryId: string): TemplateCategory | null => {
      return categoryManager.getCategoryById(categoryId)
    },
    [categoryManager]
  )

  /**
   * Get subcategory by ID
   */
  const getSubcategoryById = useCallback(
    (subcategoryId: string): TemplateCategory | null => {
      // Search in all subcategories
      return (
        state.subcategories.find((sub) => sub.id === subcategoryId) ||
        state.categories
          .flatMap((cat) => cat.subcategories || [])
          .find((sub) => sub.id === subcategoryId) ||
        null
      )
    },
    [state.categories, state.subcategories]
  )

  /**
   * Get category breadcrumb path
   */
  const getCategoryBreadcrumb = useCallback(
    (categoryId: string): Array<{ id: string; name: string }> => {
      return categoryManager.getCategoryBreadcrumb(categoryId)
    },
    [categoryManager]
  )

  /**
   * Check if category ID is valid
   */
  const isValidCategory = useCallback(
    (categoryId: string): boolean => {
      return categoryManager.isValidCategory(categoryId)
    },
    [categoryManager]
  )

  /**
   * Get category color with fallback
   */
  const getCategoryColor = useCallback((category: TemplateCategory): string => {
    return CategoryUtils.getCategoryColor(category)
  }, [])

  /**
   * Get category icon with fallback
   */
  const getCategoryIcon = useCallback((category: TemplateCategory): string => {
    return CategoryUtils.getCategoryIcon(category)
  }, [])

  /**
   * Update template counts for categories
   */
  const updateTemplateCounts = useCallback(
    async (categoryCounts: Record<string, number>) => {
      try {
        await categoryManager.updateTemplateCounts(categoryCounts)

        // Update local state
        setState((prev) => ({
          ...prev,
          categories: prev.categories.map((cat) => ({
            ...cat,
            templateCount: categoryCounts[cat.id] || cat.templateCount,
          })),
          lastUpdated: new Date(),
        }))

        logger.info(`[${requestId.current}] Updated template counts for categories`)
      } catch (error: any) {
        logger.error(`[${requestId.current}] Failed to update template counts:`, error.message)
      }
    },
    [categoryManager]
  )

  /**
   * Initialize categories on mount
   */
  useEffect(() => {
    // Check cache first
    if (
      cacheRef.current.data &&
      Date.now() - cacheRef.current.timestamp < config.cacheTimeout
    ) {
      logger.info(`[${requestId.current}] Loading categories from cache`)
      setState(cacheRef.current.data)
    } else {
      initializeCategories()
    }
  }, [initializeCategories, config.cacheTimeout])

  /**
   * Set up real-time updates if enabled
   */
  useEffect(() => {
    if (!config.enableRealTimeUpdates) return

    const interval = setInterval(() => {
      refreshCategories()
    }, config.cacheTimeout)

    return () => clearInterval(interval)
  }, [config.enableRealTimeUpdates, config.cacheTimeout, refreshCategories])

  // Computed values
  const allCategories = useMemo(() => {
    return [...state.categories, ...state.subcategories]
  }, [state.categories, state.subcategories])

  const categoryHierarchy = useMemo(() => {
    return categoryManager.getCategoryHierarchy()
  }, [categoryManager])

  const selectedCategoryData = useMemo(() => {
    return state.selectedCategory ? getCategoryById(state.selectedCategory) : null
  }, [state.selectedCategory, getCategoryById])

  const selectedSubcategoryData = useMemo(() => {
    return state.selectedSubcategory ? getSubcategoryById(state.selectedSubcategory) : null
  }, [state.selectedSubcategory, getSubcategoryById])

  return {
    // Data
    categories: state.categories,
    subcategories: state.subcategories,
    allCategories,
    categoryHierarchy,

    // Selection state
    selectedCategory: state.selectedCategory,
    selectedSubcategory: state.selectedSubcategory,
    selectedCategoryData,
    selectedSubcategoryData,

    // Analytics
    popularTags: state.popularTags,
    categoryStats: state.categoryStats,

    // State
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Actions
    selectCategory,
    selectSubcategory,
    clearSelection,
    refreshCategories,
    searchCategories,
    filterCategories,

    // Utilities
    getCategoryById,
    getSubcategoryById,
    getCategoryBreadcrumb,
    isValidCategory,
    getCategoryColor,
    getCategoryIcon,
    updateTemplateCounts,
  }
}