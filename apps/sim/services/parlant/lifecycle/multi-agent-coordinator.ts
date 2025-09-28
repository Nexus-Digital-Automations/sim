/**
 * Multi-Agent Coordination and Handoff System
 * ===========================================
 *
 * Comprehensive system for enabling agent teams, seamless handoffs, and collaboration
 * for complex multi-step workflows and processes. Manages agent specialization,
 * workload distribution, and context preservation during transitions.
 *
 * Key Features:
 * - Agent team creation and management
 * - Seamless handoff between specialized agents
 * - Human-in-the-loop capabilities
 * - Agent collaboration on multi-step processes
 * - Context preservation and transfer
 * - Load balancing and availability management
 * - Escalation routing and specialty matching
 * - Workflow orchestration across agents
 */

import { EventEmitter } from 'events'
import { createLogger } from '@/lib/logs/console/logger'
import type { AuthContext, Event } from '../types'
import type { AgentSessionContext } from './agent-session-manager'
import { agentSessionManager } from './agent-session-manager'

const logger = createLogger('MultiAgentCoordinator')

/**
 * Agent specialization types
 */
export type AgentSpecialization =
  | 'general'
  | 'technical_support'
  | 'sales'
  | 'customer_service'
  | 'content_creation'
  | 'data_analysis'
  | 'code_assistance'
  | 'project_management'
  | 'quality_assurance'
  | 'escalation_specialist'

/**
 * Agent availability status
 */
export type AgentAvailabilityStatus =
  | 'available'
  | 'busy'
  | 'unavailable'
  | 'maintenance'
  | 'overloaded'

/**
 * Agent team configuration
 */
export interface AgentTeam {
  id: string
  Name: string
  description: string
  workspaceId: string
  members: AgentTeamMember[]
  workflow: TeamWorkflow
  createdAt: Date
  lastModified: Date
  isActive: boolean
  metadata: Record<string, any>
}

/**
 * Agent team member with role and capabilities
 */
export interface AgentTeamMember {
  agentId: string
  role: 'primary' | 'secondary' | 'specialist' | 'escalation'
  specialization: AgentSpecialization
  priority: number
  availabilityStatus: AgentAvailabilityStatus
  currentWorkload: number
  maxWorkload: number
  capabilities: string[]
  handoffTriggers: HandoffTrigger[]
  metadata: Record<string, any>
}

/**
 * Team workflow definition
 */
export interface TeamWorkflow {
  id: string
  Name: string
  steps: WorkflowStep[]
  handoffRules: HandoffRule[]
  escalationPath: EscalationStep[]
  parallelProcessing: boolean
  requiresHumanApproval: boolean
}

/**
 * Workflow step in team processes
 */
export interface WorkflowStep {
  id: string
  Name: string
  description: string
  assignedSpecialization: AgentSpecialization[]
  prerequisites: string[]
  successCriteria: string[]
  failureHandling: 'retry' | 'escalate' | 'handoff' | 'human_intervention'
  estimatedDurationMs: number
  maxRetries: number
}

/**
 * Handoff trigger conditions
 */
export interface HandoffTrigger {
  id: string
  Name: string
  condition:
    | 'keyword_detected'
    | 'complexity_threshold'
    | 'user_request'
    | 'error_rate'
    | 'timeout'
    | 'workload'
  parameters: Record<string, any>
  targetSpecialization: AgentSpecialization
  priority: number
  active: boolean
}

/**
 * Handoff rule definition
 */
export interface HandoffRule {
  id: string
  fromSpecialization: AgentSpecialization
  toSpecialization: AgentSpecialization
  triggers: string[] // Trigger IDs
  contextPreservation: ContextPreservationStrategy
  handoffType: 'immediate' | 'scheduled' | 'collaborative'
  approvalRequired: boolean
}

/**
 * Context preservation strategy
 */
export interface ContextPreservationStrategy {
  preserveFullHistory: boolean
  summaryLength: 'brief' | 'detailed' | 'comprehensive'
  includeMetadata: boolean
  includeUserPreferences: boolean
  customFields: string[]
}

/**
 * Escalation step definition
 */
export interface EscalationStep {
  level: number
  targetSpecialization: AgentSpecialization
  condition: string
  autoEscalate: boolean
  requiresApproval: boolean
  notificationChannels: string[]
}

