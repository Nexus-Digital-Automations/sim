/**
 * Approval workflow types for workflow approval gates
 */

export interface ApprovalRequest {
  id: string
  workflowId: string
  workflowName: string
  executionId: string
  blockId: string
  title: string
  description?: string
  requestedBy: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  metadata?: Record<string, unknown>
}

export interface ApprovalResponse {
  success: boolean
  message?: string
  requestId?: string
  status?: 'approved' | 'rejected' | 'pending'
  approvedBy?: string
  approvedAt?: string
  error?: string
}

export interface ApprovalSettings {
  requireApproval: boolean
  approvers: string[]
  autoApprovalRules?: ApprovalRule[]
  timeout?: number // minutes
  notificationSettings?: NotificationSettings
}

export interface ApprovalRule {
  id: string
  name: string
  condition: string // JavaScript expression
  action: 'approve' | 'reject'
  enabled: boolean
}

export interface NotificationSettings {
  emailNotifications: boolean
  slackNotifications: boolean
  webhookUrl?: string
}

export interface ApprovalContext {
  workflow: {
    id: string
    name: string
    version?: string
  }
  execution: {
    id: string
    startedAt: string
    triggeredBy: string
  }
  block: {
    id: string
    name: string
    type: string
  }
  data: Record<string, unknown>
}