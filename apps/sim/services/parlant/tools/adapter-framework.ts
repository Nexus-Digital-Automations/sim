/**
 * Universal Tool Adapter Framework for Sim-Parlant Integration
 * ===========================================================
 *
 * Core framework that converts Sim's BlockConfig tool definitions into
 * Parlant-compatible tool interfaces with natural language descriptions
 * and simplified parameter mapping.
 *
 * Features:
 * - Automatic parameter transformation and validation
 * - Natural language descriptions generation
 * - Error handling and recovery mechanisms
 * - Quality assurance with logging and monitoring
 * - Performance optimization with caching
 */

import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

// ================================
// Core Adapter Types
// ================================

/**
 * Parlant-compatible tool definition
 * Simplified interface focusing on natural language interaction
 */
export interface ParlantTool {
  /** Unique tool identifier matching Sim's block type */
  id: string
  /** Human-readable tool Name for conversational use */
  Name: string
  /** Natural language description explaining what the tool does */
  description: string
  /** Detailed explanation of tool capabilities and usage */
  longDescription?: string
  /** Tool category for organization */
  category: 'communication' | 'productivity' | 'data' | 'ai' | 'integration' | 'utility'
  /** Simplified parameter schema for LLM consumption */
  parameters: ParlantToolParameter[]
  /** Expected outputs with descriptions */
  outputs: ParlantToolOutput[]
  /** Usage examples for better LLM understanding */
  examples?: ParlantToolExample[]
  /** Contextual hints for appropriate usage */
  usageHints?: string[]
  /** Required credentials or authentication */
  requiresAuth?: {
    type: 'oauth' | 'api_key' | 'basic'
    provider?: string
    scopes?: string[]
  }
}

/**
 * Simplified parameter definition for LLM-friendly interaction
 */
export interface ParlantToolParameter {
  /** Parameter Name */
  Name: string
  /** Human-readable parameter description */
  description: string
  /** Parameter data type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  /** Whether parameter is required */
  required: boolean
  /** Default value if not provided */
  default?: any
  /** Example values for guidance */
  examples?: any[]
  /** Validation constraints */
  constraints?: {
    min?: number
    max?: number
    pattern?: string
    enum?: any[]
  }
  /** Conditional visibility based on other parameters */
  dependsOn?: {
    parameter: string
    value: any
  }
}

/**
 * Tool output definition with natural language descriptions
 */
export interface ParlantToolOutput {
  /** Output field Name */
  Name: string
  /** Human-readable description of the output */
  description: string
  /** Output data type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file'
  /** Whether output is always present */
  optional?: boolean
}

/**
 * Usage example for better tool understanding
 */
export interface ParlantToolExample {
  /** Example scenario description */
  scenario: string
  /** Input parameters for the example */
  input: Record<string, any>
  /** Expected output description */
  expectedOutput: string
}

/**
 * Tool execution context with workspace isolation
 */
export interface ToolExecutionContext {
  /** User identifier */
  userId: string
  /** Workspace identifier for isolation */
  workspaceId: string
  /** Agent identifier making the request */
  agentId?: string
  /** Session identifier for tracking */
  sessionId?: string
  /** Additional context metadata */
  metadata?: Record<string, any>
}

/**
 * Adapter execution result with enhanced error handling
 */
export interface AdapterExecutionResult {
  /** Whether execution was successful */
  success: boolean
  /** Tool output data */
  data?: any
  /** Human-readable error message */
  error?: string
  /** Technical error details for debugging */
  errorDetails?: {
    code: string
    message: string
    stack?: string
    context?: Record<string, any>
  }
  /** Execution timing information */
  timing: {
    startTime: string
    endTime: string
    duration: number
  }
  /** Usage metadata for billing/analytics */
  usage?: {
    tokensUsed?: number
    apiCallsCount?: number
    computeUnits?: number
  }
}

// ================================
// Core Adapter Class
// ================================

