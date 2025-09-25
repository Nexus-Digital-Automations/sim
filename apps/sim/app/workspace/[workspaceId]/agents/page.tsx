/**
 * Agent Management Main Page
 *
 * Main entry point for agent management within workspace settings.
 * Provides overview of agents and navigation to detailed management.
 */

import { Suspense } from 'react'
import { BarChart3, Plus, Settings } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { AgentList } from './components/agent-list/agent-list'
import { AgentListSkeleton } from './components/agent-list/agent-list-skeleton'
import { CreateAgentButton } from './components/create-agent-button'

interface AgentsPageProps {
  params: {
    workspaceId: string
  }
}

export const metadata: Metadata = {
  title: 'Agent Management',
  description: 'Manage AI agents for your workspace',
}

export default async function AgentsPage({ params }: AgentsPageProps) {
  const { workspaceId } = params

  return (
    <div className='flex-1 space-y-6 p-6'>
      <PageHeader
        title='Agent Management'
        description='Create and manage AI agents to automate tasks and conversations'
        className='border-b pb-6'
      >
        <div className='flex items-center gap-3'>
          <Link href={`/workspace/${workspaceId}/agents/analytics`}>
            <Button variant='outline' size='sm'>
              <BarChart3 className='mr-2 h-4 w-4' />
              Analytics
            </Button>
          </Link>
          <Link href={`/workspace/${workspaceId}/agents/new`}>
            <Button size='sm'>
              <Plus className='mr-2 h-4 w-4' />
              New Agent
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-4'>
        {/* Main Content */}
        <div className='lg:col-span-3'>
          <Suspense fallback={<AgentListSkeleton />}>
            <AgentList workspaceId={workspaceId} />
          </Suspense>
        </div>

        {/* Sidebar */}
        <div className='space-y-6'>
          <div className='rounded-lg border bg-card p-6'>
            <h3 className='mb-4 font-semibold'>Quick Actions</h3>
            <div className='space-y-3'>
              <CreateAgentButton workspaceId={workspaceId} />

              <Link
                href={`/workspace/${workspaceId}/agents/templates`}
                className='flex items-center text-muted-foreground text-sm transition-colors hover:text-foreground'
              >
                <Settings className='mr-2 h-4 w-4' />
                Agent Templates
              </Link>

              <Link
                href={`/workspace/${workspaceId}/agents/tools`}
                className='flex items-center text-muted-foreground text-sm transition-colors hover:text-foreground'
              >
                <Settings className='mr-2 h-4 w-4' />
                Tool Configuration
              </Link>
            </div>
          </div>

          <div className='rounded-lg border bg-card p-6'>
            <h3 className='mb-4 font-semibold'>Getting Started</h3>
            <div className='space-y-3 text-muted-foreground text-sm'>
              <p>
                Agents are AI-powered assistants that can automate tasks, answer questions, and
                interact with your tools and workflows.
              </p>
              <div className='space-y-2'>
                <p className='font-medium text-foreground'>Next steps:</p>
                <ol className='ml-2 list-inside list-decimal space-y-1'>
                  <li>Create your first agent</li>
                  <li>Define guidelines for behavior</li>
                  <li>Connect tools and workflows</li>
                  <li>Test and refine performance</li>
                </ol>
              </div>
            </div>
          </div>

          <div className='rounded-lg border bg-card p-6'>
            <h3 className='mb-4 font-semibold'>Usage Stats</h3>
            <div className='space-y-3'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Active Agents</span>
                <span className='font-medium'>-</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Conversations Today</span>
                <span className='font-medium'>-</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Success Rate</span>
                <span className='font-medium'>-</span>
              </div>
              <Link
                href={`/workspace/${workspaceId}/agents/analytics`}
                className='text-primary text-xs hover:underline'
              >
                View detailed analytics →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
