/**
 * RPA Agent Manager
 * 
 * Centralized management of Desktop Agent connections, lifecycle, and operations.
 * Provides utilities for agent registration, authentication, health monitoring,
 * and load balancing across multiple agents.
 * 
 * Features:
 * - Agent lifecycle management
 * - Connection health monitoring
 * - Load balancing and agent selection
 * - Capability matching and validation
 * - Performance metrics tracking
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { 
  DesktopAgent, 
  AgentMetrics, 
  AgentCapability,
  RPAOperation,
  RPAWorkflowExecution 
} from '@/types/rpa'

const logger = createLogger('RPAAgentManager')

/**
 * Agent selection strategies for load balancing
 */
export enum AgentSelectionStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_BUSY = 'least_busy',
  FASTEST_RESPONSE = 'fastest_response',
  CAPABILITY_MATCH = 'capability_match',
  GEOGRAPHIC_PROXIMITY = 'geographic_proximity'
}

/**
 * Agent health status thresholds
 */
export const HEALTH_THRESHOLDS = {
  CPU_WARNING: 80,
  CPU_CRITICAL: 95,
  MEMORY_WARNING: 85,
  MEMORY_CRITICAL: 95,
  ERROR_RATE_WARNING: 10,
  ERROR_RATE_CRITICAL: 25,
  RESPONSE_TIME_WARNING: 5000, // 5 seconds
  RESPONSE_TIME_CRITICAL: 10000, // 10 seconds
  HEARTBEAT_TIMEOUT: 90000, // 1.5 minutes
} as const

/**
 * Agent performance scoring weights
 */
export const PERFORMANCE_WEIGHTS = {
  RESPONSE_TIME: 0.3,
  ERROR_RATE: 0.25,
  CPU_USAGE: 0.2,
  MEMORY_USAGE: 0.15,
  AVAILABILITY: 0.1
} as const

/**
 * RPA Agent Manager Class
 * Provides centralized agent management functionality
 */
export class RPAAgentManager {
  private agentStore: Map<string, DesktopAgent>
  private metricsStore: Map<string, AgentMetrics[]>
  private selectionIndex: number = 0

  constructor(agentStore: Map<string, DesktopAgent>) {
    this.agentStore = agentStore
    this.metricsStore = new Map()
    
    // Start periodic health monitoring
    this.startHealthMonitoring()
  }

  /**
   * Get all agents for a specific user
   */
  getUserAgents(userId: string): DesktopAgent[] {
    const { agentAuthStore } = require('@/app/api/rpa/agents/route')
    
    return Array.from(this.agentStore.values()).filter(agent => {
      const agentAuth = agentAuthStore.get(agent.id)
      return agentAuth?.userId === userId
    })
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: DesktopAgent['status'], userId?: string): DesktopAgent[] {
    let agents = Array.from(this.agentStore.values()).filter(agent => agent.status === status)
    
    if (userId) {
      const { agentAuthStore } = require('@/app/api/rpa/agents/route')
      agents = agents.filter(agent => {
        const agentAuth = agentAuthStore.get(agent.id)
        return agentAuth?.userId === userId
      })
    }
    
    return agents
  }

  /**
   * Get online agents with specific capabilities
   */
  getCapableAgents(requiredCapabilities: AgentCapability[], userId?: string): DesktopAgent[] {
    const onlineAgents = this.getAgentsByStatus('online', userId)
    
    return onlineAgents.filter(agent => 
      requiredCapabilities.every(capability => 
        agent.capabilities.includes(capability)
      )
    )
  }

