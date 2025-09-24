/**
 * Comprehensive Error Knowledge Base System
 *
 * This module provides a dynamic, searchable knowledge base of error information,
 * solutions, and best practices. It includes automated documentation generation,
 * version control, and community-driven content management.
 */

import { EventEmitter } from 'events'
import { createLogger } from '../../apps/sim/lib/logs/console/logger'
import type { BaseToolError } from './error-handler'
import {
  type ErrorCategory,
  type ErrorSeverity,
  type ErrorImpact,
  RecoveryStrategy,
} from './error-taxonomy'
import type {
  IntelligentErrorExplanation,
  UserSkillLevel,
  SupportedLanguage,
} from './error-intelligence'
import type { LearnedPattern, ImprovementSuggestion } from './error-learning'
import type { ParlantLogContext } from './logging'

const logger = createLogger('ErrorKnowledgeBase')

/**
 * Knowledge base article structure
 */
export interface KnowledgeBaseArticle {
  id: string
  title: string
  summary: string
  category: ErrorCategory
  subcategories: string[]
  severity: ErrorSeverity
  tags: string[]
  content: ArticleContent
  metadata: ArticleMetadata
  versions: ArticleVersion[]
  translations: Map<SupportedLanguage, ArticleTranslation>
  searchKeywords: string[]
  relatedArticles: string[]
  userVotes: UserVote[]
  analytics: ArticleAnalytics
}

/**
 * Article content with rich formatting
 */
export interface ArticleContent {
  description: string
  symptoms: Symptom[]
  causes: Cause[]
  solutions: Solution[]
  prevention: PreventionTip[]
  troubleshooting: TroubleshootingGuide
  examples: CodeExample[]
  references: Reference[]
  faq: FAQ[]
}

/**
 * Symptom description
 */
export interface Symptom {
  description: string
  frequency: 'always' | 'often' | 'sometimes' | 'rarely'
  severity: 'critical' | 'major' | 'minor'
  contexts: string[]
  userReports: number
}

/**
 * Cause analysis
 */
export interface Cause {
  description: string
  probability: number
  category: 'configuration' | 'code' | 'environment' | 'external' | 'user'
  indicators: string[]
  debugging: DebuggingStep[]
}

/**
 * Solution with detailed steps
 */
export interface Solution {
  id: string
  title: string
  description: string
  skillLevel: UserSkillLevel
  steps: SolutionStep[]
  estimatedTime: string
  difficulty: 'easy' | 'medium' | 'hard'
  prerequisites: string[]
  tools: string[]
  successRate: number
  userRating: number
  lastTested: string
  platform: string[]
}

/**
 * Solution step
 */
export interface SolutionStep {
  order: number
  instruction: string
  code?: string
  command?: string
  expectedResult: string
  troubleshooting: string[]
  warnings: string[]
  screenshots?: string[]
}

/**
 * Prevention tip
 */
export interface PreventionTip {
  tip: string
  category: 'monitoring' | 'configuration' | 'coding' | 'deployment' | 'maintenance'
  effectiveness: number
  implementation: string[]
  cost: 'low' | 'medium' | 'high'
}

/**
 * Troubleshooting guide
 */
export interface TroubleshootingGuide {
  flowchart: TroubleshootingNode
  diagnosticCommands: DiagnosticCommand[]
  commonMistakes: CommonMistake[]
  escalationPaths: EscalationPath[]
}

/**
 * Troubleshooting flowchart node
 */
export interface TroubleshootingNode {
  id: string
  question: string
  type: 'question' | 'action' | 'solution' | 'escalation'
  options: TroubleshootingOption[]
  diagnosticInfo?: DiagnosticInfo
}

/**
 * Troubleshooting option
 */
export interface TroubleshootingOption {
  text: string
  action?: string
  nextNodeId?: string
  solutionId?: string
}

/**
 * Diagnostic command
 */
export interface DiagnosticCommand {
  command: string
  description: string
  platform: string[]
  output: DiagnosticOutput
  interpretation: string[]
}

/**
 * Diagnostic output analysis
 */
export interface DiagnosticOutput {
  example: string
  patterns: OutputPattern[]
  indicators: HealthIndicator[]
}

/**
 * Output pattern matching
 */
export interface OutputPattern {
  pattern: string
  meaning: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  actions: string[]
}

/**
 * Health indicator
 */
export interface HealthIndicator {
  metric: string
  healthyRange: string
  warningRange: string
  criticalRange: string
  unit: string
}

/**
 * Common mistake documentation
 */
export interface CommonMistake {
  mistake: string
  why: string
  symptoms: string[]
  correction: string
  prevention: string
}

/**
 * Escalation path
 */
