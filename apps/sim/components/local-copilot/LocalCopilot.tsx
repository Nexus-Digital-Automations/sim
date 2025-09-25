/**
 * Local Parlant Copilot Component
 *
 * Main component for the local copilot system using Parlant agents.
 * Provides agent selection, conversation management, and streaming chat
 * with full tool integration while maintaining feature parity with
 * the external copilot system.
 */

'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ArrowDown, Bot, Settings, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingAgent } from '@/components/ui/loading-agent'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import type { Agent } from '@/services/parlant/types'
import { useLocalCopilotStore } from '@/stores/local-copilot'
// import { ModeToggle } from './ModeToggle' // Handled by unified copilot
import type { MessageContext, MessageFileAttachment } from '@/stores/local-copilot/types'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { AgentSelector } from './AgentSelector'
import { LocalCopilotMessage } from './LocalCopilotMessage'
import { LocalCopilotUserInput } from './LocalCopilotUserInput'
import { LocalCopilotWelcome } from './LocalCopilotWelcome'

const logger = createLogger('LocalCopilot')

interface LocalCopilotProps {
  panelWidth: number
  workspaceId: string
  userId: string
  className?: string
  showModeToggle?: boolean
  defaultMode?: 'local' | 'external'
}

export interface LocalCopilotRef {
  selectAgent: (agent: Agent) => void
  sendMessage: (message: string, options?: any) => Promise<void>
  clearConversation: () => void
  toggleAgentSelector: () => void
}

