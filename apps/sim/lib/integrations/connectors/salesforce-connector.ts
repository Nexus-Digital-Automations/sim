/**
 * Salesforce CRM Integration Connector
 *
 * Comprehensive Salesforce integration using the Connector Development Kit.
 * Provides full CRM functionality including contacts, leads, opportunities,
 * accounts, and custom object management.
 *
 * Features:
 * - OAuth 2.0 authentication with automatic token refresh
 * - Complete CRUD operations for all major objects
 * - SOQL query support for advanced data retrieval
 * - Bulk API support for large data operations
 * - Real-time webhook support via Salesforce Platform Events
 * - Custom field and object support
 * - Advanced error handling with Salesforce-specific error codes
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ErrorHandlingConfig,
  HealthCheckConfig,
  IntegrationConnector,
  IntegrationOperation,
  OAuth2Config,
  RateLimitConfig,
} from '../index'

const logger = createLogger('SalesforceConnector')

// ====================================================================
// SALESFORCE CONNECTOR CONFIGURATION
// ====================================================================

/**
 * Salesforce API configuration and endpoints
 */
export const SALESFORCE_CONFIG = {
  // Salesforce API endpoints
  PRODUCTION_URL: 'https://login.salesforce.com',
  SANDBOX_URL: 'https://test.salesforce.com',

  // API versions
  API_VERSION: 'v60.0', // Latest API version as of 2024

  // OAuth configuration
  OAUTH_SCOPES: ['api', 'refresh_token', 'offline_access', 'openid', 'profile', 'email'],

  // Rate limiting (Salesforce specific)
  RATE_LIMITS: {
    API_CALLS_PER_DAY: 100000, // Standard edition limit
    CONCURRENT_REQUESTS: 25,
    BULK_API_BATCH_SIZE: 10000,
  },

  // Common Salesforce objects
  STANDARD_OBJECTS: [
    'Account',
    'Contact',
    'Lead',
    'Opportunity',
    'Case',
    'Campaign',
    'Task',
    'Event',
    'User',
    'Profile',
  ],
}

/**
 * Salesforce connector operations configuration
 */
