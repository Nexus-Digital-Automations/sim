'use client'

import React, { Suspense, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useModeSwitch } from '@/contexts/mode-context'
import { useContextPreservation } from '@/hooks/use-context-preservation'
import { ModeTransition } from './mode-transition'
import { HybridMode } from './hybrid-mode'
import { ModeShortcutsProvider, QuickShortcutHints } from './mode-shortcuts'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'

const logger = createLogger('ModeSwitcher')

// Dynamically import heavy components for better performance
const WorkflowEditor = dynamic(() => import('@/app/workspace/[workspaceId]/w/[workflowId]/workflow'), {
  loading: () => <WorkflowEditorSkeleton />,
  ssr: false
})

const ChatInterface = dynamic(() => import('@/app/chat/workspace/[workspaceId]/agent/[agentId]/components/parlant-chat-interface'), {
  loading: () => <ChatInterfaceSkeleton />,
  ssr: false
})

interface ModeSwitcherProps {
  workspaceId: string
  workflowId?: string
  agentId?: string
  userId?: string
  className?: string
}

/**
 * Loading skeletons for dynamic components
 */
function WorkflowEditorSkeleton() {
  return (
    <div className="h-full w-full animate-pulse">
      <div className="flex h-full">
        {/* Toolbar skeleton */}
        <div className="w-16 bg-muted/50" />

        {/* Canvas skeleton */}
        <div className="flex-1 bg-background">
          <div className="absolute inset-4 rounded-lg bg-muted/30" />

          {/* Node skeletons */}
          <div className="absolute left-20 top-20 h-24 w-80 rounded-lg bg-muted/50" />
          <div className="absolute left-20 top-60 h-24 w-80 rounded-lg bg-muted/50" />
          <div className="absolute right-20 top-40 h-32 w-96 rounded-lg bg-muted/50" />
        </div>

        {/* Panel skeleton */}
        <div className="w-80 bg-muted/30" />
      </div>
    </div>
  )
}

