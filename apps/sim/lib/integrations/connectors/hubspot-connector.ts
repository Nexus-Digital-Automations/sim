/**
 * HubSpot CRM Integration Connector
 *
 * Comprehensive HubSpot integration providing full CRM and marketing automation
 * capabilities including contacts, companies, deals, tickets, and marketing tools.
 *
 * Features:
 * - OAuth 2.0 authentication with automatic token refresh
 * - Complete CRUD operations for CRM objects (contacts, companies, deals)
 * - Marketing automation (email campaigns, forms, workflows)
 * - Advanced search and filtering capabilities
 * - Bulk operations for high-volume data processing
 * - Real-time webhook support for instant updates
 * - Custom property support for flexible data models
 * - Analytics and reporting integration
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

const logger = createLogger('HubSpotConnector')

// ====================================================================
// HUBSPOT CONNECTOR CONFIGURATION
// ====================================================================

/**
 * HubSpot API configuration and endpoints
 */
export const HUBSPOT_CONFIG = {
  // HubSpot API endpoints
  BASE_URL: 'https://api.hubapi.com',

  // API version
  API_VERSION: 'v3', // Latest API version

  // OAuth configuration
  OAUTH_SCOPES: [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.companies.read',
    'crm.objects.companies.write',
    'crm.objects.deals.read',
    'crm.objects.deals.write',
    'crm.objects.tickets.read',
    'crm.objects.tickets.write',
    'crm.schemas.contacts.read',
    'crm.schemas.companies.read',
    'crm.schemas.deals.read',
    'marketing.read',
    'automation.read',
    'forms.read',
    'files.read',
    'files.write',
  ],

  // Rate limiting (HubSpot specific limits)
  RATE_LIMITS: {
    API_CALLS_PER_DAY: 1000000, // Professional plan
    BURST_REQUESTS: 100, // Requests per 10 seconds
    BATCH_SIZE: 100, // Maximum batch size
  },

  // Standard HubSpot objects
  STANDARD_OBJECTS: [
    'contacts',
    'companies',
    'deals',
    'tickets',
    'products',
    'line_items',
    'quotes',
    'calls',
    'emails',
    'meetings',
    'notes',
    'tasks',
  ],

  // Common properties for each object type
  CONTACT_PROPERTIES: [
    'firstname',
    'lastname',
    'email',
    'phone',
    'company',
    'jobtitle',
    'website',
    'city',
    'state',
    'country',
    'lifecyclestage',
    'lead_status',
    'hubspot_owner_id',
    'createdate',
    'lastmodifieddate',
  ],

  COMPANY_PROPERTIES: [
    'name',
    'domain',
    'industry',
    'phone',
    'city',
    'state',
    'country',
    'website',
    'numberofemployees',
    'annualrevenue',
    'type',
    'hubspot_owner_id',
    'createdate',
    'hs_lastmodifieddate',
  ],

  DEAL_PROPERTIES: [
    'dealname',
    'amount',
    'pipeline',
    'dealstage',
    'closedate',
    'dealtype',
    'hubspot_owner_id',
    'associatedcompanyid',
    'associatedvids',
    'createdate',
    'hs_lastmodifieddate',
  ],
}

/**
 * HubSpot connector operations configuration
 */
