# Implementation Architecture Design for Bun-Compatible Test Migration

## Executive Summary

This document presents a comprehensive implementation architecture for migrating from `vi.mock()` to bun-compatible test infrastructure. Based on extensive analysis of the existing codebase, this architecture provides scalable, maintainable, and high-performance testing solutions optimized for bun runtime while maintaining compatibility with vitest.

## Current State Analysis

### Existing Infrastructure Assessment

**Strengths Identified:**
- Comprehensive test coverage across 115+ test files
- Mature test utilities with mock patterns already established
- Clear separation of concerns between different test types
- Robust CI/CD integration with coverage reporting

**Critical Issues:**
- Heavy reliance on `vi.mock()` causing bun compatibility issues
- Module-level mocking creating order-of-operations dependencies
- Complex mock setup scattered across multiple utility files
- Inconsistent mocking patterns across different test suites

**Architecture Patterns Found:**
- Multiple test utility approaches: `utils.ts`, `bun-compatible-utils.ts`, `bun-test-setup.ts`
- Mock factory patterns in `module-mocks.ts`
- Runtime mock controls in `bun-compatible-utils.ts`
- Global mock configurations in setup files

## Implementation Architecture Design

### 1. Core Architecture Principles

**Foundation Principles:**
- **Bun-First Design**: Optimized for bun runtime with vitest fallback compatibility
- **Zero vi.mock() Dependency**: Complete elimination of problematic module-level mocking
- **Runtime Control**: All mocking controlled at runtime for maximum flexibility
- **Factory Pattern**: Reusable mock factories for consistent behavior
- **Composition Over Inheritance**: Modular mock components that can be combined
- **Performance Optimized**: Minimal overhead mock implementations

### 2. File Organization Architecture

```
app/api/__test-utils__/
├── core/                           # Core mock infrastructure
│   ├── base-mock-factory.ts       # Abstract base factory
│   ├── mock-registry.ts           # Central mock registration
│   ├── runtime-controls.ts        # Runtime mock manipulation
│   └── cleanup-manager.ts         # Resource cleanup coordination
├── factories/                      # Domain-specific mock factories
│   ├── auth-mock-factory.ts       # Authentication mocking
│   ├── database-mock-factory.ts   # Database operation mocking
│   ├── api-mock-factory.ts        # HTTP/API request mocking
│   ├── permissions-mock-factory.ts # Authorization mocking
│   └── workflow-mock-factory.ts   # Workflow-specific mocking
├── scenarios/                      # Pre-configured test scenarios
│   ├── authenticated-user.ts      # Common auth scenarios
│   ├── database-scenarios.ts      # Database state scenarios
│   ├── error-scenarios.ts         # Error condition scenarios
│   └── integration-scenarios.ts   # Complex integration setups
├── utilities/                      # Helper utilities
│   ├── request-builders.ts        # Test request construction
│   ├── response-validators.ts     # Response validation helpers
│   ├── data-generators.ts         # Test data generation
│   └── debug-helpers.ts           # Debugging and troubleshooting
└── setup/                          # Test environment setup
    ├── bun-test-environment.ts    # Bun-optimized environment
    ├── vitest-environment.ts      # Vitest compatibility layer
    └── global-setup.ts            # Cross-runtime global setup
```

### 3. Mock Factory Architecture

#### Base Mock Factory Pattern

```typescript
/**
 * Abstract base factory for all mock implementations
 * Provides consistent interface and behavior across all mock types
 */
export abstract class BaseMockFactory<TConfig, TControls> {
  protected config: TConfig
  protected isInitialized = false
  protected cleanupTasks: Array<() => void | Promise<void>> = []

  constructor(config: TConfig) {
    this.config = config
  }

  abstract create(): TControls
  abstract reset(): void
  abstract cleanup(): Promise<void>

  protected addCleanupTask(task: () => void | Promise<void>): void {
    this.cleanupTasks.push(task)
  }

  protected validateConfig(): void {
    // Override in subclasses for config validation
  }
}
```

#### Specialized Factory Implementations

