/**
 * Orchestration Collaboration Hub
 * ===============================
 *
 * Real-time collaboration and communication service for multi-agent orchestration.
 * Handles real-time updates, agent communication, process monitoring, and human
 * intervention notifications through Socket.io integration.
 *
 * Key Features:
 * - Real-time process status updates
 * - Agent-to-agent communication channels
 * - Human intervention notifications
 * - Process monitoring and analytics
 * - Workspace-scoped collaboration rooms
 * - Event streaming and broadcasting
 * - Performance monitoring and alerts
 * - Collaborative decision making
 */

import { EventEmitter } from 'events'
import { createLogger } from '@/lib/logs/console/logger'
import { errorHandler } from './error-handler'
import type { HumanIntervention, OrchestrationProcess } from './multi-agent-orchestration-service'
import type { AuthContext } from './types'

const logger = createLogger('OrchestrationCollaborationHub')

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CollaborationEvent {
  id: string
  type: CollaborationEventType
  timestamp: Date
  workspaceId: string
  processId?: string
  teamId?: string
  agentId?: string
  userId?: string
  data: Record<string, any>
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export type CollaborationEventType =
  | 'process.started'
  | 'process.updated'
  | 'process.completed'
  | 'process.failed'
  | 'process.paused'
  | 'step.started'
  | 'step.completed'
  | 'step.failed'
  | 'handoff.initiated'
  | 'handoff.completed'
  | 'handoff.failed'
  | 'intervention.requested'
  | 'intervention.responded'
  | 'agent.message'
  | 'agent.status'
  | 'team.updated'
  | 'collaboration.request'
  | 'collaboration.response'
  | 'alert.performance'
  | 'alert.error'

export interface AgentCommunication {
  id: string
  fromAgentId: string
  toAgentId: string
  processId: string
  message: string
  type: 'question' | 'answer' | 'update' | 'request' | 'notification'
  timestamp: Date
  priority: 'low' | 'medium' | 'high'
  metadata: Record<string, any>
  response?: AgentCommunicationResponse
}

export interface AgentCommunicationResponse {
  id: string
  respondingAgentId: string
  response: string
  timestamp: Date
  metadata: Record<string, any>
}

export interface CollaborationRoom {
  id: string
  Name: string
  type: 'process' | 'team' | 'workspace'
  workspaceId: string
  processId?: string
  teamId?: string
  participants: CollaborationParticipant[]
  activeChannels: CollaborationChannel[]
  createdAt: Date
  lastActivity: Date
}

export interface CollaborationParticipant {
  id: string
  type: 'agent' | 'human'
  agentId?: string
  userId?: string
  role: 'observer' | 'participant' | 'coordinator' | 'supervisor'
  joinedAt: Date
  lastSeen: Date
  permissions: string[]
}

export interface CollaborationChannel {
  id: string
  Name: string
  type: 'general' | 'alerts' | 'handoffs' | 'interventions' | 'monitoring'
  description: string
  participants: string[] // participant IDs
  messageCount: number
  lastMessage?: Date
}

export interface RealTimeUpdate {
  event: CollaborationEvent
  targetRooms: string[]
  targetUsers: string[]
  broadcastToWorkspace: boolean
}

export interface ProcessMonitoringMetrics {
  processId: string
  teamId: string
  workspaceId: string
  performance: {
    totalDuration: number
    averageStepDuration: number
    successRate: number
    errorRate: number
    handoffEfficiency: number
    humanInterventionRate: number
  }
  agentUtilization: Record<
    string,
    {
      taskCount: number
      successCount: number
      averageCompletionTime: number
      errorCount: number
    }
  >
  alerts: ProcessAlert[]
  recommendations: string[]
  timestamp: Date
}

export interface ProcessAlert {
  id: string
  type: 'performance' | 'error' | 'timeout' | 'resource' | 'quality'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: Record<string, any>
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
}

// ============================================================================
// Orchestration Collaboration Hub Service
// ============================================================================

export class OrchestrationCollaborationHub extends EventEmitter {
  private collaborationRooms: Map<string, CollaborationRoom> = new Map()
  private agentCommunications: Map<string, AgentCommunication> = new Map()
  private processMetrics: Map<string, ProcessMonitoringMetrics> = new Map()
  private activeAlerts: Map<string, ProcessAlert> = new Map()
  private eventHistory: CollaborationEvent[] = []

  constructor() {
    super()
    this.setupEventHandlers()
    this.startMonitoringServices()
  }

  private setupEventHandlers() {
    this.on('process.event', this.handleProcessEvent.bind(this))
    this.on('agent.communication', this.handleAgentCommunication.bind(this))
    this.on('human.intervention', this.handleHumanIntervention.bind(this))
    this.on('performance.alert', this.handlePerformanceAlert.bind(this))
  }

  // ========================================================================
  // Collaboration Room Management
  // ========================================================================

  /**
   * Create collaboration room for process or team
   */
  async createCollaborationRoom(
    roomData: {
      Name: string
      type: CollaborationRoom['type']
      workspaceId: string
      processId?: string
      teamId?: string
      participants: Array<{
        type: 'agent' | 'human'
        agentId?: string
        userId?: string
        role: CollaborationParticipant['role']
      }>
    },
    auth: AuthContext
  ): Promise<CollaborationRoom> {
    try {
      logger.info('Creating collaboration room', {
        Name: roomData.Name,
        type: roomData.type,
        workspaceId: roomData.workspaceId,
        participantCount: roomData.participants.length,
      })

      const participants: CollaborationParticipant[] = roomData.participants.map((p, index) => ({
        id: `participant_${index}_${Date.now()}`,
        type: p.type,
        agentId: p.agentId,
        userId: p.userId,
        role: p.role,
        joinedAt: new Date(),
        lastSeen: new Date(),
        permissions: this.getDefaultPermissions(p.role),
      }))

      // Create default channels
      const defaultChannels: CollaborationChannel[] = [
        {
          id: `general_${Date.now()}`,
          Name: 'General',
          type: 'general',
          description: 'General discussion and coordination',
          participants: participants.map((p) => p.id),
          messageCount: 0,
        },
        {
          id: `alerts_${Date.now()}`,
          Name: 'Alerts',
          type: 'alerts',
          description: 'System alerts and notifications',
          participants: participants.filter((p) => p.role !== 'observer').map((p) => p.id),
          messageCount: 0,
        },
        {
          id: `handoffs_${Date.now()}`,
          Name: 'Handoffs',
          type: 'handoffs',
          description: 'Agent handoff coordination',
          participants: participants.filter((p) => p.type === 'agent').map((p) => p.id),
          messageCount: 0,
        },
      ]

      if (roomData.type === 'process') {
        defaultChannels.push({
          id: `interventions_${Date.now()}`,
          Name: 'Human Interventions',
          type: 'interventions',
          description: 'Human intervention requests and responses',
          participants: participants.filter((p) => p.type === 'human').map((p) => p.id),
          messageCount: 0,
        })
      }

      const room: CollaborationRoom = {
        id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        Name: roomData.Name,
        type: roomData.type,
        workspaceId: roomData.workspaceId,
        processId: roomData.processId,
        teamId: roomData.teamId,
        participants,
        activeChannels: defaultChannels,
        createdAt: new Date(),
        lastActivity: new Date(),
      }

      this.collaborationRooms.set(room.id, room)

      logger.info('Collaboration room created successfully', {
        roomId: room.id,
        Name: room.Name,
        channelCount: room.activeChannels.length,
      })

      return room
    } catch (error) {
      logger.error('Failed to create collaboration room', { error, roomData })
      throw errorHandler.handleError(error, 'create_collaboration_room')
    }
  }

  /**
   * Join collaboration room
   */
  async joinCollaborationRoom(
    roomId: string,
    participant: {
      type: 'agent' | 'human'
      agentId?: string
      userId?: string
      role: CollaborationParticipant['role']
    },
    auth: AuthContext
  ): Promise<CollaborationRoom> {
    try {
      const room = this.collaborationRooms.get(roomId)
      if (!room) {
        throw new Error(`Collaboration room not found: ${roomId}`)
      }

      // Verify workspace access
      if (room.workspaceId !== auth.workspace_id) {
        throw new Error('Access denied: Room not in your workspace')
      }

      // Add participant if not already present
      const existingParticipant = room.participants.find(
        (p) =>
          (p.agentId === participant.agentId && participant.agentId) ||
          (p.userId === participant.userId && participant.userId)
      )

      if (!existingParticipant) {
        const newParticipant: CollaborationParticipant = {
          id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: participant.type,
          agentId: participant.agentId,
          userId: participant.userId,
          role: participant.role,
          joinedAt: new Date(),
          lastSeen: new Date(),
          permissions: this.getDefaultPermissions(participant.role),
        }

        room.participants.push(newParticipant)
        room.lastActivity = new Date()

        this.collaborationRooms.set(room.id, room)

        // Broadcast join event
        await this.broadcastEvent({
          event: this.createCollaborationEvent({
            type: 'collaboration.request',
            workspaceId: room.workspaceId,
            processId: room.processId,
            teamId: room.teamId,
            data: {
              action: 'participant_joined',
              participant: newParticipant,
              roomId: room.id,
            },
          }),
          targetRooms: [roomId],
          targetUsers: [],
          broadcastToWorkspace: false,
        })

        logger.info('Participant joined collaboration room', {
          roomId,
          participantType: participant.type,
          participantId: participant.agentId || participant.userId,
        })
      } else {
        // Update last seen
        existingParticipant.lastSeen = new Date()
        this.collaborationRooms.set(room.id, room)
      }

      return room
    } catch (error) {
      logger.error('Failed to join collaboration room', { error, roomId })
      throw errorHandler.handleError(error, 'join_collaboration_room')
    }
  }

  // ========================================================================
  // Real-time Communication
  // ========================================================================

  /**
   * Send agent-to-agent communication
   */
  async sendAgentCommunication(
    communicationData: {
      fromAgentId: string
      toAgentId: string
      processId: string
      message: string
      type: AgentCommunication['type']
      priority?: AgentCommunication['priority']
      metadata?: Record<string, any>
    },
    auth: AuthContext
  ): Promise<AgentCommunication> {
    try {
      logger.info('Sending agent communication', {
        fromAgentId: communicationData.fromAgentId,
        toAgentId: communicationData.toAgentId,
        type: communicationData.type,
        processId: communicationData.processId,
      })

      const communication: AgentCommunication = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromAgentId: communicationData.fromAgentId,
        toAgentId: communicationData.toAgentId,
        processId: communicationData.processId,
        message: communicationData.message,
        type: communicationData.type,
        timestamp: new Date(),
        priority: communicationData.priority || 'medium',
        metadata: communicationData.metadata || {},
      }

      this.agentCommunications.set(communication.id, communication)
      this.emit('agent.communication', communication)

      // Broadcast to relevant collaboration rooms
      const relevantRooms = Array.from(this.collaborationRooms.values()).filter(
        (room) =>
          room.processId === communicationData.processId && room.workspaceId === auth.workspace_id
      )

      for (const room of relevantRooms) {
        await this.broadcastEvent({
          event: this.createCollaborationEvent({
            type: 'agent.message',
            workspaceId: room.workspaceId,
            processId: communicationData.processId,
            agentId: communicationData.fromAgentId,
            data: {
              communication,
              roomId: room.id,
            },
          }),
          targetRooms: [room.id],
          targetUsers: [],
          broadcastToWorkspace: false,
        })
      }

      logger.info('Agent communication sent successfully', {
        communicationId: communication.id,
        processId: communication.processId,
      })

      return communication
    } catch (error) {
      logger.error('Failed to send agent communication', { error, communicationData })
      throw errorHandler.handleError(error, 'send_agent_communication')
    }
  }

  /**
   * Respond to agent communication
   */
  async respondToAgentCommunication(
    communicationId: string,
    response: {
      respondingAgentId: string
      response: string
      metadata?: Record<string, any>
    },
    auth: AuthContext
  ): Promise<AgentCommunication> {
    try {
      const communication = this.agentCommunications.get(communicationId)
      if (!communication) {
        throw new Error(`Agent communication not found: ${communicationId}`)
      }

      communication.response = {
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        respondingAgentId: response.respondingAgentId,
        response: response.response,
        timestamp: new Date(),
        metadata: response.metadata || {},
      }

      this.agentCommunications.set(communication.id, communication)

      // Broadcast response to relevant rooms
      const relevantRooms = Array.from(this.collaborationRooms.values()).filter(
        (room) =>
          room.processId === communication.processId && room.workspaceId === auth.workspace_id
      )

      for (const room of relevantRooms) {
        await this.broadcastEvent({
          event: this.createCollaborationEvent({
            type: 'collaboration.response',
            workspaceId: room.workspaceId,
            processId: communication.processId,
            agentId: response.respondingAgentId,
            data: {
              communicationId,
              response: communication.response,
              originalMessage: communication.message,
            },
          }),
          targetRooms: [room.id],
          targetUsers: [],
          broadcastToWorkspace: false,
        })
      }

      logger.info('Agent communication response sent', {
        communicationId,
        respondingAgentId: response.respondingAgentId,
      })

      return communication
    } catch (error) {
      logger.error('Failed to respond to agent communication', { error, communicationId })
      throw errorHandler.handleError(error, 'respond_to_agent_communication')
    }
  }

  // ========================================================================
  // Process Monitoring and Analytics
  // ========================================================================

  /**
   * Update process monitoring metrics
   */
  async updateProcessMetrics(
    processId: string,
    process: OrchestrationProcess,
    auth: AuthContext
  ): Promise<ProcessMonitoringMetrics> {
    try {
      const teamId = process.teamId
      const workspaceId = process.workspaceId

      // Calculate performance metrics
      const completedSteps = process.steps.filter((s) => s.status === 'completed')
      const failedSteps = process.steps.filter((s) => s.status === 'failed')
      const totalDuration = process.metrics.duration || 0
      const averageStepDuration =
        completedSteps.length > 0
          ? Object.values(process.metrics.stepCompletionTimes).reduce((a, b) => a + b, 0) /
            completedSteps.length
          : 0

      const successRate =
        process.totalSteps > 0 ? (completedSteps.length / process.totalSteps) * 100 : 0
      const errorRate = process.totalSteps > 0 ? (failedSteps.length / process.totalSteps) * 100 : 0

      // Calculate agent utilization
      const agentUtilization: Record<string, any> = {}
      for (const step of process.steps) {
        if (!agentUtilization[step.assignedAgentId]) {
          agentUtilization[step.assignedAgentId] = {
            taskCount: 0,
            successCount: 0,
            averageCompletionTime: 0,
            errorCount: 0,
          }
        }

        agentUtilization[step.assignedAgentId].taskCount++

        if (step.status === 'completed') {
          agentUtilization[step.assignedAgentId].successCount++
          const stepDuration = process.metrics.stepCompletionTimes[step.id] || 0
          agentUtilization[step.assignedAgentId].averageCompletionTime += stepDuration
        } else if (step.status === 'failed') {
          agentUtilization[step.assignedAgentId].errorCount++
        }
      }

      // Calculate average completion times
      for (const agentId in agentUtilization) {
        if (agentUtilization[agentId].successCount > 0) {
          agentUtilization[agentId].averageCompletionTime /= agentUtilization[agentId].successCount
        }
      }

      // Generate alerts
      const alerts: ProcessAlert[] = []

      // Performance alerts
      if (errorRate > 20) {
        alerts.push({
          id: `alert_${Date.now()}_error_rate`,
          type: 'performance',
          severity: 'high',
          message: `High error rate detected: ${errorRate.toFixed(1)}%`,
          details: { errorRate, failedSteps: failedSteps.length },
          timestamp: new Date(),
          resolved: false,
        })
      }

      if (process.metrics.humanInterventionCount > 5) {
        alerts.push({
          id: `alert_${Date.now()}_intervention`,
          type: 'quality',
          severity: 'medium',
          message: `High number of human interventions: ${process.metrics.humanInterventionCount}`,
          details: { interventionCount: process.metrics.humanInterventionCount },
          timestamp: new Date(),
          resolved: false,
        })
      }

      // Generate recommendations
      const recommendations: string[] = []

      if (averageStepDuration > 300000) {
        // 5 minutes
        recommendations.push(
          'Consider optimizing step execution time or breaking down complex steps'
        )
      }

      if (process.metrics.handoffCount > process.totalSteps * 0.5) {
        recommendations.push(
          'High number of handoffs detected - consider optimizing agent assignments'
        )
      }

      if (errorRate > 10) {
        recommendations.push('Implement better error handling and validation in process steps')
      }

      const metrics: ProcessMonitoringMetrics = {
        processId,
        teamId,
        workspaceId,
        performance: {
          totalDuration,
          averageStepDuration,
          successRate,
          errorRate,
          handoffEfficiency:
            process.metrics.handoffCount > 0
              ? (completedSteps.length / process.metrics.handoffCount) * 100
              : 100,
          humanInterventionRate:
            (process.metrics.humanInterventionCount / process.totalSteps) * 100,
        },
        agentUtilization,
        alerts,
        recommendations,
        timestamp: new Date(),
      }

      this.processMetrics.set(processId, metrics)

      // Store alerts
      for (const alert of alerts) {
        this.activeAlerts.set(alert.id, alert)
        this.emit('performance.alert', alert)
      }

      // Broadcast metrics update
      const relevantRooms = Array.from(this.collaborationRooms.values()).filter(
        (room) => room.processId === processId && room.workspaceId === workspaceId
      )

      for (const room of relevantRooms) {
        await this.broadcastEvent({
          event: this.createCollaborationEvent({
            type: 'process.updated',
            workspaceId,
            processId,
            teamId,
            data: {
              metrics,
              alerts,
              recommendations,
            },
          }),
          targetRooms: [room.id],
          targetUsers: [],
          broadcastToWorkspace: false,
        })
      }

      return metrics
    } catch (error) {
      logger.error('Failed to update process metrics', { error, processId })
      throw errorHandler.handleError(error, 'update_process_metrics')
    }
  }

  /**
   * Get process monitoring metrics
   */
  async getProcessMetrics(
    processId: string,
    auth: AuthContext
  ): Promise<ProcessMonitoringMetrics | null> {
    try {
      const metrics = this.processMetrics.get(processId)

      if (metrics && metrics.workspaceId !== auth.workspace_id) {
        throw new Error('Access denied: Process not in your workspace')
      }

      return metrics || null
    } catch (error) {
      logger.error('Failed to get process metrics', { error, processId })
      throw errorHandler.handleError(error, 'get_process_metrics')
    }
  }

  // ========================================================================
  // Event Broadcasting
  // ========================================================================

  /**
   * Broadcast real-time update to collaboration rooms
   */
  private async broadcastEvent(update: RealTimeUpdate): Promise<void> {
    try {
      // Add to event history
      this.eventHistory.push(update.event)

      // Keep only last 1000 events
      if (this.eventHistory.length > 1000) {
        this.eventHistory = this.eventHistory.slice(-1000)
      }

      // Update room activity timestamps
      for (const roomId of update.targetRooms) {
        const room = this.collaborationRooms.get(roomId)
        if (room) {
          room.lastActivity = new Date()
          this.collaborationRooms.set(roomId, room)
        }
      }

      logger.debug('Event broadcasted', {
        eventType: update.event.type,
        targetRooms: update.targetRooms.length,
        workspaceId: update.event.workspaceId,
      })
    } catch (error) {
      logger.error('Failed to broadcast event', { error, update })
    }
  }

  /**
   * Create collaboration event
   */
  private createCollaborationEvent(eventData: {
    type: CollaborationEventType
    workspaceId: string
    processId?: string
    teamId?: string
    agentId?: string
    userId?: string
    data: Record<string, any>
    priority?: CollaborationEvent['priority']
  }): CollaborationEvent {
    return {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventData.type,
      timestamp: new Date(),
      workspaceId: eventData.workspaceId,
      processId: eventData.processId,
      teamId: eventData.teamId,
      agentId: eventData.agentId,
      userId: eventData.userId,
      data: eventData.data,
      priority: eventData.priority || 'medium',
    }
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private getDefaultPermissions(role: CollaborationParticipant['role']): string[] {
    const permissions = {
      observer: ['read'],
      participant: ['read', 'message', 'respond'],
      coordinator: ['read', 'message', 'respond', 'invite', 'moderate'],
      supervisor: ['read', 'message', 'respond', 'invite', 'moderate', 'admin'],
    }

    return permissions[role] || permissions.observer
  }

  private startMonitoringServices(): void {
    // Start periodic cleanup and monitoring
    setInterval(() => {
      this.cleanupInactiveRooms()
      this.cleanupOldEvents()
      this.monitorSystemHealth()
    }, 300000) // 5 minutes
  }

  private cleanupInactiveRooms(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

    for (const [roomId, room] of this.collaborationRooms) {
      if (room.lastActivity < cutoffTime) {
        logger.info('Cleaning up inactive room', { roomId, lastActivity: room.lastActivity })
        this.collaborationRooms.delete(roomId)
      }
    }
  }

  private cleanupOldEvents(): void {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    this.eventHistory = this.eventHistory.filter((event) => event.timestamp > cutoffTime)
  }

  private monitorSystemHealth(): void {
    const activeRooms = this.collaborationRooms.size
    const activeProcesses = this.processMetrics.size
    const activeAlerts = Array.from(this.activeAlerts.values()).filter((a) => !a.resolved).length

    logger.debug('Collaboration hub health check', {
      activeRooms,
      activeProcesses,
      activeAlerts,
      eventHistorySize: this.eventHistory.length,
    })
  }

  // ========================================================================
  // Event Handlers
  // ========================================================================

  private async handleProcessEvent(event: CollaborationEvent): Promise<void> {
    logger.debug('Handling process event', { type: event.type, processId: event.processId })
  }

  private async handleAgentCommunication(communication: AgentCommunication): Promise<void> {
    logger.debug('Handling agent communication', {
      type: communication.type,
      fromAgentId: communication.fromAgentId,
    })
  }

  private async handleHumanIntervention(intervention: HumanIntervention): Promise<void> {
    logger.debug('Handling human intervention', {
      type: intervention.type,
      processId: intervention.processId,
    })
  }

  private async handlePerformanceAlert(alert: ProcessAlert): Promise<void> {
    logger.warn('Performance alert triggered', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
    })
  }
}

// ============================================================================
// Service Instance and Exports
// ============================================================================

export const orchestrationCollaborationHub = new OrchestrationCollaborationHub()

export default orchestrationCollaborationHub
