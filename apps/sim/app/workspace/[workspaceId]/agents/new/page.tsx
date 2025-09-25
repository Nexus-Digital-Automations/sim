/**
 * New Agent Creation Page
 *
 * Form interface for creating new AI agents with configuration options,
 * guidelines setup, and initial tool selection.
 */

import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { AgentForm } from '../components/agent-form/agent-form'

interface NewAgentPageProps {
  params: {
    workspaceId: string
  }
  searchParams: {
    duplicate?: string
    template?: string
  }
}

export const metadata: Metadata = {
  title: 'Create Agent',
  description: 'Create a new AI agent for your workspace',
}

export default async function NewAgentPage({ params, searchParams }: NewAgentPageProps) {
  const { workspaceId } = params
  const { duplicate, template } = searchParams

  const pageTitle = duplicate
    ? 'Duplicate Agent'
    : template
      ? 'Create Agent from Template'
      : 'Create Agent'

  const pageDescription = duplicate
    ? 'Create a copy of an existing agent with the same configuration'
    : template
      ? 'Create a new agent using a predefined template'
      : 'Configure a new AI agent to automate tasks and conversations'

  return (
    <div className='flex-1 space-y-6 p-6'>
      <PageHeader title={pageTitle} description={pageDescription} className='border-b pb-6'>
        <Link href={`/workspace/${workspaceId}/agents`}>
          <Button variant='outline' size='sm'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Agents
          </Button>
        </Link>
      </PageHeader>

      <div className='max-w-4xl'>
        <Suspense fallback={<div>Loading agent form...</div>}>
          <AgentForm workspaceId={workspaceId} duplicateFromId={duplicate} templateId={template} />
        </Suspense>
      </div>
    </div>
  )
}
