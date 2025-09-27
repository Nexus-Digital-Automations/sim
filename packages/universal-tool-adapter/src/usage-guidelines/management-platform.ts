/**
 * Guidelines Management and Authoring Platform
 *
 * Comprehensive platform for creating, editing, reviewing, and managing
 * usage guidelines with workflow management, version control, and collaboration features.
 *
 * @author USAGE_GUIDELINES_SYSTEM_AGENT
 * @version 1.0.0
 */

import { Logger } from '../utils/logger'
import {
  type GuidelineCategory,
  type GuidelineDefinition,
  GuidelineTemplateRegistry,
} from './guidelines-framework'
import { type InteractiveTutorial, InteractiveTutorialEngine } from './interactive-guidance'
import { KnowledgeBase, type KnowledgeEntry } from './knowledge-base'

// =============================================================================
// Management Platform Core Types
// =============================================================================

export interface AuthoringWorkspace {
  id: string
  name: string
  description: string
  ownerId: string
  collaborators: Collaborator[]
  settings: WorkspaceSettings
  projects: AuthoringProject[]
  templates: WorkspaceTemplate[]
  metadata: WorkspaceMetadata
}

export interface Collaborator {
  userId: string
  role: CollaboratorRole
  permissions: Permission[]
  addedAt: Date
  addedBy: string
  status: 'active' | 'inactive' | 'pending'
}

export type CollaboratorRole = 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer'

export interface Permission {
  action: string
  resource: string
  conditions?: PermissionCondition[]
}

export interface PermissionCondition {
  field: string
  operator: 'equals' | 'contains' | 'in'
  value: any
}

export interface WorkspaceSettings {
  visibility: 'private' | 'internal' | 'public'
  defaultReviewWorkflow: ReviewWorkflow
  qualityGates: QualityGate[]
  automationRules: AutomationRule[]
  integrations: WorkspaceIntegration[]
  notifications: NotificationSettings
}

export interface ReviewWorkflow {
  id: string
  name: string
  stages: ReviewStage[]
  parallelReview: boolean
  requiredApprovals: number
  autoAdvance: boolean
}

export interface ReviewStage {
  id: string
  name: string
  reviewerRoles: CollaboratorRole[]
  specificReviewers?: string[]
  requiredReviews: number
  timeoutHours?: number
  skipConditions?: WorkflowCondition[]
}

export interface WorkflowCondition {
  field: string
  operator: string
  value: any
}

export interface QualityGate {
  id: string
  name: string
  stage: 'authoring' | 'review' | 'publish'
  checks: QualityCheck[]
  blocking: boolean
  autoFix: boolean
}

export interface QualityCheck {
  type: 'completeness' | 'accuracy' | 'clarity' | 'consistency' | 'accessibility' | 'custom'
  description: string
  criteria: CheckCriteria
  severity: 'info' | 'warning' | 'error' | 'critical'
  autoFixable: boolean
}

export interface CheckCriteria {
  rules: QualityRule[]
  threshold?: number
  customValidator?: string
}

export interface QualityRule {
  rule: string
  weight: number
  description: string
}

export interface AutomationRule {
  id: string
  name: string
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  enabled: boolean
}

export interface AutomationTrigger {
  event: string
  filters?: EventFilter[]
}

export interface EventFilter {
  field: string
  operator: string
  value: any
}

export interface AutomationCondition {
  type: 'content' | 'metadata' | 'user' | 'time' | 'custom'
  condition: string
  value: any
}

export interface AutomationAction {
  type: 'notify' | 'assign' | 'tag' | 'move' | 'update' | 'validate' | 'custom'
  config: any
  description: string
}

export interface WorkspaceIntegration {
  type: 'git' | 'cms' | 'wiki' | 'slack' | 'email' | 'webhook' | 'api'
  name: string
  config: any
  enabled: boolean
  lastSync?: Date
}

export interface NotificationSettings {
  email: EmailNotificationConfig
  inApp: InAppNotificationConfig
  webhook: WebhookNotificationConfig
  digest: DigestConfig
}

export interface EmailNotificationConfig {
  enabled: boolean
  events: string[]
  template: string
  frequency: 'immediate' | 'hourly' | 'daily'
}

export interface InAppNotificationConfig {
  enabled: boolean
  events: string[]
  retention: number // days
}

export interface WebhookNotificationConfig {
  enabled: boolean
  url?: string
  events: string[]
  retryPolicy: RetryPolicy
}

export interface RetryPolicy {
  maxRetries: number
  backoffStrategy: 'linear' | 'exponential'
  baseDelay: number
}

export interface DigestConfig {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string // HH:MM format
  content: DigestContent
}

export interface DigestContent {
  includeActivity: boolean
  includeMetrics: boolean
  includeRecommendations: boolean
  customSections: DigestSection[]
}

export interface DigestSection {
  title: string
  query: string
  template: string
}

export interface AuthoringProject {
  id: string
  name: string
  description: string
  type: 'guidelines' | 'knowledge-base' | 'tutorials' | 'mixed'
  status: ProjectStatus
  guidelines: GuidelineDocument[]
  knowledgeEntries: KnowledgeDocument[]
  tutorials: TutorialDocument[]
  metadata: ProjectMetadata
  settings: ProjectSettings
}

export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'review'
  | 'completed'
  | 'archived'
  | 'suspended'

