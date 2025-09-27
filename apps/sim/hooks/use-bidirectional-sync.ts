/**
 * React Hook for Bidirectional Synchronization System
 *
 * Provides easy integration of the bidirectional sync system with React components,
 * managing lifecycle, state updates, and event handling.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import {
  type Alert,
  type BidirectionalSyncSystem,
  type ChangeEvent,
  type ChatWorkflowState,
  type Conflict,
  createSyncSystem,
  type HealthMetrics,
  type SyncEvent,
  type SyncSystemConfig,
  type SyncSystemStatus,
  type UserPromptResponse,
  type WorkflowVisualState,
} from '@/lib/sync'

const logger = createLogger('useBidirectionalSync')

// Hook configuration
export interface UseBidirectionalSyncConfig extends Omit<SyncSystemConfig, 'workflowId'> {
  workflowId: string
  autoStart?: boolean
  enableRealtimeSync?: boolean
}

// Hook return type
export interface BidirectionalSyncHookReturn {
  // System control
  isInitialized: boolean
  isActive: boolean
  status: SyncSystemStatus | null
  error: Error | null

  // State management
  visualState: WorkflowVisualState
  chatState: ChatWorkflowState
  updateVisualState: (updates: Partial<WorkflowVisualState>) => void
  updateChatState: (updates: Partial<ChatWorkflowState>) => void

  // Event handling
  emitEvent: (
    type: string,
    payload: any,
    source: 'visual' | 'chat',
    options?: { immediate?: boolean }
  ) => Promise<void>

  // Mode control
  currentMode: 'visual' | 'chat' | 'hybrid'
  switchMode: (mode: 'visual' | 'chat' | 'hybrid') => void

  // Monitoring and health
  health: HealthMetrics | null
  alerts: Alert[]
  conflicts: Conflict[]

  // System control
  pause: () => void
  resume: () => void
  reset: () => void
  forcSync: () => Promise<void>

  // Conflict resolution
  resolveConflict: (conflictId: string, response: UserPromptResponse) => void

  // Event subscriptions
  onSyncEvent: (eventType: string, handler: (event: SyncEvent) => void) => () => void
  onChange: (handler: (change: ChangeEvent) => void) => () => void
  onAlert: (handler: (alert: Alert) => void) => () => void
  onHealthUpdate: (handler: (health: HealthMetrics) => void) => () => void
}

// Default empty states
const createEmptyVisualState = (): WorkflowVisualState => ({
  blocks: {},
  edges: [],
  loops: {},
  parallels: {},
  selectedElements: [],
  viewportState: { zoom: 1, position: { x: 0, y: 0 } },
})

const createEmptyChatState = (): ChatWorkflowState => ({
  activeWorkflow: null,
  conversationId: null,
  messages: [],
  workflowCommands: [],
  executionState: {
    running: false,
    currentStep: null,
    results: {},
  },
  agentSelections: [],
})

/**
 * Custom hook for bidirectional synchronization
 */
