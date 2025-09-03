/**
 * Approval Gate Block Implementation
 *
 * Implements manual approval gates for workflow automation with comprehensive
 * approval management, timeout handling, and notification systems.
 *
 * Features:
 * - Manual approval workflow with multiple approvers
 * - Configurable timeout handling with fallback actions
 * - Comprehensive notification system (email, webhook, Slack)
 * - Approval history and audit trail
 * - Escalation and delegation support
 * - Production-ready state management and logging
 *
 * @author Claude Code Assistant
 * @created 2025-09-03
 */

import { UserCheckIcon } from '@/components/icons'
import { createLogger } from '@/lib/logs/console/logger'
import type { BlockConfig } from '@/blocks/types'

const logger = createLogger('ApprovalGateBlock')

/**
 * Approval Gate Block Output Interface
 * Provides comprehensive approval status and history information
 */
interface ApprovalGateBlockOutput {
  success: boolean
  output: {
    content: string
    approvalStatus: 'pending' | 'approved' | 'rejected' | 'timeout' | 'error'
    approvalResult: {
      approved: boolean
      approvedBy?: string
      approvedAt?: string
      rejectedBy?: string
      rejectedAt?: string
      reason?: string
      timeoutReason?: string
    }
    approvalDetails: {
      approvalId: string
      requestedApprovers: string[]
      notificationsSent: number
      timeoutMinutes: number
      escalationLevel: number
      approvalHistory: Array<{
        action: 'requested' | 'approved' | 'rejected' | 'timeout' | 'escalated'
        by: string
        at: string
        reason?: string
        metadata?: any
      }>
    }
    workflowControl: {
      shouldContinue: boolean
      executionPath: 'approved' | 'rejected' | 'timeout'
      pausedAt: string
      resumedAt?: string
      totalWaitTime: number
    }
  }
}

/**
 * Approval Gate Block Configuration
 *
 * Implements comprehensive approval workflow management with timeout handling,
 * escalation support, and multiple notification channels.
 */
