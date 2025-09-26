/**
 * Agent Details Page
 *
 * Individual agent configuration page with full editing capabilities,
 * performance analytics, and guideline management.
 */

'use client'

import { useParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AgentAnalytics } from '../components/agent-analytics/agent-analytics'
import { AgentForm } from '../components/agent-form/agent-form'
import { VisualGuidelineBuilder } from '../components/guideline-builder/visual-guideline-builder'
import { JourneyCreator } from '../components/journey-creator/journey-creator'

export default function AgentDetailsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const agentId = params.agentId as string

  return (
    <div className='container mx-auto px-4 py-6'>
      <Tabs defaultValue='configuration' className='w-full'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='configuration'>Configuration</TabsTrigger>
          <TabsTrigger value='guidelines'>Guidelines</TabsTrigger>
          <TabsTrigger value='journeys'>Journeys</TabsTrigger>
          <TabsTrigger value='analytics'>Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value='configuration' className='mt-6'>
          <AgentForm workspaceId={workspaceId} agentId={agentId} />
        </TabsContent>

        <TabsContent value='guidelines' className='mt-6'>
          <VisualGuidelineBuilder
            agentId={agentId}
            workspaceId={workspaceId}
            guidelines={[]}
            onGuidelinesChange={() => {}}
          />
        </TabsContent>

        <TabsContent value='journeys' className='mt-6'>
          <JourneyCreator agentId={agentId} workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value='analytics' className='mt-6'>
          <AgentAnalytics agentId={agentId} workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
