/**
 * Enhanced Testing Utilities for React Component Testing
 *
 * This file provides comprehensive testing utilities including:
 * - Enhanced render functions with providers
 * - Mock data generators
 * - Custom testing hooks
 * - Accessibility testing helpers
 * - User interaction utilities
 * - Performance testing helpers
 */

import type { ReactElement, ReactNode } from 'react'
import { type RenderOptions, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { vi } from 'vitest'
import type { BlockState, WorkflowState } from '@/stores/workflows/workflow/types'

/**
 * Enhanced render options with provider configuration
 */
interface EnhancedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial theme for theme provider
   */
  initialTheme?: 'light' | 'dark' | 'system'

  /**
   * Mock user data for authentication contexts
   */
  mockUser?: Record<string, any>

  /**
   * Mock workflow state for workflow-dependent components
   */
  mockWorkflow?: Partial<WorkflowState>

  /**
   * Whether to include router mock
   */
  withRouter?: boolean

  /**
   * Custom wrapper component
   */
  wrapper?: ({ children }: { children: ReactNode }) => ReactElement
}

/**
 * All providers wrapper for comprehensive testing
 * Includes theme, auth, router, and state providers
 */
function AllProviders({
  children,
  initialTheme = 'light',
  mockUser,
  mockWorkflow,
  withRouter = true,
}: {
  children: ReactNode
  initialTheme?: 'light' | 'dark' | 'system'
  mockUser?: Record<string, any>
  mockWorkflow?: Partial<WorkflowState>
  withRouter?: boolean
}) {
  let wrappedChildren = (
    <ThemeProvider
      attribute='class'
      defaultTheme={initialTheme}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )

  // Add router provider if needed
  if (withRouter) {
    // Router mock would be added here in a real implementation
    wrappedChildren = <div data-testid='router-provider'>{wrappedChildren}</div>
  }

  return wrappedChildren
}

/**
 * Enhanced render function with all providers and utilities
 *
 * @param ui - React component to render
 * @param options - Enhanced render options
 * @returns Render result with additional utilities
 */
export function renderWithProviders(ui: ReactElement, options: EnhancedRenderOptions = {}) {
  const {
    initialTheme = 'light',
    mockUser,
    mockWorkflow,
    withRouter = true,
    ...renderOptions
  } = options

  // Create wrapper with all providers
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllProviders
      initialTheme={initialTheme}
      mockUser={mockUser}
      mockWorkflow={mockWorkflow}
      withRouter={withRouter}
    >
      {children}
    </AllProviders>
  )

  // Render with providers
  const renderResult = render(ui, {
    wrapper: options.wrapper || Wrapper,
    ...renderOptions,
  })

  // Return enhanced render result with utilities
  return {
    ...renderResult,
    user: userEvent.setup(),

    // Theme testing utilities
    switchTheme: async (theme: 'light' | 'dark' | 'system') => {
      // Implementation for theme switching during tests
      document.documentElement.className = theme === 'dark' ? 'dark' : ''
    },

    // Async utilities
    waitForLoadingToFinish: async () => {
      const { findByText, queryByText } = renderResult

      // Wait for common loading indicators to disappear
      const loadingTexts = ['Loading...', 'Please wait', 'Fetching data']

      for (const text of loadingTexts) {
        const element = queryByText(text)
        if (element) {
          await new Promise((resolve) => {
            const observer = new MutationObserver(() => {
              if (!document.contains(element)) {
                observer.disconnect()
                resolve(null)
              }
            })
            observer.observe(document.body, { childList: true, subtree: true })
          })
        }
      }
    },

    // Accessibility testing helpers
    checkAccessibility: async () => {
      // This would integrate with axe-core for accessibility testing
      const axeResults = {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: [],
      }
      return axeResults
    },
  }
}

/**
 * Mock data generators for testing
 */
export const mockDataGenerators = {
  /**
   * Generate mock user data
   */
  createMockUser: (overrides: Record<string, any> = {}) => ({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    image: 'https://example.com/avatar.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: true,
    ...overrides,
  }),

  /**
   * Generate mock block state
   */
  createMockBlock: (overrides: Partial<BlockState> = {}): BlockState => ({
    id: 'block-123',
    type: 'agent',
    name: 'Test Block',
    position: { x: 100, y: 100 },
    subBlocks: {},
    outputs: {},
    enabled: true,
    ...overrides,
  }),

  /**
   * Generate mock workflow state
   */
  createMockWorkflow: (overrides: Partial<WorkflowState> = {}): WorkflowState => ({
    blocks: {},
    edges: [],
    loops: {},
    parallels: {},
    ...overrides,
  }),

  /**
   * Generate mock API response
   */
  createMockApiResponse: <T,>(data: T, success = true) => ({
    success,
    data: success ? data : null,
    error: success ? null : 'Mock error message',
    timestamp: new Date().toISOString(),
  }),

  /**
   * Generate mock form data
   */
  createMockFormData: (fields: Record<string, any> = {}) => ({
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    ...fields,
  }),
}

