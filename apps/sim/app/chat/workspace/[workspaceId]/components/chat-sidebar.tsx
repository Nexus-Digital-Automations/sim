'use client'

import { useEffect, useState } from 'react'
import { Archive, Bot, History, MessageCircle, Plus, Search, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { Agent } from '@/lib/parlant/agents'
import type { Conversation } from '@/lib/parlant/conversations'

interface ChatSidebarProps {
  workspaceId: string
  workspace: {
    id: string
    name: string
  }
  userRole: string
}

/**
 * Chat sidebar component with agent selection and conversation history
 * Provides navigation between different agents and past conversations
 */
export function ChatSidebar({ workspaceId, workspace, userRole }: ChatSidebarProps) {
  const pathname = usePathname()
  const [agents, setAgents] = useState<Agent[]>([])
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Load agents and recent conversations
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch agents and recent conversations
        const [agentsRes, conversationsRes] = await Promise.all([
          fetch(`/api/chat/workspaces/${workspaceId}/agents`),
          fetch(`/api/chat/workspaces/${workspaceId}/conversations?limit=10`),
        ])

        if (agentsRes.ok) {
          const agentsData = await agentsRes.json()
          setAgents(agentsData.agents || [])
        }

        if (conversationsRes.ok) {
          const conversationsData = await conversationsRes.json()
          setRecentConversations(conversationsData.conversations || [])
        }
      } catch (error) {
        console.error('Failed to load sidebar data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [workspaceId])

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredConversations = recentConversations.filter((conv) =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className='flex h-full flex-col bg-muted/50'>
      {/* Header */}
      <div className='border-border border-b p-4'>
        <h2 className='truncate font-semibold text-lg' title={workspace.name}>
          {workspace.name}
        </h2>
        <p className='text-muted-foreground text-sm'>Chat Interface</p>
      </div>

      {/* Search */}
      <div className='p-4 pb-2'>
        <div className='relative'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
          <Input
            placeholder='Search agents & chats...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>
      </div>

      <ScrollArea className='flex-1'>
        <div className='space-y-6 p-4'>
          {/* New Chat Button */}
          <Button asChild className='w-full justify-start' size='sm'>
            <Link href={`/chat/workspace/${workspaceId}`}>
              <Plus className='mr-2 h-4 w-4' />
              New Chat
            </Link>
          </Button>

          {/* Available Agents */}
          <div>
            <div className='mb-3 flex items-center justify-between'>
              <h3 className='font-medium text-muted-foreground text-sm uppercase tracking-wide'>
                Agents
              </h3>
              {['admin', 'owner'].includes(userRole) && (
                <Button variant='ghost' size='sm' className='h-6 w-6 p-0'>
                  <Plus className='h-3 w-3' />
                </Button>
              )}
            </div>

            <div className='space-y-1'>
              {loading ? (
                <div className='space-y-2'>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className='h-8 animate-pulse rounded bg-muted' />
                  ))}
                </div>
              ) : filteredAgents.length > 0 ? (
                filteredAgents.map((agent) => (
                  <Button
                    key={agent.id}
                    asChild
                    variant={pathname.includes(`/agent/${agent.id}`) ? 'secondary' : 'ghost'}
                    className='h-auto w-full justify-start p-3'
                  >
                    <Link href={`/chat/workspace/${workspaceId}/agent/${agent.id}`}>
                      <div className='flex w-full items-center space-x-3'>
                        <Bot className='h-4 w-4 flex-shrink-0' />
                        <div className='min-w-0 flex-1'>
                          <p className='truncate font-medium text-sm'>{agent.name}</p>
                          {agent.description && (
                            <p className='truncate text-muted-foreground text-xs'>
                              {agent.description}
                            </p>
                          )}
                        </div>
                        {agent.is_active && (
                          <Badge variant='secondary' className='text-xs'>
                            Active
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </Button>
                ))
              ) : (
                <p className='py-4 text-center text-muted-foreground text-sm'>
                  {searchQuery ? 'No matching agents' : 'No agents available'}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Recent Conversations */}
          <div>
            <div className='mb-3 flex items-center justify-between'>
              <h3 className='font-medium text-muted-foreground text-sm uppercase tracking-wide'>
                Recent Chats
              </h3>
              <Button asChild variant='ghost' size='sm' className='h-6 w-6 p-0'>
                <Link href={`/chat/workspace/${workspaceId}/history`}>
                  <History className='h-3 w-3' />
                </Link>
              </Button>
            </div>

            <div className='space-y-1'>
              {loading ? (
                <div className='space-y-2'>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className='h-12 animate-pulse rounded bg-muted' />
                  ))}
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <Button
                    key={conversation.id}
                    asChild
                    variant={
                      pathname.includes(`/conversation/${conversation.id}`) ? 'secondary' : 'ghost'
                    }
                    className='h-auto w-full justify-start p-3'
                  >
                    <Link
                      href={`/chat/workspace/${workspaceId}/agent/${conversation.agent_id}/conversation/${conversation.id}`}
                    >
                      <div className='flex w-full items-start space-x-3'>
                        <MessageCircle className='mt-0.5 h-4 w-4 flex-shrink-0' />
                        <div className='min-w-0 flex-1'>
                          <p className='truncate font-medium text-sm'>
                            {conversation.title || 'Untitled Chat'}
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            {new Date(conversation.updated_at).toLocaleDateString()}
                          </p>
                          <div className='mt-1 flex items-center space-x-2'>
                            <Badge variant='outline' className='text-xs'>
                              {conversation.message_count} messages
                            </Badge>
                            {conversation.is_archived && (
                              <Archive className='h-3 w-3 text-muted-foreground' />
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Button>
                ))
              ) : (
                <p className='py-4 text-center text-muted-foreground text-sm'>
                  {searchQuery ? 'No matching conversations' : 'No recent conversations'}
                </p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className='border-border border-t p-4'>
        <div className='flex items-center space-x-2'>
          <Button asChild variant='ghost' size='sm' className='flex-1'>
            <Link href={`/chat/workspace/${workspaceId}/history`}>
              <History className='mr-2 h-4 w-4' />
              View All
            </Link>
          </Button>
          {['admin', 'owner'].includes(userRole) && (
            <Button asChild variant='ghost' size='sm'>
              <Link href={`/workspace/${workspaceId}/settings/agents`}>
                <Settings className='h-4 w-4' />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
