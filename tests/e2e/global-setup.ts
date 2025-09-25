/**
 * Playwright Global Setup
 *
 * Global setup for end-to-end tests including authentication,
 * database seeding, and test environment preparation.
 */

import { chromium, type FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use

  console.log('🚀 Starting global setup for Agent Management E2E tests...')

  // Launch browser for setup tasks
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Wait for the application to be available
    console.log('⏳ Waiting for application to be ready...')
    await page.goto(baseURL!)
    await page.waitForSelector('body', { timeout: 60000 })

    // Setup test data if needed
    console.log('📊 Setting up test data...')
    await setupTestData(page)

    // Authenticate if needed
    console.log('🔐 Setting up authentication...')
    await setupAuthentication(page)

    console.log('✅ Global setup completed successfully')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

async function setupTestData(page: any) {
  // Mock API responses for consistent test data
  await page.route('**/api/**', async (route: any) => {
    const url = route.request().url()

    // Handle different API endpoints
    if (url.includes('/api/workspaces')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-workspace',
            name: 'Test Workspace',
            description: 'Workspace for E2E testing',
          },
        ]),
      })
    } else if (url.includes('/api/agents')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    } else if (url.includes('/api/tools')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'email', name: 'Email', category: 'communication' },
          { id: 'calendar', name: 'Calendar', category: 'scheduling' },
          { id: 'search', name: 'Search', category: 'information' },
        ]),
      })
    } else {
      // Default response for other endpoints
      await route.continue()
    }
  })
}

async function setupAuthentication(page: any) {
  // Setup authentication cookies or tokens if needed
  // For now, we'll assume the app doesn't require authentication for testing

  // Store authentication state
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' })
}

export default globalSetup
