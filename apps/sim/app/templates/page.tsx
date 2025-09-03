/**
 * Template Marketplace - Main Discovery and Browsing Interface
 * 
 * This page provides a comprehensive template marketplace experience including:
 * - Advanced search and filtering capabilities
 * - Category-based browsing with hierarchical navigation
 * - Template grid with rich metadata and preview
 * - User ratings, reviews, and community features
 * - Personalized recommendations and trending templates
 * - Quick template instantiation and customization
 * - Collection management and social features
 * 
 * Features:
 * - Responsive design with mobile optimization
 * - Server-side rendering with client-side interactivity
 * - Real-time search with debounced queries
 * - Infinite scroll pagination for performance
 * - Advanced filtering with faceted search
 * - Template preview with code visualization
 * - One-click instantiation with guided setup
 * 
 * @author Claude Code Template System
 * @version 2.0.0
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, Grid, List, Star, Users, TrendingUp, Plus, Bookmark, Share2 } from 'lucide-react'
import { toast } from 'sonner'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

// Custom components
import { TemplateCard } from './components/template-card'
import { CategoryFilter } from './components/category-filter'
import { AdvancedSearchDialog } from './components/advanced-search-dialog'
import { TemplatePreviewDialog } from './components/template-preview-dialog'
import { CreateCollectionDialog } from './components/create-collection-dialog'

// Hooks and utilities
import { useTemplateSearch } from './hooks/use-template-search'
import { useTemplateCategories } from './hooks/use-template-categories'
import { useUserCollections } from './hooks/use-user-collections'
import { TEMPLATE_CATEGORIES } from '@/lib/templates/categories'
import type { Template, TemplateSearchQuery, TemplateSearchFilters } from '@/lib/templates/types'

/**
 * View mode for template display
 */
type ViewMode = 'grid' | 'list'

/**
 * Sort options for templates
 */
type SortOption = 'relevance' | 'trending' | 'newest' | 'oldest' | 'most-popular' | 'highest-rated'

/**
 * Main Template Marketplace Page Component
 */
