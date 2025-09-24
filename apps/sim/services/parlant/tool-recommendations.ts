/**
 * Advanced Tool Recommendation System
 * ====================================
 *
 * This module provides intelligent tool recommendations based on:
 * - Natural language processing of user queries
 * - Conversation context and history analysis
 * - User behavior patterns and preferences
 * - Workflow state and available data
 * - Real-time learning from user interactions
 *
 * Features:
 * - Intent recognition and entity extraction
 * - Context-aware scoring algorithms
 * - Personalized recommendations
 * - Real-time suggestion refinement
 * - A/B testing for recommendation strategies
 */

import type {
  ToolRecommendationContext,
  ToolRecommendation,
  EnhancedToolDescription
} from './tool-adapter'
import { toolRegistry, intelligenceEngine } from './tool-adapter'
import type { AuthContext } from './types'

// =============================================
// Intent Recognition System
// =============================================

/**
 * Recognized user intents for tool recommendations
 */
export type UserIntent =
  | 'send_email'
  | 'read_email'
  | 'send_message'
  | 'make_api_call'
  | 'process_data'
  | 'transform_data'
  | 'store_data'
  | 'retrieve_data'
  | 'generate_content'
  | 'schedule_task'
  | 'notify_team'
  | 'analyze_data'
  | 'export_data'
  | 'import_data'
  | 'automate_workflow'
  | 'integrate_service'
  | 'search_information'
  | 'create_document'
  | 'share_file'
  | 'custom_logic'

/**
 * Entity types that can be extracted from user input
 */
export interface ExtractedEntity {
  type: 'email' | 'url' | 'file' | 'date' | 'number' | 'service' | 'action'
  value: string
  confidence: number
  position: { start: number; end: number }
}

/**
 * Intent recognition result
 */
export interface IntentRecognitionResult {
  primaryIntent: UserIntent
  confidence: number
  secondaryIntents: Array<{ intent: UserIntent; confidence: number }>
  entities: ExtractedEntity[]
  keywords: string[]
  complexity: 'simple' | 'moderate' | 'complex'
}

/**
 * Natural Language Intent Recognizer
 */
export class IntentRecognizer {
  private intentPatterns: Map<UserIntent, Array<{ pattern: RegExp; weight: number }>> = new Map()
  private entityPatterns: Map<string, RegExp> = new Map()

  constructor() {
    this.initializePatterns()
  }

  /**
   * Analyze user input to extract intents and entities
   */
  analyzeInput(input: string): IntentRecognitionResult {
    const normalizedInput = input.toLowerCase().trim()
    const words = normalizedInput.split(/\s+/)

    // Extract entities first
    const entities = this.extractEntities(input)

    // Recognize intents
    const intentScores = new Map<UserIntent, number>()

    for (const [intent, patterns] of this.intentPatterns.entries()) {
      let score = 0

      for (const { pattern, weight } of patterns) {
        if (pattern.test(normalizedInput)) {
          score += weight
        }
      }

      // Boost scores based on entities
      if (intent === 'send_email' && entities.some(e => e.type === 'email')) {
        score += 0.3
      }
      if (intent === 'make_api_call' && entities.some(e => e.type === 'url')) {
        score += 0.3
      }

      if (score > 0) {
        intentScores.set(intent, score)
      }
    }

    // Sort intents by score
    const sortedIntents = Array.from(intentScores.entries())
      .sort((a, b) => b[1] - a[1])

    const primaryIntent = sortedIntents[0]?.[0] || 'custom_logic'
    const primaryConfidence = Math.min(sortedIntents[0]?.[1] || 0, 1.0)

    const secondaryIntents = sortedIntents
      .slice(1, 4)
      .map(([intent, score]) => ({
        intent,
        confidence: Math.min(score, 1.0)
      }))

    // Extract keywords
    const keywords = this.extractKeywords(normalizedInput)

    // Determine complexity
    const complexity = this.determineComplexity(input, entities, intentScores)

    return {
      primaryIntent,
      confidence: primaryConfidence,
      secondaryIntents,
      entities,
      keywords,
      complexity
    }
  }

