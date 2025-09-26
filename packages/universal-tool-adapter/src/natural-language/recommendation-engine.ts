/**
 * Tool Recommendation Engine
 *
 * Intelligent system for recommending appropriate tools based on conversation
 * context, user intent, and historical patterns.
 *
 * @author NATURAL_LANGUAGE_ENGINE_AGENT
 * @version 1.0.0
 */

import type { DiscoveredTool, ToolDiscoveryQuery } from '../types/adapter-interfaces'
import type { ToolConfig } from '../types/tools-types'
import type { ConversationMessage, ToolRecommendation, UsageContext } from './usage-guidelines'

// =============================================================================
// Recommendation Types
// =============================================================================

export interface RecommendationRequest {
  userMessage: string
  conversationContext: ConversationMessage[]
  userContext: UsageContext
  availableTools: string[]
  maxRecommendations?: number
  includeAlternatives?: boolean
}

export interface ToolRecommendationWithDetails extends ToolRecommendation {
  tool: ToolConfig
  naturalLanguageDescription: string
  usageInstructions: string[]
  exampleUsage: ConversationExample[]
  relevanceScore: number
  confidenceFactors: {
    intentMatch: number
    contextualFit: number
    historicalUsage: number
    userPreference: number
    situationalRelevance: number
  }
}

export interface ConversationExample {
  userInput: string
  agentResponse: string
  toolCall: {
    name: string
    parameters: Record<string, any>
  }
  outcome: string
}

export interface RecommendationEngine {
  // Core recommendation methods
  recommendTools(request: RecommendationRequest): Promise<ToolRecommendationWithDetails[]>
  explainRecommendation(toolId: string, context: UsageContext): Promise<RecommendationExplanation>

  // Learning and adaptation
  recordToolUsage(toolId: string, context: UsageContext, success: boolean): Promise<void>
  adaptToUserFeedback(
    recommendations: ToolRecommendationWithDetails[],
    feedback: UserFeedback
  ): Promise<void>

  // Discovery and search
  discoverTools(query: ToolDiscoveryQuery, context: UsageContext): Promise<DiscoveredTool[]>
  suggestToolCombinations(primaryTool: string, context: UsageContext): Promise<ToolCombination[]>
}

export interface RecommendationExplanation {
  toolId: string
  primaryReason: string
  supportingReasons: string[]
  whenToUse: string
  whenNotToUse: string
  confidence: number
  similarTools: string[]
  prerequisites?: string[]
}

export interface UserFeedback {
  recommendations: Array<{
    toolId: string
    rating: 1 | 2 | 3 | 4 | 5
    used: boolean
    helpful: boolean
    comment?: string
  }>
  overallSatisfaction: 1 | 2 | 3 | 4 | 5
  additionalContext?: string
}

export interface ToolCombination {
  tools: string[]
  workflow: string
  description: string
  benefits: string[]
  complexity: 'simple' | 'moderate' | 'complex'
  estimatedTime: string
}

// =============================================================================
// Intent Analysis Engine
// =============================================================================

export interface IntentAnalysis {
  primary: string
  secondary: string[]
  confidence: number
  entities: Entity[]
  action: string
  target: string
  urgency: 'low' | 'medium' | 'high'
  complexity: 'simple' | 'moderate' | 'complex'
  domain: string
}

export interface Entity {
  type: string
  value: string
  confidence: number
  position: [number, number]
}

class IntentAnalysisEngine {
  private intentPatterns: Map<string, RegExp[]> = new Map()
  private domainClassifier: DomainClassifier = new DomainClassifier()
  private entityExtractor: EntityExtractor = new EntityExtractor()

  constructor() {
    this.loadIntentPatterns()
  }

  async analyzeIntent(
    message: string,
    conversationHistory: ConversationMessage[] = []
  ): Promise<IntentAnalysis> {
    // Analyze primary intent
    const intentScores = this.scoreIntents(message)
    const primary = this.getPrimaryIntent(intentScores)
    const secondary = this.getSecondaryIntents(intentScores, 0.3)

    // Extract entities
    const entities = await this.entityExtractor.extractEntities(message)

    // Analyze action and target
    const action = this.extractAction(message, primary)
    const target = this.extractTarget(message, entities)

    // Assess urgency and complexity
    const urgency = this.assessUrgency(message, conversationHistory)
    const complexity = this.assessComplexity(message, entities)

    // Classify domain
    const domain = await this.domainClassifier.classify(message, conversationHistory)

    return {
      primary,
      secondary,
      confidence: intentScores.get(primary) || 0,
      entities,
      action,
      target,
      urgency,
      complexity,
      domain,
    }
  }

