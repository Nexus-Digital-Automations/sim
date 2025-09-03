# Nexus Copilot Tools

A comprehensive, production-ready toolset for AI-powered workflow management in the Sim platform. The Nexus toolset provides standardized, secure, and performant tools for creating, managing, and executing workflows through AI agents.

## 🚀 Features

- **Complete Workflow Management**: Create, read, update, and manage workflows with full CRUD operations
- **Enterprise Security**: Authentication, authorization, and permission validation
- **Performance Optimized**: Comprehensive logging, monitoring, and performance tracking
- **Type-Safe**: Full TypeScript support with strict type checking
- **Production Ready**: Error handling, validation, and comprehensive testing
- **Standardized Architecture**: Consistent patterns across all tools

## 📋 Available Tools

### Workflow Management Tools

| Tool | Description | Permissions | Rate Limits |
|------|-------------|-------------|-------------|
| `listWorkflows` | Get comprehensive list of workflows with filtering, sorting, and pagination | `workflows.read` | 60/min, 1000/hr |
| `createWorkflow` | Create new workflows with templates, configuration, and initial structure | `workflows.create` | 10/min, 100/hr |
| `getWorkflowDetails` | Retrieve complete workflow details including blocks, edges, and analytics | `workflows.read` | 30/min, 500/hr |
| `updateWorkflow` | Update workflow properties with change tracking and validation | `workflows.update` | 20/min, 200/hr |

## 🛠 Installation & Setup

### Basic Usage

```typescript
import { nexusToolset } from '@/lib/nexus/tools';

// Use individual tools
const workflows = await nexusToolset.listWorkflows.execute({
  workspaceId: 'workspace-123',
  limit: 20,
  sortBy: 'updated_at'
});

// Create a new workflow
const newWorkflow = await nexusToolset.createWorkflow.execute({
  workspaceId: 'workspace-123',
  name: 'My New Workflow',
  description: 'Automated data processing workflow',
  template: 'data-processing'
});
```

### AI Framework Integration

```typescript
import { registerNexusTools } from '@/lib/nexus/tools';

// Register all workflow management tools
const aiTools = registerNexusTools(['workflow-management']);

// Use with AI framework (e.g., Vercel AI SDK)
const { generateText } = await ai({
  model: 'gpt-4',
  tools: aiTools,
  prompt: 'List all workflows in workspace-123'
});
```

## 📖 Tool Documentation

### List Workflows

Retrieves workflows with comprehensive filtering and sorting options.

```typescript
const result = await listWorkflows.execute({
  workspaceId: 'workspace-123',
  limit: 50,
  offset: 0,
  status: 'published',
  searchTerm: 'automation',
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeMetadata: true,
  includeFolderInfo: true
});
```

**Features:**
- Advanced filtering by status, folder, search terms
- Flexible sorting and pagination
- Metadata and folder information inclusion
- Performance optimized queries

### Create Workflow

Creates new workflows with template support and comprehensive validation.

```typescript
const result = await createWorkflow.execute({
  workspaceId: 'workspace-123',
  name: 'Data Processing Workflow',
  description: 'Automated data processing and transformation',
  template: 'data-processing',
  folderId: 'folder-456',
  tags: ['automation', 'data'],
  variables: {
    inputSource: 'api',
    outputFormat: 'json'
  },
  collaborators: ['user-789'],
  initializeWithBlocks: true
});
```

**Features:**
- Template-based initialization
- Folder organization support
- Tag management and variables
- Collaboration setup
- Initial block creation

### Get Workflow Details

Retrieves comprehensive workflow information including structure and analytics.

```typescript
const result = await getWorkflowDetails.execute({
  workflowId: 'workflow-123',
  includeBlocks: true,
  includeEdges: true,
  includeExecutionHistory: true,
  includeVersionHistory: true,
  executionHistoryLimit: 20,
  versionHistoryLimit: 10
});
```

**Features:**
- Complete workflow structure
- Block and edge relationships
- Execution history and analytics
- Version history access
- Performance metrics

### Update Workflow

Updates workflow properties with comprehensive validation and change tracking.

```typescript
const result = await updateWorkflow.execute({
  workflowId: 'workflow-123',
  name: 'Updated Workflow Name',
  description: 'New description',
  color: '#FF5722',
  variables: {
    newSetting: 'value'
  },
  collaborators: ['user-456', 'user-789'],
  deploymentSettings: {
    regenerateApiKey: true
  },
  updateOptions: {
    createVersion: true,
    versionDescription: 'Updated configuration'
  }
});
```

**Features:**
- Selective property updates
- Permission validation
- Change tracking and versioning
- Collaboration management
- Deployment state handling

## 🔧 Architecture

### Base Tool Infrastructure

All Nexus tools extend the `BaseNexusTool` class, providing:

- **Standardized Authentication**: Automatic session validation
- **Comprehensive Logging**: Operation IDs, performance metrics, error tracking
- **Error Handling**: Consistent error responses with context
- **Type Safety**: Full TypeScript support with Zod validation
- **Performance Monitoring**: Execution time tracking and optimization

### Tool Response Format

All tools return standardized responses:

```typescript
// Success Response
{
  status: 'success',
  data: T,
  metadata: {
    operationId: string,
    timestamp: string,
    executionTimeMs: number
  }
}

// Error Response
{
  status: 'error',
  message: string,
  code?: string,
  details?: Record<string, unknown>,
  metadata: {
    operationId: string,
    timestamp: string,
    executionTimeMs?: number
  }
}
```

### Database Integration

Tools integrate seamlessly with Sim's database schema:
- **Workflows**: Main workflow table with metadata
- **Workflow Blocks**: Individual workflow components
- **Workflow Edges**: Connections between blocks
- **Workflow Folders**: Organization structure
- **Execution Logs**: Runtime history and analytics

## 🔒 Security & Permissions

### Authentication

All tools require authentication by default:
- Session validation through `getSession()`
- User ID extraction and validation
- Permission checks against workflow ownership

### Authorization

Permission-based access control:
- **workflows.read**: View workflows and details
- **workflows.create**: Create new workflows
- **workflows.update**: Modify existing workflows
- **workflows.delete**: Delete workflows (future)

### Rate Limiting

Built-in rate limiting per tool:
- **Read Operations**: 30-60 requests/minute
- **Write Operations**: 10-20 requests/minute
- **Bulk Operations**: 5-10 requests/minute

## 📊 Monitoring & Analytics

### Comprehensive Logging

Every operation includes:
- **Operation ID**: Unique identifier for request tracking
- **Performance Metrics**: Execution time, database query time
- **User Context**: User ID, session information
- **Error Details**: Stack traces, error context

### Performance Tracking

Automatic performance monitoring:
- Database query execution time
- Data serialization time
- Network request timing
- Memory usage tracking

### Audit Trails

Complete audit logging:
- User actions and modifications
- Permission checks and failures
- System errors and recovery
- Performance bottlenecks

## 🧪 Testing

### Unit Tests

Each tool includes comprehensive unit tests:
- Input validation testing
- Database interaction mocking
- Error condition handling
- Permission validation

### Integration Tests

End-to-end testing scenarios:
- Complete workflow creation and management
- Multi-user collaboration scenarios
- Performance and load testing
- Security and permission testing

### Test Utilities

Built-in testing utilities:
```typescript
import { mockNexusContext, mockWorkflowData } from '@/lib/nexus/tools/__test-utils__';

// Mock contexts and data for testing
const context = mockNexusContext();
const workflow = mockWorkflowData();
```

## 🔄 Future Enhancements

### Planned Tools

- **Execute Workflow**: Run workflows with parameter passing
- **Clone Workflow**: Duplicate workflows with modifications
- **Share Workflow**: Public sharing and collaboration
- **Workflow Analytics**: Detailed performance insights
- **Bulk Operations**: Mass workflow management
- **Template Management**: Custom template creation

### Advanced Features

- **Real-time Collaboration**: Live editing and synchronization
- **Version Control**: Git-like workflow versioning
- **Workflow Marketplace**: Public template sharing
- **Advanced Analytics**: Usage patterns and optimization suggestions
- **Workflow Automation**: Triggered execution and scheduling

## 📚 API Reference

For complete API documentation, see the individual tool files:

- [`base-nexus-tool.ts`](./tools/base-nexus-tool.ts) - Base infrastructure
- [`list-workflows.ts`](./tools/list-workflows.ts) - List workflows tool
- [`create-workflow.ts`](./tools/create-workflow.ts) - Create workflow tool
- [`get-workflow-details.ts`](./tools/get-workflow-details.ts) - Get workflow details tool
- [`update-workflow.ts`](./tools/update-workflow.ts) - Update workflow tool

## 🤝 Contributing

When adding new tools:

1. **Extend BaseNexusTool**: Use the base infrastructure
2. **Follow Naming Conventions**: Consistent file and class naming
3. **Implement Comprehensive Logging**: Use the logging patterns
4. **Add Type Safety**: Full TypeScript with Zod validation
5. **Include Tests**: Unit and integration test coverage
6. **Document Thoroughly**: Inline documentation and examples

## 📜 License

This toolset is part of the Sim platform and follows the same licensing terms.