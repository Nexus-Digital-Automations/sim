# Research Report: Create Standardized API Test Migration Template and Checklist

## Overview

This research analyzes the current API test infrastructure in the sim application and provides comprehensive recommendations for creating a standardized test migration template and checklist that will enable systematic migration of API tests to bun/vitest 3.x compatible patterns.

## Current State Analysis

### Test Infrastructure Assessment

The project has a sophisticated test infrastructure with multiple utility files:

1. **`app/api/__test-utils__/setup.ts`** - Basic Vitest setup with Next.js mocks
2. **`app/api/__test-utils__/utils.ts`** - Comprehensive test utilities (1,442 lines)
3. **`app/api/__test-utils__/bun-compatible-utils.ts`** - Bun/Vitest 3.x compatible utilities (477 lines)
4. **`app/api/__test-utils__/module-mocks.ts`** - Module-level mocks for bun compatibility (481 lines)

### Current Test Patterns Identified

#### Successful Pattern (bun-compatible):
- Uses `vi.mock()` with factory functions at module level
- Runtime mock controls through exported functions
- Comprehensive logging and debugging
- Chainable database mock operations
- Clear separation of concerns

#### Legacy Pattern (needs migration):
- Uses `vi.doMock()` (incompatible with bun/vitest 3.x)
- Runtime module manipulation
- Inconsistent mock setup
- Limited debugging capabilities

### Test File Analysis

**Total API test files found**: 66 route test files
**Successful bun-compatible file**: `route.bun-compatible.test.ts` (646 lines)
**Legacy file example**: `route.test.ts` (partially migrated, still uses old patterns)

## Research Findings

### Key Migration Challenges Identified

1. **Module Mocking Incompatibility**
   - `vi.doMock()` doesn't work reliably with bun/vitest 3.x
   - Need to use `vi.mock()` with factory functions instead
   - Timing issues with module loading order

2. **Authentication Patterns**
   - Session-based authentication
   - API key authentication  
   - Internal JWT token authentication
   - Permission-based access control

3. **Database Mock Complexity**
   - Chainable query operations (select, from, where, limit, etc.)
   - Transaction support
   - Multiple result set handling
   - Error simulation capabilities

4. **Request/Response Patterns**
   - NextRequest creation with various HTTP methods
   - Header handling (Content-Type, Authorization, x-api-key)
   - Body serialization/deserialization
   - URL parameter parsing

### Successful Patterns Analysis

#### Module-Level Mock Setup
```typescript
// ✅ Works with bun/vitest 3.x
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn().mockImplementation(() => {
    return Promise.resolve(mockAuthUser ? { user: mockAuthUser } : null)
  })
}))
```

#### Runtime Mock Controls
```typescript
export const mockControls = {
  setAuthUser: (user: any) => { mockAuthUser = user },
  setUnauthenticated: () => { mockAuthUser = null },
  reset: () => { /* reset all mocks */ }
}
```

#### Comprehensive Database Mocking
- Chainable operations that mirror Drizzle ORM
- Promise-based result handling
- Transaction support
- Call tracking and debugging

## Technical Approaches

### 1. Standardized File Structure

**Template Structure**:
```
[test-file].test.ts
├── Import module mocks FIRST
├── Test data definitions
├── Helper functions
├── Main test suites
│   ├── Authentication tests
│   ├── Input validation tests
│   ├── Business logic tests
│   └── Error handling tests
└── Cleanup hooks
```

### 2. Mock Management Strategy

**Three-Layer Approach**:
1. **Module-level mocks** (`vi.mock()` calls)
2. **Runtime controls** (exported functions for test-specific setup)
3. **Test-specific configuration** (beforeEach/afterEach hooks)

### 3. Authentication Pattern Standardization

**Universal Authentication Test Pattern**:
- Unauthenticated access (401 expected)
- Session-based auth
- API key auth (header: `x-api-key`)
- Internal JWT auth (header: `authorization: Bearer`)
- Permission validation (admin/read/write levels)

### 4. Database Mock Pattern

