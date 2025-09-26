/**
 * Test Utilities and Helpers
 *
 * Shared utilities for testing React components and agent management functionality.
 * Provides custom render methods, mock factories, and test helpers.
 */

import React from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, type RenderResult, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock Zustand store
interface MockStoreState {
  agents: any[]
  currentAgent: any
  isLoading: boolean
  error: string | null
  setAgents: jest.Mock
  addAgent: jest.Mock
  updateAgent: jest.Mock
  deleteAgent: jest.Mock
  setCurrentAgent: jest.Mock
  setLoading: jest.Mock
  setError: jest.Mock
}

export const createMockStore = (initialState?: Partial<MockStoreState>): MockStoreState => ({
  agents: [],
  currentAgent: null,
  isLoading: false,
  error: null,
  setAgents: jest.fn(),
  addAgent: jest.fn(),
  updateAgent: jest.fn(),
  deleteAgent: jest.fn(),
  setCurrentAgent: jest.fn(),
  setLoading: jest.fn(),
  setError: jest.fn(),
  ...initialState,
})

// Test wrapper components
interface TestProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

export function TestProviders({ children, queryClient }: TestProvidersProps) {
  const client =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    })

  return (
    <QueryClientProvider client={client}>
      <DragDropContext onDragEnd={() => {}}>{children}</DragDropContext>
    </QueryClientProvider>
  )
}

// Custom render function with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders queryClient={queryClient}>{children}</TestProviders>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

// Agent mock factories
export const createMockAgent = (overrides?: Partial<any>) => ({
  id: 'test-agent-id',
  name: 'Test Agent',
  description: 'A test agent for unit testing',
  model: 'claude-3-sonnet',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  guidelines: [],
  tools: [],
  settings: {
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'You are a helpful assistant.',
  },
  analytics: {
    totalConversations: 0,
    successRate: 0,
    avgResponseTime: 0,
    satisfactionScore: 0,
  },
  ...overrides,
})

