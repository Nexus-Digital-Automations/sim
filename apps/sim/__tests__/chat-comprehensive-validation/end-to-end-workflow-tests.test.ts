/**
 * End-to-End Chat Workflow Testing Suite
 * =====================================
 *
 * Comprehensive end-to-end tests covering complete chat workflows from
 * user interaction to final response delivery, including:
 * - Complete user journeys from authentication to conversation completion
 * - Multi-step conversations with context retention
 * - Agent handoffs and escalation flows
 * - Tool usage and workflow execution
 * - Error recovery and fallback scenarios
 * - Performance under realistic user loads
 */

import { createServer } from 'http'
import { db } from '@sim/db'
import { type Browser, type BrowserContext, launch, type Page } from 'puppeteer'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { EndToEndTestResult, PerformanceMetrics } from '@/types'
import { ComprehensiveTestReporter } from '../../utils/test-reporter'

interface TestEnvironment {
  browser: Browser
  contexts: BrowserContext[]
  pages: Page[]
  server: any
  baseUrl: string
  testWorkspaceId: string
  testUserId: string
  testAgents: any[]
  testChats: any[]
}

interface UserScenario {
  name: string
  description: string
  steps: UserStep[]
  expectedOutcome: string
  timeout: number
}

interface UserStep {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'verify' | 'screenshot'
  target?: string
  value?: string
  timeout?: number
  description: string
}

