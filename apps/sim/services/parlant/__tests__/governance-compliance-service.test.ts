/**
 * Governance and Compliance Service Test Suite
 * ============================================
 *
 * Comprehensive test suite for governance and compliance functionality
 * including policy management, enforcement, audit trails, and compliance
 * validation. Tests cover both positive and negative scenarios with
 * enterprise-grade test coverage.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import {
  governanceComplianceService,
  initializeWorkspaceGovernance,
  quickComplianceCheck,
} from '../governance-compliance-service'
import type {
  EnforcementLevel,
  GovernanceContext,
  GovernancePolicy,
  PolicyCategory,
  PolicyPriority,
  PolicyStatus,
  PolicyType,
} from '../governance-compliance-types'
import type { AuthContext } from '../types'

describe('GovernanceComplianceService', () => {
  let testWorkspaceId: string
  let testAuth: AuthContext

  beforeEach(async () => {
    testWorkspaceId = `test_workspace_${Date.now()}`
    testAuth = {
      user_id: 'test_user',
      workspace_id: testWorkspaceId,
      key_type: 'workspace',
    }

    // Initialize governance for test workspace
    await initializeWorkspaceGovernance(testWorkspaceId, testAuth)
  })

  afterEach(() => {
    // Clean up any test data if needed
    jest.clearAllMocks()
  })

  describe('Policy Management', () => {
    it('should create a new governance policy successfully', async () => {
      const policyData: Omit<GovernancePolicy, 'id' | 'created_at' | 'updated_at' | 'version'> = {
        workspace_id: testWorkspaceId,
        Name: 'Test PII Protection Policy',
        description: 'Test policy for protecting personally identifiable information',
        category: 'data_governance',
        type: 'mandatory',
        status: 'draft',
        priority: 'high',
        rules: [
          {
            id: 'rule_001',
            condition: {
              field: 'content',
              operator: 'regex',
              value: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
            },
            action: {
              type: 'block',
              parameters: { replacement: '[SSN REDACTED]' },
              message: 'Social Security Number detected',
              severity: 'critical',
            },
            weight: 10,
          },
        ],
        enforcement_level: 'block',
        created_by: testAuth.user_id,
        last_modified_by: testAuth.user_id,
      }

      const policy = await governanceComplianceService.createPolicy(policyData, testAuth)

      expect(policy).toBeDefined()
      expect(policy.id).toMatch(/^policy_/)
      expect(policy.Name).toBe(policyData.Name)
      expect(policy.workspace_id).toBe(testWorkspaceId)
      expect(policy.status).toBe('draft')
      expect(policy.version).toBe(1)
      expect(policy.rules).toHaveLength(1)
    })

    it('should retrieve policies for a workspace', async () => {
      const policies = await governanceComplianceService.getPolicies(testWorkspaceId, testAuth)

      expect(Array.isArray(policies)).toBe(true)
      expect(policies.length).toBeGreaterThan(0) // Should have default policies

      // Check that all policies belong to the test workspace
      policies.forEach((policy) => {
        expect(policy.workspace_id).toBe(testWorkspaceId)
      })
    })

    it('should update an existing policy', async () => {
      // First create a policy
      const policyData: Omit<GovernancePolicy, 'id' | 'created_at' | 'updated_at' | 'version'> = {
        workspace_id: testWorkspaceId,
        Name: 'Test Policy',
        description: 'Original description',
        category: 'content_filtering',
        type: 'advisory',
        status: 'draft',
        priority: 'medium',
        rules: [],
        enforcement_level: 'warn',
        created_by: testAuth.user_id,
        last_modified_by: testAuth.user_id,
      }

      const createdPolicy = await governanceComplianceService.createPolicy(policyData, testAuth)

      // Update the policy
      const updatedPolicy = await governanceComplianceService.updatePolicy(
        createdPolicy.id,
        {
          description: 'Updated description',
          priority: 'high',
          status: 'active',
        },
        testAuth
      )

      expect(updatedPolicy.description).toBe('Updated description')
      expect(updatedPolicy.priority).toBe('high')
      expect(updatedPolicy.status).toBe('active')
      expect(updatedPolicy.version).toBe(2)
      expect(updatedPolicy.last_modified_by).toBe(testAuth.user_id)
    })

    it('should reject policy creation with invalid data', async () => {
      const invalidPolicyData = {
        workspace_id: testWorkspaceId,
        Name: '', // Invalid: empty Name
        description: 'Test description',
        category: 'data_governance' as PolicyCategory,
        type: 'mandatory' as PolicyType,
        status: 'draft' as PolicyStatus,
        priority: 'high' as PolicyPriority,
        rules: [], // Invalid: no rules
        enforcement_level: 'block' as EnforcementLevel,
        created_by: testAuth.user_id,
        last_modified_by: testAuth.user_id,
      }

      await expect(
        governanceComplianceService.createPolicy(invalidPolicyData, testAuth)
      ).rejects.toThrow()
    })
  })

  describe('Policy Evaluation and Compliance', () => {
    let testPolicy: GovernancePolicy

    beforeEach(async () => {
      // Create a test policy for evaluation
      const policyData: Omit<GovernancePolicy, 'id' | 'created_at' | 'updated_at' | 'version'> = {
        workspace_id: testWorkspaceId,
        Name: 'SSN Detection Policy',
        description: 'Detects and blocks Social Security Numbers',
        category: 'data_governance',
        type: 'mandatory',
        status: 'active',
        priority: 'critical',
        rules: [
          {
            id: 'ssn_rule',
            condition: {
              field: 'content',
              operator: 'regex',
              value: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
            },
            action: {
              type: 'block',
              parameters: { replacement: '[SSN REDACTED]' },
              message: 'Social Security Number detected and blocked',
              severity: 'critical',
            },
            weight: 10,
          },
        ],
        enforcement_level: 'block',
        created_by: testAuth.user_id,
        last_modified_by: testAuth.user_id,
      }

      testPolicy = await governanceComplianceService.createPolicy(policyData, testAuth)
    })

    it('should detect policy violations in content', async () => {
      const testContent = 'The customer SSN is 123-45-6789 and their phone is 555-1234'
      const context: GovernanceContext = {
        workspace_id: testWorkspaceId,
        user_id: testAuth.user_id,
        permissions: ['read', 'write'],
      }

      const results = await governanceComplianceService.evaluateCompliance(
        testContent,
        context,
        testAuth
      )

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)

      // Find the SSN policy result
      const ssnPolicyResult = results.find((r) => r.policy_id === testPolicy.id)
      expect(ssnPolicyResult).toBeDefined()
      expect(ssnPolicyResult!.overall_violation).toBe(true)
      expect(ssnPolicyResult!.risk_score).toBeGreaterThan(0)

      // Check rule evaluation
      expect(ssnPolicyResult!.rule_results).toHaveLength(1)
      expect(ssnPolicyResult!.rule_results[0].matched).toBe(true)
      expect(ssnPolicyResult!.rule_results[0].confidence).toBeGreaterThan(0.5)
    })

    it('should not detect violations in clean content', async () => {
      const cleanContent = 'This is a normal message without any sensitive information.'
      const context: GovernanceContext = {
        workspace_id: testWorkspaceId,
        user_id: testAuth.user_id,
        permissions: ['read', 'write'],
      }

      const results = await governanceComplianceService.evaluateCompliance(
        cleanContent,
        context,
        testAuth
      )

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)

      // Find the SSN policy result
      const ssnPolicyResult = results.find((r) => r.policy_id === testPolicy.id)
      if (ssnPolicyResult) {
        expect(ssnPolicyResult.overall_violation).toBe(false)
        expect(ssnPolicyResult.risk_score).toBe(0)
      }
    })

    it('should handle multiple policy violations correctly', async () => {
      // Create another test policy
      const emailPolicyData: Omit<
        GovernancePolicy,
        'id' | 'created_at' | 'updated_at' | 'version'
      > = {
        workspace_id: testWorkspaceId,
        Name: 'Email Detection Policy',
        description: 'Detects email addresses',
        category: 'data_governance',
        type: 'advisory',
        status: 'active',
        priority: 'medium',
        rules: [
          {
            id: 'email_rule',
            condition: {
              field: 'content',
              operator: 'regex',
              value: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
            },
            action: {
              type: 'flag',
              parameters: { review_required: true },
              message: 'Email address detected',
              severity: 'medium',
            },
            weight: 5,
          },
        ],
        enforcement_level: 'warn',
        created_by: testAuth.user_id,
        last_modified_by: testAuth.user_id,
      }

      await governanceComplianceService.createPolicy(emailPolicyData, testAuth)

      const testContent = 'Contact me at john@example.com or use SSN 123-45-6789'
      const context: GovernanceContext = {
        workspace_id: testWorkspaceId,
        user_id: testAuth.user_id,
        permissions: ['read', 'write'],
      }

      const results = await governanceComplianceService.evaluateCompliance(
        testContent,
        context,
        testAuth
      )

      expect(results.length).toBeGreaterThan(1)

      const violatingPolicies = results.filter((r) => r.overall_violation)
      expect(violatingPolicies.length).toBeGreaterThan(0)
    })
  })

  describe('Quick Compliance Check', () => {
    it('should perform quick compliance check successfully', async () => {
      const testContent = 'This is a test message with SSN 123-45-6789'

      const result = await quickComplianceCheck(testContent, testWorkspaceId, testAuth.user_id)

      expect(result).toBeDefined()
      expect(typeof result.compliant).toBe('boolean')
      expect(typeof result.riskScore).toBe('number')
      expect(typeof result.violations).toBe('number')
      expect(result.riskScore).toBeGreaterThanOrEqual(0)
      expect(result.riskScore).toBeLessThanOrEqual(100)
    })

    it('should handle empty content gracefully', async () => {
      const result = await quickComplianceCheck('', testWorkspaceId, testAuth.user_id)

      expect(result).toBeDefined()
      expect(result.compliant).toBe(true)
      expect(result.riskScore).toBe(0)
      expect(result.violations).toBe(0)
    })
  })

  describe('Compliance Status and Health', () => {
    it('should retrieve compliance status for workspace', async () => {
      const complianceStatus = await governanceComplianceService.getComplianceStatus(
        testWorkspaceId,
        undefined,
        testAuth
      )

      expect(Array.isArray(complianceStatus)).toBe(true)
      expect(complianceStatus.length).toBeGreaterThan(0)

      complianceStatus.forEach((requirement) => {
        expect(requirement.id).toBeDefined()
        expect(requirement.regulation).toBeDefined()
        expect(requirement.compliance_status).toMatch(
          /compliant|non_compliant|partial_compliance|not_applicable|under_review/
        )
      })
    })

    it('should perform health check successfully', async () => {
      const health = await governanceComplianceService.healthCheck()

      expect(health).toBeDefined()
      expect(health.overall_status).toMatch(/healthy|warning|critical/)
      expect(health.policy_engine).toBeDefined()
      expect(health.content_scanner).toBeDefined()
      expect(health.audit_system).toBeDefined()
      expect(health.compliance_reports).toBeDefined()

      expect(typeof health.policy_engine.policies_loaded).toBe('number')
      expect(health.policy_engine.policies_loaded).toBeGreaterThan(0)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid workspace ID gracefully', async () => {
      const invalidAuth = {
        user_id: testAuth.user_id,
        workspace_id: 'invalid_workspace',
        key_type: 'workspace' as const,
      }

      await expect(
        governanceComplianceService.getPolicies('invalid_workspace', invalidAuth)
      ).resolves.toEqual(expect.any(Array))
      // Should return empty array for non-existent workspace
    })

    it('should handle malformed content in compliance evaluation', async () => {
      const context: GovernanceContext = {
        workspace_id: testWorkspaceId,
        user_id: testAuth.user_id,
        permissions: ['read', 'write'],
      }

      // Test with various edge cases
      const testCases = [
        '', // Empty string
        ' '.repeat(1000), // Whitespace
        '🎉🎊🎈', // Unicode/emojis
        '\n\r\t', // Control characters
        'a'.repeat(10000), // Very long string
      ]

      for (const testContent of testCases) {
        const results = await governanceComplianceService.evaluateCompliance(
          testContent,
          context,
          testAuth
        )

        expect(results).toBeDefined()
        expect(Array.isArray(results)).toBe(true)
        // Should not throw errors regardless of content
      }
    })

    it('should handle concurrent policy evaluations', async () => {
      const testContent = 'Test content with SSN 123-45-6789 and email test@example.com'
      const context: GovernanceContext = {
        workspace_id: testWorkspaceId,
        user_id: testAuth.user_id,
        permissions: ['read', 'write'],
      }

      // Run multiple evaluations concurrently
      const promises = Array(10)
        .fill(null)
        .map(() => governanceComplianceService.evaluateCompliance(testContent, context, testAuth))

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach((result) => {
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
      })
    })

    it('should validate policy rule configurations', async () => {
      const invalidPolicyData: Omit<
        GovernancePolicy,
        'id' | 'created_at' | 'updated_at' | 'version'
      > = {
        workspace_id: testWorkspaceId,
        Name: 'Invalid Policy',
        description: 'Policy with invalid rules',
        category: 'data_governance',
        type: 'mandatory',
        status: 'draft',
        priority: 'high',
        rules: [
          {
            id: 'invalid_rule',
            condition: {
              field: 'content',
              operator: 'regex',
              value: '[invalid regex(', // Invalid regex pattern
            },
            action: {
              type: 'block',
              parameters: {},
              message: 'Invalid rule',
              severity: 'medium',
            },
          },
        ],
        enforcement_level: 'block',
        created_by: testAuth.user_id,
        last_modified_by: testAuth.user_id,
      }

      // Should handle invalid regex gracefully during evaluation
      const policy = await governanceComplianceService.createPolicy(invalidPolicyData, testAuth)
      expect(policy).toBeDefined()

      const context: GovernanceContext = {
        workspace_id: testWorkspaceId,
        user_id: testAuth.user_id,
        permissions: ['read', 'write'],
      }

      // Evaluation should not fail, but may not detect violations due to invalid regex
      const results = await governanceComplianceService.evaluateCompliance(
        'test content',
        context,
        testAuth
      )

      expect(results).toBeDefined()
    })
  })

  describe('Performance and Scale Testing', () => {
    it('should handle large content efficiently', async () => {
      const largeContent = `${'a'.repeat(50000)} SSN: 123-45-6789 ${'b'.repeat(50000)}`
      const context: GovernanceContext = {
        workspace_id: testWorkspaceId,
        user_id: testAuth.user_id,
        permissions: ['read', 'write'],
      }

      const startTime = Date.now()
      const results = await governanceComplianceService.evaluateCompliance(
        largeContent,
        context,
        testAuth
      )
      const duration = Date.now() - startTime

      expect(results).toBeDefined()
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle multiple policies efficiently', async () => {
      // Create multiple test policies
      const policyPromises = Array(5)
        .fill(null)
        .map((_, index) => {
          const policyData: Omit<GovernancePolicy, 'id' | 'created_at' | 'updated_at' | 'version'> =
            {
              workspace_id: testWorkspaceId,
              Name: `Test Policy ${index}`,
              description: `Test policy ${index} for performance testing`,
              category: 'content_filtering',
              type: 'advisory',
              status: 'active',
              priority: 'low',
              rules: [
                {
                  id: `rule_${index}`,
                  condition: {
                    field: 'content',
                    operator: 'contains',
                    value: `test${index}`,
                  },
                  action: {
                    type: 'flag',
                    parameters: {},
                    message: `Test ${index} detected`,
                    severity: 'low',
                  },
                },
              ],
              enforcement_level: 'monitor',
              created_by: testAuth.user_id,
              last_modified_by: testAuth.user_id,
            }

          return governanceComplianceService.createPolicy(policyData, testAuth)
        })

      await Promise.all(policyPromises)

      const testContent = 'This content contains test0, test1, test2, test3, and test4'
      const context: GovernanceContext = {
        workspace_id: testWorkspaceId,
        user_id: testAuth.user_id,
        permissions: ['read', 'write'],
      }

      const startTime = Date.now()
      const results = await governanceComplianceService.evaluateCompliance(
        testContent,
        context,
        testAuth
      )
      const duration = Date.now() - startTime

      expect(results.length).toBeGreaterThan(5) // Should evaluate all policies
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })
})
