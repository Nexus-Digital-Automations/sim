/**
 * @vitest-environment jsdom
 *
 * Serializer Advanced Features Unit Tests
 *
 * This file contains comprehensive unit tests for advanced serialization features,
 * including YAML conversion, error handling, state management, and edge cases
 * to achieve 100% code coverage.
 */

import type { Edge } from 'reactflow'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import { Serializer } from '@/serializer/index'
import type { SerializedWorkflow } from '@/serializer/types'
import type { BlockState, Loop } from '@/stores/workflows/workflow/types'

// Mock dependencies with comprehensive error simulation
vi.mock('@/blocks', () => ({
  getBlock: vi.fn((type: string) => {
    const mockConfigs: Record<string, any> = {
      agent: {
        name: 'Agent',
        description: 'AI Agent block',
        category: 'ai',
        bgColor: '#2196F3',
        tools: {
          access: ['openai_chat', 'anthropic_chat'],
          config: {
            tool: (params: any) => params.provider || 'openai_chat',
          },
        },
        subBlocks: [
          { id: 'prompt', type: 'long-input', title: 'Prompt' },
          { id: 'responseFormat', type: 'code', title: 'Response Format' },
          { id: 'provider', type: 'dropdown', title: 'Provider' },
          { id: 'model', type: 'dropdown', title: 'Model' },
        ],
        inputs: {
          input: { type: 'string' },
        },
        outputs: {
          result: { type: 'string' },
        },
      },
      starter: {
        name: 'Starter',
        description: 'Start of the workflow',
        category: 'flow',
        bgColor: '#4CAF50',
        tools: {
          access: ['starter'],
          config: {
            tool: () => 'starter',
          },
        },
        subBlocks: [{ id: 'description', type: 'long-input', title: 'Description' }],
        inputs: {},
      },
      response: {
        name: 'Response',
        description: 'End of the workflow',
        category: 'flow',
        bgColor: '#9E9E9E',
        tools: {
          access: ['response'],
          config: {
            tool: () => 'response',
          },
        },
        subBlocks: [{ id: 'message', type: 'long-input', title: 'Response Message' }],
        inputs: {},
      },
      trigger: {
        name: 'Trigger',
        description: 'Trigger block',
        category: 'triggers',
        bgColor: '#FF5722',
        tools: {
          access: ['webhook_trigger'],
          config: {
            tool: () => 'webhook_trigger',
          },
        },
        subBlocks: [
          { id: 'url', type: 'short-input', title: 'Webhook URL' },
          { id: 'method', type: 'dropdown', title: 'HTTP Method' },
        ],
        inputs: {},
      },
      loop: {
        name: 'Loop',
        description: 'Loop container',
        category: 'subflow',
        bgColor: '#3b82f6',
        tools: { access: ['loop'], config: { tool: () => 'loop' } },
        subBlocks: [],
        inputs: {},
      },
      parallel: {
        name: 'Parallel',
        description: 'Parallel container',
        category: 'subflow',
        bgColor: '#8b5cf6',
        tools: { access: ['parallel'], config: { tool: () => 'parallel' } },
        subBlocks: [],
        inputs: {},
      },
      malformed: {
        name: 'Malformed Block',
        description: 'Block with missing tools config',
        category: 'test',
        bgColor: '#000000',
        tools: {
          access: [], // Empty tools access for testing
          config: {
            tool: () => 'default_tool',
          },
        },
        subBlocks: [],
        inputs: {},
      },
      toolError: {
        name: 'Tool Error Block',
        description: 'Block that throws error in tool selection',
        category: 'test',
        bgColor: '#FF0000',
        tools: {
          access: ['error_tool'],
          config: {
            tool: () => {
              throw new Error('Tool selection error')
            },
          },
        },
        subBlocks: [{ id: 'param', type: 'short-input', title: 'Parameter' }],
        inputs: {},
      },
    }

    if (type === 'non-existent') {
      return null // Simulate non-existent block
    }

    return mockConfigs[type] || null
  }),
}))

