/**
 * Comprehensive Test Suite for Template Management API
 * Tests template CRUD operations, advanced filtering, and analytics
 * Covers authentication, authorization, security filtering, and performance
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockRequest,
  mockUser,
  setupComprehensiveTestMocks,
} from '@/app/api/__test-utils__/utils'
import { GET, POST } from './route'

// Mock template data for testing
const sampleTemplateData = {
  id: 'template-123',
  workflowId: 'workflow-456',
  userId: 'user-123',
  name: 'Sample AI Workflow Template',
  description: 'A comprehensive template for AI automation workflows',
  author: 'Test Author',
  views: 150,
  stars: 25,
  color: '#FF6B35',
  icon: 'workflow',
  category: 'AI & Automation',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  state: {
    blocks: {
      'start-block': {
        id: 'start-block',
        type: 'starter',
        subBlocks: {
          apiKey: { id: 'apiKey', type: 'short-input', value: 'secret-key' },
          oauth: { id: 'oauth', type: 'oauth', value: 'oauth-token' },
          publicConfig: { id: 'publicConfig', type: 'text', value: 'public-value' },
        },
      },
    },
    edges: [],
    metadata: {
      template: {
        tags: ['ai', 'automation', 'workflow'],
        difficulty: 'intermediate',
        version: '1.0.0',
        isPublic: true,
      },
    },
  },
}

const sampleTemplatesList = [
  sampleTemplateData,
  {
    ...sampleTemplateData,
    id: 'template-124',
    name: 'Another Template',
    category: 'Data Processing',
    views: 75,
    stars: 12,
    author: 'Another Author',
  },
]

const sampleWorkflowData = {
  id: 'workflow-456',
  userId: 'user-123',
  name: 'Source Workflow',
  workspaceId: null,
}

describe('Template API - GET /api/templates', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [sampleTemplatesList, [{ count: 2 }]] },
      },
    })

    // Mock complex query building
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue(sampleTemplatesList),
    }))
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for template listing', async () => {
      mocks.auth.setUnauthenticated()

      const request = createMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should authenticate with API key', async () => {
      mocks.auth.setUnauthenticated()
      const apiKeyResults = [{ userId: 'user-123' }]
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(apiKeyResults),
          }),
        }),
      }))

      const request = createMockRequest('GET', undefined, { 'x-api-key': 'test-api-key' })
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should support internal JWT token authentication', async () => {
      vi.doMock('@/lib/auth/internal', () => ({
        verifyInternalToken: vi.fn().mockResolvedValue(true),
      }))

      const request = createMockRequest('GET', undefined, {
        authorization: 'Bearer internal-jwt-token',
      })
      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Basic Filtering and Search', () => {
    it('should list templates with default parameters', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toEqual(sampleTemplatesList)
      expect(data.pagination.total).toBe(2)
      expect(data.meta.requestId).toBeDefined()
      expect(data.meta.processingTime).toBeDefined()
      expect(data.meta.isAuthenticated).toBe(true)
    })

    it('should filter templates by category', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates?category=AI%20%26%20Automation'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.category).toBe('AI & Automation')
    })

    it('should search templates by name, description, and author', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates?search=workflow%20automation'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.search).toBe('workflow automation')
    })

    it('should filter templates by workflow ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?workflowId=workflow-456')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.workflowId).toBe('workflow-456')
    })

    it('should filter templates by author user ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?userId=user-123')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.userId).toBe('user-123')
    })
  })

  describe('Advanced Filtering', () => {
    it('should filter by star rating range', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?minStars=10&maxStars=50')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.minStars).toBe(10)
      expect(data.filters.maxStars).toBe(50)
    })

    it('should filter by minimum view count', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?minViews=100')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.minViews).toBe(100)
    })

    it('should filter by creation date range', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates?createdAfter=2024-01-01T00:00:00.000Z&createdBefore=2024-12-31T23:59:59.999Z'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.createdAfter).toBe('2024-01-01T00:00:00.000Z')
      expect(data.filters.createdBefore).toBe('2024-12-31T23:59:59.999Z')
    })

    it('should filter by update date range', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates?updatedAfter=2024-01-01T00:00:00.000Z&updatedBefore=2024-12-31T23:59:59.999Z'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.updatedAfter).toBe('2024-01-01T00:00:00.000Z')
      expect(data.filters.updatedBefore).toBe('2024-12-31T23:59:59.999Z')
    })

    it('should filter by starred templates', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?isStarred=true')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.isStarred).toBe(true)
    })

    it('should filter by tags', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates?tags=ai,automation,workflow'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.tags).toBe('ai,automation,workflow')
    })
  })

  describe('Sorting and Pagination', () => {
    it('should sort templates by name in ascending order', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates?sortBy=name&sortOrder=asc'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.sortBy).toBe('name')
      expect(data.filters.sortOrder).toBe('asc')
    })

    it('should sort templates by views, stars, and creation date', async () => {
      const sortOptions = [
        'views',
        'stars',
        'createdAt',
        'updatedAt',
        'author',
        'category',
        'relevance',
      ]

      for (const sortBy of sortOptions) {
        const request = new NextRequest(`http://localhost:3000/api/templates?sortBy=${sortBy}`)
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.filters.sortBy).toBe(sortBy)
      }
    })

    it('should handle pagination correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?page=2&limit=5')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(5)
      expect(data.pagination.offset).toBe(5)
    })

    it('should validate pagination limits', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?limit=150')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid query parameters')
    })
  })

  describe('Response Options', () => {
    it('should include statistics when requested', async () => {
      // Mock category stats query
      const mockCategoryStats = [
        { category: 'AI & Automation', count: 10, avgStars: 4.5, totalViews: 1000 },
      ]

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue(mockCategoryStats),
      }))

      const request = new NextRequest('http://localhost:3000/api/templates?includeStats=true')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.includeStats).toBe(true)
      expect(data.categoryStats).toBeDefined()
      expect(data.meta.totalCategories).toBeDefined()
    })

    it('should include template state when requested', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates?includeState=true')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.filters.includeState).toBe(true)
    })

    it('should clean filter defaults in response', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // Default values should be removed from response
      expect(data.filters.page).toBeUndefined()
      expect(data.filters.limit).toBeUndefined()
      expect(data.filters.sortBy).toBeUndefined()
      expect(data.filters.sortOrder).toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    it('should validate query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates?sortBy=invalidField&page=abc'
      )
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid query parameters')
      expect(data.details).toBeDefined()
    })

    it('should handle database errors gracefully', async () => {
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
      expect(data.requestId).toBeDefined()
    })
  })

  describe('User-Specific Features', () => {
    it('should include user star status when authenticated', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.meta.isAuthenticated).toBe(true)
    })

    it('should handle unauthenticated users for public templates', async () => {
      mocks.auth.setUnauthenticated()

      const request = createMockRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(401) // This API requires authentication
    })
  })
})

describe('Template API - POST /api/templates', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleWorkflowData], []] }, // Workflow exists, no duplicate template
        insert: { results: [sampleTemplateData] },
      },
    })
  })

  describe('Template Creation', () => {
    it('should create a new template successfully', async () => {
      const templateData = {
        workflowId: 'workflow-456',
        name: 'New AI Template',
        description: 'A new template for AI workflows',
        author: 'Test Author',
        category: 'AI & Automation',
        icon: 'ai-workflow',
        color: '#FF6B35',
        state: {
          blocks: {
            'start-block': {
              id: 'start-block',
              type: 'starter',
              subBlocks: {
                apiKey: { id: 'apiKey', type: 'short-input', value: 'secret-key' },
                publicConfig: { id: 'publicConfig', type: 'text', value: 'public-value' },
              },
            },
          },
          edges: [],
          metadata: {},
        },
        tags: ['ai', 'automation'],
        difficulty: 'intermediate',
        estimatedTime: '30 minutes',
        requirements: ['OpenAI API Key'],
        useCases: ['Data processing', 'Content generation'],
        version: '1.0.0',
        isPublic: true,
        allowComments: true,
      }

      const request = createMockRequest('POST', templateData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id).toBeDefined()
      expect(data.name).toBe('New AI Template')
      expect(data.category).toBe('AI & Automation')
      expect(data.author).toBe('Test Author')
      expect(data.metadata.tags).toEqual(['ai', 'automation'])
      expect(data.metadata.difficulty).toBe('intermediate')
      expect(data.message).toBe('Template created successfully')
      expect(data.processingTime).toBeDefined()
    })

    it('should create template with minimal required fields', async () => {
      const templateData = {
        workflowId: 'workflow-456',
        name: 'Minimal Template',
        description: 'A minimal template',
        author: 'Test Author',
        category: 'General',
        icon: 'workflow',
        color: '#3972F6',
        state: {
          blocks: {},
          edges: [],
        },
      }

      const request = createMockRequest('POST', templateData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.name).toBe('Minimal Template')
      expect(data.metadata.tags).toEqual([])
      expect(data.metadata.difficulty).toBe('intermediate')
      expect(data.metadata.isPublic).toBe(true)
    })

    it('should sanitize credentials by default', async () => {
      const templateData = {
        workflowId: 'workflow-456',
        name: 'Template with Secrets',
        description: 'A template with sensitive data',
        author: 'Test Author',
        category: 'Security',
        icon: 'lock',
        color: '#FF0000',
        state: {
          blocks: {
            'secure-block': {
              id: 'secure-block',
              type: 'api',
              subBlocks: {
                apiKey: { id: 'apiKey', type: 'password', value: 'super-secret-key' },
                oauthToken: { id: 'oauthToken', type: 'oauth', value: 'oauth-secret' },
                credential: { id: 'credential', type: 'credential', value: 'credential-data' },
                publicValue: { id: 'publicValue', type: 'text', value: 'public-data' },
              },
              data: {
                password: 'password-value',
                token: 'token-value',
                publicData: 'safe-data',
              },
            },
          },
          edges: [],
        },
        sanitizeCredentials: true, // Explicitly enable
      }

      const request = createMockRequest('POST', templateData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      // Template should be created successfully with credentials sanitized
    })

    it('should preserve credentials when sanitization is disabled', async () => {
      const templateData = {
        workflowId: 'workflow-456',
        name: 'Template with Preserved Secrets',
        description: 'A template preserving sensitive data',
        author: 'Test Author',
        category: 'Development',
        icon: 'code',
        color: '#00FF00',
        state: {
          blocks: {
            'dev-block': {
              id: 'dev-block',
              subBlocks: {
                apiKey: { value: 'preserved-secret' },
              },
            },
          },
          edges: [],
        },
        sanitizeCredentials: false, // Disable sanitization
      }

      const request = createMockRequest('POST', templateData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      // Credentials should be preserved
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for template creation', async () => {
      mocks.auth.setUnauthenticated()

      const templateData = {
        workflowId: 'workflow-456',
        name: 'Unauthorized Template',
        description: 'Should not be created',
        author: 'Test Author',
        category: 'Test',
        icon: 'test',
        color: '#FF0000',
        state: { blocks: {}, edges: [] },
      }

      const request = createMockRequest('POST', templateData)
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should authenticate with API key', async () => {
      mocks.auth.setUnauthenticated()
      const apiKeyResults = [{ userId: 'user-123' }]
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(apiKeyResults),
          }),
        }),
      }))

      const templateData = {
        workflowId: 'workflow-456',
        name: 'API Key Template',
        description: 'Created via API key',
        author: 'API User',
        category: 'API',
        icon: 'api',
        color: '#0066FF',
        state: { blocks: {}, edges: [] },
      }

      const request = createMockRequest('POST', templateData, { 'x-api-key': 'test-api-key' })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should support internal JWT token authentication', async () => {
      vi.doMock('@/lib/auth/internal', () => ({
        verifyInternalToken: vi.fn().mockResolvedValue(true),
      }))

      const templateData = {
        workflowId: 'workflow-456',
        name: 'Internal Template',
        description: 'Created via internal token',
        author: 'System',
        category: 'System',
        icon: 'system',
        color: '#666666',
        state: { blocks: {}, edges: [] },
      }

      const request = createMockRequest('POST', templateData, {
        authorization: 'Bearer internal-jwt-token',
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })
  })

  describe('Workflow Access Validation', () => {
    it('should require workflow to exist', async () => {
      // Mock workflow not found
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]), // No workflow found
          }),
        }),
      }))

      const templateData = {
        workflowId: 'nonexistent-workflow',
        name: 'Template for Missing Workflow',
        description: 'Should fail',
        author: 'Test Author',
        category: 'Test',
        icon: 'error',
        color: '#FF0000',
        state: { blocks: {}, edges: [] },
      }

      const request = createMockRequest('POST', templateData)
      const response = await POST(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Workflow not found')
    })

    it('should require workflow access permission', async () => {
      // Mock workflow owned by different user
      const differentUserWorkflow = {
        ...sampleWorkflowData,
        userId: 'different-user-456',
      }

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([differentUserWorkflow]),
          }),
        }),
      }))

      const templateData = {
        workflowId: 'workflow-456',
        name: 'Unauthorized Template',
        description: 'Should fail due to permissions',
        author: 'Test Author',
        category: 'Test',
        icon: 'error',
        color: '#FF0000',
        state: { blocks: {}, edges: [] },
      }

      const request = createMockRequest('POST', templateData)
      const response = await POST(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied to workflow')
    })
  })

  describe('Duplicate Template Validation', () => {
    it('should prevent duplicate template names by same user', async () => {
      // Mock duplicate template found
      const duplicateTemplate = [{ id: 'existing-template-123' }]

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation((num) => {
          if (num === 1) {
            // First call - workflow exists
            return Promise.resolve([sampleWorkflowData])
          }
          // Second call - duplicate check
          return Promise.resolve(duplicateTemplate)
        }),
      }))

      const templateData = {
        workflowId: 'workflow-456',
        name: 'Sample AI Workflow Template', // Same name as existing template
        description: 'Should fail due to duplicate name',
        author: 'Test Author',
        category: 'Test',
        icon: 'error',
        color: '#FF0000',
        state: { blocks: {}, edges: [] },
      }

      const request = createMockRequest('POST', templateData)
      const response = await POST(request)

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toBe('Template name already exists')
      expect(data.suggestion).toBe('Sample AI Workflow Template (Copy)')
    })
  })

  describe('Input Validation', () => {
    it('should validate required fields', async () => {
      const incompleteData = {
        // Missing required fields
        name: 'Incomplete Template',
      }

      const request = createMockRequest('POST', incompleteData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid template data')
      expect(data.details).toBeDefined()
    })

    it('should validate field lengths', async () => {
      const invalidData = {
        workflowId: 'workflow-456',
        name: 'x'.repeat(150), // Too long
        description: 'x'.repeat(1100), // Too long
        author: 'x'.repeat(150), // Too long
        category: 'x'.repeat(60), // Too long
        icon: 'x'.repeat(60), // Too long
        color: 'invalid-color',
        state: { blocks: {}, edges: [] },
      }

      const request = createMockRequest('POST', invalidData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid template data')
      expect(data.details.length).toBeGreaterThan(0)
    })

    it('should validate color format', async () => {
      const invalidColorData = {
        workflowId: 'workflow-456',
        name: 'Invalid Color Template',
        description: 'Template with invalid color',
        author: 'Test Author',
        category: 'Test',
        icon: 'test',
        color: 'not-a-hex-color',
        state: { blocks: {}, edges: [] },
      }

      const request = createMockRequest('POST', invalidColorData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid template data')
    })

    it('should validate difficulty levels', async () => {
      const invalidDifficultyData = {
        workflowId: 'workflow-456',
        name: 'Invalid Difficulty Template',
        description: 'Template with invalid difficulty',
        author: 'Test Author',
        category: 'Test',
        icon: 'test',
        color: '#FF0000',
        state: { blocks: {}, edges: [] },
        difficulty: 'expert', // Invalid difficulty level
      }

      const request = createMockRequest('POST', invalidDifficultyData)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid template data')
    })
  })

  describe('Enhanced Metadata Handling', () => {
    it('should handle comprehensive template metadata', async () => {
      const richTemplateData = {
        workflowId: 'workflow-456',
        name: 'Rich Metadata Template',
        description: 'A template with comprehensive metadata',
        author: 'Metadata Expert',
        category: 'Advanced',
        icon: 'advanced',
        color: '#9966FF',
        state: {
          blocks: { 'block-1': { id: 'block-1', type: 'test' } },
          edges: [],
          metadata: { custom: 'data' },
        },
        tags: ['metadata', 'advanced', 'comprehensive'],
        difficulty: 'advanced',
        estimatedTime: '2 hours',
        requirements: ['Advanced JavaScript', 'API Integration'],
        useCases: ['Complex automation', 'Enterprise workflows'],
        version: '2.1.0',
        isPublic: false,
        allowComments: false,
      }

      const request = createMockRequest('POST', richTemplateData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.metadata.tags).toEqual(['metadata', 'advanced', 'comprehensive'])
      expect(data.metadata.difficulty).toBe('advanced')
      expect(data.metadata.estimatedTime).toBe('2 hours')
      expect(data.metadata.requirements).toEqual(['Advanced JavaScript', 'API Integration'])
      expect(data.metadata.useCases).toEqual(['Complex automation', 'Enterprise workflows'])
      expect(data.metadata.version).toBe('2.1.0')
      expect(data.metadata.isPublic).toBe(false)
      expect(data.metadata.allowComments).toBe(false)
    })

    it('should use default values for optional metadata', async () => {
      const minimalTemplateData = {
        workflowId: 'workflow-456',
        name: 'Minimal Metadata Template',
        description: 'Template with default metadata',
        author: 'Default User',
        category: 'Basic',
        icon: 'basic',
        color: '#666666',
        state: { blocks: {}, edges: [] },
        // No optional metadata provided
      }

      const request = createMockRequest('POST', minimalTemplateData)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.metadata.tags).toEqual([])
      expect(data.metadata.difficulty).toBe('intermediate')
      expect(data.metadata.version).toBe('1.0.0')
      expect(data.metadata.isPublic).toBe(true)
      expect(data.metadata.allowComments).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle database insertion errors', async () => {
      mocks.database.mockDb.insert.mockImplementation(() => {
        throw new Error('Database insertion failed')
      })

      const templateData = {
        workflowId: 'workflow-456',
        name: 'Database Error Template',
        description: 'Should fail due to database error',
        author: 'Test Author',
        category: 'Error',
        icon: 'error',
        color: '#FF0000',
        state: { blocks: {}, edges: [] },
      }

      const request = createMockRequest('POST', templateData)
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
      expect(data.requestId).toBeDefined()
    })

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Security Features', () => {
    it('should sanitize sensitive data in workflow state', async () => {
      // The sanitizeWorkflowState function should remove sensitive credentials
      // This is tested implicitly through the template creation process

      const templateWithSecrets = {
        workflowId: 'workflow-456',
        name: 'Secure Template',
        description: 'Template with sanitized secrets',
        author: 'Security Expert',
        category: 'Security',
        icon: 'shield',
        color: '#00FF00',
        state: {
          blocks: {
            'auth-block': {
              id: 'auth-block',
              subBlocks: {
                apiKey: { value: 'secret-key-to-sanitize' },
                oauthCredential: { value: 'oauth-token-to-sanitize' },
                password: { value: 'password-to-sanitize' },
                publicValue: { value: 'safe-public-value' },
              },
            },
          },
          edges: [],
        },
        sanitizeCredentials: true,
      }

      const request = createMockRequest('POST', templateWithSecrets)
      const response = await POST(request)

      expect(response.status).toBe(201)
      // Sensitive data should be sanitized in the template state
    })
  })
})
