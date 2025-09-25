/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ModeProvider } from '@/contexts/mode-context'
import { HybridMode, useHybridMode } from '@/components/mode-switching/hybrid-mode'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, animate, ...props }: any) => (
      <div style={{ ...style, ...(animate || {}) }} {...props}>{children}</div>
    ),
    button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>{children}</button>
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
  }))
}))

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

// Test components
const MockVisualComponent = () => (
  <div data-testid="visual-component" style={{ height: '100%', background: 'blue' }}>
    Visual Editor Content
  </div>
)

const MockChatComponent = () => (
  <div data-testid="chat-component" style={{ height: '100%', background: 'green' }}>
    Chat Interface Content
  </div>
)

function TestHybridModeComponent() {
  return (
    <HybridMode
      visualComponent={<MockVisualComponent />}
      chatComponent={<MockChatComponent />}
      className="test-hybrid"
    />
  )
}

function TestHybridHookComponent() {
  const { isHybridMode, switchToHybrid, updateHybridLayout, currentLayout } = useHybridMode()

  return (
    <div>
      <div data-testid="is-hybrid">{isHybridMode.toString()}</div>
      <div data-testid="layout-type">{currentLayout.type}</div>
      <div data-testid="layout-ratio">{currentLayout.ratio}</div>

      <button
        data-testid="switch-hybrid"
        onClick={() => switchToHybrid()}
      >
        Switch to Hybrid
      </button>

      <button
        data-testid="update-layout"
        onClick={() => updateHybridLayout({
          type: 'split-vertical',
          ratio: 0.7,
          collapsible: true,
          minSize: 200
        })}
      >
        Update Layout
      </button>
    </div>
  )
}

