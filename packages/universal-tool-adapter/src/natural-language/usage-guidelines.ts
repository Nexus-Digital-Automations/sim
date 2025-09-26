/**
 * Contextual Usage Guidelines System
 *
 * Provides intelligent guidance for when and how to use tools based on
 * conversation context, user intent, and workflow patterns.
 *
 * @author NATURAL_LANGUAGE_ENGINE_AGENT
 * @version 1.0.0
 */

// =============================================================================
// Usage Context Types
// =============================================================================

export interface UsageContext {
  // Current conversation context
  conversationId?: string
  messageHistory?: ConversationMessage[]
  currentIntent?: UserIntent

  // User context
  userId: string
  workspaceId: string
  userProfile?: UserProfile
  preferences?: UserPreferences

  // Workflow context
  workflowId?: string
  currentStep?: string
  previousTools?: string[]
  workflowVariables?: Record<string, any>

  // Environmental context
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
  dayOfWeek?: 'weekday' | 'weekend'
  timezone?: string
  locale?: string

  // Domain context
  businessDomain?: string
  projectType?: string
  industry?: string
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  tools?: string[]
  intent?: string[]
}

export interface UserIntent {
  primary: string
  confidence: number
  secondary?: string[]
  entities?: Record<string, any>
  urgency?: 'low' | 'medium' | 'high'
  complexity?: 'simple' | 'moderate' | 'complex'
}

export interface UserProfile {
  role: string
  experience: 'beginner' | 'intermediate' | 'advanced'
  preferences: {
    communication: 'brief' | 'detailed' | 'conversational'
    automation: 'manual' | 'guided' | 'automatic'
    explanation: 'minimal' | 'moderate' | 'comprehensive'
  }
  domains: string[]
  frequentTools: string[]
}

export interface UserPreferences {
  language: string
  timezone: string
  workingHours?: {
    start: string
    end: string
    days: string[]
  }
  notifications?: {
    email: boolean
    slack: boolean
    immediate: boolean
  }
}

// =============================================================================
// Guidelines Engine
// =============================================================================

export interface UsageGuideline {
  id: string
  toolId: string
  title: string
  description: string

  // When to use this guideline
  conditions: UsageCondition[]

  // Guidance content
  guidance: {
    whenToUse: string
    howToUse: string
    bestPractices: string[]
    commonMistakes: string[]
    tips: string[]
  }

  // Examples
  examples: {
    scenarios: ScenarioExample[]
    conversations: ConversationExample[]
  }

  // Contextual adaptations
  adaptations: {
    userType: Record<string, string>
    urgency: Record<string, string>
    complexity: Record<string, string>
  }

  // Metadata
  priority: number
  confidence: number
  lastUpdated: Date
}

export interface UsageCondition {
  type: 'intent' | 'context' | 'user' | 'workflow' | 'time' | 'custom'
  field: string
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than' | 'exists'
  value: any
  weight: number
}

export interface ScenarioExample {
  title: string
  description: string
  input: Record<string, any>
  context: Partial<UsageContext>
  guidance: string
  outcome: string
}

export interface ConversationExample {
  userMessage: string
  contextualGuidance: string
  suggestedResponse: string
  parameters: Record<string, any>
}

// =============================================================================
// Guidelines Engine Implementation
// =============================================================================

export class UsageGuidelinesEngine {
  private guidelines: Map<string, UsageGuideline[]> = new Map()
  private contextAnalyzer: ContextAnalyzer
  private intentClassifier: IntentClassifier

  constructor() {
    this.contextAnalyzer = new ContextAnalyzer()
    this.intentClassifier = new IntentClassifier()
    this.loadDefaultGuidelines()
  }

  /**
   * Get contextual usage guidelines for a tool
   */
  async getUsageGuidelines(toolId: string, context: UsageContext): Promise<UsageGuideline[]> {
    const allGuidelines = this.guidelines.get(toolId) || []

    // Score and filter guidelines based on context
    const scoredGuidelines = await Promise.all(
      allGuidelines.map(async (guideline) => ({
        guideline,
        score: await this.scoreGuideline(guideline, context),
      }))
    )

    // Filter and sort by relevance
    return scoredGuidelines
      .filter(({ score }) => score > 0.3) // Minimum relevance threshold
      .sort((a, b) => b.score - a.score)
      .map(({ guideline }) => this.adaptGuideline(guideline, context))
  }

