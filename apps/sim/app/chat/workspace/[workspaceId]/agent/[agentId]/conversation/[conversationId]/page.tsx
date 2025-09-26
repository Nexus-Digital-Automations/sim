import { db } from '@sim/db'
import { member } from '@sim/db/schema'
import { and, eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getAgentById, getUserCanAccessAgent } from '@/lib/parlant/agents'
import { getConversationById, getUserCanAccessConversation } from '@/lib/parlant/conversations'
import { ParlantChatInterface } from '../../components/parlant-chat-interface'

interface ConversationPageProps {
  params: Promise<{
    workspaceId: string
    agentId: string
    conversationId: string
  }>
}

/**
 * Specific conversation page
 * Resumes an existing conversation with an agent
 */
export default async function ConversationPage({ params }: ConversationPageProps) {
  const { workspaceId, agentId, conversationId } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect('/login?redirect=/chat')
  }

  // Verify user has access to this workspace
  const membership = await db
    .select()
    .from(member)
    .where(and(eq(member.userId, session.user.id), eq(member.organizationId, workspaceId)))
    .limit(1)

  if (membership.length === 0) {
    notFound()
  }

  // Fetch the agent and verify access
  const agent = await getAgentById(agentId)
  if (!agent || agent.workspace_id !== workspaceId) {
    notFound()
  }

  // Verify agent access
  const canAccessAgent = await getUserCanAccessAgent(session.user.id, agentId)
  if (!canAccessAgent) {
    notFound()
  }

  // Fetch the conversation and verify access
  const conversation = await getConversationById(conversationId)
  if (!conversation || conversation.agent_id !== agentId) {
    notFound()
  }

  // Verify conversation access
  const canAccessConversation = await getUserCanAccessConversation(session.user.id, conversationId)
  if (!canAccessConversation) {
    notFound()
  }

  return (
    <div className='h-full'>
      <ParlantChatInterface
        agent={agent}
        workspaceId={workspaceId}
        userId={session.user.id}
        conversationId={conversationId}
        conversation={conversation}
      />
    </div>
  )
}
