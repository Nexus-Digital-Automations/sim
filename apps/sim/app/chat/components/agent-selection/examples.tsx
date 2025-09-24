/**
 * Agent Selection Interface - Usage Examples
 *
 * This file contains practical examples of how to integrate and use the
 * Agent Selection Interface components in different scenarios.
 */

'use client'

import { useEffect, useState } from 'react'
import { Bot, Clock, MessageSquare, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAgentSelection } from '@/app/chat/hooks/use-agent-selection'
import type { Agent } from '@/apps/sim/services/parlant/types'
import { AgentCard, AgentProfileModal, AgentSearch, AgentSelectionInterface } from './index'

// Example 1: Basic Agent Selection
export function BasicAgentSelectionExample() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const workspaceId = 'demo-workspace-123'

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent)
    console.log('Selected agent:', agent.name)

    // Navigate to chat interface or initialize conversation
    // router.push(`/chat?agent=${agent.id}`)
  }

  return (
    <div className='mx-auto max-w-6xl p-6'>
      <div className='mb-8'>
        <h1 className='mb-2 font-bold text-3xl'>Choose Your AI Assistant</h1>
        <p className='text-muted-foreground'>Select an agent to start your conversation</p>
      </div>

      <AgentSelectionInterface
        workspaceId={workspaceId}
        onAgentSelect={handleAgentSelect}
        selectedAgent={selectedAgent}
        showRecommendations={true}
        className='space-y-8'
      />

      {selectedAgent && (
        <div className='mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4'>
          <h3 className='font-semibold text-blue-900'>Ready to Chat!</h3>
          <p className='text-blue-700'>
            You've selected <strong>{selectedAgent.name}</strong>. Click below to start your
            conversation.
          </p>
          <Button className='mt-3' onClick={() => console.log('Start chat')}>
            <MessageSquare className='mr-2 h-4 w-4' />
            Start Conversation
          </Button>
        </div>
      )}
    </div>
  )
}