  /**
   * Get contextual recommendations for tool usage
   */
  async getToolRecommendations(context: UsageContext): Promise<ToolRecommendation[]> {
    const intent =
      context.currentIntent ||
      (await this.intentClassifier.classifyFromHistory(context.messageHistory || []))

    const recommendations: ToolRecommendation[] = []

    // Analyze all available tools
    for (const [toolId, guidelines] of Array.from(this.guidelines.entries())) {
      const relevantGuidelines = await this.getUsageGuidelines(toolId, context)

      if (relevantGuidelines.length > 0) {
        const bestGuideline = relevantGuidelines[0]
        const confidence = await this.calculateToolConfidence(toolId, intent, context)

        recommendations.push({
          toolId,
          confidence,
          reason: bestGuideline.guidance.whenToUse,
          suggestedParameters: this.suggestParameters(toolId, context),
          urgency: this.assessUrgency(toolId, context),
          alternatives: await this.findAlternativeTools(toolId, context),
        })
      }
    }

    return recommendations
      .filter((rec) => rec.confidence > 0.4)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5) // Top 5 recommendations
  }

  /**
   * Provide contextual help for tool usage
   */
  async getContextualHelp(
    toolId: string,
    userMessage: string,
    context: UsageContext
  ): Promise<ContextualHelp> {
    const guidelines = await this.getUsageGuidelines(toolId, context)
    const intent = await this.intentClassifier.classify(userMessage)

    return {
      quickStart: this.generateQuickStart(toolId, intent, context),
      parameterGuidance: this.generateParameterGuidance(toolId, intent, context),
      examples: this.generateContextualExamples(toolId, intent, context),
      troubleshooting: this.generateTroubleshooting(toolId, context),
      relatedTools: await this.findRelatedTools(toolId, context),
    }
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async scoreGuideline(guideline: UsageGuideline, context: UsageContext): Promise<number> {
    let score = 0

    for (const condition of guideline.conditions) {
      const conditionScore = await this.evaluateCondition(condition, context)
      score += conditionScore * condition.weight
    }

    // Normalize score to 0-1 range
    const maxPossibleScore = guideline.conditions.reduce((sum, cond) => sum + cond.weight, 0)
    return maxPossibleScore > 0 ? Math.min(score / maxPossibleScore, 1) : 0
  }

  private async evaluateCondition(
    condition: UsageCondition,
    context: UsageContext
  ): Promise<number> {
    const contextValue = this.getContextValue(context, condition.field)

    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value ? 1 : 0

      case 'contains':
        return typeof contextValue === 'string' && contextValue.includes(condition.value) ? 1 : 0

      case 'matches':
        return new RegExp(condition.value).test(String(contextValue)) ? 1 : 0

      case 'exists':
        return contextValue !== undefined && contextValue !== null ? 1 : 0

      case 'greater_than':
        return Number(contextValue) > condition.value ? 1 : 0

      case 'less_than':
        return Number(contextValue) < condition.value ? 1 : 0

      default:
        return 0
    }
  }

  private getContextValue(context: UsageContext, field: string): any {
    const path = field.split('.')
    let value: any = context

    for (const key of path) {
      value = value?.[key]
      if (value === undefined) break
    }

    return value
  }

  private adaptGuideline(guideline: UsageGuideline, context: UsageContext): UsageGuideline {
    const adapted = { ...guideline }

    // Adapt based on user profile
    if (context.userProfile) {
      const userType = context.userProfile.role
      if (adapted.adaptations.userType[userType]) {
        adapted.guidance.whenToUse = adapted.adaptations.userType[userType]
      }

      // Adapt explanation level
      switch (context.userProfile.preferences.explanation) {
        case 'minimal':
          adapted.guidance.bestPractices = adapted.guidance.bestPractices.slice(0, 2)
          break
        case 'comprehensive':
          // Keep all practices and add more details
          break
      }
    }

    // Adapt based on urgency
    if (context.currentIntent?.urgency) {
      const urgencyGuidance = adapted.adaptations.urgency[context.currentIntent.urgency]
      if (urgencyGuidance) {
        adapted.guidance.tips.unshift(urgencyGuidance)
      }
    }

    return adapted
  }

  private async calculateToolConfidence(
    toolId: string,
    intent: UserIntent,
    context: UsageContext
  ): Promise<number> {
    let confidence = 0

    // Base confidence from intent matching
    confidence += this.matchIntentToTool(toolId, intent) * 0.4

    // Historical usage patterns
    confidence += this.getHistoricalConfidence(toolId, context) * 0.3

    // Context fit
    confidence += this.assessContextFit(toolId, context) * 0.3

    return Math.min(confidence, 1)
  }

  private matchIntentToTool(toolId: string, intent: UserIntent): number {
    // Tool-specific intent matching logic
    const intentMappings: Record<string, string[]> = {
      gmail_send: ['send_email', 'compose_message', 'communicate'],
      gmail_read: ['read_email', 'check_messages', 'review_communications'],
      notion_create: ['create_document', 'write_note', 'organize_information'],
      github_pr: ['review_code', 'create_pullrequest', 'collaborate'],
      // Add more mappings as needed
    }

    const toolIntents = intentMappings[toolId] || []

    // Check primary intent
    if (toolIntents.includes(intent.primary)) {
      return intent.confidence
    }

    // Check secondary intents
    const secondaryMatch = intent.secondary?.some((sec) => toolIntents.includes(sec))
    if (secondaryMatch) {
      return intent.confidence * 0.7
    }

    return 0
  }

  private getHistoricalConfidence(toolId: string, context: UsageContext): number {
    const userProfile = context.userProfile
    if (!userProfile?.frequentTools) return 0.5

    const toolUsageRank = userProfile.frequentTools.indexOf(toolId)
    if (toolUsageRank === -1) return 0.3

    // Higher confidence for frequently used tools
    return Math.max(0.5, 1 - toolUsageRank / userProfile.frequentTools.length)
  }

  private assessContextFit(toolId: string, context: UsageContext): number {
    let fit = 0.5 // Base fit

    // Time-based relevance
    if (context.timeOfDay && this.isToolTimeAppropriate(toolId, context.timeOfDay)) {
      fit += 0.2
    }

    // Workflow context
    if (context.workflowId && this.isToolWorkflowAppropriate(toolId, context)) {
      fit += 0.3
    }

    return Math.min(fit, 1)
  }

  private isToolTimeAppropriate(toolId: string, timeOfDay: string): boolean {
    // Some tools are more appropriate at certain times
    const timeAppropriate: Record<string, string[]> = {
      gmail_send: ['morning', 'afternoon'],
      slack_message: ['morning', 'afternoon'],
      calendar_create: ['morning', 'afternoon'],
      // Add more time-based rules
    }

    return timeAppropriate[toolId]?.includes(timeOfDay) ?? true
  }

  private isToolWorkflowAppropriate(toolId: string, context: UsageContext): boolean {
    // Check if tool fits current workflow context
    if (context.previousTools?.includes(toolId)) {
      return false // Avoid repetitive tool usage
    }

    // Domain-specific appropriateness
    const domainTools: Record<string, string[]> = {
      software_development: ['github_pr', 'github_repo', 'slack_message'],
      content_creation: ['notion_create', 'google_docs_write', 'gmail_send'],
      data_analysis: ['mysql_query', 'postgresql_query', 'google_sheets_read'],
    }

    if (context.businessDomain) {
      return domainTools[context.businessDomain]?.includes(toolId) ?? true
    }

    return true
  }

  private suggestParameters(toolId: string, context: UsageContext): Record<string, any> {
    const suggestions: Record<string, any> = {}

    // Context-based parameter suggestions
    if (context.userProfile?.preferences) {
      // Add user preference-based defaults
    }

    if (context.workflowVariables) {
      // Inherit relevant variables from workflow context
      Object.entries(context.workflowVariables).forEach(([key, value]) => {
        if (this.isParameterRelevant(toolId, key)) {
          suggestions[key] = value
        }
      })
    }

    return suggestions
  }

  private isParameterRelevant(toolId: string, parameterName: string): boolean {
    // Tool-specific parameter relevance logic
    const relevantParams: Record<string, string[]> = {
      gmail_send: ['to', 'subject', 'cc', 'bcc'],
      notion_create: ['title', 'content', 'database_id'],
      github_pr: ['title', 'body', 'base', 'head'],
    }

    return relevantParams[toolId]?.includes(parameterName) ?? false
  }

  private assessUrgency(toolId: string, context: UsageContext): 'low' | 'medium' | 'high' {
    if (context.currentIntent?.urgency) {
      return context.currentIntent.urgency
    }

    // Tool-based urgency defaults
    const urgentTools = ['gmail_send', 'slack_message', 'sms_send']
    return urgentTools.includes(toolId) ? 'medium' : 'low'
  }

  private async findAlternativeTools(toolId: string, context: UsageContext): Promise<string[]> {
    // Find tools with similar capabilities
    const alternatives: Record<string, string[]> = {
      gmail_send: ['outlook_send', 'mail_send', 'slack_message'],
      notion_create: ['google_docs_create', 'microsoft_excel_write'],
      github_pr: ['gitlab_merge_request', 'bitbucket_pr'],
    }

    return alternatives[toolId] || []
  }

  private generateQuickStart(toolId: string, intent: UserIntent, context: UsageContext): string {
    // Generate quick start guidance based on intent
    return `To use ${toolId} for ${intent.primary}, start by providing the required parameters.`
  }

  private generateParameterGuidance(
    toolId: string,
    intent: UserIntent,
    context: UsageContext
  ): Record<string, string> {
    // Generate parameter-specific guidance
    return {
      // Parameter name -> guidance mapping
    }
  }

  private generateContextualExamples(
    toolId: string,
    intent: UserIntent,
    context: UsageContext
  ): ConversationExample[] {
    // Generate examples based on context
    return []
  }

  private generateTroubleshooting(toolId: string, context: UsageContext): string[] {
    // Generate common troubleshooting tips
    return []
  }

  private async findRelatedTools(toolId: string, context: UsageContext): Promise<string[]> {
    // Find tools commonly used together
    return []
  }

  private loadDefaultGuidelines(): void {
    // Load pre-defined guidelines for common tools
    // Implementation would load from configuration files or database
  }
}

