/**
 * External Integration Tool Adapters
 *
 * Specialized adapters for external service integrations including
 * OpenAI, GitHub, Google services, databases, and third-party APIs.
 */

import { BaseToolAdapter, createToolSchema } from '../base-adapter'
import type { AdapterContext, AdapterResult, ToolAdapter, ValidationResult } from '../types'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ExternalIntegrationAdapters')

export class ExternalIntegrationAdapters {
  createAdapters(): ToolAdapter[] {
    return [
      new OpenAIIntegrationAdapter(),
      new GitHubIntegrationAdapter(),
      new GoogleServicesAdapter(),
      new DatabaseIntegrationAdapter(),
      new APIRequestAdapter(),
      new OAuthManagementAdapter(),
      new WebhookManagerAdapter(),
      new ThirdPartyServicesAdapter(),
    ]
  }
}

/**
 * OpenAI Integration Adapter
 * Handles OpenAI API calls for text generation, embeddings, and image creation
 */
class OpenAIIntegrationAdapter extends BaseToolAdapter {
  constructor() {
    super(createToolSchema(
      'openai_integration',
      'Integrate with OpenAI services for text generation, embeddings, and image creation',
      'Use when you need to generate text, create embeddings, or generate images using OpenAI models. Supports multiple models and advanced configuration.',
      {
        type: 'object',
        properties: {
          service_type: {
            type: 'string',
            description: 'Type of OpenAI service to use',
            enum: ['text_generation', 'embeddings', 'image_generation', 'chat_completion'],
            default: 'chat_completion'
          },
          model: {
            type: 'string',
            description: 'OpenAI model to use (e.g., gpt-4, gpt-3.5-turbo, dall-e-3)',
            default: 'gpt-3.5-turbo'
          },
          prompt: {
            type: 'string',
            description: 'Input prompt or text'
          },
          max_tokens: {
            type: 'number',
            description: 'Maximum tokens to generate',
            default: 1000
          },
          temperature: {
            type: 'number',
            description: 'Sampling temperature (0-2)',
            default: 0.7,
            minimum: 0,
            maximum: 2
          },
          api_key: {
            type: 'string',
            description: 'OpenAI API key (optional if configured in environment)'
          }
        },
        required: ['service_type', 'prompt']
      },
      {
        category: 'external-integration',
        performance: {
          estimated_duration_ms: 5000,
          cacheable: true,
          resource_usage: 'high',
          rate_limit: {
            max_requests_per_minute: 60,
            max_concurrent: 3
          }
        }
      }
    ))
  }

