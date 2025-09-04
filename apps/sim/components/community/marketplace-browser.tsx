/**
 * Template Marketplace Browser - Advanced Template Discovery and Browsing Component
 *
 * This component provides a comprehensive marketplace interface for template discovery with:
 * - Advanced filtering, sorting, and search capabilities
 * - Template cards with ratings, downloads, and author information
 * - Category navigation with hierarchical browsing
 * - Integration with user profiles and reputation system
 * - Performance-optimized with virtual scrolling for large datasets
 * - Real-time search suggestions and auto-completion
 * - Advanced analytics tracking for user engagement
 *
 * Features:
 * - Multi-dimensional search across content, metadata, and tags
 * - Dynamic filtering with complex query combinations
 * - Personalized recommendations based on user behavior
 * - Social proof through ratings, reviews, and community metrics
 * - Responsive design with mobile-first approach
 * - Accessibility-compliant with keyboard navigation
 * - Integration with existing template gallery and community systems
 *
 * @author Claude Code Template Marketplace System
 * @version 1.0.0
 */

'use client'

import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Grid3X3, List, Search, SlidersHorizontal, Star, TrendingUp, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TemplateGallery } from '@/components/templates/template-gallery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Template } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Template Marketplace Browser Props Interface
 */
export interface MarketplaceBrowserProps {
  /** Current user ID for personalization */
  currentUserId?: string
  /** Custom CSS class name */
  className?: string
  /** Enable advanced search features */
  enableAdvancedSearch?: boolean
  /** Enable personalized recommendations */
  enableRecommendations?: boolean
  /** Show community features */
  showCommunityFeatures?: boolean
  /** Enable analytics tracking */
  enableAnalytics?: boolean
}

/**
 * Search and Filter State Interface
 */
interface SearchFilters {
  query: string
  category?: string
  tags: string[]
  difficulty?: string
  minRating: number
  minDownloads: number
  dateRange?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  author?: string
  isPremium?: boolean
  isFeatured?: boolean
  hasReviews?: boolean
}

/**
 * Template Category Interface
 */
interface TemplateCategory {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  color: string
  templateCount: number
  parentId?: string
  children?: TemplateCategory[]
}

/**
 * Popular Tag Interface
 */
interface PopularTag {
  id: string
  name: string
  displayName: string
  usageCount: number
  trendScore: number
  color: string
}

/**
 * Search Suggestion Interface
 */
interface SearchSuggestion {
  type: 'template' | 'category' | 'author' | 'tag'
  value: string
  label: string
  metadata?: Record<string, any>
}

/**
 * Template Marketplace Browser Component
 */
