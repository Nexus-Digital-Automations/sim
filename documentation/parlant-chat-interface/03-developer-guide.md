# Parlant React Chat Interface - Developer Guide

## Table of Contents

- [Getting Started](#getting-started)
- [Custom Component Development](#custom-component-development)
- [Extending Chat Features](#extending-chat-features)
- [Tool Integration Development](#tool-integration-development)
- [Custom Agent Types](#custom-agent-types)
- [UI Customization](#ui-customization)
- [Plugin Architecture](#plugin-architecture)
- [Testing Strategies](#testing-strategies)
- [Performance Optimization](#performance-optimization)
- [Debugging & Development Tools](#debugging--development-tools)

## Getting Started

### Prerequisites

```bash
# Required tools
node --version    # >= 18.0.0
npm --version     # >= 8.0.0
python --version  # >= 3.9.0 (for Parlant server)

# Development dependencies
npm install -g typescript
npm install -g @types/node
```

### Development Environment Setup

```bash
# Clone and setup the project
git clone <repository-url>
cd sim
npm install

# Setup environment variables
cp .env.example .env.local

# Required environment variables for development
PARLANT_SERVER_URL=http://localhost:8001
DATABASE_URL=postgresql://user:pass@localhost:5432/sim_dev
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

### Local Development Server

```bash
# Start all services
npm run dev:all

# Or start services individually
npm run dev:next      # Next.js frontend (port 3000)
npm run dev:parlant   # Parlant server (port 8001)
npm run dev:db        # PostgreSQL database
```

## Custom Component Development

### Creating Custom Chat Components

```typescript
// components/custom/CustomChatMessage.tsx
import React from 'react'
import { ChatMessage } from '@/types/chat'

interface CustomChatMessageProps {
  message: ChatMessage
  onReply?: (content: string) => void
  className?: string
}

export const CustomChatMessage: React.FC<CustomChatMessageProps> = ({
  message,
  onReply,
  className
}) => {
  return (
    <div className={`custom-chat-message ${className || ''}`}>
      <div className="message-header">
        <span className="sender">{message.sender}</span>
        <span className="timestamp">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="message-content">
        {typeof message.content === 'string' ? (
          <p>{message.content}</p>
        ) : (
          <StructuredContentRenderer content={message.content} />
        )}
      </div>

      {message.suggestions && (
        <div className="message-suggestions">
          {message.suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onReply?.(suggestion)}
              className="suggestion-button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Register the custom component
import { registerChatComponent } from '@/lib/chat-registry'

registerChatComponent('CustomChatMessage', CustomChatMessage)
```

### Creating Custom Input Components

```typescript
// components/custom/CustomChatInput.tsx
import React, { useState, useRef } from 'react'
import { useChatInput } from '@/hooks/useChatInput'

interface CustomChatInputProps {
  onSend: (content: string, metadata?: any) => void
  onTyping?: (isTyping: boolean) => void
  placeholder?: string
  disabled?: boolean
}

export const CustomChatInput: React.FC<CustomChatInputProps> = ({
  onSend,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false
}) => {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    handleKeyDown,
    handleCompositionStart,
    handleCompositionEnd,
    isComposing
  } = useChatInput({
    onSend: (content) => {
      onSend(content, { timestamp: Date.now() })
      setInput('')
    },
    onTyping
  })

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
    }
  }

  return (
    <div className="custom-chat-input">
      <div className="input-container">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, input)}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={disabled}
          className="input-textarea"
          rows={1}
        />

        <div className="input-actions">
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="send-button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Component Composition Patterns

```typescript
// Advanced component composition
interface ChatContainerProps {
  layout?: 'default' | 'sidebar' | 'fullscreen'
  theme?: 'light' | 'dark' | 'custom'
  components?: {
    header?: React.ComponentType<any>
    message?: React.ComponentType<any>
    input?: React.ComponentType<any>
    sidebar?: React.ComponentType<any>
  }
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  layout = 'default',
  theme = 'light',
  components = {}
}) => {
  const {
    header: CustomHeader,
    message: CustomMessage,
    input: CustomInput,
    sidebar: CustomSidebar
  } = components

  return (
    <div className={`chat-container ${layout} ${theme}`}>
      {CustomHeader ? <CustomHeader /> : <DefaultChatHeader />}

      <div className="chat-content">
        {layout === 'sidebar' && CustomSidebar && (
          <div className="chat-sidebar">
            <CustomSidebar />
          </div>
        )}

        <div className="chat-main">
          <MessageContainer
            MessageComponent={CustomMessage || DefaultMessage}
          />

          {CustomInput ? <CustomInput /> : <DefaultChatInput />}
        </div>
      </div>
    </div>
  )
}
```

## Extending Chat Features

### Creating Custom Message Types

```typescript
// types/custom-messages.ts
export interface CustomImageMessage extends ChatMessage {
  type: 'image'
  content: {
    imageUrl: string
    caption?: string
    metadata?: {
      width: number
      height: number
      alt?: string
    }
  }
}

export interface CustomFormMessage extends ChatMessage {
  type: 'form'
  content: {
    title: string
    fields: FormField[]
    submitAction: string
  }
}

// Register custom message handlers
import { registerMessageHandler } from '@/lib/message-registry'

registerMessageHandler('image', (message: CustomImageMessage) => {
  return (
    <div className="image-message">
      <img
        src={message.content.imageUrl}
        alt={message.content.metadata?.alt || 'Image'}
        style={{
          maxWidth: '100%',
          height: 'auto'
        }}
      />
      {message.content.caption && (
        <p className="image-caption">{message.content.caption}</p>
      )}
    </div>
  )
})

registerMessageHandler('form', (message: CustomFormMessage) => {
  return <InteractiveForm {...message.content} />
})
```

### Adding Custom Streaming Events

```typescript
// lib/streaming/custom-events.ts
export interface CustomStreamEvent {
  type: 'custom_event'
  data: any
}

export class CustomStreamHandler {
  private eventHandlers: Map<string, Function> = new Map()

  registerHandler(eventType: string, handler: Function) {
    this.eventHandlers.set(eventType, handler)
  }

  async handleStreamEvent(event: CustomStreamEvent, context: StreamContext) {
    const handler = this.eventHandlers.get(event.type)
    if (handler) {
      await handler(event.data, context)
    }
  }
}

// Usage in chat component
const streamHandler = new CustomStreamHandler()

streamHandler.registerHandler('typing_indicator', (data, context) => {
  context.setTyping(data.isTyping)
})

streamHandler.registerHandler('tool_progress', (data, context) => {
  context.updateMessage(data.messageId, {
    metadata: { toolProgress: data.progress }
  })
})
```

### Custom Authentication Providers

```typescript
// auth/custom-auth-provider.ts
interface CustomAuthProvider {
  name: string
  validate: (credentials: any) => Promise<AuthResult>
  refresh?: (token: string) => Promise<string>
}

export class CustomOAuthProvider implements CustomAuthProvider {
  name = 'custom-oauth'

  async validate(credentials: { code: string; state: string }): Promise<AuthResult> {
    try {
      // Exchange code for token
      const tokenResponse = await fetch('/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })

      const { access_token, user } = await tokenResponse.json()

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token: access_token
      }
    } catch (error) {
      return {
        success: false,
        error: 'OAuth validation failed'
      }
    }
  }

  async refresh(token: string): Promise<string> {
    const response = await fetch('/api/oauth/refresh', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const { access_token } = await response.json()
    return access_token
  }
}

// Register the provider
import { registerAuthProvider } from '@/lib/auth-registry'
registerAuthProvider(new CustomOAuthProvider())
```

## Tool Integration Development

### Creating Custom Tool Adapters

```typescript
// tools/custom-tool-adapter.ts
import { ToolAdapter, ToolExecutionResult } from '@/types/tools'

export class CustomAPIToolAdapter implements ToolAdapter {
  id = 'custom-api'
  name = 'Custom API Integration'
  description = 'Integrates with custom internal APIs'

  async execute(
    parameters: Record<string, any>,
    context: ExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      // Validate parameters
      this.validateParameters(parameters)

      // Execute the API call
      const response = await this.makeAPICall(parameters, context)

      // Format response for chat
      return {
        success: true,
        data: response,
        message: this.formatSuccessMessage(response),
        metadata: {
          executionTime: Date.now() - context.startTime,
          apiEndpoint: parameters.endpoint
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `API call failed: ${error.message}`
      }
    }
  }

  private validateParameters(parameters: Record<string, any>) {
    const required = ['endpoint', 'method']
    const missing = required.filter(key => !parameters[key])

    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`)
    }
  }

  private async makeAPICall(
    parameters: Record<string, any>,
    context: ExecutionContext
  ) {
    const { endpoint, method, headers, body } = parameters

    const response = await fetch(endpoint, {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sim-Chat/1.0',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  private formatSuccessMessage(response: any): string {
    return `API call successful. Retrieved ${JSON.stringify(response).length} bytes of data.`
  }

  // Natural language description for agent
  getConversationalDescription(): string {
    return `I can make API calls to your custom endpoints. Just tell me:
    - The endpoint URL
    - The HTTP method (GET, POST, PUT, DELETE)
    - Any headers or body data needed

    I'll handle the request and format the response for you.`
  }

  // Parameter collection for conversational interface
  async collectParameters(
    intent: string,
    context: ConversationContext
  ): Promise<Record<string, any>> {
    const collector = new ParameterCollector()

    const endpoint = await collector.ask(
      'What API endpoint should I call?',
      { type: 'url', required: true }
    )

    const method = await collector.ask(
      'What HTTP method should I use?',
      {
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default: 'GET'
      }
    )

    let body = null
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      body = await collector.ask(
        'What data should I send in the request body?',
        { type: 'json', required: false }
      )
    }

    return { endpoint, method, body }
  }
}

// Register the tool
import { registerTool } from '@/lib/tool-registry'
registerTool(new CustomAPIToolAdapter())
```

### Tool Chain Development

```typescript
// tools/tool-chain.ts
export class ToolChain {
  private steps: ToolChainStep[] = []

  addStep(tool: string, parameters: any, condition?: (result: any) => boolean) {
    this.steps.push({ tool, parameters, condition })
    return this
  }

  async execute(context: ExecutionContext): Promise<ToolChainResult> {
    const results: ToolExecutionResult[] = []
    let chainContext = { ...context }

    for (const step of this.steps) {
      // Check condition if present
      if (step.condition && !step.condition(results[results.length - 1])) {
        continue
      }

      // Execute tool
      const tool = await this.getTool(step.tool)
      const result = await tool.execute(step.parameters, chainContext)

      results.push(result)

      // Update context with result
      chainContext = {
        ...chainContext,
        previousResults: results,
        variables: {
          ...chainContext.variables,
          [`step_${results.length}`]: result.data
        }
      }

      // Stop on failure if not configured to continue
      if (!result.success && !step.continueOnFailure) {
        break
      }
    }

    return {
      results,
      success: results.every(r => r.success),
      finalResult: results[results.length - 1]
    }
  }
}

// Usage example
const dataProcessingChain = new ToolChain()
  .addStep('fetch-data', { url: 'https://api.example.com/data' })
  .addStep('transform-data', {
    format: 'json',
    mapping: { id: 'user_id', name: 'display_name' }
  })
  .addStep('store-data', {
    destination: 'database',
    table: 'users'
  }, (result) => result.success && result.data.length > 0)

const result = await dataProcessingChain.execute(executionContext)
```

## Custom Agent Types

### Specialized Agent Classes

```typescript
// agents/specialized-agents.ts
export abstract class SpecializedAgent {
  abstract type: string
  abstract capabilities: string[]

  constructor(
    protected config: AgentConfig,
    protected context: AgentContext
  ) {}

  abstract async processMessage(
    message: string,
    session: Session
  ): Promise<AgentResponse>

  protected async callTool(
    toolName: string,
    parameters: any
  ): Promise<ToolExecutionResult> {
    return await this.context.toolRegistry.execute(toolName, parameters)
  }
}

export class DataAnalystAgent extends SpecializedAgent {
  type = 'data-analyst'
  capabilities = ['data-analysis', 'visualization', 'reporting']

  async processMessage(
    message: string,
    session: Session
  ): Promise<AgentResponse> {
    // Parse intent
    const intent = await this.parseAnalyticsIntent(message)

    switch (intent.type) {
      case 'create-chart':
        return await this.createVisualization(intent.parameters)

      case 'analyze-data':
        return await this.performAnalysis(intent.parameters)

      case 'generate-report':
        return await this.generateReport(intent.parameters)

      default:
        return await this.handleGeneralQuery(message, session)
    }
  }

  private async createVisualization(parameters: any): Promise<AgentResponse> {
    // Fetch data
    const data = await this.callTool('database-query', {
      query: parameters.query,
      format: 'json'
    })

    // Generate chart
    const chart = await this.callTool('chart-generator', {
      data: data.data,
      type: parameters.chartType,
      options: parameters.chartOptions
    })

    return {
      content: {
        type: 'structured',
        components: [
          {
            type: 'text',
            content: `I've created a ${parameters.chartType} chart based on your data:`
          },
          {
            type: 'chart',
            data: chart.data
          }
        ]
      },
      metadata: {
        toolsUsed: ['database-query', 'chart-generator'],
        dataPoints: data.data.length
      }
    }
  }
}

export class CustomerSupportAgent extends SpecializedAgent {
  type = 'customer-support'
  capabilities = ['ticket-management', 'knowledge-base', 'escalation']

  private knowledgeBase: KnowledgeBase
  private ticketSystem: TicketSystem

  constructor(config: AgentConfig, context: AgentContext) {
    super(config, context)
    this.knowledgeBase = new KnowledgeBase(config.knowledgeBaseId)
    this.ticketSystem = new TicketSystem(config.ticketSystemConfig)
  }

  async processMessage(
    message: string,
    session: Session
  ): Promise<AgentResponse> {
    // Check if this is a known issue
    const knowledgeResult = await this.knowledgeBase.search(message)

    if (knowledgeResult.confidence > 0.8) {
      return this.provideKnowledgeBasedAnswer(knowledgeResult)
    }

    // Check for escalation keywords
    if (this.shouldEscalate(message)) {
      return await this.escalateToHuman(message, session)
    }

    // Create support ticket if needed
    if (this.shouldCreateTicket(message)) {
      return await this.createSupportTicket(message, session)
    }

    return await this.handleGeneralQuery(message, session)
  }

  private shouldEscalate(message: string): boolean {
    const escalationKeywords = [
      'speak to manager', 'cancel subscription', 'refund',
      'legal action', 'complaint', 'escalate'
    ]

    return escalationKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    )
  }

  private async escalateToHuman(
    message: string,
    session: Session
  ): Promise<AgentResponse> {
    await this.callTool('human-handoff', {
      session: session.id,
      priority: 'high',
      reason: 'escalation_requested',
      context: message
    })

    return {
      content: "I'm connecting you with a human agent who can better assist you. Please hold on.",
      metadata: { escalated: true }
    }
  }
}
```

### Agent Behavior Customization

```typescript
// agents/behavior-customization.ts
interface AgentPersonality {
  tone: 'professional' | 'friendly' | 'casual' | 'formal'
  verbosity: 'concise' | 'detailed' | 'comprehensive'
  expertise: 'beginner' | 'intermediate' | 'expert'
  empathy: number // 0-1 scale
  humor: number // 0-1 scale
}

export class PersonalityEngine {
  constructor(private personality: AgentPersonality) {}

  adaptResponse(baseResponse: string, context: ConversationContext): string {
    let adaptedResponse = baseResponse

    // Adjust tone
    adaptedResponse = this.adjustTone(adaptedResponse, this.personality.tone)

    // Adjust verbosity
    adaptedResponse = this.adjustVerbosity(adaptedResponse, this.personality.verbosity)

    // Add empathetic elements if appropriate
    if (context.userEmotion === 'frustrated' && this.personality.empathy > 0.5) {
      adaptedResponse = this.addEmpathy(adaptedResponse)
    }

    // Add humor if appropriate and personality allows
    if (context.conversationTone === 'casual' && this.personality.humor > 0.5) {
      adaptedResponse = this.addHumor(adaptedResponse)
    }

    return adaptedResponse
  }

  private adjustTone(response: string, tone: AgentPersonality['tone']): string {
    const toneAdjustments = {
      professional: (text: string) =>
        text.replace(/\b(awesome|cool|great)\b/gi, 'excellent'),
      friendly: (text: string) =>
        text.replace(/\b(certainly|indeed)\b/gi, 'absolutely'),
      casual: (text: string) =>
        text.replace(/\b(certainly|indeed)\b/gi, 'sure thing'),
      formal: (text: string) =>
        text.replace(/\b(ok|okay)\b/gi, 'very well')
    }

    return toneAdjustments[tone]?.(response) || response
  }

  private addEmpathy(response: string): string {
    const empathyPhrases = [
      "I understand this can be frustrating.",
      "I can see why that would be concerning.",
      "That does sound challenging."
    ]

    const randomPhrase = empathyPhrases[
      Math.floor(Math.random() * empathyPhrases.length)
    ]

    return `${randomPhrase} ${response}`
  }
}
```

## UI Customization

### Theme System

```typescript
// themes/custom-theme.ts
export interface ChatTheme {
  name: string
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    error: string
    success: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      sm: string
      base: string
      lg: string
      xl: string
    }
    fontWeight: {
      normal: number
      semibold: number
      bold: number
    }
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
    full: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
  }
}

export const customTheme: ChatTheme = {
  name: 'custom-brand',
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#212529',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    error: '#dc3545',
    success: '#28a745'
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    },
    fontWeight: {
      normal: 400,
      semibold: 600,
      bold: 700
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  }
}

// Theme provider component
export const ChatThemeProvider: React.FC<{
  theme: ChatTheme
  children: React.ReactNode
}> = ({ theme, children }) => {
  const cssVariables = useMemo(() => {
    const vars: Record<string, string> = {}

    // Convert theme to CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      vars[`--chat-color-${key}`] = value
    })

    Object.entries(theme.spacing).forEach(([key, value]) => {
      vars[`--chat-spacing-${key}`] = value
    })

    // ... convert other theme properties

    return vars
  }, [theme])

  return (
    <div style={cssVariables} className="chat-theme-provider">
      {children}
    </div>
  )
}
```

### Custom Styling System

```scss
// styles/chat-customization.scss
.chat-container {
  // Custom property system
  --message-bg-user: var(--chat-color-primary);
  --message-bg-assistant: var(--chat-color-surface);
  --message-text-user: white;
  --message-text-assistant: var(--chat-color-text);

  // Responsive breakpoints
  @media (max-width: 768px) {
    --chat-spacing-md: 0.75rem;
    --chat-border-radius-lg: 0.25rem;
  }

  // Dark mode support
  &[data-theme="dark"] {
    --chat-color-background: #1a1a1a;
    --chat-color-surface: #2d2d2d;
    --chat-color-text: #ffffff;
    --chat-color-border: #404040;
  }

  // High contrast mode
  &[data-theme="high-contrast"] {
    --chat-color-background: #000000;
    --chat-color-text: #ffffff;
    --chat-color-primary: #ffff00;
    --chat-border-width: 2px;
  }

  // Branded themes
  &[data-theme="brand-blue"] {
    --chat-color-primary: #0066cc;
    --chat-color-secondary: #004499;
    --message-bg-user: linear-gradient(135deg, #0066cc, #0052a3);
  }
}

// Message bubble variations
.message-bubble {
  &.bubble-style-rounded {
    border-radius: var(--chat-border-radius-lg);
  }

  &.bubble-style-minimal {
    border: none;
    box-shadow: none;
    background: transparent;
    border-left: 3px solid var(--chat-color-primary);
    padding-left: var(--chat-spacing-md);
  }

  &.bubble-style-glassmorphism {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
}

// Animation system
.chat-animations {
  &.message-enter {
    opacity: 0;
    transform: translateY(10px);
    animation: messageSlideIn 0.3s ease-out forwards;
  }

  &.typing-indicator {
    animation: typingPulse 1.5s ease-in-out infinite;
  }
}

@keyframes messageSlideIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes typingPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
```

## Plugin Architecture

### Plugin System Framework

```typescript
// plugins/plugin-system.ts
export interface ChatPlugin {
  id: string
  name: string
  version: string
  description: string
  author: string

  // Lifecycle hooks
  onInstall?(): Promise<void>
  onUninstall?(): Promise<void>
  onActivate?(): Promise<void>
  onDeactivate?(): Promise<void>

  // Feature hooks
  onMessageSent?(message: ChatMessage, context: ChatContext): Promise<ChatMessage>
  onMessageReceived?(message: ChatMessage, context: ChatContext): Promise<ChatMessage>
  onToolExecuted?(result: ToolExecutionResult, context: ChatContext): Promise<ToolExecutionResult>

  // UI hooks
  renderMessageExtension?(message: ChatMessage): React.ReactNode
  renderInputExtension?(): React.ReactNode
  renderSidebarExtension?(): React.ReactNode
}

export class PluginManager {
  private plugins: Map<string, ChatPlugin> = new Map()
  private activePlugins: Set<string> = new Set()

  async installPlugin(plugin: ChatPlugin): Promise<void> {
    // Validate plugin
    this.validatePlugin(plugin)

    // Run installation hook
    if (plugin.onInstall) {
      await plugin.onInstall()
    }

    // Register plugin
    this.plugins.set(plugin.id, plugin)

    console.log(`Plugin ${plugin.name} installed successfully`)
  }

  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (plugin.onActivate) {
      await plugin.onActivate()
    }

    this.activePlugins.add(pluginId)
  }

  async executeHook<T extends keyof ChatPlugin>(
    hookName: T,
    ...args: any[]
  ): Promise<any[]> {
    const results: any[] = []

    for (const pluginId of this.activePlugins) {
      const plugin = this.plugins.get(pluginId)
      const hook = plugin?.[hookName] as Function

      if (hook) {
        try {
          const result = await hook.apply(plugin, args)
          results.push(result)
        } catch (error) {
          console.error(`Plugin ${pluginId} hook ${hookName} failed:`, error)
        }
      }
    }

    return results
  }

  private validatePlugin(plugin: ChatPlugin): void {
    const required = ['id', 'name', 'version']
    const missing = required.filter(field => !plugin[field as keyof ChatPlugin])

    if (missing.length > 0) {
      throw new Error(`Plugin missing required fields: ${missing.join(', ')}`)
    }
  }
}
```

### Example Plugin Implementation

```typescript
// plugins/examples/message-translator-plugin.ts
export class MessageTranslatorPlugin implements ChatPlugin {
  id = 'message-translator'
  name = 'Message Translator'
  version = '1.0.0'
  description = 'Automatically translates messages to user preferred language'
  author = 'Sim Team'

  private translator: TranslationService

  async onActivate(): Promise<void> {
    this.translator = new TranslationService()
  }

  async onMessageReceived(
    message: ChatMessage,
    context: ChatContext
  ): Promise<ChatMessage> {
    const userLanguage = context.user?.preferences?.language

    if (userLanguage && userLanguage !== 'en') {
      const translatedContent = await this.translator.translate(
        message.content as string,
        userLanguage
      )

      return {
        ...message,
        content: translatedContent,
        metadata: {
          ...message.metadata,
          originalContent: message.content,
          translatedFrom: 'en',
          translatedTo: userLanguage
        }
      }
    }

    return message
  }

  renderMessageExtension(message: ChatMessage): React.ReactNode {
    if (message.metadata?.translatedFrom) {
      return (
        <div className="translation-indicator">
          <small>
            Translated from {message.metadata.translatedFrom}
            <button onClick={() => this.showOriginal(message)}>
              Show original
            </button>
          </small>
        </div>
      )
    }
    return null
  }

  private showOriginal(message: ChatMessage): void {
    // Toggle between translated and original content
    const isShowingOriginal = message.metadata?.showingOriginal
    const content = isShowingOriginal
      ? message.content
      : message.metadata?.originalContent

    // Update message in UI
    this.updateMessageContent(message.id, content)
  }

  private updateMessageContent(messageId: string, content: string): void {
    // Implementation to update message in chat
  }
}

// Register the plugin
const pluginManager = new PluginManager()
pluginManager.installPlugin(new MessageTranslatorPlugin())
```

## Testing Strategies

### Unit Testing Chat Components

```typescript
// __tests__/components/ChatMessage.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatMessage } from '@/components/ChatMessage'
import { createMockMessage } from '@/test-utils/mock-data'

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    const message = createMockMessage({
      type: 'user',
      content: 'Hello, world!'
    })

    render(<ChatMessage message={message} />)

    expect(screen.getByText('Hello, world!')).toBeInTheDocument()
    expect(screen.getByTestId('message-bubble')).toHaveClass('user-message')
  })

  it('handles structured content', () => {
    const message = createMockMessage({
      type: 'assistant',
      content: {
        text: 'Here is your data:',
        components: [
          {
            type: 'table',
            data: {
              headers: ['Name', 'Age'],
              rows: [['John', 25], ['Jane', 30]]
            }
          }
        ]
      }
    })

    render(<ChatMessage message={message} />)

    expect(screen.getByText('Here is your data:')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('John')).toBeInTheDocument()
  })

  it('calls onReply when suggestion is clicked', () => {
    const onReply = jest.fn()
    const message = createMockMessage({
      content: 'How can I help?',
      suggestions: ['Option 1', 'Option 2']
    })

    render(<ChatMessage message={message} onReply={onReply} />)

    fireEvent.click(screen.getByText('Option 1'))

    expect(onReply).toHaveBeenCalledWith('Option 1')
  })
})
```

### Integration Testing

```typescript
// __tests__/integration/chat-flow.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatInterface } from '@/components/ChatInterface'
import { mockChatAPI } from '@/test-utils/mock-api'