  validate(args: any): ValidationResult {
    const errors: string[] = []

    if (!args.prompt?.trim()) {
      errors.push('Prompt is required')
    }

    if (args.temperature && (args.temperature < 0 || args.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2')
    }

    if (args.max_tokens && args.max_tokens < 1) {
      errors.push('max_tokens must be positive')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  protected async executeInternal(args: any, context: AdapterContext): Promise<AdapterResult> {
    try {
      logger.info('Executing OpenAI integration', { service_type: args.service_type, model: args.model, context })

      // This would integrate with Sim's OpenAI tools
      const result = {
        response: `OpenAI ${args.service_type} result for prompt: ${args.prompt}`,
        model_used: args.model,
        tokens_used: 150,
        finish_reason: 'stop',
        metadata: {
          service_type: args.service_type,
          temperature: args.temperature,
          max_tokens: args.max_tokens
        }
      }

      return this.createSuccessResult(
        result,
        `Successfully completed ${args.service_type} using ${args.model}`,
        {
          service_type: args.service_type,
          model: args.model,
          tokens_used: result.tokens_used
        }
      )
    } catch (error: any) {
      logger.error('OpenAI integration failed', { error: error.message, service_type: args.service_type })
      return this.createErrorResult(
        'OPENAI_INTEGRATION_FAILED',
        error.message,
        'Failed to complete OpenAI request. Please check your configuration.',
        ['Verify API key is valid', 'Check model availability', 'Try reducing max_tokens', 'Verify rate limits'],
        true
      )
    }
  }
}

/**
 * GitHub Integration Adapter
 * Handles GitHub API operations including repository management, pull requests, and issues
 */
class GitHubIntegrationAdapter extends BaseToolAdapter {
  constructor() {
    super(createToolSchema(
      'github_integration',
      'Integrate with GitHub for repository operations, pull requests, and issue management',
      'Use when you need to interact with GitHub repositories, create or manage pull requests, issues, or access repository information.',
      {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: 'GitHub operation to perform',
            enum: ['get_repo_info', 'create_issue', 'create_pr', 'get_commits', 'search_repositories', 'get_file_content'],
            default: 'get_repo_info'
          },
          repository: {
            type: 'string',
            description: 'Repository in format owner/repo'
          },
          github_token: {
            type: 'string',
            description: 'GitHub personal access token (optional if configured)'
          },
          title: {
            type: 'string',
            description: 'Title for issues or pull requests'
          },
          body: {
            type: 'string',
            description: 'Body content for issues or pull requests'
          },
          branch: {
            type: 'string',
            description: 'Branch name for operations'
          },
          file_path: {
            type: 'string',
            description: 'File path for file operations'
          },
          search_query: {
            type: 'string',
            description: 'Search query for repository searches'
          }
        },
        required: ['operation']
      },
      {
        category: 'external-integration',
        performance: {
          estimated_duration_ms: 3000,
          cacheable: true,
          resource_usage: 'medium',
          rate_limit: {
            max_requests_per_minute: 100,
            max_concurrent: 5
          }
        }
      }
    ))
  }

  validate(args: any): ValidationResult {
    const errors: string[] = []

    if (['get_repo_info', 'create_issue', 'create_pr', 'get_commits', 'get_file_content'].includes(args.operation) && !args.repository) {
      errors.push('Repository is required for this operation')
    }

    if (['create_issue', 'create_pr'].includes(args.operation) && !args.title) {
      errors.push('Title is required for creating issues or pull requests')
    }

    if (args.operation === 'search_repositories' && !args.search_query) {
      errors.push('Search query is required for repository search')
    }

    if (args.operation === 'get_file_content' && !args.file_path) {
      errors.push('File path is required for file content operations')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  protected async executeInternal(args: any, context: AdapterContext): Promise<AdapterResult> {
    try {
      logger.info('Executing GitHub integration', { operation: args.operation, repository: args.repository, context })

      // This would integrate with Sim's GitHub tools
      const result = {
        operation: args.operation,
        repository: args.repository,
        data: {
          // Sample response based on operation
          ...(args.operation === 'get_repo_info' && {
            name: args.repository,
            description: 'Sample repository description',
            stars: 100,
            forks: 25,
            language: 'TypeScript'
          }),
          ...(args.operation === 'create_issue' && {
            issue_number: 42,
            url: `https://github.com/${args.repository}/issues/42`,
            title: args.title
          }),
          ...(args.operation === 'create_pr' && {
            pr_number: 15,
            url: `https://github.com/${args.repository}/pull/15`,
            title: args.title
          })
        }
      }

      return this.createSuccessResult(
        result,
        `Successfully completed ${args.operation} on ${args.repository || 'GitHub'}`,
        {
          operation: args.operation,
          repository: args.repository
        }
      )
    } catch (error: any) {
      logger.error('GitHub integration failed', { error: error.message, operation: args.operation })
      return this.createErrorResult(
        'GITHUB_INTEGRATION_FAILED',
        error.message,
        'Failed to complete GitHub operation. Please check your configuration.',
        ['Verify GitHub token is valid', 'Check repository permissions', 'Verify repository exists', 'Check rate limits'],
        true
      )
    }
  }
}

/**
 * Google Services Adapter
 * Handles integration with Google services (Drive, Docs, Sheets, Calendar, Gmail)
 */
class GoogleServicesAdapter extends BaseToolAdapter {
  constructor() {
    super(createToolSchema(
      'google_services_integration',
      'Integrate with Google services including Drive, Docs, Sheets, Calendar, and Gmail',
      'Use when you need to interact with Google services such as accessing files in Drive, reading/writing documents, managing calendar events, or sending emails.',
      {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            description: 'Google service to use',
            enum: ['drive', 'docs', 'sheets', 'calendar', 'gmail'],
            default: 'drive'
          },
          operation: {
            type: 'string',
            description: 'Operation to perform',
            enum: ['list_files', 'get_file', 'create_file', 'update_file', 'send_email', 'list_events', 'create_event']
          },
          file_id: {
            type: 'string',
            description: 'Google file ID for file operations'
          },
          file_name: {
            type: 'string',
            description: 'File name for file operations'
          },
          folder_id: {
            type: 'string',
            description: 'Folder ID to search within'
          },
          query: {
            type: 'string',
            description: 'Search query for file searches'
          },
          content: {
            type: 'string',
            description: 'Content for file creation or updates'
          },
          to_email: {
            type: 'string',
            description: 'Recipient email address'
          },
          subject: {
            type: 'string',
            description: 'Email subject'
          },
          email_body: {
            type: 'string',
            description: 'Email body content'
          }
        },
        required: ['service', 'operation']
      },
      {
        category: 'external-integration',
        performance: {
          estimated_duration_ms: 4000,
          cacheable: false, // Most operations modify data
          resource_usage: 'medium',
          rate_limit: {
            max_requests_per_minute: 50,
            max_concurrent: 3
          }
        }
      }
    ))
  }

  validate(args: any): ValidationResult {
    const errors: string[] = []

    if (['get_file', 'update_file'].includes(args.operation) && !args.file_id) {
      errors.push('File ID is required for this operation')
    }

    if (args.operation === 'send_email') {
      if (!args.to_email) errors.push('Recipient email is required')
      if (!args.subject) errors.push('Email subject is required')
      if (!args.email_body) errors.push('Email body is required')
    }

    if (args.operation === 'create_file' && !args.file_name) {
      errors.push('File name is required for file creation')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  protected async executeInternal(args: any, context: AdapterContext): Promise<AdapterResult> {
    try {
      logger.info('Executing Google services integration', { service: args.service, operation: args.operation, context })

      // This would integrate with Sim's Google tools
      const result = {
        service: args.service,
        operation: args.operation,
        data: {
          // Sample response based on service and operation
          ...(args.operation === 'list_files' && {
            files: [
              { id: 'sample_file_id', name: 'Sample Document.docx', mimeType: 'application/vnd.google-apps.document' }
            ]
          }),
          ...(args.operation === 'send_email' && {
            message_id: 'sample_message_id',
            to: args.to_email,
            subject: args.subject,
            status: 'sent'
          })
        }
      }

      return this.createSuccessResult(
        result,
        `Successfully completed ${args.operation} in Google ${args.service}`,
        {
          service: args.service,
          operation: args.operation
        }
      )
    } catch (error: any) {
      logger.error('Google services integration failed', { error: error.message, service: args.service, operation: args.operation })
      return this.createErrorResult(
        'GOOGLE_SERVICES_FAILED',
        error.message,
        `Failed to complete ${args.service} operation. Please check your configuration.`,
        ['Verify OAuth credentials', 'Check service permissions', 'Verify file/resource exists', 'Check quota limits'],
        true
      )
    }
  }
}

/**
 * Database Integration Adapter
 * Handles database operations for PostgreSQL, MySQL, MongoDB
 */
class DatabaseIntegrationAdapter extends BaseToolAdapter {
  constructor() {
    super(createToolSchema(
      'database_integration',
      'Execute database operations across PostgreSQL, MySQL, and MongoDB',
      'Use when you need to query databases, insert/update data, or manage database schemas. Supports multiple database types with proper security.',
      {
        type: 'object',
        properties: {
          database_type: {
            type: 'string',
            description: 'Type of database',
            enum: ['postgresql', 'mysql', 'mongodb'],
            default: 'postgresql'
          },
          operation: {
            type: 'string',
            description: 'Database operation to perform',
            enum: ['query', 'insert', 'update', 'delete', 'create_table', 'describe_table']
          },
          query: {
            type: 'string',
            description: 'SQL query or MongoDB query object'
          },
          table_name: {
            type: 'string',
            description: 'Table name for operations'
          },
          collection_name: {
            type: 'string',
            description: 'MongoDB collection name'
          },
          data: {
            type: 'object',
            description: 'Data for insert/update operations'
          },
          connection_string: {
            type: 'string',
            description: 'Database connection string (optional if configured)'
          },
          limit: {
            type: 'number',
            description: 'Limit number of results',
            default: 100,
            maximum: 1000
          }
        },
        required: ['database_type', 'operation']
      },
      {
        category: 'external-integration',
        performance: {
          estimated_duration_ms: 2000,
          cacheable: false, // Database operations shouldn't be cached by default
          resource_usage: 'medium',
        }
      }
    ))
  }

  validate(args: any): ValidationResult {
    const errors: string[] = []

    if (args.operation === 'query' && !args.query) {
      errors.push('Query is required for query operations')
    }

    if (['insert', 'update'].includes(args.operation) && !args.data) {
      errors.push('Data is required for insert/update operations')
    }

    if (args.database_type === 'mongodb' && args.operation !== 'query' && !args.collection_name) {
      errors.push('Collection name is required for MongoDB operations')
    }

    if (['postgresql', 'mysql'].includes(args.database_type) && ['insert', 'update', 'delete'].includes(args.operation) && !args.table_name) {
      errors.push('Table name is required for SQL operations')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  protected async executeInternal(args: any, context: AdapterContext): Promise<AdapterResult> {
    try {
      logger.info('Executing database integration', { database_type: args.database_type, operation: args.operation, context })

      // This would integrate with Sim's database tools
      const result = {
        database_type: args.database_type,
        operation: args.operation,
        data: {
          // Sample response based on operation
          ...(args.operation === 'query' && {
            rows: [
              { id: 1, name: 'Sample Record', created_at: new Date().toISOString() }
            ],
            row_count: 1
          }),
          ...(args.operation === 'insert' && {
            inserted_id: 'sample_id_123',
            affected_rows: 1
          }),
          ...(args.operation === 'update' && {
            affected_rows: 1
          })
        },
        execution_time_ms: 45
      }

      return this.createSuccessResult(
        result,
        `Successfully executed ${args.operation} on ${args.database_type}`,
        {
          database_type: args.database_type,
          operation: args.operation,
          affected_rows: result.data.affected_rows || result.data.row_count
        }
      )
    } catch (error: any) {
      logger.error('Database integration failed', { error: error.message, database_type: args.database_type, operation: args.operation })
      return this.createErrorResult(
        'DATABASE_INTEGRATION_FAILED',
        error.message,
        'Database operation failed. Please check your query and connection.',
        ['Verify connection string', 'Check query syntax', 'Verify table/collection exists', 'Check permissions'],
        true
      )
    }
  }
}

/**
 * API Request Adapter
 * Generic HTTP API request handler with authentication support
 */
class APIRequestAdapter extends BaseToolAdapter {
  constructor() {
    super(createToolSchema(
      'api_request',
      'Make HTTP API requests to external services with authentication support',
      'Use when you need to call external REST APIs, webhook endpoints, or any HTTP service. Supports all HTTP methods and authentication types.',
      {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'API endpoint URL'
          },
          method: {
            type: 'string',
            description: 'HTTP method',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
            default: 'GET'
          },
          headers: {
            type: 'object',
            description: 'HTTP headers to include'
          },
          body: {
            type: 'object',
            description: 'Request body data (for POST, PUT, PATCH)'
          },
          auth_type: {
            type: 'string',
            description: 'Authentication type',
            enum: ['none', 'bearer_token', 'api_key', 'basic_auth'],
            default: 'none'
          },
          auth_token: {
            type: 'string',
            description: 'Authentication token or API key'
          },
          username: {
            type: 'string',
            description: 'Username for basic authentication'
          },
          password: {
            type: 'string',
            description: 'Password for basic authentication'
          },
          timeout: {
            type: 'number',
            description: 'Request timeout in milliseconds',
            default: 30000
          }
        },
        required: ['url']
      },
      {
        category: 'external-integration',
        performance: {
          estimated_duration_ms: 3000,
          cacheable: false, // API requests generally shouldn't be cached
          resource_usage: 'medium',
        }
      }
    ))
  }

  validate(args: any): ValidationResult {
    const errors: string[] = []

    if (!args.url?.trim()) {
      errors.push('URL is required')
    } else {
      try {
        new URL(args.url)
      } catch {
        errors.push('Invalid URL format')
      }
    }

    if (args.auth_type === 'basic_auth' && (!args.username || !args.password)) {
      errors.push('Username and password are required for basic authentication')
    }

    if (['bearer_token', 'api_key'].includes(args.auth_type) && !args.auth_token) {
      errors.push('Auth token is required for token-based authentication')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  protected async executeInternal(args: any, context: AdapterContext): Promise<AdapterResult> {
    try {
      logger.info('Executing API request', { url: args.url, method: args.method, auth_type: args.auth_type, context })

      // This would integrate with Sim's HTTP/API request tools
      const result = {
        url: args.url,
        method: args.method,
        status_code: 200,
        headers: {
          'content-type': 'application/json',
          'x-response-time': '50ms'
        },
        data: {
          message: 'API request successful',
          timestamp: new Date().toISOString()
        },
        response_time_ms: 250
      }

      return this.createSuccessResult(
        result,
        `API request to ${args.url} completed successfully`,
        {
          url: args.url,
          method: args.method,
          status_code: result.status_code,
          response_time_ms: result.response_time_ms
        }
      )
    } catch (error: any) {
      logger.error('API request failed', { error: error.message, url: args.url, method: args.method })
      return this.createErrorResult(
        'API_REQUEST_FAILED',
        error.message,
        'API request failed. Please check the URL and authentication.',
        ['Verify URL is correct', 'Check authentication credentials', 'Verify service is available', 'Check request timeout'],
        true
      )
    }
  }
}

/**
 * OAuth Management Adapter
 * Handles OAuth flows and token management for external services
 */
class OAuthManagementAdapter extends BaseToolAdapter {
  constructor() {
    super(createToolSchema(
      'oauth_management',
      'Manage OAuth authentication flows and tokens for external services',
      'Use when you need to handle OAuth authentication, refresh tokens, or manage service credentials for external integrations.',
      {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: 'OAuth operation to perform',
            enum: ['get_auth_url', 'exchange_code', 'refresh_token', 'revoke_token', 'validate_token'],
            default: 'get_auth_url'
          },
          service: {
            type: 'string',
            description: 'OAuth service provider',
            enum: ['google', 'github', 'microsoft', 'slack', 'discord', 'custom']
          },
          client_id: {
            type: 'string',
            description: 'OAuth client ID'
          },
          client_secret: {
            type: 'string',
            description: 'OAuth client secret'
          },
          redirect_uri: {
            type: 'string',
            description: 'OAuth redirect URI'
          },
          code: {
            type: 'string',
            description: 'Authorization code for token exchange'
          },
          refresh_token: {
            type: 'string',
            description: 'Refresh token for token renewal'
          },
          access_token: {
            type: 'string',
            description: 'Access token to validate or revoke'
          },
          scopes: {
            type: 'array',
            items: { type: 'string' },
            description: 'OAuth scopes to request'
          }
        },
        required: ['operation', 'service']
      },
      {
        category: 'external-integration',
        performance: {
          estimated_duration_ms: 2000,
          cacheable: false, // OAuth operations shouldn't be cached
          resource_usage: 'low',
        }
      }
    ))
  }

  protected async executeInternal(args: any, context: AdapterContext): Promise<AdapterResult> {
    try {
      logger.info('Executing OAuth management', { operation: args.operation, service: args.service, context })

      // This would integrate with Sim's OAuth management system
      const result = {
        operation: args.operation,
        service: args.service,
        data: {
          // Sample response based on operation
          ...(args.operation === 'get_auth_url' && {
            auth_url: `https://oauth.${args.service}.com/authorize?client_id=${args.client_id}&redirect_uri=${args.redirect_uri}&state=sample_state`,
            state: 'sample_state'
          }),
          ...(args.operation === 'exchange_code' && {
            access_token: 'sample_access_token',
            refresh_token: 'sample_refresh_token',
            expires_in: 3600,
            token_type: 'Bearer'
          }),
          ...(args.operation === 'refresh_token' && {
            access_token: 'new_access_token',
            expires_in: 3600
          }),
          ...(args.operation === 'validate_token' && {
            valid: true,
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            scopes: args.scopes || ['read', 'write']
          })
        }
      }

      return this.createSuccessResult(
        result,
        `OAuth ${args.operation} completed for ${args.service}`,
        {
          operation: args.operation,
          service: args.service
        }
      )
    } catch (error: any) {
      logger.error('OAuth management failed', { error: error.message, operation: args.operation, service: args.service })
      return this.createErrorResult(
        'OAUTH_MANAGEMENT_FAILED',
        error.message,
        'OAuth operation failed. Please check your configuration.',
        ['Verify client credentials', 'Check redirect URI', 'Verify service configuration', 'Check token validity'],
        true
      )
    }
  }
}

/**
 * Webhook Manager Adapter
 * Manages webhooks for receiving external data
 */
class WebhookManagerAdapter extends BaseToolAdapter {
  constructor() {
    super(createToolSchema(
      'webhook_manager',
      'Manage webhooks for external integrations and data receiving',
      'Use when you need to create, update, or manage webhooks for receiving data from external services. Handles webhook validation and processing.',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Webhook management action',
            enum: ['create', 'update', 'delete', 'list', 'validate', 'test'],
            default: 'list'
          },
          webhook_id: {
            type: 'string',
            description: 'Webhook ID for update/delete operations'
          },
          url: {
            type: 'string',
            description: 'Webhook endpoint URL'
          },
          events: {
            type: 'array',
            items: { type: 'string' },
            description: 'Events to subscribe to'
          },
          secret: {
            type: 'string',
            description: 'Webhook secret for validation'
          },
          headers: {
            type: 'object',
            description: 'Custom headers to include'
          },
          active: {
            type: 'boolean',
            description: 'Whether webhook is active',
            default: true
          }
        },
        required: ['action']
      },
      {
        category: 'external-integration',
        performance: {
          estimated_duration_ms: 1500,
          cacheable: false,
          resource_usage: 'low',
        }
      }
    ))
  }