  private loadIntentPatterns(): void {
    const patterns = {
      send_communication: [
        /send (?:an? )?(?:email|message|text)/i,
        /message (?:someone|them)/i,
        /compose (?:an? )?(?:email|message)/i,
        /write (?:an? )?(?:email|message)/i,
      ],
      search_information: [
        /search (?:for|about)/i,
        /find (?:information|data|results)/i,
        /look (?:up|for)/i,
        /research (?:about|on)/i,
        /discover/i,
      ],
      create_content: [
        /create (?:a|an)/i,
        /make (?:a|an)/i,
        /generate/i,
        /write (?:a|an)/i,
        /compose (?:a|an)/i,
      ],
      manage_data: [
        /(?:store|save|insert) (?:data|information)/i,
        /update (?:the )?(?:database|record|data)/i,
        /delete (?:the )?(?:record|data)/i,
        /query (?:the )?(?:database|data)/i,
      ],
      schedule_organize: [
        /schedule (?:a|an)/i,
        /book (?:a|an)/i,
        /organize/i,
        /plan (?:a|an)/i,
        /set up (?:a|an)/i,
      ],
      analyze_process: [
        /analyze/i,
        /process (?:the )?(?:data|information)/i,
        /calculate/i,
        /compute/i,
        /transform/i,
      ],
    }

    Object.entries(patterns).forEach(([intent, regexes]) => {
      this.intentPatterns.set(intent, regexes)
    })
  }

  private scoreIntents(message: string): Map<string, number> {
    const scores = new Map<string, number>()
    const lowerMessage = message.toLowerCase()

    this.intentPatterns.forEach((patterns, intent) => {
      let maxScore = 0

      patterns.forEach((pattern) => {
        const match = lowerMessage.match(pattern)
        if (match) {
          // Score based on match quality and position
          const score = this.calculateMatchScore(match, lowerMessage)
          maxScore = Math.max(maxScore, score)
        }
      })

      if (maxScore > 0) {
        scores.set(intent, maxScore)
      }
    })

    return scores
  }

  private calculateMatchScore(match: RegExpMatchArray, fullText: string): number {
    let score = 0.7 // Base score for any match

    // Boost score if match is near beginning of text
    const position = match.index || 0
    const positionBoost = Math.max(0, 0.3 * (1 - position / fullText.length))
    score += positionBoost

    // Boost score based on match length
    const lengthBoost = Math.min(0.2, match[0].length / 20)
    score += lengthBoost

    return Math.min(score, 1)
  }

  private getPrimaryIntent(scores: Map<string, number>): string {
    let maxScore = 0
    let primaryIntent = 'general'

    scores.forEach((score, intent) => {
      if (score > maxScore) {
        maxScore = score
        primaryIntent = intent
      }
    })

    return primaryIntent
  }

