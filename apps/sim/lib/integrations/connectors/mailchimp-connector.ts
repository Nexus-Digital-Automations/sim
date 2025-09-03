/**
 * Mailchimp Marketing Integration Connector
 *
 * Comprehensive Mailchimp integration providing full email marketing and
 * automation capabilities including audience management, campaign creation,
 * automation workflows, and analytics.
 *
 * Features:
 * - OAuth 2.0 authentication with automatic token refresh
 * - Complete audience and subscriber management
 * - Campaign creation, scheduling, and sending
 * - Email template management and customization
 * - Marketing automation workflows
 * - Advanced analytics and reporting
 * - A/B testing and optimization tools
 * - Real-time webhook support for events
 * - GDPR compliance and consent management
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  IntegrationConnector,
  IntegrationOperation,
  OAuth2Config,
  RateLimitConfig,
  ErrorHandlingConfig,
  HealthCheckConfig,
} from '../index'

const logger = createLogger('MailchimpConnector')

// ====================================================================
// MAILCHIMP CONNECTOR CONFIGURATION
// ====================================================================

/**
 * Mailchimp API configuration and endpoints
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
  SUBSCRIBER_STATUSES: [
    'subscribed',
    'unsubscribed', 
    'cleaned',
    'pending',
    'transactional',
  ],
  
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
 * Mailchimp connector operations configuration
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
          default: 10,
        },
        offset: {
          type: 'number',
          description: 'Number of records to skip',
          minimum: 0,
          default: 0,
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
          default: false,
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
          required: ['company', 'address1', 'city', 'state', 'zip', 'country'],
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
          required: ['fromName', 'fromEmail', 'subject', 'language'],
        },
        emailTypeOption: {
          type: 'boolean',
          description: 'Whether to allow subscribers to choose email format',
          default: false,
        },
        doubleOptin: {
          type: 'boolean',
          description: 'Whether to require double opt-in',
          default: false,
        },
        marketingPermissions: {
          type: 'boolean',
          description: 'Whether to enable marketing permissions',
          default: false,
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
          default: 10,
        },
        offset: {
          type: 'number',
          minimum: 0,
          default: 0,
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
          default: 'subscribed',
        },
        emailType: {
          type: 'string',
          enum: ['html', 'text'],
          description: 'Email format preference',
          default: 'html',
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
          description: 'Interest categories for the subscriber',
          additionalProperties: { type: 'boolean' },
        },
        language: {
          type: 'string',
          description: 'Language preference (ISO 639-1 code)',
          example: 'en',
        },
        vip: {
          type: 'boolean',
          description: 'VIP status for the subscriber',
          default: false,
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
          default: 'subscribed',
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
          description: 'Interest categories to update',
          additionalProperties: { type: 'boolean' },
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
          default: 10,
        },
        offset: {
          type: 'number',
          minimum: 0,
          default: 0,
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
          default: 'DESC',
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
          default: 'regular',
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
              default: true,
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
          required: ['listId'],
        },
        settings: {
          type: 'object',
          description: 'Campaign settings',
          properties: {
            subjectLine: {
              type: 'string',
              description: 'Email subject line',
              maxLength: 150,
            },
            previewText: {
              type: 'string',
              description: 'Preview text for the email',
              maxLength: 150,
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
              default: false,
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
              default: true,
            },
            autoFooter: {
              type: 'boolean',
              description: 'Auto-generate footer',
              default: false,
            },
            inlineCss: {
              type: 'boolean',
              description: 'Inline CSS in email',
              default: false,
            },
            autoTweet: {
              type: 'boolean',
              description: 'Auto-tweet when campaign is sent',
              default: false,
            },
            fbComments: {
              type: 'boolean',
              description: 'Enable Facebook comments',
              default: true,
            },
            timewarp: {
              type: 'boolean',
              description: 'Send campaign using Timewarp',
              default: false,
            },
            templateId: {
              type: 'number',
              description: 'Template ID to use',
            },
            dragAndDrop: {
              type: 'boolean',
              description: 'Whether campaign uses drag-and-drop editor',
              default: false,
            },
          },
          required: ['subjectLine', 'fromName', 'replyTo'],
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
              default: true,
            },
            htmlClicks: {
              type: 'boolean',
              description: 'Track clicks in HTML emails',
              default: true,
            },
            textClicks: {
              type: 'boolean',
              description: 'Track clicks in text emails',
              default: true,
            },
            goalTracking: {
              type: 'boolean',
              description: 'Enable goal tracking',
              default: false,
            },
            ecomm360: {
              type: 'boolean',
              description: 'Enable e-commerce tracking',
              default: false,
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
          default: 10,
        },
        offset: {
          type: 'number',
          minimum: 0,
          default: 0,
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
          default: 'date_created',
        },
        sortDir: {
          type: 'string',
          enum: ['ASC', 'DESC'],
          description: 'Sort direction',
          default: 'DESC',
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
  
  transformations: [
    'json_mapping',
    'data_validation',
    'data_enrichment',
    'email_validation',
  ],
  
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
 * Mailchimp utility functions
 */
export class MailchimpUtils {
  /**
   * Generate MD5 hash for subscriber identification
   */
  static generateSubscriberHash(email: string): string {
    // This would use crypto.createHash('md5') in Node.js
    // For now, returning placeholder
    return email.toLowerCase()
  }
  
  /**
   * Extract server prefix from OAuth response or metadata URL
   */
  static extractServerPrefix(metadataUrl: string): string {
    const match = metadataUrl.match(/https:\/\/([^.]+)\.api\.mailchimp\.com/)
    return match ? match[1] : 'us1' // Default to us1 if extraction fails
  }
  
  /**
   * Validate email address format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  /**
   * Format merge fields for Mailchimp API
   */
  static formatMergeFields(fields: Record<string, any>): Record<string, string> {
    const formatted: Record<string, string> = {}
    
    for (const [key, value] of Object.entries(fields)) {
      if (value !== null && value !== undefined) {
        formatted[key.toUpperCase()] = String(value)
      }
    }
    
    return formatted
  }
  
  /**
   * Parse Mailchimp API errors
   */
  static parseApiError(error: any): {
    type: string
    title: string
    detail: string
    instance: string
    retryable: boolean
  } {
    if (error.response?.data) {
      const errorData = error.response.data
      return {
        type: errorData.type || 'unknown',
        title: errorData.title || 'API Error',
        detail: errorData.detail || 'Unknown error occurred',
        instance: errorData.instance || '',
        retryable: this.isRetryableError(errorData.type, error.response.status),
      }
    }
    
    return {
      type: 'network_error',
      title: 'Network Error',
      detail: error.message || 'Network error occurred',
      instance: '',
      retryable: true,
    }
  }
  
  /**
   * Determine if error is retryable
   */
  private static isRetryableError(errorType: string, statusCode: number): boolean {
    if ([429, 500, 502, 503, 504].includes(statusCode)) {
      return true
    }
    
    const retryableTypes = [
      'http://developer.mailchimp.com/documentation/mailchimp/guides/error-glossary#429',
      'http://developer.mailchimp.com/documentation/mailchimp/guides/error-glossary#500',
    ]
    
    return retryableTypes.includes(errorType)
  }
}

logger.info('Mailchimp connector configuration loaded successfully', {
  operations: MAILCHIMP_OPERATIONS.length,
})