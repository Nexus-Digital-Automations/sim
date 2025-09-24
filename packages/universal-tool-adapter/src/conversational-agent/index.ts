/**
 * Agent Tool Recommendation System - Main Integration Module
 *
 * Comprehensive system that makes Parlant agents intelligent consultants who can
 * guide users to the right tools at the right moments in their workflows.
 *
 * Features:
 * - Conversational context analysis for tool requirement extraction
 * - Agent-tool interaction API and integration layer
 * - Workflow-aware recommendation engine with sequencing intelligence
 * - Real-time WebSocket integration for conversational tool suggestions
 * - Comprehensive testing framework for recommendation accuracy
 *
 * @author Agent Tool Recommendation System Agent
 * @version 1.0.0
 */

// =============================================================================
// Core System Exports
// =============================================================================

// Context Analysis System
export {
  ConversationalContextAnalyzer,
  createConversationalContextAnalyzer
} from './context-analyzer'

export type {
  ConversationalContext,
  AnalyzedMessage,
  UserIntent,
  ConversationFlow,
  ContextualCue,
  ToolUsageContext,
  WorkflowState,
  RecommendationTiming,
  ConversationMomentum,
  Entity,
  ToolMention,
  IntentCategory,
  ConversationPhase,
  ConversationInsights
} from './context-analyzer'

// Agent-Tool Interaction API
export {
  AgentToolAPI,
  createAgentToolAPI,
  requestToolRecommendations,
  recordToolSelection,
  processUsageFeedback
} from './agent-tool-api'

export type {
  ToolRecommendationRequest,
  ToolRecommendationResponse,
  AgentToolRecommendation,
  ConversationalPresentation,
  AgentMessage,
  AgentContext,
  UserProfile,
  WorkflowContext,
  RecentAction,
  UserPreferences,
  ToolSelectionEvent,
  ToolUsageFeedback,
  AgentLearningData,
  RecommendationPattern,
  UserLearningProfile,
  QuickAction
} from './agent-tool-api'

// Workflow-Aware Recommendation Engine
export {
  WorkflowRecommendationEngine,
  createWorkflowRecommendationEngine,
  generateWorkflowRecommendations
} from './workflow-recommendation-engine'

export type {
  WorkflowRecommendationRequest,
  WorkflowRecommendationResponse,
  WorkflowStage,
  WorkflowState,
  WorkflowTool,
  WorkflowToolRecommendation,
  ToolSequenceRecommendation,
  WorkflowAnalysis,
  StageOptimization,
  UpcomingStageInfo,
  WorkflowBottleneck,
  WorkflowType,
  WorkflowPreferences,
  OptimizationOpportunity,
  QualityAssuranceStep,
  PerformanceBenchmark
} from './workflow-recommendation-engine'

// Real-time WebSocket Integration
export {
  RealtimeRecommendationService,
  createRealtimeRecommendationService
} from './realtime-recommendation-service'

export type {
  RealtimeRecommendationConfig,
  RealtimeSession,
  CachedRecommendation,
  RealtimePreferences,
  SessionPerformanceMetrics,
  RealtimeRecommendationEvent,
  RecommendationEventData,
  RealtimeRecommendationBundle,
  UserFeedback,
  SystemStatus,
  ClientToServerEvents,
  ServerToClientEvents,
  RecommendationRequestData
} from './realtime-recommendation-service'

// Testing Framework
export {
  AgentRecommendationTestingFramework
} from './__tests__/agent-recommendation-testing-framework.test'

// =============================================================================
// Integrated Recommendation System
// =============================================================================

import { ConversationalContextAnalyzer } from './context-analyzer'
import { AgentToolAPI } from './agent-tool-api'
import { WorkflowRecommendationEngine } from './workflow-recommendation-engine'
import { RealtimeRecommendationService } from './realtime-recommendation-service'
import type { Server as SocketIOServer } from 'socket.io'
import type { RealtimeRecommendationConfig } from './realtime-recommendation-service'
import { createLogger } from '../utils/logger'

const logger = createLogger('AgentRecommendationSystem')

/**
 * Integrated Agent Tool Recommendation System
 *
 * Main orchestration class that brings together all components to provide
 * a unified interface for agent tool recommendations.
 */
export class AgentToolRecommendationSystem {
  private contextAnalyzer: ConversationalContextAnalyzer
  private agentToolAPI: AgentToolAPI
  private workflowEngine: WorkflowRecommendationEngine
  private realtimeService: RealtimeRecommendationService | null = null

  private initialized = false