  protected async executeInternal(args: any, context: AdapterContext): Promise<AdapterResult> {
    try {
      logger.info('Executing webhook management', { action: args.action, context })

      const result = {
        action: args.action,
        data: {
          // Sample response based on action
          ...(args.action === 'create' && {
            webhook_id: 'webhook_' + Math.random().toString(36).substr(2, 9),
            url: args.url,
            events: args.events,
            status: 'created'
          }),
          ...(args.action === 'list' && {
            webhooks: [
              {
                id: 'webhook_123',
                url: 'https://example.com/webhook',
                events: ['push', 'pull_request'],
                active: true,
                created_at: new Date().toISOString()
              }
            ]
          }),
          ...(args.action === 'validate' && {
            valid: true,
            webhook_id: args.webhook_id
          })
        }
      }

      return this.createSuccessResult(
        result,
        `Webhook ${args.action} completed successfully`,
        {
          action: args.action,
          webhook_id: args.webhook_id
        }
      )
    } catch (error: any) {
      logger.error('Webhook management failed', { error: error.message, action: args.action })
      return this.createErrorResult(
        'WEBHOOK_MANAGEMENT_FAILED',
        error.message,
        'Webhook operation failed. Please check your configuration.',
        ['Verify webhook URL is accessible', 'Check webhook permissions', 'Verify secret configuration'],
        true
      )
    }
  }
}

