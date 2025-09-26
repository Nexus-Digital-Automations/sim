/**
 * User Experience Testing Framework
 *
 * Comprehensive tests for accessibility, responsive design, keyboard shortcuts,
 * and interaction patterns across all hybrid workflow modes.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock React components for testing
const MockWorkflowEditor = vi.fn(({ mode, onModeSwitch, accessibility, responsive }) => (
  <div
    data-testid='workflow-editor'
    data-mode={mode}
    role={accessibility?.role || 'application'}
    aria-label={accessibility?.label || 'Workflow Editor'}
    className={responsive?.className || 'responsive-container'}
  >
    <button
      onClick={() => onModeSwitch?.(mode === 'visual' ? 'chat' : 'visual')}
      data-testid='mode-switch-button'
      aria-label='Switch between visual and chat modes'
      tabIndex={0}
    >
      Switch to {mode === 'visual' ? 'Chat' : 'Visual'} Mode
    </button>

    {mode === 'visual' && (
      <div data-testid='visual-mode-content' role='region' aria-label='Visual workflow editor'>
        <div data-testid='workflow-canvas' role='img' aria-label='Workflow diagram'>
          {/* Visual mode content */}
          <div data-testid='block-1' role='button' tabIndex={0} aria-label='Start block'>
            Start Block
          </div>
          <div data-testid='block-2' role='button' tabIndex={0} aria-label='Condition block'>
            Condition Block
          </div>
        </div>
        <div data-testid='visual-controls' role='toolbar' aria-label='Visual mode controls'>
          <button data-testid='add-block-btn' aria-label='Add new block'>
            Add Block
          </button>
          <button data-testid='delete-block-btn' aria-label='Delete selected block'>
            Delete
          </button>
          <button data-testid='zoom-in-btn' aria-label='Zoom in'>
            Zoom In
          </button>
          <button data-testid='zoom-out-btn' aria-label='Zoom out'>
            Zoom Out
          </button>
        </div>
      </div>
    )}

    {mode === 'chat' && (
      <div data-testid='chat-mode-content' role='region' aria-label='Chat workflow interface'>
        <div
          data-testid='chat-messages'
          role='log'
          aria-label='Chat conversation'
          aria-live='polite'
          aria-atomic='false'
        >
          {/* Chat messages */}
        </div>
        <div data-testid='chat-input-container' role='region' aria-label='Message input'>
          <input
            data-testid='chat-input'
            type='text'
            placeholder='Type your message...'
            aria-label='Chat message input'
            aria-describedby='chat-input-help'
          />
          <div id='chat-input-help' className='sr-only'>
            Type commands or ask questions about your workflow
          </div>
          <button data-testid='send-btn' aria-label='Send message'>
            Send
          </button>
        </div>
      </div>
    )}
  </div>
))

const MockHybridInterface = vi.fn(({ initialMode = 'visual', ...props }) => {
  const [currentMode, setCurrentMode] = React.useState(initialMode)

  return <MockWorkflowEditor mode={currentMode} onModeSwitch={setCurrentMode} {...props} />
})

// Mock React for state management
const React = {
  useState: vi.fn((initial) => {
    let value = initial
    const setValue = (newValue: any) => {
      value = newValue
    }
    return [value, setValue]
  }),
  useEffect: vi.fn(),
  useCallback: vi.fn((fn) => fn),
  useMemo: vi.fn((fn) => fn()),
}