  /**
   * Select best agent for operation execution
   */
  selectAgentForOperation(
    operation: Partial<RPAOperation>, 
    userId: string,
    strategy: AgentSelectionStrategy = AgentSelectionStrategy.CAPABILITY_MATCH
  ): DesktopAgent | null {
    // Get required capabilities for the operation
    const requiredCapabilities = this.getOperationCapabilities(operation)
    
    // Get capable agents
    const capableAgents = this.getCapableAgents(requiredCapabilities, userId)
    
    if (capableAgents.length === 0) {
      logger.warn('No capable agents found for operation', {
        operationType: operation.type,
        requiredCapabilities,
        userId
      })
      return null
    }

    // Apply selection strategy
    const selectedAgent = this.applySelectionStrategy(capableAgents, strategy)
    
    logger.info('Agent selected for operation', {
      operationType: operation.type,
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      strategy,
      candidateCount: capableAgents.length
    })

    return selectedAgent
  }

  /**
   * Select best agent for workflow execution
   */
  selectAgentForWorkflow(
    workflow: Partial<RPAWorkflowExecution>,
    userId: string,
    strategy: AgentSelectionStrategy = AgentSelectionStrategy.LEAST_BUSY
  ): DesktopAgent | null {
    // Get all required capabilities across all operations
    const allCapabilities = new Set<AgentCapability>(['desktop-automation'])
    
    workflow.operations?.forEach(operation => {
      const opCapabilities = this.getOperationCapabilities(operation)
      opCapabilities.forEach(cap => allCapabilities.add(cap))
    })

    // Get agents that support all required capabilities
    const capableAgents = this.getCapableAgents(Array.from(allCapabilities), userId)
    
    if (capableAgents.length === 0) {
      logger.warn('No agents capable of executing workflow', {
        workflowId: workflow.workflowId,
        operationCount: workflow.operations?.length || 0,
        requiredCapabilities: Array.from(allCapabilities),
        userId
      })
      return null
    }

    const selectedAgent = this.applySelectionStrategy(capableAgents, strategy)
    
    logger.info('Agent selected for workflow', {
      workflowId: workflow.workflowId,
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      operationCount: workflow.operations?.length || 0,
      strategy,
      candidateCount: capableAgents.length
    })

    return selectedAgent
  }

  /**
   * Get agent health status
   */
  getAgentHealth(agentId: string): {
    status: 'healthy' | 'warning' | 'critical' | 'offline'
    issues: string[]
    score: number
    lastCheck: Date
  } {
    const agent = this.agentStore.get(agentId)
    if (!agent) {
      return {
        status: 'offline',
        issues: ['Agent not found'],
        score: 0,
        lastCheck: new Date()
      }
    }

    if (agent.status === 'offline') {
      return {
        status: 'offline',
        issues: ['Agent is offline'],
        score: 0,
        lastCheck: agent.lastHeartbeat
      }
    }

    const metrics = this.getLatestMetrics(agentId)
    const issues: string[] = []
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'

    // Check heartbeat
    const timeSinceHeartbeat = Date.now() - agent.lastHeartbeat.getTime()
    if (timeSinceHeartbeat > HEALTH_THRESHOLDS.HEARTBEAT_TIMEOUT) {
      issues.push('Heartbeat timeout')
      status = 'critical'
    }

    if (metrics) {
      // Check CPU usage
      if (metrics.cpuUsage >= HEALTH_THRESHOLDS.CPU_CRITICAL) {
        issues.push('Critical CPU usage')
        status = 'critical'
      } else if (metrics.cpuUsage >= HEALTH_THRESHOLDS.CPU_WARNING) {
        issues.push('High CPU usage')
        if (status === 'healthy') status = 'warning'
      }

      // Check memory usage
      if (metrics.memoryUsage >= HEALTH_THRESHOLDS.MEMORY_CRITICAL) {
        issues.push('Critical memory usage')
        status = 'critical'
      } else if (metrics.memoryUsage >= HEALTH_THRESHOLDS.MEMORY_WARNING) {
        issues.push('High memory usage')
        if (status === 'healthy') status = 'warning'
      }

      // Check error rate
      if (metrics.errorRate >= HEALTH_THRESHOLDS.ERROR_RATE_CRITICAL) {
        issues.push('Critical error rate')
        status = 'critical'
      } else if (metrics.errorRate >= HEALTH_THRESHOLDS.ERROR_RATE_WARNING) {
        issues.push('High error rate')
        if (status === 'healthy') status = 'warning'
      }

      // Check response time
      if (metrics.averageResponseTime >= HEALTH_THRESHOLDS.RESPONSE_TIME_CRITICAL) {
        issues.push('Critical response time')
        status = 'critical'
      } else if (metrics.averageResponseTime >= HEALTH_THRESHOLDS.RESPONSE_TIME_WARNING) {
        issues.push('Slow response time')
        if (status === 'healthy') status = 'warning'
      }
    }

    const score = this.calculatePerformanceScore(agent, metrics)

    return {
      status,
      issues,
      score,
      lastCheck: new Date()
    }
  }

