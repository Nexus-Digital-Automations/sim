/**
 * Agent Lifecycle Management System - Main Orchestrator
 * ====================================================
 *
 * Main entry point and orchestrator for the comprehensive agent lifecycle
 * management system. Integrates all components and provides unified APIs
 * for agent session management, configuration, coordination, monitoring,
 * and resource management.
 *
 * This orchestrator handles:
 * - Component initialization and integration
 * - Unified API endpoints for lifecycle operations
 * - Cross-component event coordination
 * - System health monitoring and status
 * - Configuration management across components
 * - Error handling and fallback mechanisms
 */

import { createLogger } from '@/lib/logs/console/logger'
import { EventEmitter } from 'events'
import type {
  Agent,
  Session,
  AuthContext,
  Event,
  EventType
} from '../types'

// Import all lifecycle components
import { agentSessionManager, type AgentSessionContext, type AgentSessionOptions } from './agent-session-manager'
import { agentConfigurationFramework, type AgentPersonality, type AgentConfigurationTemplate } from './agent-configuration-framework'
import { multiAgentCoordinator, type AgentTeam, type HandoffContext } from './multi-agent-coordinator'
import { agentPerformanceMonitor, type AgentPerformanceSummary, type ConversationQualityMetrics } from './agent-performance-monitor'
import { agentResourceManager, type ResourceMetrics, type OptimizationRecommendation } from './agent-resource-manager'

const logger = createLogger('AgentLifecycleOrchestrator')

/**
 * Lifecycle operation types
 */
export type LifecycleOperation =
  | 'create_session'
  | 'configure_agent'
  | 'coordinate_handoff'
  | 'monitor_performance'
  | 'optimize_resources'
  | 'end_session'

/**
 * Lifecycle status for overall system
 */
export interface LifecycleSystemStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'maintenance'
  components: {
    sessionManager: 'healthy' | 'error'
    configurationFramework: 'healthy' | 'error'
    multiAgentCoordinator: 'healthy' | 'error'
    performanceMonitor: 'healthy' | 'error'
    resourceManager: 'healthy' | 'error'
  }
  activeSessions: number
  activeTeams: number
  totalAgents: number
  systemUptime: number
  lastHealthCheck: Date
}

/**
 * Comprehensive agent lifecycle context
 */
export interface ComprehensiveAgentContext {
  // Session information
  session: AgentSessionContext

  // Configuration details
  configuration: {
    personality: AgentPersonality
    capabilities: string[]
    appliedRules: any[]
  }

  // Coordination details
  coordination?: {
    teamId?: string
    role?: string
    handoffHistory: HandoffContext[]
  }

  // Performance metrics
  performance: {
    summary: AgentPerformanceSummary
    qualityMetrics?: ConversationQualityMetrics
  }

  // Resource allocation
  resources: {
    allocated: any
    limits: any
    usage: ResourceMetrics
  }
}

/**
 * Lifecycle operation result
 */
export interface LifecycleOperationResult<T = any> {
  success: boolean
  data?: T
  error?: string
  warnings?: string[]
  metadata: {
    operation: LifecycleOperation
    agentId: string
    sessionId?: string
    timestamp: Date
    duration: number
  }
}

/**
 * Main Agent Lifecycle Orchestrator class
 */
export class AgentLifecycleOrchestrator extends EventEmitter {
  private initialized = false
  private systemStatus: LifecycleSystemStatus
  private operationQueue = new Map<string, any>() // operationId -> operation
  private healthCheckInterval?: NodeJS.Timeout
  private systemStartTime = Date.now()

  constructor() {
    super()
    this.systemStatus = this.initializeSystemStatus()
    logger.info('Agent Lifecycle Orchestrator created')
  }

