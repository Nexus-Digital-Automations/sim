/**
 * Hybrid Workflow Testing Framework Setup
 *
 * Global test setup for all hybrid workflow tests including mocks,
 * environment configuration, and shared utilities.
 */

import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'

// Performance monitoring globals
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }
}

// Mock performance.memory for performance tests
Object.defineProperty(performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 10000000, // 10MB baseline
    totalJSHeapSize: 50000000, // 50MB total
    jsHeapSizeLimit: 2147483648, // 2GB limit
  },
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn().mockImplementation((cb: FrameRequestCallback) => {
  setTimeout(cb, 16) // 60fps simulation
  return 1
})

global.cancelAnimationFrame = vi.fn()

// Mock WebSocket for real-time testing
const mockWebSocket = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  readyState: 1,
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
}

global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket)

// Mock fetch for API calls
global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: () =>
      Promise.resolve({
        success: true,
        data: { url, method: options?.method || 'GET' },
      }),
    text: () => Promise.resolve('{"success": true}'),
    blob: () => Promise.resolve(new Blob()),
  } as Response)
})

// Mock localStorage and sessionStorage
const createMockStorage = () => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    length: 0,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
}

Object.defineProperty(window, 'localStorage', { value: createMockStorage() })
Object.defineProperty(window, 'sessionStorage', { value: createMockStorage() })

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => `test-uuid-${Math.random().toString(36).substr(2, 9)}`),
  },
})

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    route: '/workspace/test-workspace/w/test-workflow',
    pathname: '/workspace/[workspaceId]/w/[workflowId]',
    query: { workspaceId: 'test-workspace', workflowId: 'test-workflow' },
    asPath: '/workspace/test-workspace/w/test-workflow',
    push: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    beforePopState: vi.fn(),
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/workspace/test-workspace/w/test-workflow',
}))

// Mock React hooks
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useState: vi.fn((initial) => [initial, vi.fn()]),
    useEffect: vi.fn((fn) => fn()),
    useCallback: vi.fn((fn) => fn),
    useMemo: vi.fn((fn) => fn()),
    useRef: vi.fn(() => ({ current: null })),
    useContext: vi.fn(() => ({})),
  }
})

// Global test configuration
const testConfig = {
  performance: {
    maxModeSwitchTime: 200, // milliseconds
    maxExecutionTime: 500,
    maxSynchronizationTime: 100,
    maxMemoryUsagePerOperation: 5000000, // 5MB
  },
  accessibility: {
    enableAxeChecks: true,
    checkContrastRatio: true,
    validateAriaLabels: true,
    testKeyboardNavigation: true,
  },
  responsiveness: {
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1200,
    },
    testViewports: ['mobile', 'tablet', 'desktop'],
  },
  realTime: {
    socketConnectionTimeout: 5000,
    messageDeliveryTimeout: 1000,
    maxStreamingEvents: 1000,
  },
}

// Make test config globally available
;(global as any).testConfig = testConfig

// Console mocking for cleaner test output
const originalConsole = { ...console }

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  if (process.env.LOG_LEVEL === 'silent') {
    console.log = vi.fn()
    console.info = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
    console.debug = vi.fn()
  }
})

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole)
})

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks()

  // Reset performance memory simulation
  if (performance.memory) {
    performance.memory.usedJSHeapSize = 10000000 + Math.random() * 1000000
  }

  // Reset WebSocket mock state
  mockWebSocket.readyState = 1
  mockWebSocket.send.mockClear()
  mockWebSocket.close.mockClear()
  mockWebSocket.addEventListener.mockClear()
})

afterEach(() => {
  // Cleanup any test-specific state
  vi.restoreAllMocks()

  // Clear storage mocks
  window.localStorage.clear()
  window.sessionStorage.clear()
})

// Test utilities
export const testUtils = {
  // Create mock workflow state with specified complexity
  createMockWorkflow: (blockCount = 3, edgeCount?: number) => {
    const blocks: Record<string, any> = {}
    const edges: any[] = []

    for (let i = 0; i < blockCount; i++) {
      const blockId = `test-block-${i}`
      blocks[blockId] = {
        id: blockId,
        type: i === 0 ? 'starter' : i % 2 === 0 ? 'condition' : 'webhook',
        name: `Test Block ${i}`,
        position: { x: i * 200, y: 100 },
        enabled: true,
        config: { testData: `config-${i}` },
      }
    }

    const targetEdgeCount = edgeCount || Math.max(0, blockCount - 1)
    for (let i = 0; i < targetEdgeCount && i < blockCount - 1; i++) {
      edges.push({
        id: `test-edge-${i}`,
        source: `test-block-${i}`,
        target: `test-block-${i + 1}`,
        sourceHandle: 'output',
        targetHandle: 'input',
        type: 'default',
      })
    }

    return {
      id: `test-workflow-${Date.now()}`,
      name: `Test Workflow`,
      blocks,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 },
      isExecuting: false,
    }
  },

  // Wait for async operations with timeout
  waitFor: async (condition: () => boolean, timeout = 5000) => {
    const start = Date.now()
    while (!condition() && Date.now() - start < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`)
    }
  },

  // Performance measurement helpers
  measurePerformance: async <T>(
    operation: () => Promise<T>
  ): Promise<{
    result: T
    duration: number
    memoryUsed: number
  }> => {
    const startTime = performance.now()
    const startMemory = performance.memory?.usedJSHeapSize || 0

    const result = await operation()

    const endTime = performance.now()
    const endMemory = performance.memory?.usedJSHeapSize || 0

    return {
      result,
      duration: endTime - startTime,
      memoryUsed: endMemory - startMemory,
    }
  },

  // Create mock user event for accessibility testing
  createMockKeyEvent: (key: string, modifiers?: string[]) => ({
    key,
    code: `Key${key.toUpperCase()}`,
    ctrlKey: modifiers?.includes('ctrl') || false,
    altKey: modifiers?.includes('alt') || false,
    shiftKey: modifiers?.includes('shift') || false,
    metaKey: modifiers?.includes('meta') || false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }),

  // Mock responsive viewport
  setMockViewport: (width: number, height = 800) => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: width })
    Object.defineProperty(window, 'innerHeight', { writable: true, value: height })

    // Update matchMedia mock
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes(`max-width: ${width}px`)
        ? width <= Number.parseInt(query.match(/\d+/)?.[0] || '0', 10)
        : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    // Trigger resize event
    window.dispatchEvent(new Event('resize'))
  },
}

// Make test utilities globally available
;(global as any).testUtils = testUtils

// Export for direct import if needed
export default testUtils
