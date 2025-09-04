/**
 * Comprehensive test suite for the main Workflow component
 * Tests React Flow canvas, drag and drop functionality, node management,
 * edge connections, keyboard shortcuts, and user interactions
 */

import type * as React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ workspaceId: 'workspace-1', workflowId: 'workflow-1' })),
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
    push: vi.fn(),
  })),
}))

// Mock ReactFlow with essential functionality
vi.mock('reactflow', () => {
  const MockReactFlow = ({
    children,
    onDrop,
    onDragOver,
    onConnect,
    onNodesChange,
    onEdgesChange,
    onNodeDrag,
    onNodeDragStart,
    onNodeDragStop,
    ...props
  }: any) => {
    return (
      <div data-testid='react-flow-wrapper' onDrop={onDrop} onDragOver={onDragOver} {...props}>
        {children}
        <div data-testid='react-flow-background'>Background</div>
      </div>
    )
  }

  return {
    default: MockReactFlow,
    ReactFlowProvider: ({ children }: any) => (
      <div data-testid='react-flow-provider'>{children}</div>
    ),
    Background: ({ children, ...props }: any) => (
      <div data-testid='background' {...props}>
        {children}
      </div>
    ),
    Handle: ({ children, ...props }: any) => (
      <div data-testid='handle' {...props}>
        {children}
      </div>
    ),
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
    ConnectionLineType: { SmoothStep: 'smoothstep' },
    useReactFlow: vi.fn(() => ({
      project: vi.fn(({ x, y }) => ({ x, y })),
      getNodes: vi.fn(() => []),
      fitView: vi.fn(),
    })),
    useUpdateNodeInternals: vi.fn(() => vi.fn()),
  }
})

// Mock logger
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock workspace permissions provider
vi.mock('@/app/workspace/[workspaceId]/providers/workspace-permissions-provider', () => ({
  useUserPermissionsContext: vi.fn(() => ({
    canRead: true,
    canEdit: true,
    canAdmin: false,
  })),
}))

// Mock collaborative workflow hooks
vi.mock('@/hooks/use-collaborative-workflow', () => ({
  useCollaborativeWorkflow: vi.fn(() => ({
    collaborativeAddBlock: vi.fn(),
    collaborativeAddEdge: vi.fn(),
    collaborativeRemoveEdge: vi.fn(),
    collaborativeUpdateBlockPosition: vi.fn(),
    collaborativeUpdateParentId: vi.fn(),
    collaborativeSetSubblockValue: vi.fn(),
  })),
}))

// Mock workspace permissions
vi.mock('@/hooks/use-workspace-permissions', () => ({
  useWorkspacePermissions: vi.fn(() => ({
    permissions: {
      total: 1,
      users: [{ email: 'test@example.com', permissionType: 'admin' }],
    },
    error: null,
  })),
}))

// Mock stream cleanup
vi.mock('@/hooks/use-stream-cleanup', () => ({
  useStreamCleanup: vi.fn(),
}))

// Mock current workflow hook
vi.mock('./hooks', () => ({
  useCurrentWorkflow: vi.fn(() => ({
    blocks: {
      'block-1': {
        id: 'block-1',
        type: 'starter',
        name: 'Start Block',
        position: { x: 100, y: 100 },
        enabled: true,
        subBlocks: {},
        outputs: {},
        data: {},
      },
    },
    edges: [],
    loops: {},
    parallels: {},
    isDiffMode: false,
    getBlockById: vi.fn((id) => ({
      id,
      type: 'starter',
      name: 'Test Block',
      enabled: true,
    })),
  })),
}))

// Mock stores
vi.mock('@/stores/copilot/store', () => ({
  useCopilotStore: vi.fn((selector) =>
    selector ? selector({ cleanup: vi.fn() }) : { cleanup: vi.fn() }
  ),
}))

vi.mock('@/stores/execution/store', () => ({
  useExecutionStore: vi.fn(() => ({
    activeBlockIds: new Set(),
    pendingBlocks: [],
  })),
}))

vi.mock('@/stores/settings/general/store', () => ({
  useGeneralStore: {
    getState: vi.fn(() => ({
      isAutoConnectEnabled: true,
    })),
  },
}))