export const ApprovalGateBlock: BlockConfig<ApprovalGateBlockOutput> = {
  type: 'approval-gate',
  name: 'Approval Gate',
  description: 'Pause workflow for manual approval with timeout and escalation',
  longDescription:
    'Advanced approval gate that pauses workflow execution for manual approval. Supports multiple approvers, timeout handling, escalation, and comprehensive notification systems.',
  docsLink: 'https://docs.sim.ai/blocks/approval-gate',
  bgColor: '#F59E0B',
  icon: UserCheckIcon,
  category: 'blocks',

  subBlocks: [
    // Approval request configuration
    {
      id: 'approvalTitle',
      title: 'Approval Title',
      type: 'short-input',
      layout: 'full',
      required: true,
      placeholder: 'Approval Required: Expense Report #1234',
      description: 'Clear title for the approval request',
    },

    {
      id: 'approvalMessage',
      title: 'Approval Message',
      type: 'long-input',
      layout: 'full',
      required: true,
      rows: 4,
      placeholder:
        'Please review and approve the attached expense report for $500. All receipts are included and within policy limits.',
      description: 'Detailed message explaining what needs approval',
    },

    // Approvers configuration
    {
      id: 'approvers',
      title: 'Required Approvers',
      type: 'combobox',
      layout: 'full',
      required: true,
      multiSelect: true,
      placeholder: 'Select users who can approve...',
      description: 'Users authorized to approve this request',
    },

    {
      id: 'approvalType',
      title: 'Approval Type',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Any One Approver', id: 'any' },
        { label: 'All Approvers Required', id: 'all' },
        { label: 'Majority Vote', id: 'majority' },
      ],
      value: () => 'any',
      description: 'How many approvers are needed',
    },

    // Timeout configuration
    {
      id: 'timeoutMinutes',
      title: 'Timeout (minutes)',
      type: 'short-input',
      layout: 'half',
      required: true,
      placeholder: '60',
      value: () => '60',
      description: 'Time to wait before timeout',
    },

    {
      id: 'timeoutAction',
      title: 'On Timeout',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Auto-approve', id: 'approve' },
        { label: 'Auto-reject', id: 'reject' },
        { label: 'Escalate to manager', id: 'escalate' },
        { label: 'Stop workflow with error', id: 'error' },
      ],
      value: () => 'reject',
      description: 'Action to take when timeout is reached',
    },

    // Escalation configuration
    {
      id: 'enableEscalation',
      title: 'Enable Escalation',
      type: 'switch',
      layout: 'half',
      value: () => false,
      description: 'Enable escalation to higher authorities',
    },

    {
      id: 'escalationApprovers',
      title: 'Escalation Approvers',
      type: 'combobox',
      layout: 'half',
      multiSelect: true,
      placeholder: 'Select escalation approvers...',
      description: "Users to escalate to if original approvers don't respond",
      condition: {
        field: 'enableEscalation',
        value: true,
      },
    },

    {
      id: 'escalationDelay',
      title: 'Escalation Delay (minutes)',
      type: 'short-input',
      layout: 'half',
      placeholder: '30',
      value: () => '30',
      description: 'Time to wait before escalating',
      condition: {
        field: 'enableEscalation',
        value: true,
      },
    },

    // Notification configuration
    {
      id: 'notificationMethod',
      title: 'Notification Method',
      type: 'checkbox-list',
      layout: 'full',
      multiSelect: true,
      options: [
        { label: 'Email', id: 'email' },
        { label: 'Webhook', id: 'webhook' },
        { label: 'Slack', id: 'slack' },
        { label: 'In-app notification', id: 'inapp' },
      ],
      value: () => ['email', 'inapp'],
      description: 'How to notify approvers',
    },

    // Email notification settings
    {
      id: 'emailTemplate',
      title: 'Email Template',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Standard Approval Request', id: 'standard' },
        { label: 'Urgent Approval Request', id: 'urgent' },
        { label: 'Custom Template', id: 'custom' },
      ],
      value: () => 'standard',
      condition: {
        field: 'notificationMethod',
        value: ['email'],
      },
    },

    {
      id: 'customEmailTemplate',
      title: 'Custom Email Template',
      type: 'long-input',
      layout: 'full',
      rows: 6,
      placeholder:
        'Subject: {{approvalTitle}}\n\nDear {{approverName}},\n\n{{approvalMessage}}\n\nPlease approve or reject this request: {{approvalLink}}',
      condition: {
        field: 'emailTemplate',
        value: 'custom',
      },
    },

    // Webhook notification settings
    {
      id: 'webhookUrl',
      title: 'Webhook URL',
      type: 'short-input',
      layout: 'full',
      placeholder: 'https://your-webhook-endpoint.com/approval',
      condition: {
        field: 'notificationMethod',
        value: ['webhook'],
      },
    },

    // Slack notification settings
    {
      id: 'slackChannel',
      title: 'Slack Channel',
      type: 'short-input',
      layout: 'half',
      placeholder: '#approvals',
      condition: {
        field: 'notificationMethod',
        value: ['slack'],
      },
    },

    // Additional options
    {
      id: 'allowDelegation',
      title: 'Allow Delegation',
      type: 'switch',
      layout: 'half',
      value: () => false,
      description: 'Allow approvers to delegate to others',
    },

    {
      id: 'requireComments',
      title: 'Require Comments',
      type: 'switch',
      layout: 'half',
      value: () => false,
      description: 'Require comments when approving/rejecting',
    },

    // Priority and urgency
    {
      id: 'priority',
      title: 'Priority Level',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Low', id: 'low' },
        { label: 'Normal', id: 'normal' },
        { label: 'High', id: 'high' },
        { label: 'Critical', id: 'critical' },
      ],
      value: () => 'normal',
      description: 'Priority level for this approval',
    },

    // Context data for approval
    {
      id: 'contextData',
      title: 'Context Data',
      type: 'code',
      language: 'json',
      layout: 'full',
      description: 'Additional data to include in approval request',
      placeholder:
        '{\n  "amount": 500,\n  "department": "Engineering",\n  "project": "Q4 Initiative"\n}',
    },

    // Audit and compliance
    {
      id: 'auditRequired',
      title: 'Audit Trail Required',
      type: 'switch',
      layout: 'half',
      value: () => true,
      description: 'Maintain detailed audit trail',
    },

    {
      id: 'complianceLevel',
      title: 'Compliance Level',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Standard', id: 'standard' },
        { label: 'Enhanced', id: 'enhanced' },
        { label: 'SOX Compliant', id: 'sox' },
      ],
      value: () => 'standard',
      condition: {
        field: 'auditRequired',
        value: true,
      },
    },
  ],

  tools: {
    access: [], // No external tools needed for approval logic
  },

  inputs: {
    // No specific inputs - approval gates control workflow based on manual decisions
  },

  outputs: {
    content: {
      type: 'string',
      description: 'Approval status summary and outcome details',
    },
    approvalStatus: {
      type: 'string',
      description: 'Current status of the approval request (pending, approved, rejected, timeout)',
    },
    approvalResult: {
      type: 'json',
      description: 'Detailed approval result including who approved/rejected and when',
    },
    approvalDetails: {
      type: 'json',
      description: 'Comprehensive approval process details including history and notifications',
    },
    workflowControl: {
      type: 'json',
      description: 'Workflow control information including pause/resume times and execution path',
    },
  },
}

