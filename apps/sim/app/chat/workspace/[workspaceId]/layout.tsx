import type { ReactNode } from 'react'
import { db } from '@sim/db'
import { member, organization } from '@sim/db/schema'
import { and, eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ChatHeader } from './components/chat-header'
import { ChatSidebar } from './components/chat-sidebar'

interface WorkspaceChatLayoutProps {
  children: ReactNode
  params: Promise<{ workspaceId: string }>
}

/**
 * Workspace-specific chat layout with authentication and authorization checks
 * Ensures user has access to the workspace and provides navigation context
 */
export default async function WorkspaceChatLayout({ children, params }: WorkspaceChatLayoutProps) {
  const { workspaceId } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect('/login?redirect=/chat')
  }

  // Verify user has access to this workspace
  const membership = await db
    .select({
      organization: organization,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, session.user.id), eq(member.organizationId, workspaceId)))
    .limit(1)

  if (membership.length === 0) {
    notFound()
  }

  const workspace = membership[0].organization
  const userRole = membership[0].role

  return (
    <div className='flex h-screen bg-background'>
      {/* Sidebar for agent selection and chat history */}
      <div className='w-80 border-border border-r bg-muted/50'>
        <ChatSidebar workspaceId={workspaceId} workspace={workspace} userRole={userRole} />
      </div>

      {/* Main chat area */}
      <div className='flex flex-1 flex-col'>
        <ChatHeader workspaceId={workspaceId} workspace={workspace} userRole={userRole} />
        <main className='flex-1 overflow-hidden'>{children}</main>
      </div>
    </div>
  )
}
