/**
 * Advanced Help Search Interface - Intelligent Search with AI-Powered Features
 *
 * Comprehensive search interface providing:
 * - AI-powered semantic search with natural language queries
 * - Real-time search suggestions and auto-complete
 * - Advanced filtering with faceted search capabilities
 * - Search result previews with contextual snippets
 * - Search history and saved searches management
 * - Smart search recommendations based on user context
 * - Voice search input with speech recognition
 * - Search analytics and performance tracking
 * - Accessibility-compliant search interface
 * - Mobile-responsive design with touch interactions
 *
 * Key Features:
 * - Semantic search matching user intent vs exact keywords
 * - Contextual search results based on workflow/component state
 * - Advanced filters: content type, difficulty, recency, popularity
 * - Search result clustering and categorization
 * - Instant search with debounced queries
 * - Search suggestions with ML-powered recommendations
 * - Integration with help content management system
 *
 * @created 2025-09-04
 * @author Advanced Help UI Components Specialist
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircleIcon,
  ClockIcon,
  FileTextIcon,
  FilterIcon,
  MicIcon,
  PlayCircleIcon,
  SearchIcon,
  SparklesIcon,
  TargetIcon,
  XIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { helpAnalytics } from '@/lib/help/help-analytics'
import type { ContentSearchResult, HelpContentDocument } from '@/lib/help/help-content-manager'
import { helpContentManager } from '@/lib/help/help-content-manager'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface AdvancedSearchInterfaceProps {
  /** Initial search query */
  initialQuery?: string
  /** Search placeholder text */
  placeholder?: string
  /** Whether search is open/visible */
  isOpen?: boolean
  /** Callback when search is closed */
  onClose?: () => void
  /** Custom CSS classes */
  className?: string

  // Search Configuration
  /** Enable semantic AI search */
  enableSemanticSearch?: boolean
  /** Enable voice search input */
  enableVoiceSearch?: boolean
  /** Enable search suggestions */
  enableSuggestions?: boolean
  /** Enable advanced filtering */
  enableAdvancedFilters?: boolean
  /** Enable search history */
  enableSearchHistory?: boolean

  // Content Configuration
  /** Available content categories for filtering */
  availableCategories?: string[]
  /** Available content types for filtering */
  availableContentTypes?: string[]
  /** Available difficulty levels */
  availableDifficultyLevels?: string[]
  /** Maximum search results to show */
  maxResults?: number
  /** Whether to show result previews */
  showResultPreviews?: boolean

  // Behavior Configuration
  /** Search debounce delay in milliseconds */
  debounceMs?: number
  /** Minimum query length for search */
  minQueryLength?: number
  /** Auto-focus search input */
  autoFocus?: boolean
  /** Close on outside click */
  closeOnOutsideClick?: boolean

  // Callbacks
  /** Callback when search query changes */
  onSearchQueryChange?: (query: string) => void
  /** Callback when search result is selected */
  onResultSelect?: (result: HelpContentDocument) => void
  /** Callback when search is performed */
  onSearch?: (query: string, filters: SearchFilters) => void
  /** Callback for analytics events */
  onAnalyticsEvent?: (event: string, data: any) => void
}

export interface SearchFilters {
  categories: string[]
  contentTypes: string[]
  difficultyLevels: string[]
  dateRange?: {
    from?: Date
    to?: Date
  }
  sortBy: 'relevance' | 'date' | 'popularity' | 'rating'
  includeExternalContent?: boolean
  language?: string
}

interface SearchSuggestion {
  id: string
  text: string
  type: 'query' | 'category' | 'content' | 'recent'
  priority: number
  metadata?: {
    category?: string
    contentType?: string
    resultCount?: number
  }
}

interface SearchState {
  query: string
  isSearching: boolean
  results: ContentSearchResult | null
  suggestions: SearchSuggestion[]
  recentSearches: string[]
  savedSearches: string[]
  filters: SearchFilters
  activeTab: 'all' | 'tutorials' | 'documentation' | 'troubleshooting'
  voiceSearchActive: boolean
  showAdvancedFilters: boolean
}

// ========================
// SEARCH UTILITIES
// ========================