  private getSecondaryIntents(scores: Map<string, number>, threshold: number): string[] {
    return Array.from(scores.entries())
      .filter(([intent, score]) => score >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(1, 3) // Top 2 secondary intents
      .map(([intent]) => intent)
  }

  private extractAction(message: string, primaryIntent: string): string {
    const actionWords = message.match(
      /\b(?:send|create|make|find|search|update|delete|schedule|analyze|process)\b/i
    )
    return actionWords?.[0].toLowerCase() || this.getDefaultAction(primaryIntent)
  }

  private getDefaultAction(intent: string): string {
    const defaults: Record<string, string> = {
      send_communication: 'send',
      search_information: 'search',
      create_content: 'create',
      manage_data: 'manage',
      schedule_organize: 'schedule',
      analyze_process: 'analyze',
    }
    return defaults[intent] || 'execute'
  }

  private extractTarget(message: string, entities: Entity[]): string {
    // Look for target objects in entities or message
    const targetEntity = entities.find((e) =>
      ['email', 'document', 'database', 'calendar'].includes(e.type)
    )
    if (targetEntity) {
      return targetEntity.value
    }

    // Extract from common patterns
    const targetMatch = message.match(/(?:to|for|in|on|with) (?:the )?(\w+)/i)
    return targetMatch?.[1] || 'system'
  }

  private assessUrgency(
    message: string,
    history: ConversationMessage[]
  ): 'low' | 'medium' | 'high' {
    const urgentWords = /\b(?:urgent|asap|immediately|critical|emergency|now|quickly|fast)\b/i
    const timeWords = /\b(?:today|tonight|this morning|this afternoon)\b/i

    if (urgentWords.test(message)) return 'high'
    if (timeWords.test(message)) return 'medium'

    // Check for urgency in recent conversation
    const recentMessages = history.slice(-3)
    const hasUrgentContext = recentMessages.some((msg) => urgentWords.test(msg.content))

    return hasUrgentContext ? 'medium' : 'low'
  }

  private assessComplexity(message: string, entities: Entity[]): 'simple' | 'moderate' | 'complex' {
    let complexity = 0

    // Word count factor
    const wordCount = message.split(/\s+/).length
    complexity += Math.min(wordCount / 50, 1) * 0.3

    // Entity count factor
    complexity += Math.min(entities.length / 5, 1) * 0.3

    // Complex keywords
    const complexWords =
      /\b(?:multiple|several|complex|detailed|comprehensive|analyze|integrate|coordinate)\b/i
    if (complexWords.test(message)) complexity += 0.4

    if (complexity >= 0.7) return 'complex'
    if (complexity >= 0.4) return 'moderate'
    return 'simple'
  }
}

// =============================================================================
// Tool Scoring Engine
// =============================================================================

class ToolScoringEngine {
  private toolRegistry: Map<string, ToolConfig> = new Map()
  private usageHistory: Map<string, ToolUsageHistory> = new Map()
  private userProfiles: Map<string, UserProfile> = new Map()

  async scoreTools(
    availableTools: string[],
    intent: IntentAnalysis,
    context: UsageContext
  ): Promise<Map<string, ToolScore>> {
    const scores = new Map<string, ToolScore>()

    for (const toolId of availableTools) {
      const score = await this.scoreIndividualTool(toolId, intent, context)
      if (score.overall > 0.1) {
        // Minimum threshold
        scores.set(toolId, score)
      }
    }

    return scores
  }

  private async scoreIndividualTool(
    toolId: string,
    intent: IntentAnalysis,
    context: UsageContext
  ): Promise<ToolScore> {
    const tool = this.toolRegistry.get(toolId)
    if (!tool) {
      return { overall: 0, factors: {} as any }
    }

    const factors = {
      intentMatch: this.scoreIntentMatch(tool, intent),
      contextualFit: this.scoreContextualFit(tool, context),
      historicalUsage: this.scoreHistoricalUsage(toolId, context.userId),
      userPreference: this.scoreUserPreference(toolId, context),
      situationalRelevance: this.scoreSituationalRelevance(tool, intent, context),
    }

    const weights = {
      intentMatch: 0.35,
      contextualFit: 0.25,
      historicalUsage: 0.15,
      userPreference: 0.15,
      situationalRelevance: 0.1,
    }

    const overall = Object.entries(factors).reduce((sum, [key, value]) => {
      return sum + value * weights[key as keyof typeof weights]
    }, 0)

    return { overall, factors }
  }

  private scoreIntentMatch(tool: ToolConfig, intent: IntentAnalysis): number {
    // Score based on tool's alignment with user intent
    const toolCategory = this.classifyTool(tool)
    const intentMapping = this.getIntentToolMapping()

    const primaryMatch = intentMapping[intent.primary]?.includes(toolCategory) ? 0.8 : 0
    const secondaryMatch = intent.secondary.some((sec) =>
      intentMapping[sec]?.includes(toolCategory)
    )
      ? 0.4
      : 0

    return Math.max(primaryMatch, secondaryMatch)
  }

  private scoreContextualFit(tool: ToolConfig, context: UsageContext): number {
    let score = 0.5 // Base score

    // Time-based scoring
    if (context.timeOfDay) {
      score += this.getTimeRelevance(tool, context.timeOfDay) * 0.2
    }

    // Domain-based scoring
    if (context.businessDomain) {
      score += this.getDomainRelevance(tool, context.businessDomain) * 0.3
    }

    return Math.min(score, 1)
  }

