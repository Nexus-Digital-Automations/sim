/**
 * Natural Language Engine - Main Export
 *
 * Comprehensive natural language interface system for conversational tool interactions.
 * This is the main entry point for all natural language capabilities.
 *
 * @author NATURAL_LANGUAGE_ENGINE_AGENT
 * @version 1.0.0
 */

// =============================================================================
// Core Components Export
// =============================================================================

export type {
  ConversationalHint,
  DescriptionTemplate,
  NaturalLanguageConfig,
} from './description-generator'
// Description Generation
export {
  createDescriptionGenerator,
  DescriptionGenerator,
  generateToolNaturalLanguage,
  TOOL_DESCRIPTION_TEMPLATES,
} from './description-generator'
export type {
  FAQItem,
  HelpExample,
  HelpQuery,
  HelpResponse,
  QuickAction,
  RelatedHelpItem,
  ToolHelp,
  TroubleshootingGuide,
  Tutorial,
  TutorialStep,
} from './help-system'
// Help System
export {
  createHelpSystem,
  NaturalLanguageHelpSystem,
  processHelpQuery,
} from './help-system'
export type {
  ConversationalInput,
  ConversationPrompt,
  ExtractionPattern,
  ParameterClarification,
  ParameterEntity,
  ParameterSuggestion,
  ParsedParameters,
} from './parameter-parser'
// Parameter Parsing
export {
  ConversationalParameterParser,
  createParameterParser,
  parseNaturalLanguageParameters,
} from './parameter-parser'
export type {
  ConversationExample,
  IntentAnalysis,
  RecommendationEngine,
  RecommendationExplanation,
  RecommendationRequest,
  ToolCombination,
  ToolRecommendationWithDetails,
  UserFeedback,
} from './recommendation-engine'
// Recommendation Engine
export {
  createRecommendationEngine,
  SmartToolRecommendationEngine,
} from './recommendation-engine'
export type {
  ConversationTurn,
  ExamplePattern,
  GuidanceStep,
  ScenarioCategory,
  ScenarioContext,
  ScenarioExample,
  ScenarioOutcome,
  StepByStepGuide,
} from './scenario-examples'
// Scenario Examples
export {
  createScenarioExamplesEngine,
  generateExamplesForTool,
  generateStepByStepGuide,
  ScenarioExamplesEngine,
} from './scenario-examples'
export type {
  ContextualHelp,
  ConversationMessage,
  ToolRecommendation,
  UsageCondition,
  UsageContext,
  UsageGuideline,
  UserIntent,
  UserPreferences,
  UserProfile,
} from './usage-guidelines'
// Usage Guidelines
export {
  createUsageGuidelinesEngine,
  getContextualGuidance,
  recommendTools,
  UsageGuidelinesEngine,
} from './usage-guidelines'

// =============================================================================
// Unified Natural Language Engine
// =============================================================================

import type { ToolConfig } from '../types/tools-types'
import { DescriptionGenerator } from './description-generator'
import type { HelpQuery, HelpResponse } from './help-system'
import { NaturalLanguageHelpSystem } from './help-system'
import type { ConversationalInput, ParsedParameters } from './parameter-parser'
import { ConversationalParameterParser } from './parameter-parser'
import type { RecommendationRequest, ToolRecommendationWithDetails } from './recommendation-engine'
import { SmartToolRecommendationEngine } from './recommendation-engine'
import type { ScenarioExample } from './scenario-examples'
import { ScenarioExamplesEngine } from './scenario-examples'
import type { ConversationMessage, UsageContext, UserIntent } from './usage-guidelines'
import { UsageGuidelinesEngine } from './usage-guidelines'

/**
 * Unified Natural Language Engine
 *
 * Combines all natural language capabilities into a single, easy-to-use interface
 * for conversational tool interactions.
 */
export class NaturalLanguageEngine {
  private descriptionGenerator: DescriptionGenerator
  private usageGuidelines: UsageGuidelinesEngine
  private parameterParser: ConversationalParameterParser
  private recommendationEngine: SmartToolRecommendationEngine
  private helpSystem: NaturalLanguageHelpSystem
  private scenarioEngine: ScenarioExamplesEngine