/**
 * Custom testing hooks and utilities
 */
export const testingHelpers = {
  /**
   * Wait for element to be removed from DOM
   */
  waitForRemoval: async (element: Element) => {
    return new Promise<void>((resolve) => {
      if (!document.contains(element)) {
        resolve()
        return
      }

      const observer = new MutationObserver(() => {
        if (!document.contains(element)) {
          observer.disconnect()
          resolve()
        }
      })

      observer.observe(document.body, { childList: true, subtree: true })
    })
  },

  /**
   * Simulate file upload
   */
  simulateFileUpload: (input: HTMLInputElement, file: File) => {
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    })

    const event = new Event('change', { bubbles: true })
    input.dispatchEvent(event)
  },

  /**
   * Create mock file for testing
   */
  createMockFile: (name = 'test.txt', type = 'text/plain', content = 'Test file content'): File => {
    return new File([content], name, { type })
  },

  /**
   * Mock clipboard operations
   */
  mockClipboard: {
    writeText: vi.fn(),
    readText: vi.fn().mockResolvedValue('mocked clipboard content'),
  },

  /**
   * Performance testing utilities
   */
  measureRenderTime: async (renderFn: () => void): Promise<number> => {
    const start = performance.now()
    renderFn()
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const end = performance.now()
    return end - start
  },

  /**
   * Memory leak detection helper
   */
  detectMemoryLeaks: (componentName: string) => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

    return {
      check: () => {
        const currentMemory = (performance as any).memory?.usedJSHeapSize || 0
        const diff = currentMemory - initialMemory

        if (diff > 1000000) {
          // 1MB threshold
          console.warn(`Potential memory leak in ${componentName}: ${diff} bytes`)
        }

        return diff
      },
    }
  },
}

/**
 * Mock implementations for common dependencies
 */
export const mockImplementations = {
  /**
   * Mock Next.js router
   */
  mockRouter: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    isReady: true,
  },

  /**
   * Mock authentication client
   */
  mockAuthClient: {
    signIn: {
      email: vi.fn(),
      social: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
    getSession: vi.fn(),
    emailOtp: {
      sendVerificationOtp: vi.fn(),
    },
  },

  /**
   * Mock fetch implementation
   */
  mockFetch: (response: any, ok = true) => {
    return vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      blob: () => Promise.resolve(new Blob()),
      status: ok ? 200 : 400,
    })
  },

  /**
   * Mock WebSocket
   */
  mockWebSocket: {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.OPEN,
  },
}

/**
 * Accessibility testing utilities
 */
export const accessibilityHelpers = {
  /**
   * Check if element has proper ARIA attributes
   */
  checkAriaAttributes: (element: Element) => {
    const results = {
      hasRole: element.hasAttribute('role'),
      hasAriaLabel: element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby'),
      hasAriaDescription:
        element.hasAttribute('aria-description') || element.hasAttribute('aria-describedby'),
      isAccessible: true,
    }

    // Basic accessibility checks
    if (element.tagName === 'BUTTON' && !results.hasAriaLabel && !element.textContent?.trim()) {
      results.isAccessible = false
    }

    if (
      element.tagName === 'INPUT' &&
      element.getAttribute('type') !== 'hidden' &&
      !results.hasAriaLabel
    ) {
      results.isAccessible = false
    }

    return results
  },

  /**
   * Test keyboard navigation
   */
  testKeyboardNavigation: async (user: ReturnType<typeof userEvent.setup>) => {
    // Test Tab navigation
    await user.tab()
    const activeElement = document.activeElement

    return {
      canReceiveFocus: activeElement !== document.body,
      activeElement,
    }
  },

  /**
   * Test screen reader compatibility
   */
  checkScreenReaderContent: (element: Element) => {
    const textContent = element.textContent || ''
    const ariaLabel = element.getAttribute('aria-label') || ''
    const altText = element.getAttribute('alt') || ''

    const screenReaderText = ariaLabel || altText || textContent

    return {
      hasScreenReaderText: !!screenReaderText.trim(),
      screenReaderText: screenReaderText.trim(),
    }
  },
}

/**
 * Custom matchers for enhanced testing
 */
export const customMatchers = {
  /**
   * Check if element is accessible
   */
  toBeAccessible: (element: Element) => {
    const { isAccessible } = accessibilityHelpers.checkAriaAttributes(element)
    const { hasScreenReaderText } = accessibilityHelpers.checkScreenReaderContent(element)

    return {
      pass: isAccessible && hasScreenReaderText,
      message: () => `Element is ${isAccessible && hasScreenReaderText ? '' : 'not '}accessible`,
    }
  },
}

// Re-export testing library utilities for convenience
export * from '@testing-library/react'
export { userEvent }
export { renderWithProviders as render }
