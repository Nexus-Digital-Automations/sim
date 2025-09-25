# Local Parlant Copilot System

## Overview

The Local Parlant Copilot System provides a privacy-focused, locally-processed alternative to the external copilot system. Built on top of the existing Parlant integration, it enables users to interact with locally-hosted AI agents while maintaining full compatibility with Sim's tool ecosystem and workflow management features.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Local Copilot Frontend                       │
├─────────────────┬───────────────────┬───────────────────────────┤
│ Agent Selector  │ Message Interface │ Mode Toggle (Local/Ext)   │
└─────────────────┴───────────────────┴───────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Local Copilot Store (Zustand)                 │
├─────────────────┬───────────────────┬───────────────────────────┤
│ Agent Mgmt      │ Message Streaming │ Tool Call Management      │
└─────────────────┴───────────────────┴───────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Local Copilot API (/api/local-copilot)            │
├─────────────────┬───────────────────┬───────────────────────────┤
│ Chat Endpoint   │ Agent Discovery   │ Session Management        │
└─────────────────┴───────────────────┴───────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Parlant Services                           │
├─────────────────┬───────────────────┬───────────────────────────┤
│ Agent Service   │ Conversation Mgmt │ Universal Tool Adapters   │
└─────────────────┴───────────────────┴───────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Local Parlant Server                         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Differences from External Copilot

| Aspect | External Copilot | Local Parlant Copilot |
|--------|------------------|------------------------|
| **AI Processing** | External Sim Agent API | Local Parlant Server |
| **Agent Selection** | Fixed provider/model | Workspace-specific Parlant agents |
| **Privacy** | Data sent externally | All data stays local |
| **Customization** | Limited | Full agent training/customization |
| **Tools** | Pre-configured | Universal tool adapters |
| **Latency** | Network dependent | Local processing |
| **Cost** | External API usage | No external costs |

## Implementation Details

### 1. Local Copilot Store (`stores/local-copilot/`)

**Purpose**: Manages state for local copilot interactions, agent selection, and streaming conversations.

**Key Features**:
- Agent discovery and selection from workspace
- Real-time message streaming via SSE
- Tool call execution and state management
- Session persistence and conversation history
- File attachment handling
- Integration with existing workflow context

**State Structure**:
```typescript
interface LocalCopilotState {
  // Agent Management
  selectedAgent: Agent | null
  availableAgents: Agent[]
  isLoadingAgents: boolean

  // Conversation Management
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  isStreaming: boolean

  // Tool Integration
  toolCalls: ToolCall[]
  executingTools: Set<string>

  // UI State
  mode: 'local' | 'external'
  inputValue: string
  showAgentSelector: boolean
}
```

### 2. Local Copilot API (`app/api/local-copilot/`)

**Endpoints**:

#### `POST /api/local-copilot/chat`
- Handles streaming conversations with Parlant agents
- Processes file attachments and workflow context
- Manages tool call execution through adapters
- Returns SSE stream for real-time UI updates

#### `GET /api/local-copilot/agents`
- Retrieves workspace-accessible Parlant agents
- Filters by user permissions and workspace isolation
- Returns agent metadata and capabilities

#### `POST /api/local-copilot/conversations`
- Creates new conversations with selected agents
- Manages session lifecycle and persistence
- Handles conversation settings and preferences

#### `GET /api/local-copilot/conversations`
- Retrieves conversation history for workspace
- Supports filtering, pagination, and search
- Maintains proper access control

### 3. UI Components (`components/local-copilot/`)

#### `LocalCopilot.tsx`
- Main copilot interface with agent selection
- Message rendering and streaming display
- Integration with existing copilot UI patterns
- Mode switching controls

#### `AgentSelector.tsx`
- Agent discovery and selection interface
- Agent capability display and filtering
- Workspace-scoped agent management

#### `LocalCopilotMessage.tsx`
- Message rendering with tool call support
- File attachment display
- Stream state indicators

#### `ModeToggle.tsx`
- Switch between local and external copilot
- Preference persistence
- Feature availability indicators

### 4. Integration Points

#### Tool Adapter System
- Leverages existing Universal Tool Adapter framework
- Full compatibility with 20+ existing tools
- Automatic tool discovery and registration
- Context-aware tool recommendations

#### Workflow Context
- Access to current workflow state and execution
- Block-level context and data access
- Execution history and logs
- Real-time workflow updates

#### Authentication & Authorization
- Workspace-scoped access control
- User permission validation
- Agent access restrictions
- Conversation isolation

## Configuration

### Environment Variables

```bash
# Parlant Server Configuration
PARLANT_SERVER_URL=http://localhost:8001
PARLANT_ENABLE_LOCAL_COPILOT=true
PARLANT_DEFAULT_AGENT_MODEL=anthropic/claude-3-sonnet

# Local Copilot Settings
LOCAL_COPILOT_MAX_CONVERSATION_LENGTH=100
LOCAL_COPILOT_FILE_UPLOAD_MAX_SIZE=10MB
LOCAL_COPILOT_STREAM_TIMEOUT=30000

# Tool Adapter Configuration
UNIVERSAL_TOOL_ADAPTERS_ENABLED=true
TOOL_ADAPTER_CACHE_TTL=300
```

### Feature Flags

```typescript
interface LocalCopilotFeatureFlags {
  enableAgentSelection: boolean
  enableFileAttachments: boolean
  enableToolCallStreaming: boolean
  enableConversationHistory: boolean
  enableModeToggle: boolean
}
```

## Usage Guidelines

### For Developers

1. **Adding New Tool Adapters**:
   ```typescript
   // Create new adapter following universal pattern
   class CustomToolAdapter extends BaseToolAdapter {
     async execute(params: ToolParams): Promise<ToolResult> {
       // Implementation
     }
   }

   // Register with local copilot
   registerLocalCopilotTool(CustomToolAdapter)
   ```

2. **Extending Agent Capabilities**:
   ```typescript
   // Configure agent with specific tools
   const agent = await agentService.createAgent({
     name: 'Workflow Assistant',
     tools: ['workflow_analyzer', 'code_generator', 'file_manager'],
     guidelines: [/* specific guidelines */]
   })
   ```

3. **Custom UI Components**:
   ```typescript
   // Extend local copilot with custom components
   <LocalCopilot
     customComponents={{
       agentSelector: CustomAgentSelector,
       messageRenderer: CustomMessageRenderer
     }}
   />
   ```

### For Users

1. **Agent Selection**:
   - Choose from workspace-specific agents
   - View agent capabilities and specializations
   - Switch agents during conversations

2. **Privacy Benefits**:
   - All conversations stay within local infrastructure
   - No external API calls or data transmission
   - Full control over data handling and storage

3. **Customization Options**:
   - Train agents on specific workflows/data
   - Configure tool access and permissions
   - Customize conversation behavior and responses

## Performance Considerations

### Optimization Strategies

1. **Agent Caching**: Cache frequently used agents in memory
2. **Tool Preloading**: Preload common tools for faster execution
3. **Stream Buffering**: Optimize SSE streaming for smooth UI updates
4. **Conversation Pagination**: Lazy load conversation history
5. **File Processing**: Async file attachment processing

### Monitoring

- **Agent Response Times**: Track local vs external performance
- **Tool Execution Metrics**: Monitor tool call success rates
- **Conversation Analytics**: Usage patterns and preferences
- **Resource Usage**: Memory and CPU utilization tracking

## Security Considerations

### Data Protection
- All conversations encrypted at rest
- Workspace isolation enforced at API level
- Agent access controlled by user permissions
- File attachments scanned and validated

### Access Control
- Integration with existing Sim auth system
- Role-based agent access restrictions
- Conversation sharing controls
- Audit logging for compliance

## Testing Strategy

### Unit Tests
- Store state management and actions
- API endpoint functionality and validation
- Component rendering and interactions
- Tool adapter integration and execution

### Integration Tests
- End-to-end conversation flows
- Agent selection and switching
- File attachment processing
- Tool call execution and streaming

### Performance Tests
- Concurrent conversation handling
- Large file attachment processing
- Tool execution under load
- Memory usage and cleanup

## Deployment Considerations

### Prerequisites
- Parlant server running and accessible
- Universal tool adapters configured
- Database schema updated for conversations
- Agent permissions configured

### Migration Strategy
1. Deploy local copilot alongside existing external copilot
2. Enable feature flag for selective user access
3. Monitor performance and user adoption
4. Gradually expand access based on feedback
5. Optional: Deprecate external copilot based on usage

### Rollback Plan
- Feature flag disable for immediate rollback
- Database migration rollback scripts
- User preference reset capabilities
- Fallback to external copilot for affected users

## Maintenance

### Regular Tasks
- Agent model updates and retraining
- Tool adapter compatibility checks
- Performance optimization reviews
- Security audit and updates

### Monitoring Alerts
- Parlant server connectivity issues
- High tool execution failure rates
- Conversation persistence failures
- Performance degradation indicators

## Future Enhancements

### Planned Features
1. **Multi-Agent Conversations**: Support multiple agents in single conversation
2. **Agent Training Interface**: UI for custom agent training
3. **Advanced Tool Chaining**: Complex multi-step tool workflows
4. **Voice Integration**: Speech-to-text and text-to-speech capabilities
5. **Mobile Optimization**: Responsive design for mobile devices

### Architecture Evolution
- Microservice architecture for better scalability
- Real-time collaboration features
- Advanced analytics and insights
- Integration with external knowledge bases

---

*This documentation is maintained as part of the Local Parlant Copilot System implementation. For updates and detailed API documentation, refer to the codebase and inline documentation.*