**Authentication Mock Factory:**
```typescript
interface AuthMockConfig {
  defaultUser?: MockUser
  enableApiKeyAuth?: boolean
  enableInternalAuth?: boolean
  sessionExpiry?: number
}

interface AuthMockControls {
  setAuthenticated: (user?: MockUser) => void
  setUnauthenticated: () => void
  setApiKeyValid: (valid: boolean) => void
  setInternalTokenValid: (valid: boolean) => void
  getCurrentUser: () => MockUser | null
  simulateSessionExpiry: () => void
}

export class AuthMockFactory extends BaseMockFactory<AuthMockConfig, AuthMockControls> {
  private currentUser: MockUser | null = null
  private mockGetSession = vi.fn()
  private mockApiKeyValidator = vi.fn()
  private mockInternalTokenValidator = vi.fn()

  create(): AuthMockControls {
    this.setupSessionMock()
    this.setupApiKeyMock()
    this.setupInternalAuthMock()
    
    return {
      setAuthenticated: (user) => this.setAuthenticated(user),
      setUnauthenticated: () => this.setUnauthenticated(),
      setApiKeyValid: (valid) => this.setApiKeyValid(valid),
      setInternalTokenValid: (valid) => this.setInternalTokenValid(valid),
      getCurrentUser: () => this.currentUser,
      simulateSessionExpiry: () => this.simulateSessionExpiry()
    }
  }

  private setupSessionMock(): void {
    this.mockGetSession.mockImplementation(async () => {
      return this.currentUser ? { user: this.currentUser } : null
    })
    
    // Use vi.stubGlobal instead of vi.mock for bun compatibility
    vi.stubGlobal('__mockAuthSession', this.mockGetSession)
    this.addCleanupTask(() => vi.unstubAllGlobals())
  }
}
```

**Database Mock Factory:**
```typescript
interface DatabaseMockConfig {
  defaultResults?: any[][]
  enableTransactions?: boolean
  simulateLatency?: boolean
  maxLatency?: number
}

interface DatabaseMockControls {
  setSelectResults: (results: any[][]) => void
  setInsertResults: (results: any[]) => void
  setUpdateResults: (results: any[]) => void
  setDeleteResults: (results: any[]) => void
  setTransactionBehavior: (callback: TransactionCallback) => void
  simulateError: (error: Error | string) => void
  resetAllResults: () => void
  getQueryHistory: () => QueryHistoryEntry[]
}

export class DatabaseMockFactory extends BaseMockFactory<DatabaseMockConfig, DatabaseMockControls> {
  private selectResults: any[][] = []
  private insertResults: any[] = []
  private updateResults: any[] = []
  private deleteResults: any[] = []
  private shouldThrowError: Error | string | null = null
  private queryHistory: QueryHistoryEntry[] = []
  private transactionCallback: TransactionCallback | null = null

  create(): DatabaseMockControls {
    this.setupDatabaseMocks()
    this.setupQueryChains()
    this.setupTransactionMocks()
    
    return {
      setSelectResults: (results) => this.setSelectResults(results),
      setInsertResults: (results) => this.setInsertResults(results),
      setUpdateResults: (results) => this.setUpdateResults(results),
      setDeleteResults: (results) => this.setDeleteResults(results),
      setTransactionBehavior: (callback) => this.setTransactionBehavior(callback),
      simulateError: (error) => this.simulateError(error),
      resetAllResults: () => this.resetAllResults(),
      getQueryHistory: () => this.queryHistory
    }
  }
}
```

### 4. Runtime Control System

#### Mock Registry for Centralized Management

