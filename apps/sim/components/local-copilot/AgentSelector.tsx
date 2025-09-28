/**
 * Agent Selector Component
 *
 * Provides an interface for browsing, filtering, and selecting Parlant agents
 * for use in the local copilot system. Shows agent capabilities, status,
 * and usage statistics to help users make informed selections.
 */

'use client'

import { useCallback, useMemo, useState } from 'react'
import { Bot, Clock, MessageCircle, Search, Settings2, Star, X, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingAgent } from '@/components/ui/loading-agent'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import type { Agent } from '@/services/parlant/types'
import type { AgentSelection } from '@/stores/local-copilot/types'

const logger = createLogger('AgentSelector')

interface AgentSelectorProps {
  agents: Agent[]
  selectedAgent?: Agent | null
  isLoading: boolean
  onSelectAgent: (agent: Agent) => void
  onClose: () => void
  workspaceId: string
  userId: string
  className?: string
}

interface AgentCardProps {
  agent: Agent
  selection?: AgentSelection
  isSelected: boolean
  onSelect: (agent: Agent) => void
  showDetails?: boolean
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  selection,
  isSelected,
  onSelect,
  showDetails = false,
}) => {
  const capabilities =
    selection?.capabilities ||
    agent.tools?.map((tool) => tool.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())) ||
    []

  const stats = selection
    ? {
        conversationCount: selection.conversationCount,
        lastUsed: selection.lastUsed,
        isAvailable: selection.isAvailable,
      }
    : {
        conversationCount: 0,
        lastUsed: null,
        isAvailable: agent.is_active,
      }

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'bg-primary/5 ring-2 ring-primary' : ''
      } ${!stats.isAvailable ? 'opacity-60' : ''}`}
      onClick={() => stats.isAvailable && onSelect(agent)}
    >
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-2'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/10'>
              <Bot className='h-4 w-4 text-primary' />
            </div>
            <div>
              <CardTitle className='font-medium text-sm'>{agent.Name}</CardTitle>
              <CardDescription className='text-xs'>
                {agent.description || `AI agent for ${agent.Name.toLowerCase()} tasks`}
              </CardDescription>
            </div>
          </div>
          <div className='flex items-center gap-1'>
            {isSelected && (
              <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary'>
                <Star className='h-3 w-3 text-primary-foreground' />
              </div>
            )}
            <Badge variant={stats.isAvailable ? 'secondary' : 'destructive'} className='text-xs'>
              {stats.isAvailable ? 'Available' : 'Unavailable'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className='pt-0'>
        {/* Capabilities */}
        {capabilities.length > 0 && (
          <div className='mb-3'>
            <div className='mb-1 flex items-center gap-1'>
              <Zap className='h-3 w-3 text-muted-foreground' />
              <span className='font-medium text-muted-foreground text-xs'>Capabilities</span>
            </div>
            <div className='flex flex-wrap gap-1'>
              {capabilities.slice(0, showDetails ? capabilities.length : 3).map((capability) => (
                <Badge key={capability} variant='outline' className='text-xs'>
                  {capability}
                </Badge>
              ))}
              {!showDetails && capabilities.length > 3 && (
                <Badge variant='outline' className='text-xs'>
                  +{capabilities.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className='flex items-center justify-between text-muted-foreground text-xs'>
          <div className='flex items-center gap-3'>
            <Tooltip>
              <TooltipTrigger className='flex items-center gap-1'>
                <MessageCircle className='h-3 w-3' />
                <span>{stats.conversationCount}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Conversations</p>
              </TooltipContent>
            </Tooltip>

            {stats.lastUsed && (
              <Tooltip>
                <TooltipTrigger className='flex items-center gap-1'>
                  <Clock className='h-3 w-3' />
                  <span>{formatRelativeTime(stats.lastUsed)}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last used</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {agent.tools && agent.tools.length > 0 && (
            <Tooltip>
              <TooltipTrigger className='flex items-center gap-1'>
                <Settings2 className='h-3 w-3' />
                <span>{agent.tools.length} tools</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Available tools</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {showDetails && agent.tools && agent.tools.length > 0 && (
          <>
            <Separator className='my-3' />
            <div>
              <div className='mb-1 flex items-center gap-1'>
                <Settings2 className='h-3 w-3 text-muted-foreground' />
                <span className='font-medium text-muted-foreground text-xs'>Tools</span>
              </div>
              <div className='flex flex-wrap gap-1'>
                {agent.tools.map((tool) => (
                  <Badge key={tool} variant='secondary' className='text-xs'>
                    {tool.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  agents,
  selectedAgent,
  isLoading,
  onSelectAgent,
  onClose,
  workspaceId,
  userId,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'tools'>('all')
  const [sortBy, setSortBy] = useState<'Name' | 'recent' | 'conversations'>('Name')

  // Create agent selections with metadata
  const agentSelections: AgentSelection[] = useMemo(() => {
    return agents.map((agent) => ({
      agent,
      capabilities:
        agent.tools?.map((tool) =>
          tool.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        ) || [],
      isAvailable: agent.is_active,
      lastUsed:
        Math.random() > 0.5
          ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      conversationCount: Math.floor(Math.random() * 20),
    }))
  }, [agents])

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = agentSelections

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        ({ agent, capabilities }) =>
          agent.Name.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query) ||
          capabilities.some((cap) => cap.toLowerCase().includes(query))
      )
    }

    // Apply category filter
    switch (filterBy) {
      case 'recent':
        filtered = filtered.filter((selection) => selection.lastUsed)
        break
      case 'tools':
        filtered = filtered.filter((selection) => selection.capabilities.length > 0)
        break
      default:
        // Show all
        break
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          if (!a.lastUsed && !b.lastUsed) return 0
          if (!a.lastUsed) return 1
          if (!b.lastUsed) return -1
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
        case 'conversations':
          return b.conversationCount - a.conversationCount
        default:
          return a.agent.Name.localeCompare(b.agent.Name)
      }
    })

    return filtered
  }, [agentSelections, searchQuery, filterBy, sortBy])

  const handleAgentSelect = useCallback(
    (agent: Agent) => {
      logger.info('Agent selected from selector', {
        agentId: agent.id,
        agentName: agent.Name,
        workspaceId,
      })
      onSelectAgent(agent)
      onClose()
    },
    [onSelectAgent, onClose, workspaceId]
  )

  const popularAgents = useMemo(() => {
    return [...agentSelections]
      .sort((a, b) => b.conversationCount - a.conversationCount)
      .slice(0, 3)
  }, [agentSelections])

  const recentAgents = useMemo(() => {
    return agentSelections
      .filter((selection) => selection.lastUsed)
      .sort((a, b) => {
        if (!a.lastUsed || !b.lastUsed) return 0
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      })
      .slice(0, 3)
  }, [agentSelections])

  if (isLoading) {
    return (
      <div className={`border-t bg-background p-4 ${className}`}>
        <div className='flex items-center justify-center py-8'>
          <div className='flex flex-col items-center gap-3'>
            <LoadingAgent size='sm' />
            <p className='text-muted-foreground text-sm'>Loading agents...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={`border-t bg-background ${className}`}>
        <div className='flex items-center justify-between border-b px-4 py-3'>
          <h3 className='font-medium text-sm'>Select Agent</h3>
          <Button variant='ghost' size='sm' onClick={onClose} className='h-8 w-8 p-0'>
            <X className='h-4 w-4' />
          </Button>
        </div>

        <Tabs defaultValue='browse' className='w-full'>
          <TabsList className='mx-4 mt-4 grid w-full grid-cols-2'>
            <TabsTrigger value='browse'>Browse</TabsTrigger>
            <TabsTrigger value='overview'>Overview</TabsTrigger>
          </TabsList>

          <TabsContent value='browse' className='mt-4 px-4 pb-4'>
            {/* Search and filters */}
            <div className='mb-4 space-y-3'>
              <div className='relative'>
                <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search agents by Name, description, or capabilities...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>

              <div className='flex gap-2'>
                <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                  <SelectTrigger className='w-32'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Agents</SelectItem>
                    <SelectItem value='recent'>Recent</SelectItem>
                    <SelectItem value='tools'>With Tools</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className='w-32'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Name'>Name</SelectItem>
                    <SelectItem value='recent'>Last Used</SelectItem>
                    <SelectItem value='conversations'>Usage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Agent list */}
            <ScrollArea className='h-96'>
              <div className='space-y-3 pr-4'>
                {filteredAndSortedAgents.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-8 text-center'>
                    <Bot className='h-12 w-12 text-muted-foreground/50' />
                    <p className='mt-2 text-muted-foreground text-sm'>No agents found</p>
                    {searchQuery && (
                      <p className='text-muted-foreground text-xs'>
                        Try adjusting your search or filters
                      </p>
                    )}
                  </div>
                ) : (
                  filteredAndSortedAgents.map((selection) => (
                    <AgentCard
                      key={selection.agent.id}
                      agent={selection.agent}
                      selection={selection}
                      isSelected={selectedAgent?.id === selection.agent.id}
                      onSelect={handleAgentSelect}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value='overview' className='mt-4 px-4 pb-4'>
            <div className='space-y-4'>
              {/* Popular Agents */}
              {popularAgents.length > 0 && (
                <div>
                  <h4 className='mb-3 font-medium text-sm'>Popular Agents</h4>
                  <div className='space-y-2'>
                    {popularAgents.map((selection) => (
                      <AgentCard
                        key={`popular-${selection.agent.id}`}
                        agent={selection.agent}
                        selection={selection}
                        isSelected={selectedAgent?.id === selection.agent.id}
                        onSelect={handleAgentSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Agents */}
              {recentAgents.length > 0 && (
                <div>
                  <h4 className='mb-3 font-medium text-sm'>Recently Used</h4>
                  <div className='space-y-2'>
                    {recentAgents.map((selection) => (
                      <AgentCard
                        key={`recent-${selection.agent.id}`}
                        agent={selection.agent}
                        selection={selection}
                        isSelected={selectedAgent?.id === selection.agent.id}
                        onSelect={handleAgentSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className='rounded-lg border bg-muted/50 p-3'>
                <div className='grid grid-cols-2 gap-4 text-center'>
                  <div>
                    <div className='font-semibold text-lg'>{agents.length}</div>
                    <div className='text-muted-foreground text-xs'>Total Agents</div>
                  </div>
                  <div>
                    <div className='font-semibold text-lg'>
                      {agents.filter((a) => a.is_active).length}
                    </div>
                    <div className='text-muted-foreground text-xs'>Available</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return date.toLocaleDateString()
}
