/**
 * Dual-Mode Coexistence Manager
 *
 * Manages seamless coexistence between visual ReactFlow editor
 * and conversational Parlant interface without conflicts
 *
 * Key Principles:
 * 1. Visual mode is the default and primary interface
 * 2. Conversational mode is an optional enhancement layer
 * 3. Both modes can coexist without data conflicts
 * 4. Users can switch between modes freely
 * 5. All changes sync bidirectionally in real-time
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { WorkflowState } from '@/stores/workflows/workflow/types'
import { workflowPreservationSystem } from './compatibility-layer'

const logger = createLogger('CoexistenceManager')

export type WorkflowMode = 'visual' | 'conversational' | 'hybrid'

export interface ModeState {
  current: WorkflowMode
  available: WorkflowMode[]
  preferences: UserModePreferences
  restrictions: ModeRestriction[]
}

export interface UserModePreferences {
  defaultMode: WorkflowMode
  allowModeSwitch: boolean
  showModeIndicators: boolean
  autoSyncEnabled: boolean
}

export interface ModeRestriction {
  mode: WorkflowMode
  reason: string
  temporary: boolean
  canOverride: boolean
}

export interface CoexistenceState {
  workflowId: string
  mode: ModeState
  visualState: WorkflowState
  conversationalContext: ConversationalContext
  syncStatus: SyncStatus
  lastActivity: ModeActivity
}

export interface ConversationalContext {
  isActive: boolean
  sessionId?: string
  agentId?: string
  journeyId?: string
  contextData: Record<string, any>
}

export interface SyncStatus {
  isInSync: boolean
  lastSyncTime: Date
  pendingChanges: PendingChange[]
  conflictCount: number
}

export interface PendingChange {
  id: string
  source: WorkflowMode
  type: 'block-add' | 'block-update' | 'block-delete' | 'edge-add' | 'edge-update' | 'edge-delete'
  data: any
  timestamp: Date
}

export interface ModeActivity {
  mode: WorkflowMode
  action: string
  timestamp: Date
  userId?: string
}

/**
 * Coexistence Manager
 *
 * Orchestrates the coexistence of visual and conversational modes
 */
export class CoexistenceManager {
  private coexistenceStates = new Map<string, CoexistenceState>()
  private defaultPreferences: UserModePreferences = {
    defaultMode: 'visual',
    allowModeSwitch: true,
    showModeIndicators: true,
    autoSyncEnabled: true,
  }

  /**
   * Initialize coexistence for a workflow
   */
  initializeCoexistence(workflowId: string, initialWorkflow: WorkflowState): CoexistenceState {
    // Create preservation state first
    workflowPreservationSystem.createPreservationState(workflowId, initialWorkflow)

    const coexistenceState: CoexistenceState = {
      workflowId,
      mode: {
        current: 'visual',
        available: ['visual', 'conversational', 'hybrid'],
        preferences: this.defaultPreferences,
        restrictions: [],
      },
      visualState: this.deepClone(initialWorkflow),
      conversationalContext: {
        isActive: false,
        contextData: {},
      },
      syncStatus: {
        isInSync: true,
        lastSyncTime: new Date(),
        pendingChanges: [],
        conflictCount: 0,
      },
      lastActivity: {
        mode: 'visual',
        action: 'initialized',
        timestamp: new Date(),
      },
    }

    this.coexistenceStates.set(workflowId, coexistenceState)

    logger.info('Coexistence initialized', {
      workflowId,
      mode: coexistenceState.mode.current,
      blockCount: Object.keys(initialWorkflow.blocks).length,
    })

    return coexistenceState
  }

