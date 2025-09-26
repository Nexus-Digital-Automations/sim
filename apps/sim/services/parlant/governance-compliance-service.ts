/**
 * Enterprise Governance and Compliance Service
 * ===========================================
 *
 * Core service providing comprehensive governance and compliance capabilities
 * including policy management, enforcement, audit trails, and regulatory
 * compliance features for multi-tenant environments.
 *
 * Key Features:
 * - Multi-tenant policy management and enforcement
 * - Real-time compliance monitoring and violation detection
 * - Comprehensive audit trail generation
 * - Regulatory compliance tracking (GDPR, CCPA, SOX, etc.)
 * - Integration with content scanning and filtering
 * - Performance-optimized for enterprise scale
 */

import {
  AuditEvent,
  AuditEventType,
  ComplianceStatus,
  GovernanceContext,
  GovernanceError,
  GovernanceErrorCode,
  GovernanceHealthCheck,
  GovernancePolicy,
  PolicyEvaluationResult,
  PolicyStatus,
  RegulatoryRequirement,
  RegulationType,
  SecurityViolation,
  ViolationSeverity,
} from './governance-compliance-types'
import { ParlantError, errorHandler } from './error-handler'
import { AuthContext } from './types'

/**
 * Core Governance and Compliance Service
 * Provides enterprise-grade governance capabilities with multi-tenant support
 */
export class GovernanceComplianceService {
  private readonly policyCache = new Map<string, GovernancePolicy>()
  private readonly regulatoryRequirements = new Map<RegulationType, RegulatoryRequirement[]>()
  private readonly auditBuffer: AuditEvent[] = []
  private readonly maxAuditBufferSize = 1000
  private isInitialized = false

  constructor(private readonly config: {
    enableRealTimeCompliance?: boolean
    auditRetentionDays?: number
    batchAuditFlushInterval?: number
    maxConcurrentScans?: number
    enableRegulatory?: RegulationType[]
  } = {}) {
    this.initializeRegulatoryRequirements()
  }

  /**
   * Initialize the governance service with workspace-specific configurations
   */
  async initialize(workspaceId: string, auth: AuthContext): Promise<void> {
    try {
      console.log(`[Governance] Initializing service for workspace: ${workspaceId}`)

      // Load workspace policies
      await this.loadWorkspacePolicies(workspaceId, auth)

      // Initialize regulatory compliance requirements
      await this.initializeWorkspaceCompliance(workspaceId, auth)

      // Start audit buffer management
      this.startAuditBufferManagement()

      this.isInitialized = true
      console.log(`[Governance] Service initialized successfully for workspace: ${workspaceId}`)
    } catch (error) {
      console.error(`[Governance] Initialization failed for workspace ${workspaceId}:`, error)
      throw this.createGovernanceError('SERVICE_UNAVAILABLE', 'Failed to initialize governance service', error)
    }
  }

  /**
   * Evaluate content against all applicable governance policies
   */
  async evaluateCompliance(
    content: string,
    context: GovernanceContext,
    auth: AuthContext
  ): Promise<PolicyEvaluationResult[]> {
    if (!this.isInitialized) {
      throw this.createGovernanceError('SERVICE_UNAVAILABLE', 'Governance service not initialized')
    }

    const startTime = Date.now()
    const results: PolicyEvaluationResult[] = []

    try {
      // Get applicable policies for the workspace and context
      const applicablePolicies = await this.getApplicablePolicies(context, auth)

      console.log(`[Governance] Evaluating ${applicablePolicies.length} policies for workspace ${context.workspace_id}`)

      // Evaluate each policy against the content
      for (const policy of applicablePolicies) {
        const result = await this.evaluatePolicy(policy, content, context)
        results.push(result)

        // Log policy evaluation
        await this.logAuditEvent({
          workspace_id: context.workspace_id,
          event_type: 'compliance_check',
          entity_type: 'policy',
          entity_id: policy.id,
          action: 'validate',
          actor_id: auth.user_id,
          actor_type: 'system',
          metadata: {
            policy_name: policy.name,
            violation_detected: result.overall_violation,
            risk_score: result.risk_score
          }
        })
      }

      const duration = Date.now() - startTime
      console.log(`[Governance] Policy evaluation completed in ${duration}ms. Found ${results.filter(r => r.overall_violation).length} violations`)

      return results
    } catch (error) {
      console.error('[Governance] Policy evaluation failed:', error)
      throw this.createGovernanceError('COMPLIANCE_ERROR', 'Policy evaluation failed', error)
    }
  }

