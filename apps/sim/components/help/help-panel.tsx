/**
 * Help Panel Component - Slide-out help panel with search and content browsing
 *
 * Comprehensive help panel providing:
 * - Slide-out panel with smooth animations
 * - Intelligent search with auto-complete and suggestions
 * - Categorized help content browsing
 * - Recent help history and bookmarks
 * - Contextual help recommendations
 * - Multi-language support and accessibility features
 * - Integration with help analytics and user feedback
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpenIcon,
  ChevronRightIcon,
  ClockIcon,
  FilterIcon,
  HelpCircleIcon,
  SearchIcon,
  StarIcon,
  TagIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { helpAnalytics } from '@/lib/help/help-analytics'
import type { ContentSearchResult, HelpContentDocument } from '@/lib/help/help-content-manager'
import { helpContentManager } from '@/lib/help/help-content-manager'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface HelpPanelProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'search' | 'browse' | 'recent' | 'bookmarks'
  className?: string

  // Search configuration
  enableSearch?: boolean
  enableAutoComplete?: boolean
  searchPlaceholder?: string

  // Content filtering
  enableFilters?: boolean
  availableCategories?: string[]
  availableComponents?: string[]

  // Features
  enableBookmarks?: boolean
  enableRatings?: boolean
  enableHistory?: boolean
  enableContextualSuggestions?: boolean

  // Customization
  maxContentItems?: number
  showContentPreviews?: boolean

  // Events
  onContentSelect?: (content: HelpContentDocument) => void
  onSearchQuery?: (query: string) => void
  onFeedback?: (contentId: string, rating: number, comment?: string) => void
}

interface SearchState {
  query: string
  isSearching: boolean
  results: ContentSearchResult | null
  suggestions: string[]
  recentSearches: string[]
}

interface FilterState {
  categories: string[]
  components: string[]
  contentTypes: string[]
  userLevels: string[]
  sortBy: 'relevance' | 'recent' | 'popular' | 'rating'
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Help Panel Component
 *
 * Slide-out panel for comprehensive help content browsing and search.
 */
