/**
 * Test Setup and Configuration
 *
 * Global test setup for Jest and testing utilities.
 * Configures mocks, test environment, and shared test helpers.
 */

import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'util'
import { configure } from '@testing-library/react'

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
    has: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  })),
  useParams: jest.fn(() => ({})),
}))

// Mock Zustand stores
jest.mock('zustand', () => ({
  create: jest.fn(() => () => ({})),
}))

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
  })),
  QueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
}))

// Mock drag and drop
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => children,
  Droppable: ({ children }: { children: (provided: any) => React.ReactNode }) =>
    children({
      droppableProps: {},
      innerRef: jest.fn(),
      placeholder: null,
    }),
  Draggable: ({ children }: { children: (provided: any) => React.ReactNode }) =>
    children({
      draggableProps: {},
      dragHandleProps: {},
      innerRef: jest.fn(),
    }),
}))

// Mock ReactFlow
jest.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Controls: () => <div data-testid="react-flow-controls" />,
  Background: () => <div data-testid="react-flow-background" />,
  MiniMap: () => <div data-testid="react-flow-minimap" />,
  useNodesState: jest.fn(() => [[], jest.fn(), jest.fn()]),
  useEdgesState: jest.fn(() => [[], jest.fn(), jest.fn()]),
  addEdge: jest.fn(),
  applyNodeChanges: jest.fn(),
  applyEdgeChanges: jest.fn(),
  MarkerType: {
    ArrowClosed: 'arrowclosed',
  },
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
}))

// Mock Recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Line: () => <div data-testid="chart-line" />,
  Area: () => <div data-testid="chart-area" />,
  Bar: () => <div data-testid="chart-bar" />,
  Pie: () => <div data-testid="chart-pie" />,
  Cell: () => <div data-testid="chart-cell" />,
  XAxis: () => <div data-testid="chart-x-axis" />,
  YAxis: () => <div data-testid="chart-y-axis" />,
  CartesianGrid: () => <div data-testid="chart-grid" />,
  Tooltip: () => <div data-testid="chart-tooltip" />,
  Legend: () => <div data-testid="chart-legend" />,
}))

// Mock Web APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Map(),
  })
) as jest.Mock

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Increase timeout for longer tests
jest.setTimeout(30000)

// Global test cleanup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()

  // Reset localStorage
  localStorageMock.clear()

  // Reset fetch mock
  ;(global.fetch as jest.Mock).mockClear()
})

afterEach(() => {
  // Clean up any timers
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})