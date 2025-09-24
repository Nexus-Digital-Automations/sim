'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  ArrowLeft,
  MoreHorizontal,
  Settings,
  Archive,
  Trash2,
  ExternalLink,
  MessageCircle,
  Bot
} from 'lucide-react'

interface ChatHeaderProps {
  workspaceId: string
  workspace: {
    id: string
    name: string
  }
  userRole: string
}

/**
 * Chat header component with breadcrumb navigation and context actions
 * Shows current location in chat hierarchy with relevant actions
 */
export function ChatHeader({ workspaceId, workspace, userRole }: ChatHeaderProps) {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Parse current route to determine context
  const routeSegments = pathname.split('/').filter(Boolean)
  const isAgentChat = routeSegments.includes('agent')
  const isConversation = routeSegments.includes('conversation')
  const isHistory = routeSegments.includes('history')

  const agentId = isAgentChat ? routeSegments[routeSegments.indexOf('agent') + 1] : null
  const conversationId = isConversation ? routeSegments[routeSegments.indexOf('conversation') + 1] : null

  // Mock data - in real implementation, these would come from props or API calls
  const currentAgent = agentId ? {
    id: agentId,
    name: 'Sample Agent',
    description: 'AI Assistant',
    is_active: true
  } : null

  const currentConversation = conversationId ? {
    id: conversationId,
    title: 'Sample Conversation',
    message_count: 15,
    is_archived: false,
    created_at: new Date()
  } : null

  const handleArchiveConversation = async () => {
    if (!conversationId) return

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: true })
      })

      if (response.ok) {
        // Refresh or redirect
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to archive conversation:', error)
    }
  }

  const handleDeleteConversation = async () => {
    if (!conversationId) return

    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Redirect to agent page
        window.location.href = `/chat/workspace/${workspaceId}/agent/${agentId}`
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  return (
    <div className='flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      {/* Left side - Breadcrumb Navigation */}
      <div className='flex items-center space-x-4'>
        {/* Back button for mobile */}
        <Button
          variant='ghost'
          size='sm'
          className='md:hidden'
          onClick={() => window.history.back()}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>

        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/workspace/${workspaceId}`} className='flex items-center'>
                  {workspace.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/chat/workspace/${workspaceId}`}>
                  Chat
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {isHistory && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>History</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}

            {isAgentChat && currentAgent && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/chat/workspace/${workspaceId}/agent/${agentId}`}>
                      <div className='flex items-center space-x-2'>
                        <Bot className='h-3 w-3' />
                        <span>{currentAgent.name}</span>
                      </div>
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}

            {isConversation && currentConversation && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className='flex items-center space-x-2'>
                    <MessageCircle className='h-3 w-3' />
                    <span>{currentConversation.title}</span>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right side - Context actions */}
      <div className='flex items-center space-x-2'>
        {/* Current context info */}
        {currentAgent && (
          <div className='hidden md:flex items-center space-x-2'>
            {currentAgent.is_active && (
              <Badge variant='secondary' className='text-xs'>
                Active
              </Badge>
            )}
            {currentConversation && (
              <Badge variant='outline' className='text-xs'>
                {currentConversation.message_count} messages
              </Badge>
            )}
          </div>
        )}

        {/* Actions menu */}
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm'>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align='end' className='w-48'>
            {/* Agent-specific actions */}
            {currentAgent && (
              <>
                <DropdownMenuItem asChild>
                  <Link href={`/chat/workspace/${workspaceId}/agent/${agentId}/history`}>
                    <MessageCircle className='mr-2 h-4 w-4' />
                    View Agent History
                  </Link>
                </DropdownMenuItem>

                {['admin', 'owner'].includes(userRole) && (
                  <DropdownMenuItem asChild>
                    <Link href={`/workspace/${workspaceId}/settings/agents/${agentId}`}>
                      <Settings className='mr-2 h-4 w-4' />
                      Agent Settings
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
              </>
            )}

            {/* Conversation-specific actions */}
            {currentConversation && (
              <>
                <DropdownMenuItem onClick={handleArchiveConversation}>
                  <Archive className='mr-2 h-4 w-4' />
                  Archive Conversation
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleDeleteConversation}
                  className='text-destructive focus:text-destructive'
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete Conversation
                </DropdownMenuItem>

                <DropdownMenuSeparator />
              </>
            )}

            {/* General actions */}
            <DropdownMenuItem asChild>
              <Link href={`/chat/workspace/${workspaceId}/history`}>
                <ExternalLink className='mr-2 h-4 w-4' />
                All Conversations
              </Link>
            </DropdownMenuItem>

            {['admin', 'owner'].includes(userRole) && (
              <DropdownMenuItem asChild>
                <Link href={`/workspace/${workspaceId}/settings/chat`}>
                  <Settings className='mr-2 h-4 w-4' />
                  Chat Settings
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}