  /**
   * Update agent metrics
   */
  updateAgentMetrics(agentId: string, metrics: Partial<AgentMetrics>): void {
    const existingMetrics = this.metricsStore.get(agentId) || []
    
    const newMetrics: AgentMetrics = {
      agentId,
      timestamp: new Date(),
      cpuUsage: 0,
      memoryUsage: 0,
      activeOperations: 0,
      totalOperationsCompleted: 0,
      averageResponseTime: 0,
      errorRate: 0,
      ...metrics
    }

    existingMetrics.push(newMetrics)
    
    // Keep only last 100 metrics entries
    if (existingMetrics.length > 100) {
      existingMetrics.splice(0, existingMetrics.length - 100)
    }
    
    this.metricsStore.set(agentId, existingMetrics)

    logger.debug('Agent metrics updated', {
      agentId,
      cpuUsage: newMetrics.cpuUsage,
      memoryUsage: newMetrics.memoryUsage,
      activeOperations: newMetrics.activeOperations
    })
  }

  /**
   * Get performance statistics for an agent
   */
  getAgentStats(agentId: string, timeWindow?: number): {
    current: AgentMetrics | null
    average: Partial<AgentMetrics>
    trend: 'improving' | 'stable' | 'degrading'
    uptime: number
  } | null {
    const agent = this.agentStore.get(agentId)
    if (!agent) return null

    const metricsHistory = this.metricsStore.get(agentId) || []
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0
    const relevantMetrics = metricsHistory.filter(m => m.timestamp.getTime() > cutoffTime)

    if (relevantMetrics.length === 0) {
      return {
        current: null,
        average: {},
        trend: 'stable',
        uptime: agent.status === 'online' ? Date.now() - agent.lastHeartbeat.getTime() : 0
      }
    }

    const current = relevantMetrics[relevantMetrics.length - 1]
    
    // Calculate averages
    const average = {
      cpuUsage: relevantMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / relevantMetrics.length,
      memoryUsage: relevantMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / relevantMetrics.length,
      averageResponseTime: relevantMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / relevantMetrics.length,
      errorRate: relevantMetrics.reduce((sum, m) => sum + m.errorRate, 0) / relevantMetrics.length
    }

    // Calculate trend
    const trend = this.calculateTrend(relevantMetrics)
    
    // Calculate uptime
    const uptime = agent.status === 'online' ? Date.now() - agent.lastHeartbeat.getTime() : 0

    return { current, average, trend, uptime }
  }

  /**
   * Get load balancing recommendations
   */
  getLoadBalancingRecommendations(userId: string): {
    overloaded: DesktopAgent[]
    underutilized: DesktopAgent[]
    recommendations: string[]
  } {
    const userAgents = this.getUserAgents(userId).filter(agent => agent.status === 'online')
    const overloaded: DesktopAgent[] = []
    const underutilized: DesktopAgent[] = []
    const recommendations: string[] = []

    userAgents.forEach(agent => {
      const metrics = this.getLatestMetrics(agent.id)
      if (!metrics) return

      if (metrics.cpuUsage > 80 || metrics.memoryUsage > 80 || metrics.activeOperations > 5) {
        overloaded.push(agent)
      } else if (metrics.cpuUsage < 20 && metrics.activeOperations < 1) {
        underutilized.push(agent)
      }
    })

    if (overloaded.length > 0) {
      recommendations.push(`${overloaded.length} agent(s) are overloaded - consider distributing workload`)
    }

    if (underutilized.length > 0) {
      recommendations.push(`${underutilized.length} agent(s) are underutilized - consider consolidating workload`)
    }

    if (userAgents.length === 1) {
      recommendations.push('Consider adding more agents for redundancy and load distribution')
    }

    return { overloaded, underutilized, recommendations }
  }