// Example 2: Agent Selection with Persistence
export function PersistentAgentSelectionExample() {
  const workspaceId = 'demo-workspace-123'
  const router = useRouter()

  const {
    selectedAgent,
    recentAgents,
    favoriteAgents,
    selectAgent,
    toggleFavorite,
    isFavorite,
    hasSelection,
    stats,
  } = useAgentSelection({
    workspaceId,
    persistToStorage: true,
    maxRecentAgents: 5,
  })

  const handleStartChat = () => {
    if (selectedAgent) {
      router.push(
        `/parlant-chat/conversation?agent_id=${selectedAgent.id}&workspace_id=${workspaceId}`
      )
    }
  }

  return (
    <div className='mx-auto max-w-6xl space-y-8 p-6'>
      {/* Header with User Stats */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-bold text-3xl'>Your AI Workspace</h1>
          <p className='text-muted-foreground'>Manage and interact with your AI agents</p>
        </div>

        <div className='flex items-center space-x-4 text-muted-foreground text-sm'>
          <div className='flex items-center space-x-1'>
            <Star className='h-4 w-4' />
            <span>{stats.totalFavorites} favorites</span>
          </div>
          <div className='flex items-center space-x-1'>
            <Clock className='h-4 w-4' />
            <span>{stats.totalRecent} recent</span>
          </div>
        </div>
      </div>

      {/* Current Selection */}
      {hasSelection && selectedAgent && (
        <Card className='border-green-200 bg-green-50'>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2 text-green-800'>
              <Bot className='h-5 w-5' />
              <span>Currently Selected</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-semibold text-lg'>{selectedAgent.name}</h3>
                <p className='text-green-700'>{selectedAgent.description}</p>
              </div>
              <div className='flex space-x-2'>
                <Button variant='outline' size='sm' onClick={() => toggleFavorite(selectedAgent)}>
                  <Star
                    className={`mr-1 h-4 w-4 ${
                      isFavorite(selectedAgent) ? 'fill-yellow-400 text-yellow-400' : ''
                    }`}
                  />
                  {isFavorite(selectedAgent) ? 'Favorited' : 'Add Favorite'}
                </Button>
                <Button onClick={handleStartChat}>Start Chat</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Access - Recent and Favorites */}
      {(recentAgents.length > 0 || favoriteAgents.length > 0) && (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {/* Recent Agents */}
          {recentAgents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center space-x-2'>
                  <Clock className='h-5 w-5' />
                  <span>Recently Used</span>
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                {recentAgents.slice(0, 3).map((agent) => (
                  <div
                    key={agent.id}
                    className='flex cursor-pointer items-center justify-between rounded-lg bg-muted p-3 hover:bg-muted/80'
                    onClick={() => selectAgent(agent)}
                  >
                    <div>
                      <div className='font-medium'>{agent.name}</div>
                      <div className='text-muted-foreground text-sm'>
                        {agent.status === 'active' ? 'Ready' : 'Training'}
                      </div>
                    </div>
                    <Badge variant='outline'>Quick Select</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Favorite Agents */}
          {favoriteAgents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center space-x-2'>
                  <Star className='h-5 w-5' />
                  <span>Your Favorites</span>
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                {favoriteAgents.slice(0, 3).map((agent) => (
                  <div
                    key={agent.id}
                    className='flex cursor-pointer items-center justify-between rounded-lg bg-muted p-3 hover:bg-muted/80'
                    onClick={() => selectAgent(agent)}
                  >
                    <div>
                      <div className='font-medium'>{agent.name}</div>
                      <div className='text-muted-foreground text-sm'>
                        {agent.description?.substring(0, 50)}...
                      </div>
                    </div>
                    <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Separator />

      {/* Main Agent Selection */}
      <AgentSelectionInterface
        workspaceId={workspaceId}
        onAgentSelect={selectAgent}
        selectedAgent={selectedAgent}
        showRecommendations={true}
      />
    </div>
  )
}

// Example 3: Custom Agent Selection with Individual Components
export function CustomAgentSelectionExample() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [profileAgent, setProfileAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const workspaceId = 'demo-workspace-123'

  // Load agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch(`/api/v1/agents?workspace_id=${workspaceId}`)
        const data = await response.json()
        setAgents(data.agents || [])
        setFilteredAgents(data.agents || [])
      } catch (error) {
        console.error('Failed to fetch agents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [workspaceId])

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent)
  }

  const handleViewProfile = (agent: Agent) => {
    setProfileAgent(agent)
  }

  if (loading) {
    return (
      <div className='mx-auto max-w-6xl p-6'>
        <div className='animate-pulse space-y-6'>
          <div className='h-8 w-1/3 rounded bg-muted' />
          <div className='h-4 w-1/2 rounded bg-muted' />
          <div className='grid grid-cols-3 gap-6'>
            {[...Array(6)].map((_, i) => (
              <div key={i} className='h-64 rounded bg-muted' />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-6xl space-y-8 p-6'>
      <div>
        <h1 className='mb-2 font-bold text-3xl'>Custom Agent Browser</h1>
        <p className='text-muted-foreground'>Browse and select from available AI agents</p>
      </div>

      {/* Custom Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Find the Perfect Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <AgentSearch
            agents={agents}
            onFilter={setFilteredAgents}
            onSearch={(term) => console.log('Search:', term)}
          />
        </CardContent>
      </Card>

      {/* Selected Agent Summary */}
      {selectedAgent && (
        <Card className='border-blue-200 bg-blue-50'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-semibold text-blue-900 text-xl'>
                  Selected: {selectedAgent.name}
                </h3>
                <p className='text-blue-700'>{selectedAgent.description}</p>
              </div>
              <div className='flex space-x-2'>
                <Button variant='outline' onClick={() => handleViewProfile(selectedAgent)}>
                  View Details
                </Button>
                <Button onClick={() => console.log('Start chat with', selectedAgent.name)}>
                  Start Chat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Grid */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {filteredAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent?.id === agent.id}
            isRecommended={false}
            onSelect={handleAgentSelect}
            onViewProfile={handleViewProfile}
          />
        ))}
      </div>

      {/* Results Info */}
      <div className='text-center text-muted-foreground'>
        Showing {filteredAgents.length} of {agents.length} agents
      </div>

      {/* Profile Modal */}
      <AgentProfileModal
        agent={profileAgent}
        isOpen={!!profileAgent}
        onClose={() => setProfileAgent(null)}
        onSelect={handleAgentSelect}
      />
    </div>
  )
}

// Example 4: Minimal Agent Selection
export function MinimalAgentSelectionExample() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6'>
      <div className='mx-auto max-w-4xl'>
        <div className='mb-12 text-center'>
          <h1 className='mb-4 font-bold text-4xl text-gray-900'>Welcome to Parlant Chat</h1>
          <p className='mb-8 text-gray-600 text-xl'>Choose an AI agent to assist you</p>
        </div>

        <Card className='border-0 shadow-xl'>
          <CardContent className='p-8'>
            <AgentSelectionInterface
              workspaceId='demo-workspace-123'
              onAgentSelect={setSelectedAgent}
              selectedAgent={selectedAgent}
              showRecommendations={true}
            />

            {selectedAgent && (
              <div className='mt-8 border-t pt-8'>
                <div className='text-center'>
                  <p className='mb-4 text-lg'>
                    Ready to chat with <strong>{selectedAgent.name}</strong>?
                  </p>
                  <Button size='lg' className='px-8'>
                    <MessageSquare className='mr-2 h-5 w-5' />
                    Start Conversation
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Export all examples
export default {
  BasicAgentSelectionExample,
  PersistentAgentSelectionExample,
  CustomAgentSelectionExample,
  MinimalAgentSelectionExample,
}
