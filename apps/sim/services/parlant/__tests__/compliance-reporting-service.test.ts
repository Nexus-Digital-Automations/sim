/**
 * Compliance Reporting Service Test Suite
 * =======================================
 *
 * Comprehensive test suite for compliance reporting, audit trails,
 * dashboard analytics, and regulatory compliance tracking.
 * Tests cover report generation, audit logging, metrics calculation,
 * and export functionality.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  complianceReportingService,
  logAudit,
  generateComplianceSummary
} from '../compliance-reporting-service'
import {
  ComplianceReportRequest,
  ReportType,
  ReportFormat,
  AuditEventType,
  ViolationSeverity
} from '../governance-compliance-types'
import { AuthContext } from '../types'

describe('ComplianceReportingService', () => {
  let testWorkspaceId: string
  let testAuth: AuthContext

  beforeEach(() => {
    testWorkspaceId = `test_workspace_${Date.now()}`
    testAuth = {
      user_id: 'test_user',
      workspace_id: testWorkspaceId,
      key_type: 'workspace'
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Audit Event Logging', () => {
    it('should log audit events successfully', async () => {
      const auditEvent = await complianceReportingService.logAuditEvent({
        workspace_id: testWorkspaceId,
        event_type: 'policy_violation',
        entity_type: 'content',
        entity_id: 'test_content_001',
        action: 'scan',
        actor_id: testAuth.user_id,
        actor_type: 'user',
        metadata: {
          violation_type: 'pii_exposure',
          severity: 'high',
          content_length: 150
        }
      })

      expect(auditEvent).toBeDefined()
      expect(auditEvent.id).toMatch(/^audit_/)
      expect(auditEvent.workspace_id).toBe(testWorkspaceId)
      expect(auditEvent.event_type).toBe('policy_violation')
      expect(auditEvent.timestamp).toBeDefined()
      expect(auditEvent.retention_date).toBeDefined()
      expect(new Date(auditEvent.retention_date)).toBeInstanceOf(Date)
    })

    it('should generate unique audit event IDs', async () => {
      const eventIds = new Set<string>()

      for (let i = 0; i < 10; i++) {
        const auditEvent = await complianceReportingService.logAuditEvent({
          workspace_id: testWorkspaceId,
          event_type: 'configuration_change',
          entity_type: 'policy',
          entity_id: `policy_${i}`,
          action: 'create',
          actor_id: testAuth.user_id,
          actor_type: 'user'
        })

        expect(eventIds.has(auditEvent.id)).toBe(false)
        eventIds.add(auditEvent.id)
      }

      expect(eventIds.size).toBe(10)
    })

    it('should include comprehensive metadata in audit events', async () => {
      const metadata = {
        policy_name: 'Test Policy',
        enforcement_level: 'block',
        risk_score: 85,
        user_agent: 'Test Browser',
        ip_address: '192.168.1.100'
      }

      const auditEvent = await complianceReportingService.logAuditEvent({
        workspace_id: testWorkspaceId,
        event_type: 'compliance_check',
        entity_type: 'policy',
        entity_id: 'policy_test',
        action: 'validate',
        actor_id: testAuth.user_id,
        actor_type: 'user',
        metadata,
        ip_address: '192.168.1.100',
        risk_score: 85
      })

      expect(auditEvent.metadata).toEqual(metadata)
      expect(auditEvent.ip_address).toBe('192.168.1.100')
      expect(auditEvent.risk_score).toBe(85)
    })
  })

  describe('Audit Event Querying', () => {
    beforeEach(async () => {
      // Create sample audit events for testing
      const sampleEvents = [
        {
          event_type: 'policy_violation' as AuditEventType,
          entity_type: 'content',
          entity_id: 'content_001',
          action: 'scan' as const,
          metadata: { severity: 'high', violation_type: 'pii_exposure' }
        },
        {
          event_type: 'security_scan' as AuditEventType,
          entity_type: 'message',
          entity_id: 'message_001',
          action: 'scan' as const,
          metadata: { scan_duration: 150, violations_found: 2 }
        },
        {
          event_type: 'configuration_change' as AuditEventType,
          entity_type: 'policy',
          entity_id: 'policy_001',
          action: 'update' as const,
          metadata: { version: 2, changes: ['enforcement_level'] }
        }
      ]

      for (const event of sampleEvents) {
        await complianceReportingService.logAuditEvent({
          workspace_id: testWorkspaceId,
          ...event,
          actor_id: testAuth.user_id,
          actor_type: 'user'
        })
      }
    })

    it('should query audit events by workspace', async () => {
      const result = await complianceReportingService.queryAuditEvents(
        { workspace_id: testWorkspaceId },
        testAuth
      )

      expect(result).toBeDefined()
      expect(result.events.length).toBeGreaterThan(0)
      expect(result.total_count).toBeGreaterThan(0)
      expect(typeof result.query_duration_ms).toBe('number')

      result.events.forEach(event => {
        expect(event.workspace_id).toBe(testWorkspaceId)
      })
    })

    it('should filter audit events by event type', async () => {
      const result = await complianceReportingService.queryAuditEvents(
        {
          workspace_id: testWorkspaceId,
          event_types: ['policy_violation']
        },
        testAuth
      )

      expect(result.events.length).toBeGreaterThan(0)
      result.events.forEach(event => {
        expect(event.event_type).toBe('policy_violation')
      })
    })

    it('should filter audit events by entity type', async () => {
      const result = await complianceReportingService.queryAuditEvents(
        {
          workspace_id: testWorkspaceId,
          entity_types: ['policy']
        },
        testAuth
      )

      expect(result.events.length).toBeGreaterThan(0)
      result.events.forEach(event => {
        expect(event.entity_type).toBe('policy')
      })
    })

    it('should apply pagination correctly', async () => {
      const limit = 2
      const result = await complianceReportingService.queryAuditEvents(
        {
          workspace_id: testWorkspaceId,
          limit,
          offset: 0
        },
        testAuth
      )

      expect(result.events.length).toBeLessThanOrEqual(limit)
      expect(typeof result.has_more).toBe('boolean')

      if (result.total_count > limit) {
        expect(result.has_more).toBe(true)
      }
    })

    it('should filter by date range', async () => {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

      const result = await complianceReportingService.queryAuditEvents(
        {
          workspace_id: testWorkspaceId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        testAuth
      )

      result.events.forEach(event => {
        const eventDate = new Date(event.timestamp)
        expect(eventDate).toBeInstanceOf(Date)
        expect(eventDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
        expect(eventDate.getTime()).toBeLessThanOrEqual(endDate.getTime())
      })
    })

    it('should filter by risk threshold', async () => {
      // First log an event with high risk score
      await complianceReportingService.logAuditEvent({
        workspace_id: testWorkspaceId,
        event_type: 'policy_violation',
        entity_type: 'content',
        entity_id: 'high_risk_content',
        action: 'scan',
        actor_id: testAuth.user_id,
        actor_type: 'user',
        risk_score: 90
      })

      const result = await complianceReportingService.queryAuditEvents(
        {
          workspace_id: testWorkspaceId,
          risk_threshold: 80
        },
        testAuth
      )

      result.events.forEach(event => {
        if (event.risk_score !== undefined) {
          expect(event.risk_score).toBeGreaterThanOrEqual(80)
        }
      })
    })
  })

  describe('Compliance Report Generation', () => {
    beforeEach(async () => {
      // Create comprehensive audit data for report testing
      const auditData = [
        {
          event_type: 'policy_violation' as AuditEventType,
          metadata: { severity: 'critical', violation_type: 'pii_exposure' }
        },
        {
          event_type: 'policy_violation' as AuditEventType,
          metadata: { severity: 'medium', violation_type: 'inappropriate_content' }
        },
        {
          event_type: 'security_scan' as AuditEventType,
          metadata: { status: 'completed', violations_found: 1 }
        },
        {
          event_type: 'security_scan' as AuditEventType,
          metadata: { status: 'failed', error: 'timeout' }
        },
        {
          event_type: 'compliance_check' as AuditEventType,
          metadata: { policy_id: 'policy_001', result: 'violation' }
        }
      ]

      for (const data of auditData) {
        await complianceReportingService.logAuditEvent({
          workspace_id: testWorkspaceId,
          entity_type: 'test_entity',
          entity_id: `entity_${Math.random()}`,
          action: 'test',
          actor_id: testAuth.user_id,
          actor_type: 'user',
          ...data
        })
      }
    })

    it('should generate policy compliance report', async () => {
      const reportRequest: ComplianceReportRequest = {
        report_type: 'policy_compliance',
        title: 'Weekly Policy Compliance Report',
        description: 'Test policy compliance report',
        period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
        format: 'json'
      }

      const report = await complianceReportingService.generateComplianceReport(
        reportRequest,
        testWorkspaceId,
        testAuth
      )

      expect(report).toBeDefined()
      expect(report.id).toMatch(/^report_/)
      expect(report.report_type).toBe('policy_compliance')
      expect(report.status).toBe('completed')
      expect(report.workspace_id).toBe(testWorkspaceId)
      expect(report.generated_by).toBe(testAuth.user_id)

      expect(report.metrics).toBeDefined()
      expect(typeof report.metrics.compliance_score).toBe('number')
      expect(report.metrics.compliance_score).toBeGreaterThanOrEqual(0)
      expect(report.metrics.compliance_score).toBeLessThanOrEqual(100)

      expect(Array.isArray(report.findings)).toBe(true)
      expect(Array.isArray(report.recommendations)).toBe(true)
    })

    it('should generate security assessment report', async () => {
      const reportRequest: ComplianceReportRequest = {
        report_type: 'security_assessment',
        title: 'Security Assessment Report',
        period_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
        format: 'json'
      }

      const report = await complianceReportingService.generateComplianceReport(
        reportRequest,
        testWorkspaceId,
        testAuth
      )

      expect(report.report_type).toBe('security_assessment')
      expect(report.metrics.scanned_messages).toBeGreaterThanOrEqual(0)
      expect(report.metrics.violations_detected).toBeGreaterThanOrEqual(0)
    })

    it('should calculate compliance metrics correctly', async () => {
      const metrics = await complianceReportingService.getComplianceMetrics(testWorkspaceId)

      expect(metrics).toBeDefined()
      expect(typeof metrics.total_conversations).toBe('number')
      expect(typeof metrics.scanned_messages).toBe('number')
      expect(typeof metrics.violations_detected).toBe('number')
      expect(typeof metrics.policies_evaluated).toBe('number')
      expect(typeof metrics.compliance_score).toBe('number')
      expect(typeof metrics.response_time_avg_ms).toBe('number')

      expect(metrics.violations_by_severity).toBeDefined()
      expect(typeof metrics.violations_by_severity.low).toBe('number')
      expect(typeof metrics.violations_by_severity.medium).toBe('number')
      expect(typeof metrics.violations_by_severity.high).toBe('number')
      expect(typeof metrics.violations_by_severity.critical).toBe('number')
    })

    it('should generate appropriate compliance findings', async () => {
      const reportRequest: ComplianceReportRequest = {
        report_type: 'policy_compliance',
        title: 'Findings Test Report',
        period_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
        format: 'json'
      }

      const report = await complianceReportingService.generateComplianceReport(
        reportRequest,
        testWorkspaceId,
        testAuth
      )

      expect(report.findings.length).toBeGreaterThan(0)

      report.findings.forEach(finding => {
        expect(finding.id).toMatch(/^finding_/)
        expect(finding.type).toMatch(/policy_violation|security_weakness|compliance_gap|data_exposure|process_deficiency/)
        expect(finding.severity).toMatch(/low|medium|high|critical/)
        expect(finding.title).toBeDefined()
        expect(finding.description).toBeDefined()
        expect(Array.isArray(finding.evidence)).toBe(true)
        expect(Array.isArray(finding.affected_entities)).toBe(true)
        expect(typeof finding.risk_level).toBe('number')
        expect(finding.remediation_status).toMatch(/open|in_progress|resolved|accepted/)
      })
    })

    it('should generate actionable recommendations', async () => {
      const reportRequest: ComplianceReportRequest = {
        report_type: 'audit_trail',
        title: 'Recommendations Test Report',
        period_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
        format: 'json'
      }

      const report = await complianceReportingService.generateComplianceReport(
        reportRequest,
        testWorkspaceId,
        testAuth
      )

      expect(report.recommendations.length).toBeGreaterThan(0)

      report.recommendations.forEach(recommendation => {
        expect(recommendation.id).toMatch(/^recommendation_/)
        expect(recommendation.priority).toMatch(/low|medium|high|critical/)
        expect(recommendation.title).toBeDefined()
        expect(recommendation.description).toBeDefined()
        expect(recommendation.category).toBeDefined()
        expect(recommendation.effort_level).toMatch(/low|medium|high/)
        expect(recommendation.estimated_impact).toBeDefined()
      })
    })
  })

  describe('Compliance Dashboard', () => {
    beforeEach(async () => {
      // Create sample data for dashboard
      const sampleData = [
        { event_type: 'policy_violation' as AuditEventType, severity: 'high' },
        { event_type: 'policy_violation' as AuditEventType, severity: 'medium' },
        { event_type: 'security_scan' as AuditEventType, status: 'completed' },
        { event_type: 'compliance_check' as AuditEventType, result: 'passed' }
      ]

      for (const data of sampleData) {
        await complianceReportingService.logAuditEvent({
          workspace_id: testWorkspaceId,
          entity_type: 'dashboard_test',
          entity_id: `entity_${Math.random()}`,
          action: 'test',
          actor_id: testAuth.user_id,
          actor_type: 'user',
          metadata: data.event_type === 'policy_violation' ? { severity: data.severity } : data
        })
      }
    })

    it('should generate compliance dashboard data', async () => {
      const dashboard = await complianceReportingService.getComplianceDashboard(
        testWorkspaceId,
        'month',
        testAuth
      )

      expect(dashboard).toBeDefined()
      expect(dashboard.overview).toBeDefined()
      expect(typeof dashboard.overview.total_policies).toBe('number')
      expect(typeof dashboard.overview.active_policies).toBe('number')
      expect(typeof dashboard.overview.recent_violations).toBe('number')
      expect(typeof dashboard.overview.compliance_score).toBe('number')

      expect(Array.isArray(dashboard.policy_effectiveness)).toBe(true)
      expect(Array.isArray(dashboard.violation_trends)).toBe(true)
      expect(Array.isArray(dashboard.top_violations)).toBe(true)
      expect(Array.isArray(dashboard.agent_compliance)).toBe(true)
    })

    it('should calculate violation trends correctly', async () => {
      const dashboard = await complianceReportingService.getComplianceDashboard(
        testWorkspaceId,
        'week',
        testAuth
      )

      expect(dashboard.violation_trends.length).toBeGreaterThan(0)

      dashboard.violation_trends.forEach(trend => {
        expect(trend.date).toBeDefined()
        expect(typeof trend.total_violations).toBe('number')
        expect(trend.by_severity).toBeDefined()
        expect(typeof trend.by_severity.low).toBe('number')
        expect(typeof trend.by_severity.medium).toBe('number')
        expect(typeof trend.by_severity.high).toBe('number')
        expect(typeof trend.by_severity.critical).toBe('number')
      })
    })

    it('should provide top violations analysis', async () => {
      const dashboard = await complianceReportingService.getComplianceDashboard(
        testWorkspaceId,
        'month',
        testAuth
      )

      dashboard.top_violations.forEach(violation => {
        expect(violation.type).toBeDefined()
        expect(typeof violation.count).toBe('number')
        expect(violation.trend).toMatch(/up|down|stable/)
      })
    })
  })

  describe('Audit Trail Export', () => {
    beforeEach(async () => {
      // Create sample audit data for export testing
      for (let i = 0; i < 10; i++) {
        await complianceReportingService.logAuditEvent({
          workspace_id: testWorkspaceId,
          event_type: 'data_access',
          entity_type: 'export_test',
          entity_id: `export_entity_${i}`,
          action: 'read',
          actor_id: testAuth.user_id,
          actor_type: 'user',
          metadata: { export_test: true, index: i }
        })
      }
    })

    it('should export audit trail in JSON format', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const endDate = new Date().toISOString()

      const exportResult = await complianceReportingService.exportAuditTrail(
        testWorkspaceId,
        startDate,
        endDate,
        'json',
        testAuth
      )

      expect(exportResult).toBeDefined()
      expect(exportResult.file_path).toMatch(/\.json$/)
      expect(exportResult.events_exported).toBeGreaterThan(0)
      expect(exportResult.file_size).toBeGreaterThan(0)
      expect(typeof exportResult.export_duration_ms).toBe('number')
    })

    it('should export audit trail in CSV format', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const endDate = new Date().toISOString()

      const exportResult = await complianceReportingService.exportAuditTrail(
        testWorkspaceId,
        startDate,
        endDate,
        'csv',
        testAuth
      )

      expect(exportResult).toBeDefined()
      expect(exportResult.file_path).toMatch(/\.csv$/)
      expect(exportResult.events_exported).toBeGreaterThan(0)
      expect(exportResult.file_size).toBeGreaterThan(0)
    })

    it('should handle export with date filtering', async () => {
      const veryRecentStart = new Date(Date.now() - 60 * 1000).toISOString() // 1 minute ago
      const now = new Date().toISOString()

      const exportResult = await complianceReportingService.exportAuditTrail(
        testWorkspaceId,
        veryRecentStart,
        now,
        'json',
        testAuth
      )

      expect(exportResult).toBeDefined()
      // Might export 0 events if no events in the narrow timeframe
      expect(exportResult.events_exported).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Utility Functions', () => {
    beforeEach(async () => {
      // Create sample violations for testing
      await logAudit(
        'policy_violation',
        'content',
        'test_content',
        'scan',
        testWorkspaceId,
        testAuth.user_id,
        { severity: 'high', violation_type: 'pii_exposure' }
      )
    })

    it('should log audit events via utility function', async () => {
      await logAudit(
        'configuration_change',
        'policy',
        'policy_test',
        'update',
        testWorkspaceId,
        testAuth.user_id,
        { version: 2, changes: ['enforcement_level'] }
      )

      // Query to verify the event was logged
      const result = await complianceReportingService.queryAuditEvents(
        {
          workspace_id: testWorkspaceId,
          event_types: ['configuration_change'],
          entity_types: ['policy']
        },
        testAuth
      )

      expect(result.events.length).toBeGreaterThan(0)
      const policyEvent = result.events.find(e => e.entity_id === 'policy_test')
      expect(policyEvent).toBeDefined()
    })

    it('should generate compliance summary', async () => {
      const summary = await generateComplianceSummary(testWorkspaceId, 30)

      expect(summary).toBeDefined()
      expect(typeof summary.complianceScore).toBe('number')
      expect(typeof summary.violations).toBe('number')
      expect(Array.isArray(summary.recommendations)).toBe(true)

      expect(summary.complianceScore).toBeGreaterThanOrEqual(0)
      expect(summary.complianceScore).toBeLessThanOrEqual(100)
    })

    it('should handle utility function errors gracefully', async () => {
      // Test with invalid workspace
      const summary = await generateComplianceSummary('invalid_workspace', 30)

      expect(summary).toBeDefined()
      expect(summary.complianceScore).toBe(0)
      expect(summary.violations).toBe(0)
      expect(summary.recommendations.length).toBeGreaterThan(0) // Should include error message
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid report parameters', async () => {
      const invalidRequest: ComplianceReportRequest = {
        report_type: 'policy_compliance',
        title: '',
        description: '',
        period_start: 'invalid-date',
        period_end: 'invalid-date',
        format: 'invalid-format' as ReportFormat
      }

      await expect(
        complianceReportingService.generateComplianceReport(
          invalidRequest,
          testWorkspaceId,
          testAuth
        )
      ).rejects.toThrow()
    })

    it('should handle empty audit queries gracefully', async () => {
      const result = await complianceReportingService.queryAuditEvents(
        { workspace_id: 'nonexistent_workspace' },
        testAuth
      )

      expect(result).toBeDefined()
      expect(result.events).toEqual([])
      expect(result.total_count).toBe(0)
      expect(result.has_more).toBe(false)
    })

    it('should handle large date ranges in exports', async () => {
      const veryOldDate = new Date('2020-01-01').toISOString()
      const now = new Date().toISOString()

      const exportResult = await complianceReportingService.exportAuditTrail(
        testWorkspaceId,
        veryOldDate,
        now,
        'json',
        testAuth
      )

      expect(exportResult).toBeDefined()
      expect(exportResult.events_exported).toBeGreaterThanOrEqual(0)
    })

    it('should validate audit event data', async () => {
      // Test with minimal required data
      const minimalEvent = await complianceReportingService.logAuditEvent({
        workspace_id: testWorkspaceId,
        event_type: 'system_event',
        entity_type: 'test',
        entity_id: 'test',
        action: 'test',
        actor_id: testAuth.user_id,
        actor_type: 'user'
      })

      expect(minimalEvent).toBeDefined()
      expect(minimalEvent.id).toBeDefined()
      expect(minimalEvent.timestamp).toBeDefined()
    })

    it('should handle concurrent report generation', async () => {
      const reportRequest: ComplianceReportRequest = {
        report_type: 'policy_compliance',
        title: 'Concurrent Test Report',
        period_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
        format: 'json'
      }

      // Generate multiple reports concurrently
      const promises = Array(3).fill(null).map((_, index) =>
        complianceReportingService.generateComplianceReport(
          { ...reportRequest, title: `${reportRequest.title} ${index}` },
          testWorkspaceId,
          testAuth
        )
      )

      const reports = await Promise.all(promises)

      expect(reports).toHaveLength(3)
      reports.forEach((report, index) => {
        expect(report.id).toBeDefined()
        expect(report.title).toBe(`Concurrent Test Report ${index}`)
        expect(report.status).toBe('completed')
      })
    })

    it('should maintain audit event ordering', async () => {
      const events: string[] = []

      // Log events in sequence
      for (let i = 0; i < 5; i++) {
        const event = await complianceReportingService.logAuditEvent({
          workspace_id: testWorkspaceId,
          event_type: 'data_access',
          entity_type: 'ordering_test',
          entity_id: `order_${i}`,
          action: 'read',
          actor_id: testAuth.user_id,
          actor_type: 'user',
          metadata: { sequence: i }
        })
        events.push(event.id)

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const result = await complianceReportingService.queryAuditEvents(
        {
          workspace_id: testWorkspaceId,
          entity_types: ['ordering_test']
        },
        testAuth
      )

      expect(result.events.length).toBe(5)

      // Events should be ordered by timestamp (most recent first)
      for (let i = 1; i < result.events.length; i++) {
        const prevEvent = new Date(result.events[i - 1].timestamp)
        const currentEvent = new Date(result.events[i].timestamp)
        expect(prevEvent.getTime()).toBeGreaterThanOrEqual(currentEvent.getTime())
      }
    })
  })
})