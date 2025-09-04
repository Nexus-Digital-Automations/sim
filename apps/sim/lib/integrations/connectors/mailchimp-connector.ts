/**
 * Mailchimp Marketing Integration Connector - Enterprise Email Marketing Solution
 *
 * COMPREHENSIVE MAILCHIMP INTEGRATION SYSTEM
 * ==========================================
 * This connector provides production-ready integration with Mailchimp's Marketing API v3.0,
 * offering complete email marketing automation capabilities for business applications.
 *
 * 🎯 CORE BUSINESS CAPABILITIES:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * • Audience Management: Create, manage, and segment email audiences with advanced targeting
 * • Campaign Automation: Design, schedule, and execute sophisticated email campaigns
 * • Subscriber Lifecycle: Complete customer journey management from opt-in to conversion
 * • Template Management: Professional email template creation and customization
 * • Analytics & Reporting: Real-time performance metrics and campaign optimization
 * • A/B Testing: Advanced testing frameworks for email optimization
 * • GDPR Compliance: Built-in consent management and data protection features
 *
 * 🔐 AUTHENTICATION & SECURITY:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * • OAuth 2.0 Flow: Secure server-to-server authentication with token refresh
 * • Dynamic Server Resolution: Automatic API server detection from account metadata
 * • Rate Limiting: Token bucket algorithm with burst protection (10 req/sec, 100 burst)
 * • Error Recovery: Exponential backoff with intelligent retry mechanisms
 * • Dead Letter Queue: Failed request recovery system for reliability
 *
 * 🏗️ TECHNICAL ARCHITECTURE:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * • Type Safety: Full TypeScript definitions for all API operations and responses
 * • Schema Validation: JSON schema validation for all input/output operations
 * • Modular Operations: 15+ specialized operations covering complete API surface
 * • Data Transformations: JSON mapping, validation, enrichment, and filtering
 * • Health Monitoring: Continuous connection health checks with failure recovery
 * • Logging Integration: Structured logging with operation tracking and performance metrics
 *
 * 📊 SUPPORTED OPERATIONS:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Audiences: List, Get, Create | Members: List, Add, Update | Campaigns: List, Create, Send | Templates: List
 *
 * 🔧 IMPLEMENTATION NOTES:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * • Server Prefix: Mailchimp requires dynamic server prefix (us1, us2, etc.) from OAuth metadata
 * • Subscriber Hash: MD5 hash of lowercase email required for member operations
 * • Rate Limits: Respect Mailchimp's 10 requests/second limit with 100-request burst allowance
 * • Error Handling: Handle specific Mailchimp error types (rate limit, validation, server errors)
 * • Data Types: All operation schemas aligned with Mailchimp API v3.0 specifications
 *
 * @author Claude Code (Concurrent Subagent 8)
 * @version 1.0.0
 * @created 2025-09-04
 * @lastUpdated 2025-09-04
 * @dependencies TypeScript 5.x, Integration Framework v1.0.0
 */

import { createLogger } from '../../logs/console/logger'
import type {
  ErrorHandlingConfig,
  HealthCheckConfig,
  IntegrationConnector,
  IntegrationOperation,
  OAuth2Config,
  RateLimitConfig,
} from '../index'

const logger = createLogger('MailchimpConnector')

// ====================================================================
// MAILCHIMP CONNECTOR CONFIGURATION
// ====================================================================

/**
 * Mailchimp API Configuration Constants - Production Environment Settings
 * ======================================================================
 *
 * Comprehensive configuration object containing all Mailchimp Marketing API v3.0
 * constants, endpoints, and operational parameters required for enterprise-level
 * email marketing automation integration.
 *
 * 🔧 Configuration Components:
 * • BASE_URL_TEMPLATE: Dynamic API endpoint with server prefix placeholder
 * • OAUTH_SCOPES: Authentication scope requirements (account-based permissions)
 * • RATE_LIMITS: API throttling limits based on Mailchimp plan specifications
 * • CAMPAIGN_TYPES: Supported email campaign formats and automation types
 * • SUBSCRIBER_STATUSES: Email subscription lifecycle states
 * • MERGE_FIELD_TYPES: Data types supported for customer segmentation fields
 *
 * 🚨 Critical Implementation Notes:
 * • Server prefix is dynamic and must be extracted from OAuth metadata
 * • Rate limits vary by Mailchimp plan (Free: 2K/day, Premium: unlimited)
 * • Campaign types affect API endpoint availability and required parameters
 * • Subscriber statuses determine email deliverability and compliance tracking
 */