export function useBidirectionalSync(
  config: UseBidirectionalSyncConfig
): BidirectionalSyncHookReturn {
  // Refs for system and subscriptions
  const syncSystemRef = useRef<BidirectionalSyncSystem | null>(null)
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map())

  // State
  const [isInitialized, setIsInitialized] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState<SyncSystemStatus | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [visualState, setVisualState] = useState<WorkflowVisualState>(createEmptyVisualState)
  const [chatState, setChatState] = useState<ChatWorkflowState>(createEmptyChatState)
  const [health, setHealth] = useState<HealthMetrics | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [currentMode, setCurrentMode] = useState<'visual' | 'chat' | 'hybrid'>('visual')

  // Memoized system config
  const systemConfig = useMemo(
    (): SyncSystemConfig => ({
      workflowId: config.workflowId,
      dataBinding: config.dataBinding,
      performance: config.performance,
      enableConflictResolution: config.enableConflictResolution ?? true,
      enablePerformanceOptimization: config.enablePerformanceOptimization ?? true,
      enableMonitoring: config.enableMonitoring ?? true,
    }),
    [
      config.workflowId,
      config.dataBinding,
      config.performance,
      config.enableConflictResolution,
      config.enablePerformanceOptimization,
      config.enableMonitoring,
    ]
  )

  // Initialize sync system
  useEffect(() => {
    let mounted = true

    const initializeSystem = async () => {
      try {
        logger.info('Initializing bidirectional sync system', { workflowId: config.workflowId })

        const system = await createSyncSystem(systemConfig)

        if (!mounted) {
          system.destroy()
          return
        }

        syncSystemRef.current = system
        setIsInitialized(true)
        setIsActive(true)
        setError(null)

        // Set initial states
        setVisualState(system.getVisualState())
        setChatState(system.getChatState())
        setStatus(system.getStatus())
        setCurrentMode(system.getStatus().currentMode)

        // Setup subscriptions
        setupSubscriptions(system)

        logger.info('Bidirectional sync system initialized successfully')
      } catch (err) {
        if (mounted) {
          const error = err as Error
          logger.error('Failed to initialize sync system', { error: error.message })
          setError(error)
          setIsInitialized(false)
          setIsActive(false)
        }
      }
    }

    if (config.autoStart !== false) {
      initializeSystem()
    }

    return () => {
      mounted = false
      cleanupSystem()
    }
  }, [systemConfig, config.autoStart, config.workflowId])

  // Setup system subscriptions
  const setupSubscriptions = useCallback(
    (system: BidirectionalSyncSystem) => {
      // Subscribe to state changes
      const changeUnsubscribe = system.onChange((change) => {
        if (config.enableRealtimeSync !== false) {
          // Update local state based on changes
          if (change.path.startsWith('blocks') || change.path.startsWith('edges')) {
            setVisualState(system.getVisualState())
          }

          if (change.path.startsWith('messages') || change.path.startsWith('executionState')) {
            setChatState(system.getChatState())
          }
        }
      })

      // Subscribe to health updates
      const healthUnsubscribe = system.onHealthUpdate((healthUpdate) => {
        setHealth(healthUpdate)
      })

      // Subscribe to alerts
      const alertUnsubscribe = system.onAlert((alert) => {
        setAlerts((prev) => {
          // Add new alert or update existing
          const existing = prev.find((a) => a.id === alert.id)
          if (existing) {
            return prev.map((a) => (a.id === alert.id ? alert : a))
          }
          return [...prev, alert]
        })
      })

      // Subscribe to sync events to update status
      const statusUnsubscribe = system.onEvent('ALL', () => {
        setStatus(system.getStatus())
        setConflicts(system.getActiveConflicts())
      })

      // Store unsubscribe functions
      subscriptionsRef.current.set('change', changeUnsubscribe)
      subscriptionsRef.current.set('health', healthUnsubscribe)
      subscriptionsRef.current.set('alert', alertUnsubscribe)
      subscriptionsRef.current.set('status', statusUnsubscribe)
    },
    [config.enableRealtimeSync]
  )

  // Cleanup system and subscriptions
  const cleanupSystem = useCallback(() => {
    // Clean up subscriptions
    for (const unsubscribe of subscriptionsRef.current) {
      unsubscribe()
    }
    subscriptionsRef.current.clear()

    // Destroy sync system
    if (syncSystemRef.current) {
      syncSystemRef.current.destroy()
      syncSystemRef.current = null
    }

    // Reset state
    setIsInitialized(false)
    setIsActive(false)
    setStatus(null)
    setHealth(null)
    setAlerts([])
    setConflicts([])

    logger.info('Sync system cleaned up')
  }, [])

  // Update visual state
  const updateVisualState = useCallback(
    (updates: Partial<WorkflowVisualState>) => {
      const system = syncSystemRef.current
      if (!system || !isActive) return

      try {
        system.updateVisualState(updates)

        if (config.enableRealtimeSync !== false) {
          setVisualState(system.getVisualState())
        }
      } catch (err) {
        logger.error('Failed to update visual state', { error: err })
        setError(err as Error)
      }
    },
    [isActive, config.enableRealtimeSync]
  )

  // Update chat state
  const updateChatState = useCallback(
    (updates: Partial<ChatWorkflowState>) => {
      const system = syncSystemRef.current
      if (!system || !isActive) return

      try {
        system.updateChatState(updates)

        if (config.enableRealtimeSync !== false) {
          setChatState(system.getChatState())
        }
      } catch (err) {
        logger.error('Failed to update chat state', { error: err })
        setError(err as Error)
      }
    },
    [isActive, config.enableRealtimeSync]
  )

  // Emit sync event
  const emitEvent = useCallback(
    async (
      type: string,
      payload: any,
      source: 'visual' | 'chat',
      options?: { immediate?: boolean }
    ) => {
      const system = syncSystemRef.current
      if (!system || !isActive) return

      try {
        await system.emitEvent(type as any, payload, source, options)
        setError(null) // Clear any previous errors
      } catch (err) {
        logger.error('Failed to emit sync event', { type, source, error: err })
        setError(err as Error)
      }
    },
    [isActive]
  )

  // Switch sync mode
  const switchMode = useCallback(
    (mode: 'visual' | 'chat' | 'hybrid') => {
      const system = syncSystemRef.current
      if (!system || !isActive) return

      try {
        system.switchMode(mode)
        setCurrentMode(mode)
        setError(null)
      } catch (err) {
        logger.error('Failed to switch sync mode', { mode, error: err })
        setError(err as Error)
      }
    },
    [isActive]
  )

  // Pause synchronization
  const pause = useCallback(() => {
    const system = syncSystemRef.current
    if (!system) return

    try {
      system.pause()
      setIsActive(false)
    } catch (err) {
      logger.error('Failed to pause sync system', { error: err })
      setError(err as Error)
    }
  }, [])

  // Resume synchronization
  const resume = useCallback(() => {
    const system = syncSystemRef.current
    if (!system) return

    try {
      system.resume()
      setIsActive(true)
    } catch (err) {
      logger.error('Failed to resume sync system', { error: err })
      setError(err as Error)
    }
  }, [])

  // Reset system
  const reset = useCallback(() => {
    const system = syncSystemRef.current
    if (!system) return

    try {
      system.reset()
      setVisualState(createEmptyVisualState())
      setChatState(createEmptyChatState())
      setAlerts([])
      setConflicts([])
      setStatus(system.getStatus())
      setError(null)
    } catch (err) {
      logger.error('Failed to reset sync system', { error: err })
      setError(err as Error)
    }
  }, [])

  // Force synchronization
  const forcSync = useCallback(async () => {
    const system = syncSystemRef.current
    if (!system || !isActive) return

    try {
      await system.forceSynchronization()
      setError(null)
    } catch (err) {
      logger.error('Failed to force synchronization', { error: err })
      setError(err as Error)
    }
  }, [isActive])

  // Resolve conflict
  const resolveConflict = useCallback((conflictId: string, response: UserPromptResponse) => {
    const system = syncSystemRef.current
    if (!system) return

    try {
      system.handleConflictResolution(conflictId, response)
      setError(null)
    } catch (err) {
      logger.error('Failed to resolve conflict', { conflictId, error: err })
      setError(err as Error)
    }
  }, [])

  // Event subscription handlers
  const onSyncEvent = useCallback(
    (eventType: string, handler: (event: SyncEvent) => void): (() => void) => {
      const system = syncSystemRef.current
      if (!system) return () => {}

      return system.onEvent(eventType as any, handler)
    },
    []
  )

  const onChange = useCallback((handler: (change: ChangeEvent) => void): (() => void) => {
    const system = syncSystemRef.current
    if (!system) return () => {}

    return system.onChange(handler)
  }, [])

  const onAlert = useCallback((handler: (alert: Alert) => void): (() => void) => {
    const system = syncSystemRef.current
    if (!system) return () => {}

    return system.onAlert(handler)
  }, [])

  const onHealthUpdate = useCallback((handler: (health: HealthMetrics) => void): (() => void) => {
    const system = syncSystemRef.current
    if (!system) return () => {}

    return system.onHealthUpdate(handler)
  }, [])

  // Return hook interface
  return {
    // System status
    isInitialized,
    isActive,
    status,
    error,

    // State
    visualState,
    chatState,
    updateVisualState,
    updateChatState,

    // Events
    emitEvent,

    // Mode control
    currentMode,
    switchMode,

    // Monitoring
    health,
    alerts,
    conflicts,

    // Control
    pause,
    resume,
    reset,
    forcSync,

    // Conflict resolution
    resolveConflict,

    // Event subscriptions
    onSyncEvent,
    onChange,
    onAlert,
    onHealthUpdate,
  }
}

/**
 * Hook for simplified sync system usage (visual mode only)
 */
export function useVisualSync(workflowId: string) {
  return useBidirectionalSync({
    workflowId,
    enableConflictResolution: false,
    enablePerformanceOptimization: true,
    enableMonitoring: false,
  })
}

/**
 * Hook for chat-only sync system usage
 */
export function useChatSync(workflowId: string) {
  const sync = useBidirectionalSync({
    workflowId,
    enableConflictResolution: false,
    enablePerformanceOptimization: true,
    enableMonitoring: false,
  })

  // Switch to chat mode on initialization
  useEffect(() => {
    if (sync.isInitialized) {
      sync.switchMode('chat')
    }
  }, [sync.isInitialized, sync.switchMode])

  return sync
}

/**
 * Hook for hybrid mode with full synchronization
 */
export function useHybridSync(workflowId: string) {
  const sync = useBidirectionalSync({
    workflowId,
    enableConflictResolution: true,
    enablePerformanceOptimization: true,
    enableMonitoring: true,
  })

  // Switch to hybrid mode on initialization
  useEffect(() => {
    if (sync.isInitialized) {
      sync.switchMode('hybrid')
    }
  }, [sync.isInitialized, sync.switchMode])

  return sync
}
