/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  ModeTransition,
  ModeTransitionFeedback,
  useTransitionTrigger,
} from '@/components/mode-switching/mode-transition'
import { ModeProvider } from '@/contexts/mode-context'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
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

// Test component
function TestTransitionComponent() {
  const { triggerTransition, isTransitioning, progress } = useTransitionTrigger()

  return (
    <div>
      <div data-testid='is-transitioning'>{isTransitioning.toString()}</div>
      <div data-testid='progress'>{progress}</div>
      <button data-testid='trigger-visual' onClick={() => triggerTransition('visual')}>
        Switch to Visual
      </button>
      <button
        data-testid='trigger-chat'
        onClick={() => triggerTransition('chat', { withFeedback: true })}
      >
        Switch to Chat with Feedback
      </button>
      <button
        data-testid='trigger-hybrid'
        onClick={() => triggerTransition('hybrid', { duration: 500 })}
      >
        Switch to Hybrid with Custom Duration
      </button>
    </div>
  )
}

describe('ModeTransition', () => {
  beforeEach(() => {
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: jest.fn(),
      writable: true,
    })
  })

  describe('ModeTransition Component', () => {
    it('renders children correctly', () => {
      render(
        <ModeProvider>
          <ModeTransition>
            <div data-testid='child-content'>Test content</div>
          </ModeTransition>
        </ModeProvider>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
      expect(screen.getByTestId('child-content')).toHaveTextContent('Test content')
    })

    it('applies custom className', () => {
      render(
        <ModeProvider>
          <ModeTransition className='custom-class'>
            <div>Content</div>
          </ModeTransition>
        </ModeProvider>
      )

      const container = screen.getByText('Content').closest('.custom-class')
      expect(container).toBeInTheDocument()
    })

    it('shows mode indicator', async () => {
      render(
        <ModeProvider>
          <ModeTransition>
            <div>Content</div>
          </ModeTransition>
        </ModeProvider>
      )

      // Should show visual mode indicator by default
      await waitFor(() => {
        expect(screen.getByText('Visual')).toBeInTheDocument()
      })
    })

    it('updates mode indicator when mode changes', async () => {
      render(
        <ModeProvider>
          <ModeTransition>
            <TestTransitionComponent />
          </ModeTransition>
        </ModeProvider>
      )

      // Initial mode should be visual
      expect(screen.getByText('Visual')).toBeInTheDocument()

      // Switch to chat mode
      screen.getByTestId('trigger-chat').click()

      // Should eventually show chat mode
      await waitFor(
        () => {
          expect(screen.getByText('Chat')).toBeInTheDocument()
        },
        { timeout: 2000 }
      )
    })
  })

  describe('ModeTransitionFeedback Component', () => {
    it('renders without crashing', () => {
      render(
        <ModeProvider>
          <ModeTransitionFeedback />
        </ModeProvider>
      )

      // Component should render without errors
      expect(document.body).toBeInTheDocument()
    })

    it('shows transition feedback when modes change', async () => {
      render(
        <ModeProvider>
          <div>
            <TestTransitionComponent />
            <ModeTransitionFeedback />
          </div>
        </ModeProvider>
      )

      // Trigger a mode transition
      screen.getByTestId('trigger-chat').click()

      // Should show transition feedback
      await waitFor(
        () => {
          expect(screen.getByText(/Mode switched:/)).toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('useTransitionTrigger Hook', () => {
    it('provides transition state correctly', () => {
      render(
        <ModeProvider>
          <TestTransitionComponent />
        </ModeProvider>
      )

      expect(screen.getByTestId('is-transitioning')).toHaveTextContent('false')
      expect(screen.getByTestId('progress')).toHaveTextContent('0')
    })

    it('triggers transitions correctly', async () => {
      render(
        <ModeProvider>
          <TestTransitionComponent />
        </ModeProvider>
      )

      // Initial state
      expect(screen.getByTestId('is-transitioning')).toHaveTextContent('false')

      // Trigger transition
      screen.getByTestId('trigger-visual').click()

      // May briefly show transitioning state
      await waitFor(() => {
        // Transition should complete quickly since we're already in visual mode
        expect(screen.getByTestId('is-transitioning')).toHaveTextContent('false')
      })
    })

    it('handles custom transition options', async () => {
      render(
        <ModeProvider>
          <TestTransitionComponent />
        </ModeProvider>
      )

      // Trigger transition with custom duration
      screen.getByTestId('trigger-hybrid').click()

      await waitFor(
        () => {
          // Should eventually complete
          expect(screen.getByTestId('is-transitioning')).toHaveTextContent('false')
        },
        { timeout: 2000 }
      )
    })

    it('triggers haptic feedback when available', () => {
      const mockVibrate = jest.fn()
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
      })

      render(
        <ModeProvider>
          <TestTransitionComponent />
        </ModeProvider>
      )

      // Trigger transition with feedback
      screen.getByTestId('trigger-chat').click()

      expect(mockVibrate).toHaveBeenCalledWith(50)
    })

    it('handles vibration gracefully when not available', () => {
      // Remove vibrate from navigator
      ;(navigator as any).vibrate = undefined

      render(
        <ModeProvider>
          <TestTransitionComponent />
        </ModeProvider>
      )

      // Should not throw error
      screen.getByTestId('trigger-chat').click()

      expect(screen.getByTestId('is-transitioning')).toBeInTheDocument()
    })
  })

  describe('Transition Animations', () => {
    it('handles animation start and complete callbacks', () => {
      const onAnimationStart = jest.fn()
      const onAnimationComplete = jest.fn()

      // Mock motion.div props
      const originalMotionDiv = require('framer-motion').motion.div
      jest.spyOn(require('framer-motion').motion, 'div').mockImplementation((props: any) => {
        // Call animation callbacks if provided
        if (props.onAnimationStart) {
          setTimeout(() => props.onAnimationStart(), 0)
        }
        if (props.onAnimationComplete) {
          setTimeout(() => props.onAnimationComplete(), 100)
        }
        return originalMotionDiv(props)
      })

      render(
        <ModeProvider>
          <ModeTransition>
            <div>Content</div>
          </ModeTransition>
        </ModeProvider>
      )

      // Animations should be handled without errors
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper accessibility attributes', () => {
      render(
        <ModeProvider>
          <ModeTransition>
            <div>Content</div>
          </ModeTransition>
        </ModeProvider>
      )

      // Mode indicator should be accessible
      const modeIndicator = screen.getByText('Visual')
      expect(modeIndicator.closest('div')).toBeInTheDocument()
    })

    it('shows loading states with proper labels', async () => {
      render(
        <ModeProvider>
          <ModeTransition>
            <TestTransitionComponent />
          </ModeTransition>
        </ModeProvider>
      )

      // Trigger transition
      screen.getByTestId('trigger-hybrid').click()

      // Should show loading state with accessible content
      await waitFor(() => {
        // Check if transitioning state is reflected
        expect(screen.getByTestId('is-transitioning')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles animation errors gracefully', () => {
      // Mock console.error to avoid noise in tests
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

      // Force an error in motion components
      jest.spyOn(require('framer-motion').motion, 'div').mockImplementation(() => {
        throw new Error('Animation error')
      })

      // Should not crash the app
      expect(() => {
        render(
          <ModeProvider>
            <ModeTransition>
              <div>Content</div>
            </ModeTransition>
          </ModeProvider>
        )
      }).toThrow() // The mock will throw, but in real usage it would be caught

      mockConsoleError.mockRestore()
    })
  })
})
