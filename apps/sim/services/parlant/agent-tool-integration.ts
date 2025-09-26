/**
 * AI Agent Tool Integration System
 * =================================
 *
 * This module integrates the Universal Tool Adapter System with Parlant agents,
 * providing seamless tool access, natural language understanding, and intelligent
 * workflow execution for conversational AI agents.
 *
 * Key Features:
 * - Automatic tool registration with Parlant agents
 * - Natural language tool invocation and parameter handling
 * - Context-aware tool recommendations within conversations
 * - Intelligent tool chaining and workflow composition
 * - Real-time tool availability and capability updates
 * - Multi-modal tool interaction support
 * - Agent learning from tool usage patterns
 */

import { agentService } from './agent-service'
import type { ConversationalResponse } from './conversational-intelligence'
import { conversationalEngine } from './conversational-intelligence'
import type { ConversationalToolExecution, ToolRecommendationContext } from './tool-adapter'
import { toolAdapter, toolRegistry } from './tool-adapter'
import type { SmartRecommendationResult, UserIntent } from './tool-recommendations'
import { recommendationEngine } from './tool-recommendations'
import type { AuthContext } from './types'

// =============================================
// Agent Tool Integration Types
// =============================================

/**
 * Agent tool capabilities and configuration
 */
export interface AgentToolCapabilities {
  /** Agent identifier */
  agentId: string
  /** Available tools for this agent */
  availableTools: string[]
  /** Tool usage permissions and restrictions */
  toolPermissions: Record<string, ToolPermission>
  /** Agent's tool usage preferences */
  toolPreferences: {
    /** Preferred tools for common tasks */
    preferredTools: Record<UserIntent, string[]>
    /** Tools the agent should avoid */
    restrictedTools: string[]
    /** Agent's confidence levels with different tools */
    toolExpertise: Record<string, number>
  }
  /** Learning configuration */
  learningConfig: {
    /** Whether agent should learn from tool usage */
    enableLearning: boolean
    /** How many interactions to remember */
    memorySize: number
    /** Learning rate for tool recommendations */
    learningRate: number
  }
}

/**
 * Tool permission configuration
 */
export interface ToolPermission {
  /** Whether agent can use this tool */
  allowed: boolean
  /** Parameter restrictions */
  parameterRestrictions?: Record<string, any>
  /** Usage limits (calls per hour, etc.) */
  usageLimits?: {
    maxCallsPerHour?: number
    maxCallsPerDay?: number
    requiresApproval?: boolean
  }
  /** Audit requirements */
  auditLevel: 'none' | 'basic' | 'detailed'
}

/**
 * Agent conversation context with tool awareness
 */
export interface AgentConversationContext {
  /** Basic conversation context */
  conversation: ToolRecommendationContext
  /** Agent-specific context */
  agent: {
    id: string
    capabilities: AgentToolCapabilities
    currentConversation: string[]
    toolUsageHistory: ToolUsageRecord[]
  }
  /** Workspace context */
  workspace: {
    id: string
    availableTools: string[]
    toolConfiguration: Record<string, any>
    permissions: string[]
  }
}

/**
 * Record of tool usage by agent
 */
export interface ToolUsageRecord {
  toolId: string
  timestamp: Date
  parameters: Record<string, any>
  success: boolean
  executionTime: number
  userFeedback?: number // 1-5 rating
  errors?: string[]
}

/**
 * Agent tool recommendation with confidence and reasoning
 */
export interface AgentToolRecommendation {
  /** Base recommendation */
  recommendation: SmartRecommendationResult
  /** Agent-specific enhancements */
  agentContext: {
    /** Why this tool fits the agent's capabilities */
    agentRelevance: string
    /** Agent's experience level with this tool */
    expertiseLevel: number
    /** Estimated success probability */
    successProbability: number
    /** Suggested learning opportunities */
    learningOpportunities: string[]
  }
  /** Workspace compatibility */
  workspaceCompatibility: {
    /** Whether all required permissions are available */
    hasPermissions: boolean
    /** Missing permissions if any */
    missingPermissions: string[]
    /** Tool availability in workspace */
    available: boolean
  }
}

