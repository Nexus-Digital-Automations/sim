# Universal Tool Registry System

A comprehensive tool management and discovery system for Sim's Universal Tool Adapter System. This system provides centralized tool registration, intelligent discovery, configuration management, and analytics for all tools within the Sim ecosystem.

## Overview

The Tool Registry System serves as the central hub for managing, discovering, and configuring tools in Sim. It provides:

- **Centralized Tool Management**: Single source of truth for all available tools
- **Intelligent Discovery**: Advanced search, filtering, and recommendation system
- **Configuration Management**: Secure, workspace-aware tool configuration
- **Analytics & Monitoring**: Usage tracking, performance metrics, and health monitoring
- **Authentication Integration**: Multi-tenant security with Sim's auth system

## Architecture

### Core Components

1. **ToolRegistryService**: Central tool registration and lifecycle management
2. **ToolDiscoveryService**: Advanced search, filtering, and similarity matching
3. **ToolConfigurationService**: Secure configuration and credential management
4. **ToolAnalyticsService**: Usage analytics and performance monitoring
5. **ToolRecommendationService**: ML-powered tool recommendations
6. **ToolHealthService**: Health monitoring and status tracking
7. **ToolRegistryAuthService**: Authentication and authorization integration

### Database Schema

The system extends Sim's PostgreSQL schema with the following tables:

- `tool_categories`: Hierarchical tool categorization
- `tool_registry`: Central tool metadata and configuration
- `tool_configurations`: User/workspace-specific tool configurations
- `tool_usage_analytics`: Detailed usage tracking and performance metrics
- `tool_recommendations`: ML recommendation system data

## Quick Start

### Installation

The Tool Registry System is integrated into Sim's existing architecture. No separate installation is required.

### Initialization

```typescript
import { initializeToolRegistry } from '@/services/tool-registry'

// Initialize the registry with existing Sim tools
await initializeToolRegistry()
```

### Basic Usage

```typescript
import { getToolRegistry } from '@/services/tool-registry'

const registry = getToolRegistry()

// Search for tools
const results = await registry.listTools({
  query: 'workflow',
  categoryId: 'cat_workflow',
  limit: 10
})

// Get tool details
const tool = await registry.getTool('get_user_workflow')

// Register a new tool
await registry.registerTool({
  id: 'my_custom_tool',
  name: 'my_custom_tool',
  displayName: 'My Custom Tool',
  description: 'A custom tool for specific tasks',
  version: '1.0.0',
  toolType: 'custom',
  scope: 'workspace',
  status: 'active',
  // ... other required fields
})
```

## API Reference

### REST API Endpoints

#### Tool Discovery

```http
GET /api/tools/search
GET /api/tools/:toolId
GET /api/tools/popular
GET /api/tools/category/:categoryId
POST /api/tools/recommendations
```

#### Configuration Management

```http
POST /api/configurations
GET /api/tools/:toolId/configurations
PUT /api/configurations/:configId
DELETE /api/configurations/:configId
```

#### Analytics

```http
GET /api/tools/:toolId/analytics
GET /api/workspace/analytics
```

#### Health Monitoring

```http
GET /api/health/overview
GET /api/tools/:toolId/health
```

### Service APIs

#### ToolRegistryService

```typescript
interface IToolRegistryService {
  registerTool(tool: ToolDefinition): Promise<void>
  unregisterTool(toolId: string): Promise<void>
  updateTool(toolId: string, updates: Partial<ToolDefinition>): Promise<void>
  getTool(toolId: string): Promise<EnrichedTool | null>
  listTools(query?: ToolSearchQuery): Promise<ToolSearchResult>
  createCategory(category: ToolCategoryInsert): Promise<ToolCategoryRow>
  getCategories(): Promise<ToolCategoryRow[]>
  checkToolHealth(toolId: string): Promise<ToolHealth>
}
```

#### ToolDiscoveryService

```typescript
interface IToolDiscoveryService {
  searchTools(query: ToolSearchQuery): Promise<ToolSearchResult>
  getSimilarTools(toolId: string, limit?: number): Promise<EnrichedTool[]>
  getPopularTools(workspaceId?: string, limit?: number): Promise<EnrichedTool[]>
  getRecommendedTools(context: RecommendationContext, limit?: number): Promise<EnrichedTool[]>
  getToolsByCategory(categoryId: string): Promise<EnrichedTool[]>
  getToolsByTags(tags: string[]): Promise<EnrichedTool[]>
}
```

## Tool Development

### Creating a Tool

1. **Define the Tool Schema**:
```typescript
const myToolSchema = z.object({
  input: z.string(),
  options: z.object({
    format: z.enum(['json', 'text']).default('json')
  }).optional()
})
```

2. **Create Tool Definition**:
```typescript
const myToolDefinition: ToolDefinition = {
  id: 'my_tool',
  name: 'my_tool',
  displayName: 'My Tool',
  description: 'A tool that processes input data',
  version: '1.0.0',
  toolType: 'custom',
  scope: 'workspace',
  status: 'active',
  categoryId: 'cat_data',
  tags: ['processing', 'custom'],
  keywords: ['process', 'transform', 'data'],
  schema: myToolSchema,
  metadata: {
    author: 'Your Name',
    documentation: '/docs/my-tool'
  },
  implementationType: 'server',
  executionContext: {},
  isPublic: true,
  requiresAuth: false,
  requiredPermissions: [],
  naturalLanguageDescription: 'Process and transform input data',
  usageExamples: [
    {
      title: 'Basic Usage',
      description: 'Process text input',
      parameters: { input: 'Hello World' },
      scenario: 'When you need to process text'
    }
  ],
  commonQuestions: [
    {
      question: 'What formats are supported?',
      answer: 'The tool supports JSON and text output formats'
    }
  ]
}
```

3. **Register the Tool**:
```typescript
await registry.registerTool(myToolDefinition)
```

### Tool Adapters

To integrate existing tools with the registry:

```typescript
import { ToolAdapter } from '@/services/tool-registry/adapters'

const adapter = new ToolAdapter()

// Adapt an existing tool
const existingTool = { /* existing tool definition */ }
const adaptedTool = adapter.adaptTool(existingTool)

// Register the adapted tool
await registry.registerTool(adaptedTool)
```

## Configuration Management

### Creating Configurations

```typescript
import { ToolConfigurationService } from '@/services/tool-registry'

const configService = new ToolConfigurationService()

const configuration = await configService.createConfiguration({
  toolId: 'my_tool',
  workspaceId: 'workspace_123',
  name: 'Production Config',
  description: 'Configuration for production use',
  configuration: {
    apiEndpoint: 'https://api.example.com',
    timeout: 30000
  },
  environmentVariables: {
    API_KEY: 'env_var_reference'
  },
  credentials: {
    secret: 'credential_reference'
  },
  isActive: true
})
```

### Using Configurations

```typescript
// Get effective configuration for a tool
const effectiveConfig = await configService.getEffectiveConfiguration(
  'my_tool',
  'workspace_123',
  'user_456'
)

// Validate configuration
const validation = await configService.validateConfiguration(
  'my_tool',
  { apiEndpoint: 'invalid-url' }
)

if (!validation.isValid) {
  console.log('Validation errors:', validation.errors)
}
```

## Analytics and Monitoring

### Recording Usage

```typescript
import { ToolAnalyticsService } from '@/services/tool-registry'

const analyticsService = new ToolAnalyticsService()

await analyticsService.recordUsage({
  toolId: 'my_tool',
  configurationId: 'config_123',
  userId: 'user_456',
  workspaceId: 'workspace_123',
  executionId: 'exec_789',
  startTime: new Date(),
  endTime: new Date(),
  durationMs: 1500,
  success: true,
  inputSize: 1024,
  outputSize: 2048
})
```

### Getting Analytics

```typescript
// Get analytics for a specific tool
const toolAnalytics = await analyticsService.getToolAnalytics('my_tool')

console.log('Usage count:', toolAnalytics.usageCount)
console.log('Success rate:', toolAnalytics.successRate)
console.log('Avg execution time:', toolAnalytics.avgExecutionTimeMs)

// Get workspace analytics
const workspaceAnalytics = await analyticsService.getWorkspaceAnalytics('workspace_123')

// Get popularity trends
const trends = await analyticsService.getPopularityTrends()
```

## Recommendations

### Getting Recommendations

```typescript
import { ToolRecommendationService } from '@/services/tool-registry'

const recommendationService = new ToolRecommendationService()

// Get personalized recommendations
const recommendations = await recommendationService.getPersonalizedRecommendations({
  userId: 'user_123',
  workspaceId: 'workspace_456',
  currentTask: 'I need to process CSV data',
  recentTools: ['csv_parser', 'data_transformer'],
  userPreferences: {
    favoriteCategories: ['cat_data'],
    preferredTypes: ['builtin'],
    recentlyUsed: ['csv_parser'],
    dismissed: ['deprecated_tool'],
    customTags: {}
  }
}, 10)

console.log('Recommended tools:', recommendations.map(t => t.displayName))
```

### Providing Feedback

```typescript
// Record user feedback on recommendations
await recommendationService.recordFeedback('recommendation_123', {
  clicked: true,
  used: true,
  userFeedback: 5, // 1-5 rating
  feedbackText: 'Very helpful recommendation!'
})
```

## Health Monitoring

### Starting Health Monitoring

```typescript
import { ToolHealthService } from '@/services/tool-registry'

const healthService = new ToolHealthService()

// Start monitoring all tools
await healthService.startHealthMonitoring()

// Monitor specific tool
await healthService.startToolHealthCheck('my_tool')

// Get health status
const health = await healthService.getToolHealth('my_tool')
console.log('Health status:', health.status)
console.log('Response time:', health.responseTime)
```

### Health Event Handling

```typescript
healthService.on('healthChanged', ({ toolId, previousStatus, currentStatus, health }) => {
  console.log(`Tool ${toolId} health changed from ${previousStatus} to ${currentStatus}`)

  if (currentStatus === 'error') {
    console.log('Error details:', health.errorDetails)
    // Send alert, log incident, etc.
  }
})
```

## Security and Authentication

### Authentication

The Tool Registry integrates with Sim's existing authentication system:

```typescript
import { ToolRegistryAuthService } from '@/services/tool-registry/auth-integration'

const authService = new ToolRegistryAuthService()

// Check tool access
const hasAccess = await authService.hasToolAccess(
  'my_tool',
  'user_123',
  'workspace_456',
  'read'
)

// Filter tools by access
const accessibleTools = await authService.filterToolsByAccess(
  allTools,
  'user_123',
  'workspace_456'
)
```

### Permissions

Tools can specify required permissions:

```typescript
const secureToolDefinition: ToolDefinition = {
  // ... other properties
  requiresAuth: true,
  requiredPermissions: ['read:workspace', 'write:data'],
  scope: 'workspace'
}
```

## Testing

### Unit Tests

```bash
npm test -- --testPathPattern=tool-registry
```

### Integration Tests

```bash
npm test -- --testPathPattern=tool-registry/integration
```

### Health Checks

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/health/overview
```

## Deployment

The Tool Registry System is automatically deployed as part of Sim's main application. No separate deployment is required.

### Environment Variables

```env
# Database connection (inherited from Sim)
DATABASE_URL=postgresql://...

# Tool Registry specific settings
TOOL_REGISTRY_HEALTH_CHECK_INTERVAL=300000  # 5 minutes
TOOL_REGISTRY_ENABLE_RECOMMENDATIONS=true
TOOL_REGISTRY_MAX_SEARCH_RESULTS=100
```

### Database Migrations

Database schema changes are managed through Sim's existing migration system:

```bash
npm run db:migrate
```

## Troubleshooting

### Common Issues

1. **Tools not appearing in search**:
   - Check tool status is 'active'
   - Verify user has access permissions
   - Ensure tool is properly registered

2. **Configuration validation errors**:
   - Check tool schema definition
   - Verify all required fields are provided
   - Validate data types match schema

3. **Health check failures**:
   - Check tool implementation type
   - Verify network connectivity for server tools
   - Review health check logs

### Debugging

Enable debug logging:

```env
DEBUG=ToolRegistryService,ToolDiscoveryService,ToolHealthService
```

Check health status:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/health/overview
```

## Performance Optimization

### Database Indexes

The system includes optimized indexes for:
- Tool search queries
- Usage analytics aggregation
- Health status monitoring
- Configuration lookups

### Caching

Consider implementing caching for:
- Frequently accessed tool definitions
- Search results for common queries
- User preferences and permissions
- Health status data

### Monitoring

Monitor key metrics:
- Search response times
- Database query performance
- Health check execution times
- API endpoint latencies

## Contributing

### Adding New Features

1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request

### Code Standards

- Follow Sim's existing code standards
- Use TypeScript with strict mode
- Write comprehensive tests
- Document all public APIs

### Database Changes

1. Create migration files
2. Update schema types
3. Test migration rollback
4. Update documentation

## License

This system is part of Sim and follows the same license terms.

## Support

For support and questions:
- Check the troubleshooting section
- Review health monitoring dashboards
- Contact the Sim development team
- Submit issues through the standard process