export default function TemplatesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('trending')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showCreateCollection, setShowCreateCollection] = useState(false)
  
  // Advanced filters state
  const [filters, setFilters] = useState<TemplateSearchFilters>({
    difficulty: [],
    tags: [],
    minRating: undefined,
    hasDescription: true,
    createdAfter: undefined,
    createdBefore: undefined
  })

  // Initialize from URL parameters
  useEffect(() => {
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort')
    
    if (category) setSelectedCategory(category)
    if (search) setSearchQuery(search)
    if (sort && ['relevance', 'trending', 'newest', 'oldest', 'most-popular', 'highest-rated'].includes(sort)) {
      setSortBy(sort as SortOption)
    }
  }, [searchParams])

  // Build search query
  const searchQueryData = useMemo<TemplateSearchQuery>(() => ({
    search: searchQuery || undefined,
    category: selectedCategory || undefined,
    filters,
    sortBy: mapSortOptionToAPI(sortBy),
    sortOrder: ['oldest'].includes(sortBy) ? 'asc' : 'desc',
    page: 1,
    limit: 24,
    includeMetadata: true,
    includeUserData: true,
    includeAnalytics: true
  }), [searchQuery, selectedCategory, filters, sortBy])

  // Custom hooks for data fetching
  const {
    templates,
    pagination,
    loading,
    error,
    facets,
    analytics,
    refetch,
    loadMore,
    hasNextPage
  } = useTemplateSearch(searchQueryData)

  const { categories, categoriesLoading } = useTemplateCategories()
  const { collections, collectionsLoading } = useUserCollections()

  // Event handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    updateURL({ search: value || undefined })
  }, [])

  const handleCategoryChange = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId)
    updateURL({ category: categoryId || undefined })
  }, [])

  const handleSortChange = useCallback((sort: SortOption) => {
    setSortBy(sort)
    updateURL({ sort })
  }, [])

  const handleFilterChange = useCallback((newFilters: Partial<TemplateSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const handleTemplateClick = useCallback((template: Template) => {
    setSelectedTemplate(template)
  }, [])

  const handleInstantiateTemplate = useCallback(async (templateId: string) => {
    try {
      // Navigate to template instantiation page
      router.push(`/templates/${templateId}/instantiate`)
    } catch (error) {
      toast.error('Failed to start template instantiation')
    }
  }, [router])

  const handleStarTemplate = useCallback(async (templateId: string, isStarred: boolean) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/star`, {
        method: isStarred ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to update star status')
      }

      // Refetch templates to update star counts
      refetch()
      toast.success(isStarred ? 'Template unstarred' : 'Template starred')
    } catch (error) {
      toast.error('Failed to update star status')
    }
  }, [refetch])

  const handleShareTemplate = useCallback(async (template: Template) => {
    const shareUrl = `${window.location.origin}/templates/${template.id}`
    
    try {
      await navigator.share({
        title: template.name,
        text: template.description || 'Check out this workflow template',
        url: shareUrl
      })
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareUrl)
      toast.success('Template link copied to clipboard')
    }
  }, [])

  // Update URL with search parameters
  const updateURL = useCallback((params: Record<string, string | undefined>) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value)
      } else {
        newSearchParams.delete(key)
      }
    })

    router.push(`/templates?${newSearchParams.toString()}`, { scroll: false })
  }, [searchParams, router])

  // Helper function to map sort options to API format
  function mapSortOptionToAPI(sort: SortOption): string {
    switch (sort) {
      case 'relevance': return 'relevance'
      case 'trending': return 'views'
      case 'newest': return 'createdAt'
      case 'oldest': return 'createdAt'
      case 'most-popular': return 'views'
      case 'highest-rated': return 'rating'
      default: return 'views'
    }
  }

  // Render loading state
  if (loading && !templates.length) {
    return <TemplatePageSkeleton />
  }

  // Render error state
  if (error && !templates.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Failed to load templates. Please try again.</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Template Marketplace</h1>
            <p className="text-gray-600 mt-1">
              Discover and use powerful workflow templates created by the community
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreateCollection(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Collection
            </Button>
            <Button onClick={() => router.push('/templates/create')} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search templates, categories, or authors..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedSearch(true)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="most-popular">Most Popular</SelectItem>
                <SelectItem value="highest-rated">Highest Rated</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="relevance">Most Relevant</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none border-l"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedCategory || filters.tags?.length || filters.difficulty?.length || filters.minRating) && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-gray-600">Active filters:</span>
            
            {selectedCategory && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {TEMPLATE_CATEGORIES[selectedCategory]?.name || selectedCategory}
                <button
                  onClick={() => handleCategoryChange(null)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}

            {filters.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <button
                  onClick={() => handleFilterChange({
                    tags: filters.tags?.filter(t => t !== tag)
                  })}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            ))}

            {filters.difficulty?.map(difficulty => (
              <Badge key={difficulty} variant="secondary" className="flex items-center gap-1">
                {difficulty}
                <button
                  onClick={() => handleFilterChange({
                    difficulty: filters.difficulty?.filter(d => d !== difficulty)
                  })}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            ))}

            {filters.minRating && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {filters.minRating}+ stars
                <button
                  onClick={() => handleFilterChange({ minRating: undefined })}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCategory(null)
                setFilters({})
                updateURL({ category: undefined })
              }}
              className="text-red-600 hover:text-red-700"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex gap-8">
        {/* Sidebar - Categories */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <CategoryFilter
            categories={Object.values(TEMPLATE_CATEGORIES)}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            loading={categoriesLoading}
            templateCounts={facets?.categories.reduce((acc, cat) => {
              acc[cat.name] = cat.count
              return acc
            }, {} as Record<string, number>)}
          />

          {/* Popular Tags */}
          {facets?.tags && facets.tags.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">Popular Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {facets.tags.slice(0, 20).map(tag => (
                    <Button
                      key={tag.name}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const newTags = filters.tags?.includes(tag.name)
                          ? filters.tags.filter(t => t !== tag.name)
                          : [...(filters.tags || []), tag.name]
                        handleFilterChange({ tags: newTags })
                      }}
                    >
                      {tag.name} ({tag.count})
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Collections */}
          {collections && collections.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">My Collections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {collections.slice(0, 5).map(collection => (
                    <Button
                      key={collection.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8"
                      onClick={() => router.push(`/collections/${collection.id}`)}
                    >
                      <Bookmark className="w-4 h-4 mr-2" />
                      {collection.name}
                      <span className="ml-auto text-xs text-gray-500">
                        {collection.templateCount}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-600">
                {pagination?.total ? (
                  <>
                    Showing {templates.length} of {pagination.total} templates
                    {searchQuery && ` for "${searchQuery}"`}
                    {selectedCategory && ` in ${TEMPLATE_CATEGORIES[selectedCategory]?.name}`}
                  </>
                ) : (
                  'No templates found'
                )}
              </p>
              {analytics?.searchTime && (
                <p className="text-xs text-gray-500">
                  Search completed in {analytics.searchTime}ms
                </p>
              )}
            </div>
            
            {analytics?.recommendedTemplates && analytics.recommendedTemplates.length > 0 && (
              <Button variant="outline" size="sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Recommended for you
              </Button>
            )}
          </div>

          {/* Template Grid/List */}
          {templates.length > 0 ? (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  viewMode={viewMode}
                  onTemplateClick={handleTemplateClick}
                  onInstantiate={handleInstantiateTemplate}
                  onStar={handleStarTemplate}
                  onShare={handleShareTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or filters
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory(null)
                  setFilters({})
                  updateURL({})
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}

          {/* Load More */}
          {hasNextPage && (
            <div className="text-center mt-8">
              <Button
                onClick={loadMore}
                disabled={loading}
                variant="outline"
              >
                {loading ? 'Loading...' : 'Load More Templates'}
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Dialogs */}
      <AdvancedSearchDialog
        open={showAdvancedSearch}
        onOpenChange={setShowAdvancedSearch}
        filters={filters}
        onFiltersChange={handleFilterChange}
        categories={Object.values(TEMPLATE_CATEGORIES)}
        facets={facets}
      />

      <TemplatePreviewDialog
        template={selectedTemplate}
        open={!!selectedTemplate}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
        onInstantiate={handleInstantiateTemplate}
        onStar={handleStarTemplate}
        onShare={handleShareTemplate}
      />

      <CreateCollectionDialog
        open={showCreateCollection}
        onOpenChange={setShowCreateCollection}
        onCollectionCreated={() => {
          setShowCreateCollection(false)
          // Refresh collections
        }}
      />
    </div>
  )
}

/**
 * Loading skeleton for the templates page
 */
function TemplatePageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        {/* Search bar skeleton */}
        <div className="flex gap-4 mb-6">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex gap-8">
        {/* Sidebar skeleton */}
        <div className="w-64 shrink-0 hidden lg:block">
          <Skeleton className="h-64 w-full" />
        </div>

        {/* Main content skeleton */}
        <div className="flex-1">
          <Skeleton className="h-6 w-48 mb-6" />
          
          {/* Template grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i} className="p-0">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}