  private scoreHistoricalUsage(toolId: string, userId: string): number {
    const history = this.usageHistory.get(`${userId}:${toolId}`)
    if (!history) return 0.3 // Neutral score for new tools

    // Factor in success rate and frequency
    const successRate = history.successCount / Math.max(history.totalUsage, 1)
    const recentUsage = this.getRecentUsageScore(history)

    return successRate * 0.7 + recentUsage * 0.3
  }

  private scoreUserPreference(toolId: string, context: UsageContext): number {
    const profile = this.userProfiles.get(context.userId)
    if (!profile) return 0.5

    // Check if tool is in user's frequent tools
    const rank = profile.frequentTools.indexOf(toolId)
    if (rank !== -1) {
      return Math.max(0.5, 1 - rank / profile.frequentTools.length)
    }

    return 0.3 // Lower score for unused tools
  }

  private scoreSituationalRelevance(
    tool: ToolConfig,
    intent: IntentAnalysis,
    context: UsageContext
  ): number {
    let relevance = 0.5

    // Urgency relevance
    if (intent.urgency === 'high') {
      relevance += this.isToolFastExecution(tool) ? 0.3 : -0.2
    }

    // Complexity relevance
    if (intent.complexity === 'complex') {
      relevance += this.isToolPowerful(tool) ? 0.2 : -0.1
    }

    return Math.max(0, Math.min(relevance, 1))
  }

  public classifyTool(tool: ToolConfig): string {
    const toolId = tool.id.toLowerCase()

    if (toolId.includes('email') || toolId.includes('mail') || toolId.includes('message')) {
      return 'communication'
    }
    if (toolId.includes('calendar') || toolId.includes('schedule')) {
      return 'scheduling'
    }
    if (toolId.includes('search') || toolId.includes('find')) {
      return 'search'
    }
    if (toolId.includes('create') || toolId.includes('write') || toolId.includes('generate')) {
      return 'creation'
    }
    if (toolId.includes('database') || toolId.includes('query') || toolId.includes('sql')) {
      return 'data'
    }

    return 'general'
  }

  private getIntentToolMapping(): Record<string, string[]> {
    return {
      send_communication: ['communication'],
      search_information: ['search', 'data'],
      create_content: ['creation'],
      manage_data: ['data'],
      schedule_organize: ['scheduling'],
      analyze_process: ['data', 'general'],
    }
  }

  private getTimeRelevance(tool: ToolConfig, timeOfDay: string): number {
    // Some tools are more relevant at certain times
    const timeRelevance: Record<string, string[]> = {
      morning: ['email', 'calendar', 'planning'],
      afternoon: ['data', 'analysis', 'communication'],
      evening: ['summary', 'reporting'],
      night: ['backup', 'batch'],
    }

    const toolCategory = this.classifyTool(tool)
    return timeRelevance[timeOfDay]?.includes(toolCategory) ? 0.2 : 0
  }

  private getDomainRelevance(tool: ToolConfig, domain: string): number {
    const domainMapping: Record<string, string[]> = {
      software_development: ['github', 'git', 'code', 'deploy'],
      marketing: ['social', 'email', 'analytics'],
      sales: ['crm', 'email', 'calendar'],
      finance: ['spreadsheet', 'calculator', 'database'],
    }

    const relevantTerms = domainMapping[domain] || []
    const toolId = tool.id.toLowerCase()

    return relevantTerms.some((term) => toolId.includes(term)) ? 0.3 : 0
  }

  private getRecentUsageScore(history: ToolUsageHistory): number {
    const daysSinceLastUse = (Date.now() - history.lastUsed.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceLastUse <= 1) return 1.0
    if (daysSinceLastUse <= 7) return 0.8
    if (daysSinceLastUse <= 30) return 0.5
    return 0.2
  }

  private isToolFastExecution(tool: ToolConfig): boolean {
    // Fast execution tools for urgent requests
    const fastTools = ['send', 'message', 'notify', 'quick']
    return fastTools.some((term) => tool.id.toLowerCase().includes(term))
  }