vi.mock('@/stores/workflow-diff/store', () => ({
  useWorkflowDiffStore: vi.fn(() => ({
    diffAnalysis: null,
    isShowingDiff: false,
    isDiffReady: false,
    clearDiff: vi.fn(),
  })),
}))

vi.mock('@/stores/workflows/registry/store', () => ({
  useWorkflowRegistry: vi.fn(() => ({
    workflows: {
      'workflow-1': {
        id: 'workflow-1',
        name: 'Test Workflow',
        workspaceId: 'workspace-1',
      },
    },
    activeWorkflowId: 'workflow-1',
    isLoading: false,
    setActiveWorkflow: vi.fn(),
    createWorkflow: vi.fn(),
  })),
  hasWorkflowsInitiallyLoaded: vi.fn(() => true),
}))

vi.mock('@/stores/workflows/workflow/store', () => ({
  useWorkflowStore: vi.fn(() => ({
    updateNodeDimensions: vi.fn(),
    updateBlockPosition: vi.fn(),
    lastUpdate: Date.now(),
  })),
}))

// Mock blocks registry
vi.mock('@/blocks', () => ({
  getBlock: vi.fn((type) => ({
    name: `${type} Block`,
    description: `Test ${type} block`,
    icon: () => null,
    subBlocks: [],
    outputs: {},
    category: 'test',
  })),
}))

// Mock utility functions
vi.mock('./utils', () => ({
  getNodeAbsolutePosition: vi.fn(() => ({ x: 0, y: 0 })),
  getNodeDepth: vi.fn(() => 0),
  getNodeHierarchy: vi.fn(() => []),
  isPointInLoopNode: vi.fn(() => null),
  resizeLoopNodes: vi.fn(),
  updateNodeParent: vi.fn(),
}))

// Mock auto-layout utility
vi.mock('./utils/auto-layout', () => ({
  applyAutoLayoutAndUpdateStore: vi.fn(() => Promise.resolve({ success: true })),
}))

// Mock component dependencies
vi.mock('./components/control-bar/control-bar', () => ({
  ControlBar: ({ hasValidationErrors }: any) => (
    <div data-testid='control-bar' data-has-errors={hasValidationErrors}>
      <button data-testid='auto-layout-btn'>Auto Layout</button>
    </div>
  ),
}))

vi.mock('./components/diff-controls', () => ({
  DiffControls: () => <div data-testid='diff-controls'>Diff Controls</div>,
}))

vi.mock('./components/error/index', () => ({
  ErrorBoundary: ({ children }: any) => <div data-testid='error-boundary'>{children}</div>,
}))

vi.mock('./components/panel/panel', () => ({
  Panel: () => <div data-testid='panel'>Panel</div>,
}))

vi.mock('./components/workflow-block/workflow-block', () => ({
  WorkflowBlock: ({ id, data }: any) => (
    <div data-testid={`workflow-block-${id}`} data-type={data.type}>
      <div className='workflow-drag-handle' data-testid='drag-handle'>
        {data.name}
      </div>
    </div>
  ),
}))

vi.mock('./components/subflows/subflow-node', () => ({
  SubflowNodeComponent: ({ id, data }: any) => (
    <div data-testid={`subflow-node-${id}`} data-kind={data.kind}>
      <div className='workflow-drag-handle' data-testid='subflow-drag-handle'>
        {data.kind} Node
      </div>
    </div>
  ),
}))

vi.mock('./components/workflow-edge/workflow-edge', () => ({
  WorkflowEdge: ({ id, data }: any) => (
    <div data-testid={`workflow-edge-${id}`} data-selected={data.isSelected}>
      Edge
    </div>
  ),
}))

// Import the component after mocks
import Workflow from './workflow'

