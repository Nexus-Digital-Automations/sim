/**
 * Conversational Intelligence System for Tool Interactions
 * =======================================================
 *
 * This module provides advanced conversational AI capabilities for tool interactions,
 * including natural language parameter collection, intelligent error handling,
 * contextual help generation, and multi-modal conversation support.
 *
 * Key Features:
 * - Natural language to structured parameters conversion
 * - Conversational parameter collection with validation
 * - Context-aware help and guidance generation
 * - Intelligent error explanation and recovery suggestions
 * - Multi-turn conversation state management
 * - Real-time parameter suggestion and completion
 * - Voice and text input processing
 */

import type {
  EnhancedToolDescription,
  ToolRecommendation,
  ConversationalToolExecution
} from './tool-adapter'
import type { IntentRecognitionResult, ExtractedEntity } from './tool-recommendations'
import type { AuthContext, ToolExecution } from './types'
import { intelligenceEngine, toolRegistry } from './tool-adapter'
import { recommendationEngine } from './tool-recommendations'

// =============================================
// Core Conversational Types
// =============================================

/**
 * Conversation state for tool parameter collection
 */
export interface ConversationState {
  /** Current tool being configured */
  currentTool?: EnhancedToolDescription
  /** Parameters collected so far */
  collectedParameters: Record<string, any>
  /** Parameters still needed */
  remainingParameters: string[]
  /** Current parameter being collected */
  currentParameter?: string
  /** Conversation history for this tool */
  messages: ConversationMessage[]
  /** User preferences and context */
  userContext: UserConversationContext
  /** Current step in multi-step processes */
  currentStep: number
  /** Total steps for current process */
  totalSteps: number
  /** Any validation errors or issues */
  validationIssues: ParameterValidationIssue[]
  /** Suggestions for current parameter */
  currentSuggestions: ParameterSuggestion[]
}

/**
 * Individual conversation message
 */
export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    tool?: string
    parameter?: string
    action?: string
    confidence?: number
  }
}

/**
 * User conversation context and preferences
 */
export interface UserConversationContext {
  /** User's preferred communication style */
  communicationStyle: 'brief' | 'detailed' | 'step-by-step'
  /** User's technical expertise level */
  expertiseLevel: 'beginner' | 'intermediate' | 'expert'
  /** Preferred interaction mode */
  interactionMode: 'guided' | 'autonomous' | 'expert'
  /** Language and locale preferences */
  locale: string
  /** Previous tool usage patterns */
  toolUsagePatterns: Record<string, any>
  /** Current workflow or project context */
  workflowContext?: {
    name: string
    stage: string
    availableVariables: Record<string, any>
  }
}

/**
 * Parameter validation issue
 */
export interface ParameterValidationIssue {
  parameter: string
  issue: 'required' | 'invalid_format' | 'out_of_range' | 'dependency_missing'
  message: string
  suggestion?: string
  examples?: string[]
}

/**
 * Smart parameter suggestion
 */
export interface ParameterSuggestion {
  parameter: string
  value: any
  confidence: number
  reasoning: string
  source: 'context' | 'history' | 'workflow' | 'ai_inference'
}

/**
 * Conversational tool execution result with rich formatting
 */
export interface ConversationalResult {
  /** Basic execution details */
  execution: ConversationalToolExecution
  /** Conversational summary */
  conversationalSummary: {
    /** What was accomplished */
    achievement: string
    /** Key outcomes or data */
    highlights: string[]
    /** Any important notes or warnings */
    notes?: string[]
  }
  /** Interactive elements for continued conversation */
  interactiveElements: {
    /** Suggested follow-up actions */
    suggestedActions: InteractiveAction[]
    /** Quick commands user can trigger */
    quickCommands: QuickCommand[]
    /** Related tools or next steps */
    relatedSuggestions: string[]
  }
  /** Rich media content if applicable */
  richContent?: {
    /** Charts, graphs, or visualizations */
    visualizations?: any[]
    /** File attachments or links */
    attachments?: FileAttachment[]
    /** Formatted data tables */
    tables?: DataTable[]
  }
}

/**
 * Interactive action suggestion
 */
export interface InteractiveAction {
  id: string
  label: string
  description: string
  action: 'use_tool' | 'modify_parameters' | 'view_details' | 'export_data' | 'schedule_repeat'
  parameters?: Record<string, any>
  confidence: number
}

/**
 * Quick command for user shortcuts
 */
export interface QuickCommand {
  trigger: string
  description: string
  action: string
  parameters?: Record<string, any>
}