export interface GuidelineDocument {
  id: string
  guideline: GuidelineDefinition
  authoringSession: AuthoringSession
  reviewHistory: ReviewRecord[]
  versions: DocumentVersion[]
  status: DocumentStatus
  assignments: Assignment[]
}

export interface KnowledgeDocument {
  id: string
  entry: KnowledgeEntry
  authoringSession: AuthoringSession
  reviewHistory: ReviewRecord[]
  versions: DocumentVersion[]
  status: DocumentStatus
  assignments: Assignment[]
}

export interface TutorialDocument {
  id: string
  tutorial: InteractiveTutorial
  authoringSession: AuthoringSession
  reviewHistory: ReviewRecord[]
  versions: DocumentVersion[]
  status: DocumentStatus
  assignments: Assignment[]
}

export type DocumentStatus =
  | 'draft'
  | 'in-review'
  | 'changes-requested'
  | 'approved'
  | 'published'
  | 'archived'
  | 'deprecated'

export interface AuthoringSession {
  id: string
  authorId: string
  startedAt: Date
  lastModified: Date
  changes: ChangeRecord[]
  collaborators: SessionCollaborator[]
  autosave: AutosaveConfig
}

export interface ChangeRecord {
  id: string
  timestamp: Date
  authorId: string
  type: ChangeType
  path: string
  oldValue?: any
  newValue?: any
  description: string
}

export type ChangeType =
  | 'create'
  | 'update'
  | 'delete'
  | 'move'
  | 'copy'
  | 'format'
  | 'comment'
  | 'review'

export interface SessionCollaborator {
  userId: string
  joinedAt: Date
  cursor?: CursorPosition
  selection?: SelectionRange
  typing: boolean
}

export interface CursorPosition {
  section: string
  field: string
  position: number
}

export interface SelectionRange {
  start: CursorPosition
  end: CursorPosition
}

export interface AutosaveConfig {
  enabled: boolean
  intervalMs: number
  maxVersions: number
  conflictResolution: 'latest-wins' | 'merge' | 'prompt'
}

export interface ReviewRecord {
  id: string
  reviewerId: string
  stage: string
  status: ReviewStatus
  startedAt: Date
  completedAt?: Date
  comments: ReviewComment[]
  decision: ReviewDecision
  metrics: ReviewMetrics
}

export type ReviewStatus = 'pending' | 'in-progress' | 'completed' | 'skipped' | 'timeout'

export interface ReviewComment {
  id: string
  authorId: string
  timestamp: Date
  content: string
  type: CommentType
  location?: CommentLocation
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
  replies: ReviewCommentReply[]
}

export type CommentType = 'suggestion' | 'question' | 'issue' | 'praise' | 'general'

export interface CommentLocation {
  section: string
  field: string
  startPosition?: number
  endPosition?: number
}

export interface ReviewCommentReply {
  id: string
  authorId: string
  timestamp: Date
  content: string
}

export interface ReviewDecision {
  outcome: 'approved' | 'changes-requested' | 'rejected'
  reasoning: string
  conditions?: string[]
  nextSteps?: string[]
}

export interface ReviewMetrics {
  timeSpent: number // minutes
  changesRequested: number
  qualityScore?: number
  complexity?: number
}

export interface DocumentVersion {
  id: string
  version: string
  timestamp: Date
  authorId: string
  changes: string[]
  tags: string[]
  snapshot: any // Full document snapshot
  size: number // bytes
  checksum: string
}

export interface Assignment {
  id: string
  assigneeId: string
  assignerId: string
  type: AssignmentType
  priority: 'low' | 'medium' | 'high' | 'urgent'
  description: string
  dueDate?: Date
  completedAt?: Date
  status: AssignmentStatus
}

export type AssignmentType = 'review' | 'edit' | 'approve' | 'test' | 'translate' | 'custom'
export type AssignmentStatus =
  | 'pending'
  | 'accepted'
  | 'in-progress'
  | 'completed'
  | 'declined'
  | 'overdue'

export interface ProjectMetadata {
  createdAt: Date
  createdBy: string
  lastModified: Date
  lastModifiedBy: string
  tags: string[]
  categories: string[]
  targetTools: string[]
  targetAudience: string[]
  estimatedCompletion?: Date
  actualCompletion?: Date
}

export interface ProjectSettings {
  template?: string
  workflow: ReviewWorkflow
  qualityGates: string[]
  automationRules: string[]
  permissions: ProjectPermission[]
  integrations: ProjectIntegration[]
}

export interface ProjectPermission {
  principalId: string // userId or roleId
  principalType: 'user' | 'role'
  permissions: string[]
  inherited: boolean
}

export interface ProjectIntegration {
  type: string
  config: any
  enabled: boolean
}

export interface WorkspaceTemplate {
  id: string
  name: string
  description: string
  type: 'guideline' | 'knowledge' | 'tutorial' | 'project'
  category: string
  template: any // Template-specific structure
  metadata: TemplateMetadata
}

export interface TemplateMetadata {
  author: string
  version: string
  createdAt: Date
  lastUpdated: Date
  usageCount: number
  rating: number
  tags: string[]
  compatibility: string[]
}

export interface WorkspaceMetadata {
  createdAt: Date
  createdBy: string
  lastActivity: Date
  statistics: WorkspaceStatistics
  billing?: BillingInfo
}

export interface WorkspaceStatistics {
  totalProjects: number
  totalDocuments: number
  totalCollaborators: number
  activityMetrics: ActivityMetric[]
  qualityMetrics: QualityMetric[]
}