  private isToolPowerful(tool: ToolConfig): boolean {
    // Powerful tools for complex tasks
    const powerfulTools = ['analyze', 'process', 'transform', 'generate']
    return powerfulTools.some((term) => tool.id.toLowerCase().includes(term))
  }
}

// =============================================================================
// Main Recommendation Engine Implementation
// =============================================================================

export class SmartToolRecommendationEngine implements RecommendationEngine {
  private intentAnalyzer: IntentAnalysisEngine
  private toolScorer: ToolScoringEngine
  private toolRegistry: Map<string, ToolConfig>
  private usageTracker: UsageTracker

  constructor() {
    this.intentAnalyzer = new IntentAnalysisEngine()
    this.toolScorer = new ToolScoringEngine()
    this.toolRegistry = new Map()
    this.usageTracker = new UsageTracker()
  }

  async recommendTools(request: RecommendationRequest): Promise<ToolRecommendationWithDetails[]> {
    const { userMessage, conversationContext, userContext, availableTools } = request
    const maxRecommendations = request.maxRecommendations || 5

    // Step 1: Analyze user intent
    const intent = await this.intentAnalyzer.analyzeIntent(userMessage, conversationContext)

    // Step 2: Score available tools
    const toolScores = await this.toolScorer.scoreTools(availableTools, intent, userContext)

    // Step 3: Generate detailed recommendations
    const recommendations: ToolRecommendationWithDetails[] = []

    const sortedTools = Array.from(toolScores.entries())
      .sort((a, b) => b[1].overall - a[1].overall)
      .slice(0, maxRecommendations)

    for (const [toolId, score] of sortedTools) {
      const tool = this.toolRegistry.get(toolId)
      if (tool) {
        const recommendation = await this.buildDetailedRecommendation(
          tool,
          score,
          intent,
          userContext
        )
        recommendations.push(recommendation)
      }
    }

    // Step 4: Add alternatives if requested
    if (request.includeAlternatives) {
      await this.addAlternativeRecommendations(recommendations, intent, userContext)
    }

    return recommendations
  }