  /**
   * Private helper methods
   */

  private getOperationCapabilities(operation: Partial<RPAOperation>): AgentCapability[] {
    const capabilities: AgentCapability[] = ['desktop-automation']

    switch (operation.type) {
      case 'click':
      case 'type':
        if (operation.parameters?.targetingMethod === 'image_recognition') {
          capabilities.push('image-recognition')
        }
        if (operation.parameters?.targetingMethod === 'ocr_text') {
          capabilities.push('ocr-processing')
        }
        break

      case 'extract':
        if (operation.parameters?.extractionMethod === 'ocr') {
          capabilities.push('ocr-processing')
        }
        if (operation.parameters?.extractionMethod === 'accessibility') {
          capabilities.push('accessibility-api')
        }
        break

      case 'screenshot':
        capabilities.push('screen-capture')
        if (operation.parameters?.saveToFile) {
          capabilities.push('file-operations')
        }
        break

      case 'find-element':
        if (operation.parameters?.searchMethod === 'image_recognition') {
          capabilities.push('image-recognition')
        }
        if (operation.parameters?.searchMethod === 'ocr_text') {
          capabilities.push('ocr-processing')
        }
        if (operation.parameters?.searchMethod === 'accessibility') {
          capabilities.push('accessibility-api')
        }
        break

      case 'wait':
        if (operation.parameters?.waitType?.includes('image')) {
          capabilities.push('image-recognition')
        }
        if (operation.parameters?.waitType?.includes('text')) {
          capabilities.push('ocr-processing')
        }
        break
    }

    return capabilities
  }

  private applySelectionStrategy(
    agents: DesktopAgent[], 
    strategy: AgentSelectionStrategy
  ): DesktopAgent {
    switch (strategy) {
      case AgentSelectionStrategy.ROUND_ROBIN:
        const selected = agents[this.selectionIndex % agents.length]
        this.selectionIndex++
        return selected

      case AgentSelectionStrategy.LEAST_BUSY:
        return agents.reduce((best, current) => {
          const currentMetrics = this.getLatestMetrics(current.id)
          const bestMetrics = this.getLatestMetrics(best.id)
          
          const currentLoad = currentMetrics?.activeOperations || 0
          const bestLoad = bestMetrics?.activeOperations || 0
          
          return currentLoad < bestLoad ? current : best
        })

      case AgentSelectionStrategy.FASTEST_RESPONSE:
        return agents.reduce((best, current) => {
          const currentMetrics = this.getLatestMetrics(current.id)
          const bestMetrics = this.getLatestMetrics(best.id)
          
          const currentResponse = currentMetrics?.averageResponseTime || Infinity
          const bestResponse = bestMetrics?.averageResponseTime || Infinity
          
          return currentResponse < bestResponse ? current : best
        })

      case AgentSelectionStrategy.CAPABILITY_MATCH:
      default:
        // For capability match, return the agent with the most capabilities
        return agents.reduce((best, current) => 
          current.capabilities.length > best.capabilities.length ? current : best
        )
    }
  }

  private getLatestMetrics(agentId: string): AgentMetrics | null {
    const metrics = this.metricsStore.get(agentId)
    return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null
  }

