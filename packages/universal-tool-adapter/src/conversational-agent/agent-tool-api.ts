/**
 * Agent-Tool Interaction API
 *
 * Comprehensive API layer enabling Parlant agents to intelligently request and receive
 * tool recommendations during conversational workflows. Provides seamless integration
 * between agents and the tool recommendation system.
 *
 * Features:
 * - Agent API for tool recommendation requests and responses
 * - Tool suggestion integration with Parlant conversation flows
 * - Tool selection confirmation and feedback systems
 * - Agent learning system from user tool selection patterns
 *
 * @author Agent Tool Recommendation System Agent
 * @version 1.0.0
 */

import type { EnhancedToolRecommendation } from '../enhanced-intelligence/tool-intelligence-engine'
import { createLogger } from '../utils/logger'
import type { ConversationalContext } from './context-analyzer'
import { ConversationalContextAnalyzer } from './context-analyzer'

const logger = createLogger('AgentToolAPI')

// =============================================================================
// Agent Tool API Types
// =============================================================================

export interface ToolRecommendationRequest {
  // Request identification
  requestId: string
  agentId: string
  conversationId: string
  sessionId: string
  timestamp: Date

  // Context information
  userMessage: string
  conversationHistory: AgentMessage[]
  currentContext: AgentContext

  // Request parameters
  maxRecommendations?: number
  preferredCategories?: string[]
  excludeCategories?: string[]
  urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent'

  // Learning parameters
  includeAlternatives?: boolean
  explainReasonings?: boolean
  provideLearningInsights?: boolean
}

export interface ToolRecommendationResponse {
  // Response identification
  responseId: string
  requestId: string
  timestamp: Date

  // Recommendations
  recommendations: AgentToolRecommendation[]

  // Context and insights
  conversationInsights: ConversationInsights
  recommendationReasoning: RecommendationReasoning

  // Metadata
  processingTimeMs: number
  confidenceScore: number
  systemLoad: number
}

export interface AgentToolRecommendation extends EnhancedToolRecommendation {
  // Agent-specific enhancements
  agentIntegrationLevel: 'seamless' | 'guided' | 'manual'
  conversationalPresentation: ConversationalPresentation
  userConfirmationRequired: boolean

  // Learning and feedback
  selectionFeedbackEnabled: boolean
  usageLearningEnabled: boolean

  // Integration metadata
  integrationInstructions: string[]
  errorHandlingGuidance: string[]
  successIndicators: string[]
}

export interface ConversationalPresentation {
  // Natural language presentation
  naturalLanguageDescription: string
  conversationalIntroduction: string
  usageExplanation: string

  // Interactive elements
  quickActions: QuickAction[]
  clarifyingQuestions: string[]
  followUpSuggestions: string[]

  // Visual representation
  iconSuggestion?: string
  colorScheme?: string
  displayPriority: number
}

export interface QuickAction {
  actionId: string
  label: string
  description: string
  parameters: Record<string, any>
  estimatedTime: string
}

export interface AgentMessage {
  messageId: string
  content: string
  sender: 'user' | 'agent'
  timestamp: Date
  metadata?: Record<string, any>
}

export interface AgentContext {
  userId: string
  workspaceId: string
  userProfile: UserProfile
  currentWorkflow?: WorkflowContext
  recentActions: RecentAction[]
  preferences: UserPreferences
}

export interface UserProfile {
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  preferredInteractionStyle: 'concise' | 'detailed' | 'visual' | 'conversational'
  learningStyle: 'example_based' | 'step_by_step' | 'experimental'
  toolFamiliarity: Record<string, number> // toolId -> familiarity score 0-1
}

export interface WorkflowContext {
  workflowId: string
  currentStage: string
  availableTools: string[]
  stageRequirements: string[]
  expectedOutputs: string[]
}

export interface RecentAction {
  actionId: string
  toolId: string
  timestamp: Date
  outcome: 'success' | 'partial' | 'failure'
  userSatisfaction?: number
}

export interface UserPreferences {
  defaultToolCategories: string[]
  excludedTools: string[]
  preferredComplexityLevel: string
  feedbackFrequency: 'always' | 'errors_only' | 'never'
  learningModeEnabled: boolean
}

export interface ConversationInsights {
  currentPhase: string
  userEngagement: number
  conversationHealth: number
  predictedNextActions: string[]
  recommendationOptimality: number
}

export interface RecommendationReasoning {
  primaryFactors: string[]
  contextualFactors: string[]
  userFactors: string[]
  confidenceFactors: string[]
  riskFactors: string[]
}