export interface EscalationPath {
  condition: string
  contacts: EscalationContact[]
  information: string[]
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Escalation contact
 */
export interface EscalationContact {
  role: string
  contact: string
  availability: string
  specialties: string[]
}

/**
 * Code example
 */
export interface CodeExample {
  title: string
  language: string
  code: string
  explanation: string
  context: string
  skillLevel: UserSkillLevel
  tags: string[]
}

/**
 * Reference link
 */
export interface Reference {
  title: string
  url: string
  type: 'documentation' | 'tutorial' | 'video' | 'forum' | 'blog' | 'specification'
  quality: number
  lastChecked: string
}

/**
 * FAQ entry
 */
export interface FAQ {
  question: string
  answer: string
  popularity: number
  skillLevel: UserSkillLevel
  tags: string[]
}

/**
 * Debugging step
 */
export interface DebuggingStep {
  step: string
  command?: string
  expectedOutput?: string
  interpretation: string
}

/**
 * Diagnostic information
 */
export interface DiagnosticInfo {
  commands: string[]
  logFiles: string[]
  metrics: string[]
  environment: string[]
}

/**
 * Article metadata
 */
export interface ArticleMetadata {
  author: string
  created: string
  lastModified: string
  lastReviewed: string
  reviewStatus: 'draft' | 'reviewed' | 'approved' | 'outdated'
  accuracy: number
  completeness: number
  difficulty: UserSkillLevel
  estimatedReadTime: string
  platforms: string[]
  versions: string[]
}

/**
 * Article version
 */
export interface ArticleVersion {
  version: string
  timestamp: string
  author: string
  changes: string[]
  changeSummary: string
}

/**
 * Article translation
 */
export interface ArticleTranslation {
  language: SupportedLanguage
  title: string
  content: Partial<ArticleContent>
  translator: string
  quality: number
  lastUpdated: string
}

/**
 * User vote
 */
export interface UserVote {
  userId: string
  helpful: boolean
  accuracy: number
  completeness: number
  clarity: number
  timestamp: string
  comment?: string
}

/**
 * Article analytics
 */
export interface ArticleAnalytics {
  views: number
  uniqueViews: number
  averageReadTime: number
  helpfulVotes: number
  totalVotes: number
  searchRanking: number
  lastViewed: string
  popularityScore: number
  effectivenessScore: number
}

/**
 * Search query
 */
export interface SearchQuery {
  query: string
  filters: SearchFilter[]
  sorting: SearchSorting
  pagination: SearchPagination
  userContext?: UserContext
}

/**
 * Search filter
 */
export interface SearchFilter {
  field: string
  operator: 'equals' | 'contains' | 'in' | 'range' | 'exists'
  value: any
}

/**
 * Search sorting
 */
export interface SearchSorting {
  field: string
  direction: 'asc' | 'desc'
  secondary?: SearchSorting
}

/**
 * Search pagination
 */
export interface SearchPagination {
  page: number
  limit: number
}

/**
 * User context for personalized search
 */
export interface UserContext {
  skillLevel: UserSkillLevel
  preferredLanguage: SupportedLanguage
  previousSearches: string[]
  errorHistory: string[]
  platform: string
  role: string
}

/**
 * Search result
 */
export interface SearchResult {
  article: KnowledgeBaseArticle
  relevanceScore: number
  matchedFields: string[]
  highlights: SearchHighlight[]
  suggestedActions: string[]
}

/**
 * Search highlight
 */
export interface SearchHighlight {
  field: string
  text: string
  start: number
  end: number
}

/**
 * Auto-generated content
 */
export interface AutoGeneratedContent {
  sourceType: 'error_pattern' | 'user_feedback' | 'resolution_data' | 'external_docs'
  sourceData: any
  generatedContent: Partial<ArticleContent>
  confidence: number
  requiresReview: boolean
}

/**
 * Comprehensive Error Knowledge Base System
 */
export class ErrorKnowledgeBase extends EventEmitter {
  private articles = new Map<string, KnowledgeBaseArticle>()
  private searchIndex = new Map<string, Set<string>>() // keyword -> article IDs
  private categoryIndex = new Map<ErrorCategory, Set<string>>()
  private tagIndex = new Map<string, Set<string>>()
  private popularArticles: string[] = []
  private contentGenerator = new AutoContentGenerator()

  constructor() {
    super()
    this.initializeKnowledgeBase()
    logger.info('Error Knowledge Base initialized')
  }

