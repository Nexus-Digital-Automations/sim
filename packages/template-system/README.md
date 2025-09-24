# Template System for Dynamic Journey Generation

A comprehensive template system that enables dynamic journey creation from workflow templates, supporting parameterization, inheritance, composition patterns, and custom workflow-to-journey transformations.

## 🚀 Features

- **Template Framework**: Complete parameterization and inheritance system
- **Dynamic Generation**: Convert workflows to conversational journeys automatically
- **Template Library**: Built-in templates for common patterns with discovery
- **Optimization Engine**: Performance and UX optimizations for generated journeys
- **Comprehensive API**: REST API for template management and journey generation
- **Caching System**: Intelligent caching for performance optimization
- **Analytics**: Template usage tracking and performance metrics
- **Import/Export**: Template sharing and workspace customization

## 📦 Installation

```bash
npm install @sim/template-system
```

## 🏗️ Architecture Overview

The template system consists of several key components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Template System                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Template  │  │   Journey    │  │    Template     │   │
│  │   Engine    │──│  Generator   │──│    Library      │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Parameter   │  │ Optimization │  │  Analytics      │   │
│  │ System      │  │ Engine       │  │  Tracker        │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Template Management API               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Quick Start

### Basic Usage

```typescript
import {
  TemplateEngine,
  JourneyGenerator,
  TemplateLibrary
} from '@sim/template-system'

// Initialize the system
const templateEngine = new TemplateEngine()
const journeyGenerator = new JourneyGenerator()
const templateLibrary = new TemplateLibrary()

// Generate a journey from a template
const result = await journeyGenerator.generateJourney({
  templateId: 'customer-onboarding',
  workflowId: 'my-workflow',
  agentId: 'my-agent',
  workspaceId: 'my-workspace',
  parameters: {
    customerName: 'John Doe',
    companySize: 'medium'
  },
  options: {
    optimizationLevel: 'standard',
    optimizationTargets: ['performance', 'user_experience'],
    validateGeneration: true
  },
  context: {
    agentCapabilities: [
      { type: 'tool_execution', name: 'API Calls', confidence: 0.9 }
    ],
    workspaceSettings: {
      defaultOptimizationLevel: 'standard',
      maxJourneyDuration: 30,
      allowedComplexity: 'moderate',
      brandingRequired: false,
      complianceRules: []
    }
  }
})

if (result.success) {
  console.log('Generated journey:', result.journey)
} else {
  console.error('Generation failed:', result.errors)
}
```

### Creating Custom Templates

```typescript
// Create a new template
const template = await templateLibrary.createTemplate({
  name: 'Custom Support Flow',
  description: 'Automated support ticket processing',
  workflowId: 'support-workflow-123',
  category: 'customer-support',
  difficulty: 'intermediate',
  parameters: [
    {
      name: 'ticketPriority',
      type: 'enum',
      description: 'Priority level of the ticket',
      required: true,
      validation: {
        options: [
          { value: 'low', label: 'Low Priority' },
          { value: 'high', label: 'High Priority' }
        ]
      },
      displayOrder: 1
    }
  ],
  workflowData: {
    blocks: [/* workflow blocks */],
    edges: [/* workflow edges */],
    parameterMappings: [
      {
        parameterId: 'ticketPriority',
        targetPath: 'blocks.0.data.priority',
        transformation: { type: 'direct' }
      }
    ]
  },
  tags: ['support', 'automation'],
  isPublic: false
}, 'workspace-id', 'user-id')
```

## 📖 Core Concepts

### Templates

Templates are reusable workflow configurations with parameterization:

- **Parameters**: Configurable inputs with validation
- **Inheritance**: Templates can extend other templates
- **Mixins**: Reusable components that can be applied to templates
- **Overrides**: Modifications to inherited templates

### Journey Generation

The journey generation process:

1. **Template Processing**: Load and process template with parameters
2. **Workflow Analysis**: Analyze workflow structure and complexity
3. **Block Conversion**: Convert workflow blocks to journey states
4. **Edge Mapping**: Convert workflow edges to journey transitions
5. **Optimization**: Apply performance and UX optimizations
6. **Validation**: Validate generated journey structure

### Parameter System

Templates support rich parameter definitions:

```typescript
{
  name: 'userEmail',
  type: 'string',
  description: 'User email address',
  required: true,
  validation: {
    format: 'email',
    maxLength: 255
  },
  defaultValue: ''
}
```

Supported parameter types:
- `string` - Text values with pattern/length validation
- `number` - Numeric values with min/max validation
- `boolean` - True/false values
- `array` - Lists with item validation
- `object` - Complex objects with property validation
- `enum` - Predefined option sets
- `date` - Date/time values
- `reference` - References to other entities