  constructor() {
    this.descriptionGenerator = new DescriptionGenerator()
    this.usageGuidelines = new UsageGuidelinesEngine()
    this.parameterParser = new ConversationalParameterParser()
    this.recommendationEngine = new SmartToolRecommendationEngine()
    this.helpSystem = new NaturalLanguageHelpSystem()
    this.scenarioEngine = new ScenarioExamplesEngine()
  }

  // =============================================================================
  // High-Level Interface Methods
  // =============================================================================

  /**
   * Process a conversational request and provide comprehensive assistance
   */
  async processConversation(
    userMessage: string,
    context: UsageContext,
    conversationHistory: ConversationMessage[] = []
  ): Promise<ConversationResponse> {
    try {
      // Step 1: Analyze the user's intent
      const intent = await this.analyzeIntent(userMessage, conversationHistory)

      // Step 2: Get tool recommendations based on intent
      const recommendations = await this.recommendationEngine.recommendTools({
        userMessage,
        conversationContext: conversationHistory,
        userContext: context,
        availableTools: context.availableTools || [],
        maxRecommendations: 5,
      })

      // Step 3: If specific tool mentioned, parse parameters
      let parsedParameters: ParsedParameters | null = null
      if (recommendations.length > 0) {
        const primaryTool = recommendations[0].tool
        parsedParameters = await this.parameterParser.parseParameters(
          {
            rawMessage: userMessage,
            context,
            previousParameters: {},
            toolId: primaryTool.id,
          },
          primaryTool
        )
      }

      // Step 4: Generate contextual help and guidance
      const helpResponse = await this.helpSystem.processHelpQuery({
        userMessage,
        context,
        conversationHistory,
      })

      // Step 5: Get relevant examples
      const examples =
        recommendations.length > 0
          ? await this.scenarioEngine.generateToolExamples(recommendations[0].toolId, context, 2)
          : []

      return {
        intent,
        recommendations,
        parsedParameters,
        help: helpResponse,
        examples,
        confidence: this.calculateOverallConfidence(
          intent,
          recommendations,
          parsedParameters,
          helpResponse
        ),
        suggestedActions: this.generateSuggestedActions(
          recommendations,
          parsedParameters,
          helpResponse
        ),
      }
    } catch (error) {
      console.error('Conversation processing failed:', error)
      return this.generateErrorResponse(userMessage, error as Error)
    }
  }

  /**
   * Get comprehensive tool assistance
   */
  async getToolAssistance(
    toolId: string,
    context: UsageContext,
    specificQuestion?: string
  ): Promise<ToolAssistance> {
    const [naturalLanguageConfig, usageGuidelines, helpResponse, examples] = await Promise.all([
      this.generateToolDescription(toolId, context),
      this.usageGuidelines.getUsageGuidelines(toolId, context),
      this.helpSystem.getToolHelp(toolId, context, specificQuestion),
      this.scenarioEngine.generateToolExamples(toolId, context, 3),
    ])

    return {
      toolId,
      description: naturalLanguageConfig.description,
      usageDescription: naturalLanguageConfig.usageDescription,
      guidelines: usageGuidelines,
      help: helpResponse,
      examples,
      conversationalHints: naturalLanguageConfig.conversationalHints,
      exampleUsage: naturalLanguageConfig.exampleUsage,
      keywords: naturalLanguageConfig.keywords || [],
    }
  }

  /**
   * Parse natural language input into tool parameters
   */
  async parseInput(input: ConversationalInput, tool: ToolConfig): Promise<ParsedParameters> {
    return this.parameterParser.parseParameters(input, tool)
  }

  /**
   * Get tool recommendations for a user request
   */
  async getRecommendations(
    request: RecommendationRequest
  ): Promise<ToolRecommendationWithDetails[]> {
    return this.recommendationEngine.recommendTools(request)
  }

  /**
   * Process help queries
   */
  async getHelp(query: HelpQuery): Promise<HelpResponse> {
    return this.helpSystem.processHelpQuery(query)
  }

  /**
   * Generate usage examples
   */
  async getExamples(toolId: string, context: UsageContext, count = 3): Promise<ScenarioExample[]> {
    return this.scenarioEngine.generateToolExamples(toolId, context, count)
  }