  /**
   * Search knowledge base with advanced filtering
   */
  async search(query: SearchQuery): Promise<{
    results: SearchResult[]
    totalCount: number
    suggestions: string[]
    relatedTopics: string[]
  }> {
    const startTime = Date.now()

    logger.debug('Searching knowledge base', {
      query: query.query,
      filters: query.filters.length,
      userContext: !!query.userContext,
    })

    // Parse search query
    const searchTerms = this.parseSearchQuery(query.query)

    // Find matching articles
    let matchingArticleIds = new Set<string>()

    // Search by keywords
    if (searchTerms.length > 0) {
      matchingArticleIds = this.searchByKeywords(searchTerms)
    } else {
      // No specific terms - return all articles
      matchingArticleIds = new Set(this.articles.keys())
    }

    // Apply filters
    const filteredIds = this.applyFilters(matchingArticleIds, query.filters)

    // Score and rank results
    const scoredResults = await this.scoreResults(
      filteredIds,
      searchTerms,
      query.userContext
    )

    // Sort results
    const sortedResults = this.sortResults(scoredResults, query.sorting)

    // Apply pagination
    const paginatedResults = this.paginateResults(sortedResults, query.pagination)

    // Generate suggestions and related topics
    const suggestions = this.generateSearchSuggestions(query.query, searchTerms)
    const relatedTopics = this.generateRelatedTopics(matchingArticleIds, query.userContext)

    // Update analytics
    this.updateSearchAnalytics(query, paginatedResults.length)

    const searchTime = Date.now() - startTime
    logger.info('Search completed', {
      query: query.query,
      totalResults: sortedResults.length,
      returnedResults: paginatedResults.length,
      searchTime,
    })

    return {
      results: paginatedResults,
      totalCount: sortedResults.length,
      suggestions,
      relatedTopics,
    }
  }

  /**
   * Get article by ID with personalization
   */
  async getArticle(
    articleId: string,
    userContext?: UserContext
  ): Promise<KnowledgeBaseArticle | null> {
    const article = this.articles.get(articleId)
    if (!article) return null

    // Personalize content based on user context
    if (userContext) {
      return this.personalizeArticle(article, userContext)
    }

    // Update view analytics
    this.updateViewAnalytics(articleId)

    return { ...article } // Return copy to prevent mutations
  }

  /**
   * Create new article
   */
  async createArticle(
    content: Omit<KnowledgeBaseArticle, 'id' | 'metadata' | 'versions' | 'analytics'>,
    author: string
  ): Promise<string> {
    const articleId = `kb-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`

    const article: KnowledgeBaseArticle = {
      ...content,
      id: articleId,
      metadata: {
        author,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        lastReviewed: new Date().toISOString(),
        reviewStatus: 'draft',
        accuracy: 0,
        completeness: 0,
        difficulty: UserSkillLevel.INTERMEDIATE,
        estimatedReadTime: this.calculateReadTime(content.content),
        platforms: [],
        versions: [],
      },
      versions: [
        {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          author,
          changes: ['Initial creation'],
          changeSummary: 'Article created',
        },
      ],
      analytics: {
        views: 0,
        uniqueViews: 0,
        averageReadTime: 0,
        helpfulVotes: 0,
        totalVotes: 0,
        searchRanking: 0,
        lastViewed: '',
        popularityScore: 0,
        effectivenessScore: 0,
      },
    }

    this.articles.set(articleId, article)
    this.updateSearchIndices(article)

    this.emit('article_created', { articleId, author })

    logger.info('Article created', { articleId, title: article.title, author })

    return articleId
  }

  /**
   * Update existing article
   */
  async updateArticle(
    articleId: string,
    updates: Partial<KnowledgeBaseArticle>,
    author: string,
    changeSummary: string
  ): Promise<boolean> {
    const existingArticle = this.articles.get(articleId)
    if (!existingArticle) return false

    const updatedArticle: KnowledgeBaseArticle = {
      ...existingArticle,
      ...updates,
      metadata: {
        ...existingArticle.metadata,
        lastModified: new Date().toISOString(),
        reviewStatus: 'draft', // Reset review status after update
      },
      versions: [
        ...existingArticle.versions,
        {
          version: this.incrementVersion(existingArticle.versions[existingArticle.versions.length - 1].version),
          timestamp: new Date().toISOString(),
          author,
          changes: this.detectChanges(existingArticle, updates),
          changeSummary,
        },
      ],
    }

    this.articles.set(articleId, updatedArticle)
    this.updateSearchIndices(updatedArticle)

    this.emit('article_updated', { articleId, author, changeSummary })

    logger.info('Article updated', { articleId, author, changeSummary })

    return true
  }

  /**
   * Auto-generate article from error patterns and resolution data
   */
  async autoGenerateArticle(
    errorPattern: LearnedPattern,
    resolutionData: any[],
    userFeedback: any[]
  ): Promise<AutoGeneratedContent> {
    logger.debug('Auto-generating article', {
      patternId: errorPattern.id,
      resolutionData: resolutionData.length,
      feedback: userFeedback.length,
    })

    const generatedContent = await this.contentGenerator.generateFromPattern(
      errorPattern,
      resolutionData,
      userFeedback
    )

    this.emit('content_generated', {
      patternId: errorPattern.id,
      confidence: generatedContent.confidence,
      requiresReview: generatedContent.requiresReview,
    })

    return generatedContent
  }

