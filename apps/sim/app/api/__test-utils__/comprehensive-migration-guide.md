# 🚀 Comprehensive API Test Migration Guide

## Overview

This comprehensive guide provides systematic migration patterns, specialized templates, and helper utilities for migrating API tests to bun/vitest 3.x compatible patterns with 90%+ pass rates.

## 📁 Template Library

### Core Migration Template
- **File**: `migration-template.test.ts`
- **Use Case**: General-purpose API endpoint migration
- **Features**: Authentication, database mocking, comprehensive logging
- **Best For**: Standard REST API endpoints

### Specialized Templates

#### 🔐 Authentication API Template
- **File**: `templates/auth-api-template.test.ts`
- **Use Case**: Login, registration, password management
- **Features**: Session handling, OAuth flows, password validation, security testing
- **Best For**: Authentication endpoints, user management APIs

#### 📊 CRUD API Template  
- **File**: `templates/crud-api-template.test.ts`
- **Use Case**: Create, Read, Update, Delete operations
- **Features**: Database operations, pagination, filtering, bulk operations
- **Best For**: Resource management APIs, data manipulation endpoints

#### 📁 File Upload API Template
- **File**: `templates/file-upload-api-template.test.ts`
- **Use Case**: File uploads, downloads, media processing
- **Features**: Multipart handling, file validation, storage mocking, image processing
- **Best For**: File management, media APIs, document processing

#### 🌐 External Integration Template
- **File**: `templates/external-integration-template.test.ts`
- **Use Case**: Third-party API integrations, webhooks
- **Features**: External API mocking, webhook validation, OAuth, rate limiting
- **Best For**: Payment APIs, notification services, third-party integrations

## 🔧 Utility Infrastructure

### Migration Helpers
- **File**: `migration-helpers.ts`
- **Purpose**: Reusable utilities for common migration patterns
- **Exports**: `migrationHelpers` object with comprehensive utilities

### Module Mocks
- **File**: `module-mocks.ts`
- **Purpose**: Bun/vitest 3.x compatible mocking infrastructure
- **Exports**: `mockControls` for runtime mock management

### Enhanced Utils
- **File**: `enhanced-utils.ts`
- **Purpose**: Backward compatibility and enhanced testing patterns
- **Exports**: Enhanced versions of existing test utilities

## 📋 Migration Process

### Step 1: Choose the Right Template

```bash
# For general API endpoints
cp migration-template.test.ts your-endpoint/route.test.ts

# For authentication endpoints
cp templates/auth-api-template.test.ts auth/login/route.test.ts

# For CRUD operations
cp templates/crud-api-template.test.ts users/route.test.ts

# For file operations
cp templates/file-upload-api-template.test.ts files/upload/route.test.ts

# For external integrations
cp templates/external-integration-template.test.ts webhooks/stripe/route.test.ts
```

### Step 2: Template Customization

1. **Replace Placeholders**:
   - `[ENDPOINT_NAME]` → Actual endpoint name
   - `[RESOURCE_NAME]` → Resource being managed
   - `[AUTH_ENDPOINT]` → Authentication endpoint type
   - `[FILE_ENDPOINT]` → File operation type
   - `[INTEGRATION_NAME]` → External service name

2. **Import Route Handlers**:
   ```typescript
   // Replace template imports
   import { GET, POST, PUT, DELETE } from './route'
   ```

3. **Configure Test Data**:
   ```typescript
   // Update sample data to match your domain
   const sampleData = {
     id: 'your-resource-123',
     name: 'Your Resource Name',
     // ... other fields
   }
   ```

### Step 3: Migration Helper Integration

```typescript
import { migrationHelpers } from '@/app/api/__test-utils__/migration-helpers'

const { setupTestEnvironment, createRequestBuilder, validateResponse } = migrationHelpers

describe('Your API Tests', () => {
  const requestBuilder = createRequestBuilder('http://localhost:3000/api/your-endpoint')

  beforeEach(() => {
    setupTestEnvironment({
      auth: { user: migrationHelpers.createDefaultTestUser() },
      database: { selectResults: [[sampleData]] },
      logging: true,
    })
  })

  it('should handle requests properly', async () => {
    const request = requestBuilder({ method: 'GET' })
    const response = await GET(request)
    
    await validateResponse(response, {
      expectedStatus: 200,
      requiredFields: ['id', 'name'],
      typeChecks: { id: 'string', name: 'string' },
    })
  })
})
```

### Step 4: Validation and Testing

```bash
# Run individual test file
bun test your-endpoint/route.test.ts

# Run with debug logging
DEBUG=true bun test your-endpoint/route.test.ts

# Validate migration checklist
# Follow migration-checklist.md step by step
```