export interface ActivityMetric {
  metric: string
  value: number
  period: string
  trend: 'up' | 'down' | 'stable'
}

export interface QualityMetric {
  metric: string
  score: number
  benchmark?: number
  improvement?: number
}

export interface BillingInfo {
  plan: string
  usage: UsageInfo
  limits: UsageLimits
  billing: BillingDetails
}

export interface UsageInfo {
  documents: number
  collaborators: number
  storage: number // bytes
  apiCalls: number
}

export interface UsageLimits {
  documents: number
  collaborators: number
  storage: number // bytes
  apiCalls: number
}

export interface BillingDetails {
  customerId: string
  subscriptionId?: string
  nextBillingDate?: Date
  amount: number
  currency: string
}

// =============================================================================
// Management Platform Implementation
// =============================================================================

export class GuidelinesManagementPlatform {
  private logger: Logger
  private workspaces: Map<string, AuthoringWorkspace> = new Map()
  private templateRegistry: GuidelineTemplateRegistry
  private knowledgeBase: any
  private tutorialEngine: any
  private eventEmitter: PlatformEventEmitter

  constructor() {
    this.logger = new Logger('GuidelinesManagementPlatform')
    this.templateRegistry = new GuidelineTemplateRegistry()
    this.knowledgeBase = new KnowledgeBase()
    this.tutorialEngine = new InteractiveTutorialEngine()
    this.eventEmitter = new PlatformEventEmitter()
    this.initializePlatform()
  }

  // =============================================================================
  // Workspace Management
  // =============================================================================

  /**
   * Create a new authoring workspace
   */
  async createWorkspace(config: CreateWorkspaceConfig): Promise<AuthoringWorkspace> {
    const workspace: AuthoringWorkspace = {
      id: `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      description: config.description || '',
      ownerId: config.ownerId,
      collaborators: [
        {
          userId: config.ownerId,
          role: 'owner',
          permissions: this.getOwnerPermissions(),
          addedAt: new Date(),
          addedBy: config.ownerId,
          status: 'active',
        },
      ],
      settings: { ...this.getDefaultWorkspaceSettings(), ...(config.settings || {}) },
      projects: [],
      templates: [],
      metadata: {
        createdAt: new Date(),
        createdBy: config.ownerId,
        lastActivity: new Date(),
        statistics: {
          totalProjects: 0,
          totalDocuments: 0,
          totalCollaborators: 1,
          activityMetrics: [],
          qualityMetrics: [],
        },
      },
    }

    this.workspaces.set(workspace.id, workspace)

    await this.eventEmitter.emit('workspace.created', {
      workspaceId: workspace.id,
      ownerId: config.ownerId,
      name: config.name,
    })

    this.logger.info('Workspace created', {
      workspaceId: workspace.id,
      name: workspace.name,
      ownerId: config.ownerId,
    })

    return workspace
  }

  /**
   * Get workspace by ID
   */
  getWorkspace(workspaceId: string): AuthoringWorkspace | null {
    return this.workspaces.get(workspaceId) || null
  }

  /**
   * Update workspace settings
   */
  async updateWorkspaceSettings(
    workspaceId: string,
    userId: string,
    updates: Partial<WorkspaceSettings>
  ): Promise<void> {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    if (!this.hasPermission(workspace, userId, 'workspace:update')) {
      throw new Error('Insufficient permissions')
    }

    Object.assign(workspace.settings, updates)
    workspace.metadata.lastActivity = new Date()

    await this.eventEmitter.emit('workspace.updated', {
      workspaceId,
      userId,
      updates: Object.keys(updates),
    })

    this.logger.info('Workspace settings updated', {
      workspaceId,
      userId,
      updates: Object.keys(updates),
    })
  }

  /**
   * Add collaborator to workspace
   */
  async addCollaborator(
    workspaceId: string,
    inviterId: string,
    collaboratorConfig: AddCollaboratorConfig
  ): Promise<void> {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    if (!this.hasPermission(workspace, inviterId, 'collaborator:add')) {
      throw new Error('Insufficient permissions')
    }

    const collaborator: Collaborator = {
      userId: collaboratorConfig.userId,
      role: collaboratorConfig.role,
      permissions: this.getRolePermissions(collaboratorConfig.role),
      addedAt: new Date(),
      addedBy: inviterId,
      status: 'pending',
    }

    workspace.collaborators.push(collaborator)
    workspace.metadata.statistics.totalCollaborators++
    workspace.metadata.lastActivity = new Date()

    await this.eventEmitter.emit('collaborator.added', {
      workspaceId,
      collaboratorId: collaborator.userId,
      role: collaborator.role,
      inviterId,
    })

    this.logger.info('Collaborator added', {
      workspaceId,
      collaboratorId: collaborator.userId,
      role: collaborator.role,
    })
  }

  // =============================================================================
  // Project Management
  // =============================================================================

  /**
   * Create a new authoring project
   */
  async createProject(
    workspaceId: string,
    userId: string,
    config: CreateProjectConfig
  ): Promise<AuthoringProject> {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    if (!this.hasPermission(workspace, userId, 'project:create')) {
      throw new Error('Insufficient permissions')
    }

    const project: AuthoringProject = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      description: config.description || '',
      type: config.type,
      status: 'planning',
      guidelines: [],
      knowledgeEntries: [],
      tutorials: [],
      metadata: {
        createdAt: new Date(),
        createdBy: userId,
        lastModified: new Date(),
        lastModifiedBy: userId,
        tags: config.tags || [],
        categories: config.categories || [],
        targetTools: config.targetTools || [],
        targetAudience: config.targetAudience || [],
      },
      settings: {
        workflow: config.workflow || workspace.settings.defaultReviewWorkflow,
        qualityGates: config.qualityGates || [],
        automationRules: config.automationRules || [],
        permissions: [],
        integrations: [],
      },
    }

    workspace.projects.push(project)
    workspace.metadata.statistics.totalProjects++
    workspace.metadata.lastActivity = new Date()

    await this.eventEmitter.emit('project.created', {
      workspaceId,
      projectId: project.id,
      userId,
      name: project.name,
      type: project.type,
    })

    this.logger.info('Project created', {
      workspaceId,
      projectId: project.id,
      name: project.name,
      type: project.type,
    })

    return project
  }

  /**
   * Create a new guideline document
   */
  async createGuidelineDocument(
    workspaceId: string,
    projectId: string,
    userId: string,
    config: CreateGuidelineConfig
  ): Promise<GuidelineDocument> {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const project = workspace.projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    if (!this.hasPermission(workspace, userId, 'document:create')) {
      throw new Error('Insufficient permissions')
    }

    // Create guideline from template if specified
    let guideline: GuidelineDefinition
    if (config.templateId) {
      const template = this.templateRegistry.getTemplate(config.templateId)
      if (!template) {
        throw new Error('Template not found')
      }
      guideline = template.createGuideline(config.toolId, config.content || {})
    } else {
      // Create basic guideline
      guideline = {
        id: `guideline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        toolId: config.toolId,
        title: config.title || 'New Guideline',
        description: config.description || '',
        version: '1.0.0',
        lastUpdated: new Date(),
        category: config.category || 'basic-usage',
        complexity: config.complexity || 'beginner',
        priority: config.priority || 'medium',
        applicableContexts: [],
        content: config.content || this.getDefaultGuidelineContent(),
        adaptations: config.adaptations || this.getDefaultAdaptations(),
        metadata: this.getDefaultGuidelineMetadata(userId),
      }
    }