  async explainRecommendation(
    toolId: string,
    context: UsageContext
  ): Promise<RecommendationExplanation> {
    const tool = this.toolRegistry.get(toolId)
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`)
    }

    // Analyze why this tool was recommended
    const primaryReason = this.getPrimaryRecommendationReason(tool, context)
    const supportingReasons = this.getSupportingReasons(tool, context)
    const usageGuidance = this.getUsageGuidance(tool, context)
    const similarTools = this.findSimilarTools(toolId, 3)

    return {
      toolId,
      primaryReason,
      supportingReasons,
      whenToUse: usageGuidance.whenToUse,
      whenNotToUse: usageGuidance.whenNotToUse,
      confidence: 0.8, // Would be calculated based on factors
      similarTools,
      prerequisites: usageGuidance.prerequisites,
    }
  }

  async recordToolUsage(toolId: string, context: UsageContext, success: boolean): Promise<void> {
    await this.usageTracker.recordUsage({
      toolId,
      userId: context.userId,
      workspaceId: context.workspaceId,
      success,
      timestamp: new Date(),
      context: {
        intent: context.currentIntent?.primary || 'unknown',
        timeOfDay: context.timeOfDay,
        domain: context.businessDomain,
      },
    })
  }

  async adaptToUserFeedback(
    recommendations: ToolRecommendationWithDetails[],
    feedback: UserFeedback
  ): Promise<void> {
    for (const toolFeedback of feedback.recommendations) {
      await this.usageTracker.recordFeedback({
        toolId: toolFeedback.toolId,
        rating: toolFeedback.rating,
        used: toolFeedback.used,
        helpful: toolFeedback.helpful,
        comment: toolFeedback.comment,
        timestamp: new Date(),
      })
    }
  }

  async discoverTools(query: ToolDiscoveryQuery, context: UsageContext): Promise<DiscoveredTool[]> {
    // Implementation for tool discovery based on query
    const discovered: DiscoveredTool[] = []

    // Search through available tools
    for (const [toolId, tool] of this.toolRegistry.entries()) {
      const relevanceScore = this.calculateDiscoveryRelevance(tool, query, context)

      if (relevanceScore > 0.3) {
        discovered.push({
          id: toolId,
          name: tool.name || toolId,
          description: tool.description || '',
          category: this.toolScorer.classifyTool(tool),
          tags: this.extractToolTags(tool),
          relevanceScore,
          usageStats: await this.getToolUsageStats(toolId),
          capabilities: this.extractToolCapabilities(tool),
          requirements: this.extractToolRequirements(tool),
        })
      }
    }

    return discovered.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  async suggestToolCombinations(
    primaryTool: string,
    context: UsageContext
  ): Promise<ToolCombination[]> {
    // Find tools commonly used together with the primary tool
    const combinations = await this.findToolCombinations(primaryTool, context)
    return combinations.slice(0, 3) // Top 3 combinations
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private async buildDetailedRecommendation(
    tool: ToolConfig,
    score: ToolScore,
    intent: IntentAnalysis,
    context: UsageContext
  ): Promise<ToolRecommendationWithDetails> {
    return {
      toolId: tool.id,
      confidence: score.overall,
      reason: this.generateRecommendationReason(tool, score, intent),
      suggestedParameters: await this.suggestParameters(tool, intent, context),
      urgency: intent.urgency,
      alternatives: await this.findAlternativeTools(tool.id, context),
      tool,
      naturalLanguageDescription: this.generateNaturalDescription(tool, context),
      usageInstructions: this.generateUsageInstructions(tool, intent),
      exampleUsage: this.generateExampleUsage(tool, intent, context),
      relevanceScore: score.overall,
      confidenceFactors: score.factors,
    }
  }

  private generateRecommendationReason(
    tool: ToolConfig,
    score: ToolScore,
    intent: IntentAnalysis
  ): string {
    const highestFactor = Object.entries(score.factors).reduce((a, b) => (a[1] > b[1] ? a : b))

    const reasonMap: Record<string, string> = {
      intentMatch: `Perfect match for your intent to ${intent.action}`,
      contextualFit: 'Well-suited for your current context',
      historicalUsage: 'Based on your previous successful usage',
      userPreference: 'Aligned with your preferences',
      situationalRelevance: 'Ideal for the current situation',
    }

    return reasonMap[highestFactor[0]] || 'Recommended based on overall fit'
  }

  private async suggestParameters(
    tool: ToolConfig,
    intent: IntentAnalysis,
    context: UsageContext
  ): Promise<Record<string, any>> {
    const suggestions: Record<string, any> = {}

    // Extract parameters from intent entities
    intent.entities.forEach((entity) => {
      const paramName = this.mapEntityToParameter(entity, tool)
      if (paramName) {
        suggestions[paramName] = entity.value
      }
    })

    // Add context-based suggestions
    if (context.workflowVariables) {
      Object.entries(context.workflowVariables).forEach(([key, value]) => {
        if (tool.params?.[key]) {
          suggestions[key] = value
        }
      })
    }

    return suggestions
  }

  private async findAlternativeTools(toolId: string, context: UsageContext): Promise<string[]> {
    // Find tools with similar functionality
    const currentTool = this.toolRegistry.get(toolId)
    if (!currentTool) return []

    const currentCategory = this.toolScorer.classifyTool(currentTool)
    const alternatives: string[] = []

    for (const [altToolId, altTool] of this.toolRegistry.entries()) {
      if (altToolId !== toolId && this.toolScorer.classifyTool(altTool) === currentCategory) {
        alternatives.push(altToolId)
      }
    }

    return alternatives.slice(0, 3)
  }

  private generateNaturalDescription(tool: ToolConfig, context: UsageContext): string {
    const baseDescription = tool.description || `The ${tool.name || tool.id} tool`

    // Enhance with context
    if (context.userProfile?.experience === 'beginner') {
      return `${baseDescription}. This is a user-friendly tool that helps you accomplish tasks easily.`
    }

    return baseDescription
  }

  private generateUsageInstructions(tool: ToolConfig, intent: IntentAnalysis): string[] {
    const instructions: string[] = []

    // Basic usage instruction
    instructions.push(
      `To use ${tool.name || tool.id}, you'll need to provide the required parameters.`
    )

    // Intent-specific instructions
    if (intent.urgency === 'high') {
      instructions.push('For quick results, focus on the essential parameters first.')
    }

    if (intent.complexity === 'complex') {
      instructions.push('Consider breaking down complex requests into simpler steps.')
    }

    return instructions
  }