describe('Chat Integration', () => {
  beforeEach(() => {
    mockChatAPI.reset()
  })

  it('completes a full chat conversation', async () => {
    // Mock API responses
    mockChatAPI.get('/api/chat/test-subdomain')
      .reply(200, {
        id: 'chat-1',
        title: 'Test Chat',
        authType: 'public'
      })

    mockChatAPI.post('/api/chat/test-subdomain')
      .reply(200, mockStreamResponse([
        { type: 'message_start', data: { messageId: 'msg-1' } },
        { type: 'content_delta', data: { content: 'Hello! ' } },
        { type: 'content_delta', data: { content: 'How can I help?' } },
        { type: 'message_end', data: { messageId: 'msg-1' } }
      ]))

    render(<ChatInterface subdomain="test-subdomain" />)

    // Wait for chat to load
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    // Send message
    const input = screen.getByRole('textbox')
    const sendButton = screen.getByRole('button', { name: /send/i })

    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.click(sendButton)

    // Verify user message appears
    expect(screen.getByText('Hello')).toBeInTheDocument()

    // Wait for assistant response
    await waitFor(() => {
      expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('handles authentication flow', async () => {
    mockChatAPI.get('/api/chat/protected-subdomain')
      .reply(401, { error: 'auth_required_password' })

    render(<ChatInterface subdomain="protected-subdomain" />)

    // Should show password form
    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    // Enter password and submit
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /submit/i })

    fireEvent.change(passwordInput, { target: { value: 'test123' } })

    mockChatAPI.post('/api/chat/protected-subdomain')
      .reply(200, { authenticated: true })

    mockChatAPI.get('/api/chat/protected-subdomain')
      .reply(200, {
        id: 'chat-2',
        title: 'Protected Chat',
        authType: 'password'
      })

    fireEvent.click(submitButton)

    // Should show chat interface after authentication
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })
  })
})
```

### E2E Testing with Playwright

```typescript
// e2e/chat-interface.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Chat Interface', () => {
  test('user can have a conversation', async ({ page }) => {
    await page.goto('/chat/demo')

    // Wait for chat to load
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible()

    // Type and send message
    const input = page.locator('[data-testid="chat-input"]')
    await input.fill('Hello, I need help with my account')
    await page.click('[data-testid="send-button"]')

    // Check message appears
    await expect(page.locator('text=Hello, I need help with my account')).toBeVisible()

    // Wait for response
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 })

    // Verify response content
    const response = await page.locator('.assistant-message').last().textContent()
    expect(response).toContain('help')
  })

  test('voice input works correctly', async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone'])

    await page.goto('/chat/demo')

    // Click voice button
    await page.click('[data-testid="voice-button"]')

    // Check voice interface appears
    await expect(page.locator('[data-testid="voice-interface"]')).toBeVisible()

    // Simulate voice input (in real test, would need audio injection)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('voice-transcript', {
        detail: { transcript: 'What is the weather today?' }
      }))
    })

    // Check message was added
    await expect(page.locator('text=What is the weather today?')).toBeVisible()
  })

  test('accessibility features work', async ({ page }) => {
    await page.goto('/chat/demo')

    // Test keyboard navigation
    await page.keyboard.press('Tab') // Should focus input
    await expect(page.locator('[data-testid="chat-input"]')).toBeFocused()

    await page.keyboard.press('Tab') // Should focus send button
    await expect(page.locator('[data-testid="send-button"]')).toBeFocused()

    // Test screen reader announcements
    await page.locator('[data-testid="chat-input"]').fill('Test message')
    await page.keyboard.press('Enter')

    // Check ARIA live region updates
    await expect(page.locator('[aria-live="polite"]')).toContainText('Message sent')
  })
})
```

## Performance Optimization

### Message Virtualization

```typescript
// components/performance/VirtualizedMessageList.tsx
import React, { useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'
import { ChatMessage } from '@/types/chat'

interface VirtualizedMessageListProps {
  messages: ChatMessage[]
  height: number
  itemHeight: number
}

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  height,
  itemHeight
}) => {
  const messageItems = useMemo(() =>
    messages.map((message, index) => ({
      message,
      index,
      key: message.id
    })), [messages]
  )

  const MessageItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = messageItems[index]

    return (
      <div style={style}>
        <ChatMessage
          message={item.message}
          isLast={index === messages.length - 1}
        />
      </div>
    )
  }

  return (
    <List
      height={height}
      itemCount={messages.length}
      itemSize={itemHeight}
      itemData={messageItems}
    >
      {MessageItem}
    </List>
  )
}
```

### Optimized Streaming

```typescript
// hooks/performance/useOptimizedStreaming.ts
import { useCallback, useRef, useState } from 'react'