/**
 * Agent tool execution result with learning data
 */
export interface AgentToolExecutionResult {
  /** Base execution result */
  execution: ConversationalToolExecution
  /** Agent learning data */
  learningData: {
    /** What the agent learned from this interaction */
    insights: string[]
    /** Updated tool expertise levels */
    expertiseUpdates: Record<string, number>
    /** New tool associations discovered */
    toolAssociations: Array<{ toolA: string; toolB: string; strength: number }>
    /** Conversation patterns for future reference */
    conversationPatterns: ConversationPattern[]
  }
  /** Performance metrics */
  performance: {
    /** Time from request to completion */
    responseTime: number
    /** User satisfaction indicators */
    satisfactionMetrics: {
      taskCompleted: boolean
      userConfident: boolean
      wouldUseAgain: boolean
    }
    /** Efficiency metrics */
    efficiency: {
      parametersCollectedAutomatically: number
      totalParameters: number
      conversationTurns: number
    }
  }
}

/**
 * Conversation pattern for agent learning
 */
export interface ConversationPattern {
  /** Pattern identifier */
  id: string
  /** User input pattern */
  userPattern: string
  /** Successful tool selection */
  toolChain: string[]
  /** Context where this pattern works */
  contextConditions: string[]
  /** Success rate of this pattern */
  successRate: number
}

// =============================================
// Agent Tool Integration Manager
// =============================================

/**
 * Main integration manager for agent-tool interactions
 */
export class AgentToolIntegrationManager {
  private agentCapabilities: Map<string, AgentToolCapabilities> = new Map()
  private learningEngine = new AgentToolLearningEngine()

  /**
   * Initialize agent with tool capabilities
   */
  async initializeAgentTools(
    agentId: string,
    toolConfig: Partial<AgentToolCapabilities>,
    authContext: AuthContext
  ): Promise<AgentToolCapabilities> {
    // Get agent details
    const agent = await agentService.getAgent(agentId, authContext)
    if (!agent.success) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    // Determine available tools based on workspace and agent configuration
    const availableTools = await this.determineAvailableTools(agent.data, authContext)

    // Create default capabilities
    const capabilities: AgentToolCapabilities = {
      agentId,
      availableTools,
      toolPermissions: this.createDefaultPermissions(availableTools),
      toolPreferences: this.createDefaultPreferences(availableTools),
      learningConfig: {
        enableLearning: true,
        memorySize: 1000,
        learningRate: 0.1,
      },
      ...toolConfig,
    }

    // Register tools with Parlant agent
    await this.registerToolsWithAgent(agentId, capabilities, authContext)

    // Store capabilities
    this.agentCapabilities.set(agentId, capabilities)

    return capabilities
  }

  /**
   * Get tool recommendations for agent conversation
   */
  async getAgentToolRecommendations(
    agentId: string,
    userQuery: string,
    conversationHistory: string[],
    authContext: AuthContext
  ): Promise<AgentToolRecommendation> {
    const capabilities = this.agentCapabilities.get(agentId)
    if (!capabilities) {
      throw new Error(`Agent not initialized: ${agentId}`)
    }

    // Build agent conversation context
    const context: AgentConversationContext = {
      conversation: {
        conversationHistory: conversationHistory.map((msg) => ({
          role: 'user',
          content: msg,
          timestamp: new Date(),
        })),
        userIntents: [], // Will be filled by recommendation engine
        usedTools: [],
        userProfile: {
          skillLevel: 'intermediate',
          preferredCategories: [],
          frequentlyUsedTools: [],
        },
      },
      agent: {
        id: agentId,
        capabilities,
        currentConversation: conversationHistory,
        toolUsageHistory: await this.getAgentToolHistory(agentId),
      },
      workspace: {
        id: authContext.workspace_id || '',
        availableTools: capabilities.availableTools,
        toolConfiguration: {},
        permissions: authContext.permissions || [],
      },
    }

    // Get base recommendations
    const baseRecommendations = await recommendationEngine.getRecommendations(
      userQuery,
      context.conversation,
      authContext
    )

    // Enhance with agent-specific context
    const agentRecommendation: AgentToolRecommendation = {
      recommendation: baseRecommendations,
      agentContext: await this.enhanceWithAgentContext(baseRecommendations, capabilities),
      workspaceCompatibility: this.checkWorkspaceCompatibility(
        baseRecommendations,
        context.workspace
      ),
    }

    return agentRecommendation
  }

