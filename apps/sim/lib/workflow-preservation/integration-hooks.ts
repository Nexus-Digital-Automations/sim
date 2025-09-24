/**
 * Workflow Preservation Integration Hooks
 *
 * React hooks and utilities for integrating the preservation system
 * with the existing ReactFlow workflow components
 *
 * Features:
 * - React hooks for preservation state
 * - Real-time validation monitoring
 * - Mode switching utilities
 * - Error handling and recovery
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import { WorkflowPreservationAPI, type WorkflowMode } from './index'
import type { WorkflowState } from '@/stores/workflows/workflow/types'

const logger = createLogger('PreservationHooks')

/**
 * Hook for workflow preservation state
 */
export function useWorkflowPreservation(workflowId: string) {
  const [preservationState, setPreservationState] = useState<any>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize preservation when workflow ID changes
  useEffect(() => {
    if (!workflowId) {
      setIsInitialized(false)
      setPreservationState(null)
      return
    }

    const existingState = WorkflowPreservationAPI.getPreservationStatus(workflowId)
    if (existingState.preservationState) {
      setPreservationState(existingState.preservationState)
      setIsInitialized(true)
    } else {
      setIsInitialized(false)
    }
  }, [workflowId])

  const initializePreservation = useCallback(async (workflow: WorkflowState) => {
    try {
      setError(null)
      const result = await WorkflowPreservationAPI.initializePreservation(workflowId, workflow)
      setPreservationState(result.preservationState)
      setIsInitialized(true)

      logger.info('Preservation initialized', { workflowId })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize preservation'
      setError(errorMessage)
      logger.error('Failed to initialize preservation', { workflowId, error: err })
    }
  }, [workflowId])

  return {
    preservationState,
    isInitialized,
    error,
    initializePreservation
  }
}

/**
 * Hook for mode switching between visual and conversational
 */
export function useModeSwitch(workflowId: string) {
  const [currentMode, setCurrentMode] = useState<WorkflowMode>('visual')
  const [isSwitching, setIsSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)

  // Get current mode from coexistence state
  useEffect(() => {
    const status = WorkflowPreservationAPI.getPreservationStatus(workflowId)
    if (status.coexistenceState) {
      setCurrentMode(status.coexistenceState.mode.current)
    }
  }, [workflowId])

  const switchMode = useCallback(async (targetMode: WorkflowMode, userId?: string) => {
    if (isSwitching) return

    setIsSwitching(true)
    setSwitchError(null)

    try {
      const result = await WorkflowPreservationAPI.switchMode(workflowId, targetMode, userId)

      if (result.success) {
        setCurrentMode(targetMode)
        logger.info('Mode switched successfully', {
          workflowId,
          fromMode: result.details.fromMode,
          toMode: targetMode
        })
      } else {
        setSwitchError(result.error || 'Mode switch failed')
        logger.error('Mode switch failed', { workflowId, targetMode, error: result.error })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mode switch failed'
      setSwitchError(errorMessage)
      logger.error('Mode switch error', { workflowId, targetMode, error: err })
    } finally {
      setIsSwitching(false)
    }
  }, [workflowId, isSwitching])

  return {
    currentMode,
    isSwitching,
    switchError,
    switchMode
  }
}

/**
 * Hook for continuous preservation validation
 */
export function usePreservationValidation(workflowId: string, workflow: WorkflowState | null, enabled = true) {
  const [validationResult, setValidationResult] = useState<any>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [lastValidated, setLastValidated] = useState<Date | null>(null)

  const validatePreservation = useCallback(async () => {
    if (!workflow || !enabled || isValidating) return

    setIsValidating(true)
    try {
      const result = await WorkflowPreservationAPI.validatePreservation(workflowId, workflow)
      setValidationResult(result)
      setLastValidated(new Date())

      if (!result.success) {
        logger.warn('Preservation validation failed', {
          workflowId,
          error: result.error
        })
      }
    } catch (err) {
      logger.error('Validation error', { workflowId, error: err })
    } finally {
      setIsValidating(false)
    }
  }, [workflowId, workflow, enabled, isValidating])

  // Auto-validate when workflow changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      validatePreservation()
    }, 1000) // Debounce validation by 1 second

    return () => clearTimeout(debounceTimer)
  }, [validatePreservation])

  return {
    validationResult,
    isValidating,
    lastValidated,
    validatePreservation
  }
}

/**
 * Hook for rollback management
 */