  /**
   * Switch between visual and conversational modes
   */
  async switchMode(
    workflowId: string,
    targetMode: WorkflowMode,
    userId?: string
  ): Promise<ModeSwitchResult> {
    const state = this.coexistenceStates.get(workflowId)
    if (!state) {
      return {
        success: false,
        error: 'Workflow not found',
        details: { workflowId },
      }
    }

    // Check if mode switch is allowed
    const canSwitch = this.canSwitchMode(state, targetMode)
    if (!canSwitch.allowed) {
      return {
        success: false,
        error: canSwitch.reason,
        details: { workflowId, targetMode, restrictions: canSwitch.restrictions },
      }
    }

    try {
      // Sync current state before switch
      await this.syncStates(workflowId)

      const previousMode = state.mode.current

      // Update mode state
      state.mode.current = targetMode
      state.lastActivity = {
        mode: targetMode,
        action: `switched from ${previousMode}`,
        timestamp: new Date(),
        userId,
      }

      // Initialize conversational context if switching to conversational mode
      if (targetMode === 'conversational' || targetMode === 'hybrid') {
        await this.initializeConversationalMode(state)
      }

      // Deactivate conversational context if switching to visual-only
      if (targetMode === 'visual') {
        await this.deactivateConversationalMode(state)
      }

      logger.info('Mode switched successfully', {
        workflowId,
        fromMode: previousMode,
        toMode: targetMode,
        userId,
      })

      return {
        success: true,
        details: {
          workflowId,
          fromMode: previousMode,
          toMode: targetMode,
          timestamp: new Date(),
        },
      }
    } catch (error) {
      logger.error('Mode switch failed', {
        workflowId,
        targetMode,
        error,
      })

      return {
        success: false,
        error: 'Mode switch failed',
        details: {
          workflowId,
          targetMode,
          error: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  /**
   * Handle workflow changes from visual mode
   */
  async handleVisualChange(workflowId: string, changeType: string, changeData: any): Promise<void> {
    const state = this.coexistenceStates.get(workflowId)
    if (!state) {
      logger.warn('Visual change received for unknown workflow', { workflowId })
      return
    }

    // Update visual state
    await this.applyVisualChange(state, changeType, changeData)

    // Record activity
    state.lastActivity = {
      mode: 'visual',
      action: changeType,
      timestamp: new Date(),
    }

    // Sync to conversational mode if active
    if (state.conversationalContext.isActive) {
      await this.syncVisualToConversational(state, changeType, changeData)
    }

    // Validate preservation
    const validation = await workflowPreservationSystem.validatePreservation(
      workflowId,
      state.visualState
    )
    if (!validation.success) {
      logger.warn('Visual change broke preservation', {
        workflowId,
        changeType,
        validationError: validation.error,
      })
    }
  }

  /**
   * Handle workflow changes from conversational mode
   */
  async handleConversationalChange(
    workflowId: string,
    changeType: string,
    changeData: any
  ): Promise<void> {
    const state = this.coexistenceStates.get(workflowId)
    if (!state) {
      logger.warn('Conversational change received for unknown workflow', { workflowId })
      return
    }

    if (!state.conversationalContext.isActive) {
      logger.warn('Conversational change received but context not active', { workflowId })
      return
    }

    // Record pending change
    const pendingChange: PendingChange = {
      id: crypto.randomUUID(),
      source: 'conversational',
      type: changeType as any,
      data: changeData,
      timestamp: new Date(),
    }

    state.syncStatus.pendingChanges.push(pendingChange)

    // Record activity
    state.lastActivity = {
      mode: 'conversational',
      action: changeType,
      timestamp: new Date(),
    }

    // Apply change to visual state
    await this.syncConversationalToVisual(state, pendingChange)
  }

  /**
   * Sync states between modes
   */
  private async syncStates(workflowId: string): Promise<void> {
    const state = this.coexistenceStates.get(workflowId)
    if (!state || !state.mode.preferences.autoSyncEnabled) {
      return
    }

    try {
      // Process pending changes
      for (const change of state.syncStatus.pendingChanges) {
        if (change.source === 'conversational') {
          await this.syncConversationalToVisual(state, change)
        }
      }

      // Clear processed changes
      state.syncStatus.pendingChanges = []
      state.syncStatus.isInSync = true
      state.syncStatus.lastSyncTime = new Date()

      logger.debug('States synced successfully', {
        workflowId,
        timestamp: state.syncStatus.lastSyncTime,
      })
    } catch (error) {
      logger.error('State sync failed', { workflowId, error })
      state.syncStatus.isInSync = false
      state.syncStatus.conflictCount++
    }
  }

  /**
   * Initialize conversational mode for a workflow
   */
  private async initializeConversationalMode(state: CoexistenceState): Promise<void> {
    if (state.conversationalContext.isActive) {
      return
    }

    // Create session and agent context
    state.conversationalContext = {
      isActive: true,
      sessionId: crypto.randomUUID(),
      contextData: {
        workflowSnapshot: this.deepClone(state.visualState),
        initializationTime: new Date(),
        capabilities: [
          'block-creation',
          'block-modification',
          'edge-creation',
          'workflow-execution',
          'natural-language-interaction',
        ],
      },
    }

    logger.info('Conversational mode initialized', {
      workflowId: state.workflowId,
      sessionId: state.conversationalContext.sessionId,
    })
  }

  /**
   * Deactivate conversational mode
   */
  private async deactivateConversationalMode(state: CoexistenceState): Promise<void> {
    if (!state.conversationalContext.isActive) {
      return
    }

    // Sync any pending changes before deactivation
    if (state.syncStatus.pendingChanges.length > 0) {
      await this.syncStates(state.workflowId)
    }

    state.conversationalContext = {
      isActive: false,
      contextData: {},
    }

    logger.info('Conversational mode deactivated', {
      workflowId: state.workflowId,
    })
  }

  /**
   * Apply visual changes to state
   */
  private async applyVisualChange(
    state: CoexistenceState,
    changeType: string,
    changeData: any
  ): Promise<void> {
    switch (changeType) {
      case 'block-add':
        if (changeData.block) {
          state.visualState.blocks[changeData.block.id] = changeData.block
        }
        break

      case 'block-update':
        if (changeData.blockId && state.visualState.blocks[changeData.blockId]) {
          state.visualState.blocks[changeData.blockId] = {
            ...state.visualState.blocks[changeData.blockId],
            ...changeData.updates,
          }
        }
        break

      case 'block-delete':
        if (changeData.blockId && state.visualState.blocks[changeData.blockId]) {
          delete state.visualState.blocks[changeData.blockId]
        }
        break

      case 'edge-add':
        if (changeData.edge) {
          state.visualState.edges.push(changeData.edge)
        }
        break

      case 'edge-delete':
        if (changeData.edgeId) {
          state.visualState.edges = state.visualState.edges.filter(
            (edge) => edge.id !== changeData.edgeId
          )
        }
        break

      default:
        logger.debug('Unknown visual change type', { changeType, changeData })
    }
  }

  /**
   * Sync visual changes to conversational context
   */
  private async syncVisualToConversational(
    state: CoexistenceState,
    changeType: string,
    changeData: any
  ): Promise<void> {
    if (!state.conversationalContext.isActive) {
      return
    }

    // Update conversational context with visual change
    state.conversationalContext.contextData.lastVisualChange = {
      type: changeType,
      data: changeData,
      timestamp: new Date(),
    }

    logger.debug('Visual change synced to conversational context', {
      workflowId: state.workflowId,
      changeType,
    })
  }

  /**
   * Sync conversational changes to visual state
   */
  private async syncConversationalToVisual(
    state: CoexistenceState,
    change: PendingChange
  ): Promise<void> {
    try {
      await this.applyVisualChange(state, change.type, change.data)

      logger.debug('Conversational change synced to visual state', {
        workflowId: state.workflowId,
        changeType: change.type,
        changeId: change.id,
      })
    } catch (error) {
      logger.error('Failed to sync conversational change to visual', {
        workflowId: state.workflowId,
        changeId: change.id,
        error,
      })
      throw error
    }
  }

  /**
   * Check if mode switch is allowed
   */
  private canSwitchMode(
    state: CoexistenceState,
    targetMode: WorkflowMode
  ): {
    allowed: boolean
    reason?: string
    restrictions?: ModeRestriction[]
  } {
    if (!state.mode.preferences.allowModeSwitch) {
      return {
        allowed: false,
        reason: 'Mode switching disabled in preferences',
        restrictions: state.mode.restrictions,
      }
    }

    // Check for mode-specific restrictions
    const restrictions = state.mode.restrictions.filter((r) => r.mode === targetMode)
    if (restrictions.length > 0) {
      const blockingRestrictions = restrictions.filter((r) => !r.canOverride)
      if (blockingRestrictions.length > 0) {
        return {
          allowed: false,
          reason: `Mode ${targetMode} is restricted: ${blockingRestrictions[0].reason}`,
          restrictions: blockingRestrictions,
        }
      }
    }

    // Check if target mode is available
    if (!state.mode.available.includes(targetMode)) {
      return {
        allowed: false,
        reason: `Mode ${targetMode} is not available`,
        restrictions: state.mode.restrictions,
      }
    }

    return { allowed: true }
  }

  /**
   * Get current coexistence state
   */
  getCoexistenceState(workflowId: string): CoexistenceState | undefined {
    return this.coexistenceStates.get(workflowId)
  }

  /**
   * Add mode restriction
   */
  addModeRestriction(workflowId: string, restriction: ModeRestriction): void {
    const state = this.coexistenceStates.get(workflowId)
    if (state) {
      state.mode.restrictions.push(restriction)
    }
  }

  /**
   * Remove mode restriction
   */
  removeModeRestriction(workflowId: string, mode: WorkflowMode, reason?: string): void {
    const state = this.coexistenceStates.get(workflowId)
    if (state) {
      state.mode.restrictions = state.mode.restrictions.filter(
        (r) => r.mode !== mode || (reason && r.reason !== reason)
      )
    }
  }

  /**
   * Update user preferences
   */
  updatePreferences(workflowId: string, preferences: Partial<UserModePreferences>): void {
    const state = this.coexistenceStates.get(workflowId)
    if (state) {
      state.mode.preferences = {
        ...state.mode.preferences,
        ...preferences,
      }
    }
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }
}

// Type definitions

export interface ModeSwitchResult {
  success: boolean
  error?: string
  details: {
    workflowId: string
    fromMode?: WorkflowMode
    toMode?: WorkflowMode
    timestamp?: Date
    restrictions?: ModeRestriction[]
    error?: string
  }
}

// Singleton instance
export const coexistenceManager = new CoexistenceManager()