  /**
   * Execute tool through agent with conversational intelligence
   */
  async executeToolForAgent(
    agentId: string,
    toolId: string,
    userQuery: string,
    conversationHistory: string[],
    authContext: AuthContext
  ): Promise<AgentToolExecutionResult> {
    const startTime = Date.now()
    const capabilities = this.agentCapabilities.get(agentId)

    if (!capabilities) {
      throw new Error(`Agent not initialized: ${agentId}`)
    }

    // Check permissions
    const permission = capabilities.toolPermissions[toolId]
    if (!permission?.allowed) {
      throw new Error(`Agent ${agentId} not permitted to use tool ${toolId}`)
    }

    // Create user context for conversational engine
    const userContext = {
      communicationStyle: 'detailed' as const,
      expertiseLevel: 'intermediate' as const,
      interactionMode: 'guided' as const,
      locale: 'en-US',
      toolUsagePatterns: this.buildToolUsagePatterns(capabilities),
    }

    // Start conversational tool interaction
    const conversationId = await conversationalEngine.startToolConversation(
      toolId,
      userQuery,
      authContext,
      userContext
    )

    // Process conversation to completion
    const conversationResult = await this.completeToolConversation(
      conversationId,
      conversationHistory,
      authContext
    )

    // Execute the tool
    const executionResult = await conversationalEngine.executeToolConversation(
      conversationId,
      authContext
    )

    // Generate learning data
    const learningData = await this.learningEngine.generateLearningData(
      agentId,
      toolId,
      userQuery,
      conversationHistory,
      executionResult.execution,
      capabilities
    )

    // Update agent capabilities based on learning
    await this.updateAgentCapabilities(agentId, learningData)

    // Record usage for future learning
    await this.recordToolUsage(agentId, {
      toolId,
      timestamp: new Date(),
      parameters: executionResult.execution.execution.parameters,
      success: executionResult.execution.execution.status === 'completed',
      executionTime: Date.now() - startTime,
      errors: executionResult.execution.userFriendlyErrors,
    })

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(
      startTime,
      conversationResult,
      executionResult
    )

    return {
      execution: executionResult.execution,
      learningData,
      performance,
    }
  }

