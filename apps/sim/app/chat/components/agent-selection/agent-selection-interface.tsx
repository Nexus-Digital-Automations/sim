'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Lightbulb,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import type { Agent } from '@/apps/sim/services/parlant/types'
import { AgentCard } from './agent-card'
import { AgentProfileModal } from './agent-profile-modal'
import { AgentSearch } from './agent-search'

const logger = createLogger('AgentSelectionInterface')

interface AgentSelectionInterfaceProps {
  workspaceId: string
  onAgentSelect: (agent: Agent) => void
  selectedAgent?: Agent | null
  className?: string
  showRecommendations?: boolean
}

interface AgentMetrics {
  totalSessions: number
  avgResponseTime: number
  successRate: number
  rating: number
  popularity: number
  lastUsed?: string
  totalMessages: number
  averageSessionLength: number
  topTopics: string[]
  userFeedback: {
    positive: number
    neutral: number
    negative: number
  }
}

interface LoadingState {
  agents: boolean
  metrics: boolean
  recommendations: boolean
}

/**
 * AgentSelectionInterface Component
 *
 * Main component for agent selection and discovery.
 * Features:
 * - Agent search and filtering
 * - Recommendation system
 * - Agent profiles and metrics
 * - Workspace-scoped access
 * - Real-time updates
 */