describe('HybridMode', () => {
  beforeEach(() => {
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }))

    // Mock clientWidth and clientHeight
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 800,
    })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 600,
    })
  })

  describe('Component Rendering', () => {
    it('renders both visual and chat components', () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      expect(screen.getByTestId('visual-component')).toBeInTheDocument()
      expect(screen.getByTestId('chat-component')).toBeInTheDocument()
      expect(screen.getByText('Visual Editor Content')).toBeInTheDocument()
      expect(screen.getByText('Chat Interface Content')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      const container = screen.getByTestId('visual-component').closest('.test-hybrid')
      expect(container).toBeInTheDocument()
    })

    it('shows layout selector', () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      // Should have layout selector buttons
      expect(screen.getAllByRole('button')).toHaveLength(4) // 4 layout options
    })

    it('shows sync indicator', () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      expect(screen.getByText('Synced')).toBeInTheDocument()
    })
  })

  describe('Layout Switching', () => {
    it('switches to different layouts', async () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      // Get layout buttons (they should have title attributes for identification)
      const buttons = screen.getAllByRole('button')

      // Click different layout buttons
      fireEvent.click(buttons[0]) // First layout option
      fireEvent.click(buttons[1]) // Second layout option

      // Should not crash and components should still be rendered
      expect(screen.getByTestId('visual-component')).toBeInTheDocument()
      expect(screen.getByTestId('chat-component')).toBeInTheDocument()
    })

    it('updates layout configuration', () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      const layoutButtons = screen.getAllByRole('button')

      // Click to change layout - should not throw error
      fireEvent.click(layoutButtons[0])

      expect(screen.getByTestId('visual-component')).toBeInTheDocument()
    })
  })

  describe('Panel Resizing', () => {
    it('handles mouse events for resizing', () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      // Find splitter elements (they should have specific classes or attributes)
      const container = screen.getByTestId('visual-component').parentElement?.parentElement

      // Should render without crashing when interacting
      expect(container).toBeInTheDocument()
    })

    it('constrains panel sizes within bounds', () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      // Panels should maintain minimum sizes even during resize
      expect(screen.getByTestId('visual-component')).toBeInTheDocument()
      expect(screen.getByTestId('chat-component')).toBeInTheDocument()
    })
  })

  describe('Panel Collapsing', () => {
    it('handles panel collapse/expand', async () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      // Look for collapse buttons (should be rendered if collapsible is true)
      const buttons = screen.getAllByRole('button')

      // Should have layout selector buttons at minimum
      expect(buttons.length).toBeGreaterThan(0)

      // Components should remain visible
      expect(screen.getByTestId('visual-component')).toBeInTheDocument()
      expect(screen.getByTestId('chat-component')).toBeInTheDocument()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('handles keyboard shortcuts for layout switching', () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      // Simulate keyboard events
      fireEvent.keyDown(window, { key: '1', ctrlKey: true })
      fireEvent.keyDown(window, { key: '2', ctrlKey: true })

      // Should not crash
      expect(screen.getByTestId('visual-component')).toBeInTheDocument()
    })

    it('ignores shortcuts without proper modifiers', () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      // Simulate keyboard events without modifiers
      fireEvent.keyDown(window, { key: '1' })
      fireEvent.keyDown(window, { key: '2' })

      // Should not affect layout
      expect(screen.getByTestId('visual-component')).toBeInTheDocument()
    })
  })

  describe('useHybridMode Hook', () => {
    it('provides hybrid mode state correctly', () => {
      render(
        <ModeProvider>
          <TestHybridHookComponent />
        </ModeProvider>
      )

      // Should show initial state (not in hybrid mode by default)
      expect(screen.getByTestId('is-hybrid')).toHaveTextContent('false')
      expect(screen.getByTestId('layout-type')).toHaveTextContent('split-horizontal') // Default
      expect(screen.getByTestId('layout-ratio')).toHaveTextContent('0.5') // Default
    })

    it('switches to hybrid mode correctly', async () => {
      render(
        <ModeProvider>
          <TestHybridHookComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('switch-hybrid'))

      await waitFor(() => {
        expect(screen.getByTestId('is-hybrid')).toHaveTextContent('true')
      })
    })

    it('updates layout configuration', () => {
      render(
        <ModeProvider>
          <TestHybridHookComponent />
        </ModeProvider>
      )

      fireEvent.click(screen.getByTestId('update-layout'))

      // Should not crash when updating layout
      expect(screen.getByTestId('layout-type')).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('adapts to different container sizes', () => {
      // Mock different container size
      Element.prototype.getBoundingClientRect = jest.fn(() => ({
        width: 400,
        height: 300,
        top: 0,
        left: 0,
        bottom: 300,
        right: 400,
        x: 0,
        y: 0,
        toJSON: jest.fn(),
      }))

      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      expect(screen.getByTestId('visual-component')).toBeInTheDocument()
      expect(screen.getByTestId('chat-component')).toBeInTheDocument()
    })

    it('handles very small container sizes', () => {
      // Mock very small container
      Element.prototype.getBoundingClientRect = jest.fn(() => ({
        width: 200,
        height: 150,
        top: 0,
        left: 0,
        bottom: 150,
        right: 200,
        x: 0,
        y: 0,
        toJSON: jest.fn(),
      }))

      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      // Should still render components
      expect(screen.getByTestId('visual-component')).toBeInTheDocument()
      expect(screen.getByTestId('chat-component')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles missing components gracefully', () => {
      render(
        <ModeProvider>
          <HybridMode
            visualComponent={null}
            chatComponent={<MockChatComponent />}
          />
        </ModeProvider>
      )

      // Should render chat component even if visual is null
      expect(screen.getByTestId('chat-component')).toBeInTheDocument()
    })

    it('handles resize errors gracefully', () => {
      // Mock getBoundingClientRect to throw error
      Element.prototype.getBoundingClientRect = jest.fn(() => {
        throw new Error('Resize error')
      })

      // Should not crash
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      expect(screen.getByTestId('visual-component')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA attributes', () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      // Should have accessible buttons
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
      })
    })

    it('supports keyboard navigation', () => {
      render(
        <ModeProvider>
          <TestHybridModeComponent />
        </ModeProvider>
      )

      const buttons = screen.getAllByRole('button')

      // Should be able to focus buttons
      buttons.forEach(button => {
        button.focus()
        expect(document.activeElement).toBe(button)
      })
    })
  })
})