import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@sim/db'
import { and, eq } from 'drizzle-orm'
import { member } from '@sim/db/schema'
import { ParlantChatInterface } from './components/parlant-chat-interface'
import { getAgentById, getUserCanAccessAgent } from '@/lib/parlant/agents'

interface AgentChatPageProps {
  params: Promise<{
    workspaceId: string
    agentId: string
  }>
}

/**
 * Individual agent chat page
 * Renders the Parlant chat interface for a specific agent within a workspace
 */
export default async function AgentChatPage({ params }: AgentChatPageProps) {
  const { workspaceId, agentId } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect('/login?redirect=/chat')
  }

  // Verify user has access to this workspace
  const membership = await db
    .select()
    .from(member)
    .where(
      and(eq(member.userId, session.user.id), eq(member.organizationId, workspaceId))
    )
    .limit(1)

  if (membership.length === 0) {
    notFound()
  }

  // Fetch the agent and verify access
  const agent = await getAgentById(agentId)
  if (!agent || agent.workspace_id !== workspaceId) {
    notFound()
  }

  // Additional access control - verify user can access this specific agent
  const canAccess = await getUserCanAccessAgent(session.user.id, agentId)
  if (!canAccess) {
    notFound()
  }

  return (
    <div className='h-full'>
      <ParlantChatInterface
        agent={agent}
        workspaceId={workspaceId}
        userId={session.user.id}
      />
    </div>
  )
}