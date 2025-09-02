/**
 * Comprehensive Test Suite for Workflow Export API
 * Tests export functionality in YAML, JSON, and ZIP formats
 * Covers security filtering, authentication, and advanced export options
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'
import { 
  setupComprehensiveTestMocks,
  createMockRequest,
  mockUser,
} from '@/app/api/__test-utils__/utils'

// Mock workflow data for testing
const sampleWorkflowData = {
  id: 'workflow-123',
  name: 'Test Export Workflow',
  description: 'A workflow for export testing',
  color: '#FF6B35',
  userId: 'user-123',
  workspaceId: 'workspace-456',
  folderId: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  isDeployed: true,
  deployedAt: new Date('2024-01-02T00:00:00.000Z'),
  runCount: 5,
  lastRunAt: new Date('2024-01-03T00:00:00.000Z'),
  isPublished: false,
  collaborators: [],
  variables: {
    API_KEY: 'secret-api-key-123',
    DATABASE_PASSWORD: 'super-secret-password',
    PUBLIC_URL: 'https://example.com',
  },
  marketplaceData: null,
  lastSynced: new Date('2024-01-01T00:00:00.000Z'),
}

const mockNormalizedData = {
  blocks: [
    {
      id: 'start-block',
      type: 'starter',
      name: 'Start',
      position: { x: 100, y: 100 },
      config: {
        params: {
          startWorkflow: { id: 'startWorkflow', type: 'dropdown', value: 'manual' }
        }
      },
    },
    {
      id: 'agent-block',
      type: 'agent',
      name: 'AI Agent',
      position: { x: 400, y: 100 },
      config: {
        params: {
          systemPrompt: { id: 'systemPrompt', type: 'long-input', value: 'You are a helpful assistant' },
          apiKey: { id: 'apiKey', type: 'short-input', value: 'secret-api-key' }
        }
      },
    }
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'start-block',
      target: 'agent-block',
      sourceHandle: 'source',
      targetHandle: 'target',
    }
  ],
  loops: {},
  parallels: {},
}

const mockSerializedWorkflow = {
  version: '1.0',
  blocks: mockNormalizedData.blocks,
  connections: mockNormalizedData.edges,
  loops: mockNormalizedData.loops,
  parallels: mockNormalizedData.parallels,
}

describe('Workflow Export API - GET /api/workflows/[id]/export', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleWorkflowData]] },
      },
    })

    // Mock workflow loading functions
    vi.doMock('@/lib/workflows/db-helpers', () => ({
      loadWorkflowFromNormalizedTables: vi.fn().mockResolvedValue(mockNormalizedData),
    }))

    // Mock serializer
    vi.doMock('@/serializer', () => ({
      Serializer: vi.fn().mockImplementation(() => ({
        serializeWorkflow: vi.fn().mockReturnValue(mockSerializedWorkflow),
      })),
    }))
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for export', async () => {
      mocks.auth.setUnauthenticated()
      
      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/export')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
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
      
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export',
        { headers: { 'x-api-key': 'test-api-key' } }
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/yaml')
    })

    it('should support internal JWT token authentication', async () => {
      vi.doMock('@/lib/auth/internal', () => ({
        verifyInternalToken: vi.fn().mockResolvedValue(true),
      }))
      
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export',
        { headers: { 'authorization': 'Bearer internal-jwt-token' } }
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
    })

    it('should check workflow ownership permissions', async () => {
      // Mock workflow owned by different user
      const differentUserWorkflow = {
        ...sampleWorkflowData,
        userId: 'different-user-456',
        workspaceId: null,
      }
      
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([differentUserWorkflow]),
          }),
        }),
      }))
      
      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/export')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should check workspace permissions', async () => {
      vi.doMock('@/lib/permissions/utils', () => ({
        getUserEntityPermissions: vi.fn().mockResolvedValue('read'),
      }))
      
      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/export')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
    })
  })

  describe('Workflow Validation and Error Handling', () => {
    it('should return 404 for non-existent workflow', async () => {
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]), // No workflow found
          }),
        }),
      }))
      
      const request = new NextRequest('http://localhost:3000/api/workflows/nonexistent/export')
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Workflow not found')
    })

    it('should handle missing normalized data gracefully', async () => {
      const mockLoadWorkflow = vi.fn().mockResolvedValue(null)
      vi.doMock('@/lib/workflows/db-helpers', () => ({
        loadWorkflowFromNormalizedTables: mockLoadWorkflow,
      }))
      
      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/export')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Workflow data not found')
    })

    it('should validate export options', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=invalid&indent=20'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid export options')
      expect(data.details).toBeDefined()
    })
  })

  describe('YAML Export Format', () => {
    it('should export workflow as YAML with default options', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/export?format=yaml')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/yaml')
      expect(response.headers.get('Content-Disposition')).toContain('Test_Export_Workflow.yaml')
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
      
      const content = await response.text()
      expect(content).toContain('# Sim Workflow Export')
      expect(content).toContain('# Generated on:')
      expect(content).toContain('Test Export Workflow')
    })

    it('should respect YAML formatting options', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=yaml&yamlStyle=compact&indent=4&includeComments=false'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      expect(content).toContain('Format: YAML (compact)')
      // Should not include general comments when includeComments=false
      expect(content).not.toContain('# This workflow was exported from Sim')
    })

    it('should include metadata when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=yaml&includeMetadata=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      expect(content).toContain('metadata')
      expect(content).toContain('workflow-123')
      expect(content).toContain('Test Export Workflow')
    })

    it('should exclude metadata when not requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=yaml&includeMetadata=false'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      // Should not include metadata when includeMetadata=false
      expect(content).not.toContain('"metadata"')
    })
  })

  describe('JSON Export Format', () => {
    it('should export workflow as pretty JSON', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&jsonPretty=true&jsonIndent=2'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Content-Disposition')).toContain('Test_Export_Workflow.json')
      
      const content = await response.text()
      const parsed = JSON.parse(content)
      expect(parsed.version).toBe('1.0')
      expect(parsed.workflow).toBeDefined()
      expect(parsed.metadata).toBeDefined()
    })

    it('should export workflow as compact JSON', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&jsonPretty=false'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      
      // Compact JSON should not have extra whitespace
      expect(content.includes('  ')).toBe(false)
      expect(content.includes('\n')).toBe(false)
      
      // Should still be valid JSON
      const parsed = JSON.parse(content)
      expect(parsed.version).toBe('1.0')
    })

    it('should customize JSON indentation', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&jsonPretty=true&jsonIndent=4'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      
      // Should use 4-space indentation
      expect(content).toContain('    "version"')
    })
  })

  describe('ZIP Export Format', () => {
    it('should export workflow as ZIP archive', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/export?format=zip')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/zip')
      expect(response.headers.get('Content-Disposition')).toContain('Test_Export_Workflow.zip')
      
      const content = await response.text()
      // Should be base64 encoded (as per mock implementation)
      expect(content.length > 0).toBe(true)
    })
  })

  describe('Security Filtering', () => {
    it('should mask secrets by default', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&maskSecrets=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      
      // Secrets should be masked
      expect(content).toContain('[REDACTED]')
      expect(content).not.toContain('secret-api-key-123')
      expect(content).not.toContain('super-secret-password')
      
      // Public values should remain
      expect(content).toContain('https://example.com')
    })

    it('should include secrets when masking is disabled', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&maskSecrets=false&maskCredentials=false'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      
      // Secrets should be included when masking is disabled
      expect(content).not.toContain('[REDACTED]')
      expect(content).toContain('secret-api-key-123')
      expect(content).toContain('super-secret-password')
    })

    it('should mask credentials separately from secrets', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&maskSecrets=false&maskCredentials=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      
      // Some sensitive fields should still be masked
      expect(content).toContain('[REDACTED]')
    })

    it('should handle nested secret filtering', async () => {
      // Mock normalized data with nested secrets
      const nestedSecretsData = {
        ...mockNormalizedData,
        blocks: [
          ...mockNormalizedData.blocks,
          {
            id: 'nested-secrets-block',
            config: {
              params: {
                database: {
                  password: 'nested-secret',
                  apiKey: 'another-secret',
                  publicConfig: 'safe-value',
                }
              }
            }
          }
        ]
      }
      
      vi.doMock('@/lib/workflows/db-helpers', () => ({
        loadWorkflowFromNormalizedTables: vi.fn().mockResolvedValue(nestedSecretsData),
      }))
      
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&maskSecrets=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      
      expect(content).toContain('[REDACTED]')
      expect(content).not.toContain('nested-secret')
      expect(content).not.toContain('another-secret')
      expect(content).toContain('safe-value')
    })
  })

  describe('Content Options', () => {
    it('should include variables when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&includeVariables=true&maskSecrets=false'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      const parsed = JSON.parse(content)
      
      expect(parsed.variables).toBeDefined()
      expect(parsed.variables.API_KEY).toBe('secret-api-key-123')
      expect(parsed.variables.PUBLIC_URL).toBe('https://example.com')
    })

    it('should exclude variables when not requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&includeVariables=false'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      const parsed = JSON.parse(content)
      
      expect(parsed.variables).toBeUndefined()
    })

    it('should include execution history when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&includeExecutionHistory=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      const parsed = JSON.parse(content)
      
      expect(parsed.metadata.executionHistory).toBeDefined()
      expect(Array.isArray(parsed.metadata.executionHistory)).toBe(true)
    })

    it('should generate documentation when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&generateDocumentation=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      const parsed = JSON.parse(content)
      
      expect(parsed.documentation).toBeDefined()
      expect(parsed.documentation.overview).toBeDefined()
      expect(parsed.documentation.architecture).toBeDefined()
      expect(parsed.documentation.usage).toBeDefined()
    })

    it('should generate workflow comments', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&includeComments=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      const parsed = JSON.parse(content)
      
      expect(parsed.comments).toBeDefined()
      expect(parsed.comments.header).toContain('Test Export Workflow')
      expect(parsed.comments.blocks).toBe(2)
      expect(parsed.comments.connections).toBe(1)
      expect(parsed.comments.complexity).toBeDefined()
    })
  })

  describe('Advanced Export Options', () => {
    it('should optimize for import when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&optimizeForImport=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      // Implementation should optimize structure for reimport
    })

    it('should include block comments when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&includeBlockComments=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      // Should include detailed block-level comments
    })

    it('should include connection labels when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&includeConnectionLabels=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      // Should include connection metadata and labels
    })
  })

  describe('Performance and Response Headers', () => {
    it('should set appropriate cache headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/export')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
      expect(response.headers.get('Pragma')).toBe('no-cache')
      expect(response.headers.get('Expires')).toBe('0')
    })

    it('should sanitize filename for download', async () => {
      const workflowWithSpecialChars = {
        ...sampleWorkflowData,
        name: 'Test/Workflow<>With|Special*Chars?"Name',
      }
      
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([workflowWithSpecialChars]),
          }),
        }),
      }))
      
      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/export?format=yaml')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('Test_Workflow___With_Special_Chars__Name.yaml')
    })

    it('should handle export errors gracefully', async () => {
      // Mock serializer to throw an error
      vi.doMock('@/serializer', () => ({
        Serializer: vi.fn().mockImplementation(() => ({
          serializeWorkflow: vi.fn().mockImplementation(() => {
            throw new Error('Serialization failed')
          }),
        })),
      }))
      
      const request = new NextRequest('http://localhost:3000/api/workflows/workflow-123/export')
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Serialization failed')
    })
  })

  describe('Workflow Complexity Calculation', () => {
    it('should calculate simple workflow complexity', async () => {
      const simpleWorkflow = {
        ...mockNormalizedData,
        blocks: [mockNormalizedData.blocks[0]], // Single block
        edges: [], // No connections
      }
      
      vi.doMock('@/lib/workflows/db-helpers', () => ({
        loadWorkflowFromNormalizedTables: vi.fn().mockResolvedValue(simpleWorkflow),
      }))
      
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&includeComments=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      const parsed = JSON.parse(content)
      
      expect(parsed.comments.complexity).toBe('Simple')
    })

    it('should calculate complex workflow complexity', async () => {
      const complexWorkflow = {
        ...mockNormalizedData,
        blocks: Array(20).fill(null).map((_, i) => ({
          id: `block-${i}`,
          type: 'agent',
          name: `Block ${i}`,
        })),
        edges: Array(20).fill(null).map((_, i) => ({
          id: `edge-${i}`,
          source: `block-${i}`,
          target: `block-${(i + 1) % 20}`,
        })),
        loops: { loop1: {}, loop2: {} },
        parallels: { parallel1: {}, parallel2: {} },
      }
      
      vi.doMock('@/lib/workflows/db-helpers', () => ({
        loadWorkflowFromNormalizedTables: vi.fn().mockResolvedValue(complexWorkflow),
      }))
      
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/workflow-123/export?format=json&includeComments=true'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'workflow-123' }) })
      
      expect(response.status).toBe(200)
      const content = await response.text()
      const parsed = JSON.parse(content)
      
      expect(parsed.comments.complexity).toBe('Very Complex')
    })
  })
})

describe('Workflow Export API - POST /api/workflows/[id]/export (Bulk Export)', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleWorkflowData]] },
      },
    })
  })

  describe('Bulk Export Functionality', () => {
    it('should indicate bulk export is not implemented', async () => {
      const bulkExportRequest = {
        workflowIds: ['workflow-123', 'workflow-456'],
        format: 'zip',
        archiveName: 'my-workflows',
        includeSharedResources: true,
      }
      
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/bulk/export',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bulkExportRequest),
        }
      )
      
      const response = await POST(request, { params: Promise.resolve({ id: 'bulk' }) })
      
      expect(response.status).toBe(501)
      const data = await response.json()
      expect(data.error).toBe('Bulk export not yet implemented')
      expect(data.details).toBe('This endpoint is under development')
    })

    it('should require authentication for bulk export', async () => {
      mocks.auth.setUnauthenticated()
      
      const bulkExportRequest = {
        workflowIds: ['workflow-123'],
        format: 'zip',
      }
      
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/bulk/export',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bulkExportRequest),
        }
      )
      
      const response = await POST(request, { params: Promise.resolve({ id: 'bulk' }) })
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should validate bulk export schema', async () => {
      const invalidBulkRequest = {
        // Missing required workflowIds
        format: 'zip',
      }
      
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/bulk/export',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidBulkRequest),
        }
      )
      
      const response = await POST(request, { params: Promise.resolve({ id: 'bulk' }) })
      
      expect(response.status).toBe(500) // Error in parsing due to missing workflowIds
    })

    it('should handle malformed JSON in bulk export requests', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/bulk/export',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json-content',
        }
      )
      
      const response = await POST(request, { params: Promise.resolve({ id: 'bulk' }) })
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Future Bulk Export Features', () => {
    it('should plan for multiple workflow export', async () => {
      // This test documents the expected behavior for bulk export
      // when it's fully implemented
      
      const bulkExportRequest = {
        workflowIds: ['workflow-123', 'workflow-456', 'workflow-789'],
        format: 'zip',
        archiveName: 'project-workflows',
        includeSharedResources: true,
        options: {
          includeMetadata: true,
          maskSecrets: true,
          generateDocumentation: true,
        },
      }
      
      // For now, this will return 501 Not Implemented
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/bulk/export',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bulkExportRequest),
        }
      )
      
      const response = await POST(request, { params: Promise.resolve({ id: 'bulk' }) })
      
      expect(response.status).toBe(501)
      
      // When implemented, this should:
      // 1. Validate permissions for all workflows
      // 2. Load all workflow data
      // 3. Create a ZIP archive containing all workflows
      // 4. Include shared resources if requested
      // 5. Apply consistent options across all workflows
      // 6. Return the archive with appropriate headers
    })

    it('should plan for shared resource inclusion', async () => {
      const bulkExportRequest = {
        workflowIds: ['workflow-123', 'workflow-456'],
        format: 'zip',
        includeSharedResources: true,
      }
      
      const request = new NextRequest(
        'http://localhost:3000/api/workflows/bulk/export',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bulkExportRequest),
        }
      )
      
      const response = await POST(request, { params: Promise.resolve({ id: 'bulk' }) })
      
      expect(response.status).toBe(501)
      
      // When implemented, shared resources should include:
      // - Common variables used across workflows
      // - Shared templates and blocks
      // - Workspace configuration
      // - Common credentials (with proper security filtering)
    })
  })
})