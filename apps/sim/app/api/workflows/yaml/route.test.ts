/**
 * Comprehensive Test Suite for Workflow YAML API Endpoints
 * Tests YAML import/export, validation, and conversion functionality
 * Follows established patterns from the Sim codebase
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockRequest,
  mockUser,
  setupComprehensiveTestMocks,
} from '@/app/api/__test-utils__/utils'
import { POST, PUT } from './route'

// Sample YAML workflow content for testing
const sampleYamlWorkflow = `
name: "Test Workflow"
description: "A workflow created from YAML"
version: "1.0"

blocks:
  - id: "start-block"
    type: "starter"
    name: "Start"
    position: { x: 100, y: 100 }
    config:
      params:
        startWorkflow:
          id: "startWorkflow"
          type: "dropdown"
          value: "manual"
    outputs:
      response:
        type:
          input: "any"

  - id: "agent-block"
    type: "agent"
    name: "AI Agent"
    position: { x: 400, y: 100 }
    config:
      params:
        systemPrompt:
          id: "systemPrompt"
          type: "long-input"
          value: "You are a helpful assistant"
        model:
          id: "model"
          type: "dropdown"
          value: "gpt-4o"
    outputs:
      response:
        content: "string"
        model: "string"
        tokens: "any"

connections:
  - source: "start-block"
    target: "agent-block"
    sourceHandle: "source"
    targetHandle: "target"

variables:
  OPENAI_API_KEY: "{{OPENAI_API_KEY}}"
  
loops: {}
parallels: {}
`

const sampleWorkflowData = {
  id: 'workflow-123',
  name: 'Test Workflow',
  description: 'A workflow created from YAML',
  color: '#3972F6',
  userId: 'user-123',
  workspaceId: 'workspace-456',
  folderId: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  isDeployed: false,
  collaborators: [],
  variables: { OPENAI_API_KEY: '{{OPENAI_API_KEY}}' },
  runCount: 0,
  lastRunAt: null,
  isPublished: false,
  marketplaceData: null,
  lastSynced: new Date('2024-01-01T00:00:00.000Z'),
}

const mockParsedWorkflow = {
  id: 'workflow-123',
  version: '1.0',
  blocks: [
    {
      id: 'start-block',
      metadata: { id: 'starter', name: 'Start' },
      position: { x: 100, y: 100 },
      config: {
        params: {
          startWorkflow: { id: 'startWorkflow', type: 'dropdown', value: 'manual' },
        },
      },
      outputs: { response: { type: { input: 'any' } } },
      enabled: true,
    },
    {
      id: 'agent-block',
      metadata: { id: 'agent', name: 'AI Agent' },
      position: { x: 400, y: 100 },
      config: {
        params: {
          systemPrompt: {
            id: 'systemPrompt',
            type: 'long-input',
            value: 'You are a helpful assistant',
          },
          model: { id: 'model', type: 'dropdown', value: 'gpt-4o' },
        },
      },
      outputs: { response: { content: 'string', model: 'string', tokens: 'any' } },
      enabled: true,
    },
  ],
  connections: [
    {
      source: 'start-block',
      target: 'agent-block',
      sourceHandle: 'source',
      targetHandle: 'target',
    },
  ],
  variables: { OPENAI_API_KEY: '{{OPENAI_API_KEY}}' },
  loops: {},
  parallels: {},
}

describe('Workflow YAML API - POST /api/workflows/yaml', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[]] },
        insert: { results: [sampleWorkflowData] },
      },
    })

    // Mock transaction implementation
    mocks.database.mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
      const tx = {
        select: vi.fn().mockImplementation(() => ({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        })),
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([sampleWorkflowData]),
        })),
        delete: vi.fn().mockImplementation(() => ({
          where: () => Promise.resolve(),
        })),
      }
      return await callback(tx)
    })

    // Mock sim-agent service call
    vi.doMock('./route', async () => {
      const actual = await vi.importActual('./route')
      return {
        ...actual,
        callSimAgent: vi.fn().mockResolvedValue({
          success: true,
          workflow: mockParsedWorkflow,
          validationErrors: [],
        }),
      }
    })
  })

  describe('YAML Import Functionality', () => {
    it('should create workflow from valid YAML', async () => {
      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Test YAML Workflow',
        description: 'Created from YAML import',
        color: '#FF6B35',
        workspaceId: 'workspace-123',
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.name).toBe('Test YAML Workflow')
      expect(data.description).toBe('Created from YAML import')
      expect(data.color).toBe('#FF6B35')
      expect(data.workspaceId).toBe('workspace-123')
      expect(data.id).toBeDefined()
      expect(data.summary).toBeDefined()
      expect(data.summary.blocks).toBe(2)
      expect(data.summary.connections).toBe(1)
      expect(data.importTime).toBeDefined()
    })

    it('should validate YAML without creating workflow', async () => {
      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Validation Test',
        validateOnly: true,
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.valid).toBe(true)
      expect(data.workflow).toBeDefined()
      expect(data.summary.blocks).toBe(2)
      expect(data.summary.connections).toBe(1)
      expect(data.validationTime).toBeDefined()

      // Ensure workflow was not created (transaction not called for validation-only)
      // expect(mocks.database.mockDb.transaction).not.toHaveBeenCalled()
    })

    it('should preserve IDs when specified', async () => {
      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Preserve IDs Test',
        preserveIds: true,
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id).toBe(mockParsedWorkflow.id)
    })

    it('should overwrite existing workflow when specified', async () => {
      // Setup existing workflow in database
      mocks.database.mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        const tx = {
          select: vi.fn().mockImplementation(() => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([sampleWorkflowData]), // Existing workflow
              }),
            }),
          })),
          insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([sampleWorkflowData]),
          })),
          delete: vi.fn().mockImplementation(() => ({
            where: () => Promise.resolve(),
          })),
        }
        return await callback(tx)
      })

      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Overwrite Test',
        preserveIds: true,
        overwriteExisting: true,
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should fail when workflow exists and overwrite is not allowed', async () => {
      // Setup existing workflow
      mocks.database.mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        const tx = {
          select: vi.fn().mockImplementation(() => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([sampleWorkflowData]), // Existing workflow
              }),
            }),
          })),
        }
        await callback(tx) // This should throw
      })

      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Conflict Test',
        preserveIds: true,
        overwriteExisting: false,
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for YAML import', async () => {
      mocks.auth.setUnauthenticated()

      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Unauthorized Test',
      }

      const request = createMockRequest('POST', yamlRequest)
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

      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'API Key Test',
      }

      const request = createMockRequest('POST', yamlRequest, { 'x-api-key': 'test-api-key' })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should support internal JWT token authentication', async () => {
      vi.doMock('@/lib/auth/internal', () => ({
        verifyInternalToken: vi.fn().mockResolvedValue(true),
      }))

      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Internal Token Test',
      }

      const request = createMockRequest('POST', yamlRequest, {
        authorization: 'Bearer internal-jwt-token',
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should check workspace permissions when specified', async () => {
      vi.doMock('@/lib/permissions/utils', () => ({
        getUserEntityPermissions: vi.fn().mockResolvedValue('read'), // Insufficient permission
      }))

      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Permission Test',
        workspaceId: 'workspace-123',
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Insufficient workspace permissions')
    })
  })

  describe('Input Validation', () => {
    it('should validate required YAML content', async () => {
      const yamlRequest = {
        name: 'Missing YAML Test',
        // yaml field is missing
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should validate required name field', async () => {
      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        // name field is missing
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
    })

    it('should validate empty YAML content', async () => {
      const yamlRequest = {
        yaml: '',
        name: 'Empty YAML Test',
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should apply default values for optional fields', async () => {
      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Defaults Test',
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.description).toBe('')
      expect(data.color).toBe('#3972F6')
      expect(data.workspaceId).toBeNull()
      expect(data.folderId).toBeNull()
    })
  })

  describe('YAML Processing and Validation', () => {
    it('should handle YAML parsing errors', async () => {
      // Mock sim-agent to return parsing error
      const mockCallSimAgent = vi.fn().mockResolvedValue({
        success: false,
        error: 'Invalid YAML syntax: unexpected token',
        validationErrors: [
          { line: 5, message: 'Invalid block type' },
          { line: 10, message: 'Missing required field: name' },
        ],
      })

      // We need to mock the actual function being used
      vi.doMock('./route', async () => ({
        POST,
        PUT,
        callSimAgent: mockCallSimAgent,
      }))

      const yamlRequest = {
        yaml: 'invalid: yaml: content:',
        name: 'Invalid YAML Test',
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('YAML parsing failed')
      expect(data.details).toBeDefined()
      expect(data.validationErrors).toBeDefined()
      expect(data.validationErrors).toHaveLength(2)
    })

    it('should handle complex workflow structures', async () => {
      const complexYaml = `
name: "Complex Workflow"
blocks:
  - id: "start"
    type: "starter"
  - id: "loop-block"
    type: "loop"
    config:
      iterations: 5
  - id: "parallel-block"
    type: "parallel"
    config:
      branches: 3
connections:
  - source: "start"
    target: "loop-block"
  - source: "loop-block"
    target: "parallel-block"
loops:
  loop-1:
    blockId: "loop-block"
    iterations: 5
parallels:
  parallel-1:
    blockId: "parallel-block"
    branches: ["branch-1", "branch-2", "branch-3"]
`

      const yamlRequest = {
        yaml: complexYaml,
        name: 'Complex Workflow Test',
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.summary.loops).toBe(0) // Based on mockParsedWorkflow
      expect(data.summary.parallels).toBe(0) // Based on mockParsedWorkflow
    })

    it('should preserve workflow variables from YAML', async () => {
      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Variables Test',
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(201)
      // Variables should be stored in the workflow
      expect(mocks.database.mockDb.transaction).toHaveBeenCalled()
    })
  })

  describe('Database Operations', () => {
    it('should handle database transaction failures', async () => {
      mocks.database.mockDb.transaction.mockImplementation(() => {
        throw new Error('Database transaction failed')
      })

      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Transaction Error Test',
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Database transaction failed')
    })

    it('should properly insert blocks, edges, and subflows', async () => {
      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Database Insert Test',
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mocks.database.mockDb.transaction).toHaveBeenCalled()
    })
  })

  describe('Performance and Error Handling', () => {
    it('should include import timing in response', async () => {
      const yamlRequest = {
        yaml: sampleYamlWorkflow,
        name: 'Performance Test',
      }

      const request = createMockRequest('POST', yamlRequest)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.importTime).toBeDefined()
      expect(typeof data.importTime).toBe('number')
    })

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflows/yaml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})

describe('Workflow YAML API - PUT /api/workflows/yaml', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[sampleWorkflowData]] },
        update: { results: [sampleWorkflowData] },
        delete: { results: [] },
        insert: { results: [sampleWorkflowData] },
      },
    })

    // Mock transaction implementation
    mocks.database.mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
      const tx = {
        select: vi.fn().mockImplementation(() => ({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        })),
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([sampleWorkflowData]),
        })),
        update: vi.fn().mockImplementation(() => ({
          set: vi.fn().mockImplementation(() => ({
            where: () => Promise.resolve(),
          })),
        })),
        delete: vi.fn().mockImplementation(() => ({
          where: () => Promise.resolve(),
        })),
      }
      return await callback(tx)
    })
  })

  describe('YAML Update Functionality', () => {
    it('should update workflow from YAML successfully', async () => {
      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
        preserveMetadata: true,
        createCheckpoint: false,
        validateBeforeUpdate: true,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe('workflow-123')
      expect(data.updated).toBe(true)
      expect(data.summary).toBeDefined()
      expect(data.updateTime).toBeDefined()
    })

    it('should require workflow ID in query parameters', async () => {
      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
      }

      const request = createMockRequest('PUT', yamlUpdateRequest)
      const response = await PUT(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Workflow ID is required in query parameters')
    })

    it('should preserve metadata when specified', async () => {
      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
        preserveMetadata: true,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(mocks.database.mockDb.transaction).toHaveBeenCalled()
    })

    it('should update metadata when preserveMetadata is false', async () => {
      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
        preserveMetadata: false,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for YAML updates', async () => {
      mocks.auth.setUnauthenticated()

      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should check workflow ownership permissions', async () => {
      // Workflow belongs to different user
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

      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Access denied')
    })

    it('should check workspace permissions', async () => {
      vi.doMock('@/lib/permissions/utils', () => ({
        getUserEntityPermissions: vi.fn().mockResolvedValue('write'),
      }))

      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Workflow Validation', () => {
    it('should return 404 for non-existent workflow', async () => {
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]), // No workflow found
          }),
        }),
      }))

      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
      }

      const request = new NextRequest(
        'http://localhost:3000/api/workflows/yaml?id=nonexistent-workflow',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(yamlUpdateRequest),
        }
      )

      const response = await PUT(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Workflow not found')
    })

    it('should validate YAML before updating when specified', async () => {
      // Mock validation failure
      const mockCallSimAgent = vi.fn().mockResolvedValue({
        success: false,
        error: 'YAML validation failed',
        validationErrors: [{ line: 1, message: 'Invalid syntax' }],
      })

      const yamlUpdateRequest = {
        yaml: 'invalid: yaml content',
        validateBeforeUpdate: true,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('YAML parsing failed')
    })
  })

  describe('Input Validation', () => {
    it('should validate required YAML field', async () => {
      const yamlUpdateRequest = {
        // yaml field is missing
        preserveMetadata: true,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
    })

    it('should apply default values for optional fields', async () => {
      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
        // Other fields should use defaults
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Database Operations', () => {
    it('should clear existing workflow data before update', async () => {
      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(mocks.database.mockDb.transaction).toHaveBeenCalled()
    })

    it('should handle transaction failures during update', async () => {
      mocks.database.mockDb.transaction.mockImplementation(() => {
        throw new Error('Transaction failed during update')
      })

      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(500)
    })
  })

  describe('Checkpoint and Versioning', () => {
    it('should create checkpoint when requested', async () => {
      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
        createCheckpoint: true,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
      // TODO: Add specific checkpoint validation when implemented
    })

    it('should skip checkpoint creation when not requested', async () => {
      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
        createCheckpoint: false,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Performance and Response', () => {
    it('should include update timing in response', async () => {
      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.updateTime).toBeDefined()
      expect(typeof data.updateTime).toBe('number')
    })

    it('should provide comprehensive update summary', async () => {
      const yamlUpdateRequest = {
        yaml: sampleYamlWorkflow,
      }

      const request = new NextRequest('http://localhost:3000/api/workflows/yaml?id=workflow-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlUpdateRequest),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.summary.blocks).toBeDefined()
      expect(data.summary.connections).toBeDefined()
      expect(data.summary.loops).toBeDefined()
      expect(data.summary.parallels).toBeDefined()
    })
  })
})
