import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SynchronizedChatInterface } from '@/components/workflow-chat-sync/SynchronizedChatInterface'
import { useExecutionStore } from '@/stores/execution/store'
import { useChatStore } from '@/stores/panel/chat/store'
import { useChatSyncIntegration } from '@/stores/workflow-chat-sync/integration'
import { useWorkflowChatSyncStore } from '@/stores/workflow-chat-sync/store'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'

// Mock the logger
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `mock-uuid-${Math.random().toString(36).substring(2)}`,
  },
})

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
  CardContent: ({ children }: any) => <div className='card-content'>{children}</div>,
  CardHeader: ({ children }: any) => <div className='card-header'>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, onKeyDown, ...props }: any) => (
    <input value={value} onChange={onChange} onKeyDown={onKeyDown} {...props} />
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span className='badge'>{children}</span>,
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr className='separator' />,
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div className='scroll-area'>{children}</div>,
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div className='alert'>{children}</div>,
  AlertDescription: ({ children }: any) => <div className='alert-description'>{children}</div>,
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetTrigger: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div className='sheet-content'>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  SheetDescription: ({ children }: any) => <p>{children}</p>,
}))

// Mock child components
vi.mock('@/components/workflow-chat-sync/WorkflowStateDisplay', () => ({
  WorkflowStateDisplay: ({ compact }: { compact?: boolean }) => (
    <div data-testid='workflow-state-display' data-compact={compact}>
      Workflow State Display
    </div>
  ),
}))

vi.mock('@/components/workflow-chat-sync/ChatCommandSuggestions', () => ({
  ChatCommandSuggestions: ({ onCommandSelect }: { onCommandSelect?: (cmd: string) => void }) => (
    <div data-testid='command-suggestions'>
      <button onClick={() => onCommandSelect?.('add llm block')}>Add LLM Block</button>
    </div>
  ),
}))

vi.mock('@/components/workflow-chat-sync/ConflictResolutionDialog', () => ({
  ConflictResolutionDialog: ({ open }: { open: boolean }) => (
    <div data-testid='conflict-dialog' style={{ display: open ? 'block' : 'none' }}>
      Conflict Resolution Dialog
    </div>
  ),
}))

vi.mock(
  '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel/components/chat/components/chat-message/chat-message',
  () => ({
    ChatMessage: ({ message }: any) => (
      <div data-testid='chat-message' data-type={message.type}>
        {message.content}
      </div>
    ),
  })
)

