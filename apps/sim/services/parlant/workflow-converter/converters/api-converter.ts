/**
 * Workflow to Journey Mapping System - API Node Converter
 *
 * Converts ReactFlow API nodes into Parlant tool states.
 * Handles HTTP requests, API calls, and external service integrations.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ConversionContext,
  NodeConversionResult,
  ParlantState,
  ParlantStateType,
  ReactFlowNode,
  ValidationResult,
} from '../types'
import { BaseNodeConverter } from './base-converter'

const logger = createLogger('ApiConverter')

/**
 * Converter for API/function nodes
 */
export class ApiNodeConverter extends BaseNodeConverter {
  constructor() {
    super('api', ['api', 'http', 'rest', 'function', 'webhook-call'])
    logger.info('ApiNodeConverter initialized')
  }

  /**
   * Convert API node to tool Parlant state
   */
  async convert(node: ReactFlowNode, context: ConversionContext): Promise<NodeConversionResult> {
    this.logConversion(node, 'Converting API node')

    try {
      // Create the tool state
      const toolState = this.createToolState(node, context)

      // Extract variables from API configuration
      const variables = this.extractVariables(node)

      // Add API-specific variables
      variables.push(...this.extractApiVariables(node))

      this.logConversion(node, 'API node converted successfully', {
        stateId: toolState.id,
        hasUrl: !!node.data?.url,
        method: node.data?.method || 'GET',
        toolCount: this.extractTools(node).length,
      })

      return {
        states: [toolState],
        transitions: [],
        variables: variables.length > 0 ? variables : undefined,
      }
    } catch (error) {
      logger.error('Failed to convert API node', {
        nodeId: node.id,
        error: error instanceof Error ? error.message : String(error),
      })

      context.errors.push(
        this.createConversionError(
          node,
          'API_CONVERSION_ERROR',
          `Failed to convert API node: ${error instanceof Error ? error.message : String(error)}`,
          'error',
          [
            'Check API configuration',
            'Verify URL is valid',
            'Review authentication settings',
            'Check request parameters',
          ]
        )
      )

      return {
        states: [this.createFallbackToolState(node)],
        transitions: [],
        variables: undefined,
      }
    }
  }