  // =============================================================================
  // Tool Registry Integration
  // =============================================================================

  /**
   * Register a tool with natural language capabilities
   */
  async registerTool(
    tool: ToolConfig,
    naturalLanguageConfig?: Partial<import('./description-generator').NaturalLanguageConfig>
  ): Promise<void> {
    // Generate natural language configuration if not provided
    const config =
      naturalLanguageConfig || this.descriptionGenerator.generateNaturalLanguageConfig(tool)

    // Store the enhanced tool configuration
    // This would integrate with the actual tool registry
    console.log(`Registered tool ${tool.id} with natural language capabilities`)
  }

  /**
   * Update tool's natural language configuration
   */
  async updateToolNaturalLanguage(
    toolId: string,
    updates: Partial<import('./description-generator').NaturalLanguageConfig>
  ): Promise<void> {
    // Update the natural language configuration
    console.log(`Updated natural language config for tool ${toolId}`)
  }

  // =============================================================================
  // Learning and Adaptation
  // =============================================================================

  /**
   * Record user interaction for learning
   */
  async recordInteraction(interaction: UserInteraction): Promise<void> {
    // Record the interaction for learning and improvement
    await Promise.all([
      this.recommendationEngine.recordToolUsage(
        interaction.toolId,
        interaction.context,
        interaction.success
      ),
      this.recordUserPreferences(interaction),
    ])
  }

  /**
   * Adapt to user feedback
   */
  async processFeedback(
    recommendations: ToolRecommendationWithDetails[],
    feedback: import('./recommendation-engine').UserFeedback
  ): Promise<void> {
    await this.recommendationEngine.adaptToUserFeedback(recommendations, feedback)
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private async analyzeIntent(
    message: string,
    history: ConversationMessage[]
  ): Promise<UserIntent> {
    // Simple intent analysis - in production would use more sophisticated NLP
    const intent: UserIntent = {
      primary: this.extractPrimaryIntent(message),
      confidence: 0.8,
      urgency: this.assessUrgency(message),
      complexity: this.assessComplexity(message),
    }

    return intent
  }

  private extractPrimaryIntent(message: string): string {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('send') || lowerMessage.includes('email')) return 'send_communication'
    if (lowerMessage.includes('create') || lowerMessage.includes('make')) return 'create_content'
    if (lowerMessage.includes('find') || lowerMessage.includes('search'))
      return 'search_information'
    if (lowerMessage.includes('schedule') || lowerMessage.includes('calendar'))
      return 'schedule_organize'
    if (lowerMessage.includes('analyze') || lowerMessage.includes('process'))
      return 'analyze_process'
    if (lowerMessage.includes('help') || lowerMessage.includes('how')) return 'get_help'

    return 'general'
  }

  private assessUrgency(message: string): 'low' | 'medium' | 'high' {
    const urgentWords = /\b(urgent|asap|immediately|critical|emergency)\b/i
    return urgentWords.test(message) ? 'high' : 'medium'
  }

  private assessComplexity(message: string): 'simple' | 'moderate' | 'complex' {
    const complexWords = /\b(integrate|complex|multiple|advanced|analyze)\b/i
    return complexWords.test(message) ? 'complex' : 'simple'
  }

  private async generateToolDescription(
    toolId: string,
    context: UsageContext
  ): Promise<
    ReturnType<typeof this.descriptionGenerator.generateNaturalLanguageConfig> & {
      description: string
    }
  > {
    // This would fetch the actual tool configuration
    const mockTool: ToolConfig = { id: toolId, name: toolId }

    const config = this.descriptionGenerator.generateNaturalLanguageConfig(mockTool)
    const description = this.descriptionGenerator.generateToolDescription(
      mockTool,
      undefined,
      context.userProfile?.role
    )

    return {
      ...config,
      description,
    }
  }

