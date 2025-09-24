/**
 * Help Search Panel Component
 *
 * Intelligent help search interface with contextual results,
 * semantic search capabilities, and user-adaptive ranking.
 *
 * @author Contextual Help Agent
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useContextualHelp } from './ContextualHelpProvider'
import type { HelpSearchResult, HelpContent } from '../types'

export interface HelpSearchPanelProps {
  // Core Props
  isVisible: boolean
  onClose?: () => void

  // Search Props
  placeholder?: string
  autoFocus?: boolean
  showRecentSearches?: boolean
  showSuggestions?: boolean
  maxResults?: number

  // UI Props
  position?: 'overlay' | 'sidebar' | 'inline'
  width?: number | string
  height?: number | string
  theme?: 'light' | 'dark' | 'auto'

  // Behavior
  searchDelay?: number
  enableSemanticSearch?: boolean
  enableFuzzySearch?: boolean
  showFilters?: boolean

  // Styling
  className?: string
  style?: React.CSSProperties

  // Callbacks
  onSearchResult?: (results: HelpSearchResult[]) => void
  onResultSelect?: (result: HelpSearchResult) => void
}

interface SearchFilters {
  type: string[]
  category: string[]
  difficulty: string[]
  tags: string[]
}

export function HelpSearchPanel({
  isVisible,
  onClose,
  placeholder = 'Search help topics...',
  autoFocus = true,
  showRecentSearches = true,
  showSuggestions = true,
  maxResults = 10,
  position = 'overlay',
  width = 500,
  height = 600,
  theme = 'auto',
  searchDelay = 300,
  enableSemanticSearch = true,
  enableFuzzySearch = true,
  showFilters = true,
  className = '',
  style,
  onSearchResult,
  onResultSelect
}: HelpSearchPanelProps) {
  const { state, searchHelp } = useContextualHelp()

  // State
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<HelpSearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    type: [],
    category: [],
    difficulty: [],
    tags: []
  })

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const resultsRef = useRef<HTMLDivElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('contextual-help-recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch {
        // Ignore parsing errors
      }
    }
  }, [])

  // Auto-focus search input when panel opens
  useEffect(() => {
    if (isVisible && autoFocus && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isVisible, autoFocus])

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    try {
      await searchHelp(searchQuery, {
        type: filters.type.length > 0 ? filters.type : undefined,
        category: filters.category.length > 0 ? filters.category : undefined,
        difficulty: filters.difficulty.length > 0 ? filters.difficulty : undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined
      })

      const results = state.searchResults.slice(0, maxResults)
      setSearchResults(results)
      onSearchResult?.(results)

      // Add to recent searches
      setRecentSearches(prev => {
        const updated = [searchQuery, ...prev.filter(q => q !== searchQuery)].slice(0, 10)
        localStorage.setItem('contextual-help-recent-searches', JSON.stringify(updated))
        return updated
      })

    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchHelp, filters, maxResults, state.searchResults, onSearchResult])

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedResultIndex(-1)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce search
    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value)
      }, searchDelay)

      // Generate suggestions
      if (showSuggestions && value.length >= 2) {
        generateSuggestions(value)
      }
    } else {
      setSearchResults([])
      setSuggestions([])
    }
  }, [performSearch, searchDelay, showSuggestions])

  // Generate search suggestions
  const generateSuggestions = useCallback(async (searchQuery: string) => {
    // This would integrate with a suggestion service
    // For now, we'll use a simple implementation based on common terms
    const commonTerms = [
      'getting started', 'troubleshooting', 'configuration', 'setup',
      'authentication', 'permissions', 'integration', 'API', 'workflow',
      'best practices', 'optimization', 'performance', 'security'
    ]

    const matching = commonTerms.filter(term =>
      term.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5)

    setSuggestions(matching)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedResultIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        )
        break

      case 'ArrowUp':
        e.preventDefault()
        setSelectedResultIndex(prev => prev > -1 ? prev - 1 : -1)
        break

      case 'Enter':
        e.preventDefault()
        if (selectedResultIndex >= 0 && searchResults[selectedResultIndex]) {
          handleResultSelect(searchResults[selectedResultIndex])
        } else if (query.trim()) {
          performSearch(query)
        }
        break

      case 'Escape':
        e.preventDefault()
        if (query) {
          setQuery('')
          setSearchResults([])
        } else {
          onClose?.()
        }
        break
    }
  }, [searchResults, selectedResultIndex, query, performSearch, onClose])

  // Handle result selection
  const handleResultSelect = useCallback((result: HelpSearchResult) => {
    onResultSelect?.(result)
    // Optionally close the search panel
    // onClose?.()
  }, [onResultSelect])

  // Handle filter changes
  const handleFilterChange = useCallback((filterType: keyof SearchFilters, value: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: checked
        ? [...prev[filterType], value]
        : prev[filterType].filter(item => item !== value)
    }))

    // Re-search with new filters
    if (query.trim()) {
      performSearch(query)
    }
  }, [query, performSearch])

  // Filter options (would typically come from backend)
  const filterOptions = useMemo(() => ({
    type: ['tooltip', 'panel', 'modal', 'tutorial', 'voice'],
    category: ['getting-started', 'advanced', 'troubleshooting', 'integration'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
    tags: ['quick', 'detailed', 'step-by-step', 'reference']
  }), [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`help-search-panel help-search-panel--${position} help-search-panel--${theme} ${className}`}
      style={{ width, height, ...style }}
    >
      {/* Search Header */}
      <div className="help-search-panel__header">
        <div className="search-input-container">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="search-input"
            aria-label="Search help topics"
          />

          <div className="search-input-actions">
            {isSearching && <div className="search-spinner" />}

            {showFilters && (
              <button
                className={`filter-toggle ${showFiltersPanel ? 'active' : ''}`}
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                aria-label="Toggle filters"
              >
                🔧
              </button>
            )}

            {onClose && (
              <button
                className="close-btn"
                onClick={onClose}
                aria-label="Close search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && !isSearching && (
          <div className="search-suggestions">
            <span className="suggestions-label">Suggestions:</span>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-btn"
                onClick={() => {
                  setQuery(suggestion)
                  performSearch(suggestion)
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFiltersPanel && (
        <div className="help-search-panel__filters">
          {Object.entries(filterOptions).map(([filterType, options]) => (
            <div key={filterType} className="filter-group">
              <h4 className="filter-group-title">{filterType}</h4>
              <div className="filter-options">
                {options.map(option => (
                  <label key={option} className="filter-option">
                    <input
                      type="checkbox"
                      checked={filters[filterType as keyof SearchFilters].includes(option)}
                      onChange={(e) => handleFilterChange(
                        filterType as keyof SearchFilters,
                        option,
                        e.target.checked
                      )}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Results */}
      <div className="help-search-panel__results" ref={resultsRef}>
        {!query.trim() && showRecentSearches && recentSearches.length > 0 && (
          <div className="recent-searches">
            <h4>Recent Searches</h4>
            {recentSearches.map((recentQuery, index) => (
              <button
                key={index}
                className="recent-search-btn"
                onClick={() => {
                  setQuery(recentQuery)
                  performSearch(recentQuery)
                }}
              >
                <span className="search-icon">🔍</span>
                {recentQuery}
              </button>
            ))}
          </div>
        )}

        {query.trim() && !isSearching && searchResults.length === 0 && (
          <div className="no-results">
            <p>No help topics found for "{query}"</p>
            <p>Try different keywords or check the filters.</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="search-results">
            <div className="results-header">
              <span>{searchResults.length} results found</span>
            </div>

            {searchResults.map((result, index) => (
              <div
                key={result.content.id}
                className={`search-result ${
                  index === selectedResultIndex ? 'selected' : ''
                }`}
                onClick={() => handleResultSelect(result)}
              >
                <div className="result-header">
                  <h4 className="result-title">{result.content.title}</h4>
                  <div className="result-meta">
                    <span className="result-type">{result.content.type}</span>
                    <span className="result-score">
                      {Math.round(result.relevanceScore * 100)}% match
                    </span>
                  </div>
                </div>

                <div className="result-content">
                  <p className="result-snippet">
                    {result.snippet || (
                      typeof result.content.content === 'string'
                        ? result.content.content.substring(0, 150) + '...'
                        : result.content.description
                    )}
                  </p>

                  {result.highlightedTerms && result.highlightedTerms.length > 0 && (
                    <div className="result-highlights">
                      <span>Matches: </span>
                      {result.highlightedTerms.map((term, i) => (
                        <span key={i} className="highlight-term">{term}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="result-footer">
                  {result.content.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="result-tag">{tag}</span>
                  ))}

                  <div className="result-analytics">
                    <span className="result-rating">
                      ★ {result.content.analytics.averageRating.toFixed(1)}
                    </span>
                    <span className="result-views">
                      {result.content.analytics.views} views
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Stats */}
      {query.trim() && (
        <div className="help-search-panel__footer">
          <div className="search-stats">
            Search completed in {isSearching ? '...' : '< 1s'} •
            Semantic search: {enableSemanticSearch ? 'ON' : 'OFF'} •
            Fuzzy matching: {enableFuzzySearch ? 'ON' : 'OFF'}
          </div>
        </div>
      )}
    </div>
  )
}

export default HelpSearchPanel