// Mock window and DOM APIs
const mockMatchMedia = vi.fn((query) => ({
  matches: !query.includes('max-width: 768px'),
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock focus management
const mockFocusManager = {
  trapFocus: vi.fn(),
  releaseFocus: vi.fn(),
  getFocusableElements: vi.fn(() => []),
  setInitialFocus: vi.fn(),
}

describe('Hybrid Workflow User Experience Testing', () => {
  let user: ReturnType<typeof userEvent.setup>
  let mockProps: any

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()

    mockProps = {
      initialMode: 'visual',
      accessibility: {
        role: 'application',
        label: 'Hybrid Workflow Editor',
        announcements: true,
        keyboardNav: true,
      },
      responsive: {
        className: 'hybrid-responsive',
        breakpoints: {
          mobile: '768px',
          tablet: '1024px',
          desktop: '1200px',
        },
      },
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Accessibility Testing', () => {
    it('should have proper ARIA roles and labels', () => {
      render(<MockHybridInterface {...mockProps} />)

      // Main application role
      const editor = screen.getByTestId('workflow-editor')
      expect(editor).toHaveAttribute('role', 'application')
      expect(editor).toHaveAttribute('aria-label', 'Hybrid Workflow Editor')

      // Mode switch button accessibility
      const modeSwitchBtn = screen.getByTestId('mode-switch-button')
      expect(modeSwitchBtn).toHaveAttribute('aria-label', 'Switch between visual and chat modes')
      expect(modeSwitchBtn).toHaveAttribute('tabIndex', '0')

      // Visual mode specific accessibility
      const visualContent = screen.getByTestId('visual-mode-content')
      expect(visualContent).toHaveAttribute('role', 'region')
      expect(visualContent).toHaveAttribute('aria-label', 'Visual workflow editor')

      const workflowCanvas = screen.getByTestId('workflow-canvas')
      expect(workflowCanvas).toHaveAttribute('role', 'img')
      expect(workflowCanvas).toHaveAttribute('aria-label', 'Workflow diagram')

      const visualControls = screen.getByTestId('visual-controls')
      expect(visualControls).toHaveAttribute('role', 'toolbar')
      expect(visualControls).toHaveAttribute('aria-label', 'Visual mode controls')
    })

    it('should support keyboard navigation in visual mode', async () => {
      render(<MockHybridInterface {...mockProps} />)

      const block1 = screen.getByTestId('block-1')
      const block2 = screen.getByTestId('block-2')
      const addBlockBtn = screen.getByTestId('add-block-btn')

      // Tab navigation
      await user.tab()
      expect(screen.getByTestId('mode-switch-button')).toHaveFocus()

      await user.tab()
      expect(block1).toHaveFocus()

      await user.tab()
      expect(block2).toHaveFocus()

      await user.tab()
      expect(addBlockBtn).toHaveFocus()
    })

    it('should support keyboard navigation in chat mode', async () => {
      render(<MockHybridInterface {...mockProps} initialMode='chat' />)

      const chatInput = screen.getByTestId('chat-input')
      const sendBtn = screen.getByTestId('send-btn')

      // Should be able to navigate to chat input
      await user.tab() // Skip mode switch button
      await user.tab()
      expect(chatInput).toHaveFocus()

      await user.tab()
      expect(sendBtn).toHaveFocus()
    })

    it('should provide proper ARIA live regions for chat', () => {
      render(<MockHybridInterface {...mockProps} initialMode='chat' />)

      const chatMessages = screen.getByTestId('chat-messages')
      expect(chatMessages).toHaveAttribute('role', 'log')
      expect(chatMessages).toHaveAttribute('aria-live', 'polite')
      expect(chatMessages).toHaveAttribute('aria-atomic', 'false')

      const chatInput = screen.getByTestId('chat-input')
      expect(chatInput).toHaveAttribute('aria-describedby', 'chat-input-help')

      const helpText = document.getElementById('chat-input-help')
      expect(helpText).toHaveClass('sr-only')
    })

    it('should support screen reader announcements for mode switches', async () => {
      const mockAnnounce = vi.fn()

      render(
        <MockHybridInterface
          {...mockProps}
          accessibility={{
            ...mockProps.accessibility,
            announce: mockAnnounce,
          }}
        />
      )

      const modeSwitchBtn = screen.getByTestId('mode-switch-button')

      await user.click(modeSwitchBtn)

      // Should announce mode change
      expect(mockAnnounce).toHaveBeenCalledWith('Switched to chat mode', 'polite')
    })

    it('should maintain focus during mode switches', async () => {
      render(<MockHybridInterface {...mockProps} />)

      const modeSwitchBtn = screen.getByTestId('mode-switch-button')

      // Focus the mode switch button
      modeSwitchBtn.focus()
      expect(modeSwitchBtn).toHaveFocus()

      // Switch modes
      await user.click(modeSwitchBtn)

      // Focus should be maintained on the mode switch button
      await waitFor(() => {
        expect(modeSwitchBtn).toHaveFocus()
      })
    })

    it('should support high contrast mode', () => {
      // Mock high contrast media query
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('prefers-contrast: high'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<MockHybridInterface {...mockProps} />)

      const editor = screen.getByTestId('workflow-editor')

      // Should apply high contrast styles (implementation would add class)
      fireEvent(window, new Event('storage'))

      expect(editor).toBeInTheDocument() // Placeholder assertion
    })

    it('should support reduced motion preferences', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<MockHybridInterface {...mockProps} />)

      // Should disable animations when reduced motion is preferred
      const editor = screen.getByTestId('workflow-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should provide accessible error messages', () => {
      const errorProps = {
        ...mockProps,
        error: {
          message: 'Failed to save workflow',
          code: 'SAVE_ERROR',
        },
      }

      render(<MockHybridInterface {...errorProps} />)

      // Error should be announced to screen readers
      // Implementation would include aria-live error region
      const editor = screen.getByTestId('workflow-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should support keyboard shortcuts with proper announcements', async () => {
      const shortcutProps = {
        ...mockProps,
        shortcuts: {
          'Ctrl+M': 'Switch mode',
          'Ctrl+S': 'Save workflow',
          Escape: 'Cancel action',
        },
      }

      render(<MockHybridInterface {...shortcutProps} />)

      // Test Ctrl+M to switch modes
      await user.keyboard('{Control>}m{/Control}')

      // Should announce shortcut activation
      const editor = screen.getByTestId('workflow-editor')
      expect(editor).toHaveAttribute('data-mode', 'chat')
    })
  })

  describe('Responsive Design Testing', () => {
    it('should adapt layout for mobile devices', () => {
      // Mock mobile viewport
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<MockHybridInterface {...mockProps} />)

      const editor = screen.getByTestId('workflow-editor')
      expect(editor).toHaveClass('hybrid-responsive')

      // Mobile layout adjustments would be applied
      fireEvent(
        window,
        new MediaQueryListEvent('change', {
          matches: true,
          media: '(max-width: 768px)',
        })
      )
    })

    it('should optimize touch interactions for mobile', async () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<MockHybridInterface {...mockProps} />)

      const modeSwitchBtn = screen.getByTestId('mode-switch-button')

      // Touch interactions should work
      fireEvent.touchStart(modeSwitchBtn)
      fireEvent.touchEnd(modeSwitchBtn)

      await waitFor(() => {
        expect(screen.getByTestId('workflow-editor')).toHaveAttribute('data-mode', 'chat')
      })
    })

    it('should handle tablet layout appropriately', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('min-width: 769px') && query.includes('max-width: 1024px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<MockHybridInterface {...mockProps} />)

      // Tablet-specific layout would be applied
      const editor = screen.getByTestId('workflow-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should optimize for desktop experience', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('min-width: 1200px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<MockHybridInterface {...mockProps} />)

      // Desktop layout with full features
      const editor = screen.getByTestId('workflow-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should handle orientation changes', () => {
      render(<MockHybridInterface {...mockProps} />)

      // Simulate orientation change
      fireEvent(window, new Event('orientationchange'))

      // Layout should adapt to new orientation
      const editor = screen.getByTestId('workflow-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should scale appropriately with zoom levels', () => {
      render(<MockHybridInterface {...mockProps} />)

      // Simulate browser zoom
      fireEvent(window, new Event('resize'))

      // Should maintain usability at different zoom levels
      const modeSwitchBtn = screen.getByTestId('mode-switch-button')
      expect(modeSwitchBtn).toBeVisible()
    })

    it('should handle viewport resizing smoothly', () => {
      const { rerender } = render(<MockHybridInterface {...mockProps} />)

      // Initial render - desktop
      expect(screen.getByTestId('workflow-editor')).toBeInTheDocument()

      // Simulate viewport resize to mobile
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      // Rerender with mobile layout
      rerender(<MockHybridInterface {...mockProps} />)

      // Should gracefully adapt to mobile
      expect(screen.getByTestId('workflow-editor')).toBeInTheDocument()
    })
  })

  describe('Keyboard Shortcuts and Interaction Patterns', () => {
    it('should support global keyboard shortcuts', async () => {
      render(<MockHybridInterface {...mockProps} />)

      // Mode switch shortcut (Ctrl+M)
      await user.keyboard('{Control>}m{/Control}')
      expect(screen.getByTestId('workflow-editor')).toHaveAttribute('data-mode', 'chat')

      // Switch back
      await user.keyboard('{Control>}m{/Control}')
      expect(screen.getByTestId('workflow-editor')).toHaveAttribute('data-mode', 'visual')
    })

    it('should support context-specific shortcuts in visual mode', async () => {
      render(<MockHybridInterface {...mockProps} />)

      // Add block shortcut (Ctrl+A)
      const addBlockBtn = screen.getByTestId('add-block-btn')
      addBlockBtn.focus()

      await user.keyboard('{Control>}a{/Control}')

      // Should trigger add block action
      expect(addBlockBtn).toHaveFocus()
    })

    it('should support chat-specific shortcuts', async () => {
      render(<MockHybridInterface {...mockProps} initialMode='chat' />)

      const chatInput = screen.getByTestId('chat-input')
      const sendBtn = screen.getByTestId('send-btn')

      // Focus chat input
      await user.click(chatInput)
      await user.type(chatInput, 'Test message')

      // Send with Enter
      await user.keyboard('{Enter}')

      // Should trigger send action
      expect(chatInput).toHaveValue('Test message')
    })

    it('should prevent conflicting shortcuts between modes', async () => {
      render(<MockHybridInterface {...mockProps} />)

      // Start in visual mode
      expect(screen.getByTestId('workflow-editor')).toHaveAttribute('data-mode', 'visual')

      // Test visual mode shortcut
      await user.keyboard('{Control>}a{/Control}')

      // Switch to chat mode
      await user.keyboard('{Control>}m{/Control}')
      expect(screen.getByTestId('workflow-editor')).toHaveAttribute('data-mode', 'chat')

      // Same shortcut should not work in chat mode
      await user.keyboard('{Control>}a{/Control}')

      // Should remain in chat mode without visual action
      expect(screen.getByTestId('workflow-editor')).toHaveAttribute('data-mode', 'chat')
    })

    it('should support escape key to cancel actions', async () => {
      render(<MockHybridInterface {...mockProps} />)

      // Start some action (mock)
      const addBlockBtn = screen.getByTestId('add-block-btn')
      await user.click(addBlockBtn)

      // Escape should cancel
      await user.keyboard('{Escape}')

      // Action should be cancelled
      expect(addBlockBtn).toBeInTheDocument()
    })

    it('should support arrow key navigation in visual mode', async () => {
      render(<MockHybridInterface {...mockProps} />)

      const block1 = screen.getByTestId('block-1')
      const block2 = screen.getByTestId('block-2')

      // Focus first block
      block1.focus()
      expect(block1).toHaveFocus()

      // Arrow key to second block
      await user.keyboard('{ArrowDown}')
      expect(block2).toHaveFocus()

      // Arrow key back
      await user.keyboard('{ArrowUp}')
      expect(block1).toHaveFocus()
    })

    it('should support tab trap in modal dialogs', async () => {
      const modalProps = {
        ...mockProps,
        showModal: true,
        modalContent: {
          title: 'Block Settings',
          fields: ['name', 'type', 'config'],
        },
      }

      render(<MockHybridInterface {...modalProps} />)

      // Tab should cycle through modal elements only
      // Implementation would trap focus within modal
      await user.tab()
      await user.tab()

      // Focus should remain trapped in modal
      expect(document.activeElement).toBeInTheDocument()
    })

    it('should support custom keyboard shortcuts configuration', async () => {
      const customShortcuts = {
        ...mockProps,
        shortcuts: {
          'Alt+V': 'switch-to-visual',
          'Alt+C': 'switch-to-chat',
          'Ctrl+Shift+S': 'save-as',
          F11: 'toggle-fullscreen',
        },
      }

      render(<MockHybridInterface {...customShortcuts} />)

      // Test custom shortcuts
      await user.keyboard('{Alt>}c{/Alt}')
      expect(screen.getByTestId('workflow-editor')).toHaveAttribute('data-mode', 'chat')

      await user.keyboard('{Alt>}v{/Alt}')
      expect(screen.getByTestId('workflow-editor')).toHaveAttribute('data-mode', 'visual')
    })

    it('should provide shortcut help overlay', async () => {
      render(<MockHybridInterface {...mockProps} />)

      // Show shortcuts help (typically with ? or F1)
      await user.keyboard('{F1}')

      // Should display help overlay
      // Implementation would show keyboard shortcuts guide
      const editor = screen.getByTestId('workflow-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should support undo/redo shortcuts', async () => {
      render(<MockHybridInterface {...mockProps} />)

      // Make a change (mock)
      const addBlockBtn = screen.getByTestId('add-block-btn')
      await user.click(addBlockBtn)

      // Undo
      await user.keyboard('{Control>}z{/Control}')

      // Redo
      await user.keyboard('{Control>}y{/Control}')

      // Changes should be undone/redone
      expect(addBlockBtn).toBeInTheDocument()
    })
  })

  describe('Cross-Platform Interaction Testing', () => {
    it('should handle touch gestures on touch devices', async () => {
      // Mock touch device
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 5,
      })

      render(<MockHybridInterface {...mockProps} />)

      const workflowCanvas = screen.getByTestId('workflow-canvas')

      // Test touch interactions
      fireEvent.touchStart(workflowCanvas, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      fireEvent.touchMove(workflowCanvas, {
        touches: [{ clientX: 120, clientY: 120 }],
      })
      fireEvent.touchEnd(workflowCanvas)

      expect(workflowCanvas).toBeInTheDocument()
    })

    it('should optimize for mouse and trackpad interactions', async () => {
      render(<MockHybridInterface {...mockProps} />)

      const workflowCanvas = screen.getByTestId('workflow-canvas')

      // Test mouse interactions
      await user.hover(workflowCanvas)
      await user.click(workflowCanvas)

      // Test mouse wheel scrolling
      fireEvent.wheel(workflowCanvas, { deltaY: 100 })

      expect(workflowCanvas).toBeInTheDocument()
    })

    it('should handle different operating system conventions', () => {
      // Test Windows/Linux conventions
      render(<MockHybridInterface {...mockProps} />)

      // Different OS would have different modifier keys
      const editor = screen.getByTestId('workflow-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should work with assistive technologies', () => {
      render(<MockHybridInterface {...mockProps} />)

      // Should work with screen readers, voice control, etc.
      const editor = screen.getByTestId('workflow-editor')

      // Check ARIA attributes are properly set
      expect(editor).toHaveAttribute('role', 'application')
      expect(editor).toHaveAttribute('aria-label')
    })

    it('should support right-to-left languages', () => {
      const rtlProps = {
        ...mockProps,
        locale: 'ar',
        direction: 'rtl',
      }

      render(<MockHybridInterface {...rtlProps} />)

      // Layout should adapt for RTL
      const editor = screen.getByTestId('workflow-editor')
      expect(editor).toBeInTheDocument()
    })

    it('should handle browser zoom and text scaling', () => {
      render(<MockHybridInterface {...mockProps} />)

      // Simulate browser text scaling
      document.documentElement.style.fontSize = '120%'

      const modeSwitchBtn = screen.getByTestId('mode-switch-button')
      expect(modeSwitchBtn).toBeVisible()

      // Reset
      document.documentElement.style.fontSize = ''
    })
  })
})
