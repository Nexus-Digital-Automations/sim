/**
 * Sim Infrastructure Integration
 *
 * Integrates the Parlant Journey Execution system with existing Sim infrastructure
 * including Socket.io, database, authentication, workspace isolation, and tool adapters.
 */

import type {
  JourneyDefinition,
  WorkflowData,
  ExecutionResult,
  ConversationMessage,
  ProgressTracker
} from '../types/journey-execution-types'

import { JourneyExecutionEngine } from './journey-execution-engine'
import { AgentCommunicationService } from './agent-communication-service'
import { ConversationalExecutionInterface } from './conversational-execution-interface'
import { RealTimeProgressService } from './real-time-progress-service'

/**
 * Integration configuration
 */
interface SimIntegrationConfig {
  database: {
    enabled: boolean
    connectionString?: string
    tableName?: string
  }
  socketio: {
    enabled: boolean
    namespace?: string
    cors?: any
  }
  authentication: {
    provider: 'better-auth' | 'custom'
    jwtSecret?: string
    sessionTimeout?: number
  }
  workspace: {
    isolation: boolean
    defaultWorkspace?: string
  }
  tools: {
    adapterRegistryPath?: string
    enableUniversalAdapter?: boolean
  }
  monitoring: {
    enabled: boolean
    metricsInterval?: number
    alertThresholds?: Record<string, number>
  }
}

/**
 * Sim-specific context and metadata
 */
interface SimExecutionContext {
  userId: string
  workspaceId: string
  workflowId: string
  journeyId: string
  sessionId: string
  userPermissions: string[]
  workspaceSettings: Record<string, any>
  billingInfo?: {
    planType: string
    usageQuota: number
    currentUsage: number
  }
}

/**
 * Database integration for journey persistence
 */
interface JourneyPersistenceService {
  saveJourney(journey: JourneyDefinition, context: SimExecutionContext): Promise<string>
  loadJourney(journeyId: string, context: SimExecutionContext): Promise<JourneyDefinition | null>
  saveExecutionState(sessionId: string, state: any, context: SimExecutionContext): Promise<void>
  loadExecutionState(sessionId: string, context: SimExecutionContext): Promise<any>
  saveConversationHistory(sessionId: string, messages: ConversationMessage[]): Promise<void>
  getConversationHistory(sessionId: string, limit?: number): Promise<ConversationMessage[]>
  updateProgress(sessionId: string, progress: ProgressTracker): Promise<void>
  getExecutionMetrics(timeRange: string, workspaceId?: string): Promise<any>
}

/**
 * Main integration orchestrator
 */
export class SimInfrastructureIntegration {
  private config: SimIntegrationConfig
  private journeyEngine: JourneyExecutionEngine
  private communicationService: AgentCommunicationService
  private conversationalInterface: ConversationalExecutionInterface
  private progressService: RealTimeProgressService
  private persistenceService: JourneyPersistenceService
  private socketServer: any = null

  // Integration components
  private authenticationHandler: AuthenticationHandler
  private workspaceManager: WorkspaceManager
  private toolAdapterBridge: ToolAdapterBridge
  private databaseIntegration: DatabaseIntegration
  private monitoringService: MonitoringService

  constructor(config: SimIntegrationConfig) {
    this.config = config

    // Initialize core services
    this.journeyEngine = new JourneyExecutionEngine()
    this.communicationService = new AgentCommunicationService(this.journeyEngine)
    this.conversationalInterface = new ConversationalExecutionInterface(
      this.communicationService,
      this.journeyEngine
    )
    this.progressService = new RealTimeProgressService()

    // Initialize integration components
    this.authenticationHandler = new AuthenticationHandler(config.authentication)
    this.workspaceManager = new WorkspaceManager(config.workspace)
    this.toolAdapterBridge = new ToolAdapterBridge(config.tools)
    this.databaseIntegration = new DatabaseIntegration(config.database)
    this.monitoringService = new MonitoringService(config.monitoring)

    this.initializeIntegration()
  }

  /**
   * Initialize the complete integration system
   */
  private async initializeIntegration(): Promise<void> {
    console.log('Initializing Sim Infrastructure Integration...')

    // Initialize database integration
    if (this.config.database.enabled) {
      this.persistenceService = await this.databaseIntegration.initialize()
      console.log('✅ Database integration initialized')
    }

    // Initialize tool adapter bridge
    if (this.config.tools.enableUniversalAdapter) {
      await this.toolAdapterBridge.initialize()
      console.log('✅ Tool adapter bridge initialized')
    }

    // Initialize monitoring
    if (this.config.monitoring.enabled) {
      await this.monitoringService.initialize()
      console.log('✅ Monitoring service initialized')
    }

    console.log('🚀 Sim Infrastructure Integration ready')
  }