describe('End-to-End Chat Workflow Testing Suite', () => {
  let testEnv: TestEnvironment
  let reporter: ComprehensiveTestReporter
  const testResults: EndToEndTestResult[] = []

  beforeAll(async () => {
    reporter = new ComprehensiveTestReporter({
      outputDir: './test-reports/end-to-end',
      includeScreenshots: true,
      includePerformanceMetrics: true,
      reportFormats: ['html', 'json', 'junit'],
    })

    await reporter.startTestSuite(
      'end-to-end-workflows',
      'End-to-End Chat Workflow Testing',
      'Comprehensive validation of complete user journeys through chat interface'
    )

    testEnv = await setupE2EEnvironment()
    console.log('🚀 End-to-end test environment ready')
  })

  afterAll(async () => {
    await cleanupE2EEnvironment(testEnv)
    await reporter.finishTestSuite()

    // Generate comprehensive E2E report
    await generateE2EReport(testResults)

    console.log('✅ End-to-end tests completed')
  })

  beforeEach(async () => {
    // Create fresh browser context for each test
    const context = await testEnv.browser.createIncognitoContext()
    const page = await context.newPage()

    // Setup page monitoring
    await setupPageMonitoring(page)

    testEnv.contexts.push(context)
    testEnv.pages.push(page)
  })

  afterEach(async () => {
    // Cleanup browser contexts
    for (const context of testEnv.contexts) {
      await context.close()
    }
    testEnv.contexts = []
    testEnv.pages = []
  })

  async function setupE2EEnvironment(): Promise<TestEnvironment> {
    // Launch browser with appropriate settings
    const browser = await launch({
      headless: process.env.CI === 'true',
      slowMo: 50, // Realistic user interaction speed
      defaultViewport: { width: 1366, height: 768 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    })

    // Setup test server
    const server = createServer()
    const baseUrl = 'http://localhost:3000'

    // Create test data
    const testWorkspaceId = `e2e-workspace-${Date.now()}`
    const testUserId = `e2e-user-${Date.now()}`

    await setupTestData(testWorkspaceId, testUserId)

    return {
      browser,
      contexts: [],
      pages: [],
      server,
      baseUrl,
      testWorkspaceId,
      testUserId,
      testAgents: [],
      testChats: [],
    }
  }

  async function setupTestData(workspaceId: string, userId: string): Promise<void> {
    // Create test workspace
    await db.insert('workspaces').values({
      id: workspaceId,
      name: 'E2E Test Workspace',
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create test user
    await db.insert('users').values({
      id: userId,
      email: `e2e-test-${Date.now()}@example.com`,
      name: 'E2E Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create test agents
    const agents = [
      {
        id: `agent-support-${Date.now()}`,
        name: 'Customer Support Agent',
        description: 'Handles customer support inquiries',
        workspaceId,
        capabilities: ['customer_support', 'escalation'],
      },
      {
        id: `agent-sales-${Date.now()}`,
        name: 'Sales Agent',
        description: 'Handles sales inquiries and product information',
        workspaceId,
        capabilities: ['sales', 'product_info'],
      },
      {
        id: `agent-technical-${Date.now()}`,
        name: 'Technical Support Agent',
        description: 'Handles technical support and troubleshooting',
        workspaceId,
        capabilities: ['technical_support', 'diagnostics'],
      },
    ]

    for (const agent of agents) {
      await db.insert('parlant_agents').values({
        ...agent,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Create test chat interfaces
    const chats = [
      {
        id: `chat-support-${Date.now()}`,
        subdomain: 'support-test',
        title: 'Customer Support Chat',
        description: 'Get help with your account and orders',
        workflowId: `workflow-support-${Date.now()}`,
        userId,
        isActive: true,
        authType: 'public',
        customizations: {
          welcomeMessage: 'Hello! How can we help you today?',
          primaryColor: '#007bff',
        },
      },
      {
        id: `chat-sales-${Date.now()}`,
        subdomain: 'sales-test',
        title: 'Sales Inquiry Chat',
        description: 'Learn about our products and services',
        workflowId: `workflow-sales-${Date.now()}`,
        userId,
        isActive: true,
        authType: 'password',
        password: 'sales123',
        customizations: {
          welcomeMessage: 'Welcome to our sales team! What can we help you with?',
          primaryColor: '#28a745',
        },
      },
    ]

    for (const chat of chats) {
      await db.insert('chat').values({
        ...chat,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }

  async function setupPageMonitoring(page: Page): Promise<void> {
    // Monitor console logs
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.warn(`Browser console error: ${msg.text()}`)
      }
    })

    // Monitor page errors
    page.on('pageerror', (error) => {
      console.error(`Page error: ${error.message}`)
    })

    // Monitor network failures
    page.on('requestfailed', (request) => {
      console.warn(`Network request failed: ${request.url()}`)
    })

    // Setup performance monitoring
    await page.evaluateOnNewDocument(() => {
      window.E2E_PERFORMANCE = {
        navigationStart: performance.now(),
        metrics: [],
        addMetric: (name: string, value: number) => {
          window.E2E_PERFORMANCE.metrics.push({ name, value, timestamp: performance.now() })
        },
      }
    })
  }

  async function cleanupE2EEnvironment(env: TestEnvironment): Promise<void> {
    await env.browser.close()

    // Cleanup test data
    await db.delete('chat').where(like('subdomain', '%test%'))
    await db.delete('parlant_agents').where(like('name', '%Test%'))
    await db.delete('workspaces').where(like('name', '%Test%'))
    await db.delete('users').where(like('email', '%e2e-test%'))
  }

  async function generateE2EReport(results: EndToEndTestResult[]): Promise<void> {
    const report = {
      testSuite: 'End-to-End Chat Workflows',
      timestamp: new Date().toISOString(),
      environment: {
        browser: 'Chromium',
        viewport: '1366x768',
        baseUrl: testEnv.baseUrl,
      },
      summary: {
        totalTests: results.length,
        passed: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        averageExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0) / results.length,
      },
      results: results,
    }

    console.log('📊 End-to-End Test Report:', JSON.stringify(report, null, 2))
  }

  async function executeUserScenario(
    page: Page,
    scenario: UserScenario
  ): Promise<EndToEndTestResult> {
    const startTime = Date.now()
    let success = true
    let error: string | null = null
    const screenshots: string[] = []
    const performanceMetrics: PerformanceMetrics[] = []

    try {
      for (const step of scenario.steps) {
        await executeUserStep(page, step, screenshots, performanceMetrics)
      }
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'

      // Capture error screenshot
      const errorScreenshot = await page.screenshot({ fullPage: true })
      screenshots.push(`data:image/png;base64,${errorScreenshot.toString('base64')}`)
    }

    const executionTime = Date.now() - startTime

    return {
      scenarioName: scenario.name,
      description: scenario.description,
      success,
      error,
      executionTime,
      screenshots,
      performanceMetrics,
      steps: scenario.steps.length,
    }
  }

  async function executeUserStep(
    page: Page,
    step: UserStep,
    screenshots: string[],
    performanceMetrics: PerformanceMetrics[]
  ): Promise<void> {
    const stepStartTime = performance.now()

    switch (step.action) {
      case 'navigate':
        await page.goto(step.target!, { waitUntil: 'networkidle0', timeout: step.timeout || 30000 })
        break

      case 'click':
        await page.waitForSelector(step.target!, { timeout: step.timeout || 10000 })
        await page.click(step.target!)
        await page.waitForTimeout(100) // Small delay for UI updates
        break

      case 'type':
        await page.waitForSelector(step.target!, { timeout: step.timeout || 10000 })
        await page.type(step.target!, step.value!, { delay: 50 }) // Realistic typing speed
        break

      case 'wait':
        if (step.target) {
          await page.waitForSelector(step.target!, { timeout: step.timeout || 10000 })
        } else {
          await page.waitForTimeout(step.timeout || 1000)
        }
        break

      case 'verify': {
        const element = await page.waitForSelector(step.target!, { timeout: step.timeout || 10000 })
        if (step.value) {
          const text = await element?.textContent()
          if (!text?.includes(step.value)) {
            throw new Error(`Expected text "${step.value}" not found in element "${step.target}"`)
          }
        }
        break
      }

      case 'screenshot': {
        const screenshot = await page.screenshot({ fullPage: true })
        screenshots.push(`data:image/png;base64,${screenshot.toString('base64')}`)
        break
      }
    }

    const stepEndTime = performance.now()
    performanceMetrics.push({
      stepDescription: step.description,
      executionTime: stepEndTime - stepStartTime,
      action: step.action,
    })
  }

  describe('Complete User Journey Scenarios', () => {
    it('should complete a full customer support conversation', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      const scenario: UserScenario = {
        name: 'Customer Support Journey',
        description: 'Complete customer support conversation from start to resolution',
        timeout: 60000,
        steps: [
          {
            action: 'navigate',
            target: `${testEnv.baseUrl}/chat/support-test`,
            description: 'Navigate to customer support chat',
          },
          {
            action: 'screenshot',
            description: 'Take screenshot of initial chat interface',
          },
          {
            action: 'verify',
            target: '[data-testid="chat-header"]',
            value: 'Customer Support Chat',
            description: 'Verify chat title displays correctly',
          },
          {
            action: 'verify',
            target: '[data-testid="welcome-message"]',
            value: 'Hello! How can we help you today?',
            description: 'Verify welcome message appears',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'Hello, I have a problem with my recent order #12345',
            description: 'Type initial support request',
          },
          {
            action: 'screenshot',
            description: 'Take screenshot after typing message',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send the support message',
          },
          {
            action: 'wait',
            target: '[data-testid="loading-indicator"]',
            description: 'Wait for message processing indicator',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]',
            timeout: 15000,
            description: 'Wait for agent response',
          },
          {
            action: 'screenshot',
            description: 'Take screenshot of agent response',
          },
          {
            action: 'verify',
            target: '[data-testid="assistant-message"]',
            value: 'order',
            description: 'Verify agent acknowledges order issue',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'The order shows as delivered but I never received it',
            description: 'Provide additional details',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send follow-up message',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]:nth-child(3)',
            timeout: 15000,
            description: 'Wait for second agent response',
          },
          {
            action: 'screenshot',
            description: 'Take screenshot of conversation flow',
          },
          {
            action: 'verify',
            target: '[data-testid="message-container"]',
            description: 'Verify multiple messages in conversation',
          },
        ],
        expectedOutcome: 'Complete support conversation with agent responses',
      }

      const result = await executeUserScenario(page, scenario)
      testResults.push(result)

      expect(result.success).toBe(true)
      expect(result.screenshots.length).toBeGreaterThan(3)
      expect(result.executionTime).toBeLessThan(scenario.timeout)
    })

    it('should handle authentication flow for protected chat', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      const scenario: UserScenario = {
        name: 'Authentication Flow',
        description: 'Complete authentication flow for password-protected chat',
        timeout: 30000,
        steps: [
          {
            action: 'navigate',
            target: `${testEnv.baseUrl}/chat/sales-test`,
            description: 'Navigate to password-protected sales chat',
          },
          {
            action: 'screenshot',
            description: 'Take screenshot of authentication screen',
          },
          {
            action: 'verify',
            target: '[data-testid="password-auth"]',
            description: 'Verify password authentication form appears',
          },
          {
            action: 'type',
            target: '[data-testid="password-input"]',
            value: 'sales123',
            description: 'Enter correct password',
          },
          {
            action: 'click',
            target: '[data-testid="auth-submit"]',
            description: 'Submit authentication',
          },
          {
            action: 'wait',
            target: '[data-testid="chat-interface"]',
            timeout: 10000,
            description: 'Wait for chat interface to load after auth',
          },
          {
            action: 'screenshot',
            description: 'Take screenshot of authenticated chat interface',
          },
          {
            action: 'verify',
            target: '[data-testid="chat-header"]',
            value: 'Sales Inquiry Chat',
            description: 'Verify correct chat loaded',
          },
          {
            action: 'verify',
            target: '[data-testid="welcome-message"]',
            value: 'Welcome to our sales team',
            description: 'Verify custom welcome message',
          },
        ],
        expectedOutcome: 'Successful authentication and access to protected chat',
      }

      const result = await executeUserScenario(page, scenario)
      testResults.push(result)

      expect(result.success).toBe(true)
      expect(result.screenshots.length).toBeGreaterThan(2)
    })

    it('should handle authentication failure gracefully', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      const scenario: UserScenario = {
        name: 'Authentication Failure',
        description: 'Handle incorrect password authentication gracefully',
        timeout: 20000,
        steps: [
          {
            action: 'navigate',
            target: `${testEnv.baseUrl}/chat/sales-test`,
            description: 'Navigate to password-protected chat',
          },
          {
            action: 'type',
            target: '[data-testid="password-input"]',
            value: 'wrongpassword',
            description: 'Enter incorrect password',
          },
          {
            action: 'click',
            target: '[data-testid="auth-submit"]',
            description: 'Submit incorrect authentication',
          },
          {
            action: 'wait',
            target: '[data-testid="auth-error"]',
            description: 'Wait for authentication error message',
          },
          {
            action: 'screenshot',
            description: 'Take screenshot of error state',
          },
          {
            action: 'verify',
            target: '[data-testid="auth-error"]',
            value: 'Invalid password',
            description: 'Verify error message appears',
          },
          {
            action: 'verify',
            target: '[data-testid="password-input"]',
            description: 'Verify password input is still available for retry',
          },
        ],
        expectedOutcome: 'Clear error message and retry option',
      }

      const result = await executeUserScenario(page, scenario)
      testResults.push(result)

      expect(result.success).toBe(true)
    })
  })

  describe('Multi-Step Conversation Flows', () => {
    it('should maintain conversation context across multiple exchanges', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      const scenario: UserScenario = {
        name: 'Context Retention',
        description: 'Verify conversation context is maintained across multiple message exchanges',
        timeout: 90000,
        steps: [
          {
            action: 'navigate',
            target: `${testEnv.baseUrl}/chat/support-test`,
            description: 'Navigate to support chat',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'I want to return a product I bought last week',
            description: 'Initial return request',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send initial message',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]',
            timeout: 15000,
            description: 'Wait for agent response about returns',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'It was a blue sweater, size medium',
            description: 'Provide product details',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send product details',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]:nth-child(3)',
            timeout: 15000,
            description: 'Wait for context-aware response',
          },
          {
            action: 'screenshot',
            description: 'Take screenshot of contextual conversation',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'What is your return policy for that?',
            description: 'Ask contextual follow-up question',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send contextual question',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]:nth-child(5)',
            timeout: 15000,
            description: 'Wait for policy response',
          },
          {
            action: 'verify',
            target: '[data-testid="assistant-message"]:nth-child(5)',
            value: 'return',
            description: 'Verify agent provides relevant return policy info',
          },
        ],
        expectedOutcome: 'Agent responses show understanding of conversation context',
      }

      const result = await executeUserScenario(page, scenario)
      testResults.push(result)

      expect(result.success).toBe(true)
      expect(result.performanceMetrics.length).toBeGreaterThan(8)
    })

    it('should handle complex multi-turn problem solving', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      const scenario: UserScenario = {
        name: 'Complex Problem Solving',
        description: 'Handle a complex technical issue requiring multiple diagnostic steps',
        timeout: 120000,
        steps: [
          {
            action: 'navigate',
            target: `${testEnv.baseUrl}/chat/support-test`,
            description: 'Navigate to technical support chat',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'My app keeps crashing when I try to upload files',
            description: 'Report technical problem',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send problem report',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]',
            timeout: 15000,
            description: 'Wait for diagnostic questions',
          },
          {
            action: 'screenshot',
            description: 'Screenshot of diagnostic response',
          },
          // Simulate diagnostic conversation
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'It happens with any file type, usually files over 10MB',
            description: 'Provide diagnostic details',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send diagnostic info',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]:nth-child(3)',
            timeout: 15000,
            description: 'Wait for follow-up questions',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'I am using version 2.1.4 on iOS 16',
            description: 'Provide version information',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send version details',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]:nth-child(5)',
            timeout: 15000,
            description: 'Wait for solution or escalation',
          },
          {
            action: 'screenshot',
            description: 'Screenshot of problem resolution',
          },
          {
            action: 'verify',
            target: '[data-testid="conversation-container"]',
            description: 'Verify complete diagnostic conversation',
          },
        ],
        expectedOutcome: 'Complete diagnostic conversation leading to resolution or escalation',
      }

      const result = await executeUserScenario(page, scenario)
      testResults.push(result)

      expect(result.success).toBe(true)
    })
  })

  describe('Real-Time Features and Responsiveness', () => {
    it('should show typing indicators and real-time responses', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      const scenario: UserScenario = {
        name: 'Real-Time Indicators',
        description: 'Verify typing indicators and real-time response streaming',
        timeout: 45000,
        steps: [
          {
            action: 'navigate',
            target: `${testEnv.baseUrl}/chat/support-test`,
            description: 'Navigate to chat interface',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'Can you help me with a detailed explanation of your service?',
            description: 'Ask for detailed response to test streaming',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send message',
          },
          {
            action: 'wait',
            target: '[data-testid="typing-indicator"]',
            timeout: 5000,
            description: 'Wait for typing indicator to appear',
          },
          {
            action: 'screenshot',
            description: 'Screenshot of typing indicator',
          },
          {
            action: 'verify',
            target: '[data-testid="typing-indicator"]',
            description: 'Verify typing indicator is visible',
          },
          {
            action: 'wait',
            target: '[data-testid="streaming-response"]',
            timeout: 20000,
            description: 'Wait for streaming response to begin',
          },
          {
            action: 'screenshot',
            description: 'Screenshot during streaming response',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]',
            timeout: 20000,
            description: 'Wait for complete response',
          },
          {
            action: 'verify',
            target: '[data-testid="assistant-message"]',
            description: 'Verify complete response received',
          },
        ],
        expectedOutcome: 'Real-time typing indicators and streaming response visible',
      }

      const result = await executeUserScenario(page, scenario)
      testResults.push(result)

      expect(result.success).toBe(true)
    })

    it('should handle message delivery confirmations', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      const scenario: UserScenario = {
        name: 'Message Delivery Confirmation',
        description: 'Verify message delivery status and confirmations',
        timeout: 30000,
        steps: [
          {
            action: 'navigate',
            target: `${testEnv.baseUrl}/chat/support-test`,
            description: 'Navigate to chat interface',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'Test message for delivery confirmation',
            description: 'Type test message',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send message',
          },
          {
            action: 'wait',
            target: '[data-testid="message-status-sending"]',
            timeout: 2000,
            description: 'Wait for sending status indicator',
          },
          {
            action: 'wait',
            target: '[data-testid="message-status-sent"]',
            timeout: 5000,
            description: 'Wait for sent status confirmation',
          },
          {
            action: 'screenshot',
            description: 'Screenshot of delivery confirmation',
          },
          {
            action: 'verify',
            target: '[data-testid="message-status-sent"]',
            description: 'Verify message delivery confirmation',
          },
        ],
        expectedOutcome: 'Clear message delivery status indicators',
      }

      const result = await executeUserScenario(page, scenario)
      testResults.push(result)

      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should recover gracefully from network interruptions', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      const scenario: UserScenario = {
        name: 'Network Recovery',
        description: 'Handle network interruption and automatic recovery',
        timeout: 60000,
        steps: [
          {
            action: 'navigate',
            target: `${testEnv.baseUrl}/chat/support-test`,
            description: 'Navigate to chat interface',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'Message before network interruption',
            description: 'Send message before simulating network issue',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send message',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]',
            timeout: 15000,
            description: 'Wait for normal response',
          },
          // Simulate network interruption by going offline
          {
            action: 'screenshot',
            description: 'Screenshot before network interruption',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'Message during offline period',
            description: 'Try to send message while offline',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Attempt to send message offline',
          },
          {
            action: 'wait',
            target: '[data-testid="connection-error"]',
            timeout: 10000,
            description: 'Wait for connection error indicator',
          },
          {
            action: 'screenshot',
            description: 'Screenshot of offline state',
          },
          {
            action: 'verify',
            target: '[data-testid="connection-error"]',
            description: 'Verify offline indicator appears',
          },
          // Simulate network recovery
          {
            action: 'wait',
            target: '[data-testid="connection-restored"]',
            timeout: 15000,
            description: 'Wait for connection restoration',
          },
          {
            action: 'screenshot',
            description: 'Screenshot of recovery state',
          },
          {
            action: 'verify',
            target: '[data-testid="message-retry"]',
            description: 'Verify message retry option appears',
          },
        ],
        expectedOutcome: 'Graceful offline handling and recovery options',
      }

      // Override network conditions for this test
      await page.setOfflineMode(true)

      const result = await executeUserScenario(page, scenario)

      await page.setOfflineMode(false) // Restore connection

      testResults.push(result)

      expect(result.success).toBe(true)
    })

    it('should handle server errors with retry options', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      const scenario: UserScenario = {
        name: 'Server Error Recovery',
        description: 'Handle server errors and provide retry mechanisms',
        timeout: 45000,
        steps: [
          {
            action: 'navigate',
            target: `${testEnv.baseUrl}/chat/support-test`,
            description: 'Navigate to chat interface',
          },
          // Simulate server error by intercepting requests
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'This message will trigger a server error',
            description: 'Send message that will cause server error',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send message',
          },
          {
            action: 'wait',
            target: '[data-testid="error-message"]',
            timeout: 15000,
            description: 'Wait for error message to appear',
          },
          {
            action: 'screenshot',
            description: 'Screenshot of error state',
          },
          {
            action: 'verify',
            target: '[data-testid="error-message"]',
            value: 'error',
            description: 'Verify error message is displayed',
          },
          {
            action: 'verify',
            target: '[data-testid="retry-button"]',
            description: 'Verify retry button is available',
          },
          {
            action: 'click',
            target: '[data-testid="retry-button"]',
            description: 'Click retry button',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]',
            timeout: 20000,
            description: 'Wait for successful retry response',
          },
          {
            action: 'screenshot',
            description: 'Screenshot after successful retry',
          },
        ],
        expectedOutcome: 'Clear error messages and functional retry mechanism',
      }

      // Setup request interception to simulate server errors
      await page.setRequestInterception(true)
      let errorSimulated = false

      page.on('request', (request) => {
        if (
          request.url().includes('/api/chat/') &&
          request.method() === 'POST' &&
          !errorSimulated
        ) {
          errorSimulated = true
          request.respond({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' }),
          })
        } else {
          request.continue()
        }
      })

      const result = await executeUserScenario(page, scenario)
      testResults.push(result)

      await page.setRequestInterception(false)

      expect(result.success).toBe(true)
    })
  })

  describe('Performance and Responsiveness', () => {
    it('should maintain responsive performance under typical load', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      const scenario: UserScenario = {
        name: 'Performance Under Load',
        description: 'Maintain responsive performance during typical usage patterns',
        timeout: 60000,
        steps: [
          {
            action: 'navigate',
            target: `${testEnv.baseUrl}/chat/support-test`,
            description: 'Navigate to chat interface',
          },
          // Send multiple rapid messages to test performance
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'First rapid message',
            description: 'Send first message',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send first message',
          },
          {
            action: 'wait',
            timeout: 500,
            description: 'Brief wait',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'Second rapid message',
            description: 'Send second message quickly',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send second message',
          },
          {
            action: 'wait',
            timeout: 500,
            description: 'Brief wait',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'Third rapid message',
            description: 'Send third message quickly',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send third message',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]:nth-child(6)', // 3 user + 3 assistant messages
            timeout: 30000,
            description: 'Wait for all responses',
          },
          {
            action: 'screenshot',
            description: 'Screenshot of multiple messages',
          },
        ],
        expectedOutcome: 'All messages processed without performance degradation',
      }

      const result = await executeUserScenario(page, scenario)
      testResults.push(result)

      expect(result.success).toBe(true)

      // Performance assertions
      const totalResponseTime = result.performanceMetrics
        .filter((m) => m.action === 'wait')
        .reduce((sum, m) => sum + m.executionTime, 0)

      expect(totalResponseTime).toBeLessThan(30000) // All responses within 30 seconds
      expect(result.executionTime).toBeLessThan(scenario.timeout)
    })

    it('should handle large conversation histories efficiently', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      // Pre-populate with conversation history
      await page.goto(`${testEnv.baseUrl}/chat/support-test`)

      // Simulate long conversation by sending many messages
      for (let i = 1; i <= 20; i++) {
        await page.type(
          '[data-testid="chat-input"]',
          `Message number ${i} in this long conversation`
        )
        await page.click('[data-testid="send-button"]')
        await page.waitForTimeout(1000) // Wait between messages

        // Wait for response every few messages to build history
        if (i % 5 === 0) {
          await page.waitForSelector(`[data-testid="assistant-message"]:nth-child(${i * 2})`, {
            timeout: 15000,
          })
        }
      }

      const scenario: UserScenario = {
        name: 'Large Conversation Performance',
        description: 'Test performance with large conversation history',
        timeout: 30000,
        steps: [
          {
            action: 'screenshot',
            description: 'Screenshot of large conversation',
          },
          {
            action: 'verify',
            target: '[data-testid="message-container"]',
            description: 'Verify message container with large history',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'New message after long conversation history',
            description: 'Send message with large conversation context',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Send new message',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]:last-child',
            timeout: 20000,
            description: 'Wait for response with large context',
          },
          {
            action: 'screenshot',
            description: 'Screenshot after new message in large conversation',
          },
        ],
        expectedOutcome: 'Responsive performance even with large conversation history',
      }

      const result = await executeUserScenario(page, scenario)
      testResults.push(result)

      expect(result.success).toBe(true)
    })
  })

  describe('Mobile and Responsive Design', () => {
    it('should work correctly on mobile viewport', async () => {
      const page = testEnv.pages[testEnv.pages.length - 1]

      // Set mobile viewport
      await page.setViewport({ width: 375, height: 667 })

      const scenario: UserScenario = {
        name: 'Mobile Chat Experience',
        description: 'Complete chat interaction on mobile viewport',
        timeout: 45000,
        steps: [
          {
            action: 'navigate',
            target: `${testEnv.baseUrl}/chat/support-test`,
            description: 'Navigate to chat on mobile',
          },
          {
            action: 'screenshot',
            description: 'Screenshot of mobile chat interface',
          },
          {
            action: 'verify',
            target: '[data-testid="mobile-chat-container"]',
            description: 'Verify mobile-optimized layout',
          },
          {
            action: 'type',
            target: '[data-testid="chat-input"]',
            value: 'Testing mobile chat functionality',
            description: 'Type message on mobile keyboard',
          },
          {
            action: 'screenshot',
            description: 'Screenshot with mobile keyboard',
          },
          {
            action: 'click',
            target: '[data-testid="send-button"]',
            description: 'Tap send button on mobile',
          },
          {
            action: 'wait',
            target: '[data-testid="assistant-message"]',
            timeout: 15000,
            description: 'Wait for response on mobile',
          },
          {
            action: 'screenshot',
            description: 'Screenshot of mobile conversation',
          },
          {
            action: 'verify',
            target: '[data-testid="mobile-message-bubble"]',
            description: 'Verify mobile message styling',
          },
        ],
        expectedOutcome: 'Fully functional chat interface on mobile viewport',
      }

      const result = await executeUserScenario(page, scenario)
      testResults.push(result)

      expect(result.success).toBe(true)
    })
  })
})
