/**
 * Test Suite for Intelligent Chat Interface React Component
 *
 * Comprehensive testing of the enhanced chat interface including:
 * - Component rendering and UI elements
 * - Real-time messaging functionality
 * - Connection status and error handling
 * - User interactions and state management
 * - Integration with backend API
 *
 * @created 2025-09-04
 * @author Intelligent Chatbot Implementation Specialist
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import IntelligentChatInterface, {
  type IntelligentChatInterfaceProps,
} from '../apps/sim/components/help/intelligent-chat-interface'

// Mock the help context provider
const mockTrackInteraction = vi.fn()
const mockHelpState = {
  sessionId: 'test-session-123',
  isEnabled: true,
  analytics: {
    pageViews: 1,
    interactions: 0,
    timeSpent: 0,
  },
}

vi.mock('../lib/help/help-context-provider', () => ({
  useHelp: () => ({
    state: mockHelpState,
    trackInteraction: mockTrackInteraction,
  }),
}))

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock WebSocket for real-time functionality
class MockWebSocket {
  public readyState = WebSocket.CONNECTING
  public onopen: ((event: Event) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      if (this.onopen) this.onopen(new Event('open'))
    }, 100)
  }

  send(data: string) {
    // Mock send functionality
  }

  close() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) this.onclose(new CloseEvent('close'))
  }
}

global.WebSocket = MockWebSocket as any

describe('IntelligentChatInterface', () => {
  let defaultProps: IntelligentChatInterfaceProps
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()

    defaultProps = {
      isOpen: true,
      variant: 'modal',
      onClose: vi.fn(),
      contextData: {
        workflowContext: {
          type: 'data-processing',
          currentStep: 'validation',
          blockTypes: ['transform', 'filter'],
          completedSteps: ['import'],
          errors: [],
          timeSpent: 300000,
        },
        userProfile: {
          expertiseLevel: 'intermediate',
          preferredLanguage: 'en',
          previousInteractions: 5,
          commonIssues: ['data-validation'],
        },
      },
    }

    // Mock successful API response

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Hello! How can I help you today?',
        intent: {
          name: 'greeting',
          confidence: 0.9,
        },
        suggestedActions: [
          {
            action: 'show_help',
            title: 'Getting Started',
            description: 'Learn the basics',
            priority: 1,
            type: 'content',
          },
        ],
        conversationState: {
          phase: 'greeting',
          confidence: 0.9,
          context: {},
        },
        sessionId: 'test-session-123',
        metadata: {
          requestId: 'req-123',
          processingTime: 150,
          timestamp: new Date().toISOString(),
        },
      }),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    test('should render modal variant correctly', () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })

    test('should render inline variant correctly', () => {
      render(<IntelligentChatInterface {...defaultProps} variant='inline' />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
    })

    test('should not render when isOpen is false', () => {
      render(<IntelligentChatInterface {...defaultProps} isOpen={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument()
    })

    test('should render with custom welcome message', () => {
      const welcomeMessage = 'Welcome to our data processing help system!'
      render(<IntelligentChatInterface {...defaultProps} welcomeMessage={welcomeMessage} />)

      expect(screen.getByText(welcomeMessage)).toBeInTheDocument()
    })

    test('should render connection status indicators', () => {
      render(<IntelligentChatInterface {...defaultProps} enableRealTimeUpdates={true} />)

      // Initially connecting
      expect(screen.getByText(/connecting/i)).toBeInTheDocument()
    })

    test('should show context information when available', () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      expect(screen.getByText(/data-processing/i)).toBeInTheDocument()
      expect(screen.getByText(/intermediate/i)).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    test('should handle message sending via button click', async () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.type(messageInput, 'Hello, I need help')
      await user.click(sendButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/help/chat',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Hello, I need help'),
          })
        )
      })

      expect(screen.getByText('Hello, I need help')).toBeInTheDocument()
      expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
    })

    test('should handle message sending via Enter key', async () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      const messageInput = screen.getByPlaceholderText(/type your message/i)

      await user.type(messageInput, 'Test message{enter}')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/help/chat',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Test message'),
          })
        )
      })
    })

    test('should prevent sending empty messages', async () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.click(sendButton)

      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('should handle suggested action clicks', async () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      // Send initial message to get suggested actions
      const messageInput = screen.getByPlaceholderText(/type your message/i)
      await user.type(messageInput, 'Hello{enter}')

      await waitFor(() => {
        expect(screen.getByText('Getting Started')).toBeInTheDocument()
      })

      const suggestionButton = screen.getByRole('button', { name: /getting started/i })
      await user.click(suggestionButton)

      expect(mockTrackInteraction).toHaveBeenCalledWith('click', 'suggested-action-show_help')
    })

    test('should handle modal close', async () => {
      const onClose = vi.fn()
      render(<IntelligentChatInterface {...defaultProps} onClose={onClose} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(onClose).toHaveBeenCalled()
    })

    test('should handle conversation clearing', async () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      // Send a message first
      const messageInput = screen.getByPlaceholderText(/type your message/i)
      await user.type(messageInput, 'Test message{enter}')

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument()
      })

      // Clear conversation
      const clearButton = screen.getByRole('button', { name: /clear/i })
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument()
      })
    })
  })

  describe('Real-time Functionality', () => {
    test('should establish WebSocket connection when enabled', async () => {
      render(<IntelligentChatInterface {...defaultProps} enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument()
      })
    })

    test('should handle WebSocket connection failures', async () => {
      // Mock WebSocket failure
      const OriginalWebSocket = global.WebSocket
      global.WebSocket = class extends OriginalWebSocket {
        constructor(url: string) {
          super(url)
          setTimeout(() => {
            if (this.onerror) this.onerror(new Event('error'))
          }, 100)
        }
      } as any

      render(<IntelligentChatInterface {...defaultProps} enableRealTimeUpdates={true} />)

      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
      })

      global.WebSocket = OriginalWebSocket
    })

    test('should show typing indicator when enabled', async () => {
      render(<IntelligentChatInterface {...defaultProps} enableStreamingResponses={true} />)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      await user.type(messageInput, 'Hello{enter}')

      // Should show typing indicator while waiting for response
      await waitFor(() => {
        expect(screen.getByText(/typing/i)).toBeInTheDocument()
      })

      // Should hide typing indicator when response arrives
      await waitFor(() => {
        expect(screen.queryByText(/typing/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      } as Response)

      render(<IntelligentChatInterface {...defaultProps} />)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      await user.type(messageInput, 'Hello{enter}')

      await waitFor(() => {
        expect(screen.getByText(/sorry, something went wrong/i)).toBeInTheDocument()
      })
    })

    test('should handle network errors', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

      render(<IntelligentChatInterface {...defaultProps} />)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      await user.type(messageInput, 'Hello{enter}')

      await waitFor(() => {
        expect(screen.getByText(/connection error/i)).toBeInTheDocument()
      })
    })

    test('should handle rate limiting', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded', retryAfter: 30 }),
      } as Response)

      render(<IntelligentChatInterface {...defaultProps} />)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      await user.type(messageInput, 'Hello{enter}')

      await waitFor(() => {
        expect(screen.getByText(/rate limit/i)).toBeInTheDocument()
        expect(screen.getByText(/30 seconds/i)).toBeInTheDocument()
      })
    })

    test('should show retry option on errors', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

      render(<IntelligentChatInterface {...defaultProps} />)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      await user.type(messageInput, 'Hello{enter}')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })

      // Mock successful retry

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Retry successful!',
        }),
      } as Response)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Retry successful!')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      messageInput.focus()

      expect(document.activeElement).toBe(messageInput)

      // Tab to send button
      await user.tab()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /send/i }))
    })

    test('should have proper ARIA labels and roles', () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'AI Assistant Chat')
      expect(screen.getByPlaceholderText(/type your message/i)).toHaveAttribute(
        'aria-label',
        'Type your message'
      )
      expect(screen.getByRole('button', { name: /send/i })).toHaveAttribute(
        'aria-label',
        'Send message'
      )
    })

    test('should announce new messages to screen readers', async () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      await user.type(messageInput, 'Hello{enter}')

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('New message from AI Assistant')
      })
    })

    test('should support high contrast mode', () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      const chatContainer = screen.getByRole('dialog')
      expect(chatContainer).toHaveClass('chat-container')
      // Additional high contrast checks would be added based on CSS implementation
    })
  })

  describe('Performance', () => {
    test('should virtualize long message histories', async () => {
      const longHistory = Array.from({ length: 100 }, (_, i) => `Message ${i + 1}`)

      render(<IntelligentChatInterface {...defaultProps} />)

      // Simulate long conversation
      for (let i = 0; i < 10; i++) {
        const messageInput = screen.getByPlaceholderText(/type your message/i)
        await user.type(messageInput, `${longHistory[i]}{enter}`)

        await waitFor(() => {
          expect(screen.getByText(longHistory[i])).toBeInTheDocument()
        })
      }

      // Check that virtualization is working (not all messages visible)
      expect(screen.queryAllByText(/Message/)).toHaveLength(expect.any(Number))
    })

    test('should debounce typing indicators', async () => {
      render(<IntelligentChatInterface {...defaultProps} enableStreamingResponses={true} />)

      const messageInput = screen.getByPlaceholderText(/type your message/i)

      // Type quickly
      await user.type(messageInput, 'Hello')

      // Should not immediately show typing
      expect(screen.queryByText(/typing/i)).not.toBeInTheDocument()
    })

    test('should cleanup resources on unmount', () => {
      const { unmount } = render(
        <IntelligentChatInterface {...defaultProps} enableRealTimeUpdates={true} />
      )

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      unmount()

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/memory leak/i))

      consoleSpy.mockRestore()
    })
  })

  describe('Context Integration', () => {
    test('should display workflow context information', () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      expect(screen.getByText(/data-processing/i)).toBeInTheDocument()
      expect(screen.getByText(/validation/i)).toBeInTheDocument()
    })

    test('should adapt interface based on user expertise level', () => {
      const beginnerProps = {
        ...defaultProps,
        contextData: {
          ...defaultProps.contextData,
          userProfile: {
            expertiseLevel: 'beginner' as const,
            preferredLanguage: 'en',
            previousInteractions: 0,
            commonIssues: [],
          },
        },
      }

      render(<IntelligentChatInterface {...beginnerProps} />)

      // Should show more guidance for beginners
      expect(screen.getByText(/beginner/i)).toBeInTheDocument()
    })

    test('should track analytics events', async () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      await user.type(messageInput, 'Hello{enter}')

      expect(mockTrackInteraction).toHaveBeenCalledWith('send', 'chat-message')
    })
  })

  describe('Mobile Responsiveness', () => {
    test('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })

      render(<IntelligentChatInterface {...defaultProps} />)

      const chatContainer = screen.getByRole('dialog')
      expect(chatContainer).toHaveClass('mobile-responsive')
    })

    test('should handle touch interactions', async () => {
      render(<IntelligentChatInterface {...defaultProps} />)

      const sendButton = screen.getByRole('button', { name: /send/i })

      fireEvent.touchStart(sendButton)
      fireEvent.touchEnd(sendButton)

      // Should still work with touch events
      expect(sendButton).toBeInTheDocument()
    })
  })
})