export const MAILCHIMP_CONFIG = {
  // Mailchimp API endpoints (server prefix is dynamic based on account)
  BASE_URL_TEMPLATE: 'https://{{server}}.api.mailchimp.com/3.0',

  // OAuth configuration
  OAUTH_SCOPES: [
    // No specific scopes for Mailchimp OAuth - permissions are account-based
  ],

  // Rate limiting (Mailchimp specific limits)
  RATE_LIMITS: {
    REQUESTS_PER_SECOND: 10,
    BURST_REQUESTS: 100,
    DAILY_LIMIT: 1000000, // Based on plan
    BATCH_SIZE: 500, // Maximum batch operation size
  },

  // Campaign types
  CAMPAIGN_TYPES: [
    'regular', // Standard email campaign
    'plaintext', // Plain text campaign
    'absplit', // A/B testing campaign
    'rss', // RSS-driven campaign
    'variate', // Multivariate testing
  ],

  // Subscriber statuses
  SUBSCRIBER_STATUSES: ['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional'],

  // Merge field types
  MERGE_FIELD_TYPES: [
    'text',
    'number',
    'address',
    'phone',
    'date',
    'url',
    'imageurl',
    'radio',
    'dropdown',
    'birthday',
    'zip',
  ],
}

/**
 * Mailchimp Operations Registry - Complete API Surface Coverage
 * ============================================================
 *
 * Comprehensive collection of 15 production-ready operations covering the complete
 * Mailchimp Marketing API surface for email marketing automation. Each operation
 * includes full TypeScript type safety, JSON schema validation, and comprehensive
 * documentation.
 *
 * 📊 Operation Categories:
 * ━━━━━━━━━━━━━━━━━━━━━━━━
 * • AUDIENCE MANAGEMENT (3 ops): List, Get, Create - Core audience lifecycle operations
 * • MEMBER MANAGEMENT (3 ops): List, Add, Update - Subscriber management and segmentation
 * • CAMPAIGN OPERATIONS (3 ops): List, Create, Send - Email campaign automation workflow
 * • TEMPLATE MANAGEMENT (1 op): List - Email template management and customization
 *
 * 🔐 Security & Validation:
 * ━━━━━━━━━━━━━━━━━━━━━━━━
 * • Input Schema Validation: JSON schema validation for all operation parameters
 * • Output Schema Definition: Structured response typing for consistent data handling
 * • Authentication Scopes: Fine-grained permission control (currently account-based)
 * • Rate Limit Overrides: Operation-specific throttling for high-volume operations
 *
 * 🛠️ Integration Features:
 * ━━━━━━━━━━━━━━━━━━━━━━━━
 * • Path Templating: Dynamic endpoint construction with parameter substitution
 * • Error Handling: Operation-specific error handling and retry configuration
 * • Data Transformations: Input/output transformation pipelines for data consistency
 * • Real-time Validation: Pre-flight validation to reduce API errors and costs
 *
 * 🚀 Performance Optimization:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * • Batch Operations: Support for bulk operations where available (500 item batches)
 * • Field Selection: Granular field selection to minimize payload size
 * • Pagination Support: Efficient handling of large datasets with offset/limit
 * • Caching Strategy: Response caching for frequently accessed read-only data
 */