**Chainable Mock Implementation**:
- All database operations return chainable objects
- Terminal operations resolve with configured data
- Support for multiple result sets (for complex queries)
- Transaction simulation with callback support

## Recommendations

### 1. Migration Template Design

Create a standardized template with:
- **Header section**: Vitest environment and description
- **Import section**: Module mocks first, then test utilities, then route handlers
- **Data section**: Sample data for different test scenarios
- **Helper section**: Request creation and validation functions
- **Test section**: Organized by functional areas
- **Cleanup section**: Proper mock restoration

### 2. Migration Checklist Components

**Pre-Migration Checklist**:
- [ ] Identify authentication patterns used
- [ ] Catalog database operations needed
- [ ] Document expected request/response patterns
- [ ] List external dependencies to mock

**Migration Checklist**:
- [ ] Replace `vi.doMock()` with `vi.mock()`
- [ ] Import module mocks before route handlers
- [ ] Set up runtime mock controls
- [ ] Configure authentication scenarios
- [ ] Set up database mock responses
- [ ] Add comprehensive logging
- [ ] Implement proper cleanup hooks
- [ ] Validate test isolation

**Post-Migration Validation**:
- [ ] All tests pass with `bun test`
- [ ] Tests run in isolation (no interdependencies)
- [ ] Mock state properly reset between tests
- [ ] Comprehensive test coverage maintained
- [ ] Performance acceptable (< 5s per test file)

### 3. Common Anti-Patterns to Avoid

1. **Import Order Issues**
   - ❌ Importing route handlers before mocks
   - ✅ Import mocks first, then utilities, then handlers

2. **Mock State Leakage**
   - ❌ Not resetting mocks between tests
   - ✅ Proper cleanup in afterEach hooks

3. **Async Mock Handling**
   - ❌ Not properly awaiting mock promises
   - ✅ Consistent Promise-based mock returns

4. **Database Chain Breaking**
   - ❌ Incomplete mock chains that don't resolve
   - ✅ Complete chainable mocks with terminal resolution

## Implementation Strategy

### Phase 1: Template Creation
1. Create master template file based on successful patterns
2. Document all standard mock configurations
3. Create reusable helper functions
4. Establish naming conventions

### Phase 2: Pilot Migration
1. Select 3-5 representative test files
2. Apply template to pilot files
3. Validate 90%+ pass rate
4. Document edge cases and solutions

### Phase 3: Systematic Migration
1. Create automated migration tools where possible
2. Migrate files in priority order (failing tests first)
3. Validate each migration before proceeding
4. Update documentation and examples

### Phase 4: Quality Assurance
1. Run full test suite validation
2. Performance benchmarking
3. Documentation updates
4. Developer training materials

## Risk Assessment and Mitigation Strategies

### High Risk Issues
1. **Complex Database Scenarios**: Some tests may have very complex database interaction patterns
   - *Mitigation*: Create specialized database mock configurations for edge cases

2. **External API Dependencies**: Some tests may depend on external services
   - *Mitigation*: Comprehensive external service mocking patterns

3. **Timing-Dependent Tests**: Some tests may have timing dependencies
   - *Mitigation*: Mock time-dependent functions and use deterministic timing

### Medium Risk Issues
1. **Test Performance**: Migration might impact test execution speed
   - *Mitigation*: Performance monitoring and optimization strategies

2. **Mock Complexity**: Some mocks might become overly complex
   - *Mitigation*: Modular mock design with composition patterns

### Low Risk Issues
1. **Developer Adoption**: Team needs to learn new patterns
   - *Mitigation*: Documentation, examples, and training

## References

1. **Vitest Documentation**: https://vitest.dev/guide/mocking.html
2. **Bun Test Runner**: https://bun.sh/docs/cli/test
3. **Next.js Testing Patterns**: https://nextjs.org/docs/app/building-your-application/testing/vitest
4. **Drizzle ORM Testing**: https://orm.drizzle.team/docs/unit-testing

---

**Research Completed**: 2025-09-03  
**Estimated Implementation Time**: 2-3 days for full migration  
**Recommended Priority**: High (enables systematic API test migration)