/**
 * Approval Gate Utility Functions
 *
 * Provides comprehensive approval workflow management including notifications,
 * timeout handling, and state management.
 */

/**
 * Creates a unique approval request ID
 * @param blockId - Block identifier
 * @param executionId - Workflow execution identifier
 * @returns Unique approval ID
 */
export function generateApprovalId(blockId: string, executionId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `approval_${blockId}_${executionId}_${timestamp}_${random}`
}

/**
 * Validates approvers configuration
 * @param approvers - Array of approver identifiers
 * @param approvalType - Type of approval required
 * @returns Validation result
 */
export function validateApprovers(
  approvers: string[],
  approvalType: string
): {
  isValid: boolean
  error?: string
} {
  try {
    if (!Array.isArray(approvers) || approvers.length === 0) {
      return { isValid: false, error: 'At least one approver is required' }
    }

    // Remove duplicates and empty values
    const uniqueApprovers = [...new Set(approvers.filter((a) => a?.trim()))]

    if (uniqueApprovers.length === 0) {
      return { isValid: false, error: 'At least one valid approver is required' }
    }

    // Validate approval type requirements
    switch (approvalType) {
      case 'majority':
        if (uniqueApprovers.length < 2) {
          return { isValid: false, error: 'Majority voting requires at least 2 approvers' }
        }
        break
      case 'all':
        if (uniqueApprovers.length > 10) {
          return {
            isValid: false,
            error: 'All-approver mode limited to 10 approvers for performance',
          }
        }
        break
    }

    return { isValid: true }
  } catch (error: any) {
    return { isValid: false, error: `Approvers validation failed: ${error.message}` }
  }
}

/**
 * Calculates approval requirements based on type and approver count
 * @param approvers - Array of approver identifiers
 * @param approvalType - Type of approval required
 * @returns Approval requirements
 */
export function calculateApprovalRequirements(
  approvers: string[],
  approvalType: string
): {
  totalApprovers: number
  requiredApprovals: number
  allowPartialApproval: boolean
  approvalThreshold: number
} {
  const totalApprovers = approvers.length

  switch (approvalType) {
    case 'any':
      return {
        totalApprovers,
        requiredApprovals: 1,
        allowPartialApproval: true,
        approvalThreshold: 1,
      }

    case 'all':
      return {
        totalApprovers,
        requiredApprovals: totalApprovers,
        allowPartialApproval: false,
        approvalThreshold: totalApprovers,
      }

    case 'majority': {
      const requiredApprovals = Math.ceil(totalApprovers / 2)
      return {
        totalApprovers,
        requiredApprovals,
        allowPartialApproval: true,
        approvalThreshold: requiredApprovals,
      }
    }

    default:
      return {
        totalApprovers,
        requiredApprovals: 1,
        allowPartialApproval: true,
        approvalThreshold: 1,
      }
  }
}

/**
 * Generates approval notification content
 * @param config - Approval configuration
 * @param contextData - Additional context data
 * @param approvalId - Unique approval identifier
 * @returns Notification content
 */