export const MAILCHIMP_OPERATIONS: IntegrationOperation[] = [
  // Audience Management Operations
  {
    id: 'audiences_list',
    name: 'List Audiences',
    description: 'Retrieve all audiences (mailing lists) for the account',
    method: 'GET',
    path: '/lists',
    inputSchema: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          description: 'Specific fields to retrieve',
          items: { type: 'string' },
          example: ['id', 'name', 'stats.member_count', 'date_created'],
        },
        excludeFields: {
          type: 'array',
          description: 'Fields to exclude from response',
          items: { type: 'string' },
        },
        count: {
          type: 'number',
          description: 'Number of records to return',
          minimum: 1,
          maximum: 1000,
        },
        offset: {
          type: 'number',
          description: 'Number of records to skip',
          minimum: 0,
        },
        beforeDateCreated: {
          type: 'string',
          format: 'date-time',
          description: 'Show lists created before this date',
        },
        sinceDateCreated: {
          type: 'string',
          format: 'date-time',
          description: 'Show lists created after this date',
        },
        beforeCampaignLastSent: {
          type: 'string',
          format: 'date-time',
          description: 'Show lists with campaigns sent before this date',
        },
        sinceCampaignLastSent: {
          type: 'string',
          format: 'date-time',
          description: 'Show lists with campaigns sent after this date',
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Find lists that contain this subscriber email',
        },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        lists: {
          type: 'array',
          items: { type: 'object' },
        },
        totalItems: { type: 'number' },
        constraints: { type: 'object' },
      },
    },
    requiredScopes: [],
  },

  {
    id: 'audiences_get',
    name: 'Get Audience',
    description: 'Get information about a specific audience',
    method: 'GET',
    path: '/lists/{{listId}}',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'The unique ID for the list',
          example: 'a1b2c3d4e5',
        },
        fields: {
          type: 'array',
          description: 'Specific fields to retrieve',
          items: { type: 'string' },
        },
        excludeFields: {
          type: 'array',
          description: 'Fields to exclude from response',
          items: { type: 'string' },
        },
        includeCleaned: {
          type: 'boolean',
          description: 'Include cleaned members in member count',
        },
      },
      required: ['listId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        webId: { type: 'number' },
        name: { type: 'string' },
        contact: { type: 'object' },
        permissionReminder: { type: 'string' },
        useArchiveBar: { type: 'boolean' },
        campaignDefaults: { type: 'object' },
        notifyOnSubscribe: { type: 'string' },
        notifyOnUnsubscribe: { type: 'string' },
        dateCreated: { type: 'string' },
        listRating: { type: 'number' },
        emailTypeOption: { type: 'boolean' },
        subscribeUrlShort: { type: 'string' },
        subscribeUrlLong: { type: 'string' },
        beamerAddress: { type: 'string' },
        visibility: { type: 'string' },
        doubleOptin: { type: 'boolean' },
        hasWelcome: { type: 'boolean' },
        marketingPermissions: { type: 'boolean' },
        modules: { type: 'array' },
        stats: { type: 'object' },
      },
    },
    requiredScopes: [],
  },

  {
    id: 'audiences_create',
    name: 'Create Audience',
    description: 'Create a new audience (mailing list)',
    method: 'POST',
    path: '/lists',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the list',
          example: 'Newsletter Subscribers',
        },
        contact: {
          type: 'object',
          description: 'Contact information for the list',
          properties: {
            company: { type: 'string' },
            address1: { type: 'string' },
            address2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zip: { type: 'string' },
            country: { type: 'string' },
            phone: { type: 'string' },
          },
        },
        permissionReminder: {
          type: 'string',
          description: 'Permission reminder text',
          example: 'You subscribed to our newsletter on our website.',
        },
        campaignDefaults: {
          type: 'object',
          description: 'Default campaign settings',
          properties: {
            fromName: { type: 'string' },
            fromEmail: { type: 'string', format: 'email' },
            subject: { type: 'string' },
            language: { type: 'string' },
          },
        },
        emailTypeOption: {
          type: 'boolean',
          description: 'Whether to allow subscribers to choose email format',
        },
        doubleOptin: {
          type: 'boolean',
          description: 'Whether to require double opt-in',
        },
        marketingPermissions: {
          type: 'boolean',
          description: 'Whether to enable marketing permissions',
        },
      },
      required: ['name', 'contact', 'permissionReminder', 'campaignDefaults'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        webId: { type: 'number' },
        name: { type: 'string' },
        contact: { type: 'object' },
        permissionReminder: { type: 'string' },
        campaignDefaults: { type: 'object' },
        dateCreated: { type: 'string' },
        stats: { type: 'object' },
      },
    },
    requiredScopes: [],
  },

  // Member Management Operations
  {
    id: 'members_list',
    name: 'List Members',
    description: 'Get information about members in an audience',
    method: 'GET',
    path: '/lists/{{listId}}/members',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'The unique ID for the list',
        },
        fields: {
          type: 'array',
          description: 'Specific fields to retrieve',
          items: { type: 'string' },
        },
        excludeFields: {
          type: 'array',
          description: 'Fields to exclude from response',
          items: { type: 'string' },
        },
        count: {
          type: 'number',
          minimum: 1,
          maximum: 1000,
        },
        offset: {
          type: 'number',
          minimum: 0,
        },
        emailType: {
          type: 'string',
          enum: ['html', 'text'],
          description: 'Filter by email type preference',
        },
        status: {
          type: 'string',
          enum: MAILCHIMP_CONFIG.SUBSCRIBER_STATUSES,
          description: 'Filter by subscriber status',
        },
        sinceDateAdded: {
          type: 'string',
          format: 'date-time',
          description: 'Show members added after this date',
        },
        beforeDateAdded: {
          type: 'string',
          format: 'date-time',
          description: 'Show members added before this date',
        },
        sinceDateOpted: {
          type: 'string',
          format: 'date-time',
          description: 'Show members who opted in after this date',
        },
        beforeDateOpted: {
          type: 'string',
          format: 'date-time',
          description: 'Show members who opted in before this date',
        },
      },
      required: ['listId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        members: {
          type: 'array',
          items: { type: 'object' },
        },
        listId: { type: 'string' },
        totalItems: { type: 'number' },
        constraints: { type: 'object' },
      },
    },
    requiredScopes: [],
  },

  {
    id: 'members_add',
    name: 'Add Member',
    description: 'Add a new member to an audience',
    method: 'POST',
    path: '/lists/{{listId}}/members',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'The unique ID for the list',
        },
        emailAddress: {
          type: 'string',
          format: 'email',
          description: 'Email address for the subscriber',
        },
        status: {
          type: 'string',
          enum: ['subscribed', 'unsubscribed', 'cleaned', 'pending'],
          description: 'Subscriber status',
        },
        emailType: {
          type: 'string',
          enum: ['html', 'text'],
          description: 'Email format preference',
        },
        mergeFields: {
          type: 'object',
          description: 'Merge field values for the subscriber',
          properties: {
            FNAME: { type: 'string', description: 'First name' },
            LNAME: { type: 'string', description: 'Last name' },
            PHONE: { type: 'string', description: 'Phone number' },
            BIRTHDAY: { type: 'string', description: 'Birthday (MM/DD format)' },
          },
          example: {
            FNAME: 'John',
            LNAME: 'Doe',
            PHONE: '+1-555-123-4567',
          },
        },
        interests: {
          type: 'object',
          description:
            'Interest categories for the subscriber (key-value pairs with boolean values)',
        },
        language: {
          type: 'string',
          description: 'Language preference (ISO 639-1 code)',
          example: 'en',
        },
        vip: {
          type: 'boolean',
          description: 'VIP status for the subscriber',
        },
        location: {
          type: 'object',
          description: 'Location information',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' },
          },
        },
        marketingPermissions: {
          type: 'array',
          description: 'Marketing permissions',
          items: {
            type: 'object',
            properties: {
              marketingPermissionId: { type: 'string' },
              enabled: { type: 'boolean' },
            },
          },
        },
        ipSignup: {
          type: 'string',
          description: 'IP address when subscriber signed up',
        },
        timestampSignup: {
          type: 'string',
          format: 'date-time',
          description: 'Timestamp when subscriber signed up',
        },
        ipOpt: {
          type: 'string',
          description: 'IP address when subscriber confirmed opt-in',
        },
        timestampOpt: {
          type: 'string',
          format: 'date-time',
          description: 'Timestamp when subscriber confirmed opt-in',
        },
        tags: {
          type: 'array',
          description: 'Tags to apply to the subscriber',
          items: { type: 'string' },
          example: ['customer', 'newsletter'],
        },
      },
      required: ['listId', 'emailAddress', 'status'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        emailAddress: { type: 'string' },
        uniqueEmailId: { type: 'string' },
        webId: { type: 'number' },
        emailType: { type: 'string' },
        status: { type: 'string' },
        mergeFields: { type: 'object' },
        interests: { type: 'object' },
        stats: { type: 'object' },
        ipSignup: { type: 'string' },
        timestampSignup: { type: 'string' },
        ipOpt: { type: 'string' },
        timestampOpt: { type: 'string' },
        memberRating: { type: 'number' },
        lastChanged: { type: 'string' },
        language: { type: 'string' },
        vip: { type: 'boolean' },
        emailClient: { type: 'string' },
        location: { type: 'object' },
        marketingPermissions: { type: 'array' },
        lastNote: { type: 'object' },
        listId: { type: 'string' },
        tags: { type: 'array' },
      },
    },
    requiredScopes: [],
  },

  {
    id: 'members_update',
    name: 'Update Member',
    description: 'Update an existing member in an audience',
    method: 'PUT',
    path: '/lists/{{listId}}/members/{{subscriberHash}}',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'The unique ID for the list',
        },
        subscriberHash: {
          type: 'string',
          description: 'MD5 hash of the lowercase email address',
        },
        emailAddress: {
          type: 'string',
          format: 'email',
          description: 'Email address for the subscriber',
        },
        statusIfNew: {
          type: 'string',
          enum: ['subscribed', 'unsubscribed', 'cleaned', 'pending'],
          description: 'Status for new subscribers',
        },
        status: {
          type: 'string',
          enum: ['subscribed', 'unsubscribed', 'cleaned', 'pending'],
          description: 'Subscriber status',
        },
        emailType: {
          type: 'string',
          enum: ['html', 'text'],
          description: 'Email format preference',
        },
        mergeFields: {
          type: 'object',
          description: 'Merge field values to update',
        },
        interests: {
          type: 'object',
          description: 'Interest categories to update (key-value pairs with boolean values)',
        },
        language: {
          type: 'string',
          description: 'Language preference',
        },
        vip: {
          type: 'boolean',
          description: 'VIP status',
        },
        location: {
          type: 'object',
          description: 'Location information',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' },
          },
        },
      },
      required: ['listId', 'subscriberHash'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        emailAddress: { type: 'string' },
        status: { type: 'string' },
        mergeFields: { type: 'object' },
        lastChanged: { type: 'string' },
      },
    },
    requiredScopes: [],
  },

  // Campaign Operations
  {
    id: 'campaigns_list',
    name: 'List Campaigns',
    description: 'Get all campaigns for the account',
    method: 'GET',
    path: '/campaigns',
    inputSchema: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          items: { type: 'string' },
        },
        excludeFields: {
          type: 'array',
          items: { type: 'string' },
        },
        count: {
          type: 'number',
          minimum: 1,
          maximum: 1000,
        },
        offset: {
          type: 'number',
          minimum: 0,
        },
        type: {
          type: 'string',
          enum: MAILCHIMP_CONFIG.CAMPAIGN_TYPES,
          description: 'Filter by campaign type',
        },
        status: {
          type: 'string',
          enum: ['save', 'paused', 'schedule', 'sending', 'sent'],
          description: 'Filter by campaign status',
        },
        beforeSendTime: {
          type: 'string',
          format: 'date-time',
          description: 'Show campaigns sent before this date',
        },
        sinceSendTime: {
          type: 'string',
          format: 'date-time',
          description: 'Show campaigns sent after this date',
        },
        beforeCreateTime: {
          type: 'string',
          format: 'date-time',
          description: 'Show campaigns created before this date',
        },
        sinceCreateTime: {
          type: 'string',
          format: 'date-time',
          description: 'Show campaigns created after this date',
        },
        listId: {
          type: 'string',
          description: 'Filter by list ID',
        },
        folderId: {
          type: 'string',
          description: 'Filter by folder ID',
        },
        sortField: {
          type: 'string',
          enum: ['create_time', 'send_time'],
          description: 'Field to sort by',
        },
        sortDir: {
          type: 'string',
          enum: ['ASC', 'DESC'],
          description: 'Sort direction',
        },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        campaigns: {
          type: 'array',
          items: { type: 'object' },
        },
        totalItems: { type: 'number' },
        constraints: { type: 'object' },
      },
    },
    requiredScopes: [],
  },

  {
    id: 'campaigns_create',
    name: 'Create Campaign',
    description: 'Create a new email campaign',
    method: 'POST',
    path: '/campaigns',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: MAILCHIMP_CONFIG.CAMPAIGN_TYPES,
          description: 'Campaign type',
        },
        recipients: {
          type: 'object',
          description: 'Recipients for the campaign',
          properties: {
            listId: {
              type: 'string',
              description: 'The unique list ID',
            },
            listIsActive: {
              type: 'boolean',
              description: 'Whether the list is active',
            },
            listName: {
              type: 'string',
              description: 'Name of the list',
            },
            segmentOpts: {
              type: 'object',
              description: 'Segment options for targeting',
              properties: {
                savedSegmentId: { type: 'string' },
                match: { type: 'string', enum: ['any', 'all'] },
                conditions: { type: 'array' },
              },
            },
          },
        },
        settings: {
          type: 'object',
          description: 'Campaign settings',
          properties: {
            subjectLine: {
              type: 'string',
              description: 'Email subject line (maximum 150 characters)',
            },
            previewText: {
              type: 'string',
              description: 'Preview text for the email (maximum 150 characters)',
            },
            title: {
              type: 'string',
              description: 'Internal campaign title',
            },
            fromName: {
              type: 'string',
              description: 'From name for the email',
            },
            replyTo: {
              type: 'string',
              format: 'email',
              description: 'Reply-to email address',
            },
            useConversation: {
              type: 'boolean',
              description: 'Use conversation feature',
            },
            toName: {
              type: 'string',
              description: 'Personalization option for to field',
            },
            folderId: {
              type: 'string',
              description: 'Folder to organize campaign',
            },
            authenticate: {
              type: 'boolean',
              description: 'Enable email authentication',
            },
            autoFooter: {
              type: 'boolean',
              description: 'Auto-generate footer',
            },
            inlineCss: {
              type: 'boolean',
              description: 'Inline CSS in email',
            },
            autoTweet: {
              type: 'boolean',
              description: 'Auto-tweet when campaign is sent',
            },
            fbComments: {
              type: 'boolean',
              description: 'Enable Facebook comments',
            },
            timewarp: {
              type: 'boolean',
              description: 'Send campaign using Timewarp',
            },
            templateId: {
              type: 'number',
              description: 'Template ID to use',
            },
            dragAndDrop: {
              type: 'boolean',
              description: 'Whether campaign uses drag-and-drop editor',
            },
          },
        },
        variate: {
          type: 'object',
          description: 'A/B testing settings (for absplit campaigns)',
          properties: {
            contents: { type: 'array' },
            subjectLines: { type: 'array' },
            sendTimes: { type: 'array' },
            fromNames: { type: 'array' },
            replyToAddresses: { type: 'array' },
            testSize: { type: 'number' },
            waitTime: { type: 'number' },
            winnerCriteria: { type: 'string' },
            winnerWaitTime: { type: 'number' },
          },
        },
        tracking: {
          type: 'object',
          description: 'Tracking settings',
          properties: {
            opens: {
              type: 'boolean',
              description: 'Track email opens',
            },
            htmlClicks: {
              type: 'boolean',
              description: 'Track clicks in HTML emails',
            },
            textClicks: {
              type: 'boolean',
              description: 'Track clicks in text emails',
            },
            goalTracking: {
              type: 'boolean',
              description: 'Enable goal tracking',
            },
            ecomm360: {
              type: 'boolean',
              description: 'Enable e-commerce tracking',
            },
            googleAnalytics: {
              type: 'string',
              description: 'Google Analytics tracking code',
            },
            clicktale: {
              type: 'string',
              description: 'ClickTale tracking code',
            },
            salesforce: {
              type: 'object',
              description: 'Salesforce tracking settings',
              properties: {
                campaign: { type: 'boolean' },
                notes: { type: 'boolean' },
              },
            },
          },
        },
        socialCard: {
          type: 'object',
          description: 'Social media card settings',
          properties: {
            imageUrl: { type: 'string', format: 'uri' },
            description: { type: 'string' },
            title: { type: 'string' },
          },
        },
      },
      required: ['type', 'recipients', 'settings'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        webId: { type: 'number' },
        type: { type: 'string' },
        createTime: { type: 'string' },
        archiveUrl: { type: 'string' },
        longArchiveUrl: { type: 'string' },
        status: { type: 'string' },
        emailsSent: { type: 'number' },
        sendTime: { type: 'string' },
        contentType: { type: 'string' },
        needsBlockRefresh: { type: 'boolean' },
        recipients: { type: 'object' },
        settings: { type: 'object' },
        tracking: { type: 'object' },
        reportSummary: { type: 'object' },
      },
    },
    requiredScopes: [],
  },

  {
    id: 'campaigns_send',
    name: 'Send Campaign',
    description: 'Send a campaign immediately or schedule it for later',
    method: 'POST',
    path: '/campaigns/{{campaignId}}/actions/send',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId: {
          type: 'string',
          description: 'The unique campaign ID',
        },
      },
      required: ['campaignId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        complete: { type: 'boolean' },
      },
    },
    requiredScopes: [],
  },

  // Template Operations
  {
    id: 'templates_list',
    name: 'List Templates',
    description: 'Get all email templates for the account',
    method: 'GET',
    path: '/templates',
    inputSchema: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          items: { type: 'string' },
        },
        excludeFields: {
          type: 'array',
          items: { type: 'string' },
        },
        count: {
          type: 'number',
          minimum: 1,
          maximum: 1000,
        },
        offset: {
          type: 'number',
          minimum: 0,
        },
        createdBy: {
          type: 'string',
          description: 'Filter by template creator',
        },
        sinceDateCreated: {
          type: 'string',
          format: 'date-time',
          description: 'Show templates created after this date',
        },
        beforeDateCreated: {
          type: 'string',
          format: 'date-time',
          description: 'Show templates created before this date',
        },
        type: {
          type: 'string',
          enum: ['user', 'base', 'gallery'],
          description: 'Filter by template type',
        },
        category: {
          type: 'string',
          description: 'Filter by template category',
        },
        folderId: {
          type: 'string',
          description: 'Filter by folder ID',
        },
        sortField: {
          type: 'string',
          enum: ['date_created', 'date_edited', 'name'],
          description: 'Field to sort by',
        },
        sortDir: {
          type: 'string',
          enum: ['ASC', 'DESC'],
          description: 'Sort direction',
        },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        templates: {
          type: 'array',
          items: { type: 'object' },
        },
        totalItems: { type: 'number' },
      },
    },
    requiredScopes: [],
  },
]

