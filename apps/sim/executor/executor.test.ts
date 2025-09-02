/**
 * Comprehensive Unit Tests for Block Execution Engine
 *
 * This module contains exhaustive tests for the Executor class,
 * ensuring all execution logic, error handling, and state management work correctly.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Executor } from '@/executor'
import { BlockType } from '@/executor/consts'
import type { ExecutionResult, StreamingExecution } from '@/executor/types'
import type { SerializedBlock, SerializedWorkflow } from '@/serializer/types'

// Mock dependencies
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
}

vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => mockLogger),
}))

vi.mock('@/lib/block-path-calculator', () => ({
  BlockPathCalculator: {
    calculateAccessibleBlocksForWorkflow: vi.fn(() => new Map()),
  },
}))

vi.mock('@/stores/execution/store', () => ({
  useExecutionStore: {
    getState: vi.fn(() => ({
      setIsExecuting: vi.fn(),
      setIsDebugging: vi.fn(),
      setPendingBlocks: vi.fn(),
      reset: vi.fn(),
      setActiveBlocks: vi.fn(),
      activeBlockIds: new Set(),
    })),
    setState: vi.fn((updater) => {
      const currentState = { activeBlockIds: new Set() }
      return updater(currentState)
    }),
  },
}))

vi.mock('@/stores/panel/console/store', () => ({
  useConsoleStore: {
    getState: vi.fn(() => ({
      addConsole: vi.fn(),
    })),
  },
}))

vi.mock('@/stores/settings/general/store', () => ({
  useGeneralStore: {
    getState: vi.fn(() => ({
      isDebugModeEnabled: false,
    })),
  },
}))

// Mock all executor components
vi.mock('@/executor/loops/loops', () => ({
  LoopManager: vi.fn().mockImplementation(() => ({
    processLoopIterations: vi.fn(),
  })),
}))

vi.mock('@/executor/parallels/parallels', () => ({
  ParallelManager: vi.fn().mockImplementation(() => ({
    processParallelIterations: vi.fn(),
    createVirtualBlockInstances: vi.fn(() => []),
    setupIterationContext: vi.fn(),
    storeIterationResult: vi.fn(),
  })),
}))

vi.mock('@/executor/path/path', () => ({
  PathTracker: vi.fn().mockImplementation(() => ({
    updateExecutionPaths: vi.fn(),
  })),
}))

vi.mock('@/executor/resolver/resolver', () => ({
  InputResolver: vi.fn().mockImplementation(() => ({
    resolveInputs: vi.fn((block) => ({ resolvedInput: block.config.params })),
    getContainingLoopId: vi.fn(() => null),
  })),
}))

vi.mock('@/executor/handlers', () => ({
  TriggerBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn((block) => block.metadata?.id === BlockType.TRIGGER),
    execute: vi.fn(() => Promise.resolve({ result: 'triggered' })),
  })),
  AgentBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn((block) => block.metadata?.id === BlockType.AGENT),
    execute: vi.fn(() => Promise.resolve({ content: 'agent response' })),
  })),
  ApiBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn((block) => block.metadata?.id === BlockType.API),
    execute: vi.fn(() => Promise.resolve({ data: { status: 'ok' }, status: 200 })),
  })),
  ConditionBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn((block) => block.metadata?.id === BlockType.CONDITION),
    execute: vi.fn(() =>
      Promise.resolve({ conditionResult: true, selectedConditionId: 'condition-1' })
    ),
  })),
  EvaluatorBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn((block) => block.metadata?.id === BlockType.EVALUATOR),
    execute: vi.fn(() => Promise.resolve({ result: true })),
  })),
  FunctionBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn((block) => block.metadata?.id === BlockType.FUNCTION),
    execute: vi.fn(() => Promise.resolve({ stdout: 'function output', result: 42 })),
  })),
  GenericBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn(() => true), // Generic handler accepts all blocks
    execute: vi.fn(() => Promise.resolve({ result: 'generic output' })),
  })),
  LoopBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn((block) => block.metadata?.id === BlockType.LOOP),
    execute: vi.fn(() => Promise.resolve({ result: 'loop executed' })),
  })),
  ParallelBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn((block) => block.metadata?.id === BlockType.PARALLEL),
    execute: vi.fn(() => Promise.resolve({ result: 'parallel executed' })),
  })),
  ResponseBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn((block) => block.metadata?.id === BlockType.RESPONSE),
    execute: vi.fn(() => Promise.resolve({ content: 'final response' })),
  })),
  RouterBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn((block) => block.metadata?.id === BlockType.ROUTER),
    execute: vi.fn(() => Promise.resolve({ selectedPath: { blockId: 'target-block' } })),
  })),
  WorkflowBlockHandler: vi.fn().mockImplementation(() => ({
    canHandle: vi.fn((block) => block.metadata?.id === BlockType.WORKFLOW),
    execute: vi.fn(() => Promise.resolve({ result: 'workflow executed' })),
  })),
}))

vi.mock('@/executor/utils', () => ({
  streamingResponseFormatProcessor: {
    processStream: vi.fn((stream) => stream),
  },
}))

describe('Executor', () => {
  let validWorkflow: SerializedWorkflow
  let mockExecutor: Executor

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Create a valid test workflow
    validWorkflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'A test workflow for unit testing',
      blocks: [
        {
          id: 'starter-block',
          enabled: true,
          metadata: {
            id: BlockType.STARTER,
            name: 'Start',
            category: 'blocks',
          },
          config: {
            params: {},
          },
        } as SerializedBlock,
        {
          id: 'api-block',
          enabled: true,
          metadata: {
            id: BlockType.API,
            name: 'API Call',
            category: 'blocks',
          },
          config: {
            params: {
              url: 'https://api.example.com',
              method: 'GET',
            },
          },
        } as SerializedBlock,
        {
          id: 'response-block',
          enabled: true,
          metadata: {
            id: BlockType.RESPONSE,
            name: 'Response',
            category: 'blocks',
          },
          config: {
            params: {
              content: 'Final response',
            },
          },
        } as SerializedBlock,
      ],
      connections: [
        {
          id: 'conn-1',
          source: 'starter-block',
          target: 'api-block',
          sourceHandle: 'source',
          targetHandle: 'target',
        },
        {
          id: 'conn-2',
          source: 'api-block',
          target: 'response-block',
          sourceHandle: 'source',
          targetHandle: 'target',
        },
      ],
      loops: {},
      parallels: {},
    }

    mockExecutor = new Executor(
      validWorkflow,
      {}, // initialBlockStates
      {}, // environmentVariables
      { input: 'test input' }, // workflowInput
      {} // workflowVariables
    )
  })

  describe('Constructor and Initialization', () => {
    it('should initialize with valid workflow', () => {
      expect(mockExecutor).toBeDefined()
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('error'),
        expect.anything()
      )
    })

    it('should handle new constructor format with options object', () => {
      const options = {
        workflow: validWorkflow,
        currentBlockStates: { 'test-block': { result: 'test' } },
        envVarValues: { API_KEY: 'test-key' },
        workflowInput: { message: 'hello' },
        workflowVariables: { var1: 'value1' },
        contextExtensions: {
          stream: true,
          selectedOutputIds: ['api-block'],
          executionId: 'exec-123',
          workspaceId: 'workspace-456',
        },
      }

      const executorWithOptions = new Executor(options)
      expect(executorWithOptions).toBeDefined()
    })

    it('should handle child execution flag correctly', () => {
      const options = {
        workflow: validWorkflow,
        contextExtensions: {
          isChildExecution: true,
        },
      }

      const childExecutor = new Executor(options)
      expect(childExecutor).toBeDefined()
    })

    it('should initialize loop and parallel managers', () => {
      const workflowWithLoops = {
        ...validWorkflow,
        loops: {
          'loop-1': {
            nodes: ['api-block'],
            iterations: 3,
            loopType: 'for' as const,
          },
        },
        parallels: {
          'parallel-1': {
            nodes: ['api-block'],
            parallelCount: 2,
            parallelType: 'count' as const,
          },
        },
      }

      const executorWithLoopsAndParallels = new Executor(workflowWithLoops)
      expect(executorWithLoopsAndParallels).toBeDefined()
    })
  })

  describe('Workflow Validation', () => {
    it('should validate workflow with starter block successfully', async () => {
      const result = await mockExecutor.execute('test-workflow-id')
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('should fail validation for workflow without starter block', () => {
      const workflowWithoutStarter = {
        ...validWorkflow,
        blocks: validWorkflow.blocks.filter((b) => b.metadata?.id !== BlockType.STARTER),
      }

      expect(() => new Executor(workflowWithoutStarter)).toThrow(
        'Workflow must have an enabled starter block'
      )
    })

    it('should fail validation for disabled starter block', () => {
      const workflowWithDisabledStarter = {
        ...validWorkflow,
        blocks: validWorkflow.blocks.map((b) =>
          b.metadata?.id === BlockType.STARTER ? { ...b, enabled: false } : b
        ),
      }

      expect(() => new Executor(workflowWithDisabledStarter)).toThrow(
        'Workflow must have an enabled starter block'
      )
    })

    it('should fail validation for starter block with incoming connections', () => {
      const workflowWithIncomingToStarter = {
        ...validWorkflow,
        connections: [
          ...validWorkflow.connections,
          {
            id: 'invalid-conn',
            source: 'api-block',
            target: 'starter-block',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
        ],
      }

      expect(() => new Executor(workflowWithIncomingToStarter)).toThrow(
        'Starter block cannot have incoming connections'
      )
    })

    it('should validate with specific start block ID', async () => {
      const triggerBlock = {
        id: 'trigger-block',
        enabled: true,
        metadata: {
          id: BlockType.TRIGGER,
          name: 'Trigger',
          category: 'triggers',
        },
        config: { params: {} },
      } as SerializedBlock

      const workflowWithTrigger = {
        ...validWorkflow,
        blocks: [...validWorkflow.blocks, triggerBlock],
      }

      const executorWithTrigger = new Executor(workflowWithTrigger)
      const result = await executorWithTrigger.execute('test-workflow-id', 'trigger-block')

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('should fail validation for non-existent start block', () => {
      expect(async () => {
        await mockExecutor.execute('test-workflow-id', 'non-existent-block')
      }).rejects.toThrow('Start block non-existent-block not found or disabled')
    })

    it('should validate connections reference existing blocks', () => {
      const workflowWithInvalidConnection = {
        ...validWorkflow,
        connections: [
          ...validWorkflow.connections,
          {
            id: 'invalid-conn',
            source: 'non-existent-block',
            target: 'api-block',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
        ],
      }

      expect(() => new Executor(workflowWithInvalidConnection)).toThrow(
        'Connection references non-existent source block: non-existent-block'
      )
    })

    it('should validate loop configurations', () => {
      const workflowWithInvalidLoop = {
        ...validWorkflow,
        loops: {
          'invalid-loop': {
            nodes: ['non-existent-block'],
            iterations: 3,
            loopType: 'for' as const,
          },
        },
      }

      expect(() => new Executor(workflowWithInvalidLoop)).toThrow(
        'Loop invalid-loop references non-existent block: non-existent-block'
      )
    })

    it('should validate forEach loop has collection', () => {
      const workflowWithInvalidForEachLoop = {
        ...validWorkflow,
        loops: {
          'foreach-loop': {
            nodes: ['api-block'],
            iterations: 0,
            loopType: 'forEach' as const,
            forEachItems: '',
          },
        },
      }

      expect(() => new Executor(workflowWithInvalidForEachLoop)).toThrow(
        'forEach loop foreach-loop requires a collection to iterate over'
      )
    })

    it('should validate positive loop iterations', () => {
      const workflowWithZeroIterations = {
        ...validWorkflow,
        loops: {
          'zero-loop': {
            nodes: ['api-block'],
            iterations: 0,
            loopType: 'for' as const,
          },
        },
      }

      expect(() => new Executor(workflowWithZeroIterations)).toThrow(
        'Loop zero-loop must have a positive iterations value'
      )
    })
  })

  describe('Execution Context Creation', () => {
    it('should create execution context with starter block', async () => {
      const result = await mockExecutor.execute('test-workflow-id')

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.logs).toBeDefined()
      expect(Array.isArray(result.logs)).toBe(true)
    })

    it('should handle structured workflow input', async () => {
      const structuredInput = {
        input: { message: 'hello world' },
        conversationId: 'conv-123',
        files: [
          {
            id: 'file-1',
            name: 'test.txt',
            url: 'http://test.com/file.txt',
            size: 100,
            type: 'text/plain',
            key: 'test-key',
            uploadedAt: '2023-01-01',
            expiresAt: '2023-01-02',
          },
        ],
      }

      const executorWithStructuredInput = new Executor(validWorkflow, {}, {}, structuredInput)

      const result = await executorWithStructuredInput.execute('test-workflow-id')

      expect(result.success).toBe(true)
      expect(result.logs).toBeDefined()
    })

    it('should handle input format processing', async () => {
      const workflowWithInputFormat = {
        ...validWorkflow,
        blocks: validWorkflow.blocks.map((b) =>
          b.metadata?.id === BlockType.STARTER
            ? {
                ...b,
                config: {
                  params: {
                    inputFormat: [
                      { name: 'message', type: 'string' },
                      { name: 'count', type: 'number' },
                    ],
                  },
                },
              }
            : b
        ),
      }

      const executorWithInputFormat = new Executor(
        workflowWithInputFormat,
        {},
        {},
        { input: { message: 'test', count: '5' } }
      )

      const result = await executorWithInputFormat.execute('test-workflow-id')

      expect(result.success).toBe(true)
    })

    it('should initialize with environment and workflow variables', async () => {
      const executor = new Executor(
        validWorkflow,
        {},
        { API_KEY: 'test-key', ENV: 'test' },
        { input: 'test' },
        { var1: 'value1', var2: 42 }
      )

      const result = await executor.execute('test-workflow-id')

      expect(result.success).toBe(true)
    })
  })

  describe('Block Execution', () => {
    it('should execute blocks in correct order', async () => {
      const result = await mockExecutor.execute('test-workflow-id')

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.logs).toBeDefined()
      expect(result.logs!.length).toBeGreaterThan(0)
    })

    it('should handle block execution errors gracefully', async () => {
      // Mock a handler to throw an error
      const { GenericBlockHandler } = await import('@/executor/handlers')
      const mockGenericHandler = GenericBlockHandler as any
      mockGenericHandler.mockImplementation(() => ({
        canHandle: vi.fn(() => true),
        execute: vi.fn(() => Promise.reject(new Error('Block execution failed'))),
      }))

      const result = await mockExecutor.execute('test-workflow-id')

      expect(result).toBeDefined()
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should handle disabled block execution', async () => {
      const workflowWithDisabledBlock = {
        ...validWorkflow,
        blocks: validWorkflow.blocks.map((b) =>
          b.id === 'api-block' ? { ...b, enabled: false } : b
        ),
      }

      const executorWithDisabledBlock = new Executor(workflowWithDisabledBlock)
      const result = await executorWithDisabledBlock.execute('test-workflow-id')

      // Should still succeed by skipping disabled blocks
      expect(result.success).toBe(true)
    })

    it('should handle streaming execution', async () => {
      // Mock a handler to return streaming result
      const { AgentBlockHandler } = await import('@/executor/handlers')
      const mockAgentHandler = AgentBlockHandler as any

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('streaming content'))
          controller.close()
        },
      })

      const streamingExecution: StreamingExecution = {
        stream: mockStream,
        execution: {
          success: true,
          output: { content: 'streaming response' },
          logs: [],
        },
      }

      mockAgentHandler.mockImplementation(() => ({
        canHandle: vi.fn((block) => block.metadata?.id === BlockType.AGENT),
        execute: vi.fn(() => Promise.resolve(streamingExecution)),
      }))

      // Add agent block to workflow
      const workflowWithAgent = {
        ...validWorkflow,
        blocks: [
          ...validWorkflow.blocks,
          {
            id: 'agent-block',
            enabled: true,
            metadata: {
              id: BlockType.AGENT,
              name: 'Agent',
              category: 'blocks',
            },
            config: { params: { model: 'gpt-4' } },
          } as SerializedBlock,
        ],
        connections: [
          ...validWorkflow.connections,
          {
            id: 'conn-agent',
            source: 'api-block',
            target: 'agent-block',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
        ],
      }

      const executorWithAgent = new Executor(workflowWithAgent)
      const result = await executorWithAgent.execute('test-workflow-id')

      expect(result.success).toBe(true)
    })

    it('should handle error paths correctly', async () => {
      // Add error connection to workflow
      const workflowWithErrorPath = {
        ...validWorkflow,
        blocks: [
          ...validWorkflow.blocks,
          {
            id: 'error-handler',
            enabled: true,
            metadata: {
              id: BlockType.RESPONSE,
              name: 'Error Handler',
              category: 'blocks',
            },
            config: { params: { content: 'Error handled' } },
          } as SerializedBlock,
        ],
        connections: [
          ...validWorkflow.connections,
          {
            id: 'error-conn',
            source: 'api-block',
            target: 'error-handler',
            sourceHandle: 'error',
            targetHandle: 'target',
          },
        ],
      }

      // Mock API block to fail
      const { ApiBlockHandler } = await import('@/executor/handlers')
      const mockApiHandler = ApiBlockHandler as any
      mockApiHandler.mockImplementation(() => ({
        canHandle: vi.fn((block) => block.metadata?.id === BlockType.API),
        execute: vi.fn(() => Promise.reject(new Error('API call failed'))),
      }))

      const executorWithErrorPath = new Executor(workflowWithErrorPath)
      const result = await executorWithErrorPath.execute('test-workflow-id')

      // Should succeed by following error path
      expect(result.success).toBe(true)
    })
  })

  describe('Loop Execution', () => {
    it('should handle loop blocks correctly', async () => {
      const workflowWithLoop = {
        ...validWorkflow,
        blocks: [
          ...validWorkflow.blocks,
          {
            id: 'loop-block',
            enabled: true,
            metadata: {
              id: BlockType.LOOP,
              name: 'Loop',
              category: 'blocks',
            },
            config: { params: { iterations: 3 } },
          } as SerializedBlock,
        ],
        connections: [
          ...validWorkflow.connections,
          {
            id: 'loop-conn',
            source: 'api-block',
            target: 'loop-block',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
        ],
        loops: {
          'loop-block': {
            nodes: ['api-block'],
            iterations: 3,
            loopType: 'for' as const,
          },
        },
      }

      const executorWithLoop = new Executor(workflowWithLoop)
      const result = await executorWithLoop.execute('test-workflow-id')

      expect(result.success).toBe(true)
    })

    it('should handle forEach loops', async () => {
      const workflowWithForEachLoop = {
        ...validWorkflow,
        loops: {
          'foreach-loop': {
            nodes: ['api-block'],
            iterations: 0,
            loopType: 'forEach' as const,
            forEachItems: [1, 2, 3],
          },
        },
      }

      const executorWithForEachLoop = new Executor(workflowWithForEachLoop)
      const result = await executorWithForEachLoop.execute('test-workflow-id')

      expect(result.success).toBe(true)
    })
  })

  describe('Parallel Execution', () => {
    it('should handle parallel blocks correctly', async () => {
      const workflowWithParallel = {
        ...validWorkflow,
        blocks: [
          ...validWorkflow.blocks,
          {
            id: 'parallel-block',
            enabled: true,
            metadata: {
              id: BlockType.PARALLEL,
              name: 'Parallel',
              category: 'blocks',
            },
            config: { params: { parallelCount: 2 } },
          } as SerializedBlock,
        ],
        parallels: {
          'parallel-block': {
            nodes: ['api-block'],
            parallelCount: 2,
            parallelType: 'count' as const,
          },
        },
      }

      const executorWithParallel = new Executor(workflowWithParallel)
      const result = await executorWithParallel.execute('test-workflow-id')

      expect(result.success).toBe(true)
    })
  })

  describe('Debug Mode', () => {
    it('should handle debug mode execution', async () => {
      const { useGeneralStore } = await import('@/stores/settings/general/store')
      const mockGeneralStore = useGeneralStore as any
      mockGeneralStore.getState.mockReturnValue({
        isDebugModeEnabled: true,
      })

      const debugExecutor = new Executor(validWorkflow)
      const result = await debugExecutor.execute('test-workflow-id')

      expect(result).toBeDefined()
      expect(result.metadata?.isDebugSession).toBe(true)
      expect(result.metadata?.pendingBlocks).toBeDefined()
    })

    it('should handle debug step continuation', async () => {
      const { useGeneralStore } = await import('@/stores/settings/general/store')
      const mockGeneralStore = useGeneralStore as any
      mockGeneralStore.getState.mockReturnValue({
        isDebugModeEnabled: true,
      })

      const debugExecutor = new Executor(validWorkflow)
      const initialResult = (await debugExecutor.execute('test-workflow-id')) as ExecutionResult

      if (initialResult.metadata?.context) {
        const continueResult = await debugExecutor.continueExecution(
          ['api-block'],
          initialResult.metadata.context
        )

        expect(continueResult).toBeDefined()
        expect(continueResult.success).toBe(true)
      }
    })
  })

  describe('Execution Cancellation', () => {
    it('should handle execution cancellation', async () => {
      // Start execution and immediately cancel
      const executionPromise = mockExecutor.execute('test-workflow-id')
      mockExecutor.cancel()

      const result = await executionPromise

      expect(result).toBeDefined()
      expect(result.success).toBe(false)
      expect(result.error).toContain('cancelled')
    })

    it('should handle cancellation in debug mode', async () => {
      const { useGeneralStore } = await import('@/stores/settings/general/store')
      const mockGeneralStore = useGeneralStore as any
      mockGeneralStore.getState.mockReturnValue({
        isDebugModeEnabled: true,
      })

      const debugExecutor = new Executor(validWorkflow)
      const executionPromise = debugExecutor.execute('test-workflow-id')
      debugExecutor.cancel()

      const result = await executionPromise

      expect(result).toBeDefined()
      expect(result.success).toBe(false)
      expect(result.error).toContain('cancelled')
    })
  })

  describe('Complex Workflow Scenarios', () => {
    it('should handle condition blocks and routing', async () => {
      const workflowWithCondition = {
        ...validWorkflow,
        blocks: [
          ...validWorkflow.blocks,
          {
            id: 'condition-block',
            enabled: true,
            metadata: {
              id: BlockType.CONDITION,
              name: 'Condition',
              category: 'blocks',
            },
            config: { params: { conditions: [{ id: 'cond-1', expression: 'true' }] } },
          } as SerializedBlock,
          {
            id: 'true-path-block',
            enabled: true,
            metadata: {
              id: BlockType.RESPONSE,
              name: 'True Path',
              category: 'blocks',
            },
            config: { params: { content: 'True path taken' } },
          } as SerializedBlock,
        ],
        connections: [
          ...validWorkflow.connections.slice(0, 1), // Keep starter to api
          {
            id: 'api-to-condition',
            source: 'api-block',
            target: 'condition-block',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
          {
            id: 'condition-to-true',
            source: 'condition-block',
            target: 'true-path-block',
            sourceHandle: 'condition-cond-1',
            targetHandle: 'target',
          },
        ],
      }

      const executorWithCondition = new Executor(workflowWithCondition)
      const result = await executorWithCondition.execute('test-workflow-id')

      expect(result.success).toBe(true)
    })

    it('should handle router blocks', async () => {
      const workflowWithRouter = {
        ...validWorkflow,
        blocks: [
          ...validWorkflow.blocks,
          {
            id: 'router-block',
            enabled: true,
            metadata: {
              id: BlockType.ROUTER,
              name: 'Router',
              category: 'blocks',
            },
            config: { params: { routes: [{ id: 'route-1', target: 'response-block' }] } },
          } as SerializedBlock,
        ],
        connections: [
          {
            id: 'starter-to-router',
            source: 'starter-block',
            target: 'router-block',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
          {
            id: 'router-to-response',
            source: 'router-block',
            target: 'response-block',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
        ],
      }

      const executorWithRouter = new Executor(workflowWithRouter)
      const result = await executorWithRouter.execute('test-workflow-id')

      expect(result.success).toBe(true)
    })

    it('should handle nested workflows', async () => {
      const workflowWithNestedWorkflow = {
        ...validWorkflow,
        blocks: [
          ...validWorkflow.blocks,
          {
            id: 'workflow-block',
            enabled: true,
            metadata: {
              id: BlockType.WORKFLOW,
              name: 'Nested Workflow',
              category: 'blocks',
            },
            config: { params: { workflowId: 'nested-workflow-id' } },
          } as SerializedBlock,
        ],
        connections: [
          ...validWorkflow.connections,
          {
            id: 'api-to-workflow',
            source: 'api-block',
            target: 'workflow-block',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
        ],
      }

      const executorWithNestedWorkflow = new Executor(workflowWithNestedWorkflow)
      const result = await executorWithNestedWorkflow.execute('test-workflow-id')

      expect(result.success).toBe(true)
    })
  })

  describe('Performance and Stress Tests', () => {
    it('should handle large workflows efficiently', async () => {
      // Create a workflow with many blocks
      const largeWorkflow = {
        ...validWorkflow,
        blocks: [
          validWorkflow.blocks[0], // Keep starter
          ...Array.from(
            { length: 50 },
            (_, i) =>
              ({
                id: `block-${i}`,
                enabled: true,
                metadata: {
                  id: BlockType.API,
                  name: `Block ${i}`,
                  category: 'blocks',
                },
                config: { params: { url: `https://api.example.com/${i}` } },
              }) as SerializedBlock
          ),
          validWorkflow.blocks[2], // Keep response
        ],
        connections: [
          {
            id: 'starter-to-first',
            source: 'starter-block',
            target: 'block-0',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
          // Chain all blocks together
          ...Array.from({ length: 49 }, (_, i) => ({
            id: `conn-${i}`,
            source: `block-${i}`,
            target: `block-${i + 1}`,
            sourceHandle: 'source',
            targetHandle: 'target',
          })),
          {
            id: 'last-to-response',
            source: 'block-49',
            target: 'response-block',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
        ],
      }

      const startTime = Date.now()
      const largeExecutor = new Executor(largeWorkflow)
      const result = await largeExecutor.execute('large-workflow-id')
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete in under 5 seconds
    })

    it('should handle concurrent executions', async () => {
      const concurrentExecutions = Array.from({ length: 10 }, async (_, i) => {
        const executor = new Executor(validWorkflow)
        const result = await executor.execute(`workflow-${i}`)
        expect(result.success).toBe(true)
        return result
      })

      const results = await Promise.all(concurrentExecutions)
      expect(results).toHaveLength(10)
      results.forEach((result) => {
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Error Recovery and Edge Cases', () => {
    it('should handle malformed block configurations', async () => {
      const workflowWithMalformedBlock = {
        ...validWorkflow,
        blocks: [
          validWorkflow.blocks[0], // starter
          {
            id: 'malformed-block',
            enabled: true,
            metadata: null, // Malformed metadata
            config: { params: {} },
          } as any,
          validWorkflow.blocks[2], // response
        ],
      }

      const executorWithMalformed = new Executor(workflowWithMalformedBlock)
      const result = await executorWithMalformed.execute('test-workflow-id')

      // Should handle gracefully and continue execution
      expect(result).toBeDefined()
    })

    it('should handle circular dependencies', async () => {
      const workflowWithCircularDeps = {
        ...validWorkflow,
        connections: [
          {
            id: 'circular-1',
            source: 'starter-block',
            target: 'api-block',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
          {
            id: 'circular-2',
            source: 'api-block',
            target: 'response-block',
            sourceHandle: 'source',
            targetHandle: 'target',
          },
          {
            id: 'circular-3',
            source: 'response-block',
            target: 'api-block', // Creates circular dependency
            sourceHandle: 'source',
            targetHandle: 'target',
          },
        ],
      }

      const executorWithCircular = new Executor(workflowWithCircularDeps)
      const result = await executorWithCircular.execute('test-workflow-id')

      // Should complete within iteration limit
      expect(result).toBeDefined()
    })

    it('should handle memory cleanup after execution', async () => {
      const executor = new Executor(validWorkflow)
      const result = await executor.execute('test-workflow-id')

      expect(result.success).toBe(true)

      // Execute again to ensure no memory leaks
      const result2 = await executor.execute('test-workflow-id-2')
      expect(result2.success).toBe(true)
    })
  })

  describe('Telemetry and Logging', () => {
    it('should log workflow execution events', async () => {
      const result = await mockExecutor.execute('test-workflow-id')

      expect(result.success).toBe(true)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Validating'),
        expect.anything()
      )
    })

    it('should create comprehensive execution logs', async () => {
      const result = await mockExecutor.execute('test-workflow-id')

      expect(result.success).toBe(true)
      expect(result.logs).toBeDefined()
      expect(Array.isArray(result.logs)).toBe(true)

      if (result.logs && result.logs.length > 0) {
        const log = result.logs[0]
        expect(log.blockId).toBeDefined()
        expect(log.startedAt).toBeDefined()
        expect(log.endedAt).toBeDefined()
        expect(typeof log.success).toBe('boolean')
      }
    })

    it('should include execution metadata', async () => {
      const result = await mockExecutor.execute('test-workflow-id')

      expect(result.success).toBe(true)
      expect(result.metadata).toBeDefined()
      expect(result.metadata!.startTime).toBeDefined()
      expect(typeof result.metadata!.duration).toBe('number')
      expect(result.metadata!.workflowConnections).toBeDefined()
    })
  })
})
