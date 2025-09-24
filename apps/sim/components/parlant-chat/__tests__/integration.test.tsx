/**
 * Integration tests for Parlant Chat components
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock the parlant-chat-react module
vi.mock('parlant-chat-react', () => ({
  default: ({ agentName }: { agentName?: string }) => (
    <div data-testid='parlant-chatbox'>Mock Parlant Chatbox - {agentName}</div>
  ),
}))

// Mock CSS imports
vi.mock('parlant-chat-react/style.css', () => ({}))

describe('Parlant Chat Integration', () => {
  it('exports are available', async () => {
    // Test that our exports are available
    const { ParlantChatbox, ParlantChatProvider } = await import('../')

    expect(ParlantChatbox).toBeDefined()
    expect(ParlantChatProvider).toBeDefined()
  })

  it('renders ParlantChatbox with basic config', async () => {
    const { ParlantChatbox, ParlantChatProvider } = await import('../')

    const config = {
      agentName: 'Test Agent',
      chatDescription: 'Test Description',
    }

    render(
      <ParlantChatProvider config={config}>
        <ParlantChatbox {...config} />
      </ParlantChatProvider>
    )

    expect(screen.getByTestId('parlant-chatbox')).toBeInTheDocument()
    expect(screen.getByText(/Test Agent/)).toBeInTheDocument()
  })

  it('validates configuration correctly', async () => {
    const { ConfigValidator } = await import('../utils')

    const validConfig = {
      server: 'https://api.test.com',
      agentId: 'test-agent',
      agentName: 'Test Agent',
    }

    const validation = ConfigValidator.validate(validConfig)
    expect(validation.isValid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it('sanitizes configuration for production', async () => {
    const { ConfigValidator } = await import('../utils')

    const config = {
      agentName: 'Test Agent',
      customColors: {
        primary: '#ff0000',
      },
    }

    const sanitized = ConfigValidator.sanitize(config)
    expect(sanitized.agentName).toBe('Test Agent')
    expect(sanitized.server).toBeDefined() // Should have default
    expect(sanitized.agentId).toBeDefined() // Should have default
  })

  it('handles theme detection', () => {
    const { useChatTheme } = require('../hooks')

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    // This test would require a React testing setup to fully validate
    expect(useChatTheme).toBeDefined()
  })
})

describe('Bundle Analysis', () => {
  it('provides bundle analysis in development', async () => {
    const { BundleAnalyzer } = await import('../utils')

    const analysis = await BundleAnalyzer.analyzeComponent('ParlantChatbox')

    expect(analysis).toHaveProperty('estimatedSize')
    expect(analysis).toHaveProperty('dependencies')
    expect(analysis).toHaveProperty('recommendations')
  })
})

describe('Performance Monitoring', () => {
  it('tracks performance metrics', async () => {
    const { ChatPerformanceMonitor } = await import('../utils')

    const monitor = ChatPerformanceMonitor.getInstance()

    monitor.startTimer('test-operation')
    await new Promise((resolve) => setTimeout(resolve, 10))
    const duration = monitor.endTimer('test-operation')

    expect(duration).toBeGreaterThan(0)

    const metrics = monitor.getMetrics()
    expect(metrics).toHaveProperty('test-operation')
  })
})

describe('Debug Utilities', () => {
  it('enables and disables debug mode', async () => {
    const { ChatDebugger } = await import('../utils')

    // Mock console.log
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    ChatDebugger.enable()
    ChatDebugger.log('test message', { data: 'test' })
    ChatDebugger.disable()

    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('provides runtime information', async () => {
    const { ChatDebugger } = await import('../utils')

    const runtimeInfo = ChatDebugger.getRuntimeInfo()

    expect(runtimeInfo).toHaveProperty('environment')
    expect(runtimeInfo).toHaveProperty('timestamp')
  })
})
