/**
 * Unified Copilot Hook
 *
 * Provides a convenient interface for managing unified copilot functionality,
 * including mode switching, preferences, and state management across both
 * external and local copilot systems.
 */

import { useCallback, useState, useEffect } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import { useLocalCopilotStore } from '@/stores/local-copilot'
import type { Agent } from '@/services/parlant/types'

const logger = createLogger('UnifiedCopilotHook')

// Persistent preferences key
const COPILOT_PREFERENCES_KEY = 'unified-copilot-preferences'

interface UnifiedCopilotPreferences {
  defaultMode: 'local' | 'external'
  autoSwitchToLocal: boolean
  rememberModeSelection: boolean
  preferredAgentId?: string
  lastUsedMode?: 'local' | 'external'
}

const DEFAULT_PREFERENCES: UnifiedCopilotPreferences = {
  defaultMode: 'external',
  autoSwitchToLocal: false,
  rememberModeSelection: true,
}

/**
 * Hook for managing unified copilot functionality
 */
export function useUnifiedCopilot(workspaceId: string) {
  const [preferences, setPreferences] = useState<UnifiedCopilotPreferences>(DEFAULT_PREFERENCES)
  const [currentMode, setCurrentMode] = useState<'local' | 'external'>(preferences.defaultMode)
  const [isLoading, setIsLoading] = useState(true)

  // Local copilot store
  const {
    availableAgents,
    isLoadingAgents,
    selectedAgent,
    isInitialized: localInitialized,
    selectAgent: localSelectAgent,
    mode: localMode,
    setMode: setLocalMode,
  } = useLocalCopilotStore()

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const stored = localStorage.getItem(COPILOT_PREFERENCES_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as UnifiedCopilotPreferences
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed })

          // Set mode based on preferences
          if (parsed.rememberModeSelection && parsed.lastUsedMode) {
            setCurrentMode(parsed.lastUsedMode)
          } else {
            setCurrentMode(parsed.defaultMode)
          }
        }
      } catch (error) {
        logger.error('Failed to load copilot preferences', { error })
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [])

  // Save preferences when they change
  const updatePreferences = useCallback((updates: Partial<UnifiedCopilotPreferences>) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, ...updates }
      try {
        localStorage.setItem(COPILOT_PREFERENCES_KEY, JSON.stringify(newPrefs))
      } catch (error) {
        logger.error('Failed to save copilot preferences', { error })
      }
      return newPrefs
    })
  }, [])

  // Mode switching
  const switchMode = useCallback((mode: 'local' | 'external') => {
    logger.info('Switching copilot mode', { from: currentMode, to: mode })

    setCurrentMode(mode)
    setLocalMode(mode)

    // Update preferences
    if (preferences.rememberModeSelection) {
      updatePreferences({ lastUsedMode: mode })
    }
  }, [currentMode, preferences.rememberModeSelection, updatePreferences, setLocalMode])

  const switchToLocal = useCallback(() => switchMode('local'), [switchMode])
  const switchToExternal = useCallback(() => switchMode('external'), [switchMode])

  // Agent management
  const selectAgent = useCallback(async (agent: Agent) => {
    logger.info('Selecting agent via unified hook', { agentId: agent.id, agentName: agent.name })

    await localSelectAgent(agent)

    // Update preferred agent in preferences
    updatePreferences({ preferredAgentId: agent.id })

    // Auto-switch to local mode if configured
    if (preferences.autoSwitchToLocal && currentMode !== 'local') {
      switchToLocal()
    }
  }, [localSelectAgent, updatePreferences, preferences.autoSwitchToLocal, currentMode, switchToLocal])

  // Auto-selection logic
  useEffect(() => {
    if (
      localInitialized &&
      currentMode === 'local' &&
      !selectedAgent &&
      preferences.preferredAgentId &&
      availableAgents.length > 0
    ) {
      const preferredAgent = availableAgents.find(a => a.id === preferences.preferredAgentId)
      if (preferredAgent) {
        logger.info('Auto-selecting preferred agent', { agentId: preferredAgent.id })
        localSelectAgent(preferredAgent)
      }
    }
  }, [
    localInitialized,
    currentMode,
    selectedAgent,
    preferences.preferredAgentId,
    availableAgents,
    localSelectAgent,
  ])

  // Availability checks
  const isLocalAvailable = availableAgents.length > 0 && !isLoadingAgents && localInitialized
  const isExternalAvailable = true // Always available

  // Mode recommendations
  const getRecommendedMode = useCallback(() => {
    if (preferences.autoSwitchToLocal && isLocalAvailable) {
      return 'local'
    }
    return preferences.defaultMode
  }, [preferences.autoSwitchToLocal, preferences.defaultMode, isLocalAvailable])

  // Statistics
  const getStats = useCallback(() => {
    return {
      availableLocalAgents: availableAgents.length,
      selectedLocalAgent: selectedAgent?.name,
      currentMode,
      isLocalAvailable,
      isExternalAvailable,
      lastUsedMode: preferences.lastUsedMode,
    }
  }, [
    availableAgents.length,
    selectedAgent?.name,
    currentMode,
    isLocalAvailable,
    isExternalAvailable,
    preferences.lastUsedMode,
  ])

  return {
    // Current state
    currentMode,
    preferences,
    isLoading,

    // Availability
    isLocalAvailable,
    isExternalAvailable,

    // Local copilot state
    availableAgents,
    selectedAgent,
    isLoadingAgents,
    localInitialized,

    // Actions
    switchMode,
    switchToLocal,
    switchToExternal,
    selectAgent,
    updatePreferences,

    // Utilities
    getRecommendedMode,
    getStats,
  }
}

/**
 * Hook for workspace-specific copilot configuration
 */
export function useWorkspaceCopilotConfig(workspaceId: string) {
  // TODO: Implement workspace-specific configuration
  // This could include:
  // - Workspace-level mode preferences
  // - Available agent restrictions
  // - Tool access policies
  // - Usage analytics

  return {
    allowModeSwitch: true, // TODO: Make configurable
    defaultMode: 'external' as const, // TODO: Make configurable
    allowedModes: ['local', 'external'] as const, // TODO: Make configurable
  }
}

/**
 * Simple hook for components that just need mode switching
 */
export function useCopilotModeSwitch() {
  const { mode: localMode, setMode } = useLocalCopilotStore()

  const switchToLocal = useCallback(() => setMode('local'), [setMode])
  const switchToExternal = useCallback(() => setMode('external'), [setMode])

  return {
    currentMode: localMode,
    switchToLocal,
    switchToExternal,
    isLocal: localMode === 'local',
    isExternal: localMode === 'external',
  }
}