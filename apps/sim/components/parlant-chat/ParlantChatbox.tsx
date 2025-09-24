/**
 * Customized Parlant Chatbox component for Sim
 */

'use client'

import { useEffect, useMemo } from 'react'
import Chatbox from 'parlant-chat-react'
import 'parlant-chat-react/style.css'
import { MessageSquare, X, Minimize2, Send } from 'lucide-react'
import { useChatTheme, useChatKeyboardShortcuts } from './hooks'
import type { SimChatConfig, CustomMessageProps, CustomHeaderProps, CustomButtonProps } from './types'
import { cn } from '@/lib/utils'

/**
 * Custom message component that matches Sim's design system
 */
function SimMessageComponent({ message, className, showAvatar = true, showTimestamp = false }: CustomMessageProps) {
  return (
    <div className={cn(
      'group flex flex-col gap-2 px-3 py-2 rounded-lg max-w-[80%]',
      message.type === 'user' ? 'ml-auto bg-brand-primary text-white' : 'mr-auto bg-card text-card-foreground border',
      className
    )}>
      <div className="flex items-start gap-2">
        {showAvatar && message.type === 'agent' && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-sm font-semibold shrink-0">
            A
          </div>
        )}
        <div className="flex-1">
          <div className={cn(
            'prose prose-sm max-w-none',
            message.type === 'user' ? 'prose-invert' : 'prose-foreground'
          )}>
            {message.content}
          </div>
          {showTimestamp && (
            <div className={cn(
              'text-xs mt-1 opacity-70',
              message.type === 'user' ? 'text-white' : 'text-muted-foreground'
            )}>
              {message.timestamp.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Custom header component that matches Sim's design system
 */
function SimHeaderComponent({ title, agentName, onClose, onMinimize, className }: CustomHeaderProps) {
  return (
    <div className={cn(
      'flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm',
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-sm font-semibold">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{agentName || title}</h3>
          <p className="text-xs text-muted-foreground">Online</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {onMinimize && (
          <button
            onClick={onMinimize}
            className="p-1.5 hover:bg-secondary rounded-md transition-colors"
            aria-label="Minimize chat"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-md transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Custom popup button component that matches Sim's design system
 */
function SimPopupButtonComponent({ onClick, className, children, disabled }: CustomButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-lg',
        'bg-gradient-to-br from-brand-primary to-brand-accent hover:from-brand-primary-hover hover:to-brand-accent',
        'text-white transition-all duration-200 hover:scale-105 hover:shadow-xl',
        'flex items-center justify-center z-50',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        'animate-pulse-ring',
        className
      )}
      aria-label="Open chat"
    >
      {children || <MessageSquare className="w-6 h-6" />}
    </button>
  )
}

export interface ParlantChatboxProps extends SimChatConfig {
  /** Whether the chatbox is open (for controlled mode) */
  isOpen?: boolean
  /** Callback when chatbox open state changes */
  onOpenChange?: (isOpen: boolean) => void
  /** Custom CSS class for the chatbox wrapper */
  className?: string
}

/**
 * Main Parlant Chatbox component customized for Sim
 */
export default function ParlantChatbox({
  server = process.env.NEXT_PUBLIC_PARLANT_SERVER || 'https://parlant.emcie.co',
  agentId = process.env.NEXT_PUBLIC_PARLANT_AGENT_ID || 'default',
  sessionId,
  agentName = 'Sim Assistant',
  agentAvatar,
  chatDescription = 'Ask me anything about Sim!',
  float = true,
  theme = 'auto',
  showSimBranding = true,
  customColors,
  enableAudio = false,
  headerConfig,
  animations = { enabled: true, duration: 200 },
  isOpen,
  onOpenChange,
  onSessionCreated,
  className,
  ...props
}: ParlantChatboxProps) {
  const currentTheme = useChatTheme({ theme, customColors })

  // Set up keyboard shortcuts
  useChatKeyboardShortcuts({
    onToggle: () => onOpenChange?.(!isOpen),
    onEscape: () => onOpenChange?.(false),
  })

  // Generate CSS custom properties for theming
  const cssCustomProperties = useMemo(() => {
    const properties: Record<string, string> = {}

    if (customColors) {
      if (customColors.primary) properties['--parlant-primary'] = customColors.primary
      if (customColors.primaryHover) properties['--parlant-primary-hover'] = customColors.primaryHover
      if (customColors.background) properties['--parlant-background'] = customColors.background
      if (customColors.foreground) properties['--parlant-foreground'] = customColors.foreground
      if (customColors.border) properties['--parlant-border'] = customColors.border
      if (customColors.accent) properties['--parlant-accent'] = customColors.accent
    } else {
      // Use Sim's CSS custom properties
      properties['--parlant-primary'] = 'hsl(var(--brand-primary-hex))'
      properties['--parlant-primary-hover'] = 'hsl(var(--brand-primary-hover-hex))'
      properties['--parlant-background'] = 'hsl(var(--background))'
      properties['--parlant-foreground'] = 'hsl(var(--foreground))'
      properties['--parlant-border'] = 'hsl(var(--border))'
      properties['--parlant-accent'] = 'hsl(var(--brand-accent-hex))'
    }

    return properties
  }, [customColors])

  // Apply theme to the chatbox wrapper
  useEffect(() => {
    const chatboxElement = document.querySelector('.parlant-chatbox-wrapper')
    if (chatboxElement) {
      chatboxElement.setAttribute('data-theme', currentTheme)

      // Apply custom CSS properties
      Object.entries(cssCustomProperties).forEach(([property, value]) => {
        ;(chatboxElement as HTMLElement).style.setProperty(property, value)
      })
    }
  }, [currentTheme, cssCustomProperties])

  const customClassNames = useMemo(() => ({
    chatboxWrapper: cn(
      'sim-parlant-chatbox',
      `sim-parlant-chatbox--${currentTheme}`,
      animations?.enabled && 'sim-parlant-chatbox--animated',
      className
    ),
    chatbox: cn(
      'border border-border/50 backdrop-blur-sm',
      'shadow-xl rounded-lg overflow-hidden',
      'bg-background/95'
    ),
    messagesArea: 'scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent',
    agentMessage: 'sim-agent-message',
    customerMessage: 'sim-customer-message',
    textarea: cn(
      'border-input bg-background/50 text-foreground placeholder:text-muted-foreground',
      'focus:border-ring focus:ring-2 focus:ring-ring/20',
      'resize-none rounded-md'
    ),
    popupButton: 'sim-chat-popup-button',
    popupButtonIcon: 'sim-chat-popup-icon',
    chatDescription: 'text-muted-foreground',
    bottomLine: 'text-xs text-muted-foreground',
  }), [currentTheme, animations?.enabled, className])

  const customComponents = useMemo(() => ({
    popupButton: ({ toggleChatOpen }: { toggleChatOpen: () => void }) => (
      <SimPopupButtonComponent onClick={toggleChatOpen} />
    ),
    agentMessage: ({ message, className }: { message: any; className?: string }) => (
      <SimMessageComponent
        message={{
          id: message.id || crypto.randomUUID(),
          content: message.content,
          type: 'agent',
          timestamp: new Date(message.timestamp || Date.now()),
        }}
        className={className}
        showAvatar={true}
        showTimestamp={false}
      />
    ),
    customerMessage: ({ message, className }: { message: any; className?: string }) => (
      <SimMessageComponent
        message={{
          id: message.id || crypto.randomUUID(),
          content: message.content,
          type: 'user',
          timestamp: new Date(message.timestamp || Date.now()),
        }}
        className={className}
        showAvatar={false}
        showTimestamp={false}
      />
    ),
    header: ({ changeIsExpanded, agentName: headerAgentName }: { changeIsExpanded: () => void; agentName: string | undefined }) => (
      <SimHeaderComponent
        title={headerConfig?.title || 'Chat'}
        agentName={headerAgentName}
        onClose={headerConfig?.showCloseButton !== false ? changeIsExpanded : undefined}
        onMinimize={headerConfig?.showMinimizeButton ? changeIsExpanded : undefined}
      />
    ),
  }), [headerConfig])

  const sendIcon = useMemo(() => (
    <Send className="w-4 h-4" />
  ), [])

  const titleFunction = useMemo(() => () => {
    return headerConfig?.title || agentName || 'Sim Assistant'
  }, [headerConfig?.title, agentName])

  return (
    <div style={cssCustomProperties}>
      <Chatbox
        server={server}
        agentId={agentId}
        sessionId={sessionId}
        agentName={agentName}
        agentAvatar={agentAvatar}
        chatDescription={chatDescription}
        float={float}
        titleFn={titleFunction}
        sendIcon={sendIcon}
        classNames={customClassNames}
        components={customComponents}
        onSessionCreated={onSessionCreated}
        {...props}
      />
    </div>
  )
}