// =============================================================================
// Supporting Classes
// =============================================================================

class ContextAnalyzer {
  analyze(context: UsageContext): ContextAnalysis {
    // Analyze context patterns and extract insights
    return {
      workflowStage: this.determineWorkflowStage(context),
      userBehavior: this.analyzeUserBehavior(context),
      environmentalFactors: this.analyzeEnvironmentalFactors(context),
    }
  }

  private determineWorkflowStage(context: UsageContext): string {
    // Analyze workflow progression
    return 'planning' // or 'execution', 'review', etc.
  }

  private analyzeUserBehavior(context: UsageContext): Record<string, any> {
    // Analyze user interaction patterns
    return {}
  }

  private analyzeEnvironmentalFactors(context: UsageContext): Record<string, any> {
    // Analyze environmental context
    return {}
  }
}

class IntentClassifier {
  async classify(message: string): Promise<UserIntent> {
    // Simple intent classification (would use ML models in production)
    const intents = this.extractIntents(message)

    return {
      primary: intents[0] || 'unknown',
      confidence: 0.8,
      secondary: intents.slice(1),
      urgency: this.classifyUrgency(message),
      complexity: this.classifyComplexity(message),
    }
  }

  async classifyFromHistory(messages: ConversationMessage[]): Promise<UserIntent> {
    // Analyze message history for intent
    const recentMessages = messages
      .slice(-5)
      .map((m) => m.content)
      .join(' ')
    return this.classify(recentMessages)
  }

