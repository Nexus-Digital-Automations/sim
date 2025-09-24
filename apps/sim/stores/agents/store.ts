import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createLogger } from '@/lib/logs/console/logger'
import type {
  AgentManagementStore,
  ParlantAgent,
  AgentStats,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentFilters,
  Guideline,
  Journey,
  AgentApiResponse,
  AgentApiError,
} from '@/stores/agents/types'

const logger = createLogger('AgentManagementStore')

const CACHE_TIMEOUT = 300000 // 5 minutes - agents can change frequently
const MAX_ERROR_RETRIES = 3

const DEFAULT_FILTERS: AgentFilters = {
  sortBy: 'updatedAt',
  sortOrder: 'desc',
}

export const useAgentManagementStore = create<AgentManagementStore>()(
  devtools(
    persist(
      (set, get) => {
        let lastLoadTime = 0
        let errorRetryCount = 0

        const handleApiError = (error: any, operation: string): string => {
          logger.error(`Error in ${operation}:`, error)

          if (error.response?.data?.error) {
            return error.response.data.error
          }

          if (error.message) {
            return error.message
          }

          return `Failed to ${operation}. Please try again.`
        }

        const buildApiUrl = (endpoint: string, workspaceId?: string): string => {
          const baseUrl = '/api/agents'
          if (workspaceId) {
            return `/api/workspaces/${workspaceId}/agents${endpoint ? `/${endpoint}` : ''}`
          }
          return `${baseUrl}${endpoint ? `/${endpoint}` : ''}`
        }

        return {
          // Initial state
          agents: [],
          selectedAgent: null,
          agentStats: {},
          filters: DEFAULT_FILTERS,
          isLoading: false,
          error: null,
          isCreatingAgent: false,
          isUpdatingAgent: false,
          isDeletingAgent: false,
          isLoadingStats: false,

          // Load agents
          loadAgents: async (workspaceId: string, force = false) => {
            const now = Date.now()

            // Skip loading if recently loaded and not forced
            if (!force && now - lastLoadTime < CACHE_TIMEOUT) {
              logger.debug('Skipping agents load - recently loaded')
              return
            }

            try {
              set({ isLoading: true, error: null })

              const response = await fetch(buildApiUrl('', workspaceId))

              if (!response.ok) {
                const errorData: AgentApiError = await response.json()
                throw new Error(errorData.error || 'Failed to load agents')
              }

              const result: AgentApiResponse<ParlantAgent[]> = await response.json()

              set({
                agents: result.data,
                isLoading: false,
                error: null,
              })

              lastLoadTime = now
              errorRetryCount = 0

              logger.info(`Loaded ${result.data.length} agents for workspace ${workspaceId}`)
            } catch (error) {
              const errorMessage = handleApiError(error, 'load agents')
              set({
                error: errorMessage,
                isLoading: false,
              })

              // Retry logic for network errors
              if (errorRetryCount < MAX_ERROR_RETRIES && error instanceof TypeError) {
                errorRetryCount++
                logger.warn(`Retrying load agents (attempt ${errorRetryCount})`)
                setTimeout(() => get().loadAgents(workspaceId, force), 1000 * errorRetryCount)
              }
            }
          },

          // Create agent
          createAgent: async (agentData: CreateAgentRequest): Promise<ParlantAgent> => {
            if (get().isCreatingAgent) {
              throw new Error('Agent creation already in progress')
            }

            try {
              set({ isCreatingAgent: true, error: null })

              // Get workspace ID from current context or URL
              const workspaceId = typeof window !== 'undefined'
                ? window.location.pathname.split('/workspace/')[1]?.split('/')[0]
                : ''

              if (!workspaceId) {
                throw new Error('Workspace context not found')
              }

              const response = await fetch(buildApiUrl('', workspaceId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(agentData),
              })

              if (!response.ok) {
                const errorData: AgentApiError = await response.json()
                throw new Error(errorData.error || 'Failed to create agent')
              }

              const result: AgentApiResponse<ParlantAgent> = await response.json()
              const newAgent = result.data

              // Add to local state
              set(state => ({
                agents: [...state.agents, newAgent],
                selectedAgent: newAgent,
                isCreatingAgent: false,
              }))

              logger.info(`Created agent: ${newAgent.name} (${newAgent.id})`)
              return newAgent
            } catch (error) {
              const errorMessage = handleApiError(error, 'create agent')
              set({
                error: errorMessage,
                isCreatingAgent: false,
              })
              throw new Error(errorMessage)
            }
          },

          // Update agent
          updateAgent: async (agentId: string, updates: UpdateAgentRequest): Promise<ParlantAgent> => {
            if (get().isUpdatingAgent) {
              throw new Error('Agent update already in progress')
            }

            try {
              set({ isUpdatingAgent: true, error: null })

              const workspaceId = typeof window !== 'undefined'
                ? window.location.pathname.split('/workspace/')[1]?.split('/')[0]
                : ''

              const response = await fetch(buildApiUrl(agentId, workspaceId), {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
              })

              if (!response.ok) {
                const errorData: AgentApiError = await response.json()
                throw new Error(errorData.error || 'Failed to update agent')
              }

              const result: AgentApiResponse<ParlantAgent> = await response.json()
              const updatedAgent = result.data

              // Update local state
              set(state => ({
                agents: state.agents.map(agent =>
                  agent.id === agentId ? updatedAgent : agent
                ),
                selectedAgent: state.selectedAgent?.id === agentId ? updatedAgent : state.selectedAgent,
                isUpdatingAgent: false,
              }))

              logger.info(`Updated agent: ${updatedAgent.name} (${updatedAgent.id})`)
              return updatedAgent
            } catch (error) {
              const errorMessage = handleApiError(error, 'update agent')
              set({
                error: errorMessage,
                isUpdatingAgent: false,
              })
              throw new Error(errorMessage)
            }
          },

          // Delete agent
          deleteAgent: async (agentId: string): Promise<void> => {
            if (get().isDeletingAgent) {
              throw new Error('Agent deletion already in progress')
            }

            try {
              set({ isDeletingAgent: true, error: null })

              const workspaceId = typeof window !== 'undefined'
                ? window.location.pathname.split('/workspace/')[1]?.split('/')[0]
                : ''

              const response = await fetch(buildApiUrl(agentId, workspaceId), {
                method: 'DELETE',
              })

              if (!response.ok) {
                const errorData: AgentApiError = await response.json()
                throw new Error(errorData.error || 'Failed to delete agent')
              }

              // Remove from local state
              set(state => ({
                agents: state.agents.filter(agent => agent.id !== agentId),
                selectedAgent: state.selectedAgent?.id === agentId ? null : state.selectedAgent,
                agentStats: Object.fromEntries(
                  Object.entries(state.agentStats).filter(([id]) => id !== agentId)
                ),
                isDeletingAgent: false,
              }))

              logger.info(`Deleted agent: ${agentId}`)
            } catch (error) {
              const errorMessage = handleApiError(error, 'delete agent')
              set({
                error: errorMessage,
                isDeletingAgent: false,
              })
              throw new Error(errorMessage)
            }
          },

          // Select agent
          selectAgent: (agent: ParlantAgent | null) => {
            set({ selectedAgent: agent })

            // Load stats when agent is selected
            if (agent) {
              get().loadAgentStats(agent.id).catch(error => {
                logger.error('Failed to load agent stats on selection:', error)
              })
            }
          },

          // Guideline management
          addGuideline: async (agentId: string, guideline: Omit<Guideline, 'id' | 'createdAt' | 'updatedAt'>): Promise<Guideline> => {
            try {
              const workspaceId = typeof window !== 'undefined'
                ? window.location.pathname.split('/workspace/')[1]?.split('/')[0]
                : ''

              const response = await fetch(buildApiUrl(`${agentId}/guidelines`, workspaceId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(guideline),
              })

              if (!response.ok) {
                const errorData: AgentApiError = await response.json()
                throw new Error(errorData.error || 'Failed to add guideline')
              }

              const result: AgentApiResponse<Guideline> = await response.json()
              const newGuideline = result.data

              // Update local state
              set(state => ({
                agents: state.agents.map(agent =>
                  agent.id === agentId
                    ? { ...agent, guidelines: [...agent.guidelines, newGuideline] }
                    : agent
                ),
                selectedAgent: state.selectedAgent?.id === agentId
                  ? { ...state.selectedAgent, guidelines: [...state.selectedAgent.guidelines, newGuideline] }
                  : state.selectedAgent,
              }))

              return newGuideline
            } catch (error) {
              const errorMessage = handleApiError(error, 'add guideline')
              set({ error: errorMessage })
              throw new Error(errorMessage)
            }
          },

          updateGuideline: async (agentId: string, guidelineId: string, updates: Partial<Guideline>): Promise<Guideline> => {
            try {
              const workspaceId = typeof window !== 'undefined'
                ? window.location.pathname.split('/workspace/')[1]?.split('/')[0]
                : ''

              const response = await fetch(buildApiUrl(`${agentId}/guidelines/${guidelineId}`, workspaceId), {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
              })

              if (!response.ok) {
                const errorData: AgentApiError = await response.json()
                throw new Error(errorData.error || 'Failed to update guideline')
              }

              const result: AgentApiResponse<Guideline> = await response.json()
              const updatedGuideline = result.data

              // Update local state
              set(state => ({
                agents: state.agents.map(agent =>
                  agent.id === agentId
                    ? {
                        ...agent,
                        guidelines: agent.guidelines.map(g =>
                          g.id === guidelineId ? updatedGuideline : g
                        ),
                      }
                    : agent
                ),
                selectedAgent: state.selectedAgent?.id === agentId
                  ? {
                      ...state.selectedAgent,
                      guidelines: state.selectedAgent.guidelines.map(g =>
                        g.id === guidelineId ? updatedGuideline : g
                      ),
                    }
                  : state.selectedAgent,
              }))

              return updatedGuideline
            } catch (error) {
              const errorMessage = handleApiError(error, 'update guideline')
              set({ error: errorMessage })
              throw new Error(errorMessage)
            }
          },

          deleteGuideline: async (agentId: string, guidelineId: string): Promise<void> => {
            try {
              const workspaceId = typeof window !== 'undefined'
                ? window.location.pathname.split('/workspace/')[1]?.split('/')[0]
                : ''

              const response = await fetch(buildApiUrl(`${agentId}/guidelines/${guidelineId}`, workspaceId), {
                method: 'DELETE',
              })

              if (!response.ok) {
                const errorData: AgentApiError = await response.json()
                throw new Error(errorData.error || 'Failed to delete guideline')
              }

              // Update local state
              set(state => ({
                agents: state.agents.map(agent =>
                  agent.id === agentId
                    ? {
                        ...agent,
                        guidelines: agent.guidelines.filter(g => g.id !== guidelineId),
                      }
                    : agent
                ),
                selectedAgent: state.selectedAgent?.id === agentId
                  ? {
                      ...state.selectedAgent,
                      guidelines: state.selectedAgent.guidelines.filter(g => g.id !== guidelineId),
                    }
                  : state.selectedAgent,
              }))
            } catch (error) {
              const errorMessage = handleApiError(error, 'delete guideline')
              set({ error: errorMessage })
              throw new Error(errorMessage)
            }
          },

          // Journey management (similar pattern to guidelines)
          addJourney: async (agentId: string, journey: Omit<Journey, 'id' | 'createdAt' | 'updatedAt'>): Promise<Journey> => {
            try {
              const workspaceId = typeof window !== 'undefined'
                ? window.location.pathname.split('/workspace/')[1]?.split('/')[0]
                : ''

              const response = await fetch(buildApiUrl(`${agentId}/journeys`, workspaceId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(journey),
              })

              if (!response.ok) {
                const errorData: AgentApiError = await response.json()
                throw new Error(errorData.error || 'Failed to add journey')
              }

              const result: AgentApiResponse<Journey> = await response.json()
              const newJourney = result.data

              // Update local state
              set(state => ({
                agents: state.agents.map(agent =>
                  agent.id === agentId
                    ? { ...agent, journeys: [...agent.journeys, newJourney] }
                    : agent
                ),
                selectedAgent: state.selectedAgent?.id === agentId
                  ? { ...state.selectedAgent, journeys: [...state.selectedAgent.journeys, newJourney] }
                  : state.selectedAgent,
              }))

              return newJourney
            } catch (error) {
              const errorMessage = handleApiError(error, 'add journey')
              set({ error: errorMessage })
              throw new Error(errorMessage)
            }
          },

          updateJourney: async (agentId: string, journeyId: string, updates: Partial<Journey>): Promise<Journey> => {
            try {
              const workspaceId = typeof window !== 'undefined'
                ? window.location.pathname.split('/workspace/')[1]?.split('/')[0]
                : ''

              const response = await fetch(buildApiUrl(`${agentId}/journeys/${journeyId}`, workspaceId), {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
              })

              if (!response.ok) {
                const errorData: AgentApiError = await response.json()
                throw new Error(errorData.error || 'Failed to update journey')
              }

              const result: AgentApiResponse<Journey> = await response.json()
              const updatedJourney = result.data

              // Update local state
              set(state => ({
                agents: state.agents.map(agent =>
                  agent.id === agentId
                    ? {
                        ...agent,
                        journeys: agent.journeys.map(j =>
                          j.id === journeyId ? updatedJourney : j
                        ),
                      }
                    : agent
                ),
                selectedAgent: state.selectedAgent?.id === agentId
                  ? {
                      ...state.selectedAgent,
                      journeys: state.selectedAgent.journeys.map(j =>
                        j.id === journeyId ? updatedJourney : j
                      ),
                    }
                  : state.selectedAgent,
              }))

              return updatedJourney
            } catch (error) {
              const errorMessage = handleApiError(error, 'update journey')
              set({ error: errorMessage })
              throw new Error(errorMessage)
            }
          },

          deleteJourney: async (agentId: string, journeyId: string): Promise<void> => {
            try {
              const workspaceId = typeof window !== 'undefined'
                ? window.location.pathname.split('/workspace/')[1]?.split('/')[0]
                : ''

              const response = await fetch(buildApiUrl(`${agentId}/journeys/${journeyId}`, workspaceId), {
                method: 'DELETE',
              })

              if (!response.ok) {
                const errorData: AgentApiError = await response.json()
                throw new Error(errorData.error || 'Failed to delete journey')
              }

              // Update local state
              set(state => ({
                agents: state.agents.map(agent =>
                  agent.id === agentId
                    ? {
                        ...agent,
                        journeys: agent.journeys.filter(j => j.id !== journeyId),
                      }
                    : agent
                ),
                selectedAgent: state.selectedAgent?.id === agentId
                  ? {
                      ...state.selectedAgent,
                      journeys: state.selectedAgent.journeys.filter(j => j.id !== journeyId),
                    }
                  : state.selectedAgent,
              }))
            } catch (error) {
              const errorMessage = handleApiError(error, 'delete journey')
              set({ error: errorMessage })
              throw new Error(errorMessage)
            }
          },

          // Stats loading
          loadAgentStats: async (agentId: string): Promise<AgentStats> => {
            try {
              set({ isLoadingStats: true })

              const workspaceId = typeof window !== 'undefined'
                ? window.location.pathname.split('/workspace/')[1]?.split('/')[0]
                : ''

              const response = await fetch(buildApiUrl(`${agentId}/stats`, workspaceId))

              if (!response.ok) {
                const errorData: AgentApiError = await response.json()
                throw new Error(errorData.error || 'Failed to load agent stats')
              }

              const result: AgentApiResponse<AgentStats> = await response.json()
              const stats = result.data

              set(state => ({
                agentStats: {
                  ...state.agentStats,
                  [agentId]: stats,
                },
                isLoadingStats: false,
              }))

              return stats
            } catch (error) {
              const errorMessage = handleApiError(error, 'load agent stats')
              set({
                error: errorMessage,
                isLoadingStats: false,
              })
              throw new Error(errorMessage)
            }
          },

          refreshAgentStats: async (agentId: string): Promise<AgentStats> => {
            return get().loadAgentStats(agentId)
          },

          // Filter management
          setFilters: (filters: Partial<AgentFilters>) => {
            set(state => ({
              filters: { ...state.filters, ...filters },
            }))
          },

          clearFilters: () => {
            set({ filters: DEFAULT_FILTERS })
          },

          // Utility actions
          clearError: () => {
            set({ error: null })
          },

          reset: () => {
            set({
              agents: [],
              selectedAgent: null,
              agentStats: {},
              filters: DEFAULT_FILTERS,
              isLoading: false,
              error: null,
              isCreatingAgent: false,
              isUpdatingAgent: false,
              isDeletingAgent: false,
              isLoadingStats: false,
            })
          },
        }
      },
      {
        name: 'agent-management-store',
        partialize: (state) => ({
          // Persist filters and selected agent ID, but not the full agents array
          filters: state.filters,
          selectedAgentId: state.selectedAgent?.id,
        }),
      }
    ),
    { name: 'agent-management-store' }
  )
)