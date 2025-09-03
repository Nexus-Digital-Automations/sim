/**
 * Chat Subdomain Dynamic Route Tests - Comprehensive Bun/Vitest Compatible Test Suite
 *
 * This file contains comprehensive tests for the dynamic chat subdomain route including:
 * - Chat deployment discovery and information retrieval (GET)
 * - Chat message processing and workflow execution (POST)
 * - Authentication workflows for protected chats (password, email)
 * - Streaming response handling for real-time chat interactions
 * - Error handling for inactive chats, missing workflows, and execution failures
 * - CORS header management for cross-origin chat widget integration
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Import enhanced test infrastructure for bun/vitest compatibility
import '@/app/api/__test-utils__/module-mocks'
import {
  createEnhancedMockRequest,
  setupEnhancedTestMocks,
} from '@/app/api/__test-utils__/enhanced-utils'

// Mock chat utilities with comprehensive chat functionality
vi.mock('@/app/api/chat/utils', () => {
  console.log('📦 Mocking @/app/api/chat/utils for chat subdomain route tests')
  return {
    addCorsHeaders: vi.fn().mockImplementation((response, request) => {
      console.log('🔍 addCorsHeaders called for response')
      return response
    }),
    validateChatAuth: vi
      .fn()
      .mockImplementation(async (requestId, deployment, request, parsedBody) => {
        console.log('🔍 validateChatAuth called for deployment:', deployment?.id || 'unknown')
        // Default to authorized for most tests
        return { authorized: true }
      }),
    setChatAuthCookie: vi.fn().mockImplementation((response, subdomainId, type) => {
      console.log('🔍 setChatAuthCookie called for subdomain:', subdomainId, 'type:', type)
      return response
    }),
    validateAuthToken: vi.fn().mockImplementation((token, subdomainId) => {
      console.log('🔍 validateAuthToken called for subdomain:', subdomainId)
      return true
    }),
    executeWorkflowForChat: vi.fn().mockImplementation(async (chatId, input, conversationId) => {
      console.log('🔍 executeWorkflowForChat called with:', {
        chatId,
        input: `${input?.substring(0, 50)}...`,
        conversationId,
      })

      // Return a mock streaming response
      return new ReadableStream({
        start(controller) {
          console.log('🔍 Starting mock chat stream for input:', `${input?.substring(0, 20)}...`)

          // Simulate streaming chat response chunks
          controller.enqueue(
            new TextEncoder().encode('data: {"blockId":"agent-1","chunk":"Hello"}\n\n')
          )
          controller.enqueue(
            new TextEncoder().encode('data: {"blockId":"agent-1","chunk":" there!"}\n\n')
          )
          controller.enqueue(
            new TextEncoder().encode('data: {"event":"final","data":{"success":true}}\n\n')
          )
          controller.close()
        },
      })
    }),
  }
})

// Mock workflow utilities for response handling
vi.mock('@/app/api/workflows/utils', () => {
  console.log('📦 Mocking @/app/api/workflows/utils for subdomain route response handling')
  return {
    createErrorResponse: vi.fn().mockImplementation((message, status, code) => {
      console.log('🔍 createErrorResponse called:', { message, status, code })
      return new Response(
        JSON.stringify({
          error: code || 'Error',
          message,
        }),
        { status }
      )
    }),
    createSuccessResponse: vi.fn().mockImplementation((data) => {
      console.log('🔍 createSuccessResponse called with data keys:', Object.keys(data || {}))
      return new Response(JSON.stringify(data), { status: 200 })
    }),
  }
})

describe('Chat Subdomain Dynamic Route - Comprehensive Test Suite', () => {
  let testMocks: any

  // Sample chat deployment data for testing
  const sampleChatDeployment = {
    id: 'chat-deployment-123',
    workflowId: 'workflow-456',
    userId: 'user-789',
    subdomain: 'test-chat',
    title: 'Test Chat Deployment',
    description: 'A comprehensive test chat deployment for testing purposes',
    isActive: true,
    authType: 'public',
    customizations: {
      welcomeMessage: 'Welcome to our test chat!',
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      placeholderText: 'Type your message here...',
      buttonText: 'Send Message',
    },
    outputConfigs: [
      { blockId: 'agent-1', path: 'output' },
      { blockId: 'agent-2', path: 'response' },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  // Sample workflow data for testing
  const sampleWorkflow = {
    id: 'workflow-456',
    isDeployed: true,
    state: {
      blocks: {
        'agent-1': { type: 'agent', config: {} },
        'agent-2': { type: 'agent', config: {} },
      },
      edges: [{ from: 'agent-1', to: 'agent-2' }],
      loops: {},
      parallels: {},
    },
    deployedState: {
      blocks: {
        'agent-1': { type: 'agent', config: {} },
        'agent-2': { type: 'agent', config: {} },
      },
      edges: [{ from: 'agent-1', to: 'agent-2' }],
      loops: {},
      parallels: {},
    },
  }

  beforeEach(() => {
    console.log('🚀 Setting up Chat Subdomain Dynamic Route test environment')

    // Clear all mocks to ensure clean state
    vi.clearAllMocks()

    // Setup enhanced test mocks with chat subdomain specific configuration
    testMocks = setupEnhancedTestMocks({
      auth: {
        authenticated: false, // Most chat routes are public
      },
      database: {
        select: {
          results: [
            [sampleChatDeployment], // First query returns chat deployment
            [sampleWorkflow], // Second query returns workflow
          ],
        },
      },
    })

    console.log('✅ Chat Subdomain Dynamic Route test environment setup complete')
  })

  afterEach(() => {
    console.log('🧹 Cleaning up Chat Subdomain Dynamic Route test environment')

    // Clean up all mocks after each test
    testMocks?.cleanup()
    vi.clearAllMocks()

    console.log('✅ Chat Subdomain Dynamic Route test cleanup complete')
  })

  describe('GET - Chat Information Retrieval', () => {
    /**
     * Test successful chat information retrieval for valid subdomain
     * GET requests should return chat configuration and customizations
     * This allows chat widgets to configure themselves properly
     */
    it('should return chat information for valid subdomain', async () => {
      console.log('🧪 Testing successful chat information retrieval')

      const request = createEnhancedMockRequest('GET')
      const params = Promise.resolve({ subdomain: 'test-chat' })

      console.log('🔍 Processing GET request for subdomain: test-chat')
      console.log('🔍 Expected chat deployment:', sampleChatDeployment.id)

      const { GET } = await import('@/app/api/chat/[subdomain]/route')
      const response = await GET(request, { params })

      console.log('🔍 Chat info retrieval response status:', response.status)

      // Should return 200 OK with chat information
      expect(response.status).toBe(200)

      const responseData = await response.json()
      console.log('🔍 Response data keys:', Object.keys(responseData))

      // Verify essential chat information is returned
      expect(responseData).toHaveProperty('id', sampleChatDeployment.id)
      expect(responseData).toHaveProperty('title', sampleChatDeployment.title)
      expect(responseData).toHaveProperty('description', sampleChatDeployment.description)
      expect(responseData).toHaveProperty('customizations')
      expect(responseData.customizations).toHaveProperty(
        'welcomeMessage',
        'Welcome to our test chat!'
      )
      expect(responseData.customizations).toHaveProperty('primaryColor', '#007bff')

      console.log('✅ Chat information successfully retrieved for valid subdomain')
      console.log('  - ✅ Subdomain lookup successful')
      console.log('  - ✅ Chat configuration returned')
      console.log('  - ✅ Customizations included')
      console.log('  - ✅ Response structure validated')
    })

    /**
     * Test 404 response for non-existent subdomains
     * Invalid or non-existent subdomains should return proper error
     */
    it('should return 404 Not Found for non-existent subdomain', async () => {
      console.log('🧪 Testing 404 response for non-existent subdomain')

      // Configure database to return no chat deployments (not found)
      testMocks.database.setSelectResults([[]])

      const request = createEnhancedMockRequest('GET')
      const params = Promise.resolve({ subdomain: 'nonexistent-chat' })

      console.log('🔍 Processing GET request for non-existent subdomain: nonexistent-chat')
      console.log('🔍 Database configured to return: empty results')

      const { GET } = await import('@/app/api/chat/[subdomain]/route')
      const response = await GET(request, { params })

      console.log('🔍 Non-existent subdomain response status:', response.status)

      // Should return 404 Not Found
      expect(response.status).toBe(404)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData).toHaveProperty('message', 'Chat not found')

      console.log('✅ Non-existent subdomain properly handled with 404 response')
    })

    /**
     * Test 403 response for inactive chat deployments
     * Inactive or disabled chats should be inaccessible to users
     */
    it('should return 403 Forbidden for inactive chat deployments', async () => {
      console.log('🧪 Testing 403 response for inactive chat deployments')

      // Configure chat deployment as inactive
      const inactiveChatDeployment = {
        ...sampleChatDeployment,
        id: 'inactive-chat-123',
        isActive: false,
        title: 'Inactive Test Chat',
      }

      testMocks.database.setSelectResults([[inactiveChatDeployment]])

      const request = createEnhancedMockRequest('GET')
      const params = Promise.resolve({ subdomain: 'inactive-chat' })

      console.log('🔍 Processing GET request for inactive chat deployment')
      console.log('🔍 Chat deployment active status:', inactiveChatDeployment.isActive)

      const { GET } = await import('@/app/api/chat/[subdomain]/route')
      const response = await GET(request, { params })

      console.log('🔍 Inactive chat response status:', response.status)

      // Should return 403 Forbidden
      expect(response.status).toBe(403)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData).toHaveProperty('message', 'This chat is currently unavailable')

      console.log('✅ Inactive chat deployment properly blocked with 403 response')
    })

    /**
     * Test 401 response when authentication is required
     * Password or email protected chats should prompt for authentication
     */
    it('should return 401 Unauthorized when authentication is required', async () => {
      console.log('🧪 Testing 401 response for authentication required scenario')

      // Configure chat deployment as password protected
      const protectedChatDeployment = {
        ...sampleChatDeployment,
        id: 'protected-chat-123',
        authType: 'password',
        title: 'Password Protected Chat',
      }

      testMocks.database.setSelectResults([[protectedChatDeployment]])

      // Configure authentication validation to require auth
      const { validateChatAuth } = await import('@/app/api/chat/utils')
      vi.mocked(validateChatAuth).mockResolvedValueOnce({
        authorized: false,
        error: 'auth_required_password',
      })

      const request = createEnhancedMockRequest('GET')
      const params = Promise.resolve({ subdomain: 'protected-chat' })

      console.log('🔍 Processing GET request for password-protected chat')
      console.log('🔍 Authentication configured to: require password')

      const { GET } = await import('@/app/api/chat/[subdomain]/route')
      const response = await GET(request, { params })

      console.log('🔍 Authentication required response status:', response.status)

      // Should return 401 Unauthorized
      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData).toHaveProperty('message', 'auth_required_password')

      console.log('✅ Authentication requirement properly enforced with 401 response')
    })
  })

  describe('POST - Chat Message Processing', () => {
    /**
     * Test successful authentication request handling
     * POST requests with authentication data (password, email) should be processed
     */
    it('should handle authentication requests without chat input', async () => {
      console.log('🧪 Testing authentication request handling')

      const authRequest = createEnhancedMockRequest('POST', {
        password: 'secure-chat-password',
      })
      const params = Promise.resolve({ subdomain: 'password-protected-chat' })

      console.log('🔍 Processing POST authentication request')
      console.log('🔍 Request includes password for authentication')

      const { POST } = await import('@/app/api/chat/[subdomain]/route')
      const response = await POST(authRequest, { params })

      console.log('🔍 Authentication request response status:', response.status)

      // Should return 200 OK for successful authentication
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('authenticated', true)

      // Verify authentication cookie was set
      const { setChatAuthCookie } = await import('@/app/api/chat/utils')
      expect(setChatAuthCookie).toHaveBeenCalled()

      console.log('✅ Authentication request successfully processed')
      console.log('  - ✅ Password authentication accepted')
      console.log('  - ✅ Authentication cookie set')
      console.log('  - ✅ Success response returned')
    })

    /**
     * Test 400 response for requests without input or authentication
     * Empty POST requests should be rejected with proper error message
     */
    it('should return 400 Bad Request for empty POST requests', async () => {
      console.log('🧪 Testing 400 response for empty POST requests')

      const emptyRequest = createEnhancedMockRequest('POST', {})
      const params = Promise.resolve({ subdomain: 'test-chat' })

      console.log('🔍 Processing empty POST request')
      console.log('🔍 Request body is empty (no input or auth data)')

      const { POST } = await import('@/app/api/chat/[subdomain]/route')
      const response = await POST(emptyRequest, { params })

      console.log('🔍 Empty request response status:', response.status)

      // Should return 400 Bad Request
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData).toHaveProperty('message', 'No input provided')

      console.log('✅ Empty POST request properly rejected with 400 response')
    })

    /**
     * Test 401 response for unauthorized chat access
     * Protected chats should reject unauthorized users
     */
    it('should return 401 Unauthorized for protected chat access', async () => {
      console.log('🧪 Testing 401 response for unauthorized chat access')

      // Configure authentication validation to deny access
      const { validateChatAuth } = await import('@/app/api/chat/utils')
      vi.mocked(validateChatAuth).mockResolvedValueOnce({
        authorized: false,
        error: 'Invalid password',
      })

      const unauthorizedRequest = createEnhancedMockRequest('POST', {
        input: 'Hello, I should not be able to chat!',
      })
      const params = Promise.resolve({ subdomain: 'protected-chat' })

      console.log('🔍 Processing unauthorized chat request')
      console.log('🔍 Authentication configured to: deny access')

      const { POST } = await import('@/app/api/chat/[subdomain]/route')
      const response = await POST(unauthorizedRequest, { params })

      console.log('🔍 Unauthorized access response status:', response.status)

      // Should return 401 Unauthorized
      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData).toHaveProperty('message', 'Invalid password')

      console.log('✅ Unauthorized access properly blocked with 401 response')
    })

    /**
     * Test 503 response when workflow is not available
     * Chats with undeployed or unavailable workflows should return service unavailable
     */
    it('should return 503 Service Unavailable when workflow is not available', async () => {
      console.log('🧪 Testing 503 response for unavailable workflow')

      // Configure workflow as not deployed (unavailable)
      const unavailableWorkflow = {
        ...sampleWorkflow,
        isDeployed: false,
      }

      testMocks.database.setSelectResults([
        [sampleChatDeployment], // Chat deployment exists
        [unavailableWorkflow], // But workflow is not deployed
      ])

      const chatRequest = createEnhancedMockRequest('POST', {
        input: 'Hello, this should fail!',
      })
      const params = Promise.resolve({ subdomain: 'test-chat' })

      console.log('🔍 Processing chat request with unavailable workflow')
      console.log('🔍 Workflow deployment status:', unavailableWorkflow.isDeployed)

      const { POST } = await import('@/app/api/chat/[subdomain]/route')
      const response = await POST(chatRequest, { params })

      console.log('🔍 Unavailable workflow response status:', response.status)

      // Should return 503 Service Unavailable
      expect(response.status).toBe(503)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData).toHaveProperty('message', 'Chat workflow is not available')

      console.log('✅ Unavailable workflow properly handled with 503 response')
    })

    /**
     * Test successful streaming response for valid chat messages
     * Valid chat messages should trigger workflow execution and return streaming response
     */
    it('should return streaming response for valid chat messages', async () => {
      console.log('🧪 Testing successful streaming response for chat messages')

      const chatMessage = 'Hello! How can you help me today?'
      const conversationId = 'conv-test-123'

      const chatRequest = createEnhancedMockRequest('POST', {
        input: chatMessage,
        conversationId: conversationId,
      })
      const params = Promise.resolve({ subdomain: 'test-chat' })

      console.log('🔍 Processing valid chat message')
      console.log('🔍 Message:', `${chatMessage.substring(0, 30)}...`)
      console.log('🔍 Conversation ID:', conversationId)

      const { POST } = await import('@/app/api/chat/[subdomain]/route')
      const response = await POST(chatRequest, { params })

      console.log('🔍 Streaming response status:', response.status)
      console.log('🔍 Response headers:', {
        contentType: response.headers.get('Content-Type'),
        cacheControl: response.headers.get('Cache-Control'),
        connection: response.headers.get('Connection'),
      })

      // Should return 200 OK with streaming headers
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')

      // Verify workflow execution was triggered
      const { executeWorkflowForChat } = await import('@/app/api/chat/utils')
      expect(executeWorkflowForChat).toHaveBeenCalledWith(
        sampleChatDeployment.id,
        chatMessage,
        conversationId
      )

      console.log('✅ Streaming response successfully generated for chat message')
      console.log('  - ✅ Streaming headers set correctly')
      console.log('  - ✅ Workflow execution triggered')
      console.log('  - ✅ Conversation context preserved')
    })

    /**
     * Test streaming response body content
     * Verify that the streaming response can be read and contains expected data
     */
    it('should handle streaming response body correctly', async () => {
      console.log('🧪 Testing streaming response body content')

      const chatRequest = createEnhancedMockRequest('POST', {
        input: 'Test streaming response',
      })
      const params = Promise.resolve({ subdomain: 'test-chat' })

      console.log('🔍 Processing chat request for streaming body test')

      const { POST } = await import('@/app/api/chat/[subdomain]/route')
      const response = await POST(chatRequest, { params })

      console.log('🔍 Streaming body response status:', response.status)

      // Should return 200 OK with ReadableStream body
      expect(response.status).toBe(200)
      expect(response.body).toBeInstanceOf(ReadableStream)

      // Test that we can read from the response stream
      if (response.body) {
        console.log('🔍 Reading from response stream')

        const reader = response.body.getReader()
        const { value, done } = await reader.read()

        if (!done && value) {
          const chunk = new TextDecoder().decode(value)
          console.log('🔍 First chunk content:', `${chunk.substring(0, 100)}...`)

          // Verify chunk follows Server-Sent Events format
          expect(chunk).toMatch(/^data: /)
        }

        reader.releaseLock()
        console.log('🔍 Stream reader released')
      }

      console.log('✅ Streaming response body handled correctly')
    })

    /**
     * Test workflow execution error handling
     * Execution failures should be handled gracefully with proper error responses
     */
    it('should handle workflow execution errors gracefully', async () => {
      console.log('🧪 Testing workflow execution error handling')

      // Configure workflow execution to throw an error
      const { executeWorkflowForChat } = await import('@/app/api/chat/utils')
      const executionError = new Error('Workflow execution failed - AI service unavailable')
      vi.mocked(executeWorkflowForChat).mockRejectedValueOnce(executionError)

      const chatRequest = createEnhancedMockRequest('POST', {
        input: 'This message will trigger an error',
      })
      const params = Promise.resolve({ subdomain: 'test-chat' })

      console.log('🔍 Processing chat request that will trigger execution error')
      console.log('🔍 Execution configured to fail with:', executionError.message)

      const { POST } = await import('@/app/api/chat/[subdomain]/route')
      const response = await POST(chatRequest, { params })

      console.log('🔍 Execution error response status:', response.status)

      // Should return 500 Internal Server Error
      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData).toHaveProperty('message', executionError.message)

      console.log('✅ Workflow execution error handled gracefully')
    })

    /**
     * Test invalid JSON request body handling
     * Malformed request bodies should be handled with proper error responses
     */
    it('should handle invalid JSON in request body', async () => {
      console.log('🧪 Testing invalid JSON request body handling')

      // Create a request with invalid JSON
      const invalidJsonRequest = {
        method: 'POST',
        headers: new Headers(),
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON - malformed syntax')),
      } as any

      const params = Promise.resolve({ subdomain: 'test-chat' })

      console.log('🔍 Processing request with invalid JSON body')

      const { POST } = await import('@/app/api/chat/[subdomain]/route')
      const response = await POST(invalidJsonRequest, { params })

      console.log('🔍 Invalid JSON response status:', response.status)

      // Should return 400 Bad Request
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData).toHaveProperty('message', 'Invalid request body')

      console.log('✅ Invalid JSON request body handled with proper error response')
    })

    /**
     * Test conversation ID parameter handling
     * Conversation ID should be properly passed to workflow execution
     */
    it('should pass conversation ID to workflow execution when provided', async () => {
      console.log('🧪 Testing conversation ID parameter handling')

      const testConversationId = 'test-conversation-456'
      const testInput = 'Continue our previous conversation'

      const conversationRequest = createEnhancedMockRequest('POST', {
        input: testInput,
        conversationId: testConversationId,
      })
      const params = Promise.resolve({ subdomain: 'test-chat' })

      console.log('🔍 Processing chat request with conversation ID:', testConversationId)

      const { POST } = await import('@/app/api/chat/[subdomain]/route')
      await POST(conversationRequest, { params })

      // Verify conversation ID was passed to workflow execution
      const { executeWorkflowForChat } = await import('@/app/api/chat/utils')
      expect(executeWorkflowForChat).toHaveBeenCalledWith(
        sampleChatDeployment.id,
        testInput,
        testConversationId
      )

      console.log('✅ Conversation ID properly passed to workflow execution')
    })

    /**
     * Test missing conversation ID handling
     * Workflow execution should handle missing conversation ID gracefully
     */
    it('should handle missing conversation ID gracefully', async () => {
      console.log('🧪 Testing missing conversation ID handling')

      const noConversationRequest = createEnhancedMockRequest('POST', {
        input: 'New conversation without ID',
      })
      const params = Promise.resolve({ subdomain: 'test-chat' })

      console.log('🔍 Processing chat request without conversation ID')

      const { POST } = await import('@/app/api/chat/[subdomain]/route')
      await POST(noConversationRequest, { params })

      // Verify workflow execution was called with undefined conversation ID
      const { executeWorkflowForChat } = await import('@/app/api/chat/utils')
      expect(executeWorkflowForChat).toHaveBeenCalledWith(
        sampleChatDeployment.id,
        'New conversation without ID',
        undefined
      )

      console.log('✅ Missing conversation ID handled gracefully with undefined value')
    })

    /**
     * Test comprehensive chat workflow with authentication and streaming
     * End-to-end test of complete chat interaction workflow
     */
    it('should handle comprehensive chat workflow with authentication and streaming', async () => {
      console.log('🧪 Testing comprehensive chat workflow')

      // Configure password-protected chat
      const protectedChatDeployment = {
        ...sampleChatDeployment,
        authType: 'password',
        title: 'Protected Comprehensive Chat',
      }

      testMocks.database.setSelectResults([[protectedChatDeployment], [sampleWorkflow]])

      // First request: Authentication with password
      console.log('🔍 Step 1: Testing authentication request')
      const authRequest = createEnhancedMockRequest('POST', {
        password: 'correct-password',
      })
      const params = Promise.resolve({ subdomain: 'protected-comprehensive-chat' })

      const { POST } = await import('@/app/api/chat/[subdomain]/route')
      const authResponse = await POST(authRequest, { params })

      expect(authResponse.status).toBe(200)
      const authData = await authResponse.json()
      expect(authData).toHaveProperty('authenticated', true)
      console.log('✅ Authentication step completed successfully')

      // Second request: Chat message after authentication
      console.log('🔍 Step 2: Testing authenticated chat message')
      const chatRequest = createEnhancedMockRequest('POST', {
        input: 'Hello, I am now authenticated and ready to chat!',
        conversationId: 'comprehensive-conv-789',
      })

      const chatResponse = await POST(chatRequest, { params })

      expect(chatResponse.status).toBe(200)
      expect(chatResponse.headers.get('Content-Type')).toBe('text/event-stream')
      expect(chatResponse.body).toBeInstanceOf(ReadableStream)
      console.log('✅ Authenticated chat message processed with streaming response')

      // Verify workflow execution was triggered with proper parameters
      const { executeWorkflowForChat } = await import('@/app/api/chat/utils')
      expect(executeWorkflowForChat).toHaveBeenCalledWith(
        protectedChatDeployment.id,
        'Hello, I am now authenticated and ready to chat!',
        'comprehensive-conv-789'
      )

      console.log('✅ Comprehensive chat workflow completed successfully')
      console.log('  - ✅ Password authentication workflow')
      console.log('  - ✅ Authenticated message processing')
      console.log('  - ✅ Streaming response generation')
      console.log('  - ✅ Conversation context preservation')
    })
  })
})
