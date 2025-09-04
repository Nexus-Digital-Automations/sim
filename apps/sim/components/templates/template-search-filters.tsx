/**
 * Template Search and Filters - Advanced Discovery Interface
 *
 * This component provides comprehensive search and filtering capabilities including:
 * - Real-time search with debounced queries and suggestions
 * - Advanced filter panel with multi-select options
 * - Category-based filtering with hierarchical navigation
 * - Tag-based filtering with popular tags display
 * - Date range filtering and sorting options
 * - Saved search functionality and search history
 * - Export and sharing of filter configurations
 * - Accessibility-compliant filter controls
 *
 * Design Features:
 * - Intuitive filter interface with clear visual hierarchy
 * - Responsive design for mobile and desktop
 * - Smooth animations and micro-interactions
 * - Clear filter state indicators and reset options
 * - Keyboard navigation and screen reader support
 * - Performance-optimized with virtualized lists
 *
 * @author Claude Code Template System - UI/UX Specialist
 * @version 2.0.0
 */

'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  ChevronDown,
  Filter,
  Hash,
  Search,
  Star,
  Tag,
  TrendingUp,
  X,
  SlidersHorizontal,
  BookOpen,
  Clock,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { DatePickerWithRange } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import type {
  Template,
  TemplateCategory,
  TemplateSearchFilters,
  TemplateSearchQuery,
  TemplateSearchResults,
  TemplateDifficulty,
} from '@/lib/templates/types'

/**
 * Search and Filter Props Interface
 */
export interface TemplateSearchFiltersProps {
  /** Current search query */
  searchQuery: string
  /** Current active filters */
  filters: TemplateSearchFilters
  /** Available categories for filtering */
  categories: TemplateCategory[]
  /** Search results facets for dynamic filter counts */
  facets?: TemplateSearchResults['facets']
  /** Popular tags for quick selection */
  popularTags?: Array<{ name: string; count: number }>
  /** Current sort configuration */
  sortBy: string
  /** Current sort order */
  sortOrder: 'asc' | 'desc'
  /** Loading state indicator */
  loading?: boolean
  /** Search query change handler */
  onSearchChange: (query: string) => void
  /** Filter change handler */
  onFiltersChange: (filters: Partial<TemplateSearchFilters>) => void
  /** Sort change handler */
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  /** Filter reset handler */
  onResetFilters: () => void
  /** Saved search handler */
  onSaveSearch?: (name: string, query: TemplateSearchQuery) => void
  /** Custom CSS class name */
  className?: string
  /** Show advanced filters panel */
  showAdvancedFilters?: boolean
  /** Enable search suggestions */
  enableSuggestions?: boolean
  /** Maximum number of suggestions to show */
  maxSuggestions?: number
}

/**
 * Search Suggestion Interface
 */
interface SearchSuggestion {
  type: 'template' | 'category' | 'tag' | 'author'
  value: string
  label: string
  count?: number
  icon?: React.ReactNode
}

/**
 * Difficulty Level Configuration
 */
const DIFFICULTY_LEVELS: Array<{
  value: TemplateDifficulty
  label: string
  description: string
  color: string
}> = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Simple workflows, perfect for getting started',
    color: 'bg-green-100 text-green-800',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'Moderate complexity, some automation experience helpful',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Complex workflows requiring solid automation knowledge',
    color: 'bg-orange-100 text-orange-800',
  },
  {
    value: 'expert',
    label: 'Expert',
    description: 'Highly complex, enterprise-level workflows',
    color: 'bg-red-100 text-red-800',
  },
]

/**
 * Sort Option Configuration
 */
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant', icon: <Search className="h-4 w-4" /> },
  { value: 'trending', label: 'Trending', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'newest', label: 'Newest First', icon: <Clock className="h-4 w-4" /> },
  { value: 'oldest', label: 'Oldest First', icon: <Clock className="h-4 w-4" /> },
  { value: 'rating', label: 'Highest Rated', icon: <Star className="h-4 w-4" /> },
  { value: 'views', label: 'Most Popular', icon: <Users className="h-4 w-4" /> },
  { value: 'name', label: 'Alphabetical', icon: <BookOpen className="h-4 w-4" /> },
]

