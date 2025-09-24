'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/lib/auth-client'
import type { WorkflowMetadata } from '@/stores/workflows/registry/types'
import { ChatWithWorkflowButton, useChatWithWorkflow } from '@/app/workspace/[workspaceId]/w/components/chat-with-workflow-button'

interface WorkflowItemProps {
  workflow: WorkflowMetadata
  active: boolean
  isMarketplace?: boolean
}

function WorkflowItem({ workflow, active, isMarketplace }: WorkflowItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { startChat } = useChatWithWorkflow()

  return (
    <div
      className='group relative'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={`/workspace/${workspaceId}/w/${workflow.id}`}
        className={clsx(
          'flex items-center rounded-md px-2 py-1.5 pr-8 font-medium text-sm transition-colors',
          active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
        )}
      >
        <div
          className='mr-2 h-[14px] w-[14px] flex-shrink-0 rounded'
          style={{ backgroundColor: workflow.color }}
        />
        <span className='truncate'>
          {workflow.name}
          {isMarketplace && ' (Preview)'}
        </span>
      </Link>
      {!isMarketplace && isHovered && (
        <div className='absolute right-1 top-1/2 -translate-y-1/2 flex items-center'>
          <ChatWithWorkflowButton
            workflowId={workflow.id}
            workflowName={workflow.name}
            onChatClick={startChat}
            variant="icon-only"
            size="sm"
            className='h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
          />
        </div>
      )}
    </div>
  )
}

interface WorkflowListProps {
  regularWorkflows: WorkflowMetadata[]
  marketplaceWorkflows: WorkflowMetadata[]
  isLoading?: boolean
}

export function WorkflowList({
  regularWorkflows,
  marketplaceWorkflows,
  isLoading = false,
}: WorkflowListProps) {
  const pathname = usePathname()
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { data: session } = useSession()

  // Generate skeleton items for loading state
  const skeletonItems = useMemo(() => {
    return Array(4)
      .fill(0)
      .map((_, i) => (
        <div
          key={`skeleton-${i}`}
          className='mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5'
        >
          <Skeleton className='h-[14px] w-[14px] rounded-md' />
          <Skeleton className='h-4 w-20' />
        </div>
      ))
  }, [])

  // Only show empty state when not loading and user is logged in
  const showEmptyState =
    !isLoading &&
    session?.user &&
    regularWorkflows.length === 0 &&
    marketplaceWorkflows.length === 0

  return (
    <div className={`space-y-1 ${isLoading ? 'opacity-60' : ''}`}>
      {isLoading ? (
        // Show skeleton loading state
        skeletonItems
      ) : (
        <>
          {/* Regular workflows */}
          {regularWorkflows.map((workflow) => (
            <WorkflowItem
              key={workflow.id}
              workflow={workflow}
              active={pathname === `/workspace/${workspaceId}/w/${workflow.id}`}
            />
          ))}

          {/* Marketplace Temp Workflows (if any) */}
          {marketplaceWorkflows.length > 0 && (
            <div className='mt-2 border-border/30 border-t pt-2'>
              <h3 className='mb-1 px-2 font-medium text-muted-foreground text-xs'>Marketplace</h3>
              {marketplaceWorkflows.map((workflow) => (
                <WorkflowItem
                  key={workflow.id}
                  workflow={workflow}
                  active={pathname === `/workspace/${workspaceId}/w/${workflow.id}`}
                  isMarketplace
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {showEmptyState && (
            <div className='px-2 py-1.5 text-muted-foreground text-xs'>
              No workflows in {workspaceId ? 'this workspace' : 'your account'}. Create one to get
              started.
            </div>
          )}
        </>
      )}
    </div>
  )
}
