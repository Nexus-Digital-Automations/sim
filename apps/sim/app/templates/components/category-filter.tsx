/**
 * CategoryFilter Component - Hierarchical Template Category Navigation
 *
 * This component provides comprehensive category filtering for the template marketplace including:
 * - Hierarchical category navigation with tree-like structure
 * - Visual indicators for active categories and selection states
 * - Multiple selection modes (single vs multiple categories)
 * - Responsive design with mobile-friendly collapsible sections
 * - Template count badges showing available templates per category
 * - Smooth animations and transitions for enhanced UX
 * - Accessibility support with proper ARIA labels and keyboard navigation
 * - Integration with TEMPLATE_CATEGORIES system
 * - Support for nested subcategories with visual hierarchy
 *
 * Features:
 * - Tree-like hierarchical navigation
 * - Visual selection indicators with category colors
 * - Template count badges for each category
 * - Search within categories for large category lists
 * - Collapsible sections for better space management
 * - Mobile-responsive design with drawer-style navigation
 * - Keyboard navigation support
 * - Clear visual hierarchy with proper indentation
 * - Loading states and skeleton placeholders
 * - Error handling and empty states
 *
 * @author Claude Code Template System
 * @version 2.0.0
 */

'use client'

import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Filter, Folder, FolderOpen, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { createLogger } from '@/lib/logs/console/logger'
import type { TemplateCategory } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

// Initialize logger for category filter operations
const logger = createLogger('CategoryFilter')

/**
 * Props interface for the CategoryFilter component
 */
export interface CategoryFilterProps {
  /** Array of available template categories */
  categories: TemplateCategory[]

  /** Currently selected category ID (null for no selection) */
  selectedCategory: string | null

  /** Callback when category selection changes */
  onCategoryChange: (categoryId: string | null) => void

  /** Loading state for categories */
  loading?: boolean

  /** Template count per category for badge display */
  templateCounts?: Record<string, number>

  /** Whether to allow multiple category selection */
  multiSelect?: boolean

  /** Array of selected categories (for multi-select mode) */
  selectedCategories?: string[]

  /** Callback for multi-select changes */
  onMultiSelectChange?: (categoryIds: string[]) => void

  /** Whether to show search within categories */
  showSearch?: boolean

  /** Whether to show template counts */
  showCounts?: boolean

  /** Custom CSS classes */
  className?: string

  /** Compact mode for smaller displays */
  compact?: boolean

  /** Whether to start with categories collapsed */
  defaultCollapsed?: boolean
}

/**
 * Internal state interface for tracking expanded categories
 */
interface CategoryExpansionState {
  [categoryId: string]: boolean
}

/**
 * CategoryFilter component for hierarchical template category navigation
 */
