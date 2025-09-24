import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { SessionProvider } from '@/lib/session/session-context'
import { ConditionalThemeProvider } from '@/app/conditional-theme-provider'
import './[subdomain]/chat.css'

export const metadata: Metadata = {
  title: 'Chat - Sim',
  description: 'Conversational AI interface for Sim workflows',
}

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/login?redirect=/chat')
  }

  return (
    <ConditionalThemeProvider>
      <SessionProvider>
        <div className='min-h-screen bg-background'>
          {children}
        </div>
      </SessionProvider>
    </ConditionalThemeProvider>
  )
}