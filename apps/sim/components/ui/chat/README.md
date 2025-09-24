# Sim Chat Widget Integration

A complete integration of the `parlant-chat-react` widget with Sim's frontend architecture, providing seamless chat functionality with proper TypeScript support, design system integration, and advanced configuration management.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Advanced Usage](#advanced-usage)
- [Configuration](#configuration)
- [Theming](#theming)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

This integration provides a production-ready chat widget that:

- **Seamlessly integrates** with Sim's design system and component architecture
- **Maintains workspace isolation** for multi-tenant environments
- **Provides comprehensive TypeScript support** with fully typed interfaces
- **Supports advanced theming** with light/dark mode and custom styling
- **Includes state management** with persistence and analytics
- **Offers flexible configuration** with validation and environment-specific settings

## Features

### 🎨 Design System Integration
- Full compatibility with Sim's Tailwind CSS setup
- Automatic light/dark mode support
- Custom CSS variables integration
- Responsive design with mobile optimization

### 🔧 Configuration Management
- Environment-specific configuration
- Persistent settings with localStorage
- Configuration validation and error handling
- Real-time configuration updates

### 🎯 TypeScript Support
- Comprehensive type definitions
- Full IntelliSense support
- Type-safe configuration and theming
- Runtime type validation

### 🚀 Advanced Features
- Workspace-based isolation
- Session persistence
- Analytics and event tracking
- Error boundaries and graceful degradation
- Accessibility compliance
- Performance optimizations

### 📱 User Experience
- Smooth animations and transitions
- Voice input support (when enabled)
- File upload capabilities
- Typing indicators
- Unread message notifications
- Mobile-optimized interface

## Installation

The `parlant-chat-react` package is already installed in the project. The chat widget components are available in the `components/ui/chat` directory.

### CSS Integration

The chat theme CSS is automatically imported in `app/globals.css`:

```css
/* Parlant Chat Widget Theme Integration */
@import '../components/ui/chat/styles/sim-chat-theme.css';
```

### Environment Configuration

Add the following environment variables to your `.env.local`:

```bash
# Required: Parlant server URL
NEXT_PUBLIC_PARLANT_SERVER_URL=http://localhost:8000

# Optional: API key for authenticated requests
PARLANT_API_KEY=your-api-key-here

# Optional: Analytics endpoint for chat events
NEXT_PUBLIC_CHAT_ANALYTICS_ENDPOINT=https://your-analytics.com/api/events
```

## Quick Start

### Simple Integration

The easiest way to add a chat widget to your application:

```tsx
import { SimpleSimChat } from '@/components/ui/chat'

function MyApp() {
  return (
    <div>
      <h1>My Application</h1>
      <SimpleSimChat
        workspaceId="workspace-123"
        agentId="agent-456"
      />
    </div>
  )
}
```

### With Custom Configuration

For more control over the widget behavior:

```tsx
import { SimChatContainer } from '@/components/ui/chat'

function MyApp() {
  return (
    <SimChatContainer
      workspaceId="workspace-123"
      agentId="agent-456"
      userId="user-789"
      configOverrides={{
        position: 'bottom-right',
        size: 'medium',
        theme: {
          primary: 'hsl(263 85% 70%)',
          enableAnimations: true,
        },
        enableVoice: true,
        branding: {
          welcomeMessage: 'Hello! How can I help you today?',
          placeholderText: 'Type your message...',
        },
      }}
    />
  )
}
```

## Advanced Usage

### Using the Provider Pattern

For applications that need global chat state management:

```tsx
import { SimChatProvider, SimChatWidget, useSimChat } from '@/components/ui/chat'

function App() {
  const config = {
    workspaceId: 'workspace-123',
    agentId: 'agent-456',
    parlantServerUrl: 'https://your-parlant-server.com',
  }

  return (
    <SimChatProvider defaultConfig={config}>
      <MainApplication />
      <SimChatWidget config={config} />
    </SimChatProvider>
  )
}

function MainApplication() {
  const { state, actions } = useSimChat()

  return (
    <div>
      <button onClick={actions.openChat}>
        Open Chat {state.unreadCount > 0 && `(${state.unreadCount})`}
      </button>
    </div>
  )
}
```

### Custom Theming

```tsx
import { useChatTheme } from '@/components/ui/chat'

function CustomTheme() {
  const { theme, updateTheme, applyPreset } = useChatTheme({
    primary: 'hsl(263 85% 70%)',
    secondary: 'hsl(336 95% 65%)',
    borderRadius: '12px',
  }, 'workspace-id')

  return (
    <div>
      <button onClick={() => applyPreset('dark')}>
        Dark Mode
      </button>
      <button onClick={() => updateTheme({ enableAnimations: false })}>
        Disable Animations
      </button>
    </div>
  )
}
```

## Configuration

### Core Configuration Options

```tsx
interface SimChatWidgetConfig {
  // Required
  workspaceId: string
  agentId: string
  parlantServerUrl: string

  // Optional
  userId?: string
  userRole?: 'owner' | 'admin' | 'member' | 'viewer'
  theme?: SimChatTheme
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  size?: 'small' | 'medium' | 'large'

  // Features
  enableVoice?: boolean
  enableFileUpload?: boolean
  enableScreenshot?: boolean
  showTypingIndicator?: boolean
  showTimestamps?: boolean

  // Branding
  branding?: {
    logo?: string
    companyName?: string
    welcomeMessage?: string
    placeholderText?: string
    poweredBy?: boolean
  }

  // Event Handlers
  onChatOpen?: () => void
  onChatClose?: () => void
  onMessageSent?: (message: MessageInterface) => void
  onMessageReceived?: (message: MessageInterface) => void
  onError?: (error: Error) => void
}
```

### Theme Configuration

```tsx
interface SimChatTheme {
  // Colors (aligned with Sim's design system)
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

  // Layout
  borderRadius?: string
  spacing?: 'compact' | 'comfortable' | 'spacious'

  // Animation
  enableAnimations?: boolean
  animationDuration?: number
}
```

## Theming

The chat widget automatically inherits Sim's design system variables and supports both light and dark modes.

### CSS Custom Properties

The widget uses CSS custom properties that automatically map to Sim's theme:

```css
.parlant-chat-widget {
  --chat-primary: hsl(var(--primary));
  --chat-background: hsl(var(--background));
  --chat-foreground: hsl(var(--foreground));
  /* ... and many more */
}
```

### Custom Styling

You can override styles using CSS classes:

```css
.my-custom-chat {
  --chat-primary: hsl(210 100% 50%);
  --chat-border-radius: 16px;
}
```

```tsx
<SimChatContainer
  className="my-custom-chat"
  // ... other props
/>
```

## Architecture

### Component Hierarchy

```
SimChatContainer (Error Boundary + Configuration)
├── SimChatProvider (State Management)
└── SimChatWidget (UI Wrapper)
    └── ParlantChatbox (Third-party Component)
```

### State Management

The chat widget uses a reducer-based state management system:

```tsx
interface SimChatWidgetState {
  isOpen: boolean
  isMinimized: boolean
  currentSessionId?: string
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  messages: MessageInterface[]
  isTyping: boolean
  hasUnreadMessages: boolean
  unreadCount: number
}
```

### File Structure

```
components/ui/chat/
├── components/
│   ├── sim-chat-widget.tsx      # Main widget component
│   └── sim-chat-container.tsx   # Container with error handling
├── providers/
│   └── sim-chat-provider.tsx    # Context provider for state
├── hooks/
│   └── use-chat-config.ts       # Configuration management hooks
├── config/
│   └── widget-config.ts         # Configuration utilities
├── types/
│   └── parlant-widget.types.ts  # TypeScript type definitions
├── styles/
│   └── sim-chat-theme.css       # Theme and styling
├── index.ts                     # Main export file
└── README.md                    # This documentation
```

## API Reference

### Components

#### `SimChatContainer`
The main container component with error handling and configuration.

```tsx
interface SimChatContainerProps {
  workspaceId: string
  agentId: string
  userId?: string
  configOverrides?: Partial<SimChatWidgetConfig>
  debug?: boolean
}
```

#### `SimpleSimChat`
A simplified component for basic use cases.

```tsx
interface SimpleSimChatProps {
  workspaceId: string
  agentId: string
}
```

#### `SimChatProvider`
Context provider for global chat state management.

```tsx
interface SimChatProviderProps {
  children: React.ReactNode
  defaultConfig: SimChatWidgetConfig
}
```

### Hooks

#### `useSimChat()`
Access the complete chat context.

```tsx
const { config, state, actions, updateConfig } = useSimChat()
```

#### `useChatConfig()`
Manage chat configuration with persistence.

```tsx
const {
  config,
  updateConfig,
  resetConfig,
  isValid,
  validationErrors,
  isDirty,
  isSaving
} = useChatConfig(initialConfig, options)
```

#### `useChatTheme()`
Manage theme configuration.

```tsx
const { theme, updateTheme, resetTheme, applyPreset } = useChatTheme(initialTheme, workspaceId)
```

### Utilities

#### Configuration Functions
- `mergeWithDefaults()` - Merge user config with defaults
- `validateWidgetConfig()` - Validate configuration object
- `generateTailwindClasses()` - Generate CSS classes for styling
- `createThemeCSS()` - Generate custom CSS for theming

## Examples

### Testing Page

Visit `/test-chat` in your application to access a comprehensive testing interface where you can:

- Configure all widget settings
- Test different themes and positions
- Toggle features on/off
- View real-time configuration changes

### Integration Examples

#### Workspace-specific Chat

```tsx
function WorkspaceLayout({ workspaceId, children }) {
  return (
    <div>
      {children}
      <SimpleSimChat
        workspaceId={workspaceId}
        agentId="workspace-assistant"
      />
    </div>
  )
}
```

#### Conditional Chat Display

```tsx
function ChatIntegration({ user, workspace }) {
  if (!user.hasAccessToChat) {
    return null
  }

  return (
    <SimChatContainer
      workspaceId={workspace.id}
      agentId={workspace.defaultAgentId}
      userId={user.id}
      configOverrides={{
        enableVoice: user.preferences.voiceEnabled,
        theme: {
          primary: workspace.brandColor,
        },
      }}
    />
  )
}
```

#### Custom Event Handling

```tsx
function AnalyticsChat() {
  const handleChatEvent = (event, data) => {
    // Send to analytics
    analytics.track(`chat_${event}`, {
      workspaceId: data.workspaceId,
      timestamp: new Date(),
      ...data,
    })
  }

  return (
    <SimChatContainer
      workspaceId="analytics-workspace"
      agentId="analytics-agent"
      configOverrides={{
        onChatOpen: () => handleChatEvent('opened', {}),
        onMessageSent: (msg) => handleChatEvent('message_sent', { messageLength: msg.content.length }),
      }}
    />
  )
}
```

## Troubleshooting

### Common Issues

#### Chat Widget Not Appearing
- Verify `workspaceId` and `agentId` are provided
- Check that the Parlant server URL is correct
- Ensure the CSS theme file is imported

#### Styling Issues
- Check if Tailwind CSS is properly configured
- Verify CSS custom properties are available
- Test with different theme configurations

#### Type Errors
- Ensure all required props are provided
- Check that TypeScript types are properly imported
- Verify configuration object structure

#### Network Issues
- Check Parlant server connectivity
- Verify CORS settings for cross-origin requests
- Test with different server URLs

### Debug Mode

Enable debug mode to see additional information:

```tsx
<SimChatContainer
  workspaceId="debug-workspace"
  agentId="debug-agent"
  debug={true}
/>
```

This will show a debug panel with:
- Current configuration
- Connection status
- Environment information
- Error details

### Performance Optimization

For better performance:

1. **Use dynamic imports** for the chat widget if it's not always needed
2. **Enable lazy loading** for the Parlant component
3. **Minimize configuration changes** during runtime
4. **Use proper memoization** for custom components

### Browser Compatibility

The chat widget supports:
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

For older browsers, consider using polyfills for:
- CSS custom properties
- ResizeObserver
- IntersectionObserver

## Contributing

When contributing to the chat widget:

1. Follow existing TypeScript patterns
2. Maintain compatibility with Sim's design system
3. Add proper documentation for new features
4. Test across different configurations
5. Ensure accessibility compliance

## License

This integration is part of the Sim project and follows the project's licensing terms. The underlying `parlant-chat-react` package is MIT licensed.