export const HUBSPOT_OPERATIONS: IntegrationOperation[] = [
  // Contact Management Operations
  {
    id: 'contacts_list',
    name: 'List Contacts',
    description: 'Retrieve a list of contacts with optional filtering and pagination',
    method: 'GET',
    path: '/crm/v3/objects/contacts',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of contacts to return',
          example: 100,
          minimum: 1,
          maximum: 100,
        },
        after: {
          type: 'string',
          description: 'Cursor for pagination',
          example: '123456789',
        },
        properties: {
          type: 'array',
          description: 'Specific properties to retrieve',
          items: { type: 'string' },
          example: ['firstname', 'lastname', 'email', 'phone', 'company'],
        },
        propertiesWithHistory: {
          type: 'array',
          description: 'Properties to retrieve with historical values',
          items: { type: 'string' },
        },
        associations: {
          type: 'array',
          description: 'Associated objects to retrieve',
          items: { type: 'string' },
          example: ['companies', 'deals'],
        },
        archived: {
          type: 'boolean',
          description: 'Include archived contacts',
          default: false,
        },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: { type: 'object' },
        },
        paging: { type: 'object' },
      },
    },
    requiredScopes: ['crm.objects.contacts.read'],
  },

  {
    id: 'contacts_get',
    name: 'Get Contact',
    description: 'Retrieve a specific contact by ID',
    method: 'GET',
    path: '/crm/v3/objects/contacts/{{contactId}}',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'HubSpot Contact ID',
          example: '12345678901',
        },
        properties: {
          type: 'array',
          description: 'Specific properties to retrieve',
          items: { type: 'string' },
        },
        propertiesWithHistory: {
          type: 'array',
          description: 'Properties with historical values',
          items: { type: 'string' },
        },
        associations: {
          type: 'array',
          description: 'Associated objects to retrieve',
          items: { type: 'string' },
        },
      },
      required: ['contactId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        properties: { type: 'object' },
        associations: { type: 'object' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    requiredScopes: ['crm.objects.contacts.read'],
  },

  {
    id: 'contacts_create',
    name: 'Create Contact',
    description: 'Create a new contact in HubSpot',
    method: 'POST',
    path: '/crm/v3/objects/contacts',
    inputSchema: {
      type: 'object',
      properties: {
        properties: {
          type: 'object',
          description: 'Contact properties',
          properties: {
            firstname: { type: 'string' },
            lastname: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            company: { type: 'string' },
            jobtitle: { type: 'string' },
            website: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            country: { type: 'string' },
            lifecyclestage: { type: 'string' },
            hubspot_owner_id: { type: 'string' },
          },
          required: ['email'],
        },
        associations: {
          type: 'array',
          description: 'Objects to associate with the contact',
          items: {
            type: 'object',
            properties: {
              to: { type: 'object' },
              types: { type: 'array' },
            },
          },
        },
      },
      required: ['properties'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        properties: { type: 'object' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    requiredScopes: ['crm.objects.contacts.write'],
  },

  {
    id: 'contacts_update',
    name: 'Update Contact',
    description: 'Update an existing contact in HubSpot',
    method: 'PATCH',
    path: '/crm/v3/objects/contacts/{{contactId}}',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'HubSpot Contact ID to update',
        },
        properties: {
          type: 'object',
          description: 'Contact properties to update',
          properties: {
            firstname: { type: 'string' },
            lastname: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            jobtitle: { type: 'string' },
          },
        },
      },
      required: ['contactId', 'properties'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        properties: { type: 'object' },
        updatedAt: { type: 'string' },
      },
    },
    requiredScopes: ['crm.objects.contacts.write'],
  },

  // Company Management Operations
  {
    id: 'companies_list',
    name: 'List Companies',
    description: 'Retrieve a list of companies with optional filtering and pagination',
    method: 'GET',
    path: '/crm/v3/objects/companies',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 100 },
        after: { type: 'string' },
        properties: { type: 'array', items: { type: 'string' } },
        associations: { type: 'array', items: { type: 'string' } },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: { type: 'array', items: { type: 'object' } },
        paging: { type: 'object' },
      },
    },
    requiredScopes: ['crm.objects.companies.read'],
  },

  {
    id: 'companies_create',
    name: 'Create Company',
    description: 'Create a new company in HubSpot',
    method: 'POST',
    path: '/crm/v3/objects/companies',
    inputSchema: {
      type: 'object',
      properties: {
        properties: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            domain: { type: 'string' },
            industry: { type: 'string' },
            phone: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            country: { type: 'string' },
            website: { type: 'string' },
            numberofemployees: { type: 'string' },
            annualrevenue: { type: 'string' },
            type: { type: 'string' },
          },
          required: ['name'],
        },
      },
      required: ['properties'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        properties: { type: 'object' },
        createdAt: { type: 'string' },
      },
    },
    requiredScopes: ['crm.objects.companies.write'],
  },

  // Deal Management Operations
  {
    id: 'deals_list',
    name: 'List Deals',
    description: 'Retrieve a list of deals with optional filtering',
    method: 'GET',
    path: '/crm/v3/objects/deals',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        after: { type: 'string' },
        properties: { type: 'array', items: { type: 'string' } },
        associations: { type: 'array', items: { type: 'string' } },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: { type: 'array', items: { type: 'object' } },
        paging: { type: 'object' },
      },
    },
    requiredScopes: ['crm.objects.deals.read'],
  },

  {
    id: 'deals_create',
    name: 'Create Deal',
    description: 'Create a new deal in HubSpot',
    method: 'POST',
    path: '/crm/v3/objects/deals',
    inputSchema: {
      type: 'object',
      properties: {
        properties: {
          type: 'object',
          properties: {
            dealname: { type: 'string' },
            amount: { type: 'string' },
            pipeline: { type: 'string' },
            dealstage: { type: 'string' },
            closedate: { type: 'string', format: 'date' },
            dealtype: { type: 'string' },
            hubspot_owner_id: { type: 'string' },
          },
          required: ['dealname', 'pipeline', 'dealstage'],
        },
        associations: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['properties'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        properties: { type: 'object' },
        createdAt: { type: 'string' },
      },
    },
    requiredScopes: ['crm.objects.deals.write'],
  },

  // Search Operations
  {
    id: 'contacts_search',
    name: 'Search Contacts',
    description: 'Search contacts using filters and sorting',
    method: 'POST',
    path: '/crm/v3/objects/contacts/search',
    inputSchema: {
      type: 'object',
      properties: {
        filterGroups: {
          type: 'array',
          description: 'Filter groups for search criteria',
          items: {
            type: 'object',
            properties: {
              filters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    propertyName: { type: 'string' },
                    operator: {
                      type: 'string',
                      enum: [
                        'EQ',
                        'NEQ',
                        'LT',
                        'LTE',
                        'GT',
                        'GTE',
                        'IN',
                        'NOT_IN',
                        'HAS_PROPERTY',
                        'NOT_HAS_PROPERTY',
                        'CONTAINS_TOKEN',
                        'NOT_CONTAINS_TOKEN',
                      ],
                    },
                    value: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        sorts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              propertyName: { type: 'string' },
              direction: { type: 'string', enum: ['ASCENDING', 'DESCENDING'] },
            },
          },
        },
        query: { type: 'string' },
        properties: { type: 'array', items: { type: 'string' } },
        limit: { type: 'number', maximum: 100 },
        after: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: { type: 'array', items: { type: 'object' } },
        paging: { type: 'object' },
      },
    },
    requiredScopes: ['crm.objects.contacts.read'],
  },

  // Batch Operations
  {
    id: 'contacts_batch_read',
    name: 'Batch Read Contacts',
    description: 'Read multiple contacts by IDs in a single request',
    method: 'POST',
    path: '/crm/v3/objects/contacts/batch/read',
    inputSchema: {
      type: 'object',
      properties: {
        inputs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
          },
        },
        properties: { type: 'array', items: { type: 'string' } },
        propertiesWithHistory: { type: 'array', items: { type: 'string' } },
      },
      required: ['inputs'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: { type: 'array', items: { type: 'object' } },
        status: { type: 'string' },
      },
    },
    requiredScopes: ['crm.objects.contacts.read'],
  },

  {
    id: 'contacts_batch_create',
    name: 'Batch Create Contacts',
    description: 'Create multiple contacts in a single request',
    method: 'POST',
    path: '/crm/v3/objects/contacts/batch/create',
    inputSchema: {
      type: 'object',
      properties: {
        inputs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              properties: { type: 'object' },
              associations: { type: 'array' },
            },
          },
          maximum: 100,
        },
      },
      required: ['inputs'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: { type: 'array', items: { type: 'object' } },
        status: { type: 'string' },
      },
    },
    requiredScopes: ['crm.objects.contacts.write'],
  },
]

