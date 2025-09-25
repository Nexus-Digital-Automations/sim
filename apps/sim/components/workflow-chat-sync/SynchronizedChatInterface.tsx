'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowUp,
  Eye,
  EyeOff,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Sync,
  SyncOff,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChatMessage } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel/components/chat/components/chat-message/chat-message'
import { useChatStore } from '@/stores/panel/chat/store'
import {
  useInitializeWorkflowChatSync,
  useWorkflowChatSyncStore,
} from '@/stores/workflow-chat-sync/store'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { ChatCommandSuggestions } from './ChatCommandSuggestions'
import { ConflictResolutionDialog } from './ConflictResolutionDialog'
import { WorkflowStateDisplay } from './WorkflowStateDisplay'

interface SynchronizedChatInterfaceProps {
  className?: string
  showSidebar?: boolean
  compactMode?: boolean
}

/**
 * SynchronizedChatInterface Component
 *
 * Enhanced chat interface with workflow synchronization capabilities.
 * Provides real-time workflow state representation, chat commands,
 * and conflict resolution.
 */
export function SynchronizedChatInterface({
  className = '',
  showSidebar = true,
  compactMode = false,
}: SynchronizedChatInterfaceProps) {
  const [chatMessage, setChatMessage] = useState('')
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [showStatePanel, setShowStatePanel] = useState(!compactMode)
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Chat store
  const { messages, addMessage, getWorkflowMessages } = useChatStore()

  // Workflow registry
  const { activeWorkflowId } = useWorkflowRegistry()

  // Sync store and initialization
  const syncStore = useWorkflowChatSyncStore()
  const syncHook = useInitializeWorkflowChatSync()

  // Get workflow-specific messages
  const workflowMessages = React.useMemo(() => {
    if (!activeWorkflowId) return []
    return getWorkflowMessages(activeWorkflowId).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }, [activeWorkflowId, getWorkflowMessages])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [workflowMessages, scrollToBottom])

  // Handle conflict detection
  useEffect(() => {
    if (syncStore.conflicts.length > 0 && !showConflictDialog) {
      setShowConflictDialog(true)
    }
  }, [syncStore.conflicts.length, showConflictDialog])

  // Handle message sending
  const handleSendMessage = useCallback(async () => {
    if (!chatMessage.trim() || !activeWorkflowId) return

    const message = chatMessage.trim()

    // Add user message
    addMessage({
      content: message,
      workflowId: activeWorkflowId,
      type: 'user',
    })

    // Clear input
    setChatMessage('')

    // Check if it's a command
    const command = syncStore.parseChatCommand(message)
    if (command) {
      // Command will be handled automatically by the sync store
      // due to the subscription in the store
    } else {
      // Regular workflow execution message
      // This would normally trigger workflow execution
      // For now, just acknowledge
      setTimeout(() => {
        addMessage({
          content: `I understand you said: "${message}". This would normally execute the workflow with your input.`,
          workflowId: activeWorkflowId,
          type: 'workflow',
        })
      }, 500)
    }

    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [chatMessage, activeWorkflowId, addMessage, syncStore])

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage]
  )

  // Handle command selection from suggestions
  const handleCommandSelect = useCallback((command: string) => {
    setChatMessage(command)
    setShowCommandSuggestions(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Get status indicators
  const getSyncStatusColor = () => {
    switch (syncStore.syncState) {
      case 'syncing':
        return 'text-blue-500'
      case 'error':
        return 'text-red-500'
      case 'conflict':
        return 'text-amber-500'
      default:
        return 'text-green-500'
    }
  }

  const getSyncStatusText = () => {
    switch (syncStore.syncState) {
      case 'syncing':
        return 'Syncing...'
      case 'error':
        return 'Sync Error'
      case 'conflict':
        return 'Conflicts'
      default:
        return 'In Sync'
    }
  }

  if (!activeWorkflowId) {
    return (
      <Card className={className}>
        <CardContent className='flex h-64 items-center justify-center'>
          <div className='space-y-3 text-center'>
            <MessageSquare className='mx-auto h-12 w-12 text-muted-foreground' />
            <p className='text-muted-foreground text-sm'>Select a workflow to start chatting</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className={`flex h-full gap-4 ${className}`}>
        {/* Main Chat Interface */}
        <div className='flex min-w-0 flex-1 flex-col'>
          <Card className='flex flex-1 flex-col'>
            {/* Header */}
            <CardHeader className='flex-row items-center justify-between space-y-0 pb-3'>
              <div className='flex items-center gap-2'>
                <MessageSquare className='h-5 w-5' />
                <span className='font-medium'>Workflow Chat</span>
                {syncStore.isEnabled && (
                  <Badge variant='outline' className='text-xs'>
                    <span
                      className={`mr-1 inline-block h-2 w-2 rounded-full ${getSyncStatusColor()}`}
                    />
                    {getSyncStatusText()}
                  </Badge>
                )}
              </div>

              <div className='flex items-center gap-1'>
                {/* Conflict indicator */}
                {syncStore.conflicts.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => setShowConflictDialog(true)}
                        className='h-8 w-8 p-0 text-amber-500'
                      >
                        <AlertTriangle className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{syncStore.conflicts.length} sync conflict(s)</TooltipContent>
                  </Tooltip>
                )}

                {/* Sync toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={syncStore.isEnabled ? syncStore.disableSync : syncStore.enableSync}
                      className='h-8 w-8 p-0'
                    >
                      {syncStore.isEnabled ? (
                        <Sync className='h-4 w-4' />
                      ) : (
                        <SyncOff className='h-4 w-4' />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {syncStore.isEnabled ? 'Disable sync' : 'Enable sync'}
                  </TooltipContent>
                </Tooltip>

                {/* State panel toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => setShowStatePanel(!showStatePanel)}
                      className='h-8 w-8 p-0'
                    >
                      {showStatePanel ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{showStatePanel ? 'Hide state' : 'Show state'}</TooltipContent>
                </Tooltip>

                {/* Command suggestions */}
                <Sheet open={showCommandSuggestions} onOpenChange={setShowCommandSuggestions}>
                  <SheetTrigger asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size='sm' variant='ghost' className='h-8 w-8 p-0'>
                          <Lightbulb className='h-4 w-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Command suggestions</TooltipContent>
                    </Tooltip>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Chat Commands</SheetTitle>
                      <SheetDescription>
                        Available commands for controlling your workflow
                      </SheetDescription>
                    </SheetHeader>
                    <div className='mt-6'>
                      <ChatCommandSuggestions
                        onCommandSelect={handleCommandSelect}
                        compact={compactMode}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </CardHeader>

            {/* State Display */}
            {showStatePanel && syncStore.isEnabled && (
              <>
                <div className='px-6'>
                  <WorkflowStateDisplay compact={compactMode} />
                </div>
                <Separator className='mx-6' />
              </>
            )}

            {/* Messages */}
            <CardContent className='flex min-h-0 flex-1 flex-col'>
              <ScrollArea className='flex-1'>
                <div className='space-y-4 pr-4'>
                  {workflowMessages.length === 0 ? (
                    <div className='flex h-32 items-center justify-center'>
                      <div className='space-y-2 text-center'>
                        <MessageSquare className='mx-auto h-8 w-8 text-muted-foreground' />
                        <p className='text-muted-foreground text-sm'>
                          Start a conversation with your workflow
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          Try saying "add llm block" or "run workflow"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {workflowMessages.map((message) => (
                        <ChatMessage key={message.id} message={message} />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className='border-t pt-4'>
                {/* Sync status alert */}
                {!syncStore.isEnabled && (
                  <Alert className='mb-3'>
                    <AlertTriangle className='h-4 w-4' />
                    <AlertDescription className='text-sm'>
                      Workflow synchronization is disabled. Enable it to use chat commands.
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={syncStore.enableSync}
                        className='ml-2 h-6 px-2'
                      >
                        Enable
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <div className='flex gap-2'>
                  <Input
                    ref={inputRef}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      syncStore.isEnabled ? 'Type a message or command...' : 'Type a message...'
                    }
                    className='flex-1'
                    disabled={syncStore.syncState === 'syncing'}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || syncStore.syncState === 'syncing'}
                    size='icon'
                  >
                    {syncStore.syncState === 'syncing' ? (
                      <RefreshCw className='h-4 w-4 animate-spin' />
                    ) : (
                      <ArrowUp className='h-4 w-4' />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        {showSidebar && !compactMode && (
          <div className='w-80 space-y-4'>
            {syncStore.isEnabled && <WorkflowStateDisplay />}
            <ChatCommandSuggestions onCommandSelect={handleCommandSelect} compact={true} />
          </div>
        )}

        {/* Conflict Resolution Dialog */}
        <ConflictResolutionDialog open={showConflictDialog} onOpenChange={setShowConflictDialog} />
      </div>
    </TooltipProvider>
  )
}

export default SynchronizedChatInterface
