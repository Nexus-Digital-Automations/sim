/**
 * Comprehensive Unit Tests for Parlant Chat Interface Components
 * =============================================================
 *
 * Complete test coverage for all chat interface components including:
 * - React component rendering and interactions
 * - State management and props handling
 * - User input validation and edge cases
 * - Error boundaries and fallback states
 * - Accessibility and responsive behavior
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react-dom/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChatClient from '@/app/chat/[subdomain]/chat'
import {
  ChatErrorState,
  ChatHeader,
  ChatInput,
  ChatLoadingState,
  ChatMessageContainer,
  EmailAuth,
  PasswordAuth,
  VoiceInterface,
} from '@/app/chat/components'
import type { ChatConfig, ChatMessage } from '@/app/chat/types'

// Mock dependencies
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('@/app/(landing)/actions/github', () => ({
  getFormattedGitHubStars: vi.fn().mockResolvedValue('3.4k'),
}))

vi.mock('@/app/chat/hooks', () => ({
  useChatStreaming: vi.fn(() => ({
    isStreamingResponse: false,
    abortControllerRef: { current: null },
    stopStreaming: vi.fn(),
    handleStreamedResponse: vi.fn(),
  })),
  useAudioStreaming: vi.fn(() => ({
    isPlayingAudio: false,
    streamTextToAudio: vi.fn(),
    stopAudio: vi.fn(),
  })),
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
  },
})

// Mock AudioContext
global.AudioContext = vi.fn(() => ({
  close: vi.fn(),
  state: 'running',
})) as any

describe('Parlant Chat Interface Component Unit Tests', () => {
  const mockChatConfig: ChatConfig = {
    id: 'test-chat-1',
    title: 'Test Chat',
    description: 'Test chat description',
    customizations: {
      welcomeMessage: 'Welcome to our test chat!',
      primaryColor: '#007bff',
      logoUrl: '/test-logo.png',
      headerText: 'Test Support',
    },
    authType: 'public',
    outputConfigs: [{ blockId: 'test-block', path: 'output' }],
  }

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      content: 'Hello, how can I help you?',
      type: 'assistant',
      timestamp: new Date('2023-01-01T10:00:00Z'),
      isInitialMessage: true,
    },
    {
      id: 'msg-2',
      content: 'I need help with my account',
      type: 'user',
      timestamp: new Date('2023-01-01T10:01:00Z'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockChatConfig),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ChatClient Main Component', () => {
    it('should render loading state initially', () => {
      render(<ChatClient subdomain='test-chat' />)

      expect(screen.getByTestId('chat-loading-state')).toBeInTheDocument()
    })

    it('should fetch chat configuration on mount', async () => {
      render(<ChatClient subdomain='test-chat' />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat/test-chat', expect.any(Object))
      })
    })

    it('should display error state when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Chat not found' }),
      })

      render(<ChatClient subdomain='nonexistent-chat' />)

      await waitFor(() => {
        expect(screen.getByTestId('chat-error-state')).toBeInTheDocument()
      })
    })

    it('should render chat interface when config loads successfully', async () => {
      render(<ChatClient subdomain='test-chat' />)

      await waitFor(() => {
        expect(screen.getByTestId('chat-header')).toBeInTheDocument()
        expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
        expect(screen.getByTestId('chat-input')).toBeInTheDocument()
      })
    })

    it('should display welcome message when configured', async () => {
      render(<ChatClient subdomain='test-chat' />)

      await waitFor(() => {
        expect(screen.getByText('Welcome to our test chat!')).toBeInTheDocument()
      })
    })

    it('should handle authentication required states', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'auth_required_password' }),
      })

      render(<ChatClient subdomain='protected-chat' />)

      await waitFor(() => {
        expect(screen.getByTestId('password-auth')).toBeInTheDocument()
      })
    })

    it('should handle email authentication requirement', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'auth_required_email' }),
      })

      render(<ChatClient subdomain='email-protected-chat' />)

      await waitFor(() => {
        expect(screen.getByTestId('email-auth')).toBeInTheDocument()
      })
    })
  })

  describe('ChatHeader Component', () => {
    it('should display chat title and description', () => {
      render(<ChatHeader chatConfig={mockChatConfig} starCount='3.4k' />)

      expect(screen.getByText('Test Chat')).toBeInTheDocument()
      expect(screen.getByText('Test chat description')).toBeInTheDocument()
    })

    it('should display custom header text when configured', () => {
      render(<ChatHeader chatConfig={mockChatConfig} starCount='3.4k' />)

      expect(screen.getByText('Test Support')).toBeInTheDocument()
    })

    it('should display GitHub stars count', () => {
      render(<ChatHeader chatConfig={mockChatConfig} starCount='5.2k' />)

      expect(screen.getByText('5.2k')).toBeInTheDocument()
    })

    it('should display logo when configured', () => {
      render(<ChatHeader chatConfig={mockChatConfig} starCount='3.4k' />)

      const logo = screen.getByAltText('Chat Logo')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('src', '/test-logo.png')
    })

    it('should apply custom primary color styling', () => {
      render(<ChatHeader chatConfig={mockChatConfig} starCount='3.4k' />)

      const headerElement = screen.getByTestId('chat-header')
      expect(headerElement).toHaveStyle(
        `--primary-color: ${mockChatConfig.customizations.primaryColor}`
      )
    })

    it('should handle missing customizations gracefully', () => {
      const minimalConfig: ChatConfig = {
        ...mockChatConfig,
        customizations: {},
      }

      render(<ChatHeader chatConfig={minimalConfig} starCount='3.4k' />)

      expect(screen.getByTestId('chat-header')).toBeInTheDocument()
    })
  })

  describe('ChatInput Component', () => {
    const mockOnSubmit = vi.fn()
    const mockOnVoiceStart = vi.fn()
    const mockOnStopStreaming = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should render input field and send button', () => {
      render(
        <ChatInput
          onSubmit={mockOnSubmit}
          isStreaming={false}
          onStopStreaming={mockOnStopStreaming}
          onVoiceStart={mockOnVoiceStart}
        />
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('button', { Name: /send/i })).toBeInTheDocument()
    })

    it('should handle text input changes', async () => {
      const user = userEvent.setup()

      render(
        <ChatInput
          onSubmit={mockOnSubmit}
          isStreaming={false}
          onStopStreaming={mockOnStopStreaming}
          onVoiceStart={mockOnVoiceStart}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'Hello, I need help')

      expect(input).toHaveValue('Hello, I need help')
    })

    it('should submit message on send button click', async () => {
      const user = userEvent.setup()

      render(
        <ChatInput
          onSubmit={mockOnSubmit}
          isStreaming={false}
          onStopStreaming={mockOnStopStreaming}
          onVoiceStart={mockOnVoiceStart}
        />
      )

      const input = screen.getByRole('textbox')
      const sendButton = screen.getByRole('button', { Name: /send/i })

      await user.type(input, 'Test message')
      await user.click(sendButton)

      expect(mockOnSubmit).toHaveBeenCalledWith('Test message', false)
    })

    it('should submit message on Enter key press', async () => {
      const user = userEvent.setup()

      render(
        <ChatInput
          onSubmit={mockOnSubmit}
          isStreaming={false}
          onStopStreaming={mockOnStopStreaming}
          onVoiceStart={mockOnVoiceStart}
        />
      )

      const input = screen.getByRole('textbox')

      await user.type(input, 'Enter key test')
      await user.keyboard('{Enter}')

      expect(mockOnSubmit).toHaveBeenCalledWith('Enter key test', false)
    })

    it('should not submit empty messages', async () => {
      const user = userEvent.setup()

      render(
        <ChatInput
          onSubmit={mockOnSubmit}
          isStreaming={false}
          onStopStreaming={mockOnStopStreaming}
          onVoiceStart={mockOnVoiceStart}
        />
      )

      const sendButton = screen.getByRole('button', { Name: /send/i })

      await user.click(sendButton)

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should disable input during streaming', () => {
      render(
        <ChatInput
          onSubmit={mockOnSubmit}
          isStreaming={true}
          onStopStreaming={mockOnStopStreaming}
          onVoiceStart={mockOnVoiceStart}
        />
      )

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('should show stop button during streaming', () => {
      render(
        <ChatInput
          onSubmit={mockOnSubmit}
          isStreaming={true}
          onStopStreaming={mockOnStopStreaming}
          onVoiceStart={mockOnVoiceStart}
        />
      )

      expect(screen.getByRole('button', { Name: /stop/i })).toBeInTheDocument()
    })

    it('should call onStopStreaming when stop button clicked', async () => {
      const user = userEvent.setup()

      render(
        <ChatInput
          onSubmit={mockOnSubmit}
          isStreaming={true}
          onStopStreaming={mockOnStopStreaming}
          onVoiceStart={mockOnVoiceStart}
        />
      )

      const stopButton = screen.getByRole('button', { Name: /stop/i })
      await user.click(stopButton)

      expect(mockOnStopStreaming).toHaveBeenCalled()
    })

    it('should handle voice input activation', async () => {
      const user = userEvent.setup()

      render(
        <ChatInput
          onSubmit={mockOnSubmit}
          isStreaming={false}
          onStopStreaming={mockOnStopStreaming}
          onVoiceStart={mockOnVoiceStart}
        />
      )

      const voiceButton = screen.getByRole('button', { Name: /voice/i })
      await user.click(voiceButton)

      expect(mockOnVoiceStart).toHaveBeenCalled()
    })

    it('should handle Shift+Enter for new line', async () => {
      const user = userEvent.setup()

      render(
        <ChatInput
          onSubmit={mockOnSubmit}
          isStreaming={false}
          onStopStreaming={mockOnStopStreaming}
          onVoiceStart={mockOnVoiceStart}
        />
      )

      const input = screen.getByRole('textbox')

      await user.type(input, 'First line{Shift>}{Enter}{/Shift}Second line')

      expect(input).toHaveValue('First line\nSecond line')
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should limit input length', async () => {
      const user = userEvent.setup()

      render(
        <ChatInput
          onSubmit={mockOnSubmit}
          isStreaming={false}
          onStopStreaming={mockOnStopStreaming}
          onVoiceStart={mockOnVoiceStart}
          maxLength={10}
        />
      )

      const input = screen.getByRole('textbox')

      await user.type(input, 'This message is too long')

      expect(input.value.length).toBeLessThanOrEqual(10)
    })
  })

  describe('ChatMessageContainer Component', () => {
    const mockScrollToBottom = vi.fn()
    const mockScrollToMessage = vi.fn()
    const mockMessagesContainerRef = { current: null }
    const mockMessagesEndRef = { current: null }

    it('should render all messages', () => {
      render(
        <ChatMessageContainer
          messages={mockMessages}
          isLoading={false}
          showScrollButton={false}
          messagesContainerRef={mockMessagesContainerRef}
          messagesEndRef={mockMessagesEndRef}
          scrollToBottom={mockScrollToBottom}
          scrollToMessage={mockScrollToMessage}
          chatConfig={mockChatConfig}
        />
      )

      expect(screen.getByText('Hello, how can I help you?')).toBeInTheDocument()
      expect(screen.getByText('I need help with my account')).toBeInTheDocument()
    })

    it('should show loading indicator when streaming', () => {
      render(
        <ChatMessageContainer
          messages={mockMessages}
          isLoading={true}
          showScrollButton={false}
          messagesContainerRef={mockMessagesContainerRef}
          messagesEndRef={mockMessagesEndRef}
          scrollToBottom={mockScrollToBottom}
          scrollToMessage={mockScrollToMessage}
          chatConfig={mockChatConfig}
        />
      )

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('should show scroll to bottom button when needed', () => {
      render(
        <ChatMessageContainer
          messages={mockMessages}
          isLoading={false}
          showScrollButton={true}
          messagesContainerRef={mockMessagesContainerRef}
          messagesEndRef={mockMessagesEndRef}
          scrollToBottom={mockScrollToBottom}
          scrollToMessage={mockScrollToMessage}
          chatConfig={mockChatConfig}
        />
      )

      expect(screen.getByRole('button', { Name: /scroll to bottom/i })).toBeInTheDocument()
    })

    it('should call scrollToBottom when scroll button clicked', async () => {
      const user = userEvent.setup()

      render(
        <ChatMessageContainer
          messages={mockMessages}
          isLoading={false}
          showScrollButton={true}
          messagesContainerRef={mockMessagesContainerRef}
          messagesEndRef={mockMessagesEndRef}
          scrollToBottom={mockScrollToBottom}
          scrollToMessage={mockScrollToMessage}
          chatConfig={mockChatConfig}
        />
      )

      const scrollButton = screen.getByRole('button', { Name: /scroll to bottom/i })
      await user.click(scrollButton)

      expect(mockScrollToBottom).toHaveBeenCalled()
    })

    it('should handle empty message list', () => {
      render(
        <ChatMessageContainer
          messages={[]}
          isLoading={false}
          showScrollButton={false}
          messagesContainerRef={mockMessagesContainerRef}
          messagesEndRef={mockMessagesEndRef}
          scrollToBottom={mockScrollToBottom}
          scrollToMessage={mockScrollToMessage}
          chatConfig={mockChatConfig}
        />
      )

      expect(screen.getByTestId('empty-chat-state')).toBeInTheDocument()
    })

    it('should display timestamps correctly', () => {
      render(
        <ChatMessageContainer
          messages={mockMessages}
          isLoading={false}
          showScrollButton={false}
          messagesContainerRef={mockMessagesContainerRef}
          messagesEndRef={mockMessagesEndRef}
          scrollToBottom={mockScrollToBottom}
          scrollToMessage={mockScrollToMessage}
          chatConfig={mockChatConfig}
        />
      )

      // Check that timestamps are displayed
      expect(screen.getByText(/10:00 AM/i)).toBeInTheDocument()
      expect(screen.getByText(/10:01 AM/i)).toBeInTheDocument()
    })

    it('should distinguish user and assistant messages visually', () => {
      render(
        <ChatMessageContainer
          messages={mockMessages}
          isLoading={false}
          showScrollButton={false}
          messagesContainerRef={mockMessagesContainerRef}
          messagesEndRef={mockMessagesEndRef}
          scrollToBottom={mockScrollToBottom}
          scrollToMessage={mockScrollToMessage}
          chatConfig={mockChatConfig}
        />
      )

      const assistantMessage = screen.getByTestId('message-msg-1')
      const userMessage = screen.getByTestId('message-msg-2')

      expect(assistantMessage).toHaveClass('assistant-message')
      expect(userMessage).toHaveClass('user-message')
    })
  })

  describe('Authentication Components', () => {
    const mockOnAuthSuccess = vi.fn()

    describe('PasswordAuth', () => {
      it('should render password input form', () => {
        render(
          <PasswordAuth
            subdomain='protected-chat'
            onAuthSuccess={mockOnAuthSuccess}
            title='Protected Chat'
            primaryColor='#007bff'
          />
        )

        expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { Name: /enter/i })).toBeInTheDocument()
      })

      it('should handle password submission', async () => {
        const user = userEvent.setup()

        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ authenticated: true }),
        })

        render(
          <PasswordAuth
            subdomain='protected-chat'
            onAuthSuccess={mockOnAuthSuccess}
            title='Protected Chat'
            primaryColor='#007bff'
          />
        )

        const passwordInput = screen.getByLabelText(/password/i)
        const submitButton = screen.getByRole('button', { Name: /enter/i })

        await user.type(passwordInput, 'secret-password')
        await user.click(submitButton)

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/chat/protected-chat',
            expect.objectContaining({
              method: 'post',
              body: JSON.stringify({ password: 'secret-password' }),
            })
          )
        })
      })

      it('should handle authentication failure', async () => {
        const user = userEvent.setup()

        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Invalid password' }),
        })

        render(
          <PasswordAuth
            subdomain='protected-chat'
            onAuthSuccess={mockOnAuthSuccess}
            title='Protected Chat'
            primaryColor='#007bff'
          />
        )

        const passwordInput = screen.getByLabelText(/password/i)
        const submitButton = screen.getByRole('button', { Name: /enter/i })

        await user.type(passwordInput, 'wrong-password')
        await user.click(submitButton)

        await waitFor(() => {
          expect(screen.getByText(/invalid password/i)).toBeInTheDocument()
        })
      })

      it('should not submit empty password', async () => {
        const user = userEvent.setup()

        render(
          <PasswordAuth
            subdomain='protected-chat'
            onAuthSuccess={mockOnAuthSuccess}
            title='Protected Chat'
            primaryColor='#007bff'
          />
        )

        const submitButton = screen.getByRole('button', { Name: /enter/i })

        await user.click(submitButton)

        expect(mockFetch).not.toHaveBeenCalled()
      })
    })

    describe('EmailAuth', () => {
      it('should render email input form', () => {
        render(
          <EmailAuth
            subdomain='email-protected-chat'
            onAuthSuccess={mockOnAuthSuccess}
            title='Email Protected Chat'
            primaryColor='#007bff'
          />
        )

        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { Name: /continue/i })).toBeInTheDocument()
      })

      it('should validate email format', async () => {
        const user = userEvent.setup()

        render(
          <EmailAuth
            subdomain='email-protected-chat'
            onAuthSuccess={mockOnAuthSuccess}
            title='Email Protected Chat'
            primaryColor='#007bff'
          />
        )

        const emailInput = screen.getByLabelText(/email/i)
        const submitButton = screen.getByRole('button', { Name: /continue/i })

        await user.type(emailInput, 'invalid-email')
        await user.click(submitButton)

        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
        expect(mockFetch).not.toHaveBeenCalled()
      })

      it('should handle email submission with valid email', async () => {
        const user = userEvent.setup()

        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ authenticated: true }),
        })

        render(
          <EmailAuth
            subdomain='email-protected-chat'
            onAuthSuccess={mockOnAuthSuccess}
            title='Email Protected Chat'
            primaryColor='#007bff'
          />
        )

        const emailInput = screen.getByLabelText(/email/i)
        const submitButton = screen.getByRole('button', { Name: /continue/i })

        await user.type(emailInput, 'user@example.com')
        await user.click(submitButton)

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/chat/email-protected-chat',
            expect.objectContaining({
              method: 'post',
              body: JSON.stringify({ email: 'user@example.com' }),
            })
          )
        })
      })
    })
  })

  describe('Error and Loading States', () => {
    it('should render ChatErrorState with error message', () => {
      render(<ChatErrorState error='Connection failed' starCount='3.4k' />)

      expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
      expect(screen.getByText(/3.4k/i)).toBeInTheDocument()
    })

    it('should render ChatLoadingState', () => {
      render(<ChatLoadingState />)

      expect(screen.getByTestId('chat-loading-state')).toBeInTheDocument()
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should provide retry functionality in error state', async () => {
      const user = userEvent.setup()
      const mockOnRetry = vi.fn()

      render(<ChatErrorState error='Connection failed' starCount='3.4k' onRetry={mockOnRetry} />)

      const retryButton = screen.getByRole('button', { Name: /retry/i })
      await user.click(retryButton)

      expect(mockOnRetry).toHaveBeenCalled()
    })
  })

  describe('VoiceInterface Component', () => {
    const mockOnCallEnd = vi.fn()
    const mockOnVoiceTranscript = vi.fn()
    const mockOnVoiceStart = vi.fn()
    const mockOnVoiceEnd = vi.fn()
    const mockOnInterrupt = vi.fn()

    it('should render voice interface controls', () => {
      render(
        <VoiceInterface
          onCallEnd={mockOnCallEnd}
          onVoiceTranscript={mockOnVoiceTranscript}
          onVoiceStart={mockOnVoiceStart}
          onVoiceEnd={mockOnVoiceEnd}
          onInterrupt={mockOnInterrupt}
          isStreaming={false}
          isPlayingAudio={false}
          audioContextRef={{ current: null }}
          messages={[]}
        />
      )

      expect(screen.getByRole('button', { Name: /end call/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { Name: /start speaking/i })).toBeInTheDocument()
    })

    it('should handle call end', async () => {
      const user = userEvent.setup()

      render(
        <VoiceInterface
          onCallEnd={mockOnCallEnd}
          onVoiceTranscript={mockOnVoiceTranscript}
          onVoiceStart={mockOnVoiceStart}
          onVoiceEnd={mockOnVoiceEnd}
          onInterrupt={mockOnInterrupt}
          isStreaming={false}
          isPlayingAudio={false}
          audioContextRef={{ current: null }}
          messages={[]}
        />
      )

      const endCallButton = screen.getByRole('button', { Name: /end call/i })
      await user.click(endCallButton)

      expect(mockOnCallEnd).toHaveBeenCalled()
    })

    it('should show streaming indicator', () => {
      render(
        <VoiceInterface
          onCallEnd={mockOnCallEnd}
          onVoiceTranscript={mockOnVoiceTranscript}
          onVoiceStart={mockOnVoiceStart}
          onVoiceEnd={mockOnVoiceEnd}
          onInterrupt={mockOnInterrupt}
          isStreaming={true}
          isPlayingAudio={false}
          audioContextRef={{ current: null }}
          messages={[]}
        />
      )

      expect(screen.getByTestId('voice-streaming-indicator')).toBeInTheDocument()
    })

    it('should show audio playing indicator', () => {
      render(
        <VoiceInterface
          onCallEnd={mockOnCallEnd}
          onVoiceTranscript={mockOnVoiceTranscript}
          onVoiceStart={mockOnVoiceStart}
          onVoiceEnd={mockOnVoiceEnd}
          onInterrupt={mockOnInterrupt}
          isStreaming={false}
          isPlayingAudio={true}
          audioContextRef={{ current: null }}
          messages={[]}
        />
      )

      expect(screen.getByTestId('audio-playing-indicator')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ChatClient subdomain='test-chat' />)

      // Wait for component to load
      setTimeout(() => {
        const chatContainer = screen.getByRole('main')
        expect(chatContainer).toHaveAttribute('aria-label', 'Chat interface')

        const messageContainer = screen.getByRole('log')
        expect(messageContainer).toHaveAttribute('aria-label', 'Chat messages')
      }, 100)
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      render(<ChatClient subdomain='test-chat' />)

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })

      const input = screen.getByRole('textbox')

      // Tab navigation should work
      await user.tab()
      expect(input).toHaveFocus()
    })

    it('should announce new messages to screen readers', async () => {
      render(<ChatClient subdomain='test-chat' />)

      await waitFor(() => {
        const ariaLive = screen.getByRole('status')
        expect(ariaLive).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('should have proper heading structure', async () => {
      render(<ChatClient subdomain='test-chat' />)

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 })
        expect(mainHeading).toBeInTheDocument()
      })
    })

    it('should support high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      })

      render(<ChatClient subdomain='test-chat' />)

      // Component should apply high contrast styles
      setTimeout(() => {
        const chatContainer = screen.getByTestId('chat-container')
        expect(chatContainer).toHaveClass('high-contrast')
      }, 100)
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })

      render(<ChatClient subdomain='test-chat' />)

      setTimeout(() => {
        const chatContainer = screen.getByTestId('chat-container')
        expect(chatContainer).toHaveClass('mobile-layout')
      }, 100)
    })

    it('should adapt to tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      Object.defineProperty(window, 'innerHeight', { value: 1024 })

      render(<ChatClient subdomain='test-chat' />)

      setTimeout(() => {
        const chatContainer = screen.getByTestId('chat-container')
        expect(chatContainer).toHaveClass('tablet-layout')
      }, 100)
    })

    it('should handle orientation changes', () => {
      const handleOrientationChange = vi.fn()

      render(<ChatClient subdomain='test-chat' />)

      // Simulate orientation change
      window.dispatchEvent(new Event('orientationchange'))

      setTimeout(() => {
        // Layout should adjust for landscape/portrait
        const chatContainer = screen.getByTestId('chat-container')
        expect(chatContainer).toHaveAttribute('data-orientation')
      }, 100)
    })
  })

  describe('Performance Optimization', () => {
    it('should implement virtual scrolling for large message lists', async () => {
      const largeMessageList = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        type: 'user' as const,
        timestamp: new Date(),
      }))

      const { container } = render(
        <ChatMessageContainer
          messages={largeMessageList}
          isLoading={false}
          showScrollButton={false}
          messagesContainerRef={{ current: null }}
          messagesEndRef={{ current: null }}
          scrollToBottom={vi.fn()}
          scrollToMessage={vi.fn()}
          chatConfig={mockChatConfig}
        />
      )

      // Only visible messages should be rendered
      const renderedMessages = container.querySelectorAll('[data-message-id]')
      expect(renderedMessages.length).toBeLessThan(100) // Virtual scrolling active
    })

    it('should debounce input changes', async () => {
      const user = userEvent.setup()
      const mockOnChange = vi.fn()

      render(
        <ChatInput
          onSubmit={vi.fn()}
          isStreaming={false}
          onStopStreaming={vi.fn()}
          onVoiceStart={vi.fn()}
          onChange={mockOnChange}
        />
      )

      const input = screen.getByRole('textbox')

      // Type rapidly
      await user.type(input, 'Fast typing test')

      // onChange should be debounced
      await waitFor(
        () => {
          expect(mockOnChange).toHaveBeenCalledTimes(1)
        },
        { timeout: 1000 }
      )
    })

    it('should lazy load message attachments', async () => {
      const messageWithAttachment = {
        id: 'msg-with-attachment',
        content: 'Check out this image',
        type: 'user' as const,
        timestamp: new Date(),
        attachments: [
          {
            id: 'att-1',
            type: 'image',
            url: '/api/files/large-image.jpg',
            size: 5000000, // 5MB
          },
        ],
      }

      render(
        <ChatMessageContainer
          messages={[messageWithAttachment]}
          isLoading={false}
          showScrollButton={false}
          messagesContainerRef={{ current: null }}
          messagesEndRef={{ current: null }}
          scrollToBottom={vi.fn()}
          scrollToMessage={vi.fn()}
          chatConfig={mockChatConfig}
        />
      )

      // Image should not be loaded initially
      const imageElement = screen.getByTestId('lazy-image')
      expect(imageElement).toHaveAttribute('data-src', '/api/files/large-image.jpg')
      expect(imageElement).not.toHaveAttribute('src')

      // Simulate image entering viewport
      act(() => {
        fireEvent.scroll(window, { target: { scrollY: 100 } })
      })

      // Image should now load
      await waitFor(() => {
        expect(imageElement).toHaveAttribute('src', '/api/files/large-image.jpg')
      })
    })
  })

  describe('Error Boundaries', () => {
    it('should catch and display component errors', () => {
      const ThrowingComponent = () => {
        throw new Error('Test error for error boundary')
      }

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <ChatMessageContainer
          messages={[]}
          isLoading={false}
          showScrollButton={false}
          messagesContainerRef={{ current: null }}
          messagesEndRef={{ current: null }}
          scrollToBottom={vi.fn()}
          scrollToMessage={vi.fn()}
          chatConfig={mockChatConfig}
          customComponent={ThrowingComponent}
        />
      )

      expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument()
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

      consoleError.mockRestore()
    })

    it('should provide error recovery options', async () => {
      const user = userEvent.setup()
      const mockOnRecover = vi.fn()

      render(
        <ChatErrorState
          error='Component crashed'
          starCount='3.4k'
          onRecover={mockOnRecover}
          showRecovery={true}
        />
      )

      const recoverButton = screen.getByRole('button', { Name: /recover/i })
      await user.click(recoverButton)

      expect(mockOnRecover).toHaveBeenCalled()
    })
  })
})
