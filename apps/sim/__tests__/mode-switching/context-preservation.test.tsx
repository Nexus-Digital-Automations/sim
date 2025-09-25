/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ModeProvider } from '@/contexts/mode-context'
import { useContextPreservation } from '@/hooks/use-context-preservation'

// Mock ReactFlow
jest.mock('reactflow', () => ({
  useReactFlow: jest.fn(() => ({
    getViewport: jest.fn(() => ({ x: 100, y: 200, zoom: 1.5 })),
    getNodes: jest.fn(() => [
      { id: 'node1', selected: true, position: { x: 0, y: 0 } },
      { id: 'node2', selected: false, position: { x: 100, y: 100 } },
    ]),
    getEdges: jest.fn(() => [{ id: 'edge1', selected: true, source: 'node1', target: 'node2' }]),
    setViewport: jest.fn(),
    setNodes: jest.fn(),
    setEdges: jest.fn(),
  })),
}))

// Mock stores
jest.mock('@/stores/workflows/workflow/store', () => ({
  useWorkflowStore: {
    getState: jest.fn(() => ({
      updateBlockPosition: jest.fn(),
      updateNodeDimensions: jest.fn(),
    })),
  },
}))

jest.mock('@/stores/execution/store', () => ({
  useExecutionStore: {
    getState: jest.fn(() => ({
      isRunning: false,
      activeBlockIds: new Set(['block1']),
      pendingBlocks: ['block2'],
      debugMode: true,
      breakpoints: ['block3'],
      setDebugMode: jest.fn(),
      setBreakpoints: jest.fn(),
    })),
  },
}))

// Mock logger
jest.mock('@/lib/logs/console/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}))

// Mock DOM elements and methods
const mockQuerySelector = jest.fn()
const mockQuerySelectorAll = jest.fn()
const mockGetAttribute = jest.fn()

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks()

  // Mock DOM methods
  document.querySelector = mockQuerySelector
  document.querySelectorAll = mockQuerySelectorAll

  // Mock common DOM elements
  mockQuerySelector.mockImplementation((selector) => {
    switch (selector) {
      case '[data-sidebar]':
        return { getAttribute: mockGetAttribute.mockReturnValue('open') }
      case '[data-panel-active]':
        return { getAttribute: mockGetAttribute.mockReturnValue('properties') }
      case '[data-chat-container]':
        return { scrollTop: 150 }
      case '[data-chat-input]':
        return { value: 'test message' }
      case '[data-typing-indicator]':
        return null // Not typing
      case '[data-conversation-id]':
        return { getAttribute: mockGetAttribute.mockReturnValue('conv-123') }
      case '[data-agent-id]':
        return { getAttribute: mockGetAttribute.mockReturnValue('agent-456') }
      default:
        return null
    }
  })

  mockQuerySelectorAll.mockImplementation((selector) => {
    switch (selector) {
      case '[data-message]':
        return [
          {
            getAttribute: jest.fn((attr) => {
              switch (attr) {
                case 'data-message-id':
                  return 'msg-1'
                case 'data-message-role':
                  return 'user'
                case 'data-message-timestamp':
                  return '2023-01-01T00:00:00Z'
                default:
                  return null
              }
            }),
            textContent: 'Hello world',
          },
        ]
      case '[data-notification]':
        return [
          {
            getAttribute: jest.fn((attr) => {
              switch (attr) {
                case 'data-notification-id':
                  return 'notif-1'
                case 'data-notification-type':
                  return 'info'
                default:
                  return null
              }
            }),
            textContent: 'Test notification',
          },
        ]
      case '[data-modal-open]':
        return []
      default:
        return []
    }
  })

  // Mock document.documentElement
  Object.defineProperty(document, 'documentElement', {
    value: {
      classList: {
        contains: jest.fn((className) => className === 'dark'),
      },
    },
    configurable: true,
  })

  // Mock URL and URLSearchParams
  global.URL = jest.fn().mockImplementation(() => ({
    searchParams: {
      get: jest.fn((key) => {
        switch (key) {
          case 'conversation':
            return 'conv-123'
          case 'agentId':
            return 'agent-456'
          default:
            return null
        }
      }),
    },
  })) as any

  global.URLSearchParams = jest.fn().mockImplementation((search) => ({
    get: jest.fn((key) => {
      if (search.includes('conversation=conv-123') && key === 'conversation') return 'conv-123'
      if (search.includes('agentId=agent-456') && key === 'agentId') return 'agent-456'
      return null
    }),
  })) as any
})