  private generateExampleUsage(
    tool: ToolConfig,
    intent: IntentAnalysis,
    context: UsageContext
  ): ConversationExample[] {
    // Generate contextual examples
    return [
      {
        userInput: `Help me ${intent.action} ${intent.target}`,
        agentResponse: `I'll use ${tool.name} to help you with that.`,
        toolCall: {
          name: tool.id,
          parameters: {},
        },
        outcome: `Successfully completed the ${intent.action} operation`,
      },
    ]
  }

  private calculateDiscoveryRelevance(
    tool: ToolConfig,
    query: ToolDiscoveryQuery,
    context: UsageContext
  ): number {
    let relevance = 0

    // Text matching
    if (query.query) {
      const toolText = `${tool.name} ${tool.description}`.toLowerCase()
      const queryText = query.query.toLowerCase()
      if (toolText.includes(queryText)) {
        relevance += 0.5
      }
    }

    // Category matching
    if (query.category) {
      const toolCategory = this.toolScorer.classifyTool(tool)
      if (toolCategory === query.category) {
        relevance += 0.3
      }
    }

    // Keyword matching
    if (query.keywords?.length) {
      const toolText = `${tool.name} ${tool.description}`.toLowerCase()
      const matchingKeywords = query.keywords.filter((keyword) =>
        toolText.includes(keyword.toLowerCase())
      )
      relevance += (matchingKeywords.length / query.keywords.length) * 0.2
    }

    return Math.min(relevance, 1)
  }

  // Additional helper methods would be implemented here...
  private getPrimaryRecommendationReason(tool: ToolConfig, context: UsageContext): string {
    return `${tool.name} is recommended based on your current needs`
  }

  private getSupportingReasons(tool: ToolConfig, context: UsageContext): string[] {
    return ['Matches your intent', 'Suitable for current context']
  }

  private getUsageGuidance(tool: ToolConfig, context: UsageContext) {
    return {
      whenToUse: `Use when you need to ${tool.description?.toLowerCase() || 'perform this action'}`,
      whenNotToUse: 'Avoid when you need different functionality',
      prerequisites: [],
    }
  }

  private findSimilarTools(toolId: string, count: number): string[] {
    return Array.from(this.toolRegistry.keys())
      .filter((id) => id !== toolId)
      .slice(0, count)
  }

  private async addAlternativeRecommendations(
    recommendations: ToolRecommendationWithDetails[],
    intent: IntentAnalysis,
    context: UsageContext
  ): Promise<void> {
    // Implementation for adding alternative recommendations
  }

  private mapEntityToParameter(entity: Entity, tool: ToolConfig): string | null {
    // Map entity to tool parameter
    return null
  }

  private extractToolTags(tool: ToolConfig): string[] {
    return []
  }

  private async getToolUsageStats(toolId: string) {
    return {
      executionCount: 0,
      successRate: 1,
      averageRating: 5,
    }
  }

  private extractToolCapabilities(tool: ToolConfig): string[] {
    return []
  }

  private extractToolRequirements(tool: ToolConfig): string[] {
    return []
  }

  private async findToolCombinations(
    primaryTool: string,
    context: UsageContext
  ): Promise<ToolCombination[]> {
    return []
  }
}

// =============================================================================
// Supporting Types and Classes
// =============================================================================

interface ToolScore {
  overall: number
  factors: {
    intentMatch: number
    contextualFit: number
    historicalUsage: number
    userPreference: number
    situationalRelevance: number
  }
}

interface ToolUsageHistory {
  totalUsage: number
  successCount: number
  lastUsed: Date
  averageRating: number
}

interface UserProfile {
  role: string
  experience: 'beginner' | 'intermediate' | 'advanced'
  frequentTools: string[]
  preferences: {
    communication: 'brief' | 'detailed' | 'conversational'
    automation: 'manual' | 'guided' | 'automatic'
    explanation: 'minimal' | 'moderate' | 'comprehensive'
  }
}

class DomainClassifier {
  async classify(message: string, history: ConversationMessage[]): Promise<string> {
    // Simple domain classification
    return 'general'
  }
}

class EntityExtractor {
  async extractEntities(message: string): Promise<Entity[]> {
    return []
  }
}

class UsageTracker {
  async recordUsage(usage: any): Promise<void> {
    // Implementation for recording usage
  }

  async recordFeedback(feedback: any): Promise<void> {
    // Implementation for recording feedback
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createRecommendationEngine(): SmartToolRecommendationEngine {
  return new SmartToolRecommendationEngine()
}
