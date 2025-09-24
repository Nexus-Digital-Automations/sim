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
      <div className='max-w-2xl mx-auto text-center'>
        <h1 className='text-3xl font-bold tracking-tight mb-6'>
          Welcome to Sim Chat
        </h1>
        <p className='text-lg text-muted-foreground mb-8'>
          Choose an agent to start a conversation or create a new one
        </p>
        <AgentSelector workspaceId={workspaceId} />
      </div>
    </div>
  )
}