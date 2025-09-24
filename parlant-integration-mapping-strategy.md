# PARLANT INTEGRATION MAPPING STRATEGY
## Comprehensive Tool Adapter Implementation Plan

### EXECUTIVE SUMMARY

**Objective:** Create systematic approach to map all 79 Sim tools to Parlant's tool interface
**Methodology:** Progressive complexity implementation with adapter pattern
**Timeline:** 12-week phased approach
**Success Metrics:** 100% tool coverage, maintained functionality, performance optimization

---

## ADAPTER ARCHITECTURE STRATEGY

### Core Adapter Pattern
```typescript
interface ParlantToolAdapter {
  // Sim tool configuration
  simTool: BlockConfig;

  // Parlant tool definition
  parlantTool: {
    name: string;
    description: string;
    input_schema: JSONSchema;
    handler: (params: any) => Promise<any>;
  };

  // Mapping functions
  mapInputs: (parlantParams: any) => SimBlockParams;
  mapOutputs: (simResult: any) => ParlantResult;

  // Validation and error handling
  validateInputs: (params: any) => ValidationResult;
  handleErrors: (error: Error) => ParlantError;
}
```

### Tool Categories Mapping Strategy

## TIER 1 - CRITICAL FOUNDATION TOOLS

### 1. API Block → Parlant HTTP Tool
**Priority: CRITICAL | Complexity: Medium | Timeline: Week 1**

```typescript
// Sim Configuration
subBlocks: [
  { id: 'method', type: 'dropdown', options: ['GET', 'POST', 'PUT', 'DELETE'] },
  { id: 'url', type: 'short-input', required: true },
  { id: 'headers', type: 'json-editor' },
  { id: 'body', type: 'json-editor' }
]

// Parlant Mapping
{
  name: "http_request",
  description: "Make HTTP API requests",
  input_schema: {
    type: "object",
    properties: {
      method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"] },
      url: { type: "string", format: "uri" },
      headers: { type: "object" },
      body: { type: "object" }
    },
    required: ["method", "url"]
  }
}
```

**Implementation Strategy:**
- Direct parameter mapping (1:1)
- Preserve HTTP method validation
- Handle JSON serialization automatically
- Add error handling for network issues

### 2. Condition Block → Parlant Conditional Logic
**Priority: CRITICAL | Complexity: High | Timeline: Week 1-2**

```typescript
// Sim Configuration
subBlocks: [
  { id: 'leftOperand', type: 'short-input' },
  { id: 'operator', type: 'dropdown', options: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'] },
  { id: 'rightOperand', type: 'short-input' },
  { id: 'trueOutput', type: 'json-editor' },
  { id: 'falseOutput', type: 'json-editor' }
]

// Parlant Mapping
{
  name: "conditional_branch",
  description: "Execute conditional logic branching",
  input_schema: {
    type: "object",
    properties: {
      condition: {
        type: "object",
        properties: {
          left: { type: "string" },
          operator: { type: "string", enum: ["eq", "neq", "contains", "gt", "lt"] },
          right: { type: "string" }
        }
      },
      true_branch: { type: "object" },
      false_branch: { type: "object" }
    }
  }
}
```

**Implementation Challenges:**
- Complex condition evaluation logic
- Type coercion handling (string vs number comparisons)
- Nested conditional support
- Error handling for invalid conditions

### 3. Agent Block → Parlant AI Agent
**Priority: CRITICAL | Complexity: Very High | Timeline: Week 2-3**

**Key Mapping Challenges:**
- Multi-model provider support (OpenAI, Anthropic, Google, etc.)
- Tool calling integration
- Memory management
- Response format handling
- Usage control for tools

```typescript
// Simplified Parlant Mapping
{
  name: "ai_agent",
  description: "Execute AI agent with tool access",
  input_schema: {
    type: "object",
    properties: {
      system_prompt: { type: "string" },
      user_prompt: { type: "string" },
      model: { type: "string" },
      available_tools: { type: "array", items: { type: "string" } },
      temperature: { type: "number", minimum: 0, maximum: 2 }
    }
  }
}
```

## TIER 2 - HIGH PRIORITY BUSINESS TOOLS

### 4. Mail Block → Parlant Email Tool
**Priority: HIGH | Complexity: Low | Timeline: Week 3**

```typescript
// Direct mapping - simple transformation
simParams: { to, subject, body }
parlantParams: { recipient, subject, content, html: true }
```

### 5. Slack Block → Parlant Messaging Tool
**Priority: HIGH | Complexity: High | Timeline: Week 3-4**

**Complexity Factors:**
- OAuth authentication flow
- Channel selection logic
- Multiple operations (send, canvas, read)
- Bot vs user token handling

### 6. PostgreSQL Block → Parlant Database Tool
**Priority: HIGH | Complexity: High | Timeline: Week 4**

**Implementation Strategy:**
- Connection string management
- SQL query validation
- Result set formatting
- Transaction support
- Connection pooling

## TIER 3 - MEDIUM PRIORITY INTEGRATION TOOLS

### 7. GitHub Block → Parlant Code Repository Tool
**Priority: MEDIUM-HIGH | Complexity: High | Timeline: Week 5**