  /**
   * Get article recommendations based on error
   */
  async getRecommendations(
    error: BaseToolError,
    userContext?: UserContext,
    limit = 10
  ): Promise<SearchResult[]> {
    const query: SearchQuery = {
      query: `${error.category} ${error.subcategory} ${error.message}`,
      filters: [
        { field: 'category', operator: 'equals', value: error.category },
        { field: 'severity', operator: 'equals', value: error.severity },
      ],
      sorting: { field: 'relevanceScore', direction: 'desc' },
      pagination: { page: 1, limit },
      userContext,
    }

    const searchResults = await this.search(query)
    return searchResults.results
  }

  /**
   * Vote on article helpfulness
   */
  async voteOnArticle(
    articleId: string,
    userId: string,
    vote: Omit<UserVote, 'timestamp'>
  ): Promise<boolean> {
    const article = this.articles.get(articleId)
    if (!article) return false

    // Remove existing vote from same user
    article.userVotes = article.userVotes.filter(v => v.userId !== userId)

    // Add new vote
    article.userVotes.push({
      ...vote,
      timestamp: new Date().toISOString(),
    })

    // Update analytics
    this.updateVoteAnalytics(article)

    this.emit('article_voted', { articleId, userId, helpful: vote.helpful })

    logger.debug('Article vote recorded', { articleId, userId, helpful: vote.helpful })

    return true
  }

  /**
   * Get popular articles
   */
  getPopularArticles(
    category?: ErrorCategory,
    skillLevel?: UserSkillLevel,
    limit = 10
  ): KnowledgeBaseArticle[] {
    let articles = Array.from(this.articles.values())

    // Filter by category
    if (category) {
      articles = articles.filter(a => a.category === category)
    }

    // Filter by skill level
    if (skillLevel) {
      articles = articles.filter(a => a.metadata.difficulty === skillLevel)
    }

    // Sort by popularity score
    articles.sort((a, b) => b.analytics.popularityScore - a.analytics.popularityScore)

    return articles.slice(0, limit)
  }

  /**
   * Get knowledge base statistics
   */
  getStatistics(): KnowledgeBaseStatistics {
    const articles = Array.from(this.articles.values())

    return {
      totalArticles: articles.length,
      articlesByCategory: this.getArticlesByCategory(),
      articlesBySkillLevel: this.getArticlesBySkillLevel(),
      averageRating: this.calculateAverageRating(),
      totalViews: articles.reduce((sum, a) => sum + a.analytics.views, 0),
      mostPopular: this.getMostPopularArticles(5),
      recentlyUpdated: this.getRecentlyUpdatedArticles(5),
      needsReview: articles.filter(a => a.metadata.reviewStatus === 'outdated').length,
      autoGeneratedContent: articles.filter(a => a.metadata.author === 'auto-generator').length,
      translationCoverage: this.getTranslationCoverage(),
    }
  }