export const useOptimizedStreaming = () => {
  const [isStreaming, setIsStreaming] = useState(false)
  const bufferRef = useRef<string>('')
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleStreamChunk = useCallback((
    chunk: string,
    onUpdate: (content: string) => void
  ) => {
    bufferRef.current += chunk

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Debounce UI updates to avoid excessive re-renders
    timeoutRef.current = setTimeout(() => {
      onUpdate(bufferRef.current)
    }, 16) // ~60fps
  }, [])

  const startStreaming = useCallback(() => {
    setIsStreaming(true)
    bufferRef.current = ''
  }, [])

  const endStreaming = useCallback(() => {
    setIsStreaming(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return {
    isStreaming,
    handleStreamChunk,
    startStreaming,
    endStreaming
  }
}
```

### Memory Management

```typescript
// utils/performance/memory-management.ts
export class ChatMemoryManager {
  private messageCache = new Map<string, ChatMessage>()
  private maxCacheSize = 1000
  private compressionThreshold = 500

  addMessage(message: ChatMessage): void {
    // Remove oldest messages if cache is full
    if (this.messageCache.size >= this.maxCacheSize) {
      this.evictOldMessages()
    }

    // Compress large messages
    if (this.shouldCompress(message)) {
      message = this.compressMessage(message)
    }

    this.messageCache.set(message.id, message)
  }

  getMessage(id: string): ChatMessage | undefined {
    const message = this.messageCache.get(id)

    if (message?.compressed) {
      return this.decompressMessage(message)
    }

    return message
  }

  private evictOldMessages(): void {
    // Remove oldest 20% of messages
    const toRemove = Math.floor(this.maxCacheSize * 0.2)
    const entries = Array.from(this.messageCache.entries())

    entries
      .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())
      .slice(0, toRemove)
      .forEach(([id]) => this.messageCache.delete(id))
  }

  private shouldCompress(message: ChatMessage): boolean {
    const content = JSON.stringify(message.content)
    return content.length > this.compressionThreshold
  }

  private compressMessage(message: ChatMessage): ChatMessage {
    // Implement compression logic
    return {
      ...message,
      content: this.compress(message.content),
      compressed: true
    }
  }

  private compress(data: any): any {
    // Simple compression implementation
    return btoa(JSON.stringify(data))
  }

  private decompressMessage(message: ChatMessage): ChatMessage {
    return {
      ...message,
      content: this.decompress(message.content),
      compressed: false
    }
  }

  private decompress(data: any): any {
    return JSON.parse(atob(data as string))
  }
}
```

## Debugging & Development Tools

### Debug Panel Component

```typescript
// components/dev/DebugPanel.tsx
import React, { useState } from 'react'
import { ChatContext } from '@/contexts/ChatContext'

export const DebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const chatContext = useContext(ChatContext)

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="debug-toggle"
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 9999
        }}
      >
        Debug
      </button>

      {isVisible && (
        <div className="debug-panel">
          <div className="debug-section">
            <h3>Chat State</h3>
            <pre>{JSON.stringify(chatContext.state, null, 2)}</pre>
          </div>

          <div className="debug-section">
            <h3>Performance Metrics</h3>
            <PerformanceMetrics />
          </div>

          <div className="debug-section">
            <h3>Network Requests</h3>
            <NetworkMonitor />
          </div>

          <div className="debug-section">
            <h3>Actions</h3>
            <button onClick={chatContext.clearMessages}>
              Clear Messages
            </button>
            <button onClick={() => chatContext.simulateError('Test error')}>
              Simulate Error
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

### Development Console Commands

```typescript
// utils/dev/console-commands.ts
declare global {
  interface Window {
    chatDebug: {
      getState(): any
      sendMessage(content: string): Promise<void>
      clearHistory(): void
      toggleAgent(agentId: string): void
      exportChat(): string
      importChat(data: string): void
    }
  }
}

// Development helpers
if (process.env.NODE_ENV === 'development') {
  window.chatDebug = {
    getState() {
      return store.getState()
    },

    async sendMessage(content: string) {
      return chatService.sendMessage(content)
    },

    clearHistory() {
      store.dispatch(clearMessages())
    },

    toggleAgent(agentId: string) {
      store.dispatch(setActiveAgent(agentId))
    },

    exportChat() {
      const state = store.getState()
      return JSON.stringify({
        messages: state.messages,
        config: state.config,
        timestamp: new Date().toISOString()
      })
    },

    importChat(data: string) {
      try {
        const parsed = JSON.parse(data)
        store.dispatch(setMessages(parsed.messages))
        store.dispatch(setChatConfig(parsed.config))
      } catch (error) {
        console.error('Invalid chat data:', error)
      }
    }
  }

  console.log('Chat debug tools available at window.chatDebug')
}
```

This developer guide provides comprehensive patterns and examples for extending and customizing the Parlant React Chat Interface. Each section includes practical code examples and best practices for building robust chat features.