export function AgentSelectionInterface({
  workspaceId,
  onAgentSelect,
  selectedAgent = null,
  className = '',
  showRecommendations = true,
}: AgentSelectionInterfaceProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([])
  const [recommendedAgents, setRecommendedAgents] = useState<Agent[]>([])
  const [agentMetrics, setAgentMetrics] = useState<Record<string, AgentMetrics>>({})
  const [profileAgent, setProfileAgent] = useState<Agent | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [loading, setLoading] = useState<LoadingState>({
    agents: true,
    metrics: false,
    recommendations: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch agents from API
  const fetchAgents = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, agents: true }))
      setError(null)

      logger.info('Fetching agents for workspace', { workspaceId })

      const response = await fetch(`/api/v1/agents?workspace_id=${workspaceId}&limit=100`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch agents' }))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const result = await response.json()
      const fetchedAgents = result.agents || result.data || []

      setAgents(fetchedAgents)
      setFilteredAgents(fetchedAgents)

      logger.info('Agents fetched successfully', {
        count: fetchedAgents.length,
        workspaceId,
      })

      // Fetch metrics for each agent (in background)
      if (fetchedAgents.length > 0) {
        fetchAgentMetrics(fetchedAgents)
      }

      // Generate recommendations
      if (showRecommendations) {
        generateRecommendations(fetchedAgents)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load agents'
      logger.error('Failed to fetch agents', { error: errorMessage, workspaceId })
      setError(errorMessage)
    } finally {
      setLoading((prev) => ({ ...prev, agents: false }))
    }
  }, [workspaceId, showRecommendations])

  // Fetch metrics for agents
  const fetchAgentMetrics = useCallback(async (agentsList: Agent[]) => {
    try {
      setLoading((prev) => ({ ...prev, metrics: true }))

      // In a real implementation, this would call a metrics API
      // For now, we'll generate mock metrics based on agent data
      const mockMetrics: Record<string, AgentMetrics> = {}

      agentsList.forEach((agent, index) => {
        const baseSessionCount = Math.floor(Math.random() * 1000) + 10
        const baseRating = 3 + Math.random() * 2

        mockMetrics[agent.id] = {
          totalSessions: baseSessionCount,
          avgResponseTime: Math.floor(Math.random() * 2000) + 500,
          successRate: Math.floor(85 + Math.random() * 15),
          rating: Math.round(baseRating * 10) / 10,
          popularity: baseSessionCount,
          lastUsed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          totalMessages: baseSessionCount * (Math.floor(Math.random() * 20) + 5),
          averageSessionLength: Math.floor(Math.random() * 30) + 5,
          topTopics: ['Support', 'Sales', 'Technical', 'General'].slice(
            0,
            Math.floor(Math.random() * 3) + 1
          ),
          userFeedback: {
            positive: Math.floor(Math.random() * 100) + 50,
            neutral: Math.floor(Math.random() * 30) + 10,
            negative: Math.floor(Math.random() * 20) + 5,
          },
        }
      })

      setAgentMetrics(mockMetrics)
      logger.info('Agent metrics fetched', { count: Object.keys(mockMetrics).length })
    } catch (error) {
      logger.error('Failed to fetch agent metrics', { error })
    } finally {
      setLoading((prev) => ({ ...prev, metrics: false }))
    }
  }, [])

  // Generate recommendations based on agent data and usage patterns
  const generateRecommendations = useCallback(async (agentsList: Agent[]) => {
    try {
      setLoading((prev) => ({ ...prev, recommendations: true }))

      // Mock recommendation logic
      // In a real implementation, this would consider:
      // - User's conversation history
      // - Agent performance metrics
      // - Workspace preferences
      // - Time of day, user context, etc.

      const recommendations = agentsList
        .filter((agent) => agent.status === 'active')
        .sort(() => Math.random() - 0.5) // Random for demo
        .slice(0, 3) // Top 3 recommendations

      setRecommendedAgents(recommendations)
      logger.info('Recommendations generated', { count: recommendations.length })
    } catch (error) {
      logger.error('Failed to generate recommendations', { error })
    } finally {
      setLoading((prev) => ({ ...prev, recommendations: false }))
    }
  }, [])

  // Initialize component
  useEffect(() => {
    if (workspaceId) {
      fetchAgents()
    }
  }, [workspaceId, fetchAgents, refreshKey])

  // Handle agent selection
  const handleAgentSelect = useCallback(
    (agent: Agent) => {
      logger.info('Agent selected', { agentId: agent.id, agentName: agent.name })
      onAgentSelect(agent)
    },
    [onAgentSelect]
  )

  // Handle viewing agent profile
  const handleViewProfile = useCallback((agent: Agent) => {
    setProfileAgent(agent)
    setIsProfileModalOpen(true)
  }, [])

  // Handle search and filtering
  const handleFilter = useCallback((filtered: Agent[]) => {
    setFilteredAgents(filtered)
  }, [])

  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    logger.info('Search performed', { searchTerm })
  }, [])

  // Refresh data
  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const isRecommended = useCallback(
    (agent: Agent) => {
      return recommendedAgents.some((rec) => rec.id === agent.id)
    },
    [recommendedAgents]
  )

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription className='flex items-center justify-between'>
            <span>{error}</span>
            <Button variant='outline' size='sm' onClick={handleRefresh} className='ml-4'>
              <RefreshCw className='mr-2 h-4 w-4' />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='flex items-center space-x-2 font-bold text-2xl'>
              <Bot className='h-6 w-6' />
              <span>Select an Agent</span>
            </h2>
            <p className='mt-1 text-muted-foreground'>
              Choose an AI agent to help with your conversation
            </p>
          </div>

          <Button
            variant='outline'
            onClick={handleRefresh}
            disabled={loading.agents}
            className='flex items-center space-x-2'
          >
            <RefreshCw className={`h-4 w-4 ${loading.agents ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Search and Filter */}
        <AgentSearch agents={agents} onFilter={handleFilter} onSearch={handleSearch} />

        {/* Loading State */}
        {loading.agents && (
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className='h-64'>
                <CardHeader>
                  <Skeleton className='h-4 w-3/4' />
                  <Skeleton className='h-3 w-1/2' />
                </CardHeader>
                <CardContent>
                  <div className='space-y-2'>
                    <Skeleton className='h-3 w-full' />
                    <Skeleton className='h-3 w-2/3' />
                    <Skeleton className='h-8 w-20' />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recommendations Section */}
        {!loading.agents && showRecommendations && recommendedAgents.length > 0 && (
          <div className='space-y-4'>
            <div className='flex items-center space-x-2'>
              <Sparkles className='h-5 w-5 text-blue-500' />
              <h3 className='font-semibold text-lg'>Recommended for You</h3>
              {loading.recommendations && (
                <Badge variant='secondary' className='animate-pulse'>
                  <Lightbulb className='mr-1 h-3 w-3' />
                  Analyzing...
                </Badge>
              )}
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {recommendedAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgent?.id === agent.id}
                  isRecommended={true}
                  onSelect={handleAgentSelect}
                  onViewProfile={handleViewProfile}
                  metrics={agentMetrics[agent.id]}
                />
              ))}
            </div>

            <Separator className='my-6' />
          </div>
        )}

        {/* All Agents Section */}
        {!loading.agents && (
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <Users className='h-5 w-5' />
                <h3 className='font-semibold text-lg'>All Agents ({filteredAgents.length})</h3>
              </div>

              {agents.length !== filteredAgents.length && (
                <Badge variant='secondary'>Filtered from {agents.length}</Badge>
              )}
            </div>

            {filteredAgents.length === 0 ? (
              <Card className='p-12'>
                <div className='text-center text-muted-foreground'>
                  <Bot className='mx-auto mb-4 h-16 w-16 opacity-50' />
                  <h4 className='mb-2 font-medium text-lg'>No Agents Found</h4>
                  <p className='mb-4'>
                    {agents.length === 0
                      ? 'No agents have been created in this workspace yet.'
                      : 'No agents match your current filters.'}
                  </p>
                  {agents.length === 0 && (
                    <Button variant='outline' className='mt-2'>
                      <ArrowRight className='mr-2 h-4 w-4' />
                      Create Your First Agent
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {filteredAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={selectedAgent?.id === agent.id}
                    isRecommended={isRecommended(agent)}
                    onSelect={handleAgentSelect}
                    onViewProfile={handleViewProfile}
                    metrics={agentMetrics[agent.id]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Agent Profile Modal */}
        <AgentProfileModal
          agent={profileAgent}
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false)
            setProfileAgent(null)
          }}
          onSelect={handleAgentSelect}
          metrics={profileAgent ? agentMetrics[profileAgent.id] : undefined}
        />

        {/* Performance Metrics (if metrics are loaded) */}
        {!loading.metrics && Object.keys(agentMetrics).length > 0 && (
          <Card className='mt-6'>
            <CardHeader>
              <CardTitle className='flex items-center space-x-2'>
                <TrendingUp className='h-5 w-5' />
                <span>Workspace Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
                <div className='text-center'>
                  <div className='font-bold text-2xl'>
                    {agents.filter((a) => a.status === 'active').length}
                  </div>
                  <div className='text-muted-foreground text-sm'>Active Agents</div>
                </div>
                <div className='text-center'>
                  <div className='font-bold text-2xl'>
                    {Object.values(agentMetrics)
                      .reduce((sum, m) => sum + m.totalSessions, 0)
                      .toLocaleString()}
                  </div>
                  <div className='text-muted-foreground text-sm'>Total Sessions</div>
                </div>
                <div className='text-center'>
                  <div className='font-bold text-2xl'>
                    {Math.round(
                      Object.values(agentMetrics).length > 0
                        ? Object.values(agentMetrics).reduce(
                            (sum, m) => sum + m.avgResponseTime,
                            0
                          ) / Object.values(agentMetrics).length
                        : 0
                    )}
                    ms
                  </div>
                  <div className='text-muted-foreground text-sm'>Avg Response Time</div>
                </div>
                <div className='text-center'>
                  <div className='font-bold text-2xl'>
                    {Math.round(
                      Object.values(agentMetrics).length > 0
                        ? Object.values(agentMetrics).reduce((sum, m) => sum + m.successRate, 0) /
                            Object.values(agentMetrics).length
                        : 0
                    )}
                    %
                  </div>
                  <div className='text-muted-foreground text-sm'>Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}

export default AgentSelectionInterface