  /**
   * Get agent's tool usage analytics
   */
  async getAgentToolAnalytics(
    agentId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<AgentToolAnalytics> {
    const capabilities = this.agentCapabilities.get(agentId)
    if (!capabilities) {
      throw new Error(`Agent not initialized: ${agentId}`)
    }

    const history = await this.getAgentToolHistory(agentId)
    const filteredHistory = timeRange
      ? history.filter(
          (record) => record.timestamp >= timeRange.start && record.timestamp <= timeRange.end
        )
      : history

    return {
      totalToolCalls: filteredHistory.length,
      successRate: filteredHistory.filter((r) => r.success).length / filteredHistory.length,
      averageExecutionTime:
        filteredHistory.reduce((sum, r) => sum + r.executionTime, 0) / filteredHistory.length,
      mostUsedTools: this.calculateMostUsedTools(filteredHistory),
      toolExpertiseProgress: this.calculateExpertiseProgress(
        capabilities.toolPreferences.toolExpertise
      ),
      userSatisfaction:
        filteredHistory.filter((r) => r.userFeedback).reduce((sum, r) => sum + r.userFeedback!, 0) /
        filteredHistory.filter((r) => r.userFeedback).length,
      learningInsights: await this.learningEngine.getAgentInsights(agentId),
      recommendationAccuracy: await this.calculateRecommendationAccuracy(agentId),
    }
  }

  /**
   * Update agent tool preferences based on usage patterns
   */
  async updateAgentPreferences(
    agentId: string,
    preferences: Partial<AgentToolCapabilities['toolPreferences']>
  ): Promise<void> {
    const capabilities = this.agentCapabilities.get(agentId)
    if (!capabilities) {
      throw new Error(`Agent not initialized: ${agentId}`)
    }

    // Update preferences
    capabilities.toolPreferences = {
      ...capabilities.toolPreferences,
      ...preferences,
    }

    // Store updated capabilities
    this.agentCapabilities.set(agentId, capabilities)

    // Update agent configuration in database
    await this.persistCapabilities(agentId, capabilities)
  }

  // =============================================
  // Private Implementation Methods
  // =============================================

  /**
   * Determine which tools are available to the agent
   */
  private async determineAvailableTools(agent: any, authContext: AuthContext): Promise<string[]> {
    const allTools = toolRegistry.getAllTools()
    const availableTools: string[] = []

    for (const tool of allTools) {
      // Check workspace permissions
      const hasPermission = await this.checkToolPermission(tool.id, authContext)

      if (hasPermission) {
        availableTools.push(tool.id)
      }
    }

    return availableTools
  }

  /**
   * Create default permissions for tools
   */
  private createDefaultPermissions(toolIds: string[]): Record<string, ToolPermission> {
    const permissions: Record<string, ToolPermission> = {}

    toolIds.forEach((toolId) => {
      const tool = toolRegistry.getTool(toolId)

      permissions[toolId] = {
        allowed: true,
        auditLevel: tool?.complexity === 'complex' ? 'detailed' : 'basic',
        usageLimits: {
          maxCallsPerHour: tool?.complexity === 'simple' ? 100 : 20,
          maxCallsPerDay: tool?.complexity === 'simple' ? 1000 : 100,
        },
      }
    })

    return permissions
  }

  /**
   * Create default tool preferences
   */
  private createDefaultPreferences(toolIds: string[]): AgentToolCapabilities['toolPreferences'] {
    const allTools = toolIds.map((id) => toolRegistry.getTool(id)!).filter(Boolean)

    // Categorize tools by intent
    const preferredTools: Record<UserIntent, string[]> = {} as any

    // Map tools to intents based on their characteristics
    allTools.forEach((tool) => {
      if (tool.id.includes('email') || tool.id.includes('gmail')) {
        if (!preferredTools.send_email) preferredTools.send_email = []
        preferredTools.send_email.push(tool.id)
      }

      if (tool.id.includes('slack') || tool.id.includes('teams')) {
        if (!preferredTools.send_message) preferredTools.send_message = []
        preferredTools.send_message.push(tool.id)
      }

      if (tool.id.includes('api') || tool.id.includes('http')) {
        if (!preferredTools.make_api_call) preferredTools.make_api_call = []
        preferredTools.make_api_call.push(tool.id)
      }
    })

    return {
      preferredTools,
      restrictedTools: [],
      toolExpertise: Object.fromEntries(toolIds.map((id) => [id, 0.5])), // Start with moderate expertise
    }
  }

  /**
   * Register tools with Parlant agent
   */
  private async registerToolsWithAgent(
    agentId: string,
    capabilities: AgentToolCapabilities,
    authContext: AuthContext
  ): Promise<void> {
    // Convert Sim tools to Parlant tool format
    const parlantTools = capabilities.availableTools
      .map((toolId) => {
        const tool = toolRegistry.getTool(toolId)
        if (!tool) return null

        return toolAdapter.adaptTool(toolRegistry.getBlockConfig(toolId)!)
      })
      .filter(Boolean)

    // Update agent configuration with tools
    await agentService.updateAgent(
      agentId,
      {
        config: {
          ...((await agentService.getAgent(agentId, authContext)).data.config || {}),
          tools: parlantTools,
        },
      },
      authContext
    )
  }

  /**
   * Complete tool conversation by processing all required interactions
   */
  private async completeToolConversation(
    conversationId: string,
    conversationHistory: string[],
    authContext: AuthContext
  ): Promise<ConversationalResponse> {
    let response = await conversationalEngine.processUserMessage(
      conversationId,
      conversationHistory.join(' '),
      authContext
    )

    // Continue conversation until ready to execute
    let attempts = 0
    const maxAttempts = 10

    while (!response.status.readyToExecute && attempts < maxAttempts) {
      // Auto-fill parameters where possible
      const autoFilledMessage = this.generateAutoFillMessage(response.status)

      if (autoFilledMessage) {
        response = await conversationalEngine.processUserMessage(
          conversationId,
          autoFilledMessage,
          authContext
        )
      } else {
        break // Can't auto-fill, need user input
      }

      attempts++
    }

    return response
  }

  /**
   * Generate message to auto-fill obvious parameters
   */
  private generateAutoFillMessage(status: any): string | null {
    if (status.remainingParameters.length === 0) return null

    const param = status.remainingParameters[0]

    // Auto-fill obvious defaults
    const defaults: Record<string, string> = {
      method: 'GET',
      operation: 'send',
      limit: '10',
      timeout: '30',
    }

    if (defaults[param]) {
      return defaults[param]
    }

    return null
  }

  /**
   * Check if tool permission exists for workspace
   */
  private async checkToolPermission(toolId: string, authContext: AuthContext): Promise<boolean> {
    // In a real implementation, this would check workspace permissions
    // For now, we'll allow all tools
    return true
  }

  /**
   * Enhance recommendations with agent context
   */
  private async enhanceWithAgentContext(
    recommendations: SmartRecommendationResult,
    capabilities: AgentToolCapabilities
  ): Promise<AgentToolRecommendation['agentContext']> {
    const topTool = recommendations.recommendations[0]?.tool
    if (!topTool) {
      return {
        agentRelevance: 'No suitable tools found',
        expertiseLevel: 0,
        successProbability: 0,
        learningOpportunities: [],
      }
    }

    const expertise = capabilities.toolPreferences.toolExpertise[topTool.id] || 0.5

    return {
      agentRelevance: `This agent has ${expertise > 0.7 ? 'high' : expertise > 0.4 ? 'moderate' : 'limited'} experience with ${topTool.name}`,
      expertiseLevel: expertise,
      successProbability: Math.min(0.9, expertise + recommendations.confidence * 0.3),
      learningOpportunities: expertise < 0.8 ? [`Improve ${topTool.name} proficiency`] : [],
    }
  }

  /**
   * Check workspace compatibility
   */
  private checkWorkspaceCompatibility(
    recommendations: SmartRecommendationResult,
    workspace: AgentConversationContext['workspace']
  ): AgentToolRecommendation['workspaceCompatibility'] {
    const topTool = recommendations.recommendations[0]?.tool
    if (!topTool) {
      return {
        hasPermissions: false,
        missingPermissions: [],
        available: false,
      }
    }

    return {
      hasPermissions: workspace.availableTools.includes(topTool.id),
      missingPermissions: workspace.availableTools.includes(topTool.id) ? [] : [topTool.id],
      available: workspace.availableTools.includes(topTool.id),
    }
  }

  // Additional helper methods would be implemented here...
  private buildToolUsagePatterns(capabilities: AgentToolCapabilities): Record<string, any> {
    return capabilities.toolPreferences.toolExpertise
  }

  private async updateAgentCapabilities(agentId: string, learningData: any): Promise<void> {
    // Update expertise based on learning
  }

  private async recordToolUsage(agentId: string, usage: ToolUsageRecord): Promise<void> {
    // Record usage for analytics
  }

  private calculatePerformanceMetrics(
    startTime: number,
    conversationResult: any,
    executionResult: any
  ): any {
    return {
      responseTime: Date.now() - startTime,
      satisfactionMetrics: {
        taskCompleted: true,
        userConfident: true,
        wouldUseAgain: true,
      },
      efficiency: {
        parametersCollectedAutomatically: 0,
        totalParameters: 0,
        conversationTurns: 0,
      },
    }
  }

  private async getAgentToolHistory(agentId: string): Promise<ToolUsageRecord[]> {
    return [] // Would fetch from database
  }

  private calculateMostUsedTools(
    history: ToolUsageRecord[]
  ): Array<{ toolId: string; count: number }> {
    const counts: Record<string, number> = {}
    history.forEach((record) => {
      counts[record.toolId] = (counts[record.toolId] || 0) + 1
    })
    return Object.entries(counts).map(([toolId, count]) => ({ toolId, count }))
  }

  private calculateExpertiseProgress(expertise: Record<string, number>): Record<string, number> {
    return expertise // Would calculate progress over time
  }

  private async calculateRecommendationAccuracy(agentId: string): Promise<number> {
    return 0.85 // Would calculate based on user feedback
  }

  private async persistCapabilities(
    agentId: string,
    capabilities: AgentToolCapabilities
  ): Promise<void> {
    // Would persist to database
  }
}

/**
 * Agent tool learning engine for improving recommendations over time
 */
export class AgentToolLearningEngine {
  async generateLearningData(
    agentId: string,
    toolId: string,
    userQuery: string,
    conversationHistory: string[],
    execution: ConversationalToolExecution['execution'],
    capabilities: AgentToolCapabilities
  ): Promise<AgentToolExecutionResult['learningData']> {
    // Generate insights from the interaction
    const insights = await this.extractInsights(userQuery, toolId, execution)

    // Update expertise levels
    const expertiseUpdates = this.calculateExpertiseUpdates(toolId, execution, capabilities)

    // Discover tool associations
    const toolAssociations = this.discoverToolAssociations(conversationHistory, toolId)

    // Extract conversation patterns
    const conversationPatterns = this.extractConversationPatterns(
      userQuery,
      toolId,
      execution.status === 'completed'
    )

    return {
      insights,
      expertiseUpdates,
      toolAssociations,
      conversationPatterns,
    }
  }