/**
 * Handoff context transfer
 */
export interface HandoffContext {
  fromSessionId: string
  toSessionId: string
  fromAgentId: string
  toAgentId: string
  reason: string
  conversationSummary: string
  preservedContext: Record<string, any>
  userPreferences: Record<string, any>
  metadata: Record<string, any>
  handoffAt: Date
  completedAt?: Date
  success: boolean
}

/**
 * Agent coordination metrics
 */
export interface CoordinationMetrics {
  totalHandoffs: number
  successfulHandoffs: number
  averageHandoffTime: number
  handoffsBySpecialization: Record<AgentSpecialization, number>
  teamEfficiency: number
  userSatisfactionScore: number
  escalationRate: number
}

/**
 * Main Multi-Agent Coordinator class
 */
export class MultiAgentCoordinator extends EventEmitter {
  private teams = new Map<string, AgentTeam>()
  private activeCoordinations = new Map<string, CoordinationSession>()
  private handoffHistory = new Map<string, HandoffContext[]>()
  private agentAvailability = new Map<string, AgentAvailabilityStatus>()
  private workloadTracking = new Map<string, number>()
  private coordinationMetrics = new Map<string, CoordinationMetrics>()

  constructor() {
    super()
    this.initializeCoordinator()
    logger.info('Multi-Agent Coordinator initialized')
  }

  /**
   * Create a new agent team
   */
  public async createTeam(
    teamConfig: Omit<AgentTeam, 'id' | 'createdAt' | 'lastModified'>,
    auth: AuthContext
  ): Promise<AgentTeam> {
    logger.info(`Creating agent team`, {
      Name: teamConfig.Name,
      workspaceId: teamConfig.workspaceId,
      memberCount: teamConfig.members.length,
    })

    const team: AgentTeam = {
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      lastModified: new Date(),
      ...teamConfig,
    }

    // Validate team members
    await this.validateTeamMembers(team.members, auth)

    // Initialize team metrics
    this.coordinationMetrics.set(team.id, {
      totalHandoffs: 0,
      successfulHandoffs: 0,
      averageHandoffTime: 0,
      handoffsBySpecialization: {} as Record<AgentSpecialization, number>,
      teamEfficiency: 1.0,
      userSatisfactionScore: 0,
      escalationRate: 0,
    })

    // Store team
    this.teams.set(team.id, team)

    // Initialize agent availability tracking
    for (const member of team.members) {
      this.agentAvailability.set(member.agentId, member.availabilityStatus)
      this.workloadTracking.set(member.agentId, member.currentWorkload)
    }

    logger.info(`Agent team created successfully`, {
      teamId: team.id,
      Name: team.Name,
      memberCount: team.members.length,
    })

    return team
  }

