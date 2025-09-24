import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@sim/db'
import { and, eq } from 'drizzle-orm'
import { member } from '@sim/db/schema'
import { ChatHistory } from '../components/chat-history'

interface ChatHistoryPageProps {
  params: Promise<{ workspaceId: string }>
  searchParams: Promise<{ agent?: string; page?: string }>
}

/**
 * Chat history page
 * Shows all past conversations for the workspace with filtering options
 */
export default async function ChatHistoryPage({ params, searchParams }: ChatHistoryPageProps) {
  const { workspaceId } = await params
  const { agent: agentFilter, page = '1' } = await searchParams
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
    redirect('/workspace')
  }

  return (
    <div className='container mx-auto py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>Chat History</h1>
        <p className='text-muted-foreground mt-2'>
          Browse and search your past conversations
        </p>
      </div>

      <ChatHistory
        workspaceId={workspaceId}
        userId={session.user.id}
        agentFilter={agentFilter}
        currentPage={parseInt(page)}
      />
    </div>
  )
}