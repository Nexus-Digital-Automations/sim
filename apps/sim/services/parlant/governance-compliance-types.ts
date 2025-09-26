/**
 * Governance and Compliance System - Type Definitions
 * =================================================
 *
 * Enterprise-grade type definitions for comprehensive governance and compliance
 * capabilities including multi-tenant policies, content scanning, audit trails,
 * and regulatory compliance features.
 *
 * Key Areas Covered:
 * - Multi-tenant governance policies and enforcement
 * - Content scanning and security filtering
 * - Canned response management with branding
 * - Compliance reporting and audit trails
 * - Regulatory compliance (GDPR, CCPA, SOX)
 */

// ==================== CORE GOVERNANCE TYPES ====================

export interface GovernancePolicy {
  id: string
  workspace_id: string
  name: string
  description: string
  category: PolicyCategory
  type: PolicyType
  status: PolicyStatus
  priority: PolicyPriority
  rules: PolicyRule[]
  enforcement_level: EnforcementLevel
  applicable_agents?: string[]
  applicable_users?: string[]
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  created_by: string
  last_modified_by: string
  version: number
  effective_date?: string
  expiry_date?: string
}

export type PolicyCategory =
  | 'content_filtering'
  | 'data_governance'
  | 'access_control'
  | 'compliance'
  | 'security'
  | 'branding'
  | 'communication'
  | 'retention'

export type PolicyType =
  | 'mandatory'
  | 'advisory'
  | 'informational'
  | 'preventive'
  | 'detective'
  | 'corrective'

export type PolicyStatus =
  | 'draft'
  | 'active'
  | 'inactive'
  | 'deprecated'
  | 'archived'

export type PolicyPriority = 'low' | 'medium' | 'high' | 'critical'

export type EnforcementLevel =
  | 'monitor' // Log violations only
  | 'warn'    // Show warnings to users
  | 'block'   // Block violating actions
  | 'escalate' // Trigger human intervention

export interface PolicyRule {
  id: string
  condition: PolicyCondition
  action: PolicyAction
  parameters?: Record<string, any>
  weight?: number // For rule priority
  tags?: string[]
}

export interface PolicyCondition {
  field: string
  operator: 'equals' | 'contains' | 'regex' | 'gt' | 'lt' | 'in' | 'not_in'
  value: any
  case_sensitive?: boolean
  logical_operator?: 'AND' | 'OR'
  nested_conditions?: PolicyCondition[]
}

export interface PolicyAction {
  type: 'block' | 'flag' | 'redirect' | 'transform' | 'audit' | 'notify'
  parameters: Record<string, any>
  message?: string
  severity: 'info' | 'warning' | 'error' | 'critical'
}

// ==================== CANNED RESPONSES ====================

export interface CannedResponse {
  id: string
  workspace_id: string
  title: string
  content: string
  category: ResponseCategory
  tags: string[]
  language: string
  context_requirements?: ContextRequirement[]
  branding?: BrandingConfig
  personalization_fields?: PersonalizationField[]
  approval_required: boolean
  approved_by?: string
  approved_at?: string
  usage_count: number
  effectiveness_score?: number
  compliance_validated: boolean
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  created_by: string
  status: 'active' | 'inactive' | 'pending_approval' | 'archived'
  version: number
}

export type ResponseCategory =
  | 'greeting'
  | 'closing'
  | 'escalation'
  | 'compliance'
  | 'legal'
  | 'support'
  | 'sales'
  | 'technical'
  | 'apology'
  | 'clarification'

export interface ContextRequirement {
  field: string
  required: boolean
  validation_regex?: string
  default_value?: string
}

export interface BrandingConfig {
  tone: 'formal' | 'casual' | 'professional' | 'friendly'
  brand_voice_keywords: string[]
  avoid_terms: string[]
  required_disclaimers?: string[]
  signature?: string
}

export interface PersonalizationField {
  field_name: string
  placeholder: string
  data_source: 'user_profile' | 'session_data' | 'custom'
  required: boolean
  fallback_value?: string
}

// ==================== SECURITY SCANNING ====================

export interface SecurityScan {
  id: string
  session_id?: string
  agent_id?: string
  workspace_id: string
  content_hash: string
  scan_type: ScanType
  status: ScanStatus
  initiated_at: string
  completed_at?: string
  duration_ms?: number
  violations: SecurityViolation[]
  risk_score: number
  confidence_level: number
  scan_engine_version: string
  metadata?: Record<string, any>
}

export type ScanType =
  | 'real_time'
  | 'batch'
  | 'scheduled'
  | 'manual'
  | 'triggered'

export type ScanStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface SecurityViolation {
  id: string
  type: ViolationType
  severity: ViolationSeverity
  description: string
  evidence: ViolationEvidence
  recommendation: string
  policy_id?: string
  rule_id?: string
  risk_score: number
  false_positive_likelihood: number
  auto_remediated?: boolean
  remediation_action?: string
}

