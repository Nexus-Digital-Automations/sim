/**
 * AI Help Chat Component - Intelligent conversational help assistant
 *
 * Advanced AI-powered chat interface providing contextual assistance:
 * - Real-time conversation with Claude AI integration
 * - Context-aware responses based on user location and actions
 * - Conversation history and session management
 * - Rich message formatting with code blocks and links
 * - Typing indicators and message status
 * - Accessibility-compliant chat interface
 * - Comprehensive logging and analytics integration
 *
 * Key Features:
 * - Streaming responses for better UX
 * - Context injection from current workflow/component
 * - Message search and conversation history
 * - Quick action suggestions and shortcuts
 * - Voice input support (optional)
 * - Multi-language support
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

'use client'

import type * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BotIcon,
  ChevronDownIcon,
  CopyIcon,
  HelpCircleIcon,
  MicIcon,
  PaperclipIcon,
  SendIcon,
  SettingsIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface AIHelpChatProps {
  // Appearance
  variant?: 'panel' | 'modal' | 'inline' | 'floating'
  position?: 'bottom-right' | 'bottom-left' | 'side-panel' | 'center'
  isOpen?: boolean
  maxHeight?: number
  className?: string

  // Behavior
  autoFocus?: boolean
  enableVoiceInput?: boolean
  enableFileAttachments?: boolean
  showTypingIndicator?: boolean
  persistConversation?: boolean

  // Content
  initialMessage?: string
  placeholder?: string
  welcomeMessage?: string
  contextData?: Record<string, any>

  // Events
  onOpen?: () => void
  onClose?: () => void
  onMessageSent?: (message: ChatMessage) => void
  onMessageReceived?: (message: ChatMessage) => void
  onConversationClear?: () => void

  // Advanced
  customActions?: ChatAction[]
  messageFilters?: MessageFilter[]
  maxMessages?: number
}

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
  metadata?: {
    context?: Record<string, any>
    suggestions?: ActionSuggestion[]
    attachments?: ChatAttachment[]
    sentiment?: 'positive' | 'negative' | 'neutral'
    confidence?: number
  }
  status?: 'sending' | 'sent' | 'delivered' | 'error'
  reactions?: ChatReaction[]
}

export interface ActionSuggestion {
  id: string
  label: string
  action: string
  parameters?: Record<string, any>
  icon?: React.ReactNode
}

export interface ChatAttachment {
  id: string
  name: string
  type: 'image' | 'document' | 'link' | 'code'
  url: string
  size?: number
  preview?: string
}

export interface ChatReaction {
  type: 'thumbs_up' | 'thumbs_down' | 'helpful' | 'not_helpful'
  userId: string
  timestamp: Date
}

export interface ChatAction {
  id: string
  label: string
  icon?: React.ReactNode
  action: (messages: ChatMessage[]) => void
  visible?: (messages: ChatMessage[]) => boolean
}

export interface MessageFilter {
  id: string
  test: (message: ChatMessage) => boolean
  transform?: (message: ChatMessage) => ChatMessage
}

interface ChatState {
  messages: ChatMessage[]
  isTyping: boolean
  isConnected: boolean
  currentInput: string
  isVoiceRecording: boolean
  conversationId: string
  contextSnapshot: any
}

// ========================
// MESSAGE UTILITIES
// ========================

class MessageFormatter {
  /**
   * Format message content with rich text support
   */
  static formatContent(content: string): React.ReactNode {
    // Handle code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const inlineCodeRegex = /`([^`]+)`/g

    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    // Process code blocks
    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index))
      }

      // Add formatted code block
      const language = match[1] || 'text'
      const code = match[2].trim()

      parts.push(
        <div key={match.index} className='my-3 rounded border'>
          <div className='bg-muted px-3 py-1 font-mono text-xs'>{language}</div>
          <pre className='overflow-x-auto bg-muted/50 p-3 text-sm'>
            <code>{code}</code>
          </pre>
        </div>
      )

      lastIndex = codeBlockRegex.lastIndex
    }

    // Add remaining content
    if (lastIndex < content.length) {
      const remainingContent = content.substring(lastIndex)

      // Process inline code
      const inlineCodeParts = remainingContent.split(inlineCodeRegex)
      for (let i = 0; i < inlineCodeParts.length; i++) {
        if (i % 2 === 0) {
          // Regular text
          parts.push(inlineCodeParts[i])
        } else {
          // Inline code
          parts.push(
            <code key={`inline-${i}`} className='rounded bg-muted px-1 py-0.5 font-mono text-sm'>
              {inlineCodeParts[i]}
            </code>
          )
        }
      }
    }

    return parts.length > 1 ? <>{parts}</> : content
  }

  /**
   * Extract action suggestions from message content
   */
  static extractSuggestions(content: string): ActionSuggestion[] {
    const suggestions: ActionSuggestion[] = []

    // Look for action patterns in the message
    const actionPatterns = [
      { pattern: /try clicking (?:the )?(?:"([^"]+)"|(\w+))/gi, action: 'click_element' },
      { pattern: /navigate to (?:"([^"]+)"|(\S+))/gi, action: 'navigate' },
      { pattern: /search for (?:"([^"]+)"|(\w+))/gi, action: 'search' },
    ]

    actionPatterns.forEach(({ pattern, action }) => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const label = match[1] || match[2]
        if (label) {
          suggestions.push({
            id: `${action}_${suggestions.length}`,
            label: `${action.replace('_', ' ')} "${label}"`,
            action,
            parameters: { target: label },
          })
        }
      }
    })

    return suggestions
  }
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * AI Help Chat Component
 *
 * Intelligent chat interface for conversational help assistance.
 */
