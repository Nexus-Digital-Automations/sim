/**
 * Comprehensive Test Suite for Workflow Validation API
 * Tests validation of workflow definitions, error reporting, and performance
 * Covers JSON/YAML input formats and comprehensive validation rules
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockRequest,
  mockUser,
  setupComprehensiveTestMocks,
} from '@/app/api/__test-utils__/utils'
import { POST } from './route'

// Mock workflow definitions for testing
const validJsonWorkflow = {
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
        tool: 'openai',
      },
      outputs: { response: { content: 'string', model: 'string', tokens: 'any' } },
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
  loops: {},
  parallels: {},
}

const invalidJsonWorkflow = {
  // Missing version and blocks array
  connections: [
    {
      source: 'nonexistent-block',
      target: 'another-nonexistent-block',
    },
  ],
}

const workflowWithDuplicateIds = {
  version: '1.0',
  blocks: [
    {
      id: 'duplicate-id',
      metadata: { id: 'starter', name: 'Start' },
      position: { x: 100, y: 100 },
    },
    {
      id: 'duplicate-id', // Duplicate ID
      metadata: { id: 'agent', name: 'Agent' },
      position: { x: 400, y: 100 },
    },
  ],
}

const workflowWithMissingRequiredFields = {
  version: '1.0',
  blocks: [
    {
      id: 'incomplete-block',
      metadata: { id: 'agent', name: 'Incomplete Agent' },
      position: { x: 100, y: 100 },
      config: {
        params: {
          // Missing required systemPrompt field
          model: { id: 'model', type: 'dropdown', value: 'gpt-4o' },
        },
      },
    },
  ],
}

describe('Workflow Validation API - POST /api/workflows/validate', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[]] },
      },
    })

    // Mock block registry
    vi.doMock('@/blocks', () => ({
      getBlock: vi.fn((blockType: string) => {
        const blockConfigs = {
          starter: {
            subBlocks: {
              startWorkflow: { required: true },
            },
          },
          agent: {
            subBlocks: {
              systemPrompt: { required: true },
              model: { required: true },
            },
          },
        }
        return blockConfigs[blockType as keyof typeof blockConfigs]
      }),
    }))

    // Mock tool registry
    vi.doMock('@/tools/utils', () => ({
      getTool: vi.fn((toolId: string) => {
        const toolConfigs = {
          openai: {
            parameters: {
              apiKey: { required: true },
              model: { required: true },
            },
          },
        }
        return toolConfigs[toolId as keyof typeof toolConfigs]
      }),
    }))
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for validation', async () => {
      mocks.auth.setUnauthenticated()

      const validationRequest = {
        format: 'json',
        workflow: validJsonWorkflow,
      }

      const request = createMockRequest('POST', validationRequest)
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

      const validationRequest = {
        format: 'json',
        workflow: validJsonWorkflow,
      }

      const request = createMockRequest('POST', validationRequest, { 'x-api-key': 'test-api-key' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(true)
    })

    it('should support internal JWT token authentication', async () => {
      vi.doMock('@/lib/auth/internal', () => ({
        verifyInternalToken: vi.fn().mockResolvedValue(true),
      }))

      const validationRequest = {
        format: 'json',
        workflow: validJsonWorkflow,
      }

      const request = createMockRequest('POST', validationRequest, {
        authorization: 'Bearer internal-jwt-token',
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('JSON Workflow Validation', () => {
    it('should validate a correct JSON workflow', async () => {
      const validationRequest = {
        format: 'json',
        workflow: validJsonWorkflow,
        validateRequired: true,
        validateConnections: true,
        validateBlockConfig: true,
        validateToolConfig: true,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(true)
      expect(data.result.errors).toHaveLength(0)
      expect(data.result.summary.totalBlocks).toBe(2)
      expect(data.result.summary.totalConnections).toBe(1)
      expect(data.result.performance.validationTimeMs).toBeDefined()
      expect(data.result.performance.parseTimeMs).toBeDefined()
    })

    it('should parse JSON string workflow', async () => {
      const validationRequest = {
        format: 'json',
        workflow: JSON.stringify(validJsonWorkflow),
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(true)
    })

    it('should handle malformed JSON strings', async () => {
      const validationRequest = {
        format: 'json',
        workflow: '{ invalid json string',
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toHaveLength(1)
      expect(data.result.errors[0].code).toBe('JSON_PARSE_ERROR')
      expect(data.result.errors[0].message).toContain('Invalid JSON format')
    })

    it('should validate workflow with default options', async () => {
      const validationRequest = {
        workflow: validJsonWorkflow,
        // format defaults to 'json'
        // validation options default to true
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(true)
    })
  })

  describe('Workflow Structure Validation', () => {
    it('should detect missing blocks array', async () => {
      const validationRequest = {
        format: 'json',
        workflow: { version: '1.0' }, // No blocks array
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'MISSING_BLOCKS',
          message: 'Workflow must contain a blocks array.',
        })
      )
    })

    it('should warn about empty workflows', async () => {
      const validationRequest = {
        format: 'json',
        workflow: { version: '1.0', blocks: [] },
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(true) // Empty workflow is valid but has warnings
      expect(data.result.warnings).toContain(
        expect.objectContaining({
          code: 'EMPTY_WORKFLOW',
          message: 'Workflow contains no blocks.',
        })
      )
    })

    it('should warn about missing version', async () => {
      const workflowWithoutVersion = {
        blocks: [validJsonWorkflow.blocks[0]], // At least one block to avoid empty workflow warning
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithoutVersion,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.warnings).toContain(
        expect.objectContaining({
          code: 'MISSING_VERSION',
        })
      )
    })

    it('should warn about missing starter blocks', async () => {
      const workflowWithoutStarter = {
        version: '1.0',
        blocks: [
          {
            id: 'agent-block',
            metadata: { id: 'agent', name: 'Agent' },
            position: { x: 100, y: 100 },
          },
        ],
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithoutStarter,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.warnings).toContain(
        expect.objectContaining({
          code: 'NO_STARTER_BLOCK',
        })
      )
    })

    it('should detect multiple starter blocks', async () => {
      const workflowWithMultipleStarters = {
        version: '1.0',
        blocks: [
          {
            id: 'starter-1',
            metadata: { id: 'starter', name: 'Start 1' },
            position: { x: 100, y: 100 },
          },
          {
            id: 'starter-2',
            metadata: { id: 'starter', name: 'Start 2' },
            position: { x: 200, y: 100 },
          },
        ],
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithMultipleStarters,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'MULTIPLE_STARTER_BLOCKS',
        })
      )
    })
  })

  describe('Block Validation', () => {
    it('should detect missing block IDs', async () => {
      const workflowWithMissingId = {
        version: '1.0',
        blocks: [
          {
            // Missing id field
            metadata: { id: 'starter', name: 'Start' },
            position: { x: 100, y: 100 },
          },
        ],
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithMissingId,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'MISSING_BLOCK_ID',
        })
      )
    })

    it('should detect duplicate block IDs', async () => {
      const validationRequest = {
        format: 'json',
        workflow: workflowWithDuplicateIds,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'DUPLICATE_BLOCK_ID',
          message: 'Duplicate block ID found: duplicate-id',
        })
      )
    })

    it('should warn about missing block metadata', async () => {
      const workflowWithMissingMetadata = {
        version: '1.0',
        blocks: [
          {
            id: 'block-without-metadata',
            // Missing metadata field
            position: { x: 100, y: 100 },
          },
        ],
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithMissingMetadata,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.warnings).toContain(
        expect.objectContaining({
          code: 'MISSING_BLOCK_METADATA',
        })
      )
    })

    it('should detect unsupported block types', async () => {
      // Mock getBlock to return null for unsupported types
      const mockGetBlock = vi.fn((blockType: string) => {
        if (blockType === 'unsupported-type') {
          return null
        }
        return { subBlocks: {} }
      })

      vi.doMock('@/blocks', () => ({ getBlock: mockGetBlock }))

      const workflowWithUnsupportedType = {
        version: '1.0',
        blocks: [
          {
            id: 'unsupported-block',
            metadata: { id: 'unsupported-type', name: 'Unsupported Block' },
            position: { x: 100, y: 100 },
          },
        ],
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithUnsupportedType,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'UNSUPPORTED_BLOCK_TYPE',
        })
      )
    })

    it('should warn about invalid block positions', async () => {
      const workflowWithInvalidPosition = {
        version: '1.0',
        blocks: [
          {
            id: 'block-with-invalid-position',
            metadata: { id: 'starter', name: 'Start' },
            position: { x: 'invalid', y: 100 }, // Invalid x coordinate
          },
        ],
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithInvalidPosition,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.warnings).toContain(
        expect.objectContaining({
          code: 'INVALID_BLOCK_POSITION',
        })
      )
    })

    it('should handle block configuration errors gracefully', async () => {
      // Mock getBlock to throw an error
      const mockGetBlock = vi.fn(() => {
        throw new Error('Block config loading failed')
      })

      vi.doMock('@/blocks', () => ({ getBlock: mockGetBlock }))

      const validationRequest = {
        format: 'json',
        workflow: validJsonWorkflow,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'BLOCK_CONFIG_ERROR',
        })
      )
    })
  })

  describe('Connection Validation', () => {
    it('should detect invalid connections', async () => {
      const validationRequest = {
        format: 'json',
        workflow: invalidJsonWorkflow,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'CONNECTION_SOURCE_NOT_FOUND',
        })
      )
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'CONNECTION_TARGET_NOT_FOUND',
        })
      )
    })

    it('should detect connections with missing source or target', async () => {
      const workflowWithIncompleteConnection = {
        version: '1.0',
        blocks: [
          {
            id: 'block-1',
            metadata: { id: 'starter', name: 'Start' },
            position: { x: 100, y: 100 },
          },
        ],
        connections: [
          { source: 'block-1' }, // Missing target
          { target: 'block-1' }, // Missing source
        ],
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithIncompleteConnection,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toHaveLength(2)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'INVALID_CONNECTION',
        })
      )
    })

    it('should warn about self-connections', async () => {
      const workflowWithSelfConnection = {
        version: '1.0',
        blocks: [
          {
            id: 'self-connected-block',
            metadata: { id: 'starter', name: 'Self Connected' },
            position: { x: 100, y: 100 },
          },
        ],
        connections: [{ source: 'self-connected-block', target: 'self-connected-block' }],
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithSelfConnection,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.warnings).toContain(
        expect.objectContaining({
          code: 'SELF_CONNECTION',
        })
      )
    })

    it('should skip connection validation when disabled', async () => {
      const validationRequest = {
        format: 'json',
        workflow: invalidJsonWorkflow,
        validateConnections: false,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      // Should not have connection-related errors since validation is disabled
      const connectionErrors = data.result.errors.filter((error: any) =>
        error.code.includes('CONNECTION')
      )
      expect(connectionErrors).toHaveLength(0)
    })
  })

  describe('Required Fields Validation', () => {
    it('should detect missing required fields', async () => {
      const validationRequest = {
        format: 'json',
        workflow: workflowWithMissingRequiredFields,
        validateRequired: true,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'MISSING_REQUIRED_FIELD',
          message: expect.stringContaining('systemPrompt'),
        })
      )
    })

    it('should skip required field validation when disabled', async () => {
      const validationRequest = {
        format: 'json',
        workflow: workflowWithMissingRequiredFields,
        validateRequired: false,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      // Should not have required field errors since validation is disabled
      const requiredFieldErrors = data.result.errors.filter((error: any) =>
        error.code.includes('REQUIRED')
      )
      expect(requiredFieldErrors).toHaveLength(0)
    })
  })

  describe('Tool Configuration Validation', () => {
    it('should detect unsupported tools', async () => {
      // Mock getTool to return null for unsupported tools
      const mockGetTool = vi.fn((toolId: string) => {
        if (toolId === 'unsupported-tool') {
          return null
        }
        return { parameters: {} }
      })

      vi.doMock('@/tools/utils', () => ({ getTool: mockGetTool }))

      const workflowWithUnsupportedTool = {
        version: '1.0',
        blocks: [
          {
            id: 'block-with-unsupported-tool',
            metadata: { id: 'agent', name: 'Agent with Unsupported Tool' },
            position: { x: 100, y: 100 },
            config: {
              tool: 'unsupported-tool',
              params: {},
            },
          },
        ],
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithUnsupportedTool,
        validateToolConfig: true,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'UNSUPPORTED_TOOL',
        })
      )
    })

    it('should detect missing required tool parameters', async () => {
      const workflowWithMissingToolParams = {
        version: '1.0',
        blocks: [
          {
            id: 'block-with-incomplete-tool',
            metadata: { id: 'agent', name: 'Agent with Incomplete Tool Config' },
            position: { x: 100, y: 100 },
            config: {
              tool: 'openai',
              params: {
                model: 'gpt-4o',
                // Missing required apiKey parameter
              },
            },
          },
        ],
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithMissingToolParams,
        validateToolConfig: true,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'MISSING_REQUIRED_TOOL_PARAM',
          message: expect.stringContaining('apiKey'),
        })
      )
    })

    it('should handle tool configuration errors gracefully', async () => {
      // Mock getTool to throw an error
      const mockGetTool = vi.fn(() => {
        throw new Error('Tool config loading failed')
      })

      vi.doMock('@/tools/utils', () => ({ getTool: mockGetTool }))

      const workflowWithToolConfigError = {
        version: '1.0',
        blocks: [
          {
            id: 'block-with-tool-error',
            metadata: { id: 'agent', name: 'Agent with Tool Error' },
            position: { x: 100, y: 100 },
            config: {
              tool: 'problematic-tool',
              params: {},
            },
          },
        ],
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithToolConfigError,
        validateToolConfig: true,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'TOOL_CONFIG_ERROR',
        })
      )
    })
  })

  describe('Subflow Validation (Loops and Parallels)', () => {
    it('should validate loop configurations', async () => {
      const workflowWithLoops = {
        version: '1.0',
        blocks: [
          { id: 'start', metadata: { id: 'starter', name: 'Start' }, position: { x: 100, y: 100 } },
        ],
        loops: {
          'loop-without-config': {}, // Missing config
          'loop-without-exit': {
            config: {}, // No exit condition or max iterations
          },
          'valid-loop': {
            config: {
              maxIterations: 10,
            },
          },
        },
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithLoops,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'MISSING_LOOP_CONFIG',
        })
      )
      expect(data.result.warnings).toContain(
        expect.objectContaining({
          code: 'LOOP_WITHOUT_EXIT_CONDITION',
        })
      )
    })

    it('should validate parallel configurations', async () => {
      const workflowWithParallels = {
        version: '1.0',
        blocks: [
          { id: 'start', metadata: { id: 'starter', name: 'Start' }, position: { x: 100, y: 100 } },
        ],
        parallels: {
          'parallel-without-config': {}, // Missing config
          'parallel-without-branches': {
            config: {}, // No branches
          },
          'parallel-with-invalid-branches': {
            config: {
              branches: 'not-an-array', // Should be array
            },
          },
          'valid-parallel': {
            config: {
              branches: ['branch-1', 'branch-2', 'branch-3'],
            },
          },
        },
      }

      const validationRequest = {
        format: 'json',
        workflow: workflowWithParallels,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'MISSING_PARALLEL_CONFIG',
        })
      )
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'PARALLEL_WITHOUT_BRANCHES',
        })
      )
    })
  })

  describe('YAML Validation', () => {
    it('should indicate YAML parsing is not implemented', async () => {
      const validationRequest = {
        format: 'yaml',
        workflow: 'name: "Test Workflow"\nblocks: []',
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'YAML_PARSING_NOT_IMPLEMENTED',
        })
      )
    })
  })

  describe('Validation Options and Context', () => {
    it('should provide comprehensive validation summary', async () => {
      const validationRequest = {
        format: 'json',
        workflow: validJsonWorkflow,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.summary).toEqual({
        totalBlocks: 2,
        totalConnections: 1,
        totalLoops: 0,
        totalParallels: 0,
        missingRequiredFields: 0,
        invalidConnections: 0,
        deprecatedFeatures: 0,
      })
    })

    it('should provide performance timing information', async () => {
      const validationRequest = {
        format: 'json',
        workflow: validJsonWorkflow,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.performance.validationTimeMs).toBeDefined()
      expect(data.result.performance.parseTimeMs).toBeDefined()
      expect(typeof data.result.performance.validationTimeMs).toBe('number')
      expect(typeof data.result.performance.parseTimeMs).toBe('number')
    })

    it('should include request ID in response', async () => {
      const validationRequest = {
        format: 'json',
        workflow: validJsonWorkflow,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.requestId).toBeDefined()
      expect(typeof data.requestId).toBe('string')
    })

    it('should handle workspace context', async () => {
      const validationRequest = {
        format: 'json',
        workflow: validJsonWorkflow,
        workspaceId: 'workspace-123',
        variables: { API_KEY: 'test-key' },
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should validate request schema', async () => {
      const invalidRequest = {
        format: 'invalid-format',
        // Missing workflow field
      }

      const request = createMockRequest('POST', invalidRequest)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflows/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should handle validation exceptions gracefully', async () => {
      // Mock a function to throw during validation
      vi.doMock('@/blocks', () => ({
        getBlock: vi.fn(() => {
          throw new Error('Unexpected validation error')
        }),
      }))

      const validationRequest = {
        format: 'json',
        workflow: validJsonWorkflow,
        validateBlockConfig: true,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(false)
      expect(data.result.errors).toContain(
        expect.objectContaining({
          code: 'VALIDATION_FAILED',
        })
      )
    })
  })

  describe('Selective Validation', () => {
    it('should skip block validation when disabled', async () => {
      const validationRequest = {
        format: 'json',
        workflow: workflowWithDuplicateIds,
        validateBlockConfig: false,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      // Should still fail due to duplicate IDs (this is structural validation)
      expect(data.result.isValid).toBe(false)
    })

    it('should provide different validation levels', async () => {
      const validationRequest = {
        format: 'json',
        workflow: validJsonWorkflow,
        validateRequired: false,
        validateConnections: false,
        validateBlockConfig: false,
        validateToolConfig: false,
      }

      const request = createMockRequest('POST', validationRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.result.isValid).toBe(true) // Should be valid with minimal validation
    })
  })
})
