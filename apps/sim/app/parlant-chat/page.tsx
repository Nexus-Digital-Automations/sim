'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Bot, MessageCircle, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createLogger } from '@/lib/logs/console/logger'
import { AgentSelectionInterface } from '@/app/chat/components/agent-selection'
import type { Agent } from '@/apps/sim/services/parlant/types'

const logger = createLogger('ParlantChatPage')

/**
 * Parlant Chat Page
 *
 * Main page for agent selection and chat interface integration.
 * Provides a dedicated route for Parlant-powered conversations with agent selection.
 */
export default function ParlantChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // Get workspace ID from URL params or user session
  useEffect(() => {
    const getWorkspaceId = async () => {
      try {
        // First try to get from URL params
        const urlWorkspaceId = searchParams.get('workspace_id')
        if (urlWorkspaceId) {
          setWorkspaceId(urlWorkspaceId)
          setIsLoading(false)
          return
        }

        // If not in URL, try to get from user session/context
        // In a real implementation, this would come from your auth system
        const response = await fetch('/api/user/workspace', {
          credentials: 'include',
        })

        if (response.ok) {
          const userData = await response.json()
          if (userData.workspace_id) {
            setWorkspaceId(userData.workspace_id)
          } else {
            // Fallback: redirect to workspace selection or use default
            console.warn('No workspace ID found, using demo workspace')
            setWorkspaceId('demo-workspace')
          }
        } else {
          // Handle unauthorized access
          console.warn('Failed to get workspace, using demo workspace')
          setWorkspaceId('demo-workspace')
        }
      } catch (error) {
        logger.error('Failed to get workspace ID', { error })
        setWorkspaceId('demo-workspace')
      } finally {
        setIsLoading(false)
      }
    }

    getWorkspaceId()
  }, [searchParams])

  // Handle agent selection
  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent)
    logger.info('Agent selected for chat', {
      agentId: agent.id,
      agentName: agent.name,
      workspaceId,
    })

    // Navigate to chat interface with selected agent
    const chatUrl = `/parlant-chat/conversation?agent_id=${agent.id}&workspace_id=${workspaceId}`
    router.push(chatUrl)
  }

  // Handle going back to workspace
  const handleGoBack = () => {
    router.push('/workspace')
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-background'>
        <div className='container mx-auto px-4 py-8'>
          <div className='mx-auto max-w-6xl'>
            <div className='animate-pulse space-y-6'>
              <div className='h-8 w-1/3 rounded bg-muted' />
              <div className='h-4 w-1/2 rounded bg-muted' />
              <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className='h-64 rounded bg-muted' />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background'>
      {/* Header */}
      <div className='border-b bg-card'>
        <div className='container mx-auto px-4 py-4'>
          <div className='mx-auto max-w-6xl'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-4'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleGoBack}
                  className='flex items-center space-x-2'
                >
                  <ArrowLeft className='h-4 w-4' />
                  <span>Back to Workspace</span>
                </Button>

                <div className='h-6 w-px bg-border' />

                <div className='flex items-center space-x-2'>
                  <Bot className='h-5 w-5 text-blue-500' />
                  <h1 className='font-semibold text-xl'>Parlant Chat</h1>
                  <Badge variant='secondary' className='ml-2'>
                    <Sparkles className='mr-1 h-3 w-3' />
                    AI-Powered
                  </Badge>
                </div>
              </div>

              {selectedAgent && (
                <div className='flex items-center space-x-2 text-muted-foreground text-sm'>
                  <span>Selected:</span>
                  <Badge variant='outline'>{selectedAgent.name}</Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='container mx-auto px-4 py-8'>
        <div className='mx-auto max-w-6xl'>
          {workspaceId ? (
            <AgentSelectionInterface
              workspaceId={workspaceId}
              onAgentSelect={handleAgentSelect}
              selectedAgent={selectedAgent}
              showRecommendations={true}
              className='space-y-8'
            />
          ) : (
            <Card className='p-12'>
              <CardContent className='text-center'>
                <MessageCircle className='mx-auto mb-4 h-16 w-16 opacity-50' />
                <h2 className='mb-2 font-semibold text-xl'>Workspace Required</h2>
                <p className='mb-4 text-muted-foreground'>
                  You need to be in a workspace to access Parlant agents.
                </p>
                <Button onClick={handleGoBack}>Go to Workspace</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className='mt-16 border-t bg-card/50'>
        <div className='container mx-auto px-4 py-6'>
          <div className='mx-auto max-w-6xl'>
            <div className='text-center text-muted-foreground text-sm'>
              <p>Powered by Parlant AI • Seamlessly integrated with Sim workflows</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
