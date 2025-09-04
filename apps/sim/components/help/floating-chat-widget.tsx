/**
 * Floating Chat Widget - Persistent AI Chat Assistant
 *
 * Floating chat widget that provides persistent access to AI assistance:
 * - Always-accessible chat interface
 * - Minimizable/expandable design
 * - Context-aware assistance based on current page/workflow
 * - Unread message indicators
 * - Smart positioning and responsive behavior
 * - Integration with workflow context
 *
 * Can be embedded in any page to provide instant AI help access.
 *
 * @created 2025-09-04
 * @author Intelligent Chatbot Implementation Specialist
 */

'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import { Maximize2, MessageCircle, Minimize2, X, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { IntelligentChatInterface } from './intelligent-chat-interface'

// ========================
// TYPES AND INTERFACES
// ========================

interface FloatingChatWidgetProps {
  /** Initial position of the widget */
  initialPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Whether the widget starts expanded */
  initialExpanded?: boolean
  /** Workflow context for contextual assistance */
  workflowContext?: {
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
  /** User profile for personalization */
  userProfile?: {
    expertiseLevel?: 'beginner' | 'intermediate' | 'expert'
    preferredLanguage?: string
    previousInteractions?: number
    commonIssues?: string[]
  }
  /** Custom CSS classes */
  className?: string
  /** Z-index for the widget */
  zIndex?: number
  /** Whether to show proactive suggestions */
  showProactiveSuggestions?: boolean
  /** Callback when widget state changes */
  onStateChange?: (state: { expanded: boolean; minimized: boolean }) => void
}

// ========================
// MAIN COMPONENT
// ========================

export function FloatingChatWidget({
  initialPosition = 'bottom-right',
  initialExpanded = false,
  workflowContext,
  userProfile,
  className,
  zIndex = 1000,
  showProactiveSuggestions = true,
  onStateChange,
}: FloatingChatWidgetProps) {
  // State management
  const [isExpanded, setIsExpanded] = useState(initialExpanded)
  const [isMinimized, setIsMinimized] = useState(false)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [sessionId] = useState(`floating_chat_${Date.now()}`)

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.({ expanded: isExpanded, minimized: isMinimized })
  }, [isExpanded, isMinimized, onStateChange])

  // Auto-expand for urgent assistance
  useEffect(() => {
    if (workflowContext?.errors && workflowContext.errors.length > 2) {
      // Auto-expand if user has multiple errors (struggling)
      setIsExpanded(true)
      setHasUnreadMessages(true)
    }
  }, [workflowContext?.errors])

  // ========================
  // EVENT HANDLERS
  // ========================

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded)
    setHasUnreadMessages(false)
    setUnreadCount(0)

    if (!isExpanded) {
      setIsMinimized(false)
    }
  }

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMinimized(!isMinimized)
  }

  const handleClose = () => {
    setIsExpanded(false)
    setIsMinimized(false)
  }

  const handleDragStart = (e: React.MouseEvent) => {
    if (!isExpanded) return // Only allow dragging when expanded

    setIsDragging(true)
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // ========================
  // POSITION CALCULATIONS
  // ========================

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex,
    }

    switch (position) {
      case 'bottom-right':
        return { ...baseStyles, bottom: '20px', right: '20px' }
      case 'bottom-left':
        return { ...baseStyles, bottom: '20px', left: '20px' }
      case 'top-right':
        return { ...baseStyles, top: '20px', right: '20px' }
      case 'top-left':
        return { ...baseStyles, top: '20px', left: '20px' }
      default:
        return { ...baseStyles, bottom: '20px', right: '20px' }
    }
  }

  // ========================
  // RENDER FLOATING BUTTON
  // ========================

  const renderFloatingButton = () => (
    <Button
      onClick={handleToggleExpanded}
      className={cn(
        'h-14 w-14 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl',
        'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700',
        'group relative'
      )}
      style={getPositionStyles()}
    >
      <MessageCircle className='h-6 w-6 text-white' />

      {/* Unread messages indicator */}
      {hasUnreadMessages && unreadCount > 0 && (
        <Badge className='-top-2 -right-2 absolute flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs'>
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}

      {/* Proactive assistance pulse */}
      {workflowContext?.errors && workflowContext.errors.length > 1 && (
        <div className='absolute inset-0 animate-pulse rounded-full bg-red-400 opacity-30' />
      )}

      {/* Tooltip */}
      <div className='-translate-x-1/2 pointer-events-none absolute bottom-full left-1/2 mb-2 transform opacity-0 transition-opacity group-hover:opacity-100'>
        <div className='whitespace-nowrap rounded bg-black px-2 py-1 text-white text-xs'>
          Need help? Ask me anything!
          {workflowContext?.errors && workflowContext.errors.length > 1 && (
            <div className='mt-1 flex items-center gap-1 text-red-300'>
              <Zap className='h-3 w-3' />I noticed some issues - let me help!
            </div>
          )}
        </div>
      </div>
    </Button>
  )

  // ========================
  // RENDER EXPANDED WIDGET
  // ========================

  const renderExpandedWidget = () => (
    <Card
      className={cn(
        'overflow-hidden border-0 shadow-2xl transition-all duration-300',
        isMinimized ? 'h-12' : 'h-[600px]',
        'w-96 max-w-[90vw]'
      )}
      style={getPositionStyles()}
    >
      {/* Header */}
      <div
        className={cn(
          'flex cursor-move items-center justify-between bg-gradient-to-r from-purple-600 to-blue-600 p-3 text-white',
          isDragging && 'cursor-grabbing'
        )}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
      >
        <div className='flex items-center gap-2'>
          <MessageCircle className='h-5 w-5' />
          <h3 className='font-semibold text-sm'>AI Assistant</h3>
          {workflowContext?.type && (
            <Badge variant='secondary' className='border-0 bg-white/20 text-white text-xs'>
              {workflowContext.type}
            </Badge>
          )}
        </div>

        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleMinimize}
            className='h-6 w-6 p-0 text-white hover:bg-white/20'
          >
            {isMinimized ? <Maximize2 className='h-3 w-3' /> : <Minimize2 className='h-3 w-3' />}
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClose}
            className='h-6 w-6 p-0 text-white hover:bg-white/20'
          >
            <X className='h-3 w-3' />
          </Button>
        </div>
      </div>

      {/* Chat Content */}
      {!isMinimized && (
        <div className='h-[calc(100%-48px)]'>
          <IntelligentChatInterface
            sessionId={sessionId}
            workflowContext={workflowContext}
            userProfile={userProfile}
            embedded={true}
            showProactiveSuggestions={showProactiveSuggestions}
            maxHeight='100%'
            onClose={handleClose}
          />
        </div>
      )}
    </Card>
  )

  // ========================
  // MAIN RENDER
  // ========================

  return (
    <div className={cn('select-none', className)}>
      {isExpanded ? renderExpandedWidget() : renderFloatingButton()}
    </div>
  )
}

// ========================
// PROVIDER COMPONENT
// ========================

/**
 * Provider component to inject the floating chat widget into any page
 */
interface ChatWidgetProviderProps {
  children: React.ReactNode
  /** Widget configuration */
  widgetProps?: Partial<FloatingChatWidgetProps>
  /** Whether to show the widget */
  enabled?: boolean
}

export function ChatWidgetProvider({
  children,
  widgetProps = {},
  enabled = true,
}: ChatWidgetProviderProps) {
  return (
    <>
      {children}
      {enabled && <FloatingChatWidget showProactiveSuggestions={true} {...widgetProps} />}
    </>
  )
}

export default FloatingChatWidget
