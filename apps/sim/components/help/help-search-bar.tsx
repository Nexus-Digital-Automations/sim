/**
 * Help Search Bar Component - Intelligent help search with suggestions
 *
 * Advanced search component featuring:
 * - Real-time search with debouncing and auto-complete
 * - Intelligent suggestions based on context and user behavior
 * - Recent searches and popular queries
 * - Fuzzy search with typo tolerance
 * - Category and filter integration
 * - Keyboard shortcuts and accessibility support
 * - Search analytics and performance tracking
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

'use client'

import type * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRightIcon,
  ClockIcon,
  CommandIcon,
  FileTextIcon,
  FilterIcon,
  HashIcon,
  SearchIcon,
  TrendingUpIcon,
  XIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { helpAnalytics } from '@/lib/help/help-analytics'
import type { ContentSearchResult } from '@/lib/help/help-content-manager'
import { helpContentManager } from '@/lib/help/help-content-manager'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface HelpSearchBarProps {
  placeholder?: string
  className?: string
  inputClassName?: string

  // Search behavior
  debounceMs?: number
  minQueryLength?: number
  maxSuggestions?: number
  enableAutoComplete?: boolean
  enableFuzzySearch?: boolean

  // Suggestions
  showRecentSearches?: boolean
  showPopularQueries?: boolean
  showContextualSuggestions?: boolean
  showCategorySuggestions?: boolean

  // Keyboard shortcuts
  enableShortcuts?: boolean
  shortcutKey?: string

  // Filtering
  availableFilters?: SearchFilter[]
  selectedFilters?: string[]

  // Events
  onSearch?: (query: string, filters?: string[]) => void
  onSelect?: (result: SearchResult) => void
  onFilterChange?: (filters: string[]) => void
  onFocus?: () => void
  onBlur?: () => void

  // Customization
  disabled?: boolean
  loading?: boolean
  error?: string
}

export interface SearchFilter {
  id: string
  label: string
  icon?: React.ReactNode
  description?: string
}

export interface SearchResult {
  id: string
  title: string
  description?: string
  type: 'content' | 'suggestion' | 'recent' | 'popular' | 'category'
  category?: string
  url?: string
  metadata?: Record<string, any>
}

export interface SearchSuggestion {
  id: string
  text: string
  type: 'recent' | 'popular' | 'contextual' | 'category'
  count?: number
  category?: string
  metadata?: Record<string, any>
}

// ========================
// SEARCH UTILITIES
// ========================

class SearchEngine {
  private static instance: SearchEngine
  private searchCache = new Map<string, ContentSearchResult>()
  private suggestionCache = new Map<string, SearchSuggestion[]>()
  private recentSearches: string[] = []
  private popularQueries = new Map<string, number>()

  static getInstance(): SearchEngine {
    if (!SearchEngine.instance) {
      SearchEngine.instance = new SearchEngine()
    }
    return SearchEngine.instance
  }

  addRecentSearch(query: string): void {
    this.recentSearches = [query, ...this.recentSearches.filter((q) => q !== query)].slice(0, 10)
    this.incrementPopularity(query)
  }

  getRecentSearches(): SearchSuggestion[] {
    return this.recentSearches.map((query, index) => ({
      id: `recent-${index}`,
      text: query,
      type: 'recent',
    }))
  }

  getPopularQueries(limit = 5): SearchSuggestion[] {
    return Array.from(this.popularQueries.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([query, count], index) => ({
        id: `popular-${index}`,
        text: query,
        type: 'popular',
        count,
      }))
  }

  async getSuggestions(query: string, context?: any): Promise<SearchSuggestion[]> {
    const cacheKey = `${query}-${JSON.stringify(context || {})}`

    if (this.suggestionCache.has(cacheKey)) {
      return this.suggestionCache.get(cacheKey)!
    }

    const suggestions: SearchSuggestion[] = []

    // Add fuzzy matches from popular queries
    if (query.length >= 2) {
      const fuzzyMatches = this.getFuzzyMatches(query)
      suggestions.push(...fuzzyMatches)
    }

    // Add contextual suggestions
    if (context) {
      const contextualSuggestions = this.getContextualSuggestions(query, context)
      suggestions.push(...contextualSuggestions)
    }

    // Cache for 5 minutes
    this.suggestionCache.set(cacheKey, suggestions)
    setTimeout(() => this.suggestionCache.delete(cacheKey), 5 * 60 * 1000)

    return suggestions
  }

  private incrementPopularity(query: string): void {
    this.popularQueries.set(query, (this.popularQueries.get(query) || 0) + 1)
  }

  private getFuzzyMatches(query: string): SearchSuggestion[] {
    const matches: SearchSuggestion[] = []
    const queryLower = query.toLowerCase()

    for (const [popularQuery, count] of this.popularQueries.entries()) {
      const popularLower = popularQuery.toLowerCase()

      // Simple fuzzy matching - contains or similar
      if (
        popularLower.includes(queryLower) ||
        this.calculateSimilarity(queryLower, popularLower) > 0.6
      ) {
        matches.push({
          id: `fuzzy-${popularQuery}`,
          text: popularQuery,
          type: 'popular',
          count,
        })
      }
    }

    return matches.slice(0, 3)
  }

  private getContextualSuggestions(query: string, context: any): SearchSuggestion[] {
    // Generate contextual suggestions based on current component, page, etc.
    const suggestions: SearchSuggestion[] = []

    if (context.component) {
      suggestions.push({
        id: `contextual-${context.component}`,
        text: `${query} in ${context.component}`,
        type: 'contextual',
        category: context.component,
      })
    }

    return suggestions
  }

  private calculateSimilarity(a: string, b: string): number {
    // Simple Jaccard similarity
    const setA = new Set(a.split(''))
    const setB = new Set(b.split(''))
    const intersection = new Set([...setA].filter((x) => setB.has(x)))
    const union = new Set([...setA, ...setB])
    return intersection.size / union.size
  }
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Help Search Bar Component
 *
 * Intelligent search bar with auto-complete and contextual suggestions.
 */