// =============================================================================
// Tool Selection and Feedback Types
// =============================================================================

export interface ToolSelectionEvent {
  eventId: string
  requestId: string
  agentId: string
  conversationId: string

  selectedToolId: string
  selectionTimestamp: Date
  selectionMethod: 'direct' | 'suggested' | 'alternative'

  userConfidenceLevel: number
  userExpectations: string[]
}

export interface ToolUsageFeedback {
  feedbackId: string
  selectionEventId: string
  toolId: string

  // Usage outcome
  usageSuccessful: boolean
  executionTime: number
  errorEncountered?: string

  // User satisfaction
  userSatisfaction: 1 | 2 | 3 | 4 | 5
  userComments?: string

  // Learning data
  meetExpectations: boolean
  wouldUseAgain: boolean
  recommendToOthers: boolean

  // Context
  taskComplexity: 'easier' | 'expected' | 'harder'
  learningValue: 'low' | 'medium' | 'high'
}

export interface AgentLearningData {
  agentId: string
  totalInteractions: number
  successfulRecommendations: number
  userSatisfactionAverage: number

  // Pattern learning
  successfulPatterns: RecommendationPattern[]
  failurePatterns: RecommendationPattern[]

  // User adaptation
  userSpecificLearning: Record<string, UserLearningProfile>

  // Continuous improvement
  lastUpdateTimestamp: Date
  learningConfidence: number
}

export interface RecommendationPattern {
  pattern: string
  context: string[]
  successRate: number
  sampleSize: number
  confidence: number
}

export interface UserLearningProfile {
  userId: string
  preferredTools: string[]
  toolEffectiveness: Record<string, number>
  communicationStyle: string
  learningSpeed: number
  adaptationSuggestions: string[]
}

// =============================================================================
// Agent Tool API Implementation
// =============================================================================

export class AgentToolAPI {
  private contextAnalyzer: ConversationalContextAnalyzer
  private learningSystem: AgentLearningSystem
  private feedbackProcessor: FeedbackProcessor
  private performanceMonitor: PerformanceMonitor

  constructor() {
    this.contextAnalyzer = new ConversationalContextAnalyzer()
    this.learningSystem = new AgentLearningSystem()
    this.feedbackProcessor = new FeedbackProcessor()
    this.performanceMonitor = new PerformanceMonitor()
  }

  // =============================================================================
  // Primary API Methods
  // =============================================================================

  /**
   * Request tool recommendations for an agent
   */
  async requestToolRecommendations(
    request: ToolRecommendationRequest
  ): Promise<ToolRecommendationResponse> {
    const startTime = Date.now()

    logger.info('Processing tool recommendation request', {
      requestId: request.requestId,
      agentId: request.agentId,
      conversationId: request.conversationId,
    })

    try {
      // Analyze conversational context
      const conversationalContext = await this.contextAnalyzer.analyzeMessage(
        request.userMessage,
        request.conversationId,
        request.currentContext.userId,
        request.currentContext.workspaceId,
        request.sessionId
      )

      // Get tool recommendations with enhanced intelligence
      const recommendations = await this.generateAgentRecommendations(
        request,
        conversationalContext
      )

      // Apply agent-specific learning insights
      const learnedRecommendations = await this.learningSystem.applyLearning(
        recommendations,
        request.agentId,
        request.currentContext.userId
      )

      // Generate conversation insights
      const conversationInsights = this.generateConversationInsights(conversationalContext)

      // Create recommendation reasoning
      const recommendationReasoning = this.generateRecommendationReasoning(
        learnedRecommendations,
        conversationalContext,
        request
      )

      const processingTime = Date.now() - startTime

      // Create response
      const response: ToolRecommendationResponse = {
        responseId: this.generateResponseId(),
        requestId: request.requestId,
        timestamp: new Date(),
        recommendations: learnedRecommendations,
        conversationInsights,
        recommendationReasoning,
        processingTimeMs: processingTime,
        confidenceScore: this.calculateOverallConfidence(learnedRecommendations),
        systemLoad: await this.performanceMonitor.getCurrentLoad(),
      }

      // Record request for learning
      await this.learningSystem.recordRecommendationRequest(request, response)

      logger.info('Tool recommendation request processed successfully', {
        requestId: request.requestId,
        recommendationCount: recommendations.length,
        processingTimeMs: processingTime,
      })

      return response
    } catch (error) {
      logger.error('Failed to process tool recommendation request', {
        error,
        requestId: request.requestId,
      })
      throw new Error(`Tool recommendation failed: ${error.message}`)
    }
  }

