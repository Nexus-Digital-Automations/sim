/**
 * Agent Management Integration Tests
 *
 * Integration tests for the complete agent management workflow,
 * testing component interactions and data flow.
 */

import type React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AgentsPage from '../../page'

// Mock Next.js components
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  useParams: jest.fn(() => ({ workspaceId: 'test-workspace' })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}))

// Mock API calls
global.fetch = jest.fn()

const mockFetch = (response: any, ok = true) => {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    json: () => Promise.resolve(response),
  })
}

describe('Agent Management Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    jest.clearAllMocks()
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>)
  }

  describe('Complete Agent Creation Workflow', () => {
    it('completes full agent creation process', async () => {
      const user = userEvent.setup()

      // Mock API responses
      mockFetch([]) // Initial agents list
      mockFetch({ id: 'new-agent', name: 'Test Agent' }) // Agent creation

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      // Start agent creation
      await user.click(screen.getByText('New Agent'))

      // Step 1: Basic Information
      await user.type(screen.getByLabelText(/agent name/i), 'Test Support Agent')
      await user.type(screen.getByLabelText(/description/i), 'Customer support agent for testing')
      await user.click(screen.getByText('Next'))

      // Step 2: Model Configuration
      await user.click(screen.getByRole('combobox', { name: /model/i }))
      await user.click(screen.getByText('claude-3-sonnet'))
      await user.click(screen.getByText('Next'))

      // Step 3: Guidelines
      await user.click(screen.getByText('Add Guideline'))
      await user.type(screen.getByLabelText(/condition/i), 'user asks for help')
      await user.type(screen.getByLabelText(/action/i), 'provide helpful response')
      await user.click(screen.getByText('Create Guideline'))
      await user.click(screen.getByText('Next'))

      // Step 4: Tools & Integrations
      await user.click(screen.getByText('Add Tool'))
      await user.click(screen.getByText('Email'))
      await user.click(screen.getByText('Next'))

      // Step 5: Review & Create
      expect(screen.getByText('Test Support Agent')).toBeInTheDocument()
      expect(screen.getByText('claude-3-sonnet')).toBeInTheDocument()
      expect(screen.getByText('user asks for help')).toBeInTheDocument()

      await user.click(screen.getByText('Create Agent'))

      // Should show success and redirect
      await waitFor(() => {
        expect(screen.getByText(/agent created successfully/i)).toBeInTheDocument()
      })
    })

    it('handles validation errors across steps', async () => {
      const user = userEvent.setup()

      mockFetch([])

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await user.click(screen.getByText('New Agent'))

      // Try to proceed without filling required fields
      await user.click(screen.getByText('Next'))

      // Should show validation errors
      expect(screen.getByText(/agent name is required/i)).toBeInTheDocument()

      // Fill minimum requirements and proceed
      await user.type(screen.getByLabelText(/agent name/i), 'Test')
      await user.click(screen.getByText('Next'))

      // Step 2: Skip model selection and try to proceed
      await user.click(screen.getByText('Next'))
      expect(screen.getByText(/please select a model/i)).toBeInTheDocument()
    })

    it('preserves form data when navigating between steps', async () => {
      const user = userEvent.setup()

      mockFetch([])

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await user.click(screen.getByText('New Agent'))

      // Fill basic information
      await user.type(screen.getByLabelText(/agent name/i), 'Persistent Agent')
      await user.type(screen.getByLabelText(/description/i), 'Test persistence')
      await user.click(screen.getByText('Next'))

      // Go to model config, then back
      await user.click(screen.getByText('Back'))

      // Check data persistence
      expect(screen.getByDisplayValue('Persistent Agent')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test persistence')).toBeInTheDocument()
    })
  })

  describe('Agent List and Management', () => {
    const mockAgents = [
      {
        id: 'agent-1',
        name: 'Support Agent',
        description: 'Customer support assistant',
        model: 'claude-3-sonnet',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        guidelines: 5,
        conversations: 142,
      },
      {
        id: 'agent-2',
        name: 'Sales Agent',
        description: 'Sales assistant',
        model: 'gpt-4',
        status: 'inactive',
        createdAt: '2024-01-02T00:00:00Z',
        guidelines: 3,
        conversations: 87,
      },
    ]

    it('displays agent list with proper information', async () => {
      mockFetch(mockAgents)

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await waitFor(() => {
        expect(screen.getByText('Support Agent')).toBeInTheDocument()
        expect(screen.getByText('Sales Agent')).toBeInTheDocument()
        expect(screen.getByText('Customer support assistant')).toBeInTheDocument()
        expect(screen.getByText('claude-3-sonnet')).toBeInTheDocument()
        expect(screen.getByText('142 conversations')).toBeInTheDocument()
      })
    })

    it('allows filtering agents by status', async () => {
      const user = userEvent.setup()
      mockFetch(mockAgents)

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await waitFor(() => {
        expect(screen.getByText('Support Agent')).toBeInTheDocument()
      })

      // Filter by active status
      await user.click(screen.getByText('Filter'))
      await user.click(screen.getByText('Active'))

      // Should only show active agents
      expect(screen.getByText('Support Agent')).toBeInTheDocument()
      expect(screen.queryByText('Sales Agent')).not.toBeInTheDocument()
    })

    it('allows searching agents by name', async () => {
      const user = userEvent.setup()
      mockFetch(mockAgents)

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await waitFor(() => {
        expect(screen.getByText('Support Agent')).toBeInTheDocument()
      })

      // Search for specific agent
      await user.type(screen.getByPlaceholderText(/search agents/i), 'Support')

      // Should filter results
      expect(screen.getByText('Support Agent')).toBeInTheDocument()
      expect(screen.queryByText('Sales Agent')).not.toBeInTheDocument()
    })

    it('handles agent deletion', async () => {
      const user = userEvent.setup()
      mockFetch(mockAgents)
      mockFetch({ success: true }) // Delete response

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await waitFor(() => {
        expect(screen.getByText('Support Agent')).toBeInTheDocument()
      })

      // Find and click delete button
      const supportAgentCard = screen.getByText('Support Agent').closest('.agent-card')
      const deleteButton = within(supportAgentCard!).getByRole('button', { name: /delete/i })
      await user.click(deleteButton)

      // Confirm deletion
      await user.click(screen.getByText('Delete Agent'))

      await waitFor(() => {
        expect(screen.getByText(/agent deleted successfully/i)).toBeInTheDocument()
      })
    })
  })

  describe('Guideline Management Integration', () => {
    it('integrates guideline builder with agent creation', async () => {
      const user = userEvent.setup()
      mockFetch([])

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await user.click(screen.getByText('New Agent'))

      // Navigate to guidelines step
      await user.type(screen.getByLabelText(/agent name/i), 'Test Agent')
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))

      // Add multiple guidelines
      await user.click(screen.getByText('Add Guideline'))
      await user.type(screen.getByLabelText(/condition/i), 'user says hello')
      await user.type(screen.getByLabelText(/action/i), 'greet the user')
      await user.click(screen.getByText('Create Guideline'))

      await user.click(screen.getByText('Add Guideline'))
      await user.type(screen.getByLabelText(/condition/i), 'user needs help')
      await user.type(screen.getByLabelText(/action/i), 'offer assistance')
      await user.click(screen.getByText('Create Guideline'))

      // Verify guidelines appear in review step
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))

      expect(screen.getByText('user says hello')).toBeInTheDocument()
      expect(screen.getByText('user needs help')).toBeInTheDocument()
    })

    it('validates guideline conflicts', async () => {
      const user = userEvent.setup()
      mockFetch([])

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await user.click(screen.getByText('New Agent'))

      // Navigate to guidelines
      await user.type(screen.getByLabelText(/agent name/i), 'Test Agent')
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))

      // Add conflicting guidelines
      await user.click(screen.getByText('Add Guideline'))
      await user.type(screen.getByLabelText(/condition/i), 'user says hello')
      await user.type(screen.getByLabelText(/action/i), 'say hello back')
      await user.click(screen.getByText('Create Guideline'))

      await user.click(screen.getByText('Add Guideline'))
      await user.type(screen.getByLabelText(/condition/i), 'user says hello')
      await user.type(screen.getByLabelText(/action/i), 'ignore the user')
      await user.click(screen.getByText('Create Guideline'))

      // Should show conflict warning
      expect(screen.getByText(/potential conflict detected/i)).toBeInTheDocument()
    })
  })

  describe('Tool Integration', () => {
    it('integrates tool selection with agent creation', async () => {
      const user = userEvent.setup()

      mockFetch([]) // Agents list
      mockFetch([
        // Available tools
        { id: 'email', name: 'Email', category: 'communication' },
        { id: 'calendar', name: 'Calendar', category: 'scheduling' },
      ])

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await user.click(screen.getByText('New Agent'))

      // Navigate to tools step
      await user.type(screen.getByLabelText(/agent name/i), 'Test Agent')
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))

      // Select tools
      await user.click(screen.getByText('Add Tool'))
      await user.click(screen.getByText('Email'))

      await user.click(screen.getByText('Add Tool'))
      await user.click(screen.getByText('Calendar'))

      // Verify tools in review
      await user.click(screen.getByText('Next'))

      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Calendar')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock network error
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load agents/i)).toBeInTheDocument()
      })
    })

    it('handles API errors during agent creation', async () => {
      const user = userEvent.setup()

      mockFetch([]) // Initial load
      mockFetch({ error: 'Agent creation failed' }, false) // Creation error

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await user.click(screen.getByText('New Agent'))

      // Fill minimum requirements
      await user.type(screen.getByLabelText(/agent name/i), 'Test Agent')
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Create Agent'))

      await waitFor(() => {
        expect(screen.getByText(/agent creation failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('loads agent list efficiently', async () => {
      const startTime = performance.now()

      mockFetch(
        Array.from({ length: 100 }, (_, i) => ({
          id: `agent-${i}`,
          name: `Agent ${i}`,
          description: `Description ${i}`,
          model: 'claude-3-sonnet',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          guidelines: Math.floor(Math.random() * 10),
          conversations: Math.floor(Math.random() * 1000),
        }))
      )

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await waitFor(() => {
        expect(screen.getByText('Agent 0')).toBeInTheDocument()
      })

      const endTime = performance.now()

      // Should load within reasonable time
      expect(endTime - startTime).toBeLessThan(5000)
    })

    it('handles large guideline lists efficiently', async () => {
      const user = userEvent.setup()
      mockFetch([])

      renderWithProviders(<AgentsPage params={{ workspaceId: 'test-workspace' }} />)

      await user.click(screen.getByText('New Agent'))

      // Navigate to guidelines
      await user.type(screen.getByLabelText(/agent name/i), 'Test Agent')
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))

      // Add many guidelines quickly
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByText('Add Guideline'))
        await user.type(screen.getByLabelText(/condition/i), `condition ${i}`)
        await user.type(screen.getByLabelText(/action/i), `action ${i}`)
        await user.click(screen.getByText('Create Guideline'))
      }

      // Should handle all guidelines without performance issues
      expect(screen.getByText('condition 0')).toBeInTheDocument()
      expect(screen.getByText('condition 9')).toBeInTheDocument()
    })
  })
})
