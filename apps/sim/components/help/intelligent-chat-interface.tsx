/**
 * Intelligent Chat Interface - Real-time Conversational AI Component
 *
 * Advanced React component providing intelligent conversational assistance:
 * - Real-time chat with contextual awareness
 * - Multi-turn conversation management
 * - Message history and session persistence
 * - Suggested actions and related content integration
 * - Typing indicators and real-time feedback
 * - Responsive design with accessibility support
 *
 * Integrates with the chat API for backend processing and maintains
 * conversation context for enhanced user experience.
 *
 * @created 2025-09-04
 * @author Intelligent Chatbot Implementation Specialist
 */

'use client'

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Bot,
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// ========================
// TYPES AND INTERFACES
// ========================

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  intent?: DetectedIntent
  metadata?: Record<string, any>
}

interface DetectedIntent {
  name: string
  confidence: number
  parameters?: Record<string, any>
  domain?: string
}

interface SuggestedAction {
  type: 'navigation' | 'tutorial' | 'documentation' | 'contact_support'
  title: string
  description: string
  action: string
  priority: number
}

interface RelatedContent {
  id: string
  title: string
  type: 'article' | 'tutorial' | 'video' | 'faq'
  url: string
  relevanceScore: number
}

interface ConversationState {
  phase:
    | 'greeting'
    | 'problem_identification'
    | 'solution_exploration'
    | 'implementation'
    | 'resolution'
  confidence: number
  needsEscalation: boolean
  resolvedIssues: string[]
  pendingActions: string[]
}

interface ChatResponse {
  success: boolean
  message: string
  intent?: DetectedIntent
  suggestedActions: SuggestedAction[]
  relatedContent: RelatedContent[]
  conversationState: ConversationState
  sessionId: string
  metadata: Record<string, any>
}

interface WorkflowContext {
  type?: string
  currentStep?: string
  blockTypes?: string[]
  completedSteps?: string[]
  errors?: Array<{
    code: string
    message: string
    context: string
    timestamp: string
    resolved: boolean
  }>
  timeSpent?: number
}

interface UserProfile {
  expertiseLevel?: 'beginner' | 'intermediate' | 'expert'
  preferredLanguage?: string
  previousInteractions?: number
  commonIssues?: string[]
}

export interface IntelligentChatInterfaceProps {
  /** Optional initial session ID for conversation continuity */
  sessionId?: string
  /** Workflow context for contextual assistance */
  workflowContext?: WorkflowContext
  /** User profile information for personalization */
  userProfile?: UserProfile
  /** Whether the chat is embedded in another component */
  embedded?: boolean
  /** Custom CSS classes */
  className?: string
  /** Callback when chat is closed */
  onClose?: () => void
  /** Whether to show proactive suggestions */
  showProactiveSuggestions?: boolean
  /** Maximum height of the chat interface */
  maxHeight?: string
}

// ========================
// MAIN COMPONENT
// ========================

