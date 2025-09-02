# Bun/Vitest 3.x Test Infrastructure Migration Guide

## Overview

This guide explains how to migrate from the existing `vi.doMock()` based test infrastructure to a bun/vitest 3.x compatible approach that uses `vi.mock()` with factory functions.

## The Problem

The current test infrastructure relies on `vi.doMock()` which has compatibility issues with bun and vitest 3.x, causing widespread test failures with 500 errors instead of expected status codes.

### Issues with Current Approach:
- `vi.doMock()` calls don't work reliably in bun/vitest environment
- Module mocks aren't being applied consistently
- Database query chains fail due to missing mock implementations
- Authentication mocks don't intercept session calls properly

## The Solution

New infrastructure using `vi.mock()` with factory functions that:
- Works reliably with bun and vitest 3.x
- Provides runtime control over mock behavior
- Includes comprehensive logging for debugging
- Supports both sync and async mock operations

## Migration Steps

### 1. Import Module Mocks First

In your test files, import the module mocks BEFORE any other imports:

```typescript
// OLD WAY - Don't do this anymore
import { setupComprehensiveTestMocks } from '../__test-utils__/utils'

// NEW WAY - Import module mocks first
import { mockControls, sampleWorkflowData, mockUser } from '../__test-utils__/module-mocks'
import { createMockRequest } from '../__test-utils__/bun-compatible-utils'
```

### 2. Replace setupComprehensiveTestMocks

Replace calls to `setupComprehensiveTestMocks` with the new mock controls:

```typescript
// OLD WAY
beforeEach(() => {
  mocks = setupComprehensiveTestMocks({
    auth: { authenticated: true, user: mockUser },
    database: { select: { results: [sampleWorkflowsList, [{ count: 2 }]] } },
  })
})

// NEW WAY
beforeEach(() => {
  mockControls.reset()
  mockControls.setAuthUser(mockUser)
  mockControls.setDatabaseResults([sampleWorkflowsList, [{ count: 2 }]])
  vi.clearAllMocks()
})
```

### 3. Update Authentication Controls

```typescript
// OLD WAY
mocks.auth.setUnauthenticated()
mocks.auth.setAuthenticated(customUser)

// NEW WAY
mockControls.setUnauthenticated()
mockControls.setAuthUser(customUser)
```

### 4. Update Permission Controls

```typescript
// OLD WAY
vi.mocked(getUserEntityPermissions).mockResolvedValue('admin')

// NEW WAY
mockControls.setPermissionLevel('admin')
```

### 5. Remove vi.doMock Calls

Remove all `vi.doMock()` calls from test files:

```typescript
// OLD WAY - Remove these
vi.doMock('@/lib/auth', () => ({ /* ... */ }))
vi.doMock('@/db', () => ({ /* ... */ }))

// NEW WAY - Handled by module-mocks.ts import
// No need for manual mocking in test files
```

### 6. Update Database Result Setting

```typescript
// OLD WAY
mocks.database.mockDb.select.mockImplementation(() => ({
  from: () => ({ /* complex chain */ })
}))

// NEW WAY
mockControls.setDatabaseResults([
  [workflowResult1, workflowResult2], // First query result
  [{ count: 2 }] // Second query result (count)
])
```

## New File Structure

### Required Files

1. **`app/api/__test-utils__/module-mocks.ts`** - Module-level mocks using vi.mock()
2. **`app/api/__test-utils__/bun-compatible-utils.ts`** - Runtime utilities and helpers
3. **`app/api/__test-utils__/bun-vitest-migration-guide.md`** - This migration guide

### Updated Files

Update existing test files to use the new infrastructure:

```typescript
// Import module mocks FIRST
import { mockControls, sampleData, mockUser } from '../__test-utils__/module-mocks'
import { createMockRequest } from '../__test-utils__/bun-compatible-utils'

// Then import other dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST, PATCH } from './route'

describe('API Tests', () => {
  beforeEach(() => {
    console.log('🧪 Setting up test')
    mockControls.reset()
    vi.clearAllMocks()
  })

  it('should work correctly', async () => {
    // Configure mocks for this test
    mockControls.setAuthUser(mockUser)
    mockControls.setDatabaseResults([sampleData])
    
    // Run test
    const request = createMockRequest('GET')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
  })
})
```

