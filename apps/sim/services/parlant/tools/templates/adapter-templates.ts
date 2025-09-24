/**
 * Standardized Adapter Templates and Utilities
 * ============================================
 *
 * Reusable templates and utility functions for creating tool adapters
 * Provides common patterns for authentication, parameter handling, and result transformation
 */

import { UniversalToolAdapter, ParlantTool, ParlantToolParameter, ToolExecutionContext } from '../adapter-framework'
import type { BlockConfig, SubBlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

// ================================
// Common Parameter Templates
// ================================

/**
 * Standard API key parameter template
 */
export const createApiKeyParameter = (
  serviceName: string,
  examples: string[] = []
): ParlantToolParameter => ({
  name: 'api_key',
  description: `Your ${serviceName} API key for authentication`,
  type: 'string',
  required: true,
  examples: examples.length > 0 ? examples : [`your-${serviceName.toLowerCase()}-api-key`]
})

/**
 * Standard OAuth credentials parameter template
 */
export const createOAuthParameter = (
  serviceName: string,
  scopes: string[] = []
): ParlantToolParameter => ({
  name: 'oauth_credentials',
  description: `OAuth credentials for ${serviceName} access`,
  type: 'object',
  required: true,
  examples: [{ access_token: 'token', refresh_token: 'refresh' }]
})

/**
 * Standard timeout parameter template
 */
export const createTimeoutParameter = (
  defaultTimeout: number = 30,
  maxTimeout: number = 300
): ParlantToolParameter => ({
  name: 'timeout',
  description: 'Operation timeout in seconds',
  type: 'number',
  required: false,
  default: defaultTimeout,
  constraints: {
    min: 1,
    max: maxTimeout
  }
})

/**
 * Standard operation/action parameter template
 */
export const createOperationParameter = (
  operations: string[],
  descriptions?: Record<string, string>
): ParlantToolParameter => ({
  name: 'operation',
  description: 'The operation to perform',
  type: 'string',
  required: true,
  constraints: { enum: operations },
  examples: operations.slice(0, 3)
})

// ================================
// Authentication Utility Templates
// ================================

/**
 * Base class for API key authenticated tools
 */
export abstract class ApiKeyAdapter extends UniversalToolAdapter {
  protected serviceName: string
  protected baseUrl: string

  constructor(blockConfig: BlockConfig, serviceName: string, baseUrl: string) {
    super(blockConfig)
    this.serviceName = serviceName
    this.baseUrl = baseUrl
  }

  /**
   * Standard API key authentication headers
   */
  protected getAuthHeaders(apiKey: string, headerFormat: 'bearer' | 'key' | 'custom' = 'bearer', customHeader?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Sim-Parlant-Integration/1.0'
    }

    switch (headerFormat) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${apiKey}`
        break
      case 'key':
        headers['X-API-Key'] = apiKey
        break
      case 'custom':
        if (customHeader) {
          headers[customHeader] = apiKey
        }
        break
    }

    return headers
  }

  /**
   * Standard API request with error handling
   */
  protected async makeApiRequest(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
        ...body && method !== 'GET' ? { 'Content-Type': 'application/json' } : {}
      },
      body: body && method !== 'GET' ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`${this.serviceName} API error (${response.status}): ${errorData.message || response.statusText}`)
    }

    return await response.json()
  }
}

/**
 * Base class for OAuth authenticated tools
 */
export abstract class OAuthAdapter extends UniversalToolAdapter {
  protected serviceName: string
  protected baseUrl: string
  protected requiredScopes: string[]

  constructor(blockConfig: BlockConfig, serviceName: string, baseUrl: string, requiredScopes: string[] = []) {
    super(blockConfig)
    this.serviceName = serviceName
    this.baseUrl = baseUrl
    this.requiredScopes = requiredScopes
  }

  /**
   * Standard OAuth authentication headers
   */
  protected getOAuthHeaders(accessToken: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Sim-Parlant-Integration/1.0'
    }
  }

  /**
   * Validate OAuth credentials
   */
  protected validateOAuthCredentials(credentials: any): void {
    if (!credentials || typeof credentials !== 'object') {
      throw new Error(`${this.serviceName} OAuth credentials required`)
    }

    if (!credentials.access_token) {
      throw new Error(`${this.serviceName} access token is required`)
    }

    // Check if token is expired (if expiry info is available)
    if (credentials.expires_at && Date.now() > credentials.expires_at * 1000) {
      throw new Error(`${this.serviceName} access token has expired`)
    }
  }
}

// ================================
// Common Response Templates
// ================================

/**
 * Standard success response template
 */
export const createSuccessResponse = (data: any, metadata?: any): any => ({
  success: true,
  data,
  metadata,
  timestamp: new Date().toISOString()
})

/**
 * Standard error response template
 */
export const createErrorResponse = (error: string, details?: any): any => ({
  success: false,
  error,
  details,
  timestamp: new Date().toISOString()
})

// ================================
// Parameter Transformation Utilities
// ================================

/**
 * Extract API key from various parameter formats
 */
export const extractApiKey = (params: Record<string, any>): string => {
  const apiKey = params.api_key || params.apiKey || params.token || params.key
  if (!apiKey) {
    throw new Error('API key is required but not provided')
  }
  return apiKey
}

/**
 * Extract OAuth credentials from parameters
 */
export const extractOAuthCredentials = (params: Record<string, any>): any => {
  const credentials = params.oauth_credentials || params.credentials || params.oauth
  if (!credentials) {
    throw new Error('OAuth credentials are required but not provided')
  }
  return credentials
}

/**
 * Transform Sim SubBlock to Parlant parameter
 */
export const transformSubBlockToParameter = (subBlock: SubBlockConfig): ParlantToolParameter => {
  const parameter: ParlantToolParameter = {
    name: subBlock.id,
    description: subBlock.description || subBlock.title || `${subBlock.id} parameter`,
    type: mapSubBlockTypeToParlantType(subBlock.type),
    required: subBlock.required || false
  }

  // Add default value
  if (subBlock.defaultValue !== undefined) {
    parameter.default = subBlock.defaultValue
  }

  // Add constraints from options
  if (subBlock.options) {
    const options = typeof subBlock.options === 'function' ? subBlock.options() : subBlock.options
    parameter.constraints = {
      enum: options.map(opt => opt.id)
    }
    parameter.examples = options.slice(0, 3).map(opt => opt.id)
  }

  // Add constraints from slider/number inputs
  if (subBlock.min !== undefined || subBlock.max !== undefined) {
    parameter.constraints = {
      ...parameter.constraints,
      min: subBlock.min,
      max: subBlock.max
    }
  }

  // Add dependency conditions
  if (subBlock.condition) {
    const condition = typeof subBlock.condition === 'function' ? subBlock.condition() : subBlock.condition
    parameter.dependsOn = {
      parameter: condition.field,
      value: condition.value
    }
  }

  return parameter
}

/**
 * Map Sim SubBlock types to Parlant parameter types
 */
export const mapSubBlockTypeToParlantType = (subBlockType: string): 'string' | 'number' | 'boolean' | 'array' | 'object' => {
  switch (subBlockType) {
    case 'short-input':
    case 'long-input':
    case 'dropdown':
    case 'combobox':
      return 'string'
    case 'slider':
      return 'number'
    case 'switch':
      return 'boolean'
    case 'table':
    case 'checkbox-list':
      return 'array'
    case 'code':
    case 'oauth-input':
    case 'webhook-config':
      return 'object'
    default:
      return 'string'
  }
}

// ================================
// Category Classification Utilities
// ================================

/**
 * Intelligent tool categorization based on block configuration
 */
export const classifyTool = (blockConfig: BlockConfig): ParlantTool['category'] => {
  const type = blockConfig.type.toLowerCase()
  const description = (blockConfig.description + ' ' + (blockConfig.longDescription || '')).toLowerCase()

  // Communication tools
  if (isMatchingCategory(type, description, [
    'slack', 'discord', 'telegram', 'whatsapp', 'sms', 'mail', 'gmail', 'outlook', 'teams'
  ])) {
    return 'communication'
  }

  // Productivity tools
  if (isMatchingCategory(type, description, [
    'notion', 'airtable', 'google_sheets', 'excel', 'jira', 'linear', 'github', 'trello'
  ])) {
    return 'productivity'
  }

  // Data tools
  if (isMatchingCategory(type, description, [
    'postgresql', 'mysql', 'mongodb', 'supabase', 'pinecone', 'qdrant', 'database', 'storage'
  ])) {
    return 'data'
  }

  // AI tools
  if (isMatchingCategory(type, description, [
    'openai', 'huggingface', 'elevenlabs', 'image_generator', 'vision', 'ai', 'ml', 'embedding'
  ])) {
    return 'ai'
  }

  // Integration tools
  if (isMatchingCategory(type, description, [
    'webhook', 'api', 'oauth', 'http', 'rest', 'graphql'
  ])) {
    return 'integration'
  }

  // Default to utility
  return 'utility'
}

/**
 * Check if tool matches a category based on keywords
 */
const isMatchingCategory = (type: string, description: string, keywords: string[]): boolean => {
  const text = `${type} ${description}`.toLowerCase()
  return keywords.some(keyword => text.includes(keyword))
}

// ================================
// Usage Hints Generation
// ================================

/**
 * Generate contextual usage hints based on block configuration
 */
export const generateUsageHints = (blockConfig: BlockConfig): string[] => {
  const hints: string[] = []

  // Authentication hints
  const hasOAuth = blockConfig.subBlocks.some(sub => sub.type === 'oauth-input')
  const hasApiKey = blockConfig.subBlocks.some(sub => sub.password && (sub.id.includes('key') || sub.id.includes('token')))

  if (hasOAuth) {
    hints.push('OAuth authentication required - ensure proper scopes are configured')
  }
  if (hasApiKey) {
    hints.push('API key authentication required - check service documentation for key generation')
  }

  // Parameter hints
  const hasFileInputs = blockConfig.subBlocks.some(sub => sub.type === 'file-upload' || sub.type === 'file-selector')
  if (hasFileInputs) {
    hints.push('File operations supported - check file size limits and supported formats')
  }

  const hasComplexInputs = blockConfig.subBlocks.some(sub => sub.type === 'code' || sub.type === 'table')
  if (hasComplexInputs) {
    hints.push('Complex data structures supported - use proper JSON formatting')
  }

  // Rate limiting hints
  hints.push('Rate limiting may apply - avoid excessive API calls in short periods')

  // Error handling hints
  hints.push('Check response for error details if operations fail')

  return hints
}

// ================================
// Auto-Generated Adapter Template
// ================================

/**
 * Generate a complete adapter class from a block configuration
 * Useful for quickly creating adapters for simple tools
 */
export const generateAdapterFromBlock = (
  blockConfig: BlockConfig,
  serviceName: string,
  baseUrl?: string
): string => {
  const className = `${blockConfig.type.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('')}Adapter`

  const category = classifyTool(blockConfig)
  const hasApiKey = blockConfig.subBlocks.some(sub => sub.password)
  const baseClass = hasApiKey && baseUrl ? 'ApiKeyAdapter' : 'UniversalToolAdapter'

  return `/**
 * ${serviceName} Tool Adapter
 * Generated from BlockConfig
 */

import { ${baseClass}, ParlantTool, ToolExecutionContext } from '../adapter-framework'
import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

export class ${className} extends ${baseClass} {
  constructor(blockConfig: BlockConfig) {
    ${baseClass === 'ApiKeyAdapter' && baseUrl
      ? `super(blockConfig, '${serviceName}', '${baseUrl}')`
      : 'super(blockConfig)'
    }
  }

  protected transformToParlant(blockConfig: BlockConfig): ParlantTool {
    return {
      id: '${blockConfig.type}',
      name: '${serviceName}',
      description: '${blockConfig.description}',
      longDescription: '${blockConfig.longDescription || blockConfig.description}',
      category: '${category}',
      parameters: [
        ${blockConfig.subBlocks.map(sub => `
        {
          name: '${sub.id}',
          description: '${sub.description || sub.title || sub.id}',
          type: '${mapSubBlockTypeToParlantType(sub.type)}',
          required: ${sub.required || false}${sub.defaultValue ? `,\n          default: ${JSON.stringify(sub.defaultValue)}` : ''}
        }`).join(',\n        ')}
      ],
      outputs: [
        ${Object.entries(blockConfig.outputs).map(([key, output]) => `
        {
          name: '${key}',
          description: '${typeof output === 'object' && 'description' in output ? output.description : key}',
          type: '${typeof output === 'object' && 'type' in output ? output.type : 'string'}'
        }`).join(',\n        ')}
      ],
      usageHints: ${JSON.stringify(generateUsageHints(blockConfig), null, 8).replace(/\n/g, '\n      ')},
      ${hasApiKey ? `requiresAuth: {
        type: 'api_key',
        provider: '${serviceName.toLowerCase()}'
      }` : ''}
    }
  }

  protected async transformParameters(
    parlantParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<Record<string, any>> {
    // Transform Parlant parameters to Sim format
    return parlantParams
  }

  protected async executeSimTool(
    simParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResponse> {
    // TODO: Implement actual tool execution
    throw new Error('Tool execution not implemented')
  }

  protected async transformResult(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    if (!simResult.success) {
      throw new Error(simResult.error || '${serviceName} operation failed')
    }

    return simResult.output
  }
}`
}

// ================================
// Export All Utilities
// ================================

export const AdapterTemplates = {
  createApiKeyParameter,
  createOAuthParameter,
  createTimeoutParameter,
  createOperationParameter,
  ApiKeyAdapter,
  OAuthAdapter,
  createSuccessResponse,
  createErrorResponse,
  extractApiKey,
  extractOAuthCredentials,
  transformSubBlockToParameter,
  mapSubBlockTypeToParlantType,
  classifyTool,
  generateUsageHints,
  generateAdapterFromBlock
}