  /**
   * Bulk import articles from external sources
   */
  async bulkImport(
    articles: Array<Omit<KnowledgeBaseArticle, 'id' | 'metadata' | 'versions' | 'analytics'>>,
    author = 'bulk-import'
  ): Promise<{ success: string[]; failed: Array<{ article: any; error: string }> }> {
    const success: string[] = []
    const failed: Array<{ article: any; error: string }> = []

    for (const articleData of articles) {
      try {
        const articleId = await this.createArticle(articleData, author)
        success.push(articleId)
      } catch (error) {
        failed.push({
          article: articleData,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    logger.info('Bulk import completed', {
      success: success.length,
      failed: failed.length,
      total: articles.length,
    })

    return { success, failed }
  }

  /**
   * Export knowledge base
   */
  async export(
    format: 'json' | 'markdown' | 'html' = 'json',
    filters?: SearchFilter[]
  ): Promise<string> {
    let articles = Array.from(this.articles.values())

    // Apply filters if provided
    if (filters) {
      const filteredIds = this.applyFilters(new Set(articles.map(a => a.id)), filters)
      articles = articles.filter(a => filteredIds.has(a.id))
    }

    switch (format) {
      case 'json':
        return JSON.stringify(articles, null, 2)
      case 'markdown':
        return this.exportToMarkdown(articles)
      case 'html':
        return this.exportToHTML(articles)
      default:
        return JSON.stringify(articles, null, 2)
    }
  }

  /**
   * Private helper methods
   */
  private initializeKnowledgeBase(): void {
    this.loadDefaultArticles()
    this.startBackgroundTasks()
  }

  private loadDefaultArticles(): void {
    // Create default articles for common error categories
    const defaultArticles = [
      {
        title: 'Connection Timeout Errors',
        summary: 'How to diagnose and resolve connection timeout issues',
        category: ErrorCategory.EXTERNAL_TIMEOUT,
        subcategories: ['connection_timeout', 'request_timeout'],
        severity: ErrorSeverity.ERROR,
        tags: ['timeout', 'connection', 'network'],
        content: {
          description: 'Connection timeout errors occur when operations take longer than expected.',
          symptoms: [
            {
              description: 'Operation hangs and eventually times out',
              frequency: 'always' as const,
              severity: 'major' as const,
              contexts: ['API calls', 'Database queries'],
              userReports: 0,
            },
          ],
          causes: [
            {
              description: 'Network connectivity issues',
              probability: 0.7,
              category: 'environment' as const,
              indicators: ['High network latency', 'Packet loss'],
              debugging: [],
            },
          ],
          solutions: [
            {
              id: 'sol-1',
              title: 'Increase Timeout Settings',
              description: 'Adjust timeout configuration to allow more time',
              skillLevel: UserSkillLevel.BEGINNER,
              steps: [
                {
                  order: 1,
                  instruction: 'Locate timeout configuration',
                  expectedResult: 'Configuration file found',
                  troubleshooting: [],
                  warnings: [],
                },
              ],
              estimatedTime: '5 minutes',
              difficulty: 'easy' as const,
              prerequisites: [],
              tools: [],
              successRate: 0.8,
              userRating: 4.2,
              lastTested: new Date().toISOString(),
              platform: ['all'],
            },
          ],
          prevention: [],
          troubleshooting: {
            flowchart: {
              id: 'root',
              question: 'Is the timeout consistent?',
              type: 'question' as const,
              options: [],
            },
            diagnosticCommands: [],
            commonMistakes: [],
            escalationPaths: [],
          },
          examples: [],
          references: [],
          faq: [],
        },
        searchKeywords: ['timeout', 'connection', 'network', 'hang'],
        relatedArticles: [],
        userVotes: [],
        translations: new Map(),
      },
    ]

    defaultArticles.forEach(article => {
      this.createArticle(article, 'system')
    })
  }

  private startBackgroundTasks(): void {
    // Update search rankings hourly
    setInterval(() => {
      this.updateSearchRankings()
    }, 60 * 60 * 1000)

    // Clean up old analytics data daily
    setInterval(() => {
      this.cleanupAnalytics()
    }, 24 * 60 * 60 * 1000)

    // Check for outdated articles weekly
    setInterval(() => {
      this.markOutdatedArticles()
    }, 7 * 24 * 60 * 60 * 1000)
  }

  private parseSearchQuery(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(term => term.length > 2)
  }

  private searchByKeywords(terms: string[]): Set<string> {
    const results = new Set<string>()

    terms.forEach(term => {
      // Exact matches
      const exactMatches = this.searchIndex.get(term)
      if (exactMatches) {
        exactMatches.forEach(id => results.add(id))
      }

      // Partial matches
      for (const [keyword, articleIds] of this.searchIndex.entries()) {
        if (keyword.includes(term) || term.includes(keyword)) {
          articleIds.forEach(id => results.add(id))
        }
      }
    })

    return results
  }

  private applyFilters(articleIds: Set<string>, filters: SearchFilter[]): Set<string> {
    let filteredIds = new Set(articleIds)

    filters.forEach(filter => {
      const matchingIds = new Set<string>()

      for (const id of filteredIds) {
        const article = this.articles.get(id)
        if (!article) continue

        if (this.matchesFilter(article, filter)) {
          matchingIds.add(id)
        }
      }

      filteredIds = matchingIds
    })

    return filteredIds
  }

  private matchesFilter(article: KnowledgeBaseArticle, filter: SearchFilter): boolean {
    const value = this.getFieldValue(article, filter.field)

    switch (filter.operator) {
      case 'equals':
        return value === filter.value
      case 'contains':
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value)
      case 'range':
        return value >= filter.value.min && value <= filter.value.max
      case 'exists':
        return value !== undefined && value !== null
      default:
        return false
    }
  }

  private getFieldValue(article: KnowledgeBaseArticle, field: string): any {
    const parts = field.split('.')
    let value: any = article

    for (const part of parts) {
      value = value?.[part]
    }

    return value
  }

  private async scoreResults(
    articleIds: Set<string>,
    searchTerms: string[],
    userContext?: UserContext
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []

    for (const id of articleIds) {
      const article = this.articles.get(id)
      if (!article) continue

      const relevanceScore = this.calculateRelevanceScore(article, searchTerms, userContext)
      const matchedFields = this.getMatchedFields(article, searchTerms)
      const highlights = this.generateHighlights(article, searchTerms)
      const suggestedActions = this.generateSuggestedActions(article)

      results.push({
        article,
        relevanceScore,
        matchedFields,
        highlights,
        suggestedActions,
      })
    }

    return results
  }

  private calculateRelevanceScore(
    article: KnowledgeBaseArticle,
    searchTerms: string[],
    userContext?: UserContext
  ): number {
    let score = 0

    // Title matches (highest weight)
    const titleMatches = searchTerms.filter(term =>
      article.title.toLowerCase().includes(term)
    ).length
    score += titleMatches * 10

    // Content matches
    const contentText = JSON.stringify(article.content).toLowerCase()
    const contentMatches = searchTerms.filter(term =>
      contentText.includes(term)
    ).length
    score += contentMatches * 5

    // Tag matches
    const tagMatches = searchTerms.filter(term =>
      article.tags.some(tag => tag.toLowerCase().includes(term))
    ).length
    score += tagMatches * 7

    // User context personalization
    if (userContext) {
      if (article.metadata.difficulty === userContext.skillLevel) {
        score += 5
      }
      if (article.translations.has(userContext.preferredLanguage)) {
        score += 3
      }
    }

    // Quality factors
    score += article.analytics.popularityScore * 2
    score += article.analytics.effectivenessScore * 3

    return score
  }

  private getMatchedFields(article: KnowledgeBaseArticle, searchTerms: string[]): string[] {
    const fields: string[] = []

    if (searchTerms.some(term => article.title.toLowerCase().includes(term))) {
      fields.push('title')
    }
    if (searchTerms.some(term => article.summary.toLowerCase().includes(term))) {
      fields.push('summary')
    }
    if (searchTerms.some(term => article.tags.some(tag => tag.includes(term)))) {
      fields.push('tags')
    }

    return fields
  }

  private generateHighlights(article: KnowledgeBaseArticle, searchTerms: string[]): SearchHighlight[] {
    const highlights: SearchHighlight[] = []

    searchTerms.forEach(term => {
      const titleIndex = article.title.toLowerCase().indexOf(term)
      if (titleIndex !== -1) {
        highlights.push({
          field: 'title',
          text: article.title.substring(Math.max(0, titleIndex - 20), titleIndex + term.length + 20),
          start: titleIndex,
          end: titleIndex + term.length,
        })
      }
    })

    return highlights
  }

  private generateSuggestedActions(article: KnowledgeBaseArticle): string[] {
    const actions: string[] = []

    if (article.content.solutions.length > 0) {
      actions.push('Try the suggested solutions')
    }
    if (article.content.troubleshooting.diagnosticCommands.length > 0) {
      actions.push('Run diagnostic commands')
    }
    if (article.content.prevention.length > 0) {
      actions.push('Implement prevention measures')
    }

    return actions
  }

  private sortResults(results: SearchResult[], sorting: SearchSorting): SearchResult[] {
    return results.sort((a, b) => {
      const getValue = (result: SearchResult, field: string): any => {
        switch (field) {
          case 'relevanceScore':
            return result.relevanceScore
          case 'popularity':
            return result.article.analytics.popularityScore
          case 'lastModified':
            return new Date(result.article.metadata.lastModified).getTime()
          default:
            return 0
        }
      }

      const aValue = getValue(a, sorting.field)
      const bValue = getValue(b, sorting.field)

      const comparison = sorting.direction === 'desc' ? bValue - aValue : aValue - bValue

      if (comparison === 0 && sorting.secondary) {
        return this.sortResults([a, b], sorting.secondary)[0] === a ? -1 : 1
      }

      return comparison
    })
  }

  private paginateResults(results: SearchResult[], pagination: SearchPagination): SearchResult[] {
    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit
    return results.slice(start, end)
  }

  private generateSearchSuggestions(originalQuery: string, searchTerms: string[]): string[] {
    const suggestions: string[] = []

    // Common misspellings and alternatives
    const commonAlternatives: Record<string, string[]> = {
      'timeout': ['time out', 'timed out'],
      'connection': ['connect', 'connectivity'],
      'error': ['issue', 'problem'],
    }

    searchTerms.forEach(term => {
      const alternatives = commonAlternatives[term]
      if (alternatives) {
        suggestions.push(...alternatives.map(alt => originalQuery.replace(term, alt)))
      }
    })

    return suggestions.slice(0, 5)
  }

  private generateRelatedTopics(matchingIds: Set<string>, userContext?: UserContext): string[] {
    const topics = new Set<string>()

    matchingIds.forEach(id => {
      const article = this.articles.get(id)
      if (article) {
        article.tags.forEach(tag => topics.add(tag))
        article.subcategories.forEach(sub => topics.add(sub))
      }
    })

    return Array.from(topics).slice(0, 10)
  }

  private personalizeArticle(
    article: KnowledgeBaseArticle,
    userContext: UserContext
  ): KnowledgeBaseArticle {
    const personalizedArticle = { ...article }

    // Use translated version if available
    const translation = article.translations.get(userContext.preferredLanguage)
    if (translation) {
      personalizedArticle.title = translation.title
      personalizedArticle.content = { ...article.content, ...translation.content }
    }

    // Filter solutions by skill level
    personalizedArticle.content.solutions = article.content.solutions.filter(
      solution => solution.skillLevel === userContext.skillLevel || solution.skillLevel === UserSkillLevel.BEGINNER
    )

    return personalizedArticle
  }

  // More helper methods would be implemented here...
  private updateSearchIndices(article: KnowledgeBaseArticle): void {
    // Update keyword index
    article.searchKeywords.forEach(keyword => {
      if (!this.searchIndex.has(keyword)) {
        this.searchIndex.set(keyword, new Set())
      }
      this.searchIndex.get(keyword)!.add(article.id)
    })

    // Update category index
    if (!this.categoryIndex.has(article.category)) {
      this.categoryIndex.set(article.category, new Set())
    }
    this.categoryIndex.get(article.category)!.add(article.id)

    // Update tag index
    article.tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      this.tagIndex.get(tag)!.add(article.id)
    })
  }

  private updateSearchAnalytics(query: SearchQuery, resultCount: number): void {
    // Track search patterns for improvement
  }

  private updateViewAnalytics(articleId: string): void {
    const article = this.articles.get(articleId)
    if (article) {
      article.analytics.views++
      article.analytics.lastViewed = new Date().toISOString()
    }
  }

  private updateVoteAnalytics(article: KnowledgeBaseArticle): void {
    const totalVotes = article.userVotes.length
    const helpfulVotes = article.userVotes.filter(v => v.helpful).length

    article.analytics.totalVotes = totalVotes
    article.analytics.helpfulVotes = helpfulVotes
    article.analytics.effectivenessScore = totalVotes > 0 ? helpfulVotes / totalVotes : 0

    // Update popularity score
    article.analytics.popularityScore = this.calculatePopularityScore(article)
  }

  private calculatePopularityScore(article: KnowledgeBaseArticle): number {
    const views = article.analytics.views
    const effectiveness = article.analytics.effectivenessScore
    const recency = this.calculateRecencyScore(article.metadata.lastModified)

    return (views * 0.4) + (effectiveness * 0.4) + (recency * 0.2)
  }

  private calculateRecencyScore(lastModified: string): number {
    const daysSince = (Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24)
    return Math.max(0, 1 - (daysSince / 365)) // Decay over a year
  }

  private calculateReadTime(content: ArticleContent): string {
    const wordCount = JSON.stringify(content).split(/\s+/).length
    const minutes = Math.ceil(wordCount / 200) // Average reading speed
    return `${minutes} min read`
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number)
    parts[2]++ // Increment patch version
    return parts.join('.')
  }