export const createMockGuideline = (overrides?: Partial<any>) => ({
  id: 'test-guideline-id',
  condition: 'user says hello',
  action: 'respond with greeting',
  priority: 5,
  isActive: true,
  category: 'conversation',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockTool = (overrides?: Partial<any>) => ({
  id: 'test-tool-id',
  name: 'Test Tool',
  description: 'A test tool',
  category: 'general',
  version: '1.0.0',
  parameters: {},
  ...overrides,
})

export const createMockConversation = (overrides?: Partial<any>) => ({
  id: 'test-conversation-id',
  agentId: 'test-agent-id',
  userId: 'test-user-id',
  messages: [],
  status: 'completed',
  startedAt: '2024-01-01T00:00:00Z',
  endedAt: '2024-01-01T01:00:00Z',
  duration: 3600000,
  satisfaction: 4.5,
  resolved: true,
  ...overrides,
})

// API mock helpers
export const createMockApiResponse = (
  data: any,
  options?: {
    ok?: boolean
    status?: number
    headers?: Record<string, string>
  }
) => ({
  ok: options?.ok ?? true,
  status: options?.status ?? 200,
  headers: new Headers(options?.headers ?? {}),
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
})

export const mockApiCall = (
  url: string | RegExp,
  response: any,
  options?: {
    method?: string
    ok?: boolean
    status?: number
    headers?: Record<string, string>
  }
) => {
  const mockResponse = createMockApiResponse(response, options)

  ;(global.fetch as jest.Mock).mockImplementation((requestUrl: string, requestOptions?: any) => {
    const urlMatches = typeof url === 'string' ? requestUrl.includes(url) : url.test(requestUrl)

    const methodMatches = !options?.method || (requestOptions?.method || 'GET') === options.method

    if (urlMatches && methodMatches) {
      return Promise.resolve(mockResponse)
    }

    // Return default mock for unmatched requests
    return Promise.resolve(createMockApiResponse({}))
  })
}

// Form testing helpers
export const fillFormField = async (labelText: string | RegExp, value: string) => {
  const user = userEvent.setup()
  const field = document.querySelector(
    `[aria-label*="${labelText}"], [data-testid*="${labelText}"]`
  ) as HTMLInputElement

  if (!field) {
    throw new Error(`Could not find form field with label: ${labelText}`)
  }

  await user.clear(field)
  await user.type(field, value)
}

export const selectOption = async (selectLabel: string | RegExp, optionText: string) => {
  const user = userEvent.setup()
  const select = document.querySelector(
    `[aria-label*="${selectLabel}"], [data-testid*="${selectLabel}"]`
  ) as HTMLSelectElement

  if (!select) {
    throw new Error(`Could not find select with label: ${selectLabel}`)
  }

  await user.click(select)
  await user.click(
    document.querySelector(`[role="option"]:has-text("${optionText}")`) as HTMLElement
  )
}

// Navigation helpers
export const navigateFormSteps = async (steps: Array<() => Promise<void>>) => {
  const user = userEvent.setup()

  for (let i = 0; i < steps.length; i++) {
    await steps[i]()

    // Click Next button if not on last step
    if (i < steps.length - 1) {
      const nextButton = document.querySelector(
        '[data-testid="next-step"], button:has-text("Next")'
      ) as HTMLButtonElement
      if (nextButton) {
        await user.click(nextButton)
      }
    }
  }
}

// Drag and drop helpers
export const simulateDragAndDrop = async (dragElement: HTMLElement, dropElement: HTMLElement) => {
  const user = userEvent.setup()

  // Simulate drag start
  await user.pointer([{ keys: '[MouseLeft>]', target: dragElement }, { coords: { x: 0, y: 0 } }])

  // Simulate drag over
  await user.pointer({ coords: { x: 100, y: 100 } })

  // Simulate drop
  await user.pointer([{ target: dropElement }, { keys: '[/MouseLeft]' }])
}

// Accessibility testing helpers
export const testKeyboardNavigation = async (elements: HTMLElement[]) => {
  const user = userEvent.setup()

  for (let i = 0; i < elements.length; i++) {
    await user.tab()
    expect(elements[i]).toHaveFocus()
  }
}

export const testAriaLabels = (container: HTMLElement, expectedLabels: string[]) => {
  expectedLabels.forEach((label) => {
    expect(container.querySelector(`[aria-label="${label}"]`)).toBeInTheDocument()
  })
}

// Wait helpers
export const waitForApiCall = async (url: string | RegExp, options?: { timeout?: number }) => {
  return new Promise((resolve, reject) => {
    const timeout = options?.timeout ?? 5000
    const startTime = Date.now()

    const checkFetch = () => {
      const mockFetch = global.fetch as jest.Mock
      const calls = mockFetch.mock.calls

      const matchingCall = calls.find(([callUrl]: [string]) => {
        return typeof url === 'string' ? callUrl.includes(url) : url.test(callUrl)
      })

      if (matchingCall) {
        resolve(matchingCall)
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`API call to ${url} not found within ${timeout}ms`))
      } else {
        setTimeout(checkFetch, 100)
      }
    }

    checkFetch()
  })
}

// Performance testing helpers
export const measureRenderTime = async (renderFunction: () => RenderResult) => {
  const startTime = performance.now()
  const result = renderFunction()
  const endTime = performance.now()

  return {
    result,
    renderTime: endTime - startTime,
  }
}

// Snapshot testing helpers
export const createComponentSnapshot = (component: React.ReactElement, props?: any) => {
  const { container } = renderWithProviders(React.cloneElement(component, props))

  return container.firstChild
}

// Custom matchers
expect.extend({
  toHaveValidationError(received: HTMLElement, message: string) {
    const errorElement = received.querySelector('[role="alert"], .error-message')
    const hasError = errorElement?.textContent?.includes(message)

    return {
      message: () =>
        hasError
          ? `Expected element not to have validation error "${message}"`
          : `Expected element to have validation error "${message}"`,
      pass: !!hasError,
    }
  },

  toBeAccessible(received: HTMLElement) {
    // Basic accessibility checks
    const hasAriaLabel =
      received.hasAttribute('aria-label') || received.hasAttribute('aria-labelledby')
    const hasRole = received.hasAttribute('role')
    const isInteractive = ['button', 'input', 'select', 'textarea', 'a'].includes(
      received.tagName.toLowerCase()
    )

    const isAccessible = !isInteractive || hasAriaLabel || hasRole

    return {
      message: () =>
        isAccessible
          ? 'Expected element not to be accessible'
          : 'Expected element to be accessible (missing aria-label or role)',
      pass: isAccessible,
    }
  },
})

// Export all utilities
export * from '@testing-library/react'
export { userEvent }
export { renderWithProviders as render }