export function IntelligentChatInterface({
  sessionId: initialSessionId,
  workflowContext,
  userProfile,
  embedded = false,
  className,
  onClose,
  showProactiveSuggestions = true,
  maxHeight = '600px',
}: IntelligentChatInterfaceProps) {
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState(initialSessionId || `session_${Date.now()}`)
  const [currentState, setCurrentState] = useState<ConversationState | null>(null)
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([])
  const [relatedContent, setRelatedContent] = useState<RelatedContent[]>([])
  const [error, setError] = useState<string | null>(null)

  // Refs for DOM manipulation
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Initialize chat with greeting message
  useEffect(() => {
    if (messages.length === 0) {
      const greetingMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content:
          "Hi! I'm your AI assistant. I'm here to help you with workflow automation, troubleshooting, and any questions you might have. How can I assist you today?",
        timestamp: new Date(),
      }
      setMessages([greetingMessage])
    }
  }, [messages.length])

  // Fetch proactive suggestions if enabled
  useEffect(() => {
    if (showProactiveSuggestions && workflowContext) {
      fetchProactiveSuggestions()
    }
  }, [workflowContext, showProactiveSuggestions])

  // ========================
  // API INTERACTION METHODS
  // ========================

  const sendChatMessage = async (message: string): Promise<ChatResponse> => {
    const response = await fetch('/api/help/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId,
        context: {
          workflowContext,
          userProfile,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to send message')
    }

    return await response.json()
  }

  const fetchProactiveSuggestions = async () => {
    try {
      const response = await fetch(
        `/api/help/chat?action=suggestions&workflowContext=${encodeURIComponent(JSON.stringify(workflowContext))}`
      )

      if (response.ok) {
        const data = await response.json()
        if (data.suggestions) {
          setSuggestedActions(data.suggestions.suggestedActions || [])
          setRelatedContent(data.suggestions.relatedContent || [])
        }
      }
    } catch (error) {
      console.error('Failed to fetch proactive suggestions:', error)
    }
  }

  const submitFeedback = async (messageId: string, rating: 'helpful' | 'not_helpful') => {
    try {
      await fetch('/api/help/chat', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          rating,
        }),
      })
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  const clearConversation = async () => {
    try {
      await fetch(`/api/help/chat?sessionId=${sessionId}`, {
        method: 'DELETE',
      })

      setMessages([])
      setSuggestedActions([])
      setRelatedContent([])
      setCurrentState(null)
      setError(null)

      // Reinitialize with greeting
      const greetingMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Conversation cleared! How can I help you today?',
        timestamp: new Date(),
      }
      setMessages([greetingMessage])
    } catch (error) {
      console.error('Failed to clear conversation:', error)
    }
  }

  // ========================
  // EVENT HANDLERS
  // ========================

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setIsTyping(true)
    setError(null)

    try {
      const response = await sendChatMessage(userMessage.content)

      if (response.success) {
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_assistant`,
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          intent: response.intent,
          metadata: response.metadata,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setSessionId(response.sessionId)
        setCurrentState(response.conversationState)
        setSuggestedActions(response.suggestedActions)
        setRelatedContent(response.relatedContent)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const handleSuggestedAction = (action: SuggestedAction) => {
    // Handle different action types
    switch (action.type) {
      case 'navigation':
        window.location.href = action.action
        break
      case 'tutorial':
        window.open(action.action, '_blank')
        break
      case 'documentation':
        window.open(action.action, '_blank')
        break
      case 'contact_support':
        // Handle contact support action
        break
    }
  }

  const handleRelatedContentClick = (content: RelatedContent) => {
    window.open(content.url, '_blank')
  }

  // ========================
  // RENDER METHODS
  // ========================

  const renderMessage = (message: ChatMessage) => (
    <div
      key={message.id}
      className={cn(
        'flex gap-3 rounded-lg p-3',
        message.role === 'user'
          ? 'ml-8 bg-blue-50 dark:bg-blue-950/30'
          : 'mr-8 bg-gray-50 dark:bg-gray-800/50'
      )}
    >
      <div className='flex-shrink-0'>
        {message.role === 'user' ? (
          <User className='h-6 w-6 text-blue-600' />
        ) : (
          <Bot className='h-6 w-6 text-purple-600' />
        )}
      </div>

      <div className='min-w-0 flex-1'>
        <div className='mb-1 flex items-center gap-2'>
          <span className='font-medium text-sm'>
            {message.role === 'user' ? 'You' : 'AI Assistant'}
          </span>
          <span className='text-muted-foreground text-xs'>
            {message.timestamp.toLocaleTimeString()}
          </span>
          {message.intent && (
            <Badge variant='outline' className='text-xs'>
              {message.intent.name}
            </Badge>
          )}
        </div>

        <div className='prose prose-sm dark:prose-invert max-w-none'>{message.content}</div>

        {message.role === 'assistant' && (
          <div className='mt-2 flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => submitFeedback(message.id, 'helpful')}
              className='h-8 px-2 text-xs'
            >
              <ThumbsUp className='mr-1 h-3 w-3' />
              Helpful
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => submitFeedback(message.id, 'not_helpful')}
              className='h-8 px-2 text-xs'
            >
              <ThumbsDown className='mr-1 h-3 w-3' />
              Not helpful
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  const renderSuggestedActions = () =>
    suggestedActions.length > 0 && (
      <div className='border-t bg-gray-50 p-3 dark:bg-gray-800/30'>
        <h4 className='mb-2 flex items-center gap-2 font-medium text-sm'>
          <Sparkles className='h-4 w-4' />
          Suggested Actions
        </h4>
        <div className='flex flex-wrap gap-2'>
          {suggestedActions.map((action, index) => (
            <Button
              key={index}
              variant='outline'
              size='sm'
              onClick={() => handleSuggestedAction(action)}
              className='text-xs'
            >
              {action.title}
            </Button>
          ))}
        </div>
      </div>
    )

  const renderRelatedContent = () =>
    relatedContent.length > 0 && (
      <div className='border-t bg-blue-50 p-3 dark:bg-blue-950/20'>
        <h4 className='mb-2 font-medium text-sm'>Related Content</h4>
        <div className='space-y-2'>
          {relatedContent.slice(0, 3).map((content) => (
            <button
              key={content.id}
              onClick={() => handleRelatedContentClick(content)}
              className='w-full rounded bg-white p-2 text-left transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700'
            >
              <div className='flex items-center gap-2 text-sm'>
                <ExternalLink className='h-3 w-3 text-blue-600' />
                <span className='font-medium'>{content.title}</span>
                <Badge variant='secondary' className='ml-auto text-xs'>
                  {content.type}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>
    )

  // ========================
  // MAIN RENDER
  // ========================

  const chatContent = (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <MessageCircle className='h-5 w-5 text-purple-600' />
            AI Chat Assistant
            {currentState && (
              <Badge variant='outline' className='text-xs'>
                {currentState.phase.replace('_', ' ')}
              </Badge>
            )}
          </CardTitle>

          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' onClick={clearConversation} className='h-8 px-2'>
              <Trash2 className='h-3 w-3' />
            </Button>
            {onClose && (
              <Button variant='ghost' size='sm' onClick={onClose} className='h-8 px-2'>
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className='flex-1 p-0'>
        <ScrollArea
          className='h-full px-4 pb-4'
          style={{ maxHeight: embedded ? maxHeight : '400px' }}
        >
          <div className='space-y-4'>
            {messages.map(renderMessage)}

            {isTyping && (
              <div className='mr-8 flex gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50'>
                <Bot className='h-6 w-6 text-purple-600' />
                <div className='flex items-center gap-1'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span className='text-muted-foreground text-sm'>AI is typing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Error Display */}
      {error && (
        <Alert className='mx-4 mb-4'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Suggested Actions */}
      {renderSuggestedActions()}

      {/* Related Content */}
      {renderRelatedContent()}

      {/* Input Area */}
      <div className='border-t p-4'>
        <form onSubmit={handleSendMessage} className='flex gap-2'>
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder='Ask me anything about workflows, integrations, or troubleshooting...'
            disabled={isLoading}
            className='flex-1'
          />
          <Button type='submit' disabled={isLoading || !inputMessage.trim()} size='icon'>
            {isLoading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Send className='h-4 w-4' />
            )}
          </Button>
        </form>
      </div>
    </div>
  )

  // Return embedded version or full card
  if (embedded) {
    return <div className={cn('h-full', className)}>{chatContent}</div>
  }

  return (
    <Card className={cn('mx-auto w-full max-w-2xl', className)} style={{ height: maxHeight }}>
      {chatContent}
    </Card>
  )
}

export default IntelligentChatInterface
