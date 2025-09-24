# Universal Tool Adapter - Comprehensive Error Handling System

## Overview

The Universal Tool Adapter's error handling system is designed to transform failures into learning opportunities, providing intelligent error management, user-friendly explanations, and automated recovery mechanisms. This system builds upon the existing error handling infrastructure to provide specialized tool-specific error management.

## Key Features

### 🔍 Intelligent Error Classification
- **Tool-Specific Categories**: Errors are classified into tool-specific categories like parameter validation, authentication failures, execution timeouts, and configuration issues
- **Severity Assessment**: Automatic severity and impact assessment based on error characteristics
- **Pattern Recognition**: Identifies common error patterns and provides targeted solutions

### 🤖 Automated Recovery Mechanisms
- **Intelligent Retries**: Exponential backoff with jitter to prevent thundering herd problems
- **Circuit Breakers**: Automatic failure detection and circuit breaking to prevent cascade failures
- **Fallback Strategies**: Alternative approaches when primary operations fail
- **Graceful Degradation**: Continued operation with reduced functionality when appropriate

### 👨‍💻 User-Friendly Explanations
- **Skill-Level Adaptation**: Explanations tailored to user skill levels (Beginner, Intermediate, Advanced, Developer)
- **Interactive Tutorials**: Step-by-step recovery guidance
- **Contextual Help**: Relevant documentation and resources
- **Multiple Formats**: Brief, detailed, interactive, and technical explanation formats

### 🛡️ Proactive Error Prevention
- **Pre-Execution Validation**: Validates parameters and system state before tool execution
- **Common Pattern Detection**: Identifies and warns about patterns that commonly lead to errors
- **Configuration Validation**: Ensures tool configurations are valid before execution
- **Resource Availability Checks**: Verifies required resources are available

### 📊 Error Analytics & Learning
- **Pattern Analysis**: Tracks error frequency and identifies recurring issues
- **User Behavior Learning**: Adapts to individual user patterns and preferences
- **Tool Reliability Metrics**: Monitors tool success rates and performance
- **Recommendation Engine**: Provides actionable recommendations based on analytics

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 Comprehensive Tool Error Manager                │
├─────────────────────────────────────────────────────────────────┤
│  • Error Classification & Handling                             │
│  • User-Friendly Explanations                                  │
│  • Recovery Tutorial Generation                                │
│  • Error Analytics & Pattern Detection                         │
│  • Machine Learning & User Feedback                            │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Adapter Error Integration                    │
├─────────────────────────────────────────────────────────────────┤
│  • Error-Aware Parameter Mapping                               │
│  • Error-Aware Result Formatting                               │
│  • Error-Aware Execution Wrapper                               │
│  • Integration Decorators                                      │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              Existing Error Handling Foundation                 │
├─────────────────────────────────────────────────────────────────┤
│  • Error Handler (BaseToolError classes)                       │
│  • Error Taxonomy (Classification system)                      │
│  • Error Recovery (Retry mechanisms)                           │
│  • Error Explanations (User-friendly messages)                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Basic Error Handling

```typescript
import { handleToolError } from './error-handling/comprehensive-error-manager'
import type { AdapterExecutionContext, ErrorHandlingConfig } from './types/adapter-interfaces'

const context: AdapterExecutionContext = {
  executionId: 'exec-123',
  toolId: 'gmail-tool',
  userId: 'user-456',
  workspaceId: 'workspace-789',
  // ... other context properties
}

const errorConfig: ErrorHandlingConfig = {
  strategies: {
    validation: 'strict',
    execution: 'retry',
    timeout: 'partial'
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 1000
  }
}

try {
  // Your tool operation
  await someToolOperation()
} catch (error) {
  const result = await handleToolError(error as Error, context, errorConfig)

  console.log('Error handled:', result.handled)
  console.log('Recovery attempted:', result.recovery)
  console.log('User message:', result.explanation.userMessage)
  console.log('Should retry:', result.shouldRetry)
  console.log('Retry delay:', result.retryDelay)
}
```

### 2. Proactive Validation

```typescript
import { validateBeforeExecution } from './error-handling/comprehensive-error-manager'

const parameters = {
  email: 'user@example.com',
  subject: 'Test Email',
  body: 'Hello, this is a test email.'
}

const validation = await validateBeforeExecution(context, parameters, adapterConfig)

if (!validation.valid) {
  console.log('Validation failed:', validation.blockingIssues)
  return // Don't proceed with execution
}

if (validation.warnings.length > 0) {
  console.log('Warnings:', validation.warnings)
  console.log('Suggestions:', validation.suggestions)
}

// Proceed with tool execution
```

### 3. Error-Aware Integration