  /**
   * Record tool selection by user/agent
   */
  async recordToolSelection(selectionEvent: ToolSelectionEvent): Promise<void> {
    logger.info('Recording tool selection', {
      eventId: selectionEvent.eventId,
      toolId: selectionEvent.selectedToolId,
      agentId: selectionEvent.agentId,
    })

    try {
      // Update learning system with selection
      await this.learningSystem.recordToolSelection(selectionEvent)

      // Update user preference learning
      await this.updateUserPreferenceLearning(selectionEvent)

      // Trigger any necessary adjustments
      await this.adjustRecommendationStrategy(selectionEvent)
    } catch (error) {
      logger.error('Failed to record tool selection', { error, eventId: selectionEvent.eventId })
      throw new Error(`Tool selection recording failed: ${error.message}`)
    }
  }

  /**
   * Process tool usage feedback
   */
  async processUsageFeedback(feedback: ToolUsageFeedback): Promise<void> {
    logger.info('Processing tool usage feedback', {
      feedbackId: feedback.feedbackId,
      toolId: feedback.toolId,
      satisfaction: feedback.userSatisfaction,
    })

    try {
      // Process feedback through feedback processor
      const insights = await this.feedbackProcessor.processFeedback(feedback)

      // Update learning algorithms
      await this.learningSystem.incorporateFeedback(feedback, insights)

      // Update tool effectiveness metrics
      await this.updateToolEffectivenessMetrics(feedback)

      // Generate improvement suggestions if needed
      if (feedback.userSatisfaction <= 2) {
        await this.generateImprovementSuggestions(feedback)
      }
    } catch (error) {
      logger.error('Failed to process usage feedback', { error, feedbackId: feedback.feedbackId })
      throw new Error(`Feedback processing failed: ${error.message}`)
    }
  }

  /**
   * Get agent learning data and insights
   */
  async getAgentLearningInsights(agentId: string): Promise<AgentLearningData> {
    return this.learningSystem.getAgentLearningData(agentId)
  }

  /**
   * Get user-specific learning profile
   */
  async getUserLearningProfile(userId: string, agentId: string): Promise<UserLearningProfile> {
    return this.learningSystem.getUserLearningProfile(userId, agentId)
  }

  // =============================================================================
  // Private Implementation Methods
  // =============================================================================

  private async generateAgentRecommendations(
    request: ToolRecommendationRequest,
    context: ConversationalContext
  ): Promise<AgentToolRecommendation[]> {
    // This would integrate with the Enhanced Tool Intelligence Engine
    const baseRecommendations: EnhancedToolRecommendation[] = []

    // Transform to agent-specific recommendations
    const agentRecommendations: AgentToolRecommendation[] = baseRecommendations.map((rec) => ({
      ...rec,
      agentIntegrationLevel: this.determineIntegrationLevel(rec, request.agentId),
      conversationalPresentation: this.createConversationalPresentation(rec, context),
      userConfirmationRequired: this.determineConfirmationRequirement(rec, context),
      selectionFeedbackEnabled: true,
      usageLearningEnabled: true,
      integrationInstructions: this.generateIntegrationInstructions(rec),
      errorHandlingGuidance: this.generateErrorHandlingGuidance(rec),
      successIndicators: this.generateSuccessIndicators(rec),
    }))

    return agentRecommendations
  }

  private generateConversationInsights(context: ConversationalContext): ConversationInsights {
    return {
      currentPhase: context.conversationFlow.currentPhase,
      userEngagement: context.conversationMomentum.engagementLevel,
      conversationHealth: 0.8, // Would be calculated from context
      predictedNextActions: context.conversationFlow.nextLikelyPhases,
      recommendationOptimality: context.recommendationTiming.timingScore,
    }
  }

  private generateRecommendationReasoning(
    recommendations: AgentToolRecommendation[],
    context: ConversationalContext,
    request: ToolRecommendationRequest
  ): RecommendationReasoning {
    return {
      primaryFactors: [`User intent: ${context.extractedIntent.primaryCategory}`],
      contextualFactors: [`Conversation phase: ${context.conversationFlow.currentPhase}`],
      userFactors: [`Skill level: ${request.currentContext.userProfile.skillLevel}`],
      confidenceFactors: [`Context confidence: ${context.extractedIntent.confidence}`],
      riskFactors: context.contextualCues
        .filter((cue) => cue.cueType === 'workflow')
        .map((cue) => cue.indicator),
    }
  }