  /**
   * Assign a conversation to the best available agent in a team
   */
  public async assignToTeam(
    teamId: string,
    sessionId: string,
    context: {
      userMessage: string
      urgency: 'low' | 'medium' | 'high'
      preferredSpecialization?: AgentSpecialization
      metadata?: Record<string, any>
    },
    auth: AuthContext
  ): Promise<{
    assignedAgentId: string
    specialization: AgentSpecialization
    estimatedResponseTime: number
  }> {
    logger.info(`Assigning session to team`, { teamId, sessionId, urgency: context.urgency })

    const team = this.teams.get(teamId)
    if (!team || !team.isActive) {
      throw new Error(`Team ${teamId} not found or inactive`)
    }

    try {
      // Analyze user message for specialization requirements
      const requiredSpecialization = await this.analyzeRequiredSpecialization(
        context.userMessage,
        context.preferredSpecialization
      )

      // Find best available agent
      const bestAgent = await this.findBestAvailableAgent(
        team,
        requiredSpecialization,
        context.urgency
      )

      if (!bestAgent) {
        throw new Error('No available agents in team')
      }

      // Create coordination session
      const coordination = await this.createCoordinationSession({
        teamId,
        sessionId,
        primaryAgentId: bestAgent.agentId,
        specialization: bestAgent.specialization,
        context,
        auth,
      })

      // Update workload
      this.updateAgentWorkload(bestAgent.agentId, 1)

      // Start coordination monitoring
      this.startCoordinationMonitoring(coordination.id)

      logger.info(`Session assigned to agent`, {
        teamId,
        sessionId,
        agentId: bestAgent.agentId,
        specialization: bestAgent.specialization,
      })

      return {
        assignedAgentId: bestAgent.agentId,
        specialization: bestAgent.specialization,
        estimatedResponseTime: this.estimateResponseTime(bestAgent),
      }
    } catch (error) {
      logger.error(`Failed to assign session to team`, {
        teamId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Initiate handoff between agents
   */
  public async initiateHandoff(
    sessionId: string,
    handoffRequest: {
      reason: string
      targetSpecialization?: AgentSpecialization
      targetAgentId?: string
      urgency: 'low' | 'medium' | 'high'
      preserveContext: boolean
      userApprovalRequired?: boolean
    },
    auth: AuthContext
  ): Promise<HandoffContext> {
    logger.info(`Initiating agent handoff`, { sessionId, reason: handoffRequest.reason })

    const coordination = this.findCoordinationBySession(sessionId)
    if (!coordination) {
      throw new Error(`No active coordination found for session ${sessionId}`)
    }

    const team = this.teams.get(coordination.teamId)
    if (!team) {
      throw new Error(`Team not found for coordination`)
    }

    try {
      // Find target agent
      const targetAgent = handoffRequest.targetAgentId
        ? team.members.find((m) => m.agentId === handoffRequest.targetAgentId)
        : await this.findBestAvailableAgent(
            team,
            handoffRequest.targetSpecialization,
            handoffRequest.urgency
          )

      if (!targetAgent) {
        throw new Error('No suitable target agent found for handoff')
      }

      // Create new session for target agent
      const targetSession = await agentSessionManager.createAgentSession(
        targetAgent.agentId,
        auth,
        {
          customMetadata: {
            handoff_from: coordination.primaryAgentId,
            handoff_reason: handoffRequest.reason,
            original_session: sessionId,
          },
        }
      )

      // Prepare handoff context
      const currentSession = agentSessionManager.getAgentSession(sessionId)
      const handoffContext: HandoffContext = {
        fromSessionId: sessionId,
        toSessionId: targetSession.sessionId,
        fromAgentId: coordination.primaryAgentId,
        toAgentId: targetAgent.agentId,
        reason: handoffRequest.reason,
        conversationSummary: await this.generateConversationSummary(currentSession),
        preservedContext: handoffRequest.preserveContext ? currentSession?.metadata || {} : {},
        userPreferences: currentSession?.metadata.userPreferences || {},
        metadata: {
          urgency: handoffRequest.urgency,
          team_id: team.id,
          handoff_type: 'manual',
        },
        handoffAt: new Date(),
        success: false,
      }

      // Execute handoff
      await this.executeHandoff(handoffContext, team)

      // Update coordination
      coordination.primaryAgentId = targetAgent.agentId
      coordination.handoffHistory.push(handoffContext)

      // Update workload tracking
      this.updateAgentWorkload(handoffContext.fromAgentId, -1)
      this.updateAgentWorkload(handoffContext.toAgentId, 1)

      // Update metrics
      this.updateHandoffMetrics(team.id, handoffContext)

      // Store handoff history
      const sessionHistory = this.handoffHistory.get(sessionId) || []
      sessionHistory.push(handoffContext)
      this.handoffHistory.set(sessionId, sessionHistory)

      logger.info(`Agent handoff completed successfully`, {
        sessionId,
        fromAgent: handoffContext.fromAgentId,
        toAgent: handoffContext.toAgentId,
        reason: handoffRequest.reason,
      })

      // Emit handoff event
      this.emit('handoff:completed', {
        sessionId,
        handoffContext,
        team,
      })

      return handoffContext
    } catch (error) {
      logger.error(`Failed to complete agent handoff`, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Auto-detect and trigger handoffs based on conversation analysis
   */
  public async analyzeForAutoHandoff(
    sessionId: string,
    recentMessages: Event[],
    currentPerformance: {
      responseTime: number
      userSatisfaction: number
      errorRate: number
    }
  ): Promise<{
    shouldHandoff: boolean
    recommendedSpecialization?: AgentSpecialization
    confidence: number
    reason: string
  }> {
    logger.debug(`Analyzing session for auto-handoff`, { sessionId })

    const coordination = this.findCoordinationBySession(sessionId)
    if (!coordination) {
      return { shouldHandoff: false, confidence: 0, reason: 'No coordination found' }
    }

    const team = this.teams.get(coordination.teamId)
    if (!team) {
      return { shouldHandoff: false, confidence: 0, reason: 'Team not found' }
    }

    const currentAgent = team.members.find((m) => m.agentId === coordination.primaryAgentId)
    if (!currentAgent) {
      return { shouldHandoff: false, confidence: 0, reason: 'Current agent not found' }
    }

    // Check handoff triggers
    for (const trigger of currentAgent.handoffTriggers) {
      if (!trigger.active) continue

      const triggerResult = await this.evaluateHandoffTrigger(trigger, {
        sessionId,
        recentMessages,
        currentPerformance,
        currentAgent,
      })

      if (triggerResult.shouldTrigger) {
        return {
          shouldHandoff: true,
          recommendedSpecialization: trigger.targetSpecialization,
          confidence: triggerResult.confidence,
          reason: `Auto-handoff triggered: ${trigger.Name}`,
        }
      }
    }

    return { shouldHandoff: false, confidence: 0, reason: 'No handoff triggers activated' }
  }

  /**
   * Escalate to human intervention
   */
  public async escalateToHuman(
    sessionId: string,
    escalationRequest: {
      reason: string
      urgency: 'low' | 'medium' | 'high' | 'critical'
      category: 'technical' | 'billing' | 'complaint' | 'other'
      humanRequired: boolean
    },
    auth: AuthContext
  ): Promise<{
    escalationId: string
    estimatedWaitTime: number
    status: 'queued' | 'assigned' | 'in_progress'
  }> {
    logger.info(`Escalating to human intervention`, { sessionId, reason: escalationRequest.reason })

    const coordination = this.findCoordinationBySession(sessionId)
    if (!coordination) {
      throw new Error(`No active coordination found for session ${sessionId}`)
    }

    // Create escalation record
    const escalationId = `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Update coordination status
    coordination.escalated = true
    coordination.escalationId = escalationId
    coordination.escalatedAt = new Date()

    // Emit escalation event
    this.emit('escalation:created', {
      escalationId,
      sessionId,
      coordination,
      request: escalationRequest,
    })

    logger.info(`Escalation created`, { escalationId, sessionId })

    return {
      escalationId,
      estimatedWaitTime: this.calculateHumanWaitTime(escalationRequest.urgency),
      status: 'queued',
    }
  }

  /**
   * Get team performance metrics
   */
  public getTeamMetrics(teamId: string): CoordinationMetrics | undefined {
    return this.coordinationMetrics.get(teamId)
  }

  /**
   * Get all active coordinations for a team
   */
  public getActiveCoordinations(teamId: string): CoordinationSession[] {
    return Array.from(this.activeCoordinations.values()).filter(
      (coord) => coord.teamId === teamId && coord.status === 'active'
    )
  }

  // Private helper methods

  private async validateTeamMembers(members: AgentTeamMember[], auth: AuthContext): Promise<void> {
    for (const member of members) {
      // Validate agent exists and is accessible
      // This would typically involve checking agent service
      logger.debug(`Validating team member`, { agentId: member.agentId })
    }
  }

  private async analyzeRequiredSpecialization(
    message: string,
    preferred?: AgentSpecialization
  ): Promise<AgentSpecialization> {
    if (preferred) return preferred

    // Simple keyword-based analysis (would use ML in production)
    const keywords = message.toLowerCase()

    if (keywords.includes('technical') || keywords.includes('error') || keywords.includes('bug')) {
      return 'technical_support'
    }
    if (
      keywords.includes('billing') ||
      keywords.includes('payment') ||
      keywords.includes('invoice')
    ) {
      return 'customer_service'
    }
    if (keywords.includes('code') || keywords.includes('programming') || keywords.includes('api')) {
      return 'code_assistance'
    }

    return 'general'
  }

  private async findBestAvailableAgent(
    team: AgentTeam,
    specialization?: AgentSpecialization,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<AgentTeamMember | undefined> {
    // Filter by specialization and availability
    let candidates = team.members.filter((member) => {
      const isAvailable = this.agentAvailability.get(member.agentId) === 'available'
      const hasCapacity = (this.workloadTracking.get(member.agentId) || 0) < member.maxWorkload
      const matchesSpecialization = !specialization || member.specialization === specialization

      return isAvailable && hasCapacity && matchesSpecialization
    })

    if (candidates.length === 0 && specialization) {
      // Fallback to general agents if no specialists available
      candidates = team.members.filter((member) => {
        const isAvailable = this.agentAvailability.get(member.agentId) === 'available'
        const hasCapacity = (this.workloadTracking.get(member.agentId) || 0) < member.maxWorkload
        return isAvailable && hasCapacity && member.specialization === 'general'
      })
    }

    if (candidates.length === 0) return undefined

    // Sort by priority and workload
    candidates.sort((a, b) => {
      const aWorkload = this.workloadTracking.get(a.agentId) || 0
      const bWorkload = this.workloadTracking.get(b.agentId) || 0

      // Higher priority first, then lower workload
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return aWorkload - bWorkload
    })

    return candidates[0]
  }

  private async createCoordinationSession(config: {
    teamId: string
    sessionId: string
    primaryAgentId: string
    specialization: AgentSpecialization
    context: any
    auth: AuthContext
  }): Promise<CoordinationSession> {
    const coordination: CoordinationSession = {
      id: `coord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      teamId: config.teamId,
      sessionId: config.sessionId,
      primaryAgentId: config.primaryAgentId,
      specialization: config.specialization,
      status: 'active',
      createdAt: new Date(),
      handoffHistory: [],
      escalated: false,
      metadata: config.context.metadata || {},
    }

    this.activeCoordinations.set(coordination.id, coordination)
    return coordination
  }

  private findCoordinationBySession(sessionId: string): CoordinationSession | undefined {
    return Array.from(this.activeCoordinations.values()).find(
      (coord) => coord.sessionId === sessionId
    )
  }

  private async generateConversationSummary(
    session: AgentSessionContext | undefined
  ): Promise<string> {
    if (!session || session.conversationHistory.length === 0) {
      return 'No conversation history available.'
    }

    const recentMessages = session.conversationHistory.slice(-10)
    const summary = recentMessages
      .map(
        (event) =>
          `${event.source}: ${typeof event.content === 'string' ? event.content : JSON.stringify(event.content)}`
      )
      .join('\n')

    return `Recent conversation:\n${summary}`
  }

  private async executeHandoff(handoffContext: HandoffContext, team: AgentTeam): Promise<void> {
    try {
      // Pause source session
      // await agentSessionManager.pauseAgentSession(handoffContext.fromSessionId, auth)

      // Transfer context to new session
      // This would involve updating the new agent's context with preserved information

      // Mark handoff as successful
      handoffContext.completedAt = new Date()
      handoffContext.success = true

      logger.info(`Handoff executed successfully`, {
        fromAgent: handoffContext.fromAgentId,
        toAgent: handoffContext.toAgentId,
      })
    } catch (error) {
      handoffContext.success = false
      logger.error(`Failed to execute handoff`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  private async evaluateHandoffTrigger(
    trigger: HandoffTrigger,
    context: {
      sessionId: string
      recentMessages: Event[]
      currentPerformance: any
      currentAgent: AgentTeamMember
    }
  ): Promise<{ shouldTrigger: boolean; confidence: number }> {
    switch (trigger.condition) {
      case 'keyword_detected': {
        const keywords = trigger.parameters.keywords as string[]
        const hasKeywords = context.recentMessages.some((msg) =>
          keywords.some(
            (keyword) =>
              typeof msg.content === 'string' &&
              msg.content.toLowerCase().includes(keyword.toLowerCase())
          )
        )
        return { shouldTrigger: hasKeywords, confidence: hasKeywords ? 0.8 : 0 }
      }

      case 'complexity_threshold': {
        const complexityScore = this.calculateComplexityScore(context.recentMessages)
        const threshold = trigger.parameters.threshold as number
        return {
          shouldTrigger: complexityScore > threshold,
          confidence: Math.min(complexityScore / threshold, 1),
        }
      }

      case 'error_rate': {
        const errorRate = context.currentPerformance.errorRate
        const maxErrorRate = trigger.parameters.maxErrorRate as number
        return {
          shouldTrigger: errorRate > maxErrorRate,
          confidence: Math.min(errorRate / maxErrorRate, 1),
        }
      }

      case 'workload': {
        const currentWorkload = this.workloadTracking.get(context.currentAgent.agentId) || 0
        const maxWorkload = context.currentAgent.maxWorkload
        return {
          shouldTrigger: currentWorkload >= maxWorkload,
          confidence: currentWorkload / maxWorkload,
        }
      }

      default:
        return { shouldTrigger: false, confidence: 0 }
    }
  }

  private calculateComplexityScore(messages: Event[]): number {
    // Simple complexity calculation based on message length and technical terms
    let score = 0
    const technicalTerms = ['api', 'database', 'server', 'error', 'configuration', 'integration']

    for (const message of messages) {
      if (typeof message.content === 'string') {
        score += message.content.length / 100 // Length factor
        score +=
          technicalTerms.reduce(
            (count, term) =>
              count + (message.content as string).toLowerCase().split(term).length - 1,
            0
          ) * 0.5 // Technical term factor
      }
    }

    return score
  }

  private updateAgentWorkload(agentId: string, change: number): void {
    const currentWorkload = this.workloadTracking.get(agentId) || 0
    const newWorkload = Math.max(0, currentWorkload + change)
    this.workloadTracking.set(agentId, newWorkload)

    // Update availability based on workload
    const agent = Array.from(this.teams.values())
      .flatMap((team) => team.members)
      .find((member) => member.agentId === agentId)

    if (agent) {
      if (newWorkload >= agent.maxWorkload) {
        this.agentAvailability.set(agentId, 'overloaded')
      } else if (newWorkload === 0) {
        this.agentAvailability.set(agentId, 'available')
      } else {
        this.agentAvailability.set(agentId, 'busy')
      }
    }
  }

  private updateHandoffMetrics(teamId: string, handoffContext: HandoffContext): void {
    const metrics = this.coordinationMetrics.get(teamId)
    if (!metrics) return

    metrics.totalHandoffs++
    if (handoffContext.success) {
      metrics.successfulHandoffs++
    }

    if (handoffContext.completedAt) {
      const handoffTime = handoffContext.completedAt.getTime() - handoffContext.handoffAt.getTime()
      metrics.averageHandoffTime =
        (metrics.averageHandoffTime * (metrics.totalHandoffs - 1) + handoffTime) /
        metrics.totalHandoffs
    }

    this.coordinationMetrics.set(teamId, metrics)
  }

  private estimateResponseTime(agent: AgentTeamMember): number {
    const baseTime = 30000 // 30 seconds base
    const workloadFactor = (this.workloadTracking.get(agent.agentId) || 0) / agent.maxWorkload
    return baseTime * (1 + workloadFactor)
  }

  private calculateHumanWaitTime(urgency: string): number {
    const baseTimes = {
      low: 3600000, // 1 hour
      medium: 1800000, // 30 minutes
      high: 900000, // 15 minutes
      critical: 300000, // 5 minutes
    }
    return baseTimes[urgency as keyof typeof baseTimes] || baseTimes.medium
  }

  private startCoordinationMonitoring(coordinationId: string): void {
    // This would start monitoring the coordination session
    logger.debug(`Started monitoring coordination`, { coordinationId })
  }

  private initializeCoordinator(): void {
    // Initialize coordinator with default settings
    logger.debug('Multi-Agent Coordinator initialized with default settings')
  }
}

/**
 * Internal coordination session tracking
 */
interface CoordinationSession {
  id: string
  teamId: string
  sessionId: string
  primaryAgentId: string
  specialization: AgentSpecialization
  status: 'active' | 'paused' | 'completed' | 'escalated'
  createdAt: Date
  handoffHistory: HandoffContext[]
  escalated: boolean
  escalationId?: string
  escalatedAt?: Date
  metadata: Record<string, any>
}

// Export singleton instance
export const multiAgentCoordinator = new MultiAgentCoordinator()