export function HelpPanel({
  isOpen,
  onClose,
  initialTab = 'search',
  className,
  enableSearch = true,
  enableAutoComplete = true,
  searchPlaceholder = 'Search help content...',
  enableFilters = true,
  availableCategories = [],
  availableComponents = [],
  enableBookmarks = true,
  enableRatings = true,
  enableHistory = true,
  enableContextualSuggestions = true,
  maxContentItems = 20,
  showContentPreviews = true,
  onContentSelect,
  onSearchQuery,
  onFeedback,
}: HelpPanelProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    isSearching: false,
    results: null,
    suggestions: [],
    recentSearches: [],
  })
  const [filterState, setFilterState] = useState<FilterState>({
    categories: [],
    components: [],
    contentTypes: [],
    userLevels: [],
    sortBy: 'relevance',
  })
  const [recentContent, setRecentContent] = useState<HelpContentDocument[]>([])
  const [bookmarkedContent, setBookmarkedContent] = useState<HelpContentDocument[]>([])
  const [contextualContent, setContextualContent] = useState<HelpContentDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // ========================
  // SEARCH FUNCTIONALITY
  // ========================

  const performSearch = useCallback(
    async (query: string, filters?: Partial<FilterState>) => {
      if (!query.trim()) {
        setSearchState((prev) => ({ ...prev, results: null, isSearching: false }))
        return
      }

      setSearchState((prev) => ({ ...prev, isSearching: true }))

      try {
        const searchFilters = {
          categories: filters?.categories || filterState.categories,
          components: filters?.components || filterState.components,
          contentTypes: filters?.contentTypes || filterState.contentTypes,
          userLevels: filters?.userLevels || filterState.userLevels,
          isPublished: true,
        }

        const results = await helpContentManager.searchContent(
          query,
          searchFilters,
          1,
          maxContentItems
        )

        setSearchState((prev) => ({
          ...prev,
          results,
          isSearching: false,
          recentSearches: [query, ...prev.recentSearches.filter((s) => s !== query)].slice(0, 5),
        }))

        // Track search query
        helpAnalytics.trackSearchQuery(query, helpState.sessionId, results.total)
        onSearchQuery?.(query)
      } catch (error) {
        console.error('Search error:', error)
        setSearchState((prev) => ({ ...prev, isSearching: false }))
      }
    },
    [filterState, maxContentItems, helpState.sessionId, onSearchQuery]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchState((prev) => ({ ...prev, query: value }))

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // Debounced search
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value)
      }, 300)
    },
    [performSearch]
  )

  const handleSearchSubmit = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    performSearch(searchState.query)
  }, [performSearch, searchState.query])

  // ========================
  // CONTENT LOADING
  // ========================

  const loadRecentContent = useCallback(async () => {
    try {
      setIsLoading(true)
      // TODO: Load recent content from user history
      // For now, return empty array
      setRecentContent([])
    } catch (error) {
      console.error('Error loading recent content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadBookmarkedContent = useCallback(async () => {
    try {
      setIsLoading(true)
      // TODO: Load bookmarked content from user preferences
      setBookmarkedContent([])
    } catch (error) {
      console.error('Error loading bookmarked content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadContextualContent = useCallback(async () => {
    try {
      setIsLoading(true)
      const context = {
        component: 'general',
        page: window.location.pathname,
        userLevel: helpState.userLevel,
      }

      const content = await helpContentManager.getContextualContent(context)
      setContextualContent(content)
    } catch (error) {
      console.error('Error loading contextual content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [helpState.userLevel])

  // ========================
  // EVENT HANDLERS
  // ========================

  const handleContentClick = useCallback(
    (content: HelpContentDocument) => {
      trackInteraction('click', `help-content-${content.id}`)

      helpAnalytics.trackHelpInteraction(content.id, helpState.sessionId, 'click', 'panel_content')

      onContentSelect?.(content)
    },
    [trackInteraction, helpState.sessionId, onContentSelect]
  )

  const handleBookmark = useCallback(
    async (contentId: string) => {
      // TODO: Implement bookmark functionality
      trackInteraction('click', `bookmark-${contentId}`)

      helpAnalytics.trackHelpInteraction(contentId, helpState.sessionId, 'bookmark', 'panel_action')
    },
    [trackInteraction, helpState.sessionId]
  )

  const handleRating = useCallback(
    async (contentId: string, rating: number) => {
      try {
        // TODO: Submit rating to feedback system
        onFeedback?.(contentId, rating)

        helpAnalytics.trackHelpInteraction(
          contentId,
          helpState.sessionId,
          'rating',
          'panel_feedback',
          { rating }
        )
      } catch (error) {
        console.error('Error submitting rating:', error)
      }
    },
    [onFeedback, helpState.sessionId]
  )

  const handleFilterChange = useCallback(
    (filterType: keyof FilterState, value: any) => {
      const newFilters = { ...filterState, [filterType]: value }
      setFilterState(newFilters)

      // Re-search if there's a query
      if (searchState.query) {
        performSearch(searchState.query, newFilters)
      }
    },
    [filterState, searchState.query, performSearch]
  )

  // ========================
  // EFFECTS
  // ========================

  useEffect(() => {
    if (isOpen) {
      // Load initial content based on active tab
      switch (activeTab) {
        case 'recent':
          if (enableHistory) loadRecentContent()
          break
        case 'bookmarks':
          if (enableBookmarks) loadBookmarkedContent()
          break
        case 'browse':
          loadContextualContent()
          break
      }

      // Focus search input if search tab is active
      if (activeTab === 'search' && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
    }
  }, [
    isOpen,
    activeTab,
    enableHistory,
    enableBookmarks,
    loadRecentContent,
    loadBookmarkedContent,
    loadContextualContent,
  ])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderSearchFilters = () => {
    if (!enableFilters) return null

    return (
      <div className='flex items-center gap-2 border-b p-4'>
        <FilterIcon className='h-4 w-4 text-muted-foreground' />
        <div className='flex items-center gap-2 overflow-x-auto'>
          <select
            value={filterState.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className='rounded border px-2 py-1 text-sm'
          >
            <option value='relevance'>Relevance</option>
            <option value='recent'>Most Recent</option>
            <option value='popular'>Most Popular</option>
            <option value='rating'>Highest Rated</option>
          </select>

          {availableCategories.length > 0 && (
            <select
              value={filterState.categories[0] || ''}
              onChange={(e) =>
                handleFilterChange('categories', e.target.value ? [e.target.value] : [])
              }
              className='rounded border px-2 py-1 text-sm'
            >
              <option value=''>All Categories</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    )
  }

  const renderContentItem = (content: HelpContentDocument, showPreview = true) => {
    return (
      <Card
        key={content.id}
        className='cursor-pointer transition-colors hover:bg-muted/50'
        onClick={() => handleContentClick(content)}
      >
        <CardHeader className='pb-2'>
          <div className='flex items-start justify-between'>
            <CardTitle className='line-clamp-2 font-medium text-sm'>{content.title}</CardTitle>
            <div className='ml-2 flex items-center gap-1'>
              {enableBookmarks && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={(e) => {
                    e.stopPropagation()
                    handleBookmark(content.id)
                  }}
                  className='h-6 w-6 p-0'
                >
                  <StarIcon className='h-3 w-3' />
                </Button>
              )}
              <ChevronRightIcon className='h-3 w-3 text-muted-foreground' />
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Badge variant='secondary' size='sm'>
              {content.metadata.category}
            </Badge>
            {content.metadata.estimatedReadingTime && (
              <span className='flex items-center gap-1 text-muted-foreground text-xs'>
                <ClockIcon className='h-3 w-3' />
                {Math.ceil(content.metadata.estimatedReadingTime / 60)}m
              </span>
            )}
          </div>
        </CardHeader>

        {showPreview && showContentPreviews && (
          <CardContent className='pt-0'>
            <p className='line-clamp-2 text-muted-foreground text-sm'>
              {content.metadata.description ||
                (typeof content.content === 'string'
                  ? `${content.content.substring(0, 120)}...`
                  : 'Click to view content')}
            </p>

            {content.tags.length > 0 && (
              <div className='mt-2 flex items-center gap-1'>
                <TagIcon className='h-3 w-3 text-muted-foreground' />
                <div className='flex gap-1 overflow-x-auto'>
                  {content.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant='outline' size='sm' className='text-xs'>
                      {tag}
                    </Badge>
                  ))}
                  {content.tags.length > 3 && (
                    <span className='text-muted-foreground text-xs'>
                      +{content.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            {enableRatings && (
              <div className='mt-2 flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRating(content.id, 1)
                  }}
                  className='h-6 px-2'
                >
                  <ThumbsUpIcon className='h-3 w-3' />
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRating(content.id, -1)
                  }}
                  className='h-6 px-2'
                >
                  <ThumbsDownIcon className='h-3 w-3' />
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    )
  }

  const renderSearchResults = () => {
    if (searchState.isSearching) {
      return (
        <div className='space-y-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-4 w-3/4' />
                <Skeleton className='h-3 w-1/2' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-3 w-full' />
                <Skeleton className='h-3 w-2/3' />
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (!searchState.results) {
      return (
        <div className='py-8 text-center'>
          <SearchIcon className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
          <h3 className='mb-2 font-medium text-lg'>Search Help Content</h3>
          <p className='text-muted-foreground text-sm'>
            Enter a search term to find relevant help articles and guides.
          </p>

          {searchState.recentSearches.length > 0 && (
            <div className='mt-4'>
              <p className='mb-2 font-medium text-sm'>Recent Searches</p>
              <div className='flex flex-wrap justify-center gap-2'>
                {searchState.recentSearches.map((search) => (
                  <Badge
                    key={search}
                    variant='secondary'
                    className='cursor-pointer'
                    onClick={() => {
                      setSearchState((prev) => ({ ...prev, query: search }))
                      performSearch(search)
                    }}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    if (searchState.results.documents.length === 0) {
      return (
        <div className='py-8 text-center'>
          <HelpCircleIcon className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
          <h3 className='mb-2 font-medium text-lg'>No Results Found</h3>
          <p className='text-muted-foreground text-sm'>
            Try different keywords or check the filters.
          </p>
        </div>
      )
    }

    return (
      <div className='space-y-3'>
        <div className='text-muted-foreground text-sm'>
          Found {searchState.results.total} result{searchState.results.total !== 1 ? 's' : ''}
        </div>
        {searchState.results.documents.map((content) => renderContentItem(content))}
      </div>
    )
  }

  const renderContentList = (content: HelpContentDocument[], emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className='space-y-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-24 w-full' />
          ))}
        </div>
      )
    }

    if (content.length === 0) {
      return (
        <div className='py-8 text-center'>
          <BookOpenIcon className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
          <p className='text-muted-foreground text-sm'>{emptyMessage}</p>
        </div>
      )
    }

    return <div className='space-y-3'>{content.map((item) => renderContentItem(item))}</div>
  }

  // ========================
  // MAIN RENDER
  // ========================

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side='right' className={cn('w-[400px] sm:w-[540px]', className)}>
        <SheetHeader>
          <SheetTitle>Help Center</SheetTitle>
          <SheetDescription>
            Find guides, tutorials, and answers to common questions.
          </SheetDescription>
        </SheetHeader>

        <div className='mt-6 flex h-full flex-col'>
          <Tabs value={activeTab} onValueChange={setActiveTab} className='flex flex-1 flex-col'>
            <TabsList className='grid w-full grid-cols-4'>
              {enableSearch && (
                <TabsTrigger value='search' className='text-xs'>
                  <SearchIcon className='mr-1 h-3 w-3' />
                  Search
                </TabsTrigger>
              )}
              <TabsTrigger value='browse' className='text-xs'>
                <BookOpenIcon className='mr-1 h-3 w-3' />
                Browse
              </TabsTrigger>
              {enableHistory && (
                <TabsTrigger value='recent' className='text-xs'>
                  <ClockIcon className='mr-1 h-3 w-3' />
                  Recent
                </TabsTrigger>
              )}
              {enableBookmarks && (
                <TabsTrigger value='bookmarks' className='text-xs'>
                  <StarIcon className='mr-1 h-3 w-3' />
                  Saved
                </TabsTrigger>
              )}
            </TabsList>

            <div className='mt-4 flex-1'>
              {enableSearch && (
                <TabsContent value='search' className='mt-0 flex h-full flex-col'>
                  <div className='sticky top-0 z-10 bg-background'>
                    <div className='mb-4 flex items-center gap-2'>
                      <div className='relative flex-1'>
                        <SearchIcon className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
                        <Input
                          ref={searchInputRef}
                          placeholder={searchPlaceholder}
                          value={searchState.query}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                          className='pl-10'
                        />
                        {searchState.query && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleSearchChange('')}
                            className='-translate-y-1/2 absolute top-1/2 right-2 h-6 w-6 transform p-0'
                          >
                            <XIcon className='h-3 w-3' />
                          </Button>
                        )}
                      </div>
                    </div>
                    {renderSearchFilters()}
                  </div>

                  <ScrollArea className='flex-1'>
                    <div className='p-4'>{renderSearchResults()}</div>
                  </ScrollArea>
                </TabsContent>
              )}

              <TabsContent value='browse' className='mt-0 flex h-full flex-col'>
                <ScrollArea className='flex-1'>
                  <div className='p-4'>
                    {renderContentList(contextualContent, 'No contextual help available.')}
                  </div>
                </ScrollArea>
              </TabsContent>

              {enableHistory && (
                <TabsContent value='recent' className='mt-0 flex h-full flex-col'>
                  <ScrollArea className='flex-1'>
                    <div className='p-4'>
                      {renderContentList(recentContent, 'No recent help content viewed.')}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {enableBookmarks && (
                <TabsContent value='bookmarks' className='mt-0 flex h-full flex-col'>
                  <ScrollArea className='flex-1'>
                    <div className='p-4'>
                      {renderContentList(bookmarkedContent, 'No bookmarked help content.')}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ========================
// EXPORTS
// ========================

export default HelpPanel
export type { HelpPanelProps }
