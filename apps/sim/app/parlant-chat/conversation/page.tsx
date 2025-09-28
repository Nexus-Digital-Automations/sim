'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  MessageCircle,
  RefreshCw,
  Settings,
  Sparkles,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createLogger } from '@/lib/logs/console/logger'
import { AgentSelectionInterface } from '@/app/chat/components/agent-selection'
import type { Agent } from '@/apps/sim/services/parlant/types'

const logger = createLogger('ParlantConversationPage')

interface ConversationSession {
  id: string
  agent_id: string
  user_id: string
  workspace_id: string
  status: 'active' | 'ended' | 'paused'
  created_at: string
  last_event_at?: string
}

/**
 * Parlant Conversation Page
 *
 * Integrated chat interface with agent selection capabilities.
 * Provides seamless agent switching and conversation management.
 */
export default function ParlantConversationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [agent, setAgent] = useState<Agent | null>(null)
  const [session, setSession] = useState<ConversationSession | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [agentId, setAgentId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAgentSelection, setShowAgentSelection] = useState(false)

  // Initialize from URL parameters
  useEffect(() => {
    const urlAgentId = searchParams.get('agent_id')
    const urlWorkspaceId = searchParams.get('workspace_id')

    if (urlAgentId) setAgentId(urlAgentId)
    if (urlWorkspaceId) setWorkspaceId(urlWorkspaceId)

    if (!urlAgentId || !urlWorkspaceId) {
      setError('Missing required parameters: agent_id and workspace_id')
      setIsLoading(false)
    }
  }, [searchParams])

  // Fetch agent data
  const fetchAgent = useCallback(async () => {
    if (!agentId || !workspaceId) return

    try {
      setIsLoading(true)
      setError(null)

      logger.info('Fetching agent for conversation', { agentId, workspaceId })

      const response = await fetch(`/api/v1/agents/${agentId}?workspace_id=${workspaceId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Agent not found' }))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const fetchedAgent = await response.json()
      setAgent(fetchedAgent)

      logger.info('Agent fetched successfully', {
        agentId: fetchedAgent.id,
        agentName: fetchedAgent.Name,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load agent'
      logger.error('Failed to fetch agent', { error: errorMessage, agentId })
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [agentId, workspaceId])

  // Create or resume conversation session
  const initializeSession = useCallback(async () => {
    if (!agent) return

    try {
      logger.info('Initializing conversation session', {
        agentId: agent.id,
        workspaceId,
      })

      const response = await fetch('/api/v1/sessions', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agent.id,
          workspace_id: workspaceId,
          metadata: {
            source: 'parlant-chat-interface',
            user_agent: navigator.userAgent,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const newSession = await response.json()
      setSession(newSession)

      logger.info('Session created successfully', {
        sessionId: newSession.id,
        agentId: agent.id,
      })
    } catch (error) {
      logger.error('Failed to initialize session', { error })
      // We can still proceed without a session for now
    }
  }, [agent, workspaceId])

  // Initialize agent and session
  useEffect(() => {
    if (agentId && workspaceId) {
      fetchAgent()
    }
  }, [agentId, workspaceId, fetchAgent])

  useEffect(() => {
    if (agent) {
      initializeSession()
    }
  }, [agent, initializeSession])

  // Handle agent switching
  const handleAgentSwitch = (newAgent: Agent) => {
    logger.info('Switching agent', {
      fromAgent: agent?.id,
      toAgent: newAgent.id,
    })

    // Update URL and state
    const newUrl = `/parlant-chat/conversation?agent_id=${newAgent.id}&workspace_id=${workspaceId}`
    router.push(newUrl)

    setAgent(newAgent)
    setShowAgentSelection(false)
    setSession(null) // Clear old session

    // This will trigger re-initialization
    setAgentId(newAgent.id)
  }

  // Handle going back
  const handleGoBack = () => {
    if (session) {
      // End the session gracefully
      fetch(`/api/v1/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' }),
      }).catch((error) => logger.error('Failed to end session', { error }))
    }

    router.push(`/parlant-chat?workspace_id=${workspaceId}`)
  }

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='text-center'>
          <RefreshCw className='mx-auto mb-4 h-8 w-8 animate-spin' />
          <h2 className='mb-2 font-semibold text-lg'>Loading Agent...</h2>
          <p className='text-muted-foreground'>Setting up your conversation</p>
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <Card className='mx-4 w-full max-w-md'>
          <CardHeader className='text-center'>
            <AlertCircle className='mx-auto mb-4 h-12 w-12 text-destructive' />
            <h2 className='font-semibold text-xl'>Agent Not Available</h2>
          </CardHeader>
          <CardContent className='space-y-4 text-center'>
            <p className='text-muted-foreground'>
              {error || 'The requested agent could not be loaded.'}
            </p>
            <div className='flex justify-center space-x-2'>
              <Button variant='outline' onClick={handleGoBack}>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Selection
              </Button>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className='mr-2 h-4 w-4' />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen flex-col bg-background'>
      {/* Header */}
      <div className='border-b bg-card'>
        <div className='container mx-auto px-4 py-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleGoBack}
                className='flex items-center space-x-2'
              >
                <ArrowLeft className='h-4 w-4' />
                <span>Back</span>
              </Button>

              <div className='h-6 w-px bg-border' />

              <div className='flex items-center space-x-3'>
                <div className='flex items-center space-x-2'>
                  <Bot className='h-5 w-5 text-blue-500' />
                  <span className='font-semibold'>{agent.Name}</span>
                </div>

                <Badge
                  variant='outline'
                  className={
                    agent.status === 'active'
                      ? 'border-green-200 bg-green-50 text-green-600'
                      : agent.status === 'training'
                        ? 'border-yellow-200 bg-yellow-50 text-yellow-600'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                  }
                >
                  {agent.status === 'active'
                    ? 'Ready'
                    : agent.status === 'training'
                      ? 'Learning'
                      : 'Offline'}
                </Badge>

                <Badge variant='secondary' className='ml-2'>
                  <Sparkles className='mr-1 h-3 w-3' />
                  AI-Powered
                </Badge>
              </div>
            </div>

            <div className='flex items-center space-x-2'>
              {session && (
                <Badge variant='outline' className='text-xs'>
                  Session: {session.id.slice(0, 8)}
                </Badge>
              )}

              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowAgentSelection(true)}
                className='flex items-center space-x-2'
              >
                <Settings className='h-4 w-4' />
                <span>Switch Agent</span>
              </Button>
            </div>
          </div>

          {agent.description && (
            <div className='mt-2 max-w-2xl text-muted-foreground text-sm'>{agent.description}</div>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className='flex flex-1'>
        {/* Chat Area */}
        <div className='flex-1'>
          {/* This is where the actual Parlant chat widget would be integrated */}
          <div className='flex h-full items-center justify-center'>
            <Card className='mx-4 w-full max-w-2xl'>
              <CardContent className='p-12 text-center'>
                <MessageCircle className='mx-auto mb-6 h-16 w-16 text-blue-500' />
                <h3 className='mb-4 font-semibold text-xl'>Ready to Chat with {agent.Name}</h3>
                <p className='mb-6 text-muted-foreground'>
                  {agent.description ||
                    'This agent is ready to help you with your questions and tasks.'}
                </p>

                {/* Agent Capabilities */}
                {(agent.guidelines && agent.guidelines.length > 0) ||
                (agent.journeys && agent.journeys.length > 0) ? (
                  <div className='mb-6 space-y-3'>
                    <h4 className='font-medium'>Agent Capabilities:</h4>
                    <div className='flex flex-wrap justify-center gap-2'>
                      {agent.guidelines && agent.guidelines.length > 0 && (
                        <Badge variant='secondary'>{agent.guidelines.length} Guidelines</Badge>
                      )}
                      {agent.journeys && agent.journeys.length > 0 && (
                        <Badge variant='secondary'>{agent.journeys.length} Journeys</Badge>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className='rounded-lg bg-muted/50 p-4 text-sm'>
                  <p className='mb-2 font-medium'>🚧 Coming Soon</p>
                  <p className='text-muted-foreground'>
                    The Parlant chat widget integration will be available here once the chat
                    interface feature is fully implemented.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Agent Selection Modal */}
      <Dialog open={showAgentSelection} onOpenChange={setShowAgentSelection}>
        <DialogContent className='max-h-[90vh] max-w-6xl overflow-hidden'>
          <DialogHeader>
            <DialogTitle className='flex items-center space-x-2'>
              <Bot className='h-5 w-5' />
              <span>Switch Agent</span>
            </DialogTitle>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto'>
            <AgentSelectionInterface
              workspaceId={workspaceId}
              onAgentSelect={handleAgentSwitch}
              selectedAgent={agent}
              showRecommendations={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
