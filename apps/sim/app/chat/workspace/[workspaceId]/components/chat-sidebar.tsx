'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  MessageCircle,
  Plus,
  History,
  Bot,
  Settings,
  Archive,
  Search
} from 'lucide-react'
import { Agent } from '@/lib/parlant/agents'
import { Conversation } from '@/lib/parlant/conversations'
import { Input } from '@/components/ui/input'

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
          fetch(`/api/chat/workspaces/${workspaceId}/conversations?limit=10`)
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

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredConversations = recentConversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className='flex h-full flex-col bg-muted/50'>
      {/* Header */}
      <div className='p-4 border-b border-border'>
        <h2 className='font-semibold text-lg truncate' title={workspace.name}>
          {workspace.name}
        </h2>
        <p className='text-sm text-muted-foreground'>Chat Interface</p>
      </div>

      {/* Search */}
      <div className='p-4 pb-2'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search agents & chats...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>
      </div>

      <ScrollArea className='flex-1'>
        <div className='p-4 space-y-6'>
          {/* New Chat Button */}
          <Button asChild className='w-full justify-start' size='sm'>
            <Link href={`/chat/workspace/${workspaceId}`}>
              <Plus className='mr-2 h-4 w-4' />
              New Chat
            </Link>
          </Button>

          {/* Available Agents */}
          <div>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-sm font-medium text-muted-foreground uppercase tracking-wide'>
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
                    <div key={i} className='h-8 bg-muted rounded animate-pulse' />
                  ))}
                </div>
              ) : filteredAgents.length > 0 ? (
                filteredAgents.map((agent) => (
                  <Button
                    key={agent.id}
                    asChild
                    variant={pathname.includes(`/agent/${agent.id}`) ? 'secondary' : 'ghost'}
                    className='w-full justify-start h-auto p-3'
                  >
                    <Link href={`/chat/workspace/${workspaceId}/agent/${agent.id}`}>
                      <div className='flex items-center space-x-3 w-full'>
                        <Bot className='h-4 w-4 flex-shrink-0' />
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium truncate'>{agent.name}</p>
                          {agent.description && (
                            <p className='text-xs text-muted-foreground truncate'>
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
                <p className='text-sm text-muted-foreground text-center py-4'>
                  {searchQuery ? 'No matching agents' : 'No agents available'}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Recent Conversations */}
          <div>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-sm font-medium text-muted-foreground uppercase tracking-wide'>
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
                    <div key={i} className='h-12 bg-muted rounded animate-pulse' />
                  ))}
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <Button
                    key={conversation.id}
                    asChild
                    variant={pathname.includes(`/conversation/${conversation.id}`) ? 'secondary' : 'ghost'}
                    className='w-full justify-start h-auto p-3'
                  >
                    <Link
                      href={`/chat/workspace/${workspaceId}/agent/${conversation.agent_id}/conversation/${conversation.id}`}
                    >
                      <div className='flex items-start space-x-3 w-full'>
                        <MessageCircle className='h-4 w-4 flex-shrink-0 mt-0.5' />
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium truncate'>
                            {conversation.title || 'Untitled Chat'}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {new Date(conversation.updated_at).toLocaleDateString()}
                          </p>
                          <div className='flex items-center space-x-2 mt-1'>
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
                <p className='text-sm text-muted-foreground text-center py-4'>
                  {searchQuery ? 'No matching conversations' : 'No recent conversations'}
                </p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className='p-4 border-t border-border'>
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