export function HelpSearchBar({
  placeholder = 'Search help...',
  className,
  inputClassName,
  debounceMs = 300,
  minQueryLength = 2,
  maxSuggestions = 8,
  enableAutoComplete = true,
  enableFuzzySearch = true,
  showRecentSearches = true,
  showPopularQueries = true,
  showContextualSuggestions = true,
  showCategorySuggestions = true,
  enableShortcuts = true,
  shortcutKey = 'k',
  availableFilters = [],
  selectedFilters = [],
  onSearch,
  onSelect,
  onFilterChange,
  onFocus,
  onBlur,
  disabled = false,
  loading = false,
  error,
}: HelpSearchBarProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isSearching, setIsSearching] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const searchEngine = useMemo(() => SearchEngine.getInstance(), [])

  // ========================
  // SEARCH FUNCTIONALITY
  // ========================

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery || searchQuery.length < minQueryLength) {
        setResults([])
        setSuggestions([])
        return
      }

      setIsSearching(true)

      try {
        // Get content results
        const searchFilters = {
          categories: selectedFilters,
          isPublished: true,
        }

        const searchResults = await helpContentManager.searchContent(
          searchQuery,
          searchFilters,
          1,
          maxSuggestions
        )

        // Convert to SearchResult format
        const contentResults: SearchResult[] = searchResults.documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          description: doc.metadata.description,
          type: 'content',
          category: doc.metadata.category,
          metadata: { document: doc },
        }))

        // Get suggestions
        const searchSuggestions = await searchEngine.getSuggestions(searchQuery, {
          component: helpState.currentHelp?.context?.component,
          userLevel: helpState.userLevel,
        })

        setResults(contentResults)
        setSuggestions(searchSuggestions)

        // Track search
        helpAnalytics.trackSearchQuery(searchQuery, helpState.sessionId, searchResults.total)
      } catch (searchError) {
        console.error('Search error:', searchError)
        setResults([])
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    },
    [minQueryLength, selectedFilters, maxSuggestions, searchEngine, helpState, helpAnalytics]
  )

  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery)
      }, debounceMs)
    },
    [performSearch, debounceMs]
  )

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      setSelectedIndex(-1)

      if (enableAutoComplete) {
        debouncedSearch(value)
      }
    },
    [enableAutoComplete, debouncedSearch]
  )

  const handleSearch = useCallback(
    (searchQuery: string = query) => {
      if (!searchQuery.trim()) return

      searchEngine.addRecentSearch(searchQuery)
      onSearch?.(searchQuery, selectedFilters)
      setIsOpen(false)

      trackInteraction('search', searchQuery, {
        filters: selectedFilters,
        resultCount: results.length,
      })
    },
    [query, searchEngine, onSearch, selectedFilters, trackInteraction, results.length]
  )

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (result.type === 'content') {
        onSelect?.(result)
      } else {
        // For suggestions, perform search
        setQuery(result.title)
        handleSearch(result.title)
      }

      setIsOpen(false)

      trackInteraction('select', result.id, {
        type: result.type,
        category: result.category,
      })
    },
    [onSelect, handleSearch, trackInteraction]
  )

  // ========================
  // KEYBOARD SHORTCUTS
  // ========================

  useEffect(() => {
    if (!enableShortcuts) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Global search shortcut (Cmd/Ctrl + K)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === shortcutKey) {
        event.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enableShortcuts, shortcutKey])

  // ========================
  // SUGGESTION LOADING
  // ========================

  const loadInitialSuggestions = useCallback(async () => {
    const initialSuggestions: SearchSuggestion[] = []

    if (showRecentSearches) {
      initialSuggestions.push(...searchEngine.getRecentSearches())
    }

    if (showPopularQueries) {
      initialSuggestions.push(...searchEngine.getPopularQueries())
    }

    setSuggestions(initialSuggestions.slice(0, maxSuggestions))
  }, [showRecentSearches, showPopularQueries, searchEngine, maxSuggestions])

  useEffect(() => {
    if (isOpen && !query) {
      loadInitialSuggestions()
    }
  }, [isOpen, query, loadInitialSuggestions])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return <ClockIcon className='h-3 w-3' />
      case 'popular':
        return <TrendingUpIcon className='h-3 w-3' />
      case 'contextual':
        return <HashIcon className='h-3 w-3' />
      case 'category':
        return <FilterIcon className='h-3 w-3' />
      default:
        return <SearchIcon className='h-3 w-3' />
    }
  }

  const renderResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'content':
        return <FileTextIcon className='h-3 w-3' />
      default:
        return <SearchIcon className='h-3 w-3' />
    }
  }

  // ========================
  // RENDER
  // ========================

  return (
    <div className={cn('relative', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className='relative'>
            <SearchIcon className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => {
                setIsOpen(true)
                onFocus?.()
              }}
              onBlur={onBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                } else if (e.key === 'Escape') {
                  setIsOpen(false)
                  inputRef.current?.blur()
                }
              }}
              className={cn('pr-20 pl-10', error && 'border-red-500', inputClassName)}
              disabled={disabled || loading}
            />

            <div className='-translate-y-1/2 absolute top-1/2 right-2 flex transform items-center gap-1'>
              {loading && (
                <div className='h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent' />
              )}

              {query && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setQuery('')
                    setResults([])
                    setSuggestions([])
                  }}
                  className='h-6 w-6 p-0'
                >
                  <XIcon className='h-3 w-3' />
                </Button>
              )}

              {enableShortcuts && (
                <Badge variant='secondary' className='h-5 px-1 text-xs'>
                  <CommandIcon className='mr-1 h-2 w-2' />
                  {shortcutKey.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent
          className='w-full p-0'
          align='start'
          style={{ width: 'var(--radix-popover-trigger-width)' }}
        >
          <Command>
            <CommandList>
              {/* Search Results */}
              {results.length > 0 && (
                <CommandGroup heading='Search Results'>
                  {results.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className='flex cursor-pointer items-center gap-2'
                    >
                      {renderResultIcon(result.type)}
                      <div className='flex-1'>
                        <div className='font-medium'>{result.title}</div>
                        {result.description && (
                          <div className='line-clamp-1 text-muted-foreground text-xs'>
                            {result.description}
                          </div>
                        )}
                      </div>
                      {result.category && (
                        <Badge variant='outline' size='sm'>
                          {result.category}
                        </Badge>
                      )}
                      <ArrowUpRightIcon className='h-3 w-3 text-muted-foreground' />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <>
                  {results.length > 0 && <Separator />}
                  <CommandGroup heading='Suggestions'>
                    {suggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.id}
                        onSelect={() =>
                          handleSelect({
                            id: suggestion.id,
                            title: suggestion.text,
                            type: 'suggestion',
                            category: suggestion.category,
                          })
                        }
                        className='flex cursor-pointer items-center gap-2'
                      >
                        {renderSuggestionIcon(suggestion.type)}
                        <span className='flex-1'>{suggestion.text}</span>
                        {suggestion.count && (
                          <Badge variant='secondary' size='sm'>
                            {suggestion.count}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Empty State */}
              {!isSearching && query && results.length === 0 && suggestions.length === 0 && (
                <CommandEmpty>
                  <div className='py-4 text-center'>
                    <SearchIcon className='mx-auto mb-2 h-8 w-8 text-muted-foreground' />
                    <p className='text-muted-foreground text-sm'>No results found for "{query}"</p>
                    <p className='mt-1 text-muted-foreground text-xs'>
                      Try different keywords or check your spelling
                    </p>
                  </div>
                </CommandEmpty>
              )}

              {/* Loading State */}
              {isSearching && (
                <div className='py-4 text-center'>
                  <div className='mx-auto mb-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  <p className='text-muted-foreground text-sm'>Searching...</p>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Error Display */}
      {error && (
        <div className='absolute top-full right-0 left-0 mt-1 rounded border border-red-200 bg-red-50 p-2 text-red-700 text-sm'>
          {error}
        </div>
      )}
    </div>
  )
}

// ========================
// EXPORTS
// ========================

export default HelpSearchBar
export type { HelpSearchBarProps, SearchResult, SearchSuggestion, SearchFilter }
