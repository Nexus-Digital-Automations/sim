/**
 * Context Analysis System
 *
 * Sophisticated natural language processing and context analysis engine
 * that extracts intent, entities, and patterns from conversations to
 * inform intelligent tool recommendations.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ContextMessage,
  ConversationContext,
  EntityType,
  ExtractedEntity,
  IntentClassification,
  SentimentAnalysis,
  TaskType,
} from './types'

const logger = createLogger('ContextAnalyzer')

export class ContextAnalyzer {
  private intentPatterns: Map<string, RegExp[]>
  private entityPatterns: Map<EntityType, RegExp[]>
  private taskKeywords: Map<TaskType, string[]>
  private domainKeywords: Map<string, string[]>

  constructor() {
    this.initializePatterns()
  }

  /**
   * Analyze conversation context to extract intent, entities, and patterns
   */
  async analyzeContext(context: ConversationContext): Promise<ConversationContext> {
    logger.info(`Analyzing context for conversation ${context.id}`)

    const analyzedMessages = await Promise.all(
      context.messages.map((message) => this.analyzeMessage(message, context))
    )

    return {
      ...context,
      messages: analyzedMessages,
      updatedAt: new Date(),
    }
  }

  /**
   * Analyze individual message for intent, entities, and sentiment
   */
  private async analyzeMessage(
    message: ContextMessage,
    context: ConversationContext
  ): Promise<ContextMessage> {
    if (message.role === 'system') {
      return message
    }

    const intent = await this.classifyIntent(message.content, context)
    const entities = this.extractEntities(message.content)
    const sentiment = this.analyzeSentiment(message.content)

    return {
      ...message,
      metadata: {
        ...message.metadata,
        intent,
        entities,
        sentiment,
      },
    }
  }

  /**
   * Classify user intent from message content
   */
  private async classifyIntent(
    content: string,
    context: ConversationContext
  ): Promise<IntentClassification> {
    const normalizedContent = content.toLowerCase()
    const words = normalizedContent.split(/\s+/)

    // Primary intent classification
    const intentScores = new Map<string, number>()

    for (const [intent, patterns] of this.intentPatterns) {
      let score = 0
      for (const pattern of patterns) {
        if (pattern.test(normalizedContent)) {
          score += 1
        }
      }
      if (score > 0) {
        intentScores.set(intent, score)
      }
    }

    // Find primary intent
    let primaryIntent = 'general_query'
    let maxScore = 0
    for (const [intent, score] of intentScores) {
      if (score > maxScore) {
        maxScore = score
        primaryIntent = intent
      }
    }

    // Secondary intents
    const secondary = Array.from(intentScores.entries())
      .filter(([intent, score]) => intent !== primaryIntent && score > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([intent, score]) => ({
        intent,
        confidence: Math.min(score / maxScore, 1),
      }))

    // Extract domains and tasks
    const domains = this.extractDomains(normalizedContent)
    const tasks = this.extractTasks(normalizedContent)

    return {
      primary: primaryIntent,
      confidence: Math.min(maxScore / 3, 1), // Normalize to 0-1
      secondary,
      domains,
      tasks,
    }
  }

  /**
   * Extract named entities from text
   */
  private extractEntities(content: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = []
    const normalizedContent = content.toLowerCase()

    for (const [entityType, patterns] of this.entityPatterns) {
      for (const pattern of patterns) {
        const matches = [...normalizedContent.matchAll(pattern)]
        for (const match of matches) {
          if (match.index !== undefined) {
            entities.push({
              type: entityType,
              value: match[0],
              confidence: 0.8, // Base confidence
              startIndex: match.index,
              endIndex: match.index + match[0].length,
            })
          }
        }
      }
    }

    return entities
  }

  /**
   * Analyze sentiment of message
   */
  private analyzeSentiment(content: string): SentimentAnalysis {
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'perfect',
      'amazing',
      'love',
      'like',
      'helpful',
      'useful',
      'efficient',
      'fast',
      'easy',
      'simple',
      'clear',
    ]
    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'hate',
      'dislike',
      'slow',
      'difficult',
      'hard',
      'confusing',
      'broken',
      'error',
      'problem',
      'issue',
      'fail',
    ]

    const words = content.toLowerCase().split(/\s+/)
    let positiveCount = 0
    let negativeCount = 0

    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++
      if (negativeWords.includes(word)) negativeCount++
    }

    const totalSentimentWords = positiveCount + negativeCount
    const polarity =
      totalSentimentWords > 0 ? (positiveCount - negativeCount) / totalSentimentWords : 0

    return {
      polarity,
      confidence:
        totalSentimentWords > 0 ? Math.min((totalSentimentWords / words.length) * 10, 1) : 0.1,
      emotions: this.extractEmotions(content),
    }
  }

  /**
   * Extract emotional indicators
   */
  private extractEmotions(content: string): Array<{ emotion: string; intensity: number }> {
    const emotionPatterns = {
      frustration: /\b(frustrated|annoying|irritating|stuck)\b/gi,
      excitement: /\b(excited|awesome|fantastic|wonderful)\b/gi,
      confusion: /\b(confused|unclear|don't understand|not sure)\b/gi,
      satisfaction: /\b(satisfied|happy|pleased|working)\b/gi,
      urgency: /\b(urgent|asap|quickly|immediately|now)\b/gi,
    }

    const emotions: Array<{ emotion: string; intensity: number }> = []

    for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
      const matches = content.match(pattern)
      if (matches) {
        emotions.push({
          emotion,
          intensity: Math.min(matches.length / 5, 1),
        })
      }
    }

    return emotions
  }

  /**
   * Extract domain context from content
   */
  private extractDomains(content: string): string[] {
    const domains = new Set<string>()

    for (const [domain, keywords] of this.domainKeywords) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          domains.add(domain)
        }
      }
    }

    return Array.from(domains)
  }

  /**
   * Extract task types from content
   */
  private extractTasks(content: string): TaskType[] {
    const tasks = new Set<TaskType>()

    for (const [task, keywords] of this.taskKeywords) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          tasks.add(task)
        }
      }
    }

    return Array.from(tasks)
  }

  /**
   * Get contextual insights from conversation history
   */
  getContextualInsights(context: ConversationContext): {
    dominantIntents: string[]
    commonEntities: ExtractedEntity[]
    sentimentTrend: number
    conversationFlow: string[]
    recommendationTriggers: string[]
  } {
    const intents = new Map<string, number>()
    const entities = new Map<string, ExtractedEntity[]>()
    const sentiments: number[] = []
    const flow: string[] = []

    for (const message of context.messages) {
      if (message.metadata?.intent) {
        const intent = message.metadata.intent.primary
        intents.set(intent, (intents.get(intent) || 0) + 1)
        flow.push(intent)
      }

      if (message.metadata?.entities) {
        for (const entity of message.metadata.entities) {
          const key = `${entity.type}:${entity.value}`
          if (!entities.has(key)) {
            entities.set(key, [])
          }
          entities.get(key)!.push(entity)
        }
      }

      if (message.metadata?.sentiment) {
        sentiments.push(message.metadata.sentiment.polarity)
      }
    }

    // Calculate sentiment trend
    const sentimentTrend =
      sentiments.length > 1 ? sentiments[sentiments.length - 1] - sentiments[0] : 0

    // Get dominant intents
    const dominantIntents = Array.from(intents.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([intent]) => intent)

    // Get common entities
    const commonEntities = Array.from(entities.values())
      .filter((entityList) => entityList.length > 1)
      .map((entityList) => entityList[0])

    // Identify recommendation triggers
    const triggers: string[] = []
    if (sentiments.some((s) => s < -0.5)) triggers.push('user_frustration')
    if (intents.has('data_query') && intents.has('integration_request'))
      triggers.push('workflow_opportunity')
    if (flow.includes('help_request')) triggers.push('guidance_needed')

    return {
      dominantIntents,
      commonEntities,
      sentimentTrend,
      conversationFlow: flow,
      recommendationTriggers: triggers,
    }
  }

  /**
   * Initialize pattern recognition systems
   */
  private initializePatterns(): void {
    // Intent patterns
    this.intentPatterns = new Map([
      ['data_query', [/\b(get|fetch|retrieve|find|search|query|data)\b/gi]],
      ['data_manipulation', [/\b(update|insert|delete|modify|change|edit)\b/gi]],
      ['integration_request', [/\b(connect|integrate|sync|link|combine)\b/gi]],
      ['automation_request', [/\b(automate|schedule|trigger|workflow)\b/gi]],
      ['help_request', [/\b(help|how|what|explain|guide|tutorial)\b/gi]],
      ['error_report', [/\b(error|problem|issue|broken|not working|fail)\b/gi]],
      ['performance_query', [/\b(slow|fast|performance|speed|optimize)\b/gi]],
      ['communication_task', [/\b(send|email|message|notify|alert)\b/gi]],
      ['file_operation', [/\b(file|document|upload|download|parse|convert)\b/gi]],
      ['analysis_request', [/\b(analyze|report|dashboard|metrics|stats)\b/gi]],
    ])

    // Entity patterns
    this.entityPatterns = new Map([
      ['database', [/\b(postgres|mysql|mongodb|supabase|database|db|table|collection)\b/gi]],
      ['api_service', [/\b(api|rest|graphql|webhook|endpoint|service)\b/gi]],
      ['file_type', [/\b\.(pdf|docx?|xlsx?|csv|json|xml|txt|png|jpg|jpeg|gif)\b/gi]],
      ['email', [/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi]],
      ['url', [/https?:\/\/[^\s]+/gi]],
      ['date', [/\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/gi]],
      ['number', [/\b\d+(?:\.\d+)?\b/gi]],
    ])

    // Task keywords
    this.taskKeywords = new Map([
      ['data_retrieval', ['get', 'fetch', 'find', 'search', 'query', 'read']],
      ['data_analysis', ['analyze', 'report', 'dashboard', 'metrics', 'stats', 'insights']],
      ['communication', ['send', 'email', 'message', 'notify', 'alert', 'chat']],
      ['file_processing', ['file', 'upload', 'download', 'parse', 'convert', 'document']],
      ['automation', ['automate', 'schedule', 'trigger', 'workflow', 'routine']],
      ['integration', ['connect', 'integrate', 'sync', 'link', 'combine', 'merge']],
      ['reporting', ['report', 'summary', 'dashboard', 'export', 'generate']],
      ['monitoring', ['monitor', 'track', 'watch', 'alert', 'status', 'health']],
      ['search', ['search', 'find', 'lookup', 'discover', 'explore']],
      ['transformation', ['transform', 'convert', 'format', 'process', 'modify']],
    ])

    // Domain keywords
    this.domainKeywords = new Map([
      ['sales', ['crm', 'lead', 'prospect', 'deal', 'pipeline', 'revenue']],
      ['marketing', ['campaign', 'content', 'social', 'seo', 'analytics', 'engagement']],
      ['finance', ['invoice', 'payment', 'budget', 'expense', 'revenue', 'accounting']],
      ['hr', ['employee', 'hiring', 'onboarding', 'performance', 'payroll', 'benefits']],
      ['development', ['code', 'github', 'deploy', 'build', 'test', 'repository']],
      ['operations', ['server', 'infrastructure', 'monitoring', 'backup', 'security']],
      ['support', ['ticket', 'customer', 'issue', 'resolution', 'help', 'support']],
      ['data', ['database', 'analytics', 'report', 'visualization', 'insights', 'metrics']],
    ])

    logger.info('Context analysis patterns initialized successfully')
  }

  /**
   * Update patterns based on new data (for continuous learning)
   */
  updatePatterns(
    newIntentPatterns?: Map<string, RegExp[]>,
    newEntityPatterns?: Map<EntityType, RegExp[]>
  ): void {
    if (newIntentPatterns) {
      for (const [intent, patterns] of newIntentPatterns) {
        const existing = this.intentPatterns.get(intent) || []
        this.intentPatterns.set(intent, [...existing, ...patterns])
      }
    }

    if (newEntityPatterns) {
      for (const [entityType, patterns] of newEntityPatterns) {
        const existing = this.entityPatterns.get(entityType) || []
        this.entityPatterns.set(entityType, [...existing, ...patterns])
      }
    }

    logger.info('Context analysis patterns updated')
  }
}

export const contextAnalyzer = new ContextAnalyzer()