```typescript
import {
  ErrorAwareExecutionWrapper,
  withErrorHandling
} from './error-handling/adapter-error-integration'

const executionWrapper = new ErrorAwareExecutionWrapper()

// Execute with full pipeline (parameter mapping + execution + result formatting)
const result = await executionWrapper.executeWithFullPipeline(
  simTool,
  parlantParameters,
  context,
  adapterConfig
)

// Or use the decorator approach
class MyAdapter {
  @withErrorHandling({
    retry: { maxAttempts: 3, backoffMs: 1000 }
  })
  async executeOperation(context: AdapterExecutionContext, params: any) {
    // Your operation logic here
    return await this.performOperation(params)
  }
}
```

### 4. Recovery Tutorials

```typescript
import { generateRecoveryTutorial } from './error-handling/comprehensive-error-manager'
import { UserSkillLevel } from '../../../parlant-server/error-explanations'

// Generate a recovery tutorial for a specific error
const tutorial = await generateRecoveryTutorial(
  'error-123',
  UserSkillLevel.INTERMEDIATE
)

console.log('Tutorial:', tutorial.title)
console.log('Estimated time:', tutorial.estimatedTime)
console.log('Steps:')
tutorial.steps.forEach((step, index) => {
  console.log(`${index + 1}. ${step.title}`)
  console.log(`   ${step.description}`)
  console.log(`   Expected result: ${step.expectedResult}`)
})
```

### 5. Error Analytics

```typescript
import { comprehensiveToolErrorManager } from './error-handling/comprehensive-error-manager'

// Get error analytics for the last 24 hours
const analytics = comprehensiveToolErrorManager.getErrorAnalytics(24)

console.log('Total errors:', analytics.totalErrors)
console.log('Errors by category:', analytics.errorsByCategory)
console.log('Top failing tools:', analytics.topFailingTools)
console.log('Common patterns:', analytics.commonPatterns)
console.log('Recommendations:', analytics.recommendations)
```

## Error Categories

### Tool-Specific Error Categories

| Category | Description | Common Causes |
|----------|-------------|---------------|
| `PARAMETER_VALIDATION` | Invalid or missing parameters | Required fields missing, wrong data types, out-of-range values |
| `TOOL_CONFIGURATION` | Tool setup issues | Missing API keys, invalid endpoints, configuration conflicts |
| `TOOL_EXECUTION_TIMEOUT` | Operations taking too long | Network latency, large data processing, service overload |
| `TOOL_AUTHENTICATION_FAILURE` | Authentication problems | Expired tokens, invalid credentials, insufficient permissions |
| `TOOL_RATE_LIMIT` | API rate limiting | Too many requests, quota exceeded, burst limits |
| `TOOL_DEPENDENCY_FAILURE` | External service issues | Service unavailable, database connection failed, API errors |
| `TOOL_OUTPUT_VALIDATION` | Invalid tool responses | Malformed data, unexpected format, missing required fields |
| `TOOL_VERSION_MISMATCH` | Version compatibility issues | API version changes, deprecated endpoints, breaking changes |
| `TOOL_RESOURCE_EXHAUSTION` | System resource limits | Memory exhaustion, CPU overload, disk space |
| `TOOL_NETWORK_ERROR` | Network connectivity issues | Connection timeouts, DNS resolution, firewall blocks |

## User Skill Levels

The system adapts explanations and solutions based on user skill levels:

### Beginner
- **Language**: Simple, non-technical terms
- **Solutions**: Step-by-step GUI instructions
- **Focus**: What to do, not why it works
- **Resources**: Video tutorials, visual guides

### Intermediate
- **Language**: Some technical terms with explanations
- **Solutions**: Mix of GUI and basic CLI instructions
- **Focus**: Understanding the problem and solution
- **Resources**: Documentation, tutorials, forums

### Advanced
- **Language**: Technical terminology
- **Solutions**: CLI commands, configuration files
- **Focus**: Root cause analysis and prevention
- **Resources**: Technical documentation, API references

### Developer
- **Language**: Full technical detail
- **Solutions**: Code examples, configuration changes
- **Focus**: Implementation details and debugging
- **Resources**: Source code, technical specifications

## Configuration

### Error Handling Configuration

```typescript
interface ErrorHandlingConfig {
  strategies?: {
    validation?: 'strict' | 'lenient' | 'custom'
    execution?: 'retry' | 'fail' | 'custom'
    timeout?: 'fail' | 'partial' | 'custom'
  }

  retry?: {
    maxAttempts: number
    backoffMs: number
    retryableErrorCodes?: number[]
  }

  customHandlers?: {
    [errorType: string]: (error: Error, context: any) => Promise<any>
  }

  userFriendlyMessages?: {
    [errorPattern: string]: string
  }
}
```

### Adapter Configuration with Error Handling

