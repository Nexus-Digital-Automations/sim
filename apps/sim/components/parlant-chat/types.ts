/**
 * TypeScript definitions for Parlant Chat integration
 */

import type { ChatProps } from 'parlant-chat-react'
import type { ReactNode } from 'react'

/**
 * Extended configuration for Sim's customized Parlant Chat
 */
export interface SimChatConfig extends Omit<ChatProps, 'server' | 'agentId'> {
  /** Parlant server endpoint */
  server?: string
  /** Agent ID for the chat */
  agentId?: string
  /** Custom theme configuration */
  theme?: 'light' | 'dark' | 'auto'
  /** Whether to show the Sim branding */
  showSimBranding?: boolean
  /** Custom CSS variables for theming */
  customColors?: {
    primary?: string
    primaryHover?: string
    background?: string
    foreground?: string
    border?: string
    accent?: string
  }
  /** Whether to enable audio features */
  enableAudio?: boolean
  /** Custom header configuration */
  headerConfig?: {
    title?: string
    showCloseButton?: boolean
    showMinimizeButton?: boolean
  }
  /** Animation preferences */
  animations?: {
    enabled?: boolean
    duration?: number
  }
}

/**
 * Chat message interface extending Parlant's base structure
 */
export interface SimChatMessage {
  id: string
  content: string
  type: 'user' | 'agent'
  timestamp: Date
  metadata?: {
    agentId?: string
    sessionId?: string
    confidence?: number
    intent?: string
  }
}

/**
 * Chat context for provider
 */
export interface SimChatContextType {
  config: SimChatConfig
  isConnected: boolean
  isLoading: boolean
  error: string | null
  messages: SimChatMessage[]
  sendMessage: (message: string) => Promise<void>
  clearChat: () => void
  reconnect: () => Promise<void>
}

/**
 * Props for custom components
 */
export interface CustomMessageProps {
  message: SimChatMessage
  className?: string
  showAvatar?: boolean
  showTimestamp?: boolean
}

export interface CustomHeaderProps {
  title: string
  agentName?: string
  onClose?: () => void
  onMinimize?: () => void
  className?: string
}

export interface CustomButtonProps {
  onClick: () => void
  className?: string
  children?: ReactNode
  disabled?: boolean
}

/**
 * Theme configuration
 */
export interface SimChatTheme {
  colors: {
    primary: string
    primaryHover: string
    background: string
    foreground: string
    muted: string
    mutedForeground: string
    border: string
    input: string
    ring: string
    accent: string
    accentForeground: string
  }
  radius: string
  fontFamily: {
    sans: string[]
    mono: string[]
  }
  animations: {
    duration: {
      fast: string
      normal: string
      slow: string
    }
    easing: {
      default: string
      smooth: string
    }
  }
}

/**
 * Event handlers
 */
export interface SimChatEventHandlers {
  onMessageSent?: (message: string) => void
  onMessageReceived?: (message: SimChatMessage) => void
  onError?: (error: Error) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onSessionCreated?: (sessionId: string) => void
  onSessionEnded?: () => void
}

/**
 * Integration options for different environments
 */
export interface SimChatIntegrationOptions {
  /** Whether to render as a floating widget */
  floating?: boolean
  /** Position for floating widget */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Whether to start minimized */
  startMinimized?: boolean
  /** Custom z-index for the widget */
  zIndex?: number
  /** Whether to enable drag and drop */
  draggable?: boolean
  /** Whether to enable keyboard shortcuts */
  keyboardShortcuts?: boolean
  /** Integration with Sim's authentication */
  useSimAuth?: boolean
}