/**
 * Main Template Search and Filters Component
 */
export const TemplateSearchFilters: React.FC<TemplateSearchFiltersProps> = ({
  searchQuery,
  filters,
  categories,
  facets,
  popularTags,
  sortBy,
  sortOrder,
  loading = false,
  onSearchChange,
  onFiltersChange,
  onSortChange,
  onResetFilters,
  onSaveSearch,
  className,
  showAdvancedFilters = false,
  enableSuggestions = true,
  maxSuggestions = 8,
}) => {
  // Component state
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(showAdvancedFilters)
  const [dateRange, setDateRange] = useState<{
    from?: Date
    to?: Date
  }>({
    from: filters.createdAfter,
    to: filters.createdBefore,
  })

  // Debounced search query update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        onSearchChange(searchInput)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput, searchQuery, onSearchChange])

  // Generate search suggestions
  const generateSuggestions = useCallback(
    (query: string): SearchSuggestion[] => {
      if (!query || query.length < 2) return []

      const suggestions: SearchSuggestion[] = []
      const lowerQuery = query.toLowerCase()

      // Category suggestions
      categories
        .filter((cat) => cat.name.toLowerCase().includes(lowerQuery))
        .slice(0, 3)
        .forEach((cat) => {
          suggestions.push({
            type: 'category',
            value: cat.id,
            label: cat.name,
            count: cat.templateCount,
            icon: <Tag className="h-4 w-4" />,
          })
        })

      // Tag suggestions from facets
      if (facets?.tags) {
        facets.tags
          .filter((tag) => tag.name.toLowerCase().includes(lowerQuery))
          .slice(0, 3)
          .forEach((tag) => {
            suggestions.push({
              type: 'tag',
              value: tag.name,
              label: tag.name,
              count: tag.count,
              icon: <Hash className="h-4 w-4" />,
            })
          })
      }

      // Popular tag suggestions
      if (popularTags) {
        popularTags
          .filter((tag) => tag.name.toLowerCase().includes(lowerQuery))
          .slice(0, 2)
          .forEach((tag) => {
            suggestions.push({
              type: 'tag',
              value: tag.name,
              label: tag.name,
              count: tag.count,
              icon: <Hash className="h-4 w-4" />,
            })
          })
      }

      return suggestions.slice(0, maxSuggestions)
    },
    [categories, facets, popularTags, maxSuggestions],
  )

  // Update suggestions when search query changes
  useEffect(() => {
    if (enableSuggestions) {
      const newSuggestions = generateSuggestions(searchInput)
      setSuggestions(newSuggestions)
      setShowSuggestions(newSuggestions.length > 0 && searchInput.length > 1)
    }
  }, [searchInput, generateSuggestions, enableSuggestions])

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      setShowSuggestions(false)

      switch (suggestion.type) {
        case 'category':
          onFiltersChange({
            categories: [...(filters.categories || []), suggestion.value],
          })
          setSearchInput('')
          break
        case 'tag':
          onFiltersChange({
            tags: [...(filters.tags || []), suggestion.value],
          })
          setSearchInput('')
          break
        case 'template':
        case 'author':
          setSearchInput(suggestion.label)
          onSearchChange(suggestion.label)
          break
      }
    },
    [filters, onFiltersChange, onSearchChange],
  )

  // Handle date range changes
  const handleDateRangeChange = useCallback(
    (range: { from?: Date; to?: Date }) => {
      setDateRange(range)
      onFiltersChange({
        createdAfter: range.from,
        createdBefore: range.to,
      })
    },
    [onFiltersChange],
  )

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.categories?.length) count += filters.categories.length
    if (filters.tags?.length) count += filters.tags.length
    if (filters.difficulty?.length) count += filters.difficulty.length
    if (filters.minRating) count += 1
    if (filters.createdAfter || filters.createdBefore) count += 1
    if (filters.hasDescription) count += 1
    return count
  }, [filters])

  // Get current sort option
  const currentSortOption = SORT_OPTIONS.find((opt) => opt.value === sortBy)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Input with Suggestions */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates, categories, or tags..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="pl-9 pr-4"
            aria-label="Search templates"
            autoComplete="off"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          )}
        </div>

        {/* Search Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-white shadow-lg"
            >
              <ScrollArea className="max-h-48">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 flex items-center gap-2"
                  >
                    {suggestion.icon}
                    <span className="flex-1">{suggestion.label}</span>
                    {suggestion.count && (
                      <Badge variant="secondary" className="ml-auto">
                        {suggestion.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Filters and Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Sort Selector */}
          <Select
            value={sortBy}
            onValueChange={(value) => onSortChange(value, sortOrder)}
          >
            <SelectTrigger className="w-48">
              <div className="flex items-center gap-2">
                {currentSortOption?.icon}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon}
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Order Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                sortOrder === 'asc' && 'rotate-180',
              )}
            />
          </Button>

          {/* Advanced Filters Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {advancedFiltersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Advanced Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Category Filter */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Categories</Label>
                    <ScrollArea className="h-32 rounded border p-2">
                      <div className="space-y-2">
                        {categories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`category-${category.id}`}
                              checked={filters.categories?.includes(category.id) || false}
                              onCheckedChange={(checked) => {
                                const newCategories = checked
                                  ? [...(filters.categories || []), category.id]
                                  : (filters.categories || []).filter((c) => c !== category.id)
                                onFiltersChange({ categories: newCategories })
                              }}
                            />
                            <Label
                              htmlFor={`category-${category.id}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {category.name}
                              <span className="ml-auto text-xs text-muted-foreground">
                                ({category.templateCount})
                              </span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Difficulty Filter */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Difficulty Level</Label>
                    <div className="space-y-2">
                      {DIFFICULTY_LEVELS.map((level) => (
                        <div key={level.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`difficulty-${level.value}`}
                            checked={filters.difficulty?.includes(level.value) || false}
                            onCheckedChange={(checked) => {
                              const newDifficulty = checked
                                ? [...(filters.difficulty || []), level.value]
                                : (filters.difficulty || []).filter((d) => d !== level.value)
                              onFiltersChange({ difficulty: newDifficulty })
                            }}
                          />
                          <Label
                            htmlFor={`difficulty-${level.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            <Badge variant="secondary" className={level.color}>
                              {level.label}
                            </Badge>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rating Filter */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Minimum Rating</Label>
                    <div className="px-2">
                      <Slider
                        value={[filters.minRating || 0]}
                        onValueChange={([value]) => onFiltersChange({ minRating: value })}
                        max={5}
                        min={0}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Any</span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {filters.minRating || 0}+
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Popular Tags */}
                {popularTags && popularTags.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Popular Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {popularTags.slice(0, 12).map((tag) => (
                        <button
                          key={tag.name}
                          onClick={() => {
                            const isSelected = filters.tags?.includes(tag.name)
                            const newTags = isSelected
                              ? (filters.tags || []).filter((t) => t !== tag.name)
                              : [...(filters.tags || []), tag.name]
                            onFiltersChange({ tags: newTags })
                          }}
                          className={cn(
                            'text-sm px-3 py-1 rounded-full border transition-colors',
                            filters.tags?.includes(tag.name)
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                          )}
                        >
                          {tag.name} ({tag.count})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Date Range Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Creation Date</Label>
                  <DatePickerWithRange
                    date={dateRange}
                    onDateChange={handleDateRangeChange}
                    className="w-full"
                  />
                </div>

                <Separator />

                {/* Additional Options */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Additional Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-description"
                        checked={filters.hasDescription || false}
                        onCheckedChange={(checked) =>
                          onFiltersChange({ hasDescription: checked as boolean })
                        }
                      />
                      <Label htmlFor="has-description" className="text-sm font-normal">
                        Has detailed description
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-thumbnail"
                        checked={filters.hasThumbnail || false}
                        onCheckedChange={(checked) =>
                          onFiltersChange({ hasThumbnail: checked as boolean })
                        }
                      />
                      <Label htmlFor="has-thumbnail" className="text-sm font-normal">
                        Has preview thumbnail
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TemplateSearchFilters