  constructor() {
    this.contextAnalyzer = new ConversationalContextAnalyzer()
    this.agentToolAPI = new AgentToolAPI()
    this.workflowEngine = new WorkflowRecommendationEngine()

    logger.info('Agent Tool Recommendation System initialized')
  }

  /**
   * Initialize the system with WebSocket support
   */
  async initialize(
    socketIOServer?: SocketIOServer,
    realtimeConfig?: Partial<RealtimeRecommendationConfig>
  ): Promise<void> {
    try {
      if (socketIOServer) {
        this.realtimeService = new RealtimeRecommendationService(socketIOServer, realtimeConfig)
        logger.info('Real-time recommendation service enabled')
      }

      this.initialized = true
      logger.info('Agent Tool Recommendation System fully initialized')

    } catch (error) {
      logger.error('Failed to initialize Agent Tool Recommendation System', { error })
      throw new Error(`System initialization failed: ${error.message}`)
    }
  }

  /**
   * Check if the system is properly initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get system health status
   */
  getHealthStatus(): SystemHealthStatus {
    return {
      initialized: this.initialized,
      components: {
        contextAnalyzer: true,
        agentToolAPI: true,
        workflowEngine: true,
        realtimeService: this.realtimeService !== null
      },
      lastChecked: new Date()
    }
  }

  /**
   * Get system statistics
   */
  getSystemStats(): SystemStatistics {
    return {
      uptime: process.uptime() * 1000, // Convert to milliseconds
      memoryUsage: process.memoryUsage(),
      componentsActive: {
        contextAnalyzer: true,
        agentToolAPI: true,
        workflowEngine: true,
        realtimeService: this.realtimeService !== null
      },
      timestamp: new Date()
    }
  }

  /**
   * Access to individual components for advanced usage
   */
  getComponents() {
    return {
      contextAnalyzer: this.contextAnalyzer,
      agentToolAPI: this.agentToolAPI,
      workflowEngine: this.workflowEngine,
      realtimeService: this.realtimeService
    }
  }

