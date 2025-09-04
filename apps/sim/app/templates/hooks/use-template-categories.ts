/**
 * Template Categories Hook
 * Provides template category management and navigation functionality
 */

import { useCallback, useEffect, useState, useMemo } from 'react'
import { TEMPLATE_CATEGORIES } from '@/lib/templates/categories'
import type { TemplateCategory } from '@/lib/templates/types'

export interface UseTemplateCategoriesOptions {
  includeEmpty?: boolean
  loadCounts?: boolean
}

export interface UseTemplateCategoriesReturn {
  // Category data
  categories: TemplateCategory[]
  categoriesMap: Map<string, TemplateCategory>
  rootCategories: TemplateCategory[]
  
  // Selection state
  selectedCategory: string | null
  selectedPath: TemplateCategory[]
  
  // Loading state
  loading: boolean
  error: string | null
  
  // Actions
  selectCategory: (categoryId: string | null) => void
  expandCategory: (categoryId: string) => void
  collapseCategory: (categoryId: string) => void
  toggleCategory: (categoryId: string) => void
  
  // Utilities
  getCategoryById: (categoryId: string) => TemplateCategory | undefined
  getCategoryPath: (categoryId: string) => TemplateCategory[]
  getCategoryChildren: (categoryId: string) => TemplateCategory[]
  isExpanded: (categoryId: string) => boolean
  refresh: () => Promise<void>
}

/**
 * Custom hook for template category management
 */
export function useTemplateCategories(
  options: UseTemplateCategoriesOptions = {}
): UseTemplateCategoriesReturn {
  const { includeEmpty = false, loadCounts = true } = options

  // State
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [templateCounts, setTemplateCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Process categories with template counts and filtering
   */
  const processedCategories = useMemo(() => {
    let processed = Object.values(TEMPLATE_CATEGORIES).map(category => ({
      ...category,
      templateCount: templateCounts[category.id] || 0
    }))

    // Filter empty categories if not included
    if (!includeEmpty) {
      processed = processed.filter(category => 
        category.templateCount > 0 || 
        category.subcategories?.some(child => templateCounts[child.id] > 0)
      )
    }

    return processed
  }, [templateCounts, includeEmpty])

  /**
   * Create categories map for quick lookup
   */
  const categoriesMap = useMemo(() => {
    const map = new Map<string, TemplateCategory>()
    
    const addToMap = (categories: TemplateCategory[]) => {
      categories.forEach(category => {
        map.set(category.id, category)
        if (category.subcategories) {
          addToMap(category.subcategories)
        }
      })
    }
    
    addToMap(processedCategories)
    return map
  }, [processedCategories])

  /**
   * Get root level categories
   */
  const rootCategories = useMemo(() => {
    return processedCategories.filter(category => !category.parentId)
  }, [processedCategories])

  /**
   * Get path to selected category
   */
  const selectedPath = useMemo(() => {
    if (!selectedCategory) return []
    
    const path: TemplateCategory[] = []
    let currentId = selectedCategory
    
    while (currentId) {
      const category = categoriesMap.get(currentId)
      if (!category) break
      
      path.unshift(category)
      currentId = category.parentId || ''
    }
    
    return path
  }, [selectedCategory, categoriesMap])

  /**
   * Load template counts for categories
   */
  const loadTemplateCounts = useCallback(async () => {
    if (!loadCounts) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/templates/category-counts')
      
      if (!response.ok) {
        throw new Error(`Failed to load category counts: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setTemplateCounts(data.counts || {})
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load category counts'
      setError(errorMessage)
      console.error('Template category counts error:', err)
    } finally {
      setLoading(false)
    }
  }, [loadCounts])

  /**
   * Select a category
   */
  const selectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId)
    
    // Auto-expand parent categories
    if (categoryId) {
      const category = categoriesMap.get(categoryId)
      if (category?.parentId) {
        setExpandedCategories(prev => new Set([...prev, category.parentId!]))
      }
    }
  }, [categoriesMap])

  /**
   * Expand a category
   */
  const expandCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => new Set([...prev, categoryId]))
  }, [])

  /**
   * Collapse a category
   */
  const collapseCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      next.delete(categoryId)
      return next
    })
  }, [])

  /**
   * Toggle category expansion
   */
  const toggleCategory = useCallback((categoryId: string) => {
    if (expandedCategories.has(categoryId)) {
      collapseCategory(categoryId)
    } else {
      expandCategory(categoryId)
    }
  }, [expandedCategories, collapseCategory, expandCategory])

  /**
   * Get category by ID
   */
  const getCategoryById = useCallback((categoryId: string): TemplateCategory | undefined => {
    return categoriesMap.get(categoryId)
  }, [categoriesMap])

  /**
   * Get path to a category
   */
  const getCategoryPath = useCallback((categoryId: string): TemplateCategory[] => {
    const path: TemplateCategory[] = []
    let currentId = categoryId
    
    while (currentId) {
      const category = categoriesMap.get(currentId)
      if (!category) break
      
      path.unshift(category)
      currentId = category.parentId || ''
    }
    
    return path
  }, [categoriesMap])

  /**
   * Get children of a category
   */
  const getCategoryChildren = useCallback((categoryId: string): TemplateCategory[] => {
    const category = categoriesMap.get(categoryId)
    return category?.subcategories || []
  }, [categoriesMap])

  /**
   * Check if category is expanded
   */
  const isExpanded = useCallback((categoryId: string): boolean => {
    return expandedCategories.has(categoryId)
  }, [expandedCategories])

  /**
   * Refresh category data
   */
  const refresh = useCallback(async () => {
    await loadTemplateCounts()
  }, [loadTemplateCounts])

  /**
   * Initialize categories on mount
   */
  useEffect(() => {
    setCategories(Object.values(TEMPLATE_CATEGORIES))
    if (loadCounts) {
      loadTemplateCounts()
    }
  }, [loadCounts, loadTemplateCounts])

  return {
    // Category data
    categories: processedCategories,
    categoriesMap,
    rootCategories,
    
    // Selection state
    selectedCategory,
    selectedPath,
    
    // Loading state
    loading,
    error,
    
    // Actions
    selectCategory,
    expandCategory,
    collapseCategory,
    toggleCategory,
    
    // Utilities
    getCategoryById,
    getCategoryPath,
    getCategoryChildren,
    isExpanded,
    refresh
  }
}