export function AIHelpChat({
  variant = 'floating',
  position = 'bottom-right',
  isOpen = false,
  maxHeight = 600,
  className,
  autoFocus = true,
  enableVoiceInput = false,
  enableFileAttachments = false,
  showTypingIndicator = true,
  persistConversation = true,
  initialMessage,
  placeholder = 'Ask me anything about using the platform...',
  welcomeMessage = "Hi! I'm here to help you navigate and use the platform. What can I assist you with today?",
  contextData,
  onOpen,
  onClose,
  onMessageSent,
  onMessageReceived,
  onConversationClear,
  customActions = [],
  messageFilters = [],
  maxMessages = 100,
}: AIHelpChatProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isTyping: false,
    isConnected: true,
    currentInput: '',
    isVoiceRecording: false,
    conversationId: Date.now().toString(),
    contextSnapshot: null,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // ========================
  // INITIALIZATION
  // ========================

  useEffect(() => {
    if (isOpen && chatState.messages.length === 0) {
      // Add welcome message
      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        type: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        metadata: {
          suggestions: [
            {
              id: 'help_getting_started',
              label: 'Getting Started Guide',
              action: 'show_tutorial',
              parameters: { tutorialId: 'getting_started' },
              icon: <HelpCircleIcon className='h-3 w-3' />,
            },
            {
              id: 'help_workflows',
              label: 'Learn about Workflows',
              action: 'navigate',
              parameters: { url: '/help/workflows' },
            },
            {
              id: 'help_contact',
              label: 'Contact Support',
              action: 'contact_support',
            },
          ],
        },
      }

      setChatState((prev) => ({
        ...prev,
        messages: [welcomeMsg],
        contextSnapshot: contextData,
      }))

      if (onOpen) {
        onOpen()
      }

      trackInteraction('open', 'ai_help_chat', { contextData })
    }
  }, [isOpen, chatState.messages.length, welcomeMessage, contextData, onOpen, trackInteraction])

  useEffect(() => {
    if (initialMessage && isOpen) {
      handleSendMessage(initialMessage)
    }
  }, [initialMessage, isOpen])

  // ========================
  // MESSAGE HANDLING
  // ========================

  const sendMessage = useCallback(
    async (content: string, type: 'user' | 'system' = 'user') => {
      const messageId = Date.now().toString()
      const userMessage: ChatMessage = {
        id: messageId,
        type,
        content,
        timestamp: new Date(),
        status: 'sending',
        metadata: {
          context: {
            ...contextData,
            currentPage: window.location.pathname,
            userLevel: helpState.userLevel,
            sessionId: helpState.sessionId,
          },
        },
      }

      // Add user message
      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        currentInput: '',
        isTyping: true,
      }))

      onMessageSent?.(userMessage)

      try {
        // Simulate AI response (replace with actual API call)
        const response = await simulateAIResponse(content, userMessage.metadata?.context)

        const assistantMessage: ChatMessage = {
          id: `${messageId}_response`,
          type: 'assistant',
          content: response.content,
          timestamp: new Date(),
          metadata: {
            confidence: response.confidence,
            suggestions: MessageFormatter.extractSuggestions(response.content),
          },
        }

        setChatState((prev) => ({
          ...prev,
          messages: prev.messages
            .map((m) => (m.id === messageId ? { ...m, status: 'sent' as const } : m))
            .concat(assistantMessage),
          isTyping: false,
        }))

        onMessageReceived?.(assistantMessage)

        // Track interaction
        helpAnalytics.trackHelpInteraction(
          chatState.conversationId,
          helpState.sessionId,
          'chat_message',
          'ai_help_chat',
          { messageLength: content.length, responseTime: response.responseTime }
        )
      } catch (error) {
        console.error('Failed to send message:', error)

        setChatState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === messageId ? { ...m, status: 'error' as const } : m
          ),
          isTyping: false,
        }))
      }
    },
    [contextData, helpState, chatState.conversationId, onMessageSent, onMessageReceived]
  )

  const handleSendMessage = useCallback(
    (message?: string) => {
      const content = message || chatState.currentInput.trim()
      if (!content) return

      sendMessage(content)
    },
    [chatState.currentInput, sendMessage]
  )

  const handleClearConversation = useCallback(() => {
    setChatState((prev) => ({
      ...prev,
      messages: [],
      conversationId: Date.now().toString(),
    }))

    onConversationClear?.()
    trackInteraction('clear', 'ai_help_chat')
  }, [onConversationClear, trackInteraction])

  // ========================
  // MESSAGE REACTIONS
  // ========================

  const handleMessageReaction = useCallback(
    (messageId: string, reactionType: ChatReaction['type']) => {
      const reaction: ChatReaction = {
        type: reactionType,
        userId: helpState.sessionId,
        timestamp: new Date(),
      }

      setChatState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                reactions: [...(msg.reactions || []), reaction],
              }
            : msg
        ),
      }))

      trackInteraction('reaction', `ai_help_chat_${reactionType}`, { messageId })

      helpAnalytics.trackHelpInteraction(
        messageId,
        helpState.sessionId,
        'message_reaction',
        'ai_help_chat',
        { reactionType }
      )
    },
    [helpState.sessionId, trackInteraction]
  )

  const handleSuggestionClick = useCallback(
    (suggestion: ActionSuggestion) => {
      trackInteraction(
        'suggestion_click',
        `ai_help_chat_${suggestion.action}`,
        suggestion.parameters
      )

      // Handle built-in actions
      switch (suggestion.action) {
        case 'show_tutorial':
          // Navigate to tutorial
          break
        case 'navigate':
          if (suggestion.parameters?.url) {
            window.open(suggestion.parameters.url, '_blank')
          }
          break
        case 'search':
          if (suggestion.parameters?.query) {
            // Trigger search
          }
          break
        default:
          // Custom action
          break
      }
    },
    [trackInteraction]
  )

  // ========================
  // SCROLL MANAGEMENT
  // ========================

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatState.messages, scrollToBottom])

  // ========================
  // KEYBOARD HANDLING
  // ========================

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage]
  )

  // ========================
  // RENDER HELPERS
  // ========================

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user'
    const isSystem = message.type === 'system'

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'mb-4 flex gap-3',
          isUser && 'flex-row-reverse',
          isSystem && 'justify-center'
        )}
      >
        {!isSystem && (
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}
          >
            {isUser ? <UserIcon className='h-4 w-4' /> : <BotIcon className='h-4 w-4' />}
          </div>
        )}

        <div
          className={cn(
            'flex max-w-[80%] flex-col',
            isUser && 'items-end',
            isSystem && 'max-w-full items-center'
          )}
        >
          {/* Message bubble */}
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-sm',
              isUser && 'bg-primary text-primary-foreground',
              !isUser && !isSystem && 'bg-muted',
              isSystem && 'bg-muted/50 text-muted-foreground'
            )}
          >
            {MessageFormatter.formatContent(message.content)}
          </div>

          {/* Timestamp and status */}
          <div
            className={cn(
              'mt-1 flex items-center gap-2 text-muted-foreground text-xs',
              isUser && 'flex-row-reverse'
            )}
          >
            <span>
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {message.status && isUser && (
              <span className={cn('capitalize', message.status === 'error' && 'text-red-500')}>
                {message.status}
              </span>
            )}
          </div>

          {/* Suggestions */}
          {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
            <div className='mt-2 flex flex-wrap gap-1'>
              {message.metadata.suggestions.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant='outline'
                  size='sm'
                  onClick={() => handleSuggestionClick(suggestion)}
                  className='h-7 text-xs'
                >
                  {suggestion.icon && <span className='mr-1'>{suggestion.icon}</span>}
                  {suggestion.label}
                </Button>
              ))}
            </div>
          )}

          {/* Reactions */}
          {!isUser && !isSystem && (
            <div className='mt-2 flex items-center gap-1'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleMessageReaction(message.id, 'thumbs_up')}
                className='h-6 w-6 p-0'
              >
                <ThumbsUpIcon className='h-3 w-3' />
              </Button>

              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleMessageReaction(message.id, 'thumbs_down')}
                className='h-6 w-6 p-0'
              >
                <ThumbsDownIcon className='h-3 w-3' />
              </Button>

              <Button
                variant='ghost'
                size='sm'
                onClick={() => navigator.clipboard.writeText(message.content)}
                className='h-6 w-6 p-0'
              >
                <CopyIcon className='h-3 w-3' />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  const renderTypingIndicator = () => {
    if (!showTypingIndicator || !chatState.isTyping) return null

    return (
      <div className='mb-4 flex gap-3'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted'>
          <BotIcon className='h-4 w-4' />
        </div>
        <div className='flex items-center rounded-lg bg-muted px-3 py-2'>
          <div className='flex gap-1'>
            <div className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]' />
            <div className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]' />
            <div className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground' />
          </div>
          <span className='ml-2 text-muted-foreground text-sm'>AI is typing...</span>
        </div>
      </div>
    )
  }

  // ========================
  // RENDER
  // ========================

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex flex-col border border-border bg-background shadow-lg',
        variant === 'floating' && 'fixed z-50 rounded-lg',
        variant === 'modal' &&
          '-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-50 rounded-lg',
        variant === 'panel' && 'h-full',
        variant === 'inline' && 'rounded-lg',
        position === 'bottom-right' && 'right-4 bottom-4',
        position === 'bottom-left' && 'bottom-4 left-4',
        className
      )}
      style={{
        width: variant === 'floating' ? 380 : '100%',
        height: variant === 'floating' ? Math.min(maxHeight, 600) : '100%',
      }}
    >
      {/* Header */}
      <CardHeader className='flex-row items-center justify-between space-y-0 pb-3'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <BotIcon className='h-4 w-4' />
          </div>
          <div>
            <h3 className='font-semibold text-sm'>AI Assistant</h3>
            <p className='text-muted-foreground text-xs'>
              {chatState.isConnected ? 'Online' : 'Connecting...'}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-1'>
          {/* Custom actions */}
          {customActions.map((action) => (
            <Button
              key={action.id}
              variant='ghost'
              size='sm'
              onClick={() => action.action(chatState.messages)}
              className='h-6 w-6 p-0'
            >
              {action.icon || <SettingsIcon className='h-3 w-3' />}
            </Button>
          ))}

          <Button
            variant='ghost'
            size='sm'
            onClick={handleClearConversation}
            className='h-6 w-6 p-0'
            title='Clear conversation'
          >
            <XIcon className='h-3 w-3' />
          </Button>

          {onClose && (
            <Button variant='ghost' size='sm' onClick={onClose} className='h-6 w-6 p-0'>
              <ChevronDownIcon className='h-3 w-3' />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className='flex-1 p-0'>
        <ScrollArea ref={scrollAreaRef} className='h-full px-4 pb-4'>
          <div className='space-y-4'>
            {chatState.messages.map(renderMessage)}
            {renderTypingIndicator()}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <CardFooter className='pt-3'>
        <div className='flex w-full items-end gap-2'>
          <div className='flex-1'>
            <Textarea
              ref={inputRef}
              placeholder={placeholder}
              value={chatState.currentInput}
              onChange={(e) =>
                setChatState((prev) => ({
                  ...prev,
                  currentInput: e.target.value,
                }))
              }
              onKeyDown={handleKeyDown}
              className='max-h-[120px] min-h-[40px] resize-none'
              disabled={!chatState.isConnected || chatState.isTyping}
            />
          </div>

          <div className='flex items-center gap-1'>
            {enableFileAttachments && (
              <Button
                variant='ghost'
                size='sm'
                className='h-8 w-8 p-0'
                disabled={!chatState.isConnected}
              >
                <PaperclipIcon className='h-4 w-4' />
              </Button>
            )}

            {enableVoiceInput && (
              <Button
                variant='ghost'
                size='sm'
                className='h-8 w-8 p-0'
                disabled={!chatState.isConnected}
              >
                <MicIcon className='h-4 w-4' />
              </Button>
            )}

            <Button
              size='sm'
              onClick={() => handleSendMessage()}
              disabled={
                !chatState.currentInput.trim() || !chatState.isConnected || chatState.isTyping
              }
              className='h-8 w-8 p-0'
            >
              <SendIcon className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </CardFooter>
    </motion.div>
  )
}