  private calculateOverallConfidence(
    intent: UserIntent,
    recommendations: ToolRecommendationWithDetails[],
    parsedParameters: ParsedParameters | null,
    helpResponse: HelpResponse
  ): number {
    let confidence = intent.confidence * 0.3

    if (recommendations.length > 0) {
      confidence += recommendations[0].confidence * 0.4
    }

    if (parsedParameters) {
      confidence += parsedParameters.confidence * 0.2
    }

    confidence += helpResponse.confidence * 0.1

    return Math.min(confidence, 1)
  }

  private generateSuggestedActions(
    recommendations: ToolRecommendationWithDetails[],
    parsedParameters: ParsedParameters | null,
    helpResponse: HelpResponse
  ): SuggestedAction[] {
    const actions: SuggestedAction[] = []

    // Add tool execution actions
    recommendations.slice(0, 2).forEach((rec) => {
      actions.push({
        type: 'execute_tool',
        label: `Use ${rec.tool.name}`,
        toolId: rec.toolId,
        confidence: rec.confidence,
        description: rec.reason,
      })
    })

    // Add parameter clarification actions
    if (parsedParameters?.clarificationNeeded.length) {
      actions.push({
        type: 'clarify_parameters',
        label: 'Provide missing information',
        confidence: 0.8,
        description: 'Some parameters need clarification',
      })
    }

    // Add help actions
    if (helpResponse.quickActions?.length) {
      helpResponse.quickActions.forEach((quickAction) => {
        actions.push({
          type: 'get_help',
          label: quickAction.label,
          confidence: 0.6,
          description: quickAction.description || 'Get additional help',
        })
      })
    }

    return actions.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
  }

  private generateErrorResponse(userMessage: string, error: Error): ConversationResponse {
    return {
      intent: {
        primary: 'error',
        confidence: 0,
        urgency: 'medium',
        complexity: 'simple',
      },
      recommendations: [],
      parsedParameters: null,
      help: {
        answer:
          'I encountered an error processing your request. Please try rephrasing your question.',
        type: 'explanation',
        confidence: 0,
      },
      examples: [],
      confidence: 0,
      suggestedActions: [
        {
          type: 'get_help',
          label: 'Try rephrasing your request',
          confidence: 0.5,
          description: 'Rephrase your question for better understanding',
        },
      ],
    }
  }

  private async recordUserPreferences(interaction: UserInteraction): Promise<void> {
    // Record user preferences for future recommendations
    console.log(
      `Recorded user preference: ${interaction.toolId} used successfully: ${interaction.success}`
    )
  }
}

// =============================================================================
// Response Types
// =============================================================================

export interface ConversationResponse {
  intent: UserIntent
  recommendations: ToolRecommendationWithDetails[]
  parsedParameters: ParsedParameters | null
  help: HelpResponse
  examples: ScenarioExample[]
  confidence: number
  suggestedActions: SuggestedAction[]
}

export interface ToolAssistance {
  toolId: string
  description: string
  usageDescription: string
  guidelines: import('./usage-guidelines').UsageGuideline[]
  help: HelpResponse
  examples: ScenarioExample[]
  conversationalHints: import('./description-generator').ConversationalHint
  exampleUsage: string[]
  keywords: string[]
}

export interface SuggestedAction {
  type: 'execute_tool' | 'clarify_parameters' | 'get_help' | 'view_examples'
  label: string
  toolId?: string
  confidence: number
  description: string
}

export interface UserInteraction {
  toolId: string
  context: UsageContext
  success: boolean
  duration?: number
  parameters?: Record<string, any>
  feedback?: string
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new Natural Language Engine instance
 */
export function createNaturalLanguageEngine(): NaturalLanguageEngine {
  return new NaturalLanguageEngine()
}

/**
 * Process a conversational request using the natural language engine
 */
export async function processConversationalRequest(
  userMessage: string,
  context: UsageContext,
  conversationHistory: ConversationMessage[] = []
): Promise<ConversationResponse> {
  const engine = createNaturalLanguageEngine()
  return engine.processConversation(userMessage, context, conversationHistory)
}

/**
 * Get comprehensive assistance for a specific tool
 */
export async function getToolAssistance(
  toolId: string,
  context: UsageContext,
  specificQuestion?: string
): Promise<ToolAssistance> {
  const engine = createNaturalLanguageEngine()
  return engine.getToolAssistance(toolId, context, specificQuestion)
}