  /**
   * Initialize intent recognition patterns
   */
  private initializePatterns(): void {
    this.intentPatterns.set('send_email', [
      { pattern: /send.*email|email.*to|compose.*email/i, weight: 0.8 },
      { pattern: /notify.*email|alert.*email/i, weight: 0.6 },
      { pattern: /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i, weight: 0.4 }
    ])

    this.intentPatterns.set('read_email', [
      { pattern: /read.*email|check.*email|get.*email/i, weight: 0.8 },
      { pattern: /inbox|messages.*from/i, weight: 0.6 }
    ])

    this.intentPatterns.set('send_message', [
      { pattern: /send.*message|message.*to|notify.*team/i, weight: 0.8 },
      { pattern: /slack|teams|chat|tell.*team/i, weight: 0.6 }
    ])

    this.intentPatterns.set('make_api_call', [
      { pattern: /api.*call|call.*api|http.*request|rest.*api/i, weight: 0.8 },
      { pattern: /fetch.*from|get.*from.*api|post.*to/i, weight: 0.6 },
      { pattern: /https?:\/\/[^\s]+/i, weight: 0.4 }
    ])

    this.intentPatterns.set('process_data', [
      { pattern: /process.*data|analyze.*data|work.*with.*data/i, weight: 0.8 },
      { pattern: /calculate|compute|transform|filter/i, weight: 0.6 }
    ])

    this.intentPatterns.set('store_data', [
      { pattern: /save.*data|store.*data|database|persist/i, weight: 0.8 },
      { pattern: /sql|mongodb|mysql|postgres/i, weight: 0.6 }
    ])

    this.intentPatterns.set('generate_content', [
      { pattern: /generate|create.*content|write|compose/i, weight: 0.8 },
      { pattern: /document|report|template/i, weight: 0.6 }
    ])

    this.intentPatterns.set('schedule_task', [
      { pattern: /schedule|later|delay|timer|cron/i, weight: 0.8 },
      { pattern: /every.*day|weekly|monthly/i, weight: 0.6 }
    ])

    this.intentPatterns.set('search_information', [
      { pattern: /search|find|lookup|query/i, weight: 0.8 },
      { pattern: /google|wikipedia|web.*search/i, weight: 0.6 }
    ])

    // Entity patterns
    this.entityPatterns.set('email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g)
    this.entityPatterns.set('url', /https?:\/\/[^\s]+/g)
    this.entityPatterns.set('file', /\.[a-zA-Z0-9]{2,4}(?:\s|$)/g)
    this.entityPatterns.set('date', /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/g)
    this.entityPatterns.set('number', /\b\d+(?:\.\d+)?\b/g)
  }

  /**
   * Extract entities from user input
   */
  private extractEntities(input: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = []

    for (const [type, pattern] of this.entityPatterns.entries()) {
      let match
      const regex = new RegExp(pattern)

      while ((match = regex.exec(input)) !== null) {
        entities.push({
          type: type as ExtractedEntity['type'],
          value: match[0],
          confidence: 0.9,
          position: {
            start: match.index,
            end: match.index + match[0].length
          }
        })
      }
    }

    return entities
  }

  /**
   * Extract relevant keywords from input
   */
  private extractKeywords(input: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
    const words = input.toLowerCase().match(/\b\w+\b/g) || []

    return words
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .slice(0, 10) // Limit to 10 keywords
  }

  /**
   * Determine complexity of the user's request
   */
  private determineComplexity(
    input: string,
    entities: ExtractedEntity[],
    intentScores: Map<UserIntent, number>
  ): 'simple' | 'moderate' | 'complex' {
    let complexityScore = 0

    // Multiple intents increase complexity
    const intentCount = intentScores.size
    if (intentCount > 3) complexityScore += 2
    else if (intentCount > 1) complexityScore += 1

    // Multiple entities increase complexity
    if (entities.length > 5) complexityScore += 2
    else if (entities.length > 2) complexityScore += 1

    // Long inputs tend to be more complex
    const wordCount = input.split(/\s+/).length
    if (wordCount > 50) complexityScore += 2
    else if (wordCount > 20) complexityScore += 1

    // Conditional language increases complexity
    if (/if|when|unless|depending|based on|according to/i.test(input)) {
      complexityScore += 2
    }

    // Integration keywords increase complexity
    if (/integrate|connect|sync|workflow|automation|pipeline/i.test(input)) {
      complexityScore += 1
    }

    if (complexityScore >= 4) return 'complex'
    if (complexityScore >= 2) return 'moderate'
    return 'simple'
  }
}

// =============================================
// Context-Aware Recommendation Engine
// =============================================

/**
 * Advanced recommendation engine with learning capabilities
 */
export class AdvancedRecommendationEngine {
  private intentRecognizer = new IntentRecognizer()
  private userInteractionHistory: Map<string, UserInteractionSession[]> = new Map()
  private recommendationFeedback: Map<string, RecommendationFeedback[]> = new Map()

