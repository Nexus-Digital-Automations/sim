/**
 * Sim Chat Widget - Main Export Index
 *
 * This file provides a centralized export for all chat widget components,
 * hooks, types, and utilities for easy integration throughout Sim.
 */

export { SimChatButton, SimChatContainer, SimpleSimChat } from './components/sim-chat-container'
// Main Components
export { SimChatWidget } from './components/sim-chat-widget'
// Configuration Utilities
export {
  createThemeCSS,
  // Default Configuration
  DEFAULT_WIDGET_CONFIG,
  generateTailwindClasses,
  generateThemeCSSProperties,
  getEnvironmentConfig,
  getPositionStyles,
  getSizeStyles,
  // Configuration Functions
  mergeWithDefaults,
  validateWidgetConfig,
  WIDGET_POSITIONS,
  WIDGET_SIZES,
} from './config/widget-config'
// Hooks
export { default as useChatConfig, useAgentConfig, useChatTheme } from './hooks/use-chat-config'
// Providers & Context
export {
  SimChatProvider,
  useChatActions,
  useChatConfig as useChatConfigContext,
  useChatState,
  useSimChat,
} from './providers/sim-chat-provider'
// Types
export type {
  AgentInfo,
  // Analytics & Logging Types
  ChatAnalyticsEvent,
  ChatErrorDetails,
  ChatLogEntry,
  // Error Types
  ChatWidgetError,
  MessageComponentProps,
  // Message & Interface Types
  MessageInterface,
  // Parlant Integration Types
  ParlantChatProps,
  ParlantClassNames,
  ParlantComponents,
  PopupButtonComponentProps,
  SimBrandingConfig,
  SimChatContextValue,
  SimChatProviderProps,
  SimChatTheme,
  SimChatWidgetActions,
  // Core Types
  SimChatWidgetConfig,
  SimChatWidgetProps,
  SimChatWidgetState,
  // Configuration Types
  WorkspaceIntegration,
} from './types/parlant-widget.types'

// CSS Theme Import
// Note: Import this CSS file in your app's main CSS file or layout
export const CHAT_THEME_CSS_PATH = './styles/sim-chat-theme.css'

// Quick Setup Examples
export const CHAT_SETUP_EXAMPLES = {
  // Basic usage with minimal configuration
  basic: `
import { SimpleSimChat } from '@/components/ui/chat'

function App() {
  return (
    <SimpleSimChat
      workspaceId="your-workspace-id"
      agentId="your-agent-id"
    />
  )
}`,

  // Advanced usage with full configuration
  advanced: `
import { SimChatContainer } from '@/components/ui/chat'

function App() {
  return (
    <SimChatContainer
      workspaceId="your-workspace-id"
      agentId="your-agent-id"
      userId="user-123"
      configOverrides={{
        theme: {
          primary: 'hsl(263 85% 70%)',
          enableAnimations: true,
        },
        position: 'bottom-right',
        size: 'medium',
        enableVoice: true,
      }}
    />
  )
}`,

  // With provider for global state management
  withProvider: `
import { SimChatProvider, SimChatWidget } from '@/components/ui/chat'

function App() {
  const config = {
    workspaceId: "your-workspace-id",
    agentId: "your-agent-id",
    parlantServerUrl: "https://your-parlant-server.com",
  }

  return (
    <SimChatProvider defaultConfig={config}>
      <YourApp />
      <SimChatWidget config={config} />
    </SimChatProvider>
  )
}`,

  // Custom theming
  customTheme: `
import { useChatTheme } from '@/components/ui/chat'

function CustomChatTheme() {
  const { theme, updateTheme, applyPreset } = useChatTheme({
    primary: 'hsl(263 85% 70%)',
    secondary: 'hsl(336 95% 65%)',
    borderRadius: '12px',
  }, 'workspace-id')

  return (
    <div>
      <button onClick={() => applyPreset('dark')}>
        Apply Dark Theme
      </button>
      <button onClick={() => updateTheme({ enableAnimations: false })}>
        Disable Animations
      </button>
    </div>
  )
}`,
}

// CSS Import Instructions
export const CSS_SETUP_INSTRUCTIONS = `
// Add this to your main CSS file (e.g., globals.css or app.css)
@import '../components/ui/chat/styles/sim-chat-theme.css';

// Or import it in your layout.tsx/layout.js
import '@/components/ui/chat/styles/sim-chat-theme.css'
`

// Environment Setup Instructions
export const ENV_SETUP_INSTRUCTIONS = `
// Add these environment variables to your .env.local file:
NEXT_PUBLIC_PARLANT_SERVER_URL=http://localhost:8000
PARLANT_API_KEY=your-api-key-here

// Optional: Analytics endpoint for chat events
NEXT_PUBLIC_CHAT_ANALYTICS_ENDPOINT=https://your-analytics.com/api/events
`

// Type-only exports for better tree-shaking
export type * from './types/parlant-widget.types'

// Version information
export const CHAT_WIDGET_VERSION = '1.0.0'
export const PARLANT_REACT_VERSION = '1.0.10'

// Feature flags
export const CHAT_FEATURES = {
  voiceInput: true,
  fileUpload: true,
  screenshotCapture: false,
  analytics: true,
  persistentSessions: true,
  multiWorkspace: true,
  customThemes: true,
  darkMode: true,
  mobileOptimized: true,
  accessibility: true,
} as const

// Default export for convenience
export { SimChatContainer as default } from './components/sim-chat-container'
