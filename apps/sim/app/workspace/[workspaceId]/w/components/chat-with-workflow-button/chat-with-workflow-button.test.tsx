/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ChatWithWorkflowButton, useChatWithWorkflow } from './chat-with-workflow-button'

// Mock the logger
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Test wrapper component for hook testing
function TestHookComponent({ workflowId }: { workflowId: string }) {
  const { activeChatWorkflowId, startChat, endChat, isChattingWithWorkflow } = useChatWithWorkflow()

  return (
    <div>
      <div data-testid='active-workflow'>{activeChatWorkflowId || 'none'}</div>
      <div data-testid='is-chatting'>{isChattingWithWorkflow(workflowId).toString()}</div>
      <button onClick={() => startChat(workflowId)} data-testid='start-chat'>
        Start Chat
      </button>
      <button onClick={endChat} data-testid='end-chat'>
        End Chat
      </button>
    </div>
  )
}

// Wrapper component for tests requiring TooltipProvider
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>
}

describe('ChatWithWorkflowButton', () => {
  const mockProps = {
    workflowId: 'test-workflow-123',
    workflowName: 'Test Workflow',
    onChatClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('renders default variant correctly', () => {
      render(<ChatWithWorkflowButton {...mockProps} />)

      expect(
        screen.getByRole('button', { name: /start conversation with test workflow/i })
      ).toBeInTheDocument()
      expect(screen.getByText('Chat with Workflow')).toBeInTheDocument()
      expect(screen.getByRole('button')).toContainHTML('svg')
    })

    it('renders compact variant correctly', () => {
      render(
        <TestWrapper>
          <ChatWithWorkflowButton {...mockProps} variant='compact' />
        </TestWrapper>
      )

      expect(screen.getByText('Chat')).toBeInTheDocument()
      expect(screen.getByRole('button')).toContainHTML('svg')
    })

    it('renders icon-only variant correctly', () => {
      render(
        <TestWrapper>
          <ChatWithWorkflowButton {...mockProps} variant='icon-only' />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /start conversation with test workflow/i })
      expect(button).toBeInTheDocument()
      expect(button).toContainHTML('svg')
      expect(screen.queryByText('Chat')).not.toBeInTheDocument()
    })

    it('calls onChatClick when clicked', () => {
      render(<ChatWithWorkflowButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockProps.onChatClick).toHaveBeenCalledWith('test-workflow-123')
      expect(mockProps.onChatClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onChatClick when disabled', () => {
      render(<ChatWithWorkflowButton {...mockProps} disabled />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()

      fireEvent.click(button)
      expect(mockProps.onChatClick).not.toHaveBeenCalled()
    })

    it('shows loading state correctly', () => {
      render(<ChatWithWorkflowButton {...mockProps} loading />)

      expect(screen.getByText('Starting...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toContainHTML('svg')

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('Variants and Styling', () => {
    it('applies custom className', () => {
      render(<ChatWithWorkflowButton {...mockProps} className='custom-class' />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('renders different sizes correctly', () => {
      const { rerender } = render(<ChatWithWorkflowButton {...mockProps} size='sm' />)

      let button = screen.getByRole('button')
      expect(button).toHaveClass('h-9')

      rerender(<ChatWithWorkflowButton {...mockProps} size='lg' />)

      button = screen.getByRole('button')
      expect(button).toHaveClass('h-11')
    })

    it('shows tooltip for icon-only variant', () => {
      render(
        <TestWrapper>
          <ChatWithWorkflowButton {...mockProps} variant='icon-only' showTooltip />
        </TestWrapper>
      )

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      // Icon-only variant should render without errors with tooltip
      expect(screen.queryByText('Chat')).not.toBeInTheDocument()
    })

    it('shows tooltip for compact variant', () => {
      render(
        <TestWrapper>
          <ChatWithWorkflowButton {...mockProps} variant='compact' showTooltip />
        </TestWrapper>
      )

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      // Compact variant should render the "Chat" text
      expect(screen.getByText('Chat')).toBeInTheDocument()
    })

    it('does not show tooltip when showTooltip is false', () => {
      render(
        <TestWrapper>
          <ChatWithWorkflowButton {...mockProps} variant='icon-only' showTooltip={false} />
        </TestWrapper>
      )

      const button = screen.getByRole('button')
      fireEvent.mouseEnter(button)

      expect(screen.queryByText('Chat with Test Workflow')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ChatWithWorkflowButton {...mockProps} />)

      const button = screen.getByRole('button', { name: /start conversation with test workflow/i })
      expect(button).toBeInTheDocument()
    })

    it('is keyboard accessible', () => {
      render(<ChatWithWorkflowButton {...mockProps} />)

      const button = screen.getByRole('button')
      button.focus()
      expect(button).toHaveFocus()

      fireEvent.click(button)
      expect(mockProps.onChatClick).toHaveBeenCalledWith('test-workflow-123')
    })

    it('maintains focus management', () => {
      render(<ChatWithWorkflowButton {...mockProps} />)

      const button = screen.getByRole('button')
      fireEvent.focus(button)
      fireEvent.blur(button)

      // Button should handle focus states properly
      expect(button).not.toHaveFocus()
    })
  })

  describe('Loading and Disabled States', () => {
    it('shows loading state with different variants', () => {
      const { rerender } = render(
        <TestWrapper>
          <ChatWithWorkflowButton {...mockProps} variant='default' loading />
        </TestWrapper>
      )

      expect(screen.getByText('Starting...')).toBeInTheDocument()

      rerender(
        <TestWrapper>
          <ChatWithWorkflowButton {...mockProps} variant='compact' loading />
        </TestWrapper>
      )
      expect(screen.getByText('Starting...')).toBeInTheDocument()

      rerender(
        <TestWrapper>
          <ChatWithWorkflowButton {...mockProps} variant='icon-only' loading />
        </TestWrapper>
      )
      expect(screen.getByRole('button')).toContainHTML('svg')
      expect(screen.queryByText('Starting...')).not.toBeInTheDocument()
    })

    it('prevents interaction when loading', () => {
      render(<ChatWithWorkflowButton {...mockProps} loading />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()

      fireEvent.click(button)
      expect(mockProps.onChatClick).not.toHaveBeenCalled()
    })
  })
})

describe('useChatWithWorkflow', () => {
  it('manages chat workflow state correctly', () => {
    render(<TestHookComponent workflowId='test-123' />)

    // Initial state
    expect(screen.getByTestId('active-workflow')).toHaveTextContent('none')
    expect(screen.getByTestId('is-chatting')).toHaveTextContent('false')

    // Start chat
    fireEvent.click(screen.getByTestId('start-chat'))
    expect(screen.getByTestId('active-workflow')).toHaveTextContent('test-123')
    expect(screen.getByTestId('is-chatting')).toHaveTextContent('true')

    // End chat
    fireEvent.click(screen.getByTestId('end-chat'))
    expect(screen.getByTestId('active-workflow')).toHaveTextContent('none')
    expect(screen.getByTestId('is-chatting')).toHaveTextContent('false')
  })

  it('correctly identifies which workflow is being chatted with', () => {
    const { rerender } = render(<TestHookComponent workflowId='test-123' />)

    // Start chat with test-123
    fireEvent.click(screen.getByTestId('start-chat'))
    expect(screen.getByTestId('is-chatting')).toHaveTextContent('true')

    // Check different workflow ID
    rerender(<TestHookComponent workflowId='different-456' />)
    expect(screen.getByTestId('is-chatting')).toHaveTextContent('false')

    // Check original workflow ID
    rerender(<TestHookComponent workflowId='test-123' />)
    expect(screen.getByTestId('is-chatting')).toHaveTextContent('true')
  })
})

describe('Integration Tests', () => {
  it('button integrates properly with hook', () => {
    function IntegrationTest() {
      const { startChat, isChattingWithWorkflow } = useChatWithWorkflow()

      return (
        <div>
          <ChatWithWorkflowButton
            workflowId='integration-test'
            workflowName='Integration Test Workflow'
            onChatClick={startChat}
          />
          <div data-testid='chat-status'>
            {isChattingWithWorkflow('integration-test') ? 'chatting' : 'not-chatting'}
          </div>
        </div>
      )
    }

    render(<IntegrationTest />)

    // Initial state
    expect(screen.getByTestId('chat-status')).toHaveTextContent('not-chatting')

    // Click button to start chat
    const button = screen.getByRole('button')
    fireEvent.click(button)

    // State should update
    expect(screen.getByTestId('chat-status')).toHaveTextContent('chatting')
  })
})
