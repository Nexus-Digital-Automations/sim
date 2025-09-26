/**
 * Local Copilot Tool Integration Service
 *
 * Bridges the Universal Tool Adapter System with the Local Copilot functionality.
 * Provides agent-aware tool discovery, contextual recommendations, and seamless
 * tool execution integration for conversational AI interactions.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { BlockConfig } from '@/blocks/types'
import {
  type EnhancedToolDescription,
  intelligenceEngine,
  type ToolRecommendation,
  type ToolRecommendationContext,
  toolRegistry,
} from '@/services/parlant/tool-adapter'
import type { Agent } from '@/services/parlant/types'
import type { LocalCopilotToolCall, MessageContext } from '@/stores/local-copilot/types'

const logger = createLogger('LocalCopilotToolIntegration')

// =============================================
// Core Integration Service
// =============================================

/**
 * Manages tool integration for local copilot agents
 */
export class LocalCopilotToolIntegration {
  private initialized = false

  /**
   * Initialize the tool integration system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      logger.info('Initializing local copilot tool integration')

      // Initialize with built-in tools first
      this.registerBuiltInTools()

      // TODO: Discover and register additional tools from the workspace
      // await this.discoverWorkspaceTools()

      this.initialized = true
      logger.info('Local copilot tool integration initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize tool integration', { error })
      throw error
    }
  }

  /**
   * Get available tools for a specific agent
   */
  getAgentTools(agent: Agent): EnhancedToolDescription[] {
    if (!this.initialized) {
      throw new Error('Tool integration not initialized')
    }

    // Filter tools based on agent capabilities
    const allTools = toolRegistry.getAllTools()

    // If agent has specific tool restrictions, filter accordingly
    if (agent.tools && agent.tools.length > 0) {
      return allTools.filter((tool) => agent.tools?.includes(tool.id))
    }

    // Return all available tools if no restrictions
    return allTools
  }

  /**
   * Get tool recommendations based on conversation context
   */
  async getToolRecommendations(
    agent: Agent,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>,
    userIntents: string[] = [],
    limit = 5
  ): Promise<ToolRecommendation[]> {
    if (!this.initialized) {
      throw new Error('Tool integration not initialized')
    }

    // Build recommendation context
    const context: ToolRecommendationContext = {
      conversationHistory,
      userIntents,
      usedTools: [], // TODO: Track used tools in conversation
      // TODO: Add workflow context if available
      // TODO: Add user profile from preferences
    }

    // Get recommendations from intelligence engine
    const recommendations = intelligenceEngine.recommendTools(context, limit)

    // Filter recommendations based on agent capabilities
    const agentTools = this.getAgentTools(agent)
    const agentToolIds = new Set(agentTools.map((t) => t.id))

    return recommendations.filter((rec) => agentToolIds.has(rec.tool.id))
  }