  /**
   * Initialize Socket.io integration for real-time updates
   */
  initializeSocketIntegration(io: any): void {
    console.log('Initializing Socket.io integration...')

    this.socketServer = io

    // Create journey namespace
    const journeyNamespace = io.of(this.config.socketio.namespace || '/journey')

    // Apply authentication middleware
    journeyNamespace.use(async (socket: any, next: any) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization
        const user = await this.authenticationHandler.verifyToken(token)

        socket.userId = user.id
        socket.workspaceId = socket.handshake.query.workspaceId
        socket.userPermissions = user.permissions || []

        // Verify workspace access
        const hasAccess = await this.workspaceManager.verifyWorkspaceAccess(user.id, socket.workspaceId)
        if (!hasAccess) {
          return next(new Error('Workspace access denied'))
        }

        next()
      } catch (error) {
        console.error('Socket authentication failed:', error)
        next(new Error('Authentication failed'))
      }
    })

    // Handle connections with workspace isolation
    journeyNamespace.on('connection', (socket: any) => {
      console.log(`Journey socket connected: ${socket.id} (user: ${socket.userId}, workspace: ${socket.workspaceId})`)

      // Workspace-scoped room
      const workspaceRoom = `workspace:${socket.workspaceId}`
      socket.join(workspaceRoom)

      // Handle journey-specific subscriptions
      socket.on('subscribe_to_journey', async (data: { journeyId: string; sessionId: string }) => {
        try {
          // Verify user has access to this journey
          const hasAccess = await this.verifyJourneyAccess(socket.userId, data.journeyId, socket.workspaceId)
          if (!hasAccess) {
            socket.emit('error', { message: 'Journey access denied' })
            return
          }

          // Subscribe to journey updates
          this.progressService.subscribeToJourney(socket.id, data.journeyId, data.sessionId)
          socket.join(`journey:${data.journeyId}`)

          console.log(`Socket ${socket.id} subscribed to journey ${data.journeyId}`)
        } catch (error) {
          console.error('Journey subscription failed:', error)
          socket.emit('error', { message: 'Failed to subscribe to journey' })
        }
      })

      // Handle journey execution requests
      socket.on('start_journey_execution', async (data: {
        workflowId: string
        preferences?: any
      }) => {
        try {
          const context = this.createExecutionContext(socket, data.workflowId)

          // Start conversational execution
          const conversationContext = await this.conversationalInterface.initializeConversation(
            data.workflowId,
            socket.userId,
            socket.workspaceId,
            data.preferences
          )

          // Notify client
          socket.emit('journey_started', {
            sessionId: conversationContext.sessionId,
            journeyId: conversationContext.journeyId,
            workflowId: data.workflowId
          })

          console.log(`Journey execution started for user ${socket.userId}`)
        } catch (error) {
          console.error('Failed to start journey execution:', error)
          socket.emit('error', { message: 'Failed to start journey execution' })
        }
      })

      // Handle user messages
      socket.on('send_message', async (data: {
        sessionId: string
        message: string
        attachments?: any[]
      }) => {
        try {
          // Process message through conversational interface
          const response = await this.conversationalInterface.processMessage(
            data.sessionId,
            data.message,
            data.attachments
          )

          // Send response back to client
          socket.emit('agent_response', response)

          // Log for monitoring
          await this.monitoringService.logUserInteraction(socket.userId, data.sessionId, data.message)
        } catch (error) {
          console.error('Failed to process message:', error)
          socket.emit('error', { message: 'Failed to process message' })
        }
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Journey socket disconnected: ${socket.id}`)
        // Cleanup handled by progress service
      })
    })

    // Initialize progress service with Socket.io
    this.progressService.initializeSocketIntegration(journeyNamespace)

    console.log('✅ Socket.io integration initialized')
  }

  /**
   * Start a journey execution with full Sim integration
   */
  async startJourneyExecution(
    workflowId: string,
    userId: string,
    workspaceId: string,
    preferences: any = {}
  ): Promise<{
    sessionId: string
    journeyId: string
    conversationContext: any
  }> {
    try {
      console.log(`Starting journey execution for workflow ${workflowId}`)

      // Verify user permissions
      await this.verifyExecutionPermissions(userId, workspaceId, workflowId)

      // Check billing limits
      await this.checkBillingLimits(userId, workspaceId)

      // Create execution context
      const context: SimExecutionContext = {
        userId,
        workspaceId,
        workflowId,
        journeyId: '', // Will be set after creation
        sessionId: '', // Will be set after creation
        userPermissions: await this.getUserPermissions(userId),
        workspaceSettings: await this.getWorkspaceSettings(workspaceId)
      }

      // Start conversational execution
      const conversationContext = await this.conversationalInterface.initializeConversation(
        workflowId,
        userId,
        workspaceId,
        preferences
      )

      // Update context with session info
      context.journeyId = conversationContext.journeyId
      context.sessionId = conversationContext.sessionId

      // Save to database if enabled
      if (this.persistenceService) {
        const journey = await this.getJourneyForWorkflow(workflowId, context)
        await this.persistenceService.saveJourney(journey, context)
      }

      // Initialize monitoring
      await this.monitoringService.trackJourneyStart(context)

      // Register progress tracking
      this.progressService.registerUpdateHandler(conversationContext.sessionId, {
        onStateChange: async (update) => {
          await this.handleStateChange(update, context)
        },
        onProgressUpdate: async (update) => {
          await this.handleProgressUpdate(update, context)
        },
        onError: async (update) => {
          await this.handleExecutionError(update, context)
        },
        onCompletion: async (update) => {
          await this.handleExecutionCompletion(update, context)
        }
      })

      console.log(`Journey execution started: ${conversationContext.sessionId}`)

      return {
        sessionId: conversationContext.sessionId,
        journeyId: conversationContext.journeyId,
        conversationContext
      }
    } catch (error) {
      console.error('Failed to start journey execution:', error)
      throw error
    }
  }

  /**
   * Get journey execution status with Sim context
   */
  async getExecutionStatus(sessionId: string, userId: string, workspaceId: string): Promise<any> {
    // Verify access
    await this.verifySessionAccess(sessionId, userId, workspaceId)

    // Get status from journey engine
    const executionContext = this.journeyEngine.getExecutionStatus(sessionId)
    if (!executionContext) {
      throw new Error(`Execution context not found: ${sessionId}`)
    }

    // Get conversation stats
    const conversationStats = this.conversationalInterface.getConversationStats(sessionId)

    // Get persistence data if available
    let persistedData = null
    if (this.persistenceService) {
      persistedData = await this.persistenceService.loadExecutionState(sessionId, {
        userId,
        workspaceId
      } as SimExecutionContext)
    }

    return {
      execution: executionContext,
      conversation: conversationStats,
      persisted: persistedData
    }
  }

  /**
   * Get workspace journey analytics
   */
  async getWorkspaceAnalytics(workspaceId: string, userId: string, timeRange: string = '7d'): Promise<any> {
    // Verify workspace access
    await this.workspaceManager.verifyWorkspaceAccess(userId, workspaceId)

    // Get execution metrics
    const executionMetrics = this.persistenceService
      ? await this.persistenceService.getExecutionMetrics(timeRange, workspaceId)
      : null

    // Get progress service statistics
    const progressStats = this.progressService.getExecutionStatistics()

    // Get monitoring data
    const monitoringData = await this.monitoringService.getWorkspaceMetrics(workspaceId, timeRange)

    return {
      execution: executionMetrics,
      progress: progressStats,
      monitoring: monitoringData,
      workspace: {
        id: workspaceId,
        settings: await this.getWorkspaceSettings(workspaceId)
      }
    }
  }

  /**
   * Integration event handlers
   */
  private async handleStateChange(update: any, context: SimExecutionContext): Promise<void> {
    // Save state to database
    if (this.persistenceService) {
      await this.persistenceService.saveExecutionState(context.sessionId, update, context)
    }

    // Update monitoring
    await this.monitoringService.trackStateChange(update, context)

    // Emit workspace-scoped update
    if (this.socketServer) {
      this.socketServer.to(`workspace:${context.workspaceId}`).emit('journey:state_changed', {
        ...update,
        workspaceId: context.workspaceId
      })
    }
  }

  private async handleProgressUpdate(update: any, context: SimExecutionContext): Promise<void> {
    // Save progress to database
    if (this.persistenceService) {
      await this.persistenceService.updateProgress(context.sessionId, update.progress)
    }

    // Check billing usage
    await this.updateBillingUsage(context, update)

    // Update monitoring
    await this.monitoringService.trackProgressUpdate(update, context)
  }

  private async handleExecutionError(update: any, context: SimExecutionContext): Promise<void> {
    // Log error for monitoring
    await this.monitoringService.trackExecutionError(update, context)

    // Emit error notification
    if (this.socketServer) {
      this.socketServer.to(`workspace:${context.workspaceId}`).emit('journey:execution_error', {
        ...update,
        workspaceId: context.workspaceId
      })
    }
  }

  private async handleExecutionCompletion(update: any, context: SimExecutionContext): Promise<void> {
    // Finalize database records
    if (this.persistenceService) {
      await this.persistenceService.saveExecutionState(context.sessionId, update, context)
    }

    // Update billing
    await this.finalizeBillingUsage(context, update)

    // Track completion
    await this.monitoringService.trackJourneyCompletion(update, context)

    // Cleanup resources
    setTimeout(() => {
      this.progressService.unregisterUpdateHandler(context.sessionId)
    }, 5 * 60 * 1000) // 5 minutes
  }

  /**
   * Helper methods for Sim integration
   */
  private createExecutionContext(socket: any, workflowId: string): SimExecutionContext {
    return {
      userId: socket.userId,
      workspaceId: socket.workspaceId,
      workflowId,
      journeyId: '',
      sessionId: '',
      userPermissions: socket.userPermissions,
      workspaceSettings: {}
    }
  }

  private async verifyJourneyAccess(userId: string, journeyId: string, workspaceId: string): Promise<boolean> {
    // Implementation would check database for journey ownership/permissions
    return true // Mock implementation
  }

  private async verifyExecutionPermissions(userId: string, workspaceId: string, workflowId: string): Promise<void> {
    const hasAccess = await this.workspaceManager.verifyWorkspaceAccess(userId, workspaceId)
    if (!hasAccess) {
      throw new Error('Workspace access denied')
    }

    // Additional workflow-specific permission checks would go here
  }

  private async verifySessionAccess(sessionId: string, userId: string, workspaceId: string): Promise<void> {
    // Implementation would verify session ownership
  }

  private async checkBillingLimits(userId: string, workspaceId: string): Promise<void> {
    // Implementation would check billing quotas
  }

  private async updateBillingUsage(context: SimExecutionContext, update: any): Promise<void> {
    // Implementation would update usage metrics
  }

  private async finalizeBillingUsage(context: SimExecutionContext, update: any): Promise<void> {
    // Implementation would finalize billing calculation
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    return await this.authenticationHandler.getUserPermissions(userId)
  }

  private async getWorkspaceSettings(workspaceId: string): Promise<Record<string, any>> {
    return await this.workspaceManager.getWorkspaceSettings(workspaceId)
  }

  private async getJourneyForWorkflow(workflowId: string, context: SimExecutionContext): Promise<JourneyDefinition> {
    // Mock implementation - would convert workflow to journey
    return {
      id: `journey_${workflowId}`,
      title: 'Generated Journey',
      description: 'Journey generated from workflow',
      conditions: ['User requested workflow execution'],
      states: []
    }
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Sim Infrastructure Integration...')

    // Shutdown services
    this.progressService.shutdown()
    await this.monitoringService.shutdown()
    await this.databaseIntegration.shutdown()

    console.log('✅ Sim Infrastructure Integration shutdown complete')
  }
}

/**
 * Supporting integration classes
 */

class AuthenticationHandler {
  constructor(private config: any) {}

  async verifyToken(token: string): Promise<any> {
    // Mock implementation - would integrate with Better Auth
    return { id: 'user123', permissions: ['read', 'write'] }
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    // Mock implementation
    return ['read', 'write', 'execute']
  }
}

class WorkspaceManager {
  constructor(private config: any) {}

  async verifyWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    // Mock implementation - would check database
    return true
  }

  async getWorkspaceSettings(workspaceId: string): Promise<Record<string, any>> {
    // Mock implementation
    return { theme: 'light', notifications: true }
  }
}

class ToolAdapterBridge {
  constructor(private config: any) {}

  async initialize(): Promise<void> {
    // Initialize connection to universal tool adapter system
    console.log('Tool adapter bridge initialized')
  }
}

class DatabaseIntegration {
  constructor(private config: any) {}

  async initialize(): Promise<JourneyPersistenceService> {
    // Mock persistence service
    return {
      saveJourney: async () => 'saved',
      loadJourney: async () => null,
      saveExecutionState: async () => {},
      loadExecutionState: async () => ({}),
      saveConversationHistory: async () => {},
      getConversationHistory: async () => [],
      updateProgress: async () => {},
      getExecutionMetrics: async () => ({})
    } as JourneyPersistenceService
  }

  async shutdown(): Promise<void> {
    console.log('Database integration shutdown')
  }
}

class MonitoringService {
  constructor(private config: any) {}

  async initialize(): Promise<void> {
    console.log('Monitoring service initialized')
  }

  async trackJourneyStart(context: SimExecutionContext): Promise<void> {}
  async trackStateChange(update: any, context: SimExecutionContext): Promise<void> {}
  async trackProgressUpdate(update: any, context: SimExecutionContext): Promise<void> {}
  async trackExecutionError(update: any, context: SimExecutionContext): Promise<void> {}
  async trackJourneyCompletion(update: any, context: SimExecutionContext): Promise<void> {}
  async logUserInteraction(userId: string, sessionId: string, message: string): Promise<void> {}
  async getWorkspaceMetrics(workspaceId: string, timeRange: string): Promise<any> {
    return {}
  }

  async shutdown(): Promise<void> {
    console.log('Monitoring service shutdown')
  }
}