export function useRollback(workflowId: string) {
  const [isRollbackAvailable, setIsRollbackAvailable] = useState(false)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const [rollbackError, setRollbackError] = useState<string | null>(null)
  const [checkpoints, setCheckpoints] = useState<string[]>([])

  // Check rollback availability
  useEffect(() => {
    const status = WorkflowPreservationAPI.getPreservationStatus(workflowId)
    const available = status.preservationState?.rollbackAvailable || false
    setIsRollbackAvailable(available)

    // Get available checkpoints
    if (status.migrationHistory) {
      const checkpointIds = status.migrationHistory
        .flatMap(m => m.details.checkpoints)
        .map(cp => cp.id)
      setCheckpoints(checkpointIds)
    }
  }, [workflowId])

  const createCheckpoint = useCallback(async (description: string) => {
    try {
      const checkpointId = await WorkflowPreservationAPI.createCheckpoint(workflowId, description)
      setCheckpoints(prev => [...prev, checkpointId])
      return checkpointId
    } catch (err) {
      logger.error('Failed to create checkpoint', { workflowId, error: err })
      throw err
    }
  }, [workflowId])

  const rollback = useCallback(async (checkpointId: string) => {
    if (isRollingBack) return

    setIsRollingBack(true)
    setRollbackError(null)

    try {
      const result = await WorkflowPreservationAPI.rollback(workflowId, checkpointId)

      if (result.success) {
        logger.info('Rollback successful', { workflowId, checkpointId })
      } else {
        setRollbackError(result.error || 'Rollback failed')
        logger.error('Rollback failed', { workflowId, checkpointId, error: result.error })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Rollback failed'
      setRollbackError(errorMessage)
      logger.error('Rollback error', { workflowId, checkpointId, error: err })
    } finally {
      setIsRollingBack(false)
    }
  }, [workflowId, isRollingBack])

  return {
    isRollbackAvailable,
    isRollingBack,
    rollbackError,
    checkpoints,
    createCheckpoint,
    rollback
  }
}

/**
 * Hook for safety checking before modifications
 */
export function useSafetyCheck(workflowId: string) {
  const [safetyStatus, setSafetyStatus] = useState<{
    safe: boolean
    reasons: string[]
    recommendations: string[]
  }>({ safe: true, reasons: [], recommendations: [] })
  const [isChecking, setIsChecking] = useState(false)

  const checkSafety = useCallback(async () => {
    setIsChecking(true)
    try {
      const result = await WorkflowPreservationAPI.isSafeForModification(workflowId)
      setSafetyStatus(result)
    } catch (err) {
      logger.error('Safety check failed', { workflowId, error: err })
      setSafetyStatus({
        safe: false,
        reasons: ['Safety check failed'],
        recommendations: ['Contact support']
      })
    } finally {
      setIsChecking(false)
    }
  }, [workflowId])

  return {
    safetyStatus,
    isChecking,
    checkSafety
  }
}

/**
 * Comprehensive preservation status hook
 */
export function usePreservationStatus(workflowId: string) {
  const preservation = useWorkflowPreservation(workflowId)
  const modeSwitch = useModeSwitch(workflowId)
  const rollback = useRollback(workflowId)
  const safety = useSafetyCheck(workflowId)

  const status = useMemo(() => {
    const preservationStatus = WorkflowPreservationAPI.getPreservationStatus(workflowId)

    return {
      isInitialized: preservation.isInitialized,
      currentMode: modeSwitch.currentMode,
      isRollbackAvailable: rollback.isRollbackAvailable,
      isSafe: safety.safetyStatus.safe,
      hasErrors: !!(preservation.error || modeSwitch.switchError || rollback.rollbackError),
      preservationState: preservationStatus.preservationState,
      coexistenceState: preservationStatus.coexistenceState,
      migrationHistory: preservationStatus.migrationHistory,
      testResults: preservationStatus.testResults
    }
  }, [
    workflowId,
    preservation.isInitialized,
    preservation.error,
    modeSwitch.currentMode,
    modeSwitch.switchError,
    rollback.isRollbackAvailable,
    rollback.rollbackError,
    safety.safetyStatus.safe
  ])

  return {
    status,
    preservation,
    modeSwitch,
    rollback,
    safety
  }
}

/**
 * Higher-order component for automatic preservation
 */
export function withWorkflowPreservation<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function PreservationWrappedComponent(props: P & { workflowId: string; workflow?: WorkflowState }) {
    const { preservation } = usePreservationStatus(props.workflowId)

    // Auto-initialize preservation if not already initialized
    useEffect(() => {
      if (props.workflow && !preservation.isInitialized && !preservation.error) {
        preservation.initializePreservation(props.workflow)
      }
    }, [props.workflow, preservation])

    return <WrappedComponent {...props} />
  }
}

/**
 * Context for preservation system
 */
export const PreservationContext = React.createContext<{
  workflowId?: string
  preservationAPI: typeof WorkflowPreservationAPI
}>({
  preservationAPI: WorkflowPreservationAPI
})

/**
 * Provider for preservation context
 */
export function PreservationProvider({
  children,
  workflowId
}: {
  children: React.ReactNode
  workflowId?: string
}) {
  const contextValue = useMemo(() => ({
    workflowId,
    preservationAPI: WorkflowPreservationAPI
  }), [workflowId])

  return (
    <PreservationContext.Provider value={contextValue}>
      {children}
    </PreservationContext.Provider>
  )
}

/**
 * Hook to use preservation context
 */
export function usePreservationContext() {
  const context = React.useContext(PreservationContext)
  if (!context) {
    throw new Error('usePreservationContext must be used within PreservationProvider')
  }
  return context
}