function ChatInterfaceSkeleton() {
  return (
    <div className="flex h-full w-full animate-pulse flex-col">
      {/* Header skeleton */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted/70" />
          </div>
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 space-y-4 p-4">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
          <div className="h-8 w-8 rounded-full bg-muted" />
        </div>
      </div>

      {/* Input skeleton */}
      <div className="border-t bg-background p-4">
        <div className="flex gap-2">
          <div className="h-10 flex-1 rounded bg-muted" />
          <div className="h-10 w-10 rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

/**
 * Mode-specific navigation bar component
 */
function ModeNavigationBar({
  workspaceId,
  workflowId,
  agentId,
  className
}: {
  workspaceId: string
  workflowId?: string
  agentId?: string
  className?: string
}) {
  const { mode, switchToVisual, switchToChat, switchToHybrid, canSwitchMode, isTransitioning } = useModeSwitch()

  const navigationItems = [
    {
      mode: 'visual' as const,
      label: 'Visual Editor',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      action: switchToVisual,
      available: !!workflowId
    },
    {
      mode: 'chat' as const,
      label: 'Chat Interface',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      action: switchToChat,
      available: !!agentId
    },
    {
      mode: 'hybrid' as const,
      label: 'Hybrid Mode',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      action: switchToHybrid,
      available: !!(workflowId && agentId)
    }
  ]

  return (
    <div className={cn(
      'fixed top-4 left-1/2 z-40 flex -translate-x-1/2 items-center rounded-lg bg-background/95 shadow-lg ring-1 ring-border backdrop-blur-sm',
      className
    )}>
      <div className="flex p-1">
        {navigationItems.map((item) => (
          <button
            key={item.mode}
            onClick={item.action}
            disabled={!item.available || isTransitioning || !canSwitchMode(item.mode)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
              mode === item.mode
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              (!item.available || !canSwitchMode(item.mode)) && 'opacity-50 cursor-not-allowed',
              isTransitioning && 'opacity-75'
            )}
            title={!item.available ? `${item.label} not available` : item.label}
          >
            {item.icon}
            <span>{item.label}</span>
            {isTransitioning && mode === item.mode && (
              <div className="h-2 w-2 animate-pulse rounded-full bg-current" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Main mode switcher component that orchestrates all mode switching functionality
 */
export function ModeSwitcher({
  workspaceId,
  workflowId,
  agentId,
  userId,
  className
}: ModeSwitcherProps) {
  const { mode, isTransitioning } = useModeSwitch()

  // Initialize context preservation
  useContextPreservation()

  // Create components with proper props
  const visualComponent = useMemo(() => {
    if (!workflowId) {
      return <div className="flex h-full items-center justify-center text-muted-foreground">
        No workflow selected. Please select a workflow to use the visual editor.
      </div>
    }

    return (
      <Suspense fallback={<WorkflowEditorSkeleton />}>
        <WorkflowEditor />
      </Suspense>
    )
  }, [workflowId])

  const chatComponent = useMemo(() => {
    if (!agentId || !userId) {
      return <div className="flex h-full items-center justify-center text-muted-foreground">
        No agent selected. Please select an agent to use the chat interface.
      </div>
    }

    return (
      <Suspense fallback={<ChatInterfaceSkeleton />}>
        <ChatInterface
          agent={{ id: agentId, workspace_id: workspaceId } as any}
          workspaceId={workspaceId}
          userId={userId}
        />
      </Suspense>
    )
  }, [agentId, workspaceId, userId])

  // Render appropriate component based on current mode
  const renderModeContent = () => {
    switch (mode) {
      case 'visual':
        return visualComponent

      case 'chat':
        return chatComponent

      case 'hybrid':
        return (
          <HybridMode
            visualComponent={visualComponent}
            chatComponent={chatComponent}
          />
        )

      default:
        logger.error('Unknown mode', { mode })
        return <div className="flex h-full items-center justify-center text-destructive">
          Unknown mode: {mode}
        </div>
    }
  }

  return (
    <ModeShortcutsProvider>
      <div className={cn('relative h-full w-full', className)}>
        {/* Mode navigation bar */}
        <ModeNavigationBar
          workspaceId={workspaceId}
          workflowId={workflowId}
          agentId={agentId}
        />

        {/* Main content with transitions */}
        <ModeTransition>
          {renderModeContent()}
        </ModeTransition>

        {/* Quick shortcut hints (only show when not transitioning) */}
        {!isTransitioning && <QuickShortcutHints />}

        {/* Accessibility announcements */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isTransitioning
            ? `Switching to ${mode} mode...`
            : `Currently in ${mode} mode`
          }
        </div>
      </div>
    </ModeShortcutsProvider>
  )
}

/**
 * Hook for integrating mode switcher with existing routing
 */
export function useModeIntegration(workspaceId: string, workflowId?: string, agentId?: string) {
  const { mode, switchMode } = useModeSwitch()

  // Sync URL with current mode
  React.useEffect(() => {
    const url = new URL(window.location.href)

    // Update URL params to reflect current mode and context
    if (mode === 'visual' && workflowId) {
      url.searchParams.set('mode', 'visual')
      url.searchParams.delete('agent')
      if (workflowId) url.searchParams.set('workflow', workflowId)
    } else if (mode === 'chat' && agentId) {
      url.searchParams.set('mode', 'chat')
      url.searchParams.delete('workflow')
      if (agentId) url.searchParams.set('agent', agentId)
    } else if (mode === 'hybrid' && workflowId && agentId) {
      url.searchParams.set('mode', 'hybrid')
      if (workflowId) url.searchParams.set('workflow', workflowId)
      if (agentId) url.searchParams.set('agent', agentId)
    }

    // Update URL without triggering a page reload
    window.history.replaceState({}, '', url.toString())
  }, [mode, workflowId, agentId])

  // Handle browser back/forward navigation
  React.useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href)
      const urlMode = url.searchParams.get('mode') as 'visual' | 'chat' | 'hybrid'

      if (urlMode && urlMode !== mode) {
        switchMode(urlMode)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [mode, switchMode])

  return {
    mode,
    switchMode,
    canUseVisual: !!workflowId,
    canUseChat: !!agentId,
    canUseHybrid: !!(workflowId && agentId)
  }
}

export default ModeSwitcher