## 🎯 Advanced Migration Patterns

### Complete Workflow Integration

```typescript
import { migrationHelpers } from '@/app/api/__test-utils__/migration-helpers'
import { GET, POST, PUT, DELETE } from './route'

const workflow = migrationHelpers.createMigrationWorkflow(
  'http://localhost:3000/api/your-endpoint',
  { GET, POST, PUT, DELETE }
)

describe('Complete API Test Suite', () => {
  const testSuite = workflow.generateTestSuite({
    authentication: true,
    crud: true,
    pagination: true,
    validation: true,
    performance: true,
    errorHandling: true,
  })

  describe('Authentication', () => {
    it('should pass all auth scenarios', async () => {
      await testSuite.runAuthenticationTests()
    })
  })

  describe('CRUD Operations', () => {
    it('should pass all CRUD scenarios', async () => {
      await testSuite.runCrudTests()
    })
  })

  describe('Performance', () => {
    it('should meet performance requirements', async () => {
      await testSuite.runPerformanceTests()
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      await testSuite.runErrorHandlingTests()
    })
  })
})
```

### Specialized Testing Patterns

#### Authentication Heavy APIs
```typescript
const authScenarios = migrationHelpers.createAuthTestScenarios(requestBuilder)

// Test all authentication methods
await authScenarios.testUnauthenticated(handler)
await authScenarios.testSessionAuth(handler, customUser)
await authScenarios.testApiKeyAuth(handler, 'custom-api-key')
await authScenarios.testJwtAuth(handler, 'custom-jwt-token')
await authScenarios.testInvalidCredentials(handler)
```

#### Database Heavy APIs
```typescript
const dbScenarios = migrationHelpers.createDatabaseTestScenarios()

// Set up complex database scenarios
const paginationData = dbScenarios.setupPaginationScenario(100, 2, 10)
const filteredData = dbScenarios.setupFilteringScenario(allItems, { status: 'active' })
const errorScenario = dbScenarios.setupErrorScenario('connection')
```

#### Performance Critical APIs
```typescript
const performanceHelpers = migrationHelpers.createPerformanceHelpers()

// Comprehensive performance testing
await performanceHelpers.testResponseTime(operation, 1000, 'Critical API')
await performanceHelpers.testConcurrentRequests(operationFactory, 10, 'Load Test')
const benchmark = await performanceHelpers.benchmarkOperation(operation, 50, 'Benchmark')
```

## 🏗️ Architecture Patterns

### Template Selection Matrix

| API Type | Template | Key Features |
|----------|----------|-------------|
| User Management | `auth-api-template.test.ts` | Authentication flows, password validation, session management |
| Data Resources | `crud-api-template.test.ts` | Full CRUD operations, pagination, filtering, sorting |
| File Operations | `file-upload-api-template.test.ts` | Multipart handling, file validation, storage mocking |
| External Services | `external-integration-template.test.ts` | API mocking, webhook processing, OAuth flows |
| General Purpose | `migration-template.test.ts` | Basic patterns, authentication, database mocking |

### Mock Configuration Patterns

#### Simple Authentication Setup
```typescript
setupTestEnvironment({
  auth: { user: createDefaultTestUser() },
  database: { selectResults: [[userData]] },
})
```

#### Complex Multi-Result Database Setup
```typescript
setupTestEnvironment({
  database: {
    selectResults: [
      [userData],           // User lookup
      [permissions],        // Permission check
      [resourceData],       // Main resource query
      [{ count: 10 }],     // Count query
    ],
  },
})
```

#### Error Simulation Setup
```typescript
const errorSimulator = migrationHelpers.createErrorSimulator()

errorSimulator.simulateDatabaseError('Connection failed')
errorSimulator.simulateAuthFailure()
errorSimulator.simulatePermissionDenial('read')

const restoreNetwork = errorSimulator.simulateNetworkTimeout()
// ... test network failure scenarios
restoreNetwork()
```

## 📊 Quality Assurance

### Success Metrics
- ✅ **90%+ test pass rate** (required for migration approval)
- ✅ **< 5 seconds execution time** per test file
- ✅ **Complete test isolation** (no interdependencies)
- ✅ **Comprehensive logging** for debugging
- ✅ **Production-ready patterns** (no placeholders)

### Validation Checklist
1. **Template Applied**: Correct template chosen and customized
2. **Imports Configured**: Module mocks imported first, handlers imported after
3. **Test Data Updated**: Sample data matches actual domain model
4. **Authentication Tested**: All relevant auth patterns implemented
5. **Database Mocked**: Proper database operation simulation
6. **Error Handling**: Graceful error scenarios covered
7. **Performance Validated**: Response times within acceptable limits
8. **Migration Guide Followed**: All checklist items completed

