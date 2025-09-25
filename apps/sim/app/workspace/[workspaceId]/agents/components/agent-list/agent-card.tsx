/**
 * Agent Card Component
 *
 * Displays an individual agent with status, actions, and quick info.
 * Supports both grid and list view modes.
 */

'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  BarChart3,
  Clock,
  Copy,
  MessageSquare,
  MoreHorizontal,
  Pause,
  Play,
  Settings,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'
import type { Agent } from '@/services/parlant/types'
import { useDeleteAgent, useUpdateAgent } from '../../hooks/use-agents'

interface AgentCardProps {
  agent: Agent
  workspaceId: string
  variant?: 'grid' | 'list'
  onUpdate?: () => void
}

export function AgentCard({ agent, workspaceId, variant = 'grid', onUpdate }: AgentCardProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const deleteAgent = useDeleteAgent(workspaceId)
  const updateAgent = useUpdateAgent(workspaceId)

  const handleDelete = async () => {
    try {
      await deleteAgent.mutateAsync(agent.id)
      toast({
        title: 'Agent deleted',
        description: `${agent.name} has been permanently deleted.`,
      })
      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error deleting agent',
        description: (error as Error).message,
        variant: 'destructive',
      })
    }
    setShowDeleteDialog(false)
  }

  const handleToggleStatus = async () => {
    try {
      const newStatus = agent.status === 'active' ? 'inactive' : 'active'
      await updateAgent.mutateAsync({
        agentId: agent.id,
        data: { status: newStatus },
      })
      toast({
        title: `Agent ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
        description: `${agent.name} is now ${newStatus}.`,
      })
      onUpdate?.()
    } catch (error) {
      toast({
        title: 'Error updating agent',
        description: (error as Error).message,
        variant: 'destructive',
      })
    }
  }

  const handleDuplicate = () => {
    router.push(`/workspace/${workspaceId}/agents/new?duplicate=${agent.id}`)
  }

  const getStatusBadge = (status: Agent['status']) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      training: 'outline',
    } as const

    return (
      <Badge variant={variants[status]} className='capitalize'>
        {status}
      </Badge>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (variant === 'list') {
    return (
      <Card className='transition-shadow hover:shadow-md'>
        <CardContent className='p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Avatar className='h-10 w-10'>
                <AvatarFallback className='bg-primary/10'>{getInitials(agent.name)}</AvatarFallback>
              </Avatar>

              <div className='min-w-0 flex-1'>
                <div className='flex items-center space-x-2'>
                  <Link
                    href={`/workspace/${workspaceId}/agents/${agent.id}`}
                    className='truncate font-semibold text-foreground hover:text-primary'
                  >
                    {agent.name}
                  </Link>
                  {getStatusBadge(agent.status)}
                </div>

                <p className='truncate text-muted-foreground text-sm'>
                  {agent.description || 'No description'}
                </p>

                <div className='mt-1 flex items-center space-x-4 text-muted-foreground text-xs'>
                  <span className='flex items-center'>
                    <Zap className='mr-1 h-3 w-3' />
                    {agent.guidelines?.length || 0} guidelines
                  </span>
                  <span className='flex items-center'>
                    <Users className='mr-1 h-3 w-3' />
                    {agent.journeys?.length || 0} journeys
                  </span>
                  <span className='flex items-center'>
                    <Clock className='mr-1 h-3 w-3' />
                    Updated {formatDistanceToNow(new Date(agent.updated_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>

            <div className='flex items-center space-x-2'>
              <Link href={`/workspace/${workspaceId}/agents/${agent.id}/analytics`}>
                <Button variant='ghost' size='sm'>
                  <BarChart3 className='h-4 w-4' />
                </Button>
              </Link>

              <Link href={`/workspace/${workspaceId}/agents/${agent.id}`}>
                <Button variant='outline' size='sm'>
                  <Settings className='mr-2 h-4 w-4' />
                  Configure
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='sm'>
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem onClick={handleToggleStatus}>
                    {agent.status === 'active' ? (
                      <>
                        <Pause className='mr-2 h-4 w-4' />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Play className='mr-2 h-4 w-4' />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className='mr-2 h-4 w-4' />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className='text-destructive'
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className='group transition-shadow hover:shadow-md'>
        <CardHeader className='pb-2'>
          <div className='flex items-start justify-between'>
            <div className='flex items-center space-x-3'>
              <Avatar className='h-10 w-10'>
                <AvatarFallback className='bg-primary/10'>{getInitials(agent.name)}</AvatarFallback>
              </Avatar>

              <div className='min-w-0 flex-1'>
                <Link
                  href={`/workspace/${workspaceId}/agents/${agent.id}`}
                  className='block truncate font-semibold text-foreground hover:text-primary'
                >
                  {agent.name}
                </Link>
                {getStatusBadge(agent.status)}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='opacity-0 transition-opacity group-hover:opacity-100'
                >
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={handleToggleStatus}>
                  {agent.status === 'active' ? (
                    <>
                      <Pause className='mr-2 h-4 w-4' />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Play className='mr-2 h-4 w-4' />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className='mr-2 h-4 w-4' />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className='text-destructive'
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className='py-2'>
          <p className='line-clamp-2 min-h-[2.5rem] text-muted-foreground text-sm'>
            {agent.description || 'No description provided'}
          </p>

          <div className='mt-3 flex items-center space-x-4 text-muted-foreground text-xs'>
            <span className='flex items-center'>
              <Zap className='mr-1 h-3 w-3' />
              {agent.guidelines?.length || 0}
            </span>
            <span className='flex items-center'>
              <Users className='mr-1 h-3 w-3' />
              {agent.journeys?.length || 0}
            </span>
            <span className='flex items-center'>
              <MessageSquare className='mr-1 h-3 w-3' />0 {/* TODO: Add conversation count */}
            </span>
          </div>
        </CardContent>

        <CardFooter className='pt-2 pb-4'>
          <div className='flex w-full space-x-2'>
            <Link href={`/workspace/${workspaceId}/agents/${agent.id}`} className='flex-1'>
              <Button variant='outline' size='sm' className='w-full'>
                <Settings className='mr-2 h-4 w-4' />
                Configure
              </Button>
            </Link>

            <Link href={`/workspace/${workspaceId}/agents/${agent.id}/analytics`}>
              <Button variant='ghost' size='sm'>
                <BarChart3 className='h-4 w-4' />
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{agent.name}"? This action cannot be undone. All
              guidelines, journeys, and conversation history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={deleteAgent.isPending}
            >
              {deleteAgent.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
