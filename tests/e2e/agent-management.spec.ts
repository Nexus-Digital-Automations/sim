/**
 * Agent Management End-to-End Tests
 *
 * Complete end-to-end tests for agent management using Playwright.
 * Tests the full user journey from agent creation to deployment.
 */

import { expect, type Page, test } from '@playwright/test'

// Test data
const testAgent = {
  name: 'E2E Test Agent',
  description: 'Agent created during end-to-end testing',
  model: 'claude-3-sonnet',
  guidelines: [
    {
      condition: 'user says hello',
      action: 'respond with friendly greeting',
      priority: 5,
    },
    {
      condition: 'user asks for help',
      action: 'offer comprehensive assistance',
      priority: 8,
    },
  ],
  tools: ['email', 'calendar'],
}

test.describe('Agent Management E2E', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()

    // Mock API responses to avoid external dependencies
    await page.route('**/api/agents*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-agent-id',
            ...JSON.parse(route.request().postData() || '{}'),
          }),
        })
      }
    })

    await page.route('**/api/tools*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'email', name: 'Email', category: 'communication' },
          { id: 'calendar', name: 'Calendar', category: 'scheduling' },
          { id: 'search', name: 'Search', category: 'information' },
        ]),
      })
    })

    // Navigate to agent management page
    await page.goto('/workspace/test-workspace/agents')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('complete agent creation workflow', async () => {
    // Start agent creation
    await page.click('text=New Agent')
    await expect(page.locator('text=Create New Agent')).toBeVisible()

    // Step 1: Basic Information
    await page.fill('[data-testid="agent-name"]', testAgent.name)
    await page.fill('[data-testid="agent-description"]', testAgent.description)

    // Verify form validation
    await expect(page.locator('[data-testid="agent-name"]')).toHaveValue(testAgent.name)

    await page.click('text=Next')

    // Step 2: Model Configuration
    await page.click('[data-testid="model-select"]')
    await page.click(`text=${testAgent.model}`)

    // Configure model parameters
    await page.fill('[data-testid="temperature"]', '0.7')
    await page.fill('[data-testid="max-tokens"]', '1000')

    await page.click('text=Next')

    // Step 3: Guidelines
    await expect(page.locator('text=Guidelines')).toBeVisible()

    // Add first guideline
    await page.click('text=Add Guideline')
    await page.fill('[data-testid="guideline-condition"]', testAgent.guidelines[0].condition)
    await page.fill('[data-testid="guideline-action"]', testAgent.guidelines[0].action)
    await page
      .locator('[data-testid="priority-slider"]')
      .fill(testAgent.guidelines[0].priority.toString())
    await page.click('text=Create Guideline')

    // Verify guideline was added
    await expect(page.locator(`text=${testAgent.guidelines[0].condition}`)).toBeVisible()

    // Add second guideline with higher priority
    await page.click('text=Add Guideline')
    await page.fill('[data-testid="guideline-condition"]', testAgent.guidelines[1].condition)
    await page.fill('[data-testid="guideline-action"]', testAgent.guidelines[1].action)
    await page
      .locator('[data-testid="priority-slider"]')
      .fill(testAgent.guidelines[1].priority.toString())
    await page.click('text=Create Guideline')

    // Test guideline reordering (drag and drop)
    const firstGuideline = page.locator(`text=${testAgent.guidelines[0].condition}`).first()
    const secondGuideline = page.locator(`text=${testAgent.guidelines[1].condition}`).first()

    await firstGuideline.dragTo(secondGuideline)

    await page.click('text=Next')

    // Step 4: Tools & Integrations
    await expect(page.locator('text=Tools & Integrations')).toBeVisible()

    // Add tools
    for (const tool of testAgent.tools) {
      await page.click('text=Add Tool')
      await page.click(`text=${tool}`, { exact: false })
    }

    // Verify tools were added
    for (const tool of testAgent.tools) {
      await expect(page.locator(`text=${tool}`)).toBeVisible()
    }

    await page.click('text=Next')

    // Step 5: Review & Create
    await expect(page.locator('text=Review & Create')).toBeVisible()

    // Verify all information is displayed correctly
    await expect(page.locator(`text=${testAgent.name}`)).toBeVisible()
    await expect(page.locator(`text=${testAgent.description}`)).toBeVisible()
    await expect(page.locator(`text=${testAgent.model}`)).toBeVisible()

    // Verify guidelines
    await expect(page.locator(`text=${testAgent.guidelines[0].condition}`)).toBeVisible()
    await expect(page.locator(`text=${testAgent.guidelines[1].condition}`)).toBeVisible()

    // Verify tools
    for (const tool of testAgent.tools) {
      await expect(page.locator(`text=${tool}`)).toBeVisible()
    }

    // Create the agent
    await page.click('text=Create Agent')

    // Wait for success message
    await expect(page.locator('text=Agent created successfully')).toBeVisible()

    // Should navigate back to agent list
    await expect(page.locator('text=Agent Management')).toBeVisible()
  })

  test('form validation and error handling', async () => {
    await page.click('text=New Agent')

    // Try to proceed without filling required fields
    await page.click('text=Next')

    // Should show validation errors
    await expect(page.locator('text=Agent name is required')).toBeVisible()

    // Fill only name and try again
    await page.fill('[data-testid="agent-name"]', 'Test')
    await page.click('text=Next')

    // Should show description required error
    await expect(page.locator('text=Description is required')).toBeVisible()

    // Fill description with minimum length
    await page.fill(
      '[data-testid="agent-description"]',
      'Short description that meets minimum requirements'
    )
    await page.click('text=Next')

    // Should proceed to model configuration
    await expect(page.locator('text=Model Configuration')).toBeVisible()
  })

  test('agent list operations', async () => {
    // Mock agents data for list view
    await page.route('**/api/agents*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
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
          ]),
        })
      }
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify agents are displayed
    await expect(page.locator('text=Support Agent')).toBeVisible()
    await expect(page.locator('text=Sales Agent')).toBeVisible()
    await expect(page.locator('text=142 conversations')).toBeVisible()

    // Test search functionality
    await page.fill('[data-testid="search-agents"]', 'Support')

    // Should filter to show only Support Agent
    await expect(page.locator('text=Support Agent')).toBeVisible()
    await expect(page.locator('text=Sales Agent')).not.toBeVisible()

    // Clear search
    await page.fill('[data-testid="search-agents"]', '')

    // Both agents should be visible again
    await expect(page.locator('text=Support Agent')).toBeVisible()
    await expect(page.locator('text=Sales Agent')).toBeVisible()

    // Test status filtering
    await page.click('[data-testid="status-filter"]')
    await page.click('text=Active')

    // Should show only active agent
    await expect(page.locator('text=Support Agent')).toBeVisible()
    await expect(page.locator('text=Sales Agent')).not.toBeVisible()
  })

  test('agent editing workflow', async () => {
    // Mock single agent data
    await page.route('**/api/agents/agent-1', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'agent-1',
            name: 'Support Agent',
            description: 'Customer support assistant',
            model: 'claude-3-sonnet',
            guidelines: [
              {
                id: 'g1',
                condition: 'user needs help',
                action: 'provide assistance',
                priority: 5,
              },
            ],
            tools: ['email'],
          }),
        })
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      }
    })

    // Navigate to agent edit
    await page.goto('/workspace/test-workspace/agents/agent-1/edit')
    await page.waitForLoadState('networkidle')

    // Verify form is pre-filled
    await expect(page.locator('[data-testid="agent-name"]')).toHaveValue('Support Agent')
    await expect(page.locator('[data-testid="agent-description"]')).toHaveValue(
      'Customer support assistant'
    )

    // Modify agent name
    await page.fill('[data-testid="agent-name"]', 'Updated Support Agent')

    // Navigate to guidelines and modify
    await page.click('text=Next')
    await page.click('text=Next')

    // Edit existing guideline
    await page.click('[data-testid="edit-guideline-g1"]')
    await page.fill('[data-testid="guideline-condition"]', 'user requests help')
    await page.click('text=Save Changes')

    // Continue to review
    await page.click('text=Next')
    await page.click('text=Next')

    // Verify changes in review
    await expect(page.locator('text=Updated Support Agent')).toBeVisible()
    await expect(page.locator('text=user requests help')).toBeVisible()

    // Save changes
    await page.click('text=Save Changes')

    // Should show success message
    await expect(page.locator('text=Agent updated successfully')).toBeVisible()
  })

  test('guideline builder advanced features', async () => {
    await page.click('text=New Agent')

    // Navigate to guidelines step
    await page.fill('[data-testid="agent-name"]', 'Test Agent')
    await page.fill('[data-testid="agent-description"]', 'Test Description')
    await page.click('text=Next')
    await page.click('text=Next')

    // Test guideline templates
    await page.click('text=Add Guideline')
    await page.click('text=Templates')

    // Select a template
    await page.click('text=Greeting Template')

    // Should populate form with template data
    await expect(page.locator('[data-testid="guideline-condition"]')).toHaveValue(/greeting|hello/i)

    await page.click('text=Create Guideline')

    // Test guideline analysis
    await page.click('text=Analysis')

    // Should show analysis results
    await expect(page.locator('text=Coverage Analysis')).toBeVisible()
    await expect(page.locator('text=Potential Conflicts')).toBeVisible()

    // Add conflicting guideline to test conflict detection
    await page.click('text=Builder')
    await page.click('text=Add Guideline')
    await page.fill('[data-testid="guideline-condition"]', 'user says hello')
    await page.fill('[data-testid="guideline-action"]', 'ignore user')
    await page.click('text=Create Guideline')

    // Check analysis again
    await page.click('text=Analysis')

    // Should show conflict warning
    await expect(page.locator('text=Conflict detected')).toBeVisible()
  })

  test('journey creator functionality', async () => {
    await page.click('text=New Agent')

    // Navigate through form to journey creator
    await page.fill('[data-testid="agent-name"]', 'Journey Test Agent')
    await page.fill('[data-testid="agent-description"]', 'Testing journey creator')
    await page.click('text=Next')
    await page.click('text=Next')
    await page.click('text=Next')
    await page.click('text=Next')

    // Access journey creator from review step
    await page.click('text=Journey Creator')

    // Should show journey creator interface
    await expect(page.locator('text=Journey Creator')).toBeVisible()
    await expect(page.locator('[data-testid="journey-canvas"]')).toBeVisible()

    // Add journey states from toolbox
    await page.click('[data-testid="add-start-state"]')
    await page.click('[data-testid="add-message-state"]')
    await page.click('[data-testid="add-end-state"]')

    // Should have states on canvas
    await expect(page.locator('[data-testid="journey-state-start"]')).toBeVisible()
    await expect(page.locator('[data-testid="journey-state-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="journey-state-end"]')).toBeVisible()

    // Connect states by drawing edges
    await page.hover('[data-testid="journey-state-start"]')
    await page.dragAndDrop(
      '[data-testid="start-output-handle"]',
      '[data-testid="message-input-handle"]'
    )

    await page.dragAndDrop(
      '[data-testid="message-output-handle"]',
      '[data-testid="end-input-handle"]'
    )

    // Test journey preview
    await page.click('text=Preview')

    // Should show preview interface
    await expect(page.locator('text=Journey Preview')).toBeVisible()

    // Start journey simulation
    await page.click('[data-testid="start-journey"]')

    // Should show simulation running
    await expect(page.locator('text=Running')).toBeVisible()

    // Test journey settings
    await page.click('text=Settings')

    // Should show settings panel
    await expect(page.locator('text=Journey Settings')).toBeVisible()

    // Modify settings
    await page.fill('[data-testid="journey-timeout"]', '60000')
    await page.click('text=Save Settings')
  })

  test('analytics and performance monitoring', async () => {
    // Mock analytics data
    await page.route('**/api/agents/*/analytics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalConversations: 342,
          successRate: 87.3,
          avgResponseTime: 1.2,
          satisfactionScore: 4.3,
          performanceData: [
            {
              date: '2024-01-01',
              conversations: 45,
              successRate: 85,
              avgResponseTime: 1.2,
              satisfactionScore: 4.2,
            },
          ],
        }),
      })
    })

    await page.goto('/workspace/test-workspace/agents/agent-1/analytics')
    await page.waitForLoadState('networkidle')

    // Should show analytics dashboard
    await expect(page.locator('text=Agent Analytics')).toBeVisible()
    await expect(page.locator('text=342')).toBeVisible() // Total conversations
    await expect(page.locator('text=87.3%')).toBeVisible() // Success rate

    // Test time range selector
    await page.click('[data-testid="time-range-select"]')
    await page.click('text=Last 7 days')

    // Should update charts
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible()

    // Test analytics tabs
    await page.click('text=Conversations')
    await expect(page.locator('text=Conversation Outcomes')).toBeVisible()

    await page.click('text=Topics')
    await expect(page.locator('text=Topic Analysis')).toBeVisible()

    await page.click('text=Users')
    await expect(page.locator('text=User Segments')).toBeVisible()

    // Test export functionality
    await page.click('[data-testid="export-analytics"]')

    // Should trigger download
    const downloadPromise = page.waitForEvent('download')
    await downloadPromise
  })

  test('responsive design and mobile compatibility', async () => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should show mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible()

    // Test agent creation on mobile
    await page.click('text=New Agent')

    // Should show mobile-friendly form
    await expect(page.locator('[data-testid="mobile-form-container"]')).toBeVisible()

    // Form should be usable on mobile
    await page.fill('[data-testid="agent-name"]', 'Mobile Test Agent')
    await page.fill('[data-testid="agent-description"]', 'Created on mobile device')

    // Navigation should work on mobile
    await page.click('text=Next')
    await expect(page.locator('text=Model Configuration')).toBeVisible()
  })

  test('accessibility compliance', async () => {
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'new-agent-button')

    // Test screen reader labels
    await expect(page.locator('[data-testid="agent-name"]')).toHaveAttribute('aria-label')
    await expect(page.locator('[data-testid="agent-description"]')).toHaveAttribute(
      'aria-describedby'
    )

    // Test form validation announcements
    await page.click('text=New Agent')
    await page.click('text=Next') // Try to proceed without filling required fields

    // Should announce validation errors to screen readers
    await expect(page.locator('[role="alert"]')).toBeVisible()

    // Test color contrast and visual indicators
    await expect(page.locator('.error-message')).toHaveCSS('color', /rgb\(/)
    await expect(page.locator('.success-message')).toHaveCSS('color', /rgb\(/)
  })
})
