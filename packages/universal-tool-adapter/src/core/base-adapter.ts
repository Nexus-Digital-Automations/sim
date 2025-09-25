/**
 * Universal Tool Adapter System - Base Adapter
 *
 * Core base class for adapting Sim tools to Parlant-compatible interfaces.
 * Provides the foundation for parameter mapping, validation, and execution
 * while maintaining type safety and extensibility.
 *
 * @author Claude Code Adapter Pattern Design Agent
 * @version 1.0.0
 */

import { z } from 'zod'
import { ExecutionError, ValidationError } from '../errors/adapter-errors'
import { ResultFormatter } from '../formatting/result-formatter'
import { ParameterMapper } from '../mapping/parameter-mapper'
import type {
  AdapterConfiguration,
  NaturalLanguageConfig,
  ToolExecutionContext as SimExecutionContext,
  SimToolDefinition,
  ToolRunResult as SimToolResult,
} from '../types/adapter-interfaces'
import type {
  ParameterDefinition,
  ParlantExecutionContext,
  ParlantTool,
  ToolMetadata as ParlantToolMetadata,
  ParlantToolResult,
  ValidationResult,
} from '../types/parlant-interfaces'
import { createLogger } from '../utils/logger'
import { ValidationEngine } from '../validation/validation-engine'

const logger = createLogger('BaseAdapter')

/**
 * Base Universal Tool Adapter
 *
 * Transforms any Sim tool into a Parlant-compatible tool while preserving
 * all original functionality and adding conversational enhancements.
 */