/**
 * Base adapter class that converts Sim tools to Parlant-compatible format
 * Handles parameter transformation, execution, and error management
 */
export abstract class UniversalToolAdapter {
  protected blockConfig: BlockConfig
  protected parlantTool: ParlantTool

  constructor(blockConfig: BlockConfig) {
    this.blockConfig = blockConfig
    this.parlantTool = this.transformToParlant(blockConfig)
  }

  /**
   * Get the Parlant-compatible tool definition
   */
  getParlantTool(): ParlantTool {
    return this.parlantTool
  }

  /**
   * Execute the tool with Parlant-style parameters
   * @param parameters - Simplified parameter object
   * @param context - Execution context with workspace/user info
   */
  async execute(
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<AdapterExecutionResult> {
    const startTime = new Date().toISOString()
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // 1. Validate parameters against schema
      const validationResult = await this.validateParameters(parameters)
      if (!validationResult.valid) {
        return {
          success: false,
          error: `Parameter validation failed: ${validationResult.errors.join(', ')}`,
          errorDetails: {
            code: 'PARAMETER_VALIDATION_ERROR',
            message: 'Invalid parameters provided',
            context: { errors: validationResult.errors, executionId },
          },
          timing: {
            startTime,
            endTime: new Date().toISOString(),
            duration: Date.now() - new Date(startTime).getTime(),
          },
        }
      }

      // 2. Transform parameters from Parlant to Sim format
      const simParameters = await this.transformParameters(parameters, context)

      // 3. Execute the underlying Sim tool
      const simResult = await this.executeSimTool(simParameters, context)

      // 4. Transform result from Sim to Parlant format
      const parlantResult = await this.transformResult(simResult, context)

      const endTime = new Date().toISOString()
      return {
        success: true,
        data: parlantResult,
        timing: {
          startTime,
          endTime,
          duration: Date.now() - new Date(startTime).getTime(),
        },
        usage: await this.calculateUsage(simResult, context),
      }
    } catch (error) {
      const endTime = new Date().toISOString()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      return {
        success: false,
        error: `Tool execution failed: ${errorMessage}`,
        errorDetails: {
          code: 'TOOL_EXECUTION_ERROR',
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          context: { executionId, toolId: this.blockConfig.type },
        },
        timing: {
          startTime,
          endTime,
          duration: Date.now() - new Date(startTime).getTime(),
        },
      }
    }
  }

  // ================================
  // Abstract Methods (Tool-Specific)
  // ================================

  /**
   * Transform Sim BlockConfig to Parlant tool definition
   * Must be implemented by specific tool adapters
   */
  protected abstract transformToParlant(blockConfig: BlockConfig): ParlantTool