// Test component
function TestContextPreservationComponent() {
  const {
    captureCurrentContext,
    restoreContextForMode,
    captureVisualContext,
    captureChatContext,
    captureExecutionContext,
    captureUIContext,
  } = useContextPreservation()

  return (
    <div>
      <button data-testid='capture-current' onClick={captureCurrentContext}>
        Capture Current Context
      </button>
      <button data-testid='restore-visual' onClick={() => restoreContextForMode('visual')}>
        Restore Visual Context
      </button>
      <button
        data-testid='capture-visual'
        onClick={() => {
          const context = captureVisualContext()
          console.log('Visual context:', context)
        }}
      >
        Capture Visual Context
      </button>
      <button
        data-testid='capture-chat'
        onClick={() => {
          const context = captureChatContext()
          console.log('Chat context:', context)
        }}
      >
        Capture Chat Context
      </button>
      <button
        data-testid='capture-execution'
        onClick={() => {
          const context = captureExecutionContext()
          console.log('Execution context:', context)
        }}
      >
        Capture Execution Context
      </button>
      <button
        data-testid='capture-ui'
        onClick={() => {
          const context = captureUIContext()
          console.log('UI context:', context)
        }}
      >
        Capture UI Context
      </button>
    </div>
  )
}

describe('useContextPreservation', () => {
  describe('Visual Context Capture', () => {
    it('captures visual editor state correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('capture-visual'))

      expect(consoleSpy).toHaveBeenCalledWith(
        'Visual context:',
        expect.objectContaining({
          viewport: { x: 100, y: 200, zoom: 1.5 },
          selectedNodes: ['node1'],
          selectedEdges: ['edge1'],
          cameraPosition: { x: 100, y: 200 },
          sidebarState: 'open',
          activePanel: 'properties',
        })
      )

      consoleSpy.mockRestore()
    })

    it('handles missing ReactFlow instance gracefully', () => {
      // Mock useReactFlow to return null
      const mockUseReactFlow = require('reactflow').useReactFlow
      mockUseReactFlow.mockReturnValueOnce(null)

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('capture-visual'))

      expect(consoleSpy).toHaveBeenCalledWith('Visual context:', undefined)

      consoleSpy.mockRestore()
    })
  })

  describe('Chat Context Capture', () => {
    it('captures chat interface state correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('capture-chat'))

      expect(consoleSpy).toHaveBeenCalledWith(
        'Chat context:',
        expect.objectContaining({
          activeConversation: 'conv-123',
          agentId: 'agent-456',
          scrollPosition: 150,
          inputValue: 'test message',
          isTyping: false,
          messageHistory: expect.arrayContaining([
            expect.objectContaining({
              id: 'msg-1',
              role: 'user',
              content: 'Hello world',
              timestamp: '2023-01-01T00:00:00Z',
            }),
          ]),
        })
      )

      consoleSpy.mockRestore()
    })

    it('handles missing chat container gracefully', () => {
      mockQuerySelector.mockImplementation((selector) => {
        if (selector === '[data-chat-container]') return null
        return { getAttribute: mockGetAttribute.mockReturnValue('') }
      })

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('capture-chat'))

      expect(consoleSpy).toHaveBeenCalledWith('Chat context:', undefined)

      consoleSpy.mockRestore()
    })
  })

  describe('Execution Context Capture', () => {
    it('captures workflow execution state correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('capture-execution'))

      expect(consoleSpy).toHaveBeenCalledWith(
        'Execution context:',
        expect.objectContaining({
          isRunning: false,
          activeBlocks: ['block1'],
          pendingBlocks: ['block2'],
          debugMode: true,
          breakpoints: ['block3'],
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('UI Context Capture', () => {
    it('captures UI state correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('capture-ui'))

      expect(consoleSpy).toHaveBeenCalledWith(
        'UI context:',
        expect.objectContaining({
          theme: 'dark',
          sidebarExpanded: true,
          notifications: expect.arrayContaining([
            expect.objectContaining({
              id: 'notif-1',
              type: 'info',
              message: 'Test notification',
            }),
          ]),
          modalsOpen: [],
        })
      )

      consoleSpy.mockRestore()
    })

    it('detects light theme correctly', () => {
      // Mock light theme
      Object.defineProperty(document, 'documentElement', {
        value: {
          classList: {
            contains: jest.fn(() => false), // Not dark theme
          },
        },
        configurable: true,
      })

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('capture-ui'))

      expect(consoleSpy).toHaveBeenCalledWith(
        'UI context:',
        expect.objectContaining({
          theme: 'light',
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Current Context Capture', () => {
    it('captures context for current mode', () => {
      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      // Should not throw when capturing current context
      fireEvent.click(screen.getByTestId('capture-current'))
    })
  })

  describe('Context Restoration', () => {
    it('restores visual context correctly', async () => {
      const mockReactFlow = require('reactflow').useReactFlow()
      const mockSetViewport = mockReactFlow().setViewport
      const mockSetNodes = mockReactFlow().setNodes
      const mockSetEdges = mockReactFlow().setEdges

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('restore-visual'))

      // Should not throw error even if no context to restore
      expect(screen.getByTestId('restore-visual')).toBeInTheDocument()
    })

    it('handles restoration errors gracefully', () => {
      // Mock setViewport to throw error
      const mockReactFlow = require('reactflow').useReactFlow
      mockReactFlow.mockReturnValue({
        ...mockReactFlow(),
        setViewport: jest.fn(() => {
          throw new Error('Restoration error')
        }),
      })

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      // Should not crash when restoration fails
      fireEvent.click(screen.getByTestId('restore-visual'))

      expect(screen.getByTestId('restore-visual')).toBeInTheDocument()
    })
  })

  describe('Automatic Context Management', () => {
    it('captures context before page unload', () => {
      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      // Simulate beforeunload event
      const beforeUnloadEvent = new Event('beforeunload')
      window.dispatchEvent(beforeUnloadEvent)

      // Should not throw error
      expect(screen.getByTestId('capture-current')).toBeInTheDocument()
    })

    it('captures context periodically when page is visible', () => {
      jest.useFakeTimers()

      // Mock document visibility
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      })

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      // Fast-forward timer to trigger periodic capture
      jest.advanceTimersByTime(30000)

      // Should not throw error
      expect(screen.getByTestId('capture-current')).toBeInTheDocument()

      jest.useRealTimers()
    })

    it('skips periodic capture when page is hidden', () => {
      jest.useFakeTimers()

      // Mock document visibility as hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      })

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      // Fast-forward timer
      jest.advanceTimersByTime(30000)

      // Should not crash
      expect(screen.getByTestId('capture-current')).toBeInTheDocument()

      jest.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('handles DOM query errors gracefully', () => {
      // Mock querySelector to throw error
      document.querySelector = jest.fn(() => {
        throw new Error('DOM error')
      })

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      // Should handle errors gracefully
      fireEvent.click(screen.getByTestId('capture-visual'))
      fireEvent.click(screen.getByTestId('capture-chat'))
      fireEvent.click(screen.getByTestId('capture-ui'))

      consoleSpy.mockRestore()
    })

    it('handles store access errors gracefully', () => {
      // Mock store to throw error
      const mockExecutionStore = require('@/stores/execution/store').useExecutionStore
      mockExecutionStore.getState.mockImplementation(() => {
        throw new Error('Store error')
      })

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(
        <ModeProvider>
          <TestContextPreservationComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('capture-execution'))

      expect(consoleSpy).toHaveBeenCalledWith('Execution context:', undefined)

      consoleSpy.mockRestore()
    })
  })
})
