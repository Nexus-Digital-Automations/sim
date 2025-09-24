/**
 * Chat Configuration Hooks
 *
 * This module provides React hooks for managing chat widget configuration,
 * including persisted settings, environment-specific configs, and runtime updates.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import {
  DEFAULT_WIDGET_CONFIG,
  getEnvironmentConfig,
  mergeWithDefaults,
  validateWidgetConfig,
} from '../config/widget-config'
import type { SimChatTheme, SimChatWidgetConfig } from '../types/parlant-widget.types'

const logger = createLogger('useChatConfig')

interface ChatConfigOptions {
  /**
   * Workspace ID for configuration isolation
   */
  workspaceId: string

  /**
   * Whether to persist configuration changes to localStorage
   */
  persist?: boolean

  /**
   * Configuration validation mode
   */
  validateOnChange?: boolean

  /**
   * Auto-save configuration changes after delay
   */
  autoSave?: boolean

  /**
   * Auto-save delay in milliseconds
   */
  autoSaveDelay?: number
}

interface ChatConfigHook {
  config: SimChatWidgetConfig
  updateConfig: (updates: Partial<SimChatWidgetConfig>) => void
  resetConfig: () => void
  isValid: boolean
  validationErrors: string[]
  isDirty: boolean
  isSaving: boolean
  lastSaved: Date | null
  exportConfig: () => string
  importConfig: (configJson: string) => boolean
}

/**
 * Hook for managing chat widget configuration
 */
export function useChatConfig(
  initialConfig: Partial<SimChatWidgetConfig>,
  options: ChatConfigOptions
): ChatConfigHook {
  const {
    workspaceId,
    persist = true,
    validateOnChange = true,
    autoSave = true,
    autoSaveDelay = 1000,
  } = options

  // Build complete configuration
  const completeInitialConfig = useMemo(() => {
    const envConfig = getEnvironmentConfig()
    return mergeWithDefaults({
      ...envConfig,
      ...initialConfig,
      workspaceId,
    })
  }, [initialConfig, workspaceId])

  // State management
  const [config, setConfig] = useState<SimChatWidgetConfig>(completeInitialConfig)
  const [originalConfig, setOriginalConfig] = useState<SimChatWidgetConfig>(completeInitialConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Validation
  const validation = useMemo(() => {
    return validateOnChange ? validateWidgetConfig(config) : { isValid: true, errors: [] }
  }, [config, validateOnChange])

  // Dirty state
  const isDirty = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(originalConfig)
  }, [config, originalConfig])

  // Load persisted configuration on mount
  useEffect(() => {
    if (!persist) return

    const persistedConfig = loadPersistedConfig(workspaceId)
    if (persistedConfig) {
      const merged = mergeWithDefaults({
        ...completeInitialConfig,
        ...persistedConfig,
      })
      setConfig(merged)
      setOriginalConfig(merged)
      logger.info('Loaded persisted chat configuration', { workspaceId })
    }
  }, [workspaceId, persist, completeInitialConfig])

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !isDirty || !validation.isValid) return

    const timeoutId = setTimeout(() => {
      saveConfig()
    }, autoSaveDelay)

    return () => clearTimeout(timeoutId)
  }, [config, isDirty, validation.isValid, autoSave, autoSaveDelay])

  // Save configuration
  const saveConfig = useCallback(async () => {
    if (!persist) return

    try {
      setIsSaving(true)
      await persistConfig(workspaceId, config)
      setOriginalConfig(config)
      setLastSaved(new Date())
      logger.info('Saved chat configuration', { workspaceId })
    } catch (error) {
      logger.error('Failed to save chat configuration', { error, workspaceId })
    } finally {
      setIsSaving(false)
    }
  }, [workspaceId, config, persist])

  // Update configuration
  const updateConfig = useCallback(
    (updates: Partial<SimChatWidgetConfig>) => {
      setConfig((prev) => {
        const updated = { ...prev, ...updates }

        // Deep merge theme if provided
        if (updates.theme) {
          updated.theme = { ...prev.theme, ...updates.theme }
        }

        // Deep merge branding if provided
        if (updates.branding) {
          updated.branding = { ...prev.branding, ...updates.branding }
        }

        logger.debug('Updated chat configuration', { updates, workspaceId })
        return updated
      })
    },
    [workspaceId]
  )

  // Reset configuration
  const resetConfig = useCallback(() => {
    setConfig(completeInitialConfig)
    if (persist) {
      clearPersistedConfig(workspaceId)
    }
    logger.info('Reset chat configuration', { workspaceId })
  }, [completeInitialConfig, persist, workspaceId])

  // Export configuration
  const exportConfig = useCallback(() => {
    return JSON.stringify(config, null, 2)
  }, [config])

  // Import configuration
  const importConfig = useCallback(
    (configJson: string) => {
      try {
        const importedConfig = JSON.parse(configJson)
        const merged = mergeWithDefaults(importedConfig)
        const validation = validateWidgetConfig(merged)

        if (!validation.isValid) {
          logger.warn('Invalid configuration import attempted', { errors: validation.errors })
          return false
        }

        setConfig(merged)
        logger.info('Imported chat configuration', { workspaceId })
        return true
      } catch (error) {
        logger.error('Failed to import configuration', { error, workspaceId })
        return false
      }
    },
    [workspaceId]
  )

  return {
    config,
    updateConfig,
    resetConfig,
    isValid: validation.isValid,
    validationErrors: validation.errors,
    isDirty,
    isSaving,
    lastSaved,
    exportConfig,
    importConfig,
  }
}

