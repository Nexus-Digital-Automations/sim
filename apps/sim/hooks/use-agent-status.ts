/**
 * Agent Status Real-time Hook
 * ===========================
 *
 * React hook for subscribing to real-time agent status updates:
 * - Automatic subscription/unsubscription based on workspace
 * - Agent status caching and updates
 * - Performance metrics tracking
 * - Health check monitoring
 * - Optimistic UI updates
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { AgentStatusService, type AgentStatusEvent, type AgentStatusEventData } from '@/services/parlant/realtime/agent-status-service'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('useAgentStatus')

interface UseAgentStatusOptions {
  workspaceId: string
  agentIds?: string[]
  autoConnect?: boolean
  reconnectInterval?: number
}

interface AgentStatusHook {
  agentStatuses: Map<string, AgentStatusEventData>
  isConnected: boolean
  lastUpdate: Date | null
  updateCount: number
  getAgentStatus: (agentId: string) => AgentStatusEventData | null
  forceRefresh: () => void
  errors: string[]
  clearErrors: () => void
}

/**
 * Hook for real-time agent status updates
 */
export function useAgentStatus(options: UseAgentStatusOptions): AgentStatusHook {
  const {
    workspaceId,
    agentIds = [],
    autoConnect = true,
    reconnectInterval = 5000
  } = options

  // State
  const [agentStatuses, setAgentStatuses] = useState<Map<string, AgentStatusEventData>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [updateCount, setUpdateCount] = useState(0)
  const [errors, setErrors] = useState<string[]>([])

  // Refs
  const statusServiceRef = useRef<AgentStatusService | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Handle status events from the service
   */
  const handleStatusEvent = useCallback((event: AgentStatusEvent) => {
    logger.debug('Received agent status event', {
      type: event.type,
      agent_id: event.agent_id,
      workspace_id: event.workspace_id
    })

    // Filter events if specific agent IDs are provided
    if (agentIds.length > 0 && !agentIds.includes(event.agent_id)) {
      return
    }

    setAgentStatuses(prev => {
      const newStatuses = new Map(prev)
      const currentStatus = newStatuses.get(event.agent_id) || {}

      // Merge event data with existing status
      const updatedStatus = {
        ...currentStatus,
        ...event.data
      }

      newStatuses.set(event.agent_id, updatedStatus)
      return newStatuses
    })

    setLastUpdate(new Date())
    setUpdateCount(prev => prev + 1)

    // Clear connection errors on successful update
    setErrors(prev => prev.filter(error => !error.includes('connection')))

  }, [agentIds])

  /**
   * Connect to the agent status service
   */
  const connect = useCallback(() => {
    if (!workspaceId || !autoConnect) {
      return
    }

    try {
      logger.info('Connecting to agent status service', {
        workspace_id: workspaceId,
        agent_ids: agentIds
      })

      // Get service instance
      statusServiceRef.current = AgentStatusService.getInstance()

      // Subscribe to workspace events
      unsubscribeRef.current = statusServiceRef.current.subscribeToWorkspace(
        workspaceId,
        handleStatusEvent
      )

      // Initialize statuses for specified agents
      if (agentIds.length > 0) {
        const initialStatuses = new Map<string, AgentStatusEventData>()
        agentIds.forEach(agentId => {
          const status = statusServiceRef.current!.getAgentStatus(agentId)
          if (status) {
            initialStatuses.set(agentId, status)
          }
        })
        setAgentStatuses(initialStatuses)
      }

      setIsConnected(true)
      logger.info('Successfully connected to agent status service')

    } catch (error) {
      const errorMessage = `Failed to connect to agent status service: ${(error as Error).message}`
      logger.error(errorMessage, { workspace_id: workspaceId })
      setErrors(prev => [...prev, errorMessage])
      setIsConnected(false)

      // Schedule reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, reconnectInterval)
    }
  }, [workspaceId, agentIds, autoConnect, reconnectInterval, handleStatusEvent])

  /**
   * Disconnect from the agent status service
   */
  const disconnect = useCallback(() => {
    logger.info('Disconnecting from agent status service', {
      workspace_id: workspaceId
    })

    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    statusServiceRef.current = null
    setIsConnected(false)
    setAgentStatuses(new Map())
    setLastUpdate(null)
    setUpdateCount(0)

  }, [workspaceId])

  /**
   * Get status for a specific agent
   */
  const getAgentStatus = useCallback((agentId: string): AgentStatusEventData | null => {
    return agentStatuses.get(agentId) || null
  }, [agentStatuses])

  /**
   * Force refresh of agent statuses
   */
  const forceRefresh = useCallback(() => {
    if (!statusServiceRef.current || !workspaceId) {
      return
    }

    logger.info('Force refreshing agent statuses', {
      workspace_id: workspaceId,
      agent_count: agentIds.length
    })

    // Re-initialize statuses
    const refreshedStatuses = new Map<string, AgentStatusEventData>()

    if (agentIds.length > 0) {
      agentIds.forEach(agentId => {
        const status = statusServiceRef.current!.getAgentStatus(agentId)
        if (status) {
          refreshedStatuses.set(agentId, status)
        }
      })
    }

    setAgentStatuses(refreshedStatuses)
    setLastUpdate(new Date())
    setUpdateCount(prev => prev + 1)

  }, [workspaceId, agentIds])

  /**
   * Clear error messages
   */
  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  // Connect on mount and when dependencies change
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    agentStatuses,
    isConnected,
    lastUpdate,
    updateCount,
    getAgentStatus,
    forceRefresh,
    errors,
    clearErrors
  }
}

/**
 * Hook for a single agent's status
 */
export function useSingleAgentStatus(
  workspaceId: string,
  agentId: string
): {
  status: AgentStatusEventData | null
  isConnected: boolean
  lastUpdate: Date | null
} {
  const { agentStatuses, isConnected, lastUpdate } = useAgentStatus({
    workspaceId,
    agentIds: [agentId]
  })

  return {
    status: agentStatuses.get(agentId) || null,
    isConnected,
    lastUpdate
  }
}

/**
 * Hook for agent status with optimistic updates
 */
export function useOptimisticAgentStatus(
  workspaceId: string,
  agentId: string
): {
  status: AgentStatusEventData | null
  isConnected: boolean
  lastUpdate: Date | null
  updateStatus: (update: Partial<AgentStatusEventData>) => void
} {
  const hook = useSingleAgentStatus(workspaceId, agentId)
  const statusServiceRef = useRef<AgentStatusService | null>(null)

  // Get service instance
  useEffect(() => {
    statusServiceRef.current = AgentStatusService.getInstance()
  }, [])

  const updateStatus = useCallback((update: Partial<AgentStatusEventData>) => {
    if (statusServiceRef.current) {
      statusServiceRef.current.updateAgentStatus(agentId, workspaceId, update)
    }
  }, [agentId, workspaceId])

  return {
    ...hook,
    updateStatus
  }
}