    const document: GuidelineDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      guideline,
      authoringSession: {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        authorId: userId,
        startedAt: new Date(),
        lastModified: new Date(),
        changes: [],
        collaborators: [],
        autosave: {
          enabled: true,
          intervalMs: 30000,
          maxVersions: 50,
          conflictResolution: 'latest-wins',
        },
      },
      reviewHistory: [],
      versions: [
        {
          id: `version_1_${Date.now()}`,
          version: '1.0.0',
          timestamp: new Date(),
          authorId: userId,
          changes: ['Initial creation'],
          tags: ['initial'],
          snapshot: guideline,
          size: JSON.stringify(guideline).length,
          checksum: this.calculateChecksum(guideline),
        },
      ],
      status: 'draft',
      assignments: [],
    }

    project.guidelines.push(document)
    workspace.metadata.statistics.totalDocuments++
    workspace.metadata.lastActivity = new Date()

    await this.eventEmitter.emit('document.created', {
      workspaceId,
      projectId,
      documentId: document.id,
      type: 'guideline',
      userId,
    })

    this.logger.info('Guideline document created', {
      workspaceId,
      projectId,
      documentId: document.id,
      toolId: guideline.toolId,
    })

    return document
  }

  /**
   * Update guideline document
   */
  async updateGuidelineDocument(
    workspaceId: string,
    projectId: string,
    documentId: string,
    userId: string,
    updates: Partial<GuidelineDefinition>
  ): Promise<void> {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const project = workspace.projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const document = project.guidelines.find((d) => d.id === documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    if (
      !this.hasPermission(workspace, userId, 'document:edit') &&
      document.authoringSession.authorId !== userId
    ) {
      throw new Error('Insufficient permissions')
    }

    // Apply updates
    const oldSnapshot = JSON.parse(JSON.stringify(document.guideline))
    Object.assign(document.guideline, updates)
    document.guideline.lastUpdated = new Date()

    // Record changes
    const changeRecord: ChangeRecord = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      authorId: userId,
      type: 'update',
      path: 'guideline',
      oldValue: oldSnapshot,
      newValue: document.guideline,
      description: 'Guideline content updated',
    }

    document.authoringSession.changes.push(changeRecord)
    document.authoringSession.lastModified = new Date()
    workspace.metadata.lastActivity = new Date()

    // Auto-save if enabled
    if (document.authoringSession.autosave.enabled) {
      await this.createDocumentVersion(document, userId, ['Content update'])
    }

    await this.eventEmitter.emit('document.updated', {
      workspaceId,
      projectId,
      documentId,
      userId,
      changes: Object.keys(updates),
    })

    this.logger.debug('Guideline document updated', {
      workspaceId,
      projectId,
      documentId,
      userId,
      changes: Object.keys(updates),
    })
  }

  // =============================================================================
  // Review and Collaboration
  // =============================================================================

  /**
   * Submit document for review
   */
  async submitForReview(
    workspaceId: string,
    projectId: string,
    documentId: string,
    userId: string
  ): Promise<void> {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const project = workspace.projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const document = this.findDocument(project, documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    if (document.status !== 'draft' && document.status !== 'changes-requested') {
      throw new Error('Document is not in a state that can be submitted for review')
    }

    // Run quality gates
    const qualityResults = await this.runQualityGates(workspace, project, document, 'review')
    if (qualityResults.some((r) => r.blocking && !r.passed)) {
      throw new Error('Document failed quality gates')
    }

    // Update document status
    document.status = 'in-review'

    // Create review assignments based on workflow
    const workflow = project.settings.workflow
    const firstStage = workflow.stages[0]

    if (firstStage) {
      await this.createReviewAssignments(workspace, project, document, firstStage, userId)
    }

    workspace.metadata.lastActivity = new Date()

    await this.eventEmitter.emit('review.submitted', {
      workspaceId,
      projectId,
      documentId,
      userId,
      workflow: workflow.id,
    })

    this.logger.info('Document submitted for review', {
      workspaceId,
      projectId,
      documentId,
      workflow: workflow.name,
    })
  }

  /**
   * Add review comment
   */
  async addReviewComment(
    workspaceId: string,
    projectId: string,
    documentId: string,
    reviewId: string,
    userId: string,
    comment: CreateCommentConfig
  ): Promise<ReviewComment> {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const project = workspace.projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const document = this.findDocument(project, documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    const review = document.reviewHistory.find((r) => r.id === reviewId)
    if (!review) {
      throw new Error('Review not found')
    }

    if (review.reviewerId !== userId && !this.hasPermission(workspace, userId, 'review:comment')) {
      throw new Error('Insufficient permissions')
    }

    const reviewComment: ReviewComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId: userId,
      timestamp: new Date(),
      content: comment.content,
      type: comment.type || 'general',
      ...(comment.location ? { location: comment.location } : {}),
      resolved: false,
      replies: [],
    }

    review.comments.push(reviewComment)
    workspace.metadata.lastActivity = new Date()

    await this.eventEmitter.emit('comment.added', {
      workspaceId,
      projectId,
      documentId,
      reviewId,
      commentId: reviewComment.id,
      userId,
    })

    this.logger.debug('Review comment added', {
      workspaceId,
      projectId,
      documentId,
      reviewId,
      commentId: reviewComment.id,
    })

    return reviewComment
  }

  /**
   * Complete review
   */
  async completeReview(
    workspaceId: string,
    projectId: string,
    documentId: string,
    reviewId: string,
    userId: string,
    decision: ReviewDecision
  ): Promise<void> {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const project = workspace.projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const document = this.findDocument(project, documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    const review = document.reviewHistory.find((r) => r.id === reviewId)
    if (!review) {
      throw new Error('Review not found')
    }

    if (review.reviewerId !== userId) {
      throw new Error('Only the assigned reviewer can complete this review')
    }

    if (review.status !== 'in-progress') {
      throw new Error('Review is not in progress')
    }

    // Complete the review
    review.status = 'completed'
    review.completedAt = new Date()
    review.decision = decision

    // Update document status based on decision and workflow
    await this.processReviewDecision(workspace, project, document, review, decision)

    workspace.metadata.lastActivity = new Date()

    await this.eventEmitter.emit('review.completed', {
      workspaceId,
      projectId,
      documentId,
      reviewId,
      userId,
      outcome: decision.outcome,
    })

    this.logger.info('Review completed', {
      workspaceId,
      projectId,
      documentId,
      reviewId,
      outcome: decision.outcome,
    })
  }

  // =============================================================================
  // Quality Management
  // =============================================================================

  /**
   * Run quality gates for a document
   */
  async runQualityGates(
    workspace: AuthoringWorkspace,
    project: AuthoringProject,
    document: GuidelineDocument | KnowledgeDocument | TutorialDocument,
    stage: 'authoring' | 'review' | 'publish'
  ): Promise<QualityGateResult[]> {
    const applicableGates = workspace.settings.qualityGates.filter((gate) => gate.stage === stage)
    const results: QualityGateResult[] = []

    for (const gate of applicableGates) {
      const result = await this.runQualityGate(gate, document)
      results.push(result)

      // Auto-fix if possible and enabled
      if (!result.passed && gate.autoFix) {
        await this.attemptAutoFix(gate, document, result.issues)
      }
    }

    return results
  }

  /**
   * Generate quality report for document
   */
  async generateQualityReport(
    workspaceId: string,
    projectId: string,
    documentId: string,
    userId: string
  ): Promise<QualityReport> {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const project = workspace.projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const document = this.findDocument(project, documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    if (!this.hasPermission(workspace, userId, 'quality:view')) {
      throw new Error('Insufficient permissions')
    }

    const report: QualityReport = {
      documentId,
      generatedAt: new Date(),
      generatedBy: userId,
      overallScore: 0,
      categoryScores: {},
      issues: [],
      recommendations: [],
      trends: [],
    }

    // Run all quality checks
    for (const gate of workspace.settings.qualityGates) {
      for (const check of gate.checks) {
        const checkResult = await this.runQualityCheck(check, document)

        if (!checkResult.passed) {
          report.issues.push({
            type: check.type,
            severity: check.severity,
            description: checkResult.message,
            ...(checkResult.location ? { location: checkResult.location } : {}),
            autoFixable: check.autoFixable,
            ...(checkResult.suggestion ? { suggestion: checkResult.suggestion } : {}),
          })
        }

        // Update category scores
        if (!report.categoryScores[check.type]) {
          report.categoryScores[check.type] = []
        }
        report.categoryScores[check.type]!.push(checkResult.score)
      }
    }

    // Calculate overall score
    const allScores = Object.values(report.categoryScores).flat()
    report.overallScore =
      allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0

    // Generate recommendations
    report.recommendations = await this.generateQualityRecommendations(document, report.issues)

    this.logger.info('Quality report generated', {
      workspaceId,
      projectId,
      documentId,
      overallScore: report.overallScore,
      issueCount: report.issues.length,
    })

    return report
  }

  // Private helper methods
  private initializePlatform(): void {
    this.logger.info('Initializing Guidelines Management Platform')
    // Initialize default templates, workflows, etc.
  }

  private hasPermission(
    workspace: AuthoringWorkspace,
    userId: string,
    permission: string
  ): boolean {
    const collaborator = workspace.collaborators.find((c) => c.userId === userId)
    if (!collaborator || collaborator.status !== 'active') {
      return false
    }

    // Check if user has the specific permission
    return collaborator.permissions.some(
      (p) => p.action === permission.split(':')[0] && p.resource === permission.split(':')[1]
    )
  }

  private getOwnerPermissions(): Permission[] {
    return [
      { action: '*', resource: '*' }, // Owner has all permissions
    ]
  }

  private getRolePermissions(role: CollaboratorRole): Permission[] {
    const permissions: Record<CollaboratorRole, Permission[]> = {
      owner: [{ action: '*', resource: '*' }],
      admin: [
        { action: 'workspace', resource: '*' },
        { action: 'project', resource: '*' },
        { action: 'document', resource: '*' },
        { action: 'review', resource: '*' },
        { action: 'collaborator', resource: '*' },
      ],
      editor: [
        { action: 'project', resource: 'read' },
        { action: 'document', resource: '*' },
        { action: 'review', resource: 'comment' },
      ],
      reviewer: [
        { action: 'project', resource: 'read' },
        { action: 'document', resource: 'read' },
        { action: 'review', resource: '*' },
      ],
      viewer: [
        { action: 'project', resource: 'read' },
        { action: 'document', resource: 'read' },
        { action: 'review', resource: 'read' },
      ],
    }

    return permissions[role] || []
  }

  private getDefaultWorkspaceSettings(): WorkspaceSettings {
    return {
      visibility: 'private',
      defaultReviewWorkflow: {
        id: 'default',
        name: 'Default Review Workflow',
        stages: [
          {
            id: 'review',
            name: 'Review',
            reviewerRoles: ['reviewer', 'admin'],
            requiredReviews: 1,
            timeoutHours: 72,
          },
        ],
        parallelReview: false,
        requiredApprovals: 1,
        autoAdvance: false,
      },
      qualityGates: [],
      automationRules: [],
      integrations: [],
      notifications: {
        email: { enabled: false, events: [], template: '', frequency: 'immediate' },
        inApp: { enabled: true, events: ['*'], retention: 30 },
        webhook: {
          enabled: false,
          events: [],
          retryPolicy: { maxRetries: 3, backoffStrategy: 'exponential', baseDelay: 1000 },
        },
        digest: {
          enabled: false,
          frequency: 'weekly',
          time: '09:00',
          content: {
            includeActivity: true,
            includeMetrics: false,
            includeRecommendations: false,
            customSections: [],
          },
        },
      },
    }
  }

  private getDefaultGuidelineContent(): any {
    // Return a basic guideline content structure
    return {
      whenToUse: {
        primary: 'Default usage guidance',
        scenarios: [],
        conditions: [],
        antipatterns: [],
      },
      howToUse: {
        quickStart: {
          summary: 'Quick start guide',
          essentialSteps: [],
          minimumRequiredFields: [],
          estimatedTime: '5 minutes',
          successCriteria: [],
        },
        stepByStep: {
          title: 'Step-by-step guide',
          overview: 'Detailed instructions',
          prerequisites: [],
          steps: [],
          verification: [],
          troubleshooting: [],
        },
        parameterGuidance: {},
        bestPractices: [],
        commonMistakes: [],
      },
      examples: {
        basic: [],
        advanced: [],
        realWorld: [],
        conversational: [],
      },
      troubleshooting: {
        commonIssues: [],
        errorCodes: {},
        diagnostics: [],
        recovery: [],
      },
      relatedResources: {
        alternativeTools: [],
        complementaryTools: [],
        prerequisites: [],
        followUpActions: [],
      },
    }
  }

  private getDefaultAdaptations(): any {
    return {
      experienceLevel: {
        beginner: { emphasisPoints: [], additionalContent: [], omittedContent: [] },
        intermediate: { emphasisPoints: [], additionalContent: [], omittedContent: [] },
        advanced: { emphasisPoints: [], additionalContent: [], omittedContent: [] },
      },
      userRole: {},
      contextual: {
        urgent: { emphasisPoints: [], additionalContent: [], omittedContent: [] },
        collaborative: { emphasisPoints: [], additionalContent: [], omittedContent: [] },
        automated: { emphasisPoints: [], additionalContent: [], omittedContent: [] },
      },
      domainSpecific: {},
      localization: {},
    }
  }

  private getDefaultGuidelineMetadata(userId: string): any {
    return {
      author: userId,
      contributors: [],
      reviewedBy: [],
      usageStats: {
        viewCount: 0,
        helpfulVotes: 0,
        unhelpfulVotes: 0,
        feedbackCount: 0,
        lastAccessed: new Date(),
      },
      quality: {
        completeness: 0.5,
        accuracy: 0.5,
        clarity: 0.5,
        usefulness: 0.5,
      },
      relationships: {
        dependsOn: [],
        supersedes: [],
        relatedTo: [],
        conflictsWith: [],
      },
      lifecycle: {
        status: 'draft' as const,
      },
    }
  }

  private calculateChecksum(data: any): string {
    // Simple checksum calculation
    return btoa(JSON.stringify(data)).slice(0, 16)
  }

  private findDocument(
    project: AuthoringProject,
    documentId: string
  ): GuidelineDocument | KnowledgeDocument | TutorialDocument | null {
    return (
      project.guidelines.find((d) => d.id === documentId) ||
      project.knowledgeEntries.find((d) => d.id === documentId) ||
      project.tutorials.find((d) => d.id === documentId) ||
      null
    )
  }

  private async createDocumentVersion(
    document: GuidelineDocument | KnowledgeDocument | TutorialDocument,
    userId: string,
    changes: string[]
  ): Promise<void> {
    const content =
      'guideline' in document
        ? document.guideline
        : 'entry' in document
          ? document.entry
          : document.tutorial

    const version: DocumentVersion = {
      id: `version_${document.versions.length + 1}_${Date.now()}`,
      version: `1.${document.versions.length}`,
      timestamp: new Date(),
      authorId: userId,
      changes,
      tags: [],
      snapshot: content,
      size: JSON.stringify(content).length,
      checksum: this.calculateChecksum(content),
    }

    document.versions.push(version)

    // Limit version history
    if (document.versions.length > document.authoringSession.autosave.maxVersions) {
      document.versions.splice(
        0,
        document.versions.length - document.authoringSession.autosave.maxVersions
      )
    }
  }

  private async createReviewAssignments(
    workspace: AuthoringWorkspace,
    project: AuthoringProject,
    document: GuidelineDocument | KnowledgeDocument | TutorialDocument,
    stage: ReviewStage,
    submitterId: string
  ): Promise<void> {
    // Find eligible reviewers
    const eligibleReviewers = workspace.collaborators.filter(
      (c) =>
        c.status === 'active' && stage.reviewerRoles.includes(c.role) && c.userId !== submitterId
    )

    // Select reviewers based on stage requirements
    const selectedReviewers =
      stage.specificReviewers && stage.specificReviewers.length > 0
        ? workspace.collaborators.filter((c) => stage.specificReviewers!.includes(c.userId))
        : eligibleReviewers.slice(0, stage.requiredReviews)

    // Create review records
    for (const reviewer of selectedReviewers) {
      const reviewRecord: ReviewRecord = {
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reviewerId: reviewer.userId,
        stage: stage.id,
        status: 'pending',
        startedAt: new Date(),
        comments: [],
        decision: {
          outcome: 'approved',
          reasoning: '',
        },
        metrics: {
          timeSpent: 0,
          changesRequested: 0,
        },
      }

      document.reviewHistory.push(reviewRecord)

      // Create assignment
      const assignment: Assignment = {
        id: `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assigneeId: reviewer.userId,
        assignerId: submitterId,
        type: 'review',
        priority: 'medium',
        description: `Review document: ${this.getDocumentTitle(document)}`,
        status: 'pending',
      }

      document.assignments.push(assignment)
    }
  }

  private async processReviewDecision(
    workspace: AuthoringWorkspace,
    project: AuthoringProject,
    document: GuidelineDocument | KnowledgeDocument | TutorialDocument,
    review: ReviewRecord,
    decision: ReviewDecision
  ): Promise<void> {
    const workflow = project.settings.workflow
    const currentStageIndex = workflow.stages.findIndex((s) => s.id === review.stage)

    if (currentStageIndex === -1) {
      throw new Error(`Review stage ${review.stage} not found in workflow`)
    }

    switch (decision.outcome) {
      case 'approved': {
        // Check if all required reviews for this stage are complete
        const stageReviews = document.reviewHistory.filter((r) => r.stage === review.stage)
        const completedReviews = stageReviews.filter(
          (r) => r.status === 'completed' && r.decision.outcome === 'approved'
        )
        const requiredReviews = workflow.stages[currentStageIndex]!.requiredReviews

        if (completedReviews.length >= requiredReviews) {
          // Move to next stage or mark as approved
          if (currentStageIndex < workflow.stages.length - 1) {
            const nextStage = workflow.stages[currentStageIndex + 1]!
            await this.createReviewAssignments(
              workspace,
              project,
              document,
              nextStage,
              review.reviewerId
            )
          } else {
            document.status = 'approved'
          }
        }
        break
      }

      case 'changes-requested':
        document.status = 'changes-requested'
        break

      case 'rejected':
        document.status = 'draft'
        break
    }
  }

  private async runQualityGate(gate: QualityGate, document: any): Promise<QualityGateResult> {
    const issues: QualityIssue[] = []
    let passed = true

    for (const check of gate.checks) {
      const checkResult = await this.runQualityCheck(check, document)
      if (!checkResult.passed) {
        issues.push({
          type: check.type,
          severity: check.severity,
          description: checkResult.message,
          ...(checkResult.location ? { location: checkResult.location } : {}),
          autoFixable: check.autoFixable,
          ...(checkResult.suggestion ? { suggestion: checkResult.suggestion } : {}),
        })

        if (check.severity === 'error' || check.severity === 'critical') {
          passed = false
        }
      }
    }

    return {
      gateId: gate.id,
      gateName: gate.name,
      passed,
      blocking: gate.blocking,
      issues,
      timestamp: new Date(),
    }
  }

  private async runQualityCheck(check: QualityCheck, document: any): Promise<QualityCheckResult> {
    // Simplified quality check implementation
    return {
      checkType: check.type,
      passed: true,
      score: 1.0,
      message: 'Check passed',
    }
  }

  private async attemptAutoFix(
    gate: QualityGate,
    document: any,
    issues: QualityIssue[]
  ): Promise<void> {
    // Simplified auto-fix implementation
    this.logger.debug('Attempting auto-fix for quality issues', {
      gateId: gate.id,
      issueCount: issues.length,
    })
  }

  private async generateQualityRecommendations(
    document: any,
    issues: QualityIssue[]
  ): Promise<QualityRecommendation[]> {
    const recommendations: QualityRecommendation[] = []

    // Generate recommendations based on issues
    const groupedIssues = this.groupIssuesByType(issues)

    for (const [type, typeIssues] of Object.entries(groupedIssues)) {
      if (typeIssues.length > 0) {
        recommendations.push({
          category: type,
          priority: this.calculateRecommendationPriority(typeIssues),
          title: `Improve ${type}`,
          description: `Address ${typeIssues.length} ${type} issues`,
          actions: typeIssues.map((issue) => issue.suggestion).filter(Boolean) as string[],
          impact: 'medium',
          effort: 'low',
        })
      }
    }

    return recommendations
  }

  private groupIssuesByType(issues: QualityIssue[]): Record<string, QualityIssue[]> {
    return issues.reduce(
      (groups, issue) => {
        if (!groups[issue.type]) {
          groups[issue.type] = []
        }
        groups[issue.type]!.push(issue)
        return groups
      },
      {} as Record<string, QualityIssue[]>
    )
  }

  private calculateRecommendationPriority(
    issues: QualityIssue[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const severities = issues.map((issue) => issue.severity)

    if (severities.includes('critical')) return 'critical'
    if (severities.includes('error')) return 'high'
    if (severities.includes('warning')) return 'medium'
    return 'low'
  }

  private getDocumentTitle(
    document: GuidelineDocument | KnowledgeDocument | TutorialDocument
  ): string {
    if ('guideline' in document) return document.guideline.title
    if ('entry' in document) return document.entry.title
    return document.tutorial.title
  }
}

// =============================================================================
// Platform Event System
// =============================================================================

class PlatformEventEmitter {
  private eventHandlers: Map<string, Array<(data: any) => Promise<void>>> = new Map()
  private logger: Logger

  constructor() {
    this.logger = new Logger('PlatformEventEmitter')
  }

  async emit(eventType: string, data: any): Promise<void> {
    const handlers = this.eventHandlers.get(eventType) || []

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(data)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.logger.error('Event handler error', {
            eventType,
            error: errorMessage,
          })
        }
      })
    )

    this.logger.debug('Event emitted', {
      eventType,
      handlerCount: handlers.length,
      data: Object.keys(data),
    })
  }

  on(eventType: string, handler: (data: any) => Promise<void>): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }
    this.eventHandlers.get(eventType)!.push(handler)
  }

  off(eventType: string, handler: (data: any) => Promise<void>): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }
}

// =============================================================================
// Supporting Configuration Types
// =============================================================================

export interface CreateWorkspaceConfig {
  name: string
  description?: string
  ownerId: string
  settings?: Partial<WorkspaceSettings>
}

export interface AddCollaboratorConfig {
  userId: string
  role: CollaboratorRole
  permissions?: Permission[]
}

export interface CreateProjectConfig {
  name: string
  description?: string
  type: 'guidelines' | 'knowledge-base' | 'tutorials' | 'mixed'
  tags?: string[]
  categories?: string[]
  targetTools?: string[]
  targetAudience?: string[]
  workflow?: ReviewWorkflow
  qualityGates?: string[]
  automationRules?: string[]
}

export interface CreateGuidelineConfig {
  toolId: string
  title?: string
  description?: string
  templateId?: string
  category?: GuidelineCategory
  complexity?: 'beginner' | 'intermediate' | 'advanced'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  content?: any
  adaptations?: any
}

export interface CreateCommentConfig {
  content: string
  type?: CommentType
  location?: CommentLocation
}

export interface QualityGateResult {
  gateId: string
  gateName: string
  passed: boolean
  blocking: boolean
  issues: QualityIssue[]
  timestamp: Date
}

export interface QualityCheckResult {
  checkType: string
  passed: boolean
  score: number
  message: string
  location?: string
  suggestion?: string
}

export interface QualityIssue {
  type: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  description: string
  location?: string
  autoFixable: boolean
  suggestion?: string
}

export interface QualityReport {
  documentId: string
  generatedAt: Date
  generatedBy: string
  overallScore: number
  categoryScores: Record<string, number[]>
  issues: QualityIssue[]
  recommendations: QualityRecommendation[]
  trends: QualityTrend[]
}

export interface QualityRecommendation {
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  actions: string[]
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
}

export interface QualityTrend {
  metric: string
  direction: 'improving' | 'stable' | 'declining'
  change: number
  period: string
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createGuidelinesManagementPlatform(): GuidelinesManagementPlatform {
  return new GuidelinesManagementPlatform()
}

export async function setupWorkspace(
  platform: GuidelinesManagementPlatform,
  config: CreateWorkspaceConfig
): Promise<AuthoringWorkspace> {
  const workspace = await platform.createWorkspace(config)

  // Set up default templates and workflows
  // Implementation would add standard templates and workflows

  return workspace
}