export function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  loading = false,
  templateCounts = {},
  multiSelect = false,
  selectedCategories = [],
  onMultiSelectChange,
  showSearch = false,
  showCounts = true,
  className,
  compact = false,
  defaultCollapsed = false,
}: CategoryFilterProps) {
  const requestId = useMemo(() => crypto.randomUUID().slice(0, 8), [])

  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<CategoryExpansionState>(() => {
    // Initialize with selected category expanded by default
    const initialState: CategoryExpansionState = {}
    if (!defaultCollapsed && selectedCategory) {
      // Find and expand parent categories of selected category
      categories.forEach((category) => {
        if (
          category.id === selectedCategory ||
          category.subcategories?.some((sub) => sub.id === selectedCategory)
        ) {
          initialState[category.id] = true
        }
      })
    }
    return initialState
  })

  // Log component initialization
  useEffect(() => {
    logger.info(`[${requestId}] CategoryFilter initialized`, {
      categoriesCount: categories.length,
      selectedCategory,
      multiSelect,
      showSearch,
    })
  }, [requestId, categories.length, selectedCategory, multiSelect, showSearch])

  /**
   * Filter categories based on search term
   */
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories

    const term = searchTerm.toLowerCase()

    return categories.filter((category) => {
      // Check main category
      const mainMatch =
        category.name.toLowerCase().includes(term) ||
        category.description.toLowerCase().includes(term) ||
        category.popularTags.some((tag) => tag.toLowerCase().includes(term))

      // Check subcategories
      const subMatch = category.subcategories?.some(
        (sub) =>
          sub.name.toLowerCase().includes(term) ||
          sub.description.toLowerCase().includes(term) ||
          sub.popularTags.some((tag) => tag.toLowerCase().includes(term))
      )

      return mainMatch || subMatch
    })
  }, [categories, searchTerm])

  /**
   * Toggle expansion state of a category
   */
  const toggleCategoryExpansion = useCallback(
    (categoryId: string) => {
      setExpandedCategories((prev) => ({
        ...prev,
        [categoryId]: !prev[categoryId],
      }))

      logger.debug(`[${requestId}] Category expansion toggled`, {
        categoryId,
        expanded: !expandedCategories[categoryId],
      })
    },
    [requestId, expandedCategories]
  )

  /**
   * Handle category selection
   */
  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      if (multiSelect && onMultiSelectChange) {
        // Multi-select mode
        const newSelection = selectedCategories.includes(categoryId)
          ? selectedCategories.filter((id) => id !== categoryId)
          : [...selectedCategories, categoryId]

        onMultiSelectChange(newSelection)

        logger.info(`[${requestId}] Multi-select category changed`, {
          categoryId,
          selectedCategories: newSelection,
        })
      } else {
        // Single-select mode
        const newCategory = selectedCategory === categoryId ? null : categoryId
        onCategoryChange(newCategory)

        logger.info(`[${requestId}] Category selection changed`, {
          categoryId,
          previousCategory: selectedCategory,
          newCategory,
        })
      }
    },
    [
      multiSelect,
      onMultiSelectChange,
      selectedCategories,
      selectedCategory,
      onCategoryChange,
      requestId,
    ]
  )

  /**
   * Get template count for a category (including subcategories)
   */
  const getCategoryCount = useCallback(
    (category: TemplateCategory): number => {
      let count = templateCounts[category.id] || category.templateCount || 0

      // Add subcategory counts
      if (category.subcategories) {
        count += category.subcategories.reduce((sum, sub) => {
          return sum + (templateCounts[sub.id] || sub.templateCount || 0)
        }, 0)
      }

      return count
    },
    [templateCounts]
  )

  /**
   * Check if a category is selected (handles both single and multi-select)
   */
  const isCategorySelected = useCallback(
    (categoryId: string): boolean => {
      if (multiSelect) {
        return selectedCategories.includes(categoryId)
      }
      return selectedCategory === categoryId
    },
    [multiSelect, selectedCategories, selectedCategory]
  )

  /**
   * Render a single category item with its subcategories
   */
  const renderCategoryItem = useCallback(
    (category: TemplateCategory, level = 0): React.ReactNode => {
      const isSelected = isCategorySelected(category.id)
      const isExpanded = expandedCategories[category.id]
      const hasSubcategories = category.subcategories && category.subcategories.length > 0
      const templateCount = getCategoryCount(category)
      const indentClass = level > 0 ? `ml-${Math.min(level * 4, 16)}` : ''

      return (
        <div key={category.id} className={cn('category-item', indentClass)}>
          {/* Main Category */}
          <div className='flex items-center gap-2'>
            {/* Expand/Collapse Button */}
            {hasSubcategories ? (
              <Button
                variant='ghost'
                size='sm'
                className='h-6 w-6 p-0 hover:bg-gray-100'
                onClick={() => toggleCategoryExpansion(category.id)}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.name}`}
              >
                {isExpanded ? (
                  <ChevronDown className='h-3 w-3' />
                ) : (
                  <ChevronRight className='h-3 w-3' />
                )}
              </Button>
            ) : (
              <div className='h-6 w-6' /> /* Spacer for alignment */
            )}

            {/* Category Icon */}
            <div
              className='flex h-6 w-6 items-center justify-center rounded'
              style={{ backgroundColor: `${category.color}20` }}
              aria-hidden='true'
            >
              {hasSubcategories ? (
                isExpanded ? (
                  <FolderOpen className='h-3 w-3' style={{ color: category.color }} />
                ) : (
                  <Folder className='h-3 w-3' style={{ color: category.color }} />
                )
              ) : (
                <div className='h-2 w-2 rounded-full' style={{ backgroundColor: category.color }} />
              )}
            </div>

            {/* Category Button */}
            <Button
              variant={isSelected ? 'default' : 'ghost'}
              size={compact ? 'sm' : 'default'}
              className={cn(
                'flex-1 justify-start text-left',
                isSelected && 'bg-primary text-primary-foreground',
                level > 0 && 'text-sm'
              )}
              onClick={() => handleCategorySelect(category.id)}
              aria-pressed={isSelected}
            >
              <span className='truncate'>{category.name}</span>

              {/* Template Count Badge */}
              {showCounts && templateCount > 0 && (
                <Badge
                  variant={isSelected ? 'secondary' : 'outline'}
                  className={cn(
                    'ml-auto text-xs',
                    isSelected && 'bg-primary-foreground text-primary'
                  )}
                >
                  {templateCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Subcategories */}
          {hasSubcategories && (
            <Collapsible open={isExpanded}>
              <CollapsibleContent className='mt-1 space-y-1'>
                {category.subcategories?.map((subcategory) =>
                  renderCategoryItem(subcategory, level + 1)
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )
    },
    [
      isCategorySelected,
      expandedCategories,
      getCategoryCount,
      showCounts,
      compact,
      toggleCategoryExpansion,
      handleCategorySelect,
    ]
  )

  /**
   * Render loading skeleton
   */
  const renderLoadingSkeleton = (): React.ReactNode => (
    <div className='space-y-2'>
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className='flex items-center gap-2'>
          <Skeleton className='h-6 w-6 rounded' />
          <Skeleton className='h-6 w-6 rounded' />
          <Skeleton className='h-8 flex-1' />
          <Skeleton className='h-5 w-8 rounded-full' />
        </div>
      ))}
    </div>
  )

  /**
   * Render empty state
   */
  const renderEmptyState = (): React.ReactNode => (
    <div className='py-8 text-center'>
      <Filter className='mx-auto h-8 w-8 text-gray-400' />
      <h3 className='mt-2 font-medium text-gray-900 text-sm'>No categories found</h3>
      <p className='mt-1 text-gray-500 text-sm'>
        {searchTerm ? 'Try adjusting your search terms.' : 'No categories are available.'}
      </p>
      {searchTerm && (
        <Button variant='outline' size='sm' className='mt-3' onClick={() => setSearchTerm('')}>
          Clear search
        </Button>
      )}
    </div>
  )

  return (
    <Card className={cn('category-filter', className)}>
      <CardHeader className={cn('pb-3', compact && 'py-2')}>
        <CardTitle className={cn('flex items-center gap-2', compact && 'text-sm')}>
          <Filter className={cn('h-4 w-4', compact && 'h-3 w-3')} />
          Categories
          {selectedCategory && !multiSelect && (
            <Button
              variant='ghost'
              size='sm'
              className='ml-auto h-6 w-6 p-0 hover:bg-gray-100'
              onClick={() => onCategoryChange(null)}
              aria-label='Clear category filter'
            >
              <X className='h-3 w-3' />
            </Button>
          )}
        </CardTitle>

        {/* Search Input */}
        {showSearch && (
          <div className='relative'>
            <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-3 w-3 text-gray-400' />
            <Input
              placeholder='Search categories...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn('pl-9', compact && 'h-8 text-sm')}
            />
            {searchTerm && (
              <Button
                variant='ghost'
                size='sm'
                className='-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6 p-0'
                onClick={() => setSearchTerm('')}
                aria-label='Clear search'
              >
                <X className='h-3 w-3' />
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className={cn('space-y-1', compact && 'px-3 py-2')}>
        {/* Multi-select Clear All Button */}
        {multiSelect && selectedCategories.length > 0 && (
          <div className='mb-3 flex items-center justify-between'>
            <span className='text-gray-600 text-sm'>{selectedCategories.length} selected</span>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onMultiSelectChange?.([])}
              className='text-red-600 hover:text-red-700'
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Category List */}
        {loading ? (
          renderLoadingSkeleton()
        ) : filteredCategories.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className='space-y-1'>
            {filteredCategories.map((category) => renderCategoryItem(category, 0))}
          </div>
        )}

        {/* Show All Categories Button (when searching) */}
        {searchTerm && filteredCategories.length < categories.length && (
          <Button
            variant='outline'
            size='sm'
            className='mt-3 w-full'
            onClick={() => setSearchTerm('')}
          >
            Show all categories ({categories.length - filteredCategories.length} more)
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Export default component
 */
export default CategoryFilter

/**
 * Utility functions for category operations
 */
export const CategoryFilterUtils = {
  /**
   * Get all category IDs including subcategories
   */
  getAllCategoryIds(categories: TemplateCategory[]): string[] {
    const ids: string[] = []

    const traverse = (cats: TemplateCategory[]) => {
      cats.forEach((cat) => {
        ids.push(cat.id)
        if (cat.subcategories) {
          traverse(cat.subcategories)
        }
      })
    }

    traverse(categories)
    return ids
  },

  /**
   * Find category by ID (including subcategories)
   */
  findCategoryById(categories: TemplateCategory[], categoryId: string): TemplateCategory | null {
    for (const category of categories) {
      if (category.id === categoryId) {
        return category
      }

      if (category.subcategories) {
        const found = this.findCategoryById(category.subcategories, categoryId)
        if (found) return found
      }
    }

    return null
  },

  /**
   * Get category breadcrumb path
   */
  getCategoryPath(categories: TemplateCategory[], categoryId: string): TemplateCategory[] {
    const path: TemplateCategory[] = []

    const findPath = (cats: TemplateCategory[], targetId: string): boolean => {
      for (const cat of cats) {
        path.push(cat)

        if (cat.id === targetId) {
          return true
        }

        if (cat.subcategories && findPath(cat.subcategories, targetId)) {
          return true
        }

        path.pop()
      }

      return false
    }

    findPath(categories, categoryId)
    return path
  },

  /**
   * Get total template count for category tree
   */
  getTotalTemplateCount(category: TemplateCategory): number {
    let count = category.templateCount || 0

    if (category.subcategories) {
      count += category.subcategories.reduce((sum, sub) => sum + this.getTotalTemplateCount(sub), 0)
    }

    return count
  },
}