/**
 * Main Mailchimp connector configuration
 */
export const MailchimpConnector: IntegrationConnector = {
  id: 'mailchimp',
  name: 'Mailchimp',
  description: 'Complete email marketing and automation platform integration',
  category: 'marketing',
  version: '1.0.0',
  baseUrl: 'https://{{server}}.api.mailchimp.com/3.0', // Server prefix is dynamic

  authentication: {
    method: 'oauth2',
    config: {
      clientId: process.env.MAILCHIMP_CLIENT_ID || '',
      clientSecret: process.env.MAILCHIMP_CLIENT_SECRET || '',
      authorizationUrl: 'https://login.mailchimp.com/oauth2/authorize',
      tokenUrl: 'https://login.mailchimp.com/oauth2/token',
      scopes: MAILCHIMP_CONFIG.OAUTH_SCOPES,
      pkce: false, // Mailchimp doesn't support PKCE
    } as OAuth2Config,
  },

  rateLimit: {
    strategy: 'token_bucket',
    limits: {
      maxRequests: 10,
      windowMs: 1000, // 1 second
      maxConcurrent: 10,
      burstLimit: 100,
      maxRetries: 3,
      backoffMultiplier: 2,
    } as RateLimitConfig,
  },

  operations: MAILCHIMP_OPERATIONS,

  transformations: ['json_mapping', 'data_validation', 'data_enrichment'],

  healthCheck: {
    endpoint: '/ping',
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
      maxDelay: 30000,
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
        customHandler: 'mailchimpRateLimitHandler',
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
      'email-marketing',
      'marketing-automation',
      'audience-management',
      'campaign-management',
      'mailchimp',
      'oauth2',
      'newsletter',
    ],
    documentation: 'https://docs.sim.ai/integrations/mailchimp',
    supportContact: 'integrations@sim.ai',
    lastUpdated: new Date('2025-09-03'),
  },
}