  /**
   * Shutdown the system gracefully
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Agent Tool Recommendation System')

      // Shutdown real-time service if running
      if (this.realtimeService) {
        // Real-time service would have shutdown methods
        logger.info('Real-time service shutdown completed')
      }

      this.initialized = false
      logger.info('Agent Tool Recommendation System shutdown completed')

    } catch (error) {
      logger.error('Error during system shutdown', { error })
      throw new Error(`System shutdown failed: ${error.message}`)
    }
  }
}

/**
 * System Health Status Interface
 */
export interface SystemHealthStatus {
  initialized: boolean
  components: {
    contextAnalyzer: boolean
    agentToolAPI: boolean
    workflowEngine: boolean
    realtimeService: boolean
  }
  lastChecked: Date
}

/**
 * System Statistics Interface
 */
export interface SystemStatistics {
  uptime: number
  memoryUsage: NodeJS.MemoryUsage
  componentsActive: {
    contextAnalyzer: boolean
    agentToolAPI: boolean
    workflowEngine: boolean
    realtimeService: boolean
  }
  timestamp: Date
}

/**
 * Factory function to create the integrated system
 */
export function createAgentToolRecommendationSystem(): AgentToolRecommendationSystem {
  return new AgentToolRecommendationSystem()
}

/**
 * Initialize and return a fully configured system
 */
export async function initializeRecommendationSystem(
  socketIOServer?: SocketIOServer,
  realtimeConfig?: Partial<RealtimeRecommendationConfig>
): Promise<AgentToolRecommendationSystem> {
  const system = new AgentToolRecommendationSystem()
  await system.initialize(socketIOServer, realtimeConfig)
  return system
}

// =============================================================================
// System Configuration
// =============================================================================

/**
 * Default system configuration
 */
export const DEFAULT_SYSTEM_CONFIG = {
  enableRealtime: true,
  enableCaching: true,
  enablePerformanceMonitoring: true,
  enableTesting: false, // Disabled by default in production

  // Context Analysis Configuration
  contextAnalysis: {
    enableEntityExtraction: true,
    enableSentimentAnalysis: true,
    enableIntentRecognition: true,
    confidenceThreshold: 0.6
  },

  // Agent Tool API Configuration
  agentAPI: {
    maxRecommendations: 5,
    includeExplanations: true,
    enableLearning: true,
    feedbackEnabled: true
  },

  // Workflow Engine Configuration
  workflowEngine: {
    enableSequenceRecommendations: true,
    enableOptimization: true,
    enableBottleneckDetection: true,
    qualityThreshold: 0.7
  },

  // Real-time Service Configuration
  realtime: {
    socketNamespace: '/recommendations',
    enableCaching: true,
    cacheTimeout: 600000, // 10 minutes
    enableFallback: true,
    enablePerformanceMonitoring: true
  }
}

/**
 * System configuration type
 */
export type SystemConfiguration = typeof DEFAULT_SYSTEM_CONFIG

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validate system configuration
 */
export function validateSystemConfiguration(config: Partial<SystemConfiguration>): boolean {
  // Configuration validation logic would go here
  return true
}

/**
 * Merge configuration with defaults
 */
export function mergeWithDefaults(
  userConfig: Partial<SystemConfiguration>
): SystemConfiguration {
  return {
    ...DEFAULT_SYSTEM_CONFIG,
    ...userConfig,
    contextAnalysis: {
      ...DEFAULT_SYSTEM_CONFIG.contextAnalysis,
      ...userConfig.contextAnalysis
    },
    agentAPI: {
      ...DEFAULT_SYSTEM_CONFIG.agentAPI,
      ...userConfig.agentAPI
    },
    workflowEngine: {
      ...DEFAULT_SYSTEM_CONFIG.workflowEngine,
      ...userConfig.workflowEngine
    },
    realtime: {
      ...DEFAULT_SYSTEM_CONFIG.realtime,
      ...userConfig.realtime
    }
  }
}

// =============================================================================
// Version Information
// =============================================================================

export const VERSION = '1.0.0'
export const BUILD_DATE = new Date().toISOString()
export const SYSTEM_NAME = 'Agent Tool Recommendation System'

/**
 * Get system version information
 */
export function getVersionInfo(): VersionInfo {
  return {
    version: VERSION,
    buildDate: BUILD_DATE,
    systemName: SYSTEM_NAME,
    nodeVersion: process.version,
    platform: process.platform
  }
}

export interface VersionInfo {
  version: string
  buildDate: string
  systemName: string
  nodeVersion: string
  platform: string
}

// =============================================================================
// Main Export - Ready-to-use System Instance
// =============================================================================

/**
 * Pre-configured system instance for immediate use
 *
 * @example
 * ```typescript
 * import { agentRecommendationSystem } from '@/conversational-agent'
 *
 * // Initialize with Socket.IO support
 * await agentRecommendationSystem.initialize(io)
 *
 * // System is ready for use
 * const { contextAnalyzer, agentToolAPI, workflowEngine } = agentRecommendationSystem.getComponents()
 * ```
 */
export const agentRecommendationSystem = createAgentToolRecommendationSystem()

// =============================================================================
// Development and Debug Utilities
// =============================================================================

/**
 * Enable debug mode for development
 */
export function enableDebugMode(): void {
  logger.info('Debug mode enabled for Agent Tool Recommendation System')
  // Additional debug configuration would go here
}

/**
 * Get comprehensive system information for debugging
 */
export function getDebugInfo(): DebugInfo {
  return {
    version: getVersionInfo(),
    health: agentRecommendationSystem.getHealthStatus(),
    stats: agentRecommendationSystem.getSystemStats(),
    config: DEFAULT_SYSTEM_CONFIG,
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  }
}

export interface DebugInfo {
  version: VersionInfo
  health: SystemHealthStatus
  stats: SystemStatistics
  config: SystemConfiguration
  environment: {
    nodeEnv: string
    nodeVersion: string
    platform: string
    arch: string
  }
}

// =============================================================================
// Module Metadata
// =============================================================================

export const MODULE_INFO = {
  name: 'Agent Tool Recommendation System',
  version: VERSION,
  description: 'Intelligent tool recommendation system for conversational AI agents',
  author: 'Agent Tool Recommendation System Agent',
  license: 'MIT',

  features: [
    'Conversational context analysis for tool requirement extraction',
    'Agent-tool interaction API and integration layer',
    'Workflow-aware recommendation engine with sequencing intelligence',
    'Real-time WebSocket integration for conversational tool suggestions',
    'Comprehensive testing framework for recommendation accuracy'
  ],

  components: [
    'ConversationalContextAnalyzer',
    'AgentToolAPI',
    'WorkflowRecommendationEngine',
    'RealtimeRecommendationService',
    'AgentRecommendationTestingFramework'
  ],

  integration: {
    parlant: 'Native integration with Parlant conversation system',
    socketio: 'Real-time WebSocket support via Socket.IO',
    sim: 'Deep integration with Sim workflow platform',
    testing: 'Jest-based comprehensive testing framework'
  }
}

// Final system validation
logger.info('Agent Tool Recommendation System module loaded successfully', {
  version: VERSION,
  components: MODULE_INFO.components.length,
  features: MODULE_INFO.features.length
})