## Key Benefits

### 1. Reliability
- Module mocks are applied consistently
- No more 500 errors from missing mock implementations
- Works reliably across different bun/vitest versions

### 2. Debugging
- Comprehensive console logging of mock calls
- Clear visibility into which mocks are being triggered
- Easy to identify why tests are failing

### 3. Maintainability
- Centralized mock configuration
- Runtime controls for different test scenarios
- Clear separation between module-level and runtime mocks

### 4. Performance
- Mocks are set up once at module level
- Runtime controls are fast and efficient
- No need to recreate mock chains for each test

## Mock Controls API

### Authentication
```typescript
mockControls.setAuthUser(user)     // Set authenticated user
mockControls.setUnauthenticated()  // Set unauthenticated state
```

### Database
```typescript
mockControls.setDatabaseResults([
  [result1, result2],  // First query
  [{ count: 5 }]       // Second query
])
```

### Permissions
```typescript
mockControls.setPermissionLevel('admin')  // Set user permission level
mockControls.setPermissionLevel('read')   // Or read/write/etc
```

### Internal Auth
```typescript
mockControls.setInternalTokenValid(true)   // Valid internal tokens
mockControls.setInternalTokenValid(false)  // Invalid tokens
```

### Reset All
```typescript
mockControls.reset()  // Reset all mocks to defaults
```

## Debugging Test Failures

### 1. Enable Console Logging
The new infrastructure includes comprehensive logging. Look for these patterns in test output:

```
📦 Mocking @/lib/auth
🔧 Mock auth user set: user-123
🔍 getSession called, returning: user-123
🔍 Database select() called
```

### 2. Check Mock Application
Ensure module mocks are imported first:

```typescript
// This MUST be the first import
import { mockControls } from '../__test-utils__/module-mocks'
```

### 3. Verify Mock Configuration
Add logging to see current mock state:

```typescript
beforeEach(() => {
  mockControls.reset()
  console.log('🔧 Test setup complete')
})
```

### 4. Common Issues
- **500 errors**: Module mocks not imported first
- **Authentication failures**: User not set with mockControls.setAuthUser()
- **Database errors**: Results not configured with setDatabaseResults()
- **Permission errors**: Permission level not set with setPermissionLevel()

## Migration Checklist

For each test file:

- [ ] Import module mocks first
- [ ] Remove all vi.doMock() calls
- [ ] Replace setupComprehensiveTestMocks with mockControls
- [ ] Update beforeEach hooks to use mockControls.reset()
- [ ] Replace auth mock calls with mockControls
- [ ] Replace database mock setup with mockControls.setDatabaseResults()
- [ ] Replace permission mocks with mockControls.setPermissionLevel()
- [ ] Test and verify all scenarios work correctly
- [ ] Add console.log statements for debugging if needed

## Testing the Migration

Run tests to verify the migration:

```bash
# Test specific file
bun run test --run path/to/test.file.ts

# Test all API tests
bun run test --run app/api/**/*.test.ts

# Test with verbose output for debugging
bun run test --run path/to/test.file.ts --reporter=verbose
```

## Expected Improvements

After migration, you should see:
- ✅ More tests passing (significantly improved pass rate)
- ✅ Consistent 200/400/401/403 status codes instead of 500 errors
- ✅ Clear console logging showing mock interactions
- ✅ Faster and more reliable test execution
- ✅ Better error messages when tests do fail

## Support

If you encounter issues during migration:

1. Check the console logs for mock interaction details
2. Verify the import order (module mocks must be first)
3. Ensure all mockControls are properly configured in beforeEach
4. Compare with the working examples in route.bun-compatible.test.ts