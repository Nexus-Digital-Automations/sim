/**
 * Agent Status Real-time Service
 * ===============================
 *
 * Real-time agent status updates via Socket.io integration:
 * - Agent lifecycle events (start, stop, pause, resume)
 * - Performance metrics updates
 * - Session count changes
 * - Availability status changes
 * - Health check results
 * - Workspace-scoped broadcasting
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { Agent } from '@/services/parlant/types'

const logger = createLogger('AgentStatusService')

export interface AgentStatusEvent {
  type:
    | 'status_changed'
    | 'metrics_updated'
    | 'session_count_changed'
    | 'health_check'
    | 'lifecycle_event'
  agent_id: string
  workspace_id: string
  timestamp: string
  data: AgentStatusEventData
}

export interface AgentStatusEventData {
  status?: 'online' | 'offline' | 'paused' | 'starting' | 'stopping' | 'error'
  availability?: 'online' | 'busy' | 'offline'
  active_sessions?: number
  performance_metrics?: {
    cpu_usage?: number
    memory_usage?: number
    response_time_avg: number
    response_time_p95: number
    total_requests: number
    error_rate: number
  }
  health_checks?: {
    connectivity: boolean
    ai_provider: boolean
    database: boolean
    last_health_check: string
  }
  lifecycle_action?: {
    action: 'start' | 'stop' | 'pause' | 'resume' | 'restart'
    reason?: string
    success: boolean
    error?: string
  }
}

/**
 * Real-time agent status service
 */
export class AgentStatusService {
  private static instance: AgentStatusService
  private eventHandlers: Map<string, Set<(event: AgentStatusEvent) => void>> = new Map()
  private agentStatuses: Map<string, AgentStatusEventData> = new Map()

