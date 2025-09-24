/**
 * Types for Parlant Agent Management Store
 * Defines the data structures and interfaces for managing conversational AI agents
 */

export interface ParlantAgent {
  id: string
  name: string
  description: string
  workspaceId: string
  createdBy: string
  createdAt: string
  updatedAt: string
  status: 'active' | 'inactive' | 'error' | 'training'
  lastActiveAt?: string
  conversationCount: number
  configuration: AgentConfiguration
  guidelines: Guideline[]
  journeys: Journey[]
  metadata: Record<string, any>
}

export interface AgentConfiguration {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  toolsEnabled: boolean
  availableTools: string[]
  knowledgeBaseIds: string[]
  responseFormat: 'text' | 'json' | 'markdown'
  personality: {
    tone: 'professional' | 'casual' | 'friendly' | 'formal'
    verbosity: 'concise' | 'detailed' | 'comprehensive'
    style: string
  }
}

export interface Guideline {
  id: string
  title: string
  description: string
  content: string
  priority: 'high' | 'medium' | 'low'
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface Journey {
  id: string
  name: string
  description: string
  states: JourneyState[]
  triggers: JourneyTrigger[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface JourneyState {
  id: string
  name: string
  description: string
  actions: JourneyAction[]
  transitions: JourneyTransition[]
}

export interface JourneyAction {
  type: 'message' | 'tool_call' | 'wait' | 'condition'
  config: Record<string, any>
}

export interface JourneyTransition {
  to: string
  condition?: string
  trigger?: string
}

export interface JourneyTrigger {
  type: 'message' | 'event' | 'condition'
  config: Record<string, any>
}

export interface AgentStats {
  totalConversations: number
  activeConversations: number
  averageResponseTime: number
  successRate: number
  userSatisfactionScore: number
  toolUsageStats: Record<string, number>
  topIntents: string[]
}

export interface CreateAgentRequest {
  name: string
  description: string
  configuration: Partial<AgentConfiguration>
  guidelines?: Partial<Guideline>[]
  journeys?: Partial<Journey>[]
}

export interface UpdateAgentRequest {
  name?: string
  description?: string
  configuration?: Partial<AgentConfiguration>
  status?: ParlantAgent['status']
  guidelines?: Partial<Guideline>[]
  journeys?: Partial<Journey>[]
}

export interface AgentFilters {
  status?: ParlantAgent['status'][]
  createdBy?: string[]
  searchTerm?: string
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastActiveAt' | 'conversationCount'
  sortOrder?: 'asc' | 'desc'
}

export interface AgentManagementStore {
  // State
  agents: ParlantAgent[]
  selectedAgent: ParlantAgent | null
  agentStats: Record<string, AgentStats>
  filters: AgentFilters
  isLoading: boolean
  error: string | null

  // Loading states for individual operations
  isCreatingAgent: boolean
  isUpdatingAgent: boolean
  isDeletingAgent: boolean
  isLoadingStats: boolean

  // Actions
  loadAgents: (workspaceId: string, force?: boolean) => Promise<void>
  createAgent: (agentData: CreateAgentRequest) => Promise<ParlantAgent>
  updateAgent: (agentId: string, updates: UpdateAgentRequest) => Promise<ParlantAgent>
  deleteAgent: (agentId: string) => Promise<void>
  selectAgent: (agent: ParlantAgent | null) => void

  // Guidelines management
  addGuideline: (agentId: string, guideline: Omit<Guideline, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Guideline>
  updateGuideline: (agentId: string, guidelineId: string, updates: Partial<Guideline>) => Promise<Guideline>
  deleteGuideline: (agentId: string, guidelineId: string) => Promise<void>

  // Journey management
  addJourney: (agentId: string, journey: Omit<Journey, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Journey>
  updateJourney: (agentId: string, journeyId: string, updates: Partial<Journey>) => Promise<Journey>
  deleteJourney: (agentId: string, journeyId: string) => Promise<void>

  // Stats and monitoring
  loadAgentStats: (agentId: string) => Promise<AgentStats>
  refreshAgentStats: (agentId: string) => Promise<AgentStats>

  // Filters and search
  setFilters: (filters: Partial<AgentFilters>) => void
  clearFilters: () => void

  // Utility actions
  clearError: () => void
  reset: () => void
}

export interface AgentApiResponse<T = any> {
  data: T
  message?: string
  pagination?: {
    total: number
    page: number
    limit: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface AgentApiError {
  error: string
  code?: string
  details?: Record<string, any>
}