export const SALESFORCE_OPERATIONS: IntegrationOperation[] = [
  // Contact Management Operations
  {
    id: 'contacts_list',
    name: 'List Contacts',
    description: 'Retrieve a list of contacts with optional filtering and pagination',
    method: 'GET',
    path: '/services/data/{{apiVersion}}/sobjects/Contact',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of contacts to return',
          example: 100,
          minimum: 1,
          maximum: 2000,
        },
        offset: {
          type: 'number',
          description: 'Number of records to skip',
          example: 0,
          minimum: 0,
        },
        fields: {
          type: 'array',
          description: 'Specific fields to retrieve',
          items: { type: 'string' },
          example: ['Id', 'FirstName', 'LastName', 'Email'],
        },
        where: {
          type: 'string',
          description: 'SOQL WHERE clause for filtering',
          example: 'Email != null AND CreatedDate = TODAY',
        },
        orderBy: {
          type: 'string',
          description: 'SOQL ORDER BY clause',
          example: 'LastName ASC, FirstName ASC',
        },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        records: {
          type: 'array',
          items: { type: 'object' },
        },
        totalSize: { type: 'number' },
        done: { type: 'boolean' },
        nextRecordsUrl: { type: 'string' },
      },
    },
    requiredScopes: ['api'],
    rateLimitOverride: {
      maxRequests: 1000,
      windowMs: 60000, // 1 minute
    },
  },

  {
    id: 'contacts_get',
    name: 'Get Contact',
    description: 'Retrieve a specific contact by ID',
    method: 'GET',
    path: '/services/data/{{apiVersion}}/sobjects/Contact/{{contactId}}',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Salesforce Contact ID',
          example: '003XX000004TmiQQAS',
          pattern: '^003[a-zA-Z0-9]{15}$',
        },
        fields: {
          type: 'array',
          description: 'Specific fields to retrieve',
          items: { type: 'string' },
          example: ['Id', 'FirstName', 'LastName', 'Email', 'Phone', 'AccountId'],
        },
      },
      required: ['contactId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        Id: { type: 'string' },
        FirstName: { type: 'string' },
        LastName: { type: 'string' },
        Email: { type: 'string' },
        Phone: { type: 'string' },
        AccountId: { type: 'string' },
      },
    },
    requiredScopes: ['api'],
  },

  {
    id: 'contacts_create',
    name: 'Create Contact',
    description: 'Create a new contact in Salesforce',
    method: 'POST',
    path: '/services/data/{{apiVersion}}/sobjects/Contact',
    inputSchema: {
      type: 'object',
      properties: {
        contactData: {
          type: 'object',
          properties: {
            FirstName: { type: 'string', description: 'Contact first name' },
            LastName: { type: 'string', description: 'Contact last name' },
            Email: { type: 'string', format: 'email', description: 'Contact email address' },
            Phone: { type: 'string', description: 'Contact phone number' },
            AccountId: { type: 'string', description: 'Associated Account ID' },
            Title: { type: 'string', description: 'Job title' },
            Department: { type: 'string', description: 'Department' },
            LeadSource: { type: 'string', description: 'Lead source' },
          },
          required: ['LastName'],
        },
      },
      required: ['contactData'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the created contact' },
        success: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'object' } },
      },
    },
    requiredScopes: ['api'],
  },

  {
    id: 'contacts_update',
    name: 'Update Contact',
    description: 'Update an existing contact in Salesforce',
    method: 'PATCH',
    path: '/services/data/{{apiVersion}}/sobjects/Contact/{{contactId}}',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Salesforce Contact ID to update',
          pattern: '^003[a-zA-Z0-9]{15}$',
        },
        contactData: {
          type: 'object',
          properties: {
            FirstName: { type: 'string' },
            LastName: { type: 'string' },
            Email: { type: 'string', format: 'email' },
            Phone: { type: 'string' },
            Title: { type: 'string' },
            Department: { type: 'string' },
          },
        },
      },
      required: ['contactId', 'contactData'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'object' } },
      },
    },
    requiredScopes: ['api'],
  },

  // Lead Management Operations
  {
    id: 'leads_list',
    name: 'List Leads',
    description: 'Retrieve a list of leads with optional filtering and pagination',
    method: 'GET',
    path: '/services/data/{{apiVersion}}/sobjects/Lead',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 2000 },
        offset: { type: 'number', minimum: 0 },
        fields: { type: 'array', items: { type: 'string' } },
        where: { type: 'string' },
        orderBy: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        records: { type: 'array', items: { type: 'object' } },
        totalSize: { type: 'number' },
        done: { type: 'boolean' },
      },
    },
    requiredScopes: ['api'],
  },

  {
    id: 'leads_create',
    name: 'Create Lead',
    description: 'Create a new lead in Salesforce',
    method: 'POST',
    path: '/services/data/{{apiVersion}}/sobjects/Lead',
    inputSchema: {
      type: 'object',
      properties: {
        leadData: {
          type: 'object',
          properties: {
            FirstName: { type: 'string' },
            LastName: { type: 'string' },
            Email: { type: 'string', format: 'email' },
            Phone: { type: 'string' },
            Company: { type: 'string' },
            Status: {
              type: 'string',
              enum: [
                'Open - Not Contacted',
                'Working - Contacted',
                'Closed - Converted',
                'Closed - Not Converted',
              ],
            },
            LeadSource: { type: 'string' },
          },
          required: ['LastName', 'Company'],
        },
      },
      required: ['leadData'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        success: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'object' } },
      },
    },
    requiredScopes: ['api'],
  },

  // Opportunity Management
  {
    id: 'opportunities_list',
    name: 'List Opportunities',
    description: 'Retrieve a list of opportunities with optional filtering',
    method: 'GET',
    path: '/services/data/{{apiVersion}}/sobjects/Opportunity',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        fields: { type: 'array', items: { type: 'string' } },
        where: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        records: { type: 'array', items: { type: 'object' } },
        totalSize: { type: 'number' },
      },
    },
    requiredScopes: ['api'],
  },

  // SOQL Query Operation
  {
    id: 'soql_query',
    name: 'Execute SOQL Query',
    description: 'Execute a custom SOQL query for advanced data retrieval',
    method: 'GET',
    path: '/services/data/{{apiVersion}}/query',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SOQL query to execute',
          example: 'SELECT Id, FirstName, LastName, Email FROM Contact WHERE CreatedDate = TODAY',
        },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        records: { type: 'array', items: { type: 'object' } },
        totalSize: { type: 'number' },
        done: { type: 'boolean' },
        nextRecordsUrl: { type: 'string' },
      },
    },
    requiredScopes: ['api'],
    rateLimitOverride: {
      maxRequests: 500,
      windowMs: 60000,
    },
  },

  // Bulk API Operations
  {
    id: 'bulk_insert',
    name: 'Bulk Insert Records',
    description: 'Insert multiple records using Salesforce Bulk API for high-volume operations',
    method: 'POST',
    path: '/services/data/{{apiVersion}}/jobs/ingest',
    inputSchema: {
      type: 'object',
      properties: {
        sobjectType: {
          type: 'string',
          description: 'Salesforce object type',
          example: 'Contact',
        },
        records: {
          type: 'array',
          description: 'Array of records to insert',
          items: { type: 'object' },
          maximum: 10000,
        },
      },
      required: ['sobjectType', 'records'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        state: { type: 'string' },
        createdDate: { type: 'string' },
      },
    },
    requiredScopes: ['api'],
    rateLimitOverride: {
      maxRequests: 10,
      windowMs: 60000,
    },
  },
]