  private constructor() {
    this.startPeriodicHealthChecks()
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AgentStatusService {
    if (!AgentStatusService.instance) {
      AgentStatusService.instance = new AgentStatusService()
    }
    return AgentStatusService.instance
  }

  /**
   * Subscribe to agent status events for a workspace
   */
  public subscribeToWorkspace(
    workspaceId: string,
    handler: (event: AgentStatusEvent) => void
  ): () => void {
    if (!this.eventHandlers.has(workspaceId)) {
      this.eventHandlers.set(workspaceId, new Set())
    }

    this.eventHandlers.get(workspaceId)!.add(handler)

    logger.info('Subscribed to agent status events', { workspace_id: workspaceId })

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(workspaceId)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.eventHandlers.delete(workspaceId)
        }
      }
      logger.info('Unsubscribed from agent status events', { workspace_id: workspaceId })
    }
  }

  /**
   * Emit agent status event to workspace subscribers
   */
  public emitAgentStatusEvent(event: AgentStatusEvent): void {
    // Update local cache
    this.agentStatuses.set(event.agent_id, {
      ...this.agentStatuses.get(event.agent_id),
      ...event.data,
    })

    // Broadcast to workspace subscribers
    const handlers = this.eventHandlers.get(event.workspace_id)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event)
        } catch (error) {
          logger.error('Error handling agent status event', {
            workspace_id: event.workspace_id,
            agent_id: event.agent_id,
            error: (error as Error).message,
          })
        }
      })
    }

    logger.debug('Agent status event emitted', {
      type: event.type,
      agent_id: event.agent_id,
      workspace_id: event.workspace_id,
      subscriber_count: handlers?.size || 0,
    })
  }

  /**
   * Get current status for an agent
   */
  public getAgentStatus(agentId: string): AgentStatusEventData | null {
    return this.agentStatuses.get(agentId) || null
  }

  /**
   * Update agent status
   */
  public updateAgentStatus(
    agentId: string,
    workspaceId: string,
    update: Partial<AgentStatusEventData>
  ): void {
    const event: AgentStatusEvent = {
      type: 'status_changed',
      agent_id: agentId,
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      data: update,
    }

    this.emitAgentStatusEvent(event)
  }

  /**
   * Handle agent lifecycle events
   */
  public handleLifecycleEvent(
    agentId: string,
    workspaceId: string,
    action: 'start' | 'stop' | 'pause' | 'resume' | 'restart',
    success: boolean,
    error?: string
  ): void {
    const statusMap = {
      start: 'online' as const,
      stop: 'offline' as const,
      pause: 'paused' as const,
      resume: 'online' as const,
      restart: 'online' as const,
    }

    const event: AgentStatusEvent = {
      type: 'lifecycle_event',
      agent_id: agentId,
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      data: {
        status: success ? statusMap[action] : 'error',
        lifecycle_action: {
          action,
          success,
          error,
        },
      },
    }

    this.emitAgentStatusEvent(event)
  }

  /**
   * Update performance metrics
   */
  public updatePerformanceMetrics(
    agentId: string,
    workspaceId: string,
    metrics: AgentStatusEventData['performance_metrics']
  ): void {
    const event: AgentStatusEvent = {
      type: 'metrics_updated',
      agent_id: agentId,
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      data: {
        performance_metrics: metrics,
      },
    }

    this.emitAgentStatusEvent(event)
  }

  /**
   * Update session count
   */
  public updateSessionCount(agentId: string, workspaceId: string, activeSessions: number): void {
    const event: AgentStatusEvent = {
      type: 'session_count_changed',
      agent_id: agentId,
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      data: {
        active_sessions: activeSessions,
      },
    }

    this.emitAgentStatusEvent(event)
  }

  /**
   * Update health check results
   */
  public updateHealthCheck(
    agentId: string,
    workspaceId: string,
    healthChecks: AgentStatusEventData['health_checks']
  ): void {
    const event: AgentStatusEvent = {
      type: 'health_check',
      agent_id: agentId,
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      data: {
        health_checks: healthChecks,
      },
    }

    this.emitAgentStatusEvent(event)
  }

  /**
   * Initialize agent status from database
   */
  public async initializeAgentStatus(agents: Agent[]): Promise<void> {
    logger.info('Initializing agent status cache', { agent_count: agents.length })

    for (const agent of agents) {
      // Initialize with basic status
      const initialStatus: AgentStatusEventData = {
        status: agent.status === 'active' ? 'online' : 'offline',
        availability: 'online',
        active_sessions: 0,
        performance_metrics: {
          response_time_avg: 800,
          response_time_p95: 1500,
          total_requests: 0,
          error_rate: 0,
        },
        health_checks: {
          connectivity: true,
          ai_provider: true,
          database: true,
          last_health_check: new Date().toISOString(),
        },
      }

      this.agentStatuses.set(agent.id, initialStatus)
    }

    logger.info('Agent status cache initialized')
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicHealthChecks(): void {
    setInterval(() => {
      this.performHealthChecks()
    }, 30000) // Every 30 seconds
  }

  /**
   * Perform health checks for all agents
   */
  private async performHealthChecks(): Promise<void> {
    const agentIds = Array.from(this.agentStatuses.keys())

    for (const agentId of agentIds) {
      try {
        // Mock health check - in real implementation, this would check actual agent health
        const healthChecks: AgentStatusEventData['health_checks'] = {
          connectivity: Math.random() > 0.05, // 95% uptime
          ai_provider: Math.random() > 0.02, // 98% uptime
          database: Math.random() > 0.01, // 99% uptime
          last_health_check: new Date().toISOString(),
        }

        // Update performance metrics with random variations (mock data)
        const currentStatus = this.agentStatuses.get(agentId)
        if (currentStatus?.performance_metrics) {
          const baseResponseTime = 800
          const metrics: AgentStatusEventData['performance_metrics'] = {
            ...currentStatus.performance_metrics,
            response_time_avg: baseResponseTime + (Math.random() - 0.5) * 200,
            response_time_p95: baseResponseTime * 1.5 + (Math.random() - 0.5) * 300,
            cpu_usage: Math.floor(Math.random() * 100),
            memory_usage: Math.floor(Math.random() * 100),
            error_rate: Math.random() * 5,
          }

          // Find workspace for this agent (simplified - in real implementation,
          // we'd have this information stored)
          const mockWorkspaceId = 'workspace_1' // TODO: Get from agent data

          this.updatePerformanceMetrics(agentId, mockWorkspaceId, metrics)
          this.updateHealthCheck(agentId, mockWorkspaceId, healthChecks)
        }
      } catch (error) {
        logger.error('Health check failed for agent', {
          agent_id: agentId,
          error: (error as Error).message,
        })
      }
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.eventHandlers.clear()
    this.agentStatuses.clear()
    logger.info('Agent status service cleaned up')
  }
}