### 8. Google Sheets Block → Parlant Spreadsheet Tool
**Priority: MEDIUM-HIGH | Complexity: Medium | Timeline: Week 5-6**

### 9. File Block → Parlant File Processing Tool
**Priority: MEDIUM-HIGH | Complexity: Medium | Timeline: Week 6**

---

## TECHNICAL IMPLEMENTATION PATTERNS

### Pattern 1: Simple Parameter Mapping
**For tools like:** Mail, SMS, basic API calls

```typescript
class SimpleToolAdapter implements ParlantToolAdapter {
  mapInputs(parlantParams: any): SimBlockParams {
    return {
      // Direct field mapping
      to: parlantParams.recipient,
      subject: parlantParams.subject,
      body: parlantParams.content
    };
  }

  mapOutputs(simResult: any): ParlantResult {
    return {
      success: simResult.success,
      message: simResult.message || 'Operation completed'
    };
  }
}
```

### Pattern 2: OAuth Authentication Wrapper
**For tools like:** Gmail, Slack, Google*, Microsoft*

```typescript
class OAuthToolAdapter implements ParlantToolAdapter {
  async validateAuth(params: any): Promise<AuthResult> {
    // Handle OAuth token validation
    // Refresh tokens if needed
    // Return authentication status
  }

  mapInputs(parlantParams: any): SimBlockParams {
    return {
      ...parlantParams,
      credential: await this.getAuthToken(parlantParams.user_id)
    };
  }
}
```

### Pattern 3: Complex Configuration Adapter
**For tools like:** Agent, Database tools, Web automation

```typescript
class ComplexToolAdapter implements ParlantToolAdapter {
  mapInputs(parlantParams: any): SimBlockParams {
    // Complex parameter transformation
    // Configuration object building
    // Validation logic
    return transformedParams;
  }

  async executeWithRetry(params: any): Promise<any> {
    // Retry logic
    // Error recovery
    // State management
  }
}
```

---

## ERROR HANDLING STRATEGY

### Standardized Error Categories
1. **Authentication Errors** - OAuth, API key issues
2. **Validation Errors** - Invalid parameters, missing fields
3. **Network Errors** - Timeout, connection issues
4. **Service Errors** - External API failures
5. **Processing Errors** - Data transformation failures

### Error Mapping Pattern
```typescript
class ErrorMapper {
  static mapSimError(simError: SimError): ParlantError {
    return {
      type: this.categorizeError(simError),
      message: this.humanizeError(simError),
      details: simError.details,
      retryable: this.isRetryable(simError),
      suggested_action: this.getSuggestedAction(simError)
    };
  }
}
```

---

## VALIDATION STRATEGY

### Input Validation Layers
1. **Schema Validation** - JSON Schema compliance
2. **Business Logic Validation** - Domain-specific rules
3. **Security Validation** - Input sanitization
4. **Integration Validation** - External service compatibility

### Validation Implementation
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitized_input: any;
}

class ToolValidator {
  validateInput(tool: string, params: any): ValidationResult {
    // Multi-layer validation
    // Return comprehensive result
  }
}
```

---

## PERFORMANCE OPTIMIZATION

### Caching Strategy
1. **Authentication Tokens** - Cache OAuth tokens, API keys
2. **Configuration Data** - Cache tool configurations
3. **Result Caching** - Cache expensive operations
4. **Connection Pooling** - Reuse database connections

### Async Operation Handling
```typescript
class AsyncToolAdapter {
  async execute(params: any): Promise<ToolResult> {
    // Handle long-running operations
    // Provide progress updates
    // Support cancellation
  }
}
```

---

## TESTING STRATEGY

### Test Categories
1. **Unit Tests** - Individual adapter functionality
2. **Integration Tests** - End-to-end tool execution
3. **Performance Tests** - Load and stress testing
4. **Security Tests** - Authentication and authorization

### Test Implementation Pattern
```typescript
describe('ToolAdapter', () => {
  test('maps inputs correctly', () => {
    const adapter = new MailToolAdapter();
    const result = adapter.mapInputs(parlantParams);
    expect(result).toMatchSimFormat();
  });

  test('handles errors gracefully', () => {
    // Error handling tests
  });

  test('validates authentication', () => {
    // Auth validation tests
  });
});
```

---

## DEPLOYMENT STRATEGY

### Phased Rollout
1. **Phase 1** - Critical tools (API, Condition, Agent)
2. **Phase 2** - High-priority business tools
3. **Phase 3** - Integration and productivity tools
4. **Phase 4** - Specialized and research tools

### Monitoring and Observability
```typescript
class ToolMetrics {
  trackExecution(tool: string, duration: number, success: boolean): void {
    // Track tool performance
    // Monitor success rates
    // Alert on failures
  }
}
```

---

## MIGRATION STRATEGY

### Backward Compatibility
- Maintain Sim tool interface during transition
- Provide dual operation mode
- Gradual feature migration
- Comprehensive testing at each stage

### Data Migration
- Configuration migration utilities
- User authentication transfer
- Workflow state preservation
- Error handling during transition

This comprehensive mapping strategy provides the roadmap for systematically migrating all 79 Sim tools to Parlant while maintaining functionality, performance, and user experience.