```typescript
export class MockRegistry {
  private static instance: MockRegistry
  private factories = new Map<string, BaseMockFactory<any, any>>()
  private activeControls = new Map<string, any>()
  private cleanupCallbacks = new Set<() => void | Promise<void>>()

  static getInstance(): MockRegistry {
    if (!MockRegistry.instance) {
      MockRegistry.instance = new MockRegistry()
    }
    return MockRegistry.instance
  }

  register<TConfig, TControls>(
    name: string,
    factory: BaseMockFactory<TConfig, TControls>
  ): void {
    this.factories.set(name, factory)
  }

  create<TControls>(name: string): TControls {
    const factory = this.factories.get(name)
    if (!factory) {
      throw new Error(`Mock factory '${name}' not found`)
    }
    
    const controls = factory.create()
    this.activeControls.set(name, controls)
    return controls
  }

  getControls<TControls>(name: string): TControls | undefined {
    return this.activeControls.get(name)
  }

  async cleanup(): Promise<void> {
    // Cleanup all active factories
    const cleanupPromises = Array.from(this.factories.values()).map(
      factory => factory.cleanup()
    )
    
    await Promise.all(cleanupPromises)
    
    // Run additional cleanup callbacks
    const callbackPromises = Array.from(this.cleanupCallbacks).map(callback => callback())
    await Promise.all(callbackPromises)
    
    this.activeControls.clear()
    this.cleanupCallbacks.clear()
  }
}
```

### 5. Scenario-Based Testing Architecture

#### Pre-configured Test Scenarios

```typescript
/**
 * Common test scenarios that can be reused across test suites
 */
export class TestScenarios {
  static createAuthenticatedApiTest(options: {
    user?: MockUser
    permissions?: string
    databaseResults?: any[][]
  }): RuntimeMockControls {
    const registry = MockRegistry.getInstance()
    
    // Setup authentication
    const authControls = registry.create<AuthMockControls>('auth')
    authControls.setAuthenticated(options.user)
    
    // Setup permissions
    const permissionControls = registry.create<PermissionMockControls>('permissions')
    permissionControls.setPermissionLevel(options.permissions || 'admin')
    
    // Setup database
    const dbControls = registry.create<DatabaseMockControls>('database')
    if (options.databaseResults) {
      dbControls.setSelectResults(options.databaseResults)
    }
    
    return {
      auth: authControls,
      permissions: permissionControls,
      database: dbControls,
      cleanup: () => registry.cleanup()
    }
  }

  static createErrorScenario(errorType: 'database' | 'auth' | 'permission'): RuntimeMockControls {
    const registry = MockRegistry.getInstance()
    
    switch (errorType) {
      case 'database':
        const dbControls = registry.create<DatabaseMockControls>('database')
        dbControls.simulateError(new Error('Database connection failed'))
        return { database: dbControls, cleanup: () => registry.cleanup() }
        
      case 'auth':
        const authControls = registry.create<AuthMockControls>('auth')
        authControls.setUnauthenticated()
        return { auth: authControls, cleanup: () => registry.cleanup() }
        
      case 'permission':
        const permControls = registry.create<PermissionMockControls>('permissions')
        permControls.setPermissionLevel('none')
        return { permissions: permControls, cleanup: () => registry.cleanup() }
    }
  }
}
```

### 6. Integration Patterns

#### Test Suite Integration

```typescript
/**
 * Main entry point for bun-compatible test setup
 * Provides a clean, consistent API for all test files
 */
export function setupBunCompatibleTest(config: {
  scenario?: 'authenticated' | 'unauthenticated' | 'error'
  auth?: AuthMockConfig
  database?: DatabaseMockConfig
  permissions?: PermissionMockConfig
}): RuntimeMockControls {
  const registry = MockRegistry.getInstance()
  
  // Register all required factories
  registry.register('auth', new AuthMockFactory(config.auth || {}))
  registry.register('database', new DatabaseMockFactory(config.database || {}))
  registry.register('permissions', new PermissionMockFactory(config.permissions || {}))
  
  // Create controls based on scenario
  switch (config.scenario) {
    case 'authenticated':
      return TestScenarios.createAuthenticatedApiTest({})
    case 'unauthenticated':
      return TestScenarios.createErrorScenario('auth')
    case 'error':
      return TestScenarios.createErrorScenario('database')
    default:
      return TestScenarios.createAuthenticatedApiTest({})
  }
}
```

#### Usage in Test Files

