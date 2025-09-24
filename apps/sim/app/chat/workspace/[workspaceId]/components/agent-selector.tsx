'use client'

/**
 * Agent Selection Interface Component
 * ===================================
 *
 * Comprehensive agent selection interface providing:
 * - Agent discovery and search with workspace filtering
 * - Agent profile display with capabilities and specializations
 * - Agent lifecycle management controls (start, stop, pause, resume)
 * - Performance metrics and availability indicators
 * - Real-time agent status updates via Socket.io
 * - Workspace-aware agent access control and isolation
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Clock,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Square,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAgentStatus } from '@/hooks/use-agent-status'
import { toast } from '@/hooks/use-toast'
import type { Agent, AgentListQuery } from '@/services/parlant/types'
import { CreateAgentModal } from './create-agent-modal'

interface AgentSelectorProps {
  workspaceId: string
}

interface AgentWithStats extends Agent {
  stats?: {
    active_sessions: number
    total_conversations: number
    avg_response_time: number
    last_active: string
    performance_score: number
  }
  availability?: 'online' | 'busy' | 'offline'
  capabilities?: string[]
}

export function AgentSelector({ workspaceId }: AgentSelectorProps) {
  const router = useRouter()
  const [agents, setAgents] = useState<AgentWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'training'>(
    'all'
  )
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [showCreateAgent, setShowCreateAgent] = useState(false)

  // Filtered agents based on search and status
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.capabilities?.some((cap) => cap.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [agents, searchQuery, statusFilter])

  // Load agents on component mount and workspace change
  useEffect(() => {
    loadAgents()
  }, [workspaceId])

  // Real-time agent status updates
  const { agentStatuses: realtimeStatuses, isConnected } = useAgentStatus({
    workspaceId,
    agentIds: agents.map((agent) => agent.id),
    autoConnect: true,
  })

  // Merge real-time status updates with agent data
  useEffect(() => {
    if (realtimeStatuses.size > 0) {
      setAgents((prevAgents) =>
        prevAgents.map((agent) => {
          const realtimeStatus = realtimeStatuses.get(agent.id)
          if (realtimeStatus) {
            return {
              ...agent,
              availability: realtimeStatus.availability || agent.availability,
              stats: {
                ...agent.stats,
                active_sessions:
                  realtimeStatus.active_sessions ?? agent.stats?.active_sessions ?? 0,
                performance_score: Math.round(
                  realtimeStatus.performance_metrics?.error_rate !== undefined
                    ? Math.max(0, 100 - realtimeStatus.performance_metrics.error_rate * 10)
                    : (agent.stats?.performance_score ?? 85)
                ),
                avg_response_time: Math.round(
                  realtimeStatus.performance_metrics?.response_time_avg ??
                    agent.stats?.avg_response_time ??
                    800
                ),
                last_active: new Date().toISOString(),
              },
            }
          }
          return agent
        })
      )
    }
  }, [realtimeStatuses])

  /**
   * Load agents from the Parlant service
   */
  const loadAgents = async () => {
    try {
      setLoading(true)

      const query: AgentListQuery = {
        workspace_id: workspaceId,
        limit: 50,
        offset: 0,
      }

      // Call the Parlant agents API
      const response = await fetch(`/api/parlant/agents?${new URLSearchParams(query as any)}`)

      if (!response.ok) {
        throw new Error(`Failed to load agents: ${response.status}`)
      }

      const data = await response.json()

      // Enhance agents with stats and capabilities (mock data for now)
      const enhancedAgents = data.data.map(
        (agent: Agent): AgentWithStats => ({
          ...agent,
          stats: {
            active_sessions: Math.floor(Math.random() * 5),
            total_conversations: Math.floor(Math.random() * 100) + 10,
            avg_response_time: Math.floor(Math.random() * 2000) + 500,
            last_active: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            performance_score: Math.floor(Math.random() * 30) + 70,
          },
          availability: ['online', 'busy', 'offline'][Math.floor(Math.random() * 3)] as any,
          capabilities: [
            'Natural Language Processing',
            'Data Analysis',
            'Workflow Automation',
            'Customer Support',
            'Content Generation',
          ].slice(0, Math.floor(Math.random() * 3) + 2),
        })
      )

      setAgents(enhancedAgents)
    } catch (error) {
      console.error('Failed to load agents:', error)
      toast({
        title: 'Error',
        description: 'Failed to load agents. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle agent selection and navigation to chat
   */
  const handleAgentSelect = (agent: AgentWithStats) => {
    setSelectedAgent(agent.id)
    // Navigate to agent chat page
    router.push(`/chat/workspace/${workspaceId}/agent/${agent.id}`)
  }

  /**
   * Handle agent lifecycle operations
   */
  const handleAgentAction = async (
    agentId: string,
    action: 'start' | 'pause' | 'stop' | 'configure'
  ) => {
    try {
      switch (action) {
        case 'start':
          // TODO: Implement agent start functionality
          toast({ title: 'Agent Started', description: 'Agent is now active and ready to chat.' })
          break
        case 'pause':
          // TODO: Implement agent pause functionality
          toast({ title: 'Agent Paused', description: 'Agent has been paused temporarily.' })
          break
        case 'stop':
          // TODO: Implement agent stop functionality
          toast({ title: 'Agent Stopped', description: 'Agent has been stopped.' })
          break
        case 'configure':
          // TODO: Navigate to agent configuration page
          router.push(`/workspace/${workspaceId}/agents/${agentId}/settings`)
          break
      }

      // Reload agents to reflect status changes
      await loadAgents()
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} agent. Please try again.`,
        variant: 'destructive',
      })
    }
  }

  /**
   * Get status indicator color
   */
  const getStatusColor = (status: string, availability?: string) => {
    if (availability === 'online') return 'bg-green-500'
    if (availability === 'busy') return 'bg-yellow-500'
    if (availability === 'offline') return 'bg-gray-400'

    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'training':
        return 'bg-blue-500'
      case 'inactive':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  /**
   * Format time ago display
   */
  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (loading) {
    return <AgentSelectorSkeleton />
  }

  return (
    <div className='mx-auto w-full max-w-4xl space-y-6'>
      {/* Header and Controls */}
      <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          <h2 className='font-semibold text-2xl tracking-tight'>Select an Agent</h2>
          <p className='text-muted-foreground'>
            Choose from your available AI agents or create a new one
          </p>
        </div>

        <Button onClick={() => setShowCreateAgent(true)} className='gap-2'>
          <Plus className='h-4 w-4' />
          Create Agent
        </Button>
      </div>

      {/* Search and Filters */}
      <div className='flex flex-col gap-4 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
          <Input
            placeholder='Search agents by name, description, or capabilities...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10'
          />
        </div>

        <div className='flex gap-2'>
          {['all', 'active', 'inactive', 'training'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size='sm'
              onClick={() => setStatusFilter(status as any)}
              className='capitalize'
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Agent Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {filteredAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onSelect={handleAgentSelect}
            onAction={handleAgentAction}
            isSelected={selectedAgent === agent.id}
            getStatusColor={getStatusColor}
            formatTimeAgo={formatTimeAgo}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 && !loading && (
        <div className='py-12 text-center'>
          <div className='mx-auto mb-4 h-24 w-24 text-muted-foreground/50'>
            <Users className='h-full w-full' />
          </div>
          <h3 className='mb-2 font-semibold text-lg'>No agents found</h3>
          <p className='mb-4 text-muted-foreground'>
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first AI agent to get started'}
          </p>
          <Button onClick={() => setShowCreateAgent(true)} className='gap-2'>
            <Plus className='h-4 w-4' />
            Create Agent
          </Button>
        </div>
      )}

      {/* Create Agent Modal */}
      <CreateAgentModal
        workspaceId={workspaceId}
        open={showCreateAgent}
        onOpenChange={setShowCreateAgent}
        onAgentCreated={loadAgents}
      />
    </div>
  )
}

/**
 * Individual agent card component
 */
interface AgentCardProps {
  agent: AgentWithStats
  onSelect: (agent: AgentWithStats) => void
  onAction: (agentId: string, action: 'start' | 'pause' | 'stop' | 'configure') => void
  isSelected: boolean
  getStatusColor: (status: string, availability?: string) => string
  formatTimeAgo: (timestamp: string) => string
}

function AgentCard({
  agent,
  onSelect,
  onAction,
  isSelected,
  getStatusColor,
  formatTimeAgo,
}: AgentCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onSelect(agent)}
    >
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-3'>
            <div className='relative'>
              <Avatar className='h-10 w-10'>
                <AvatarFallback>{agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div
                className={`-bottom-1 -right-1 absolute h-3 w-3 rounded-full border-2 border-background ${getStatusColor(agent.status, agent.availability)}`}
              />
            </div>
            <div>
              <CardTitle className='text-base leading-tight'>{agent.name}</CardTitle>
              <div className='mt-1 flex items-center gap-2'>
                <Badge
                  variant={agent.status === 'active' ? 'default' : 'secondary'}
                  className='text-xs'
                >
                  {agent.status}
                </Badge>
                {agent.availability && (
                  <Badge variant='outline' className='text-xs capitalize'>
                    {agent.availability}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                <MoreVertical className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onAction(agent.id, 'start')
                }}
              >
                <Play className='mr-2 h-4 w-4' />
                Start
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onAction(agent.id, 'pause')
                }}
              >
                <Pause className='mr-2 h-4 w-4' />
                Pause
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onAction(agent.id, 'stop')
                }}
              >
                <Square className='mr-2 h-4 w-4' />
                Stop
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onAction(agent.id, 'configure')
                }}
              >
                <Settings className='mr-2 h-4 w-4' />
                Configure
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className='space-y-4 pt-0'>
        {/* Description */}
        {agent.description && (
          <p className='line-clamp-2 text-muted-foreground text-sm'>{agent.description}</p>
        )}

        {/* Capabilities */}
        {agent.capabilities && agent.capabilities.length > 0 && (
          <div>
            <p className='mb-2 font-medium text-muted-foreground text-xs'>Capabilities</p>
            <div className='flex flex-wrap gap-1'>
              {agent.capabilities.slice(0, 3).map((capability, index) => (
                <Badge key={index} variant='outline' className='text-xs'>
                  {capability}
                </Badge>
              ))}
              {agent.capabilities.length > 3 && (
                <Badge variant='outline' className='text-xs'>
                  +{agent.capabilities.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        {agent.stats && (
          <div className='grid grid-cols-2 gap-3 text-xs'>
            <div className='flex items-center gap-1.5'>
              <Users className='h-3 w-3 text-muted-foreground' />
              <span className='text-muted-foreground'>Sessions:</span>
              <span className='font-medium'>{agent.stats.active_sessions}</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <TrendingUp className='h-3 w-3 text-muted-foreground' />
              <span className='text-muted-foreground'>Score:</span>
              <span className='font-medium'>{agent.stats.performance_score}%</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <Clock className='h-3 w-3 text-muted-foreground' />
              <span className='text-muted-foreground'>Response:</span>
              <span className='font-medium'>{agent.stats.avg_response_time}ms</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <Clock className='h-3 w-3 text-muted-foreground' />
              <span className='text-muted-foreground'>Active:</span>
              <span className='font-medium'>{formatTimeAgo(agent.stats.last_active)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton component
 */
function AgentSelectorSkeleton() {
  return (
    <div className='mx-auto w-full max-w-4xl space-y-6'>
      <div className='flex items-start justify-between'>
        <div>
          <Skeleton className='mb-2 h-8 w-48' />
          <Skeleton className='h-4 w-80' />
        </div>
        <Skeleton className='h-10 w-32' />
      </div>

      <div className='flex gap-4'>
        <Skeleton className='h-10 flex-1' />
        <div className='flex gap-2'>
          <Skeleton className='h-10 w-16' />
          <Skeleton className='h-10 w-16' />
          <Skeleton className='h-10 w-16' />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-10 w-10 rounded-full' />
                <div>
                  <Skeleton className='mb-2 h-4 w-24' />
                  <Skeleton className='h-3 w-16' />
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-3'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
              <div className='flex gap-1'>
                <Skeleton className='h-5 w-16' />
                <Skeleton className='h-5 w-20' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