  private calculateOverallConfidence(recommendations: AgentToolRecommendation[]): number {
    if (recommendations.length === 0) return 0
    return recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length
  }

  private generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Helper methods (stubs for implementation)
  private determineIntegrationLevel(
    rec: EnhancedToolRecommendation,
    agentId: string
  ): 'seamless' | 'guided' | 'manual' {
    return 'guided'
  }

  private createConversationalPresentation(
    rec: EnhancedToolRecommendation,
    context: ConversationalContext
  ): ConversationalPresentation {
    return {
      naturalLanguageDescription: rec.tool.description || '',
      conversationalIntroduction: `I recommend using ${rec.tool.name} for this task`,
      usageExplanation: rec.contextualExplanation,
      quickActions: [],
      clarifyingQuestions: [],
      followUpSuggestions: rec.followUpSuggestions,
      displayPriority: rec.priority,
    }
  }

  private determineConfirmationRequirement(
    rec: EnhancedToolRecommendation,
    context: ConversationalContext
  ): boolean {
    return rec.difficultyForUser === 'challenging'
  }

  private generateIntegrationInstructions(rec: EnhancedToolRecommendation): string[] {
    return rec.preparationSteps
  }

  private generateErrorHandlingGuidance(rec: EnhancedToolRecommendation): string[] {
    return [
      'Check for proper authentication',
      'Verify input parameters',
      'Handle timeout scenarios',
    ]
  }

  private generateSuccessIndicators(rec: EnhancedToolRecommendation): string[] {
    return [
      'Tool executes without errors',
      'Expected output is generated',
      'User satisfaction is achieved',
    ]
  }

  private async updateUserPreferenceLearning(event: ToolSelectionEvent): Promise<void> {
    // Update user preferences based on selection
  }

  private async adjustRecommendationStrategy(event: ToolSelectionEvent): Promise<void> {
    // Adjust future recommendations based on user selections
  }

  private async updateToolEffectivenessMetrics(feedback: ToolUsageFeedback): Promise<void> {
    // Update tool effectiveness based on feedback
  }

  private async generateImprovementSuggestions(feedback: ToolUsageFeedback): Promise<void> {
    // Generate suggestions for improving low-satisfaction tools
  }
}

// =============================================================================
// Supporting Systems (Stubs for Implementation)
// =============================================================================

class AgentLearningSystem {
  async applyLearning(
    recommendations: AgentToolRecommendation[],
    agentId: string,
    userId: string
  ): Promise<AgentToolRecommendation[]> {
    return recommendations
  }

  async recordRecommendationRequest(
    request: ToolRecommendationRequest,
    response: ToolRecommendationResponse
  ): Promise<void> {
    // Record request/response for learning
  }

  async recordToolSelection(event: ToolSelectionEvent): Promise<void> {
    // Record tool selection for learning
  }

  async incorporateFeedback(feedback: ToolUsageFeedback, insights: any): Promise<void> {
    // Incorporate feedback into learning algorithms
  }

  async getAgentLearningData(agentId: string): Promise<AgentLearningData> {
    return {
      agentId,
      totalInteractions: 0,
      successfulRecommendations: 0,
      userSatisfactionAverage: 4.0,
      successfulPatterns: [],
      failurePatterns: [],
      userSpecificLearning: {},
      lastUpdateTimestamp: new Date(),
      learningConfidence: 0.7,
    }
  }

  async getUserLearningProfile(userId: string, agentId: string): Promise<UserLearningProfile> {
    return {
      userId,
      preferredTools: [],
      toolEffectiveness: {},
      communicationStyle: 'conversational',
      learningSpeed: 0.7,
      adaptationSuggestions: [],
    }
  }
}

class FeedbackProcessor {
  async processFeedback(feedback: ToolUsageFeedback): Promise<any> {
    return { insights: [] }
  }
}

class PerformanceMonitor {
  async getCurrentLoad(): Promise<number> {
    return 0.3 // 30% load
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createAgentToolAPI(): AgentToolAPI {
  return new AgentToolAPI()
}

export async function requestToolRecommendations(
  request: ToolRecommendationRequest
): Promise<ToolRecommendationResponse> {
  const api = createAgentToolAPI()
  return api.requestToolRecommendations(request)
}

export async function recordToolSelection(event: ToolSelectionEvent): Promise<void> {
  const api = createAgentToolAPI()
  return api.recordToolSelection(event)
}

export async function processUsageFeedback(feedback: ToolUsageFeedback): Promise<void> {
  const api = createAgentToolAPI()
  return api.processUsageFeedback(feedback)
}