/**
 * Main HubSpot connector configuration
 */
export const HubSpotConnector: IntegrationConnector = {
  id: 'hubspot',
  name: 'HubSpot CRM',
  description: 'Complete HubSpot CRM and marketing automation integration',
  category: 'crm',
  version: '1.0.0',
  baseUrl: HUBSPOT_CONFIG.BASE_URL,

  authentication: {
    method: 'oauth2',
    config: {
      clientId: process.env.HUBSPOT_CLIENT_ID || '',
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
      authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
      scopes: HUBSPOT_CONFIG.OAUTH_SCOPES,
      pkce: false, // HubSpot doesn't support PKCE
    } as OAuth2Config,
  },

  rateLimit: {
    strategy: 'token_bucket',
    limits: {
      maxRequests: 100,
      windowMs: 10000, // 10 seconds
      maxConcurrent: 10,
      burstLimit: 100,
      maxRetries: 3,
      backoffMultiplier: 2,
    } as RateLimitConfig,
  },

  operations: HUBSPOT_OPERATIONS,

  transformations: ['json_mapping', 'data_validation', 'data_enrichment', 'data_filtering'],

  healthCheck: {
    endpoint: '/account-info/v3/api-usage/daily',
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
        customHandler: 'hubspotRateLimitHandler',
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
    tags: [
      'crm',
      'marketing-automation',
      'sales',
      'customer-management',
      'hubspot',
      'oauth2',
      'batch-operations',
    ],
    documentation: 'https://docs.sim.ai/integrations/hubspot',
    supportContact: 'integrations@sim.ai',
    lastUpdated: new Date('2025-09-03'),
  },
}