## 🎨 Built-in Templates

The system includes several built-in templates:

### Customer Onboarding
```typescript
// Use the built-in customer onboarding template
const journey = await journeyGenerator.generateJourney({
  templateId: 'customer-onboarding',
  parameters: {
    customerName: 'Jane Smith',
    companySize: 'large',
    productInterests: ['analytics', 'automation']
  }
  // ... other options
})
```

### Support Ticket Handler
```typescript
const journey = await journeyGenerator.generateJourney({
  templateId: 'support-ticket',
  parameters: {
    ticketPriority: 'high',
    category: 'technical',
    escalationEnabled: true
  }
})
```

### Lead Qualification
```typescript
const journey = await journeyGenerator.generateJourney({
  templateId: 'lead-qualification',
  parameters: {
    leadSource: 'website',
    qualificationCriteria: ['budget', 'timeline', 'authority']
  }
})
```

## 🔧 Advanced Features

### Template Inheritance

```typescript
// Parent template
const parentTemplate = {
  id: 'base-support',
  parameters: [
    { name: 'customerName', type: 'string', required: true }
  ]
}

// Child template inheriting from parent
const childTemplate = {
  id: 'technical-support',
  parentTemplateId: 'base-support',
  parameters: [
    { name: 'technicalLevel', type: 'enum', required: true }
  ],
  overrides: {
    parameters: [
      {
        parameterId: 'customerName',
        operation: 'update',
        newValue: { description: 'Technical contact name' }
      }
    ]
  }
}
```

### Conditional Logic

```typescript
// Template with conditional blocks
const template = {
  workflowData: {
    conditionalBlocks: [
      {
        conditionId: 'priority-check',
        condition: {
          operator: 'eq',
          operands: [
            { type: 'parameter', parameterId: 'priority' },
            { type: 'constant', value: 'high' }
          ]
        },
        blocksToShow: ['escalation-block'],
        edgesToActivate: ['escalation-edge']
      }
    ]
  }
}
```

### Dynamic Content

```typescript
// Template with dynamic content generation
const template = {
  workflowData: {
    dynamicContent: [
      {
        id: 'personalized-greeting',
        type: 'computed',
        source: {
          type: 'computed',
          computationRule: {
            type: 'template',
            expression: 'Hello {{customerName}}, welcome to {{companyName}}!',
            dependencies: ['customerName', 'companyName']
          }
        }
      }
    ]
  }
}
```

## 🚀 Optimization

The system includes several optimization strategies:

### Performance Optimization

```typescript
const options = {
  optimizationLevel: 'aggressive',
  optimizationTargets: ['performance'],
  // Enables:
  // - State consolidation
  // - Transition simplification
  // - Caching optimizations
  // - Lazy loading
}
```

### User Experience Optimization

```typescript
const options = {
  optimizationTargets: ['user_experience'],
  // Enables:
  // - Flow simplification
  // - Better error handling
  // - Progress indicators
  // - Skip options
}
```

### Memory Optimization

```typescript
const options = {
  optimizationTargets: ['memory'],
  // Enables:
  // - State cleanup
  // - Variable scoping
  // - Resource pooling
}
```

## 📊 Analytics

Track template usage and performance:

```typescript
// Get template analytics
const analytics = await templateLibrary.getTemplateAnalytics('template-id', 'workspace-id')

console.log('Template Analytics:', {
  totalUsage: analytics.totalUsage,
  uniqueUsers: analytics.uniqueUsers,
  averageRating: analytics.averageRating,
  completionRate: analytics.completionRate,
  averageGenerationTime: analytics.averageGenerationTime
})
```

## 🔍 Search and Discovery

```typescript
// Search templates
const results = await templateLibrary.searchTemplates({
  category: 'customer-support',
  tags: ['automation', 'escalation'],
  difficulty: 'intermediate',
  rating: 4.0,
  query: 'ticket handling',
  isPublic: true
}, 'workspace-id', 'user-id')

// Get recommendations
const recommendations = await templateLibrary.getRecommendations(
  'user-id',
  'workspace-id',
  {
    recentActivity: ['support-tickets', 'customer-onboarding'],
    preferences: { difficulty: 'intermediate' }
  }
)
```

## 🌐 REST API

The template system provides a comprehensive REST API:

### Template Management

```http
# Get templates
GET /api/templates?category=support&limit=10

# Get specific template
GET /api/templates/{id}

# Create template
POST /api/templates
Content-Type: application/json

{
  "name": "My Template",
  "category": "custom",
  "parameters": [...]
}

# Update template
PUT /api/templates/{id}

# Delete template
DELETE /api/templates/{id}
```

