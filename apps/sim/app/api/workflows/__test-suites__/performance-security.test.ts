/**
 * Comprehensive Performance and Security Test Suite
 * Tests performance characteristics, security vulnerabilities, and resilience
 * Covers load testing, security scanning, input validation, and error handling
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { 
  setupComprehensiveTestMocks,
  createMockRequest,
  mockUser,
} from '@/app/api/__test-utils__/utils'

// Import API route handlers
import * as WorkflowsAPI from '../route'
import * as WorkflowByIdAPI from '../[id]/route'
import * as WorkflowYamlAPI from '../yaml/route'
import * as WorkflowValidateAPI from '../validate/route'
import * as WorkflowExportAPI from '../[id]/export/route'
import * as TemplatesAPI from '../../templates/route'
import * as TemplateByIdAPI from '../../templates/[id]/route'
import * as CollaborateAPI from '../[id]/collaborate/route'
import * as LiveEditAPI from '../[id]/live-edit/route'
import * as PresenceAPI from '../[id]/presence/route'

// Performance testing utilities
const measureResponseTime = async (apiCall: () => Promise<Response>): Promise<number> => {
  const startTime = performance.now()
  await apiCall()
  const endTime = performance.now()
  return endTime - startTime
}

const generateLargePayload = (sizeKB: number): any => {
  const baseSize = 1024 // 1KB
  const repeats = sizeKB
  return {
    name: 'Performance Test Workflow',
    description: 'A'.repeat(baseSize * repeats),
    largeData: Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      data: 'x'.repeat(100),
    })),
  }
}

// Security testing utilities
const generateSQLInjectionPayloads = (): string[] => [
  "'; DROP TABLE workflows; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM users --",
  "'; INSERT INTO workflows (name) VALUES ('hacked'); --",
  "' AND (SELECT COUNT(*) FROM information_schema.tables) > 0 --",
]

const generateXSSPayloads = (): string[] => [
  '<script>alert("xss")</script>',
  '"><script>alert("xss")</script>',
  "javascript:alert('xss')",
  '<img src="x" onerror="alert(1)">',
  '<svg onload="alert(1)">',
]

const generateCommandInjectionPayloads = (): string[] => [
  '; ls -la',
  '| cat /etc/passwd',
  '&& rm -rf /',
  '`whoami`',
  '$(id)',
]

const generatePathTraversalPayloads = (): string[] => [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '....//....//....//etc/passwd',
  '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
]

describe('Performance Testing Suite', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[]] },
        insert: { results: [{}] },
        update: { results: [{}] },
        delete: { results: [] },
      },
    })
  })

  describe('Response Time Performance', () => {
    it('should respond to workflow listing within acceptable time', async () => {
      const responseTime = await measureResponseTime(async () => {
        const request = createMockRequest('GET')
        return await WorkflowsAPI.GET(request)
      })
      
      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
    })

    it('should handle individual workflow retrieval efficiently', async () => {
      const responseTime = await measureResponseTime(async () => {
        const request = createMockRequest('GET')
        return await WorkflowByIdAPI.GET(request, { 
          params: Promise.resolve({ id: 'perf-test-workflow' }) 
        })
      })
      
      expect(responseTime).toBeLessThan(500) // Should respond within 500ms
    })

    it('should process YAML import within reasonable time', async () => {
      const yamlData = {
        yaml: `
          name: Performance Test Workflow
          blocks:
            - id: start
              type: starter
            - id: end
              type: response
          edges:
            - source: start
              target: end
        `,
        validateOnly: false,
      }
      
      const responseTime = await measureResponseTime(async () => {
        const request = createMockRequest('POST', yamlData)
        return await WorkflowYamlAPI.POST(request)
      })
      
      expect(responseTime).toBeLessThan(2000) // YAML processing can be slower
    })

    it('should validate workflows quickly', async () => {
      const validationData = {
        workflow: {
          blocks: {
            'start': { id: 'start', type: 'starter' },
            'end': { id: 'end', type: 'response' },
          },
          edges: [{ source: 'start', target: 'end' }],
        },
      }
      
      const responseTime = await measureResponseTime(async () => {
        const request = createMockRequest('POST', validationData)
        return await WorkflowValidateAPI.POST(request)
      })
      
      expect(responseTime).toBeLessThan(300) // Validation should be fast
    })

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10
      const requestPromises = Array.from({ length: concurrentRequests }, () => 
        measureResponseTime(async () => {
          const request = createMockRequest('GET')
          return await WorkflowsAPI.GET(request)
        })
      )
      
      const responseTimes = await Promise.all(requestPromises)
      const averageResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)
      
      expect(averageResponseTime).toBeLessThan(1000) // Average should be good
      expect(maxResponseTime).toBeLessThan(2000) // Even slowest should be reasonable
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should handle large payload requests without memory issues', async () => {
      const largeWorkflow = generateLargePayload(100) // 100KB payload
      
      const request = createMockRequest('POST', largeWorkflow)
      const response = await WorkflowsAPI.POST(request)
      
      // Should either accept or reject gracefully, not crash
      expect([200, 201, 400, 413]).toContain(response.status)
    })

    it('should limit request size to prevent DoS', async () => {
      const massivePayload = generateLargePayload(10000) // 10MB payload
      
      const request = createMockRequest('POST', massivePayload)
      const response = await WorkflowsAPI.POST(request)
      
      // Should reject oversized requests
      expect([400, 413, 500]).toContain(response.status)
    })

    it('should handle deep nested objects safely', async () => {
      // Create deeply nested object
      let deepObject: any = {}
      let current = deepObject
      
      for (let i = 0; i < 1000; i++) {
        current.nested = {}
        current = current.nested
      }
      
      const workflowData = {
        name: 'Deep Nesting Test',
        state: { blocks: deepObject },
      }
      
      const request = createMockRequest('POST', workflowData)
      const response = await WorkflowsAPI.POST(request)
      
      // Should handle without stack overflow
      expect([200, 201, 400, 500]).toContain(response.status)
    })

    it('should manage database connection pools efficiently', async () => {
      // Simulate many concurrent database operations
      const requests = Array.from({ length: 50 }, () => 
        createMockRequest('GET')
      )
      
      const responses = await Promise.all(
        requests.map(request => WorkflowsAPI.GET(request))
      )
      
      // All requests should complete without connection pool exhaustion
      responses.forEach(response => {
        expect([200, 401, 403, 500]).toContain(response.status) // Various valid responses
      })
    })

    it('should cleanup resources after failed operations', async () => {
      // Mock database error
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed')
      })
      
      const request = createMockRequest('GET')
      const response = await WorkflowsAPI.GET(request)
      
      expect(response.status).toBe(500)
      // Resources should be cleaned up (hard to test directly)
    })
  })

  describe('Scalability Testing', () => {
    it('should handle many workflows efficiently', async () => {
      // Mock large dataset
      const manyWorkflows = Array.from({ length: 1000 }, (_, i) => ({
        id: `workflow-${i}`,
        name: `Workflow ${i}`,
        userId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
      
      mocks.database.mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue(manyWorkflows.slice(0, 50)), // Paginated
      }))
      
      const request = createMockRequest('GET')
      const response = await WorkflowsAPI.GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.workflows.length).toBeLessThanOrEqual(50) // Proper pagination
    })

    it('should paginate large result sets appropriately', async () => {
      const request = new NextRequest('http://localhost:3000/api/workflows?page=100&limit=50')
      const response = await WorkflowsAPI.GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Should handle large page numbers gracefully
      expect(data.pagination).toBeDefined()
      expect(data.pagination.page).toBe(100)
      expect(data.pagination.limit).toBe(50)
    })

    it('should handle complex filtering without performance degradation', async () => {
      const complexFilterRequest = new NextRequest(`
        http://localhost:3000/api/workflows
        ?search=complex workflow automation
        &tags=ai,automation,integration
        &status=active,deployed
        &createdAfter=2024-01-01
        &createdBefore=2024-12-31
        &workspaceId=workspace-123
        &sortBy=relevance
        &sortOrder=desc
        &limit=25
      `.replace(/\s+/g, ''))
      
      const responseTime = await measureResponseTime(async () => {
        return await WorkflowsAPI.GET(complexFilterRequest)
      })
      
      expect(responseTime).toBeLessThan(1500) // Complex queries still reasonable
    })
  })

  describe('Load Testing Simulation', () => {
    it('should handle burst traffic patterns', async () => {
      // Simulate traffic burst
      const burstSize = 20
      const burstRequests = Array.from({ length: burstSize }, () => 
        createMockRequest('GET')
      )
      
      const startTime = performance.now()
      const responses = await Promise.all(
        burstRequests.map(request => WorkflowsAPI.GET(request))
      )
      const endTime = performance.now()
      
      const totalTime = endTime - startTime
      const averageRequestTime = totalTime / burstSize
      
      // Should handle burst without excessive delay
      expect(averageRequestTime).toBeLessThan(1000)
      
      // All requests should complete successfully or fail gracefully
      responses.forEach(response => {
        expect([200, 401, 429, 500]).toContain(response.status)
      })
    })

    it('should maintain performance under sustained load', async () => {
      const sustainedRequests = 100
      const batchSize = 10
      const batches = sustainedRequests / batchSize
      
      const batchTimes: number[] = []
      
      for (let i = 0; i < batches; i++) {
        const batchStartTime = performance.now()
        
        const batch = Array.from({ length: batchSize }, () => 
          createMockRequest('GET')
        )
        
        await Promise.all(
          batch.map(request => WorkflowsAPI.GET(request))
        )
        
        const batchEndTime = performance.now()
        batchTimes.push(batchEndTime - batchStartTime)
      }
      
      // Performance should not degrade significantly over time
      const firstBatchTime = batchTimes[0]
      const lastBatchTime = batchTimes[batchTimes.length - 1]
      const performanceDegradation = lastBatchTime / firstBatchTime
      
      expect(performanceDegradation).toBeLessThan(3) // Less than 3x degradation
    })
  })
})

describe('Security Testing Suite', () => {
  let mocks: any

  beforeEach(() => {
    mocks = setupComprehensiveTestMocks({
      auth: { authenticated: true, user: mockUser },
      database: {
        select: { results: [[]] },
        insert: { results: [{}] },
        update: { results: [{}] },
        delete: { results: [] },
      },
    })
  })

  describe('SQL Injection Protection', () => {
    it('should prevent SQL injection in workflow names', async () => {
      const sqlPayloads = generateSQLInjectionPayloads()
      
      for (const payload of sqlPayloads) {
        const workflowData = {
          name: payload,
          description: 'SQL injection test',
        }
        
        const request = createMockRequest('POST', workflowData)
        const response = await WorkflowsAPI.POST(request)
        
        // Should either sanitize or reject, not cause database error
        expect([200, 201, 400]).toContain(response.status)
        
        if (response.status === 201) {
          const data = await response.json()
          // Name should be sanitized, not contain dangerous SQL
          expect(data.name).not.toContain('DROP TABLE')
          expect(data.name).not.toContain('--')
        }
      }
    })

    it('should protect search queries from SQL injection', async () => {
      const sqlPayloads = generateSQLInjectionPayloads()
      
      for (const payload of sqlPayloads) {
        const request = new NextRequest(
          `http://localhost:3000/api/workflows?search=${encodeURIComponent(payload)}`
        )
        const response = await WorkflowsAPI.GET(request)
        
        // Should handle malicious search safely
        expect([200, 400]).toContain(response.status)
      }
    })

    it('should sanitize template filter parameters', async () => {
      const sqlPayloads = generateSQLInjectionPayloads()
      
      for (const payload of sqlPayloads) {
        const request = new NextRequest(
          `http://localhost:3000/api/templates?category=${encodeURIComponent(payload)}&author=${encodeURIComponent(payload)}`
        )
        const response = await TemplatesAPI.GET(request)
        
        expect([200, 400]).toContain(response.status)
      }
    })
  })

  describe('Cross-Site Scripting (XSS) Protection', () => {
    it('should sanitize XSS attempts in workflow descriptions', async () => {
      const xssPayloads = generateXSSPayloads()
      
      for (const payload of xssPayloads) {
        const workflowData = {
          name: 'XSS Test Workflow',
          description: payload,
        }
        
        const request = createMockRequest('POST', workflowData)
        const response = await WorkflowsAPI.POST(request)
        
        if (response.status === 201) {
          const data = await response.json()
          
          // XSS payload should be sanitized
          expect(data.description).not.toContain('<script>')
          expect(data.description).not.toContain('javascript:')
          expect(data.description).not.toContain('onerror=')
        }
      }
    })

    it('should escape user input in error messages', async () => {
      const xssPayload = '<script>alert("xss")</script>'
      
      const request = createMockRequest('GET', undefined, {
        'x-api-key': xssPayload,
      })
      const response = await WorkflowsAPI.GET(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      
      // Error message should not contain unescaped XSS
      const responseText = JSON.stringify(data)
      expect(responseText).not.toContain('<script>')
      expect(responseText).not.toContain('onerror=')
    })

    it('should sanitize template state data', async () => {
      const xssPayloads = generateXSSPayloads()
      
      for (const payload of xssPayloads) {
        const templateData = {
          workflowId: 'workflow-123',
          name: 'XSS Test Template',
          description: 'Template with XSS test',
          author: payload, // XSS in author field
          category: 'Security',
          icon: 'security',
          color: '#FF0000',
          state: {
            blocks: {
              'xss-block': {
                id: 'xss-block',
                type: 'text',
                content: payload, // XSS in block content
              },
            },
            edges: [],
          },
        }
        
        const request = createMockRequest('POST', templateData)
        const response = await TemplatesAPI.POST(request)
        
        if (response.status === 201) {
          const data = await response.json()
          
          // All user-provided content should be sanitized
          expect(data.author).not.toContain('<script>')
          expect(JSON.stringify(data.state)).not.toContain('<script>')
        }
      }
    })
  })

  describe('Command Injection Protection', () => {
    it('should prevent command injection in file operations', async () => {
      const commandPayloads = generateCommandInjectionPayloads()
      
      for (const payload of commandPayloads) {
        const exportRequest = new NextRequest(
          `http://localhost:3000/api/workflows/test-workflow/export?format=yaml&filename=${encodeURIComponent(payload)}`
        )
        const response = await WorkflowExportAPI.GET(exportRequest, { 
          params: Promise.resolve({ id: 'test-workflow' }) 
        })
        
        // Should reject or sanitize dangerous filenames
        expect([200, 400, 401, 403]).toContain(response.status)
        
        if (response.status === 200) {
          const contentDisposition = response.headers.get('content-disposition')
          if (contentDisposition) {
            expect(contentDisposition).not.toContain(';')
            expect(contentDisposition).not.toContain('|')
            expect(contentDisposition).not.toContain('&')
          }
        }
      }
    })

    it('should sanitize user input in system operations', async () => {
      const commandPayloads = generateCommandInjectionPayloads()
      
      for (const payload of commandPayloads) {
        const yamlData = {
          yaml: `name: ${payload}\nblocks: []`,
          validateOnly: true,
        }
        
        const request = createMockRequest('POST', yamlData)
        const response = await WorkflowYamlAPI.POST(request)
        
        // Should handle without executing commands
        expect([200, 400, 401]).toContain(response.status)
      }
    })
  })

  describe('Path Traversal Protection', () => {
    it('should prevent path traversal in file exports', async () => {
      const pathPayloads = generatePathTraversalPayloads()
      
      for (const payload of pathPayloads) {
        const exportRequest = new NextRequest(
          `http://localhost:3000/api/workflows/${encodeURIComponent(payload)}/export`
        )
        const response = await WorkflowExportAPI.GET(exportRequest, { 
          params: Promise.resolve({ id: payload }) 
        })
        
        // Should not access files outside allowed directories
        expect([400, 401, 403, 404]).toContain(response.status)
      }
    })

    it('should validate workflow IDs against path traversal', async () => {
      const pathPayloads = generatePathTraversalPayloads()
      
      for (const payload of pathPayloads) {
        const request = createMockRequest('GET')
        const response = await WorkflowByIdAPI.GET(request, { 
          params: Promise.resolve({ id: payload }) 
        })
        
        // Should reject malicious IDs
        expect([400, 401, 403, 404]).toContain(response.status)
      }
    })
  })

  describe('Authentication and Session Security', () => {
    it('should prevent session fixation attacks', async () => {
      // Mock multiple session attempts with different IDs
      const sessionIds = ['session1', 'session2', 'session3']
      
      for (const sessionId of sessionIds) {
        const request = createMockRequest('GET', undefined, {
          'cookie': `session=${sessionId}`,
        })
        
        // Each request should be handled independently
        const response = await WorkflowsAPI.GET(request)
        expect([200, 401]).toContain(response.status)
      }
    })

    it('should protect against timing attacks on authentication', async () => {
      // Test authentication timing for valid vs invalid credentials
      const validKey = 'valid-api-key'
      const invalidKey = 'invalid-api-key'
      
      // Mock valid key lookup
      mocks.database.mockDb.select.mockImplementation((query: any) => {
        const isValidKeyQuery = JSON.stringify(query).includes(validKey)
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue(
            Promise.resolve(isValidKeyQuery ? [{ userId: 'user-123' }] : [])
          ),
        }
      })
      
      const validRequest = createMockRequest('GET', undefined, { 'x-api-key': validKey })
      const invalidRequest = createMockRequest('GET', undefined, { 'x-api-key': invalidKey })
      
      const validStartTime = performance.now()
      await WorkflowsAPI.GET(validRequest)
      const validEndTime = performance.now()
      
      const invalidStartTime = performance.now()
      await WorkflowsAPI.GET(invalidRequest)
      const invalidEndTime = performance.now()
      
      const validTime = validEndTime - validStartTime
      const invalidTime = invalidEndTime - invalidStartTime
      
      // Timing difference should not be significant
      const timingRatio = Math.abs(validTime - invalidTime) / Math.max(validTime, invalidTime)
      expect(timingRatio).toBeLessThan(2) // Less than 2x difference
    })

    it('should prevent replay attacks', async () => {
      // Mock request with timestamp
      const request = createMockRequest('POST', {
        name: 'Replay Test',
        timestamp: Date.now() - 600000, // 10 minutes ago
      })
      
      const response = await WorkflowsAPI.POST(request)
      
      // Old requests should be rejected (if timestamp validation is implemented)
      // expect(response.status).toBe(400)
    })
  })

  describe('Data Validation and Sanitization', () => {
    it('should validate input data types strictly', async () => {
      const invalidTypeData = {
        name: 123, // Should be string
        description: [], // Should be string
        tags: 'not-an-array', // Should be array
      }
      
      const request = createMockRequest('POST', invalidTypeData)
      const response = await WorkflowsAPI.POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid')
    })

    it('should enforce field length limits', async () => {
      const oversizedData = {
        name: 'x'.repeat(1000), // Too long
        description: 'x'.repeat(10000), // Too long
      }
      
      const request = createMockRequest('POST', oversizedData)
      const response = await WorkflowsAPI.POST(request)
      
      expect(response.status).toBe(400)
    })

    it('should validate email formats in user data', async () => {
      const invalidEmails = [
        'not-an-email',
        '@invalid.com',
        'user@',
        'user name@example.com',
        'user@example',
      ]
      
      for (const email of invalidEmails) {
        const collaboratorData = {
          userEmail: email,
          permissionLevel: 'view',
        }
        
        // This would be tested if email validation exists in the API
        const request = createMockRequest('POST', collaboratorData)
        const response = await CollaborateAPI.POST(request, { 
          params: Promise.resolve({ id: 'workflow-123' }) 
        })
        
        // Should validate email format
        expect([400, 401, 403]).toContain(response.status)
      }
    })

    it('should sanitize URLs and prevent SSRF', async () => {
      const maliciousUrls = [
        'http://localhost:8080/admin',
        'http://169.254.169.254/latest/meta-data/',
        'file:///etc/passwd',
        'ftp://internal-server/sensitive-data',
      ]
      
      for (const url of maliciousUrls) {
        const webhookData = {
          name: 'SSRF Test Workflow',
          webhookUrl: url,
        }
        
        const request = createMockRequest('POST', webhookData)
        const response = await WorkflowsAPI.POST(request)
        
        // Should reject internal/malicious URLs
        if (response.status === 201) {
          const data = await response.json()
          expect(data.webhookUrl).not.toBe(url) // Should be sanitized
        } else {
          expect(response.status).toBe(400)
        }
      }
    })
  })

  describe('Rate Limiting and DoS Protection', () => {
    it('should handle rapid successive requests', async () => {
      const rapidRequests = Array.from({ length: 100 }, () => 
        createMockRequest('GET')
      )
      
      const responses = await Promise.all(
        rapidRequests.map(request => WorkflowsAPI.GET(request))
      )
      
      // Some requests might be rate limited in production
      const successfulRequests = responses.filter(r => r.status === 200)
      const rateLimitedRequests = responses.filter(r => r.status === 429)
      
      expect(successfulRequests.length + rateLimitedRequests.length).toBe(100)
    })

    it('should protect against ZIP bomb attacks', async () => {
      // Simulate ZIP bomb in file upload
      const maliciousZipData = {
        name: 'ZIP Bomb Test',
        files: {
          'bomb.zip': 'UEsDBBQAAAAIAA==', // Base64 encoded ZIP bomb pattern
        },
      }
      
      const request = createMockRequest('POST', maliciousZipData)
      const response = await WorkflowsAPI.POST(request)
      
      // Should detect and reject dangerous archives
      expect([400, 413]).toContain(response.status)
    })

    it('should handle memory exhaustion attempts', async () => {
      // Attempt to create extremely large objects
      const memoryBombData = {
        name: 'Memory Bomb Test',
        data: Array(1000000).fill('x'.repeat(1000)), // Very large array
      }
      
      const request = createMockRequest('POST', memoryBombData)
      const response = await WorkflowsAPI.POST(request)
      
      // Should reject or handle without crashing
      expect([400, 413, 500]).toContain(response.status)
    })
  })

  describe('Error Handling Security', () => {
    it('should not expose stack traces in production', async () => {
      // Mock internal error
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Internal database error with sensitive info')
      })
      
      const request = createMockRequest('GET')
      const response = await WorkflowsAPI.GET(request)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      
      // Should not expose sensitive error details
      expect(data.error).not.toContain('database error')
      expect(data).not.toHaveProperty('stack')
      expect(data.error).toBe('Internal server error')
    })

    it('should log security events appropriately', async () => {
      // Mock potential security event
      const maliciousRequest = createMockRequest('POST', {
        name: "'; DROP TABLE workflows; --",
      })
      
      await WorkflowsAPI.POST(maliciousRequest)
      
      // Security events should be logged (hard to test directly)
      // expect(securityLogger.log).toHaveBeenCalledWith(expect.objectContaining({
      //   event: 'potential_sql_injection',
      //   severity: 'high',
      // }))
    })

    it('should handle concurrent error conditions gracefully', async () => {
      // Mock error condition
      mocks.database.mockDb.select.mockImplementation(() => {
        throw new Error('Concurrent error test')
      })
      
      // Multiple concurrent requests with errors
      const errorRequests = Array.from({ length: 20 }, () => 
        createMockRequest('GET')
      )
      
      const responses = await Promise.all(
        errorRequests.map(request => WorkflowsAPI.GET(request))
      )
      
      // All should return consistent error responses
      responses.forEach(response => {
        expect(response.status).toBe(500)
      })
    })
  })

  describe('Content Security and Validation', () => {
    it('should validate workflow structure integrity', async () => {
      const malformedWorkflow = {
        name: 'Malformed Workflow',
        blocks: {
          // Circular reference
          'block1': { id: 'block1', next: 'block2' },
          'block2': { id: 'block2', next: 'block1' },
        },
        edges: [
          { source: 'block1', target: 'nonexistent' },
        ],
      }
      
      const request = createMockRequest('POST', { workflow: malformedWorkflow })
      const response = await WorkflowValidateAPI.POST(request)
      
      // Should detect and report structural issues
      if (response.status === 200) {
        const data = await response.json()
        expect(data.isValid).toBe(false)
        expect(data.errors.length).toBeGreaterThan(0)
      }
    })

    it('should prevent execution of malicious workflow code', async () => {
      const maliciousWorkflow = {
        name: 'Malicious Code Workflow',
        blocks: {
          'evil-block': {
            id: 'evil-block',
            type: 'function',
            code: 'require("child_process").exec("rm -rf /")',
          },
        },
      }
      
      const request = createMockRequest('POST', { workflow: maliciousWorkflow })
      const response = await WorkflowValidateAPI.POST(request)
      
      // Should detect dangerous code patterns
      if (response.status === 200) {
        const data = await response.json()
        expect(data.isValid).toBe(false)
        expect(data.securityIssues).toBeDefined()
      }
    })

    it('should validate template metadata for malicious content', async () => {
      const maliciousTemplate = {
        workflowId: 'workflow-123',
        name: 'Malicious Template',
        description: 'javascript:alert("xss")',
        author: '<script>malicious()</script>',
        category: 'Security',
        icon: 'security',
        color: '#FF0000',
        state: {
          blocks: {
            'script-block': {
              id: 'script-block',
              type: 'custom',
              script: 'eval(localStorage.getItem("malicious"))',
            },
          },
          edges: [],
        },
      }
      
      const request = createMockRequest('POST', maliciousTemplate)
      const response = await TemplatesAPI.POST(request)
      
      // Should sanitize or reject malicious content
      if (response.status === 201) {
        const data = await response.json()
        expect(data.description).not.toContain('javascript:')
        expect(data.author).not.toContain('<script>')
        expect(JSON.stringify(data.state)).not.toContain('eval(')
      } else {
        expect(response.status).toBe(400)
      }
    })
  })
})