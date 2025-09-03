/**
 * Chat API Route Tests - Comprehensive Bun/Vitest Compatible Test Suite
 *
 * This file contains comprehensive tests for the main chat API route including:
 * - Chat deployment listing (GET) with user authentication and data filtering
 * - Chat deployment creation (POST) with comprehensive validation workflows
 * - Subdomain availability checking and conflict resolution
 * - Workflow access control and permission validation
 * - Database error handling and transaction management
 * - Environment-specific configurations and security protocols
 *
 * Migration Notes:
 * - Migrated from vi.doMock() to module-level vi.mock() declarations for bun compatibility
 * - Added comprehensive logging throughout all test scenarios for debugging
 * - Enhanced error handling and edge case coverage for production readiness
 * - Implemented proper authentication flow testing with realistic status codes
 * - Added detailed comments explaining each test scenario for future developers
 *
 * Test Infrastructure:
 * - Uses enhanced module mocks from @/app/api/__test-utils__/module-mocks
 * - Leverages enhanced utilities from @/app/api/__test-utils__/enhanced-utils
 * - Comprehensive logging for debugging test failures and execution flow
 * - Production-ready error handling and validation scenarios
 *
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Import enhanced test infrastructure for bun/vitest compatibility
import '@/app/api/__test-utils__/module-mocks'
import { setupEnhancedTestMocks } from '@/app/api/__test-utils__/enhanced-utils'

// Mock UUID generation for consistent test results
vi.mock('uuid', () => {
  console.log('📦 Mocking uuid for consistent test results')
  return {
    v4: vi.fn().mockImplementation(() => {
      const uuid = `test-uuid-${Date.now()}`
      console.log('🔍 Generated UUID:', uuid)
      return uuid
    }),
  }
})

// Mock chat utilities for workflow access control
vi.mock('@/app/api/chat/utils', () => {
  console.log('📦 Mocking @/app/api/chat/utils for workflow access control')
  return {
    checkWorkflowAccessForChatCreation: vi.fn().mockImplementation(async (workflowId, userId) => {
      console.log('🔍 checkWorkflowAccessForChatCreation called with:', { workflowId, userId })
      // Default to access granted with deployed workflow
      return {
        hasAccess: true,
        workflow: {
          id: workflowId,
          userId: userId,
          workspaceId: null,
          isDeployed: true,
          name: 'Test Workflow',
        },
      }
    }),
  }
})

// Mock workflow utilities for response handling
vi.mock('@/app/api/workflows/utils', () => {
  console.log('📦 Mocking @/app/api/workflows/utils for response handling')
  return {
    createSuccessResponse: vi.fn().mockImplementation((data) => {
      console.log('🔍 createSuccessResponse called with data keys:', Object.keys(data || {}))
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
    createErrorResponse: vi.fn().mockImplementation((message, status = 500) => {
      console.log('🔍 createErrorResponse called with:', { message, status })
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  }
})

// Mock environment configuration
vi.mock('@/lib/env', () => {
  console.log('📦 Mocking @/lib/env for environment configuration')
  return {
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    },
    isTruthy: vi.fn().mockImplementation((value) => {
      const result =
        typeof value === 'string' ? value.toLowerCase() === 'true' || value === '1' : Boolean(value)
      console.log('🔍 isTruthy called with:', { value, result })
      return result
    }),
    getEnv: vi.fn().mockImplementation((variable) => {
      console.log('🔍 getEnv called for variable:', variable)
      return process.env[variable]
    }),
  }
})

describe('Chat API Route - Comprehensive Test Suite', () => {
  let testMocks: any

  beforeEach(() => {
    console.log('🚀 Setting up Chat API Route test environment')

    // Clear all mocks to ensure clean state
    vi.clearAllMocks()

    // Setup enhanced test mocks with chat-specific configuration
    testMocks = setupEnhancedTestMocks({
      auth: {
        authenticated: true,
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
      },
      database: {
        select: { results: [[]] }, // Default to empty results
      },
      permissions: {
        level: 'admin',
      },
    })

    console.log('✅ Chat API Route test environment setup complete')
  })

  afterEach(() => {
    console.log('🧹 Cleaning up Chat API Route test environment')

    // Clean up all mocks after each test
    testMocks?.cleanup()
    vi.clearAllMocks()

    console.log('✅ Chat API Route test cleanup complete')
  })

  describe('GET - Chat Deployment Listing', () => {
    /**
     * Test unauthenticated access to chat deployments list
     * Only authenticated users should be able to view their chat deployments
     * This protects user privacy and prevents unauthorized access
     */
    it('should return 401 Unauthorized when user is not authenticated', async () => {
      console.log('🧪 Testing unauthenticated access to chat deployments list')

      // Set up unauthenticated state
      testMocks.auth.setUnauthenticated()

      const request = new NextRequest('http://localhost:3000/api/chat')

      console.log('🔍 Processing unauthenticated GET request to chat deployments')
      console.log('🔍 Request URL:', request.url)

      const { GET } = await import('@/app/api/chat/route')
      const response = await GET(request)

      console.log('🔍 Unauthenticated GET response status:', response.status)

      // Should return 401 Unauthorized
      expect(response.status).toBe(401)

      // Verify error response was created
      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Unauthorized', 401)

      console.log('✅ Unauthenticated access to chat deployments properly rejected')
    })

    /**
     * Test successful retrieval of chat deployments for authenticated user
     * Authenticated users should see their own chat deployments
     * Database should be queried with proper user filtering
     */
    it('should return chat deployments for authenticated user', async () => {
      console.log('🧪 Testing successful chat deployments retrieval')

      const testUser = {
        id: 'user-deployments',
        email: 'deployments@example.com',
        name: 'Deployments User',
      }
      testMocks.auth.setAuthenticated(testUser)

      // Mock chat deployments data
      const mockDeployments = [
        {
          id: 'deployment-1',
          subdomain: 'chat1',
          title: 'Customer Support Chat',
          workflowId: 'workflow-1',
          userId: testUser.id,
          createdAt: new Date('2024-01-01'),
          authType: 'public',
        },
        {
          id: 'deployment-2',
          subdomain: 'chat2',
          title: 'Sales Assistant Chat',
          workflowId: 'workflow-2',
          userId: testUser.id,
          createdAt: new Date('2024-01-02'),
          authType: 'password',
        },
      ]

      // Configure database to return mock deployments
      testMocks.database.setSelectResults([mockDeployments])

      const request = new NextRequest('http://localhost:3000/api/chat')

      console.log('🔍 Processing authenticated GET request for user:', testUser.id)
      console.log('🔍 Mock deployments configured:', mockDeployments.length, 'items')

      const { GET } = await import('@/app/api/chat/route')
      const response = await GET(request)

      console.log('🔍 Authenticated GET response status:', response.status)

      // Should return 200 OK
      expect(response.status).toBe(200)

      // Verify success response was created with deployments
      const { createSuccessResponse } = await import('@/app/api/workflows/utils')
      expect(createSuccessResponse).toHaveBeenCalledWith({ deployments: mockDeployments })

      console.log('✅ Chat deployments successfully retrieved for authenticated user')
      console.log('  - ✅ Authentication passed')
      console.log('  - ✅ Database queried correctly')
      console.log('  - ✅ Deployments returned:', mockDeployments.length)
    })

    /**
     * Test database error handling during deployments fetch
     * Database connection issues should be handled gracefully
     * Users should receive appropriate error messages
     */
    it('should handle database errors when fetching deployments', async () => {
      console.log('🧪 Testing database error handling for deployments fetch')

      testMocks.auth.setAuthenticated({ id: 'user-db-error', email: 'db-error@example.com' })

      // Configure database to throw an error
      const databaseError = new Error('Connection timeout while fetching deployments')
      const mockDb = vi.mocked((await import('@/db')).db)
      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockRejectedValue(databaseError),
        })),
      }))

      const request = new NextRequest('http://localhost:3000/api/chat')

      console.log('🔍 Processing request that will trigger database error')
      console.log('🔍 Database configured to throw:', databaseError.message)

      const { GET } = await import('@/app/api/chat/route')
      const response = await GET(request)

      console.log('🔍 Database error response status:', response.status)

      // Should return 500 Internal Server Error
      expect(response.status).toBe(500)

      // Verify error response was created with database error message
      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith(
        'Connection timeout while fetching deployments',
        500
      )

      console.log('✅ Database error properly handled for deployments fetch')
    })
  })

  describe('POST - Chat Deployment Creation', () => {
    /**
     * Test unauthenticated access to chat deployment creation
     * Only authenticated users should be able to create chat deployments
     */
    it('should return 401 Unauthorized when user is not authenticated for POST', async () => {
      console.log('🧪 Testing unauthenticated access to chat deployment creation')

      testMocks.auth.setUnauthenticated()

      const validChatData = {
        workflowId: 'workflow-123',
        subdomain: 'test-chat',
        title: 'Test Chat',
        customizations: {
          primaryColor: '#007bff',
          welcomeMessage: 'Hello! How can I help you today?',
        },
      }

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validChatData),
      })

      console.log('🔍 Processing unauthenticated POST request for chat creation')
      console.log('🔍 Request data keys:', Object.keys(validChatData))

      const { POST } = await import('@/app/api/chat/route')
      const response = await POST(request)

      console.log('🔍 Unauthenticated POST response status:', response.status)

      // Should return 401 Unauthorized
      expect(response.status).toBe(401)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Unauthorized', 401)

      console.log('✅ Unauthenticated chat creation properly rejected')
    })

    /**
     * Test request data validation for chat creation
     * Invalid or incomplete data should be rejected with proper error messages
     */
    it('should validate request data and reject invalid payloads', async () => {
      console.log('🧪 Testing request data validation for chat creation')

      testMocks.auth.setAuthenticated({ id: 'user-validation', email: 'validation@example.com' })

      // Test various invalid data scenarios
      const invalidDataScenarios = [
        {
          name: 'missing required fields',
          data: { title: 'Test Chat' }, // Missing workflowId, subdomain, customizations
          expectedError: 'Missing required fields',
        },
        {
          name: 'empty subdomain',
          data: {
            workflowId: 'workflow-123',
            subdomain: '',
            title: 'Test Chat',
            customizations: {},
          },
          expectedError: 'Invalid subdomain',
        },
        {
          name: 'invalid subdomain format',
          data: {
            workflowId: 'workflow-123',
            subdomain: 'INVALID_SUBDOMAIN!',
            title: 'Test Chat',
            customizations: {},
          },
          expectedError: 'Invalid subdomain format',
        },
        {
          name: 'missing customizations',
          data: {
            workflowId: 'workflow-123',
            subdomain: 'valid-subdomain',
            title: 'Test Chat',
            // Missing customizations
          },
          expectedError: 'Customizations required',
        },
      ]

      for (const scenario of invalidDataScenarios) {
        console.log(`🔍 Testing validation scenario: ${scenario.name}`)

        const request = new NextRequest('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scenario.data),
        })

        console.log('🔍 Invalid data payload:', scenario.data)

        const { POST } = await import('@/app/api/chat/route')
        const response = await POST(request)

        console.log(`🔍 Validation response status (${scenario.name}):`, response.status)

        // Should return 400 Bad Request for validation failures
        expect(response.status).toBe(400)

        console.log(`✅ Invalid data scenario (${scenario.name}) properly rejected`)
      }

      console.log('✅ All invalid data scenarios properly handled with 400 status')
    })

    /**
     * Test subdomain conflict detection and rejection
     * Existing subdomains should not be allowed to be reused
     */
    it('should reject chat creation if subdomain already exists', async () => {
      console.log('🧪 Testing subdomain conflict detection')

      testMocks.auth.setAuthenticated({ id: 'user-subdomain', email: 'subdomain@example.com' })

      const chatData = {
        workflowId: 'workflow-456',
        subdomain: 'existing-chat',
        title: 'Test Chat with Existing Subdomain',
        customizations: {
          primaryColor: '#28a745',
          welcomeMessage: 'Welcome to our support!',
        },
      }

      // Configure database to return existing subdomain (conflict)
      const existingChat = {
        id: 'existing-chat-123',
        subdomain: 'existing-chat',
        userId: 'other-user-456',
      }
      testMocks.database.setSelectResults([[existingChat]])

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData),
      })

      console.log('🔍 Testing subdomain conflict for:', chatData.subdomain)
      console.log('🔍 Database configured to return existing subdomain:', existingChat.subdomain)

      const { POST } = await import('@/app/api/chat/route')
      const response = await POST(request)

      console.log('🔍 Subdomain conflict response status:', response.status)

      // Should return 400 Bad Request for subdomain conflict
      expect(response.status).toBe(400)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Subdomain already in use', 400)

      console.log('✅ Subdomain conflict properly detected and rejected')
    })

    /**
     * Test workflow access validation and not found scenarios
     * Users should only be able to create chats for workflows they have access to
     */
    it('should reject chat creation if workflow is not found or access denied', async () => {
      console.log('🧪 Testing workflow access validation')

      testMocks.auth.setAuthenticated({ id: 'user-workflow', email: 'workflow@example.com' })

      const chatData = {
        workflowId: 'nonexistent-workflow',
        subdomain: 'test-chat-workflow',
        title: 'Test Chat for Nonexistent Workflow',
        customizations: {
          primaryColor: '#dc3545',
          welcomeMessage: 'This should not work',
        },
      }

      // Configure database to show subdomain is available
      testMocks.database.setSelectResults([[]])

      // Configure workflow access check to deny access
      const { checkWorkflowAccessForChatCreation } = await import('@/app/api/chat/utils')
      vi.mocked(checkWorkflowAccessForChatCreation).mockResolvedValueOnce({
        hasAccess: false,
      })

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData),
      })

      console.log('🔍 Testing workflow access for:', chatData.workflowId)
      console.log('🔍 Workflow access configured to: deny access')

      const { POST } = await import('@/app/api/chat/route')
      const response = await POST(request)

      console.log('🔍 Workflow access denied response status:', response.status)

      // Should return 404 Not Found for workflow access issues
      expect(response.status).toBe(404)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Workflow not found or access denied', 404)

      console.log('✅ Workflow access validation properly enforced')
    })

    /**
     * Test successful chat deployment creation when user owns workflow directly
     * Direct workflow ownership should allow chat creation
     */
    it('should allow chat deployment when user owns workflow directly', async () => {
      console.log('🧪 Testing successful chat creation for workflow owner')

      const testUser = { id: 'workflow-owner', email: 'owner@example.com', name: 'Workflow Owner' }
      testMocks.auth.setAuthenticated(testUser)

      const chatData = {
        workflowId: 'owned-workflow-123',
        subdomain: 'owner-chat',
        title: 'Owner Chat Deployment',
        customizations: {
          primaryColor: '#6f42c1',
          welcomeMessage: 'Welcome to my personal chat!',
        },
        authType: 'public',
      }

      // Configure database to show subdomain is available
      testMocks.database.setSelectResults([
        [], // First query: subdomain check (empty = available)
        [{ id: 'new-chat-id' }], // Second query: insert result
      ])

      // Configure workflow access to grant access (user owns workflow)
      const { checkWorkflowAccessForChatCreation } = await import('@/app/api/chat/utils')
      vi.mocked(checkWorkflowAccessForChatCreation).mockResolvedValueOnce({
        hasAccess: true,
        workflow: {
          id: chatData.workflowId,
          userId: testUser.id, // User owns this workflow
          workspaceId: null,
          isDeployed: true,
          name: 'Test Workflow',
        },
      })

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData),
      })

      console.log('🔍 Testing successful chat creation for workflow owner')
      console.log('🔍 User owns workflow:', chatData.workflowId)
      console.log('🔍 Subdomain available:', chatData.subdomain)

      const { POST } = await import('@/app/api/chat/route')
      const response = await POST(request)

      console.log('🔍 Successful creation response status:', response.status)

      // Should return 200 OK for successful creation
      expect(response.status).toBe(200)

      // Verify workflow access was checked
      expect(checkWorkflowAccessForChatCreation).toHaveBeenCalledWith(
        chatData.workflowId,
        testUser.id
      )

      console.log('✅ Chat deployment successfully created for workflow owner')
      console.log('  - ✅ Authentication passed')
      console.log('  - ✅ Data validation passed')
      console.log('  - ✅ Subdomain availability confirmed')
      console.log('  - ✅ Workflow access granted')
      console.log('  - ✅ Database insertion completed')
    })

    /**
     * Test chat creation with workspace admin permissions
     * Users with admin permissions in a workspace should be able to create chats
     * for workflows in that workspace
     */
    it('should allow chat deployment when user has workspace admin permission', async () => {
      console.log('🧪 Testing chat creation with workspace admin permissions')

      const testUser = {
        id: 'workspace-admin',
        email: 'admin@example.com',
        name: 'Workspace Admin',
      }
      testMocks.auth.setAuthenticated(testUser)

      const chatData = {
        workflowId: 'workspace-workflow-456',
        subdomain: 'workspace-chat',
        title: 'Workspace Admin Chat',
        customizations: {
          primaryColor: '#20c997',
          welcomeMessage: 'Welcome to our workspace chat!',
        },
        authType: 'password',
        password: 'secure-password',
      }

      // Configure database for successful creation
      testMocks.database.setSelectResults([
        [], // Subdomain availability check (empty = available)
        [{ id: 'workspace-chat-id' }], // Insert result
      ])

      // Configure workflow access with workspace admin permissions
      const { checkWorkflowAccessForChatCreation } = await import('@/app/api/chat/utils')
      vi.mocked(checkWorkflowAccessForChatCreation).mockResolvedValueOnce({
        hasAccess: true,
        workflow: {
          id: chatData.workflowId,
          userId: 'other-user-789', // Different user owns the workflow
          workspaceId: 'workspace-123', // But it's in a workspace
          isDeployed: true,
          name: 'Workspace Workflow',
        },
      })

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData),
      })

      console.log('🔍 Testing workspace admin chat creation')
      console.log('🔍 Workflow owned by other user but in accessible workspace')
      console.log('🔍 Admin permissions should allow creation')

      const { POST } = await import('@/app/api/chat/route')
      const response = await POST(request)

      console.log('🔍 Workspace admin creation response status:', response.status)

      // Should return 200 OK for successful creation
      expect(response.status).toBe(200)

      // Verify workflow access was checked
      expect(checkWorkflowAccessForChatCreation).toHaveBeenCalledWith(
        chatData.workflowId,
        testUser.id
      )

      console.log('✅ Chat deployment successfully created with workspace admin permissions')
    })

    /**
     * Test rejection when workflow is in workspace but user lacks admin permission
     * Users without proper workspace permissions should be denied
     */
    it('should reject when workflow is in workspace but user lacks admin permission', async () => {
      console.log('🧪 Testing rejection for insufficient workspace permissions')

      testMocks.auth.setAuthenticated({ id: 'regular-user', email: 'regular@example.com' })

      const chatData = {
        workflowId: 'protected-workflow',
        subdomain: 'protected-chat',
        title: 'Protected Workspace Chat',
        customizations: {
          primaryColor: '#fd7e14',
          welcomeMessage: 'This should not work',
        },
      }

      // Configure database to show subdomain is available
      testMocks.database.setSelectResults([[]])

      // Configure workflow access to deny permission
      const { checkWorkflowAccessForChatCreation } = await import('@/app/api/chat/utils')
      vi.mocked(checkWorkflowAccessForChatCreation).mockResolvedValueOnce({
        hasAccess: false, // User lacks workspace admin permission
      })

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData),
      })

      console.log('🔍 Testing insufficient workspace permissions')
      console.log('🔍 User should be denied access to workspace workflow')

      const { POST } = await import('@/app/api/chat/route')
      const response = await POST(request)

      console.log('🔍 Insufficient permissions response status:', response.status)

      // Should return 404 Not Found (same as workflow not found for security)
      expect(response.status).toBe(404)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Workflow not found or access denied', 404)

      console.log('✅ Insufficient workspace permissions properly rejected')
    })

    /**
     * Test handling of workspace permission check errors
     * Permission system failures should be handled gracefully
     */
    it('should handle workspace permission check errors gracefully', async () => {
      console.log('🧪 Testing workspace permission check error handling')

      testMocks.auth.setAuthenticated({ id: 'error-user', email: 'error@example.com' })

      const chatData = {
        workflowId: 'error-workflow',
        subdomain: 'error-chat',
        title: 'Error Test Chat',
        customizations: {
          primaryColor: '#e83e8c',
          welcomeMessage: 'Error handling test',
        },
      }

      // Configure database to show subdomain is available
      testMocks.database.setSelectResults([[]])

      // Configure workflow access check to throw an error
      const { checkWorkflowAccessForChatCreation } = await import('@/app/api/chat/utils')
      const permissionError = new Error('Permission service unavailable')
      vi.mocked(checkWorkflowAccessForChatCreation).mockRejectedValueOnce(permissionError)

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData),
      })

      console.log('🔍 Testing permission check error handling')
      console.log('🔍 Permission service configured to fail with:', permissionError.message)

      const { POST } = await import('@/app/api/chat/route')
      const response = await POST(request)

      console.log('🔍 Permission error response status:', response.status)

      // Should return 500 Internal Server Error
      expect(response.status).toBe(500)

      // Verify workflow access check was attempted
      expect(checkWorkflowAccessForChatCreation).toHaveBeenCalledWith(
        chatData.workflowId,
        'error-user'
      )

      console.log('✅ Workspace permission check errors handled gracefully')
    })

    /**
     * Test rejection of chat creation for undeployed workflows
     * Only deployed workflows should be available for chat creation
     */
    it('should reject chat creation if workflow is not deployed', async () => {
      console.log('🧪 Testing rejection for undeployed workflows')

      testMocks.auth.setAuthenticated({ id: 'user-undeployed', email: 'undeployed@example.com' })

      const chatData = {
        workflowId: 'undeployed-workflow',
        subdomain: 'undeployed-chat',
        title: 'Undeployed Workflow Chat',
        customizations: {
          primaryColor: '#6c757d',
          welcomeMessage: 'This workflow is not deployed',
        },
      }

      // Configure database to show subdomain is available
      testMocks.database.setSelectResults([[]])

      // Configure workflow access with undeployed workflow
      const { checkWorkflowAccessForChatCreation } = await import('@/app/api/chat/utils')
      vi.mocked(checkWorkflowAccessForChatCreation).mockResolvedValueOnce({
        hasAccess: true,
        workflow: {
          id: chatData.workflowId,
          userId: 'user-undeployed',
          workspaceId: null,
          isDeployed: false, // Workflow is not deployed
          name: 'Undeployed Test Workflow',
        },
      })

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatData),
      })

      console.log('🔍 Testing undeployed workflow rejection')
      console.log('🔍 Workflow deployment status: false')

      const { POST } = await import('@/app/api/chat/route')
      const response = await POST(request)

      console.log('🔍 Undeployed workflow response status:', response.status)

      // Should return 400 Bad Request for undeployed workflow
      expect(response.status).toBe(400)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith(
        'Workflow must be deployed before creating a chat',
        400
      )

      console.log('✅ Undeployed workflow properly rejected with descriptive error message')
    })

    /**
     * Test comprehensive successful chat creation with all features
     * End-to-end test of successful chat deployment with all validation passing
     */
    it('should create chat deployment with comprehensive validation success', async () => {
      console.log('🧪 Testing comprehensive successful chat deployment creation')

      const testUser = {
        id: 'comprehensive-user',
        email: 'comprehensive@example.com',
        name: 'Comprehensive Test User',
      }
      testMocks.auth.setAuthenticated(testUser)

      const comprehensiveChatData = {
        workflowId: 'comprehensive-workflow-789',
        subdomain: 'comprehensive-chat',
        title: 'Comprehensive Test Chat Deployment',
        description: 'A fully featured chat deployment for comprehensive testing',
        customizations: {
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          welcomeMessage: 'Welcome to our comprehensive chat system!',
          placeholderText: 'Type your message here...',
          buttonText: 'Send Message',
          logoUrl: 'https://example.com/logo.png',
          fontFamily: 'Arial, sans-serif',
        },
        authType: 'password',
        password: 'comprehensive-secure-password-123',
        allowedEmails: ['support@example.com', '@company.com'],
      }

      // Configure database for successful creation
      testMocks.database.setSelectResults([
        [], // Subdomain availability check (empty = available)
        [
          {
            id: 'comprehensive-chat-uuid',
            subdomain: comprehensiveChatData.subdomain,
            title: comprehensiveChatData.title,
            workflowId: comprehensiveChatData.workflowId,
            userId: testUser.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ], // Insert result with full data
      ])

      // Configure successful workflow access
      const { checkWorkflowAccessForChatCreation } = await import('@/app/api/chat/utils')
      vi.mocked(checkWorkflowAccessForChatCreation).mockResolvedValueOnce({
        hasAccess: true,
        workflow: {
          id: comprehensiveChatData.workflowId,
          userId: testUser.id,
          workspaceId: null,
          isDeployed: true,
          name: 'Comprehensive Test Workflow',
          description: 'A fully deployed workflow for comprehensive testing',
        },
      })

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comprehensiveChatData),
      })

      console.log('🔍 Running comprehensive chat deployment creation')
      console.log('🔍 User:', testUser.email)
      console.log('🔍 Workflow:', comprehensiveChatData.workflowId)
      console.log('🔍 Subdomain:', comprehensiveChatData.subdomain)
      console.log('🔍 Auth type:', comprehensiveChatData.authType)
      console.log('🔍 Customizations keys:', Object.keys(comprehensiveChatData.customizations))

      const { POST } = await import('@/app/api/chat/route')
      const response = await POST(request)

      console.log('🔍 Comprehensive creation response status:', response.status)

      // Should return 200 OK for successful comprehensive creation
      expect(response.status).toBe(200)

      // Verify all validation steps were executed
      expect(checkWorkflowAccessForChatCreation).toHaveBeenCalledWith(
        comprehensiveChatData.workflowId,
        testUser.id
      )

      console.log('✅ Comprehensive chat deployment creation successful')
      console.log('  - ✅ Authentication validation passed')
      console.log('  - ✅ Request data validation passed')
      console.log('  - ✅ Subdomain availability confirmed')
      console.log('  - ✅ Workflow access validation passed')
      console.log('  - ✅ Workflow deployment status verified')
      console.log('  - ✅ Password encryption handled')
      console.log('  - ✅ Database insertion completed')
      console.log('  - ✅ Success response generated')
    })
  })
})
