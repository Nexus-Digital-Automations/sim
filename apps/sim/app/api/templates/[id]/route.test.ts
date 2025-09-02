/**
 * Comprehensive Test Suite for Individual Template Management API
 * Tests template retrieval, updates, deletion, and analytics
 * Covers comprehensive template data, user interactions, and security
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockRequest,
  mockUser,
  setupComprehensiveTestMocks,
} from '@/app/api/__test-utils__/utils'
import { DELETE, GET, PUT } from './route'

// Mock template data for testing
const sampleTemplateData = {
  id: 'template-123',
  workflowId: 'workflow-456',
  userId: 'user-123',
  name: 'Comprehensive AI Template',
  description: 'A detailed template for AI automation workflows',
  author: 'Template Expert',
  views: 250,
  stars: 45,
  color: '#FF6B35',
  icon: 'ai-workflow',
  category: 'AI & Automation',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-15T00:00:00.000Z'),
  state: {
    blocks: {
      'start-block': {
        id: 'start-block',
        type: 'starter',
        subBlocks: {
          apiKey: { id: 'apiKey', type: 'password', value: 'secret-key' },
          publicConfig: { id: 'publicConfig', type: 'text', value: 'public-value' },
        },
      },
      'ai-block': {
        id: 'ai-block',
        type: 'ai-agent',
        subBlocks: {
          model: { id: 'model', type: 'dropdown', value: 'gpt-4o' },
        },
      },
    },
    edges: [{ id: 'edge-1', source: 'start-block', target: 'ai-block' }],
    metadata: {
      template: {
        tags: ['ai', 'automation', 'gpt'],
        difficulty: 'intermediate',
        version: '1.2.0',
        estimatedTime: '45 minutes',
        requirements: ['OpenAI API Key', 'Basic AI knowledge'],
        useCases: ['Content generation', 'Data analysis'],
        isPublic: true,
        allowComments: true,
      },
    },
  },
}

const mockRelatedTemplates = [
  {
    id: 'related-1',
    name: 'Similar AI Template',
    author: 'Template Expert',
    category: 'AI & Automation',
    views: 100,
    stars: 20,
    color: '#3972F6',
    icon: 'ai',
    createdAt: new Date('2024-01-10T00:00:00.000Z'),
  },
]

const mockSimilarTemplates = [
  {
    id: 'similar-1',
    name: 'Another AI Template',
    author: 'Another Expert',
    views: 150,
    stars: 30,
    color: '#9966FF',
    icon: 'automation',
    description: 'Similar automation template',
  },
]

const mockCategoryStats = {
  totalTemplates: 25,
  avgStars: 4.2,
  totalViews: 5000,
  topAuthor: 'Template Expert',
}

describe('Individual Template API - GET /api/templates/[id]', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleTemplateData]] },
        update: { results: [] }, // For view count increment
      },
    })

    // Mock complex query building for related data
    mocks.database.mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue([sampleTemplateData]),
    }))

    mocks.database.mockDb.update.mockImplementation(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnValue(Promise.resolve()),
    }))
  })

  describe('Basic Template Retrieval', () => {
    it('should retrieve template with basic data', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.id).toBe('template-123')
      expect(data.data.name).toBe('Comprehensive AI Template')
      expect(data.data.description).toBe('A detailed template for AI automation workflows')
      expect(data.data.views).toBe(251) // Incremented by 1
      expect(data.meta.requestId).toBeDefined()
      expect(data.meta.processingTime).toBeDefined()
      expect(data.meta.isAuthenticated).toBe(true)
    })

    it('should return 404 for non-existent template', async () => {
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(Promise.resolve([])), // No template found
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Template not found')
    })

    it('should handle view tracking parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates/template-123?trackView=false'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.views).toBe(250) // Not incremented
      expect(data.meta.optionsUsed.viewTracked).toBe(false)
    })

    it('should include user star status when authenticated', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.isStarred).toBeDefined()
    })
  })

  describe('Enhanced Data Retrieval Options', () => {
    it('should include related templates when requested', async () => {
      // Mock additional queries for related data
      let queryCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation(() => {
          queryCount++
          if (queryCount === 1) return Promise.resolve([sampleTemplateData])
          if (queryCount === 2) return Promise.resolve(mockRelatedTemplates)
          return Promise.resolve([])
        }),
      }))

      const request = new NextRequest(
        'http://localhost:3000/api/templates/template-123?includeRelated=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.relatedTemplates).toBeDefined()
      expect(Array.isArray(data.relatedTemplates)).toBe(true)
      expect(data.meta.optionsUsed.includeRelated).toBe(true)
    })

    it('should include similar templates when requested', async () => {
      let queryCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation(() => {
          queryCount++
          if (queryCount === 1) return Promise.resolve([sampleTemplateData])
          if (queryCount === 2) return Promise.resolve(mockSimilarTemplates)
          return Promise.resolve([])
        }),
      }))

      const request = new NextRequest(
        'http://localhost:3000/api/templates/template-123?includeSimilar=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.similarTemplates).toBeDefined()
      expect(Array.isArray(data.similarTemplates)).toBe(true)
      expect(data.meta.optionsUsed.includeSimilar).toBe(true)
    })

    it('should include category statistics when requested', async () => {
      let queryCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation(() => {
          queryCount++
          if (queryCount === 1) return Promise.resolve([sampleTemplateData])
          if (queryCount === 2) return Promise.resolve([mockCategoryStats])
          return Promise.resolve([])
        }),
      }))

      const request = new NextRequest(
        'http://localhost:3000/api/templates/template-123?includeStats=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.categoryStats).toBeDefined()
      expect(data.categoryStats.totalTemplates).toBe(25)
      expect(data.categoryStats.averageStars).toBe(4.2)
      expect(data.usageStats).toBeDefined()
      expect(data.usageStats.totalUses).toBeDefined()
      expect(data.meta.optionsUsed.includeStats).toBe(true)
    })

    it('should include comprehensive data with all options enabled', async () => {
      let queryCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation(() => {
          queryCount++
          if (queryCount === 1) return Promise.resolve([sampleTemplateData])
          if (queryCount === 2) return Promise.resolve(mockRelatedTemplates)
          if (queryCount === 3) return Promise.resolve(mockSimilarTemplates)
          if (queryCount === 4) return Promise.resolve([mockCategoryStats])
          return Promise.resolve([])
        }),
      }))

      const request = new NextRequest(
        'http://localhost:3000/api/templates/template-123?includeStats=true&includeRelated=true&includeSimilar=true&trackView=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.relatedTemplates).toBeDefined()
      expect(data.similarTemplates).toBeDefined()
      expect(data.categoryStats).toBeDefined()
      expect(data.usageStats).toBeDefined()
      expect(data.data.views).toBe(251) // View tracked
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for template access', async () => {
      mocks.auth.setUnauthenticated()

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should authenticate with API key', async () => {
      mocks.auth.setUnauthenticated()
      const apiKeyResults = [{ userId: 'user-123' }]

      let selectCallCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => {
              selectCallCount++
              if (selectCallCount === 1) return Promise.resolve(apiKeyResults) // API key lookup
              return Promise.resolve([sampleTemplateData]) // Template lookup
            },
          }),
        }),
      }))

      const request = createMockRequest('GET', undefined, { 'x-api-key': 'test-api-key' })
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
    })

    it('should support internal JWT token authentication', async () => {
      vi.doMock('@/lib/auth/internal', () => ({
        verifyInternalToken: vi.fn().mockResolvedValue(true),
      }))

      const request = createMockRequest('GET', undefined, {
        authorization: 'Bearer internal-jwt-token',
      })
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
    })
  })

  describe('View Count Management', () => {
    it('should increment view count by default', async () => {
      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.views).toBe(251) // Original 250 + 1
      expect(mocks.database.mockDb.update).toHaveBeenCalled()
    })

    it('should handle view count increment errors gracefully', async () => {
      mocks.database.mockDb.update.mockImplementation(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          throw new Error('View update failed')
        }),
      }))

      const request = createMockRequest('GET')
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200) // Should not fail the request
      const data = await response.json()
      expect(data.data.views).toBe(250) // Original count maintained
    })

    it('should skip view tracking when disabled', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates/template-123?trackView=false'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.views).toBe(250) // Not incremented
      expect(mocks.database.mockDb.update).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should validate query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/templates/template-123?includeStats=invalid&trackView=notBoolean'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

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
      const response = await GET(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
      expect(data.requestId).toBeDefined()
    })
  })
})

describe('Individual Template API - PUT /api/templates/[id]', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleTemplateData]] },
        update: { results: [{ ...sampleTemplateData, updatedAt: new Date() }] },
      },
    })

    // Mock permission check functions
    vi.doMock('@/lib/permissions/utils', () => ({
      hasAdminPermission: vi.fn().mockResolvedValue(true),
    }))
  })

  describe('Template Updates', () => {
    it('should update template basic fields', async () => {
      const updateData = {
        name: 'Updated Template Name',
        description: 'Updated description with new details',
        author: 'Updated Author',
        category: 'Updated Category',
        icon: 'updated-icon',
        color: '#00FF00',
      }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toBeDefined()
      expect(data.message).toBe('Template updated successfully')
      expect(data.changes.fieldsUpdated).toContain('name')
      expect(data.changes.fieldsUpdated).toContain('description')
      expect(data.changes.fieldsUpdated).toContain('author')
      expect(data.meta.requestId).toBeDefined()
      expect(data.meta.processingTime).toBeDefined()
    })

    it('should update template state with sanitization', async () => {
      const updateData = {
        state: {
          blocks: {
            'updated-block': {
              id: 'updated-block',
              type: 'new-type',
              subBlocks: {
                apiKey: { value: 'new-secret-key' },
                publicValue: { value: 'new-public-value' },
              },
            },
          },
          edges: [{ id: 'new-edge', source: 'a', target: 'b' }],
          metadata: { updated: true },
        },
        sanitizeCredentials: true,
      }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.changes.sanitizedCredentials).toBe(true)
      expect(data.changes.fieldsUpdated).toContain('state')
    })

    it('should update template metadata', async () => {
      const updateData = {
        tags: ['updated', 'tags', 'new'],
        difficulty: 'advanced',
        estimatedTime: '2 hours',
        requirements: ['Updated requirements'],
        useCases: ['Updated use cases'],
        version: '2.0.0',
        isPublic: false,
        allowComments: false,
      }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Template updated successfully')
    })

    it('should auto-increment version when requested', async () => {
      const updateData = {
        name: 'Version Increment Test',
        incrementVersion: true,
      }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.changes.versionIncremented).toBe(true)
    })

    it('should preserve existing metadata when partially updating', async () => {
      const updateData = {
        name: 'Partial Update Test',
        tags: ['new', 'tags'],
        // Other metadata should be preserved
      }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.changes.fieldsUpdated).toContain('name')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for template updates', async () => {
      mocks.auth.setUnauthenticated()

      const updateData = { name: 'Unauthorized Update' }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should authenticate with API key', async () => {
      mocks.auth.setUnauthenticated()
      const apiKeyResults = [{ userId: 'user-123' }]

      let selectCallCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => {
              selectCallCount++
              if (selectCallCount === 1) return Promise.resolve(apiKeyResults) // API key lookup
              return Promise.resolve([sampleTemplateData]) // Template lookup
            },
          }),
        }),
      }))

      const updateData = { name: 'API Key Update' }

      const request = createMockRequest('PUT', updateData, { 'x-api-key': 'test-api-key' })
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
    })

    it('should check template ownership permissions', async () => {
      const differentUserTemplate = {
        ...sampleTemplateData,
        userId: 'different-user-456',
        workflowId: null, // No workspace fallback
      }

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([differentUserTemplate]),
          }),
        }),
      }))

      const updateData = { name: 'Unauthorized Update' }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should allow workspace admin to update template', async () => {
      const differentUserTemplate = {
        ...sampleTemplateData,
        userId: 'different-user-456',
        workflowId: 'workflow-with-workspace',
      }

      const workflowWithWorkspace = {
        workspaceId: 'workspace-789',
      }

      let selectCallCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => {
              selectCallCount++
              if (selectCallCount === 1) return Promise.resolve([differentUserTemplate])
              if (selectCallCount === 2) return Promise.resolve([workflowWithWorkspace])
              return Promise.resolve([])
            },
          }),
        }),
      }))

      const updateData = { name: 'Admin Update' }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
    })
  })

  describe('Template Validation', () => {
    it('should return 404 for non-existent template', async () => {
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]), // No template found
          }),
        }),
      }))

      const updateData = { name: 'Update Non-existent' }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'nonexistent' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Template not found')
    })

    it('should validate update data schema', async () => {
      const invalidUpdateData = {
        name: 'x'.repeat(150), // Too long
        color: 'invalid-color',
        difficulty: 'invalid-difficulty',
      }

      const request = createMockRequest('PUT', invalidUpdateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid template data')
      expect(data.details).toBeDefined()
    })

    it('should handle partial updates correctly', async () => {
      const partialUpdateData = {
        name: 'Only Name Update',
        // Other fields should remain unchanged
      }

      const request = createMockRequest('PUT', partialUpdateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.changes.fieldsUpdated).toEqual(['name'])
    })
  })

  describe('Version Management', () => {
    it('should increment patch version correctly', async () => {
      const templateWithVersion = {
        ...sampleTemplateData,
        state: {
          ...sampleTemplateData.state,
          metadata: {
            template: {
              version: '1.2.3',
            },
          },
        },
      }

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([templateWithVersion]),
          }),
        }),
      }))

      const updateData = {
        name: 'Version Test',
        incrementVersion: true,
      }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.changes.versionIncremented).toBe(true)
    })

    it('should handle missing version gracefully', async () => {
      const templateWithoutVersion = {
        ...sampleTemplateData,
        state: {
          ...sampleTemplateData.state,
          metadata: {}, // No version info
        },
      }

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([templateWithoutVersion]),
          }),
        }),
      }))

      const updateData = {
        name: 'No Version Test',
        incrementVersion: true,
      }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('should handle database update errors', async () => {
      mocks.database.mockDb.update.mockImplementation(() => {
        throw new Error('Database update failed')
      })

      const updateData = { name: 'Failed Update' }

      const request = createMockRequest('PUT', updateData)
      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
      expect(data.requestId).toBeDefined()
    })

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates/template-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })
})

describe('Individual Template API - DELETE /api/templates/[id]', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleTemplateData]] },
        delete: { results: [] },
      },
    })

    vi.doMock('@/lib/permissions/utils', () => ({
      hasAdminPermission: vi.fn().mockResolvedValue(true),
    }))
  })

  describe('Template Deletion', () => {
    it('should delete template successfully', async () => {
      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should return 404 for non-existent template', async () => {
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]), // No template found
          }),
        }),
      }))

      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Template not found')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for template deletion', async () => {
      mocks.auth.setUnauthenticated()

      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should check template ownership for deletion', async () => {
      const differentUserTemplate = {
        ...sampleTemplateData,
        userId: 'different-user-456',
        workflowId: null, // No workspace fallback
      }

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([differentUserTemplate]),
          }),
        }),
      }))

      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should allow workspace admin to delete template', async () => {
      const differentUserTemplate = {
        ...sampleTemplateData,
        userId: 'different-user-456',
        workflowId: 'workflow-with-workspace',
      }

      const workflowWithWorkspace = {
        workspaceId: 'workspace-789',
      }

      let selectCallCount = 0
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => {
              selectCallCount++
              if (selectCallCount === 1) return Promise.resolve([differentUserTemplate])
              if (selectCallCount === 2) return Promise.resolve([workflowWithWorkspace])
              return Promise.resolve([])
            },
          }),
        }),
      }))

      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle database deletion errors', async () => {
      mocks.database.mockDb.delete.mockImplementation(() => {
        throw new Error('Database deletion failed')
      })

      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle permission check errors gracefully', async () => {
      const { hasAdminPermission } = await import('@/lib/permissions/utils')
      vi.mocked(hasAdminPermission).mockRejectedValue(new Error('Permission check failed'))

      const differentUserTemplate = {
        ...sampleTemplateData,
        userId: 'different-user-456',
        workflowId: 'workflow-with-workspace',
      }

      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([differentUserTemplate]),
          }),
        }),
      }))

      const request = createMockRequest('DELETE')
      const response = await DELETE(request, { params: Promise.resolve({ id: 'template-123' }) })

      expect(response.status).toBe(500)
    })
  })
})
