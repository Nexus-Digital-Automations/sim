'use client'

import { useState, useEffect, useCallback } from 'react'
import { Agent } from '@/apps/sim/services/parlant/types'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('useAgentSelection')

interface AgentSelectionState {
  selectedAgent: Agent | null
  recentAgents: Agent[]
  favoriteAgents: Agent[]
  lastSelectionTime: number | null
  workspaceId: string | null
}

interface UseAgentSelectionOptions {
  workspaceId?: string
  persistToStorage?: boolean
  maxRecentAgents?: number
}

/**
 * useAgentSelection Hook
 *
 * Manages agent selection state, persistence, and user workflow.
 * Provides functionality for:
 * - Selecting and persisting agent choices
 * - Managing recent and favorite agents
 * - Cross-session persistence
 * - Workspace-scoped agent preferences
 */
export function useAgentSelection({
  workspaceId,
  persistToStorage = true,
  maxRecentAgents = 5
}: UseAgentSelectionOptions = {}) {
  const [state, setState] = useState<AgentSelectionState>({
    selectedAgent: null,
    recentAgents: [],
    favoriteAgents: [],
    lastSelectionTime: null,
    workspaceId: workspaceId || null
  })

  const [isLoading, setIsLoading] = useState(true)

  // Generate storage key based on workspace
  const getStorageKey = useCallback((key: string) => {
    return workspaceId ? `agent_selection_${workspaceId}_${key}` : `agent_selection_${key}`
  }, [workspaceId])

  // Load persisted state from localStorage
  const loadPersistedState = useCallback(() => {
    if (!persistToStorage || typeof window === 'undefined') return

    try {
      const keys = {
        selectedAgent: getStorageKey('selected'),
        recentAgents: getStorageKey('recent'),
        favoriteAgents: getStorageKey('favorites'),
        lastSelectionTime: getStorageKey('last_selection')
      }

      const selectedAgentData = localStorage.getItem(keys.selectedAgent)
      const recentAgentsData = localStorage.getItem(keys.recentAgents)
      const favoriteAgentsData = localStorage.getItem(keys.favoriteAgents)
      const lastSelectionData = localStorage.getItem(keys.lastSelectionTime)

      const newState: Partial<AgentSelectionState> = {}

      if (selectedAgentData) {
        try {
          newState.selectedAgent = JSON.parse(selectedAgentData)
        } catch (error) {
          logger.warn('Failed to parse selected agent data', { error })
        }
      }

      if (recentAgentsData) {
        try {
          newState.recentAgents = JSON.parse(recentAgentsData)
        } catch (error) {
          logger.warn('Failed to parse recent agents data', { error })
        }
      }

      if (favoriteAgentsData) {
        try {
          newState.favoriteAgents = JSON.parse(favoriteAgentsData)
        } catch (error) {
          logger.warn('Failed to parse favorite agents data', { error })
        }
      }

      if (lastSelectionData) {
        try {
          newState.lastSelectionTime = parseInt(lastSelectionData, 10)
        } catch (error) {
          logger.warn('Failed to parse last selection time', { error })
        }
      }

      setState(prev => ({
        ...prev,
        ...newState,
        workspaceId: workspaceId || null
      }))

      logger.info('Agent selection state loaded from storage', {
        hasSelectedAgent: !!newState.selectedAgent,
        recentCount: newState.recentAgents?.length || 0,
        favoritesCount: newState.favoriteAgents?.length || 0,
        workspaceId
      })

    } catch (error) {
      logger.error('Failed to load persisted agent selection state', { error })
    }
  }, [persistToStorage, getStorageKey, workspaceId])

  // Save state to localStorage
  const saveState = useCallback((stateToSave: AgentSelectionState) => {
    if (!persistToStorage || typeof window === 'undefined') return

    try {
      const keys = {
        selectedAgent: getStorageKey('selected'),
        recentAgents: getStorageKey('recent'),
        favoriteAgents: getStorageKey('favorites'),
        lastSelectionTime: getStorageKey('last_selection')
      }

      if (stateToSave.selectedAgent) {
        localStorage.setItem(keys.selectedAgent, JSON.stringify(stateToSave.selectedAgent))
      } else {
        localStorage.removeItem(keys.selectedAgent)
      }

      localStorage.setItem(keys.recentAgents, JSON.stringify(stateToSave.recentAgents))
      localStorage.setItem(keys.favoriteAgents, JSON.stringify(stateToSave.favoriteAgents))

      if (stateToSave.lastSelectionTime) {
        localStorage.setItem(keys.lastSelectionTime, stateToSave.lastSelectionTime.toString())
      } else {
        localStorage.removeItem(keys.lastSelectionTime)
      }

    } catch (error) {
      logger.error('Failed to save agent selection state', { error })
    }
  }, [persistToStorage, getStorageKey])

  // Initialize state on mount
  useEffect(() => {
    setIsLoading(true)
    loadPersistedState()
    setIsLoading(false)
  }, [loadPersistedState])

  // Save state whenever it changes
  useEffect(() => {
    if (!isLoading) {
      saveState(state)
    }
  }, [state, saveState, isLoading])

  // Select an agent
  const selectAgent = useCallback((agent: Agent) => {
    logger.info('Selecting agent', {
      agentId: agent.id,
      agentName: agent.name,
      workspaceId
    })

    setState(prevState => {
      // Add to recent agents (remove if already present, then add to front)
      const filteredRecent = prevState.recentAgents.filter(a => a.id !== agent.id)
      const newRecent = [agent, ...filteredRecent].slice(0, maxRecentAgents)

      return {
        ...prevState,
        selectedAgent: agent,
        recentAgents: newRecent,
        lastSelectionTime: Date.now()
      }
    })
  }, [workspaceId, maxRecentAgents])

  // Clear selection
  const clearSelection = useCallback(() => {
    logger.info('Clearing agent selection', { workspaceId })

    setState(prevState => ({
      ...prevState,
      selectedAgent: null,
      lastSelectionTime: null
    }))
  }, [workspaceId])

  // Add/remove agent from favorites
  const toggleFavorite = useCallback((agent: Agent) => {
    setState(prevState => {
      const isFavorite = prevState.favoriteAgents.some(a => a.id === agent.id)

      let newFavorites: Agent[]
      if (isFavorite) {
        newFavorites = prevState.favoriteAgents.filter(a => a.id !== agent.id)
        logger.info('Removed agent from favorites', {
          agentId: agent.id,
          agentName: agent.name
        })
      } else {
        newFavorites = [...prevState.favoriteAgents, agent]
        logger.info('Added agent to favorites', {
          agentId: agent.id,
          agentName: agent.name
        })
      }

      return {
        ...prevState,
        favoriteAgents: newFavorites
      }
    })
  }, [])

  // Check if agent is favorite
  const isFavorite = useCallback((agent: Agent) => {
    return state.favoriteAgents.some(a => a.id === agent.id)
  }, [state.favoriteAgents])

  // Get recent agents excluding currently selected
  const getRecentAgents = useCallback(() => {
    return state.recentAgents.filter(agent =>
      !state.selectedAgent || agent.id !== state.selectedAgent.id
    )
  }, [state.recentAgents, state.selectedAgent])

  // Clear all history
  const clearHistory = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      recentAgents: [],
      favoriteAgents: []
    }))

    logger.info('Cleared agent selection history', { workspaceId })
  }, [workspaceId])

  // Update agent data (useful when agent details change)
  const updateAgent = useCallback((updatedAgent: Agent) => {
    setState(prevState => {
      const updateAgentInList = (list: Agent[]) =>
        list.map(agent => agent.id === updatedAgent.id ? updatedAgent : agent)

      return {
        ...prevState,
        selectedAgent: prevState.selectedAgent?.id === updatedAgent.id
          ? updatedAgent
          : prevState.selectedAgent,
        recentAgents: updateAgentInList(prevState.recentAgents),
        favoriteAgents: updateAgentInList(prevState.favoriteAgents)
      }
    })

    logger.info('Updated agent data', {
      agentId: updatedAgent.id,
      agentName: updatedAgent.name
    })
  }, [])

  // Get selection timestamp as Date object
  const getLastSelectionDate = useCallback(() => {
    return state.lastSelectionTime ? new Date(state.lastSelectionTime) : null
  }, [state.lastSelectionTime])

  return {
    // State
    selectedAgent: state.selectedAgent,
    recentAgents: getRecentAgents(),
    favoriteAgents: state.favoriteAgents,
    lastSelectionTime: state.lastSelectionTime,
    workspaceId: state.workspaceId,
    isLoading,

    // Actions
    selectAgent,
    clearSelection,
    toggleFavorite,
    isFavorite,
    updateAgent,
    clearHistory,

    // Computed values
    hasSelection: !!state.selectedAgent,
    hasRecentAgents: getRecentAgents().length > 0,
    hasFavorites: state.favoriteAgents.length > 0,
    lastSelectionDate: getLastSelectionDate(),

    // Stats
    stats: {
      totalRecent: state.recentAgents.length,
      totalFavorites: state.favoriteAgents.length,
      daysSinceLastSelection: state.lastSelectionTime
        ? Math.floor((Date.now() - state.lastSelectionTime) / (1000 * 60 * 60 * 24))
        : null
    }
  }
}