```typescript
const adapterConfig: AdapterConfiguration = {
  parlantId: 'my-tool-adapter',
  displayName: 'My Tool',
  description: 'Custom tool adapter',

  errorHandling: {
    strategies: {
      validation: 'strict',
      execution: 'retry',
      timeout: 'partial'
    },
    retry: {
      maxAttempts: 3,
      backoffMs: 1000,
      retryableErrorCodes: [408, 429, 500, 502, 503]
    },
    userFriendlyMessages: {
      'timeout': 'The operation is taking longer than expected',
      'authentication': 'Please verify your login credentials',
      'rate_limit': 'Too many requests. Please wait before trying again'
    }
  },

  // Other configuration options...
}
```

## Best Practices

### 1. Error Classification
- **Be Specific**: Use the most specific error category available
- **Provide Context**: Include relevant context information in error messages
- **Chain Errors**: Preserve original error information while adding context

### 2. Recovery Strategies
- **Fail Fast**: Don't retry non-recoverable errors
- **Exponential Backoff**: Use exponential backoff with jitter for retries
- **Circuit Breakers**: Implement circuit breakers for external dependencies
- **Graceful Degradation**: Provide fallback functionality when possible

### 3. User Experience
- **Clear Messages**: Write error messages in plain language
- **Actionable Guidance**: Provide specific steps users can take to resolve issues
- **Progressive Disclosure**: Show basic information first, with options to see more detail
- **Consistent Terminology**: Use consistent language across all error messages

### 4. Monitoring and Analytics
- **Track Patterns**: Monitor error patterns to identify systemic issues
- **User Feedback**: Collect and act on user feedback about error experiences
- **Performance Metrics**: Track error handling performance and impact
- **Continuous Improvement**: Regularly review and improve error handling based on data

## Advanced Features

### Custom Error Handlers

```typescript
const customErrorHandling: ErrorHandlingConfig = {
  customHandlers: {
    'custom_validation_error': async (error: Error, context: any) => {
      // Custom validation error handling
      console.log('Custom validation error:', error.message)
      return { handled: true, recovery: false }
    },

    'external_service_error': async (error: Error, context: any) => {
      // Custom external service error handling
      await notifyExternalServiceTeam(error)
      return { handled: true, recovery: true }
    }
  }
}
```

### Error Pattern Recognition

```typescript
// The system automatically detects patterns like:
// - Authentication failure bursts
// - Timeout cascades
// - Configuration-related errors
// - Resource exhaustion patterns

// You can add custom patterns:
comprehensiveToolErrorManager.addCustomPattern({
  id: 'my-custom-pattern',
  name: 'My Custom Error Pattern',
  description: 'Detects custom error conditions',
  condition: (error, context) => {
    return error.message.includes('custom-condition')
  },
  recommendation: 'Check custom configuration settings'
})
```

### Machine Learning Integration

The system includes hooks for machine learning integration:

```typescript
// Train the system with user feedback
await comprehensiveToolErrorManager.trainWithFeedback('error-123', 'user-456', {
  wasHelpful: true,
  preferredSkillLevel: UserSkillLevel.ADVANCED,
  successfulResolution: 'Updated configuration file',
  suggestedImprovement: 'Include more specific troubleshooting steps'
})
```

## Testing

The system includes comprehensive tests covering:

- Error classification accuracy
- Recovery mechanism effectiveness
- User explanation quality
- Performance under load
- Edge case handling
- Integration with adapter components

Run tests with:
```bash
npm test -- packages/universal-tool-adapter/src/error-handling/__tests__/
```

## Contributing

When adding new error handling features:

1. **Follow Existing Patterns**: Use the established architecture and interfaces
2. **Add Tests**: Include comprehensive tests for new functionality
3. **Update Documentation**: Keep this documentation current
4. **Consider User Experience**: Think about how errors affect end users
5. **Performance Impact**: Consider the performance impact of new features

## Troubleshooting

### Common Issues

**Q: Error handling seems slow**
A: Check if you have debug logging enabled. Disable unnecessary logging in production.

**Q: User explanations aren't skill-level appropriate**
A: Verify user skill level detection. You may need to explicitly set the skill level or train the system with user feedback.

**Q: Retries aren't working as expected**
A: Check the retry configuration and ensure error categories are correctly classified as retryable.

**Q: Custom error handlers aren't being called**
A: Verify the error pattern matching in your custom handler configuration.

### Debugging

Enable debug logging to troubleshoot issues:

```typescript
process.env.LOG_LEVEL = 'debug'
```

This will provide detailed information about:
- Error classification decisions
- Recovery attempt details
- User skill level detection
- Pattern matching results

## Support

For additional support or questions about the error handling system:

1. Check the existing error handling foundation documentation
2. Review the test cases for usage examples
3. Submit issues through the project's issue tracking system
4. Contribute improvements through pull requests

Remember: The goal is to transform every error into a learning opportunity that helps users become more successful with the tools.