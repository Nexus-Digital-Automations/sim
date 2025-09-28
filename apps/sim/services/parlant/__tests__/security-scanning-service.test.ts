/**
 * Security Scanning Service Test Suite
 * ===================================
 *
 * Comprehensive test suite for security scanning, content filtering,
 * threat detection, and compliance validation. Tests cover pattern
 * matching, ML detection, performance, and error handling scenarios.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { ScanType, SecurityScanRequest } from '../governance-compliance-types'
import {
  quickSecurityScan,
  safeFilterContent,
  securityScanningService,
} from '../security-scanning-service'

describe('SecurityScanningService', () => {
  let testWorkspaceId: string

  beforeEach(() => {
    testWorkspaceId = `test_workspace_${Date.now()}`
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Security Scanning', () => {
    it('should detect Social Security Numbers', async () => {
      const testContent = 'Please update customer record with SSN: 123-45-6789'
      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      const scanRequest: SecurityScanRequest = {
        content: testContent,
        scan_type: 'real_time',
      }

      const result = await securityScanningService.scanContent(scanRequest, context)

      expect(result).toBeDefined()
      expect(result.status).toBe('completed')
      expect(result.violations.length).toBeGreaterThan(0)

      const ssnViolation = result.violations.find((v) => v.type === 'pii_exposure')
      expect(ssnViolation).toBeDefined()
      expect(ssnViolation!.severity).toBe('critical')
      expect(ssnViolation!.evidence.matched_text).toMatch(/\d{3}-\d{2}-\d{4}/)
    })

    it('should detect credit card numbers', async () => {
      const testContent = 'Customer payment info: 4532-1234-5678-9012'
      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      const scanRequest: SecurityScanRequest = {
        content: testContent,
        scan_type: 'real_time',
      }

      const result = await securityScanningService.scanContent(scanRequest, context)

      expect(result.violations.length).toBeGreaterThan(0)

      const ccViolation = result.violations.find(
        (v) => v.type === 'pii_exposure' && v.description.toLowerCase().includes('credit card')
      )
      expect(ccViolation).toBeDefined()
      expect(ccViolation!.severity).toBe('critical')
    })

    it('should detect email addresses', async () => {
      const testContent = 'Contact customer at john.doe@example.com for follow-up'
      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      const scanRequest: SecurityScanRequest = {
        content: testContent,
        scan_type: 'real_time',
      }

      const result = await securityScanningService.scanContent(scanRequest, context)

      expect(result.violations.length).toBeGreaterThan(0)

      const emailViolation = result.violations.find((v) => v.type === 'pii_exposure')
      expect(emailViolation).toBeDefined()
      expect(emailViolation!.severity).toBe('medium')
      expect(emailViolation!.evidence.matched_text).toBe('john.doe@example.com')
    })

    it('should detect phone numbers', async () => {
      const testContent = 'Customer phone: (555) 123-4567'
      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      const scanRequest: SecurityScanRequest = {
        content: testContent,
        scan_type: 'real_time',
      }

      const result = await securityScanningService.scanContent(scanRequest, context)

      expect(result.violations.length).toBeGreaterThan(0)

      const phoneViolation = result.violations.find(
        (v) => v.type === 'pii_exposure' && v.description.toLowerCase().includes('phone')
      )
      expect(phoneViolation).toBeDefined()
      expect(phoneViolation!.severity).toBe('medium')
    })

    it('should handle clean content without violations', async () => {
      const testContent = 'This is a normal business message without sensitive information'
      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      const scanRequest: SecurityScanRequest = {
        content: testContent,
        scan_type: 'real_time',
      }

      const result = await securityScanningService.scanContent(scanRequest, context)

      expect(result.status).toBe('completed')
      expect(result.violations).toHaveLength(0)
      expect(result.risk_score).toBe(0)
      expect(result.confidence_level).toBe(1.0)
    })

    it('should calculate appropriate risk scores', async () => {
      const testCases = [
        {
          content: 'SSN: 123-45-6789, CC: 4532-1234-5678-9012',
          expectedMinRisk: 80, // Multiple critical violations
        },
        {
          content: 'Email: test@example.com',
          expectedMinRisk: 20,
          expectedMaxRisk: 60, // Single medium violation
        },
        {
          content: 'Normal content',
          expectedMinRisk: 0,
          expectedMaxRisk: 0, // No violations
        },
      ]

      for (const testCase of testCases) {
        const context = {
          workspace_id: testWorkspaceId,
          user_id: 'test_user',
        }

        const result = await securityScanningService.scanContent(
          { content: testCase.content, scan_type: 'real_time' },
          context
        )

        expect(result.risk_score).toBeGreaterThanOrEqual(testCase.expectedMinRisk)
        if (testCase.expectedMaxRisk !== undefined) {
          expect(result.risk_score).toBeLessThanOrEqual(testCase.expectedMaxRisk)
        }
      }
    })

    it('should provide appropriate recommendations', async () => {
      const testContent = 'Customer SSN: 123-45-6789 and email: test@example.com'
      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      const result = await securityScanningService.scanContent(
        { content: testContent, scan_type: 'real_time' },
        context
      )

      expect(result.recommendations).toBeDefined()
      expect(result.recommendations.length).toBeGreaterThan(0)
      expect(result.recommendations.some((r) => r.includes('review') || r.includes('redact'))).toBe(
        true
      )
    })
  })

  describe('Content Filtering', () => {
    it('should apply content filtering with redaction', async () => {
      const testContent = 'Customer information: SSN 123-45-6789, Phone (555) 123-4567'

      const result = await securityScanningService.filterContent(testContent, testWorkspaceId, {
        strictness: 'high',
        enable_redaction: true,
      })

      expect(result).toBeDefined()
      expect(result.filtered_content).not.toBe(testContent) // Should be modified
      expect(result.modifications_made.length).toBeGreaterThan(0)
      expect(result.violations_found.length).toBeGreaterThan(0)

      // Should contain redaction markers
      expect(result.filtered_content).toMatch(/\[.*REDACTED.*\]/)
    })

    it('should calculate safety scores correctly', async () => {
      const testCases = [
        {
          content: 'Normal safe content',
          expectedSafetyScore: 100,
        },
        {
          content: 'Content with SSN: 123-45-6789',
          expectedSafetyScore: { min: 40, max: 80 },
        },
        {
          content:
            'Multiple violations: SSN 123-45-6789, CC 4532-1234-5678-9012, Email test@test.com',
          expectedSafetyScore: { min: 0, max: 40 },
        },
      ]

      for (const testCase of testCases) {
        const result = await securityScanningService.filterContent(
          testCase.content,
          testWorkspaceId
        )

        if (typeof testCase.expectedSafetyScore === 'number') {
          expect(result.safety_score).toBe(testCase.expectedSafetyScore)
        } else {
          expect(result.safety_score).toBeGreaterThanOrEqual(testCase.expectedSafetyScore.min)
          expect(result.safety_score).toBeLessThanOrEqual(testCase.expectedSafetyScore.max)
        }
      }
    })

    it('should create custom content filters', async () => {
      const filterData = {
        workspace_id: testWorkspaceId,
        Name: 'Custom Keyword Filter',
        description: 'Filters specific business keywords',
        filter_type: 'custom' as const,
        patterns: [
          {
            pattern: 'confidential',
            pattern_type: 'keyword' as const,
            weight: 8,
            case_sensitive: false,
          },
        ],
        sensitivity_level: 80,
        enabled: true,
        apply_to_incoming: true,
        apply_to_outgoing: true,
      }

      const filter = await securityScanningService.createContentFilter(filterData, {
        user_id: 'test_user',
        key_type: 'workspace',
      })

      expect(filter).toBeDefined()
      expect(filter.id).toMatch(/^filter_/)
      expect(filter.Name).toBe(filterData.Name)
      expect(filter.patterns).toHaveLength(1)
      expect(filter.enabled).toBe(true)
    })

    it('should validate filter pattern configurations', async () => {
      const invalidFilterData = {
        workspace_id: testWorkspaceId,
        Name: 'Invalid Filter',
        description: 'Filter with invalid regex',
        filter_type: 'custom' as const,
        patterns: [
          {
            pattern: '[invalid regex(',
            pattern_type: 'regex' as const,
            weight: 5,
            case_sensitive: false,
          },
        ],
        sensitivity_level: 50,
        enabled: true,
        apply_to_incoming: true,
        apply_to_outgoing: true,
      }

      await expect(
        securityScanningService.createContentFilter(invalidFilterData, {
          user_id: 'test_user',
          key_type: 'workspace',
        })
      ).rejects.toThrow(/Invalid regex pattern/)
    })
  })

  describe('Service Health and Performance', () => {
    it('should provide accurate health status', async () => {
      const health = await securityScanningService.getScanningHealth()

      expect(health).toBeDefined()
      expect(health.status).toMatch(/healthy|degraded|critical/)
      expect(typeof health.active_scans).toBe('number')
      expect(typeof health.queue_size).toBe('number')
      expect(typeof health.average_scan_time_ms).toBe('number')
      expect(typeof health.cache_hit_rate).toBe('number')

      expect(health.violation_trends).toBeDefined()
      expect(Array.isArray(health.violation_trends)).toBe(true)

      expect(health.performance_metrics).toBeDefined()
      expect(typeof health.performance_metrics.scans_per_minute).toBe('number')
      expect(typeof health.performance_metrics.errors_per_hour).toBe('number')
    })

    it('should handle concurrent scans efficiently', async () => {
      const testContent = 'Test content with SSN: 123-45-6789'
      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      // Run multiple scans concurrently
      const concurrentScans = 5
      const promises = Array(concurrentScans)
        .fill(null)
        .map(() =>
          securityScanningService.scanContent(
            { content: testContent, scan_type: 'real_time' },
            context
          )
        )

      const startTime = Date.now()
      const results = await Promise.all(promises)
      const duration = Date.now() - startTime

      expect(results).toHaveLength(concurrentScans)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds

      results.forEach((result) => {
        expect(result.status).toBe('completed')
        expect(result.violations.length).toBeGreaterThan(0)
      })
    })

    it('should handle large content efficiently', async () => {
      const largeContent = `${'a'.repeat(10000)} SSN: 123-45-6789 ${'b'.repeat(10000)}`
      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      const startTime = Date.now()
      const result = await securityScanningService.scanContent(
        { content: largeContent, scan_type: 'real_time' },
        context
      )
      const duration = Date.now() - startTime

      expect(result.status).toBe('completed')
      expect(duration).toBeLessThan(3000) // Should complete within 3 seconds
      expect(result.violations.length).toBeGreaterThan(0) // Should still detect SSN
    })
  })

  describe('Utility Functions', () => {
    it('should perform quick security scan', async () => {
      const testContent = 'Customer SSN is 123-45-6789'

      const result = await quickSecurityScan(testContent, testWorkspaceId, {
        agentId: 'test_agent',
      })

      expect(result).toBeDefined()
      expect(typeof result.safe).toBe('boolean')
      expect(typeof result.riskScore).toBe('number')
      expect(typeof result.violations).toBe('number')

      expect(result.safe).toBe(false) // SSN should make it unsafe
      expect(result.riskScore).toBeGreaterThan(50)
      expect(result.violations).toBeGreaterThan(0)
    })

    it('should safely filter content via utility function', async () => {
      const testContent = 'Message contains SSN: 123-45-6789'

      const result = await safeFilterContent(testContent, testWorkspaceId)

      expect(result).toBeDefined()
      expect(typeof result.filteredContent).toBe('string')
      expect(typeof result.modificationsCount).toBe('number')

      expect(result.filteredContent).not.toBe(testContent)
      expect(result.modificationsCount).toBeGreaterThan(0)
    })

    it('should handle utility function errors gracefully', async () => {
      // Test with empty content
      const emptyResult = await quickSecurityScan('', testWorkspaceId)
      expect(emptyResult.safe).toBe(true)
      expect(emptyResult.riskScore).toBe(0)

      const emptyFilterResult = await safeFilterContent('', testWorkspaceId)
      expect(emptyFilterResult.filteredContent).toBe('')
      expect(emptyFilterResult.modificationsCount).toBe(0)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty content gracefully', async () => {
      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      const result = await securityScanningService.scanContent(
        { content: '', scan_type: 'real_time' },
        context
      )

      expect(result.status).toBe('completed')
      expect(result.violations).toHaveLength(0)
      expect(result.risk_score).toBe(0)
    })

    it('should handle malformed content', async () => {
      const malformedContents = [
        null as any,
        undefined as any,
        123 as any,
        { not: 'string' } as any,
        '\x00\x01\x02', // Binary data
        '🎉🎊🎈', // Unicode emojis
        'a'.repeat(100000), // Very large content
      ]

      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      for (const content of malformedContents) {
        try {
          const result = await securityScanningService.scanContent(
            { content: content || '', scan_type: 'real_time' },
            context
          )

          expect(result).toBeDefined()
          expect(result.status).toMatch(/completed|failed/)
        } catch (error) {
          // Some malformed content may throw errors, which is acceptable
          expect(error).toBeDefined()
        }
      }
    })

    it('should handle invalid scan types', async () => {
      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      const result = await securityScanningService.scanContent(
        {
          content: 'test content',
          scan_type: 'invalid_type' as ScanType,
        },
        context
      )

      // Should handle gracefully and default to real_time
      expect(result.status).toMatch(/completed|failed/)
    })

    it('should handle workspace isolation correctly', async () => {
      const content = 'Test content with SSN: 123-45-6789'
      const workspace1 = 'workspace_1'
      const workspace2 = 'workspace_2'

      // Create custom filter for workspace 1
      await securityScanningService.createContentFilter(
        {
          workspace_id: workspace1,
          Name: 'Workspace 1 Filter',
          description: 'Custom filter',
          filter_type: 'custom',
          patterns: [
            {
              pattern: 'test',
              pattern_type: 'keyword',
              weight: 5,
              case_sensitive: false,
            },
          ],
          sensitivity_level: 50,
          enabled: true,
          apply_to_incoming: true,
          apply_to_outgoing: true,
        },
        { user_id: 'test_user', key_type: 'workspace' }
      )

      const result1 = await securityScanningService.filterContent(content, workspace1)

      const result2 = await securityScanningService.filterContent(content, workspace2)

      // Both should detect SSN, but workspace1 might have additional filtering
      expect(result1.violations_found.length).toBeGreaterThan(0)
      expect(result2.violations_found.length).toBeGreaterThan(0)
    })

    it('should handle scan timeouts gracefully', async () => {
      // This test simulates timeout scenarios
      const veryLargeContent = 'test content '.repeat(100000)
      const context = {
        workspace_id: testWorkspaceId,
        user_id: 'test_user',
      }

      const startTime = Date.now()
      const result = await securityScanningService.scanContent(
        { content: veryLargeContent, scan_type: 'real_time' },
        context
      )
      const duration = Date.now() - startTime

      // Should complete or timeout gracefully
      expect(result).toBeDefined()
      expect(result.status).toMatch(/completed|failed/)
      expect(duration).toBeLessThan(30000) // Should not hang indefinitely
    })

    it('should validate pattern syntax during filter creation', async () => {
      const invalidPatterns = [
        { pattern: '[unclosed', pattern_type: 'regex' as const },
        { pattern: '(unclosed', pattern_type: 'regex' as const },
        { pattern: '*invalid', pattern_type: 'regex' as const },
      ]

      for (const invalidPattern of invalidPatterns) {
        await expect(
          securityScanningService.createContentFilter(
            {
              workspace_id: testWorkspaceId,
              Name: 'Invalid Pattern Filter',
              description: 'Test invalid patterns',
              filter_type: 'custom',
              patterns: [invalidPattern],
              sensitivity_level: 50,
              enabled: true,
              apply_to_incoming: true,
              apply_to_outgoing: true,
            },
            { user_id: 'test_user', key_type: 'workspace' }
          )
        ).rejects.toThrow()
      }
    })
  })
})