  /**
   * Validate API node configuration
   */
  protected validateNodeSpecific(node: ReactFlowNode): ValidationResult {
    const errors = []
    const warnings = []

    // Check for required URL
    if (!node.data?.url && !node.data?.endpoint && !node.data?.config?.url) {
      errors.push(
        this.createConversionError(
          node,
          'MISSING_API_URL',
          'API node must have a URL or endpoint configured',
          'error',
          [
            'Add URL to the API configuration',
            'Configure endpoint in node settings',
            'Verify API connection details',
          ]
        )
      )
    }

    // Validate HTTP method
    const method = (node.data?.method || 'GET').toUpperCase()
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
    if (!validMethods.includes(method)) {
      warnings.push(
        this.createConversionWarning(
          node,
          'INVALID_HTTP_METHOD',
          `HTTP method '${method}' may not be supported`,
          'medium',
          [
            'Use standard HTTP methods (GET, POST, PUT, DELETE)',
            'Verify method is supported by target API',
          ]
        )
      )
    }

    // Check authentication configuration
    if (node.data?.auth?.type && !node.data?.auth?.token && !node.data?.auth?.key) {
      warnings.push(
        this.createConversionWarning(
          node,
          'INCOMPLETE_AUTH_CONFIG',
          'Authentication type specified but credentials missing',
          'high',
          [
            'Add authentication credentials',
            'Configure API key or token',
            'Review authentication requirements',
          ]
        )
      )
    }

    // Validate headers format
    if (node.data?.headers && typeof node.data.headers !== 'object') {
      warnings.push(
        this.createConversionWarning(
          node,
          'INVALID_HEADERS_FORMAT',
          'Headers should be configured as an object',
          'medium',
          ['Format headers as key-value pairs', 'Check headers configuration']
        )
      )
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  /**
   * Get the primary state type for API nodes
   */
  protected getPrimaryStateType(): ParlantStateType {
    return 'tool'
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private createToolState(node: ReactFlowNode, context: ConversionContext): ParlantState {
    // Generate tool function name
    const toolName = this.generateToolName(node)

    // Create description for the tool state
    const description = this.generateToolDescription(node)

    // Extract configured tools or create API-specific tool
    let tools = this.extractTools(node)
    if (tools.length === 0) {
      tools = [toolName]
    }

    return this.createBaseState(node, 'tool', {
      name: node.data?.name || 'API Call',
      description,
      content: `Executing ${toolName}`,
      tools,
      conditions: this.extractConditions(node),
    })
  }

  private generateToolName(node: ReactFlowNode): string {
    // Use configured tool name if available
    if (node.data?.toolName) {
      return node.data.toolName
    }

    // Generate from node name
    if (node.data?.name) {
      return node.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    }

    // Generate from URL if available
    if (node.data?.url) {
      try {
        const url = new URL(node.data.url)
        const pathParts = url.pathname.split('/').filter((p) => p)
        if (pathParts.length > 0) {
          return `call_${pathParts[pathParts.length - 1]}`
        }
        return `call_${url.hostname.replace(/\./g, '_')}`
      } catch {
        // Invalid URL, fall back to generic name
      }
    }

    // Fallback to node ID
    return `api_call_${node.id.slice(-8)}`
  }

  private generateToolDescription(node: ReactFlowNode): string {
    const method = (node.data?.method || 'GET').toUpperCase()
    const url = node.data?.url || node.data?.endpoint || 'configured endpoint'

    let description = `${method} request to ${url}`

    // Add authentication info
    if (node.data?.auth?.type) {
      description += ` with ${node.data.auth.type} authentication`
    }

    // Add custom description if provided
    if (node.data?.description) {
      description += ` - ${node.data.description}`
    }

    return description
  }

  private extractApiVariables(node: ReactFlowNode): any[] {
    const variables = []

    // Add URL as variable
    const url = node.data?.url || node.data?.endpoint
    if (url) {
      variables.push({
        name: `${node.id}_url`,
        type: 'string' as const,
        description: `API endpoint for ${node.data?.name || 'API call'}`,
        defaultValue: url,
      })
    }

    // Add method as variable
    const method = node.data?.method || 'GET'
    variables.push({
      name: `${node.id}_method`,
      type: 'string' as const,
      description: 'HTTP method for the API call',
      defaultValue: method.toUpperCase(),
    })

    // Add headers as variable
    if (node.data?.headers) {
      variables.push({
        name: `${node.id}_headers`,
        type: 'json' as const,
        description: 'HTTP headers for the API call',
        defaultValue: node.data.headers,
      })
    }

    // Add body/payload as variable
    if (node.data?.body || node.data?.payload || node.data?.data) {
      const body = node.data?.body || node.data?.payload || node.data?.data
      variables.push({
        name: `${node.id}_body`,
        type: 'json' as const,
        description: 'Request body for the API call',
        defaultValue: body,
      })
    }

    // Add query parameters
    if (node.data?.params || node.data?.query) {
      const params = node.data?.params || node.data?.query
      variables.push({
        name: `${node.id}_params`,
        type: 'json' as const,
        description: 'Query parameters for the API call',
        defaultValue: params,
      })
    }

    // Add timeout configuration
    if (node.data?.timeout) {
      variables.push({
        name: `${node.id}_timeout`,
        type: 'number' as const,
        description: 'Timeout for the API call in milliseconds',
        defaultValue: node.data.timeout,
      })
    }

    // Add authentication variables
    if (node.data?.auth) {
      variables.push({
        name: `${node.id}_auth`,
        type: 'json' as const,
        description: 'Authentication configuration',
        defaultValue: node.data.auth,
      })
    }

    return variables
  }

  private createFallbackToolState(node: ReactFlowNode): ParlantState {
    return this.createBaseState(node, 'tool', {
      name: 'API Call (Fallback)',
      description: 'Fallback tool state created due to conversion error',
      content: 'Executing API call with fallback configuration',
      tools: ['generic_api_call'],
      conditions: ['API call required'],
    })
  }
}
