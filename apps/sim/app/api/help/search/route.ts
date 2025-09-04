/**
 * Help Search API - Semantic search with intelligent suggestions
 *
 * Advanced search functionality for help content:
 * - Full-text search with ranking and relevance scoring
 * - Semantic search with context understanding
 * - Intelligent query suggestions and auto-completion
 * - Search analytics and optimization
 * - Multi-language search support
 * - Faceted search with filtering
 * - Search performance monitoring
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'
import { getSession } from '@/lib/auth'
import { helpContentManager } from '@/lib/help/help-content-manager'
import { helpAnalytics } from '@/lib/help/help-analytics'
import type { ContentSearchResult, ContentSearchFilter } from '@/lib/help/help-content-manager'

const logger = createLogger('HelpSearchAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const searchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  filters: z.object({
    categories: z.array(z.string()).optional(),
    components: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    contentTypes: z.array(z.string()).optional(),
    userLevels: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    isPublished: z.boolean().default(true),
  }).optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(10),
  sortBy: z.enum(['relevance', 'date', 'popularity', 'rating']).default('relevance'),
  includeAnalytics: z.boolean().default(false),
  includeFacets: z.boolean().default(true),
  highlightMatches: z.boolean().default(true),
})

const suggestionsRequestSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().min(1).max(20).default(5),
  includePopular: z.boolean().default(true),
  includeRecent: z.boolean().default(true),
  includeContextual: z.boolean().default(true),
  context: z.object({
    component: z.string().optional(),
    page: z.string().optional(),
    userLevel: z.string().optional(),
  }).optional(),
})

const autocompleteRequestSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().min(1).max(10).default(5),
})

// ========================
// SEARCH UTILITIES
// ========================

interface SearchMatch {
  field: string
  snippet: string
  score: number
}

interface EnhancedSearchResult extends ContentSearchResult {
  matches?: SearchMatch[]
  suggestions?: string[]
  queryTime: number
  cached: boolean
}

class SearchEngine {
  private searchCache = new Map<string, { result: EnhancedSearchResult; timestamp: number }>()
  private suggestionCache = new Map<string, { suggestions: string[]; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private popularQueries = new Map<string, number>()
  private recentQueries: { query: string; timestamp: number; userId?: string }[] = []

  async search(
    query: string,
    filters: ContentSearchFilter = {},
    page: number = 1,
    pageSize: number = 10,
    sortBy: string = 'relevance',
    options: {
      highlightMatches?: boolean
      includeAnalytics?: boolean
      includeFacets?: boolean
      userId?: string
    } = {}
  ): Promise<EnhancedSearchResult> {
    const startTime = Date.now()
    const cacheKey = this.generateCacheKey(query, filters, page, pageSize, sortBy)

    // Check cache first
    const cached = this.searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      logger.info('Serving search results from cache', { query, cached: true })
      return { ...cached.result, cached: true, queryTime: Date.now() - startTime }
    }

    try {
      // Perform the actual search
      const searchResult = await helpContentManager.searchContent(query, filters, page, pageSize)

      // Enhance results with highlighting and scoring
      const enhancedResult: EnhancedSearchResult = {
        ...searchResult,
        queryTime: Date.now() - startTime,
        cached: false,
      }

      if (options.highlightMatches) {
        enhancedResult.documents = enhancedResult.documents.map(doc => ({
          ...doc,
          matches: this.generateMatches(doc, query),
        }))
      }

      // Add search suggestions
      if (searchResult.total === 0) {
        enhancedResult.suggestions = await this.generateSearchSuggestions(query)
      }

      // Cache the result
      this.searchCache.set(cacheKey, {
        result: enhancedResult,
        timestamp: Date.now(),
      })

      // Track search analytics
      this.trackSearch(query, searchResult.total, options.userId)

      return enhancedResult

    } catch (error) {
      logger.error('Search execution failed', { query, error })
      throw error
    }
  }

  async getSuggestions(
    query: string,
    limit: number = 5,
    context?: any,
    userId?: string
  ): Promise<string[]> {
    const cacheKey = `suggestions:${query}:${JSON.stringify(context)}`
    const cached = this.suggestionCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.suggestions
    }

    const suggestions: string[] = []

    try {
      // Add popular query suggestions
      const popularSuggestions = this.getPopularQuerySuggestions(query, limit)
      suggestions.push(...popularSuggestions)

      // Add contextual suggestions
      if (context) {
        const contextualSuggestions = await this.getContextualSuggestions(query, context)
        suggestions.push(...contextualSuggestions.slice(0, Math.floor(limit / 2)))
      }

      // Add semantic suggestions (simplified implementation)
      const semanticSuggestions = this.getSemanticSuggestions(query)
      suggestions.push(...semanticSuggestions.slice(0, Math.floor(limit / 3)))

      // Remove duplicates and limit results
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, limit)

      // Cache suggestions
      this.suggestionCache.set(cacheKey, {
        suggestions: uniqueSuggestions,
        timestamp: Date.now(),
      })

      return uniqueSuggestions

    } catch (error) {
      logger.error('Suggestion generation failed', { query, error })
      return []
    }
  }

  async getAutocompletions(query: string, limit: number = 5): Promise<string[]> {
    const queryLower = query.toLowerCase()
    const completions: string[] = []

    // Get completions from popular queries
    for (const [popularQuery] of this.popularQueries.entries()) {
      if (popularQuery.toLowerCase().startsWith(queryLower) && popularQuery !== query) {
        completions.push(popularQuery)
        if (completions.length >= limit) break
      }
    }

    // Add common help topics if not enough completions
    if (completions.length < limit) {
      const commonTopics = [
        'workflow automation',
        'api integration',
        'data transformation',
        'error handling',
        'debugging workflows',
        'connecting blocks',
        'variables and data',
        'scheduling workflows',
        'oauth authentication',
        'best practices',
      ]

      for (const topic of commonTopics) {
        if (topic.toLowerCase().includes(queryLower) && !completions.includes(topic)) {
          completions.push(topic)
          if (completions.length >= limit) break
        }
      }
    }

    return completions.slice(0, limit)
  }

  private generateCacheKey(...args: any[]): string {
    return `search:${JSON.stringify(args)}`
  }

  private generateMatches(doc: any, query: string): SearchMatch[] {
    const matches: SearchMatch[] = []
    const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)

    // Search in title
    const titleLower = doc.title.toLowerCase()
    for (const term of queryTerms) {
      const index = titleLower.indexOf(term)
      if (index !== -1) {
        matches.push({
          field: 'title',
          snippet: this.generateSnippet(doc.title, term, index),
          score: 1.0,
        })
      }
    }

    // Search in content
    if (typeof doc.content === 'string') {
      const contentLower = doc.content.toLowerCase()
      for (const term of queryTerms) {
        const index = contentLower.indexOf(term)
        if (index !== -1) {
          matches.push({
            field: 'content',
            snippet: this.generateSnippet(doc.content, term, index),
            score: 0.8,
          })
        }
      }
    }

    // Search in description
    if (doc.metadata?.description) {
      const descLower = doc.metadata.description.toLowerCase()
      for (const term of queryTerms) {
        const index = descLower.indexOf(term)
        if (index !== -1) {
          matches.push({
            field: 'description',
            snippet: this.generateSnippet(doc.metadata.description, term, index),
            score: 0.9,
          })
        }
      }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, 3)
  }

  private generateSnippet(text: string, term: string, index: number): string {
    const start = Math.max(0, index - 50)
    const end = Math.min(text.length, index + term.length + 50)
    let snippet = text.substring(start, end)

    // Add ellipsis if truncated
    if (start > 0) snippet = '...' + snippet
    if (end < text.length) snippet = snippet + '...'

    // Highlight the term
    const regex = new RegExp(`(${term})`, 'gi')
    snippet = snippet.replace(regex, '<mark>$1</mark>')

    return snippet
  }

  private getPopularQuerySuggestions(query: string, limit: number): string[] {
    const queryLower = query.toLowerCase()
    const suggestions: Array<{ query: string; count: number }> = []

    for (const [popularQuery, count] of this.popularQueries.entries()) {
      const popularLower = popularQuery.toLowerCase()
      
      // Include if contains the query or is similar
      if (popularLower.includes(queryLower) || this.calculateSimilarity(queryLower, popularLower) > 0.6) {
        suggestions.push({ query: popularQuery, count })
      }
    }

    return suggestions
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(s => s.query)
  }

  private async getContextualSuggestions(query: string, context: any): Promise<string[]> {
    const suggestions: string[] = []

    if (context.component) {
      suggestions.push(`${query} in ${context.component}`)
      suggestions.push(`${context.component} ${query}`)
    }

    if (context.userLevel) {
      suggestions.push(`${query} for ${context.userLevel}`)
    }

    return suggestions.filter(s => s !== query)
  }

  private getSemanticSuggestions(query: string): string[] {
    // Simplified semantic suggestions based on keyword mapping
    const semanticMap: Record<string, string[]> = {
      'workflow': ['automation', 'process', 'flow', 'pipeline'],
      'block': ['component', 'node', 'step', 'action'],
      'connect': ['link', 'join', 'attach', 'bind'],
      'api': ['integration', 'service', 'endpoint', 'request'],
      'data': ['information', 'content', 'payload', 'response'],
      'error': ['issue', 'problem', 'bug', 'failure'],
      'debug': ['troubleshoot', 'fix', 'solve', 'diagnose'],
    }

    const suggestions: string[] = []
    const queryLower = query.toLowerCase()

    for (const [key, synonyms] of Object.entries(semanticMap)) {
      if (queryLower.includes(key)) {
        for (const synonym of synonyms) {
          const suggestion = query.replace(new RegExp(key, 'gi'), synonym)
          if (suggestion !== query) {
            suggestions.push(suggestion)
          }
        }
      }
    }

    return suggestions.slice(0, 3)
  }

  private async generateSearchSuggestions(query: string): Promise<string[]> {
    // Generate alternative search suggestions when no results found
    const suggestions: string[] = []

    // Try removing words one by one
    const words = query.split(' ')
    if (words.length > 1) {
      for (let i = 0; i < words.length; i++) {
        const reduced = words.filter((_, index) => index !== i).join(' ')
        suggestions.push(reduced)
      }
    }

    // Try common variations
    const variations = [
      query.replace(/ing$/, ''),
      query.replace(/s$/, ''),
      query + ' tutorial',
      query + ' guide',
      'how to ' + query,
    ]

    suggestions.push(...variations.filter(v => v !== query))

    return [...new Set(suggestions)].slice(0, 5)
  }

  private calculateSimilarity(a: string, b: string): number {
    // Simple Jaccard similarity
    const setA = new Set(a.split(''))
    const setB = new Set(b.split(''))
    const intersection = new Set([...setA].filter(x => setB.has(x)))
    const union = new Set([...setA, ...setB])
    return intersection.size / union.size
  }

  private trackSearch(query: string, resultCount: number, userId?: string): void {
    // Track popular queries
    const currentCount = this.popularQueries.get(query) || 0
    this.popularQueries.set(query, currentCount + 1)

    // Track recent queries
    this.recentQueries.push({
      query,
      timestamp: Date.now(),
      userId,
    })

    // Keep only recent queries (last 100)
    if (this.recentQueries.length > 100) {
      this.recentQueries = this.recentQueries.slice(-100)
    }

    logger.info('Search tracked', { query, resultCount, userId: userId?.substring(0, 8) })
  }
}

const searchEngine = new SearchEngine()

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/help/search - Perform help content search
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    logger.info(`[${requestId}] Processing help search request`)

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams)

    // Parse array parameters
    if (params.categories) params.categories = params.categories.split(',')
    if (params.components) params.components = params.components.split(',')
    if (params.tags) params.tags = params.tags.split(',')
    if (params.contentTypes) params.contentTypes = params.contentTypes.split(',')
    if (params.userLevels) params.userLevels = params.userLevels.split(',')
    if (params.languages) params.languages = params.languages.split(',')

    // Parse boolean parameters
    const booleanParams = ['isPublished', 'includeAnalytics', 'includeFacets', 'highlightMatches']
    for (const param of booleanParams) {
      if (params[param] !== undefined) {
        params[param] = params[param] === 'true'
      }
    }

    // Parse number parameters
    if (params.page) params.page = parseInt(params.page, 10)
    if (params.pageSize) params.pageSize = parseInt(params.pageSize, 10)

    // Build filters object
    if (params.categories || params.components || params.tags || params.contentTypes || params.userLevels || params.languages || params.isPublished !== undefined) {
      params.filters = {
        categories: params.categories,
        components: params.components,
        tags: params.tags,
        contentTypes: params.contentTypes,
        userLevels: params.userLevels,
        languages: params.languages,
        isPublished: params.isPublished,
      }
    }

    const validationResult = searchRequestSchema.safeParse(params)

    if (!validationResult.success) {
      logger.warn(`[${requestId}] Invalid search parameters`, {
        errors: validationResult.error.format(),
      })
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const {
      query,
      filters,
      page,
      pageSize,
      sortBy,
      includeAnalytics,
      includeFacets,
      highlightMatches,
    } = validationResult.data

    // Get user session
    const session = await getSession()
    const userId = session?.user?.email

    // Perform search
    const result = await searchEngine.search(
      query,
      filters || {},
      page,
      pageSize,
      sortBy,
      {
        highlightMatches,
        includeAnalytics,
        includeFacets,
        userId,
      }
    )

    // Track search analytics
    if (userId) {
      helpAnalytics.trackSearchQuery(query, requestId, result.total, userId)
    }

    const processingTime = Date.now() - startTime
    logger.info(`[${requestId}] Search completed successfully`, {
      query,
      resultCount: result.total,
      processingTimeMs: processingTime,
      cached: result.cached,
    })

    return NextResponse.json({
      ...result,
      meta: {
        ...result.meta,
        requestId,
        processingTime: processingTime,
      },
    }, {
      headers: {
        'X-Response-Time': `${processingTime}ms`,
        'Cache-Control': result.cached ? 'public, max-age=300' : 'private, max-age=60',
      },
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error(`[${requestId}] Search request failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
    })

    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/help/search/suggestions - Get search suggestions
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  
  try {
    const { pathname } = new URL(request.url)
    
    if (pathname.endsWith('/suggestions')) {
      return handleSuggestions(request, requestId)
    } else if (pathname.endsWith('/autocomplete')) {
      return handleAutocomplete(request, requestId)
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 })

  } catch (error) {
    logger.error(`[${requestId}] Search POST request failed`, { error })
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}

async function handleSuggestions(request: NextRequest, requestId: string) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const validationResult = suggestionsRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { query, limit, includePopular, includeRecent, includeContextual, context } = validationResult.data

    const session = await getSession()
    const userId = session?.user?.email

    const suggestions = await searchEngine.getSuggestions(query, limit, context, userId)

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      suggestions,
      meta: {
        query,
        count: suggestions.length,
        requestId,
        processingTime,
      },
    })

  } catch (error) {
    logger.error(`[${requestId}] Suggestions request failed`, { error })
    return NextResponse.json({ error: 'Suggestions failed' }, { status: 500 })
  }
}

async function handleAutocomplete(request: NextRequest, requestId: string) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const validationResult = autocompleteRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { query, limit } = validationResult.data

    const completions = await searchEngine.getAutocompletions(query, limit)

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      completions,
      meta: {
        query,
        count: completions.length,
        requestId,
        processingTime,
      },
    })

  } catch (error) {
    logger.error(`[${requestId}] Autocomplete request failed`, { error })
    return NextResponse.json({ error: 'Autocomplete failed' }, { status: 500 })
  }
}