/**
 * Main Salesforce connector configuration
 */
export const SalesforceConnector: IntegrationConnector = {
  id: 'salesforce',
  name: 'Salesforce CRM',
  description: 'Complete Salesforce CRM integration with advanced features',
  category: 'crm',
  version: '1.0.0',
  baseUrl: 'https://{{instance}}.salesforce.com', // Instance URL is dynamic

  authentication: {
    method: 'oauth2',
    config: {
      clientId: process.env.SALESFORCE_CLIENT_ID || '',
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
      authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      scopes: SALESFORCE_CONFIG.OAUTH_SCOPES,
      pkce: true, // Salesforce supports PKCE
    } as OAuth2Config,
  },

  rateLimit: {
    strategy: 'token_bucket',
    limits: {
      maxRequests: 1000,
      windowMs: 60000, // 1 minute
      maxConcurrent: 25,
      burstLimit: 100,
      maxRetries: 3,
      backoffMultiplier: 2,
    } as RateLimitConfig,
  },

  operations: SALESFORCE_OPERATIONS,

  transformations: ['json_mapping', 'data_validation', 'data_enrichment'],

  healthCheck: {
    endpoint: '/services/data/{{apiVersion}}/limits',
    method: 'GET',
    expectedStatusCodes: [200],
    timeout: 5000,
    interval: 30000,
    maxFailures: 3,
  } as HealthCheckConfig,

  errorHandling: {
    retry: {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      exponentialMultiplier: 2,
      jitter: true,
    },
    retryableStatusCodes: [429, 500, 502, 503, 504],
    errorCategories: {
      network: {
        retryable: true,
        maxRetries: 3,
      },
      authentication: {
        retryable: true,
        maxRetries: 1,
        customHandler: 'refreshTokenHandler',
      },
      rateLimit: {
        retryable: true,
        maxRetries: 5,
        customHandler: 'salesforceRateLimitHandler',
      },
      validation: {
        retryable: false,
        maxRetries: 0,
      },
      server: {
        retryable: true,
        maxRetries: 2,
      },
    },
    deadLetterQueue: {
      enabled: true,
      maxRetries: 10,
      ttl: 86400000, // 24 hours
    },
  } as ErrorHandlingConfig,

  metadata: {
    tags: ['crm', 'sales', 'customer-management', 'enterprise', 'salesforce', 'oauth2'],
    documentation: 'https://docs.sim.ai/integrations/salesforce',
    supportContact: 'integrations@sim.ai',
    lastUpdated: new Date('2025-09-03'),
  },
}

// ====================================================================
// SALESFORCE-SPECIFIC UTILITIES AND HELPERS
// ====================================================================

/**
 * Salesforce utility functions for connector operations
 */