  /**
   * Get tool recommendations with natural language processing
   */
  async getRecommendations(
    userQuery: string,
    context: ToolRecommendationContext,
    authContext: AuthContext,
    options?: RecommendationOptions
  ): Promise<SmartRecommendationResult> {
    // Analyze user input
    const intentAnalysis = this.intentRecognizer.analyzeInput(userQuery)

    // Enhance context with intent analysis
    const enhancedContext: ToolRecommendationContext = {
      ...context,
      userIntents: [
        ...context.userIntents,
        intentAnalysis.primaryIntent,
        ...intentAnalysis.secondaryIntents.map(si => si.intent)
      ]
    }

    // Get base recommendations from intelligence engine
    const baseRecommendations = intelligenceEngine.recommendTools(
      enhancedContext,
      options?.maxRecommendations || 5
    )

    // Apply advanced scoring
    const scoredRecommendations = await this.applyAdvancedScoring(
      baseRecommendations,
      intentAnalysis,
      enhancedContext,
      authContext
    )

    // Generate explanations
    const explanations = this.generateRecommendationExplanations(
      scoredRecommendations,
      intentAnalysis,
      enhancedContext
    )

    // Track interaction for learning
    this.trackUserInteraction(authContext.user_id, {
      query: userQuery,
      intent: intentAnalysis,
      context: enhancedContext,
      recommendations: scoredRecommendations,
      timestamp: new Date()
    })

    return {
      query: userQuery,
      intentAnalysis,
      recommendations: scoredRecommendations,
      explanations,
      confidence: this.calculateOverallConfidence(scoredRecommendations),
      suggestions: this.generateUsageSuggestions(scoredRecommendations, intentAnalysis),
      alternatives: await this.findAlternativeApproaches(intentAnalysis, enhancedContext)
    }
  }