### Journey Generation

```http
# Generate journey from template
POST /api/templates/{id}/generate-journey
Content-Type: application/json

{
  "agentId": "agent-123",
  "parameters": {
    "customerName": "John Doe"
  },
  "options": {
    "optimizationLevel": "standard"
  }
}
```

### Analytics

```http
# Get template analytics
GET /api/templates/{id}/analytics

# Find similar templates
GET /api/templates/{id}/similar?limit=5

# Get recommendations
GET /api/templates/recommendations
```

### Import/Export

```http
# Export template
GET /api/templates/{id}/export

# Import template
POST /api/templates/import
Content-Type: multipart/form-data

file: template.json
overwriteExisting: false
```

## ⚙️ Configuration

### Environment Variables

```env
# Cache configuration
TEMPLATE_CACHE_ENABLED=true
TEMPLATE_CACHE_TTL=3600
TEMPLATE_CACHE_MAX_SIZE=1000

# Generation settings
DEFAULT_OPTIMIZATION_LEVEL=standard
MAX_GENERATION_TIME=30000
ENABLE_GENERATION_CACHE=true

# Analytics
ANALYTICS_ENABLED=true
ANALYTICS_RETENTION_DAYS=90

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

### Template System Configuration

```typescript
import { TemplateSystemConfig } from '@sim/template-system'

const config: TemplateSystemConfig = {
  cache: {
    enabled: true,
    ttl: 3600,
    maxSize: 1000
  },
  generation: {
    defaultOptimizationLevel: 'standard',
    maxGenerationTime: 30000,
    enableCache: true
  },
  analytics: {
    enabled: true,
    retentionDays: 90
  }
}
```

## 🧪 Testing

### Unit Testing

```typescript
import { TemplateEngine } from '@sim/template-system'

describe('TemplateEngine', () => {
  it('should process template with parameters', async () => {
    const engine = new TemplateEngine()
    const template = { /* template data */ }
    const parameters = { customerName: 'John Doe' }

    const result = await engine.processTemplate(template, parameters, context)

    expect(result.validationResult.isValid).toBe(true)
    expect(result.processedData).toBeDefined()
  })
})
```

### Integration Testing

```typescript
describe('Journey Generation Integration', () => {
  it('should generate journey from template', async () => {
    const generator = new JourneyGenerator()

    const result = await generator.generateJourney({
      templateId: 'test-template',
      workflowId: 'test-workflow',
      // ... other parameters
    })

    expect(result.success).toBe(true)
    expect(result.journey.states.length).toBeGreaterThan(0)
  })
})
```

## 🚨 Error Handling

The system provides comprehensive error handling:

```typescript
try {
  const result = await journeyGenerator.generateJourney(request)
} catch (error) {
  if (error instanceof TemplateProcessingError) {
    console.error('Template processing failed:', error.validationErrors)
  } else if (error instanceof TemplateValidationError) {
    console.error('Template validation failed:', error.errors)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## 🔒 Security Considerations

- **Parameter Validation**: All parameters are validated before processing
- **Template Isolation**: Templates run in isolated contexts
- **Access Control**: Template access is controlled by workspace permissions
- **Input Sanitization**: All user inputs are sanitized
- **Rate Limiting**: API endpoints include rate limiting

## 🎯 Performance Tips

1. **Use Caching**: Enable caching for frequently used templates
2. **Optimize Parameters**: Minimize parameter complexity
3. **Batch Operations**: Use bulk operations where possible
4. **Monitor Analytics**: Track performance metrics
5. **Choose Optimization Targets**: Select appropriate optimization strategies

## 🔧 Troubleshooting

### Common Issues

**Template Not Found**
```typescript
// Ensure template ID and workspace ID are correct
const template = await templateLibrary.getTemplate(templateId, workspaceId)
if (!template) {
  throw new Error('Template not found')
}
```

**Parameter Validation Errors**
```typescript
// Check parameter definitions match provided values
const validation = await engine.validateParameters(template, parameters, context)
if (!validation.isValid) {
  console.log('Validation errors:', validation.errors)
}
```

**Generation Performance Issues**
```typescript
// Use appropriate optimization level
const options = {
  optimizationLevel: 'aggressive',
  optimizationTargets: ['performance'],
  useCache: true
}
```

## 📚 Additional Resources

- [API Documentation](./docs/api.md)
- [Template Examples](./examples/)
- [Migration Guide](./docs/migration.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## 📄 License

Apache 2.0 - See [LICENSE](./LICENSE) file for details.