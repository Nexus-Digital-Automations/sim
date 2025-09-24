import { AgentSelector } from './components/agent-selector'

interface WorkspaceChatPageProps {
  params: Promise<{ workspaceId: string }>
}

/**
 * Main workspace chat page - shows agent selection interface
 * Users can choose from available agents in their workspace
 */
export default async function WorkspaceChatPage({ params }: WorkspaceChatPageProps) {
  const { workspaceId } = await params

  return (
    <div className='flex h-full items-center justify-center'>
      <div className='mx-auto max-w-2xl text-center'>
        <h1 className='mb-6 font-bold text-3xl tracking-tight'>Welcome to Sim Chat</h1>
        <p className='mb-8 text-lg text-muted-foreground'>
          Choose an agent to start a conversation or create a new one
        </p>
        <AgentSelector workspaceId={workspaceId} />
      </div>
    </div>
  )
}