  /**
   * Execute a tool call through the local copilot system
   */
  async executeToolCall(
    agent: Agent,
    toolCall: LocalCopilotToolCall,
    contexts: MessageContext[] = []
  ): Promise<LocalCopilotToolCall> {
    if (!this.initialized) {
      throw new Error('Tool integration not initialized')
    }

    logger.info('Executing tool call', {
      agentId: agent.id,
      toolId: toolCall.name,
      arguments: Object.keys(toolCall.arguments || {}),
    })

    try {
      // Get tool description and block config
      const tool = toolRegistry.getTool(toolCall.name)
      const blockConfig = toolRegistry.getBlockConfig(toolCall.name)

      if (!tool || !blockConfig) {
        throw new Error(`Tool not found: ${toolCall.name}`)
      }

      // Mark as executing
      const executingCall: LocalCopilotToolCall = {
        ...toolCall,
        state: 'executing',
        startTime: Date.now(),
      }

      // TODO: Integrate with actual tool execution system
      // This would typically call the workflow engine or direct tool execution
      const result = await this.simulateToolExecution(tool, toolCall.arguments || {})

      // Mark as completed with results
      const completedCall: LocalCopilotToolCall = {
        ...executingCall,
        state: 'success',
        result,
        endTime: Date.now(),
        duration: Date.now() - executingCall.startTime!,
      }

      logger.info('Tool call completed successfully', {
        toolId: toolCall.name,
        duration: completedCall.duration,
      })

      return completedCall
    } catch (error) {
      logger.error('Tool call execution failed', {
        toolId: toolCall.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      const failedCall: LocalCopilotToolCall = {
        ...toolCall,
        state: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: Date.now(),
        duration: toolCall.startTime ? Date.now() - toolCall.startTime : undefined,
      }

      return failedCall
    }
  }

  /**
   * Format tool execution results for conversational display
   */
  formatToolResult(
    agent: Agent,
    toolCall: LocalCopilotToolCall
  ): {
    summary: string
    details?: string
    suggestedNextSteps?: string[]
  } {
    const tool = toolRegistry.getTool(toolCall.name)

    if (!tool) {
      return {
        summary: `Tool ${toolCall.name} execution completed`,
      }
    }

    // Use intelligence engine to format results
    const execution = {
      toolId: toolCall.name,
      status: toolCall.state === 'success' ? ('completed' as const) : ('failed' as const),
      result: toolCall.result,
      error: toolCall.error,
      duration: toolCall.duration,
    }

    const formatted = intelligenceEngine.formatExecutionResult(execution, tool)

    return {
      summary: formatted.conversationalResult.summary,
      details: formatted.conversationalResult.details,
      suggestedNextSteps: formatted.conversationalResult.suggestedNextSteps,
    }
  }

  /**
   * Search available tools by query
   */
  searchTools(
    agent: Agent,
    query: string,
    options?: {
      categories?: string[]
      tags?: string[]
      difficulty?: Array<'beginner' | 'intermediate' | 'advanced'>
      limit?: number
    }
  ): EnhancedToolDescription[] {
    if (!this.initialized) {
      throw new Error('Tool integration not initialized')
    }

    // Get tools available to agent
    const agentTools = this.getAgentTools(agent)
    const agentToolIds = new Set(agentTools.map((t) => t.id))

    // Search all tools, then filter by agent capabilities
    const searchResults = toolRegistry.searchTools(query, options)
    const filteredResults = searchResults.filter((tool) => agentToolIds.has(tool.id))

    // Apply limit if specified
    const limit = options?.limit || 10
    return filteredResults.slice(0, limit)
  }

  /**
   * Get tool statistics for agent
   */
  getAgentToolStats(agent: Agent): {
    totalTools: number
    toolsByCategory: Record<string, number>
    toolsByDifficulty: Record<string, number>
    recentlyUsed: string[]
  } {
    const agentTools = this.getAgentTools(agent)

    const toolsByCategory: Record<string, number> = {}
    const toolsByDifficulty: Record<string, number> = {}

    agentTools.forEach((tool) => {
      // Count by category (using tags as categories)
      tool.tags.forEach((tag) => {
        toolsByCategory[tag] = (toolsByCategory[tag] || 0) + 1
      })

      // Count by difficulty
      toolsByDifficulty[tool.difficulty] = (toolsByDifficulty[tool.difficulty] || 0) + 1
    })

    return {
      totalTools: agentTools.length,
      toolsByCategory,
      toolsByDifficulty,
      recentlyUsed: [], // TODO: Track recently used tools
    }
  }

  /**
   * Validate tool arguments before execution
   */
  validateToolArguments(
    toolId: string,
    args: Record<string, any>
  ): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const tool = toolRegistry.getTool(toolId)
    const blockConfig = toolRegistry.getBlockConfig(toolId)

    if (!tool || !blockConfig) {
      return {
        valid: false,
        errors: [`Tool not found: ${toolId}`],
        warnings: [],
      }
    }

    const errors: string[] = []
    const warnings: string[] = []

    // Validate required parameters
    blockConfig.subBlocks.forEach((subBlock) => {
      if (subBlock.required && !args[subBlock.id]) {
        errors.push(`Required parameter missing: ${subBlock.id}`)
      }
    })

    // Validate parameter types
    Object.entries(blockConfig.inputs).forEach(([key, config]) => {
      const value = args[key]
      if (value !== undefined) {
        const expectedType = config.type
        const actualType = typeof value

        if (expectedType === 'json' && typeof value !== 'object') {
          errors.push(`Parameter ${key} should be an object, got ${actualType}`)
        } else if (expectedType !== 'json' && expectedType !== actualType) {
          errors.push(`Parameter ${key} should be ${expectedType}, got ${actualType}`)
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  // =============================================
  // Private Implementation Methods
  // =============================================

  /**
   * Register built-in tools with the registry
   */
  private registerBuiltInTools(): void {
    // Register the pre-defined enhanced tool descriptions
    const builtInTools = ['function', 'api', 'slack', 'gmail'] // From ENHANCED_TOOL_DESCRIPTIONS

    builtInTools.forEach((toolId) => {
      // Create a basic block config for built-in tools
      const blockConfig: BlockConfig = {
        type: toolId,
        name: toolId.charAt(0).toUpperCase() + toolId.slice(1),
        description: `${toolId} integration tool`,
        category: 'tools',
        bgColor: '#3B82F6',
        icon: () => null as any, // Placeholder icon
        subBlocks: [],
        tools: { access: [toolId] },
        inputs: {},
        outputs: { result: 'any' },
      }

      // The enhanced descriptions are already in the registry via the import
      // Just register the block config
      const existingTool = toolRegistry.getTool(toolId)
      if (existingTool) {
        toolRegistry.registerTool(blockConfig, existingTool)
      }
    })

    logger.info(`Registered ${builtInTools.length} built-in tools`)
  }

  /**
   * Simulate tool execution for development/testing
   * TODO: Replace with actual tool execution integration
   */
  private async simulateToolExecution(
    tool: EnhancedToolDescription,
    args: Record<string, any>
  ): Promise<any> {
    // Simulate execution delay
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500))

    // Return simulated results based on tool type
    switch (tool.id) {
      case 'function':
        return {
          result: 'Function executed successfully',
          output: 'Sample function output',
          executionTime: '1.23s',
        }

      case 'api':
        return {
          status: 200,
          data: { message: 'API call successful', timestamp: new Date().toISOString() },
          headers: { 'Content-Type': 'application/json' },
        }

      case 'slack':
        return {
          ok: true,
          channel: args.channel || '#general',
          ts: Date.now().toString(),
          message: { text: args.text || 'Message sent' },
        }

      case 'gmail':
        return {
          id: `msg_${Date.now()}`,
          labelIds: ['SENT'],
          snippet: args.body?.substring(0, 50) || 'Email sent successfully',
          to: args.to,
          subject: args.subject,
        }

      default:
        return {
          success: true,
          message: `${tool.name} executed successfully`,
          parameters: args,
        }
    }
  }
}

// =============================================
// Singleton Instance
// =============================================

export const localCopilotToolIntegration = new LocalCopilotToolIntegration()

// =============================================
// Utility Functions
// =============================================

/**
 * Convert agent tools to enhanced descriptions for UI display
 */
export function getAgentToolDescriptions(agent: Agent): EnhancedToolDescription[] {
  return localCopilotToolIntegration.getAgentTools(agent)
}

/**
 * Get contextual tool recommendations for conversation
 */
export async function getContextualToolRecommendations(
  agent: Agent,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>,
  userMessage?: string,
  limit = 3
): Promise<ToolRecommendation[]> {
  const userIntents = userMessage ? [userMessage] : []

  return localCopilotToolIntegration.getToolRecommendations(
    agent,
    conversationHistory,
    userIntents,
    limit
  )
}

/**
 * Execute a tool and return formatted results
 */
export async function executeAgentTool(
  agent: Agent,
  toolCall: LocalCopilotToolCall,
  contexts: MessageContext[] = []
): Promise<{
  toolCall: LocalCopilotToolCall
  formattedResult: {
    summary: string
    details?: string
    suggestedNextSteps?: string[]
  }
}> {
  const executedToolCall = await localCopilotToolIntegration.executeToolCall(
    agent,
    toolCall,
    contexts
  )

  const formattedResult = localCopilotToolIntegration.formatToolResult(agent, executedToolCall)

  return {
    toolCall: executedToolCall,
    formattedResult,
  }
}

/**
 * Initialize tool integration system
 * Should be called during app initialization
 */
export async function initializeToolIntegration(): Promise<void> {
  await localCopilotToolIntegration.initialize()
}