  private detectChanges(original: KnowledgeBaseArticle, updates: Partial<KnowledgeBaseArticle>): string[] {
    const changes: string[] = []

    if (updates.title && updates.title !== original.title) {
      changes.push('Title updated')
    }
    if (updates.content) {
      changes.push('Content modified')
    }
    if (updates.tags && JSON.stringify(updates.tags) !== JSON.stringify(original.tags)) {
      changes.push('Tags updated')
    }

    return changes
  }

  private updateSearchRankings(): void {
    // Update search rankings based on popularity and effectiveness
  }

  private cleanupAnalytics(): void {
    // Clean up old analytics data
  }

  private markOutdatedArticles(): void {
    // Mark articles as outdated if not reviewed recently
    const cutoff = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // 6 months

    this.articles.forEach(article => {
      if (new Date(article.metadata.lastReviewed) < cutoff) {
        article.metadata.reviewStatus = 'outdated'
      }
    })
  }

  private getArticlesByCategory(): Record<string, number> {
    const distribution: Record<string, number> = {}
    this.articles.forEach(article => {
      distribution[article.category] = (distribution[article.category] || 0) + 1
    })
    return distribution
  }

  private getArticlesBySkillLevel(): Record<string, number> {
    const distribution: Record<string, number> = {}
    this.articles.forEach(article => {
      const level = article.metadata.difficulty
      distribution[level] = (distribution[level] || 0) + 1
    })
    return distribution
  }