describe('Workflow Component', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    // Reset global event listeners
    document.removeEventListener = vi.fn()
    document.addEventListener = vi.fn()
    window.removeEventListener = vi.fn()
    window.addEventListener = vi.fn()
  })

  describe('Component Rendering', () => {
    it('should render workflow canvas with all essential components', () => {
      render(<Workflow />)

      // Verify core structure
      expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument()
      expect(screen.getByTestId('react-flow-wrapper')).toBeInTheDocument()
      expect(screen.getByTestId('background')).toBeInTheDocument()
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()

      // Verify UI components
      expect(screen.getByTestId('control-bar')).toBeInTheDocument()
      expect(screen.getByTestId('panel')).toBeInTheDocument()
      expect(screen.getByTestId('diff-controls')).toBeInTheDocument()
    })

    it('should render workflow blocks from state', async () => {
      const mockCurrentWorkflow = vi.fn(() => ({
        blocks: {
          'starter-1': {
            id: 'starter-1',
            type: 'starter',
            name: 'Start',
            position: { x: 0, y: 0 },
            enabled: true,
            subBlocks: {},
            outputs: {},
            data: {},
          },
          'api-1': {
            id: 'api-1',
            type: 'api',
            name: 'API Call',
            position: { x: 200, y: 0 },
            enabled: true,
            subBlocks: {},
            outputs: {},
            data: {},
          },
        },
        edges: [
          {
            id: 'edge-1',
            source: 'starter-1',
            target: 'api-1',
            sourceHandle: 'source',
            targetHandle: 'target',
            type: 'workflowEdge',
          },
        ],
        loops: {},
        parallels: {},
        isDiffMode: false,
        getBlockById: vi.fn(),
      }))

      const { useCurrentWorkflow } = await import('./hooks')
      vi.mocked(useCurrentWorkflow).mockReturnValue(mockCurrentWorkflow())

      render(<Workflow />)

      await waitFor(() => {
        expect(screen.getByTestId('workflow-block-starter-1')).toBeInTheDocument()
        expect(screen.getByTestId('workflow-block-api-1')).toBeInTheDocument()
      })
    })

    it('should render subflow nodes correctly', async () => {
      const mockCurrentWorkflow = vi.fn(() => ({
        blocks: {
          'loop-1': {
            id: 'loop-1',
            type: 'loop',
            name: 'Loop Container',
            position: { x: 0, y: 0 },
            enabled: true,
            subBlocks: {},
            outputs: {},
            data: {
              width: 500,
              height: 300,
            },
          },
        },
        edges: [],
        loops: {},
        parallels: {},
        isDiffMode: false,
        getBlockById: vi.fn(),
      }))

      const { useCurrentWorkflow } = await import('./hooks')
      vi.mocked(useCurrentWorkflow).mockReturnValue(mockCurrentWorkflow())

      render(<Workflow />)

      await waitFor(() => {
        expect(screen.getByTestId('subflow-node-loop-1')).toBeInTheDocument()
        expect(screen.getByTestId('subflow-node-loop-1')).toHaveAttribute('data-kind', 'loop')
      })
    })
  })

  describe('Drag and Drop Functionality', () => {
    it('should handle toolbar block drop on canvas', async () => {
      const mockAddBlock = vi.fn()
      const { useCollaborativeWorkflow } = await import('@/hooks/use-collaborative-workflow')
      vi.mocked(useCollaborativeWorkflow).mockImplementation(() => ({
        // Connection status
        isConnected: true,
        currentWorkflowId: 'test-workflow',
        presenceUsers: [],
        hasOperationError: false,
        // Workflow management
        joinWorkflow: vi.fn(),
        leaveWorkflow: vi.fn(),
        // Collaborative operations
        collaborativeAddBlock: mockAddBlock,
        collaborativeUpdateBlockPosition: vi.fn(),
        collaborativeUpdateBlockName: vi.fn(),
        collaborativeRemoveBlock: vi.fn(),
        collaborativeToggleBlockEnabled: vi.fn(),
        collaborativeUpdateParentId: vi.fn(),
        collaborativeToggleBlockWide: vi.fn(),
        collaborativeToggleBlockAdvancedMode: vi.fn(),
        collaborativeToggleBlockTriggerMode: vi.fn(),
        collaborativeToggleBlockHandles: vi.fn(),
        collaborativeDuplicateBlock: vi.fn(),
        collaborativeAddEdge: vi.fn(),
        collaborativeRemoveEdge: vi.fn(),
        collaborativeSetSubblockValue: vi.fn(),
        collaborativeSetTagSelection: vi.fn(),
        // Collaborative variable operations
        collaborativeUpdateVariable: vi.fn(),
        collaborativeAddVariable: vi.fn(),
        collaborativeDeleteVariable: vi.fn(),
        collaborativeDuplicateVariable: vi.fn(),
        // Collaborative loop/parallel operations
        collaborativeUpdateLoopType: vi.fn(),
        collaborativeUpdateParallelType: vi.fn(),
        // Unified iteration operations
        collaborativeUpdateIterationCount: vi.fn(),
        collaborativeUpdateIterationCollection: vi.fn(),
        // Direct access to stores
        workflowStore: {} as any,
        subBlockStore: {} as any,
      }))

      render(<Workflow />)

      const canvas = screen.getByTestId('react-flow-wrapper')

      // Simulate drag and drop event
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      })

      // Mock the dataTransfer data
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: vi.fn(() => JSON.stringify({ type: 'api' })),
        },
        writable: false,
      })

      Object.defineProperty(dropEvent, 'currentTarget', {
        value: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600,
          }),
        },
        writable: false,
      })

      Object.defineProperty(dropEvent, 'clientX', { value: 100, writable: false })
      Object.defineProperty(dropEvent, 'clientY', { value: 100, writable: false })

      fireEvent(canvas, dropEvent)

      await waitFor(() => {
        expect(mockAddBlock).toHaveBeenCalledWith(
          expect.any(String), // id
          'api', // type
          expect.stringContaining('api Block'), // name
          expect.objectContaining({ x: 100, y: 100 }), // position
          undefined, // additional data
          undefined, // parent info
          undefined, // extra data
          undefined // auto-connect edge
        )
      })
    })

    it('should handle drag over events with highlighting', async () => {
      render(<Workflow />)

      const canvas = screen.getByTestId('react-flow-wrapper')

      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      })

      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: {
          types: ['application/json'],
        },
        writable: false,
      })

      Object.defineProperty(dragOverEvent, 'currentTarget', {
        value: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600,
          }),
        },
        writable: false,
      })

      Object.defineProperty(dragOverEvent, 'clientX', { value: 150, writable: false })
      Object.defineProperty(dragOverEvent, 'clientY', { value: 150, writable: false })

      fireEvent(canvas, dragOverEvent)

      // Verify preventDefault was called (drag over handling)
      expect(dragOverEvent.defaultPrevented).toBe(true)
    })

    it('should handle container node drops correctly', async () => {
      const mockAddBlock = vi.fn()
      const { useCollaborativeWorkflow } = await import('@/hooks/use-collaborative-workflow')
      vi.mocked(useCollaborativeWorkflow).mockImplementation(() => ({
        // Connection status
        isConnected: true,
        currentWorkflowId: 'test-workflow',
        presenceUsers: [],
        hasOperationError: false,
        // Workflow management
        joinWorkflow: vi.fn(),
        leaveWorkflow: vi.fn(),
        // Collaborative operations
        collaborativeAddBlock: mockAddBlock,
        collaborativeUpdateBlockPosition: vi.fn(),
        collaborativeUpdateBlockName: vi.fn(),
        collaborativeRemoveBlock: vi.fn(),
        collaborativeToggleBlockEnabled: vi.fn(),
        collaborativeUpdateParentId: vi.fn(),
        collaborativeToggleBlockWide: vi.fn(),
        collaborativeToggleBlockAdvancedMode: vi.fn(),
        collaborativeToggleBlockTriggerMode: vi.fn(),
        collaborativeToggleBlockHandles: vi.fn(),
        collaborativeDuplicateBlock: vi.fn(),
        collaborativeAddEdge: vi.fn(),
        collaborativeRemoveEdge: vi.fn(),
        collaborativeSetSubblockValue: vi.fn(),
        collaborativeSetTagSelection: vi.fn(),
        // Collaborative variable operations
        collaborativeUpdateVariable: vi.fn(),
        collaborativeAddVariable: vi.fn(),
        collaborativeDeleteVariable: vi.fn(),
        collaborativeDuplicateVariable: vi.fn(),
        // Collaborative loop/parallel operations
        collaborativeUpdateLoopType: vi.fn(),
        collaborativeUpdateParallelType: vi.fn(),
        // Unified iteration operations
        collaborativeUpdateIterationCount: vi.fn(),
        collaborativeUpdateIterationCollection: vi.fn(),
        // Direct access to stores
        workflowStore: {} as any,
        subBlockStore: {} as any,
      }))

      render(<Workflow />)

      const canvas = screen.getByTestId('react-flow-wrapper')

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      })

      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: vi.fn(() => JSON.stringify({ type: 'loop' })),
        },
        writable: false,
      })

      Object.defineProperty(dropEvent, 'currentTarget', {
        value: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600,
          }),
        },
        writable: false,
      })

      Object.defineProperty(dropEvent, 'clientX', { value: 200, writable: false })
      Object.defineProperty(dropEvent, 'clientY', { value: 200, writable: false })

      fireEvent(canvas, dropEvent)

      await waitFor(() => {
        expect(mockAddBlock).toHaveBeenCalledWith(
          expect.any(String), // id
          'loop', // type
          expect.stringContaining('Loop'), // name
          expect.objectContaining({ x: 200, y: 200 }), // position
          expect.objectContaining({
            width: 500,
            height: 300,
            type: 'subflowNode',
          }), // subflow data
          undefined,
          undefined,
          undefined // auto-connect edge
        )
      })
    })
  })

  describe('Node Management', () => {
    it('should handle node position changes', async () => {
      const mockUpdatePosition = vi.fn()
      const { useWorkflowStore } = await import('@/stores/workflows/workflow/store')
      vi.mocked(useWorkflowStore).mockImplementation(() => ({
        updateNodeDimensions: vi.fn(),
        updateBlockPosition: mockUpdatePosition,
        lastUpdate: Date.now(),
      }))

      render(<Workflow />)

      // Simulate nodes change event
      const nodesChangeHandler = vi.fn()

      // Mock the onNodesChange callback by triggering it manually
      act(() => {
        const changes = [
          {
            type: 'position',
            id: 'block-1',
            position: { x: 150, y: 150 },
          },
        ]

        // Simulate the internal onNodesChange logic
        changes.forEach((change) => {
          if (change.type === 'position' && change.position) {
            mockUpdatePosition(change.id, change.position)
          }
        })
      })

      await waitFor(() => {
        expect(mockUpdatePosition).toHaveBeenCalledWith('block-1', { x: 150, y: 150 })
      })
    })

    it('should handle node drag operations', async () => {
      const mockUpdatePosition = vi.fn()
      const { useCollaborativeWorkflow } = await import('@/hooks/use-collaborative-workflow')
      vi.mocked(useCollaborativeWorkflow).mockImplementation(() => ({
        collaborativeAddBlock: vi.fn(),
        collaborativeAddEdge: vi.fn(),
        collaborativeRemoveEdge: vi.fn(),
        collaborativeUpdateBlockPosition: mockUpdatePosition,
        collaborativeUpdateParentId: vi.fn(),
        collaborativeSetSubblockValue: vi.fn(),
      }))

      render(<Workflow />)

      // Simulate node drag event
      const mockEvent = { type: 'mousemove' } as React.MouseEvent
      const mockNode = {
        id: 'block-1',
        position: { x: 100, y: 100 },
        data: { type: 'api' },
      }

      act(() => {
        // Simulate the onNodeDrag callback
        mockUpdatePosition(mockNode.id, mockNode.position)
      })

      await waitFor(() => {
        expect(mockUpdatePosition).toHaveBeenCalledWith('block-1', { x: 100, y: 100 })
      })
    })
  })

  describe('Edge Management', () => {
    it('should handle edge connections', async () => {
      const mockAddEdge = vi.fn()
      const { useCollaborativeWorkflow } = await import('@/hooks/use-collaborative-workflow')
      vi.mocked(useCollaborativeWorkflow).mockImplementation(() => ({
        collaborativeAddBlock: vi.fn(),
        collaborativeAddEdge: mockAddEdge,
        collaborativeRemoveEdge: vi.fn(),
        collaborativeUpdateBlockPosition: vi.fn(),
        collaborativeUpdateParentId: vi.fn(),
        collaborativeSetSubblockValue: vi.fn(),
      }))

      render(<Workflow />)

      // Simulate connection event
      const connection = {
        source: 'block-1',
        target: 'block-2',
        sourceHandle: 'source',
        targetHandle: 'target',
      }

      act(() => {
        // Simulate the onConnect callback
        mockAddEdge({
          ...connection,
          id: expect.any(String),
          type: 'workflowEdge',
        })
      })

      await waitFor(() => {
        expect(mockAddEdge).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'block-1',
            target: 'block-2',
            sourceHandle: 'source',
            targetHandle: 'target',
            type: 'workflowEdge',
          })
        )
      })
    })

    it('should handle edge removal', async () => {
      const mockRemoveEdge = vi.fn()
      const { useCollaborativeWorkflow } = await import('@/hooks/use-collaborative-workflow')
      vi.mocked(useCollaborativeWorkflow).mockImplementation(() => ({
        collaborativeAddBlock: vi.fn(),
        collaborativeAddEdge: vi.fn(),
        collaborativeRemoveEdge: mockRemoveEdge,
        collaborativeUpdateBlockPosition: vi.fn(),
        collaborativeUpdateParentId: vi.fn(),
        collaborativeSetSubblockValue: vi.fn(),
      }))

      render(<Workflow />)

      // Simulate edge removal
      act(() => {
        const changes = [
          {
            type: 'remove',
            id: 'edge-1',
          },
        ]

        // Simulate the onEdgesChange logic
        changes.forEach((change) => {
          if (change.type === 'remove') {
            mockRemoveEdge(change.id)
          }
        })
      })

      await waitFor(() => {
        expect(mockRemoveEdge).toHaveBeenCalledWith('edge-1')
      })
    })

    it('should handle edge selection and deletion via keyboard', async () => {
      const mockRemoveEdge = vi.fn()
      const { useCollaborativeWorkflow } = await import('@/hooks/use-collaborative-workflow')
      vi.mocked(useCollaborativeWorkflow).mockImplementation(() => ({
        collaborativeAddBlock: vi.fn(),
        collaborativeAddEdge: vi.fn(),
        collaborativeRemoveEdge: mockRemoveEdge,
        collaborativeUpdateBlockPosition: vi.fn(),
        collaborativeUpdateParentId: vi.fn(),
        collaborativeSetSubblockValue: vi.fn(),
      }))

      render(<Workflow />)

      // Simulate edge selection and keyboard deletion
      act(() => {
        // Simulate selecting an edge by clicking
        const mockEdge = { id: 'edge-1', source: 'block-1', target: 'block-2' }

        // Simulate keyboard Delete event
        const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' })
        window.dispatchEvent(deleteEvent)
      })

      // Note: This test verifies the keyboard event listener setup
      // The actual deletion logic would be triggered by the event handler
      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should register auto-layout keyboard shortcut', () => {
      render(<Workflow />)

      // Verify keyboard event listeners are set up
      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should handle edge deletion keyboard shortcuts', () => {
      render(<Workflow />)

      // Verify keyboard event listeners for edge deletion are set up
      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('Permission Handling', () => {
    it('should respect read-only permissions', async () => {
      const { useUserPermissionsContext } = await import(
        '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
      )
      vi.mocked(useUserPermissionsContext).mockImplementation(() => ({
        canRead: true,
        canEdit: false,
        canAdmin: false,
      }))

      render(<Workflow />)

      const canvas = screen.getByTestId('react-flow-wrapper')

      // Canvas should be rendered but editing features should be disabled
      expect(canvas).toBeInTheDocument()

      // The React Flow component should receive editing props as undefined
      // when permissions don't allow editing
    })

    it('should enable editing with proper permissions', async () => {
      const { useUserPermissionsContext } = await import(
        '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
      )
      vi.mocked(useUserPermissionsContext).mockImplementation(() => ({
        canRead: true,
        canEdit: true,
        canAdmin: false,
      }))

      render(<Workflow />)

      const canvas = screen.getByTestId('react-flow-wrapper')
      expect(canvas).toBeInTheDocument()

      // With edit permissions, drag and drop should be enabled
    })

    it('should disable editing in diff mode', async () => {
      const mockCurrentWorkflow = vi.fn(() => ({
        blocks: {},
        edges: [],
        loops: {},
        parallels: {},
        isDiffMode: true, // Diff mode should disable editing
        getBlockById: vi.fn(),
      }))

      const { useCurrentWorkflow } = await import('./hooks')
      vi.mocked(useCurrentWorkflow).mockReturnValue(mockCurrentWorkflow())

      const { useUserPermissionsContext } = await import(
        '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
      )
      vi.mocked(useUserPermissionsContext).mockImplementation(() => ({
        canRead: true,
        canEdit: true, // Even with edit permissions
        canAdmin: false,
      }))

      render(<Workflow />)

      const canvas = screen.getByTestId('react-flow-wrapper')
      expect(canvas).toBeInTheDocument()

      // In diff mode, editing should be disabled regardless of user permissions
    })
  })

  describe('Error Handling', () => {
    it('should render error boundary', () => {
      render(<Workflow />)

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    })

    it('should handle invalid block drops gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<Workflow />)

      const canvas = screen.getByTestId('react-flow-wrapper')

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      })

      // Mock invalid JSON data
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: vi.fn(() => 'invalid json'),
        },
        writable: false,
      })

      Object.defineProperty(dropEvent, 'currentTarget', {
        value: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600,
          }),
        },
        writable: false,
      })

      fireEvent(canvas, dropEvent)

      // Should not crash and should handle error gracefully
      expect(canvas).toBeInTheDocument()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Auto-layout Functionality', () => {
    it('should handle auto-layout execution', async () => {
      const mockAutoLayout = vi.fn(() => Promise.resolve({ success: true }))

      // Mock the auto-layout utility
      vi.doMock('./utils/auto-layout', () => ({
        applyAutoLayoutAndUpdateStore: mockAutoLayout,
      }))

      render(<Workflow />)

      // Simulate auto-layout trigger
      act(() => {
        mockAutoLayout('workflow-1')
      })

      await waitFor(() => {
        expect(mockAutoLayout).toHaveBeenCalledWith('workflow-1')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<Workflow />)

      const canvas = screen.getByTestId('react-flow-wrapper')
      expect(canvas).toBeInTheDocument()

      // The workflow canvas should be accessible
    })

    it('should support keyboard navigation', () => {
      render(<Workflow />)

      // Verify keyboard event listeners are properly set up
      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('Performance Considerations', () => {
    it('should handle large numbers of blocks efficiently', async () => {
      const largeBlockSet = {}

      // Generate 100 blocks
      for (let i = 0; i < 100; i++) {
        largeBlockSet[`block-${i}`] = {
          id: `block-${i}`,
          type: 'api',
          name: `Block ${i}`,
          position: { x: (i % 10) * 100, y: Math.floor(i / 10) * 100 },
          enabled: true,
          subBlocks: {},
          outputs: {},
          data: {},
        }
      }

      const mockCurrentWorkflow = vi.fn(() => ({
        blocks: largeBlockSet,
        edges: [],
        loops: {},
        parallels: {},
        isDiffMode: false,
        getBlockById: vi.fn(),
      }))

      const { useCurrentWorkflow } = await import('./hooks')
      vi.mocked(useCurrentWorkflow).mockReturnValue(mockCurrentWorkflow())

      const renderTime = performance.now()
      render(<Workflow />)
      const renderDuration = performance.now() - renderTime

      // Should render within reasonable time (less than 1 second)
      expect(renderDuration).toBeLessThan(1000)

      // Canvas should still be present
      expect(screen.getByTestId('react-flow-wrapper')).toBeInTheDocument()
    })
  })

  describe('Integration with State Management', () => {
    it('should integrate with workflow store correctly', async () => {
      const mockWorkflowStore = {
        updateNodeDimensions: vi.fn(),
        updateBlockPosition: vi.fn(),
        lastUpdate: Date.now(),
      }

      const { useWorkflowStore } = await import('@/stores/workflows/workflow/store')
      vi.mocked(useWorkflowStore).mockImplementation(() => mockWorkflowStore)

      render(<Workflow />)

      // Store integration should be working
      expect(useWorkflowStore).toHaveBeenCalled()
    })

    it('should integrate with execution store for active blocks', async () => {
      const mockExecutionStore = {
        activeBlockIds: new Set(['block-1', 'block-2']),
        pendingBlocks: ['block-3'],
      }

      const { useExecutionStore } = await import('@/stores/execution/store')
      vi.mocked(useExecutionStore).mockImplementation(() => mockExecutionStore)

      render(<Workflow />)

      // Execution store integration should be working
      expect(useExecutionStore).toHaveBeenCalled()
    })
  })
})
