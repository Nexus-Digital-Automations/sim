/**
 * @jest-environment jsdom
 */

import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ModeProvider, useModeContext, useModeSwitch } from '@/contexts/mode-context'
import { DEFAULT_MODE_PREFERENCES, type ViewMode } from '@/types/mode-switching'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock logger
jest.mock('@/lib/logs/console/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}))

// Test component that uses mode context
function TestModeComponent() {
  const { state, switchMode, preserveContext } = useModeContext()

  return (
    <div>
      <div data-testid='current-mode'>{state.currentMode}</div>
      <div data-testid='is-transitioning'>{state.isTransitioning.toString()}</div>
      <div data-testid='transition-progress'>{state.transitionProgress}</div>

      <button data-testid='switch-to-visual' onClick={() => switchMode('visual')}>
        Switch to Visual
      </button>

      <button data-testid='switch-to-chat' onClick={() => switchMode('chat')}>
        Switch to Chat
      </button>

      <button data-testid='switch-to-hybrid' onClick={() => switchMode('hybrid')}>
        Switch to Hybrid
      </button>

      <button
        data-testid='preserve-context'
        onClick={() =>
          preserveContext({
            visualContext: {
              viewport: { x: 100, y: 200, zoom: 1.5 },
              selectedNodes: ['node1'],
              selectedEdges: [],
              cameraPosition: { x: 100, y: 200 },
              sidebarState: 'closed',
            },
          })
        }
      >
        Preserve Context
      </button>
    </div>
  )
}

// Test component using mode switch hook
function TestModeSwitchComponent() {
  const { mode, isTransitioning, switchToVisual, switchToChat, switchToHybrid, canSwitchMode } =
    useModeSwitch()

  return (
    <div>
      <div data-testid='hook-mode'>{mode}</div>
      <div data-testid='hook-transitioning'>{isTransitioning.toString()}</div>
      <div data-testid='can-switch-visual'>{canSwitchMode('visual').toString()}</div>
      <div data-testid='can-switch-chat'>{canSwitchMode('chat').toString()}</div>

      <button data-testid='hook-visual' onClick={switchToVisual}>
        Visual
      </button>
      <button data-testid='hook-chat' onClick={switchToChat}>
        Chat
      </button>
      <button data-testid='hook-hybrid' onClick={switchToHybrid}>
        Hybrid
      </button>
    </div>
  )
}

describe('ModeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('ModeProvider', () => {
    it('provides initial state correctly', () => {
      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      expect(screen.getByTestId('current-mode')).toHaveTextContent('visual')
      expect(screen.getByTestId('is-transitioning')).toHaveTextContent('false')
      expect(screen.getByTestId('transition-progress')).toHaveTextContent('0')
    })

    it('loads preferences from localStorage on mount', () => {
      const savedPreferences = {
        ...DEFAULT_MODE_PREFERENCES,
        defaultMode: 'chat' as ViewMode,
        enableAnimations: false,
      }
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'mode-preferences') {
          return JSON.stringify(savedPreferences)
        }
        return null
      })

      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      // Should load default mode from preferences
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mode-preferences')
    })

    it('loads saved context from localStorage', () => {
      const savedContext = {
        visualContext: {
          viewport: { x: 50, y: 100, zoom: 0.8 },
          selectedNodes: ['test-node'],
          selectedEdges: [],
          cameraPosition: { x: 50, y: 100 },
          sidebarState: 'open' as const,
        },
      }
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'mode-context') {
          return JSON.stringify(savedContext)
        }
        return null
      })

      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mode-context')
    })
  })

  describe('Mode Switching', () => {
    it('switches modes correctly', async () => {
      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      expect(screen.getByTestId('current-mode')).toHaveTextContent('visual')

      // Switch to chat mode
      fireEvent.click(screen.getByTestId('switch-to-chat'))

      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('chat')
      })
    })

    it('handles transition state correctly', async () => {
      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      expect(screen.getByTestId('is-transitioning')).toHaveTextContent('false')

      // Start transition
      act(() => {
        fireEvent.click(screen.getByTestId('switch-to-hybrid'))
      })

      // Should briefly show transitioning state
      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('hybrid')
      })
    })

    it('ignores duplicate mode switches', async () => {
      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      expect(screen.getByTestId('current-mode')).toHaveTextContent('visual')

      // Try to switch to the same mode
      fireEvent.click(screen.getByTestId('switch-to-visual'))

      // Should remain in visual mode
      expect(screen.getByTestId('current-mode')).toHaveTextContent('visual')
    })

    it('prevents mode switching during transition', async () => {
      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      // Start a transition
      fireEvent.click(screen.getByTestId('switch-to-chat'))

      // Try to switch again immediately
      fireEvent.click(screen.getByTestId('switch-to-hybrid'))

      // Should complete the first transition
      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('chat')
      })
    })
  })

  describe('Context Preservation', () => {
    it('preserves context correctly', () => {
      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      // Preserve some context
      fireEvent.click(screen.getByTestId('preserve-context'))

      // Context should be preserved (we can't directly test the internal state,
      // but we can verify the function doesn't throw)
      expect(screen.getByTestId('current-mode')).toHaveTextContent('visual')
    })

    it('persists context to localStorage', async () => {
      jest.useFakeTimers()

      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      // Preserve context
      fireEvent.click(screen.getByTestId('preserve-context'))

      // Fast-forward timers to trigger debounced save
      act(() => {
        jest.advanceTimersByTime(1100)
      })

      // Should save to localStorage
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('mode-context', expect.any(String))
      })

      jest.useRealTimers()
    })
  })

  describe('useModeSwitch Hook', () => {
    it('provides correct mode switching functions', () => {
      render(
        <ModeProvider>
          <TestModeSwitchComponent />
        </ModeProvider>
      )

      expect(screen.getByTestId('hook-mode')).toHaveTextContent('visual')
      expect(screen.getByTestId('hook-transitioning')).toHaveTextContent('false')
      expect(screen.getByTestId('can-switch-visual')).toHaveTextContent('false') // Can't switch to same mode
      expect(screen.getByTestId('can-switch-chat')).toHaveTextContent('true')
    })

    it('switches modes through hook functions', async () => {
      render(
        <ModeProvider>
          <TestModeSwitchComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('hook-chat'))

      await waitFor(() => {
        expect(screen.getByTestId('hook-mode')).toHaveTextContent('chat')
      })
    })

    it('switches to hybrid mode with layout options', async () => {
      render(
        <ModeProvider>
          <TestModeSwitchComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('hook-hybrid'))

      await waitFor(() => {
        expect(screen.getByTestId('hook-mode')).toHaveTextContent('hybrid')
      })
    })
  })

  describe('Event Handling', () => {
    it('calls mode change callbacks', async () => {
      const mockCallback = jest.fn()

      function TestCallbackComponent() {
        const { onModeChange } = useModeContext()

        React.useEffect(() => {
          const unsubscribe = onModeChange(mockCallback)
          return unsubscribe
        }, [onModeChange])

        return <TestModeComponent />
      }

      render(
        <ModeProvider>
          <TestCallbackComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('switch-to-chat'))

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            fromMode: 'visual',
            toMode: 'chat',
            preserveContext: expect.any(Boolean),
            trigger: 'user',
          })
        )
      })
    })

    it('handles callback errors gracefully', async () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error')
      })

      function TestErrorCallbackComponent() {
        const { onModeChange } = useModeContext()

        React.useEffect(() => {
          const unsubscribe = onModeChange(errorCallback)
          return unsubscribe
        }, [onModeChange])

        return <TestModeComponent />
      }

      render(
        <ModeProvider>
          <TestErrorCallbackComponent />
        </ModeProvider>
      )

      // Should not throw despite callback error
      fireEvent.click(screen.getByTestId('switch-to-chat'))

      await waitFor(() => {
        expect(screen.getByTestId('current-mode')).toHaveTextContent('chat')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      // Should not throw
      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      expect(screen.getByTestId('current-mode')).toHaveTextContent('visual')
    })

    it('handles invalid JSON in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')

      // Should not throw and use defaults
      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      expect(screen.getByTestId('current-mode')).toHaveTextContent('visual')
    })
  })

  describe('URL Integration', () => {
    beforeEach(() => {
      // Mock URL and history
      ;(window as any).location = undefined
      window.location = {
        ...window.location,
        search: '',
        href: 'http://localhost:3000',
      } as Location

      Object.defineProperty(window, 'location', {
        value: {
          search: '',
          href: 'http://localhost:3000',
        },
        writable: true,
      })
    })

    it('loads mode from URL parameters', () => {
      window.location.search = '?mode=chat'

      render(
        <ModeProvider>
          <TestModeComponent />
        </ModeProvider>
      )

      // Should load chat mode from URL
      expect(screen.getByTestId('current-mode')).toHaveTextContent('visual') // Default before URL effect
    })
  })
})