export type ViolationType =
  | 'pii_exposure'
  | 'sensitive_data'
  | 'inappropriate_content'
  | 'brand_violation'
  | 'compliance_breach'
  | 'security_threat'
  | 'policy_violation'
  | 'regulatory_violation'

export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ViolationEvidence {
  matched_text?: string
  pattern?: string
  location: {
    start_pos: number
    end_pos: number
    line_number?: number
  }
  context: string
  confidence: number
}

// ==================== CONTENT FILTERING ====================

export interface ContentFilter {
  id: string
  workspace_id: string
  name: string
  description: string
  filter_type: FilterType
  patterns: FilterPattern[]
  allow_list?: string[]
  block_list?: string[]
  sensitivity_level: number // 0-100
  enabled: boolean
  apply_to_incoming: boolean
  apply_to_outgoing: boolean
  applicable_agents?: string[]
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export type FilterType =
  | 'profanity'
  | 'pii'
  | 'financial'
  | 'medical'
  | 'legal'
  | 'brand_safety'
  | 'custom'

export interface FilterPattern {
  pattern: string
  pattern_type: 'regex' | 'keyword' | 'phrase' | 'ml_model'
  weight: number
  case_sensitive: boolean
  whole_word_only?: boolean
  context_aware?: boolean
}

// ==================== COMPLIANCE REPORTING ====================

export interface ComplianceReport {
  id: string
  workspace_id: string
  report_type: ReportType
  title: string
  description?: string
  period_start: string
  period_end: string
  generated_at: string
  generated_by: string
  status: ReportStatus
  format: ReportFormat
  file_path?: string
  file_size?: number
  metrics: ComplianceMetrics
  findings: ComplianceFinding[]
  recommendations: ComplianceRecommendation[]
  regulatory_requirements?: RegulatoryRequirement[]
  metadata?: Record<string, any>
}

export type ReportType =
  | 'audit_trail'
  | 'policy_compliance'
  | 'security_assessment'
  | 'data_governance'
  | 'regulatory_compliance'
  | 'incident_summary'
  | 'performance_metrics'

export type ReportStatus =
  | 'generating'
  | 'completed'
  | 'failed'
  | 'archived'

export type ReportFormat = 'pdf' | 'html' | 'json' | 'csv' | 'xlsx'

export interface ComplianceMetrics {
  total_conversations: number
  scanned_messages: number
  violations_detected: number
  violations_by_severity: Record<ViolationSeverity, number>
  policies_evaluated: number
  compliance_score: number
  improvement_trend?: number
  response_time_avg_ms: number
  false_positive_rate?: number
}

export interface ComplianceFinding {
  id: string
  type: FindingType
  severity: ViolationSeverity
  title: string
  description: string
  evidence: string[]
  affected_entities: string[]
  risk_level: number
  remediation_status: 'open' | 'in_progress' | 'resolved' | 'accepted'
  due_date?: string
  assigned_to?: string
}

export type FindingType =
  | 'policy_violation'
  | 'security_weakness'
  | 'compliance_gap'
  | 'data_exposure'
  | 'process_deficiency'

export interface ComplianceRecommendation {
  id: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  category: string
  effort_level: 'low' | 'medium' | 'high'
  estimated_impact: string
  implementation_steps?: string[]
  deadline?: string
}

// ==================== REGULATORY COMPLIANCE ====================

export interface RegulatoryRequirement {
  id: string
  regulation: RegulationType
  requirement_code: string
  title: string
  description: string
  compliance_status: ComplianceStatus
  last_assessed: string
  next_review_date: string
  evidence_required: string[]
  responsible_party: string
  notes?: string
}

export type RegulationType =
  | 'GDPR'
  | 'CCPA'
  | 'SOX'
  | 'HIPAA'
  | 'PCI_DSS'
  | 'SOC_2'
  | 'ISO_27001'
  | 'FERPA'
  | 'GLBA'

export type ComplianceStatus =
  | 'compliant'
  | 'non_compliant'
  | 'partial_compliance'
  | 'not_applicable'
  | 'under_review'

// ==================== AUDIT TRAIL ====================

export interface AuditEvent {
  id: string
  workspace_id: string
  event_type: AuditEventType
  entity_type: string
  entity_id: string
  action: AuditAction
  actor_id: string
  actor_type: 'user' | 'agent' | 'system' | 'api'
  timestamp: string
  session_id?: string
  ip_address?: string
  user_agent?: string
  before_state?: Record<string, any>
  after_state?: Record<string, any>
  changes?: AuditChange[]
  risk_score?: number
  metadata?: Record<string, any>
  retention_date: string
}

export type AuditEventType =
  | 'policy_violation'
  | 'security_scan'
  | 'content_filter'
  | 'data_access'
  | 'configuration_change'
  | 'user_action'
  | 'system_event'
  | 'compliance_check'

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'access'
  | 'scan'
  | 'filter'
  | 'validate'
  | 'approve'
  | 'reject'

export interface AuditChange {
  field: string
  old_value: any
  new_value: any
  change_type: 'added' | 'modified' | 'removed'
}

// ==================== REQUEST/RESPONSE TYPES ====================

export interface CreatePolicyRequest {
  name: string
  description: string
  category: PolicyCategory
  type: PolicyType
  priority: PolicyPriority
  rules: Omit<PolicyRule, 'id'>[]
  enforcement_level: EnforcementLevel
  applicable_agents?: string[]
  applicable_users?: string[]
  effective_date?: string
  expiry_date?: string
}

export interface UpdatePolicyRequest {
  name?: string
  description?: string
  rules?: PolicyRule[]
  enforcement_level?: EnforcementLevel
  status?: PolicyStatus
  applicable_agents?: string[]
  applicable_users?: string[]
  effective_date?: string
  expiry_date?: string
}

export interface CreateCannedResponseRequest {
  title: string
  content: string
  category: ResponseCategory
  tags: string[]
  language?: string
  context_requirements?: ContextRequirement[]
  branding?: BrandingConfig
  personalization_fields?: PersonalizationField[]
  approval_required?: boolean
}

export interface UpdateCannedResponseRequest {
  title?: string
  content?: string
  category?: ResponseCategory
  tags?: string[]
  context_requirements?: ContextRequirement[]
  branding?: BrandingConfig
  personalization_fields?: PersonalizationField[]
}

export interface SecurityScanRequest {
  content: string
  scan_type?: ScanType
  agent_id?: string
  session_id?: string
  priority?: 'low' | 'normal' | 'high'
  custom_rules?: string[]
}

export interface SecurityScanResult {
  scan_id: string
  status: ScanStatus
  violations: SecurityViolation[]
  risk_score: number
  confidence_level: number
  recommendations: string[]
  scan_duration_ms: number
}

export interface ComplianceReportRequest {
  report_type: ReportType
  title: string
  description?: string
  period_start: string
  period_end: string
  format: ReportFormat
  include_recommendations?: boolean
  include_raw_data?: boolean
  filters?: Record<string, any>
}

export interface GovernanceDashboardData {
  overview: {
    total_policies: number
    active_policies: number
    recent_violations: number
    compliance_score: number
  }
  policy_effectiveness: Array<{
    policy_id: string
    name: string
    violations_prevented: number
    false_positives: number
    effectiveness_score: number
  }>
  violation_trends: Array<{
    date: string
    total_violations: number
    by_severity: Record<ViolationSeverity, number>
  }>
  top_violations: Array<{
    type: ViolationType
    count: number
    trend: 'up' | 'down' | 'stable'
  }>
  agent_compliance: Array<{
    agent_id: string
    agent_name: string
    compliance_score: number
    recent_violations: number
  }>
}

// ==================== UTILITY TYPES ====================

export interface GovernanceContext {
  workspace_id: string
  user_id: string
  agent_id?: string
  session_id?: string
  permissions: string[]
  regulatory_requirements?: RegulationType[]
}

export interface PolicyEvaluationResult {
  policy_id: string
  rule_results: Array<{
    rule_id: string
    matched: boolean
    confidence: number
    evidence?: any
  }>
  overall_violation: boolean
  risk_score: number
  recommended_actions: PolicyAction[]
}

export interface ContentFilterResult {
  filtered_content: string
  violations_found: SecurityViolation[]
  modifications_made: Array<{
    type: 'redacted' | 'replaced' | 'masked'
    original: string
    replacement: string
    reason: string
  }>
  safety_score: number
}

export interface CannedResponseMatch {
  response: CannedResponse
  relevance_score: number
  personalized_content: string
  missing_context: string[]
  compliance_validated: boolean
}

export interface GovernanceHealthCheck {
  overall_status: 'healthy' | 'warning' | 'critical'
  policy_engine: {
    status: 'active' | 'degraded' | 'offline'
    policies_loaded: number
    last_policy_sync: string
  }
  content_scanner: {
    status: 'active' | 'degraded' | 'offline'
    scan_queue_size: number
    average_scan_time_ms: number
  }
  audit_system: {
    status: 'active' | 'degraded' | 'offline'
    events_pending: number
    retention_compliance: boolean
  }
  compliance_reports: {
    status: 'active' | 'degraded' | 'offline'
    last_report_generated: string
    pending_reports: number
  }
}

// ==================== ERROR TYPES ====================

export interface GovernanceError extends Error {
  code: GovernanceErrorCode
  policy_id?: string
  violation_details?: SecurityViolation[]
  suggested_remediation?: string[]
}

export type GovernanceErrorCode =
  | 'POLICY_VIOLATION'
  | 'SCANNING_FAILED'
  | 'COMPLIANCE_ERROR'
  | 'UNAUTHORIZED_ACCESS'
  | 'INVALID_CONFIGURATION'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'AUDIT_FAILURE'