export const LocalCopilot = forwardRef<LocalCopilotRef, LocalCopilotProps>(
  (
    {
      panelWidth,
      workspaceId,
      userId,
      className = '',
      showModeToggle = true,
      defaultMode = 'local',
    },
    ref
  ) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const userInputRef = useRef<any>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const [showSettings, setShowSettings] = useState(false)

    // Scroll state management
    const [isNearBottom, setIsNearBottom] = useState(true)
    const [showScrollButton, setShowScrollButton] = useState(false)
    const [userHasScrolledDuringStream, setUserHasScrolledDuringStream] = useState(false)
    const isUserScrollingRef = useRef(false)

    const { activeWorkflowId } = useWorkflowRegistry()

    // Local copilot store
    const {
      selectedAgent,
      availableAgents,
      isLoadingAgents,
      activeConversation,
      conversations,
      messages,
      streaming,
      mode,
      inputValue,
      showAgentSelector,
      isInitialized: storeInitialized,
      lastError,

      // Actions
      initialize,
      loadAgents,
      loadConversations,
      selectAgent,
      createConversation,
      sendMessage,
      abortMessage,
      setMode,
      setInputValue,
      setShowAgentSelector,
      clearErrors,
    } = useLocalCopilotStore()

    // Initialize component
    useEffect(() => {
      if (workspaceId && userId && !storeInitialized) {
        logger.info('Initializing local copilot', { workspaceId, userId })

        setIsInitialized(false)

        if (defaultMode !== mode) {
          setMode(defaultMode)
        }

        initialize(workspaceId, userId)
          .then(() => {
            setIsInitialized(true)
            logger.info('Local copilot initialized successfully')
          })
          .catch((error) => {
            logger.error('Failed to initialize local copilot', { error })
            setIsInitialized(true) // Still show UI even if initialization failed
          })
      }
    }, [workspaceId, userId, storeInitialized, initialize, defaultMode, mode, setMode])

    // Auto-scroll management
    const scrollToBottom = useCallback(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector(
          '[data-radix-scroll-area-viewport]'
        )
        if (scrollContainer) {
          isUserScrollingRef.current = false
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth',
          })
        }
      }
    }, [])

    const handleScroll = useCallback(() => {
      const scrollArea = scrollAreaRef.current
      if (!scrollArea) return

      const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]')
      if (!viewport) return

      const { scrollTop, scrollHeight, clientHeight } = viewport
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      const nearBottom = distanceFromBottom <= 100
      setIsNearBottom(nearBottom)
      setShowScrollButton(!nearBottom)

      if (streaming.isStreaming && !nearBottom && isUserScrollingRef.current) {
        setUserHasScrolledDuringStream(true)
      }

      isUserScrollingRef.current = true
    }, [streaming.isStreaming])

    // Attach scroll listeners
    useEffect(() => {
      const scrollArea = scrollAreaRef.current
      if (!scrollArea) return

      const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]')
      if (!viewport) return

      const handleUserScroll = () => {
        isUserScrollingRef.current = true
        handleScroll()
      }

      viewport.addEventListener('scroll', handleUserScroll, { passive: true })

      if ('onscrollend' in viewport) {
        viewport.addEventListener('scrollend', handleScroll, { passive: true })
      }

      setTimeout(handleScroll, 100)

      return () => {
        viewport.removeEventListener('scroll', handleUserScroll)
        if ('onscrollend' in viewport) {
          viewport.removeEventListener('scrollend', handleScroll)
        }
      }
    }, [handleScroll])

    // Smart auto-scroll during streaming
    useEffect(() => {
      if (messages.length === 0) return

      const lastMessage = messages[messages.length - 1]
      const isNewUserMessage = lastMessage?.role === 'user'

      const shouldAutoScroll =
        isNewUserMessage ||
        (streaming.isStreaming && !userHasScrolledDuringStream) ||
        (!streaming.isStreaming && isNearBottom)

      if (shouldAutoScroll && scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector(
          '[data-radix-scroll-area-viewport]'
        )
        if (scrollContainer) {
          isUserScrollingRef.current = false
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth',
          })
        }
      }
    }, [messages, isNearBottom, streaming.isStreaming, userHasScrolledDuringStream])

    // Reset scroll state for new messages
    useEffect(() => {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === 'user') {
        setUserHasScrolledDuringStream(false)
        isUserScrollingRef.current = false
      }
    }, [messages])

    // Reset scroll state when streaming completes
    const prevIsStreamingRef = useRef(false)
    useEffect(() => {
      if (prevIsStreamingRef.current && !streaming.isStreaming) {
        setUserHasScrolledDuringStream(false)
      }
      prevIsStreamingRef.current = streaming.isStreaming
    }, [streaming.isStreaming])

    // Auto-scroll when conversation loads
    useEffect(() => {
      if (isInitialized && messages.length > 0) {
        setTimeout(scrollToBottom, 100)
      }
    }, [isInitialized, messages.length, scrollToBottom])

    // Handle agent selection
    const handleAgentSelect = useCallback(
      (agent: Agent) => {
        logger.info('Agent selected', { agentId: agent.id, agentName: agent.name })
        selectAgent(agent)

        // Create new conversation with selected agent if none exists
        if (!activeConversation || activeConversation.agentId !== agent.id) {
          createConversation(agent.id)
            .then((conversation) => {
              if (conversation) {
                logger.info('New conversation created with agent', {
                  conversationId: conversation.id,
                  agentId: agent.id,
                })
              }
            })
            .catch((error) => {
              logger.error('Failed to create conversation with agent', { error })
            })
        }
      },
      [selectAgent, activeConversation, createConversation]
    )

    // Handle message submission
    const handleSubmit = useCallback(
      async (
        message: string,
        fileAttachments?: MessageFileAttachment[],
        contexts?: MessageContext[]
      ) => {
        if (!message.trim() || streaming.isStreaming) return

        if (!selectedAgent) {
          logger.warn('No agent selected for message')
          // Show agent selector if no agent is selected
          setShowAgentSelector(true)
          return
        }

        try {
          await sendMessage(message, {
            fileAttachments,
            contexts,
            stream: true,
          })

          logger.info('Message sent successfully', {
            messageLength: message.length,
            agentId: selectedAgent.id,
            hasAttachments: !!fileAttachments?.length,
            hasContexts: !!contexts?.length,
          })
        } catch (error) {
          logger.error('Failed to send message', { error })
        }
      },
      [selectedAgent, streaming.isStreaming, sendMessage, setShowAgentSelector]
    )

    // Handle abort
    const handleAbort = useCallback(() => {
      logger.info('Aborting message streaming')
      abortMessage()
    }, [abortMessage])

    // Expose functions to parent
    useImperativeHandle(
      ref,
      () => ({
        selectAgent: handleAgentSelect,
        sendMessage: async (message: string, options?: any) => {
          await handleSubmit(message, options?.fileAttachments, options?.contexts)
        },
        clearConversation: () => {
          // Implementation for clearing conversation
        },
        toggleAgentSelector: () => {
          setShowAgentSelector(!showAgentSelector)
        },
      }),
      [handleAgentSelect, handleSubmit, showAgentSelector, setShowAgentSelector]
    )

    // Clear errors when component mounts
    useEffect(() => {
      if (lastError) {
        const timer = setTimeout(() => {
          clearErrors()
        }, 5000)

        return () => clearTimeout(timer)
      }
    }, [lastError, clearErrors])

    if (!isInitialized || !storeInitialized) {
      return (
        <div className={`flex h-full w-full items-center justify-center ${className}`}>
          <div className='flex flex-col items-center gap-3'>
            <LoadingAgent size='md' />
            <p className='text-muted-foreground text-sm'>Initializing local copilot...</p>
          </div>
        </div>
      )
    }

    return (
      <TooltipProvider>
        <div className={`flex h-full flex-col overflow-hidden ${className}`}>
          {/* Header with mode toggle and controls */}
          <div className='flex items-center justify-between border-border/50 border-b px-4 py-3'>
            <div className='flex items-center gap-2'>
              <div className='flex items-center gap-2'>
                <Bot className='h-4 w-4 text-primary' />
                <span className='font-medium text-sm'>Local Copilot</span>
              </div>

              {selectedAgent && (
                <>
                  <Separator orientation='vertical' className='h-4' />
                  <div className='flex items-center gap-2'>
                    <Badge variant='secondary' className='text-xs'>
                      {selectedAgent.name}
                    </Badge>
                    {selectedAgent.tools && selectedAgent.tools.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Zap className='h-3 w-3 text-muted-foreground' />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{selectedAgent.tools.length} tools available</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className='flex items-center gap-1'>
              {/* Mode toggle handled by unified copilot */}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setShowSettings(!showSettings)}
                    className='h-8 w-8 p-0'
                  >
                    <Settings className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings & Agent Selection</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Error display */}
          {lastError && (
            <div className='border-destructive/20 border-b bg-destructive/10 px-4 py-2'>
              <p className='text-destructive text-sm'>{lastError}</p>
            </div>
          )}

          {/* Agent selector */}
          {(showAgentSelector || showSettings) && (
            <div className='border-border/50 border-b'>
              <AgentSelector
                agents={availableAgents}
                selectedAgent={selectedAgent}
                isLoading={isLoadingAgents}
                onSelectAgent={handleAgentSelect}
                onClose={() => {
                  setShowAgentSelector(false)
                  setShowSettings(false)
                }}
                workspaceId={workspaceId}
                userId={userId}
              />
            </div>
          )}

          {/* Messages area */}
          <div className='relative flex-1 overflow-hidden'>
            <ScrollArea ref={scrollAreaRef} className='h-full' hideScrollbar={true}>
              <div className='w-full max-w-full space-y-1 overflow-hidden p-4'>
                {messages.length === 0 ? (
                  <div className='flex h-full items-center justify-center'>
                    <LocalCopilotWelcome
                      selectedAgent={selectedAgent}
                      onQuestionClick={handleSubmit}
                      onSelectAgent={() => setShowAgentSelector(true)}
                      hasAgents={availableAgents.length > 0}
                    />
                  </div>
                ) : (
                  messages.map((message) => (
                    <LocalCopilotMessage
                      key={message.id}
                      message={message}
                      isStreaming={
                        streaming.isStreaming && message.id === streaming.currentMessageId
                      }
                      selectedAgent={selectedAgent}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Scroll to bottom button */}
            {showScrollButton && (
              <div className='-translate-x-1/2 absolute bottom-4 left-1/2 z-10'>
                <Button
                  onClick={scrollToBottom}
                  size='sm'
                  variant='outline'
                  className='flex items-center gap-1 rounded-full border border-border bg-background/95 px-3 py-1 shadow-lg backdrop-blur-sm transition-all hover:bg-accent'
                >
                  <ArrowDown className='h-3.5 w-3.5 text-foreground' />
                  <span className='sr-only'>Scroll to bottom</span>
                </Button>
              </div>
            )}
          </div>

          {/* Input area */}
          <LocalCopilotUserInput
            ref={userInputRef}
            onSubmit={handleSubmit}
            onAbort={handleAbort}
            disabled={!selectedAgent}
            isLoading={streaming.isStreaming}
            isAborting={false} // TODO: Add abort state to store
            value={inputValue}
            onChange={setInputValue}
            selectedAgent={selectedAgent}
            placeholder={
              selectedAgent
                ? `Message ${selectedAgent.name}...`
                : 'Select an agent to start chatting...'
            }
          />
        </div>
      </TooltipProvider>
    )
  }
)

LocalCopilot.displayName = 'LocalCopilot'
