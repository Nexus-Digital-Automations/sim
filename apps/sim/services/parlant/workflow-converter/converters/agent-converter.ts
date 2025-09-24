/**
 * Workflow to Journey Mapping System - Agent Node Converter
 *
 * Converts ReactFlow agent nodes into Parlant chat states.
 * Handles AI agent interactions, prompts, and conversation flow.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { BaseNodeConverter } from './base-converter'
import type {
  ReactFlowNode,
  ConversionContext,
  NodeConversionResult,
  ValidationResult,
  ParlantState,
  ParlantStateType
} from '../types'

const logger = createLogger('AgentConverter')

/**
 * Converter for agent/AI nodes
 */
export class AgentNodeConverter extends BaseNodeConverter {
  constructor() {
    super('agent', ['agent', 'ai', 'chat', 'llm'])
    logger.info('AgentNodeConverter initialized')
  }

  /**
   * Convert agent node to chat Parlant state
   */
  async convert(node: ReactFlowNode, context: ConversionContext): Promise<NodeConversionResult> {
    this.logConversion(node, 'Converting agent node')

    try {
      // Create the chat state
      const chatState = this.createChatState(node, context)

      // Extract variables from agent configuration
      const variables = this.extractVariables(node)

      // Add agent-specific variables
      variables.push(...this.extractAgentVariables(node))

      this.logConversion(node, 'Agent node converted successfully', {
        stateId: chatState.id,
        hasPrompt: !!node.data?.prompt,
        toolCount: this.extractTools(node).length
      })

      return {
        states: [chatState],
        transitions: [],
        variables: variables.length > 0 ? variables : undefined
      }

    } catch (error) {
      logger.error('Failed to convert agent node', {
        nodeId: node.id,
        error: error instanceof Error ? error.message : String(error)
      })

      context.errors.push(
        this.createConversionError(
          node,
          'AGENT_CONVERSION_ERROR',
          `Failed to convert agent node: ${error instanceof Error ? error.message : String(error)}`,
          'error',
          [
            'Check agent configuration',
            'Verify prompt is valid',
            'Review tool access permissions'
          ]
        )
      )

      return {
        states: [this.createFallbackChatState(node)],
        transitions: [],
        variables: undefined
      }
    }
  }

  /**
   * Validate agent node configuration
   */
  protected validateNodeSpecific(node: ReactFlowNode): ValidationResult {
    const errors = []
    const warnings = []

    // Check for required prompt
    if (!node.data?.prompt && !node.data?.systemPrompt && !node.data?.message) {
      warnings.push(
        this.createConversionWarning(
          node,
          'MISSING_PROMPT',
          'Agent node has no prompt or message configured',
          'high',
          [
            'Add a system prompt to guide agent behavior',
            'Configure message content for the conversation',
            'Add instructions for the agent'
          ]
        )
      )
    }

    // Check for model configuration
    if (!node.data?.model && !node.data?.config?.model) {
      warnings.push(
        this.createConversionWarning(
          node,
          'MISSING_MODEL_CONFIG',
          'Agent node has no model specified',
          'medium',
          [
            'Specify an AI model to use',
            'Configure model parameters',
            'Use default model if appropriate'
          ]
        )
      )
    }

    // Validate tools configuration
    const tools = this.extractTools(node)
    if (tools.length > 0) {
      // Check if tools exist (this would need integration with tool registry)
      logger.debug('Agent has tools configured', { nodeId: node.id, toolCount: tools.length })
    }

    return { valid: true, errors, warnings }
  }

  /**
   * Get the primary state type for agent nodes
   */
  protected getPrimaryStateType(): ParlantStateType {
    return 'chat'
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private createChatState(node: ReactFlowNode, context: ConversionContext): ParlantState {
    // Determine the content for the chat state
    const content = this.generateChatContent(node)

    // Extract tools that the agent can use
    const tools = this.extractTools(node)

    // Extract conditions for when this state should be active
    const conditions = this.extractConditions(node)

    return this.createBaseState(node, 'chat', {
      name: node.data?.name || 'AI Agent Interaction',
      description: this.generateDescription(node),
      content,
      tools: tools.length > 0 ? tools : undefined,
      conditions: conditions.length > 0 ? conditions : undefined
    })
  }

  private generateChatContent(node: ReactFlowNode): string {
    // Priority order for content sources
    if (node.data?.prompt) {
      return node.data.prompt
    }

    if (node.data?.systemPrompt) {
      return node.data.systemPrompt
    }

    if (node.data?.message) {
      return node.data.message
    }

    if (node.data?.instruction) {
      return node.data.instruction
    }

    if (node.data?.config?.prompt) {
      return node.data.config.prompt
    }

    // Fallback content
    const agentName = node.data?.name || 'AI Agent'
    return `${agentName} is ready to assist. How can I help you?`
  }

  private generateDescription(node: ReactFlowNode): string {
    const baseName = node.data?.name || 'AI Agent'
    let description = `Chat state for ${baseName}`

    // Add model information if available
    const model = node.data?.model || node.data?.config?.model
    if (model) {
      description += ` using ${model}`
    }

    // Add capability information
    const tools = this.extractTools(node)
    if (tools.length > 0) {
      description += ` with ${tools.length} available tool${tools.length === 1 ? '' : 's'}`
    }

    if (node.data?.description) {
      description += ` - ${node.data.description}`
    }

    return description
  }

  private extractAgentVariables(node: ReactFlowNode): any[] {
    const variables = []

    // Add model configuration as variable
    const model = node.data?.model || node.data?.config?.model
    if (model) {
      variables.push({
        name: `${node.id}_model`,
        type: 'string' as const,
        description: `AI model for ${node.data?.name || 'agent'}`,
        defaultValue: model
      })
    }

    // Add temperature/parameters if configured
    const temperature = node.data?.temperature || node.data?.config?.temperature
    if (temperature !== undefined) {
      variables.push({
        name: `${node.id}_temperature`,
        type: 'number' as const,
        description: 'Temperature setting for AI responses',
        defaultValue: temperature
      })
    }

    const maxTokens = node.data?.maxTokens || node.data?.config?.maxTokens
    if (maxTokens !== undefined) {
      variables.push({
        name: `${node.id}_max_tokens`,
        type: 'number' as const,
        description: 'Maximum tokens for AI responses',
        defaultValue: maxTokens
      })
    }

    // Add context variables if configured
    if (node.data?.context) {
      variables.push({
        name: `${node.id}_context`,
        type: 'json' as const,
        description: 'Context information for the agent',
        defaultValue: node.data.context
      })
    }

    return variables
  }

  private createFallbackChatState(node: ReactFlowNode): ParlantState {
    return this.createBaseState(node, 'chat', {
      name: 'AI Agent (Fallback)',
      description: 'Fallback chat state created due to conversion error',
      content: 'I\'m an AI assistant. How can I help you today?',
      conditions: ['Agent interaction required']
    })
  }
}