  private extractIntents(message: string): string[] {
    const intentKeywords: Record<string, string[]> = {
      send_email: ['send', 'email', 'message', 'compose'],
      create_document: ['create', 'write', 'document', 'note'],
      search: ['find', 'search', 'look', 'discover'],
      schedule: ['schedule', 'calendar', 'meeting', 'appointment'],
    }

    const detectedIntents: string[] = []
    const lowerMessage = message.toLowerCase()

    Object.entries(intentKeywords).forEach(([intent, keywords]) => {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        detectedIntents.push(intent)
      }
    })

    return detectedIntents
  }

  private classifyUrgency(message: string): 'low' | 'medium' | 'high' {
    const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency']
    const lowerMessage = message.toLowerCase()

    return urgentWords.some((word) => lowerMessage.includes(word)) ? 'high' : 'medium'
  }

  private classifyComplexity(message: string): 'simple' | 'moderate' | 'complex' {
    const complexWords = ['multiple', 'complex', 'detailed', 'comprehensive', 'analyze']
    const lowerMessage = message.toLowerCase()

    if (complexWords.some((word) => lowerMessage.includes(word))) {
      return 'complex'
    }

    return message.split(' ').length > 20 ? 'moderate' : 'simple'
  }
}

// =============================================================================
// Type Definitions for Supporting Features
// =============================================================================

export interface ToolRecommendation {
  toolId: string
  confidence: number
  reason: string
  suggestedParameters: Record<string, any>
  urgency: 'low' | 'medium' | 'high'
  alternatives: string[]
}

export interface ContextualHelp {
  quickStart: string
  parameterGuidance: Record<string, string>
  examples: ConversationExample[]
  troubleshooting: string[]
  relatedTools: string[]
}

export interface ContextAnalysis {
  workflowStage: string
  userBehavior: Record<string, any>
  environmentalFactors: Record<string, any>
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createUsageGuidelinesEngine(): UsageGuidelinesEngine {
  return new UsageGuidelinesEngine()
}

export async function getContextualGuidance(
  toolId: string,
  context: UsageContext
): Promise<UsageGuideline[]> {
  const engine = createUsageGuidelinesEngine()
  return engine.getUsageGuidelines(toolId, context)
}

export async function recommendTools(context: UsageContext): Promise<ToolRecommendation[]> {
  const engine = createUsageGuidelinesEngine()
  return engine.getToolRecommendations(context)
}