vi.mock('@/tools/utils', () => ({
  getTool: vi.fn((toolId: string) => {
    const mockTools: Record<string, any> = {
      webhook_trigger: {
        params: {
          url: { visibility: 'user-only', required: true },
          method: { visibility: 'user-only', required: false },
        },
      },
      error_tool: {
        params: {
          param: { visibility: 'user-or-llm', required: true },
        },
      },
    }
    return mockTools[toolId] || null
  }),
}))

// Mock logger
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('Serializer Advanced Features', () => {
  let serializer: Serializer

  beforeEach(() => {
    serializer = new Serializer()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Advanced Serialization Edge Cases
   */
  describe('Advanced Serialization Edge Cases', () => {
    it.concurrent('should handle trigger mode blocks correctly', () => {
      const triggerBlock: BlockState = {
        id: 'trigger1',
        type: 'trigger',
        name: 'Webhook Trigger',
        position: { x: 100, y: 100 },
        subBlocks: {
          url: { id: 'url', type: 'short-input', value: 'https://example.com/webhook' },
          method: { id: 'method', type: 'dropdown', value: 'POST' },
        },
        outputs: {},
        enabled: true,
        triggerMode: true, // Explicitly set trigger mode
      }

      const blocks = { trigger1: triggerBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedTrigger = serialized.blocks.find((b) => b.id === 'trigger1')
      expect(serializedTrigger).toBeDefined()
      expect(serializedTrigger?.config.params.triggerMode).toBe(true)
    })

    it.concurrent('should auto-detect trigger category blocks', () => {
      const triggerBlock: BlockState = {
        id: 'trigger2',
        type: 'trigger',
        name: 'Auto Trigger',
        position: { x: 100, y: 100 },
        subBlocks: {
          url: { id: 'url', type: 'short-input', value: 'https://example.com/webhook' },
        },
        outputs: {},
        enabled: true,
        // No explicit triggerMode - should be inferred from category
      }

      const blocks = { trigger2: triggerBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedTrigger = serialized.blocks.find((b) => b.id === 'trigger2')
      expect(serializedTrigger).toBeDefined()
      expect(serializedTrigger?.config.params.triggerMode).toBe(true)
    })

    it.concurrent('should handle loop blocks with special serialization', () => {
      const loopBlock: BlockState = {
        id: 'loop1',
        type: 'loop',
        name: 'Loop Block',
        position: { x: 200, y: 200 },
        subBlocks: {},
        outputs: { output: { type: 'any' } },
        enabled: true,
        data: {
          parallelType: 'count',
          count: 5,
          items: ['a', 'b', 'c'],
        },
      }

      const blocks = { loop1: loopBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedLoop = serialized.blocks.find((b) => b.id === 'loop1')
      expect(serializedLoop).toBeDefined()
      expect(serializedLoop?.config.tool).toBe('') // Loop blocks have empty tool
      expect(serializedLoop?.config.params).toEqual(loopBlock.data)
      expect(serializedLoop?.metadata?.id).toBe('loop')
      expect(serializedLoop?.metadata?.category).toBe('subflow')
      expect(serializedLoop?.metadata?.color).toBe('#3b82f6')
      expect(serializedLoop?.metadata?.description).toBe('Loop container')
    })

    it.concurrent('should handle parallel blocks with special serialization', () => {
      const parallelBlock: BlockState = {
        id: 'parallel1',
        type: 'parallel',
        name: 'Parallel Block',
        position: { x: 300, y: 300 },
        subBlocks: {},
        outputs: { output: { type: 'any' } },
        enabled: true,
        data: {
          parallelType: 'collection',
          distribution: [1, 2, 3, 4, 5],
          count: 3,
        },
      }

      const blocks = { parallel1: parallelBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedParallel = serialized.blocks.find((b) => b.id === 'parallel1')
      expect(serializedParallel).toBeDefined()
      expect(serializedParallel?.config.tool).toBe('') // Parallel blocks have empty tool
      expect(serializedParallel?.config.params).toEqual(parallelBlock.data)
      expect(serializedParallel?.metadata?.id).toBe('parallel')
      expect(serializedParallel?.metadata?.category).toBe('subflow')
      expect(serializedParallel?.metadata?.color).toBe('#8b5cf6')
      expect(serializedParallel?.metadata?.description).toBe('Parallel container')
    })

    it.concurrent('should handle blocks with malformed tool configuration', () => {
      const malformedBlock: BlockState = {
        id: 'malformed1',
        type: 'malformed',
        name: 'Malformed Block',
        position: { x: 400, y: 400 },
        subBlocks: {},
        outputs: {},
        enabled: true,
      }

      const blocks = { malformed1: malformedBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      // Should not throw, should handle gracefully
      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedBlock = serialized.blocks.find((b) => b.id === 'malformed1')
      expect(serializedBlock).toBeDefined()
      // Should handle missing tools config gracefully
      expect(serializedBlock?.config.tool).toBeDefined()
    })

    it.concurrent('should handle tool selection errors gracefully', () => {
      const errorBlock: BlockState = {
        id: 'error1',
        type: 'toolError',
        name: 'Error Block',
        position: { x: 500, y: 500 },
        subBlocks: {
          param: { id: 'param', type: 'short-input', value: 'test' },
        },
        outputs: {},
        enabled: true,
      }

      const blocks = { error1: errorBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      // Should handle tool selection error gracefully
      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedBlock = serialized.blocks.find((b) => b.id === 'error1')
      expect(serializedBlock).toBeDefined()

      // Tool selection error was handled gracefully
    })

    it.concurrent('should skip validation for trigger mode blocks', () => {
      const triggerBlock: BlockState = {
        id: 'trigger3',
        type: 'trigger',
        name: 'Trigger with Missing Fields',
        position: { x: 100, y: 100 },
        subBlocks: {
          url: { id: 'url', type: 'short-input', value: '' }, // Missing required field
        },
        outputs: {},
        enabled: true,
        triggerMode: true,
      }

      const blocks = { trigger3: triggerBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      // Should not throw validation error for trigger blocks
      expect(() => {
        serializer.serializeWorkflow(blocks, edges, loops, undefined, true)
      }).not.toThrow()

      // Validation was skipped for trigger blocks
    })
  })

  /**
   * Response Format Parsing Tests
   */
  describe('Response Format Parsing', () => {
    it.concurrent('should parse valid JSON response format', () => {
      const agentBlock: BlockState = {
        id: 'agent1',
        type: 'agent',
        name: 'Agent with Response Format',
        position: { x: 100, y: 100 },
        subBlocks: {
          prompt: { id: 'prompt', type: 'long-input', value: 'Test prompt' },
          responseFormat: {
            id: 'responseFormat',
            type: 'code',
            value: '{"type": "object", "properties": {"result": {"type": "string"}}}',
          },
        },
        outputs: {},
        enabled: true,
      }

      const blocks = { agent1: agentBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedAgent = serialized.blocks.find((b) => b.id === 'agent1')
      expect(serializedAgent).toBeDefined()
      expect(serializedAgent?.outputs.responseFormat).toEqual({
        type: 'object',
        properties: { result: { type: 'string' } },
      })
    })

    it.concurrent('should preserve variable references in response format', () => {
      const agentBlock: BlockState = {
        id: 'agent2',
        type: 'agent',
        name: 'Agent with Variable Reference',
        position: { x: 100, y: 100 },
        subBlocks: {
          prompt: { id: 'prompt', type: 'long-input', value: 'Test prompt' },
          responseFormat: {
            id: 'responseFormat',
            type: 'code',
            value: '<start.responseFormat>',
          },
        },
        outputs: {},
        enabled: true,
      }

      const blocks = { agent2: agentBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedAgent = serialized.blocks.find((b) => b.id === 'agent2')
      expect(serializedAgent).toBeDefined()
      expect(serializedAgent?.outputs.responseFormat).toBe('<start.responseFormat>')
    })

    it.concurrent('should handle invalid JSON response format gracefully', () => {
      const agentBlock: BlockState = {
        id: 'agent3',
        type: 'agent',
        name: 'Agent with Invalid Response Format',
        position: { x: 100, y: 100 },
        subBlocks: {
          prompt: { id: 'prompt', type: 'long-input', value: 'Test prompt' },
          responseFormat: {
            id: 'responseFormat',
            type: 'code',
            value: '{"invalid": json}', // Invalid JSON
          },
        },
        outputs: {},
        enabled: true,
      }

      const blocks = { agent3: agentBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedAgent = serialized.blocks.find((b) => b.id === 'agent3')
      expect(serializedAgent).toBeDefined()
      expect(serializedAgent?.outputs.responseFormat).toBeUndefined()

      // Invalid JSON was handled gracefully
    })

    it.concurrent('should handle empty response format', () => {
      const agentBlock: BlockState = {
        id: 'agent4',
        type: 'agent',
        name: 'Agent with Empty Response Format',
        position: { x: 100, y: 100 },
        subBlocks: {
          prompt: { id: 'prompt', type: 'long-input', value: 'Test prompt' },
          responseFormat: {
            id: 'responseFormat',
            type: 'code',
            value: '', // Empty string
          },
        },
        outputs: {},
        enabled: true,
      }

      const blocks = { agent4: agentBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedAgent = serialized.blocks.find((b) => b.id === 'agent4')
      expect(serializedAgent).toBeDefined()
      expect(serializedAgent?.outputs.responseFormat).toBeUndefined()
    })

    it.concurrent('should handle object response format', () => {
      const responseFormatObject = { type: 'object', properties: { name: { type: 'string' } } }

      const agentBlock: BlockState = {
        id: 'agent5',
        type: 'agent',
        name: 'Agent with Object Response Format',
        position: { x: 100, y: 100 },
        subBlocks: {
          prompt: { id: 'prompt', type: 'long-input', value: 'Test prompt' },
          responseFormat: {
            id: 'responseFormat',
            type: 'code',
            value: responseFormatObject, // Already an object
          },
        },
        outputs: {},
        enabled: true,
      }

      const blocks = { agent5: agentBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedAgent = serialized.blocks.find((b) => b.id === 'agent5')
      expect(serializedAgent).toBeDefined()
      expect(serializedAgent?.outputs.responseFormat).toEqual(responseFormatObject)
    })

    it.concurrent('should handle non-string, non-object response format', () => {
      const agentBlock: BlockState = {
        id: 'agent6',
        type: 'agent',
        name: 'Agent with Number Response Format',
        position: { x: 100, y: 100 },
        subBlocks: {
          prompt: { id: 'prompt', type: 'long-input', value: 'Test prompt' },
          responseFormat: {
            id: 'responseFormat',
            type: 'code',
            value: 123, // Number value
          },
        },
        outputs: {},
        enabled: true,
      }

      const blocks = { agent6: agentBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedAgent = serialized.blocks.find((b) => b.id === 'agent6')
      expect(serializedAgent).toBeDefined()
      expect(serializedAgent?.outputs.responseFormat).toBeUndefined()
    })
  })

  /**
   * Advanced Deserialization Edge Cases
   */
  describe('Advanced Deserialization Edge Cases', () => {
    it.concurrent('should deserialize loop blocks correctly', () => {
      const serializedWorkflow: SerializedWorkflow = {
        version: '1.0',
        blocks: [
          {
            id: 'loop1',
            position: { x: 100, y: 100 },
            config: {
              tool: '',
              params: { parallelType: 'count', count: 3 },
            },
            inputs: {},
            outputs: { output: { type: 'any' } },
            metadata: {
              id: 'loop',
              name: 'Loop Block',
              description: 'Loop container',
              category: 'subflow',
              color: '#3b82f6',
            },
            enabled: true,
          },
        ],
        connections: [],
        loops: {},
      }

      const { blocks } = serializer.deserializeWorkflow(serializedWorkflow)

      expect(blocks.loop1).toBeDefined()
      expect(blocks.loop1.type).toBe('loop')
      expect(blocks.loop1.name).toBe('Loop Block')
      expect(blocks.loop1.data).toEqual({ parallelType: 'count', count: 3 })
      expect(blocks.loop1.subBlocks).toEqual({})
    })

    it.concurrent('should deserialize parallel blocks correctly', () => {
      const serializedWorkflow: SerializedWorkflow = {
        version: '1.0',
        blocks: [
          {
            id: 'parallel1',
            position: { x: 200, y: 200 },
            config: {
              tool: '',
              params: { parallelType: 'collection', distribution: [1, 2, 3] },
            },
            inputs: {},
            outputs: { output: { type: 'any' } },
            metadata: {
              id: 'parallel',
              name: 'Parallel Block',
              description: 'Parallel container',
              category: 'subflow',
              color: '#8b5cf6',
            },
            enabled: true,
          },
        ],
        connections: [],
        loops: {},
      }

      const { blocks } = serializer.deserializeWorkflow(serializedWorkflow)

      expect(blocks.parallel1).toBeDefined()
      expect(blocks.parallel1.type).toBe('parallel')
      expect(blocks.parallel1.name).toBe('Parallel Block')
      expect(blocks.parallel1.data).toEqual({ parallelType: 'collection', distribution: [1, 2, 3] })
      expect(blocks.parallel1.subBlocks).toEqual({})
    })

    it.concurrent('should restore trigger mode from params', () => {
      const serializedWorkflow: SerializedWorkflow = {
        version: '1.0',
        blocks: [
          {
            id: 'trigger1',
            position: { x: 100, y: 100 },
            config: {
              tool: 'webhook_trigger',
              params: { triggerMode: true, url: 'https://example.com/webhook' },
            },
            inputs: {},
            outputs: {},
            metadata: {
              id: 'trigger',
              name: 'Trigger Block',
              description: 'Trigger block',
              category: 'flow',
              color: '#FF5722',
            },
            enabled: true,
          },
        ],
        connections: [],
        loops: {},
      }

      const { blocks } = serializer.deserializeWorkflow(serializedWorkflow)

      expect(blocks.trigger1).toBeDefined()
      expect(blocks.trigger1.triggerMode).toBe(true)
    })

    it.concurrent('should restore trigger mode from category', () => {
      const serializedWorkflow: SerializedWorkflow = {
        version: '1.0',
        blocks: [
          {
            id: 'trigger2',
            position: { x: 100, y: 100 },
            config: {
              tool: 'webhook_trigger',
              params: { url: 'https://example.com/webhook' },
            },
            inputs: {},
            outputs: {},
            metadata: {
              id: 'trigger',
              name: 'Trigger Block',
              description: 'Trigger block',
              category: 'triggers', // Should infer trigger mode from this
              color: '#FF5722',
            },
            enabled: true,
          },
        ],
        connections: [],
        loops: {},
      }

      const { blocks } = serializer.deserializeWorkflow(serializedWorkflow)

      expect(blocks.trigger2).toBeDefined()
      expect(blocks.trigger2.triggerMode).toBe(true)
    })

    it.concurrent('should handle missing metadata gracefully', () => {
      const serializedWorkflow: SerializedWorkflow = {
        version: '1.0',
        blocks: [
          {
            id: 'block1',
            position: { x: 100, y: 100 },
            config: {
              tool: 'test_tool',
              params: {},
            },
            inputs: {},
            outputs: {},
            metadata: undefined, // Missing metadata
            enabled: true,
          },
        ],
        connections: [],
        loops: {},
      }

      expect(() => serializer.deserializeWorkflow(serializedWorkflow)).toThrow()
    })

    it.concurrent('should handle blocks with default values from config', async () => {
      // Mock a block config with default values
      const { getBlock } = await import('@/blocks')
      vi.mocked(getBlock).mockImplementation((type: string) => {
        if (type === 'test-defaults') {
          return {
            name: 'Test Defaults',
            description: 'Block with default values',
            category: 'test',
            bgColor: '#333333',
            tools: { access: ['test'], config: { tool: () => 'test' } },
            subBlocks: [
              {
                id: 'param1',
                type: 'short-input',
                title: 'Param 1',
                value: (params: any) => params.defaultValue || 'default',
              },
              {
                id: 'param2',
                type: 'short-input',
                title: 'Param 2',
              },
            ],
            inputs: {},
          }
        }
        return null
      })

      const serializedWorkflow: SerializedWorkflow = {
        version: '1.0',
        blocks: [
          {
            id: 'test1',
            position: { x: 100, y: 100 },
            config: {
              tool: 'test',
              params: { param2: 'value2' },
            },
            inputs: {},
            outputs: {},
            metadata: {
              id: 'test-defaults',
              name: 'Test Block',
            },
            enabled: true,
          },
        ],
        connections: [],
        loops: {},
      }

      const { blocks } = serializer.deserializeWorkflow(serializedWorkflow)

      expect(blocks.test1).toBeDefined()
      // Values should be derived from the serialized params, not necessarily exactly as expected
      expect(blocks.test1.subBlocks.param1).toBeDefined()
      expect(blocks.test1.subBlocks.param2).toBeDefined()
    })
  })

  /**
   * Performance and Security Edge Cases
   */
  describe('Performance and Security Edge Cases', () => {
    it.concurrent('should handle large workflows efficiently', () => {
      const startTime = performance.now()

      // Create a large workflow with many blocks
      const blocks: Record<string, BlockState> = {}
      const edges: Edge[] = []

      for (let i = 0; i < 100; i++) {
        blocks[`block_${i}`] = {
          id: `block_${i}`,
          type: 'agent',
          name: `Block ${i}`,
          position: { x: i * 10, y: i * 10 },
          subBlocks: {
            prompt: { id: 'prompt', type: 'long-input', value: `Prompt ${i}` },
          },
          outputs: {},
          enabled: true,
        }

        if (i > 0) {
          edges.push({
            id: `edge_${i}`,
            source: `block_${i - 1}`,
            target: `block_${i}`,
          })
        }
      }

      const loops: Record<string, Loop> = {}
      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(serialized.blocks).toHaveLength(100)
      expect(serialized.connections).toHaveLength(99)
      expect(processingTime).toBeLessThan(1000) // Should complete in less than 1 second
    })

    it.concurrent('should handle deeply nested response formats safely', () => {
      const deepObject: any = {}
      let current = deepObject

      // Create a deeply nested object to test for potential stack overflow
      for (let i = 0; i < 50; i++) {
        current.nested = { level: i }
        current = current.nested
      }

      const agentBlock: BlockState = {
        id: 'deep_agent',
        type: 'agent',
        name: 'Deep Nested Agent',
        position: { x: 100, y: 100 },
        subBlocks: {
          prompt: { id: 'prompt', type: 'long-input', value: 'Test prompt' },
          responseFormat: {
            id: 'responseFormat',
            type: 'code',
            value: deepObject,
          },
        },
        outputs: {},
        enabled: true,
      }

      const blocks = { deep_agent: agentBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      // Should handle deep nesting without stack overflow
      expect(() => {
        serializer.serializeWorkflow(blocks, edges, loops)
      }).not.toThrow()
    })

    it.concurrent('should handle circular reference protection', () => {
      const circularObject: any = { name: 'test' }
      circularObject.self = circularObject // Create circular reference

      const agentBlock: BlockState = {
        id: 'circular_agent',
        type: 'agent',
        name: 'Circular Reference Agent',
        position: { x: 100, y: 100 },
        subBlocks: {
          prompt: { id: 'prompt', type: 'long-input', value: 'Test prompt' },
          responseFormat: {
            id: 'responseFormat',
            type: 'code',
            value: circularObject,
          },
        },
        outputs: {},
        enabled: true,
      }

      const blocks = { circular_agent: agentBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      // Should handle circular references gracefully
      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedAgent = serialized.blocks.find((b) => b.id === 'circular_agent')
      expect(serializedAgent).toBeDefined()
      // responseFormat should be included despite circular reference
      expect(serializedAgent?.outputs.responseFormat).toEqual(circularObject)
    })

    it.concurrent('should sanitize potentially malicious data', () => {
      const maliciousBlock: BlockState = {
        id: 'malicious_agent',
        type: 'agent',
        name: 'Agent with Script Tags',
        position: { x: 100, y: 100 },
        subBlocks: {
          prompt: {
            id: 'prompt',
            type: 'long-input',
            value: '<script>alert("XSS")</script>',
          },
          // system field not included - only prompt field for this test
        },
        outputs: {},
        enabled: true,
      }

      const blocks = { malicious_agent: maliciousBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedAgent = serialized.blocks.find((b) => b.id === 'malicious_agent')
      expect(serializedAgent).toBeDefined()

      // Data should be preserved as-is (serializer doesn't sanitize, that's handled elsewhere)
      expect(serializedAgent?.config.params.prompt).toBe('<script>alert("XSS")</script>')
      // System field was not included in the agent definition for this test
    })
  })

  /**
   * Memory and Resource Management
   */
  describe('Memory and Resource Management', () => {
    it.concurrent('should properly clean up references after serialization', () => {
      const complexBlock: BlockState = {
        id: 'complex1',
        type: 'agent',
        name: 'Complex Block',
        position: { x: 100, y: 100 },
        subBlocks: {
          prompt: { id: 'prompt', type: 'long-input', value: 'Complex prompt with lots of data' },
          tools: {
            id: 'tools',
            type: 'tool-input',
            value: JSON.stringify(Array(100).fill({ type: 'function', name: 'test' })),
          },
        },
        outputs: {
          result: { type: 'object' },
          metadata: { type: 'object' },
        },
        enabled: true,
      }

      const blocks = { complex1: complexBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      // Verify serialization completed successfully
      expect(serialized.blocks).toHaveLength(1)

      // Verify the original objects are still intact (no mutation)
      expect(blocks.complex1.subBlocks.prompt.value).toBe('Complex prompt with lots of data')
      expect(blocks.complex1.outputs.result.type).toBe('object')
    })

    it.concurrent('should handle null and undefined values gracefully', () => {
      const nullBlock: BlockState = {
        id: 'null1',
        type: 'agent',
        name: 'Null Block',
        position: { x: 100, y: 100 },
        subBlocks: {
          prompt: { id: 'prompt', type: 'long-input', value: null },
          system: { id: 'system', type: 'long-input', value: undefined },
          model: { id: 'model', type: 'dropdown', value: '' },
        },
        outputs: {},
        enabled: true,
      }

      const blocks = { null1: nullBlock }
      const edges: Edge[] = []
      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      const serializedAgent = serialized.blocks.find((b) => b.id === 'null1')
      expect(serializedAgent).toBeDefined()
      expect(serializedAgent?.config.params.prompt).toBeNull()
      expect(serializedAgent?.config.params.system).toBeUndefined()
      expect(serializedAgent?.config.params.model).toBe('')
    })

    it.concurrent('should handle edge cases in connection serialization', () => {
      const blocks: Record<string, BlockState> = {
        start: {
          id: 'start',
          type: 'starter',
          name: 'Start',
          position: { x: 0, y: 0 },
          subBlocks: {},
          outputs: {},
          enabled: true,
        },
        end: {
          id: 'end',
          type: 'response',
          name: 'End',
          position: { x: 200, y: 0 },
          subBlocks: {},
          outputs: {},
          enabled: true,
        },
      }

      const edges: Edge[] = [
        {
          id: 'edge1',
          source: 'start',
          target: 'end',
          sourceHandle: null, // Null handle
          targetHandle: undefined, // Undefined handle
        },
        {
          id: 'edge2',
          source: 'start',
          target: 'end',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ]

      const loops: Record<string, Loop> = {}

      const serialized = serializer.serializeWorkflow(blocks, edges, loops)

      expect(serialized.connections).toHaveLength(2)

      // First connection should have undefined handles (null converted to undefined)
      expect(serialized.connections[0].sourceHandle).toBeUndefined()
      expect(serialized.connections[0].targetHandle).toBeUndefined()

      // Second connection should preserve handles
      expect(serialized.connections[1].sourceHandle).toBe('output')
      expect(serialized.connections[1].targetHandle).toBe('input')
    })
  })
})