  async getAgentInsights(agentId: string): Promise<string[]> {
    return [
      'Agent shows preference for API-based integrations',
      'Consistently successful with email tools',
      'Learning curve detected with database tools',
    ]
  }

  private async extractInsights(
    userQuery: string,
    toolId: string,
    execution: any
  ): Promise<string[]> {
    const insights: string[] = []

    if (execution.status === 'completed') {
      insights.push(`Successfully used ${toolId} for query: "${userQuery}"`)
    } else {
      insights.push(`Encountered difficulty with ${toolId} - needs more practice`)
    }

    return insights
  }

  private calculateExpertiseUpdates(
    toolId: string,
    execution: any,
    capabilities: AgentToolCapabilities
  ): Record<string, number> {
    const currentExpertise = capabilities.toolPreferences.toolExpertise[toolId] || 0.5
    const adjustment = execution.status === 'completed' ? 0.1 : -0.05

    return {
      [toolId]: Math.max(0, Math.min(1, currentExpertise + adjustment)),
    }
  }

  private discoverToolAssociations(
    conversationHistory: string[],
    toolId: string
  ): Array<{ toolA: string; toolB: string; strength: number }> {
    // Would analyze conversation for tool relationships
    return []
  }

  private extractConversationPatterns(
    userQuery: string,
    toolId: string,
    success: boolean
  ): ConversationPattern[] {
    return [
      {
        id: `pattern-${Date.now()}`,
        userPattern: userQuery.toLowerCase().replace(/[^a-z\s]/g, ''),
        toolChain: [toolId],
        contextConditions: ['user_query_contains_action'],
        successRate: success ? 1.0 : 0.0,
      },
    ]
  }
}

// =============================================
// Supporting Types
// =============================================

export interface AgentToolAnalytics {
  totalToolCalls: number
  successRate: number
  averageExecutionTime: number
  mostUsedTools: Array<{ toolId: string; count: number }>
  toolExpertiseProgress: Record<string, number>
  userSatisfaction: number
  learningInsights: string[]
  recommendationAccuracy: number
}

interface AgentConversationState {
  agentId: string
  conversationId: string
  toolContext: any
  learningData: any
}

// =============================================
// Export singleton instance
// =============================================

export const agentToolIntegration = new AgentToolIntegrationManager()