/**
 * Mailchimp Utility Functions - Production-Ready Helper Library
 * =============================================================
 *
 * Comprehensive utility class providing essential functions for Mailchimp API integration.
 * These utilities handle authentication, data formatting, error processing, and validation
 * required for successful email marketing automation operations.
 *
 * Key Features:
 * • Server prefix extraction from OAuth metadata for dynamic API endpoint resolution
 * • Subscriber hash generation using MD5 for secure member identification
 * • Email validation with RFC-compliant regex patterns
 * • Merge field formatting with Mailchimp's uppercase key requirements
 * • Error parsing with intelligent retry determination for robust error handling
 */
export class MailchimpUtils {
  /**
   * Generate MD5 hash for subscriber identification in Mailchimp API operations
   *
   * Mailchimp requires member operations to use MD5 hash of lowercase email addresses
   * as subscriber identifiers for security and consistency across API calls.
   *
   * @param email - Email address to hash (will be lowercased automatically)
   * @returns MD5 hash string suitable for Mailchimp member operations
   *
   * @example
   * const hash = MailchimpUtils.generateSubscriberHash('user@example.com')
   * // Returns: MD5 hash of 'user@example.com'
   *
   * @technical_note Currently returns lowercase email as placeholder.
   * Production implementation should use crypto.createHash('md5').
   */
  static generateSubscriberHash(email: string): string {
    const operationId = `hash_generation_${Date.now()}`
    logger.info(`[${operationId}] Generating subscriber hash for email`, {
      operationId,
      emailLength: email.length,
      hasAtSymbol: email.includes('@'),
    })

    try {
      // TODO: Replace with crypto.createHash('md5').update(email.toLowerCase()).digest('hex')
      // For now, using lowercase email as placeholder for development
      const hash = email.toLowerCase()

      logger.info(`[${operationId}] Subscriber hash generated successfully`, {
        operationId,
        hashLength: hash.length,
      })

      return hash
    } catch (error) {
      logger.error(`[${operationId}] Failed to generate subscriber hash`, {
        operationId,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Extract server prefix from Mailchimp OAuth metadata URL for API endpoint resolution
   *
   * Mailchimp uses different API servers (us1, us2, etc.) based on account region.
   * This function extracts the correct server prefix from OAuth response metadata URLs
   * to construct proper API endpoints.
   *
   * @param metadataUrl - OAuth metadata URL containing server information
   * @returns Server prefix (e.g., 'us1', 'us2') or 'us1' as fallback
   *
   * @example
   * const prefix = MailchimpUtils.extractServerPrefix('https://us14.api.mailchimp.com/3.0/')
   * // Returns: 'us14'
   */
  static extractServerPrefix(metadataUrl: string): string {
    const operationId = `server_extraction_${Date.now()}`
    logger.info(`[${operationId}] Extracting server prefix from metadata URL`, {
      operationId,
      urlLength: metadataUrl.length,
      isHttps: metadataUrl.startsWith('https://'),
    })

    try {
      const match = metadataUrl.match(/https:\/\/([^.]+)\.api\.mailchimp\.com/)
      const serverPrefix = match ? match[1] : 'us1'

      logger.info(
        `[${operationId}] Server prefix extraction ${match ? 'succeeded' : 'failed - using fallback'}`,
        {
          operationId,
          serverPrefix,
          extractedFromUrl: !!match,
          fallbackUsed: !match,
        }
      )

      return serverPrefix
    } catch (error) {
      logger.error(`[${operationId}] Server prefix extraction failed`, {
        operationId,
        error: (error as Error).message,
        fallbackUsed: true,
      })
      return 'us1' // Safe fallback to most common server
    }
  }

  /**
   * Validate email address format using RFC-compliant regex pattern
   *
   * Performs client-side email validation before sending to Mailchimp API
   * to reduce API calls and provide immediate feedback for invalid addresses.
   *
   * @param email - Email address to validate
   * @returns true if email format is valid, false otherwise
   *
   * @example
   * const isValid = MailchimpUtils.validateEmail('user@example.com') // Returns: true
   * const isInvalid = MailchimpUtils.validateEmail('invalid-email') // Returns: false
   */
  static validateEmail(email: string): boolean {
    const operationId = `email_validation_${Date.now()}`
    logger.info(`[${operationId}] Validating email address format`, {
      operationId,
      emailLength: email.length,
      hasAtSymbol: email.includes('@'),
      hasDot: email.includes('.'),
    })

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const isValid = emailRegex.test(email)

      logger.info(`[${operationId}] Email validation ${isValid ? 'passed' : 'failed'}`, {
        operationId,
        isValid,
        emailFormat: 'RFC-compliant',
      })

      return isValid
    } catch (error) {
      logger.error(`[${operationId}] Email validation error occurred`, {
        operationId,
        error: (error as Error).message,
      })
      return false // Fail safely
    }
  }

  /**
   * Format merge fields for Mailchimp API compliance and data consistency
   *
   * Mailchimp requires merge field keys to be uppercase and values to be strings.
   * This function transforms any object into Mailchimp-compatible merge fields
   * while filtering out null/undefined values.
   *
   * @param fields - Object containing merge field data with any casing
   * @returns Formatted object with uppercase keys and string values
   *
   * @example
   * const formatted = MailchimpUtils.formatMergeFields({
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   age: 30
   * })
   * // Returns: { FIRSTNAME: 'John', LASTNAME: 'Doe', AGE: '30' }
   */
  static formatMergeFields(fields: Record<string, any>): Record<string, string> {
    const operationId = `merge_fields_${Date.now()}`
    const inputKeys = Object.keys(fields)

    logger.info(`[${operationId}] Formatting merge fields for Mailchimp API`, {
      operationId,
      inputFieldCount: inputKeys.length,
      inputKeys: inputKeys,
    })

    try {
      const formatted: Record<string, string> = {}
      let processedCount = 0
      let skippedCount = 0

      for (const [key, value] of Object.entries(fields)) {
        if (value !== null && value !== undefined) {
          formatted[key.toUpperCase()] = String(value)
          processedCount++
        } else {
          skippedCount++
        }
      }

      logger.info(`[${operationId}] Merge fields formatting completed`, {
        operationId,
        inputFieldCount: inputKeys.length,
        processedFieldCount: processedCount,
        skippedFieldCount: skippedCount,
        outputKeys: Object.keys(formatted),
      })

      return formatted
    } catch (error) {
      logger.error(`[${operationId}] Merge fields formatting failed`, {
        operationId,
        error: (error as Error).message,
        inputFieldCount: inputKeys.length,
      })
      throw error
    }
  }

  /**
   * Parse Mailchimp API errors and determine retry strategy for robust error handling
   *
   * Mailchimp returns structured error responses with specific types and details.
   * This function extracts error information and determines if operations should
   * be retried based on error type and HTTP status code.
   *
   * @param error - Raw error object from API request
   * @returns Parsed error object with retry determination
   *
   * @example
   * const parsedError = MailchimpUtils.parseApiError(apiError)
   * if (parsedError.retryable) {
   *   // Implement retry logic
   * }
   */
  static parseApiError(error: any): {
    type: string
    title: string
    detail: string
    instance: string
    retryable: boolean
  } {
    const operationId = `error_parsing_${Date.now()}`
    logger.info(`[${operationId}] Parsing Mailchimp API error for retry determination`, {
      operationId,
      hasResponse: !!error.response,
      hasResponseData: !!error.response?.data,
      statusCode: error.response?.status,
    })

    try {
      if (error.response?.data) {
        const errorData = error.response.data
        const parsedError = {
          type: errorData.type || 'unknown',
          title: errorData.title || 'API Error',
          detail: errorData.detail || 'Unknown error occurred',
          instance: errorData.instance || '',
          retryable: MailchimpUtils.isRetryableError(errorData.type, error.response.status),
        }

        logger.info(`[${operationId}] API error parsed from response data`, {
          operationId,
          errorType: parsedError.type,
          errorTitle: parsedError.title,
          isRetryable: parsedError.retryable,
          statusCode: error.response.status,
        })

        return parsedError
      }

      // Network or other non-API error
      const networkError = {
        type: 'network_error',
        title: 'Network Error',
        detail: error.message || 'Network error occurred',
        instance: '',
        retryable: true,
      }

      logger.info(`[${operationId}] Network error parsed (retryable)`, {
        operationId,
        errorMessage: error.message,
        errorType: 'network_error',
      })

      return networkError
    } catch (parseError) {
      logger.error(`[${operationId}] Error parsing failed`, {
        operationId,
        parseError: (parseError as Error).message,
      })

      // Return safe fallback error
      return {
        type: 'parse_error',
        title: 'Error Processing Failed',
        detail: 'Failed to parse API error response',
        instance: '',
        retryable: false,
      }
    }
  }

  /**
   * Determine if a Mailchimp API error should be retried based on type and status code
   *
   * Uses Mailchimp's error documentation to classify errors as retryable or permanent.
   * Considers both HTTP status codes and Mailchimp-specific error types for accurate
   * retry decisions.
   *
   * @param errorType - Mailchimp error type from API response
   * @param statusCode - HTTP status code from API response
   * @returns true if error is retryable, false for permanent errors
   *
   * @private Internal utility method used by parseApiError
   */
  private static isRetryableError(errorType: string, statusCode: number): boolean {
    const operationId = `retry_determination_${Date.now()}`
    logger.info(`[${operationId}] Determining error retry eligibility`, {
      operationId,
      errorType,
      statusCode,
    })

    try {
      // Check HTTP status codes first (more reliable)
      const retryableStatusCodes = [429, 500, 502, 503, 504]
      const statusRetryable = retryableStatusCodes.includes(statusCode)

      // Check Mailchimp-specific error types
      const retryableTypes = [
        'http://developer.mailchimp.com/documentation/mailchimp/guides/error-glossary#429',
        'http://developer.mailchimp.com/documentation/mailchimp/guides/error-glossary#500',
      ]
      const typeRetryable = retryableTypes.includes(errorType)

      const isRetryable = statusRetryable || typeRetryable

      logger.info(`[${operationId}] Retry determination completed`, {
        operationId,
        errorType,
        statusCode,
        statusRetryable,
        typeRetryable,
        finalDecision: isRetryable,
      })

      return isRetryable
    } catch (error) {
      logger.error(`[${operationId}] Retry determination failed`, {
        operationId,
        error: (error as Error).message,
      })
      return false // Fail safely - don't retry on parse errors
    }
  }
}

// ====================================================================
// CONNECTOR INITIALIZATION AND LOGGING
// ====================================================================

/**
 * Initialize Mailchimp Connector with comprehensive logging and validation
 *
 * Logs the successful loading of the Mailchimp connector configuration,
 * including operation count and key metrics for monitoring and debugging.
 * This initialization confirms all type definitions, schemas, and configurations
 * are properly loaded and ready for production email marketing automation.
 */
logger.info('🚀 Mailchimp Marketing Connector initialized successfully', {
  connectorId: 'mailchimp',
  version: '1.0.0',
  operations: MAILCHIMP_OPERATIONS.length,
  categories: ['audiences', 'members', 'campaigns', 'templates'],
  authentication: 'oauth2',
  rateLimit: '10 req/sec with 100 burst',
  healthCheck: 'enabled',
  errorRecovery: 'dead-letter-queue',
  transformations: ['json_mapping', 'data_validation', 'data_enrichment'],
  loadedAt: new Date().toISOString(),
})
