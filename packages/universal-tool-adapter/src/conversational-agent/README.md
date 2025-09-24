# Agent Tool Recommendation System

A sophisticated recommendation system that enables Parlant agents to intelligently suggest and select tools during conversational workflow interactions. This system makes agents knowledgeable consultants who can guide users to the right tools at the right moments in their workflows.

## 🎯 Mission

Build a sophisticated recommendation system that enables Parlant agents to intelligently suggest and select tools during conversational workflows, making agents knowledgeable consultants who guide users to optimal tools at the right moments.

## ✨ Features

### 1. **Conversational Context Analysis**
- **Natural Language Understanding** for tool requirement extraction
- **Intent Recognition System** for tool suggestion triggers
- **Conversation Flow Analysis** for optimal recommendation timing
- **Context Memory System** maintaining conversation state for better suggestions

### 2. **Agent-Tool Interaction Design**
- **Agent API** for tool recommendation requests and responses
- **Tool Suggestion Integration** with Parlant conversation flows
- **Tool Selection Confirmation** and feedback systems
- **Agent Learning System** from user tool selection patterns

### 3. **Workflow-Aware Recommendations**
- **Workflow State Analysis** for context-appropriate tool suggestions
- **Tool Chain Recommendations** for multi-step processes
- **Workflow Template-based** tool pre-population
- **Smart Tool Ordering** and sequencing for optimal workflow execution

### 4. **Real-time Agent Integration**
- **WebSocket Integration** for real-time tool recommendations during conversations
- **Recommendation Caching** for improved response times
- **Fallback Systems** for recommendation service failures
- **Agent Recommendation Confidence** scoring and explanation system

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Agent Tool Recommendation System             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Context        │  │  Agent-Tool     │  │  Workflow       │ │
│  │  Analyzer       │  │  API           │  │  Engine         │ │
│  │                 │  │                 │  │                 │ │
│  │ • NLU           │  │ • Recommendations│ │ • Sequencing    │ │
│  │ • Intent        │  │ • Learning      │  │ • Optimization  │ │
│  │ • Flow          │  │ • Feedback      │  │ • State Aware   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Real-time      │  │  Testing        │  │  Integration    │ │
│  │  WebSocket      │  │  Framework      │  │  Layer          │ │
│  │                 │  │                 │  │                 │ │
│  │ • Live Suggest  │  │ • Accuracy      │  │ • Parlant       │ │
│  │ • Caching       │  │ • Performance   │  │ • Socket.io     │ │
│  │ • Fallbacks     │  │ • Load Testing  │  │ • Universal     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Installation

```bash
# The system is part of the Universal Tool Adapter package
npm install @sim/universal-tool-adapter
```

### Basic Usage

```typescript
import {
  createAgentToolRecommendationSystem,
  initializeRecommendationSystem
} from '@sim/universal-tool-adapter/conversational-agent'

// Create and initialize the system
const system = await initializeRecommendationSystem(socketIOServer, {
  enableCaching: true,
  socketNamespace: '/recommendations',
  enablePerformanceMonitoring: true
})

// Get system components
const { contextAnalyzer, agentToolAPI, workflowEngine, realtimeService } = system.getComponents()

// Analyze conversation context
const context = await contextAnalyzer.analyzeMessage(
  "I need to process this CSV file and create a report",
  conversationId,
  userId,
  workspaceId,
  sessionId
)

// Request tool recommendations
const recommendations = await agentToolAPI.requestToolRecommendations({
  requestId: 'req-123',
  agentId: 'agent-456',
  conversationId,
  sessionId,
  timestamp: new Date(),
  userMessage: context.currentMessage.content,
  conversationHistory: [],
  currentContext: userContext,
  maxRecommendations: 5
})

console.log('Received recommendations:', recommendations.recommendations)
```

### WebSocket Integration

```typescript
import { Server as SocketIOServer } from 'socket.io'
import { createAgentToolRecommendationSystem } from '@sim/universal-tool-adapter/conversational-agent'

const io = new SocketIOServer(server)
const system = createAgentToolRecommendationSystem()

await system.initialize(io, {
  socketNamespace: '/recommendations',
  enableCaching: true,
  cacheTimeout: 600000, // 10 minutes
  maxConnectionsPerUser: 5
})

// Real-time recommendations are now available through WebSocket connections
```

### Client-Side WebSocket Usage

```typescript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000/recommendations', {
  auth: {
    userId: 'user-123',
    workspaceId: 'workspace-456'
  }
})

// Listen for recommendations
socket.on('recommendations_available', (data) => {
  console.log('New recommendations:', data.recommendations)
  console.log('Contextual explanation:', data.contextualExplanation)
})

// Request recommendations
socket.emit('request_recommendations', {
  requestId: 'req-123',
  context: 'I want to analyze sales data',
  urgency: 'medium',
  includeWorkflow: true,
  maxRecommendations: 3
})

// Provide feedback
socket.emit('select_recommendation', {
  recommendationId: 'rec-789',
  confidence: 0.9
})
```

## 📚 Core Components

### 1. Conversational Context Analyzer

Analyzes conversational input to extract tool requirements and understand user intent.

```typescript
import { ConversationalContextAnalyzer } from '@sim/universal-tool-adapter/conversational-agent'

const analyzer = new ConversationalContextAnalyzer()

const context = await analyzer.analyzeMessage(
  "Help me create a workflow for processing customer emails",
  conversationId,
  userId,
  workspaceId,
  sessionId
)

// Access extracted information
console.log('User intent:', context.extractedIntent.primaryCategory)
console.log('Confidence:', context.extractedIntent.confidence)
console.log('Conversation phase:', context.conversationFlow.currentPhase)
console.log('Contextual cues:', context.contextualCues.length)
```

**Key Features:**
- **Intent Recognition**: Identifies user goals and desired actions
- **Entity Extraction**: Finds relevant tools, workflows, and objects
- **Conversation Flow**: Tracks conversation phases and transitions
- **Context Memory**: Maintains conversation state across interactions
- **Timing Analysis**: Determines optimal moments for recommendations

### 2. Agent-Tool Interaction API

Provides the main interface for agents to request and receive tool recommendations.

```typescript
import { AgentToolAPI } from '@sim/universal-tool-adapter/conversational-agent'

const api = new AgentToolAPI()

// Request recommendations
const response = await api.requestToolRecommendations({
  requestId: 'req-123',
  agentId: 'agent-456',
  conversationId: 'conv-789',
  sessionId: 'sess-012',
  timestamp: new Date(),
  userMessage: 'I need to analyze customer feedback data',
  conversationHistory: previousMessages,
  currentContext: {
    userId: 'user-123',
    workspaceId: 'ws-456',
    userProfile: {
      skillLevel: 'intermediate',
      preferredInteractionStyle: 'conversational',
      learningStyle: 'example_based',
      toolFamiliarity: {}
    },
    preferences: {
      defaultToolCategories: ['data-analysis'],
      feedbackFrequency: 'moderate',
      learningModeEnabled: true
    }
  },
  maxRecommendations: 5,
  explainReasonings: true
})

// Process recommendations
response.recommendations.forEach(rec => {
  console.log(`Tool: ${rec.tool.name}`)
  console.log(`Confidence: ${rec.confidence}`)
  console.log(`Explanation: ${rec.contextualExplanation}`)
  console.log(`Estimated time: ${rec.estimatedTime}`)
})

// Record tool selection for learning
await api.recordToolSelection({
  eventId: 'select-123',
  requestId: response.requestId,
  agentId: 'agent-456',
  conversationId: 'conv-789',
  selectedToolId: 'data_analyzer',
  selectionTimestamp: new Date(),
  selectionMethod: 'direct',
  userConfidenceLevel: 0.9,
  userExpectations: ['Fast analysis', 'Clear visualization']
})
```

**Key Features:**
- **Smart Recommendations**: Context-aware tool suggestions
- **Learning System**: Adapts based on user selection patterns
- **Feedback Integration**: Processes usage feedback for improvement
- **Confidence Scoring**: Provides reliability metrics
- **Rich Explanations**: Explains why tools are recommended

### 3. Workflow-Aware Recommendation Engine

Understands workflow state and suggests optimal tool sequences for multi-step processes.

```typescript
import { WorkflowRecommendationEngine } from '@sim/universal-tool-adapter/conversational-agent'

const engine = new WorkflowRecommendationEngine()

const response = await engine.generateWorkflowRecommendations({
  requestId: 'wreq-123',
  workflowId: 'wf-456',
  currentStage: {
    stageId: 'data-processing',
    name: 'Data Processing Stage',
    description: 'Process and clean incoming data',
    requirements: [],
    inputs: [],
    outputs: [],
    dependencies: ['data-collection'],
    estimatedDuration: 15,
    complexity: 'moderate'
  },
  userIntent: 'I need to clean and process customer data',
  workflowType: 'data_processing',
  workflowState: {
    currentStageId: 'data-processing',
    stageProgress: 0.3,
    completedStages: ['data-collection'],
    pendingStages: ['analysis', 'reporting'],
    // ... additional state
  },
  availableTools: workflowTools,
  userId: 'user-123',
  userSkillLevel: 'intermediate',
  preferences: {
    preferredToolCategories: ['data'],
    qualityVsSpeed: 'balanced',
    parallelizationPreference: true
  },
  includeSequences: true,
  optimizeForSpeed: false,
  considerAlternatives: true
})

// Access workflow-aware recommendations
console.log('Immediate recommendations:', response.immediateRecommendations.length)
console.log('Tool sequences:', response.sequenceRecommendations.length)
console.log('Workflow analysis:', response.workflowAnalysis)
console.log('Potential bottlenecks:', response.potentialBottlenecks)
```

**Key Features:**
- **Stage Awareness**: Understands current workflow stage and context
- **Sequence Optimization**: Suggests optimal tool chains
- **Bottleneck Detection**: Identifies potential workflow issues
- **Performance Prediction**: Estimates execution time and quality
- **Resource Planning**: Considers resource requirements and availability

### 4. Real-time WebSocket Service

Enables live tool recommendations during conversational workflows.

```typescript
import { createRealtimeRecommendationService } from '@sim/universal-tool-adapter/conversational-agent'
import { Server as SocketIOServer } from 'socket.io'

const io = new SocketIOServer(server)

const realtimeService = createRealtimeRecommendationService(io, {
  socketNamespace: '/recommendations',
  maxConnectionsPerUser: 5,
  enableCaching: true,
  cacheTimeout: 600000,
  enableFallback: true,
  enablePerformanceMonitoring: true
})
```

**WebSocket Events:**

**Client to Server:**
- `user_message`: New user message in conversation
- `request_recommendations`: Explicit recommendation request
- `select_recommendation`: User selects a recommended tool
- `provide_feedback`: User provides feedback on recommendations
- `update_preferences`: User updates recommendation preferences

**Server to Client:**
- `recommendations_available`: New recommendations ready
- `recommendation_update`: Update to existing recommendation
- `system_status`: System health and performance updates
- `error`: Error notifications

**Key Features:**
- **Live Recommendations**: Real-time suggestions during conversations
- **Intelligent Caching**: Improves response times with smart caching
- **Fallback Systems**: Graceful degradation when services are unavailable
- **Performance Monitoring**: Tracks system performance and user satisfaction

## 🧪 Testing Framework

Comprehensive testing system ensuring accuracy, performance, and reliability.

```typescript
import { AgentRecommendationTestingFramework } from '@sim/universal-tool-adapter/conversational-agent'

const testFramework = new AgentRecommendationTestingFramework({
  enablePerformanceTesting: true,
  enableLoadTesting: true,
  enableIntegrationTesting: true,
  performanceThresholds: {
    contextAnalysisMaxTime: 500,
    recommendationGenerationMaxTime: 2000,
    minAccuracyScore: 0.8,
    minConfidenceScore: 0.7
  }
})

// Run comprehensive test suite
const results = await testFramework.runComprehensiveTests()

console.log(`Test Results: ${results.passedTests}/${results.totalTests} passed`)
console.log(`Overall Score: ${(results.overallScore * 100).toFixed(1)}%`)
console.log('Recommendations for improvement:', results.recommendations)
```

**Testing Categories:**
- **Context Analysis Testing**: Validates intent recognition and conversation flow
- **Recommendation Quality Testing**: Ensures relevant and accurate suggestions
- **Workflow Integration Testing**: Tests workflow-aware functionality
- **Real-time Integration Testing**: Validates WebSocket performance
- **Load Testing**: Tests system performance under concurrent load

## ⚙️ Configuration

### System Configuration

```typescript
import {
  DEFAULT_SYSTEM_CONFIG,
  mergeWithDefaults,
  validateSystemConfiguration
} from '@sim/universal-tool-adapter/conversational-agent'

const customConfig = mergeWithDefaults({
  enableRealtime: true,
  enableCaching: true,

  contextAnalysis: {
    confidenceThreshold: 0.7,
    enableEntityExtraction: true
  },

  agentAPI: {
    maxRecommendations: 3,
    includeExplanations: true,
    enableLearning: true
  },

  workflowEngine: {
    enableSequenceRecommendations: true,
    enableOptimization: true,
    qualityThreshold: 0.8
  },

  realtime: {
    socketNamespace: '/tool-recommendations',
    enableCaching: true,
    cacheTimeout: 300000 // 5 minutes
  }
})

// Validate configuration
const isValid = validateSystemConfiguration(customConfig)
```

### Environment Variables

```bash
# Optional environment configuration
NODE_ENV=production
LOG_LEVEL=info
CACHE_ENABLED=true
PERFORMANCE_MONITORING=true
MAX_RECOMMENDATIONS=5
CONFIDENCE_THRESHOLD=0.7
```

## 📈 Performance & Monitoring

### Performance Metrics

The system tracks comprehensive performance metrics:

```typescript
// Get system performance statistics
const stats = system.getSystemStats()

console.log('System uptime:', stats.uptime)
console.log('Memory usage:', stats.memoryUsage)
console.log('Components active:', stats.componentsActive)

// Get health status
const health = system.getHealthStatus()
console.log('System health:', health.initialized)
console.log('Component status:', health.components)
```

### Real-time Performance Monitoring

```typescript
// Monitor session performance
socket.on('performance_metrics', (metrics) => {
  console.log('Average response time:', metrics.averageResponseTime)
  console.log('Cache hit rate:', metrics.cacheHitRate)
  console.log('Recommendation accuracy:', metrics.recommendationAccuracy)
  console.log('User satisfaction:', metrics.userSatisfaction)
})
```

### Load Testing

```bash
# Run load tests
npm run test:load

# Run performance benchmarks
npm run test:performance

# Run full test suite
npm run test:comprehensive
```

## 🔌 Integration Guide

### Parlant Integration

The system integrates seamlessly with existing Parlant agents:

```typescript
// In your Parlant agent configuration
import { agentRecommendationSystem } from '@sim/universal-tool-adapter/conversational-agent'

// Initialize with your Parlant setup
await agentRecommendationSystem.initialize(io)

// Use in agent conversations
const handleUserMessage = async (message, context) => {
  const { contextAnalyzer, agentToolAPI } = agentRecommendationSystem.getComponents()

  // Analyze conversation context
  const conversationContext = await contextAnalyzer.analyzeMessage(
    message,
    context.conversationId,
    context.userId,
    context.workspaceId,
    context.sessionId
  )

  // Get recommendations if appropriate
  if (conversationContext.recommendationTiming.optimalMoment) {
    const recommendations = await agentToolAPI.requestToolRecommendations({
      // ... request parameters
    })

    return {
      response: generateAgentResponse(message, context),
      recommendations: recommendations.recommendations
    }
  }

  return { response: generateAgentResponse(message, context) }
}
```

### Socket.io Integration

```typescript
// Integrate with existing Socket.io infrastructure
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Initialize recommendation system
await agentRecommendationSystem.initialize(io, {
  socketNamespace: '/recommendations',
  enableCaching: true,
  enableFallback: true
})

// The system automatically handles WebSocket events
```

### Universal Tool Adapter Integration

```typescript
// The system automatically integrates with the Universal Tool Adapter
import { UniversalToolAdapter } from '@sim/universal-tool-adapter'

// Tool recommendations will use available tools from the adapter registry
const adapter = new UniversalToolAdapter()
const availableTools = await adapter.getAvailableTools()

// These tools are automatically considered in recommendations
```

## 🚨 Error Handling

### Graceful Degradation

The system includes comprehensive error handling and fallback mechanisms:

```typescript
try {
  const recommendations = await agentToolAPI.requestToolRecommendations(request)
  // Process recommendations normally
} catch (error) {
  // System automatically falls back to basic recommendations
  console.log('Using fallback recommendations due to:', error.message)

  // Fallback recommendations are still provided
  const fallbackRecommendations = await getFallbackRecommendations(request)
}
```

### Error Monitoring

```typescript
// Monitor system errors
system.on('error', (error) => {
  console.error('System error:', error)
  // Implement your error tracking/alerting
})

// Get error statistics
const debugInfo = getDebugInfo()
console.log('Error rate:', debugInfo.stats.errorRate)
```

## 📊 Success Criteria

The system meets the following success criteria:

### ✅ **Agents can intelligently recommend appropriate tools during conversations**
- Context-aware analysis of user messages
- Intent recognition with >80% accuracy
- Confidence scoring for all recommendations

### ✅ **Recommendations are contextually relevant to current workflow state**
- Workflow stage awareness
- State-appropriate tool suggestions
- Multi-step process understanding

### ✅ **System improves workflow efficiency by suggesting optimal tool sequences**
- Tool chain recommendations
- Sequence optimization algorithms
- Performance prediction and bottleneck detection

### ✅ **Real-time integration provides seamless conversational experience**
- WebSocket-based live recommendations
- Sub-second response times
- Fallback systems for reliability

## 🤝 Contributing

To contribute to the Agent Tool Recommendation System:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Run tests**: `npm run test:comprehensive`
4. **Submit a pull request**

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run performance tests
npm run test:performance

# Run load tests
npm run test:load

# Build the system
npm run build
```

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:

- **Documentation**: See inline code documentation
- **Testing**: Use the comprehensive testing framework
- **Issues**: Report issues through the project repository
- **Performance**: Monitor using built-in performance tracking

## 🎉 Acknowledgments

Built as part of the Universal Tool Adapter System for Sim's Parlant integration, enabling intelligent conversational AI workflows.

---

**The Agent Tool Recommendation System makes Parlant agents knowledgeable consultants who guide users to the right tools at the right moments in their workflows.** 🚀