  private calculateAverageRating(): number {
    let totalRating = 0
    let totalVotes = 0

    this.articles.forEach(article => {
      article.userVotes.forEach(vote => {
        totalRating += (vote.accuracy + vote.completeness + vote.clarity) / 3
        totalVotes++
      })
    })

    return totalVotes > 0 ? totalRating / totalVotes : 0
  }

  private getMostPopularArticles(count: number): string[] {
    return Array.from(this.articles.values())
      .sort((a, b) => b.analytics.popularityScore - a.analytics.popularityScore)
      .slice(0, count)
      .map(a => a.id)
  }

  private getRecentlyUpdatedArticles(count: number): string[] {
    return Array.from(this.articles.values())
      .sort((a, b) => new Date(b.metadata.lastModified).getTime() - new Date(a.metadata.lastModified).getTime())
      .slice(0, count)
      .map(a => a.id)
  }

  private getTranslationCoverage(): Record<string, number> {
    const coverage: Record<string, number> = {}

    Object.values(SupportedLanguage).forEach(lang => {
      let translated = 0
      this.articles.forEach(article => {
        if (article.translations.has(lang)) {
          translated++
        }
      })
      coverage[lang] = translated
    })

    return coverage
  }

  private exportToMarkdown(articles: KnowledgeBaseArticle[]): string {
    return articles.map(article => `
# ${article.title}

${article.summary}

**Category:** ${article.category}
**Severity:** ${article.severity}
**Tags:** ${article.tags.join(', ')}

## Description
${article.content.description}

## Solutions
${article.content.solutions.map(solution => `
### ${solution.title}
${solution.description}

**Steps:**
${solution.steps.map(step => `${step.order}. ${step.instruction}`).join('\n')}
`).join('\n')}

---
`).join('\n')
  }