/**
 * File attachment information
 */
export interface FileAttachment {
  name: string
  type: string
  size: number
  url: string
  description?: string
}

/**
 * Formatted data table
 */
export interface DataTable {
  title: string
  headers: string[]
  rows: any[][]
  summary?: string
}

// =============================================
// Conversational Intelligence Engine
// =============================================

/**
 * Main conversational intelligence system
 */
export class ConversationalIntelligenceEngine {
  private conversationStates: Map<string, ConversationState> = new Map()
  private parameterCollectors: Map<string, ParameterCollector> = new Map()
  private resultFormatters: Map<string, ResultFormatter> = new Map()

  constructor() {
    this.initializeParameterCollectors()
    this.initializeResultFormatters()
  }

  /**
   * Start a conversational tool interaction
   */
  async startToolConversation(
    toolId: string,
    initialQuery: string,
    authContext: AuthContext,
    userContext: UserConversationContext
  ): Promise<ConversationalResponse> {
    const tool = toolRegistry.getTool(toolId)
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`)
    }

    const conversationId = `${authContext.user_id}-${toolId}-${Date.now()}`

    // Initialize conversation state
    const state: ConversationState = {
      currentTool: tool,
      collectedParameters: {},
      remainingParameters: this.getRequiredParameters(tool),
      messages: [],
      userContext,
      currentStep: 1,
      totalSteps: this.calculateTotalSteps(tool),
      validationIssues: [],
      currentSuggestions: []
    }

    this.conversationStates.set(conversationId, state)

    // Process initial query to extract any parameters
    await this.processUserMessage(conversationId, initialQuery, authContext)

    // Generate initial response
    return this.generateConversationalResponse(conversationId, authContext)
  }

  /**
   * Process user message in ongoing conversation
   */
  async processUserMessage(
    conversationId: string,
    message: string,
    authContext: AuthContext
  ): Promise<ConversationalResponse> {
    const state = this.conversationStates.get(conversationId)
    if (!state) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }

    // Add user message to history
    state.messages.push({
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    })

    // Extract parameters from message
    await this.extractParametersFromMessage(state, message, authContext)

    // Validate current parameters
    await this.validateParameters(state)

    // Update conversation state
    await this.updateConversationState(state)

    // Generate response
    return this.generateConversationalResponse(conversationId, authContext)
  }

  /**
   * Execute tool with collected parameters
   */
  async executeToolConversation(
    conversationId: string,
    authContext: AuthContext
  ): Promise<ConversationalResult> {
    const state = this.conversationStates.get(conversationId)
    if (!state || !state.currentTool) {
      throw new Error(`Invalid conversation state: ${conversationId}`)
    }

    // Final validation
    await this.validateParameters(state)
    if (state.validationIssues.length > 0) {
      throw new Error(`Parameter validation failed: ${state.validationIssues.map(i => i.message).join(', ')}`)
    }

    // Mock tool execution (in real implementation, this would call the actual tool)
    const mockExecution: ToolExecution = {
      id: `exec-${Date.now()}`,
      tool_id: state.currentTool.id,
      session_id: conversationId,
      parameters: state.collectedParameters,
      result: { success: true, data: 'Mock result' },
      status: 'completed',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    }

    // Format execution result for conversation
    const conversationalExecution = intelligenceEngine.formatExecutionResult(mockExecution, state.currentTool)

    // Create rich conversational result
    return this.createConversationalResult(conversationalExecution, state, authContext)
  }

  /**
   * Get conversation status and next steps
   */
  getConversationStatus(conversationId: string): ConversationStatus {
    const state = this.conversationStates.get(conversationId)
    if (!state) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }

    return {
      conversationId,
      toolName: state.currentTool?.name || 'Unknown',
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      completionPercentage: ((state.currentStep - 1) / state.totalSteps) * 100,
      collectedParameters: state.collectedParameters,
      remainingParameters: state.remainingParameters,
      validationIssues: state.validationIssues,
      readyToExecute: state.remainingParameters.length === 0 && state.validationIssues.length === 0,
      nextAction: this.determineNextAction(state)
    }
  }

  /**
   * Extract parameters from user message
   */
  private async extractParametersFromMessage(
    state: ConversationState,
    message: string,
    authContext: AuthContext
  ): Promise<void> {
    if (!state.currentTool) return

    // Use intent recognition to extract structured data
    const intentResult = await recommendationEngine['intentRecognizer'].analyzeInput(message)

    // Extract entities that match tool parameters
    for (const entity of intentResult.entities) {
      await this.mapEntityToParameter(state, entity)
    }

    // Use AI to infer parameter values from natural language
    await this.inferParametersFromNaturalLanguage(state, message, intentResult)

    // Apply parameter collection rules for current tool
    const collector = this.parameterCollectors.get(state.currentTool.id)
    if (collector) {
      await collector.collectFromMessage(state, message)
    }
  }

  /**
   * Map extracted entity to tool parameter
   */
  private async mapEntityToParameter(state: ConversationState, entity: ExtractedEntity): Promise<void> {
    if (!state.currentTool) return

    const tool = state.currentTool
    const blockConfig = toolRegistry.getBlockConfig(tool.id)
    if (!blockConfig?.inputs) return

    // Map entity types to likely parameters
    const entityParameterMap: Record<string, string[]> = {
      email: ['to', 'from', 'recipient', 'email', 'address'],
      url: ['url', 'endpoint', 'webhook', 'api_url'],
      file: ['file', 'filename', 'attachment', 'path'],
      date: ['date', 'timestamp', 'schedule', 'deadline'],
      number: ['amount', 'quantity', 'limit', 'timeout', 'count']
    }

    const potentialParameters = entityParameterMap[entity.type] || []

    for (const paramName of potentialParameters) {
      if (paramName in blockConfig.inputs && !(paramName in state.collectedParameters)) {
        state.collectedParameters[paramName] = entity.value
        state.remainingParameters = state.remainingParameters.filter(p => p !== paramName)
        break
      }
    }
  }

  /**
   * Infer parameters from natural language using AI
   */
  private async inferParametersFromNaturalLanguage(
    state: ConversationState,
    message: string,
    intentResult: IntentRecognitionResult
  ): Promise<void> {
    if (!state.currentTool) return

    // This would typically use an LLM to extract parameters
    // For now, we'll use simple keyword matching and patterns

    const tool = state.currentTool
    const blockConfig = toolRegistry.getBlockConfig(tool.id)
    if (!blockConfig?.inputs) return

    // Tool-specific parameter inference
    if (tool.id === 'slack') {
      this.inferSlackParameters(state, message)
    } else if (tool.id === 'gmail') {
      this.inferGmailParameters(state, message)
    } else if (tool.id === 'api') {
      this.inferApiParameters(state, message)
    }
  }

  /**
   * Infer Slack-specific parameters
   */
  private inferSlackParameters(state: ConversationState, message: string): void {
    const lowerMessage = message.toLowerCase()

    // Infer operation
    if (!state.collectedParameters.operation) {
      if (lowerMessage.includes('send message') || lowerMessage.includes('post to')) {
        state.collectedParameters.operation = 'send'
        state.remainingParameters = state.remainingParameters.filter(p => p !== 'operation')
      } else if (lowerMessage.includes('create canvas') || lowerMessage.includes('new canvas')) {
        state.collectedParameters.operation = 'canvas'
        state.remainingParameters = state.remainingParameters.filter(p => p !== 'operation')
      }
    }

    // Infer channel from patterns like "#general" or "general channel"
    if (!state.collectedParameters.channel) {
      const channelMatch = message.match(/#(\w+)|(\w+)\s+channel/i)
      if (channelMatch) {
        const channel = channelMatch[1] || channelMatch[2]
        state.collectedParameters.channel = `#${channel}`
        state.remainingParameters = state.remainingParameters.filter(p => p !== 'channel')
      }
    }

    // Extract message content (everything in quotes or after "say" or "message:")
    if (!state.collectedParameters.text) {
      const messageMatch = message.match(/"([^"]+)"|say\s+(.+)|message:\s*(.+)/i)
      if (messageMatch) {
        const messageText = messageMatch[1] || messageMatch[2] || messageMatch[3]
        state.collectedParameters.text = messageText.trim()
        state.remainingParameters = state.remainingParameters.filter(p => p !== 'text')
      }
    }
  }

  /**
   * Infer Gmail-specific parameters
   */
  private inferGmailParameters(state: ConversationState, message: string): void {
    const lowerMessage = message.toLowerCase()

    // Infer operation
    if (!state.collectedParameters.operation) {
      if (lowerMessage.includes('send email') || lowerMessage.includes('email to')) {
        state.collectedParameters.operation = 'send_gmail'
        state.remainingParameters = state.remainingParameters.filter(p => p !== 'operation')
      } else if (lowerMessage.includes('read email') || lowerMessage.includes('check email')) {
        state.collectedParameters.operation = 'read_gmail'
        state.remainingParameters = state.remainingParameters.filter(p => p !== 'operation')
      }
    }

    // Extract subject from patterns like "subject: ..." or "about ..."
    if (!state.collectedParameters.subject) {
      const subjectMatch = message.match(/subject:\s*([^,\n]+)|about\s+([^,\n]+)/i)
      if (subjectMatch) {
        const subject = (subjectMatch[1] || subjectMatch[2]).trim()
        state.collectedParameters.subject = subject
        state.remainingParameters = state.remainingParameters.filter(p => p !== 'subject')
      }
    }
  }

  /**
   * Infer API-specific parameters
   */
  private inferApiParameters(state: ConversationState, message: string): void {
    // Infer HTTP method
    if (!state.collectedParameters.method) {
      const methodMatch = message.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/i)
      if (methodMatch) {
        state.collectedParameters.method = methodMatch[1].toUpperCase()
        state.remainingParameters = state.remainingParameters.filter(p => p !== 'method')
      } else if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('get data')) {
        state.collectedParameters.method = 'GET'
        state.remainingParameters = state.remainingParameters.filter(p => p !== 'method')
      } else if (message.toLowerCase().includes('submit') || message.toLowerCase().includes('post')) {
        state.collectedParameters.method = 'POST'
        state.remainingParameters = state.remainingParameters.filter(p => p !== 'method')
      }
    }
  }

  /**
   * Validate collected parameters
   */
  private async validateParameters(state: ConversationState): Promise<void> {
    state.validationIssues = []

    if (!state.currentTool) return

    const tool = state.currentTool
    const blockConfig = toolRegistry.getBlockConfig(tool.id)
    if (!blockConfig?.inputs) return

    // Check required parameters
    for (const [paramName, paramConfig] of Object.entries(blockConfig.inputs)) {
      const isRequired = blockConfig.subBlocks?.find(sub => sub.id === paramName)?.required || false
      const hasValue = paramName in state.collectedParameters

      if (isRequired && !hasValue) {
        state.validationIssues.push({
          parameter: paramName,
          issue: 'required',
          message: `${paramName} is required`,
          suggestion: this.getParameterSuggestion(paramName, tool)
        })
      }
    }

    // Validate parameter formats and values
    for (const [paramName, value] of Object.entries(state.collectedParameters)) {
      const validation = await this.validateParameterValue(paramName, value, tool)
      if (!validation.valid) {
        state.validationIssues.push({
          parameter: paramName,
          issue: 'invalid_format',
          message: validation.error || 'Invalid value',
          suggestion: validation.suggestion,
          examples: validation.examples
        })
      }
    }
  }

  /**
   * Validate individual parameter value
   */
  private async validateParameterValue(
    paramName: string,
    value: any,
    tool: EnhancedToolDescription
  ): Promise<{ valid: boolean; error?: string; suggestion?: string; examples?: string[] }> {
    // Email validation
    if (paramName.includes('email') || paramName === 'to' || paramName === 'from') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (typeof value === 'string' && !emailRegex.test(value)) {
        return {
          valid: false,
          error: 'Invalid email format',
          examples: ['user@example.com', 'contact@company.org']
        }
      }
    }

    // URL validation
    if (paramName.includes('url') || paramName === 'endpoint') {
      try {
        new URL(value)
      } catch {
        return {
          valid: false,
          error: 'Invalid URL format',
          examples: ['https://api.example.com/endpoint', 'https://www.example.com']
        }
      }
    }

    // Channel validation for Slack
    if (tool.id === 'slack' && paramName === 'channel') {
      if (typeof value === 'string' && !value.startsWith('#') && !value.startsWith('@')) {
        return {
          valid: false,
          error: 'Channel should start with # for channels or @ for direct messages',
          examples: ['#general', '#dev-team', '@username']
        }
      }
    }

    return { valid: true }
  }

  /**
   * Get parameter suggestion based on context
   */
  private getParameterSuggestion(paramName: string, tool: EnhancedToolDescription): string | undefined {
    const suggestions: Record<string, string> = {
      to: 'Who should receive this email?',
      subject: 'What should the email subject be?',
      text: 'What message do you want to send?',
      channel: 'Which channel should receive the message?',
      url: 'What API endpoint do you want to call?',
      method: 'What HTTP method should be used? (GET, POST, PUT, DELETE)',
      operation: `What do you want to do with ${tool.name}?`
    }

    return suggestions[paramName]
  }

  /**
   * Update conversation state based on current progress
   */
  private async updateConversationState(state: ConversationState): Promise<void> {
    // Update current parameter being collected
    if (state.remainingParameters.length > 0) {
      state.currentParameter = state.remainingParameters[0]
    } else {
      state.currentParameter = undefined
    }

    // Update step progress
    const totalParams = this.getTotalParameterCount(state.currentTool)
    const collectedParams = Object.keys(state.collectedParameters).length
    state.currentStep = Math.min(collectedParams + 1, state.totalSteps)

    // Generate parameter suggestions
    state.currentSuggestions = await this.generateParameterSuggestions(state)
  }

  /**
   * Generate suggestions for current parameter
   */
  private async generateParameterSuggestions(state: ConversationState): Promise<ParameterSuggestion[]> {
    const suggestions: ParameterSuggestion[] = []

    if (!state.currentParameter || !state.currentTool) return suggestions

    // Get suggestions from workflow context
    if (state.userContext.workflowContext?.availableVariables) {
      const workflowVar = state.userContext.workflowContext.availableVariables[state.currentParameter]
      if (workflowVar) {
        suggestions.push({
          parameter: state.currentParameter,
          value: workflowVar,
          confidence: 0.9,
          reasoning: 'Available from previous workflow step',
          source: 'workflow'
        })
      }
    }

    // Get suggestions from user's tool usage patterns
    const usage = state.userContext.toolUsagePatterns[state.currentTool.id]
    if (usage && usage[state.currentParameter]) {
      suggestions.push({
        parameter: state.currentParameter,
        value: usage[state.currentParameter],
        confidence: 0.7,
        reasoning: 'Based on your previous usage',
        source: 'history'
      })
    }

    return suggestions
  }

  /**
   * Generate conversational response for current state
   */
  private async generateConversationalResponse(
    conversationId: string,
    authContext: AuthContext
  ): Promise<ConversationalResponse> {
    const state = this.conversationStates.get(conversationId)!
    const status = this.getConversationStatus(conversationId)

    let message = ''
    let suggestions: string[] = []
    let quickActions: QuickAction[] = []

    if (state.validationIssues.length > 0) {
      // Handle validation issues
      message = this.generateValidationMessage(state)
      suggestions = state.validationIssues.map(issue => issue.suggestion).filter(Boolean) as string[]
    } else if (state.remainingParameters.length > 0) {
      // Ask for next parameter
      message = this.generateParameterRequest(state)
      suggestions = this.generateParameterSuggestions(state).then(sugs =>
        sugs.map(s => `Try: "${s.value}" (${s.reasoning})`)
      ) as any
      quickActions = this.generateParameterQuickActions(state)
    } else {
      // Ready to execute
      message = this.generateExecutionReadyMessage(state)
      quickActions = [
        {
          id: 'execute',
          label: `Execute ${state.currentTool?.name}`,
          action: 'execute_tool',
          parameters: state.collectedParameters
        }
      ]
    }

    // Add message to conversation history
    state.messages.push({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: message,
      timestamp: new Date(),
      metadata: {
        tool: state.currentTool?.id,
        parameter: state.currentParameter,
        confidence: status.completionPercentage / 100
      }
    })

    return {
      conversationId,
      message,
      status,
      suggestions: await suggestions,
      quickActions,
      conversationHistory: state.messages.slice(-10) // Last 10 messages
    }
  }

  /**
   * Generate message for validation issues
   */
  private generateValidationMessage(state: ConversationState): string {
    const issue = state.validationIssues[0] // Focus on first issue
    const tool = state.currentTool!

    const baseMessage = `I need to fix an issue with ${tool.name}.`

    switch (issue.issue) {
      case 'required':
        return `${baseMessage} The ${issue.parameter} field is required. ${issue.suggestion || ''}`
      case 'invalid_format':
        return `${baseMessage} The ${issue.parameter} value isn't in the right format. ${issue.message}`
      default:
        return `${baseMessage} ${issue.message}`
    }
  }

  /**
   * Generate message requesting next parameter
   */
  private generateParameterRequest(state: ConversationState): string {
    const tool = state.currentTool!
    const param = state.currentParameter!

    // Get conversational prompt for this parameter
    const prompt = tool.conversationalPrompts.parameterQuestions.find(p => p.parameter === param)

    if (prompt) {
      return prompt.question
    }

    // Fallback to generic request
    return `What should I use for ${param}?`
  }

  /**
   * Generate message when ready to execute
   */
  private generateExecutionReadyMessage(state: ConversationState): string {
    const tool = state.currentTool!
    const paramCount = Object.keys(state.collectedParameters).length

    return `Perfect! I have all ${paramCount} parameters needed for ${tool.name}. Ready to execute when you are.`
  }

  /**
   * Generate quick actions for parameter input
   */
  private generateParameterQuickActions(state: ConversationState): QuickAction[] {
    const actions: QuickAction[] = []

    if (state.currentSuggestions.length > 0) {
      state.currentSuggestions.forEach((suggestion, index) => {
        actions.push({
          id: `suggestion-${index}`,
          label: `Use: ${suggestion.value}`,
          action: 'apply_suggestion',
          parameters: { [suggestion.parameter]: suggestion.value }
        })
      })
    }

    return actions.slice(0, 3) // Limit to 3 quick actions
  }

  /**
   * Create rich conversational result
   */
  private createConversationalResult(
    execution: ConversationalToolExecution,
    state: ConversationState,
    authContext: AuthContext
  ): ConversationalResult {
    const tool = state.currentTool!

    // Use tool-specific formatter if available
    const formatter = this.resultFormatters.get(tool.id)
    if (formatter) {
      return formatter.format(execution, state, authContext)
    }

    // Default formatting
    return {
      execution,
      conversationalSummary: {
        achievement: `Successfully executed ${tool.name}`,
        highlights: [execution.conversationalResult.summary],
        notes: execution.userFriendlyErrors
      },
      interactiveElements: {
        suggestedActions: [
          {
            id: 'view-details',
            label: 'View Details',
            description: 'See the full execution result',
            action: 'view_details',
            confidence: 1.0
          }
        ],
        quickCommands: [
          {
            trigger: 'again',
            description: `Run ${tool.name} again with same parameters`,
            action: 'repeat_execution',
            parameters: state.collectedParameters
          }
        ],
        relatedSuggestions: execution.conversationalResult.suggestedNextSteps || []
      }
    }
  }

  /**
   * Helper methods
   */
  private getRequiredParameters(tool: EnhancedToolDescription): string[] {
    const blockConfig = toolRegistry.getBlockConfig(tool.id)
    if (!blockConfig?.subBlocks) return []

    return blockConfig.subBlocks
      .filter(sub => sub.required)
      .map(sub => sub.id)
  }

  private calculateTotalSteps(tool: EnhancedToolDescription): number {
    return this.getRequiredParameters(tool).length + 1 // +1 for execution
  }

  private getTotalParameterCount(tool?: EnhancedToolDescription): number {
    if (!tool) return 0
    const blockConfig = toolRegistry.getBlockConfig(tool.id)
    return Object.keys(blockConfig?.inputs || {}).length
  }

  private determineNextAction(state: ConversationState): string {
    if (state.validationIssues.length > 0) return 'fix_validation_issues'
    if (state.remainingParameters.length > 0) return 'collect_parameters'
    return 'ready_to_execute'
  }

  /**
   * Initialize parameter collectors for specific tools
   */
  private initializeParameterCollectors(): void {
    // Tool-specific parameter collectors would be registered here
    // For now, we'll use the generic extraction logic
  }

  /**
   * Initialize result formatters for specific tools
   */
  private initializeResultFormatters(): void {
    // Tool-specific result formatters would be registered here
  }
}

// =============================================
// Supporting Types and Interfaces
// =============================================

export interface ConversationalResponse {
  conversationId: string
  message: string
  status: ConversationStatus
  suggestions: string[]
  quickActions: QuickAction[]
  conversationHistory: ConversationMessage[]
}

export interface ConversationStatus {
  conversationId: string
  toolName: string
  currentStep: number
  totalSteps: number
  completionPercentage: number
  collectedParameters: Record<string, any>
  remainingParameters: string[]
  validationIssues: ParameterValidationIssue[]
  readyToExecute: boolean
  nextAction: string
}

export interface QuickAction {
  id: string
  label: string
  action: string
  parameters?: Record<string, any>
}

/**
 * Interface for tool-specific parameter collectors
 */
export interface ParameterCollector {
  collectFromMessage(state: ConversationState, message: string): Promise<void>
}

/**
 * Interface for tool-specific result formatters
 */
export interface ResultFormatter {
  format(
    execution: ConversationalToolExecution,
    state: ConversationState,
    authContext: AuthContext
  ): ConversationalResult
}

// =============================================
// Export singleton instance
// =============================================

export const conversationalEngine = new ConversationalIntelligenceEngine()