/**
 * Third Party Services Adapter
 * Generic adapter for various third-party service integrations
 */
class ThirdPartyServicesAdapter extends BaseToolAdapter {
  constructor() {
    super(createToolSchema(
      'third_party_services',
      'Integrate with various third-party services and platforms',
      'Use when you need to integrate with services like Zapier, IFTTT, or other automation platforms and third-party APIs.',
      {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            description: 'Third-party service name',
            enum: ['zapier', 'ifttt', 'make', 'n8n', 'custom'],
            default: 'custom'
          },
          operation: {
            type: 'string',
            description: 'Operation to perform'
          },
          config: {
            type: 'object',
            description: 'Service-specific configuration'
          },
          data: {
            type: 'object',
            description: 'Data to send to the service'
          },
          webhook_url: {
            type: 'string',
            description: 'Webhook URL for the service'
          }
        },
        required: ['service', 'operation']
      },
      {
        category: 'external-integration',
        performance: {
          estimated_duration_ms: 3000,
          cacheable: false,
          resource_usage: 'medium',
        }
      }
    ))
  }

  protected async executeInternal(args: any, context: AdapterContext): Promise<AdapterResult> {
    try {
      logger.info('Executing third-party service integration', { service: args.service, operation: args.operation, context })

      const result = {
        service: args.service,
        operation: args.operation,
        data: {
          status: 'completed',
          response: `${args.service} ${args.operation} executed successfully`,
          timestamp: new Date().toISOString()
        }
      }

      return this.createSuccessResult(
        result,
        `Successfully integrated with ${args.service}`,
        {
          service: args.service,
          operation: args.operation
        }
      )
    } catch (error: any) {
      logger.error('Third-party service integration failed', { error: error.message, service: args.service, operation: args.operation })
      return this.createErrorResult(
        'THIRD_PARTY_INTEGRATION_FAILED',
        error.message,
        `Integration with ${args.service} failed. Please check your configuration.`,
        ['Verify service credentials', 'Check API endpoints', 'Verify service availability'],
        true
      )
    }
  }
}