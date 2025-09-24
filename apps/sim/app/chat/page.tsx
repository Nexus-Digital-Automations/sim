import { db } from '@sim/db'
import { member } from '@sim/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

/**
 * Main chat page - redirects to workspace-specific chat
 * This page determines the user's default workspace and redirects accordingly
 */
export default async function ChatPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/login?redirect=/chat')
  }

  // Find the user's active organization
  let organizationId = session.session?.activeOrganizationId

  if (!organizationId) {
    // Try to find the first organization this user is a member of
    const memberships = await db
      .select()
      .from(member)
      .where(eq(member.userId, session.user.id))
      .limit(1)

    if (memberships.length > 0) {
      organizationId = memberships[0].organizationId
    }
  }

  if (!organizationId) {
    // User has no organizations, redirect to workspace setup
    redirect('/workspace/create')
  }

  // Redirect to workspace-specific chat
  redirect(`/chat/workspace/${organizationId}`)
}