  /**
   * Initialize the lifecycle management system
   */
  public async initialize(options: {
    enableRealTimeMonitoring?: boolean
    enableAutoScaling?: boolean
    enablePerformanceOptimization?: boolean
    socketServer?: any
  } = {}): Promise<void> {
    logger.info('Initializing Agent Lifecycle Management System')

    try {
      // Initialize Socket.io integration if provided
      if (options.socketServer) {
        agentSessionManager.initializeSocketServer(options.socketServer)
        logger.info('Socket.io integration initialized')
      }

      // Set up cross-component event coordination
      this.setupEventCoordination()

      // Start system health monitoring
      this.startHealthMonitoring()

      // Initialize performance optimization if enabled
      if (options.enablePerformanceOptimization) {
        this.initializePerformanceOptimization()
      }

      this.initialized = true
      this.updateSystemStatus()

      logger.info('Agent Lifecycle Management System initialized successfully')

    } catch (error) {
      logger.error('Failed to initialize lifecycle system', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Create a comprehensive agent session with full lifecycle management
   */
  public async createAgentSession(
    agentId: string,
    auth: AuthContext,
    options: {
      sessionOptions?: AgentSessionOptions
      configurationTemplate?: string
      teamId?: string
      userPreferences?: Record<string, any>
      priority?: 'low' | 'medium' | 'high'
    } = {}
  ): Promise<LifecycleOperationResult<ComprehensiveAgentContext>> {
    const operationStart = Date.now()
    const operationId = `create_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    logger.info('Creating comprehensive agent session', {
      operationId,
      agentId,
      userId: auth.user_id,
      options
    })

    try {
      // 1. Create agent session
      const session = await agentSessionManager.createAgentSession(
        agentId,
        auth,
        options.sessionOptions
      )

      // 2. Generate dynamic configuration
      const configuration = await agentConfigurationFramework.generateConfiguration(
        agentId,
        session.sessionId,
        {
          auth,
          userPreferences: options.userPreferences,
          templateId: options.configurationTemplate
        }
      )

      // 3. Assign to team if specified
      let coordination: any
      if (options.teamId) {
        coordination = await multiAgentCoordinator.assignToTeam(
          options.teamId,
          session.sessionId,
          {
            userMessage: 'Session initialization',
            urgency: options.priority || 'medium',
            metadata: { initialization: true }
          },
          auth
        )
      }

      // 4. Allocate resources
      const resources = await agentResourceManager.allocateSessionResources(
        session.sessionId,
        agentId,
        {
          priority: options.priority,
          memoryMB: 512, // Default allocation
          cpuPercent: 30
        }
      )

      // 5. Start performance monitoring
      agentPerformanceMonitor.startSessionMonitoring(
        session.sessionId,
        agentId,
        {
          trackResponseTime: true,
          trackQuality: true,
          trackSatisfaction: true
        }
      )

      // 6. Create comprehensive context
      const comprehensiveContext: ComprehensiveAgentContext = {
        session,
        configuration: {
          personality: configuration.personality,
          capabilities: configuration.capabilities.map(c => c.id),
          appliedRules: configuration.appliedRules
        },
        coordination: coordination ? {
          teamId: options.teamId,
          role: 'primary',
          handoffHistory: []
        } : undefined,
        performance: {
          summary: agentPerformanceMonitor.generatePerformanceSummary(agentId, '1h')
        },
        resources: {
          allocated: resources.allocated,
          limits: resources.sessionLimits,
          usage: await agentResourceManager.monitorResourceUsage(agentId, session.sessionId)
        }
      }

      const duration = Date.now() - operationStart

      // Emit lifecycle event
      this.emit('session:created', {
        context: comprehensiveContext,
        operationId,
        duration
      })

      logger.info('Comprehensive agent session created successfully', {
        operationId,
        sessionId: session.sessionId,
        agentId,
        duration
      })

      return {
        success: true,
        data: comprehensiveContext,
        metadata: {
          operation: 'create_session',
          agentId,
          sessionId: session.sessionId,
          timestamp: new Date(),
          duration
        }
      }

    } catch (error) {
      const duration = Date.now() - operationStart
      logger.error('Failed to create comprehensive agent session', {
        operationId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          operation: 'create_session',
          agentId,
          timestamp: new Date(),
          duration
        }
      }
    }
  }

  /**
   * Handle agent handoff with full context preservation
   */
  public async handleAgentHandoff(
    sessionId: string,
    handoffRequest: {
      reason: string
      targetSpecialization?: any
      targetAgentId?: string
      urgency: 'low' | 'medium' | 'high'
      preserveFullContext?: boolean
      userApprovalRequired?: boolean
    },
    auth: AuthContext
  ): Promise<LifecycleOperationResult<HandoffContext>> {
    const operationStart = Date.now()
    const operationId = `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    logger.info('Handling agent handoff', {
      operationId,
      sessionId,
      reason: handoffRequest.reason
    })

    try {
      // Perform handoff through coordination system
      const handoffContext = await multiAgentCoordinator.initiateHandoff(
        sessionId,
        {
          ...handoffRequest,
          preserveContext: handoffRequest.preserveFullContext ?? true
        },
        auth
      )

      // Update resource allocation for new agent
      await agentResourceManager.deallocateSessionResources(handoffContext.fromSessionId)
      await agentResourceManager.allocateSessionResources(
        handoffContext.toSessionId,
        handoffContext.toAgentId,
        { priority: handoffRequest.urgency }
      )

      // Transfer performance monitoring
      const qualityMetrics = await agentPerformanceMonitor.stopSessionMonitoring(handoffContext.fromSessionId)
      agentPerformanceMonitor.startSessionMonitoring(
        handoffContext.toSessionId,
        handoffContext.toAgentId,
        { trackResponseTime: true, trackQuality: true }
      )

      const duration = Date.now() - operationStart

      // Emit handoff completion event
      this.emit('handoff:completed', {
        handoffContext,
        operationId,
        duration
      })

      logger.info('Agent handoff completed successfully', {
        operationId,
        fromAgent: handoffContext.fromAgentId,
        toAgent: handoffContext.toAgentId,
        duration
      })

      return {
        success: true,
        data: handoffContext,
        metadata: {
          operation: 'coordinate_handoff',
          agentId: handoffContext.toAgentId,
          sessionId: handoffContext.toSessionId,
          timestamp: new Date(),
          duration
        }
      }

    } catch (error) {
      const duration = Date.now() - operationStart
      logger.error('Failed to handle agent handoff', {
        operationId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          operation: 'coordinate_handoff',
          agentId: 'unknown',
          sessionId,
          timestamp: new Date(),
          duration
        }
      }
    }
  }

  /**
   * Update agent configuration in real-time
   */
  public async updateAgentConfiguration(
    sessionId: string,
    updates: {
      personalityId?: string
      enableCapabilities?: string[]
      disableCapabilities?: string[]
      configUpdates?: Record<string, any>
    },
    auth: AuthContext
  ): Promise<LifecycleOperationResult<boolean>> {
    const operationStart = Date.now()

    try {
      const result = await agentConfigurationFramework.updateConfiguration(
        sessionId,
        updates,
        {
          auth,
          reason: 'Real-time configuration update'
        }
      )

      const duration = Date.now() - operationStart

      return {
        success: true,
        data: result,
        metadata: {
          operation: 'configure_agent',
          agentId: 'unknown', // Would be resolved from session
          sessionId,
          timestamp: new Date(),
          duration
        }
      }

    } catch (error) {
      const duration = Date.now() - operationStart
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          operation: 'configure_agent',
          agentId: 'unknown',
          sessionId,
          timestamp: new Date(),
          duration
        }
      }
    }
  }

  /**
   * End agent session with comprehensive cleanup
   */
  public async endAgentSession(
    sessionId: string,
    auth: AuthContext,
    reason: string = 'User ended session'
  ): Promise<LifecycleOperationResult<{
    finalMetrics: ConversationQualityMetrics | null
    resourceSummary: any
  }>> {
    const operationStart = Date.now()
    const operationId = `end_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    logger.info('Ending agent session', {
      operationId,
      sessionId,
      reason
    })

    try {
      // 1. Stop performance monitoring and get final metrics
      const finalMetrics = await agentPerformanceMonitor.stopSessionMonitoring(sessionId)

      // 2. End session through session manager
      await agentSessionManager.endAgentSession(sessionId, auth)

      // 3. Deallocate resources
      await agentResourceManager.deallocateSessionResources(sessionId)

      // 4. Get final resource summary
      const resourceSummary = agentResourceManager.getResourceSummary()

      const duration = Date.now() - operationStart

      // Emit session end event
      this.emit('session:ended', {
        sessionId,
        finalMetrics,
        resourceSummary,
        operationId,
        duration
      })

      logger.info('Agent session ended successfully', {
        operationId,
        sessionId,
        duration
      })

      return {
        success: true,
        data: {
          finalMetrics,
          resourceSummary
        },
        metadata: {
          operation: 'end_session',
          agentId: 'unknown', // Would be resolved from session
          sessionId,
          timestamp: new Date(),
          duration
        }
      }

    } catch (error) {
      const duration = Date.now() - operationStart
      logger.error('Failed to end agent session', {
        operationId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          operation: 'end_session',
          agentId: 'unknown',
          sessionId,
          timestamp: new Date(),
          duration
        }
      }
    }
  }

  /**
   * Get comprehensive system status
   */
  public getSystemStatus(): LifecycleSystemStatus {
    return { ...this.systemStatus }
  }

  /**
   * Get comprehensive agent context
   */
  public async getAgentContext(sessionId: string): Promise<ComprehensiveAgentContext | null> {
    try {
      const session = agentSessionManager.getAgentSession(sessionId)
      if (!session) return null

      const configuration = agentConfigurationFramework.getActiveConfiguration(sessionId)
      const performance = agentPerformanceMonitor.generatePerformanceSummary(session.agentId)
      const resources = await agentResourceManager.monitorResourceUsage(session.agentId, sessionId)

      return {
        session,
        configuration: configuration || {
          personality: agentConfigurationFramework.getAvailablePersonalities()[0],
          capabilities: [],
          appliedRules: []
        },
        performance: {
          summary: performance
        },
        resources: {
          allocated: {},
          limits: {},
          usage: resources
        }
      }

    } catch (error) {
      logger.error('Failed to get agent context', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Get system analytics and insights
   */
  public getSystemAnalytics(): {
    sessions: {
      total: number
      active: number
      averageDuration: number
    }
    performance: {
      averageResponseTime: number
      averageSatisfactionScore: number
      totalHandoffs: number
    }
    resources: {
      utilizationPercent: number
      optimizationOpportunities: number
      costOptimization: number
    }
    health: {
      systemStatus: string
      uptime: number
      lastIssues: string[]
    }
  } {
    const resourceSummary = agentResourceManager.getResourceSummary()

    return {
      sessions: {
        total: 0, // Would calculate from actual data
        active: resourceSummary.totalActiveSessions,
        averageDuration: 0
      },
      performance: {
        averageResponseTime: 0,
        averageSatisfactionScore: 0,
        totalHandoffs: 0
      },
      resources: {
        utilizationPercent: resourceSummary.resourceUtilization.memoryPercent,
        optimizationOpportunities: 0,
        costOptimization: 0
      },
      health: {
        systemStatus: this.systemStatus.status,
        uptime: Date.now() - this.systemStartTime,
        lastIssues: []
      }
    }
  }

  // Private helper methods

  private initializeSystemStatus(): LifecycleSystemStatus {
    return {
      status: 'healthy',
      components: {
        sessionManager: 'healthy',
        configurationFramework: 'healthy',
        multiAgentCoordinator: 'healthy',
        performanceMonitor: 'healthy',
        resourceManager: 'healthy'
      },
      activeSessions: 0,
      activeTeams: 0,
      totalAgents: 0,
      systemUptime: 0,
      lastHealthCheck: new Date()
    }
  }

  private setupEventCoordination(): void {
    // Set up cross-component event coordination

    // Session manager events
    agentSessionManager.on('session:created', (session) => {
      this.emit('lifecycle:session_created', session)
    })

    agentSessionManager.on('session:ended', (session) => {
      this.emit('lifecycle:session_ended', session)
    })

    // Configuration framework events
    agentConfigurationFramework.on('configuration:updated', (data) => {
      this.emit('lifecycle:configuration_updated', data)
    })

    // Coordinator events
    multiAgentCoordinator.on('handoff:completed', (data) => {
      this.emit('lifecycle:handoff_completed', data)
    })

    // Performance monitor events
    agentPerformanceMonitor.on('performance:alert', (alert) => {
      this.emit('lifecycle:performance_alert', alert)
    })

    // Resource manager events
    agentResourceManager.on('resource:warning', (warning) => {
      this.emit('lifecycle:resource_warning', warning)
    })

    logger.debug('Cross-component event coordination established')
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, 30000) // Every 30 seconds

    logger.debug('System health monitoring started')
  }

  private performHealthCheck(): void {
    try {
      // Check component health
      const components = {
        sessionManager: 'healthy' as const,
        configurationFramework: 'healthy' as const,
        multiAgentCoordinator: 'healthy' as const,
        performanceMonitor: 'healthy' as const,
        resourceManager: 'healthy' as const
      }

      // Update system status
      this.systemStatus = {
        ...this.systemStatus,
        components,
        systemUptime: Date.now() - this.systemStartTime,
        lastHealthCheck: new Date()
      }

      // Determine overall status
      const hasErrors = Object.values(components).some(status => status === 'error')
      this.systemStatus.status = hasErrors ? 'degraded' : 'healthy'

    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      this.systemStatus.status = 'critical'
    }
  }

  private updateSystemStatus(): void {
    this.systemStatus.lastHealthCheck = new Date()
    this.systemStatus.systemUptime = Date.now() - this.systemStartTime
  }

  private initializePerformanceOptimization(): void {
    // Set up automated performance optimization
    this.on('lifecycle:performance_alert', (alert) => {
      logger.info('Performance alert received, triggering optimization', alert)
      // Would trigger automated optimization procedures
    })

    this.on('lifecycle:resource_warning', (warning) => {
      logger.info('Resource warning received, checking optimization opportunities', warning)
      // Would check for resource optimization opportunities
    })

    logger.debug('Performance optimization initialized')
  }
}

// Export singleton instance
export const agentLifecycleOrchestrator = new AgentLifecycleOrchestrator()

// Export all component types for external use
export type {
  AgentSessionContext,
  AgentSessionOptions,
  AgentPersonality,
  AgentConfigurationTemplate,
  AgentTeam,
  HandoffContext,
  AgentPerformanceSummary,
  ConversationQualityMetrics,
  ResourceMetrics,
  OptimizationRecommendation,
  ComprehensiveAgentContext,
  LifecycleOperationResult,
  LifecycleSystemStatus
}

// Export component instances for direct access if needed
export {
  agentSessionManager,
  agentConfigurationFramework,
  multiAgentCoordinator,
  agentPerformanceMonitor,
  agentResourceManager
}