  private exportToHTML(articles: KnowledgeBaseArticle[]): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Knowledge Base Export</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .article { margin-bottom: 2em; padding: 1em; border: 1px solid #ccc; }
        .title { color: #333; }
        .meta { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    ${articles.map(article => `
        <div class="article">
            <h1 class="title">${article.title}</h1>
            <div class="meta">Category: ${article.category} | Severity: ${article.severity}</div>
            <p>${article.summary}</p>
            <p>${article.content.description}</p>
        </div>
    `).join('')}
</body>
</html>`
  }
}

/**
 * Auto content generator
 */
class AutoContentGenerator {
  async generateFromPattern(
    pattern: LearnedPattern,
    resolutionData: any[],
    userFeedback: any[]
  ): Promise<AutoGeneratedContent> {
    // Generate article content from learned patterns
    const generatedContent: Partial<ArticleContent> = {
      description: `Auto-generated content for ${pattern.name} pattern`,
      symptoms: [
        {
          description: pattern.description,
          frequency: 'often' as const,
          severity: 'major' as const,
          contexts: pattern.errorCategories,
          userReports: pattern.frequency,
        },
      ],
      causes: [],
      solutions: pattern.recommendations.map(rec => ({
        id: `auto-${rec.type}-${Date.now()}`,
        title: rec.action,
        description: rec.expectedOutcome,
        skillLevel: UserSkillLevel.INTERMEDIATE,
        steps: [
          {
            order: 1,
            instruction: rec.action,
            expectedResult: rec.expectedOutcome,
            troubleshooting: [],
            warnings: [],
          },
        ],
        estimatedTime: '15 minutes',
        difficulty: 'medium' as const,
        prerequisites: [],
        tools: [],
        successRate: pattern.effectiveness,
        userRating: 3.5,
        lastTested: new Date().toISOString(),
        platform: ['all'],
      })),
      prevention: [],
      troubleshooting: {
        flowchart: {
          id: 'root',
          question: 'Does this match the learned pattern?',
          type: 'question' as const,
          options: [],
        },
        diagnosticCommands: [],
        commonMistakes: [],
        escalationPaths: [],
      },
      examples: [],
      references: [],
      faq: [],
    }

    return {
      sourceType: 'error_pattern',
      sourceData: pattern,
      generatedContent,
      confidence: pattern.confidence,
      requiresReview: pattern.confidence < 0.8,
    }
  }
}

/**
 * Knowledge base statistics interface
 */
export interface KnowledgeBaseStatistics {
  totalArticles: number
  articlesByCategory: Record<string, number>
  articlesBySkillLevel: Record<string, number>
  averageRating: number
  totalViews: number
  mostPopular: string[]
  recentlyUpdated: string[]
  needsReview: number
  autoGeneratedContent: number
  translationCoverage: Record<string, number>
}

/**
 * Singleton error knowledge base
 */
export const errorKnowledgeBase = new ErrorKnowledgeBase()

/**
 * Convenience functions
 */
export const searchKnowledgeBase = (query: SearchQuery) =>
  errorKnowledgeBase.search(query)

export const getArticle = (articleId: string, userContext?: UserContext) =>
  errorKnowledgeBase.getArticle(articleId, userContext)

export const getArticleRecommendations = (
  error: BaseToolError,
  userContext?: UserContext,
  limit?: number
) => errorKnowledgeBase.getRecommendations(error, userContext, limit)

export const createArticle = (
  content: Omit<KnowledgeBaseArticle, 'id' | 'metadata' | 'versions' | 'analytics'>,
  author: string
) => errorKnowledgeBase.createArticle(content, author)

export const voteOnArticle = (
  articleId: string,
  userId: string,
  vote: Omit<UserVote, 'timestamp'>
) => errorKnowledgeBase.voteOnArticle(articleId, userId, vote)