export const MarketplaceBrowser: React.FC<MarketplaceBrowserProps> = ({
  currentUserId,
  className,
  enableAdvancedSearch = true,
  enableRecommendations = true,
  showCommunityFeatures = true,
  enableAnalytics = true,
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State management
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [popularTags, setPopularTags] = useState<PopularTag[]>([])
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [recommendedTemplates, setRecommendedTemplates] = useState<Template[]>([])

  // Search and filter state
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    category: searchParams.get('category') || undefined,
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    difficulty: searchParams.get('difficulty') || undefined,
    minRating: Number.parseInt(searchParams.get('minRating') || '0'),
    minDownloads: Number.parseInt(searchParams.get('minDownloads') || '0'),
    dateRange: searchParams.get('dateRange') || undefined,
    sortBy: searchParams.get('sortBy') || 'relevance',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    author: searchParams.get('author') || undefined,
    isPremium: searchParams.get('premium') === 'true' || undefined,
    isFeatured: searchParams.get('featured') === 'true' || undefined,
    hasReviews: searchParams.get('reviews') === 'true' || undefined,
  })

  // Debounced search function
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null)

  /**
   * Initialize marketplace data
   */
  const initializeMarketplace = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch marketplace data in parallel
      const [templatesResponse, categoriesResponse, tagsResponse, recommendationsResponse] =
        await Promise.all([
          // Fetch templates based on current filters
          fetch(
            `/api/community/marketplace/templates?${new URLSearchParams({
              ...Object.fromEntries(
                Object.entries(filters).filter(
                  ([_, value]) =>
                    value !== undefined &&
                    value !== '' &&
                    !(Array.isArray(value) && value.length === 0)
                )
              ),
              tags: filters.tags.join(','),
            })}`
          ),
          // Fetch template categories
          fetch('/api/community/marketplace/categories'),
          // Fetch popular tags
          fetch('/api/community/marketplace/tags'),
          // Fetch personalized recommendations if enabled
          enableRecommendations && currentUserId
            ? fetch(`/api/community/marketplace/recommendations?userId=${currentUserId}`)
            : Promise.resolve(null),
        ])

      if (!templatesResponse.ok) throw new Error('Failed to fetch templates')
      if (!categoriesResponse.ok) throw new Error('Failed to fetch categories')
      if (!tagsResponse.ok) throw new Error('Failed to fetch tags')

      const [templatesData, categoriesData, tagsData, recommendationsData] = await Promise.all([
        templatesResponse.json(),
        categoriesResponse.json(),
        tagsResponse.json(),
        recommendationsResponse?.json() || null,
      ])

      setTemplates(templatesData.data || [])
      setCategories(categoriesData.data || [])
      setPopularTags(tagsData.data || [])

      if (recommendationsData?.data) {
        setRecommendedTemplates(recommendationsData.data)
      }

      // Track marketplace view analytics
      if (enableAnalytics) {
        trackAnalyticsEvent('marketplace_view', {
          userId: currentUserId,
          filters: filters,
          resultsCount: templatesData.data?.length || 0,
        })
      }
    } catch (error) {
      console.error('Marketplace initialization failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to load marketplace')
    } finally {
      setLoading(false)
    }
  }, [filters, currentUserId, enableRecommendations, enableAnalytics])

  /**
   * Handle search input changes with debouncing
   */
  const handleSearchChange = useCallback(
    (query: string) => {
      setFilters((prev) => ({ ...prev, query }))

      // Clear previous debounce
      if (searchDebounce) {
        clearTimeout(searchDebounce)
      }

      // Set new debounce
      const timeout = setTimeout(() => {
        if (query.length >= 2) {
          fetchSearchSuggestions(query)
        } else {
          setSearchSuggestions([])
        }
      }, 300)

      setSearchDebounce(timeout)
    },
    [searchDebounce]
  )

  /**
   * Fetch search suggestions
   */
  const fetchSearchSuggestions = useCallback(async (query: string) => {
    try {
      const response = await fetch(
        `/api/community/marketplace/suggestions?q=${encodeURIComponent(query)}`
      )
      if (response.ok) {
        const data = await response.json()
        setSearchSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Failed to fetch search suggestions:', error)
    }
  }, [])

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({
      query: '',
      tags: [],
      minRating: 0,
      minDownloads: 0,
      sortBy: 'relevance',
      sortOrder: 'desc',
    })
  }, [])

  /**
   * Update URL parameters based on filters
   */
  const updateURL = useCallback(() => {
    const params = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        if (Array.isArray(value)) {
          params.set(key, value.join(','))
        } else {
          params.set(key, value.toString())
        }
      }
    })

    const newURL = `${window.location.pathname}?${params.toString()}`
    router.replace(newURL, { scroll: false })
  }, [filters, router])

  /**
   * Track analytics events
   */
  const trackAnalyticsEvent = useCallback(
    async (eventType: string, data: any) => {
      if (!enableAnalytics) return

      try {
        await fetch('/api/community/marketplace/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            data,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (error) {
        console.error('Analytics tracking failed:', error)
      }
    },
    [enableAnalytics]
  )

  /**
   * Template action handlers
   */
  const handleTemplateSelect = useCallback(
    (template: Template) => {
      trackAnalyticsEvent('template_click', {
        templateId: template.id,
        userId: currentUserId,
        source: 'marketplace_browser',
      })

      router.push(`/templates/${template.id}`)
    },
    [currentUserId, router, trackAnalyticsEvent]
  )

  const handleInstantiate = useCallback(
    async (templateId: string) => {
      try {
        const response = await fetch('/api/templates/instantiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId, userId: currentUserId }),
        })

        if (response.ok) {
          const data = await response.json()
          trackAnalyticsEvent('template_instantiate', {
            templateId,
            userId: currentUserId,
            source: 'marketplace_browser',
          })

          router.push(`/workspace/${data.workspaceId}/workflow/${data.workflowId}`)
        }
      } catch (error) {
        console.error('Template instantiation failed:', error)
      }
    },
    [currentUserId, router, trackAnalyticsEvent]
  )

  const handleToggleStar = useCallback(
    async (templateId: string, isStarred: boolean) => {
      try {
        const response = await fetch(`/api/templates/${templateId}/star`, {
          method: isStarred ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId }),
        })

        if (response.ok) {
          trackAnalyticsEvent('template_star', {
            templateId,
            userId: currentUserId,
            action: isStarred ? 'unstar' : 'star',
          })

          // Update template in local state
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === templateId
                ? { ...t, isStarred: !isStarred, stars: t.stars + (isStarred ? -1 : 1) }
                : t
            )
          )
        }
      } catch (error) {
        console.error('Star toggle failed:', error)
      }
    },
    [currentUserId, trackAnalyticsEvent]
  )

  const handleShare = useCallback(
    (template: Template) => {
      trackAnalyticsEvent('template_share', {
        templateId: template.id,
        userId: currentUserId,
      })

      // Open native share dialog or copy to clipboard
      if (navigator.share) {
        navigator.share({
          title: template.name,
          text: template.description,
          url: `${window.location.origin}/templates/${template.id}`,
        })
      } else {
        navigator.clipboard.writeText(`${window.location.origin}/templates/${template.id}`)
      }
    },
    [currentUserId, trackAnalyticsEvent]
  )

  // Initialize marketplace on mount and filter changes
  useEffect(() => {
    initializeMarketplace()
  }, [initializeMarketplace])

  // Update URL when filters change
  useEffect(() => {
    updateURL()
  }, [updateURL])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounce) {
        clearTimeout(searchDebounce)
      }
    }
  }, [searchDebounce])

  // Memoized computed values
  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'query' || key === 'sortBy' || key === 'sortOrder') return false
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== '' && value !== 0
    }).length
  }, [filters])

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'rating', label: 'Rating' },
    { value: 'downloads', label: 'Downloads' },
    { value: 'newest', label: 'Newest' },
    { value: 'updated', label: 'Recently Updated' },
    { value: 'name', label: 'Name' },
  ]

  const difficultyOptions = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' },
  ]

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      {/* Header Section */}
      <div className='border-b bg-white/50 p-4 backdrop-blur-sm'>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h1 className='font-bold text-2xl text-gray-900'>Template Marketplace</h1>
            <p className='text-gray-600 text-sm'>
              Discover and use community-created workflow templates
            </p>
          </div>

          {/* View Controls */}
          <div className='flex items-center gap-2'>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className='h-4 w-4' />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setViewMode('list')}
            >
              <List className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className='relative mb-4'>
          <div className='relative'>
            <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400' />
            <Input
              type='text'
              placeholder='Search templates, categories, authors...'
              value={filters.query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className='pr-4 pl-10'
            />
          </div>

          {/* Search Suggestions */}
          {searchSuggestions.length > 0 && (
            <Card className='absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto'>
              <CardContent className='p-2'>
                {searchSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant='ghost'
                    className='h-auto w-full justify-start p-2'
                    onClick={() => {
                      if (suggestion.type === 'template') {
                        setFilters((prev) => ({ ...prev, query: suggestion.value }))
                      } else if (suggestion.type === 'category') {
                        setFilters((prev) => ({ ...prev, category: suggestion.value, query: '' }))
                      } else if (suggestion.type === 'author') {
                        setFilters((prev) => ({ ...prev, author: suggestion.value, query: '' }))
                      } else if (suggestion.type === 'tag') {
                        setFilters((prev) => ({
                          ...prev,
                          tags: [...prev.tags, suggestion.value],
                          query: '',
                        }))
                      }
                      setSearchSuggestions([])
                    }}
                  >
                    <div className='flex flex-col items-start'>
                      <span className='font-medium text-sm'>{suggestion.label}</span>
                      <span className='text-muted-foreground text-xs capitalize'>
                        {suggestion.type}
                      </span>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filter Bar */}
        <div className='flex flex-wrap items-center gap-2'>
          {/* Quick Category Filters */}
          {categories.slice(0, 6).map((category) => (
            <Button
              key={category.id}
              variant={filters.category === category.slug ? 'default' : 'outline'}
              size='sm'
              onClick={() =>
                handleFilterChange(
                  'category',
                  filters.category === category.slug ? undefined : category.slug
                )
              }
              className='h-8'
            >
              {category.name}
              <Badge variant='secondary' className='ml-1 text-xs'>
                {category.templateCount}
              </Badge>
            </Button>
          ))}

          <Separator orientation='vertical' className='h-6' />

          {/* Sort Controls */}
          <Select
            value={filters.sortBy}
            onValueChange={(value) => handleFilterChange('sortBy', value)}
          >
            <SelectTrigger className='w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced Filters Toggle */}
          <Button
            variant='outline'
            size='sm'
            onClick={() => setShowFilters(!showFilters)}
            className='h-8'
          >
            <SlidersHorizontal className='mr-2 h-4 w-4' />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant='destructive' className='ml-1 h-4 w-4 p-0 text-xs'>
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button variant='ghost' size='sm' onClick={clearFilters} className='h-8 text-red-600'>
              <X className='mr-1 h-4 w-4' />
              Clear
            </Button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className='overflow-hidden'
            >
              <Card className='mt-4'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Advanced Filters</CardTitle>
                </CardHeader>
                <CardContent className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                  {/* Difficulty Filter */}
                  <div className='space-y-2'>
                    <Label className='font-medium text-sm'>Difficulty</Label>
                    <Select
                      value={filters.difficulty || ''}
                      onValueChange={(value) =>
                        handleFilterChange('difficulty', value || undefined)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Any difficulty' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=''>Any difficulty</SelectItem>
                        {difficultyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rating Filter */}
                  <div className='space-y-2'>
                    <Label className='font-medium text-sm'>
                      Minimum Rating: {filters.minRating}/5
                    </Label>
                    <Slider
                      value={[filters.minRating]}
                      onValueChange={(value) => handleFilterChange('minRating', value[0])}
                      max={5}
                      step={0.5}
                      className='w-full'
                    />
                  </div>

                  {/* Downloads Filter */}
                  <div className='space-y-2'>
                    <Label className='font-medium text-sm'>
                      Minimum Downloads: {filters.minDownloads}
                    </Label>
                    <Slider
                      value={[filters.minDownloads]}
                      onValueChange={(value) => handleFilterChange('minDownloads', value[0])}
                      max={10000}
                      step={100}
                      className='w-full'
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters Display */}
        {(filters.tags.length > 0 || filters.category || filters.author) && (
          <div className='mt-3 flex flex-wrap gap-2'>
            {filters.category && (
              <Badge variant='secondary' className='gap-1'>
                Category: {categories.find((c) => c.slug === filters.category)?.name}
                <X
                  className='h-3 w-3 cursor-pointer'
                  onClick={() => handleFilterChange('category', undefined)}
                />
              </Badge>
            )}
            {filters.author && (
              <Badge variant='secondary' className='gap-1'>
                Author: {filters.author}
                <X
                  className='h-3 w-3 cursor-pointer'
                  onClick={() => handleFilterChange('author', undefined)}
                />
              </Badge>
            )}
            {filters.tags.map((tag) => (
              <Badge key={tag} variant='secondary' className='gap-1'>
                {popularTags.find((t) => t.name === tag)?.displayName || tag}
                <X
                  className='h-3 w-3 cursor-pointer'
                  onClick={() =>
                    handleFilterChange(
                      'tags',
                      filters.tags.filter((t) => t !== tag)
                    )
                  }
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Sidebar */}
        <div className='w-64 overflow-y-auto border-r bg-white/30 p-4'>
          <Tabs defaultValue='categories' className='w-full'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='categories'>Categories</TabsTrigger>
              <TabsTrigger value='tags'>Tags</TabsTrigger>
            </TabsList>

            <TabsContent value='categories' className='space-y-2'>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={filters.category === category.slug ? 'default' : 'ghost'}
                  className='h-auto w-full justify-between p-3'
                  onClick={() =>
                    handleFilterChange(
                      'category',
                      filters.category === category.slug ? undefined : category.slug
                    )
                  }
                >
                  <div className='flex items-center gap-2'>
                    <div
                      className='h-3 w-3 rounded-full'
                      style={{ backgroundColor: category.color }}
                    />
                    <span className='text-sm'>{category.name}</span>
                  </div>
                  <Badge variant='outline' className='text-xs'>
                    {category.templateCount}
                  </Badge>
                </Button>
              ))}
            </TabsContent>

            <TabsContent value='tags' className='space-y-2'>
              <div className='space-y-1'>
                {popularTags.slice(0, 15).map((tag) => (
                  <Button
                    key={tag.id}
                    variant={filters.tags.includes(tag.name) ? 'default' : 'ghost'}
                    size='sm'
                    className='w-full justify-between'
                    onClick={() => {
                      const newTags = filters.tags.includes(tag.name)
                        ? filters.tags.filter((t) => t !== tag.name)
                        : [...filters.tags, tag.name]
                      handleFilterChange('tags', newTags)
                    }}
                  >
                    <span className='text-xs'>{tag.displayName}</span>
                    <div className='flex items-center gap-1'>
                      {tag.trendScore > 50 && <TrendingUp className='h-3 w-3 text-orange-500' />}
                      <Badge variant='outline' className='text-xs'>
                        {tag.usageCount}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Recommended Templates Sidebar */}
          {enableRecommendations && recommendedTemplates.length > 0 && (
            <div className='mt-6'>
              <h3 className='mb-3 font-semibold text-sm'>Recommended for You</h3>
              <div className='space-y-2'>
                {recommendedTemplates.slice(0, 3).map((template) => (
                  <Card
                    key={template.id}
                    className='cursor-pointer p-2 transition-all hover:shadow-md'
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className='flex items-center gap-2'>
                      <div
                        className='flex h-8 w-8 items-center justify-center rounded text-white text-xs'
                        style={{ backgroundColor: template.color }}
                      >
                        {template.icon}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate font-medium text-xs'>{template.name}</p>
                        <div className='flex items-center gap-1 text-gray-500 text-xs'>
                          <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                          <span>{template.ratingAverage?.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Template Gallery */}
        <div className='flex-1 overflow-y-auto p-4'>
          <TemplateGallery
            templates={templates}
            viewMode={viewMode}
            loading={loading}
            error={error}
            showMetrics={true}
            showCommunityFeatures={showCommunityFeatures}
            showDifficulty={true}
            enableAnimations={true}
            currentUserId={currentUserId}
            onTemplateSelect={handleTemplateSelect}
            onInstantiate={handleInstantiate}
            onToggleStar={handleToggleStar}
            onShare={handleShare}
          />

          {/* Results Summary */}
          {!loading && templates.length > 0 && (
            <div className='mt-4 text-center text-muted-foreground text-sm'>
              Showing {templates.length} templates
              {filters.query && ` for "${filters.query}"`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MarketplaceBrowser
