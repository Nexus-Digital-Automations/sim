# Intelligent Chatbot Usage Guide

## 🚀 Quick Start Guide

This guide provides step-by-step instructions for integrating and using the Intelligent Chatbot system in your applications.

### Prerequisites

Before implementing the chatbot, ensure you have:

- ✅ Claude API key from Anthropic
- ✅ Node.js 18+ installed
- ✅ Database access (PostgreSQL/MySQL)
- ✅ Environment variables configured

### Installation

1. **Install Dependencies**
```bash
npm install @anthropic-ai/sdk
npm install lucide-react @radix-ui/react-dialog
npm install @testing-library/react @testing-library/jest-dom vitest
```

2. **Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Configure required variables
CLAUDE_API_KEY=your_claude_api_key_here
NEXT_PUBLIC_WS_URL=ws://localhost:3001
DATABASE_URL=your_database_connection_string
```

## 📖 Implementation Examples

### Basic Chatbot Integration

```tsx
import React, { useState } from 'react'
import { IntelligentChatInterface } from '@/components/help/intelligent-chat-interface'

function App() {
  const [chatOpen, setChatOpen] = useState(false)
  
  const contextData = {
    sessionId: 'user-session-123',
    workflowContext: {
      type: 'data-processing',
      currentStep: 'validation',
      completedSteps: ['import', 'clean'],
      errors: [],
      timeSpent: 180000, // 3 minutes
      blockTypes: ['transform', 'validate', 'export']
    },
    userProfile: {
      expertiseLevel: 'intermediate',
      preferredLanguage: 'en',
      previousInteractions: 5,
      commonIssues: ['data-validation', 'schema-errors']
    }
  }

  return (
    <div>
      <button onClick={() => setChatOpen(true)}>
        Open AI Assistant
      </button>
      
      <IntelligentChatInterface
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        variant="modal"
        contextData={contextData}
        enableRealTimeUpdates={true}
        enableStreamingResponses={true}
        welcomeMessage="Hello! I'm here to help with your workflow."
      />
    </div>
  )
}
```

### Advanced Configuration with Custom Rules

```tsx
import { IntelligentChatbot } from '@/lib/help/ai/intelligent-chatbot'

// Initialize chatbot with advanced configuration
const chatbot = new IntelligentChatbot({
  claudeApiKey: process.env.CLAUDE_API_KEY,
  enableSemanticSearch: true,
  enableProactiveAssistance: true,
  responseTimeout: 5000,
  customRules: [
    {
      trigger: (context) => context.workflowContext.errors.length > 2,
      action: {
        type: 'proactive_help',
        message: 'I notice you\'re encountering some errors. Would you like help troubleshooting?',
        suggestedActions: [
          {
            action: 'show_error_guide',
            title: 'View Error Solutions',
            description: 'Common solutions for your current errors'
          }
        ]
      }
    }
  ]
})

// Process a message with full context
async function handleUserMessage(message: string, context: ChatContext) {
  try {
    const response = await chatbot.processMessage(
      {
        id: crypto.randomUUID(),
        content: message,
        timestamp: new Date(),
        role: 'user'
      },
      context
    )
    
    // Handle the response
    console.log('Bot response:', response.message)
    console.log('Intent detected:', response.intent)
    console.log('Suggested actions:', response.suggestedActions)
    
  } catch (error) {
    console.error('Chatbot error:', error)
    // Implement fallback behavior
  }
}
```

### Server-Side API Integration

```typescript
// pages/api/chat.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { IntelligentChatbot } from '@/lib/help/ai/intelligent-chatbot'

const chatbot = new IntelligentChatbot({
  claudeApiKey: process.env.CLAUDE_API_KEY!,
  enableSemanticSearch: true,
  enableProactiveAssistance: true
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, context } = req.body

    // Validate input
    if (!message || !context) {
      return res.status(400).json({ error: 'Message and context required' })
    }

    // Process the message
    const response = await chatbot.processMessage(
      {
        id: crypto.randomUUID(),
        content: message,
        timestamp: new Date(),
        role: 'user'
      },
      context
    )

    return res.status(200).json({
      success: true,
      response: response.message,
      intent: response.intent,
      suggestedActions: response.suggestedActions,
      metadata: response.metadata
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}
```

### WebSocket Real-Time Integration

```typescript
// WebSocket server setup
import { WebSocketServer } from 'ws'
import { IntelligentChatbot } from '@/lib/help/ai/intelligent-chatbot'

const wss = new WebSocketServer({ port: 3001 })
const chatbot = new IntelligentChatbot({
  claudeApiKey: process.env.CLAUDE_API_KEY!
})

wss.on('connection', (ws) => {
  console.log('Client connected')
  
  ws.on('message', async (data) => {
    try {
      const { message, context } = JSON.parse(data.toString())
      
      // Send typing indicator
      ws.send(JSON.stringify({
        type: 'typing',
        isTyping: true
      }))
      
      // Process message
      const response = await chatbot.processMessage(
        {
          id: crypto.randomUUID(),
          content: message,
          timestamp: new Date(),
          role: 'user'
        },
        context
      )
      
      // Send response
      ws.send(JSON.stringify({
        type: 'message',
        content: response.message,
        intent: response.intent,
        suggestedActions: response.suggestedActions
      }))
      
      // Stop typing indicator
      ws.send(JSON.stringify({
        type: 'typing',
        isTyping: false
      }))
      
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }))
    }
  })
  
  ws.on('close', () => {
    console.log('Client disconnected')
  })
})
```

## 🎯 Context Configuration

### Workflow Context Types

```typescript
type WorkflowType = 
  | 'data-processing'
  | 'data-analysis'
  | 'model-training'
  | 'report-generation'
  | 'data-visualization'
  | 'api-integration'

interface WorkflowContext {
  type: WorkflowType
  currentStep: string
  completedSteps: string[]
  errors: WorkflowError[]
  timeSpent: number // milliseconds
  blockTypes: string[]
  metadata?: Record<string, any>
}
```

### User Profile Configuration

```typescript
interface UserProfile {
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced'
  preferredLanguage: string
  previousInteractions: number
  commonIssues: string[]
  preferences?: {
    responseStyle: 'concise' | 'detailed' | 'step-by-step'
    includeExamples: boolean
    showAdvancedOptions: boolean
  }
}
```

## 🔧 Customization Options

### Custom Intent Recognition

```typescript
// Add custom intent classifiers
chatbot.addIntentClassifier({
  name: 'troubleshooting_request',
  patterns: [
    /\b(error|issue|problem|broken|not working)\b/i,
    /\b(help|fix|solve|troubleshoot)\b/i
  ],
  confidence: (text: string) => {
    const errorWords = (text.match(/error|issue|problem|broken/gi) || []).length
    const helpWords = (text.match(/help|fix|solve|troubleshoot/gi) || []).length
    return Math.min((errorWords + helpWords) / 10, 1)
  }
})

// Custom entity extraction
chatbot.addEntityExtractor({
  name: 'workflow_step',
  extractor: (text: string) => {
    const steps = ['import', 'clean', 'transform', 'validate', 'export']
    return steps.filter(step => 
      text.toLowerCase().includes(step)
    ).map(step => ({
      type: 'workflow_step',
      value: step,
      confidence: 0.9
    }))
  }
})
```

### Custom Response Templates

```typescript
// Define response templates for different scenarios
const responseTemplates = {
  beginner_help: {
    greeting: "Hi there! I'm here to help you learn {workflow_type}. Let's start with the basics.",
    explanation: "Let me explain this step by step:\n\n{detailed_explanation}",
    next_steps: "Here's what you should do next:\n{step_by_step_guide}"
  },
  
  expert_help: {
    greeting: "Hello! I can help you optimize your {workflow_type} process.",
    explanation: "Quick overview: {concise_explanation}",
    advanced_options: "Advanced options: {technical_details}"
  },
  
  error_assistance: {
    identification: "I detected a {error_type} error in your {workflow_step}.",
    solution: "Here's how to fix it:\n{solution_steps}",
    prevention: "To prevent this in the future: {prevention_tips}"
  }
}

chatbot.setResponseTemplates(responseTemplates)
```

### Proactive Assistance Rules

```typescript
// Configure proactive assistance triggers
const proactiveRules = [
  {
    name: 'stuck_user_detection',
    condition: (context) => {
      return context.workflowContext.timeSpent > 300000 && // 5+ minutes
             context.workflowContext.errors.length === 0 && // no errors
             context.userProfile.previousInteractions > 0 // not first time
    },
    action: {
      type: 'offer_help',
      message: "I notice you've been working on this step for a while. Would you like some guidance?",
      suggestions: [
        {
          action: 'show_examples',
          title: 'Show Examples',
          description: 'See examples of how others completed this step'
        },
        {
          action: 'simplify_approach',
          title: 'Simplify Process',
          description: 'Break this down into smaller steps'
        }
      ]
    }
  },
  
  {
    name: 'repeated_errors',
    condition: (context) => {
      const recentErrors = context.workflowContext.errors.slice(-3)
      const errorTypes = recentErrors.map(e => e.type)
      return new Set(errorTypes).size < errorTypes.length // duplicate error types
    },
    action: {
      type: 'suggest_alternative',
      message: "I see you're getting the same error repeatedly. Let me suggest a different approach.",
      suggestions: [
        {
          action: 'alternative_method',
          title: 'Try Different Method',
          description: 'I can show you an alternative way to accomplish this'
        }
      ]
    }
  }
]

chatbot.setProactiveRules(proactiveRules)
```

## 📱 Mobile and Responsive Design

### Mobile-Optimized Configuration

```tsx
import { useMediaQuery } from '@/hooks/use-media-query'

function ResponsiveChatInterface() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  return (
    <IntelligentChatInterface
      variant={isMobile ? 'floating' : 'modal'}
      contextData={contextData}
      mobileOptions={{
        position: 'bottom-right',
        minimizable: true,
        swipeToClose: true,
        hapticFeedback: true
      }}
      desktopOptions={{
        position: 'center',
        resizable: true,
        draggable: true
      }}
    />
  )
}
```

## 🔍 Analytics and Monitoring

### Event Tracking

```typescript
// Track user interactions
const analyticsConfig = {
  enableUserJourneyTracking: true,
  enablePerformanceMetrics: true,
  enableErrorTracking: true,
  
  events: {
    // Conversation events
    'chat_started': { category: 'engagement', action: 'start_conversation' },
    'message_sent': { category: 'interaction', action: 'send_message' },
    'suggestion_clicked': { category: 'engagement', action: 'click_suggestion' },
    
    // Performance events
    'response_time_slow': { category: 'performance', action: 'slow_response' },
    'api_error': { category: 'error', action: 'api_failure' },
    
    // User journey events
    'help_successful': { category: 'outcome', action: 'problem_solved' },
    'user_frustrated': { category: 'outcome', action: 'user_struggle' }
  }
}

chatbot.setAnalyticsConfig(analyticsConfig)
```

### Custom Metrics Collection

```typescript
// Define custom metrics
const customMetrics = {
  conversationSatisfaction: (context, response) => {
    // Calculate satisfaction score based on user behavior
    const factors = {
      responseTime: response.metadata.processingTime < 2000 ? 1 : 0.5,
      intentAccuracy: response.intent.confidence > 0.8 ? 1 : 0.5,
      userFollowup: context.conversationHistory?.length > 1 ? 0.8 : 1
    }
    
    return Object.values(factors).reduce((a, b) => a + b) / Object.keys(factors).length
  },
  
  workflowProgression: (context) => {
    const totalSteps = 5 // example workflow has 5 steps
    const completedSteps = context.workflowContext.completedSteps.length
    return completedSteps / totalSteps
  }
}

chatbot.setCustomMetrics(customMetrics)
```

## 🚀 Production Deployment

### Environment-Specific Configuration

```typescript
// config/production.ts
export const productionConfig = {
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
    model: 'claude-3-sonnet-20240229',
    maxTokens: 1000,
    temperature: 0.1 // Lower temperature for more consistent responses
  },
  
  performance: {
    responseTimeout: 3000, // Stricter timeout for production
    enableCaching: true,
    cacheProvider: 'redis',
    rateLimit: {
      windowMs: 60000, // 1 minute
      maxRequests: 100 // per user
    }
  },
  
  monitoring: {
    enableErrorReporting: true,
    enablePerformanceMonitoring: true,
    enableSecurityLogging: true
  },
  
  features: {
    enableProactiveAssistance: true,
    enableSemanticSearch: true,
    enableAnalytics: true,
    enableA11y: true
  }
}
```

### Health Check Implementation

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    
    services: {
      claude_api: await checkClaudeAPIHealth(),
      database: await checkDatabaseHealth(),
      cache: await checkCacheHealth(),
      websocket: checkWebSocketHealth()
    },
    
    metrics: {
      memory_usage: process.memoryUsage(),
      active_connections: getActiveConnectionCount(),
      average_response_time: getAverageResponseTime(),
      error_rate: getErrorRate()
    }
  }
  
  const isHealthy = Object.values(healthCheck.services).every(Boolean)
  const statusCode = isHealthy ? 200 : 503
  
  res.status(statusCode).json(healthCheck)
})

async function checkClaudeAPIHealth() {
  try {
    await claudeClient.testConnection()
    return true
  } catch {
    return false
  }
}
```

## 🎉 Best Practices

### Performance Optimization

1. **Response Caching**
   - Cache similar queries for 5 minutes
   - Use Redis for distributed caching
   - Implement cache invalidation strategies

2. **Request Optimization**
   - Batch multiple requests when possible
   - Use streaming for long responses
   - Implement request deduplication

3. **Memory Management**
   - Limit conversation history length
   - Clean up expired sessions regularly
   - Monitor memory usage patterns

### Security Guidelines

1. **Input Validation**
   - Sanitize all user inputs
   - Validate message length and content
   - Block malicious patterns

2. **Rate Limiting**
   - Implement per-user rate limits
   - Use sliding window algorithms
   - Consider IP-based limits for anonymous users

3. **Data Protection**
   - Encrypt sensitive conversation data
   - Implement data retention policies
   - Ensure GDPR compliance

### User Experience

1. **Progressive Enhancement**
   - Provide fallback for users without JavaScript
   - Ensure keyboard navigation works
   - Test with screen readers

2. **Error Handling**
   - Provide clear error messages
   - Offer retry mechanisms
   - Maintain conversation context on errors

3. **Accessibility**
   - Use semantic HTML
   - Provide alt text for images
   - Ensure sufficient color contrast

---

This comprehensive usage guide provides everything needed to successfully implement and customize the Intelligent Chatbot system. For additional support, refer to the Architecture Documentation and test examples.

**Last Updated**: 2025-09-04  
**Version**: 1.0.0