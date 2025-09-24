'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bot,
  Loader2,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Trash2,
} from 'lucide-react'
import { useParams } from 'next/navigation'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { createLogger } from '@/lib/logs/console/logger'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useAgentManagementStore } from '@/stores/agents'
import type { ParlantAgent } from '@/stores/agents/types'
import { AgentConfigurationPanel } from './agent-configuration-panel'
import { CreateAgentModal } from './create-agent-modal'

const logger = createLogger('AgentsManagement')

interface AgentsProps {
  onOpenChange?: (open: boolean) => void
}

const STATUS_COLORS = {
  active:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  inactive:
    'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
  error:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  training:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
} as const

const STATUS_ICONS = {
  active: Play,
  inactive: Pause,
  error: AlertCircle,
  training: Loader2,
} as const

function AgentCard({
  agent,
  onEdit,
  onDelete,
  onToggleStatus,
  canEdit,
}: {
  agent: ParlantAgent
  onEdit: (agent: ParlantAgent) => void
  onDelete: (agent: ParlantAgent) => void
  onToggleStatus: (agent: ParlantAgent) => void
  canEdit: boolean
}) {
  const StatusIcon = STATUS_ICONS[agent.status]

  return (
    <Card className='group transition-all duration-200 hover:shadow-md'>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex items-start gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10'>
              <Bot className='h-5 w-5 text-primary' />
            </div>
            <div className='min-w-0 flex-1'>
              <CardTitle className='truncate text-base'>{agent.name}</CardTitle>
              <CardDescription className='mt-1 text-sm'>{agent.description}</CardDescription>
            </div>
          </div>
          <div className='flex items-center gap-1'>
            <Badge variant='outline' className={`text-xs ${STATUS_COLORS[agent.status]}`}>
              <StatusIcon
                className={`mr-1 h-3 w-3 ${agent.status === 'training' ? 'animate-spin' : ''}`}
              />
              {agent.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className='pt-0'>
        <div className='space-y-3'>
          {/* Stats */}
          <div className='flex items-center gap-4 text-muted-foreground text-sm'>
            <div className='flex items-center gap-1'>
              <span className='font-medium'>{agent.conversationCount}</span>
              <span>conversations</span>
            </div>
            <div className='flex items-center gap-1'>
              <span className='font-medium'>{agent.guidelines.length}</span>
              <span>guidelines</span>
            </div>
            <div className='flex items-center gap-1'>
              <span className='font-medium'>{agent.journeys.length}</span>
              <span>journeys</span>
            </div>
          </div>

          {/* Last active */}
          {agent.lastActiveAt && (
            <div className='text-muted-foreground text-xs'>
              Last active:{' '}
              {new Date(agent.lastActiveAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          )}

          {/* Actions */}
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onEdit(agent)}
              className='h-8 flex-1'
              disabled={!canEdit}
            >
              <Settings className='mr-2 h-4 w-4' />
              Configure
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={() => onToggleStatus(agent)}
              className='h-8'
              disabled={!canEdit || agent.status === 'training'}
            >
              {agent.status === 'active' ? (
                <Pause className='h-4 w-4' />
              ) : (
                <Play className='h-4 w-4' />
              )}
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={() => onDelete(agent)}
              className='h-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20'
              disabled={!canEdit}
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AgentSkeleton() {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex items-start gap-3'>
            <Skeleton className='h-10 w-10 rounded-lg' />
            <div className='min-w-0 flex-1 space-y-2'>
              <Skeleton className='h-5 w-32' />
              <Skeleton className='h-4 w-48' />
            </div>
          </div>
          <Skeleton className='h-6 w-16 rounded-full' />
        </div>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='space-y-3'>
          <div className='flex items-center gap-4'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-4 w-20' />
          </div>
          <Skeleton className='h-3 w-32' />
          <div className='flex items-center gap-2'>
            <Skeleton className='h-8 flex-1' />
            <Skeleton className='h-8 w-8' />
            <Skeleton className='h-8 w-8' />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function Agents({ onOpenChange }: AgentsProps) {
  const params = useParams()
  const workspaceId = (params?.workspaceId as string) || ''
  const userPermissions = useUserPermissionsContext()
  const canManageAgents = userPermissions.canEdit || userPermissions.canAdmin

  // Store state
  const {
    agents,
    selectedAgent,
    isLoading,
    error,
    isDeletingAgent,
    isUpdatingAgent,
    loadAgents,
    deleteAgent,
    updateAgent,
    selectAgent,
    clearError,
  } = useAgentManagementStore()

  // Local state
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [deleteConfirmAgent, setDeleteConfirmAgent] = useState<ParlantAgent | null>(null)

  // Load agents on mount
  useEffect(() => {
    if (workspaceId) {
      loadAgents(workspaceId).catch((error) => {
        logger.error('Failed to load agents on mount:', error)
      })
    }
  }, [workspaceId, loadAgents])

  // Filter agents based on search term
  const filteredAgents = useMemo(() => {
    if (!searchTerm.trim()) {
      return agents
    }

    const term = searchTerm.toLowerCase()
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(term) ||
        agent.description.toLowerCase().includes(term) ||
        agent.status.toLowerCase().includes(term)
    )
  }, [agents, searchTerm])

  const handleAgentCreated = (agent: ParlantAgent) => {
    logger.info('Agent created:', { agentId: agent.id, name: agent.name })
    // Agent is automatically added to store by createAgent
  }

  const handleEditAgent = (agent: ParlantAgent) => {
    selectAgent(agent)
    setShowConfigPanel(true)
  }

  const handleDeleteAgent = async (agent: ParlantAgent) => {
    try {
      await deleteAgent(agent.id)
      logger.info('Agent deleted successfully:', { agentId: agent.id, name: agent.name })
      setDeleteConfirmAgent(null)
    } catch (error) {
      logger.error('Failed to delete agent:', error)
    }
  }

  const handleToggleStatus = async (agent: ParlantAgent) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active'

    try {
      await updateAgent(agent.id, { status: newStatus })
      logger.info('Agent status updated:', {
        agentId: agent.id,
        name: agent.name,
        newStatus,
      })
    } catch (error) {
      logger.error('Failed to update agent status:', error)
    }
  }

  const handleCloseConfigPanel = () => {
    setShowConfigPanel(false)
    selectAgent(null)
  }

  return (
    <div className='relative flex h-full flex-col'>
      {/* Fixed Header */}
      <div className='px-6 pt-4 pb-4'>
        <div className='flex items-center justify-between gap-4'>
          {/* Search */}
          <div className='flex h-9 w-64 items-center gap-2 rounded-lg border bg-transparent pr-2 pl-3'>
            <Search className='h-4 w-4 flex-shrink-0 text-muted-foreground' strokeWidth={2} />
            <Input
              placeholder='Search agents...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='flex-1 border-0 bg-transparent px-0 font-[380] font-sans text-base text-foreground leading-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0'
            />
          </div>

          {/* Create Button */}
          <Button
            onClick={() => setShowCreateModal(true)}
            variant='default'
            className='h-9 rounded-[8px] bg-primary text-white hover:bg-primary/90'
            disabled={!canManageAgents}
          >
            <Plus className='mr-2 h-4 w-4' />
            Create Agent
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className='mt-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-4 w-4' />
              <span className='text-sm'>{error}</span>
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={clearError}
              className='h-8 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40'
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className='scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent min-h-0 flex-1 overflow-y-auto px-6'>
        <div className='pb-6'>
          {isLoading && agents.length === 0 ? (
            // Loading skeletons
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              {Array.from({ length: 4 }).map((_, i) => (
                <AgentSkeleton key={i} />
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            // Empty state
            <div className='flex h-64 flex-col items-center justify-center text-center'>
              <Bot className='h-12 w-12 text-muted-foreground' />
              <h3 className='mt-4 font-medium text-lg'>
                {searchTerm.trim() ? 'No agents found' : 'No agents yet'}
              </h3>
              <p className='mt-2 text-muted-foreground text-sm'>
                {searchTerm.trim()
                  ? `No agents match "${searchTerm}"`
                  : 'Create your first conversational AI agent to get started.'}
              </p>
              {!searchTerm.trim() && canManageAgents && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className='mt-4 h-9 rounded-[8px] bg-primary text-white hover:bg-primary/90'
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Create Your First Agent
                </Button>
              )}
            </div>
          ) : (
            // Agents grid
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={handleEditAgent}
                  onDelete={(agent) => setDeleteConfirmAgent(agent)}
                  onToggleStatus={handleToggleStatus}
                  canEdit={canManageAgents}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Agent Modal */}
      <CreateAgentModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onAgentCreated={handleAgentCreated}
      />

      {/* Agent Configuration Panel */}
      {selectedAgent && (
        <AgentConfigurationPanel
          agent={selectedAgent}
          open={showConfigPanel}
          onOpenChange={handleCloseConfigPanel}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmAgent} onOpenChange={() => setDeleteConfirmAgent(null)}>
        <AlertDialogContent className='rounded-[10px] sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className='font-semibold'>{deleteConfirmAgent?.name}</span>? This will
              permanently remove the agent and all its configurations, guidelines, and journeys.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className='flex'>
            <AlertDialogCancel className='h-9 rounded-[8px]' disabled={isDeletingAgent}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmAgent && handleDeleteAgent(deleteConfirmAgent)}
              className='h-9 rounded-[8px] bg-red-500 text-white hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600'
              disabled={isDeletingAgent}
            >
              {isDeletingAgent && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Delete Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