/**
 * Hook for managing theme configuration specifically
 */
export function useChatTheme(initialTheme: Partial<SimChatTheme>, workspaceId: string) {
  const [theme, setTheme] = useState<SimChatTheme>({
    ...DEFAULT_WIDGET_CONFIG.theme!,
    ...initialTheme,
  })

  // Update theme
  const updateTheme = useCallback((updates: Partial<SimChatTheme>) => {
    setTheme((prev) => ({ ...prev, ...updates }))
  }, [])

  // Reset theme
  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_WIDGET_CONFIG.theme!)
  }, [])

  // Theme presets
  const applyPreset = useCallback(
    (preset: 'light' | 'dark' | 'system') => {
      const presetThemes = {
        light: {
          primary: 'hsl(0 0% 11.2%)',
          secondary: 'hsl(0 0% 96.1%)',
          background: 'hsl(0 0% 100%)',
          foreground: 'hsl(0 0% 3.9%)',
        },
        dark: {
          primary: 'hsl(0 0% 98%)',
          secondary: 'hsl(0 0% 12.0%)',
          background: 'hsl(0 0% 3.9%)',
          foreground: 'hsl(0 0% 98%)',
        },
        system: {}, // Use CSS variables for system theme
      } as const

      updateTheme(presetThemes[preset])
    },
    [updateTheme]
  )

  return {
    theme,
    updateTheme,
    resetTheme,
    applyPreset,
  }
}

/**
 * Hook for managing agent configuration
 */
export function useAgentConfig(workspaceId: string) {
  const [agents, setAgents] = useState<
    Array<{
      id: string
      name: string
      description?: string
      isActive: boolean
    }>
  >([])

  const [isLoading, setIsLoading] = useState(false)

  // Load available agents
  const loadAgents = useCallback(async () => {
    if (!workspaceId) return

    try {
      setIsLoading(true)
      // This would typically fetch from your API
      const response = await fetch(`/api/workspaces/${workspaceId}/agents`)
      if (response.ok) {
        const agentsData = await response.json()
        setAgents(agentsData)
      }
    } catch (error) {
      logger.error('Failed to load agents', { error, workspaceId })
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  // Load agents on workspace change
  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  return {
    agents,
    isLoading,
    refreshAgents: loadAgents,
  }
}

// Helper functions

/**
 * Load persisted configuration from storage
 */
function loadPersistedConfig(workspaceId: string): Partial<SimChatWidgetConfig> | null {
  if (typeof window === 'undefined') return null

  try {
    const key = `sim-chat-config-${workspaceId}`
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    logger.warn('Failed to load persisted config', { error, workspaceId })
    return null
  }
}

/**
 * Persist configuration to storage
 */
async function persistConfig(workspaceId: string, config: SimChatWidgetConfig): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const key = `sim-chat-config-${workspaceId}`

    // Don't persist sensitive information
    const configToPersist = {
      ...config,
      // Remove sensitive fields
      userId: undefined,
      apiKey: undefined,
    }

    localStorage.setItem(key, JSON.stringify(configToPersist))
  } catch (error) {
    logger.error('Failed to persist config', { error, workspaceId })
    throw error
  }
}

/**
 * Clear persisted configuration
 */
function clearPersistedConfig(workspaceId: string): void {
  if (typeof window === 'undefined') return

  try {
    const key = `sim-chat-config-${workspaceId}`
    localStorage.removeItem(key)
  } catch (error) {
    logger.warn('Failed to clear persisted config', { error, workspaceId })
  }
}

export default useChatConfig