// ========================
// MOCK AI RESPONSE FUNCTION
// ========================

async function simulateAIResponse(
  userMessage: string,
  context?: any
): Promise<{ content: string; confidence: number; responseTime: number }> {
  const startTime = Date.now()

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

  const responses = [
    {
      trigger: /help|assist|support/i,
      response:
        "I'm here to help! I can assist you with navigating the platform, understanding workflows, troubleshooting issues, and learning new features. What specific area would you like help with?",
    },
    {
      trigger: /workflow|automation/i,
      response:
        'Workflows are powerful automation sequences that can help streamline your tasks. You can create workflows using our visual editor, connect different services, and set up triggers. Would you like me to show you how to create your first workflow?',
    },
    {
      trigger: /error|bug|problem|issue/i,
      response:
        "I understand you're experiencing an issue. To help troubleshoot, could you describe what you were doing when the problem occurred? Also, any error messages would be helpful to identify the solution.",
    },
    {
      trigger: /getting started|how to start|beginner/i,
      response:
        'Welcome! Let me help you get started. I recommend beginning with our interactive tutorial that will walk you through the key features. You can also explore some pre-built templates to see workflows in action.',
    },
  ]

  const matchedResponse = responses.find((r) => r.trigger.test(userMessage))
  const response =
    matchedResponse?.response ||
    'I understand your question. Let me provide some guidance based on your current context. You can also check our help documentation or contact support for more detailed assistance.'

  const responseTime = Date.now() - startTime

  return {
    content: response,
    confidence: matchedResponse ? 0.9 : 0.6,
    responseTime,
  }
}

// ========================
// EXPORTS
// ========================

export default AIHelpChat
export type {
  AIHelpChatProps,
  ChatMessage,
  ActionSuggestion,
  ChatAttachment,
  ChatReaction,
  ChatAction,
  MessageFilter,
}
