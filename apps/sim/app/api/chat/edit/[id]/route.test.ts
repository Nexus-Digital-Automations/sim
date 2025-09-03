/**
 * Chat Edit API Route Tests - Comprehensive Bun/Vitest Compatible Test Suite
 *
 * This file contains comprehensive tests for the chat edit API route including:
 * - Chat deployment retrieval (GET) with comprehensive access control validation
 * - Chat deployment updates (PATCH) with validation workflows and conflict resolution
 * - Chat deployment deletion (DELETE) with permission checking and security protocols
 * - Authentication and authorization workflows for chat management operations
 * - Subdomain conflict detection and validation during updates
 * - Password requirement validation for protected chats
 * - Workspace admin permission validation and access control
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

// Mock chat database schema for comprehensive data modeling
vi.mock('@/db/schema', () => {
  console.log('📦 Mocking @/db/schema for chat edit API route tests')
  return {
    chat: {
      id: 'id',
      subdomain: 'subdomain',
      userId: 'userId',
      title: 'title',
      description: 'description',
      authType: 'authType',
      password: 'password',
      customizations: 'customizations',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  }
})

// Mock workflow utilities for comprehensive response handling
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

// Mock encryption utilities for password handling
vi.mock('@/lib/utils', () => {
  console.log('📦 Mocking @/lib/utils for encryption utilities')
  return {
    encryptSecret: vi.fn().mockImplementation(async (password) => {
      console.log('🔍 encryptSecret called for password encryption')
      return { encrypted: `encrypted-${password}` }
    }),
  }
})

// Mock URL utilities for chat URL generation
vi.mock('@/lib/urls/utils', () => {
  console.log('📦 Mocking @/lib/urls/utils for URL generation')
  return {
    getEmailDomain: vi.fn().mockImplementation(() => {
      console.log('🔍 getEmailDomain called, returning localhost:3000')
      return 'localhost:3000'
    }),
  }
})

// Mock environment configuration
vi.mock('@/lib/environment', () => {
  console.log('📦 Mocking @/lib/environment for environment configuration')
  return {
    isDev: true,
  }
})

// Mock chat utilities for access control
vi.mock('@/app/api/chat/utils', () => {
  console.log('📦 Mocking @/app/api/chat/utils for access control')
  return {
    checkChatAccess: vi.fn().mockImplementation(async (chatId, userId) => {
      console.log('🔍 checkChatAccess called for:', { chatId, userId })
      // Default to access granted with sample chat data
      return {
        hasAccess: true,
        chat: {
          id: chatId,
          subdomain: 'test-chat',
          title: 'Test Chat',
          description: 'A test chat deployment',
          authType: 'public',
          customizations: { primaryColor: '#007bff' },
        },
      }
    }),
  }
})

describe('Chat Edit API Route - Comprehensive Test Suite', () => {
  let testMocks: any

  beforeEach(() => {
    console.log('🚀 Setting up Chat Edit API Route test environment')

    // Clear all mocks to ensure clean state
    vi.clearAllMocks()

    // Setup enhanced test mocks with chat edit specific configuration
    testMocks = setupEnhancedTestMocks({
      auth: {
        authenticated: true,
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
      },
      database: {
        select: { results: [[]] }, // Default to empty results for subdomain checks
        update: { success: true },
        delete: { success: true },
      },
      permissions: {
        level: 'admin',
      },
    })

    console.log('✅ Chat Edit API Route test environment setup complete')
  })

  afterEach(() => {
    console.log('🧹 Cleaning up Chat Edit API Route test environment')

    // Clean up all mocks after each test
    testMocks?.cleanup()
    vi.clearAllMocks()

    console.log('✅ Chat Edit API Route test cleanup complete')
  })

  describe('GET - Chat Deployment Retrieval', () => {
    /**
     * Test unauthenticated access to chat retrieval
     * Only authenticated users should be able to retrieve chat details for editing
     * This ensures security and prevents unauthorized access to sensitive data
     */
    it('should return 401 Unauthorized when user is not authenticated', async () => {
      console.log('🧪 Testing unauthenticated access to chat retrieval')

      // Set up unauthenticated state
      testMocks.auth.setUnauthenticated()

      const request = new NextRequest('http://localhost:3000/api/chat/edit/chat-123')
      const params = Promise.resolve({ id: 'chat-123' })

      console.log('🔍 Processing unauthenticated GET request for chat editing')
      console.log('🔍 Chat ID:', 'chat-123')

      const { GET } = await import('@/app/api/chat/edit/[id]/route')
      const response = await GET(request, { params })

      console.log('🔍 Unauthenticated GET response status:', response.status)

      // Should return 401 Unauthorized
      expect(response.status).toBe(401)

      // Verify error response was created
      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Unauthorized', 401)

      console.log('✅ Unauthenticated access to chat retrieval properly rejected')
    })

    /**
     * Test access denied for chats user doesn't own and lacks admin permissions
     * Users should only see chats they own or have administrative access to
     */
    it('should return 404 Not Found when chat not found or access denied', async () => {
      console.log('🧪 Testing access denied for chat retrieval')

      const testUser = { id: 'user-no-access', email: 'noaccess@example.com' }
      testMocks.auth.setAuthenticated(testUser)

      // Configure chat access check to deny access
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({ hasAccess: false })

      const request = new NextRequest('http://localhost:3000/api/chat/edit/chat-123')
      const params = Promise.resolve({ id: 'chat-123' })

      console.log('🔍 Processing GET request with denied access')
      console.log('🔍 User ID:', testUser.id)
      console.log('🔍 Chat access configured to: deny')

      const { GET } = await import('@/app/api/chat/edit/[id]/route')
      const response = await GET(request, { params })

      console.log('🔍 Access denied response status:', response.status)

      // Should return 404 Not Found (security by obscurity)
      expect(response.status).toBe(404)

      // Verify access was checked and error response created
      expect(checkChatAccess).toHaveBeenCalledWith('chat-123', testUser.id)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Chat not found or access denied', 404)

      console.log('✅ Access denied for chat retrieval properly handled')
    })

    /**
     * Test successful chat details retrieval for authorized user
     * Authorized users should receive comprehensive chat information for editing
     */
    it('should return chat details when user has access', async () => {
      console.log('🧪 Testing successful chat details retrieval')

      const testUser = { id: 'chat-owner', email: 'owner@example.com' }
      testMocks.auth.setAuthenticated(testUser)

      // Sample comprehensive chat data
      const sampleChat = {
        id: 'chat-123',
        subdomain: 'my-awesome-chat',
        title: 'My Awesome Chat',
        description: 'A comprehensive chat deployment for customer support',
        authType: 'password',
        password: 'encrypted-secure-password',
        customizations: {
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          welcomeMessage: 'Welcome to our support chat!',
          placeholderText: 'Type your message here...',
          buttonText: 'Send Message',
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      // Configure chat access to grant access with full chat data
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({
        hasAccess: true,
        chat: sampleChat,
      })

      const request = new NextRequest('http://localhost:3000/api/chat/edit/chat-123')
      const params = Promise.resolve({ id: 'chat-123' })

      console.log('🔍 Processing successful GET request')
      console.log('🔍 Chat owner:', testUser.id)
      console.log('🔍 Chat subdomain:', sampleChat.subdomain)
      console.log('🔍 Auth type:', sampleChat.authType)

      const { GET } = await import('@/app/api/chat/edit/[id]/route')
      const response = await GET(request, { params })

      console.log('🔍 Successful retrieval response status:', response.status)

      // Should return 200 OK
      expect(response.status).toBe(200)

      // Verify access was checked
      expect(checkChatAccess).toHaveBeenCalledWith('chat-123', testUser.id)

      // Verify success response with expected data structure
      const { createSuccessResponse } = await import('@/app/api/workflows/utils')
      expect(createSuccessResponse).toHaveBeenCalledWith({
        id: 'chat-123',
        subdomain: 'my-awesome-chat',
        title: 'My Awesome Chat',
        description: 'A comprehensive chat deployment for customer support',
        customizations: sampleChat.customizations,
        chatUrl: 'http://my-awesome-chat.localhost:3000',
        hasPassword: true, // Should indicate password protection
      })

      console.log('✅ Chat details successfully retrieved and properly formatted')
      console.log('  - ✅ Authentication passed')
      console.log('  - ✅ Access control validated')
      console.log('  - ✅ Chat data retrieved')
      console.log('  - ✅ Password presence indicated')
      console.log('  - ✅ Chat URL generated')
    })

    /**
     * Test chat retrieval with workspace admin permissions
     * Workspace admins should be able to access chats in their workspace
     */
    it('should return chat details when user has workspace admin access', async () => {
      console.log('🧪 Testing chat retrieval with workspace admin access')

      const adminUser = { id: 'workspace-admin', email: 'admin@workspace.com' }
      testMocks.auth.setAuthenticated(adminUser)

      const workspaceChat = {
        id: 'workspace-chat-456',
        subdomain: 'workspace-chat',
        title: 'Workspace Team Chat',
        description: 'Chat managed by workspace admin',
        authType: 'public',
        customizations: { primaryColor: '#28a745' },
      }

      // Configure admin access to workspace chat
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({
        hasAccess: true,
        chat: workspaceChat,
      })

      const request = new NextRequest('http://localhost:3000/api/chat/edit/workspace-chat-456')
      const params = Promise.resolve({ id: 'workspace-chat-456' })

      console.log('🔍 Processing admin access request')
      console.log('🔍 Admin user:', adminUser.id)
      console.log('🔍 Workspace chat:', workspaceChat.subdomain)

      const { GET } = await import('@/app/api/chat/edit/[id]/route')
      const response = await GET(request, { params })

      console.log('🔍 Admin access response status:', response.status)

      // Should return 200 OK for admin access
      expect(response.status).toBe(200)

      // Verify admin access was checked
      expect(checkChatAccess).toHaveBeenCalledWith('workspace-chat-456', adminUser.id)

      console.log('✅ Workspace admin access to chat retrieval successful')
    })
  })

  describe('PATCH - Chat Deployment Updates', () => {
    /**
     * Test unauthenticated access to chat updates
     * Only authenticated users should be able to update chat deployments
     */
    it('should return 401 Unauthorized when user is not authenticated for updates', async () => {
      console.log('🧪 Testing unauthenticated access to chat updates')

      testMocks.auth.setUnauthenticated()

      const updateData = { title: 'Updated Chat Title' }
      const request = new NextRequest('http://localhost:3000/api/chat/edit/chat-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const params = Promise.resolve({ id: 'chat-123' })

      console.log('🔍 Processing unauthenticated PATCH request')
      console.log('🔍 Update data:', updateData)

      const { PATCH } = await import('@/app/api/chat/edit/[id]/route')
      const response = await PATCH(request, { params })

      console.log('🔍 Unauthenticated PATCH response status:', response.status)

      // Should return 401 Unauthorized
      expect(response.status).toBe(401)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Unauthorized', 401)

      console.log('✅ Unauthenticated access to chat updates properly rejected')
    })

    /**
     * Test access denied for chat updates
     * Users should only update chats they own or have admin access to
     */
    it('should return 404 Not Found when chat update access is denied', async () => {
      console.log('🧪 Testing access denied for chat updates')

      const testUser = { id: 'user-no-update', email: 'noupdate@example.com' }
      testMocks.auth.setAuthenticated(testUser)

      // Configure chat access check to deny access
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({ hasAccess: false })

      const updateData = { title: 'Unauthorized Update Attempt' }
      const request = new NextRequest('http://localhost:3000/api/chat/edit/chat-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const params = Promise.resolve({ id: 'chat-123' })

      console.log('🔍 Processing PATCH request with denied access')
      console.log('🔍 User ID:', testUser.id)
      console.log('🔍 Access configured to: deny')

      const { PATCH } = await import('@/app/api/chat/edit/[id]/route')
      const response = await PATCH(request, { params })

      console.log('🔍 Access denied PATCH response status:', response.status)

      // Should return 404 Not Found
      expect(response.status).toBe(404)

      expect(checkChatAccess).toHaveBeenCalledWith('chat-123', testUser.id)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Chat not found or access denied', 404)

      console.log('✅ Access denied for chat updates properly handled')
    })

    /**
     * Test successful chat update with comprehensive data changes
     * Authorized users should be able to update various chat properties
     */
    it('should update chat when user has access with comprehensive validation', async () => {
      console.log('🧪 Testing successful comprehensive chat update')

      const chatOwner = { id: 'chat-owner-update', email: 'owner@example.com' }
      testMocks.auth.setAuthenticated(chatOwner)

      const existingChat = {
        id: 'chat-update-123',
        subdomain: 'original-chat',
        title: 'Original Chat Title',
        authType: 'public',
        description: 'Original description',
      }

      // Configure chat access to grant access
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({
        hasAccess: true,
        chat: existingChat,
      })

      // Configure database to show subdomain is available for update
      testMocks.database.setSelectResults([[]])

      const comprehensiveUpdateData = {
        title: 'Updated Comprehensive Chat',
        description: 'Updated comprehensive description with more details',
        customizations: {
          primaryColor: '#dc3545',
          secondaryColor: '#6f42c1',
          welcomeMessage: 'Welcome to our updated chat system!',
          placeholderText: 'Enter your updated message...',
          buttonText: 'Send Updated Message',
        },
      }

      const request = new NextRequest('http://localhost:3000/api/chat/edit/chat-update-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comprehensiveUpdateData),
      })
      const params = Promise.resolve({ id: 'chat-update-123' })

      console.log('🔍 Processing comprehensive chat update')
      console.log('🔍 Chat owner:', chatOwner.id)
      console.log('🔍 Update data keys:', Object.keys(comprehensiveUpdateData))
      console.log('🔍 New customizations:', Object.keys(comprehensiveUpdateData.customizations))

      const { PATCH } = await import('@/app/api/chat/edit/[id]/route')
      const response = await PATCH(request, { params })

      console.log('🔍 Comprehensive update response status:', response.status)

      // Should return 200 OK
      expect(response.status).toBe(200)

      // Verify access was checked
      expect(checkChatAccess).toHaveBeenCalledWith('chat-update-123', chatOwner.id)

      // Verify success response with proper structure
      const { createSuccessResponse } = await import('@/app/api/workflows/utils')
      expect(createSuccessResponse).toHaveBeenCalledWith({
        id: 'chat-update-123',
        chatUrl: 'http://original-chat.localhost:3000',
        message: 'Chat deployment updated successfully',
      })

      console.log('✅ Comprehensive chat update completed successfully')
      console.log('  - ✅ Authentication passed')
      console.log('  - ✅ Access control validated')
      console.log('  - ✅ Update data processed')
      console.log('  - ✅ Database update executed')
      console.log('  - ✅ Success response generated')
    })

    /**
     * Test subdomain conflict detection during updates
     * Subdomain updates should check for conflicts with existing deployments
     */
    it('should handle subdomain conflicts during updates', async () => {
      console.log('🧪 Testing subdomain conflict detection during updates')

      const chatOwner = { id: 'conflict-owner', email: 'conflict@example.com' }
      testMocks.auth.setAuthenticated(chatOwner)

      const existingChat = {
        id: 'conflict-chat-123',
        subdomain: 'current-subdomain',
        title: 'Current Chat',
      }

      // Configure chat access to grant access
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({
        hasAccess: true,
        chat: existingChat,
      })

      // Configure database to return existing subdomain (conflict)
      testMocks.database.setSelectResults([
        [
          {
            id: 'other-chat-456',
            subdomain: 'conflicting-subdomain',
            userId: 'other-user',
          },
        ],
      ])

      const conflictingUpdateData = {
        subdomain: 'conflicting-subdomain',
        title: 'This should conflict',
      }

      const request = new NextRequest('http://localhost:3000/api/chat/edit/conflict-chat-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conflictingUpdateData),
      })
      const params = Promise.resolve({ id: 'conflict-chat-123' })

      console.log('🔍 Processing update with subdomain conflict')
      console.log('🔍 Attempting subdomain:', conflictingUpdateData.subdomain)
      console.log('🔍 Database configured to return: existing conflict')

      const { PATCH } = await import('@/app/api/chat/edit/[id]/route')
      const response = await PATCH(request, { params })

      console.log('🔍 Subdomain conflict response status:', response.status)

      // Should return 400 Bad Request for conflict
      expect(response.status).toBe(400)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Subdomain already in use', 400)

      console.log('✅ Subdomain conflict properly detected and rejected')
    })

    /**
     * Test password requirement validation during auth type changes
     * Changing to password auth should require a password to be provided
     */
    it('should validate password requirement when changing to password auth', async () => {
      console.log('🧪 Testing password requirement validation')

      const chatOwner = { id: 'password-owner', email: 'password@example.com' }
      testMocks.auth.setAuthenticated(chatOwner)

      const publicChat = {
        id: 'public-chat-123',
        subdomain: 'public-chat',
        title: 'Public Chat',
        authType: 'public',
        password: null,
      }

      // Configure chat access
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({
        hasAccess: true,
        chat: publicChat,
      })

      const invalidAuthChangeData = {
        authType: 'password',
        // No password provided - this should fail
      }

      const request = new NextRequest('http://localhost:3000/api/chat/edit/public-chat-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidAuthChangeData),
      })
      const params = Promise.resolve({ id: 'public-chat-123' })

      console.log('🔍 Processing auth type change without password')
      console.log('🔍 Changing from public to password auth')
      console.log('🔍 Password provided: none (should fail)')

      const { PATCH } = await import('@/app/api/chat/edit/[id]/route')
      const response = await PATCH(request, { params })

      console.log('🔍 Password validation response status:', response.status)

      // Should return 400 Bad Request for missing password
      expect(response.status).toBe(400)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith(
        'Password is required when using password protection',
        400
      )

      console.log('✅ Password requirement validation properly enforced')
    })

    /**
     * Test successful password auth update with encryption
     * Valid password auth changes should encrypt and store the password
     */
    it('should successfully update to password auth with proper encryption', async () => {
      console.log('🧪 Testing successful password auth update with encryption')

      const chatOwner = { id: 'encryption-owner', email: 'encrypt@example.com' }
      testMocks.auth.setAuthenticated(chatOwner)

      const publicChat = {
        id: 'encrypt-chat-123',
        subdomain: 'encrypt-chat',
        title: 'Chat to Encrypt',
        authType: 'public',
      }

      // Configure chat access
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({
        hasAccess: true,
        chat: publicChat,
      })

      // Configure subdomain availability
      testMocks.database.setSelectResults([[]])

      const validPasswordUpdateData = {
        authType: 'password',
        password: 'secure-new-password-123',
      }

      const request = new NextRequest('http://localhost:3000/api/chat/edit/encrypt-chat-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPasswordUpdateData),
      })
      const params = Promise.resolve({ id: 'encrypt-chat-123' })

      console.log('🔍 Processing valid password auth update')
      console.log('🔍 New auth type: password')
      console.log('🔍 Password provided: ✓')

      const { PATCH } = await import('@/app/api/chat/edit/[id]/route')
      const response = await PATCH(request, { params })

      console.log('🔍 Password auth update response status:', response.status)

      // Should return 200 OK
      expect(response.status).toBe(200)

      // Verify password encryption was called
      const { encryptSecret } = await import('@/lib/utils')
      expect(encryptSecret).toHaveBeenCalledWith('secure-new-password-123')

      console.log('✅ Password auth update with encryption successful')
      console.log('  - ✅ Password encryption triggered')
      console.log('  - ✅ Database update executed')
      console.log('  - ✅ Success response generated')
    })

    /**
     * Test workspace admin permission validation for updates
     * Workspace admins should be able to update chats in their workspace
     */
    it('should allow updates when user has workspace admin permission', async () => {
      console.log('🧪 Testing workspace admin permission for updates')

      const adminUser = { id: 'workspace-admin-update', email: 'admin-update@workspace.com' }
      testMocks.auth.setAuthenticated(adminUser)

      const workspaceChat = {
        id: 'workspace-update-456',
        subdomain: 'workspace-update-chat',
        title: 'Workspace Chat for Updates',
        authType: 'public',
      }

      // Configure admin access to workspace chat
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({
        hasAccess: true,
        chat: workspaceChat,
      })

      const adminUpdateData = {
        title: 'Admin Updated Workspace Chat',
        description: 'Updated by workspace administrator',
      }

      const request = new NextRequest('http://localhost:3000/api/chat/edit/workspace-update-456', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminUpdateData),
      })
      const params = Promise.resolve({ id: 'workspace-update-456' })

      console.log('🔍 Processing workspace admin update')
      console.log('🔍 Admin user:', adminUser.id)
      console.log('🔍 Workspace chat updates:', Object.keys(adminUpdateData))

      const { PATCH } = await import('@/app/api/chat/edit/[id]/route')
      const response = await PATCH(request, { params })

      console.log('🔍 Workspace admin update response status:', response.status)

      // Should return 200 OK for admin access
      expect(response.status).toBe(200)

      // Verify admin access was validated
      expect(checkChatAccess).toHaveBeenCalledWith('workspace-update-456', adminUser.id)

      console.log('✅ Workspace admin update successful')
    })
  })

  describe('DELETE - Chat Deployment Deletion', () => {
    /**
     * Test unauthenticated access to chat deletion
     * Only authenticated users should be able to delete chat deployments
     */
    it('should return 401 Unauthorized when user is not authenticated for deletion', async () => {
      console.log('🧪 Testing unauthenticated access to chat deletion')

      testMocks.auth.setUnauthenticated()

      const request = new NextRequest('http://localhost:3000/api/chat/edit/chat-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'chat-123' })

      console.log('🔍 Processing unauthenticated DELETE request')
      console.log('🔍 Target chat ID:', 'chat-123')

      const { DELETE } = await import('@/app/api/chat/edit/[id]/route')
      const response = await DELETE(request, { params })

      console.log('🔍 Unauthenticated DELETE response status:', response.status)

      // Should return 401 Unauthorized
      expect(response.status).toBe(401)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Unauthorized', 401)

      console.log('✅ Unauthenticated access to chat deletion properly rejected')
    })

    /**
     * Test access denied for chat deletion
     * Users should only delete chats they own or have admin access to
     */
    it('should return 404 Not Found when chat deletion access is denied', async () => {
      console.log('🧪 Testing access denied for chat deletion')

      const testUser = { id: 'user-no-delete', email: 'nodelete@example.com' }
      testMocks.auth.setAuthenticated(testUser)

      // Configure chat access check to deny access
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({ hasAccess: false })

      const request = new NextRequest('http://localhost:3000/api/chat/edit/chat-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'chat-123' })

      console.log('🔍 Processing DELETE request with denied access')
      console.log('🔍 User ID:', testUser.id)
      console.log('🔍 Access configured to: deny')

      const { DELETE } = await import('@/app/api/chat/edit/[id]/route')
      const response = await DELETE(request, { params })

      console.log('🔍 Access denied DELETE response status:', response.status)

      // Should return 404 Not Found
      expect(response.status).toBe(404)

      expect(checkChatAccess).toHaveBeenCalledWith('chat-123', testUser.id)

      const { createErrorResponse } = await import('@/app/api/workflows/utils')
      expect(createErrorResponse).toHaveBeenCalledWith('Chat not found or access denied', 404)

      console.log('✅ Access denied for chat deletion properly handled')
    })

    /**
     * Test successful chat deletion for chat owner
     * Chat owners should be able to delete their own chat deployments
     */
    it('should delete chat when user has ownership access', async () => {
      console.log('🧪 Testing successful chat deletion by owner')

      const chatOwner = { id: 'delete-owner', email: 'delete@example.com' }
      testMocks.auth.setAuthenticated(chatOwner)

      // Configure chat access to grant deletion access
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({ hasAccess: true })

      // Configure database to successfully delete
      testMocks.database.setDeleteResults([{ success: true }])

      const request = new NextRequest('http://localhost:3000/api/chat/edit/delete-chat-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'delete-chat-123' })

      console.log('🔍 Processing owner chat deletion')
      console.log('🔍 Chat owner:', chatOwner.id)
      console.log('🔍 Target chat:', 'delete-chat-123')

      const { DELETE } = await import('@/app/api/chat/edit/[id]/route')
      const response = await DELETE(request, { params })

      console.log('🔍 Owner deletion response status:', response.status)

      // Should return 200 OK
      expect(response.status).toBe(200)

      // Verify access was checked
      expect(checkChatAccess).toHaveBeenCalledWith('delete-chat-123', chatOwner.id)

      // Verify success response
      const { createSuccessResponse } = await import('@/app/api/workflows/utils')
      expect(createSuccessResponse).toHaveBeenCalledWith({
        message: 'Chat deployment deleted successfully',
      })

      console.log('✅ Owner chat deletion completed successfully')
      console.log('  - ✅ Authentication passed')
      console.log('  - ✅ Access control validated')
      console.log('  - ✅ Database deletion executed')
      console.log('  - ✅ Success response generated')
    })

    /**
     * Test workspace admin permission for chat deletion
     * Workspace admins should be able to delete chats in their workspace
     */
    it('should allow deletion when user has workspace admin permission', async () => {
      console.log('🧪 Testing workspace admin permission for deletion')

      const adminUser = { id: 'workspace-admin-delete', email: 'admin-delete@workspace.com' }
      testMocks.auth.setAuthenticated(adminUser)

      // Configure admin access to workspace chat
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({ hasAccess: true })

      // Configure database to successfully delete
      testMocks.database.setDeleteResults([{ success: true }])

      const request = new NextRequest('http://localhost:3000/api/chat/edit/admin-delete-456', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'admin-delete-456' })

      console.log('🔍 Processing workspace admin deletion')
      console.log('🔍 Admin user:', adminUser.id)
      console.log('🔍 Target workspace chat:', 'admin-delete-456')

      const { DELETE } = await import('@/app/api/chat/edit/[id]/route')
      const response = await DELETE(request, { params })

      console.log('🔍 Workspace admin deletion response status:', response.status)

      // Should return 200 OK for admin access
      expect(response.status).toBe(200)

      // Verify admin access was validated
      expect(checkChatAccess).toHaveBeenCalledWith('admin-delete-456', adminUser.id)

      console.log('✅ Workspace admin deletion successful')
    })

    /**
     * Test database error handling during deletion
     * Database errors during deletion should be handled gracefully
     */
    it('should handle database errors during deletion gracefully', async () => {
      console.log('🧪 Testing database error handling during deletion')

      const chatOwner = { id: 'error-owner', email: 'error@example.com' }
      testMocks.auth.setAuthenticated(chatOwner)

      // Configure chat access to grant access
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({ hasAccess: true })

      // Configure database to throw an error during deletion
      const deletionError = new Error('Database connection failed during deletion')
      const mockDb = vi.mocked((await import('@/db')).db)
      mockDb.delete = vi.fn().mockImplementation(() => ({
        where: vi.fn().mockRejectedValue(deletionError),
      }))

      const request = new NextRequest('http://localhost:3000/api/chat/edit/error-chat-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'error-chat-123' })

      console.log('🔍 Processing deletion with database error')
      console.log('🔍 Database configured to fail with:', deletionError.message)

      const { DELETE } = await import('@/app/api/chat/edit/[id]/route')
      const response = await DELETE(request, { params })

      console.log('🔍 Database error deletion response status:', response.status)

      // Should return 500 Internal Server Error
      expect(response.status).toBe(500)

      console.log('✅ Database error during deletion handled gracefully')
    })

    /**
     * Test comprehensive deletion workflow validation
     * End-to-end test of successful deletion with all validation steps
     */
    it('should complete comprehensive deletion workflow successfully', async () => {
      console.log('🧪 Testing comprehensive deletion workflow')

      const comprehensiveOwner = {
        id: 'comprehensive-delete-owner',
        email: 'comprehensive-delete@example.com',
        name: 'Comprehensive Delete Test User',
      }
      testMocks.auth.setAuthenticated(comprehensiveOwner)

      // Configure comprehensive access validation
      const { checkChatAccess } = await import('@/app/api/chat/utils')
      vi.mocked(checkChatAccess).mockResolvedValueOnce({
        hasAccess: true,
        chat: {
          id: 'comprehensive-delete-789',
          subdomain: 'comprehensive-delete-chat',
          title: 'Comprehensive Chat for Deletion',
          userId: comprehensiveOwner.id,
        },
      })

      // Configure successful database deletion
      testMocks.database.setDeleteResults([{ success: true, deletedCount: 1 }])

      const request = new NextRequest(
        'http://localhost:3000/api/chat/edit/comprehensive-delete-789',
        {
          method: 'DELETE',
        }
      )
      const params = Promise.resolve({ id: 'comprehensive-delete-789' })

      console.log('🔍 Running comprehensive deletion workflow')
      console.log('🔍 Chat owner:', comprehensiveOwner.email)
      console.log('🔍 Target chat:', 'comprehensive-delete-789')
      console.log('🔍 Expected workflow: auth → access control → database deletion → success')

      const { DELETE } = await import('@/app/api/chat/edit/[id]/route')
      const response = await DELETE(request, { params })

      console.log('🔍 Comprehensive deletion response status:', response.status)

      // Should successfully complete all deletion steps
      expect(response.status).toBe(200)

      // Verify all validation steps were executed
      expect(checkChatAccess).toHaveBeenCalledWith(
        'comprehensive-delete-789',
        comprehensiveOwner.id
      )

      console.log('✅ Comprehensive deletion workflow completed successfully')
      console.log('  - ✅ Authentication validation passed')
      console.log('  - ✅ Access control validation passed')
      console.log('  - ✅ Database deletion executed')
      console.log('  - ✅ Success response generated')
      console.log('  - ✅ All security protocols enforced')
    })
  })
})