export abstract class BaseAdapter<TSimArgs = any, TSimResult = any, TParlantArgs = any>
  implements ParlantTool
{
  // Parlant tool interface properties
  public readonly id: string
  public readonly name: string
  public readonly description: string
  public readonly parameters: ParameterDefinition[]
  public readonly metadata: ParlantToolMetadata

  // Adapter system properties
  protected readonly simTool: SimToolDefinition<TSimArgs>
  protected readonly config: AdapterConfiguration
  protected readonly parameterMapper: ParameterMapper
  protected readonly resultFormatter: ResultFormatter
  protected readonly validationEngine: ValidationEngine

  // Natural language enhancement
  protected readonly naturalLanguage: NaturalLanguageConfig

  // Validation schemas (dynamically built from parameter definitions)
  protected readonly inputSchema: z.ZodSchema<TParlantArgs>
  protected readonly outputSchema: z.ZodSchema<ParlantToolResult>

  constructor(simTool: SimToolDefinition<TSimArgs>, config: AdapterConfiguration) {
    // Initialize core properties
    this.simTool = simTool
    this.config = config

    // Build Parlant interface properties
    this.id = config.parlantId || `sim_${simTool.name}`
    this.name = config.displayName || simTool.name
    this.description = config.description || this.buildDefaultDescription()
    this.naturalLanguage = config.naturalLanguage || this.buildDefaultNaturalLanguage()

    // Initialize helper systems
    this.parameterMapper = new ParameterMapper(config.parameterMappings || [])
    this.resultFormatter = new ResultFormatter(config.resultFormatting || {})
    this.validationEngine = new ValidationEngine(config.validation || {})

    // Build parameter definitions and schemas
    this.parameters = this.buildParameterDefinitions()
    this.inputSchema = this.buildInputSchema()
    this.outputSchema = this.buildOutputSchema()

    // Build metadata
    this.metadata = this.buildToolMetadata()

    logger.info(`Initialized adapter for tool: ${this.name}`, {
      simToolName: simTool.name,
      parlantId: this.id,
      parameterCount: this.parameters.length,
    })
  }

  /**
   * Main execution entry point for Parlant agents
   *
   * Handles the complete flow:
   * 1. Validate Parlant parameters
   * 2. Map parameters to Sim format
   * 3. Execute Sim tool
   * 4. Format results for conversational context
   * 5. Return Parlant-compatible result
   */
  async execute(context: ParlantExecutionContext, args: TParlantArgs): Promise<ParlantToolResult> {
    const executionId = `${this.id}_${Date.now()}`
    const startTime = Date.now()

    logger.info(`Starting tool execution`, {
      executionId,
      toolId: this.id,
      contextType: context.type,
      agentId: context.agentId,
      sessionId: context.sessionId,
    })

    try {
      // Step 1: Validate input parameters
      const validatedArgs = await this.validateInput(args)

      // Step 2: Map Parlant parameters to Sim parameters
      const simArgs = await this.mapParametersToSim(validatedArgs, context)

      // Step 3: Create Sim execution context
      const simContext = await this.buildSimExecutionContext(context, executionId)

      // Step 4: Execute the underlying Sim tool
      const simResult = await this.executeSimTool(simContext, simArgs)

      // Step 5: Format result for conversational context
      const parlantResult = await this.formatResult(simResult, context, validatedArgs)

      // Step 6: Validate and return result
      const finalResult = await this.validateOutput(parlantResult)

      const duration = Date.now() - startTime
      logger.info(`Tool execution completed successfully`, {
        executionId,
        duration,
        resultType: finalResult.type,
        hasData: !!finalResult.data,
      })

      return finalResult
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorType = error instanceof Error ? error.constructor.name : 'unknown'
      logger.error(`Tool execution failed`, {
        executionId,
        duration,
        error: errorMessage,
        errorType,
      })

      // Handle different error types appropriately
      if (error instanceof ValidationError) {
        return this.handleValidationError(error, context)
      }
      if (error instanceof ExecutionError) {
        return this.handleExecutionError(error, context)
      }
      return this.handleUnknownError(error, context)
    }
  }

  /**
   * Parameter validation using Zod schema
   */
  protected async validateInput(args: TParlantArgs): Promise<TParlantArgs> {
    try {
      return this.inputSchema.parse(args)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Parameter validation failed',
          error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          }))
        )
      }
      throw error
    }
  }

  /**
   * Result validation using Zod schema
   */
  protected async validateOutput(result: ParlantToolResult): Promise<ParlantToolResult> {
    try {
      return this.outputSchema.parse(result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Output validation failed', { error: errorMessage })
      // Return a safe fallback result
      return {
        type: 'error',
        message: 'Tool execution completed but result formatting failed',
        data: null,
        conversational: {
          summary: 'The tool completed but there was an issue formatting the response.',
          suggestion: 'Please try again or contact support if the issue persists.',
        },
      }
    }
  }

  /**
   * Map Parlant parameters to Sim tool parameters
   *
   * This is where the magic happens - converting conversational parameters
   * into the specific format expected by the Sim tool.
   */
  protected async mapParametersToSim(
    parlantArgs: TParlantArgs,
    context: ParlantExecutionContext
  ): Promise<TSimArgs> {
    const mappedArgs = await this.parameterMapper.mapParlantToSim(
      parlantArgs as Record<string, any>,
      context,
      this.config.parameterMappings || []
    )

    // Allow subclasses to perform custom mapping
    return this.customParameterMapping(mappedArgs, parlantArgs, context)
  }

  /**
   * Create Sim execution context from Parlant context
   */
  protected async buildSimExecutionContext(
    parlantContext: ParlantExecutionContext,
    executionId: string
  ): Promise<SimExecutionContext> {
    return {
      toolCallId: executionId,
      toolName: this.simTool.name,
      log: (level, message, extra?) => {
        // Bridge logging to Parlant context if available
        if (parlantContext.logger) {
          parlantContext.logger(level, `[${this.simTool.name}] ${message}`, extra)
        } else {
          logger[level](message, { toolName: this.simTool.name, ...extra })
        }
      },
    }
  }

  /**
   * Execute the underlying Sim tool
   */
  protected async executeSimTool(
    simContext: SimExecutionContext,
    simArgs: TSimArgs
  ): Promise<SimToolResult> {
    try {
      const result = await this.simTool.execute(simContext, simArgs)
      if (!result) {
        return { status: 200, message: 'Tool executed successfully' }
      }
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new ExecutionError(`Sim tool execution failed: ${errorMessage}`, error)
    }
  }

  /**
   * Format Sim tool result for conversational context
   */
  protected async formatResult(
    simResult: SimToolResult,
    context: ParlantExecutionContext,
    originalArgs: TParlantArgs
  ): Promise<ParlantToolResult> {
    // Use result formatter to create conversational result
    const baseResult = await this.resultFormatter.formatSimResult(
      simResult,
      context,
      this.naturalLanguage
    )

    // Allow subclasses to customize formatting
    return this.customResultFormatting(baseResult, simResult, context, originalArgs)
  }

  // Abstract and template methods for subclass customization

  /**
   * Build parameter definitions for Parlant interface
   * Subclasses can override to customize parameter handling
   */
  protected abstract buildParameterDefinitions(): ParameterDefinition[]

  /**
   * Build input validation schema
   * Subclasses can override for custom validation
   */
  protected abstract buildInputSchema(): z.ZodSchema<TParlantArgs>

  /**
   * Build output validation schema
   * Subclasses can override for custom result validation
   */
  protected buildOutputSchema(): z.ZodSchema<ParlantToolResult> {
    return z.object({
      type: z.enum(['success', 'error', 'partial']),
      message: z.string().optional(),
      data: z.any().optional(),
      conversational: z
        .object({
          summary: z.string(),
          details: z.string().optional(),
          suggestion: z.string().optional(),
          actions: z.array(z.string()).optional(),
        })
        .optional(),
      metadata: z.record(z.any()).optional(),
    })
  }

  /**
   * Custom parameter mapping hook for subclasses
   */
  protected async customParameterMapping(
    mappedArgs: Record<string, any>,
    originalArgs: TParlantArgs,
    context: ParlantExecutionContext
  ): Promise<TSimArgs> {
    return mappedArgs as TSimArgs
  }

  /**
   * Custom result formatting hook for subclasses
   */
  protected async customResultFormatting(
    baseResult: ParlantToolResult,
    simResult: SimToolResult,
    context: ParlantExecutionContext,
    originalArgs: TParlantArgs
  ): Promise<ParlantToolResult> {
    return baseResult
  }

  // Helper methods for building tool metadata

  /**
   * Build default description from Sim tool metadata
   */
  protected buildDefaultDescription(): string {
    if (this.simTool.metadata?.description) {
      return this.simTool.metadata.description
    }

    // Generate from tool name
    const humanName = this.simTool.name
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())

    return `Execute ${humanName} functionality`
  }

  /**
   * Build default natural language configuration
   */
  protected buildDefaultNaturalLanguage(): NaturalLanguageConfig {
    return {
      usageDescription: `Use this tool to ${this.simTool.name.replace(/[_-]/g, ' ').toLowerCase()}`,
      exampleUsage: [`When you need to ${this.simTool.name.replace(/[_-]/g, ' ').toLowerCase()}`],
      conversationalHints: {
        whenToUse: `This tool is helpful when you need to ${this.simTool.name.replace(/[_-]/g, ' ').toLowerCase()}`,
        parameters: "I'll help you provide the right parameters for this tool",
        results: "I'll explain the results in a clear and helpful way",
      },
    }
  }

  /**
   * Build tool metadata for Parlant
   */
  protected buildToolMetadata(): ParlantToolMetadata {
    return {
      source: 'sim',
      category: this.determineToolCategory(),
      tags: this.buildToolTags(),
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      capabilities: this.buildCapabilities(),
      requirements: this.buildRequirements(),
      naturalLanguage: this.naturalLanguage,
    }
  }

  /**
   * Determine tool category based on Sim tool characteristics
   */
  protected determineToolCategory(): string {
    const toolName = this.simTool.name.toLowerCase()

    if (toolName.includes('workflow')) return 'workflow'
    if (toolName.includes('gdrive') || toolName.includes('google')) return 'integration'
    if (toolName.includes('user') || toolName.includes('auth')) return 'user'
    if (toolName.includes('api') || toolName.includes('request')) return 'api'
    if (toolName.includes('block')) return 'blocks'
    if (toolName.includes('todo') || toolName.includes('plan')) return 'planning'
    if (toolName.includes('search')) return 'research'

    return 'utility'
  }

  /**
   * Build tool tags for categorization and discovery
   */
  protected buildToolTags(): string[] {
    const tags: string[] = ['sim-tool']
    const toolName = this.simTool.name.toLowerCase()

    // Add category-specific tags
    if (toolName.includes('workflow')) tags.push('workflow', 'automation')
    if (toolName.includes('gdrive')) tags.push('google', 'drive', 'files', 'storage')
    if (toolName.includes('api')) tags.push('api', 'integration', 'external')
    if (toolName.includes('user')) tags.push('user', 'profile', 'settings')
    if (toolName.includes('auth')) tags.push('authentication', 'security')
    if (toolName.includes('block')) tags.push('blocks', 'components')
    if (toolName.includes('todo')) tags.push('planning', 'tasks', 'productivity')
    if (toolName.includes('search')) tags.push('search', 'research', 'information')

    // Add interrupt capability tag if supported
    if (this.simTool.hasInterrupt) {
      tags.push('interactive', 'confirmation')
    }

    return tags
  }

  /**
   * Build capability list based on Sim tool features
   */
  protected buildCapabilities(): string[] {
    const capabilities: string[] = []

    // Base capabilities
    capabilities.push('execute')

    // Interrupt support
    if (this.simTool.hasInterrupt) {
      capabilities.push('interactive', 'confirmation')
    }

    // Accept/reject handlers
    if (this.simTool.accept) capabilities.push('accept_handler')
    if (this.simTool.reject) capabilities.push('reject_handler')

    return capabilities
  }

  /**
   * Build requirement list for tool usage
   */
  protected buildRequirements(): string[] {
    const requirements: string[] = []

    // Authentication requirements
    const toolName = this.simTool.name.toLowerCase()
    if (toolName.includes('user') || toolName.includes('workflow')) {
      requirements.push('authentication')
    }
    if (toolName.includes('gdrive') || toolName.includes('google')) {
      requirements.push('google_oauth')
    }

    // Workspace requirements
    if (toolName.includes('workflow') || toolName.includes('workspace')) {
      requirements.push('workspace_access')
    }

    return requirements
  }

  // Error handling methods

  /**
   * Handle validation errors with helpful messages
   */
  protected handleValidationError(
    error: ValidationError,
    context: ParlantExecutionContext
  ): ParlantToolResult {
    const fieldErrors = error.validationErrors || []
    const errorSummary =
      fieldErrors.length > 0
        ? `Parameter validation failed: ${fieldErrors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
        : error.message

    return {
      type: 'error',
      message: errorSummary,
      data: { validationErrors: fieldErrors },
      conversational: {
        summary: 'I need some help with the parameters for this tool.',
        details:
          fieldErrors.length > 0
            ? `These parameters need attention: ${fieldErrors.map((e) => e.field).join(', ')}`
            : 'There was an issue with the provided parameters.',
        suggestion: 'Please check the parameter values and try again.',
      },
    }
  }

  /**
   * Handle execution errors with context
   */
  protected handleExecutionError(
    error: ExecutionError,
    context: ParlantExecutionContext
  ): ParlantToolResult {
    return {
      type: 'error',
      message: error.message,
      data: { originalError: error.originalError?.message },
      conversational: {
        summary: 'The tool encountered an issue during execution.',
        details: error.message,
        suggestion: 'Please try again or check if all required conditions are met.',
      },
    }
  }

  /**
   * Handle unknown errors safely
   */
  protected handleUnknownError(error: Error, context: ParlantExecutionContext): ParlantToolResult {
    return {
      type: 'error',
      message: 'An unexpected error occurred',
      data: { error: error.message },
      conversational: {
        summary: 'Something unexpected happened while using this tool.',
        suggestion: 'Please try again or contact support if the problem persists.',
      },
    }
  }

  // Utility methods for inspection and debugging

  /**
   * Get adapter configuration for debugging
   */
  public getConfiguration(): AdapterConfiguration {
    return { ...this.config }
  }

  /**
   * Get underlying Sim tool reference
   */
  public getSimTool(): SimToolDefinition<TSimArgs> {
    return this.simTool
  }

  /**
   * Test parameter mapping without execution
   */
  public async testParameterMapping(
    parlantArgs: TParlantArgs,
    context: ParlantExecutionContext
  ): Promise<{ simArgs: TSimArgs; validationResult: ValidationResult }> {
    try {
      const validatedArgs = await this.validateInput(parlantArgs)
      const simArgs = await this.mapParametersToSim(validatedArgs, context)

      return {
        simArgs,
        validationResult: { valid: true, errors: [] },
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          simArgs: {} as TSimArgs,
          validationResult: {
            valid: false,
            errors: error.validationErrors || [
              { field: 'unknown', message: error.message, code: 'unknown' },
            ],
          },
        }
      }
      throw error
    }
  }
}
