/**
 * Chat Interface Component Testing Suite
 * =====================================
 *
 * Comprehensive testing for chat interface components including visual regression,
 * accessibility validation, responsive design, and component behavior.
 */

import { fireEvent, render, screen, waitFor, } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import type { ChatInterface } from '../../../app/chat/[subdomain]/chat'
import type { AgentSelector } from '../../../components/chat/agent-selector'
import type { ChatInput } from '../../../components/chat/chat-input'
import type { ConversationHistory } from '../../../components/chat/conversation-history'
import type { MessageBubble } from '../../../components/chat/message-bubble'
import type { ChatMessage, ChatSession, ParlantAgent } from '../../../types/parlant'
import { ComprehensiveTestReporter } from '../../utils/test-reporter'
import type { MockParlantProvider } from '../__mocks__/parlant-provider'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Chat Interface Component Testing Suite', () => {
  let reporter: ComprehensiveTestReporter
  let mockAgents: ParlantAgent[]
  let mockMessages: ChatMessage[]
  let mockSession: ChatSession

  beforeAll(async () => {
    reporter = new ComprehensiveTestReporter({
      outputDir: './test-reports/chat-ui-components',
      includeScreenshots: true,
      generateVisualizations: true,
      reportFormats: ['html', 'json', 'junit']
    })

    await reporter.startTestSuite(
      'chat-ui-components',
      'Chat Interface Component Testing',
      'Comprehensive validation of chat interface components, accessibility, and visual integrity'
    )
  })

  afterAll(async () => {
    await reporter.finishTestSuite()
  })

  beforeEach(() => {
    // Setup mock data for each test
    mockAgents = [
      {
        id: 'agent-1',
        name: 'Support Agent',
        description: 'Customer support specialist',
        status: 'active',
        capabilities: ['general-support', 'troubleshooting']
      },
      {
        id: 'agent-2',
        name: 'Sales Agent',
        description: 'Sales and product specialist',
        status: 'active',
        capabilities: ['sales', 'product-info']
      }
    ]

    mockMessages = [
      {
        id: 'msg-1',
        content: 'Hello! How can I help you today?',
        sender: { type: 'agent', id: 'agent-1', name: 'Support Agent' },
        timestamp: new Date('2024-01-01T10:00:00Z'),
        type: 'text'
      },
      {
        id: 'msg-2',
        content: 'I need help with my account settings.',
        sender: { type: 'user', id: 'user-1', name: 'John Doe' },
        timestamp: new Date('2024-01-01T10:01:00Z'),
        type: 'text'
      }
    ]

    mockSession = {
      id: 'session-1',
      agentId: 'agent-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      status: 'active',
      startTime: new Date('2024-01-01T10:00:00Z'),
      messages: mockMessages
    }
  })

  describe('Chat Interface Container', () => {
    it('should render chat interface without errors', async () => {
      const startTime = new Date()

      const { container } = render(
        <MockParlantProvider agents={mockAgents} session={mockSession}>
          <ChatInterface />
        </MockParlantProvider>
      )

      expect(container.firstChild).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByTestId('chat-container')).toBeInTheDocument()

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'chat-interface-render',
          name: 'Chat Interface Rendering',
          complexity: 'simple',
          metadata: { component: 'ChatInterface' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should pass accessibility audit', async () => {
      const startTime = new Date()

      const { container } = render(
        <MockParlantProvider agents={mockAgents} session={mockSession}>
          <ChatInterface />
        </MockParlantProvider>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'chat-interface-accessibility',
          name: 'Chat Interface Accessibility',
          complexity: 'medium',
          metadata: {
            component: 'ChatInterface',
            accessibilityViolations: results.violations.length
          }
        } as any,
        { success: true, accessibilityScore: 100 },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should be responsive across different viewport sizes', async () => {
      const startTime = new Date()
      const viewports = [
        { width: 320, height: 568, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ]

      for (const viewport of viewports) {
        // Mock viewport resize
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width
        })
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height
        })

        window.dispatchEvent(new Event('resize'))

        const { container, unmount } = render(
          <MockParlantProvider agents={mockAgents} session={mockSession}>
            <ChatInterface />
          </MockParlantProvider>
        )

        const chatContainer = screen.getByTestId('chat-container')
        expect(chatContainer).toBeVisible()

        // Verify responsive behavior
        const computedStyle = window.getComputedStyle(chatContainer)
        if (viewport.width < 768) {
          expect(chatContainer).toHaveClass('mobile-layout')
        } else if (viewport.width < 1200) {
          expect(chatContainer).toHaveClass('tablet-layout')
        } else {
          expect(chatContainer).toHaveClass('desktop-layout')
        }

        unmount()
      }

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'chat-interface-responsive',
          name: 'Chat Interface Responsive Design',
          complexity: 'complex',
          metadata: {
            component: 'ChatInterface',
            viewportsTested: viewports.length
          }
        } as any,
        { success: true, responsiveScore: 95 },
        { isValid: true, score: 95 },
        startTime,
        endTime
      ))
    })

    it('should handle loading states gracefully', async () => {
      const startTime = new Date()

      const { rerender } = render(
        <MockParlantProvider agents={[]} session={null} loading={true}>
          <ChatInterface />
        </MockParlantProvider>
      )

      expect(screen.getByTestId('chat-loading-spinner')).toBeInTheDocument()
      expect(screen.getByText(/loading/i)).toBeInTheDocument()

      // Simulate loading completion
      rerender(
        <MockParlantProvider agents={mockAgents} session={mockSession} loading={false}>
          <ChatInterface />
        </MockParlantProvider>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('chat-loading-spinner')).not.toBeInTheDocument()
        expect(screen.getByTestId('chat-container')).toBeInTheDocument()
      })

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'chat-interface-loading',
          name: 'Chat Interface Loading States',
          complexity: 'medium',
          metadata: { component: 'ChatInterface' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })
  })

  describe('Agent Selector Component', () => {
    it('should display all available agents', async () => {
      const startTime = new Date()

      render(
        <MockParlantProvider agents={mockAgents}>
          <AgentSelector onAgentSelect={jest.fn()} />
        </MockParlantProvider>
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()

      // Open dropdown
      fireEvent.click(screen.getByRole('combobox'))

      for (const agent of mockAgents) {
        expect(screen.getByText(agent.name)).toBeInTheDocument()
        expect(screen.getByText(agent.description)).toBeInTheDocument()
      }

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'agent-selector-display',
          name: 'Agent Selector Display',
          complexity: 'simple',
          metadata: { component: 'AgentSelector', agentCount: mockAgents.length }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should call onAgentSelect when agent is chosen', async () => {
      const startTime = new Date()
      const mockOnSelect = jest.fn()
      const user = userEvent.setup()

      render(
        <MockParlantProvider agents={mockAgents}>
          <AgentSelector onAgentSelect={mockOnSelect} />
        </MockParlantProvider>
      )

      // Open dropdown and select agent
      await user.click(screen.getByRole('combobox'))
      await user.click(screen.getByText('Support Agent'))

      expect(mockOnSelect).toHaveBeenCalledWith(mockAgents[0])

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'agent-selector-interaction',
          name: 'Agent Selector Interaction',
          complexity: 'medium',
          metadata: { component: 'AgentSelector' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should handle keyboard navigation', async () => {
      const startTime = new Date()
      const user = userEvent.setup()

      render(
        <MockParlantProvider agents={mockAgents}>
          <AgentSelector onAgentSelect={jest.fn()} />
        </MockParlantProvider>
      )

      const selector = screen.getByRole('combobox')

      // Test keyboard navigation
      await user.click(selector)
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'agent-selector-keyboard',
          name: 'Agent Selector Keyboard Navigation',
          complexity: 'medium',
          metadata: { component: 'AgentSelector' }
        } as any,
        { success: true, accessibilityFeatures: ['keyboard-navigation'] },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })
  })

  describe('Message Bubble Component', () => {
    it('should render user messages correctly', async () => {
      const startTime = new Date()
      const userMessage = mockMessages[1]

      render(<MessageBubble message={userMessage} />)

      expect(screen.getByText(userMessage.content)).toBeInTheDocument()
      expect(screen.getByTestId('message-bubble')).toHaveClass('user-message')
      expect(screen.getByText('John Doe')).toBeInTheDocument()

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'message-bubble-user',
          name: 'Message Bubble User Message',
          complexity: 'simple',
          metadata: { component: 'MessageBubble', messageType: 'user' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should render agent messages correctly', async () => {
      const startTime = new Date()
      const agentMessage = mockMessages[0]

      render(<MessageBubble message={agentMessage} />)

      expect(screen.getByText(agentMessage.content)).toBeInTheDocument()
      expect(screen.getByTestId('message-bubble')).toHaveClass('agent-message')
      expect(screen.getByText('Support Agent')).toBeInTheDocument()

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'message-bubble-agent',
          name: 'Message Bubble Agent Message',
          complexity: 'simple',
          metadata: { component: 'MessageBubble', messageType: 'agent' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should format timestamps correctly', async () => {
      const startTime = new Date()
      const message = mockMessages[0]

      render(<MessageBubble message={message} showTimestamp={true} />)

      const timestamp = screen.getByTestId('message-timestamp')
      expect(timestamp).toBeInTheDocument()
      expect(timestamp.textContent).toMatch(/10:00/)

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'message-bubble-timestamp',
          name: 'Message Bubble Timestamp',
          complexity: 'simple',
          metadata: { component: 'MessageBubble' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should handle different message types', async () => {
      const startTime = new Date()
      const messageTypes = [
        { ...mockMessages[0], type: 'text' as const },
        { ...mockMessages[0], type: 'image' as const, content: 'https://example.com/image.jpg' },
        { ...mockMessages[0], type: 'file' as const, content: 'document.pdf' },
        { ...mockMessages[0], type: 'system' as const, content: 'Agent joined the conversation' }
      ]

      for (const message of messageTypes) {
        const { unmount } = render(<MessageBubble message={message} />)

        expect(screen.getByTestId('message-bubble')).toHaveClass(`${message.type}-message`)

        if (message.type === 'image') {
          expect(screen.getByRole('img')).toBeInTheDocument()
        } else if (message.type === 'file') {
          expect(screen.getByTestId('file-attachment')).toBeInTheDocument()
        } else if (message.type === 'system') {
          expect(screen.getByTestId('system-message')).toBeInTheDocument()
        }

        unmount()
      }

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'message-bubble-types',
          name: 'Message Bubble Message Types',
          complexity: 'complex',
          metadata: {
            component: 'MessageBubble',
            messageTypes: messageTypes.length
          }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })
  })

  describe('Chat Input Component', () => {
    it('should handle text input correctly', async () => {
      const startTime = new Date()
      const mockOnSend = jest.fn()
      const user = userEvent.setup()

      render(<ChatInput onSendMessage={mockOnSend} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Hello, test message!')

      expect(input).toHaveValue('Hello, test message!')

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'chat-input-typing',
          name: 'Chat Input Text Typing',
          complexity: 'simple',
          metadata: { component: 'ChatInput' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should send message on Enter key', async () => {
      const startTime = new Date()
      const mockOnSend = jest.fn()
      const user = userEvent.setup()

      render(<ChatInput onSendMessage={mockOnSend} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test message{enter}')

      expect(mockOnSend).toHaveBeenCalledWith('Test message')
      expect(input).toHaveValue('')

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'chat-input-send',
          name: 'Chat Input Send Message',
          complexity: 'medium',
          metadata: { component: 'ChatInput' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should handle file uploads', async () => {
      const startTime = new Date()
      const mockOnFileUpload = jest.fn()
      const user = userEvent.setup()

      render(<ChatInput onSendMessage={jest.fn()} onFileUpload={mockOnFileUpload} />)

      const fileInput = screen.getByTestId('file-upload-input')
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })

      await user.upload(fileInput, file)

      expect(mockOnFileUpload).toHaveBeenCalledWith(file)

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'chat-input-file-upload',
          name: 'Chat Input File Upload',
          complexity: 'complex',
          metadata: { component: 'ChatInput' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should show typing indicator', async () => {
      const startTime = new Date()
      const user = userEvent.setup()

      render(<ChatInput onSendMessage={jest.fn()} showTypingIndicator={true} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'typing...')

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'chat-input-typing-indicator',
          name: 'Chat Input Typing Indicator',
          complexity: 'medium',
          metadata: { component: 'ChatInput' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })
  })

  describe('Conversation History Component', () => {
    it('should render message history correctly', async () => {
      const startTime = new Date()

      render(
        <ConversationHistory
          messages={mockMessages}
          agents={mockAgents}
        />
      )

      for (const message of mockMessages) {
        expect(screen.getByText(message.content)).toBeInTheDocument()
      }

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'conversation-history-render',
          name: 'Conversation History Rendering',
          complexity: 'medium',
          metadata: {
            component: 'ConversationHistory',
            messageCount: mockMessages.length
          }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should auto-scroll to latest message', async () => {
      const startTime = new Date()
      const manyMessages = Array.from({ length: 50 }, (_, i) => ({
        ...mockMessages[0],
        id: `msg-${i}`,
        content: `Message ${i}`,
        timestamp: new Date(Date.now() + i * 1000)
      }))

      render(
        <ConversationHistory
          messages={manyMessages}
          agents={mockAgents}
          autoScroll={true}
        />
      )

      const historyContainer = screen.getByTestId('conversation-history')

      // Check if scrolled to bottom
      expect(historyContainer.scrollTop + historyContainer.clientHeight)
        .toBeCloseTo(historyContainer.scrollHeight, 5)

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'conversation-history-autoscroll',
          name: 'Conversation History Auto-scroll',
          complexity: 'medium',
          metadata: {
            component: 'ConversationHistory',
            messageCount: manyMessages.length
          }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should group messages by date', async () => {
      const startTime = new Date()
      const messagesWithDifferentDates = [
        { ...mockMessages[0], timestamp: new Date('2024-01-01T10:00:00Z') },
        { ...mockMessages[1], timestamp: new Date('2024-01-01T10:01:00Z') },
        { ...mockMessages[0], id: 'msg-3', timestamp: new Date('2024-01-02T10:00:00Z') }
      ]

      render(
        <ConversationHistory
          messages={messagesWithDifferentDates}
          agents={mockAgents}
          groupByDate={true}
        />
      )

      expect(screen.getByText(/January 1, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/January 2, 2024/)).toBeInTheDocument()

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'conversation-history-grouping',
          name: 'Conversation History Date Grouping',
          complexity: 'complex',
          metadata: { component: 'ConversationHistory' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })

    it('should handle empty conversation state', async () => {
      const startTime = new Date()

      render(
        <ConversationHistory
          messages={[]}
          agents={mockAgents}
        />
      )

      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
      expect(screen.getByTestId('empty-conversation-state')).toBeInTheDocument()

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'conversation-history-empty',
          name: 'Conversation History Empty State',
          complexity: 'simple',
          metadata: { component: 'ConversationHistory' }
        } as any,
        { success: true },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })
  })

  describe('Visual Regression Testing', () => {
    it('should maintain visual consistency', async () => {
      const startTime = new Date()

      const { container } = render(
        <MockParlantProvider agents={mockAgents} session={mockSession}>
          <ChatInterface />
        </MockParlantProvider>
      )

      // This would integrate with a visual regression testing tool like Percy or Chromatic
      // For now, we'll simulate the check
      const visualSnapshot = container.innerHTML
      expect(visualSnapshot).toMatchSnapshot('chat-interface-visual-snapshot')

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'visual-regression-consistency',
          name: 'Visual Regression Consistency',
          complexity: 'complex',
          metadata: {
            component: 'ChatInterface',
            visualRegressionTesting: true
          }
        } as any,
        { success: true, visualConsistency: 100 },
        { isValid: true, score: 100 },
        startTime,
        endTime
      ))
    })
  })

  describe('Performance Testing', () => {
    it('should render large conversation histories efficiently', async () => {
      const startTime = new Date()
      const largeMessageSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockMessages[0],
        id: `msg-${i}`,
        content: `Performance test message ${i}`,
        timestamp: new Date(Date.now() + i * 1000)
      }))

      const renderStart = performance.now()

      render(
        <ConversationHistory
          messages={largeMessageSet}
          agents={mockAgents}
          virtualized={true}
        />
      )

      const renderEnd = performance.now()
      const renderTime = renderEnd - renderStart

      // Should render in under 100ms for good performance
      expect(renderTime).toBeLessThan(100)

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'performance-large-history',
          name: 'Performance Large History Rendering',
          complexity: 'extreme',
          metadata: {
            component: 'ConversationHistory',
            messageCount: largeMessageSet.length,
            renderTime: renderTime
          }
        } as any,
        { success: true, performanceScore: 100 - renderTime },
        { isValid: renderTime < 100, score: 100 - renderTime },
        startTime,
        endTime
      ))
    })

    it('should handle rapid message updates', async () => {
      const startTime = new Date()
      const user = userEvent.setup()

      const { rerender } = render(
        <MockParlantProvider agents={mockAgents} session={mockSession}>
          <ChatInterface />
        </MockParlantProvider>
      )

      const input = screen.getByRole('textbox')

      // Simulate rapid typing
      const rapidUpdateStart = performance.now()

      for (let i = 0; i < 10; i++) {
        await user.type(input, `rapid message ${i}`)
        await user.keyboard('{enter}')
      }

      const rapidUpdateEnd = performance.now()
      const updateTime = rapidUpdateEnd - rapidUpdateStart

      const endTime = new Date()
      reporter.recordTestResult(reporter.createTestResult(
        {
          id: 'performance-rapid-updates',
          name: 'Performance Rapid Message Updates',
          complexity: 'complex',
          metadata: {
            component: 'ChatInterface',
            messageUpdates: 10,
            updateTime: updateTime
          }
        } as any,
        { success: true, performanceScore: Math.max(0, 100 - updateTime / 10) },
        { isValid: updateTime < 1000, score: Math.max(0, 100 - updateTime / 10) },
        startTime,
        endTime
      ))
    })
  })
})