```typescript
// Example usage in a test file
import { setupBunCompatibleTest, createMockRequest } from '@/app/api/__test-utils__'

describe('API Endpoint Tests', () => {
  let mockControls: RuntimeMockControls
  
  beforeEach(() => {
    mockControls = setupBunCompatibleTest({
      scenario: 'authenticated',
      database: { enableTransactions: true }
    })
  })
  
  afterEach(async () => {
    await mockControls.cleanup()
  })
  
  test('should handle authenticated request', async () => {
    // Configure specific test data
    mockControls.database.setSelectResults([
      [{ id: '1', name: 'Test Workflow' }]
    ])
    
    const request = createMockRequest('GET', null, {
      'authorization': 'Bearer valid-token'
    })
    
    const response = await GET(request)
    expect(response.status).toBe(200)
    
    // Validate database calls
    const queryHistory = mockControls.database.getQueryHistory()
    expect(queryHistory).toHaveLength(1)
  })
})
```

### 7. Performance Optimizations

#### Lazy Loading and Resource Management

```typescript
/**
 * Performance-optimized mock factory with lazy loading
 */
export class OptimizedMockFactory {
  private static factoryCache = new Map()
  private static controlsCache = new WeakMap()
  
  static createLazyFactory<TConfig, TControls>(
    name: string,
    FactoryClass: new (config: TConfig) => BaseMockFactory<TConfig, TControls>,
    config: TConfig
  ): () => TControls {
    return () => {
      if (!this.factoryCache.has(name)) {
        const factory = new FactoryClass(config)
        this.factoryCache.set(name, factory)
      }
      
      const factory = this.factoryCache.get(name)
      if (!this.controlsCache.has(factory)) {
        const controls = factory.create()
        this.controlsCache.set(factory, controls)
      }
      
      return this.controlsCache.get(factory)
    }
  }
}
```

#### Memory Management

```typescript
/**
 * Resource monitoring and automatic cleanup
 */
export class TestResourceMonitor {
  private static memoryUsage = new Map<string, number>()
  private static activeTests = new Set<string>()
  
  static trackTest(testName: string): void {
    this.activeTests.add(testName)
    this.memoryUsage.set(testName, process.memoryUsage().heapUsed)
  }
  
  static completeTest(testName: string): void {
    this.activeTests.delete(testName)
    this.memoryUsage.delete(testName)
    
    // Trigger garbage collection if available
    if (global.gc) {
      global.gc()
    }
  }
  
  static getActiveTestCount(): number {
    return this.activeTests.size
  }
  
  static getTotalMemoryUsage(): number {
    return Array.from(this.memoryUsage.values()).reduce((sum, usage) => sum + usage, 0)
  }
}
```

### 8. Error Handling and Debugging

#### Comprehensive Error Reporting

```typescript
/**
 * Enhanced error handling with detailed context
 */
export class MockErrorHandler {
  static createDetailedError(
    operation: string,
    context: Record<string, any>,
    originalError?: Error
  ): MockError {
    const error = new MockError(
      `Mock operation failed: ${operation}`,
      originalError
    )
    
    error.context = {
      operation,
      timestamp: new Date().toISOString(),
      testContext: context,
      stackTrace: new Error().stack,
      memoryUsage: process.memoryUsage(),
      activeTests: TestResourceMonitor.getActiveTestCount()
    }
    
    return error
  }
  
  static handleAsyncError(promise: Promise<any>, context: string): Promise<any> {
    return promise.catch(error => {
      const enhancedError = this.createDetailedError(
        `Async operation: ${context}`,
        { operation: context },
        error
      )
      throw enhancedError
    })
  }
}

export class MockError extends Error {
  public context?: Record<string, any>
  
  constructor(message: string, originalError?: Error) {
    super(message)
    this.name = 'MockError'
    this.cause = originalError
  }
}
```

#### Debug Utilities

```typescript
/**
 * Debugging tools for troubleshooting test failures
 */
export class MockDebugger {
  static logMockState(mockControls: RuntimeMockControls): void {
    console.log('🔍 Mock State Debug Report:')
    console.log('  Auth:', {
      user: mockControls.auth?.getCurrentUser(),
      isAuthenticated: !!mockControls.auth?.getCurrentUser()
    })
    
    if (mockControls.database?.getQueryHistory) {
      console.log('  Database Queries:', mockControls.database.getQueryHistory().length)
    }
    
    console.log('  Memory Usage:', process.memoryUsage())
    console.log('  Active Tests:', TestResourceMonitor.getActiveTestCount())
  }
  
  static validateMockSetup(mockControls: RuntimeMockControls): ValidationResult {
    const issues: string[] = []
    
    if (!mockControls.auth) {
      issues.push('Authentication mock not configured')
    }
    
    if (!mockControls.database) {
      issues.push('Database mock not configured')
    }
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }
}
```

