/**
 * Canned Response Service Test Suite
 * =================================
 *
 * Comprehensive test suite for canned response management including
 * intelligent matching, personalization, branding compliance, approval
 * workflows, and multi-language support.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import {
  cannedResponseService,
  getPersonalizedResponse,
  suggestResponse,
} from '../canned-response-service'
import type {
  CreateCannedResponseRequest,
  ResponseCategory,
  UpdateCannedResponseRequest,
} from '../governance-compliance-types'
import type { AuthContext } from '../types'

describe('CannedResponseService', () => {
  let testWorkspaceId: string
  let testAuth: AuthContext

  beforeEach(() => {
    testWorkspaceId = `test_workspace_${Date.now()}`
    testAuth = {
      user_id: 'test_user',
      workspace_id: testWorkspaceId,
      key_type: 'workspace',
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Response Creation and Management', () => {
    it('should create a new canned response successfully', async () => {
      const responseData: CreateCannedResponseRequest = {
        title: 'Test Greeting Response',
        content: 'Hello {{customer_name}}, how can I assist you today?',
        category: 'greeting',
        tags: ['greeting', 'professional', 'personalized'],
        language: 'en',
        context_requirements: [
          {
            field: 'customer_name',
            required: false,
            default_value: 'there',
          },
        ],
        personalization_fields: [
          {
            field_name: 'customer_name',
            placeholder: '{{customer_name}}',
            data_source: 'user_profile',
            required: false,
            fallback_value: 'there',
          },
        ],
        branding: {
          tone: 'professional',
          brand_voice_keywords: ['assist', 'help', 'support'],
          avoid_terms: ['problem', 'issue'],
        },
      }

      const response = await cannedResponseService.createResponse(
        responseData,
        testWorkspaceId,
        testAuth
      )

      expect(response).toBeDefined()
      expect(response.id).toMatch(/^response_/)
      expect(response.title).toBe(responseData.title)
      expect(response.content).toBe(responseData.content)
      expect(response.category).toBe(responseData.category)
      expect(response.workspace_id).toBe(testWorkspaceId)
      expect(response.status).toBe('active')
      expect(response.usage_count).toBe(0)
      expect(response.version).toBe(1)
      expect(response.tags).toEqual(responseData.tags)
    })

    it('should update an existing canned response', async () => {
      // First create a response
      const responseData: CreateCannedResponseRequest = {
        title: 'Original Title',
        content: 'Original content',
        category: 'support',
        tags: ['original'],
      }

      const createdResponse = await cannedResponseService.createResponse(
        responseData,
        testWorkspaceId,
        testAuth
      )

      // Update the response
      const updateData: UpdateCannedResponseRequest = {
        title: 'Updated Title',
        content: 'Updated content with {{customer_name}}',
        tags: ['updated', 'personalized'],
        personalization_fields: [
          {
            field_name: 'customer_name',
            placeholder: '{{customer_name}}',
            data_source: 'user_profile',
            required: false,
            fallback_value: 'valued customer',
          },
        ],
      }

      const updatedResponse = await cannedResponseService.updateResponse(
        createdResponse.id,
        updateData,
        testAuth
      )

      expect(updatedResponse.title).toBe('Updated Title')
      expect(updatedResponse.content).toBe('Updated content with {{customer_name}}')
      expect(updatedResponse.tags).toEqual(['updated', 'personalized'])
      expect(updatedResponse.version).toBe(2)
      expect(updatedResponse.personalization_fields).toHaveLength(1)
    })

    it('should validate response content and branding', async () => {
      const invalidBrandingData: CreateCannedResponseRequest = {
        title: 'Test Response',
        content: 'This response contains a problem word', // Contains avoided term
        category: 'support',
        tags: ['test'],
        branding: {
          tone: 'professional',
          brand_voice_keywords: ['help', 'support'],
          avoid_terms: ['problem', 'issue'],
        },
      }

      await expect(
        cannedResponseService.createResponse(invalidBrandingData, testWorkspaceId, testAuth)
      ).rejects.toThrow(/avoided term/)
    })

    it('should validate personalization fields', async () => {
      const invalidPersonalizationData: CreateCannedResponseRequest = {
        title: 'Test Response',
        content: 'Hello there!', // Missing required personalization field
        category: 'greeting',
        tags: ['test'],
        personalization_fields: [
          {
            field_name: 'customer_name',
            placeholder: '{{customer_name}}',
            data_source: 'user_profile',
            required: true, // Required but not in content
          },
        ],
      }

      await expect(
        cannedResponseService.createResponse(invalidPersonalizationData, testWorkspaceId, testAuth)
      ).rejects.toThrow(/Required personalization field missing/)
    })
  })

  describe('Response Matching and Intelligence', () => {
    let testResponses: any[]

    beforeEach(async () => {
      // Create test responses for matching
      const responseData = [
        {
          title: 'Password Reset Help',
          content: 'I can help you reset your password. Please visit our password reset page.',
          category: 'support' as ResponseCategory,
          tags: ['password', 'reset', 'login', 'help'],
        },
        {
          title: 'Account Login Issues',
          content: 'If you are having trouble logging in, please check your credentials.',
          category: 'support' as ResponseCategory,
          tags: ['login', 'credentials', 'account', 'trouble'],
        },
        {
          title: 'Welcome Greeting',
          content: 'Welcome! How can I assist you today?',
          category: 'greeting' as ResponseCategory,
          tags: ['welcome', 'greeting', 'hello'],
        },
        {
          title: 'Billing Question Response',
          content: 'For billing questions, please contact our billing department.',
          category: 'support' as ResponseCategory,
          tags: ['billing', 'payment', 'invoice'],
        },
      ]

      testResponses = []
      for (const data of responseData) {
        const response = await cannedResponseService.createResponse(data, testWorkspaceId, testAuth)
        testResponses.push(response)
      }
    })

    it('should find matching responses based on query', async () => {
      const query = 'I need help resetting my password'

      const matches = await cannedResponseService.findMatchingResponses(
        query,
        undefined,
        undefined,
        testWorkspaceId,
        { limit: 5 }
      )

      expect(matches).toBeDefined()
      expect(Array.isArray(matches)).toBe(true)
      expect(matches.length).toBeGreaterThan(0)

      // The password reset response should be highly ranked
      const passwordMatch = matches.find((m) => m.response.title.includes('Password Reset'))
      expect(passwordMatch).toBeDefined()
      expect(passwordMatch!.relevance_score).toBeGreaterThan(0.5)
    })

    it('should filter matches by category', async () => {
      const query = 'help'

      const matches = await cannedResponseService.findMatchingResponses(
        query,
        'greeting',
        undefined,
        testWorkspaceId,
        { limit: 5 }
      )

      expect(matches).toBeDefined()
      matches.forEach((match) => {
        expect(match.response.category).toBe('greeting')
      })
    })

    it('should provide personalized response content', async () => {
      // Create a response with personalization
      const personalizedResponse = await cannedResponseService.createResponse(
        {
          title: 'Personalized Greeting',
          content: 'Hello {{customer_name}}, welcome to {{company_name}}!',
          category: 'greeting',
          tags: ['personalized'],
          personalization_fields: [
            {
              field_name: 'customer_name',
              placeholder: '{{customer_name}}',
              data_source: 'user_profile',
              required: false,
              fallback_value: 'valued customer',
            },
            {
              field_name: 'company_name',
              placeholder: '{{company_name}}',
              data_source: 'custom',
              required: true,
            },
          ],
        },
        testWorkspaceId,
        testAuth
      )

      const personalizationData = {
        customer_name: 'John Doe',
        company_name: 'Acme Corp',
      }

      const personalizedResult = await cannedResponseService.getPersonalizedResponse(
        personalizedResponse.id,
        personalizationData,
        testAuth
      )

      expect(personalizedResult.content).toBe('Hello John Doe, welcome to Acme Corp!')
      expect(personalizedResult.personalization_applied).toBe(true)
      expect(personalizedResult.missing_fields).toHaveLength(0)
    })

    it('should handle missing personalization data gracefully', async () => {
      // Create a response with required and optional personalization
      const personalizedResponse = await cannedResponseService.createResponse(
        {
          title: 'Mixed Personalization',
          content: 'Hello {{customer_name}}, your order {{order_id}} is ready!',
          category: 'support',
          tags: ['personalized'],
          personalization_fields: [
            {
              field_name: 'customer_name',
              placeholder: '{{customer_name}}',
              data_source: 'user_profile',
              required: false,
              fallback_value: 'valued customer',
            },
            {
              field_name: 'order_id',
              placeholder: '{{order_id}}',
              data_source: 'session_data',
              required: true,
            },
          ],
        },
        testWorkspaceId,
        testAuth
      )

      const partialPersonalizationData = {
        customer_name: 'Jane Smith',
        // Missing order_id (required)
      }

      const personalizedResult = await cannedResponseService.getPersonalizedResponse(
        personalizedResponse.id,
        partialPersonalizationData,
        testAuth
      )

      expect(personalizedResult.content).toContain('Jane Smith')
      expect(personalizedResult.missing_fields).toContain('order_id')
      expect(personalizedResult.personalization_applied).toBe(true)
    })

    it('should rank responses by relevance and usage', async () => {
      // Simulate usage by getting personalized responses
      for (let i = 0; i < 5; i++) {
        await cannedResponseService.getPersonalizedResponse(
          testResponses[0].id, // Password reset response
          {},
          testAuth
        )
      }

      const query = 'password login help'
      const matches = await cannedResponseService.findMatchingResponses(
        query,
        undefined,
        undefined,
        testWorkspaceId,
        { limit: 3 }
      )

      expect(matches.length).toBeGreaterThan(0)

      // Results should be sorted by relevance score
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].relevance_score).toBeGreaterThanOrEqual(matches[i].relevance_score)
      }
    })
  })

  describe('Response Analytics and Usage', () => {
    let testResponse: any

    beforeEach(async () => {
      testResponse = await cannedResponseService.createResponse(
        {
          title: 'Test Analytics Response',
          content: 'This is for testing analytics',
          category: 'support',
          tags: ['test', 'analytics'],
        },
        testWorkspaceId,
        testAuth
      )
    })

    it('should track response usage correctly', async () => {
      // Use the response multiple times
      const usageCount = 3
      for (let i = 0; i < usageCount; i++) {
        await cannedResponseService.getPersonalizedResponse(testResponse.id, {}, testAuth)
      }

      // Get analytics
      const analytics = await cannedResponseService.getResponseAnalytics(testWorkspaceId)

      expect(analytics).toBeDefined()
      expect(analytics.total_responses).toBeGreaterThan(0)
      expect(analytics.active_responses).toBeGreaterThan(0)

      // Find our test response in usage stats
      const testResponseStats = analytics.usage_stats.find(
        (stats) => stats.response_id === testResponse.id
      )
      expect(testResponseStats).toBeDefined()
      expect(testResponseStats!.usage_count).toBe(usageCount)
    })

    it('should provide category breakdown in analytics', async () => {
      // Create responses in different categories
      await cannedResponseService.createResponse(
        {
          title: 'Greeting Response',
          content: 'Hello!',
          category: 'greeting',
          tags: ['hello'],
        },
        testWorkspaceId,
        testAuth
      )

      await cannedResponseService.createResponse(
        {
          title: 'Closing Response',
          content: 'Goodbye!',
          category: 'closing',
          tags: ['goodbye'],
        },
        testWorkspaceId,
        testAuth
      )

      const analytics = await cannedResponseService.getResponseAnalytics(testWorkspaceId)

      expect(analytics.category_breakdown).toBeDefined()
      expect(analytics.category_breakdown.support).toBeGreaterThan(0)
      expect(analytics.category_breakdown.greeting).toBeGreaterThan(0)
      expect(analytics.category_breakdown.closing).toBeGreaterThan(0)
    })

    it('should get responses by category correctly', async () => {
      // Create multiple support responses
      for (let i = 0; i < 3; i++) {
        await cannedResponseService.createResponse(
          {
            title: `Support Response ${i}`,
            content: `Support content ${i}`,
            category: 'support',
            tags: [`support${i}`],
          },
          testWorkspaceId,
          testAuth
        )
      }

      const supportResponses = await cannedResponseService.getResponsesByCategory(
        'support',
        testWorkspaceId,
        { limit: 10 }
      )

      expect(supportResponses).toBeDefined()
      expect(Array.isArray(supportResponses)).toBe(true)
      expect(supportResponses.length).toBeGreaterThan(3) // Including the beforeEach response

      supportResponses.forEach((response) => {
        expect(response.category).toBe('support')
        expect(response.workspace_id).toBe(testWorkspaceId)
      })
    })
  })

  describe('Approval Workflows', () => {
    it('should create response requiring approval', async () => {
      const responseData: CreateCannedResponseRequest = {
        title: 'Compliance Response',
        content: 'This response contains sensitive information.',
        category: 'compliance',
        tags: ['sensitive', 'approval'],
        approval_required: true,
      }

      const response = await cannedResponseService.createResponse(
        responseData,
        testWorkspaceId,
        testAuth
      )

      expect(response.status).toBe('pending_approval')
      expect(response.approval_required).toBe(true)
      expect(response.compliance_validated).toBe(false)
    })

    it('should approve pending response', async () => {
      // Create response requiring approval
      const response = await cannedResponseService.createResponse(
        {
          title: 'Pending Response',
          content: 'This needs approval',
          category: 'legal',
          tags: ['legal'],
          approval_required: true,
        },
        testWorkspaceId,
        testAuth
      )

      // Approve the response
      const approvedResponse = await cannedResponseService.approveResponse(
        response.id,
        {
          approved_by: 'manager_user',
          compliance_notes: 'Legal review completed',
          effectiveness_prediction: 85,
        },
        testAuth
      )

      expect(approvedResponse.status).toBe('active')
      expect(approvedResponse.approved_by).toBe('manager_user')
      expect(approvedResponse.approved_at).toBeDefined()
      expect(approvedResponse.compliance_validated).toBe(true)
      expect(approvedResponse.effectiveness_score).toBe(85)
    })

    it('should reject approval for non-pending responses', async () => {
      // Create active response
      const response = await cannedResponseService.createResponse(
        {
          title: 'Active Response',
          content: 'This is already active',
          category: 'support',
          tags: ['active'],
        },
        testWorkspaceId,
        testAuth
      )

      await expect(
        cannedResponseService.approveResponse(
          response.id,
          {
            approved_by: 'manager_user',
          },
          testAuth
        )
      ).rejects.toThrow(/not pending approval/)
    })
  })

  describe('Utility Functions', () => {
    beforeEach(async () => {
      // Create a test response for suggestions
      await cannedResponseService.createResponse(
        {
          title: 'Helpful Support Response',
          content: 'I can help you with that issue.',
          category: 'support',
          tags: ['help', 'support', 'assistance'],
        },
        testWorkspaceId,
        testAuth
      )
    })

    it('should suggest appropriate response', async () => {
      const query = 'I need help with my account'
      const context = {
        user_id: 'test_user',
        workspace_id: testWorkspaceId,
      }

      const suggestion = await suggestResponse(query, testWorkspaceId, context)

      if (suggestion) {
        expect(suggestion.response).toBeDefined()
        expect(suggestion.relevance_score).toBeGreaterThan(0)
        expect(suggestion.compliance_validated).toBe(true)
      }
      // suggestion can be null if no matches found, which is acceptable
    })

    it('should return null for poor matches', async () => {
      const query = 'completely unrelated quantum physics discussion'

      const suggestion = await suggestResponse(query, testWorkspaceId)

      // Should return null for queries that don't match well
      expect(suggestion).toBeNull()
    })

    it('should get personalized response via utility function', async () => {
      const personalizedResponse = await cannedResponseService.createResponse(
        {
          title: 'Utility Test Response',
          content: 'Hello {{name}}, thanks for contacting us!',
          category: 'greeting',
          tags: ['utility'],
          personalization_fields: [
            {
              field_name: 'name',
              placeholder: '{{name}}',
              data_source: 'user_profile',
              required: false,
              fallback_value: 'there',
            },
          ],
        },
        testWorkspaceId,
        testAuth
      )

      const personalizedContent = await getPersonalizedResponse(
        personalizedResponse.id,
        { name: 'Alice' },
        testAuth
      )

      expect(personalizedContent).toBe('Hello Alice, thanks for contacting us!')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid response ID gracefully', async () => {
      await expect(
        cannedResponseService.updateResponse('invalid_id', {}, testAuth)
      ).rejects.toThrow(/not found/)

      await expect(
        cannedResponseService.getPersonalizedResponse('invalid_id', {}, testAuth)
      ).rejects.toThrow(/not found/)
    })

    it('should handle empty or invalid queries in matching', async () => {
      const emptyResult = await cannedResponseService.findMatchingResponses(
        '',
        undefined,
        undefined,
        testWorkspaceId
      )
      expect(emptyResult).toEqual([])

      const whitespaceResult = await cannedResponseService.findMatchingResponses(
        '   ',
        undefined,
        undefined,
        testWorkspaceId
      )
      expect(whitespaceResult).toEqual([])
    })

    it('should handle missing workspace gracefully', async () => {
      const matches = await cannedResponseService.findMatchingResponses(
        'test query',
        undefined,
        undefined,
        'nonexistent_workspace'
      )

      expect(matches).toEqual([])
    })

    it('should validate required fields during creation', async () => {
      await expect(
        cannedResponseService.createResponse(
          {
            title: '', // Empty title
            content: 'Some content',
            category: 'support',
            tags: [],
          },
          testWorkspaceId,
          testAuth
        )
      ).rejects.toThrow(/title is required/)

      await expect(
        cannedResponseService.createResponse(
          {
            title: 'Valid Title',
            content: '', // Empty content
            category: 'support',
            tags: [],
          },
          testWorkspaceId,
          testAuth
        )
      ).rejects.toThrow(/content is required/)
    })

    it('should handle concurrent operations safely', async () => {
      // Create multiple responses concurrently
      const createPromises = Array(5)
        .fill(null)
        .map((_, index) =>
          cannedResponseService.createResponse(
            {
              title: `Concurrent Response ${index}`,
              content: `Content ${index}`,
              category: 'support',
              tags: [`concurrent${index}`],
            },
            testWorkspaceId,
            testAuth
          )
        )

      const responses = await Promise.all(createPromises)

      expect(responses).toHaveLength(5)
      responses.forEach((response, index) => {
        expect(response.title).toBe(`Concurrent Response ${index}`)
        expect(response.id).toMatch(/^response_/)
      })
    })
  })
})