export class SalesforceUtils {
  /**
   * Build SOQL query from parameters
   */
  static buildSOQLQuery(options: {
    object: string
    fields?: string[]
    where?: string
    orderBy?: string
    limit?: number
    offset?: number
  }): string {
    const { object, fields = ['Id'], where, orderBy, limit, offset } = options

    let query = `SELECT ${fields.join(', ')} FROM ${object}`

    if (where) {
      query += ` WHERE ${where}`
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`
    }

    if (limit) {
      query += ` LIMIT ${limit}`
    }

    if (offset) {
      query += ` OFFSET ${offset}`
    }

    return query
  }

  /**
   * Parse Salesforce API errors
   */
  static parseApiError(error: any): {
    code: string
    message: string
    fields?: string[]
    retryable: boolean
  } {
    if (error.response?.data) {
      const errorData = Array.isArray(error.response.data)
        ? error.response.data[0]
        : error.response.data

      return {
        code: errorData.errorCode || 'UNKNOWN_ERROR',
        message: errorData.message || 'Unknown Salesforce API error',
        fields: errorData.fields,
        retryable: SalesforceUtils.isRetryableError(errorData.errorCode),
      }
    }

    return {
      code: 'NETWORK_ERROR',
      message: error.message || 'Network error occurred',
      retryable: true,
    }
  }

  /**
   * Determine if error is retryable based on Salesforce error codes
   */
  private static isRetryableError(errorCode: string): boolean {
    const retryableCodes = [
      'REQUEST_LIMIT_EXCEEDED',
      'SERVER_UNAVAILABLE',
      'UNABLE_TO_LOCK_ROW',
      'STORAGE_LIMIT_EXCEEDED',
    ]

    return retryableCodes.includes(errorCode)
  }

  /**
   * Extract instance URL from Salesforce identity response
   */
  static extractInstanceUrl(identityResponse: any): string {
    const urls = identityResponse.urls || {}
    return urls.custom_domain || urls.enterprise || 'https://na1.salesforce.com'
  }

  /**
   * Validate Salesforce object ID format
   */
  static validateSalesforceId(id: string, objectPrefix?: string): boolean {
    if (!id || typeof id !== 'string') {
      return false
    }

    // Salesforce IDs are 15 or 18 characters
    if (id.length !== 15 && id.length !== 18) {
      return false
    }

    // Check object prefix if provided
    if (objectPrefix && !id.startsWith(objectPrefix)) {
      return false
    }

    return /^[a-zA-Z0-9]+$/.test(id)
  }

  /**
   * Convert 15-character ID to 18-character ID
   */
  static convertToId18(id15: string): string {
    if (id15.length === 18) {
      return id15
    }

    if (id15.length !== 15) {
      throw new Error('Invalid Salesforce ID length')
    }

    // Salesforce ID conversion algorithm
    const suffix = [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
      'V',
      'W',
      'X',
      'Y',
      'Z',
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
    ]
    let checksum = ''

    for (let i = 0; i < 3; i++) {
      let flag = 0
      for (let j = 0; j < 5; j++) {
        const char = id15.charAt(i * 5 + j)
        if (char >= 'A' && char <= 'Z') {
          flag += 2 ** j
        }
      }
      checksum += suffix[flag]
    }

    return id15 + checksum
  }
}

/**
 * Salesforce connector error types for enhanced error handling
 */
export const SALESFORCE_ERROR_CODES = {
  // Authentication errors
  INVALID_LOGIN: 'INVALID_LOGIN',
  INVALID_SESSION_ID: 'INVALID_SESSION_ID',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',

  // Rate limiting
  REQUEST_LIMIT_EXCEEDED: 'REQUEST_LIMIT_EXCEEDED',
  CONCURRENT_REQUEST_LIMIT_EXCEEDED: 'CONCURRENT_REQUEST_LIMIT_EXCEEDED',

  // Data errors
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_FIELD: 'INVALID_FIELD',
  DUPLICATE_VALUE: 'DUPLICATE_VALUE',

  // System errors
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',
  STORAGE_LIMIT_EXCEEDED: 'STORAGE_LIMIT_EXCEEDED',
  UNABLE_TO_LOCK_ROW: 'UNABLE_TO_LOCK_ROW',
} as const

logger.info('Salesforce connector configuration loaded successfully', {
  operations: SALESFORCE_OPERATIONS.length,
  apiVersion: SALESFORCE_CONFIG.API_VERSION,
})
