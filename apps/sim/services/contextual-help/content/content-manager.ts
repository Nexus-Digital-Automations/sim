/**
 * Help Content Management System
 *
 * Intelligent system for managing help content with versioning, search,
 * recommendation engine, and automated content optimization.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ContentRecommendation,
  ContentVersion,
  HelpAnalytics,
  HelpContent,
  HelpContext,
  HelpSearchQuery,
  HelpSearchResult,
} from '../types'

const logger = createLogger('HelpContentManager')

export class HelpContentManager {
  private contentLibrary = new Map<string, HelpContent>()
  private contentVersions = new Map<string, ContentVersion[]>()
  private searchIndex = new Map<string, SearchIndexEntry>()
  private contentRecommendationEngine: ContentRecommendationEngine
  private contentOptimizer: ContentOptimizer
  private publishingWorkflow: PublishingWorkflow

  constructor() {
    this.contentRecommendationEngine = new ContentRecommendationEngine()
    this.contentOptimizer = new ContentOptimizer()
    this.publishingWorkflow = new PublishingWorkflow()
    this.initializeContentManager()
  }

  /**
   * Initialize the content management system
   */
  private async initializeContentManager(): Promise<void> {
    logger.info('Initializing Help Content Management System')

    // Load existing content
    await this.loadContentLibrary()

    // Build search index
    await this.buildSearchIndex()

    // Initialize recommendation engine
    await this.contentRecommendationEngine.initialize(this.contentLibrary)

    // Start content optimization background tasks
    this.startContentOptimization()

    logger.info('Help Content Management System initialized successfully')
  }

  /**
   * Create new help content
   */
  async createContent(
    content: Omit<HelpContent, 'id' | 'version' | 'lastUpdated' | 'analytics'>,
    authorId: string
  ): Promise<HelpContent> {
    logger.info(`Creating new help content`, { title: content.title, type: content.type })

    const contentId = `help_content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const version = '1.0.0'

    const newContent: HelpContent = {
      ...content,
      id: contentId,
      version,
      lastUpdated: new Date(),
      analytics: this.createEmptyAnalytics(),
    }

    // Validate content
    await this.validateContent(newContent)

    // Store content
    this.contentLibrary.set(contentId, newContent)

    // Create initial version record
    const initialVersion: ContentVersion = {
      id: `${contentId}_v${version}`,
      contentId,
      version,
      changes: [
        {
          field: 'created',
          oldValue: null,
          newValue: newContent,
          changeType: 'create',
        },
      ],
      author: authorId,
      timestamp: new Date(),
      approved: false,
      rollbackAvailable: false,
    }

    this.contentVersions.set(contentId, [initialVersion])

    // Update search index
    await this.updateSearchIndex(newContent)

    // Trigger content analysis
    await this.contentOptimizer.analyzeContent(newContent)

    logger.info(`Created help content successfully`, { contentId, version })

    return newContent
  }

  /**
   * Update existing help content
   */
  async updateContent(
    contentId: string,
    updates: Partial<HelpContent>,
    authorId: string
  ): Promise<HelpContent> {
    logger.info(`Updating help content`, { contentId })

    const existingContent = this.contentLibrary.get(contentId)
    if (!existingContent) {
      throw new Error(`Content not found: ${contentId}`)
    }

    // Create updated content
    const updatedContent: HelpContent = {
      ...existingContent,
      ...updates,
      lastUpdated: new Date(),
      version: this.incrementVersion(existingContent.version),
    }

    // Validate updated content
    await this.validateContent(updatedContent)

    // Calculate changes
    const changes = this.calculateChanges(existingContent, updatedContent)

    // Create version record
    const newVersion: ContentVersion = {
      id: `${contentId}_v${updatedContent.version}`,
      contentId,
      version: updatedContent.version,
      changes,
      author: authorId,
      timestamp: new Date(),
      approved: false,
      rollbackAvailable: true,
    }

    // Store updated content and version
    this.contentLibrary.set(contentId, updatedContent)
    const versions = this.contentVersions.get(contentId) || []
    versions.push(newVersion)
    this.contentVersions.set(contentId, versions)

    // Update search index
    await this.updateSearchIndex(updatedContent)

    // Trigger content re-analysis
    await this.contentOptimizer.analyzeContent(updatedContent)

    logger.info(`Updated help content successfully`, { contentId, version: updatedContent.version })

    return updatedContent
  }

  /**
   * Delete help content
   */
  async deleteContent(contentId: string, authorId: string): Promise<void> {
    logger.info(`Deleting help content`, { contentId })

    const existingContent = this.contentLibrary.get(contentId)
    if (!existingContent) {
      throw new Error(`Content not found: ${contentId}`)
    }

    // Create deletion version record
    const deletionVersion: ContentVersion = {
      id: `${contentId}_v${this.incrementVersion(existingContent.version)}`,
      contentId,
      version: this.incrementVersion(existingContent.version),
      changes: [
        {
          field: 'deleted',
          oldValue: existingContent,
          newValue: null,
          changeType: 'delete',
        },
      ],
      author: authorId,
      timestamp: new Date(),
      approved: true,
      rollbackAvailable: true,
    }

    // Store version record before deletion
    const versions = this.contentVersions.get(contentId) || []
    versions.push(deletionVersion)
    this.contentVersions.set(contentId, versions)

    // Remove from content library and search index
    this.contentLibrary.delete(contentId)
    this.searchIndex.delete(contentId)

    logger.info(`Deleted help content successfully`, { contentId })
  }

  /**
   * Get help content by ID
   */
  getContent(contentId: string): HelpContent | null {
    return this.contentLibrary.get(contentId) || null
  }

  /**
   * Search help content
   */
  async searchContent(query: HelpSearchQuery): Promise<HelpSearchResult[]> {
    logger.info(`Searching help content`, { query: query.query, filters: query.filters })

    const results: Array<{ content: HelpContent; score: number }> = []

    // Text-based search
    const normalizedQuery = query.query.toLowerCase()

    for (const [contentId, content] of this.contentLibrary) {
      let score = 0

      // Title matching (highest weight)
      if (content.title.toLowerCase().includes(normalizedQuery)) {
        score += 10
      }

      // Description matching
      if (content.description.toLowerCase().includes(normalizedQuery)) {
        score += 5
      }

      // Content text matching
      const contentText = this.extractTextFromContent(content.content)
      if (contentText.toLowerCase().includes(normalizedQuery)) {
        score += 3
      }

      // Tag matching
      const tagMatches = content.tags.filter((tag) =>
        tag.toLowerCase().includes(normalizedQuery)
      ).length
      score += tagMatches * 2

      // Apply filters
      if (this.passesFilters(content, query.filters)) {
        score += 1
      } else if (query.filters && Object.keys(query.filters).length > 0) {
        score = 0 // Exclude if filters don't match
      }

      // Context relevance boost
      if (query.context) {
        const contextScore = await this.calculateContextRelevance(content, query.context)
        score += contextScore * 3
      }

      // Analytics boost (popular/effective content)
      const analyticsBoost = this.calculateAnalyticsBoost(content)
      score += analyticsBoost

      if (score > 0) {
        results.push({ content, score })
      }
    }

    // Sort by relevance and limit results
    const maxResults = query.options?.maxResults || 20
    const sortedResults = results.sort((a, b) => b.score - a.score).slice(0, maxResults)

    // Create search results with snippets and highlights
    const searchResults: HelpSearchResult[] = []
    for (const { content, score } of sortedResults) {
      const snippet = this.generateSnippet(content, normalizedQuery)
      const highlightedTerms = this.extractHighlightedTerms(content, normalizedQuery)
      const similarContent = await this.findSimilarContent(content.id, 3)

      searchResults.push({
        content,
        relevanceScore: score,
        snippet,
        highlightedTerms,
        similarContent,
      })
    }

    logger.info(`Search completed`, {
      query: query.query,
      resultCount: searchResults.length,
      maxScore: searchResults[0]?.relevanceScore || 0,
    })

    return searchResults
  }

  /**
   * Get content recommendations for context
   */
  async getRecommendations(context: HelpContext, limit = 5): Promise<ContentRecommendation[]> {
    logger.info(`Getting content recommendations`, {
      userId: context.userId,
      route: context.currentRoute,
      toolContext: context.toolContext?.toolId,
    })

    return await this.contentRecommendationEngine.generateRecommendations(context, limit)
  }

  /**
   * Get content version history
   */
  getVersionHistory(contentId: string): ContentVersion[] {
    return this.contentVersions.get(contentId) || []
  }

  /**
   * Rollback content to previous version
   */
  async rollbackContent(
    contentId: string,
    targetVersion: string,
    authorId: string
  ): Promise<HelpContent> {
    logger.info(`Rolling back content`, { contentId, targetVersion })

    const versions = this.contentVersions.get(contentId) || []
    const targetVersionRecord = versions.find((v) => v.version === targetVersion)

    if (!targetVersionRecord || !targetVersionRecord.rollbackAvailable) {
      throw new Error(`Cannot rollback to version ${targetVersion}`)
    }

    // Find the content state at target version
    let rolledBackContent: HelpContent | null = null

    // Reconstruct content from version history
    for (const version of versions) {
      if (version.version === targetVersion) {
        // TODO: Reconstruct content from version changes
        // This is a simplified implementation
        const currentContent = this.contentLibrary.get(contentId)
        if (currentContent) {
          rolledBackContent = { ...currentContent, version: targetVersion }
        }
        break
      }
    }

    if (!rolledBackContent) {
      throw new Error(`Failed to rollback content to version ${targetVersion}`)
    }

    // Create rollback version record
    const rollbackVersion: ContentVersion = {
      id: `${contentId}_rollback_${Date.now()}`,
      contentId,
      version: this.incrementVersion(rolledBackContent.version),
      changes: [
        {
          field: 'rollback',
          oldValue: this.contentLibrary.get(contentId),
          newValue: rolledBackContent,
          changeType: 'update',
        },
      ],
      author: authorId,
      timestamp: new Date(),
      approved: true,
      rollbackAvailable: true,
    }

    // Update content and version history
    this.contentLibrary.set(contentId, rolledBackContent)
    versions.push(rollbackVersion)
    this.contentVersions.set(contentId, versions)

    // Update search index
    await this.updateSearchIndex(rolledBackContent)

    logger.info(`Content rolled back successfully`, {
      contentId,
      targetVersion,
      newVersion: rolledBackContent.version,
    })

    return rolledBackContent
  }

  /**
   * Approve content version
   */
  async approveContentVersion(
    contentId: string,
    version: string,
    approvedBy: string
  ): Promise<void> {
    logger.info(`Approving content version`, { contentId, version })

    const versions = this.contentVersions.get(contentId) || []
    const versionRecord = versions.find((v) => v.version === version)

    if (!versionRecord) {
      throw new Error(`Version not found: ${version}`)
    }

    versionRecord.approved = true
    versionRecord.approvedBy = approvedBy
    versionRecord.approvalDate = new Date()

    // Trigger content publication workflow
    await this.publishingWorkflow.publishContent(contentId, version)

    logger.info(`Content version approved`, { contentId, version, approvedBy })
  }

  /**
   * Get content analytics and metrics
   */
  getContentAnalytics(contentId?: string): HelpAnalytics | Map<string, HelpAnalytics> {
    if (contentId) {
      const content = this.contentLibrary.get(contentId)
      return content?.analytics || this.createEmptyAnalytics()
    }

    const analytics = new Map<string, HelpAnalytics>()
    for (const [id, content] of this.contentLibrary) {
      analytics.set(id, content.analytics)
    }
    return analytics
  }

  /**
   * Update content analytics
   */
  updateContentAnalytics(contentId: string, updates: Partial<HelpAnalytics>): void {
    const content = this.contentLibrary.get(contentId)
    if (content) {
      content.analytics = { ...content.analytics, ...updates }
      logger.info(`Updated content analytics`, { contentId, updates: Object.keys(updates) })
    }
  }

  /**
   * Get content usage statistics
   */
  getContentUsageStats(): {
    totalContent: number
    contentByType: Record<string, number>
    contentByPriority: Record<string, number>
    averageRating: number
    totalViews: number
    recentActivity: Array<{ contentId: string; activity: string; timestamp: Date }>
  } {
    const stats = {
      totalContent: this.contentLibrary.size,
      contentByType: {} as Record<string, number>,
      contentByPriority: {} as Record<string, number>,
      averageRating: 0,
      totalViews: 0,
      recentActivity: [] as Array<{ contentId: string; activity: string; timestamp: Date }>,
    }

    let totalRatings = 0
    let ratingSum = 0

    for (const [contentId, content] of this.contentLibrary) {
      // Count by type
      stats.contentByType[content.type] = (stats.contentByType[content.type] || 0) + 1

      // Count by priority
      stats.contentByPriority[content.priority] =
        (stats.contentByPriority[content.priority] || 0) + 1

      // Aggregate ratings
      if (content.analytics.averageRating > 0) {
        ratingSum += content.analytics.averageRating * content.analytics.feedbackCount
        totalRatings += content.analytics.feedbackCount
      }

      // Total views
      stats.totalViews += content.analytics.views
    }

    // Calculate average rating
    stats.averageRating = totalRatings > 0 ? ratingSum / totalRatings : 0

    return stats
  }

  // Private helper methods
  private async loadContentLibrary(): Promise<void> {
    // TODO: Load content from database
    // For now, initialize with empty library
    logger.info('Content library loaded', { count: this.contentLibrary.size })
  }

  private async buildSearchIndex(): Promise<void> {
    logger.info('Building search index')

    for (const [contentId, content] of this.contentLibrary) {
      const indexEntry: SearchIndexEntry = {
        contentId,
        title: content.title.toLowerCase(),
        description: content.description.toLowerCase(),
        content: this.extractTextFromContent(content.content).toLowerCase(),
        tags: content.tags.map((tag) => tag.toLowerCase()),
        type: content.type,
        priority: content.priority,
        lastIndexed: new Date(),
      }

      this.searchIndex.set(contentId, indexEntry)
    }

    logger.info('Search index built', { entries: this.searchIndex.size })
  }

  private async updateSearchIndex(content: HelpContent): Promise<void> {
    const indexEntry: SearchIndexEntry = {
      contentId: content.id,
      title: content.title.toLowerCase(),
      description: content.description.toLowerCase(),
      content: this.extractTextFromContent(content.content).toLowerCase(),
      tags: content.tags.map((tag) => tag.toLowerCase()),
      type: content.type,
      priority: content.priority,
      lastIndexed: new Date(),
    }

    this.searchIndex.set(content.id, indexEntry)
  }

  private extractTextFromContent(content: string | any[]): string {
    if (typeof content === 'string') {
      return content
    }

    if (Array.isArray(content)) {
      return content.map((block) => block.content || '').join(' ')
    }

    return ''
  }

  private passesFilters(content: HelpContent, filters?: Record<string, any>): boolean {
    if (!filters) return true

    for (const [key, value] of Object.entries(filters)) {
      switch (key) {
        case 'type':
          if (Array.isArray(value) ? !value.includes(content.type) : content.type !== value) {
            return false
          }
          break
        case 'priority':
          if (
            Array.isArray(value) ? !value.includes(content.priority) : content.priority !== value
          ) {
            return false
          }
          break
        case 'tags':
          if (Array.isArray(value)) {
            const hasAnyTag = value.some((tag) => content.tags.includes(tag))
            if (!hasAnyTag) return false
          }
          break
        default:
          // Handle custom filters
          break
      }
    }

    return true
  }

  private async calculateContextRelevance(
    content: HelpContent,
    context: HelpContext
  ): Promise<number> {
    let relevance = 0

    // Route matching
    if (
      content.triggers.some(
        (trigger) => trigger.type === 'route' && context.currentRoute.includes(trigger.condition)
      )
    ) {
      relevance += 0.5
    }

    // Tool context matching
    if (context.toolContext && content.tags.includes(context.toolContext.toolId)) {
      relevance += 0.3
    }

    // User state matching
    if (
      content.conditions.some(
        (condition) =>
          condition.type === 'user_expertise' &&
          condition.value === context.userState.expertiseLevel
      )
    ) {
      relevance += 0.2
    }

    return relevance
  }

  private calculateAnalyticsBoost(content: HelpContent): number {
    let boost = 0

    // Rating boost
    if (content.analytics.averageRating > 3.5) {
      boost += (content.analytics.averageRating - 3.5) * 2
    }

    // Effectiveness boost
    if (content.analytics.effectivenessScore > 0.7) {
      boost += (content.analytics.effectivenessScore - 0.7) * 3
    }

    // Popularity boost (normalized by total content views)
    if (content.analytics.views > 100) {
      boost += Math.log(content.analytics.views / 100)
    }

    return boost
  }

  private generateSnippet(content: HelpContent, query: string): string {
    const text = this.extractTextFromContent(content.content)
    const queryWords = query.split(/\s+/)

    // Find the first occurrence of any query word
    let bestIndex = -1
    for (const word of queryWords) {
      const index = text.toLowerCase().indexOf(word)
      if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index
      }
    }

    if (bestIndex === -1) {
      // No match found, return beginning of content
      return text.substring(0, 150) + (text.length > 150 ? '...' : '')
    }

    // Extract snippet around the match
    const start = Math.max(0, bestIndex - 75)
    const end = Math.min(text.length, bestIndex + 75)
    let snippet = text.substring(start, end)

    if (start > 0) snippet = `...${snippet}`
    if (end < text.length) snippet = `${snippet}...`

    return snippet
  }

  private extractHighlightedTerms(content: HelpContent, query: string): string[] {
    const queryWords = query.split(/\s+/).map((w) => w.toLowerCase())
    const highlighted: string[] = []

    // Find matching terms in title
    const titleWords = content.title.toLowerCase().split(/\s+/)
    for (const word of titleWords) {
      if (queryWords.some((qw) => word.includes(qw)) && !highlighted.includes(word)) {
        highlighted.push(word)
      }
    }

    // Find matching terms in tags
    for (const tag of content.tags) {
      const tagLower = tag.toLowerCase()
      if (queryWords.some((qw) => tagLower.includes(qw)) && !highlighted.includes(tag)) {
        highlighted.push(tag)
      }
    }

    return highlighted.slice(0, 5) // Limit to 5 highlighted terms
  }

  private async findSimilarContent(contentId: string, limit: number): Promise<HelpContent[]> {
    const targetContent = this.contentLibrary.get(contentId)
    if (!targetContent) return []

    const similarities: Array<{ content: HelpContent; score: number }> = []

    for (const [id, content] of this.contentLibrary) {
      if (id === contentId) continue

      let similarity = 0

      // Tag similarity
      const commonTags = targetContent.tags.filter((tag) => content.tags.includes(tag))
      similarity += commonTags.length * 0.3

      // Type similarity
      if (targetContent.type === content.type) similarity += 0.2

      // Priority similarity
      if (targetContent.priority === content.priority) similarity += 0.1

      // Content similarity (simplified - could use more sophisticated NLP)
      const targetText = this.extractTextFromContent(targetContent.content)
      const contentText = this.extractTextFromContent(content.content)
      const commonWords = this.calculateCommonWords(targetText, contentText)
      similarity += Math.min(commonWords / 100, 0.4) // Max 0.4 from content similarity

      if (similarity > 0.1) {
        similarities.push({ content, score: similarity })
      }
    }

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.content)
  }

  private calculateCommonWords(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))

    let commonCount = 0
    for (const word of words1) {
      if (words2.has(word) && word.length > 3) {
        // Only count words longer than 3 chars
        commonCount++
      }
    }

    return commonCount
  }

  private async validateContent(content: HelpContent): Promise<void> {
    // Validate required fields
    if (!content.title?.trim()) {
      throw new Error('Content title is required')
    }

    if (!content.description?.trim()) {
      throw new Error('Content description is required')
    }

    if (!content.content) {
      throw new Error('Content body is required')
    }

    // Validate content structure
    if (Array.isArray(content.content)) {
      for (const block of content.content) {
        if (!block.id || !block.type || !block.content) {
          throw new Error('Invalid content block structure')
        }
      }
    }

    // Validate triggers and conditions
    for (const trigger of content.triggers) {
      if (!trigger.type || !trigger.condition) {
        throw new Error('Invalid trigger configuration')
      }
    }

    for (const condition of content.conditions) {
      if (!condition.type || !condition.operator || condition.value === undefined) {
        throw new Error('Invalid condition configuration')
      }
    }

    logger.info('Content validation passed', { contentId: content.id })
  }

  private calculateChanges(
    oldContent: HelpContent,
    newContent: HelpContent
  ): ContentVersion['changes'] {
    const changes: ContentVersion['changes'] = []

    // Compare all fields
    const fields = [
      'title',
      'description',
      'content',
      'type',
      'priority',
      'triggers',
      'conditions',
      'tags',
    ]

    for (const field of fields) {
      const oldValue = (oldContent as any)[field]
      const newValue = (newContent as any)[field]

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field,
          oldValue,
          newValue,
          changeType: 'update',
        })
      }
    }

    return changes
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number)
    parts[2]++ // Increment patch version
    return parts.join('.')
  }

  private createEmptyAnalytics(): HelpAnalytics {
    return {
      views: 0,
      interactions: 0,
      completions: 0,
      averageRating: 0,
      feedbackCount: 0,
      lastViewed: new Date(),
      effectivenessScore: 0,
      userSegments: { beginner: 0, intermediate: 0, advanced: 0 },
      deliveryModes: {
        tooltip: 0,
        sidebar: 0,
        modal: 0,
        inline: 0,
        overlay: 0,
        voice: 0,
        chat: 0,
        notification: 0,
      },
      completionRate: 0,
      averageDuration: 0,
      dropOffPoints: [],
    }
  }

  private startContentOptimization(): void {
    // Start background content optimization
    setInterval(
      () => {
        this.contentOptimizer.optimizeContent()
      },
      60 * 60 * 1000
    ) // Every hour

    logger.info('Started content optimization background tasks')
  }
}

// Supporting classes and interfaces
class ContentRecommendationEngine {
  private contentLibrary: Map<string, HelpContent> = new Map()

  async initialize(contentLibrary: Map<string, HelpContent>): Promise<void> {
    this.contentLibrary = contentLibrary
    logger.info('Content recommendation engine initialized')
  }

  async generateRecommendations(
    context: HelpContext,
    limit: number
  ): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = []

    // Algorithm 1: Context-based recommendations
    for (const [contentId, content] of this.contentLibrary) {
      let score = 0

      // Route matching
      if (
        content.triggers.some(
          (trigger) => trigger.type === 'route' && context.currentRoute.includes(trigger.condition)
        )
      ) {
        score += 0.4
      }

      // Tool context matching
      if (context.toolContext && content.tags.includes(context.toolContext.toolId)) {
        score += 0.3
      }

      // User expertise matching
      if (
        content.conditions.some(
          (condition) =>
            condition.type === 'user_expertise' &&
            condition.value === context.userState.expertiseLevel
        )
      ) {
        score += 0.2
      }

      // Analytics boost
      if (content.analytics.effectivenessScore > 0.7) {
        score += 0.1
      }

      if (score > 0.2) {
        recommendations.push({
          contentId,
          reason: `Contextually relevant with ${Math.round(score * 100)}% confidence`,
          confidence: score,
          context: {
            userState: context.userState.expertiseLevel,
            currentAction: context.currentAction || 'browsing',
            similarUsers: [], // TODO: Implement user similarity
          },
        })
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, limit)
  }
}

class ContentOptimizer {
  async analyzeContent(content: HelpContent): Promise<void> {
    logger.info(`Analyzing content for optimization`, { contentId: content.id })

    // TODO: Implement content analysis
    // - Readability analysis
    // - SEO optimization
    // - Accessibility checks
    // - Performance optimization
  }

  async optimizeContent(): Promise<void> {
    logger.info('Running content optimization')

    // TODO: Implement automated content optimization
    // - Update outdated content
    // - Improve low-performing content
    // - Generate content recommendations
  }
}

class PublishingWorkflow {
  async publishContent(contentId: string, version: string): Promise<void> {
    logger.info(`Publishing content`, { contentId, version })

    // TODO: Implement publishing workflow
    // - Content validation
    // - Approval process
    // - Deployment to production
    // - Cache invalidation
    // - Analytics setup
  }
}

interface SearchIndexEntry {
  contentId: string
  title: string
  description: string
  content: string
  tags: string[]
  type: string
  priority: string
  lastIndexed: Date
}

// Export singleton instance
export const helpContentManager = new HelpContentManager()