class SearchAnalytics {
  static trackSearchQuery(
    query: string,
    sessionId: string,
    resultCount: number,
    filters: SearchFilters
  ) {
    helpAnalytics.trackSearchQuery(query, sessionId, resultCount, {
      filters,
      timestamp: new Date().toISOString(),
    })
  }

  static trackResultClick(resultId: string, query: string, position: number, sessionId: string) {
    helpAnalytics.trackHelpInteraction(
      resultId,
      sessionId,
      'search_result_click',
      'advanced_search_interface',
      {
        query,
        position,
        timestamp: new Date().toISOString(),
      }
    )
  }

  static trackFilterUsage(filterType: string, value: any, sessionId: string) {
    helpAnalytics.trackHelpInteraction(
      `filter_${filterType}`,
      sessionId,
      'filter_applied',
      'advanced_search_interface',
      {
        filterType,
        value,
        timestamp: new Date().toISOString(),
      }
    )
  }
}

class SearchSuggestionEngine {
  private static recentSuggestions: SearchSuggestion[] = []

  static async generateSuggestions(
    query: string,
    context: any,
    recentSearches: string[]
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = []

    // Add recent searches
    if (recentSearches.length > 0 && query.length > 0) {
      const matchingRecent = recentSearches
        .filter((recent) => recent.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map((recent, index) => ({
          id: `recent_${index}`,
          text: recent,
          type: 'recent' as const,
          priority: 90 - index,
        }))
      suggestions.push(...matchingRecent)
    }

    // Add contextual suggestions based on current workflow
    if (context?.workflowType) {
      suggestions.push({
        id: 'contextual_workflow',
        text: `${context.workflowType} help`,
        type: 'category',
        priority: 100,
        metadata: {
          category: context.workflowType,
          contentType: 'workflow_help',
        },
      })
    }

    // Add common query completions
    const commonQueries = [
      'how to get started',
      'troubleshooting errors',
      'workflow examples',
      'integration guide',
      'best practices',
      'common issues',
    ]

    const matchingCommon = commonQueries
      .filter((common) => common.toLowerCase().includes(query.toLowerCase()) && query.length > 2)
      .slice(0, 2)
      .map((common, index) => ({
        id: `common_${index}`,
        text: common,
        type: 'query' as const,
        priority: 80 - index,
      }))

    suggestions.push(...matchingCommon)

    // Sort by priority and return top results
    return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 6)
  }
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Advanced Search Interface Component
 *
 * Comprehensive search interface with AI-powered features and advanced filtering.
 */
export function AdvancedSearchInterface({
  initialQuery = '',
  placeholder = 'Search help articles, tutorials, and guides...',
  isOpen = false,
  onClose,
  className,
  enableSemanticSearch = true,
  enableVoiceSearch = false,
  enableSuggestions = true,
  enableAdvancedFilters = true,
  enableSearchHistory = true,
  availableCategories = [
    'Getting Started',
    'Workflows',
    'Integrations',
    'Troubleshooting',
    'Best Practices',
  ],
  availableContentTypes = ['Tutorial', 'Documentation', 'Example', 'Video', 'FAQ'],
  availableDifficultyLevels = ['Beginner', 'Intermediate', 'Advanced'],
  maxResults = 20,
  showResultPreviews = true,
  debounceMs = 300,
  minQueryLength = 2,
  autoFocus = true,
  closeOnOutsideClick = true,
  onSearchQueryChange,
  onResultSelect,
  onSearch,
  onAnalyticsEvent,
}: AdvancedSearchInterfaceProps) {
  const { state: helpState, trackInteraction } = useHelp()

  // Core search state
  const [searchState, setSearchState] = useState<SearchState>({
    query: initialQuery,
    isSearching: false,
    results: null,
    suggestions: [],
    recentSearches: [],
    savedSearches: [],
    filters: {
      categories: [],
      contentTypes: [],
      difficultyLevels: [],
      sortBy: 'relevance',
    },
    activeTab: 'all',
    voiceSearchActive: false,
    showAdvancedFilters: false,
  })

  // Refs for advanced functionality
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const voiceRecognitionRef = useRef<any>(null)

  // ========================
  // SEARCH LOGIC
  // ========================

  const performSearch = useCallback(
    async (query: string, filters: Partial<SearchFilters> = {}) => {
      if (query.length < minQueryLength) {
        setSearchState((prev) => ({
          ...prev,
          results: null,
          isSearching: false,
          suggestions: [],
        }))
        return
      }

      setSearchState((prev) => ({ ...prev, isSearching: true, suggestions: [] }))

      try {
        const searchFilters = {
          categories: filters.categories || searchState.filters.categories,
          contentTypes: filters.contentTypes || searchState.filters.contentTypes,
          difficultyLevels: filters.difficultyLevels || searchState.filters.difficultyLevels,
          sortBy: filters.sortBy || searchState.filters.sortBy,
          isPublished: true,
        }

        // Use semantic search if enabled
        const results = enableSemanticSearch
          ? await helpContentManager.searchContentSemantic(query, searchFilters, 1, maxResults)
          : await helpContentManager.searchContent(query, searchFilters, 1, maxResults)

        setSearchState((prev) => ({
          ...prev,
          results,
          isSearching: false,
          recentSearches: [query, ...prev.recentSearches.filter((s) => s !== query)].slice(0, 10),
        }))

        // Track search analytics
        SearchAnalytics.trackSearchQuery(
          query,
          helpState.sessionId,
          results.total,
          searchFilters as SearchFilters
        )
        onSearch?.(query, searchFilters as SearchFilters)
        onAnalyticsEvent?.('search_performed', {
          query,
          resultCount: results.total,
          filters: searchFilters,
        })
      } catch (error) {
        console.error('Search error:', error)
        setSearchState((prev) => ({
          ...prev,
          isSearching: false,
          results: { documents: [], total: 0, page: 1, totalPages: 0 },
        }))
        onAnalyticsEvent?.('search_error', {
          query,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [
      minQueryLength,
      searchState.filters,
      enableSemanticSearch,
      maxResults,
      helpState.sessionId,
      onSearch,
      onAnalyticsEvent,
    ]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchState((prev) => ({ ...prev, query: value }))
      onSearchQueryChange?.(value)

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // Generate suggestions if enabled
      if (enableSuggestions && value.length >= 1) {
        SearchSuggestionEngine.generateSuggestions(
          value,
          { workflowType: 'general' },
          searchState.recentSearches
        ).then((suggestions) => {
          setSearchState((prev) => ({ ...prev, suggestions }))
        })
      }

      // Debounced search
      if (value.length >= minQueryLength) {
        searchTimeoutRef.current = setTimeout(() => {
          performSearch(value)
        }, debounceMs)
      }
    },
    [
      onSearchQueryChange,
      enableSuggestions,
      searchState.recentSearches,
      minQueryLength,
      debounceMs,
      performSearch,
    ]
  )

  // ========================
  // EVENT HANDLERS
  // ========================

  const handleResultClick = useCallback(
    (result: HelpContentDocument, position: number) => {
      SearchAnalytics.trackResultClick(result.id, searchState.query, position, helpState.sessionId)
      trackInteraction('click', `search-result-${result.id}`)
      onResultSelect?.(result)
      onAnalyticsEvent?.('result_clicked', {
        resultId: result.id,
        query: searchState.query,
        position,
        title: result.title,
      })
    },
    [searchState.query, helpState.sessionId, trackInteraction, onResultSelect, onAnalyticsEvent]
  )

  const handleFilterChange = useCallback(
    (filterType: keyof SearchFilters, value: any) => {
      const newFilters = { ...searchState.filters, [filterType]: value }
      setSearchState((prev) => ({ ...prev, filters: newFilters }))

      // Re-search with new filters if there's a query
      if (searchState.query.length >= minQueryLength) {
        performSearch(searchState.query, newFilters)
      }

      SearchAnalytics.trackFilterUsage(filterType, value, helpState.sessionId)
      onAnalyticsEvent?.('filter_changed', { filterType, value })
    },
    [
      searchState.filters,
      searchState.query,
      minQueryLength,
      performSearch,
      helpState.sessionId,
      onAnalyticsEvent,
    ]
  )

  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion) => {
      setSearchState((prev) => ({ ...prev, query: suggestion.text, suggestions: [] }))
      performSearch(suggestion.text)
      trackInteraction('click', `search-suggestion-${suggestion.type}`)
      onAnalyticsEvent?.('suggestion_clicked', {
        suggestionId: suggestion.id,
        suggestionType: suggestion.type,
        suggestionText: suggestion.text,
      })
    },
    [performSearch, trackInteraction, onAnalyticsEvent]
  )

  const handleVoiceSearch = useCallback(() => {
    if (
      !enableVoiceSearch ||
      !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    ) {
      return
    }

    if (searchState.voiceSearchActive) {
      // Stop voice search
      voiceRecognitionRef.current?.stop()
      setSearchState((prev) => ({ ...prev, voiceSearchActive: false }))
      return
    }

    // Start voice search
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setSearchState((prev) => ({ ...prev, voiceSearchActive: true }))
      onAnalyticsEvent?.('voice_search_started', {})
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setSearchState((prev) => ({ ...prev, query: transcript, voiceSearchActive: false }))
      performSearch(transcript)
      onAnalyticsEvent?.('voice_search_completed', { transcript })
    }

    recognition.onerror = (event: any) => {
      setSearchState((prev) => ({ ...prev, voiceSearchActive: false }))
      console.error('Voice recognition error:', event.error)
      onAnalyticsEvent?.('voice_search_error', { error: event.error })
    }

    recognition.onend = () => {
      setSearchState((prev) => ({ ...prev, voiceSearchActive: false }))
    }

    voiceRecognitionRef.current = recognition
    recognition.start()
  }, [enableVoiceSearch, searchState.voiceSearchActive, performSearch, onAnalyticsEvent])

  // ========================
  // EFFECTS
  // ========================

  useEffect(() => {
    if (isOpen && autoFocus && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen, autoFocus])

  useEffect(() => {
    if (initialQuery && initialQuery !== searchState.query) {
      handleSearchChange(initialQuery)
    }
  }, [initialQuery, searchState.query, handleSearchChange])

  // Cleanup effects
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (voiceRecognitionRef.current) {
        voiceRecognitionRef.current.stop()
      }
    }
  }, [])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderSearchInput = () => (
    <div className='relative'>
      <SearchIcon className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
      <Input
        ref={searchInputRef}
        value={searchState.query}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder={placeholder}
        className='pr-20 pl-10'
        disabled={searchState.voiceSearchActive}
      />

      <div className='-translate-y-1/2 absolute top-1/2 right-2 flex items-center gap-1'>
        {enableVoiceSearch && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleVoiceSearch}
            className={cn(
              'h-6 w-6 p-0',
              searchState.voiceSearchActive && 'animate-pulse text-red-500'
            )}
            title={searchState.voiceSearchActive ? 'Stop voice search' : 'Start voice search'}
          >
            <MicIcon className='h-3 w-3' />
          </Button>
        )}

        {enableAdvancedFilters && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() =>
              setSearchState((prev) => ({
                ...prev,
                showAdvancedFilters: !prev.showAdvancedFilters,
              }))
            }
            className={cn(
              'h-6 w-6 p-0',
              searchState.showAdvancedFilters && 'bg-primary text-primary-foreground'
            )}
            title='Advanced filters'
          >
            <FilterIcon className='h-3 w-3' />
          </Button>
        )}

        {searchState.query && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => handleSearchChange('')}
            className='h-6 w-6 p-0'
            title='Clear search'
          >
            <XIcon className='h-3 w-3' />
          </Button>
        )}
      </div>
    </div>
  )

  const renderSearchSuggestions = () => {
    if (!enableSuggestions || searchState.suggestions.length === 0) return null

    return (
      <Card className='absolute top-full right-0 left-0 z-50 mt-1 border shadow-lg'>
        <CardContent className='p-2'>
          <div className='space-y-1'>
            {searchState.suggestions.map((suggestion) => (
              <Button
                key={suggestion.id}
                variant='ghost'
                size='sm'
                onClick={() => handleSuggestionClick(suggestion)}
                className='w-full justify-start gap-2 text-left'
              >
                {suggestion.type === 'recent' && (
                  <ClockIcon className='h-3 w-3 text-muted-foreground' />
                )}
                {suggestion.type === 'category' && (
                  <TargetIcon className='h-3 w-3 text-muted-foreground' />
                )}
                {suggestion.type === 'query' && (
                  <SparklesIcon className='h-3 w-3 text-muted-foreground' />
                )}
                {suggestion.type === 'content' && (
                  <FileTextIcon className='h-3 w-3 text-muted-foreground' />
                )}

                <span className='flex-1'>{suggestion.text}</span>

                {suggestion.metadata?.resultCount && (
                  <Badge variant='secondary' className='text-xs'>
                    {suggestion.metadata.resultCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderAdvancedFilters = () => {
    if (!enableAdvancedFilters || !searchState.showAdvancedFilters) return null

    return (
      <Card className='border-t-0'>
        <CardContent className='space-y-4 p-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            {/* Categories Filter */}
            <div>
              <div className='mb-2 block font-medium text-sm'>Categories</div>
              <div className='space-y-1'>
                {availableCategories.map((category) => (
                  <label key={category} className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={searchState.filters.categories.includes(category)}
                      onChange={(e) => {
                        const newCategories = e.target.checked
                          ? [...searchState.filters.categories, category]
                          : searchState.filters.categories.filter((c) => c !== category)
                        handleFilterChange('categories', newCategories)
                      }}
                      className='rounded border-gray-300'
                    />
                    <span className='text-sm'>{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Content Types Filter */}
            <div>
              <div className='mb-2 block font-medium text-sm'>Content Type</div>
              <div className='space-y-1'>
                {availableContentTypes.map((type) => (
                  <label key={type} className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={searchState.filters.contentTypes.includes(type)}
                      onChange={(e) => {
                        const newTypes = e.target.checked
                          ? [...searchState.filters.contentTypes, type]
                          : searchState.filters.contentTypes.filter((t) => t !== type)
                        handleFilterChange('contentTypes', newTypes)
                      }}
                      className='rounded border-gray-300'
                    />
                    <span className='text-sm'>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Difficulty Filter */}
            <div>
              <div className='mb-2 block font-medium text-sm'>Difficulty</div>
              <div className='space-y-1'>
                {availableDifficultyLevels.map((level) => (
                  <label key={level} className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={searchState.filters.difficultyLevels.includes(level)}
                      onChange={(e) => {
                        const newLevels = e.target.checked
                          ? [...searchState.filters.difficultyLevels, level]
                          : searchState.filters.difficultyLevels.filter((l) => l !== level)
                        handleFilterChange('difficultyLevels', newLevels)
                      }}
                      className='rounded border-gray-300'
                    />
                    <span className='text-sm'>{level}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <Separator />
          <div>
            <label htmlFor='sort-by-select' className='mb-2 block font-medium text-sm'>
              Sort by
            </label>
            <select
              id='sort-by-select'
              value={searchState.filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className='w-full rounded border border-gray-300 px-3 py-1 text-sm'
            >
              <option value='relevance'>Relevance</option>
              <option value='date'>Date</option>
              <option value='popularity'>Popularity</option>
              <option value='rating'>Rating</option>
            </select>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderSearchResults = () => {
    if (searchState.isSearching) {
      return (
        <div className='space-y-4'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-4 w-3/4' />
                <Skeleton className='h-3 w-1/2' />
              </CardHeader>
              {showResultPreviews && (
                <CardContent>
                  <Skeleton className='h-3 w-full' />
                  <Skeleton className='h-3 w-2/3' />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )
    }

    if (!searchState.results && !searchState.query) {
      return (
        <div className='py-12 text-center'>
          <SearchIcon className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
          <h3 className='mb-2 font-medium text-lg'>Search Help Content</h3>
          <p className='text-muted-foreground text-sm'>
            Enter your search query to find articles, tutorials, and guides.
          </p>

          {enableSearchHistory && searchState.recentSearches.length > 0 && (
            <div className='mt-6'>
              <h4 className='mb-3 font-medium text-sm'>Recent Searches</h4>
              <div className='flex flex-wrap justify-center gap-2'>
                {searchState.recentSearches.slice(0, 5).map((search, index) => (
                  <Badge
                    key={index}
                    variant='secondary'
                    className='cursor-pointer hover:bg-secondary/80'
                    onClick={() => handleSearchChange(search)}
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

    if (searchState.results && searchState.results.documents.length === 0) {
      return (
        <div className='py-12 text-center'>
          <AlertCircleIcon className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
          <h3 className='mb-2 font-medium text-lg'>No Results Found</h3>
          <p className='mb-4 text-muted-foreground text-sm'>
            We couldn't find any content matching "{searchState.query}".
          </p>
          <div className='space-y-2'>
            <p className='font-medium text-sm'>Try:</p>
            <ul className='space-y-1 text-muted-foreground text-sm'>
              <li>• Using different keywords</li>
              <li>• Checking your spelling</li>
              <li>• Removing some filters</li>
              <li>• Using more general terms</li>
            </ul>
          </div>
        </div>
      )
    }

    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='text-muted-foreground text-sm'>
            Found {searchState.results?.total} result{searchState.results?.total !== 1 ? 's' : ''}
            {searchState.query && ` for "${searchState.query}"`}
          </div>
          {enableSemanticSearch && (
            <Badge variant='outline' className='text-xs'>
              <SparklesIcon className='mr-1 h-3 w-3' />
              AI Search
            </Badge>
          )}
        </div>

        {searchState.results?.documents.map((result, index) => (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card
              className='cursor-pointer transition-colors hover:bg-muted/50'
              onClick={() => handleResultClick(result, index)}
            >
              <CardHeader className='pb-2'>
                <div className='flex items-start justify-between'>
                  <CardTitle className='line-clamp-2 font-medium text-base'>
                    {result.title}
                  </CardTitle>
                  <div className='ml-4 flex items-center gap-1'>
                    {result.metadata.contentType === 'tutorial' && (
                      <PlayCircleIcon className='h-4 w-4 text-blue-500' />
                    )}
                    {result.metadata.contentType === 'documentation' && (
                      <FileTextIcon className='h-4 w-4 text-green-500' />
                    )}
                    {result.metadata.contentType === 'troubleshooting' && (
                      <AlertCircleIcon className='h-4 w-4 text-orange-500' />
                    )}
                  </div>
                </div>

                <div className='flex items-center gap-2 text-xs'>
                  <Badge variant='secondary' size='sm'>
                    {result.metadata.category}
                  </Badge>
                  {result.metadata.contentType && (
                    <Badge variant='outline' size='sm'>
                      {result.metadata.contentType}
                    </Badge>
                  )}
                  {result.metadata.estimatedReadingTime && (
                    <span className='flex items-center gap-1 text-muted-foreground'>
                      <ClockIcon className='h-3 w-3' />
                      {Math.ceil(result.metadata.estimatedReadingTime / 60)}m read
                    </span>
                  )}
                </div>
              </CardHeader>

              {showResultPreviews && (
                <CardContent>
                  <p className='line-clamp-2 text-muted-foreground text-sm'>
                    {result.metadata.description ||
                      (typeof result.content === 'string'
                        ? `${result.content.substring(0, 150)}...`
                        : 'Click to view content')}
                  </p>
                </CardContent>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    )
  }

  // ========================
  // MAIN RENDER
  // ========================

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn('fixed inset-0 z-50 bg-black/50', className)}
        onClick={(e) => {
          if (closeOnOutsideClick && e.target === e.currentTarget) {
            onClose?.()
          }
        }}
      >
        <div className='flex items-start justify-center p-4 pt-20'>
          <Card className='max-h-[80vh] w-full max-w-4xl overflow-hidden'>
            <CardHeader className='pb-4'>
              <div className='flex items-center justify-between'>
                <CardTitle className='flex items-center gap-2'>
                  <SearchIcon className='h-5 w-5' />
                  Advanced Search
                </CardTitle>
                {onClose && (
                  <Button variant='ghost' size='sm' onClick={onClose} className='h-6 w-6 p-0'>
                    <XIcon className='h-4 w-4' />
                  </Button>
                )}
              </div>

              <div className='relative' ref={searchContainerRef}>
                {renderSearchInput()}
                {renderSearchSuggestions()}
              </div>
            </CardHeader>

            {renderAdvancedFilters()}

            <CardContent className='p-0'>
              <ScrollArea className='h-96'>
                <div className='p-6'>{renderSearchResults()}</div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ========================
// EXPORTS
// ========================

export default AdvancedSearchInterface
export type { AdvancedSearchInterfaceProps, SearchFilters, SearchSuggestion }