export function generateApprovalNotification(
  config: {
    approvalTitle: string
    approvalMessage: string
    priority: string
    timeoutMinutes: number
    contextData?: string
  },
  contextData: any,
  approvalId: string
): {
  subject: string
  message: string
  priority: 'low' | 'normal' | 'high' | 'critical'
  metadata: any
} {
  try {
    let subject = config.approvalTitle
    let message = config.approvalMessage

    // Add priority prefix to subject
    if (config.priority === 'high' || config.priority === 'critical') {
      subject = `[${config.priority.toUpperCase()}] ${subject}`
    }

    // Parse and include context data
    let parsedContext = {}
    if (config.contextData) {
      try {
        parsedContext = JSON.parse(config.contextData)
      } catch {
        // Ignore invalid JSON
      }
    }

    // Template replacement (basic)
    const templateData = {
      approvalId,
      ...parsedContext,
      ...contextData,
      timeoutMinutes: config.timeoutMinutes,
      timestamp: new Date().toISOString(),
    }

    // Replace template variables in message
    Object.keys(templateData).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      message = message.replace(regex, String(templateData[key]))
    })

    return {
      subject,
      message,
      priority: config.priority as 'low' | 'normal' | 'high' | 'critical',
      metadata: {
        approvalId,
        contextData: parsedContext,
        timeoutAt: new Date(Date.now() + config.timeoutMinutes * 60 * 1000).toISOString(),
      },
    }
  } catch (error: any) {
    logger.error('Failed to generate approval notification', {
      approvalId,
      error: error.message,
    })

    return {
      subject: config.approvalTitle || 'Approval Required',
      message: config.approvalMessage || 'Please review and approve this request.',
      priority: 'normal',
      metadata: { approvalId, error: error.message },
    }
  }
}

/**
 * Determines if approval criteria are met
 * @param approvals - Array of approval responses
 * @param rejections - Array of rejection responses
 * @param requirements - Approval requirements
 * @returns Whether approval criteria are satisfied
 */
export function isApprovalComplete(
  approvals: Array<{ by: string; at: string; reason?: string }>,
  rejections: Array<{ by: string; at: string; reason?: string }>,
  requirements: {
    totalApprovers: number
    requiredApprovals: number
    allowPartialApproval: boolean
    approvalThreshold: number
  }
): {
  isComplete: boolean
  isApproved: boolean
  reason: string
  summary: {
    approvalsReceived: number
    rejectionsReceived: number
    approvalsRequired: number
    totalApprovers: number
  }
} {
  const approvalsReceived = approvals.length
  const rejectionsReceived = rejections.length

  // Check for explicit rejection (any rejection blocks approval unless overridden)
  if (rejectionsReceived > 0 && !requirements.allowPartialApproval) {
    return {
      isComplete: true,
      isApproved: false,
      reason: `Approval rejected by ${rejections[0].by}`,
      summary: {
        approvalsReceived,
        rejectionsReceived,
        approvalsRequired: requirements.requiredApprovals,
        totalApprovers: requirements.totalApprovers,
      },
    }
  }

  // Check if approval threshold is met
  if (approvalsReceived >= requirements.approvalThreshold) {
    return {
      isComplete: true,
      isApproved: true,
      reason: `Approval threshold met: ${approvalsReceived}/${requirements.requiredApprovals} approvals received`,
      summary: {
        approvalsReceived,
        rejectionsReceived,
        approvalsRequired: requirements.requiredApprovals,
        totalApprovers: requirements.totalApprovers,
      },
    }
  }

  // Check if rejection threshold is met (more rejections than possible approvals)
  const remainingApprovers = requirements.totalApprovers - approvalsReceived - rejectionsReceived
  const maxPossibleApprovals = approvalsReceived + remainingApprovers

  if (maxPossibleApprovals < requirements.requiredApprovals) {
    return {
      isComplete: true,
      isApproved: false,
      reason: `Not enough approvers remaining: need ${requirements.requiredApprovals}, can only get ${maxPossibleApprovals}`,
      summary: {
        approvalsReceived,
        rejectionsReceived,
        approvalsRequired: requirements.requiredApprovals,
        totalApprovers: requirements.totalApprovers,
      },
    }
  }

  // Approval still pending
  return {
    isComplete: false,
    isApproved: false,
    reason: `Waiting for approvals: ${approvalsReceived}/${requirements.requiredApprovals} received`,
    summary: {
      approvalsReceived,
      rejectionsReceived,
      approvalsRequired: requirements.requiredApprovals,
      totalApprovers: requirements.totalApprovers,
    },
  }
}