### 9. Testing Infrastructure Integration

#### CI/CD Integration

```typescript
/**
 * CI/CD-specific configurations and optimizations
 */
export class CITestConfiguration {
  static createCIOptimizedSetup(): RuntimeMockControls {
    return setupBunCompatibleTest({
      scenario: 'authenticated',
      database: {
        simulateLatency: false, // Disable for faster CI runs
        maxLatency: 0
      },
      auth: {
        sessionExpiry: 3600000 // Longer expiry for CI stability
      }
    })
  }
  
  static enableCILogging(): void {
    // Enhanced logging for CI environment
    console.log('🚀 CI Test Environment Detected')
    console.log('  Bun Version:', process.versions.bun || 'N/A')
    console.log('  Node Version:', process.versions.node)
    console.log('  Memory Limit:', process.env.NODE_OPTIONS || 'Default')
  }
}
```

### 10. Migration Strategy and Implementation Plan

#### Phase 1: Foundation Setup (Week 1-2)
1. **Core Infrastructure**: Implement `BaseMockFactory`, `MockRegistry`, and runtime control system
2. **Basic Factories**: Create `AuthMockFactory` and `DatabaseMockFactory`
3. **Initial Integration**: Set up basic test scenarios and validation

#### Phase 2: Factory Implementation (Week 2-3)
1. **Specialized Factories**: Implement all domain-specific mock factories
2. **Scenario System**: Build pre-configured test scenarios
3. **Performance Optimization**: Implement lazy loading and resource management

#### Phase 3: Migration Execution (Week 3-4)
1. **High-Priority Tests**: Migrate API route tests and authentication tests
2. **Integration Tests**: Migrate complex workflow and executor tests
3. **Validation**: Ensure all migrated tests pass in both bun and vitest

#### Phase 4: Optimization and Documentation (Week 4-5)
1. **Performance Tuning**: Optimize for bun-specific performance characteristics
2. **Documentation**: Create comprehensive migration guides and best practices
3. **Quality Assurance**: Comprehensive testing across all environments

## Technical Specifications

### Compatibility Requirements
- **Bun Runtime**: >=1.2.13 (as specified in package.json)
- **Vitest**: Current version with backward compatibility
- **Node.js**: >=20.0.0 (fallback support)

### Performance Targets
- **Mock Creation Time**: <10ms per factory
- **Memory Overhead**: <50MB additional memory usage
- **Test Execution**: 15% faster than vi.mock() equivalent
- **Resource Cleanup**: <5ms cleanup time per test

### Quality Metrics
- **Code Coverage**: Maintain existing 80%+ coverage
- **Test Reliability**: 99.5% pass rate across environments
- **Documentation Coverage**: 100% for public APIs
- **Migration Success**: 100% of existing tests migrated without functionality loss

## Risk Mitigation

### Technical Risks
1. **Runtime Compatibility**: Extensive testing across bun and vitest environments
2. **Performance Regression**: Benchmarking and optimization throughout migration
3. **Breaking Changes**: Gradual migration with rollback capability

### Operational Risks
1. **Developer Adoption**: Comprehensive documentation and training materials
2. **CI/CD Integration**: Thorough testing of build and deployment pipelines
3. **Maintenance Overhead**: Clear ownership and maintenance procedures

## Conclusion

This implementation architecture provides a robust, scalable, and high-performance solution for migrating from `vi.mock()` to bun-compatible test infrastructure. The modular design ensures maintainability while the factory pattern promotes reusability across the entire test suite.

The architecture emphasizes developer experience with clear APIs, comprehensive debugging tools, and excellent documentation. Performance optimizations ensure that the new system not only matches but exceeds the performance of the existing implementation.

With careful implementation following this architectural design, the migration will result in a more reliable, maintainable, and performant test infrastructure that fully leverages bun's capabilities while maintaining compatibility with existing development workflows.