import { ComponentIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { ApprovalResponse } from '@/tools/approval/types'

export const ApprovalWorkflowBlock: BlockConfig<ApprovalResponse> = {
  type: 'approval_workflow',
  name: 'Approval Workflow',
  description: 'Multi-stage approval process with notifications and escalation',
  longDescription:
    'Create sophisticated approval workflows with multiple stages, conditional routing, automatic escalation, and comprehensive audit trails. Support for parallel and sequential approvals.',
  docsLink: 'https://docs.sim.ai/blocks/approval-workflow',
  category: 'blocks',
  bgColor: '#059669',
  icon: ComponentIcon,
  subBlocks: [
    {
      id: 'workflowName',
      title: 'Workflow Name',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Purchase Order Approval',
      required: true,
      description: 'Name for this approval workflow',
    },
    {
      id: 'requestData',
      title: 'Request Data',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "type": "purchase_order",
  "amount": 5000,
  "vendor": "Tech Solutions Inc",
  "description": "Software licenses for development team",
  "requestedBy": "john.doe@company.com",
  "department": "Engineering",
  "urgency": "normal"
}`,
      required: true,
      rows: 10,
      description: 'Data for the approval request',
    },
    {
      id: 'approvalStages',
      title: 'Approval Stages',
      type: 'table',
      layout: 'full',
      columns: ['Stage Name', 'Approvers', 'Required Approvals', 'Timeout (hours)'],
      required: true,
      description: 'Define approval stages with approvers and requirements',
    },
    {
      id: 'approvalType',
      title: 'Approval Type',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Sequential (One stage at a time)', id: 'sequential' },
        { label: 'Parallel (All stages simultaneously)', id: 'parallel' },
        { label: 'Conditional (Based on rules)', id: 'conditional' },
        { label: 'Hybrid (Mix of sequential and parallel)', id: 'hybrid' },
      ],
      value: () => 'sequential',
    },
    {
      id: 'votingMethod',
      title: 'Voting Method',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Any Approver', id: 'any' },
        { label: 'All Approvers', id: 'all' },
        { label: 'Majority Vote', id: 'majority' },
        { label: 'Specific Count', id: 'count' },
        { label: 'Weighted Vote', id: 'weighted' },
      ],
      value: () => 'any',
    },
    {
      id: 'requiredApprovals',
      title: 'Required Approvals Count',
      type: 'slider',
      layout: 'full',
      min: 1,
      max: 10,
      step: 1,
      value: () => '1',
      condition: { field: 'votingMethod', value: 'count' },
      description: 'Minimum number of approvals required',
    },
    {
      id: 'conditionalRules',
      title: 'Conditional Rules',
      type: 'code',
      layout: 'full',
      language: 'javascript',
      placeholder: `function getApprovalStages(requestData) {
  const stages = [];
  
  // Amount-based approval routing
  if (requestData.amount > 10000) {
    stages.push('cfo_approval');
  }
  if (requestData.amount > 1000) {
    stages.push('manager_approval');
  }
  
  // Department-specific routing
  if (requestData.department === 'Engineering') {
    stages.push('tech_lead_approval');
  }
  
  // Urgency-based routing
  if (requestData.urgency === 'high') {
    stages.push('emergency_approval');
  }
  
  return stages;
}`,
      condition: { field: 'approvalType', value: 'conditional' },
      rows: 15,
      description: 'JavaScript function to determine approval stages based on request data',
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert in business process automation. Create conditional approval routing logic.

Current context: {context}

Create a JavaScript function that:
1. Takes requestData as parameter
2. Returns array of required approval stages
3. Includes business logic for routing decisions
4. Handles different approval scenarios

Generate ONLY the JavaScript function:

function getApprovalStages(requestData) {
  // Your conditional logic here
  return stages;
}`,
        placeholder: 'Describe the conditional approval logic...',
        generationType: 'javascript-function-body',
      },
    },
    {
      id: 'escalationEnabled',
      title: 'Enable Escalation',
      type: 'switch',
      layout: 'half',
      description: 'Automatically escalate overdue approvals',
    },
    {
      id: 'escalationTimeout',
      title: 'Escalation Timeout (hours)',
      type: 'slider',
      layout: 'half',
      min: 1,
      max: 168,
      step: 1,
      value: () => '24',
      condition: { field: 'escalationEnabled', value: true },
      description: 'Hours before escalating to next level',
    },
    {
      id: 'escalationLevels',
      title: 'Escalation Levels',
      type: 'table',
      layout: 'full',
      columns: ['Level', 'Escalate To', 'Timeout (hours)'],
      condition: { field: 'escalationEnabled', value: true },
      description: 'Define escalation hierarchy and timeouts',
    },
    {
      id: 'notificationSettings',
      title: 'Notification Settings',
      type: 'checkbox-list',
      layout: 'full',
      options: [
        { label: 'Email Notifications', id: 'email' },
        { label: 'Slack Notifications', id: 'slack' },
        { label: 'SMS Notifications', id: 'sms' },
        { label: 'In-App Notifications', id: 'in_app' },
        { label: 'Teams Notifications', id: 'teams' },
      ],
      value: () => ['email'],
      description: 'Notification channels for approvers',
    },
    {
      id: 'notificationTemplate',
      title: 'Notification Template',
      type: 'code',
      layout: 'full',
      language: 'javascript',
      placeholder: `{
  "subject": "Approval Required: {{requestData.type}} - {{requestData.amount}}",
  "body": "A new {{requestData.type}} request requires your approval.\\n\\nAmount: ${{requestData.amount}}\\nVendor: {{requestData.vendor}}\\nRequested by: {{requestData.requestedBy}}\\nDescription: {{requestData.description}}\\n\\nPlease review and approve/reject this request.",
  "urgency": "{{requestData.urgency}}",
  "metadata": {
    "department": "{{requestData.department}}",
    "request_id": "{{workflowId}}"
  }
}`,
      rows: 12,
      description: 'Template for approval notifications',
    },
    {
      id: 'approvalActions',
      title: 'Approval Actions',
      type: 'table',
      layout: 'full',
      columns: ['Action', 'Webhook URL', 'Trigger'],
      description: 'Actions to trigger on approval events',
    },
    {
      id: 'delegationEnabled',
      title: 'Allow Delegation',
      type: 'switch',
      layout: 'half',
      description: 'Approvers can delegate to others',
    },
    {
      id: 'delegationRules',
      title: 'Delegation Rules',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "maxDelegationLevels": 2,
  "allowedDelegates": ["manager", "peer", "subordinate"],
  "requireJustification": true,
  "notifyOriginalApprover": true
}`,
      condition: { field: 'delegationEnabled', value: true },
      description: 'Rules for approval delegation',
    },
    {
      id: 'auditTrail',
      title: 'Enable Detailed Audit Trail',
      type: 'switch',
      layout: 'half',
      description: 'Track all approval actions and timestamps',
      value: () => true,
    },
    {
      id: 'customFields',
      title: 'Custom Approval Fields',
      type: 'table',
      layout: 'full',
      columns: ['Field Name', 'Type', 'Required', 'Options'],
      description: 'Additional fields for approvers to fill',
    },
    {
      id: 'workflowTimeout',
      title: 'Overall Workflow Timeout (hours)',
      type: 'slider',
      layout: 'full',
      min: 1,
      max: 720,
      step: 1,
      value: () => '72',
      description: 'Maximum time for entire workflow completion',
    },
    {
      id: 'rejectionHandling',
      title: 'Rejection Handling',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Stop Workflow', id: 'stop' },
        { label: 'Return to Requester', id: 'return' },
        { label: 'Escalate to Manager', id: 'escalate' },
        { label: 'Allow Resubmission', id: 'resubmit' },
      ],
      value: () => 'return',
      description: 'Action when approval is rejected',
    },
    {
      id: 'anonymousVoting',
      title: 'Anonymous Voting',
      type: 'switch',
      layout: 'half',
      description: 'Hide individual approver decisions',
    },
  ],
  tools: {
    access: ['approval_workflow'],
  },
  inputs: {
    workflowName: { type: 'string', description: 'Name of the approval workflow' },
    requestData: { type: 'json', description: 'Data for the approval request' },
    approvalStages: { type: 'json', description: 'Configuration of approval stages' },
    approvalType: { type: 'string', description: 'Type of approval workflow' },
    votingMethod: { type: 'string', description: 'Method for counting approvals' },
    requiredApprovals: { type: 'number', description: 'Required number of approvals' },
    conditionalRules: { type: 'string', description: 'JavaScript conditional routing function' },
    escalationEnabled: { type: 'boolean', description: 'Enable automatic escalation' },
    escalationTimeout: { type: 'number', description: 'Escalation timeout in hours' },
    escalationLevels: { type: 'json', description: 'Escalation level configuration' },
    notificationSettings: { type: 'json', description: 'Notification channel settings' },
    notificationTemplate: { type: 'json', description: 'Notification template' },
    approvalActions: { type: 'json', description: 'Actions for approval events' },
    delegationEnabled: { type: 'boolean', description: 'Allow approval delegation' },
    delegationRules: { type: 'json', description: 'Delegation rules configuration' },
    auditTrail: { type: 'boolean', description: 'Enable detailed audit trail' },
    customFields: { type: 'json', description: 'Custom approval fields' },
    workflowTimeout: { type: 'number', description: 'Overall workflow timeout in hours' },
    rejectionHandling: { type: 'string', description: 'Rejection handling strategy' },
    anonymousVoting: { type: 'boolean', description: 'Enable anonymous voting' },
  },
  outputs: {
    workflowId: { type: 'string', description: 'Unique workflow instance ID' },
    status: { type: 'string', description: 'Current workflow status' },
    currentStage: { type: 'string', description: 'Current approval stage' },
    approvals: { type: 'array', description: 'List of approvals received' },
    rejections: { type: 'array', description: 'List of rejections received' },
    pendingApprovers: { type: 'array', description: 'Approvers still pending' },
    completedStages: { type: 'array', description: 'Completed approval stages' },
    auditLog: { type: 'array', description: 'Detailed audit trail' },
    finalDecision: { type: 'string', description: 'Final approval decision' },
    completedAt: { type: 'string', description: 'Workflow completion timestamp' },
    processingTime: { type: 'number', description: 'Total processing time in hours' },
    escalationCount: { type: 'number', description: 'Number of escalations triggered' },
    delegationCount: { type: 'number', description: 'Number of delegations made' },
    notificationsSent: { type: 'number', description: 'Total notifications sent' },
    error: { type: 'string', description: 'Error message if workflow failed' },
  },
}