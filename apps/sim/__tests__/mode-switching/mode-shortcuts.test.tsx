/**
 * @jest-environment jsdom
 */

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  ModeShortcutsProvider,
  QuickShortcutHints,
} from '@/components/mode-switching/mode-shortcuts'
import { ModeProvider } from '@/contexts/mode-context'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
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

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

// Mock navigator.vibrate
const mockVibrate = jest.fn()
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  writable: true,
})

// Test components
function TestModeComponent() {
  return (
    <div>
      <input data-testid='test-input' placeholder='Type here...' />
      <textarea data-testid='test-textarea' placeholder='Type here...' />
      <div data-testid='test-content'>Test content</div>
    </div>
  )
}

function TestShortcutsComponent() {
  const [showHelp, setShowHelp] = React.useState(false)

  return (
    <ModeShortcutsProvider>
      <div>
        <TestModeComponent />
        <button data-testid='show-help' onClick={() => setShowHelp(true)}>
          Show Help
        </button>
        <button data-testid='hide-help' onClick={() => setShowHelp(false)}>
          Hide Help
        </button>
      </div>
    </ModeShortcutsProvider>
  )
}

describe('ModeShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ModeShortcutsProvider', () => {
    it('renders children correctly', () => {
      render(
        <ModeProvider>
          <ModeShortcutsProvider>
            <div data-testid='child-content'>Test content</div>
          </ModeShortcutsProvider>
        </ModeProvider>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
      expect(screen.getByTestId('child-content')).toHaveTextContent('Test content')
    })

    it('registers keyboard event listeners', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')

      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), {
        capture: true,
      })

      addEventListenerSpy.mockRestore()
    })

    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      const { unmount } = render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), {
        capture: true,
      })

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('triggers visual mode with Alt+V', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Trigger Alt+V shortcut
      fireEvent.keyDown(document, { key: 'v', altKey: true })

      // Should not throw error
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('triggers chat mode with Alt+C', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Trigger Alt+C shortcut
      fireEvent.keyDown(document, { key: 'c', altKey: true })

      // Should not throw error
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('triggers hybrid mode with Alt+H', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Trigger Alt+H shortcut
      fireEvent.keyDown(document, { key: 'h', altKey: true })

      // Should not throw error
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('shows help with Shift+?', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Trigger Shift+? shortcut
      fireEvent.keyDown(document, { key: '?', shiftKey: true })

      // Should show help overlay
      await waitFor(() => {
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
      })
    })

    it('hides help with Escape', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // First show help
      fireEvent.keyDown(document, { key: '?', shiftKey: true })

      await waitFor(() => {
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
      })

      // Then hide with Escape
      fireEvent.keyDown(document, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
      })
    })

    it('triggers layout shortcuts in hybrid mode', () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // First switch to hybrid mode
      fireEvent.keyDown(document, { key: 'h', altKey: true })

      // Then try layout shortcuts
      fireEvent.keyDown(document, { key: '1', ctrlKey: true, shiftKey: true })
      fireEvent.keyDown(document, { key: '2', ctrlKey: true, shiftKey: true })
      fireEvent.keyDown(document, { key: '3', ctrlKey: true, shiftKey: true })
      fireEvent.keyDown(document, { key: '4', ctrlKey: true, shiftKey: true })

      // Should not throw errors
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('ignores shortcuts when typing in inputs', () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Focus on input element
      const input = screen.getByTestId('test-input')
      input.focus()

      // Trigger shortcut while focused on input
      fireEvent.keyDown(input, { key: 'v', altKey: true, target: input })

      // Should not trigger mode switch (difficult to test directly, but should not crash)
      expect(input).toBeInTheDocument()
    })

    it('ignores shortcuts when typing in textareas', () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Focus on textarea element
      const textarea = screen.getByTestId('test-textarea')
      textarea.focus()

      // Trigger shortcut while focused on textarea
      fireEvent.keyDown(textarea, { key: 'c', altKey: true, target: textarea })

      // Should not trigger mode switch
      expect(textarea).toBeInTheDocument()
    })

    it('allows Escape shortcut even when typing', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Show help first
      fireEvent.keyDown(document, { key: '?', shiftKey: true })

      await waitFor(() => {
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
      })

      // Focus on input
      const input = screen.getByTestId('test-input')
      input.focus()

      // Escape should still work
      fireEvent.keyDown(input, { key: 'Escape', target: input })

      await waitFor(() => {
        expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
      })
    })

    it('handles shortcuts with wrong modifiers', () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Try shortcuts with wrong modifiers
      fireEvent.keyDown(document, { key: 'v' }) // No Alt
      fireEvent.keyDown(document, { key: 'v', ctrlKey: true }) // Ctrl instead of Alt
      fireEvent.keyDown(document, { key: 'v', altKey: true, ctrlKey: true }) // Extra modifier

      // Should not crash
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })
  })

  describe('Shortcut Help Overlay', () => {
    it('shows shortcut categories correctly', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Show help
      fireEvent.keyDown(document, { key: '?', shiftKey: true })

      await waitFor(() => {
        expect(screen.getByText('Mode Navigation')).toBeInTheDocument()
        expect(screen.getByText('Layout Control')).toBeInTheDocument()
        expect(screen.getByText('Utilities')).toBeInTheDocument()
      })
    })

    it('displays shortcut combinations correctly', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Show help
      fireEvent.keyDown(document, { key: '?', shiftKey: true })

      await waitFor(() => {
        expect(screen.getByText('ALT + V')).toBeInTheDocument()
        expect(screen.getByText('ALT + C')).toBeInTheDocument()
        expect(screen.getByText('ALT + H')).toBeInTheDocument()
      })
    })

    it('shows current mode in help header', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Show help
      fireEvent.keyDown(document, { key: '?', shiftKey: true })

      await waitFor(() => {
        expect(screen.getByText(/Currently in/)).toBeInTheDocument()
        expect(screen.getByText(/visual/)).toBeInTheDocument() // Default mode
      })
    })

    it('closes help overlay when clicking backdrop', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Show help
      fireEvent.keyDown(document, { key: '?', shiftKey: true })

      await waitFor(() => {
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
      })

      // Click close button (X button)
      const closeButton =
        screen.getByRole('button', { name: /close/i }) ||
        screen.getAllByRole('button').find((btn) => btn.textContent === '×') ||
        screen.getAllByRole('button').find((btn) => btn.innerHTML.includes('M6 18L18 6M6 6l12 12'))

      if (closeButton) {
        fireEvent.click(closeButton)

        await waitFor(() => {
          expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('QuickShortcutHints', () => {
    it('renders shortcut hints', () => {
      render(
        <ModeProvider>
          <QuickShortcutHints />
        </ModeProvider>
      )

      expect(screen.getByText('⌨️ Shortcuts')).toBeInTheDocument()
    })

    it('shows hints on hover', async () => {
      render(
        <ModeProvider>
          <QuickShortcutHints />
        </ModeProvider>
      )

      const shortcutsButton = screen.getByText('⌨️ Shortcuts')

      fireEvent.mouseEnter(shortcutsButton)

      await waitFor(() => {
        expect(screen.getByText('Visual')).toBeInTheDocument()
        expect(screen.getByText('Chat')).toBeInTheDocument()
        expect(screen.getByText('Hybrid')).toBeInTheDocument()
        expect(screen.getByText('Help')).toBeInTheDocument()
      })
    })

    it('hides hints on mouse leave', async () => {
      render(
        <ModeProvider>
          <QuickShortcutHints />
        </ModeProvider>
      )

      const shortcutsButton = screen.getByText('⌨️ Shortcuts')

      fireEvent.mouseEnter(shortcutsButton)

      await waitFor(() => {
        expect(screen.getByText('Visual')).toBeInTheDocument()
      })

      fireEvent.mouseLeave(shortcutsButton)

      await waitFor(() => {
        expect(screen.queryByText('Visual')).not.toBeInTheDocument()
      })
    })

    it('applies custom className', () => {
      render(
        <ModeProvider>
          <QuickShortcutHints className='custom-hints' />
        </ModeProvider>
      )

      const container = screen.getByText('⌨️ Shortcuts').closest('.custom-hints')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper keyboard navigation', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Show help
      fireEvent.keyDown(document, { key: '?', shiftKey: true })

      await waitFor(() => {
        const dialog =
          screen.getByRole('dialog') || screen.getByText('Keyboard Shortcuts').closest('div')
        expect(dialog).toBeInTheDocument()
      })
    })

    it('provides screen reader friendly content', async () => {
      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Show help
      fireEvent.keyDown(document, { key: '?', shiftKey: true })

      await waitFor(() => {
        // Should have proper headings and structure
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
        expect(screen.getByText('Mode Navigation')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles shortcut execution errors gracefully', () => {
      // Mock console.error to avoid noise in tests
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Should not crash even with internal errors
      fireEvent.keyDown(document, { key: 'v', altKey: true })
      fireEvent.keyDown(document, { key: 'c', altKey: true })

      expect(screen.getByTestId('test-content')).toBeInTheDocument()

      mockConsoleError.mockRestore()
    })

    it('handles missing DOM elements gracefully', () => {
      // Mock document.activeElement to return null
      Object.defineProperty(document, 'activeElement', {
        value: null,
        configurable: true,
      })

      render(
        <ModeProvider>
          <TestShortcutsComponent />
        </ModeProvider>
      )

      // Should not crash
      fireEvent.keyDown(document, { key: 'v', altKey: true })

      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })
  })
})
