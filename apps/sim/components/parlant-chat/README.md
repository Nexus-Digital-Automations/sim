# Parlant Chat React Integration for Sim

A comprehensive, type-safe integration of the `parlant-chat-react` widget customized for Sim's design system and requirements.

## 🚀 Features

- **Full TypeScript Support** - Complete type definitions and IntelliSense
- **Sim Design System Integration** - Seamlessly matches Sim's colors, typography, and spacing
- **Theme Support** - Light, dark, and auto themes with CSS custom properties
- **Performance Optimized** - Lazy loading, code splitting, and bundle analysis
- **Accessibility First** - WCAG compliant with keyboard shortcuts and screen reader support
- **Analytics Ready** - Built-in performance monitoring and usage analytics
- **Flexible Configuration** - Extensive customization options and validation
- **React 19 Compatible** - Works with the latest React features

## 📦 Installation

The `parlant-chat-react` package is already included in Sim's dependencies. Simply import the components:

```typescript
import { ParlantChatbox, ParlantChatProvider } from '@/components/parlant-chat'
```

## 🎯 Quick Start

### Basic Floating Chat

```tsx
import { ParlantChatbox, ParlantChatProvider } from '@/components/parlant-chat'
import type { SimChatConfig } from '@/components/parlant-chat/types'

export function App() {
  const config: SimChatConfig = {
    agentName: 'Sim Assistant',
    chatDescription: 'How can I help you today?',
    float: true,
    theme: 'auto'
  }

  return (
    <ParlantChatProvider config={config}>
      <ParlantChatbox {...config} />
    </ParlantChatProvider>
  )
}
```

### Embedded Chat Interface

```tsx
export function SupportPage() {
  const config: SimChatConfig = {
    agentName: 'Support Agent',
    float: false,
    headerConfig: {
      title: 'Customer Support',
      showCloseButton: false
    }
  }

  return (
    <div className="h-96 border rounded-lg">
      <ParlantChatProvider config={config}>
        <ParlantChatbox {...config} />
      </ParlantChatProvider>
    </div>
  )
}
```

## 🎨 Theming

### Automatic Theme Detection

```tsx
const config: SimChatConfig = {
  theme: 'auto', // Follows system/Sim theme
  agentName: 'Smart Assistant'
}
```

### Custom Colors

```tsx
const config: SimChatConfig = {
  theme: 'dark',
  customColors: {
    primary: '#6f3dfa',
    primaryHover: '#6338d9',
    background: '#0c0c0c',
    foreground: '#ffffff'
  }
}
```

### CSS Custom Properties

The integration automatically uses Sim's CSS custom properties:

- `--brand-primary-hex`
- `--brand-primary-hover-hex`
- `--background`
- `--foreground`
- `--border`
- `--radius`

## 🔧 Configuration Options

### SimChatConfig Interface

```typescript
interface SimChatConfig {
  // Server Configuration
  server?: string                    // Parlant server endpoint
  agentId?: string                  // Agent identifier
  sessionId?: string                // Session identifier

  // UI Configuration
  agentName?: string                // Display name
  chatDescription?: string          // Subtitle/description
  float?: boolean                   // Floating widget vs embedded
  theme?: 'light' | 'dark' | 'auto' // Theme mode

  // Customization
  showSimBranding?: boolean         // Show Sim branding
  customColors?: CustomColors       // Override default colors
  headerConfig?: HeaderConfig       // Header customization
  animations?: AnimationConfig      // Animation preferences

  // Events
  onSessionCreated?: (id: string) => void
}
```

## 🎮 Advanced Usage

### Controlled Chat Widget

```tsx
import { useChatWidget } from '@/components/parlant-chat/hooks'

export function ControlledChat() {
  const widget = useChatWidget({
    agentName: 'Controlled Bot',
    float: false
  })

  return (
    <div>
      <button onClick={widget.toggleOpen}>
        {widget.isOpen ? 'Close' : 'Open'} Chat
      </button>

      {widget.isOpen && (
        <ParlantChatbox
          {...widget.config}
          isOpen={widget.isOpen}
          onOpenChange={widget.toggleOpen}
        />
      )}
    </div>
  )
}
```

### Analytics Integration

```tsx
import { useChatAnalytics } from '@/components/parlant-chat/hooks'

export function AnalyticsChat() {
  const [sessionId] = useState(() => crypto.randomUUID())
  const analytics = useChatAnalytics(sessionId)

  const handleMessageSent = (message: string) => {
    analytics.incrementMessageCount()
    // Send to your analytics service
  }

  return (
    <div>
      <div>Messages: {analytics.analytics.messageCount}</div>
      <ParlantChatbox
        sessionId={sessionId}
        onMessageSent={handleMessageSent}
      />
    </div>
  )
}
```

### Performance Optimization

```tsx
import { LazyParlantChatbox, preloadChatResources } from '@/components/parlant-chat/utils'

export function OptimizedChat() {
  useEffect(() => {
    // Preload resources when user is likely to interact
    const timer = setTimeout(preloadChatResources, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Suspense fallback={<ChatLoadingSkeleton />}>
      <LazyParlantChatbox agentName="Optimized Bot" />
    </Suspense>
  )
}
```

## ⌨️ Keyboard Shortcuts

Built-in keyboard shortcuts for better accessibility:

- `Ctrl/Cmd + K` - Toggle chat
- `Ctrl/Cmd + /` - Focus chat input
- `Escape` - Close chat