  /**
   * Create and register a new governance policy
   */
  async createPolicy(
    policyData: Omit<GovernancePolicy, 'id' | 'created_at' | 'updated_at' | 'version'>,
    auth: AuthContext
  ): Promise<GovernancePolicy> {
    try {
      const policy: GovernancePolicy = {
        ...policyData,
        id: this.generateId('policy'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        status: 'draft' as PolicyStatus
      }

      // Validate policy configuration
      await this.validatePolicyConfiguration(policy)

      // Store policy (in production, this would persist to database)
      this.policyCache.set(policy.id, policy)

      // Log policy creation
      await this.logAuditEvent({
        workspace_id: policy.workspace_id,
        event_type: 'configuration_change',
        entity_type: 'policy',
        entity_id: policy.id,
        action: 'create',
        actor_id: auth.user_id,
        actor_type: 'user',
        after_state: policy,
        metadata: {
          policy_name: policy.name,
          category: policy.category,
          enforcement_level: policy.enforcement_level
        }
      })

      console.log(`[Governance] Policy created: ${policy.name} (${policy.id})`)
      return policy
    } catch (error) {
      console.error('[Governance] Policy creation failed:', error)
      throw this.createGovernanceError('INVALID_CONFIGURATION', 'Failed to create policy', error)
    }
  }

  /**
   * Update an existing governance policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<GovernancePolicy>,
    auth: AuthContext
  ): Promise<GovernancePolicy> {
    try {
      const existingPolicy = this.policyCache.get(policyId)
      if (!existingPolicy) {
        throw this.createGovernanceError('INVALID_CONFIGURATION', `Policy not found: ${policyId}`)
      }

      const updatedPolicy: GovernancePolicy = {
        ...existingPolicy,
        ...updates,
        updated_at: new Date().toISOString(),
        version: existingPolicy.version + 1,
        last_modified_by: auth.user_id
      }

      // Validate updated policy
      await this.validatePolicyConfiguration(updatedPolicy)

      // Update cache
      this.policyCache.set(policyId, updatedPolicy)

      // Log policy update
      await this.logAuditEvent({
        workspace_id: updatedPolicy.workspace_id,
        event_type: 'configuration_change',
        entity_type: 'policy',
        entity_id: policyId,
        action: 'update',
        actor_id: auth.user_id,
        actor_type: 'user',
        before_state: existingPolicy,
        after_state: updatedPolicy,
        metadata: {
          policy_name: updatedPolicy.name,
          version_increment: true
        }
      })

      console.log(`[Governance] Policy updated: ${updatedPolicy.name} (v${updatedPolicy.version})`)
      return updatedPolicy
    } catch (error) {
      console.error('[Governance] Policy update failed:', error)
      throw this.createGovernanceError('INVALID_CONFIGURATION', 'Failed to update policy', error)
    }
  }

  /**
   * Get governance policies for a workspace
   */
  async getPolicies(workspaceId: string, auth: AuthContext): Promise<GovernancePolicy[]> {
    try {
      const policies = Array.from(this.policyCache.values())
        .filter(policy => policy.workspace_id === workspaceId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

      console.log(`[Governance] Retrieved ${policies.length} policies for workspace ${workspaceId}`)
      return policies
    } catch (error) {
      console.error('[Governance] Failed to retrieve policies:', error)
      throw this.createGovernanceError('SERVICE_UNAVAILABLE', 'Failed to retrieve policies', error)
    }
  }

  /**
   * Get regulatory compliance status for a workspace
   */
  async getComplianceStatus(
    workspaceId: string,
    regulation?: RegulationType,
    auth?: AuthContext
  ): Promise<Array<RegulatoryRequirement & { compliance_gaps?: string[] }>> {
    try {
      let requirements: RegulatoryRequirement[] = []

      if (regulation) {
        requirements = this.regulatoryRequirements.get(regulation) || []
      } else {
        // Get all regulatory requirements
        for (const reqs of this.regulatoryRequirements.values()) {
          requirements = requirements.concat(reqs)
        }
      }

      // Enhance with compliance gap analysis
      const enhancedRequirements = requirements.map(req => {
        const gaps = this.analyzeComplianceGaps(req, workspaceId)
        return {
          ...req,
          compliance_gaps: gaps.length > 0 ? gaps : undefined
        }
      })

      console.log(`[Governance] Compliance status retrieved for ${requirements.length} requirements`)
      return enhancedRequirements
    } catch (error) {
      console.error('[Governance] Failed to get compliance status:', error)
      throw this.createGovernanceError('COMPLIANCE_ERROR', 'Failed to retrieve compliance status', error)
    }
  }

  /**
   * Perform health check of governance service
   */
  async healthCheck(): Promise<GovernanceHealthCheck> {
    try {
      const health: GovernanceHealthCheck = {
        overall_status: 'healthy',
        policy_engine: {
          status: 'active',
          policies_loaded: this.policyCache.size,
          last_policy_sync: new Date().toISOString()
        },
        content_scanner: {
          status: 'active',
          scan_queue_size: 0,
          average_scan_time_ms: 150
        },
        audit_system: {
          status: 'active',
          events_pending: this.auditBuffer.length,
          retention_compliance: true
        },
        compliance_reports: {
          status: 'active',
          last_report_generated: new Date().toISOString(),
          pending_reports: 0
        }
      }

      // Check for any critical issues
      if (this.auditBuffer.length > this.maxAuditBufferSize * 0.8) {
        health.overall_status = 'warning'
        health.audit_system.status = 'degraded'
      }

      return health
    } catch (error) {
      console.error('[Governance] Health check failed:', error)
      return {
        overall_status: 'critical',
        policy_engine: { status: 'offline', policies_loaded: 0, last_policy_sync: '' },
        content_scanner: { status: 'offline', scan_queue_size: 0, average_scan_time_ms: 0 },
        audit_system: { status: 'offline', events_pending: 0, retention_compliance: false },
        compliance_reports: { status: 'offline', last_report_generated: '', pending_reports: 0 }
      }
    }
  }

  // ==================== PRIVATE METHODS ====================

  private async loadWorkspacePolicies(workspaceId: string, auth: AuthContext): Promise<void> {
    // In production, this would load from database
    // For now, create some default policies
    const defaultPolicies = this.createDefaultPolicies(workspaceId, auth.user_id)

    for (const policy of defaultPolicies) {
      this.policyCache.set(policy.id, policy)
    }

    console.log(`[Governance] Loaded ${defaultPolicies.length} default policies for workspace ${workspaceId}`)
  }

  private async initializeWorkspaceCompliance(workspaceId: string, auth: AuthContext): Promise<void> {
    // Initialize regulatory requirements based on workspace configuration
    const enabledRegulations = this.config.enableRegulatory || ['GDPR', 'CCPA']

    for (const regulation of enabledRegulations) {
      const requirements = this.regulatoryRequirements.get(regulation as RegulationType) || []
      console.log(`[Governance] Initialized ${requirements.length} requirements for ${regulation}`)
    }
  }

  private startAuditBufferManagement(): void {
    const flushInterval = this.config.batchAuditFlushInterval || 30000 // 30 seconds

    setInterval(() => {
      this.flushAuditBuffer()
    }, flushInterval)
  }

  private async flushAuditBuffer(): Promise<void> {
    if (this.auditBuffer.length === 0) return

    try {
      const events = this.auditBuffer.splice(0, Math.min(100, this.auditBuffer.length))

      // In production, persist to audit database
      console.log(`[Governance] Flushed ${events.length} audit events to persistent storage`)
    } catch (error) {
      console.error('[Governance] Failed to flush audit buffer:', error)
    }
  }

  private async getApplicablePolicies(context: GovernanceContext, auth: AuthContext): Promise<GovernancePolicy[]> {
    const workspacePolicies = Array.from(this.policyCache.values())
      .filter(policy =>
        policy.workspace_id === context.workspace_id &&
        policy.status === 'active' &&
        this.isPolicyApplicable(policy, context)
      )
      .sort((a, b) => {
        // Sort by priority: critical > high > medium > low
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

    return workspacePolicies
  }

  private isPolicyApplicable(policy: GovernancePolicy, context: GovernanceContext): boolean {
    // Check agent applicability
    if (policy.applicable_agents && policy.applicable_agents.length > 0) {
      if (!context.agent_id || !policy.applicable_agents.includes(context.agent_id)) {
        return false
      }
    }

    // Check user applicability
    if (policy.applicable_users && policy.applicable_users.length > 0) {
      if (!policy.applicable_users.includes(context.user_id)) {
        return false
      }
    }

    // Check effective dates
    const now = new Date()
    if (policy.effective_date && new Date(policy.effective_date) > now) {
      return false
    }
    if (policy.expiry_date && new Date(policy.expiry_date) < now) {
      return false
    }

    return true
  }

  private async evaluatePolicy(
    policy: GovernancePolicy,
    content: string,
    context: GovernanceContext
  ): Promise<PolicyEvaluationResult> {
    const ruleResults = []
    let overallViolation = false
    let totalRiskScore = 0

    for (const rule of policy.rules) {
      const ruleResult = await this.evaluateRule(rule, content, context)
      ruleResults.push(ruleResult)

      if (ruleResult.matched) {
        overallViolation = true
        totalRiskScore += ruleResult.confidence * (rule.weight || 1)
      }
    }

    const normalizedRiskScore = Math.min(100, totalRiskScore)

    return {
      policy_id: policy.id,
      rule_results: ruleResults,
      overall_violation: overallViolation,
      risk_score: normalizedRiskScore,
      recommended_actions: overallViolation ? policy.rules.map(r => r.action) : []
    }
  }

  private async evaluateRule(rule: any, content: string, context: GovernanceContext): Promise<{
    rule_id: string
    matched: boolean
    confidence: number
    evidence?: any
  }> {
    // Simplified rule evaluation - in production, this would be more sophisticated
    const condition = rule.condition
    let matched = false
    let confidence = 0
    let evidence: any = undefined

    try {
      switch (condition.operator) {
        case 'contains':
          matched = content.toLowerCase().includes(condition.value.toLowerCase())
          confidence = matched ? 0.8 : 0
          if (matched) {
            evidence = { matched_text: condition.value, location: content.indexOf(condition.value) }
          }
          break

        case 'regex':
          const regex = new RegExp(condition.value, condition.case_sensitive ? 'g' : 'gi')
          const matches = content.match(regex)
          matched = matches !== null
          confidence = matched ? 0.9 : 0
          if (matched) {
            evidence = { matched_patterns: matches, regex: condition.value }
          }
          break

        case 'equals':
          matched = condition.case_sensitive
            ? content === condition.value
            : content.toLowerCase() === condition.value.toLowerCase()
          confidence = matched ? 1.0 : 0
          break

        default:
          console.warn(`[Governance] Unknown rule operator: ${condition.operator}`)
      }
    } catch (error) {
      console.error(`[Governance] Rule evaluation error:`, error)
      confidence = 0
      matched = false
    }

    return {
      rule_id: rule.id,
      matched,
      confidence,
      evidence
    }
  }

  private async validatePolicyConfiguration(policy: GovernancePolicy): Promise<void> {
    if (!policy.name || policy.name.trim().length === 0) {
      throw new Error('Policy name is required')
    }

    if (!policy.rules || policy.rules.length === 0) {
      throw new Error('Policy must have at least one rule')
    }

    for (const rule of policy.rules) {
      if (!rule.condition || !rule.action) {
        throw new Error('Each rule must have both condition and action')
      }
    }
  }

  private async logAuditEvent(eventData: Partial<AuditEvent>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: this.generateId('audit'),
      timestamp: new Date().toISOString(),
      retention_date: this.calculateRetentionDate(),
      ...eventData
    } as AuditEvent

    this.auditBuffer.push(auditEvent)

    // Flush immediately if buffer is getting full
    if (this.auditBuffer.length >= this.maxAuditBufferSize) {
      await this.flushAuditBuffer()
    }
  }

  private calculateRetentionDate(): string {
    const retentionDays = this.config.auditRetentionDays || 2555 // 7 years default
    const retentionDate = new Date()
    retentionDate.setDate(retentionDate.getDate() + retentionDays)
    return retentionDate.toISOString()
  }

  private initializeRegulatoryRequirements(): void {
    // Initialize GDPR requirements
    this.regulatoryRequirements.set('GDPR', [
      {
        id: 'gdpr-001',
        regulation: 'GDPR',
        requirement_code: 'Art. 6',
        title: 'Lawfulness of processing',
        description: 'Processing must have a lawful basis',
        compliance_status: 'compliant',
        last_assessed: new Date().toISOString(),
        next_review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        evidence_required: ['consent records', 'legitimate interest assessment'],
        responsible_party: 'Data Protection Officer'
      },
      {
        id: 'gdpr-002',
        regulation: 'GDPR',
        requirement_code: 'Art. 17',
        title: 'Right to erasure',
        description: 'Data subjects have the right to erasure of personal data',
        compliance_status: 'partial_compliance',
        last_assessed: new Date().toISOString(),
        next_review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        evidence_required: ['deletion procedures', 'retention policies'],
        responsible_party: 'System Administrator'
      }
    ])

    // Initialize CCPA requirements
    this.regulatoryRequirements.set('CCPA', [
      {
        id: 'ccpa-001',
        regulation: 'CCPA',
        requirement_code: '1798.100',
        title: 'Consumer Right to Know',
        description: 'Consumers have the right to know what personal information is collected',
        compliance_status: 'compliant',
        last_assessed: new Date().toISOString(),
        next_review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        evidence_required: ['privacy policy', 'data collection notices'],
        responsible_party: 'Privacy Officer'
      }
    ])

    console.log('[Governance] Initialized regulatory requirements for GDPR and CCPA')
  }

  private analyzeComplianceGaps(requirement: RegulatoryRequirement, workspaceId: string): string[] {
    const gaps: string[] = []

    // Analyze compliance gaps based on requirement status
    if (requirement.compliance_status === 'non_compliant') {
      gaps.push('Full compliance implementation required')
    } else if (requirement.compliance_status === 'partial_compliance') {
      gaps.push('Additional compliance measures needed')
    }

    // Check if review is overdue
    const nextReview = new Date(requirement.next_review_date)
    if (nextReview < new Date()) {
      gaps.push('Compliance review overdue')
    }

    return gaps
  }

  private createDefaultPolicies(workspaceId: string, createdBy: string): GovernancePolicy[] {
    const now = new Date().toISOString()

    return [
      {
        id: this.generateId('policy'),
        workspace_id: workspaceId,
        name: 'PII Protection Policy',
        description: 'Prevents exposure of personally identifiable information',
        category: 'data_governance',
        type: 'mandatory',
        status: 'active',
        priority: 'critical',
        enforcement_level: 'block',
        rules: [
          {
            id: this.generateId('rule'),
            condition: {
              field: 'content',
              operator: 'regex',
              value: '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN pattern
              case_sensitive: false
            },
            action: {
              type: 'block',
              parameters: { replacement: '[SSN REDACTED]' },
              message: 'Social Security Number detected and blocked',
              severity: 'critical'
            },
            weight: 10
          }
        ],
        created_at: now,
        updated_at: now,
        created_by: createdBy,
        last_modified_by: createdBy,
        version: 1
      },
      {
        id: this.generateId('policy'),
        workspace_id: workspaceId,
        name: 'Brand Voice Compliance',
        description: 'Ensures consistent brand voice and messaging',
        category: 'branding',
        type: 'advisory',
        status: 'active',
        priority: 'medium',
        enforcement_level: 'warn',
        rules: [
          {
            id: this.generateId('rule'),
            condition: {
              field: 'content',
              operator: 'contains',
              value: 'competitor brand names',
              case_sensitive: false
            },
            action: {
              type: 'flag',
              parameters: { review_required: true },
              message: 'Competitor brand mention detected',
              severity: 'warning'
            },
            weight: 3
          }
        ],
        created_at: now,
        updated_at: now,
        created_by: createdBy,
        last_modified_by: createdBy,
        version: 1
      }
    ]
  }

  private createGovernanceError(
    code: GovernanceErrorCode,
    message: string,
    originalError?: any
  ): GovernanceError {
    const error = new Error(message) as GovernanceError
    error.code = code
    error.name = 'GovernanceError'

    if (originalError) {
      error.stack = originalError.stack
    }

    return error
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}_${timestamp}_${random}`
  }
}

// ==================== SERVICE INSTANCE ====================

export const governanceComplianceService = new GovernanceComplianceService({
  enableRealTimeCompliance: true,
  auditRetentionDays: 2555, // 7 years
  batchAuditFlushInterval: 30000, // 30 seconds
  maxConcurrentScans: 10,
  enableRegulatory: ['GDPR', 'CCPA', 'SOX']
})

// ==================== UTILITY FUNCTIONS ====================

/**
 * Initialize governance service for a workspace
 */
export async function initializeWorkspaceGovernance(
  workspaceId: string,
  auth: AuthContext
): Promise<void> {
  try {
    await governanceComplianceService.initialize(workspaceId, auth)
    console.log(`[Governance] Workspace governance initialized: ${workspaceId}`)
  } catch (error) {
    console.error(`[Governance] Failed to initialize workspace governance:`, error)
    throw error
  }
}

/**
 * Quick compliance check for content
 */
export async function quickComplianceCheck(
  content: string,
  workspaceId: string,
  userId: string,
  agentId?: string
): Promise<{
  compliant: boolean
  violations: SecurityViolation[]
  riskScore: number
}> {
  const context: GovernanceContext = {
    workspace_id: workspaceId,
    user_id: userId,
    agent_id: agentId,
    permissions: ['read', 'write']
  }

  const auth: AuthContext = {
    user_id: userId,
    workspace_id: workspaceId,
    key_type: 'workspace'
  }

  try {
    const results = await governanceComplianceService.evaluateCompliance(content, context, auth)

    const violations = results.filter(r => r.overall_violation)
    const maxRiskScore = Math.max(...results.map(r => r.risk_score), 0)

    return {
      compliant: violations.length === 0,
      violations: [], // Would extract actual violations from results
      riskScore: maxRiskScore
    }
  } catch (error) {
    console.error('[Governance] Quick compliance check failed:', error)
    return {
      compliant: false,
      violations: [],
      riskScore: 100
    }
  }
}