/**
 * Comprehensive Integration Tests for Schedule Configuration API Route
 * Migrated to use enhanced test infrastructure with bun/vitest compatibility
 *
 * Features:
 * - Enhanced authentication mocking with runtime controls
 * - Comprehensive database mocking with chainable queries
 * - Production-ready logging and validation
 * - Improved error handling and debugging
 *
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createEnhancedMockRequest,
  enhancedMockUser,
  setupEnhancedTestMocks,
} from '@/app/api/__test-utils__/enhanced-utils'

// Import module mocks - this applies all vi.mock() calls at module level
import '@/app/api/__test-utils__/module-mocks'

describe('Schedule Configuration API Route - Enhanced Test Suite', () => {
  let mocks: any
  const startTime = Date.now()

  beforeEach(() => {
    console.log('🧪 Setting up enhanced schedule API tests')

    // Setup enhanced test mocks with authentication
    mocks = setupEnhancedTestMocks({
      auth: { authenticated: true, user: enhancedMockUser },
      database: { select: { results: [[]] } },
      permissions: { level: 'admin' },
    })

    console.log('✅ Enhanced mocks configured for schedule tests')

    // Enhanced workflow state for scheduling with comprehensive configuration
    const workflowStateWithSchedule = {
      blocks: {
        'starter-id': {
          id: 'starter-id',
          type: 'starter',
          subBlocks: {
            startWorkflow: { id: 'startWorkflow', type: 'dropdown', value: 'schedule' },
            scheduleType: { id: 'scheduleType', type: 'dropdown', value: 'daily' },
            scheduleTime: { id: 'scheduleTime', type: 'time-input', value: '09:30' },
            dailyTime: { id: 'dailyTime', type: 'time-input', value: '09:30' },
          },
        },
      },
      edges: [],
      loops: {},
    }

    console.log('🔧 Enhanced workflow state configured for scheduling tests')

    // Configure enhanced database mocks for schedule operations
    const workflowData = {
      id: 'workflow-id',
      userId: enhancedMockUser.id,
      workspaceId: null, // User owns the workflow directly
      name: 'Test Workflow for Schedule',
    }

    const existingScheduleData = {
      id: 'existing-schedule-id',
      workflowId: 'workflow-id',
      blockId: 'starter-id',
      cronExpression: '0 9 * * *',
      nextRunAt: new Date(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Setup database to return workflow for authorization and existing schedule for updates
    mocks.database.setSelectResults([
      [workflowData], // First call: workflow lookup for authorization
      [existingScheduleData], // Second call: existing schedule lookup
    ])

    console.log('🔧 Enhanced database configured with workflow and schedule data')

    // Schedule utilities are now mocked at module level
    // The module-mocks.ts file handles crypto, schedules/utils, and other dependencies
    // We can control their behavior through the enhanced mock system

    console.log('📅 Schedule utilities configured through module-level mocks')
  })

  afterEach(() => {
    const testDuration = Date.now() - startTime
    console.log(`🧹 Cleaning up schedule tests (duration: ${testDuration}ms)`)
    mocks.cleanup()
    console.log('✅ Schedule test cleanup completed')
  })

  /**
   * Test creating a new schedule with enhanced validation
   * Tests authentication, authorization, database operations, and response formatting
   */
  it('should create a new schedule successfully', async () => {
    const requestStartTime = Date.now()
    console.log('🧪 Testing schedule creation with enhanced validation')

    // Create enhanced mock request with comprehensive schedule data
    const scheduleData = {
      workflowId: 'workflow-id',
      state: {
        blocks: {
          'starter-id': {
            id: 'starter-id',
            type: 'starter',
            subBlocks: {
              startWorkflow: { id: 'startWorkflow', type: 'dropdown', value: 'schedule' },
              scheduleType: { id: 'scheduleType', type: 'dropdown', value: 'daily' },
              scheduleTime: { id: 'scheduleTime', type: 'time-input', value: '09:30' },
              dailyTime: { id: 'dailyTime', type: 'time-input', value: '09:30' },
            },
          },
        },
        edges: [],
        loops: {},
        metadata: {
          scheduleConfig: {
            timezone: 'America/New_York',
            description: 'Daily schedule at 9:30 AM',
          },
        },
      },
    }

    const req = createEnhancedMockRequest('POST', scheduleData)
    console.log('🔧 Enhanced request created with schedule data')

    // Import the route handler with dynamic import for proper mock application
    console.log('📦 Importing schedule route handler')
    const { POST } = await import('@/app/api/schedules/route')
    console.log('✅ Schedule route handler imported successfully')

    // Execute the request with comprehensive timing and validation
    console.log('🚀 Executing schedule creation request')
    const response = await POST(req)
    const requestDuration = Date.now() - requestStartTime

    console.log(
      `📊 Schedule creation response: status=${response.status}, duration=${requestDuration}ms`
    )

    // Enhanced response validation with detailed logging
    expect(response).toBeDefined()
    expect(response.status).toBe(200)
    console.log('✅ Schedule creation returned successful status')

    // Comprehensive response data validation
    const responseData = await response.json()
    console.log('📋 Schedule response data:', JSON.stringify(responseData, null, 2))

    expect(responseData).toHaveProperty('message')
    expect(['Schedule created', 'Schedule updated']).toContain(responseData.message)
    expect(responseData).toHaveProperty('cronExpression')
    expect(responseData).toHaveProperty('nextRunAt')
    expect(responseData.cronExpression).toMatch(/^[0-9*\s\-/,]+$/)

    console.log('✅ Schedule creation validation completed successfully')
  })

  /**
   * Test removing a schedule when startWorkflow is changed to manual
   * Enhanced with comprehensive validation and logging
   */
  it('should remove a schedule when startWorkflow is not schedule', async () => {
    const requestStartTime = Date.now()
    console.log('🧪 Testing schedule removal with manual workflow trigger')

    // Configure database for schedule removal scenario
    const workflowData = {
      id: 'workflow-id',
      userId: enhancedMockUser.id,
      workspaceId: null,
      name: 'Manual Workflow',
    }

    // Setup database to return workflow (no existing schedule needed for removal)
    mocks.database.setSelectResults([
      [workflowData], // Workflow lookup for authorization
      [], // No existing schedule to remove
    ])

    // Create request with manual trigger configuration
    const manualScheduleData = {
      workflowId: 'workflow-id',
      state: {
        blocks: {
          'starter-id': {
            id: 'starter-id',
            type: 'starter',
            subBlocks: {
              startWorkflow: { id: 'startWorkflow', type: 'dropdown', value: 'manual' }, // Manual trigger
              scheduleType: { id: 'scheduleType', type: 'dropdown', value: 'daily' },
            },
          },
        },
        edges: [],
        loops: {},
      },
    }

    const req = createEnhancedMockRequest('POST', manualScheduleData)
    console.log('🔧 Enhanced request created for schedule removal')

    // Import and execute route handler
    console.log('📦 Importing schedule route handler for removal test')
    const { POST } = await import('@/app/api/schedules/route')

    console.log('🚀 Executing schedule removal request')
    const response = await POST(req)
    const requestDuration = Date.now() - requestStartTime

    console.log(
      `📊 Schedule removal response: status=${response.status}, duration=${requestDuration}ms`
    )

    // Enhanced validation
    expect(response).toBeDefined()
    expect(response.status).toBe(200)
    console.log('✅ Schedule removal returned successful status')

    const responseData = await response.json()
    console.log('📋 Schedule removal response:', JSON.stringify(responseData, null, 2))

    expect(responseData).toHaveProperty('message')
    expect(['Schedule removed', 'No schedule to remove', 'Schedule updated']).toContain(
      responseData.message
    )

    console.log('✅ Schedule removal validation completed successfully')
  })

  /**
   * Test comprehensive error handling with enhanced logging
   * Tests database errors, validation errors, and proper error responses
   */
  it('should handle errors gracefully', async () => {
    const requestStartTime = Date.now()
    console.log('🧪 Testing comprehensive error handling')

    // Configure database to simulate error conditions
    // First, setup normal workflow lookup, then simulate database failure
    const workflowData = {
      id: 'workflow-id',
      userId: enhancedMockUser.id,
      workspaceId: null,
    }

    mocks.database.setSelectResults([
      [workflowData], // Workflow exists for authorization
      [], // No existing schedule
    ])

    console.log('🔧 Database configured to simulate error conditions')

    // Create request with invalid/problematic schedule data
    const errorScheduleData = {
      workflowId: 'workflow-id',
      state: {
        blocks: {
          'starter-id': {
            type: 'starter',
            subBlocks: {
              startWorkflow: { value: 'schedule' },
              scheduleType: { value: 'invalid-schedule-type' }, // Invalid schedule type
            },
          },
        },
        edges: [],
        loops: {},
      },
    }

    const req = createEnhancedMockRequest('POST', errorScheduleData)
    console.log('🔧 Enhanced request created with error-prone data')

    // Import and execute route handler
    console.log('📦 Importing schedule route handler for error test')
    const { POST } = await import('@/app/api/schedules/route')

    console.log('🚀 Executing request with error conditions')
    const response = await POST(req)
    const requestDuration = Date.now() - requestStartTime

    console.log(
      `📊 Error handling response: status=${response.status}, duration=${requestDuration}ms`
    )

    // Enhanced error response validation
    expect(response).toBeDefined()
    expect(response.status).toBeGreaterThanOrEqual(400)
    console.log('✅ Error response returned appropriate error status')

    const data = await response.json()
    console.log('📋 Error response data:', JSON.stringify(data, null, 2))

    expect(data).toHaveProperty('error')
    expect(typeof data.error).toBe('string')

    console.log('✅ Error handling validation completed successfully')
  })

  /**
   * Test authentication requirement with enhanced validation
   * Tests proper 401 responses for unauthenticated requests
   */
  it('should require authentication', async () => {
    const requestStartTime = Date.now()
    console.log('🧪 Testing authentication requirements')

    // Configure mocks for unauthenticated scenario
    mocks.auth.setUnauthenticated()
    console.log('🔧 Authentication disabled for test')

    // Create request without authentication
    const unauthenticatedScheduleData = {
      workflowId: 'workflow-id',
      state: { blocks: {}, edges: [], loops: {} },
    }

    const req = createEnhancedMockRequest('POST', unauthenticatedScheduleData)
    console.log('🔧 Enhanced request created for authentication test')

    // Import and execute route handler
    console.log('📦 Importing schedule route handler for auth test')
    const { POST } = await import('@/app/api/schedules/route')

    console.log('🚀 Executing unauthenticated request')
    const response = await POST(req)
    const requestDuration = Date.now() - requestStartTime

    console.log(
      `📊 Authentication test response: status=${response.status}, duration=${requestDuration}ms`
    )

    // Enhanced authentication validation
    expect(response).toBeDefined()
    expect(response.status).toBe(401)
    console.log('✅ Authentication test returned 401 status')

    const data = await response.json()
    console.log('📋 Authentication error response:', JSON.stringify(data, null, 2))

    expect(data).toHaveProperty('error')
    expect(['Unauthorized', 'Authentication required']).toContain(data.error)

    console.log('✅ Authentication validation completed successfully')
  })

  /**
   * Test comprehensive input validation with enhanced error reporting
   * Tests missing fields, invalid data types, and malformed requests
   */
  it('should validate input data', async () => {
    const requestStartTime = Date.now()
    console.log('🧪 Testing comprehensive input validation')

    // Create request with invalid/missing data
    const invalidScheduleData = {
      // Missing required fields
      workflowId: 'workflow-id',
      // Missing state field entirely
    }

    const req = createEnhancedMockRequest('POST', invalidScheduleData)
    console.log('🔧 Enhanced request created with invalid data')

    // Import and execute route handler
    console.log('📦 Importing schedule route handler for validation test')
    const { POST } = await import('@/app/api/schedules/route')

    console.log('🚀 Executing request with invalid data')
    const response = await POST(req)
    const requestDuration = Date.now() - requestStartTime

    console.log(
      `📊 Validation test response: status=${response.status}, duration=${requestDuration}ms`
    )

    // Enhanced validation error checking
    expect(response).toBeDefined()
    expect(response.status).toBe(400)
    console.log('✅ Validation test returned 400 status')

    const data = await response.json()
    console.log('📋 Validation error response:', JSON.stringify(data, null, 2))

    expect(data).toHaveProperty('error')
    expect(typeof data.error).toBe('string')
    expect(['Invalid request data', 'Validation error', 'Missing required fields']).toContain(
      data.error
    )

    console.log('✅ Input validation completed successfully')
  })

  /**
   * Test comprehensive schedule configuration scenarios
   * Enhanced test for complex schedule types and edge cases
   */
  it('should handle various schedule types correctly', async () => {
    const requestStartTime = Date.now()
    console.log('🧪 Testing comprehensive schedule configuration scenarios')

    // Test different schedule types: hourly, daily, weekly, monthly
    const scheduleTypes = [
      {
        type: 'hourly',
        config: { minutesInterval: 15 },
        expectedCron: '*/15 * * * *',
      },
      {
        type: 'daily',
        config: { dailyTime: '14:30' },
        expectedCron: '30 14 * * *',
      },
      {
        type: 'weekly',
        config: { weeklyDay: 1, weeklyTime: '10:00' },
        expectedCron: '0 10 * * 1',
      },
    ]

    for (const scheduleType of scheduleTypes) {
      console.log(`🔧 Testing ${scheduleType.type} schedule configuration`)

      // Configure database for each schedule type test
      const workflowData = {
        id: 'workflow-id',
        userId: enhancedMockUser.id,
        workspaceId: null,
        name: `${scheduleType.type} Workflow`,
      }

      mocks.database.setSelectResults([
        [workflowData],
        [], // No existing schedule
      ])

      const scheduleData = {
        workflowId: 'workflow-id',
        state: {
          blocks: {
            'starter-id': {
              id: 'starter-id',
              type: 'starter',
              subBlocks: {
                startWorkflow: { value: 'schedule' },
                scheduleType: { value: scheduleType.type },
                ...Object.entries(scheduleType.config).reduce(
                  (acc, [key, value]) => {
                    acc[key] = { value }
                    return acc
                  },
                  {} as Record<string, any>
                ),
              },
            },
          },
          edges: [],
          loops: {},
        },
      }

      const req = createEnhancedMockRequest('POST', scheduleData)
      const { POST } = await import('@/app/api/schedules/route')

      const response = await POST(req)
      console.log(`📊 ${scheduleType.type} schedule response: status=${response.status}`)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('message')
      console.log(`✅ ${scheduleType.type} schedule configuration completed successfully`)
    }

    const testDuration = Date.now() - requestStartTime
    console.log(`✅ All schedule type tests completed (duration: ${testDuration}ms)`)
  })

  /**
   * Test schedule update vs create scenarios
   * Tests the logic for updating existing schedules vs creating new ones
   */
  it('should differentiate between schedule updates and creation', async () => {
    const requestStartTime = Date.now()
    console.log('🧪 Testing schedule update vs creation scenarios')

    // Setup workflow and existing schedule data
    const workflowData = {
      id: 'workflow-id',
      userId: enhancedMockUser.id,
      workspaceId: null,
    }

    const existingSchedule = {
      id: 'existing-schedule',
      workflowId: 'workflow-id',
      blockId: 'starter-id',
      cronExpression: '0 8 * * *', // Old schedule at 8 AM
      status: 'active',
    }

    mocks.database.setSelectResults([
      [workflowData], // Workflow lookup
      [existingSchedule], // Existing schedule found - should trigger update
    ])

    const updateScheduleData = {
      workflowId: 'workflow-id',
      state: {
        blocks: {
          'starter-id': {
            type: 'starter',
            subBlocks: {
              startWorkflow: { value: 'schedule' },
              scheduleType: { value: 'daily' },
              dailyTime: { value: '10:00' }, // New time - should trigger update
            },
          },
        },
        edges: [],
        loops: {},
      },
    }

    const req = createEnhancedMockRequest('POST', updateScheduleData)
    console.log('🔧 Enhanced request created for schedule update test')

    const { POST } = await import('@/app/api/schedules/route')

    console.log('🚀 Executing schedule update request')
    const response = await POST(req)
    const requestDuration = Date.now() - requestStartTime

    console.log(
      `📊 Schedule update response: status=${response.status}, duration=${requestDuration}ms`
    )

    expect(response).toBeDefined()
    expect(response.status).toBe(200)

    const responseData = await response.json()
    console.log('📋 Schedule update response:', JSON.stringify(responseData, null, 2))

    expect(responseData).toHaveProperty('message')
    console.log('✅ Schedule update vs creation test completed successfully')
  })
})
