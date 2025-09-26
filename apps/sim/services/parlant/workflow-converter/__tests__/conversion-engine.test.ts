/**
 * Workflow to Journey Mapping System - Conversion Engine Tests
 *
 * Comprehensive tests for the core conversion engine functionality.
 * Tests conversion accuracy, error handling, and edge cases.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import {
  convertWorkflowToJourney,
  createWorkflowConverter,
  validateWorkflowForConversion,
  WorkflowConversionEngine,
} from '../index'
import type {
  ConversionOptions,
  ConversionResult,
  ReactFlowWorkflow,
  ValidationResult,
} from '../types'

// Mock logger to avoid console noise in tests
jest.mock('@/lib/logs/console/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

describe('WorkflowConversionEngine', () => {
  let engine: WorkflowConversionEngine
  let mockWorkflow: ReactFlowWorkflow

  beforeEach(() => {
    engine = new WorkflowConversionEngine()

    // Create a basic test workflow
    mockWorkflow = {
      id: 'test-workflow-1',
      name: 'Test Workflow',
      description: 'A test workflow for conversion',
      nodes: [
        {
          id: 'node-1',
          type: 'starter',
          position: { x: 100, y: 100 },
          data: {
            type: 'starter',
            name: 'Start Process',
          },
        },
        {
          id: 'node-2',
          type: 'agent',
          position: { x: 300, y: 100 },
          data: {
            type: 'agent',
            name: 'AI Assistant',
            prompt: 'Hello! How can I help you today?',
          },
        },
        {
          id: 'node-3',
          type: 'api',
          position: { x: 500, y: 100 },
          data: {
            type: 'api',
            name: 'Data Fetch',
            url: 'https://api.example.com/data',
            method: 'GET',
          },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          sourceHandle: 'source',
          targetHandle: 'target',
          type: 'workflowEdge',
        },
        {
          id: 'edge-2',
          source: 'node-2',
          target: 'node-3',
          sourceHandle: 'source',
          targetHandle: 'target',
          type: 'workflowEdge',
        },
      ],
      metadata: {
        version: '1.0.0',
        createdAt: '2024-01-01T00:00:00.000Z',
        workspaceId: 'test-workspace',
      },
    }
  })

  describe('Basic Conversion', () => {
    test('should successfully convert a simple workflow', async () => {
      const result: ConversionResult = await engine.convert(mockWorkflow)

      expect(result.success).toBe(true)
      expect(result.journey).toBeDefined()
      expect(result.errors).toHaveLength(0)
      expect(result.metadata.totalNodes).toBe(3)
      expect(result.metadata.totalEdges).toBe(2)
    })

    test('should preserve workflow metadata', async () => {
      const result: ConversionResult = await engine.convert(mockWorkflow)

      expect(result.journey?.metadata.originalWorkflowId).toBe(mockWorkflow.id)
      expect(result.journey?.title).toBe(mockWorkflow.name)
      expect(result.journey?.description).toContain(mockWorkflow.name)
    })

    test('should create states for each node', async () => {
      const result: ConversionResult = await engine.convert(mockWorkflow)

      expect(result.journey?.states).toHaveLength(3)

      // Check initial state
      const initialState = result.journey?.states.find((s) => s.type === 'initial')
      expect(initialState).toBeDefined()
      expect(initialState?.name).toBe('Start Process')

      // Check chat state
      const chatState = result.journey?.states.find((s) => s.type === 'chat')
      expect(chatState).toBeDefined()
      expect(chatState?.name).toBe('AI Assistant')
      expect(chatState?.content).toContain('Hello!')

      // Check tool state
      const toolState = result.journey?.states.find((s) => s.type === 'tool')
      expect(toolState).toBeDefined()
      expect(toolState?.name).toBe('Data Fetch')
      expect(toolState?.tools).toBeDefined()
    })

    test('should create transitions for each edge', async () => {
      const result: ConversionResult = await engine.convert(mockWorkflow)

      expect(result.journey?.transitions).toHaveLength(2)

      // Check transition structure
      if (result.journey?.transitions) {
        for (const transition of result.journey.transitions) {
          expect(transition.id).toBeDefined()
          expect(transition.sourceStateId).toBeDefined()
          expect(transition.targetStateId).toBeDefined()
        }
      }
    })
  })

  describe('Conversion Options', () => {
    test('should respect layout preservation option', async () => {
      const options: ConversionOptions = {
        preserveLayout: true,
        includeDebugInfo: false,
      }

      const result: ConversionResult = await engine.convert(mockWorkflow, options)

      expect(result.success).toBe(true)

      // Check that positions are preserved
      if (result.journey?.states) {
        for (const state of result.journey.states) {
          const originalNode = mockWorkflow.nodes.find((n) => state.name === n.data.name)
          if (originalNode) {
            expect(state.position).toEqual(originalNode.position)
          }
        }
      }
    })

    test('should handle validation option', async () => {
      const options: ConversionOptions = {
        validateOutput: true,
      }

      const result: ConversionResult = await engine.convert(mockWorkflow, options)

      expect(result.success).toBe(true)
      // Validation should not add errors for a valid workflow
      expect(result.errors.filter((e) => e.code.includes('VALIDATION')).length).toBe(0)
    })
  })

  describe('Error Handling', () => {
    test('should handle missing nodes gracefully', async () => {
      const invalidWorkflow = {
        ...mockWorkflow,
        nodes: [], // No nodes
        edges: mockWorkflow.edges, // But has edges
      }

      const result: ConversionResult = await engine.convert(invalidWorkflow)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some((e) => e.code.includes('MISSING'))).toBe(true)
    })

    test('should handle invalid edge references', async () => {
      const invalidWorkflow = {
        ...mockWorkflow,
        edges: [
          {
            id: 'invalid-edge',
            source: 'non-existent-node',
            target: 'node-2',
            sourceHandle: 'source',
            targetHandle: 'target',
            type: 'workflowEdge',
          },
        ],
      }

      const result: ConversionResult = await engine.convert(invalidWorkflow)

      // Should still attempt conversion but with warnings
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some((w) => w.code.includes('MISSING_STATES'))).toBe(true)
    })

    test('should recover from node conversion errors', async () => {
      // Create workflow with unsupported node type
      const workflowWithUnsupportedNode = {
        ...mockWorkflow,
        nodes: [
          ...mockWorkflow.nodes,
          {
            id: 'unsupported-node',
            type: 'unsupported-type',
            position: { x: 700, y: 100 },
            data: {
              type: 'unsupported-type',
              name: 'Unsupported Node',
            },
          },
        ],
      }

      const result: ConversionResult = await engine.convert(workflowWithUnsupportedNode)

      // Should still succeed with warnings
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some((w) => w.code.includes('NO_CONVERTER'))).toBe(true)
    })
  })

  describe('Progress Tracking', () => {
    test('should call progress callback during conversion', async () => {
      const progressCallback = jest.fn()

      await engine.convert(mockWorkflow, {}, progressCallback)

      expect(progressCallback).toHaveBeenCalled()

      // Check that progress steps are called in order
      const calls = progressCallback.mock.calls.map((call) => call[0])
      expect(calls.some((call) => call.step.includes('Analyzing'))).toBe(true)
      expect(calls.some((call) => call.step.includes('Converting'))).toBe(true)
      expect(calls.some((call) => call.step.includes('completed'))).toBe(true)
    })
  })

  describe('Custom Node Converters', () => {
    test('should allow registering custom converters', () => {
      const mockConverter = {
        canConvert: jest.fn(() => true),
        convert: jest.fn(() =>
          Promise.resolve({
            states: [],
            transitions: [],
          })
        ),
        validateInput: jest.fn(() => ({ valid: true, errors: [], warnings: [] })),
      }

      engine.registerNodeConverter('custom-type', mockConverter)

      const converters = engine.getAvailableConverters()
      expect(converters).toContain('custom-type')
    })
  })
})

describe('Factory Functions', () => {
  describe('createWorkflowConverter', () => {
    test('should create engine with built-in converters', () => {
      const engine = createWorkflowConverter()

      const converters = engine.getAvailableConverters()
      expect(converters).toContain('starter')
      expect(converters).toContain('agent')
      expect(converters).toContain('api')
    })
  })

  describe('convertWorkflowToJourney', () => {
    test('should perform conversion with default settings', async () => {
      const mockWorkflow: ReactFlowWorkflow = {
        id: 'simple-test',
        name: 'Simple Test',
        nodes: [
          {
            id: 'start',
            type: 'starter',
            position: { x: 0, y: 0 },
            data: { type: 'starter', name: 'Start' },
          },
        ],
        edges: [],
        metadata: { version: '1.0.0' },
      }

      const result = await convertWorkflowToJourney(mockWorkflow)

      expect(result.success).toBe(true)
      expect(result.journey).toBeDefined()
    })
  })

  describe('validateWorkflowForConversion', () => {
    test('should validate workflow structure', async () => {
      const mockWorkflow: ReactFlowWorkflow = {
        id: 'validation-test',
        name: 'Validation Test',
        nodes: [
          {
            id: 'start',
            type: 'starter',
            position: { x: 0, y: 0 },
            data: { type: 'starter', name: 'Start' },
          },
        ],
        edges: [],
        metadata: { version: '1.0.0' },
      }

      const result: ValidationResult = await validateWorkflowForConversion(mockWorkflow)

      expect(result.valid).toBe(true)
      expect(result.errors.filter((e) => e.severity === 'critical').length).toBe(0)
    })

    test('should identify validation issues', async () => {
      const invalidWorkflow: ReactFlowWorkflow = {
        id: '', // Missing ID
        name: '',
        nodes: [], // No nodes
        edges: [],
        metadata: { version: '1.0.0' },
      }

      const result: ValidationResult = await validateWorkflowForConversion(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})

describe('Edge Cases and Complex Scenarios', () => {
  test('should handle circular workflows', async () => {
    const circularWorkflow: ReactFlowWorkflow = {
      id: 'circular-test',
      name: 'Circular Test',
      nodes: [
        {
          id: 'node-a',
          type: 'starter',
          position: { x: 0, y: 0 },
          data: { type: 'starter', name: 'Node A' },
        },
        {
          id: 'node-b',
          type: 'agent',
          position: { x: 100, y: 0 },
          data: { type: 'agent', name: 'Node B', prompt: 'Test' },
        },
      ],
      edges: [
        {
          id: 'edge-ab',
          source: 'node-a',
          target: 'node-b',
          sourceHandle: 'source',
          targetHandle: 'target',
          type: 'workflowEdge',
        },
        {
          id: 'edge-ba',
          source: 'node-b',
          target: 'node-a',
          sourceHandle: 'source',
          targetHandle: 'target',
          type: 'workflowEdge',
        },
      ],
      metadata: { version: '1.0.0' },
    }

    const result = await convertWorkflowToJourney(circularWorkflow)

    // Should convert but with warnings about cycles
    expect(result.warnings.some((w) => w.code.includes('CYCLE') || w.code.includes('LOOP'))).toBe(
      true
    )
  })

  test('should handle large workflows efficiently', async () => {
    // Create a workflow with many nodes
    const largeWorkflow: ReactFlowWorkflow = {
      id: 'large-test',
      name: 'Large Test',
      nodes: Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        type: i === 0 ? 'starter' : 'agent',
        position: { x: i * 10, y: 0 },
        data: {
          type: i === 0 ? 'starter' : 'agent',
          name: `Node ${i}`,
          ...(i > 0 && { prompt: 'Test prompt' }),
        },
      })),
      edges: Array.from({ length: 99 }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${i}`,
        target: `node-${i + 1}`,
        sourceHandle: 'source',
        targetHandle: 'target',
        type: 'workflowEdge',
      })),
      metadata: { version: '1.0.0' },
    }

    const startTime = Date.now()
    const result = await convertWorkflowToJourney(largeWorkflow)
    const processingTime = Date.now() - startTime

    expect(result.success).toBe(true)
    expect(result.journey?.states).toHaveLength(100)
    expect(result.journey?.transitions).toHaveLength(99)

    // Should process in reasonable time (less than 5 seconds)
    expect(processingTime).toBeLessThan(5000)
  })
})

describe('Integration Tests', () => {
  test('should integrate with all built-in converters', async () => {
    const comprehensiveWorkflow: ReactFlowWorkflow = {
      id: 'comprehensive-test',
      name: 'Comprehensive Test',
      nodes: [
        {
          id: 'start-node',
          type: 'starter',
          position: { x: 0, y: 0 },
          data: { type: 'starter', name: 'Workflow Start' },
        },
        {
          id: 'agent-node',
          type: 'agent',
          position: { x: 200, y: 0 },
          data: {
            type: 'agent',
            name: 'AI Assistant',
            prompt: 'How can I help you?',
            model: 'gpt-4',
          },
        },
        {
          id: 'api-node',
          type: 'api',
          position: { x: 400, y: 0 },
          data: {
            type: 'api',
            name: 'Fetch Data',
            url: 'https://api.example.com/users',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          },
        },
      ],
      edges: [
        {
          id: 'start-to-agent',
          source: 'start-node',
          target: 'agent-node',
          sourceHandle: 'source',
          targetHandle: 'target',
          type: 'workflowEdge',
        },
        {
          id: 'agent-to-api',
          source: 'agent-node',
          target: 'api-node',
          sourceHandle: 'source',
          targetHandle: 'target',
          type: 'workflowEdge',
        },
      ],
      metadata: { version: '1.0.0' },
    }

    const result = await convertWorkflowToJourney(comprehensiveWorkflow)

    expect(result.success).toBe(true)
    expect(result.journey?.states).toHaveLength(3)

    // Verify each state type is correctly converted
    const initialState = result.journey?.states.find((s) => s.type === 'initial')
    const chatState = result.journey?.states.find((s) => s.type === 'chat')
    const toolState = result.journey?.states.find((s) => s.type === 'tool')

    expect(initialState).toBeDefined()
    expect(chatState).toBeDefined()
    expect(toolState).toBeDefined()

    // Verify state content is preserved
    expect(chatState?.content).toContain('How can I help you?')
    expect(toolState?.tools).toBeDefined()
  })
})
