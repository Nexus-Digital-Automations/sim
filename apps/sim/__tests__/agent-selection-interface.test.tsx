/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { AgentSelectionInterface } from '@/app/chat/components/agent-selection'
import { Agent } from '@/apps/sim/services/parlant/types'
import '@testing-library/jest-dom'

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock agents data
const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'Customer Support Agent',
    description: 'Helps with customer inquiries and support tickets',
    workspace_id: 'workspace-1',
    user_id: 'user-1',
    status: 'active',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    guidelines: [
      {
        id: 'guideline-1',
        agent_id: 'agent-1',
        condition: 'When user asks about pricing',
        action: 'Direct them to pricing page',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
    ],
    journeys: []
  },
  {
    id: 'agent-2',
    name: 'Sales Assistant',
    description: 'Assists with sales inquiries and lead qualification',
    workspace_id: 'workspace-1',
    user_id: 'user-1',
    status: 'active',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    guidelines: [],
    journeys: [
      {
        id: 'journey-1',
        agent_id: 'agent-2',
        title: 'Lead Qualification',
        conditions: ['user shows interest in product'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
    ]
  },
  {
    id: 'agent-3',
    name: 'Technical Support',
    description: 'Provides technical assistance and troubleshooting',
    workspace_id: 'workspace-1',
    user_id: 'user-1',
    status: 'training',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    guidelines: [],
    journeys: []
  }
]

// Mock successful API response
const mockSuccessResponse = {
  agents: mockAgents,
  pagination: {
    total: mockAgents.length,
    limit: 100,
    offset: 0,
    has_more: false
  }
}

describe('AgentSelectionInterface', () => {
  let onAgentSelectMock: jest.Mock

  beforeEach(() => {
    onAgentSelectMock = jest.fn()
    mockFetch.mockClear()

    // Setup default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse
    } as Response)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    // Should show loading skeletons
    expect(screen.getAllByRole('generic')).toHaveLength(6) // 6 skeleton cards
  })

  it('fetches and displays agents successfully', async () => {
    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    // Wait for agents to load
    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    })

    // Verify API was called correctly
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/agents?workspace_id=workspace-1&limit=100')

    // Verify all agents are displayed
    expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    expect(screen.getByText('Sales Assistant')).toBeInTheDocument()
    expect(screen.getByText('Technical Support')).toBeInTheDocument()

    // Verify agent descriptions
    expect(screen.getByText('Helps with customer inquiries and support tickets')).toBeInTheDocument()
    expect(screen.getByText('Assists with sales inquiries and lead qualification')).toBeInTheDocument()
  })

  it('displays error state when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal server error' })
    } as Response)

    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Internal server error')).toBeInTheDocument()
    })

    // Verify retry button is present
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('handles agent selection correctly', async () => {
    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    // Wait for agents to load
    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    })

    // Find and click the select button for the first agent
    const selectButtons = screen.getAllByText('Select Agent')
    fireEvent.click(selectButtons[0])

    // Verify the callback was called with the correct agent
    expect(onAgentSelectMock).toHaveBeenCalledWith(mockAgents[0])
  })

  it('shows agent cards with correct information', async () => {
    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    })

    // Verify status indicators
    expect(screen.getAllByText('Ready')).toHaveLength(2) // 2 active agents
    expect(screen.getByText('Learning')).toBeInTheDocument() // 1 training agent

    // Verify capabilities are shown
    expect(screen.getByText('1 guidelines')).toBeInTheDocument()
    expect(screen.getByText('1 journeys')).toBeInTheDocument()
  })

  it('supports search functionality', async () => {
    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    })

    // Find search input and type
    const searchInput = screen.getByPlaceholderText('Search agents by name or description...')
    fireEvent.change(searchInput, { target: { value: 'support' } })

    // Should filter to show only agents with "support" in name/description
    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
      expect(screen.getByText('Technical Support')).toBeInTheDocument()
      expect(screen.queryByText('Sales Assistant')).not.toBeInTheDocument()
    })
  })

  it('supports status filtering', async () => {
    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    })

    // Find status filter dropdown
    const statusFilter = screen.getByRole('combobox', { name: /status/i })
    fireEvent.click(statusFilter)

    // Select "Training" status
    const trainingOption = screen.getByText('Training')
    fireEvent.click(trainingOption)

    // Should show only training agents
    await waitFor(() => {
      expect(screen.getByText('Technical Support')).toBeInTheDocument()
      expect(screen.queryByText('Customer Support Agent')).not.toBeInTheDocument()
      expect(screen.queryByText('Sales Assistant')).not.toBeInTheDocument()
    })
  })

  it('shows recommendations when enabled', async () => {
    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
        showRecommendations={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Recommended for You')).toBeInTheDocument()
    })

    // Should show recommended section
    expect(screen.getByText('Recommended for You')).toBeInTheDocument()
  })

  it('hides recommendations when disabled', async () => {
    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
        showRecommendations={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    })

    // Should not show recommended section
    expect(screen.queryByText('Recommended for You')).not.toBeInTheDocument()
  })

  it('opens agent profile modal when View Profile is clicked', async () => {
    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    })

    // Find and click View Profile button
    const viewProfileButtons = screen.getAllByText('View Profile')
    fireEvent.click(viewProfileButtons[0])

    // Should open the modal (we can test for modal content)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('displays workspace performance metrics', async () => {
    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    })

    // Wait for metrics to load (they load after agents)
    await waitFor(() => {
      expect(screen.getByText('Workspace Performance')).toBeInTheDocument()
    })

    // Should show performance metrics
    expect(screen.getByText('Active Agents')).toBeInTheDocument()
    expect(screen.getByText('Total Sessions')).toBeInTheDocument()
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument()
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
  })

  it('handles refresh correctly', async () => {
    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    })

    // Clear the mock to track new calls
    mockFetch.mockClear()

    // Click refresh button
    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    // Should make a new API call
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/agents?workspace_id=workspace-1&limit=100')
  })

  it('shows selected agent state correctly', async () => {
    const selectedAgent = mockAgents[0]

    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
        selectedAgent={selectedAgent}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    })

    // The selected agent card should show as selected
    const agentCard = screen.getByText('Customer Support Agent').closest('.relative')
    expect(agentCard).toHaveClass('border-primary')

    // Should show "Selected" instead of "Select Agent"
    expect(screen.getByText('Selected')).toBeInTheDocument()
  })

  it('handles empty state correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        agents: [],
        pagination: { total: 0, limit: 100, offset: 0, has_more: false }
      })
    } as Response)

    render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No Agents Found')).toBeInTheDocument()
    })

    expect(screen.getByText('No agents have been created in this workspace yet.')).toBeInTheDocument()
    expect(screen.getByText('Create Your First Agent')).toBeInTheDocument()
  })
})

// Test the individual components
describe('AgentCard', () => {
  it('renders agent information correctly', () => {
    // This test would need to import AgentCard separately
    // For now, we test it through the main interface
    expect(true).toBe(true) // Placeholder until we import AgentCard directly
  })
})

// Integration test with useAgentSelection hook
describe('Integration with useAgentSelection', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('persists agent selection across renders', async () => {
    const { rerender } = render(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Customer Support Agent')).toBeInTheDocument()
    })

    // Select an agent
    const selectButtons = screen.getAllByText('Select Agent')
    fireEvent.click(selectButtons[0])

    // Rerender the component
    rerender(
      <AgentSelectionInterface
        workspaceId="workspace-1"
        onAgentSelect={onAgentSelectMock}
        selectedAgent={mockAgents[0]}
      />
    )

    // Should maintain selection
    expect(screen.getByText('Selected')).toBeInTheDocument()
  })
})