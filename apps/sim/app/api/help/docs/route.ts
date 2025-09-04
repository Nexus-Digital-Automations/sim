/**
 * Help System API Documentation - OpenAPI/Swagger Documentation
 *
 * Comprehensive API documentation for the help system:
 * - OpenAPI 3.0 specification for all help system endpoints
 * - Interactive Swagger UI for API exploration
 * - Comprehensive examples and usage patterns
 * - Authentication and security documentation
 * - Rate limiting and performance guidelines
 * - Error handling and response format documentation
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('HelpDocsAPI')

// ========================
// OPENAPI SPECIFICATION
// ========================

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Sim Help System API',
    description: `
# Sim Help System API

A comprehensive help and documentation system API providing:

- **Content Management**: Create, read, update, and delete help content
- **Contextual Help**: Intelligent help suggestions based on user context
- **Advanced Search**: Semantic search with filtering and ranking
- **Real-time Updates**: WebSocket API for live help updates
- **Analytics**: Track usage patterns and content effectiveness
- **Feedback System**: Collect and manage user feedback
- **Third-party Integrations**: Sync with Intercom, Zendesk, Help Scout
- **GraphQL Interface**: Flexible queries with nested relationships

## Authentication

All API endpoints require authentication using session-based auth or API keys:

\`\`\`bash
# Session-based (browser)
GET /api/help/content?contentId=example
Cookie: session=your-session-token

# API Key (server-to-server)  
GET /api/help/content?contentId=example
Authorization: Bearer your-api-key
\`\`\`

## Rate Limiting

API requests are rate-limited to ensure system stability:

- **Authenticated users**: 1000 requests/hour
- **Anonymous users**: 100 requests/hour
- **WebSocket connections**: 50 concurrent per user
- **Search queries**: 200 requests/hour

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Request limit per hour
- \`X-RateLimit-Remaining\`: Requests remaining
- \`X-RateLimit-Reset\`: Unix timestamp when limit resets

## Response Format

All API responses follow a consistent format:

\`\`\`json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "requestId": "abc123",
    "processingTime": 150,
    "timestamp": "2025-09-04T00:00:00Z"
  }
}
\`\`\`

Error responses:

\`\`\`json
{
  "success": false,
  "error": "Error message",
  "details": { /* additional error details */ },
  "meta": {
    "requestId": "abc123",
    "timestamp": "2025-09-04T00:00:00Z"
  }
}
\`\`\`

## Pagination

List endpoints support pagination with consistent parameters:

- \`page\`: Page number (default: 1)
- \`pageSize\`: Items per page (default: 10, max: 100)

Pagination metadata is included in responses:

\`\`\`json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 150,
    "totalPages": 15
  }
}
\`\`\`
    `,
    version: '1.0.0',
    contact: {
      name: 'Sim API Support',
      url: 'https://sim.dev/help',
      email: 'api-support@sim.dev',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'https://api.sim.dev',
      description: 'Production API',
    },
    {
      url: 'https://staging-api.sim.dev',
      description: 'Staging API',
    },
    {
      url: 'http://localhost:3000',
      description: 'Development API',
    },
  ],
  security: [
    {
      sessionAuth: [],
    },
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Content',
      description: 'Help content management and retrieval',
    },
    {
      name: 'Search',
      description: 'Advanced search and suggestions',
    },
    {
      name: 'Analytics',
      description: 'Usage tracking and performance metrics',
    },
    {
      name: 'Feedback',
      description: 'User feedback collection and management',
    },
    {
      name: 'Integrations',
      description: 'Third-party service integrations',
    },
    {
      name: 'Real-time',
      description: 'WebSocket and real-time features',
    },
    {
      name: 'GraphQL',
      description: 'GraphQL interface for flexible queries',
    },
  ],
  components: {
    securitySchemes: {
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'session',
        description: 'Session-based authentication for browser clients',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Bearer token authentication for server-to-server',
      },
    },
    schemas: {
      HelpContent: {
        type: 'object',
        required: ['id', 'title', 'content', 'contentType', 'userLevels', 'metadata'],
        properties: {
          id: {
            type: 'string',
            example: 'quick-start-guide',
            description: 'Unique content identifier',
          },
          title: {
            type: 'string',
            example: 'Quick Start Guide',
            description: 'Content title',
          },
          content: {
            type: 'string',
            example: 'Welcome to Sim! This guide will help you...',
            description: 'Content body in markdown or HTML',
          },
          contentType: {
            type: 'string',
            enum: ['guide', 'tutorial', 'faq', 'reference', 'video', 'interactive'],
            example: 'guide',
            description: 'Type of help content',
          },
          userLevels: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            },
            example: ['beginner', 'intermediate'],
            description: 'Target user experience levels',
          },
          metadata: {
            $ref: '#/components/schemas/ContentMetadata',
          },
          analytics: {
            $ref: '#/components/schemas/ContentAnalytics',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-09-04T12:00:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-09-04T12:30:00Z',
          },
        },
      },
      ContentMetadata: {
        type: 'object',
        required: ['category', 'lastUpdated', 'language'],
        properties: {
          category: {
            type: 'string',
            example: 'getting-started',
            description: 'Content category',
          },
          author: {
            type: 'string',
            example: 'Sim Team',
            description: 'Content author',
          },
          lastUpdated: {
            type: 'string',
            format: 'date-time',
            example: '2025-09-04T12:00:00Z',
          },
          version: {
            type: 'string',
            example: '1.2.0',
            description: 'Content version',
          },
          estimatedReadingTime: {
            type: 'integer',
            example: 300,
            description: 'Estimated reading time in seconds',
          },
          difficulty: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            example: 'beginner',
          },
          prerequisites: {
            type: 'array',
            items: { type: 'string' },
            example: ['account-setup', 'basic-concepts'],
            description: 'Required prerequisite content IDs',
          },
          relatedContent: {
            type: 'array',
            items: { type: 'string' },
            example: ['workflow-creation', 'api-integration'],
            description: 'Related content IDs',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['workflow', 'automation', 'beginner'],
            description: 'Content tags for categorization',
          },
          language: {
            type: 'string',
            example: 'en',
            description: 'Content language code',
          },
        },
      },
      ContentAnalytics: {
        type: 'object',
        properties: {
          views: {
            type: 'integer',
            example: 1250,
            description: 'Total number of views',
          },
          uniqueUsers: {
            type: 'integer',
            example: 890,
            description: 'Number of unique users who viewed',
          },
          averageTime: {
            type: 'number',
            example: 180.5,
            description: 'Average time spent viewing in seconds',
          },
          completionRate: {
            type: 'number',
            example: 0.78,
            description: 'Completion rate (0-1)',
          },
          feedbackScore: {
            type: 'number',
            example: 4.6,
            description: 'Average user feedback score (1-5)',
          },
          helpfulPercentage: {
            type: 'number',
            example: 0.85,
            description: 'Percentage of users who found it helpful',
          },
          searchAppearances: {
            type: 'integer',
            example: 320,
            description: 'Number of times appeared in search results',
          },
          bookmarks: {
            type: 'integer',
            example: 145,
            description: 'Number of times bookmarked',
          },
          shares: {
            type: 'integer',
            example: 23,
            description: 'Number of times shared',
          },
        },
      },
      SearchResult: {
        type: 'object',
        required: ['documents', 'total', 'page', 'pageSize', 'query'],
        properties: {
          documents: {
            type: 'array',
            items: { $ref: '#/components/schemas/HelpContent' },
            description: 'Search result documents',
          },
          total: {
            type: 'integer',
            example: 42,
            description: 'Total number of matching documents',
          },
          page: {
            type: 'integer',
            example: 1,
            description: 'Current page number',
          },
          pageSize: {
            type: 'integer',
            example: 10,
            description: 'Number of results per page',
          },
          totalPages: {
            type: 'integer',
            example: 5,
            description: 'Total number of pages',
          },
          query: {
            type: 'string',
            example: 'workflow automation',
            description: 'Search query used',
          },
          suggestions: {
            type: 'array',
            items: { type: 'string' },
            example: ['workflow tutorial', 'automation guide'],
            description: 'Search suggestions for better results',
          },
          processingTime: {
            type: 'number',
            example: 45.2,
            description: 'Search processing time in milliseconds',
          },
          facets: {
            type: 'object',
            description: 'Search facets and filters',
          },
        },
      },
      HelpFeedback: {
        type: 'object',
        required: ['id', 'contentId', 'sessionId', 'feedbackType', 'status', 'createdAt'],
        properties: {
          id: {
            type: 'string',
            example: 'fb_abc123',
            description: 'Unique feedback identifier',
          },
          contentId: {
            type: 'string',
            example: 'quick-start-guide',
            description: 'ID of content being reviewed',
          },
          userId: {
            type: 'string',
            example: 'user@example.com',
            description: 'User who submitted feedback',
          },
          sessionId: {
            type: 'string',
            example: 'session_xyz789',
            description: 'User session identifier',
          },
          feedbackType: {
            type: 'string',
            enum: [
              'rating',
              'helpful',
              'suggestion',
              'error_report',
              'content_request',
              'general_feedback',
            ],
            example: 'rating',
            description: 'Type of feedback',
          },
          rating: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            example: 4,
            description: 'Rating score (1-5)',
          },
          helpful: {
            type: 'boolean',
            example: true,
            description: 'Whether content was helpful',
          },
          comment: {
            type: 'string',
            example: 'This guide was very clear and easy to follow!',
            description: 'User comment',
          },
          suggestion: {
            type: 'string',
            example: 'Could use more examples for advanced users',
            description: 'User suggestion for improvement',
          },
          status: {
            type: 'string',
            enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
            example: 'pending',
            description: 'Feedback processing status',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            example: 'medium',
            description: 'Feedback priority level',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-09-04T12:00:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-09-04T12:30:00Z',
          },
          response: {
            type: 'string',
            example: "Thank you for your feedback! We've updated the guide.",
            description: 'Response to feedback',
          },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Invalid request parameters',
            description: 'Error message',
          },
          details: {
            type: 'object',
            description: 'Additional error details',
          },
          meta: {
            type: 'object',
            properties: {
              requestId: {
                type: 'string',
                example: 'req_abc123',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
              },
            },
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              error: 'Authentication required',
              meta: {
                requestId: 'req_abc123',
                timestamp: '2025-09-04T12:00:00Z',
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              error: 'Invalid request parameters',
              details: {
                query: ['Query is required'],
                page: ['Page must be a positive integer'],
              },
              meta: {
                requestId: 'req_abc123',
                timestamp: '2025-09-04T12:00:00Z',
              },
            },
          },
        },
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        headers: {
          'X-RateLimit-Limit': {
            schema: { type: 'integer' },
            description: 'Request limit per hour',
          },
          'X-RateLimit-Remaining': {
            schema: { type: 'integer' },
            description: 'Requests remaining',
          },
          'X-RateLimit-Reset': {
            schema: { type: 'integer' },
            description: 'Unix timestamp when limit resets',
          },
        },
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              error: 'Rate limit exceeded',
              details: {
                limit: 1000,
                remaining: 0,
                resetTime: 1609459200,
              },
              meta: {
                requestId: 'req_abc123',
                timestamp: '2025-09-04T12:00:00Z',
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/help/content': {
      get: {
        tags: ['Content'],
        summary: 'Retrieve help content',
        description: 'Get help content with optional filtering, pagination, and analytics',
        operationId: 'getHelpContent',
        parameters: [
          {
            name: 'contentId',
            in: 'query',
            description: 'Specific content ID to retrieve',
            schema: { type: 'string' },
            example: 'quick-start-guide',
          },
          {
            name: 'category',
            in: 'query',
            description: 'Filter by content category',
            schema: { type: 'string' },
            example: 'getting-started',
          },
          {
            name: 'component',
            in: 'query',
            description: 'Filter by component context',
            schema: { type: 'string' },
            example: 'workflow-editor',
          },
          {
            name: 'userLevel',
            in: 'query',
            description: 'Filter by user experience level',
            schema: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            },
            example: 'beginner',
          },
          {
            name: 'language',
            in: 'query',
            description: 'Content language',
            schema: { type: 'string' },
            example: 'en',
          },
          {
            name: 'includeAnalytics',
            in: 'query',
            description: 'Include analytics data',
            schema: { type: 'boolean' },
            example: true,
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            headers: {
              'X-Response-Time': {
                schema: { type: 'string' },
                description: 'Response processing time',
              },
              ETag: {
                schema: { type: 'string' },
                description: 'Entity tag for caching',
              },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    content: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/HelpContent' },
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        language: { type: 'string' },
                        userLevel: { type: 'string' },
                        requestId: { type: 'string' },
                        timestamp: { type: 'string' },
                      },
                    },
                  },
                },
                examples: {
                  singleContent: {
                    summary: 'Single content item',
                    value: {
                      content: [
                        {
                          id: 'quick-start-guide',
                          title: 'Quick Start Guide',
                          content: 'Welcome to Sim! This guide will help you get started...',
                          contentType: 'guide',
                          userLevels: ['beginner'],
                          metadata: {
                            category: 'getting-started',
                            author: 'Sim Team',
                            lastUpdated: '2025-09-04T12:00:00Z',
                            language: 'en',
                            tags: ['workflow', 'automation', 'beginner'],
                          },
                          analytics: {
                            views: 1250,
                            uniqueUsers: 890,
                            averageTime: 180.5,
                            completionRate: 0.78,
                            feedbackScore: 4.6,
                          },
                          createdAt: '2025-09-01T10:00:00Z',
                          updatedAt: '2025-09-04T12:00:00Z',
                        },
                      ],
                      meta: {
                        total: 1,
                        language: 'en',
                        requestId: 'req_abc123',
                        timestamp: '2025-09-04T12:00:00Z',
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '429': { $ref: '#/components/responses/RateLimitError' },
        },
      },
      post: {
        tags: ['Content'],
        summary: 'Get contextual help content',
        description: 'Retrieve help content based on specific user context and workflow state',
        operationId: 'getContextualHelpContent',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['component'],
                properties: {
                  component: {
                    type: 'string',
                    description: 'Component identifier',
                    example: 'workflow-editor',
                  },
                  page: {
                    type: 'string',
                    description: 'Current page path',
                    example: '/workflows/new',
                  },
                  userLevel: {
                    type: 'string',
                    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
                    example: 'beginner',
                  },
                  workflowState: {
                    type: 'string',
                    enum: ['empty', 'creating', 'editing', 'running', 'debugging'],
                    example: 'creating',
                  },
                  blockType: {
                    type: 'string',
                    description: 'Current block type',
                    example: 'http-request',
                  },
                  errorState: {
                    type: 'boolean',
                    description: 'Whether user is in error state',
                    example: false,
                  },
                  limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 20,
                    description: 'Maximum number of results',
                    example: 5,
                  },
                },
              },
              examples: {
                workflowEditor: {
                  summary: 'Workflow editor context',
                  value: {
                    component: 'workflow-editor',
                    page: '/workflows/new',
                    userLevel: 'beginner',
                    workflowState: 'creating',
                    blockType: 'http-request',
                    limit: 5,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Contextual help content',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    content: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/HelpContent' },
                    },
                    context: {
                      type: 'object',
                      description: 'Context used for content selection',
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        available: { type: 'integer' },
                        requestId: { type: 'string' },
                        timestamp: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/help/search': {
      get: {
        tags: ['Search'],
        summary: 'Search help content',
        description: 'Perform advanced search with semantic understanding and filtering',
        operationId: 'searchHelpContent',
        parameters: [
          {
            name: 'query',
            in: 'query',
            required: true,
            description: 'Search query',
            schema: { type: 'string' },
            example: 'workflow automation',
          },
          {
            name: 'categories',
            in: 'query',
            description: 'Filter by categories (comma-separated)',
            schema: { type: 'string' },
            example: 'getting-started,integrations',
          },
          {
            name: 'sortBy',
            in: 'query',
            description: 'Sort results by',
            schema: {
              type: 'string',
              enum: ['relevance', 'date', 'popularity', 'rating'],
            },
            example: 'relevance',
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number',
            schema: { type: 'integer', minimum: 1 },
            example: 1,
          },
          {
            name: 'pageSize',
            in: 'query',
            description: 'Results per page',
            schema: { type: 'integer', minimum: 1, maximum: 50 },
            example: 10,
          },
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SearchResult' },
                examples: {
                  searchResults: {
                    summary: 'Search results for "workflow automation"',
                    value: {
                      documents: [
                        {
                          id: 'workflow-automation-guide',
                          title: 'Workflow Automation Guide',
                          content: 'Learn how to automate your workflows...',
                          contentType: 'guide',
                          userLevels: ['intermediate'],
                          matches: [
                            {
                              field: 'title',
                              snippet: '<mark>Workflow</mark> <mark>Automation</mark> Guide',
                              score: 1.0,
                            },
                          ],
                        },
                      ],
                      total: 15,
                      page: 1,
                      pageSize: 10,
                      totalPages: 2,
                      query: 'workflow automation',
                      processingTime: 45.2,
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/help/feedback': {
      get: {
        tags: ['Feedback'],
        summary: 'Retrieve feedback data',
        description: 'Get feedback with filtering and analytics',
        operationId: 'getHelpFeedback',
        parameters: [
          {
            name: 'contentId',
            in: 'query',
            description: 'Filter by content ID',
            schema: { type: 'string' },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by status',
            schema: {
              type: 'string',
              enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
            },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1 },
          },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          '200': {
            description: 'Feedback data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    feedback: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/HelpFeedback' },
                    },
                    summary: {
                      type: 'object',
                      properties: {
                        totalFeedback: { type: 'integer' },
                        averageRating: { type: 'number' },
                        helpfulPercentage: { type: 'number' },
                        urgentIssues: { type: 'integer' },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        pageSize: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
      post: {
        tags: ['Feedback'],
        summary: 'Submit feedback',
        description: 'Submit user feedback on help content',
        operationId: 'submitHelpFeedback',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['contentId', 'sessionId', 'feedbackType'],
                properties: {
                  contentId: { type: 'string' },
                  sessionId: { type: 'string' },
                  feedbackType: {
                    type: 'string',
                    enum: ['rating', 'helpful', 'suggestion', 'error_report'],
                  },
                  data: {
                    type: 'object',
                    properties: {
                      rating: { type: 'integer', minimum: 1, maximum: 5 },
                      helpful: { type: 'boolean' },
                      comment: { type: 'string' },
                      suggestion: { type: 'string' },
                    },
                  },
                },
              },
              examples: {
                rating: {
                  summary: 'Rating feedback',
                  value: {
                    contentId: 'quick-start-guide',
                    sessionId: 'session_xyz789',
                    feedbackType: 'rating',
                    data: {
                      rating: 5,
                      comment: 'Very helpful guide!',
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Feedback submitted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    feedbackId: { type: 'string' },
                    status: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/help/graphql': {
      get: {
        tags: ['GraphQL'],
        summary: 'GraphQL Playground',
        description: 'Interactive GraphQL playground for API exploration',
        operationId: 'graphqlPlayground',
        responses: {
          '200': {
            description: 'GraphQL playground interface',
            content: {
              'text/html': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
      post: {
        tags: ['GraphQL'],
        summary: 'GraphQL Query',
        description: 'Execute GraphQL queries and mutations',
        operationId: 'graphqlQuery',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: {
                    type: 'string',
                    description: 'GraphQL query or mutation',
                  },
                  variables: {
                    type: 'object',
                    description: 'Query variables',
                  },
                  operationName: {
                    type: 'string',
                    description: 'Operation name for multi-operation queries',
                  },
                },
              },
              examples: {
                contentQuery: {
                  summary: 'Get content with analytics',
                  value: {
                    query: `
                      query GetContent($id: String!) {
                        content(id: $id) {
                          id
                          title
                          content
                          analytics {
                            views
                            feedbackScore
                          }
                          relatedContent {
                            id
                            title
                          }
                        }
                      }
                    `,
                    variables: {
                      id: 'quick-start-guide',
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'GraphQL response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'object' },
                    errors: {
                      type: 'array',
                      items: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}

// ========================
// API ENDPOINTS
// ========================

/**
 * GET /api/help/docs - Serve OpenAPI specification
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    logger.info(`[${requestId}] Serving help API documentation`)

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    // Return JSON format by default
    if (format !== 'yaml') {
      return NextResponse.json(openApiSpec, {
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': '10ms',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      })
    }

    // Convert to YAML format (simplified implementation)
    const yamlSpec = `
openapi: ${openApiSpec.openapi}
info:
  title: ${openApiSpec.info.title}
  description: |
${openApiSpec.info.description
  .split('\n')
  .map((line) => `    ${line}`)
  .join('\n')}
  version: ${openApiSpec.info.version}
  contact:
    name: ${openApiSpec.info.contact.name}
    url: ${openApiSpec.info.contact.url}
    email: ${openApiSpec.info.contact.email}
  license:
    name: ${openApiSpec.info.license.name}
    url: ${openApiSpec.info.license.url}

# Full specification would be much longer...
# This is a simplified example for demonstration
    `.trim()

    return new NextResponse(yamlSpec, {
      headers: {
        'Content-Type': 'application/x-yaml',
        'X-Response-Time': '15ms',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    logger.error(`[${requestId}] Failed to serve documentation`, { error })
    return NextResponse.json({ error: 'Documentation unavailable' }, { status: 500 })
  }
}

/**
 * GET /api/help/docs/ui - Serve Swagger UI
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { pathname } = new URL(request.url)

    if (pathname.endsWith('/ui')) {
      logger.info(`[${requestId}] Serving Swagger UI`)

      const swaggerUI = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sim Help System API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
        .swagger-ui .topbar {
            background-color: #1976d2;
        }
        .swagger-ui .topbar .download-url-wrapper {
            display: none;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {
        const ui = SwaggerUIBundle({
            url: '/api/help/docs',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            tryItOutEnabled: true,
            requestInterceptor: (request) => {
                // Add session cookie for browser requests
                if (request.loadSpec) return request;
                request.headers['X-Requested-With'] = 'SwaggerUI';
                return request;
            },
            onComplete: () => {
                console.log('Swagger UI loaded successfully');
            },
            onFailure: (error) => {
                console.error('Swagger UI failed to load:', error);
            }
        });
    };
    </script>
</body>
</html>
      `

      return new NextResponse(swaggerUI, {
        headers: {
          'Content-Type': 'text/html',
          'X-Response-Time': '5ms',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    return NextResponse.json({ error: 'Invalid documentation endpoint' }, { status: 404 })
  } catch (error) {
    logger.error(`[${requestId}] Failed to serve Swagger UI`, { error })
    return NextResponse.json({ error: 'UI unavailable' }, { status: 500 })
  }
}