  private calculatePerformanceScore(agent: DesktopAgent, metrics?: AgentMetrics | null): number {
    if (!metrics) return 50 // Default score

    // Calculate weighted score (0-100)
    const responseScore = Math.max(0, 100 - (metrics.averageResponseTime / 100))
    const errorScore = Math.max(0, 100 - metrics.errorRate * 4)
    const cpuScore = Math.max(0, 100 - metrics.cpuUsage)
    const memoryScore = Math.max(0, 100 - metrics.memoryUsage)
    const availabilityScore = agent.status === 'online' ? 100 : 0

    const score = 
      responseScore * PERFORMANCE_WEIGHTS.RESPONSE_TIME +
      errorScore * PERFORMANCE_WEIGHTS.ERROR_RATE +
      cpuScore * PERFORMANCE_WEIGHTS.CPU_USAGE +
      memoryScore * PERFORMANCE_WEIGHTS.MEMORY_USAGE +
      availabilityScore * PERFORMANCE_WEIGHTS.AVAILABILITY

    return Math.round(score)
  }

  private calculateTrend(metrics: AgentMetrics[]): 'improving' | 'stable' | 'degrading' {
    if (metrics.length < 3) return 'stable'

    // Look at last 3 data points
    const recent = metrics.slice(-3)
    const scores = recent.map(m => this.calculatePerformanceScore(
      { status: 'online' } as DesktopAgent, m
    ))

    const trend = scores[2] - scores[0]
    
    if (trend > 5) return 'improving'
    if (trend < -5) return 'degrading'
    return 'stable'
  }

  private startHealthMonitoring(): void {
    // Check agent health every minute
    setInterval(() => {
      this.performHealthCheck()
    }, 60000)
  }

  private performHealthCheck(): void {
    for (const [agentId, agent] of this.agentStore.entries()) {
      const health = this.getAgentHealth(agentId)
      
      if (health.status === 'critical') {
        logger.warn('Agent health critical', {
          agentId,
          agentName: agent.name,
          issues: health.issues,
          score: health.score
        })
      }
    }
  }
}

// Singleton instance
let agentManagerInstance: RPAAgentManager | null = null

/**
 * Get singleton agent manager instance
 */
export function getAgentManager(): RPAAgentManager {
  if (!agentManagerInstance) {
    const { agentStore } = require('@/app/api/rpa/agents/route')
    agentManagerInstance = new RPAAgentManager(agentStore)
  }
  return agentManagerInstance
}

/**
 * Agent management utility functions
 */
export const AgentUtils = {
  /**
   * Check if agent supports operation
   */
  supportsOperation(agent: DesktopAgent, operation: Partial<RPAOperation>): boolean {
    const manager = getAgentManager()
    const required = manager['getOperationCapabilities'](operation)
    return required.every(capability => agent.capabilities.includes(capability))
  },

  /**
   * Get agent utilization percentage
   */
  getUtilization(agent: DesktopAgent, metrics?: AgentMetrics): number {
    if (!metrics) return 0
    
    // Simple utilization calculation based on active operations and resource usage
    const operationLoad = Math.min(metrics.activeOperations * 20, 100)
    const resourceLoad = Math.max(metrics.cpuUsage, metrics.memoryUsage)
    
    return Math.max(operationLoad, resourceLoad)
  },

  /**
   * Format agent display name with status
   */
  getDisplayName(agent: DesktopAgent): string {
    const statusEmoji = {
      online: '🟢',
      offline: '⚫',
      busy: '🟡',
      error: '🔴'
    }

    return `${statusEmoji[agent.status]} ${agent.name} (${agent.platform})`
  },

  /**
   * Get capability description
   */
  getCapabilityDescription(capability: AgentCapability): string {
    const descriptions = {
      'desktop-automation': 'Basic desktop automation (mouse, keyboard)',
      'image-recognition': 'Visual element detection and matching',
      'ocr-processing': 'Text extraction from images and screen',
      'screen-capture': 'Screenshot and image capture',
      'mouse-keyboard': 'Advanced mouse and keyboard simulation',
      'accessibility-api': 'System accessibility API integration',
      'window-management': 'Window positioning and management',
      'file-operations': 'File system operations',
      'clipboard-access': 'System clipboard integration'
    }

    return descriptions[capability] || capability
  }
}