```tsx
import { useChatKeyboardShortcuts } from '@/components/parlant-chat/hooks'

useChatKeyboardShortcuts({
  onToggle: () => setIsOpen(!isOpen),
  onFocus: () => focusChatInput(),
  onEscape: () => setIsOpen(false)
})
```

## 🔍 Debugging & Monitoring

### Enable Debug Mode

```typescript
import { ChatDebugger } from '@/components/parlant-chat/utils'

// Enable debug logging
ChatDebugger.enable()

// Log custom events
ChatDebugger.log('Custom event', { data: 'value' })

// Get runtime information
const info = ChatDebugger.getRuntimeInfo()
```

### Performance Monitoring

```typescript
import { ChatPerformanceMonitor } from '@/components/parlant-chat/utils'

const monitor = ChatPerformanceMonitor.getInstance()

// Track operations
monitor.startTimer('chat_load')
// ... operation
monitor.endTimer('chat_load')

// Get metrics
const metrics = monitor.getMetrics()
```

### Bundle Analysis

```typescript
import { BundleAnalyzer } from '@/components/parlant-chat/utils'

// Development only
if (process.env.NODE_ENV === 'development') {
  BundleAnalyzer.generateOptimizationReport()
}
```

## 🧪 Validation & Error Handling

### Configuration Validation

```tsx
import { ConfigValidator } from '@/components/parlant-chat/utils'

const config: SimChatConfig = {
  server: 'https://api.parlant.io',
  agentId: 'my-agent'
}

const validation = ConfigValidator.validate(config)

if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors)

  // Auto-fix configuration
  const fixedConfig = ConfigValidator.sanitize(config)
}
```

## 📱 Responsive Design

The chat automatically adapts to different screen sizes:

- **Desktop**: Floating widget in corner
- **Tablet**: Responsive floating or embedded
- **Mobile**: Full-screen overlay for better UX

```css
/* Custom responsive breakpoints */
@media (max-width: 768px) {
  .sim-parlant-chatbox .parlant-chatbox {
    width: 100vw !important;
    height: 100vh !important;
  }
}
```

## ♿ Accessibility Features

- **WCAG 2.1 AA Compliant**
- **Screen Reader Support** - ARIA labels and announcements
- **Keyboard Navigation** - Full keyboard accessibility
- **High Contrast Support** - Adapts to system preferences
- **Focus Management** - Proper focus trapping and restoration

## 🎯 Environment Configuration

Set environment variables for different deployments:

```bash
# .env.local
NEXT_PUBLIC_PARLANT_SERVER=https://parlant.emcie.co
NEXT_PUBLIC_PARLANT_AGENT_ID=sim-production-agent

# Development
NEXT_PUBLIC_PARLANT_SERVER_DEV=http://localhost:3001
NEXT_PUBLIC_PARLANT_AGENT_ID_DEV=sim-dev-agent

# Staging
NEXT_PUBLIC_PARLANT_SERVER_STAGING=https://staging.parlant.emcie.co
NEXT_PUBLIC_PARLANT_AGENT_ID_STAGING=sim-staging-agent
```

## 📊 Bundle Size

Current estimated sizes:

- **Core Components**: ~25KB gzipped
- **Custom Styling**: ~7KB gzipped
- **Hooks & Utilities**: ~5KB gzipped
- **Type Definitions**: 0KB (development only)

**Total**: ~37KB gzipped + parlant-chat-react (~45KB)

## 🔧 CSS Integration

Add the styles to your global CSS or import directly:

```css
/* In your global CSS */
@import '@/components/parlant-chat/styles.css';
```

Or import in your component:

```tsx
import '@/components/parlant-chat/styles.css'
```

## 🚀 Performance Best Practices

1. **Lazy Load** - Use `LazyParlantChatbox` for non-critical chats
2. **Preload Resources** - Call `preloadChatResources()` when appropriate
3. **Code Splitting** - Separate chat configurations into chunks
4. **CSS Optimization** - Use CSS custom properties for theming
5. **Bundle Analysis** - Monitor bundle size in development

## 🤝 Contributing

When adding new features:

1. Update TypeScript definitions in `types.ts`
2. Add comprehensive examples in `examples/`
3. Update documentation in this README
4. Ensure accessibility compliance
5. Add performance monitoring where appropriate

## 🐛 Troubleshooting

### Common Issues

**Chat doesn't render:**
```typescript
// Check configuration validation
const validation = ConfigValidator.validate(config)
console.log('Validation errors:', validation.errors)
```

**Styling issues:**
```typescript
// Enable debug mode
ChatDebugger.enable()
// Check browser console for theming issues
```

**Performance issues:**
```typescript
// Monitor performance
const monitor = ChatPerformanceMonitor.getInstance()
console.log('Metrics:', monitor.getMetrics())
```

### Debug Information

```typescript
// Get comprehensive debug info
const debugInfo = ChatDebugger.getRuntimeInfo()
console.log('Debug Info:', debugInfo)
```

## 📚 Examples

See the `examples/` directory for complete implementation examples:

- `BasicUsage.tsx` - Simple integration patterns
- `AdvancedIntegration.tsx` - Complex scenarios and features

## 🔗 Related Documentation

- [Parlant Chat React](https://github.com/emcie-co/parlant-chat-react) - Original package
- [Sim Design System](../ui/) - Sim's component library
- [Next.js Integration](https://nextjs.org/) - Framework-specific guidance