  /**
   * Apply advanced scoring algorithms
   */
  private async applyAdvancedScoring(
    baseRecommendations: ToolRecommendation[],
    intentAnalysis: IntentRecognitionResult,
    context: ToolRecommendationContext,
    authContext: AuthContext
  ): Promise<ToolRecommendation[]> {
    const userHistory = this.getUserHistory(authContext.user_id)

    return baseRecommendations.map(rec => {
      let adjustedConfidence = rec.confidence

      // Intent match bonus
      if (this.toolMatchesIntent(rec.tool, intentAnalysis.primaryIntent)) {
        adjustedConfidence *= 1.3
      }

      // User history bonus
      const historyBonus = this.calculateHistoryBonus(rec.tool, userHistory)
      adjustedConfidence += historyBonus

      // Complexity match adjustment
      const complexityMatch = this.calculateComplexityMatch(rec.tool, intentAnalysis.complexity)
      adjustedConfidence *= complexityMatch

      // Entity relevance bonus
      const entityBonus = this.calculateEntityRelevance(rec.tool, intentAnalysis.entities)
      adjustedConfidence += entityBonus

      // Feedback learning adjustment
      const feedbackAdjustment = this.applyFeedbackLearning(rec.tool, authContext.user_id)
      adjustedConfidence *= feedbackAdjustment

      return {
        ...rec,
        confidence: Math.min(adjustedConfidence, 1.0)
      }
    }).sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Check if a tool matches a specific intent
   */
  private toolMatchesIntent(tool: EnhancedToolDescription, intent: UserIntent): boolean {
    const intentToolMap: Record<UserIntent, string[]> = {
      send_email: ['gmail', 'email', 'mail', 'outlook'],
      send_message: ['slack', 'teams', 'discord', 'telegram', 'whatsapp'],
      make_api_call: ['api', 'http', 'webhook'],
      process_data: ['function', 'evaluator', 'transform'],
      store_data: ['mysql', 'postgresql', 'mongodb', 'supabase', 'airtable'],
      generate_content: ['openai', 'function', 'vision', 'image_generator'],
      search_information: ['google', 'serper', 'wikipedia', 'exa', 'perplexity'],
      schedule_task: ['schedule', 'cron'],
      read_email: ['gmail', 'outlook'],
      transform_data: ['function', 'evaluator'],
      retrieve_data: ['api', 'mysql', 'postgresql', 'mongodb', 'airtable'],
      notify_team: ['slack', 'teams', 'discord'],
      analyze_data: ['function', 'evaluator', 'openai'],
      export_data: ['google_sheets', 'microsoft_excel', 's3', 'file'],
      import_data: ['file', 's3', 'google_sheets', 'microsoft_excel'],
      automate_workflow: ['schedule', 'webhook', 'function'],
      integrate_service: ['api', 'webhook', 'function'],
      create_document: ['google_docs', 'notion', 'confluence'],
      share_file: ['google_drive', 's3', 'onedrive', 'sharepoint'],
      custom_logic: ['function', 'evaluator']
    }

    const relevantTools = intentToolMap[intent] || []
    return relevantTools.some(toolName => tool.id.includes(toolName))
  }

  /**
   * Calculate bonus based on user's historical tool usage
   */
  private calculateHistoryBonus(tool: EnhancedToolDescription, history: UserInteractionSession[]): number {
    const recentHistory = history.slice(-10) // Last 10 interactions
    const toolUsageCount = recentHistory.filter(session =>
      session.recommendations.some(rec => rec.tool.id === tool.id)
    ).length

    return Math.min(toolUsageCount * 0.05, 0.2) // Max 20% bonus
  }

  /**
   * Calculate how well tool complexity matches query complexity
   */
  private calculateComplexityMatch(tool: EnhancedToolDescription, queryComplexity: 'simple' | 'moderate' | 'complex'): number {
    const complexityScores = {
      simple: { simple: 1.0, moderate: 0.8, complex: 0.6 },
      moderate: { simple: 0.9, moderate: 1.0, complex: 0.9 },
      complex: { simple: 0.7, moderate: 0.9, complex: 1.0 }
    }

    return complexityScores[tool.complexity][queryComplexity] || 0.8
  }

  /**
   * Calculate bonus based on entity relevance
   */
  private calculateEntityRelevance(tool: EnhancedToolDescription, entities: ExtractedEntity[]): number {
    let bonus = 0

    for (const entity of entities) {
      switch (entity.type) {
        case 'email':
          if (tool.id.includes('mail') || tool.id.includes('email')) bonus += 0.1
          break
        case 'url':
          if (tool.id.includes('api') || tool.id.includes('http')) bonus += 0.1
          break
        case 'file':
          if (tool.id.includes('file') || tool.id.includes('drive') || tool.id.includes('s3')) bonus += 0.1
          break
        case 'date':
          if (tool.id.includes('schedule') || tool.id.includes('calendar')) bonus += 0.1
          break
      }
    }

    return Math.min(bonus, 0.3) // Max 30% bonus
  }

  /**
   * Apply learning from user feedback
   */
  private applyFeedbackLearning(tool: EnhancedToolDescription, userId: string): number {
    const feedback = this.recommendationFeedback.get(userId) || []
    const toolFeedback = feedback.filter(f => f.toolId === tool.id)

    if (toolFeedback.length === 0) return 1.0

    const positiveCount = toolFeedback.filter(f => f.rating >= 4).length
    const totalCount = toolFeedback.length
    const positiveRatio = positiveCount / totalCount

    // Adjust confidence based on feedback ratio
    return 0.7 + (positiveRatio * 0.6) // Range: 0.7 to 1.3
  }

  /**
   * Generate explanations for recommendations
   */
  private generateRecommendationExplanations(
    recommendations: ToolRecommendation[],
    intentAnalysis: IntentRecognitionResult,
    context: ToolRecommendationContext
  ): RecommendationExplanation[] {
    return recommendations.map((rec, index) => ({
      toolId: rec.tool.id,
      rank: index + 1,
      primaryReason: this.getPrimaryReason(rec.tool, intentAnalysis),
      supportingReasons: this.getSupportingReasons(rec.tool, intentAnalysis, context),
      confidenceExplanation: this.explainConfidence(rec.confidence),
      quickStartTips: this.generateQuickStartTips(rec.tool, intentAnalysis)
    }))
  }

  /**
   * Get primary reason for recommendation
   */
  private getPrimaryReason(tool: EnhancedToolDescription, intentAnalysis: IntentRecognitionResult): string {
    if (this.toolMatchesIntent(tool, intentAnalysis.primaryIntent)) {
      return `Perfect match for ${intentAnalysis.primaryIntent.replace('_', ' ')}`
    }

    if (intentAnalysis.entities.length > 0) {
      const relevantEntity = intentAnalysis.entities.find(entity => {
        switch (entity.type) {
          case 'email': return tool.id.includes('mail')
          case 'url': return tool.id.includes('api')
          case 'file': return tool.id.includes('file') || tool.id.includes('drive')
          default: return false
        }
      })

      if (relevantEntity) {
        return `Handles ${relevantEntity.type} operations like "${relevantEntity.value}"`
      }
    }

    return `Commonly used for similar tasks`
  }

  /**
   * Get supporting reasons for recommendation
   */
  private getSupportingReasons(
    tool: EnhancedToolDescription,
    intentAnalysis: IntentRecognitionResult,
    context: ToolRecommendationContext
  ): string[] {
    const reasons: string[] = []

    // Difficulty match
    if (context.userProfile?.skillLevel === tool.difficulty) {
      reasons.push(`Matches your ${tool.difficulty} skill level`)
    }

    // Keyword matches
    const matchingKeywords = intentAnalysis.keywords.filter(keyword =>
      tool.tags.some(tag => tag.includes(keyword) || keyword.includes(tag))
    )
    if (matchingKeywords.length > 0) {
      reasons.push(`Related to: ${matchingKeywords.join(', ')}`)
    }

    // Previous usage
    if (context.userProfile?.frequentlyUsedTools?.includes(tool.id)) {
      reasons.push(`You've used this tool successfully before`)
    }

    return reasons.slice(0, 3) // Limit to 3 supporting reasons
  }

  /**
   * Explain confidence level
   */
  private explainConfidence(confidence: number): string {
    if (confidence >= 0.8) return 'Highly confident this will solve your problem'
    if (confidence >= 0.6) return 'Good match for your requirements'
    if (confidence >= 0.4) return 'Might be helpful depending on your specific needs'
    return 'Worth considering as an alternative approach'
  }

  /**
   * Generate quick start tips
   */
  private generateQuickStartTips(tool: EnhancedToolDescription, intentAnalysis: IntentRecognitionResult): string[] {
    const tips: string[] = []

    // Add tool-specific quick tips
    if (tool.difficulty === 'beginner') {
      tips.push('This is beginner-friendly - just fill in the required fields')
    }

    if (tool.complexity === 'simple') {
      tips.push('Quick to set up - should only take a minute')
    }

    // Add entity-specific tips
    for (const entity of intentAnalysis.entities) {
      if (entity.type === 'email' && tool.id.includes('mail')) {
        tips.push(`Use "${entity.value}" as the recipient`)
      }
      if (entity.type === 'url' && tool.id.includes('api')) {
        tips.push(`Start with URL: ${entity.value}`)
      }
    }

    return tips.slice(0, 2) // Limit to 2 tips
  }

  /**
   * Calculate overall confidence in recommendations
   */
  private calculateOverallConfidence(recommendations: ToolRecommendation[]): number {
    if (recommendations.length === 0) return 0

    const topConfidence = recommendations[0]?.confidence || 0
    const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length

    // Weight towards top recommendation but consider overall quality
    return (topConfidence * 0.7) + (avgConfidence * 0.3)
  }

  /**
   * Generate usage suggestions
   */
  private generateUsageSuggestions(
    recommendations: ToolRecommendation[],
    intentAnalysis: IntentRecognitionResult
  ): string[] {
    const suggestions: string[] = []

    if (recommendations.length > 1) {
      suggestions.push(`Try "${recommendations[0].tool.name}" first - it has the highest confidence score`)
    }

    if (intentAnalysis.complexity === 'complex') {
      suggestions.push('Consider breaking this into multiple steps using simpler tools')
    }

    if (intentAnalysis.entities.length > 0) {
      suggestions.push('I noticed specific data in your request - tools are pre-configured where possible')
    }

    return suggestions
  }

  /**
   * Find alternative approaches
   */
  private async findAlternativeApproaches(
    intentAnalysis: IntentRecognitionResult,
    context: ToolRecommendationContext
  ): Promise<AlternativeApproach[]> {
    const alternatives: AlternativeApproach[] = []

    // Suggest breaking complex tasks into steps
    if (intentAnalysis.complexity === 'complex') {
      alternatives.push({
        approach: 'multi-step',
        description: 'Break this into multiple simpler steps',
        benefits: ['Easier to debug', 'More reliable', 'Reusable components'],
        tools: ['function', 'api', 'slack'] // Example tools for steps
      })
    }

    // Suggest automation for repetitive tasks
    if (intentAnalysis.keywords.includes('every') || intentAnalysis.keywords.includes('daily')) {
      alternatives.push({
        approach: 'automation',
        description: 'Set up automated workflow to run this regularly',
        benefits: ['Saves time', 'Consistent execution', 'Reduces errors'],
        tools: ['schedule', 'webhook']
      })
    }

    return alternatives
  }

  /**
   * Track user interaction for learning
   */
  private trackUserInteraction(userId: string, session: UserInteractionSession): void {
    if (!this.userInteractionHistory.has(userId)) {
      this.userInteractionHistory.set(userId, [])
    }

    const sessions = this.userInteractionHistory.get(userId)!
    sessions.push(session)

    // Keep only last 100 sessions per user
    if (sessions.length > 100) {
      sessions.splice(0, sessions.length - 100)
    }
  }

  /**
   * Get user interaction history
   */
  private getUserHistory(userId: string): UserInteractionSession[] {
    return this.userInteractionHistory.get(userId) || []
  }

  /**
   * Record feedback on recommendations
   */
  recordFeedback(userId: string, feedback: RecommendationFeedback): void {
    if (!this.recommendationFeedback.has(userId)) {
      this.recommendationFeedback.set(userId, [])
    }

    this.recommendationFeedback.get(userId)!.push(feedback)
  }
}

// =============================================
// Types for Advanced Features
// =============================================

export interface RecommendationOptions {
  maxRecommendations?: number
  includeAlternatives?: boolean
  personalized?: boolean
  realTime?: boolean
}

export interface SmartRecommendationResult {
  query: string
  intentAnalysis: IntentRecognitionResult
  recommendations: ToolRecommendation[]
  explanations: RecommendationExplanation[]
  confidence: number
  suggestions: string[]
  alternatives: AlternativeApproach[]
}

export interface RecommendationExplanation {
  toolId: string
  rank: number
  primaryReason: string
  supportingReasons: string[]
  confidenceExplanation: string
  quickStartTips: string[]
}

export interface AlternativeApproach {
  approach: string
  description: string
  benefits: string[]
  tools: string[]
}

export interface UserInteractionSession {
  query: string
  intent: IntentRecognitionResult
  context: ToolRecommendationContext
  recommendations: ToolRecommendation[]
  timestamp: Date
  selectedTool?: string
  completionTime?: number
  success?: boolean
}

export interface RecommendationFeedback {
  toolId: string
  query: string
  rating: number // 1-5 scale
  comment?: string
  timestamp: Date
  helpful: boolean
  used: boolean
}

// =============================================
// Export singleton instance
// =============================================

export const recommendationEngine = new AdvancedRecommendationEngine()