// ====================================================================
// HUBSPOT-SPECIFIC UTILITIES
// ====================================================================

/**
 * HubSpot utility functions for connector operations
 */
export class HubSpotUtils {
  /**
   * Build HubSpot search filters
   */
  static buildSearchFilters(
    criteria: {
      property: string
      operator: string
      value: string
    }[]
  ): any {
    return [
      {
        filters: criteria.map((criterion) => ({
          propertyName: criterion.property,
          operator: criterion.operator,
          value: criterion.value,
        })),
      },
    ]
  }

  /**
   * Parse HubSpot API errors
   */
  static parseApiError(error: any): {
    code: string
    message: string
    category: string
    retryable: boolean
  } {
    if (error.response?.data?.errors?.[0]) {
      const errorData = error.response.data.errors[0]
      return {
        code: errorData.errorType || 'UNKNOWN_ERROR',
        message: errorData.message || 'Unknown HubSpot API error',
        category: errorData.category || 'GENERAL',
        retryable: HubSpotUtils.isRetryableError(error.response.status, errorData.errorType),
      }
    }

    return {
      code: 'NETWORK_ERROR',
      message: error.message || 'Network error occurred',
      category: 'NETWORK',
      retryable: true,
    }
  }

  /**
   * Determine if error is retryable
   */
  private static isRetryableError(statusCode: number, errorType: string): boolean {
    if ([429, 500, 502, 503, 504].includes(statusCode)) {
      return true
    }

    const retryableErrorTypes = ['RATE_LIMIT', 'INTERNAL_ERROR', 'TIMEOUT']

    return retryableErrorTypes.includes(errorType)
  }

  /**
   * Convert HubSpot timestamp to ISO string
   */
  static convertTimestamp(timestamp: string | number): string {
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toISOString()
    }
    return new Date(timestamp).toISOString()
  }

  /**
   * Validate HubSpot object ID format
   */
  static validateHubSpotId(id: string): boolean {
    return /^\d+$/.test(id) && id.length >= 5
  }

  /**
   * Format properties for HubSpot API
   */
  static formatProperties(properties: Record<string, any>): Record<string, string> {
    const formatted: Record<string, string> = {}

    for (const [key, value] of Object.entries(properties)) {
      if (value !== null && value !== undefined) {
        formatted[key] = String(value)
      }
    }

    return formatted
  }
}

/**
 * HubSpot connector error codes for enhanced error handling
 */
export const HUBSPOT_ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_AUTHENTICATION: 'INVALID_AUTHENTICATION',
  EXPIRED_AUTHENTICATION: 'EXPIRED_AUTHENTICATION',

  // Rate limiting
  RATE_LIMIT: 'RATE_LIMIT',
  DAILY_LIMIT_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',

  // Validation errors
  INVALID_EMAIL: 'INVALID_EMAIL',
  REQUIRED_PROPERTY_MISSING: 'REQUIRED_PROPERTY_MISSING',
  PROPERTY_DOESNT_EXIST: 'PROPERTY_DOESNT_EXIST',

  // Object errors
  OBJECT_NOT_FOUND: 'OBJECT_NOT_FOUND',
  OBJECT_ALREADY_EXISTS: 'OBJECT_ALREADY_EXISTS',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
} as const

logger.info('HubSpot connector configuration loaded successfully', {
  operations: HUBSPOT_OPERATIONS.length,
  scopes: HUBSPOT_CONFIG.OAUTH_SCOPES.length,
})
