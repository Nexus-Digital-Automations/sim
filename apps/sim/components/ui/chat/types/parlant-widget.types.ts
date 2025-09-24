/**
 * Parlant Chat Widget Types and Interfaces for Sim Integration
 *
 * This file provides TypeScript interfaces for integrating the parlant-chat-react
 * widget with Sim's frontend architecture, including custom theming and configuration.
 */

import type { JSX, ReactElement } from 'react'

// Re-export core types from parlant-chat-react for convenience
export interface MessageInterface {
  id: string
  content: string
  source: 'agent' | 'user'
  timestamp: Date
  status: string | null
  error?: string
}

export interface PopupButtonComponentProps {
  toggleChatOpen: () => void
}

export interface MessageComponentProps {
  message: MessageInterface
  className?: string
}

// Core Parlant Widget Props
export interface ParlantChatProps {
  server: string
  sessionId?: string
  agentName?: string
  agentAvatar?: JSX.Element
  chatDescription?: string
  float?: boolean
  onPopupButtonClick?: () => void
  agentOpeningMessage?: string
  titleFn?: () => string
  popupButton?: JSX.Element
  sendIcon?: JSX.Element
  agentId?: string
  classNames?: ParlantClassNames
  components?: ParlantComponents
  onSessionCreated?: (sessionId: string) => void
}

export interface ParlantClassNames {
  chatboxWrapper?: string
  chatbox?: string
  messagesArea?: string
  agentMessage?: string
  customerMessage?: string
  textarea?: string
  popupButton?: string
  popupButtonIcon?: string
  chatDescription?: string
  bottomLine?: string
}

export interface ParlantComponents {
  popupButton?: (props: PopupButtonComponentProps) => ReactElement
  agentMessage?: (props: MessageComponentProps) => ReactElement
  customerMessage?: (props: MessageComponentProps) => ReactElement
  header?: (props: { changeIsExpanded: () => void; agentName: string | undefined }) => ReactElement
}

// Sim-specific Widget Configuration
export interface SimChatWidgetConfig {
  // Authentication & Workspace
  workspaceId: string
  userId?: string
  userRole?: 'owner' | 'admin' | 'member' | 'viewer'

  // Agent Configuration
  agentId: string
  agentName?: string
  agentDescription?: string

  // Server Configuration
  parlantServerUrl: string
  apiEndpoint?: string

  // UI Configuration
  theme?: SimChatTheme
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  size?: 'small' | 'medium' | 'large'

  // Feature Toggles
  enableVoice?: boolean
  enableFileUpload?: boolean
  enableScreenshot?: boolean
  showTypingIndicator?: boolean
  showTimestamps?: boolean

  // Customization
  branding?: SimBrandingConfig
  customCSS?: string

  // Event Handlers
  onChatOpen?: () => void
  onChatClose?: () => void
  onMessageSent?: (message: MessageInterface) => void
  onMessageReceived?: (message: MessageInterface) => void
  onSessionStart?: (sessionId: string) => void
  onSessionEnd?: (sessionId: string) => void
  onError?: (error: Error) => void
}

export interface SimChatTheme {
  // Colors aligned with Sim's design system
  primary?: string
  secondary?: string
  background?: string
  foreground?: string
  accent?: string
  muted?: string
  border?: string

  // Chat-specific colors
  userMessageBg?: string
  agentMessageBg?: string
  userMessageText?: string
  agentMessageText?: string

  // Typography
  fontFamily?: string
  fontSize?: 'sm' | 'md' | 'lg'

  // Spacing and Layout
  borderRadius?: string
  spacing?: 'compact' | 'comfortable' | 'spacious'

  // Animation
  enableAnimations?: boolean
  animationDuration?: number
}

export interface SimBrandingConfig {
  logo?: string
  companyName?: string
  welcomeMessage?: string
  placeholderText?: string
  poweredBy?: boolean
  customHeader?: ReactElement
  customFooter?: ReactElement
}

// Widget State Management
export interface SimChatWidgetState {
  isOpen: boolean
  isMinimized: boolean
  currentSessionId?: string
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  messages: MessageInterface[]
  isTyping: boolean
  hasUnreadMessages: boolean
  unreadCount: number
}

export interface SimChatWidgetActions {
  openChat: () => void
  closeChat: () => void
  minimizeChat: () => void
  maximizeChat: () => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  markAsRead: () => void
  reconnect: () => void
}

// Component Props for Sim Integration
export interface SimChatWidgetProps extends Partial<ParlantChatProps> {
  config: SimChatWidgetConfig
  initialState?: Partial<SimChatWidgetState>
  className?: string
  containerClassName?: string
}

export interface SimChatProviderProps {
  children: React.ReactNode
  defaultConfig: SimChatWidgetConfig
}

export interface SimChatContextValue {
  config: SimChatWidgetConfig
  state: SimChatWidgetState
  actions: SimChatWidgetActions
  updateConfig: (updates: Partial<SimChatWidgetConfig>) => void
}

// Integration with Sim's existing systems
export interface WorkspaceIntegration {
  workspaceId: string
  workspaceName?: string
  userPermissions?: string[]
  availableAgents?: AgentInfo[]
}

export interface AgentInfo {
  id: string
  name: string
  description?: string
  avatar?: string
  capabilities?: string[]
  isActive?: boolean
}

// Analytics and Logging
export interface ChatAnalyticsEvent {
  type:
    | 'chat_opened'
    | 'chat_closed'
    | 'message_sent'
    | 'message_received'
    | 'session_started'
    | 'session_ended'
  timestamp: Date
  sessionId: string
  userId?: string
  workspaceId: string
  metadata?: Record<string, any>
}

export interface ChatLogEntry {
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  context?: Record<string, any>
  sessionId?: string
  userId?: string
}

// Error Types
export type ChatWidgetError =
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AGENT_NOT_FOUND'
  | 'WORKSPACE_ACCESS_DENIED'
  | 'SESSION_EXPIRED'
  | 'CONFIGURATION_ERROR'
  | 'UNKNOWN_ERROR'

export interface ChatErrorDetails {
  type: ChatWidgetError
  message: string
  code?: string
  details?: Record<string, any>
  timestamp: Date
  recoverable?: boolean
  retryAfter?: number
}