  /**
   * Transform Parlant parameters to Sim tool parameters
   * Must be implemented by specific tool adapters
   */
  protected abstract transformParameters(
    parlantParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<Record<string, any>>

  /**
   * Execute the underlying Sim tool
   * Must be implemented by specific tool adapters
   */
  protected abstract executeSimTool(
    simParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResponse>

  /**
   * Transform Sim tool result to Parlant format
   * Must be implemented by specific tool adapters
   */
  protected abstract transformResult(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any>

  // ================================
  // Utility Methods
  // ================================

  /**
   * Validate parameters against the tool schema
   */
  protected async validateParameters(parameters: Record<string, any>): Promise<{
    valid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    for (const param of this.parlantTool.parameters) {
      const value = parameters[param.Name]

      // Check required parameters
      if (param.required && (value === undefined || value === null)) {
        errors.push(`Required parameter '${param.Name}' is missing`)
        continue
      }

      // Skip validation for optional missing parameters
      if (value === undefined || value === null) {
        continue
      }

      // Type validation
      if (!this.validateParameterType(value, param.type)) {
        errors.push(`Parameter '${param.Name}' must be of type ${param.type}`)
        continue
      }

      // Constraint validation
      if (param.constraints) {
        const constraintErrors = this.validateParameterConstraints(value, param.constraints)
        errors.push(...constraintErrors.map((err) => `Parameter '${param.Name}': ${err}`))
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !Number.isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'array':
        return Array.isArray(value)
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      default:
        return true // Unknown types pass validation
    }
  }

  /**
   * Validate parameter constraints
   */
  private validateParameterConstraints(value: any, constraints: any): string[] {
    const errors: string[] = []

    if (constraints.min !== undefined && typeof value === 'number' && value < constraints.min) {
      errors.push(`must be >= ${constraints.min}`)
    }

    if (constraints.max !== undefined && typeof value === 'number' && value > constraints.max) {
      errors.push(`must be <= ${constraints.max}`)
    }

    if (constraints.pattern && typeof value === 'string') {
      const regex = new RegExp(constraints.pattern)
      if (!regex.test(value)) {
        errors.push(`must match pattern ${constraints.pattern}`)
      }
    }

    if (constraints.enum && !constraints.enum.includes(value)) {
      errors.push(`must be one of: ${constraints.enum.join(', ')}`)
    }

    return errors
  }

  /**
   * Calculate usage metrics for billing/analytics
   */
  protected async calculateUsage(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    // Base implementation - can be overridden by specific adapters
    return {
      apiCallsCount: 1,
      computeUnits: 1,
    }
  }

  /**
   * Generate natural language description from block config
   */
  protected generateNaturalDescription(blockConfig: BlockConfig): string {
    let description = blockConfig.description

    // Enhance description with additional context
    if (blockConfig.longDescription) {
      description += `. ${blockConfig.longDescription}`
    }

    // Add capability hints
    if (blockConfig.tools?.access) {
      const capabilities = blockConfig.tools.access.join(', ')
      description += ` Capabilities: ${capabilities}.`
    }

    return description
  }

  /**
   * Extract usage hints from block configuration
   */
  protected extractUsageHints(blockConfig: BlockConfig): string[] {
    const hints: string[] = []

    // Add category-specific hints
    switch (blockConfig.category) {
      case 'tools':
        hints.push(
          'This tool integrates with external services and may require API keys or authentication'
        )
        break
      case 'triggers':
        hints.push('This tool can be used to trigger workflows based on external events')
        break
    }

    // Add OAuth hints
    const requiresOAuth = blockConfig.subBlocks.some((sub) => sub.type === 'oauth-input')
    if (requiresOAuth) {
      hints.push('OAuth authentication required - ensure credentials are configured')
    }

    // Add API key hints
    const requiresApiKey = blockConfig.subBlocks.some(
      (sub) => sub.password && (sub.id.includes('key') || sub.id.includes('token'))
    )
    if (requiresApiKey) {
      hints.push('API key required - check the service documentation for key generation')
    }

    return hints
  }

  /**
   * Categorize tool based on block configuration
   */
  protected categorizeStoll(blockConfig: BlockConfig): ParlantTool['category'] {
    const type = blockConfig.type.toLowerCase()

    // Communication tools
    if (
      ['slack', 'discord', 'telegram', 'whatsapp', 'sms', 'mail', 'gmail', 'outlook'].includes(type)
    ) {
      return 'communication'
    }

    // Productivity tools
    if (
      [
        'notion',
        'airtable',
        'google_sheets',
        'microsoft_excel',
        'jira',
        'linear',
        'github',
      ].includes(type)
    ) {
      return 'productivity'
    }

    // Data tools
    if (['postgresql', 'mysql', 'mongodb', 'supabase', 'pinecone', 'qdrant'].includes(type)) {
      return 'data'
    }

    // AI tools
    if (['openai', 'huggingface', 'elevenlabs', 'image_generator', 'vision'].includes(type)) {
      return 'ai'
    }

    // Integration tools
    if (['webhook', 'api', 'oauth'].includes(type)) {
      return 'integration'
    }

    // Default to utility
    return 'utility'
  }
}