### Common Pitfalls and Solutions

#### ❌ Import Order Issues
```typescript
// Wrong - handlers imported before mocks
import { GET, POST } from './route'
import '@/app/api/__test-utils__/module-mocks'

// Correct - mocks imported first
import '@/app/api/__test-utils__/module-mocks'
import { mockControls } from '@/app/api/__test-utils__/module-mocks'
import { GET, POST } from './route'
```

#### ❌ Mock State Leakage
```typescript
// Wrong - missing cleanup
describe('Tests', () => {
  it('test 1', async () => {
    mockControls.setAuthUser(user1)
    // ... test logic
  })
  
  it('test 2', async () => {
    // user1 still set from previous test!
    // ... test logic
  })
})

// Correct - proper cleanup
describe('Tests', () => {
  beforeEach(() => {
    mockControls.reset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })
})
```

#### ❌ Insufficient Database Mocking
```typescript
// Wrong - database returns undefined/empty unexpectedly
mockControls.setDatabaseResults([[]])

// Correct - provide expected data structure
mockControls.setDatabaseResults([
  [expectedUserData],      // First query result
  [expectedResourceData],  // Second query result  
  [{ count: 5 }],         // Count query result
])
```

## 🚀 Deployment and Maintenance

### Integration with CI/CD
```bash
# Add to package.json scripts
"test:migration": "bun test app/api/**/*.test.ts --reporter=verbose",
"test:migration:watch": "bun test app/api/**/*.test.ts --watch",
"test:migration:coverage": "bun test app/api/**/*.test.ts --coverage"

# CI/CD pipeline validation
- run: bun test app/api/**/*.test.ts
  env:
    NODE_ENV: test
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

### Monitoring and Maintenance
1. **Regular Template Updates**: Keep templates current with new patterns
2. **Performance Monitoring**: Track test execution times
3. **Migration Tracking**: Document migration progress and issues
4. **Best Practice Evolution**: Update patterns based on discoveries

### Documentation Maintenance
- **Template Documentation**: Keep template comments current
- **Migration Guide Updates**: Reflect new patterns and learnings
- **Helper Function Documentation**: Document all utility functions
- **Example Updates**: Keep examples relevant and working

## 🏆 Success Stories and Patterns

### High-Success Migration Patterns
1. **Start with Template Selection**: Choose the most specific template
2. **Use Migration Helpers**: Leverage utilities for consistency  
3. **Follow Import Order**: Always import mocks before handlers
4. **Test Incrementally**: Migrate and test one endpoint at a time
5. **Document Discoveries**: Update templates with new patterns

### Recommended Migration Order
1. **Simple GET endpoints** (lowest complexity)
2. **Authentication endpoints** (using auth template)
3. **CRUD operations** (using CRUD template)
4. **File operations** (using file template)
5. **External integrations** (using integration template)
6. **Complex business logic** (using custom patterns)

## 📞 Support and Resources

### Quick Start Commands
```bash
# Initialize new test file from template
cp app/api/__test-utils__/migration-template.test.ts your-endpoint/route.test.ts

# Run single test with full logging
bun test your-endpoint/route.test.ts --verbose

# Validate migration checklist
open app/api/__test-utils__/migration-checklist.md

# Access helper utilities
import { migrationHelpers } from '@/app/api/__test-utils__/migration-helpers'
```

### Template Quick Reference
```typescript
// Essential imports (always include these)
import '@/app/api/__test-utils__/module-mocks'
import { mockControls } from '@/app/api/__test-utils__/module-mocks'
import { migrationHelpers } from '@/app/api/__test-utils__/migration-helpers'

// Essential setup (customize for your needs)
beforeEach(() => {
  const env = migrationHelpers.setupTestEnvironment({
    auth: { user: migrationHelpers.createDefaultTestUser() },
    database: { selectResults: [[yourSampleData]] },
    logging: true,
  })
})

// Essential validation (adapt to your response structure)
const data = await migrationHelpers.validateResponse(response, {
  expectedStatus: 200,
  requiredFields: ['id', 'name'],
  typeChecks: { id: 'string', name: 'string' },
})
```

---

**Migration Guide Version**: 2.0  
**Last Updated**: 2025-09-03  
**Target Success Rate**: 90%+ test pass rate  
**Performance Target**: < 5 seconds per test file  
**Compatibility**: Bun + Vitest 3.x