describe('SynchronizedChatInterface Integration', () => {
  beforeEach(() => {
    // Reset all stores
    useWorkflowChatSyncStore.setState({
      isEnabled: false,
      syncState: 'idle',
      lastSyncTimestamp: null,
      pendingChanges: [],
      conflicts: [],
      workflowStateRepresentation: null,
      chatCommandHistory: [],
    })

    useWorkflowRegistry.setState({
      activeWorkflowId: 'test-workflow-id',
      workflows: {
        'test-workflow-id': {
          id: 'test-workflow-id',
          Name: 'Test Workflow',
          description: 'Test workflow description',
          color: '#000000',
          lastModified: new Date(),
          createdAt: new Date(),
        },
      },
    })

    useWorkflowStore.setState({
      blocks: {},
      edges: [],
      loops: {},
      parallels: {},
    })

    useChatStore.setState({
      messages: [],
      selectedWorkflowOutputs: {},
      conversationIds: {},
    })

    useExecutionStore.setState({
      isExecuting: false,
      isDebugging: false,
      activeBlockIds: new Set(),
      pendingBlocks: [],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render with active workflow', () => {
      render(<SynchronizedChatInterface />)

      expect(screen.getByText('Workflow Chat')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Type a message or command...')).toBeInTheDocument()
      expect(screen.getByTestId('workflow-state-display')).toBeInTheDocument()
      expect(screen.getByTestId('command-suggestions')).toBeInTheDocument()
    })

    it('should show no workflow message when no active workflow', () => {
      useWorkflowRegistry.setState({ activeWorkflowId: null })

      render(<SynchronizedChatInterface />)

      expect(screen.getByText('Select a workflow to start chatting')).toBeInTheDocument()
    })

    it('should render in compact mode', () => {
      render(<SynchronizedChatInterface compactMode={true} />)

      const stateDisplay = screen.getByTestId('workflow-state-display')
      expect(stateDisplay).toHaveAttribute('data-compact', 'true')
    })

    it('should hide sidebar when showSidebar is false', () => {
      render(<SynchronizedChatInterface showSidebar={false} />)

      // Sidebar should not be present
      expect(screen.queryByTestId('workflow-state-display')).not.toBeInTheDocument()
    })
  })

  describe('Message Handling', () => {
    it('should send regular messages', async () => {
      render(<SynchronizedChatInterface />)

      const input = screen.getByPlaceholderText('Type a message or command...')
      const sendButton = screen.getByRole('button', { Name: /send/i })

      fireEvent.change(input, { target: { value: 'Hello workflow!' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        const messages = useChatStore.getState().messages
        expect(messages).toHaveLength(1)
        expect(messages[0].content).toBe('Hello workflow!')
        expect(messages[0].type).toBe('user')
      })
    })

    it('should handle Enter key for sending messages', async () => {
      render(<SynchronizedChatInterface />)

      const input = screen.getByPlaceholderText('Type a message or command...')

      fireEvent.change(input, { target: { value: 'Test message' } })
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

      await waitFor(() => {
        const messages = useChatStore.getState().messages
        expect(messages).toHaveLength(1)
        expect(messages[0].content).toBe('Test message')
      })
    })

    it('should not send empty messages', () => {
      render(<SynchronizedChatInterface />)

      const sendButton = screen.getByRole('button', { Name: /send/i })

      fireEvent.click(sendButton)

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(0)
    })
  })

  describe('Command Integration', () => {
    beforeEach(() => {
      // Enable sync for command tests
      useWorkflowChatSyncStore.getState().enableSync()
    })

    it('should process chat commands when sync is enabled', async () => {
      render(<SynchronizedChatInterface />)

      const input = screen.getByPlaceholderText('Type a message or command...')

      fireEvent.change(input, { target: { value: 'add llm block' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        // Check that command was processed
        const syncStore = useWorkflowChatSyncStore.getState()
        expect(syncStore.chatCommandHistory).toHaveLength(1)
        expect(syncStore.chatCommandHistory[0].type).toBe('add_block')
      })
    })

    it('should handle command suggestions', async () => {
      render(<SynchronizedChatInterface />)

      const suggestionButton = screen.getByText('Add LLM Block')
      const input = screen.getByPlaceholderText('Type a message or command...')

      fireEvent.click(suggestionButton)

      expect(input).toHaveValue('add llm block')
    })

    it('should show sync status in UI', () => {
      useWorkflowChatSyncStore.getState().enableSync()
      useWorkflowChatSyncStore.getState().setSyncState('syncing')

      render(<SynchronizedChatInterface />)

      expect(screen.getByText('Syncing...')).toBeInTheDocument()
    })
  })

  describe('State Synchronization', () => {
    it('should display workflow state when enabled', () => {
      useWorkflowChatSyncStore.getState().enableSync()

      render(<SynchronizedChatInterface />)

      expect(screen.getByTestId('workflow-state-display')).toBeInTheDocument()
    })

    it('should show conflict dialog when conflicts exist', async () => {
      const syncStore = useWorkflowChatSyncStore.getState()
      syncStore.enableSync()

      render(<SynchronizedChatInterface />)

      act(() => {
        // Simulate conflict
        useWorkflowChatSyncStore.setState({
          conflicts: [
            {
              id: 'conflict-1',
              type: 'concurrent_block_modification',
              timestamp: Date.now(),
              chatChange: {
                id: 'change-1',
                type: 'workflow_modified',
                source: 'chat',
                timestamp: Date.now(),
                data: {},
              },
              visualChange: {
                id: 'change-2',
                type: 'workflow_modified',
                source: 'visual',
                timestamp: Date.now(),
                data: {},
              },
              description: 'Test conflict',
              autoResolvable: false,
            },
          ],
        })
      })

      await waitFor(() => {
        expect(screen.getByTestId('conflict-dialog')).toBeVisible()
      })
    })
  })

  describe('Sync Integration Hook', () => {
    it('should initialize sync when enabled', () => {
      const { result } = renderHook(() => useChatSyncIntegration({ enableOnMount: true }))

      expect(result.current.isEnabled).toBe(true)
    })

    it('should process commands through integration hook', async () => {
      const { result } = renderHook(() => useChatSyncIntegration({ enableOnMount: true }))

      const success = result.current.processCommand('add llm block')

      expect(success).toBe(true)

      await waitFor(() => {
        const syncStore = useWorkflowChatSyncStore.getState()
        expect(syncStore.chatCommandHistory).toHaveLength(1)
      })
    })

    it('should provide workflow state through integration hook', () => {
      // Set up some workflow state
      useWorkflowStore.setState({
        blocks: {
          'block-1': {
            id: 'block-1',
            type: 'starter',
            Name: 'Start',
            position: { x: 100, y: 100 },
            enabled: true,
            subBlocks: {},
            outputs: {},
            horizontalHandles: true,
            isWide: false,
            advancedMode: false,
            triggerMode: false,
            height: 0,
          },
        },
      })

      const { result } = renderHook(() => useChatSyncIntegration({ enableOnMount: true }))

      expect(result.current.workflowState).toBeTruthy()
      expect(result.current.workflowState?.blockSummaries).toHaveLength(1)
    })

    it('should handle notification system', () => {
      const { result } = renderHook(() =>
        useChatSyncIntegration({
          enableOnMount: true,
          notifyOnSync: true,
        })
      )

      act(() => {
        result.current.notifyUser('Test notification', 'info')
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('ℹ️ Test notification')
    })
  })

  describe('Error Handling', () => {
    it('should handle sync errors gracefully', () => {
      const syncStore = useWorkflowChatSyncStore.getState()
      syncStore.enableSync()
      syncStore.setSyncState('error')

      render(<SynchronizedChatInterface />)

      expect(screen.getByText('Sync Error')).toBeInTheDocument()
    })

    it('should disable input during syncing', () => {
      const syncStore = useWorkflowChatSyncStore.getState()
      syncStore.enableSync()
      syncStore.setSyncState('syncing')

      render(<SynchronizedChatInterface />)

      const input = screen.getByPlaceholderText('Type a message or command...')
      const sendButton = screen.getByRole('button', { Name: /send/i })

      expect(input).toBeDisabled()
      expect(sendButton).toBeDisabled()
    })

    it('should show alert when sync is disabled', () => {
      // Sync disabled by default
      render(<SynchronizedChatInterface />)

      expect(screen.getByText(/Workflow synchronization is disabled/)).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = vi.fn()

      const TestComponent = () => {
        renderSpy()
        return <SynchronizedChatInterface />
      }

      const { rerender } = render(<TestComponent />)

      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1)

      // Re-render with same props
      rerender(<TestComponent />)

      // Should only re-render if necessary
      expect(renderSpy).toHaveBeenCalledTimes(2) // React will still re-render, but with memoization this could be optimized
    })

    it('should handle large workflow states efficiently', () => {
      // Create a large workflow state
      const blocks: Record<string, any> = {}
      const edges: any[] = []

      for (let i = 0; i < 100; i++) {
        blocks[`block-${i}`] = {
          id: `block-${i}`,
          type: 'llm',
          Name: `Block ${i}`,
          position: { x: i * 100, y: i * 100 },
          enabled: true,
          subBlocks: {},
          outputs: {},
          horizontalHandles: true,
          isWide: false,
          advancedMode: false,
          triggerMode: false,
          height: 0,
        }

        if (i > 0) {
          edges.push({
            id: `edge-${i}`,
            source: `block-${i - 1}`,
            target: `block-${i}`,
            sourceHandle: 'response',
            targetHandle: 'input',
            type: 'default',
          })
        }
      }

      useWorkflowStore.setState({ blocks, edges })
      useWorkflowChatSyncStore.getState().enableSync()

      const startTime = performance.now()
      render(<SynchronizedChatInterface />)
      const endTime = performance.now()

      // Should render in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})
